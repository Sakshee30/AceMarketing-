import { AsyncLocalStorage } from 'node:async_hooks'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, extname, basename, join } from 'node:path'
import pg from 'pg'

const { Pool }=pg
const filePath=process.env.DATA_FILE || 'backend/data/ace-state.json'
const databaseUrl=process.env.DATABASE_URL || ''
const defaultWorkspaceId=process.env.DEFAULT_WORKSPACE_ID || 'ws_default'
const isProd=process.env.NODE_ENV==='production'
const allowFileStoreInProduction=process.env.ALLOW_FILE_STORE_IN_PRODUCTION==='true'

if(isProd && !databaseUrl && !allowFileStoreInProduction){
  throw new Error('DATABASE_URL is required in production unless ALLOW_FILE_STORE_IN_PRODUCTION=true')
}

const workspaceContext=new AsyncLocalStorage()
const cache=new Map()
const writeChains=new Map()
const pool=databaseUrl ? new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.DB_POOL_MAX||20),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}) : null

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

const cloneInitial=workspaceId=>{
  const state=structuredClone(initial)
  state.workspaces=state.workspaces.map((x,i)=>i===0?{...x,id:workspaceId}:x)
  return state
}
const workspaceId=()=>workspaceContext.getStore()||defaultWorkspaceId
const safeWorkspaceId=value=>{
  const id=String(value||defaultWorkspaceId)
  if(!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new Error('invalid workspace id')
  return id
}
const workspaceFile=id=>{
  if(id===defaultWorkspaceId) return filePath
  const ext=extname(filePath)||'.json'
  return join(dirname(filePath),`${basename(filePath,ext)}-${id}${ext}`)
}

export const withWorkspace=(id,fn)=>workspaceContext.run(safeWorkspaceId(id),fn)
export const getWorkspaceId=()=>workspaceId()

const loadFile=async id=>{
  if(cache.has(id)) return cache.get(id)
  const path=workspaceFile(id)
  try{cache.set(id,{...cloneInitial(id),...JSON.parse(await readFile(path,'utf8'))})}
  catch{cache.set(id,cloneInitial(id))}
  return cache.get(id)
}
const persistFile=async(id,state)=>{
  const path=workspaceFile(id)
  await mkdir(dirname(path),{recursive:true})
  const tmp=path+'.tmp'
  await writeFile(tmp,JSON.stringify(state,null,2),'utf8')
  await rename(tmp,path)
}

const ensurePostgresState=async(id,client=pool)=>{
  const seeded=cloneInitial(id)
  await client.query(
    'INSERT INTO ace_workspace_state (workspace_id,state,version) VALUES ($1,$2::jsonb,0) ON CONFLICT (workspace_id) DO NOTHING',
    [id,JSON.stringify(seeded)]
  )
}

const getPostgresState=async id=>{
  await ensurePostgresState(id)
  const {rows}=await pool.query('SELECT state FROM ace_workspace_state WHERE workspace_id=$1',[id])
  return rows[0]?.state||cloneInitial(id)
}
const mutatePostgresState=async(id,mutator)=>{
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    await ensurePostgresState(id,client)
    const {rows}=await client.query('SELECT state,version FROM ace_workspace_state WHERE workspace_id=$1 FOR UPDATE',[id])
    const state=rows[0]?.state||cloneInitial(id)
    await mutator(state)
    await client.query(
      'UPDATE ace_workspace_state SET state=$2::jsonb,version=version+1,updated_at=now() WHERE workspace_id=$1',
      [id,JSON.stringify(state)]
    )
    await client.query('COMMIT')
    return structuredClone(state)
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
}

export const getState=async()=>{
  const id=safeWorkspaceId(workspaceId())
  const state=pool?await getPostgresState(id):await loadFile(id)
  return structuredClone(state)
}

export const mutateState=async mutator=>{
  const id=safeWorkspaceId(workspaceId())
  if(pool) return mutatePostgresState(id,mutator)
  const previous=writeChains.get(id)||Promise.resolve()
  const next=previous.then(async()=>{
    const state=await loadFile(id)
    await mutator(state)
    cache.set(id,state)
    await persistFile(id,state)
    return structuredClone(state)
  })
  writeChains.set(id,next.catch(()=>{}))
  return next
}

export const storageHealth=async()=>{
  const id=safeWorkspaceId(workspaceId())
  if(pool){
    try{
      const started=Date.now()
      await pool.query('SELECT 1')
      return {ok:true,backend:'postgres',workspaceId:id,latencyMs:Date.now()-started}
    }catch(error){
      return {ok:false,backend:'postgres',workspaceId:id,error:error instanceof Error?error.message:'database unavailable'}
    }
  }
  return {ok:true,backend:'file',workspaceId:id,path:workspaceFile(id),productionSafe:!isProd||allowFileStoreInProduction}
}

export const closeStore=async()=>{if(pool) await pool.end()}

export const appendAudit=async entry=>mutateState(s=>{
  s.audit.unshift({id:String(Date.now())+'_'+Math.random().toString(36).slice(2),at:new Date().toISOString(),...entry})
  s.audit=s.audit.slice(0,1000)
})
