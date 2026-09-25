import {randomUUID} from 'node:crypto'
import pg from 'pg'

const {Pool}=pg
const databaseUrl=process.env.DATABASE_URL||''
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.ENTITLEMENT_DB_POOL_MAX||10),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

const numberEnv=(name,fallback)=>{
  const value=Number(process.env[name])
  return Number.isFinite(value)&&value>=0?value:fallback
}

const defaultEntitlements=()=>({
  tracked_events:numberEnv('PLAN_LIMIT_TRACKED_EVENTS',1000000),
  assisted_events:numberEnv('PLAN_LIMIT_ASSISTED_EVENTS',250000),
  signal_dispatches:numberEnv('PLAN_LIMIT_SIGNAL_DISPATCHES',250000),
  agent_actions:numberEnv('PLAN_LIMIT_AGENT_ACTIONS',50000),
  audience_syncs:numberEnv('PLAN_LIMIT_AUDIENCE_SYNCS',500),
  custom_integration_tests:numberEnv('PLAN_LIMIT_CUSTOM_INTEGRATION_TESTS',1000),
  members:numberEnv('PLAN_LIMIT_MEMBERS',25),
  custom_integrations:numberEnv('PLAN_LIMIT_CUSTOM_INTEGRATIONS',25)
})

const ensureSubscription=async workspaceId=>{
  if(!pool)return null
  const entitlements=defaultEntitlements()
  const {rows}=await pool.query(
    `INSERT INTO ace_workspace_subscriptions
      (workspace_id,plan_code,status,entitlements,current_period_start,current_period_end)
     VALUES ($1,'usage','active',$2::jsonb,date_trunc('month',now()),date_trunc('month',now())+interval '1 month')
     ON CONFLICT (workspace_id) DO UPDATE SET
       current_period_start=CASE WHEN ace_workspace_subscriptions.current_period_end<=now() THEN date_trunc('month',now()) ELSE ace_workspace_subscriptions.current_period_start END,
       current_period_end=CASE WHEN ace_workspace_subscriptions.current_period_end<=now() THEN date_trunc('month',now())+interval '1 month' ELSE ace_workspace_subscriptions.current_period_end END
     RETURNING *`,
    [workspaceId,JSON.stringify(entitlements)]
  )
  return rows[0]
}

const monthlyUsage=async(workspaceId,metric)=>{
  const {rows}=await pool.query(
    `SELECT COALESCE(SUM(CASE $2
      WHEN 'tracked_events' THEN tracked_events
      WHEN 'assisted_events' THEN assisted_events
      WHEN 'signal_dispatches' THEN signal_dispatches
      WHEN 'agent_actions' THEN agent_actions
      WHEN 'audience_syncs' THEN audience_syncs
      WHEN 'custom_integration_tests' THEN custom_integration_tests
      ELSE 0 END),0)::bigint value
     FROM ace_usage_daily
     WHERE workspace_id=$1 AND usage_date>=date_trunc('month',CURRENT_DATE)::date`,
    [workspaceId,metric]
  )
  return Number(rows[0]?.value||0)
}

const activeReservations=async(workspaceId,metric)=>{
  const {rows}=await pool.query(
    `SELECT COALESCE(SUM(quantity),0)::bigint value
     FROM ace_usage_reservations
     WHERE workspace_id=$1 AND metric=$2 AND period_start=date_trunc('month',CURRENT_DATE)::date AND status='reserved'`,
    [workspaceId,metric]
  )
  return Number(rows[0]?.value||0)
}

export const subscriptionSummary=async workspaceId=>{
  if(!pool)return {available:false}
  const sub=await ensureSubscription(workspaceId)
  const ent=sub.entitlements||{}
  const metrics=['tracked_events','assisted_events','signal_dispatches','agent_actions','audience_syncs','custom_integration_tests']
  const usage={}
  for(const metric of metrics){
    const used=await monthlyUsage(workspaceId,metric)
    const reserved=await activeReservations(workspaceId,metric)
    const limit=Number(ent[metric]??0)
    usage[metric]={
      used,reserved,limit,
      remaining:limit===0?null:Math.max(0,limit-used-reserved),
      percent:limit===0?0:Number((((used+reserved)/limit)*100).toFixed(1))
    }
  }
  return {
    available:true,
    planCode:sub.plan_code,
    status:sub.status,
    periodStart:sub.current_period_start,
    periodEnd:sub.current_period_end,
    trialEndsAt:sub.trial_ends_at,
    billingProvider:sub.billing_provider,
    externalCustomerId:sub.external_customer_id,
    paymentConfigured:Boolean(sub.billing_provider&&sub.external_customer_id),
    entitlements:ent,
    usage
  }
}

