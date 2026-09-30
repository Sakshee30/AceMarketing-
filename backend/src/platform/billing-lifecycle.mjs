import {randomUUID} from 'node:crypto'
import {pool} from '../database.mjs'

const subscriptionStates=Object.freeze([
  'trial','active','grace','past_due','suspended','cancelled','expired'
])

const canonical=value=>{
  if(Array.isArray(value))return value.map(canonical)
  if(value&&typeof value==='object'){
    return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]))
  }
  return value
}

const sameJson=(left,right)=>JSON.stringify(canonical(left||{}))===JSON.stringify(canonical(right||{}))

export const billingSubscriptionStates=()=>[...subscriptionStates]

export const validateBillingStatus=status=>{
  const value=String(status||'')
  if(!subscriptionStates.includes(value))throw new Error('invalid billing subscription status '+value)
  return value
}

export const billingAccessPolicy=status=>{
  const value=validateBillingStatus(status)
  if(value==='trial'||value==='active')return {mode:'full',writeAllowed:true,exportAllowed:true}
  if(value==='grace'||value==='past_due')return {mode:'grace',writeAllowed:true,exportAllowed:true}
  if(value==='suspended')return {mode:'read-only',writeAllowed:false,exportAllowed:true}
  if(value==='cancelled'||value==='expired')return {mode:'retained-read-only',writeAllowed:false,exportAllowed:true}
  return {mode:'read-only',writeAllowed:false,exportAllowed:false}
}

const insertEntitlementVersion=async(client,row,{source,reason,providerEventId})=>{
  await client.query(
    `INSERT INTO ace_entitlement_versions
      (id,workspace_id,version,plan_code,subscription_status,entitlements,source,reason,provider_event_id)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)
     ON CONFLICT (workspace_id,version) DO NOTHING`,
    [
      'ev_'+randomUUID(),
      row.workspace_id,
      Number(row.entitlements_version||1),
      row.plan_code,
      row.status,
      JSON.stringify(row.entitlements||{}),
      String(source||'application').slice(0,80),
      reason?String(reason).slice(0,500):null,
      providerEventId?String(providerEventId).slice(0,255):null
    ]
  )
}

export const applyBillingSubscriptionChange=async(workspaceId,patch={},options={})=>{
  if(!pool)throw new Error('billing store unavailable')
  if(!workspaceId)throw new Error('workspaceId required')
  const source=String(options.source||'application').slice(0,80)
  const provider=String(options.provider||'application').slice(0,80)
  const providerEventId=options.providerEventId?String(options.providerEventId).slice(0,255):null
  const reason=options.reason?String(options.reason).slice(0,500):null
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    let current=(await client.query(
      'SELECT * FROM ace_workspace_subscriptions WHERE workspace_id=$1 FOR UPDATE',
      [workspaceId]
    )).rows[0]
    if(!current){
      await client.query(
        `INSERT INTO ace_workspace_subscriptions
          (workspace_id,plan_code,status,entitlements,entitlements_version)
         VALUES ($1,$2,$3,$4::jsonb,1)`,
        [
          workspaceId,
          patch.planCode||'usage',
          validateBillingStatus(patch.status||'active'),
          JSON.stringify(patch.entitlements||{})
        ]
      )
      current=(await client.query(
        'SELECT * FROM ace_workspace_subscriptions WHERE workspace_id=$1 FOR UPDATE',
        [workspaceId]
      )).rows[0]
    }

    // Capture the current effective entitlement state once before any change. For
    // repositories upgraded from the legacy schema this creates version 1 lazily.
    await insertEntitlementVersion(client,current,{
      source,
      reason:reason||'baseline entitlement state',
      providerEventId:null
    })

    const nextStatus=patch.status?validateBillingStatus(patch.status):current.status
    const nextPlan=patch.planCode||current.plan_code
    const nextEntitlements=patch.entitlements
      ?{...(current.entitlements||{}),...patch.entitlements}
      :(current.entitlements||{})
    const entitlementChanged=nextPlan!==current.plan_code||!sameJson(nextEntitlements,current.entitlements)
    const nextVersion=entitlementChanged?Number(current.entitlements_version||1)+1:Number(current.entitlements_version||1)

    const {rows}=await client.query(
      `UPDATE ace_workspace_subscriptions SET
        plan_code=$2,
        status=$3,
        entitlements=$4::jsonb,
        entitlements_version=$5,
        billing_provider=COALESCE($6,billing_provider),
        external_customer_id=COALESCE($7,external_customer_id),
        external_subscription_id=COALESCE($8,external_subscription_id),
        provider_price_id=COALESCE($9,provider_price_id),
        current_period_start=COALESCE($10,current_period_start),
        current_period_end=COALESCE($11,current_period_end),
        trial_ends_at=CASE WHEN $12::timestamptz IS NULL THEN trial_ends_at ELSE $12::timestamptz END,
        grace_ends_at=CASE WHEN $13::timestamptz IS NULL THEN grace_ends_at ELSE $13::timestamptz END,
        cancel_at_period_end=COALESCE($14,cancel_at_period_end),
        billing_state_reason=COALESCE($15,billing_state_reason),
        updated_at=now()
       WHERE workspace_id=$1
       RETURNING *`,
      [
        workspaceId,nextPlan,nextStatus,JSON.stringify(nextEntitlements),nextVersion,
        patch.billingProvider||null,patch.customerId||null,patch.subscriptionId||null,patch.priceId||null,
        patch.periodStart||null,patch.periodEnd||null,patch.trialEndsAt||null,patch.graceEndsAt||null,
        patch.cancelAtPeriodEnd??null,patch.reason||reason||null
      ]
    )
    const next=rows[0]

    if(entitlementChanged)await insertEntitlementVersion(client,next,{source,reason,providerEventId})

    if(providerEventId){
      await client.query(
        `INSERT INTO ace_billing_reconciliation_records
          (id,workspace_id,provider,provider_event_id,source,previous_status,next_status,previous_plan_code,next_plan_code,entitlements_version,outcome,detail)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'applied',$11::jsonb)
         ON CONFLICT (provider,provider_event_id) WHERE provider_event_id IS NOT NULL DO NOTHING`,
        [
          'br_'+randomUUID(),workspaceId,provider,providerEventId,source,
          current.status,next.status,current.plan_code,next.plan_code,Number(next.entitlements_version||1),
          JSON.stringify({entitlementChanged})
        ]
      )
    }

    await client.query('COMMIT')
    return {item:next,entitlementChanged,entitlementsVersion:Number(next.entitlements_version||1)}
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
}

export const billingReconciliationHistory=async(workspaceId,limit=50)=>{
  if(!pool)return []
  const {rows}=await pool.query(
    `SELECT provider,provider_event_id,source,previous_status,next_status,previous_plan_code,next_plan_code,
            entitlements_version,outcome,detail,created_at
     FROM ace_billing_reconciliation_records
     WHERE workspace_id=$1
     ORDER BY created_at DESC
     LIMIT $2`,
    [workspaceId,Math.max(1,Math.min(200,Number(limit)||50))]
  )
  return rows
}
