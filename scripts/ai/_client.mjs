const base=(process.env.AI_API_BASE_URL||'http://127.0.0.1:3001').replace(/\/$/,'')
const workspace=process.env.AI_WORKSPACE_ID||process.env.DEFAULT_WORKSPACE_ID||'ws_default'
const token=process.env.AI_API_TOKEN||''
export const request=async(path,{method='GET',body,headers={}}={})=>{
  const response=await fetch(base+path,{method,headers:{Accept:'application/json','Content-Type':'application/json','X-Workspace-ID':workspace,...(token?{Authorization:'Bearer '+token}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})})
  const payload=await response.json().catch(()=>({}))
  if(!response.ok){const error=new Error(payload.error||('HTTP '+response.status));error.status=response.status;error.payload=payload;throw error}
  return payload
}
export const arg=(name,fallback='')=>{
  const prefix='--'+name+'='
  const value=process.argv.slice(2).find(item=>item.startsWith(prefix))
  return value?value.slice(prefix.length):fallback
}
export const print=value=>process.stdout.write(JSON.stringify(value,null,2)+'\n')
