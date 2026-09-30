import {randomUUID} from 'node:crypto'
import {pool} from '../database.mjs'
import {withSystemDbTransaction,withTenantDbTransaction} from './tenant-db.mjs'

export const reliabilityStoreAvailable=()=>Boolean(pool)

export const reserveIdempotency=async({workspaceId,operationId,key,requestHash,ttlSeconds=86400})=>{
  if(!pool)throw new Error('reliability store is unavailable')
  return withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query(
      `INSERT INTO ace_request_idempotency
        (workspace_id,operation_id,idempotency_key,request_hash,status,expires_at)
       VALUES ($1,$2,$3,$4,'pending',now()+($5*interval '1 second'))
       ON CONFLICT (workspace_id,operation_id,idempotency_key)
       DO UPDATE SET updated_at=ace_request_idempotency.updated_at
       RETURNING *`,
      [workspaceId,operationId,key,requestHash,Math.max(60,Number(ttlSeconds)||86400)]
    )
    const record=rows[0]
    if(record.request_hash!==requestHash){
      const error=new Error('idempotency key was already used with a different request')
      error.status=409
      error.code='idempotency_key_reused'
      throw error
    }
    return record
  })
}

export const completeIdempotency=async({workspaceId,operationId,key,responseStatus,responseBody})=>{
  if(!pool)throw new Error('reliability store is unavailable')
  return withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query(
      `UPDATE ace_request_idempotency
       SET status='completed',response_status=$4,response_body=$5::jsonb,error_code=NULL,updated_at=now()
       WHERE workspace_id=$1 AND operation_id=$2 AND idempotency_key=$3
       RETURNING *`,
      [workspaceId,operationId,key,Number(responseStatus),JSON.stringify(responseBody??null)]
    )
    return rows[0]||null
  })
}

export const failIdempotency=async({workspaceId,operationId,key,errorCode})=>{
  if(!pool)throw new Error('reliability store is unavailable')
  return withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query(
      `UPDATE ace_request_idempotency
       SET status='failed',error_code=$4,updated_at=now()
       WHERE workspace_id=$1 AND operation_id=$2 AND idempotency_key=$3
       RETURNING *`,
      [workspaceId,operationId,key,String(errorCode||'operation_failed').slice(0,160)]
    )
    return rows[0]||null
  })
}

export const appendOutboxEvent=async({
  workspaceId,eventType,payload={},aggregateType=null,aggregateId=null,availableAt=null,id=randomUUID()
})=>{
  if(!pool)throw new Error('reliability store is unavailable')
  return withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query(
      `INSERT INTO ace_outbox_events
        (id,workspace_id,event_type,aggregate_type,aggregate_id,payload,status,available_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,'pending',COALESCE($7::timestamptz,now()))
       RETURNING *`,
      [id,workspaceId,eventType,aggregateType,aggregateId,JSON.stringify(payload),availableAt]
    )
    return rows[0]
  })
}

export const claimOutboxEvents=async({workerId,limit=25,leaseSeconds=30})=>{
  if(!pool)return []
  return withSystemDbTransaction(async client=>{
    const {rows}=await client.query(
      `WITH picked AS (
         SELECT id FROM ace_outbox_events
         WHERE (
           status='pending' OR
           (status='leased' AND leased_until<now())
         )
         AND available_at<=now()
         ORDER BY available_at,created_at
         FOR UPDATE SKIP LOCKED
         LIMIT $1
       )
       UPDATE ace_outbox_events e
       SET status='leased',lease_owner=$2,leased_until=now()+($3*interval '1 second'),attempts=e.attempts+1
       FROM picked
       WHERE e.id=picked.id
       RETURNING e.*`,
      [Math.max(1,Math.min(250,Number(limit)||25)),workerId,Math.max(5,Number(leaseSeconds)||30)]
    )
    return rows
  })
}

export const markOutboxPublished=async({id,workerId})=>{
  if(!pool)return null
  return withSystemDbTransaction(async client=>{
    const {rows}=await client.query(
      `UPDATE ace_outbox_events
       SET status='published',published_at=now(),lease_owner=NULL,leased_until=NULL,last_error=NULL
       WHERE id=$1 AND status='leased' AND lease_owner=$2
       RETURNING *`,
      [id,workerId]
    )
    return rows[0]||null
  })
}

export const recordInboxEvent=async({source,eventId,workspaceId,payloadHash})=>{
  if(!pool)throw new Error('reliability store is unavailable')
  return withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query(
      `INSERT INTO ace_inbox_events (source,event_id,workspace_id,payload_hash)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (source,event_id) DO UPDATE SET source=ace_inbox_events.source
       RETURNING *`,
      [source,eventId,workspaceId,payloadHash]
    )
    const record=rows[0]
    if(record.workspace_id!==workspaceId||record.payload_hash!==payloadHash){
      const error=new Error('inbox event identity conflict')
      error.status=409
      error.code='inbox_event_conflict'
      throw error
    }
    return record
  })
}

export const markInboxProcessed=async({source,eventId,workspaceId,result=null})=>{
  if(!pool)return null
  if(!workspaceId)throw new Error('workspaceId is required')
  return withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query(
      `UPDATE ace_inbox_events
       SET processed_at=COALESCE(processed_at,now()),result=COALESCE(result,$4::jsonb)
       WHERE source=$1 AND event_id=$2 AND workspace_id=$3
       RETURNING *`,
      [source,eventId,workspaceId,JSON.stringify(result)]
    )
    return rows[0]||null
  })
}
