import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const filePath=process.env.DATA_FILE || 'backend/data/ace-state.json'
const initial={
  demoRequests:[],
  quoteRequests:[],
  audiences:[],
  customIntegrations:[],
  connectorConnections:[
    {id:'conn_google_seed',connector:'Google Ads',provider:'google',status:'needs_configuration',authType:'oauth2',createdAt:'2026-09-25T12:00:00.000Z',updatedAt:'2026-09-25T12:00:00.000Z'},
    {id:'conn_meta_seed',connector:'Meta Ads',provider:'meta',status:'needs_configuration',authType:'oauth2',createdAt:'2026-09-25T12:00:00.000Z',updatedAt:'2026-09-25T12:00:00.000Z'}
  ],
  oauthStates:[],
  connectorCredentials:[],
  signalDeliveries:[
    {id:'sig_1001',event:'lead.qualified',destination:'Meta Ads',status:'delivered',attempts:1,httpStatus:200,latencyMs:418,idempotencyKey:'seed_meta_qualified_1001',createdAt:'2026-09-25T12:02:00.000Z',updatedAt:'2026-09-25T12:02:00.418Z'},
    {id:'sig_1002',event:'revenue.closed',destination:'Google Ads',status:'retrying',attempts:2,httpStatus:429,latencyMs:912,idempotencyKey:'seed_google_revenue_1002',createdAt:'2026-09-25T12:04:00.000Z',updatedAt:'2026-09-25T12:06:00.000Z',nextAttemptAt:'2026-09-25T12:11:00.000Z',lastError:'rate_limited'},
    {id:'sig_1003',event:'audience.updated',destination:'Custom Webhook',status:'dead_letter',attempts:5,httpStatus:500,latencyMs:1880,idempotencyKey:'seed_webhook_audience_1003',createdAt:'2026-09-25T11:42:00.000Z',updatedAt:'2026-09-25T12:08:00.000Z',lastError:'destination_5xx'}
  ],
  connectorHealth:[
    {id:'meta_ads',name:'Meta Ads',status:'healthy',successRate:99.7,p95LatencyMs:684,lastSuccessAt:'2026-09-25T12:09:00.000Z'},
    {id:'google_ads',name:'Google Ads',status:'degraded',successRate:98.2,p95LatencyMs:1240,lastSuccessAt:'2026-09-25T12:08:00.000Z',note:'Transient rate limiting observed'},
    {id:'custom_webhook',name:'Custom Webhook',status:'attention',successRate:94.1,p95LatencyMs:1910,lastSuccessAt:'2026-09-25T11:58:00.000Z',note:'One endpoint returning 5xx'}
  ],
  audit:[],
  customAgents:[],
  apiKeys:[],
  agentRuns:[],
  approvals:[
    {id:'ap_1',kind:'signal_return',title:'Return qualified-lead outcome to ad platforms',status:'pending',risk:'medium',createdAt:'2026-09-25T09:00:00.000Z'}
  ],
  qualificationCalls:[
    {id:'qc_1',lead:'Aarav Sharma',status:'qualified',attempts:1,score:91,lastAttemptAt:'2026-09-25T08:42:00.000Z'},
    {id:'qc_2',lead:'Meera Patel',status:'retry_required',attempts:2,score:74,lastAttemptAt:'2026-09-25T08:51:00.000Z'}
  ],
  meetings:[
    {id:'mtg_1',lead:'Rohan Kumar',startsAt:'2026-09-26T10:30:00.000Z',status:'scheduled',remindersSent:1},
    {id:'mtg_2',lead:'Anika Roy',startsAt:'2026-09-26T12:00:00.000Z',status:'scheduled',remindersSent:0}
  ],
  followUps:[
    {id:'fu_1',lead:'Kabir Singh',channel:'whatsapp',dueAt:'2026-09-25T12:00:00.000Z',status:'open'},
    {id:'fu_2',lead:'Meera Patel',channel:'call',dueAt:'2026-09-25T13:00:00.000Z',status:'open'}
  ],
  feedback:[
    {id:'fb_1',lead:'Aarav Sharma',score:5,reason:'Fast response and clear counselling',createdAt:'2026-09-24T15:12:00.000Z'},
    {id:'fb_2',lead:'Rohan Kumar',score:4,reason:'Wanted more fee details before the call',createdAt:'2026-09-24T16:40:00.000Z'}
  ],
  launchpad:{
    objective:'Increase qualified pipeline while protecting CAC',
    monthlyPipelineTarget:25000000,
    maxCac:8500,
    monthlySpendCeiling:6000000,
    grossMarginPercent:62,
    approvalMode:'human_required_for_external_actions',
    initialized:true
  },
  workspaceSettings:{
    timezone:'Asia/Kolkata',
    currency:'INR',
    dataRetentionDays:365,
    approvalMode:'human_required_for_external_actions',
    piiActivation:'hashed_only'
  },
  workspaces:[
    {id:'ws_default',name:'AceMarketing Production',role:'owner',status:'active',region:'IN'}
  ]
}
let cache=null
let writeChain=Promise.resolve()

const load=async()=>{
  if(cache) return cache
  try{ cache={...initial,...JSON.parse(await readFile(filePath,'utf8'))} }
  catch{ cache=structuredClone(initial) }
  return cache
}
const persist=async()=>{
  await mkdir(dirname(filePath),{recursive:true})
  const tmp=filePath+'.tmp'
  await writeFile(tmp,JSON.stringify(cache,null,2),'utf8')
  await rename(tmp,filePath)
}
export const getState=async()=>structuredClone(await load())
export const mutateState=async(mutator)=>{
  writeChain=writeChain.then(async()=>{
    const state=await load()
    await mutator(state)
    await persist()
  })
  await writeChain
  return structuredClone(cache)
}
export const appendAudit=async(entry)=>mutateState(s=>{
  s.audit.unshift({id:crypto.randomUUID?.()||String(Date.now()),at:new Date().toISOString(),...entry})
  s.audit=s.audit.slice(0,1000)
})
