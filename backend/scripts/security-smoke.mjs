const base=(process.env.SECURITY_BASE_URL||process.env.SMOKE_BASE_URL||'http://127.0.0.1:3001').replace(/\/$/,'')
const timeout=Number(process.env.SECURITY_TIMEOUT_MS||5000)

const call=async(path,options={})=>{
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),timeout)
  try{
    const response=await fetch(base+path,{...options,signal:controller.signal,headers:{...(options.headers||{})}})
    const text=await response.text()
    let body
    try{body=text?JSON.parse(text):{}}catch{body={text}}
    return {status:response.status,body}
  }finally{clearTimeout(timer)}
}

const invalidWorkspace=await call('/api/monitoring',{headers:{'X-Workspace-ID':'../../escape'}})
if(invalidWorkspace.status!==400)throw new Error('invalid workspace id was not rejected')

const webhook=await call('/api/billing/webhook',{
  method:'POST',
  headers:{'Content-Type':'application/json','Stripe-Signature':'t=1,v1=deadbeef'},
  body:'{}'
})
if(webhook.status!==400)throw new Error('invalid billing webhook signature was not rejected')

const ssrf=await call('/api/custom-integrations/test',{
  method:'POST',
  headers:{'Content-Type':'application/json','X-Workspace-ID':'ws_default'},
  body:JSON.stringify({name:'ssrf-test',baseUrl:'http://127.0.0.1:3001/api/health',identity:'email'})
})
if(ssrf.status!==422)throw new Error('localhost custom integration target was not blocked')

const track=await call('/api/track',{
  method:'POST',
  headers:{'Content-Type':'application/json','X-Workspace-ID':'ws_default'},
  body:JSON.stringify({event:'security.smoke',eventCategory:'essential',visitorId:'security-smoke-visitor',url:'https://example.test/security'})
})
if(track.status<200||track.status>=300)throw new Error('tracking ingestion failed during security smoke: '+track.status)

console.log(JSON.stringify({ok:true,checks:['invalid-workspace-rejected','invalid-billing-signature-rejected','ssrf-localhost-blocked','tracking-ingestion']}))