export const assertCapacity=async(workspaceId,metric,quantity=1,requestId=null)=>{
  if(!pool)return {allowed:true,reservationId:null}
  const sub=await ensureSubscription(workspaceId)
  if(['suspended','cancelled'].includes(sub.status)) return {allowed:false,reason:'subscription_'+sub.status}
  const limit=Number(sub.entitlements?.[metric]??0)
  if(limit===0) return {allowed:true,reservationId:null,unlimited:true}
  const used=await monthlyUsage(workspaceId,metric)
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    await client.query(`SELECT workspace_id FROM ace_workspace_subscriptions WHERE workspace_id=$1 FOR UPDATE`,[workspaceId])
    const reservedResult=await client.query(
      `SELECT COALESCE(SUM(quantity),0)::bigint value FROM ace_usage_reservations
       WHERE workspace_id=$1 AND metric=$2 AND period_start=date_trunc('month',CURRENT_DATE)::date AND status='reserved'`,
      [workspaceId,metric]
    )
    const reserved=Number(reservedResult.rows[0]?.value||0)
    if(used+reserved+quantity>limit){
      await client.query('ROLLBACK')
      return {allowed:false,reason:'quota_exceeded',metric,used,reserved,limit,requested:quantity}
    }
    const id='ur_'+randomUUID()
    await client.query(
      `INSERT INTO ace_usage_reservations (id,workspace_id,metric,quantity,period_start,status,request_id)
       VALUES ($1,$2,$3,$4,date_trunc('month',CURRENT_DATE)::date,'reserved',$5)
       ON CONFLICT (workspace_id,request_id,metric) WHERE request_id IS NOT NULL DO NOTHING`,
      [id,workspaceId,metric,quantity,requestId]
    )
    await client.query('COMMIT')
    return {allowed:true,reservationId:id,metric,used,reserved,limit}
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{client.release()}
}

export const finalizeReservation=async(id,success=true)=>{
  if(!pool||!id)return
  await pool.query(
    `UPDATE ace_usage_reservations SET status=$2,updated_at=now() WHERE id=$1 AND status='reserved'`,
    [id,success?'committed':'released']
  )
}

export const resourceCountAllowed=async(workspaceId,resource)=>{
  if(!pool)return {allowed:true}
  const sub=await ensureSubscription(workspaceId)
  const limit=Number(sub.entitlements?.[resource]??0)
  if(limit===0)return {allowed:true,limit:0,current:0}
  let current=0
  if(resource==='members'){
    const {rows}=await pool.query(`SELECT state FROM ace_workspace_state WHERE workspace_id=$1`,[workspaceId])
    current=Array.isArray(rows[0]?.state?.members)?rows[0].state.members.filter(x=>x.status==='active').length:0
  }else if(resource==='custom_integrations'){
    const {rows}=await pool.query(`SELECT COUNT(*)::int count FROM ace_custom_integrations WHERE workspace_id=$1 AND status<>'disabled'`,[workspaceId]).catch(()=>({rows:[{count:0}]}))
    current=Number(rows[0]?.count||0)
  }
  return {allowed:current<limit,current,limit}
}

export const updateWorkspaceEntitlements=async(workspaceId,input={})=>{
  if(!pool)return null
  const allowed=['tracked_events','assisted_events','signal_dispatches','agent_actions','audience_syncs','custom_integration_tests','members','custom_integrations']
  const clean={}
  for(const key of allowed){
    if(input.entitlements?.[key]!=null){
      const value=Number(input.entitlements[key])
      if(!Number.isFinite(value)||value<0)throw new Error('invalid entitlement for '+key)
      clean[key]=Math.floor(value)
    }
  }
  const sub=await ensureSubscription(workspaceId)
  const merged={...(sub.entitlements||{}),...clean}
  const {rows}=await pool.query(
    `UPDATE ace_workspace_subscriptions SET plan_code=COALESCE($2,plan_code),status=COALESCE($3,status),entitlements=$4::jsonb,updated_at=now()
     WHERE workspace_id=$1 RETURNING *`,
    [workspaceId,input.planCode||null,input.status||null,JSON.stringify(merged)]
  )
  return rows[0]
}

export const closeEntitlements=async()=>{if(pool)await pool.end()}
