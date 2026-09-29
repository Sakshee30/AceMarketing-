const base=process.env.ACE_LOCAL_API||'http://127.0.0.1:3001/api'
const workspaceId=process.env.DEFAULT_WORKSPACE_ID||'ws_default'
const login=await fetch(base+'/auth/login',{method:'POST',headers:{'content-type':'application/json','x-workspace-id':workspaceId},body:JSON.stringify({email:process.env.ADMIN_EMAIL||'owner@example.com',password:process.env.ACE_LOCAL_PASSWORD||'demo123'})})
if(!login.ok)throw new Error(`Local login failed: ${login.status} ${await login.text()}`)
const {token}=await login.json()
const headers={authorization:`Bearer ${token}`,'x-workspace-id':workspaceId,'content-type':'application/json'}
const post=async(path,body)=>{
  const response=await fetch(base+path,{method:'POST',headers,body:JSON.stringify(body)})
  const text=await response.text()
  if(!response.ok)throw new Error(`${path}: ${response.status} ${text.slice(0,800)}`)
  return text?JSON.parse(text):null
}

const suffix=Date.now().toString(36)
const rule=await post('/events/rules',{name:'Local smoke '+suffix,sourceEvent:'purchase',outputEvent:'qualified_purchase_'+suffix,conditions:[{field:'value',operator:'gte',value:100}],destinations:[],valueMode:'copy',currency:'INR'})
await post('/events/rules/toggle',{id:rule.item.id,enabled:false})
await post('/assisted-events',{event:'purchase',eventId:'smoke_'+suffix,customerId:'customer_'+suffix,value:250,currency:'INR',source:'local_smoke'})
const preview=await post('/audiences/preview',{name:'Local audience '+suffix,condition:'Lead grade',operator:'is one of',value:'A,B',destination:'Google Ads',mode:'Activate',identityMode:'auto'})
const audience=await post('/audiences',{...preview,name:'Local audience '+suffix,condition:'Lead grade',operator:'is one of',value:'A,B',destination:'Google Ads',mode:'Activate',identityMode:'auto'})
await post('/audiences/materialize',{id:audience.id})
await post('/monitoring-rules',{metric:'api_error_rate',operator:'gt',threshold:5,severity:'warning',windowMinutes:10,enabled:true})
await post('/report-schedules',{name:'Local report '+suffix,reportType:'cohort',recipients:['owner@example.com'],cadence:'weekly',enabled:true,lookbackMonths:6})
const followUp=await post('/follow-ups',{leadRef:'lead_'+suffix,lead:'Local Lead',channel:'email',dueAt:new Date(Date.now()+3600000).toISOString(),reason:'Local feature verification'})
await post('/follow-ups/complete',{id:followUp.id})
await post('/meetings',{leadRef:'lead_'+suffix,lead:'Local Lead',startsAt:new Date(Date.now()+86400000).toISOString(),syncCalendar:false})
await post('/feedback',{lead:'Local Lead',leadRef:'lead_'+suffix,score:5,theme:'Local verification',reason:'Feature write smoke'})
await post('/privacy/export',{selectorType:'customer',selector:'customer_'+suffix})
await post('/consent-preferences',{analytics:true,advertising:false,functionality:true})
await post('/agents/custom',{name:'Local agent '+suffix,trigger:'manual',action:'create follow-up',description:'Local verification',requiresApproval:true})
console.log('[local-feature-write-smoke] event, attribution, audience, monitoring, report, follow-up, meeting, feedback, privacy, consent and agent writes passed.')
