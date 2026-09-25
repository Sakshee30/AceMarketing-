const base=(process.env.SMOKE_BASE_URL||'http://127.0.0.1:3001').replace(/\/$/,'')
const timeout=Number(process.env.SMOKE_TIMEOUT_MS||5000)

const request=async(path,options={})=>{
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),timeout)
  try{
    const response=await fetch(base+path,{...options,signal:controller.signal,headers:{Accept:'application/json',...(options.headers||{})}})
    const text=await response.text()
    let body
    try{body=text?JSON.parse(text):{}}catch{body={text}}
    if(!response.ok)throw new Error(path+' returned '+response.status+': '+JSON.stringify(body))
    return body
  }finally{clearTimeout(timer)}
}

const health=await request('/api/health')
if(health.ok!==true)throw new Error('health response is not ok')

const ready=await request('/api/ready')
if(ready.ok!==true)throw new Error('ready response is not ok')

const navigation=await request('/api/public/navigation')
if(!navigation)throw new Error('public navigation unavailable')

const resources=await request('/api/public/resource-center')
if(!resources)throw new Error('resource center unavailable')

if(process.env.SMOKE_EMAIL&&process.env.SMOKE_PASSWORD){
  const auth=await request('/api/auth/login',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:process.env.SMOKE_EMAIL,password:process.env.SMOKE_PASSWORD})
  })
  if(!auth.token)throw new Error('login did not return a token')
  const workspace=process.env.SMOKE_WORKSPACE_ID||'ws_default'
  await request('/api/monitoring',{headers:{Authorization:'Bearer '+auth.token,'X-Workspace-ID':workspace}})
}

console.log(JSON.stringify({ok:true,base,checks:['health','ready','public-navigation','resource-center',...(process.env.SMOKE_EMAIL?['authenticated-monitoring']:[])]}))
