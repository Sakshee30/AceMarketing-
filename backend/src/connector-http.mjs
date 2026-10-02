/** Bounded JSON transport for connector reads. No provider payloads or tokens in errors. */
const integer=(value,fallback,min,max,name)=>{
  const n=value==null||value===''?fallback:Number(value)
  if(!Number.isSafeInteger(n)||n<min||n>max)throw new TypeError(`invalid ${name}`)
  return n
}
const abortable=(promise,signal)=>new Promise((resolve,reject)=>{
  const abort=()=>reject(signal.reason||new Error('connector_sync_timeout'))
  if(signal.aborted){abort();return}
  signal.addEventListener('abort',abort,{once:true})
  Promise.resolve(promise).then(value=>{signal.removeEventListener('abort',abort);resolve(value)},error=>{signal.removeEventListener('abort',abort);reject(error)})
})
export const requestConnectorJson=async(rawUrl,{
  method='GET',headers={},body=null,allowedOrigins=[],
  timeoutMs=process.env.CONNECTOR_SYNC_HTTP_TIMEOUT_MS,
  maxBytes=process.env.CONNECTOR_SYNC_MAX_JSON_BYTES,
  maxRedirects=4,fetchImpl=globalThis.fetch
}={})=>{
  const deadline=integer(timeoutMs,30000,1,120000,'connector timeout')
  const limit=integer(maxBytes,50*1024*1024,1,250*1024*1024,'connector response limit')
  const redirects=integer(maxRedirects,4,0,10,'connector redirect limit')
  if(!Array.isArray(allowedOrigins)||!allowedOrigins.length)throw new Error('connector origin allowlist required')
  const permitted=new Set(allowedOrigins)
  let url=new URL(rawUrl)
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(new Error('connector_sync_timeout')),deadline)
  const seen=new Set();let reader=null
  try{
    for(let hop=0;;hop++){
      if(url.protocol!=='https:'||url.username||url.password)throw new Error('connector sync requires credential-free HTTPS URL')
      if(!permitted.has(url.origin))throw new Error('connector origin is not allowlisted')
      if(seen.has(url.href))throw new Error('connector redirect loop')
      seen.add(url.href)
      const response=await abortable(fetchImpl(url,{method,headers:{Accept:'application/json',...headers},body,redirect:'manual',signal:controller.signal}),controller.signal)
      if(response.status>=300&&response.status<400&&response.headers.get('location')){
        await response.body?.cancel().catch(()=>{})
        if(hop>=redirects)throw new Error('connector redirect limit exceeded')
        const next=new URL(response.headers.get('location'),url)
        if(next.origin!==url.origin)throw new Error('cross-origin provider redirect blocked')
        url=next;continue
      }
      if(response.status===204||response.status===304)return {json:{},headers:response.headers,status:response.status}
      if(!response.ok){
        await response.body?.cancel().catch(()=>{})
        throw Object.assign(new Error('connector provider request failed: '+response.status),{status:response.status,retryAfter:response.headers.get('retry-after')})
      }
      const contentType=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()
      if(contentType&&contentType!=='application/json'&&!contentType.endsWith('+json'))throw new Error('connector provider returned non-JSON content type')
      const declared=response.headers.get('content-length')
      if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>limit))throw new Error('connector JSON response exceeds configured size limit')
      if(!response.body)throw new Error('connector provider returned an empty JSON body')
      reader=response.body.getReader();const chunks=[];let total=0
      while(true){
        const part=await abortable(reader.read(),controller.signal)
        if(part.done)break
        total+=part.value.byteLength
        if(total>limit)throw new Error('connector JSON response exceeds configured size limit')
        chunks.push(Buffer.from(part.value))
      }
      let json
      try{json=JSON.parse(Buffer.concat(chunks,total).toString('utf8'))}
      catch{throw new Error('connector provider returned invalid JSON')}
      if(json===null||typeof json!=='object')throw new Error('connector provider JSON must be an object or array')
      return {json,headers:response.headers,status:response.status}
    }
  }finally{
    clearTimeout(timer)
    controller.abort()
    if(reader)await reader.cancel().catch(()=>{})
  }
}
