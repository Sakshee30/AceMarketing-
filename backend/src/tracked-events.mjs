import {pool} from './database.mjs'
import {withTenantDbTransaction} from './platform/tenant-db.mjs'

const bounded=(value,max=2048)=>value==null||value===''?null:String(value).slice(0,max)

export const appendTrackedEvent=async(workspaceId,event)=>{
  if(!pool)return null
  const payload={...event}
  delete payload.email
  delete payload.phone
  const occurredAt=new Date(event.occurredAt||event.timestamp||event.receivedAt||Date.now())
  const receivedAt=new Date(event.receivedAt||Date.now())
  if(Number.isNaN(occurredAt.getTime())||Number.isNaN(receivedAt.getTime()))throw new Error('invalid event timestamp')
  const {rows}=await withTenantDbTransaction(workspaceId,db=>db.query(
    `INSERT INTO ace_events
      (id,workspace_id,event_type,event_category,occurred_at,received_at,source,customer_id,visitor_id,device_id,email_sha256,phone_sha256,campaign,payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)
     ON CONFLICT(workspace_id,id) DO UPDATE SET received_at=ace_events.received_at
     RETURNING *`,
    [
      String(event.id),workspaceId,
      bounded(event.event||event.eventType||event.name||'event',160),
      bounded(event.consentCategory||event.eventCategory||'analytics',64),
      occurredAt.toISOString(),receivedAt.toISOString(),
      bounded(event.source||event.channel||event.utm_source,160),
      bounded(event.customerId||event.customer_id,256),
      bounded(event.visitorId||event.visitor_id,256),
      bounded(event.deviceId||event.device_id,256),
      bounded(event.emailSha256||event.email_sha256,128),
      bounded(event.phoneSha256||event.phone_sha256,128),
      bounded(event.campaign||event.utm_campaign,256),
      JSON.stringify(payload)
    ]
  ))
  return rows[0]||null
}

export const listTrackedEvents=async(workspaceId,{limit=500,minutes=null}={})=>{
  if(!pool)return []
  const safeLimit=Math.max(1,Math.min(Number(limit||500),50000))
  const params=[workspaceId]
  let where='workspace_id=$1'
  if(minutes!=null){
    params.push(Math.max(1,Math.min(Number(minutes)||1,525600)))
    where+=` AND received_at>=now()-($${params.length}::int*interval '1 minute')`
  }
  params.push(safeLimit)
  const {rows}=await withTenantDbTransaction(workspaceId,db=>db.query(
    `SELECT id,event_type,event_category,occurred_at,received_at,source,customer_id,visitor_id,device_id,email_sha256,phone_sha256,campaign,payload
     FROM ace_events WHERE ${where} ORDER BY received_at DESC LIMIT $${params.length}`,
    params
  ))
  return rows.map(row=>({
    ...(row.payload&&typeof row.payload==='object'?row.payload:{}),
    id:row.id,
    event:row.event_type,
    eventType:row.event_type,
    consentCategory:row.event_category,
    occurredAt:row.occurred_at,
    receivedAt:row.received_at,
    source:row.source,
    customerId:row.customer_id,
    visitorId:row.visitor_id,
    deviceId:row.device_id,
    emailSha256:row.email_sha256,
    phoneSha256:row.phone_sha256,
    campaign:row.campaign
  }))
}

export const trackedEventStats=async(workspaceId)=>{
  if(!pool)return {available:false,total:0,lastMinute:0}
  const {rows}=await withTenantDbTransaction(workspaceId,db=>db.query(
    `SELECT COUNT(*)::int total,
            COUNT(*) FILTER (WHERE received_at>=now()-interval '1 minute')::int last_minute,
            MAX(received_at) last_received_at
     FROM ace_events WHERE workspace_id=$1`,
    [workspaceId]
  ))
  const row=rows[0]||{}
  return {available:true,total:Number(row.total||0),lastMinute:Number(row.last_minute||0),lastReceivedAt:row.last_received_at||null}
}
