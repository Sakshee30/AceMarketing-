import {arg,print,request} from './_client.mjs'

if(process.env.AI_REAL_CHECKPOINT_SMOKE!=='true'){
  throw new Error('AI_REAL_CHECKPOINT_SMOKE=true is required; real checkpoint execution is never enabled implicitly')
}
const task=arg('task','forecast_primary')
if(task!=='forecast_primary')throw new Error('checkpoint smoke currently supports only forecast_primary / amazon/chronos-2')
const now=Date.now()
const history=Array.from({length:28},(_,index)=>({
  timestamp:new Date(now-(27-index)*86400000).toISOString(),
  value:100+index+(index%7)*2
}))
const operationId='checkpoint-smoke-'+Date.now()
const submitted=await request('/api/ai/ml/forecast/chronos-2',{
  method:'POST',
  headers:{'Idempotency-Key':operationId},
  body:{series_id:'checkpoint_smoke',frequency:'D',horizon:3,season_length:7,timezone:'UTC',history}
})
if(!submitted.jobId)throw new Error('checkpoint smoke did not return a durable job ID')
const timeoutMs=Math.max(10000,Math.min(Number(process.env.AI_CHECKPOINT_SMOKE_TIMEOUT_MS||120000),300000))
const deadline=Date.now()+timeoutMs
let final=null
while(Date.now()<deadline){
  const state=await request('/api/ai/jobs/'+encodeURIComponent(submitted.jobId))
  const status=String(state?.job?.status||'')
  if(['succeeded','completed','dead_letter','failed','cancelled','unknown_outcome'].includes(status)){
    final=state
    break
  }
  await new Promise(resolve=>setTimeout(resolve,1000))
}
if(!final)throw new Error('checkpoint smoke timed out waiting for durable job completion')
const status=String(final?.job?.status||'')
if(!['succeeded','completed'].includes(status)){
  const error=new Error('checkpoint smoke did not succeed: '+status)
  error.payload=final
  throw error
}
print({
  smoke:'real-checkpoint',
  task,
  jobId:submitted.jobId,
  status,
  note:'This is a bounded checkpoint execution smoke only. Tenant forecasting qualification still requires versioned backtests and evaluation evidence.'
})
