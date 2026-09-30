const base=(process.env.CAPACITY_BASE_URL||process.env.SMOKE_BASE_URL||'http://127.0.0.1:3001').replace(/\/$/,'')
const total=Math.max(20,Math.min(5000,Number(process.env.CAPACITY_SMOKE_REQUESTS||120)))
const concurrency=Math.max(1,Math.min(200,Number(process.env.CAPACITY_SMOKE_CONCURRENCY||20)))
const maxP95=Number(process.env.CAPACITY_SMOKE_MAX_P95_MS||2500)
const workspace=process.env.CAPACITY_WORKSPACE_ID||process.env.DEFAULT_WORKSPACE_ID||'ws_default'
const timeoutMs=Math.max(250,Number(process.env.CAPACITY_SMOKE_TIMEOUT_MS||5000))

const plan=[
  {kind:'read',share:70,method:'GET',path:'/api/dashboard-summary'},
  {kind:'write',share:20,method:'POST',path:'/api/forms'},
  {kind:'metadata',share:5,method:'GET',path:'/api/forms?limit=25'},
  {kind:'async',share:5,method:'POST',path:'/api/diagnostics/replay'}
]

const schedule=[]
for(const item of plan){
  const count=Math.max(1,Math.round(total*item.share/100))
  for(let i=0;i<count;i++)schedule.push(item)
}
while(schedule.length>total)schedule.pop()
while(schedule.length<total)schedule.push(plan[0])

let cursor=0
const latencies=[]
const outcomes={read:{ok:0,failed:0},write:{ok:0,failed:0},metadata:{ok:0,failed:0},async:{ok:0,failed:0}}
const errors=[]

const bodyFor=(item,index)=>{
  if(item.kind==='write'){
    return JSON.stringify({
      name:'Capacity Probe '+index,
      slug:'capacity-probe-'+Date.now().toString(36)+'-'+index.toString(36),
      description:'CI representative transactional write',
      schema:{fields:[{key:'email',type:'email',label:'Email',required:true}]}
    })
  }
  if(item.kind==='async')return JSON.stringify({issue:'capacity_probe_'+index})
  return undefined
}

const requestOne=async(item,index)=>{
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),timeoutMs)
  const started=performance.now()
  try{
    const body=bodyFor(item,index)
    const response=await fetch(base+item.path,{
      method:item.method,
      signal:controller.signal,
      headers:{
        Accept:'application/json',
        'X-Workspace-ID':workspace,
        'X-Request-ID':'capacity-'+index,
        ...(body?{'Content-Type':'application/json'}:{})
      },
      body
    })
    await response.arrayBuffer()
    const ok=response.ok||(item.kind==='async'&&response.status===202)
    if(ok)outcomes[item.kind].ok+=1
    else{
      outcomes[item.kind].failed+=1
      errors.push({kind:item.kind,status:response.status,path:item.path})
    }
  }catch(error){
    outcomes[item.kind].failed+=1
    errors.push({kind:item.kind,path:item.path,error:error instanceof Error?error.message:String(error)})
  }finally{
    clearTimeout(timer)
    latencies.push(performance.now()-started)
  }
}

const worker=async()=>{
  while(true){
    const index=cursor++
    if(index>=schedule.length)return
    await requestOne(schedule[index],index)
  }
}

await Promise.all(Array.from({length:Math.min(concurrency,schedule.length)},()=>worker()))
latencies.sort((a,b)=>a-b)
const percentile=p=>latencies[Math.min(latencies.length-1,Math.max(0,Math.ceil(latencies.length*p)-1))]||0
const result={
  ok:errors.length===0&&percentile(0.95)<=maxP95,
  profile:'representative-ci-smoke',
  total:schedule.length,
  concurrency,
  mix:Object.fromEntries(plan.map(item=>[item.kind,item.share])),
  outcomes,
  latencyMs:{
    average:Number((latencies.reduce((sum,value)=>sum+value,0)/Math.max(1,latencies.length)).toFixed(1)),
    p50:Number(percentile(0.5).toFixed(1)),
    p95:Number(percentile(0.95).toFixed(1)),
    p99:Number(percentile(0.99).toFixed(1))
  },
  thresholds:{maxP95Ms:maxP95},
  errors:errors.slice(0,20),
  note:'This is an initial representative CI smoke test, not 4,000-RPS production qualification.'
}
console.log(JSON.stringify(result))
if(errors.length)throw new Error('capacity smoke had '+errors.length+' failed request(s)')
if(result.latencyMs.p95>maxP95)throw new Error('capacity smoke p95 '+result.latencyMs.p95+'ms exceeded '+maxP95+'ms')
