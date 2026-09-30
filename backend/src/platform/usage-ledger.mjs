import {randomUUID} from 'node:crypto'
import {embeddedDatabase,pool} from '../database.mjs'
import {withTenantDbTransaction} from './tenant-db.mjs'

const monthStartSql="date_trunc('month',CURRENT_DATE)::date"

export const usageLedgerAvailable=()=>Boolean(pool&&!embeddedDatabase)

export const recordUsageLedgerEvent=async({
  workspaceId,
  eventId,
  metric,
  quantity=1,
  requestId=null,
  reservationId=null,
  source='api',
  metadata={}
})=>{
  if(!pool||embeddedDatabase)return {recorded:false,embedded:embeddedDatabase}
  const normalizedQuantity=Math.max(1,Math.floor(Number(quantity)||1))
  return withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query(
      `INSERT INTO ace_usage_ledger
        (id,workspace_id,event_id,metric,quantity,request_id,reservation_id,source,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
       ON CONFLICT (workspace_id,event_id) DO UPDATE SET event_id=ace_usage_ledger.event_id
       RETURNING *`,
      [
        'usage_'+randomUUID(),
        workspaceId,
        String(eventId),
        String(metric),
        normalizedQuantity,
        requestId?String(requestId):null,
        reservationId?String(reservationId):null,
        String(source||'api').slice(0,80),
        JSON.stringify(metadata&&typeof metadata==='object'&&!Array.isArray(metadata)?metadata:{})
      ]
    )
    if(reservationId){
      await client.query(
        `UPDATE ace_usage_reservations
         SET status='accounted',updated_at=now()
         WHERE workspace_id=$1 AND id=$2 AND status IN ('reserved','committed')`,
        [workspaceId,reservationId]
      )
    }
    return {recorded:true,item:rows[0]}
  })
}

export const effectiveUsageForMetric=async({workspaceId,metric,client=null})=>{
  if(!pool)return {used:0,reserved:0,ledger:0,daily:0}
  const execute=async db=>{
    const daily=(await db.query(
      `SELECT COALESCE(SUM(CASE $2
        WHEN 'tracked_events' THEN tracked_events
        WHEN 'assisted_events' THEN assisted_events
        WHEN 'signal_dispatches' THEN signal_dispatches
        WHEN 'agent_actions' THEN agent_actions
        WHEN 'audience_syncs' THEN audience_syncs
        WHEN 'custom_integration_tests' THEN custom_integration_tests
        ELSE 0 END),0)::bigint value
       FROM ace_usage_daily
       WHERE workspace_id=$1 AND usage_date>=${monthStartSql}`,
      [workspaceId,metric]
    )).rows[0]
    if(embeddedDatabase){
      return {used:Number(daily?.value||0),reserved:0,ledger:0,daily:Number(daily?.value||0)}
    }
    const ledger=(await db.query(
      `SELECT COALESCE(SUM(quantity),0)::bigint value
       FROM ace_usage_ledger
       WHERE workspace_id=$1 AND metric=$2 AND usage_date>=${monthStartSql}`,
      [workspaceId,metric]
    )).rows[0]
    const pending=(await db.query(
      `SELECT COALESCE(SUM(r.quantity),0)::bigint value
       FROM ace_usage_reservations r
       WHERE r.workspace_id=$1
         AND r.metric=$2
         AND r.period_start=${monthStartSql}
         AND (
           r.status='reserved'
           OR (
             r.status='committed'
             AND NOT EXISTS (
               SELECT 1 FROM ace_usage_ledger l
               WHERE l.workspace_id=r.workspace_id
                 AND l.metric=r.metric
                 AND l.request_id=r.request_id
             )
           )
         )`,
      [workspaceId,metric]
    )).rows[0]
    const dailyValue=Number(daily?.value||0)
    const ledgerValue=Number(ledger?.value||0)
    return {
      used:Math.max(dailyValue,ledgerValue),
      reserved:Number(pending?.value||0),
      ledger:ledgerValue,
      daily:dailyValue
    }
  }
  if(client)return execute(client)
  if(embeddedDatabase)return execute(pool)
  return withTenantDbTransaction(workspaceId,execute)
}

export const reserveUsageCapacity=async({workspaceId,metric,quantity=1,requestId=null,limit=0})=>{
  if(!pool)return {allowed:true,reservationId:null}
  const normalizedQuantity=Math.max(1,Math.floor(Number(quantity)||1))
  if(Number(limit)===0)return {allowed:true,reservationId:null,unlimited:true}
  if(embeddedDatabase){
    const usage=await effectiveUsageForMetric({workspaceId,metric})
    return usage.used+normalizedQuantity>Number(limit)
      ?{allowed:false,reason:'quota_exceeded',metric,used:usage.used,reserved:0,limit:Number(limit),requested:normalizedQuantity}
      :{allowed:true,reservationId:null,metric,used:usage.used,reserved:0,limit:Number(limit)}
  }
  return withTenantDbTransaction(workspaceId,async client=>{
    await client.query(
      'SELECT workspace_id FROM ace_workspace_subscriptions WHERE workspace_id=$1 FOR UPDATE',
      [workspaceId]
    )
    if(requestId){
      const existing=(await client.query(
        `SELECT * FROM ace_usage_reservations
         WHERE workspace_id=$1 AND request_id=$2 AND metric=$3
         LIMIT 1`,
        [workspaceId,String(requestId),metric]
      )).rows[0]
      if(existing){
        return {
          allowed:existing.status!=='released',
          reservationId:existing.id,
          duplicate:true,
          metric,
          limit:Number(limit)
        }
      }
    }
    const usage=await effectiveUsageForMetric({workspaceId,metric,client})
    if(usage.used+usage.reserved+normalizedQuantity>Number(limit)){
      return {
        allowed:false,
        reason:'quota_exceeded',
        metric,
        used:usage.used,
        reserved:usage.reserved,
        limit:Number(limit),
        requested:normalizedQuantity
      }
    }
    const id='ur_'+randomUUID()
    const {rows}=await client.query(
      `INSERT INTO ace_usage_reservations
        (id,workspace_id,metric,quantity,period_start,status,request_id)
       VALUES ($1,$2,$3,$4,${monthStartSql},'reserved',$5)
       RETURNING *`,
      [id,workspaceId,metric,normalizedQuantity,requestId?String(requestId):null]
    )
    return {
      allowed:true,
      reservationId:rows[0].id,
      metric,
      used:usage.used,
      reserved:usage.reserved,
      limit:Number(limit)
    }
  })
}

export const finalizeUsageReservation=async({workspaceId,id,success=true})=>{
  if(!pool||!id)return null
  if(embeddedDatabase)return null
  return withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query(
      `UPDATE ace_usage_reservations
       SET status=$3,updated_at=now()
       WHERE workspace_id=$1 AND id=$2 AND status='reserved'
       RETURNING *`,
      [workspaceId,id,success?'committed':'released']
    )
    return rows[0]||null
  })
}

export const reconcileExpiredUsageReservations=async({workspaceId,ttlMinutes=30})=>{
  if(!pool||embeddedDatabase)return {released:0}
  const ttl=Math.max(5,Math.min(24*60,Number(ttlMinutes)||30))
  return withTenantDbTransaction(workspaceId,async client=>{
    const {rowCount}=await client.query(
      `UPDATE ace_usage_reservations
       SET status='released',updated_at=now()
       WHERE workspace_id=$1
         AND status='reserved'
         AND created_at<now()-($2*interval '1 minute')`,
      [workspaceId,ttl]
    )
    return {released:Number(rowCount||0)}
  })
}
