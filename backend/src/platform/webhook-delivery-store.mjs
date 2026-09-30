import {randomBytes,randomUUID} from 'node:crypto'
import {withSystemDbTransaction,withTenantDbTransaction} from './tenant-db.mjs'
import {validateOutboundDestination} from './egress-policy.mjs'
import {connectorVaultReady,decryptSecret,encryptSecret} from '../vault.mjs'
import {enqueueJob} from '../queue.mjs'

const allowedStatuses=new Set(['active','paused','disabled'])
const eventPattern=/^[A-Za-z0-9._:-]{1,160}$/

const normalizeEventTypes=value=>{
  const list=Array.isArray(value)?value:[]
  const output=[...new Set(list.map(item=>String(item||'').trim()).filter(Boolean))]
  if(output.length<1||output.length>100)throw Object.assign(new Error('webhook subscription requires 1-100 event types'),{status:400,code:'webhook_event_type_limit'})
  for(const item of output)if(!eventPattern.test(item))throw Object.assign(new Error('invalid webhook event type: '+item),{status:400,code:'invalid_webhook_event_type'})
  return output
}

const sanitizeSubscription=row=>({
  id:row.id,
  name:row.name,
  destinationUrl:row.destination_url,
  eventTypes:Array.isArray(row.event_types)?row.event_types:[],
  status:row.status,
  signingKeyId:row.signing_key_id,
  maxAttempts:Number(row.max_attempts),
  retryWindowSeconds:Number(row.retry_window_seconds),
  createdBy:row.created_by,
  createdAt:row.created_at,
  updatedAt:row.updated_at
})

const sanitizeDelivery=row=>({
  id:row.id,
  subscriptionId:row.subscription_id,
  eventId:row.event_id,
  eventType:row.event_type,
  status:row.status,
  attemptCount:Number(row.attempt_count||0),
  maxAttempts:Number(row.max_attempts||0),
  nextRetryAt:row.next_retry_at,
  signingKeyId:row.signing_key_id,
  correlationId:row.correlation_id,
  lastStatusCode:row.last_status_code,
  lastErrorCode:row.last_error_code,
  lastError:row.last_error,
  responseSummary:row.response_summary,
  replayOf:row.replay_of,
  deliveredAt:row.delivered_at,
  deadlineAt:row.deadline_at,
  createdAt:row.created_at,
  updatedAt:row.updated_at
})

const enqueueDeliveryJob=async({workspaceId,deliveryId,maxAttempts,deadlineAt,idempotencySuffix='initial'})=>{
  await enqueueJob({
    workspaceId,
    kind:'webhook_delivery',
    payload:{deliveryId},
    idempotencyKey:'webhook:'+deliveryId+':'+idempotencySuffix,
    maxAttempts,
    deadlineAt
  })
}

export const createWebhookSubscription=async({
  workspaceId,
  name,
  destinationUrl,
  eventTypes,
  signingSecret=null,
  signingKeyId=null,
  maxAttempts=8,
  retryWindowSeconds=86400,
  actorId=null
})=>{
  if(!connectorVaultReady())throw Object.assign(new Error('connector credential vault is not configured'),{status:503,code:'webhook_vault_unavailable'})
  const cleanName=String(name||'').trim()
  if(cleanName.length<2||cleanName.length>120)throw Object.assign(new Error('webhook subscription name must be 2-120 characters'),{status:400,code:'invalid_webhook_subscription_name'})
  const validated=await validateOutboundDestination(destinationUrl,{purpose:'webhook destination'})
  const events=normalizeEventTypes(eventTypes)
  const secret=String(signingSecret||randomBytes(32).toString('base64url'))
  if(secret.length<24||secret.length>512)throw Object.assign(new Error('webhook signing secret must be 24-512 characters'),{status:400,code:'invalid_webhook_signing_secret'})
  const keyId=String(signingKeyId||('whk_'+randomUUID())).slice(0,120)
  const encrypted=encryptSecret({secret})
  const attempts=Math.max(1,Math.min(20,Number(maxAttempts)||8))
  const retryWindow=Math.max(60,Math.min(604800,Number(retryWindowSeconds)||86400))
  const id='webhook_sub_'+randomUUID()
  const row=await withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query(
      `INSERT INTO ace_webhook_subscriptions
        (id,workspace_id,name,destination_url,event_types,status,encrypted_signing_secret,signing_key_id,max_attempts,retry_window_seconds,created_by)
       VALUES($1,$2,$3,$4,$5::jsonb,'active',$6::jsonb,$7,$8,$9,$10)
       RETURNING *`,
      [id,workspaceId,cleanName,validated.url.toString(),JSON.stringify(events),JSON.stringify(encrypted),keyId,attempts,retryWindow,actorId]
    )
    return rows[0]
  })
  return {subscription:sanitizeSubscription(row),signingSecret:secret}
}

