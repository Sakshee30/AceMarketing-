import http from 'node:http'
import {randomUUID,createHmac} from 'node:crypto'
import {readFile,mkdir,writeFile,rename,appendFile,stat} from 'node:fs/promises'
import {resolve} from 'node:path'
import {loadEnvFile} from '../load-env.mjs'
import {randomSource,customer,leadInput,eventInput,supervisedRows,matrixRows,forecastInput,iso} from './data.mjs'

process.chdir(resolve(import.meta.dirname,'../..'))
const env=await loadEnvFile('.env.live.local')
const options=Object.fromEntries(process.argv.slice(2).map(arg=>{const [key,...rest]=arg.replace(/^--/,'').split('=');return [key,rest.join('=')||'true']}))
const base=env.ACE_LOCAL_API||'http://127.0.0.1:3001/api'
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname)||env.NODE_ENV==='production')throw new Error('The live generator only targets a local development API.')
const interval=Number(options.interval||env.ACE_LIVE_INTERVAL_MS||3000)
const cycles=Number(options.cycles||0)
if(!Number.isFinite(interval)||interval<100||!Number.isInteger(cycles)||cycles<0)throw new Error('Use --interval=100 or higher and --cycles=0 (continuous) or a positive integer.')
const workspaceId=env.DEFAULT_WORKSPACE_ID||'ws_default'
const random=randomSource(options.seed||env.ACE_LIVE_SEED||Date.now())
const runId=Date.now().toString(36)+'_'+randomUUID().slice(0,6)
const directory=options.verify?'.tmp-tools/live/verification':'.tmp-tools/live'
await mkdir(directory,{recursive:true})
const state={runId,workspaceId,startedAt:iso(),updatedAt:iso(),intervalMs:interval,
  counters:{cycles:0,customers:0,events:0,purchases:0,requests:0,errors:0,jobsSucceeded:0},
  coverage:{},requests:[],jobs:[],ai:[],checks:{},samples:{}}
