import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const filePath=process.env.DATA_FILE || 'backend/data/ace-state.json'
const initial={
  demoRequests:[],
  quoteRequests:[],
  audiences:[],
  customIntegrations:[],
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