export const listWebhookSubscriptions=async({workspaceId})=>withTenantDbTransaction(workspaceId,async client=>{
  const {rows}=await client.query(
    `SELECT * FROM ace_webhook_subscriptions WHERE workspace_id=$1 ORDER BY updated_at DESC`,
    [workspaceId]
  )
  return rows.map(sanitizeSubscription)
})

export const setWebhookSubscriptionStatus=async({workspaceId,id,status})=>{
  const normalized=String(status||'')
  if(!allowedStatuses.has(normalized))throw Object.assign(new Error('invalid webhook subscription status'),{status:400,code:'invalid_webhook_subscription_status'})
  const result=await withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query(
      `UPDATE ace_webhook_subscriptions SET status=$3,updated_at=now()
       WHERE workspace_id=$1 AND id=$2 RETURNING *`,
      [workspaceId,id,normalized]
    )
    if(!rows[0])return null
    let resumed=[]
    if(normalized==='paused'){
      await client.query(
        `UPDATE ace_webhook_deliveries SET status='paused',updated_at=now()
         WHERE workspace_id=$1 AND subscription_id=$2 AND status IN ('pending','queued','retrying')`,
        [workspaceId,id]
      )
    }else if(normalized==='disabled'){
      await client.query(
        `UPDATE ace_webhook_deliveries SET status='cancelled',updated_at=now()
         WHERE workspace_id=$1 AND subscription_id=$2 AND status IN ('pending','queued','retrying','paused')`,
        [workspaceId,id]
      )
    }else if(normalized==='active'){
      resumed=(await client.query(
        `UPDATE ace_webhook_deliveries SET status='pending',next_retry_at=now(),updated_at=now()
         WHERE workspace_id=$1 AND subscription_id=$2 AND status='paused'
         RETURNING id,max_attempts,deadline_at`,
        [workspaceId,id]
      )).rows
    }
    return {subscription:sanitizeSubscription(rows[0]),resumed}
  })
  if(result?.resumed?.length){
    for(const item of result.resumed){
      await enqueueDeliveryJob({
        workspaceId,
        deliveryId:item.id,
        maxAttempts:Number(item.max_attempts||8),
        deadlineAt:item.deadline_at,
        idempotencySuffix:'resume:'+Date.now()+':'+randomUUID()
      })
    }
  }
  return result?.subscription||null
}

export const enqueueWebhookDelivery=async({
  workspaceId,
  subscriptionId,
  eventId,
  eventType,
  payload,
  correlationId=null,
  replayOf=null
})=>{
  const cleanEventId=String(eventId||'').trim()
  const cleanEventType=String(eventType||'').trim()
  if(!eventPattern.test(cleanEventId)||!eventPattern.test(cleanEventType))throw Object.assign(new Error('invalid webhook event identity'),{status:400,code:'invalid_webhook_event'})
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Object.assign(new Error('webhook payload must be an object'),{status:400,code:'invalid_webhook_payload'})
  if(Buffer.byteLength(JSON.stringify(payload))>512*1024)throw Object.assign(new Error('webhook payload exceeds 512 KiB'),{status:413,code:'webhook_payload_too_large'})
  const record=await withTenantDbTransaction(workspaceId,async client=>{
    const subscription=(await client.query(
      `SELECT * FROM ace_webhook_subscriptions WHERE workspace_id=$1 AND id=$2`,
      [workspaceId,subscriptionId]
    )).rows[0]
    if(!subscription)return null
    const configured=Array.isArray(subscription.event_types)?subscription.event_types:[]
    if(cleanEventType!=='test.delivery'&&!configured.includes(cleanEventType)&&!configured.includes('*'))throw Object.assign(new Error('event type is not enabled for this webhook subscription'),{status:409,code:'webhook_event_not_subscribed'})
    const initialStatus=subscription.status==='active'?'pending':'paused'
    const deadlineAt=new Date(Date.now()+Number(subscription.retry_window_seconds)*1000).toISOString()
    const id='webhook_delivery_'+randomUUID()
    const {rows}=await client.query(
      `INSERT INTO ace_webhook_deliveries
        (id,workspace_id,subscription_id,event_id,event_type,payload,status,max_attempts,next_retry_at,signing_key_id,correlation_id,replay_of,deadline_at)
       VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,CASE WHEN $7='pending' THEN now() ELSE NULL END,$9,$10,$11,$12)
       ON CONFLICT (workspace_id,subscription_id,event_id)
       DO UPDATE SET updated_at=ace_webhook_deliveries.updated_at
       RETURNING *`,
      [id,workspaceId,subscriptionId,cleanEventId,cleanEventType,JSON.stringify(payload),initialStatus,Number(subscription.max_attempts),subscription.signing_key_id,correlationId,replayOf,deadlineAt]
    )
    return rows[0]
  })
  if(!record)return null
  if(record.status==='pending'){
    await enqueueDeliveryJob({
      workspaceId,
      deliveryId:record.id,
      maxAttempts:Number(record.max_attempts||8),
      deadlineAt:record.deadline_at
    })
    await withTenantDbTransaction(workspaceId,client=>client.query(
      `UPDATE ace_webhook_deliveries SET status='queued',updated_at=now()
       WHERE workspace_id=$1 AND id=$2 AND status='pending'`,
      [workspaceId,record.id]
    ))
    record.status='queued'
  }
  return sanitizeDelivery(record)
}

