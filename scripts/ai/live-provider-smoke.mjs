import {arg,print,request} from './_client.mjs'

if(process.env.AI_LIVE_PROVIDER_SMOKE!=='true'){
  throw new Error('AI_LIVE_PROVIDER_SMOKE=true is required; live provider calls are never enabled implicitly')
}
const task=arg('task')
if(!task)throw new Error('usage: AI_LIVE_PROVIDER_SMOKE=true npm run ai:live-provider-smoke -- --task=<hosted registry task>')
const maxCalls=Number(process.env.AI_LIVE_PROVIDER_MAX_CALLS||1)
if(!Number.isInteger(maxCalls)||maxCalls!==1){
  throw new Error('AI_LIVE_PROVIDER_MAX_CALLS must be exactly 1 for the bounded smoke command')
}
const result=await request('/api/ai/providers/'+encodeURIComponent(task)+'/verify',{method:'POST',body:{}})
print({
  smoke:'live-provider',
  task,
  accessVerified:result.accessVerified===true,
  provider:result.provider||null,
  requestedModel:result.requestedModel||null,
  resolvedModel:result.resolvedModel||null,
  note:'This verifies configured account access only. It does not qualify, approve or deploy the model.'
})
