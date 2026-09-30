import {randomUUID} from 'node:crypto'
import {pool} from './database.mjs'
import {effectiveUsageForMetric,finalizeUsageReservation,reconcileExpiredUsageReservations,reserveUsageCapacity} from './platform/usage-ledger.mjs'
import {applyBillingSubscriptionChange,billingAccessPolicy} from './platform/billing-lifecycle.mjs'

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
  request_units:numberEnv('PLAN_LIMIT_REQUEST_UNITS',0),
  storage_bytes:numberEnv('PLAN_LIMIT_STORAGE_BYTES',0),
  records:numberEnv('PLAN_LIMIT_RECORDS',0),
  files:numberEnv('PLAN_LIMIT_FILES',0),
  workflow_steps:numberEnv('PLAN_LIMIT_WORKFLOW_STEPS',0),
  external_sends:numberEnv('PLAN_LIMIT_EXTERNAL_SENDS',0),
  ai_tokens:numberEnv('PLAN_LIMIT_AI_TOKENS',0),
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

export const subscriptionSummary=async workspaceId=>{
  if(!pool)return {available:false}
  const sub=await ensureSubscription(workspaceId)
  const ent=sub.entitlements||{}
  const metrics=['tracked_events','assisted_events','signal_dispatches','agent_actions','audience_syncs','custom_integration_tests','request_units','storage_bytes','records','files','workflow_steps','external_sends','ai_tokens']
  const usage={}
  await reconcileExpiredUsageReservations({
    workspaceId,
    ttlMinutes:Number(process.env.USAGE_RESERVATION_TTL_MINUTES||30)
  }).catch(()=>{})
  for(const metric of metrics){
    const snapshot=await effectiveUsageForMetric({workspaceId,metric})
    const used=Number(snapshot.used||0)
    const reserved=Number(snapshot.reserved||0)
    const limit=Number(ent[metric]??0)
    usage[metric]={
      used,
      reserved,
      limit,
      remaining:limit===0?null:Math.max(0,limit-used-reserved),
      percent:limit===0?0:Number((((used+reserved)/limit)*100).toFixed(1)),
      freshness:'live',
      ledgerUsed:Number(snapshot.ledger||0),
      aggregateUsed:Number(snapshot.daily||0)
    }
  }
  return {
    available:true,
    planCode:sub.plan_code,
    status:sub.status,
    periodStart:sub.current_period_start,
    periodEnd:sub.current_period_end,
    trialEndsAt:sub.trial_ends_at,
    graceEndsAt:sub.grace_ends_at||null,
    entitlementsVersion:Number(sub.entitlements_version||1),
    billingStateReason:sub.billing_state_reason||null,
    accessPolicy:billingAccessPolicy(sub.status),
    billingProvider:sub.billing_provider,
    externalCustomerId:sub.external_customer_id,
    paymentConfigured:Boolean(sub.billing_provider&&sub.external_customer_id),
    entitlements:ent,
    usage,
    usageFreshnessAt:new Date().toISOString()
  }
}

export const assertCapacity=async(workspaceId,metric,quantity=1,requestId=null)=>{
  if(!pool)return {allowed:true,reservationId:null}
  const sub=await ensureSubscription(workspaceId)
  if(['suspended','cancelled','expired'].includes(sub.status)){
    return {allowed:false,reason:'subscription_'+sub.status}
  }
  const limit=Number(sub.entitlements?.[metric]??0)
  return reserveUsageCapacity({
    workspaceId,
    metric,
    quantity,
    requestId,
    limit
  })
}

export const finalizeReservation=async(workspaceId,id,success=true)=>{
  if(!pool||!id)return null
  return finalizeUsageReservation({workspaceId,id,success})
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
  const allowed=['tracked_events','assisted_events','signal_dispatches','agent_actions','audience_syncs','custom_integration_tests','request_units','storage_bytes','records','files','workflow_steps','external_sends','ai_tokens','members','custom_integrations']
  const clean={}
  for(const key of allowed){
    if(input.entitlements?.[key]!=null){
      const value=Number(input.entitlements[key])
      if(!Number.isFinite(value)||value<0)throw new Error('invalid entitlement for '+key)
      clean[key]=Math.floor(value)
    }
  }
  await ensureSubscription(workspaceId)
  const result=await applyBillingSubscriptionChange(workspaceId,{
    ...(input.planCode?{planCode:String(input.planCode)}:{}),
    ...(input.status?{status:String(input.status)}:{}),
    entitlements:clean,
    ...(input.graceEndsAt?{graceEndsAt:input.graceEndsAt}:{}),
    ...(input.reason?{reason:String(input.reason)}:{})
  },{
    source:'workspace-entitlement-admin',
    reason:input.reason||'entitlement configuration updated'
  })
  return result.item
}

export const closeEntitlements=async()=>{if(pool)await pool.end()}