export const createWebhookTestDelivery=async({workspaceId,subscriptionId,actorId=null})=>enqueueWebhookDelivery({
  workspaceId,
  subscriptionId,
  eventId:'test:'+Date.now()+':'+randomUUID(),
  eventType:'test.delivery',
  correlationId:'test:'+String(actorId||'workspace'),
  payload:{synthetic:true,event:'test.delivery',occurredAt:new Date().toISOString(),message:'AceMarketing webhook test delivery'}
})

export const listWebhookDeliveries=async({workspaceId,subscriptionId=null,status=null,limit=100})=>withTenantDbTransaction(workspaceId,async client=>{
  const params=[workspaceId]
  const where=['workspace_id=$1']
  if(subscriptionId){params.push(subscriptionId);where.push('subscription_id=$'+params.length)}
  if(status){params.push(status);where.push('status=$'+params.length)}
  params.push(Math.max(1,Math.min(250,Number(limit)||100)))
  const {rows}=await client.query(
    `SELECT * FROM ace_webhook_deliveries
     WHERE ${where.join(' AND ')}
     ORDER BY updated_at DESC LIMIT $${params.length}`,
    params
  )
  return rows.map(sanitizeDelivery)
})

export const replayWebhookDelivery=async({workspaceId,deliveryId,actorId=null})=>{
  const source=await withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query(
      `SELECT * FROM ace_webhook_deliveries WHERE workspace_id=$1 AND id=$2`,
      [workspaceId,deliveryId]
    )
    return rows[0]||null
  })
  if(!source)return null
  return enqueueWebhookDelivery({
    workspaceId,
    subscriptionId:source.subscription_id,
    eventId:'replay:'+source.event_id+':'+randomUUID(),
    eventType:source.event_type,
    payload:source.payload,
    correlationId:'replay:'+String(actorId||source.correlation_id||'workspace'),
    replayOf:source.id
  })
}