let token='',stopping=false,index=0,readIndex=0,lastAi=0,setupComplete=false
const people=[],resources={},artifacts=new Map(),training=new Set(),pending=new Map()
// Reloads retain customer progress and job tracking, independently of API restarts.
if(!options.verify&&cycles===0){
  const saved=await readFile(directory+'/status.json','utf8').then(JSON.parse).catch(()=>null)
  if(saved?.workspaceId===workspaceId){
    Object.assign(state,{counters:saved.counters,checks:saved.checks||{},jobs:saved.jobs||[]})
    people.push(...(saved.activeCustomers||[]))
    for(const [task,artifact] of saved.artifacts||[])artifacts.set(task,artifact)
    for(const entry of state.jobs)if(['pending','leased','retry'].includes(entry.status)){
      pending.set(entry.id,entry);if(entry.training)training.add(entry.task)
    }
  }
}
const checks=(name,value,detail='')=>{state.checks[name]={passed:Boolean(value),detail,at:iso()};if(!value)throw new Error('Workflow check failed: '+name+' '+detail)}
const mark=(key,status,detail)=>{const previous=state.coverage[key];state.coverage[key]={state:status,detail:String(detail||'').slice(0,800),count:(previous?.count||0)+1,at:iso()}}
async function log(record){
  state.requests.push(record);state.requests=state.requests.slice(-100)
  state.counters.requests++
  if(!record.ok)state.counters.errors++
  if(record.body!==undefined)state.samples[record.path]={method:record.method,path:record.path,body:record.body}
  const path=directory+'/requests.jsonl'
  if((await stat(path).catch(()=>({size:0}))).size>5_000_000)await rename(path,directory+'/requests.previous.jsonl')
  await appendFile(path,JSON.stringify(record)+'\n')
}
async function login(){
  const response=await fetch(base+'/auth/login',{method:'POST',headers:{'content-type':'application/json','x-workspace-id':workspaceId},
    body:JSON.stringify({email:env.ADMIN_EMAIL||'owner@example.com',password:env.ACE_LOCAL_PASSWORD||env.ADMIN_PASSWORD||'demo123'}),signal:AbortSignal.timeout(15000)})
  const payload=await response.json()
  if(!response.ok||!payload.token)throw new Error('Local login failed: '+response.status+' '+(payload.error||''))
  token=payload.token
}
async function request(path,body,extra={},allow=[]){
  const method=body===undefined?'GET':'POST',start=performance.now()
  const raw=body===undefined?undefined:JSON.stringify(body)
  let response,payload
  try{
    const send=()=>fetch(base+path,{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json','x-workspace-id':workspaceId,'idempotency-key':body?.run_id||body?.id||randomUUID(),...extra},body:raw,signal:AbortSignal.timeout(20000)})
    response=await send()
    if(response.status===401&&!path.startsWith('/webhooks/')){await login();response=await send()}
    const text=await response.text()
    try{payload=JSON.parse(text)}catch{payload={text:text.slice(0,1000)}}
  }catch(error){
    await log({at:iso(),method,path,body,status:0,ok:false,error:error.message,elapsedMs:Math.round(performance.now()-start)})
    throw error
  }
  const preview=JSON.stringify(payload)
  await log({at:iso(),method,path,body,status:response.status,ok:response.ok,elapsedMs:Math.round(performance.now()-start),response:preview.length>12000?{truncated:true,preview:preview.slice(0,12000)}:payload})
  if(!response.ok&&!allow.includes(response.status))throw new Error(`${method} ${path}: HTTP ${response.status} ${preview.slice(0,700)}`)
  return payload
}
const scenario=async(name,action)=>{
  const previous=state.coverage[name]
  try{const result=await action();if(state.coverage[name]===previous)mark(name,'exercised',result?.detail||'Real API write and response checked');return result}
  catch(error){mark(name,'failed',error.message);console.error('[live] '+name+': '+error.message);return null}
}
async function reuse(path,name,create){
  const value=await request(path)
  const items=Array.isArray(value)?value:value.items||value.audiences||[]
  const existing=items.find(item=>item.name===name)
  return existing||await create()
}
async function setup(){
  await scenario('Event transformation rules',async()=>{
    const rule=await reuse('/events','Live test qualified purchase',async()=>(await request('/events/rules',{name:'Live test qualified purchase',sourceEvent:'purchase',outputEvent:'live_qualified_purchase',conditions:[{field:'value',operator:'gte',value:1000}],destinations:[],valueMode:'copy',currency:'INR'})).item)
    resources.eventRule=rule.id
  })
  await scenario('Real-time activation',async()=>{
    const rule=await reuse('/activation-rules','Live test lead follow-up',async()=>(await request('/activation-rules',{name:'Live test lead follow-up',triggerEvent:'lead',actionType:'follow_up',channel:'email',owner:'Local test team',delayMinutes:10,reason:'New inbound lead',conditions:[],requiresMarketingConsent:true})).item)
    resources.activationRule=rule.id
  })
  await scenario('Personalization rule',async()=>{
    resources.personalization=await reuse('/personalization-rules','Live test pricing visitor',async()=>(await request('/personalization-rules',{name:'Live test pricing visitor',surface:'website',variant:'consultation',message:'Book a product consultation',cta:'Choose a time',conditions:[],requiresPersonalizationConsent:true})).item)
  })
  await scenario('Audiences setup',async()=>{
    resources.audience=await reuse('/audiences','Live test quality audience',()=>request('/audiences',{name:'Live test quality audience',condition:'Lead grade',operator:'is one of',value:'A,B',destination:'Google Ads',mode:'Activate',identityMode:'auto'}))
  })
  await scenario('Models setup',async()=>{
    resources.model=await reuse('/models','Live test weighted intent',async()=>(await request('/models',{name:'Live test weighted intent',weights:{lead_score:70,journey_depth:20,pricing_views:10}})).item)
  })
  await scenario('Forms setup',async()=>{
    resources.form=await reuse('/forms','Live test enquiry',()=>request('/forms',{name:'Live test enquiry',slug:'live-test-enquiry',schema:{fields:[{key:'customerId',type:'string',required:true},{key:'name',type:'string',required:true},{key:'email',type:'email',required:true},{key:'product',type:'string'}]}}))
    await request('/forms/'+resources.form.id+'/publish',{})
  })
  await scenario('Custom objects setup',async()=>{
    resources.object=await reuse('/custom-objects','Live test opportunity',()=>request('/custom-objects',{name:'Live test opportunity',objectKey:'live_test_opportunity',schema:{fields:[{key:'customerId',type:'string',required:true},{key:'value',type:'number',required:true},{key:'stage',type:'string',required:true}]}}))
    await request('/custom-objects/'+resources.object.id+'/publish',{})
  })
  await scenario('Policy rules setup',async()=>{
    resources.policy=await reuse('/policy-rules','Live test intent policy',()=>request('/policy-rules',{name:'Live test intent policy',expression:{op:'gte',path:'score',value:70}}))
    await request('/policy-rules/'+resources.policy.id+'/publish',{})
  })
  await scenario('Workflows setup',async()=>{
    resources.workflow=await reuse('/workflows','Live test intake',()=>request('/workflows',{name:'Live test intake',definition:{trigger:'manual',nodes:[{id:'start',type:'start'},{id:'end',type:'end'}],edges:[{from:'start',to:'end'}]}}))
    await request('/workflows/'+resources.workflow.id+'/publish',{})
  })
  await scenario('Boards setup',async()=>{
    resources.board=await reuse('/boards','Live test sales board',async()=>(await request('/boards',{name:'Live test sales board'})).item)
  })
  await scenario('Deep links setup',async()=>{
    resources.deepLink=await reuse('/deep-links','Live test product link',()=>request('/deep-links',{name:'Live test product link',slug:'live-test-product',target:'ace://product/analytics',fallback:'http://localhost:5173'}))
    await request('/deep-links/activate',{slug:resources.deepLink.slug,id:resources.deepLink.id})
  })
  await scenario('Site registration',()=>request('/sites',{domain:'127.0.0.1',environment:'development'}))
  await scenario('Feed attributes',()=>request('/feed/attributes',{key:'product_interest',source:'custom',sample:'Analytics course'}))
  await scenario('Custom agent setup and approval',async()=>{
    resources.agent=await reuse('/agents','Live test sales routing',()=>request('/agents/custom',{name:'Live test sales routing',trigger:'manual',action:'Route to sales queue',description:'Local sales routing exercise',requiresApproval:true}))
    const approvals=await request('/approvals')
    for(const approval of approvals.items||[])if(approval.agentId===resources.agent.id&&approval.status==='pending')await request('/approvals/decision',{id:approval.id,decision:'approved'})
  })
  await scenario('Matchback rule setup',async()=>{
    const value=await request('/matchback')
    resources.matchback=(value.items||value.rules||[]).find(item=>item.name==='Live test CRM matchback')||(await request('/matchback/rules',{name:'Live test CRM matchback',source:'crm',eventType:'purchase',destination:'Google Ads',identityMethod:'customer_id'})).item
  })
  await scenario('Offline attribution rule setup',async()=>{
    const value=await request('/offline-attribution')
    resources.offline=(value.rules||value.items||[]).find(item=>item.conversion==='Live test purchase')||(await request('/offline-attribution/rules',{conversion:'Live test purchase',source:'crm',match:'first-party identity',identifier:'customerId',destination:['Google Ads']})).item
  })
  await scenario('Exclusions setup',async()=>{
    const result=await request('/exclusions/create',{preset:'converted_customers',name:'Live test converted exclusions',destination:'Google Ads'})
    resources.exclusion=result.item
  })
  await scenario('Monitoring rule setup',async()=>{
    await reuse('/monitoring-rules','Live test API error rate',()=>request('/monitoring-rules',{name:'Live test API error rate',metric:'api_error_rate',operator:'gt',threshold:5,severity:'warning',windowMinutes:10,enabled:true}))
  })
  await scenario('Report schedule setup',async()=>{
    await reuse('/report-schedules','Live test weekly cohort',()=>request('/report-schedules',{name:'Live test weekly cohort',reportType:'cohort',recipients:['owner@example.com'],cadence:'weekly',enabled:false,lookbackMonths:6}))
  })
  setupComplete=true
}

async function startCustomer(){
  const person=customer(random,++index,runId)
  await request('/consent',{subjectType:'customer',subjectId:person.id,analytics:true,marketing:true,personalization:true,source:'local_test_generator'})
  const event=await request('/track',eventInput(person,'page_view'))
  checks('Tracking persists profile and click session',event.accepted&&event.leadProfileId&&event.clickSessionId)
  await request('/enrich/upsert',leadInput(person))
  if(resources.deepLink)await request('/deep-links/event',{slug:resources.deepLink.slug,kind:'click',customerId:person.id,source:person.source})
  state.counters.events++;state.counters.customers++;people.push(person)
  return person
}
async function advance(person,force=false){
  person.phase++
  if(person.phase===1){
    const tracked=await request('/track',eventInput(person,'lead'));state.counters.events++
    checks('Lead triggers automatic follow-up',tracked.activationRuns?.some(run=>run.ruleId===resources.activationRule&&run.status==='succeeded'))
    if(resources.form)await request('/forms/'+resources.form.id+'/submissions',{submissionId:'submission_'+person.id,data:{customerId:person.id,name:person.name,email:person.email,product:person.product}})
  }else if(person.phase===2){
    const score=await request('/lead-grading/score',leadInput(person,'qualified'))
    checks('Lead score has explanation',Number.isFinite(score.score)&&Array.isArray(score.drivers)&&score.drivers.length>0)
    await request('/enrich/upsert',leadInput(person,'qualified'))
    await request('/routing/test',{leadRef:person.id,score:score.score,source:person.source,identityConfidence:.95})
    if(env.CALL_WEBHOOK_SECRET){
      const body={eventId:'call_'+person.id,customerId:person.id,provider:'local_test_telephony',from:person.phone,to:'+15550109999',status:'completed',durationSeconds:120+Math.floor(person.intent*300),startedAt:iso(-240000),endedAt:iso(),disposition:person.intent>.55?'qualified':'connected',campaign:person.campaign,source:'call',...(person.gclid?{gclid:person.gclid}:{})}
      const timestamp=String(Math.floor(Date.now()/1000))
      await request('/webhooks/calls',body,{'x-ace-timestamp':timestamp,'x-ace-signature':'sha256='+createHmac('sha256',env.CALL_WEBHOOK_SECRET).update(timestamp+'.'+JSON.stringify(body)).digest('hex')})
    }
    if(env.WHATSAPP_APP_SECRET){
      const from=person.phone.replace(/\D/g,'')
      const body={object:'whatsapp_business_account',entry:[{id:'local_test_business',changes:[{field:'messages',value:{messaging_product:'whatsapp',metadata:{phone_number_id:'local_test_phone'},contacts:[{wa_id:from,profile:{name:person.name}}],messages:[{from,id:'wamid_'+person.id,timestamp:String(Math.floor(Date.now()/1000)),type:'text',text:{body:'I would like details about '+person.product},referral:{source_url:'https://example.com/ad',source_type:'ad',source_id:'synthetic_ad',headline:person.product,ctwa_clid:'synthetic_ctwa_'+person.id}}]}}]}]}
      await request('/webhooks/whatsapp',body,{'x-hub-signature-256':'sha256='+createHmac('sha256',env.WHATSAPP_APP_SECRET).update(JSON.stringify(body)).digest('hex')})
    }
  }else if(person.phase===3){
    if(force||person.intent>.35){
      await request('/meetings',{leadRef:person.id,lead:person.name,startsAt:iso(86400000),syncCalendar:false})
      await request('/enrich/upsert',leadInput(person,'consultation'))
    }
    const personalized=await request('/personalization/decide',{customerId:person.id,surface:'website',source:person.source})
    if(personalized.decision?.id)await request('/personalization/feedback',{decisionId:personalized.decision.id,kind:'impression'})
  }else if(person.phase===4){
    if(force||person.intent>.55){
      const input=eventInput(person,'purchase')
      const tracked=await request('/track',input)
      state.counters.events++;state.counters.purchases++;person.converted=true
      checks('Purchase transforms into qualified event',tracked.derivedEvents?.some(item=>item.ruleId===resources.eventRule))
      await request('/enrich/upsert',leadInput(person,'converted'))
      const attribution=await request('/assisted-events',{event:'purchase',eventId:'sale_'+person.id,customerId:person.id,value:person.value,currency:'INR',source:'crm',occurredAt:iso(),data:{synthetic:true,product:person.product}})
      checks('Conversion matches acquired customer',attribution.status==='matched',attribution.matchMethod)
      await request('/feedback',{leadRef:person.id,lead:person.name,score:3+Math.floor(person.intent*3),theme:'Product consultation',reason:'Synthetic customer completed consultation'})
      if(resources.object)await request('/custom-objects/'+resources.object.id+'/records',{recordId:'opportunity_'+person.id,data:{customerId:person.id,value:person.value,stage:'closed_won'}})
      if(resources.deepLink)await request('/deep-links/event',{slug:resources.deepLink.slug,kind:'conversion',customerId:person.id,value:person.value,source:person.source})
    }else{
      await request('/follow-ups',{leadRef:person.id,lead:person.name,channel:'email',dueAt:iso(3600000),reason:'Checkout abandoned; needs consultation'})
      await request('/enrich/upsert',leadInput(person,'contacted'))
    }
  }
}

async function featureWrites(person){
  const name=person.name
  const tasks=[
    ['Audience materialization',()=>request('/audiences/materialize',{id:resources.audience?.id})],
    ['Weighted model run',()=>request('/models/run',{name:resources.model?.name})],
    ['POS import',()=>request('/pos-stores/import',{location:'live_mumbai',locationName:'Mumbai test showroom',currency:'INR',transactions:[{transactionId:'txn_'+randomUUID(),customerId:person.id,value:person.value,currency:'INR',occurredAt:iso()}]})],
    ['Media planner',()=>request('/planner/scenarios',{name:'Live test '+runId,budget:100000+Math.floor(random()*50000),allocations:[{source:'google',share:50},{source:'meta',share:35},{source:'email',share:15}]})],
    ['Grouped costs',()=>request('/grouped-performance/costs',{dimension:'source',key:person.source,cost:10000+Math.round(random()*3000)})],
    ['Site validation',()=>request('/sites/test',{domain:'127.0.0.1'})],
    ['Feed preview',()=>request('/feed/preview',{destination:'Google Ads',leadRef:person.id})],
    ['Policy simulation',()=>request('/policy-rules/simulate',{expression:{op:'gte',path:'score',value:70},input:{score:Math.round(person.intent*100)}})],
    ['Workflow start and cancel',async()=>{
      const execution=await request('/workflows/'+resources.workflow?.id+'/executions',{triggerType:'manual',triggerRef:person.id})
      checks('Workflow created real execution',execution.status==='running'&&execution.id)
      return request('/workflows/executions/'+execution.id+'/cancel',{})
    }],
    ['Follow-up lifecycle',async()=>{const item=await request('/follow-ups',{leadRef:person.id,lead:name,channel:'email',dueAt:iso(1800000),reason:'Test consultation follow-up'});return request('/follow-ups/complete',{id:item.id})}],
    ['Privacy export',()=>request('/privacy/export',{selectorType:'customer',selector:person.id})],
    ['Consent preferences',()=>request('/consent-preferences',{analytics:true,advertising:true,functionality:true})],
    ['Grounded analyst tools',()=>request('/ai/analyst/tools/customer_aggregates',{limit:25})],
    ['Diagnostics scan',()=>request('/diagnostics/scan',{})],
    ['Identity reconciliation',()=>request('/reconciliation/action',{issue:'unmatched_attribution',limit:250})],
    ['Matchback reconcile',()=>request('/matchback/reconcile',{ruleId:resources.matchback?.id,limit:100})],
    ['Offline attribution',()=>request('/offline-attribution/test',{ruleId:resources.offline?.id,customerId:person.id,value:person.value,currency:'INR',event:'purchase'})],
    ['Custom agent routing',async()=>{
      const result=await request('/agents/custom/test',{id:resources.agent?.id,leadRef:person.id,context:{score:85,source:person.source,destination:'Local sales test queue'}})
      checks('Custom agent executes persisted routing',result.output?.operation?.kind==='routing'&&result.run?.status==='succeeded')
      return result
    }],
    ['Conversion adjustment preview',async()=>{
      const {item}=await request('/adjustments',{event:'purchase',source:'crm',destination:'Google Ads',fromValue:person.value,toValue:Math.round(person.value*.9),currency:'INR',reason:'Synthetic partial refund; preview only'})
      return request('/adjustments/preview',{id:item.id})
    }],
    ['Fingerprint evidence',()=>request('/fingerprinting/test',{scenario:'device identity'})],
    ['Fraud review queue',()=>request('/fraud/review',{pattern:'synthetic_repeated_device_'+person.deviceId})],
    ['Funnel leak recovery',()=>request('/leak-monitor/recover',{leadRef:person.id,channel:'email',reason:'Synthetic checkout abandonment'})],
    ['Ask Ace grounded baseline',()=>request('/ask-ace',{question:'Which source is sending the highest quality leads?'})]
  ]
  if(options.verify){for(const [feature,action] of tasks)await scenario(feature,action)}
  else{const offset=(state.counters.cycles*3)%tasks.length;for(let n=0;n<3;n++){const [feature,action]=tasks[(offset+n)%tasks.length];await scenario(feature,action)}}
}

async function submitMl(task,path,body){
  if([...pending.values()].some(job=>job.task===task))return
  const input={...body,run_id:`live_${task}_${randomUUID().replaceAll('-','')}`}
  const response=await request(path,input)
  checks('ML accepted with durable job ID',Boolean(response.jobId))
  const job={id:response.jobId,task,status:response.status,path,submittedAt:iso(),training:path.includes('/train/')||path.endsWith('/rank'),body:input}
  pending.set(job.id,job);state.jobs.unshift({...job,body:undefined});state.jobs=state.jobs.slice(0,40)
  mark('AI '+task,'pending','Durable job '+job.id+' accepted; awaiting worker completion')
}
async function pollJobs(){
  for(const [id,entry] of pending){
    const {job}=await request('/ai/jobs/'+id)
    const visible=state.jobs.find(item=>item.id===id)
    if(visible)Object.assign(visible,{status:job.status,attempts:job.attempts,error:job.last_error||null,result:job.result||null})
    if(job.status==='succeeded'){
      pending.delete(id);state.counters.jobsSucceeded++
      const result=job.result||{}
      const payload=result.result||result.payload||result
      const artifact=payload.artifact||result.artifact
      if(entry.training&&artifact){artifacts.set(entry.task,artifact);training.delete(entry.task)}
      checks('ML '+entry.task+' result persisted',Boolean(result.lifecycle?.resultId))
      if(entry.path==='/ai/ml/score')checks('ML '+entry.task+' serves new customer predictions',payload.status==='served_from_verified_artifact'&&payload.items?.length>0)
      if(entry.path==='/ai/ml/rank/score')checks('ML ranking scores live candidates',payload.groups?.some(group=>group.items?.length>0))
      mark('AI '+entry.task,'exercised','Worker completed job '+id+'; result persisted')
    }else if(['dead_letter','cancelled','unknown_outcome'].includes(job.status)){
      pending.delete(id);training.delete(entry.task)
      mark('AI '+entry.task,'failed',job.last_error||job.status)
    }
  }
}
async function aiCycle(){
  const capabilities=await request('/ai/ml/capabilities')
  const registry=await request('/ai/registry')
  const available=new Map((capabilities.items||[]).map(item=>[item.task,item.dependencyAvailable]))
  state.ai=(capabilities.items||[]).map(item=>({task:item.task,available:item.dependencyAvailable,detail:item.dependencyAvailable?'Dependency installed; job outcomes shown above':item.reason}))
  for(const item of registry.items||[]){if(item.provider!=='local_ml'&&item.provider!=='deterministic')state.ai.push({task:item.task,available:item.readiness==='active',detail:[item.provider,item.readiness,...(item.warnings||[])].join(' · ')})}
  for(const task of ['lead_qualification','paid_conversion','customer_churn','future_customer_value']){
    if(!available.get(task))continue
    await scenario('AI '+task,async()=>{
      const artifact=artifacts.get(task)
      if(!artifact){
        if(training.has(task))return {detail:'Training still pending'}
        training.add(task)
        await submitMl(task,'/ai/ml/train/'+(task==='future_customer_value'?'regression':'classification'),{task,rows:supervisedRows(random,task),label_cutoff:iso(),...(task==='future_customer_value'?{horizon:'90d'}:{})})
      }else{
        await submitMl(task,'/ai/ml/score',{task,artifact_id:artifact.artifactId,artifact_sha256:artifact.sha256,rows:people.slice(-20).map(person=>({entity_id:person.id,features:{journey_depth:2+person.phase*2,pricing_views:person.intent>.55?2:1,recency_days:0,engaged:person.phase>=2?1:0}})),prediction_cutoff:iso(),...(task==='future_customer_value'?{horizon:'90d'}:{})})
      }
      return {detail:'Queued; inspect job outcome before treating it as working'}
    })
  }
  for(const [task,path,body] of [
    ['forecast_baseline','/ai/ml/forecast/seasonal-naive',forecastInput(random)],
    ['forecast_challenger','/ai/ml/forecast/catboost-challenger',{...forecastInput(random),lags:[1,7],holdout_points:14}],
    ['anomaly_detection','/ai/ml/anomalies',{rows:matrixRows(random),contamination:.05,minimum_volume:30}],
    ['behavioral_segments','/ai/ml/segments',{rows:matrixRows(random),min_cluster_size:5}],
    ['offer_ranking',artifacts.has('offer_ranking')?'/ai/ml/rank/score':'/ai/ml/rank',artifacts.has('offer_ranking')?{
      artifact_id:artifacts.get('offer_ranking').artifactId,artifact_sha256:artifacts.get('offer_ranking').sha256,prediction_cutoff:iso(),
      groups:people.slice(-10).map(person=>({group_id:person.id,candidates:[0,1,2].map(k=>({candidate_id:'offer_'+k,features:{price:500+k*1000,interest:person.intent},eligible:true}))}))
    }:{groups:Array.from({length:20},(_,n)=>({group_id:'synthetic_group_'+n,observed_at:iso(-(20-n)*86400000),candidates:[0,1,2].map(k=>({candidate_id:'offer_'+k,features:{price:500+k*1000,interest:random()},relevance:(n+k)%3,exposed:true,position:k+1}))}))}]
  ])if(available.get(task))await scenario('AI '+task,()=>submitMl(task,path,body))
  for(const task of ['forecast_primary','incrementality','marketing_mix'])if(!available.get(task))mark('AI '+task,'blocked',state.ai.find(item=>item.task===task)?.detail||'Optional specialist dependency/checkpoint missing')
  for(const [feature,reason] of Object.entries({
    'External ad delivery':'Google/Meta test credentials, connected account, marketing consent and destination IDs required; local audience materialization is running.',
    'Outbound WhatsApp and calls':'Real WhatsApp/telephony credentials and approved templates required; signed inbound webhook ingestion is running.',
    'Billing payments':'Stripe test credentials and signed test webhooks required; subscription and usage reads are checked.',
    'Report email and calendar':'SMTP/calendar test credentials required; reporting reads and local meeting records are checked.',
    'Files and document extraction':'Object-store credentials, scanner and processing transport required; no invented storage success.',
    'Board item ingestion':'Board creation and reads are exercised. A public card creation/input API is not implemented in this backend.',
    'Workflow action processing':'Publish/start/cancel lifecycle is exercised. The current worker does not advance durable workflow steps; execution completion is not simulated.',
    'Hosted AI inference':'Provider credentials, live-call switch, exact model access verification, evaluation and deployment approval required; inspect registry prerequisites.'
  }))mark(feature,'blocked',reason)
}

const readPaths=[...new Set([...JSON.parse(await readFile('qa/feature-read-paths.json','utf8')),
  '/forms','/custom-objects','/boards','/policy-rules','/workflows',
  '/ai/registry','/ai/ml/capabilities','/ai/monitoring','/ai/results','/ai/evaluations','/ai/forecast-records','/ai/anomalies','/ai/segments','/ai/rankings','/ai/task-policies','/ai/metrics/catalog','/ai/datasets','/ai/knowledge','/ai/transcripts','/ai/creative-assets','/ai/activation-proposals','/ai/deployment-controls'])]
async function readSweep(count){
  for(let n=0;n<count;n++){
    const path=readPaths[readIndex++%readPaths.length]
    try{await request(path);mark('GET '+path,'readable','Authenticated feature read returned success')}
    catch(error){mark('GET '+path,'failed',error.message)}
  }
}
async function persist(){
  state.updatedAt=iso()
  state.activeCustomers=people.slice(-300)
  state.artifacts=[...artifacts]
  await writeFile(directory+'/status.tmp',JSON.stringify(state,null,2));await rename(directory+'/status.tmp',directory+'/status.json')
  await writeFile(directory+'/samples.json',JSON.stringify(state.samples,null,2))
}
let server
if(!options.verify){
  const html=await readFile(new URL('./status.html',import.meta.url))
  server=http.createServer((req,res)=>{
    res.setHeader('Cache-Control','no-store')
    if(req.url==='/status'||req.url==='/samples'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.url==='/samples'?state.samples:state));return}
    if(req.url==='/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,cycles:state.counters.cycles,lastCycleAt:state.updatedAt}));return}
    if(req.url!=='/'){res.writeHead(404);res.end('Not found');return}
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)
  })
  await new Promise((accept,reject)=>{server.once('error',reject);server.listen(Number(env.ACE_LIVE_STATUS_PORT||5174),'127.0.0.1',accept)})
}
process.on('SIGINT',()=>{stopping=true;server?.close()})
process.on('SIGTERM',()=>{stopping=true;server?.close()})
console.log(`[live feed] Workspace ${workspaceId}; ${interval} ms interval; synthetic contacts, actual API writes.`)
try{
  const startupDeadline=Date.now()+120000
  while(!token&&!stopping){
    try{await login()}catch(error){
      mark('API connection','pending',error.message);await persist()
      if(Date.now()>=startupDeadline)throw error
      await new Promise(accept=>setTimeout(accept,1000))
    }
  }
  await setup();await startCustomer();await readSweep(readPaths.length)
  while(!stopping&&(cycles===0||state.counters.cycles<cycles)){
    const started=Date.now()
    try{
      state.counters.cycles++
      const person=await scenario('Customer acquisition',()=>startCustomer())
      if(person){
        if(options.verify){for(let n=0;n<4;n++)await scenario('Customer funnel stage '+(n+1),()=>advance(person,true))}
        else for(const item of people.filter(item=>item.phase<4).slice(-12))await scenario('Customer funnel',()=>advance(item))
        await featureWrites(person)
      }
      await pollJobs()
      if(Date.now()-lastAi>=Number(env.ACE_LIVE_AI_INTERVAL_MS||60000)){await aiCycle();lastAi=Date.now()}
      await readSweep(options.verify?readPaths.length:8)
      if(people.length>300)people.splice(0,people.length-300)
    }catch(error){mark('Feed cycle','failed',error.message);console.error('[live feed] Reconnecting after '+error.message);try{await login();if(!setupComplete)await setup()}catch{}}
    await persist()
    console.log(`[live feed] cycle ${state.counters.cycles}: customers=${state.counters.customers}, events=${state.counters.events}, purchases=${state.counters.purchases}, completed ML jobs=${state.counters.jobsSucceeded}`)
    if(!stopping)await new Promise(accept=>setTimeout(accept,Math.max(100,interval-(Date.now()-started))))
  }
  if(options.verify){
    for(let pass=0;pass<2;pass++){
      const deadline=Date.now()+180000
      while(pending.size&&Date.now()<deadline){await pollJobs();await persist();await new Promise(accept=>setTimeout(accept,1000))}
      checks('ML verification pass '+pass+' completed',pending.size===0)
      if(pass===0)await aiCycle()
    }
    const failures=Object.entries(state.coverage).filter(([,value])=>value.state==='failed')
    checks('Verification generated purchases',state.counters.purchases>=cycles)
    checks('Verification completed ML jobs',state.counters.jobsSucceeded>0)
    checks('Verification has no failed local scenarios',failures.length===0,JSON.stringify(failures))
    checks('Verification has no failed API requests',state.counters.errors===0)
    checks('All submitted ML jobs completed',pending.size===0)
    await persist();console.log('[live verify] Passed real API writes, feature reads, workflow checks and completed ML jobs.')
  }
}catch(error){console.error(error);state.fatal=error.message;await persist();process.exitCode=1}
finally{if(cycles||options.verify)server?.close()}