export const loadWebhookDeliveryForDispatch=async({workspaceId,deliveryId})=>withTenantDbTransaction(workspaceId,async client=>{
  const {rows}=await client.query(
    `SELECT d.*,s.destination_url,s.status AS subscription_status,s.encrypted_signing_secret,s.signing_key_id AS current_signing_key_id
     FROM ace_webhook_deliveries d
     JOIN ace_webhook_subscriptions s ON s.workspace_id=d.workspace_id AND s.id=d.subscription_id
     WHERE d.workspace_id=$1 AND d.id=$2
     FOR UPDATE`,
    [workspaceId,deliveryId]
  )
  const row=rows[0]
  if(!row)return null
  if(row.subscription_status!=='active'){
    await client.query(
      `UPDATE ace_webhook_deliveries SET status='paused',updated_at=now()
       WHERE workspace_id=$1 AND id=$2`,
      [workspaceId,deliveryId]
    )
    return {paused:true,delivery:sanitizeDelivery({...row,status:'paused'})}
  }
  if(['delivered','dead_letter','cancelled'].includes(row.status))return {terminal:true,delivery:sanitizeDelivery(row)}
  await client.query(
    `UPDATE ace_webhook_deliveries
     SET status='delivering',attempt_count=attempt_count+1,updated_at=now()
     WHERE workspace_id=$1 AND id=$2`,
    [workspaceId,deliveryId]
  )
  const credential=decryptSecret(row.encrypted_signing_secret)
  return {
    paused:false,
    terminal:false,
    subscription:{
      id:row.subscription_id,
      destinationUrl:row.destination_url,
      signingSecret:String(credential.secret),
      signingKeyId:row.current_signing_key_id,
      maxAttempts:Number(row.max_attempts)
    },
    delivery:{
      ...sanitizeDelivery({...row,status:'delivering',attempt_count:Number(row.attempt_count||0)+1}),
      payload:row.payload
    }
  }
})

export const recordWebhookDeliveryAttempt=async({
  workspaceId,
  deliveryId,
  outcome,
  httpStatus=null,
  latencyMs=null,
  responseSummary=null,
  errorCode=null,
  errorMessage=null,
  retryAt=null,
  signingKeyId=null
})=>withTenantDbTransaction(workspaceId,async client=>{
  const delivery=(await client.query(
    `SELECT * FROM ace_webhook_deliveries WHERE workspace_id=$1 AND id=$2 FOR UPDATE`,
    [workspaceId,deliveryId]
  )).rows[0]
  if(!delivery)return null
  const attemptNo=Number(delivery.attempt_count||1)
  const attemptStatus=outcome==='delivered'?'delivered':outcome==='unknown_outcome'?'unknown_outcome':outcome==='retrying'?'retryable_failure':'permanent_failure'
  await client.query(
    `INSERT INTO ace_webhook_delivery_attempts
      (id,workspace_id,delivery_id,attempt_no,status,http_status,latency_ms,response_summary,error_code,error_message,signing_key_id)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (workspace_id,delivery_id,attempt_no) DO NOTHING`,
    ['webhook_attempt_'+randomUUID(),workspaceId,deliveryId,attemptNo,attemptStatus,httpStatus,latencyMs,String(responseSummary||'').slice(0,4000)||null,errorCode,String(errorMessage||'').slice(0,2000)||null,signingKeyId]
  )
  const finalStatus=outcome==='delivered'?'delivered':outcome==='unknown_outcome'?'unknown_outcome':outcome==='retrying'?'retrying':'dead_letter'
  const {rows}=await client.query(
    `UPDATE ace_webhook_deliveries
     SET status=$3,last_status_code=$4,last_error_code=$5,last_error=$6,response_summary=$7,
         next_retry_at=$8::timestamptz,signing_key_id=COALESCE($9,signing_key_id),
         delivered_at=CASE WHEN $3='delivered' THEN now() ELSE delivered_at END,
         updated_at=now()
     WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [workspaceId,deliveryId,finalStatus,httpStatus,errorCode,String(errorMessage||'').slice(0,2000)||null,String(responseSummary||'').slice(0,4000)||null,retryAt,signingKeyId]
  )
  return sanitizeDelivery(rows[0])
})

export const listWebhookDeliveryAttempts=async({workspaceId,deliveryId})=>withTenantDbTransaction(workspaceId,async client=>{
  const {rows}=await client.query(
    `SELECT attempt_no,status,http_status,latency_ms,response_summary,error_code,error_message,signing_key_id,attempted_at
     FROM ace_webhook_delivery_attempts
     WHERE workspace_id=$1 AND delivery_id=$2
     ORDER BY attempt_no DESC`,
    [workspaceId,deliveryId]
  )
  return rows
})

export const reconcileOrphanedWebhookDeliveries=async({limit=100}={})=>withSystemDbTransaction(async client=>{
  const {rows}=await client.query(
    `SELECT id,workspace_id,max_attempts,deadline_at FROM ace_webhook_deliveries
     WHERE status IN ('pending','retrying')
       AND (next_retry_at IS NULL OR next_retry_at<=now())
       AND (deadline_at IS NULL OR deadline_at>now())
     ORDER BY updated_at ASC
     LIMIT $1`,
    [Math.max(1,Math.min(500,Number(limit)||100))]
  )
  return rows
})
