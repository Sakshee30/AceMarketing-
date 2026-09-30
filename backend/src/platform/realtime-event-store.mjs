import {randomUUID} from 'node:crypto'
import {withSystemDbTransaction,withTenantDbTransaction} from './tenant-db.mjs'

export const appendRealtimeEvent=async({
  id='rte_'+randomUUID(),
  workspaceId,
  eventType,
  resourceType=null,
  resourceId=null,
  payload={}
})=>{
  if(!workspaceId||!eventType)throw new Error('workspaceId and eventType are required')
  return withSystemDbTransaction(async client=>{
    const {rows}=await client.query(
      `INSERT INTO ace_realtime_events
       (id,workspace_id,event_type,resource_type,resource_id,payload)
       VALUES($1,$2,$3,$4,$5,$6::jsonb)
       ON CONFLICT (id) DO UPDATE SET id=ace_realtime_events.id
       RETURNING sequence,id,workspace_id,event_type,resource_type,resource_id,payload,created_at`,
      [id,workspaceId,eventType,resourceType,resourceId,JSON.stringify(payload)]
    )
    return rows[0]
  })
}

export const listRealtimeEventsAfter=async({
  workspaceId,
  afterSequence=0,
  eventTypes=[],
  limit=100
})=>withTenantDbTransaction(workspaceId,async client=>{
  const types=(eventTypes||[]).map(String).filter(Boolean).slice(0,50)
  const bounded=Math.max(1,Math.min(500,Number(limit)||100))
  const params=[workspaceId,Math.max(0,Number(afterSequence)||0)]
  let where='workspace_id=$1 AND sequence>$2'
  if(types.length){
    params.push(types)
    where+=' AND event_type = ANY($3::text[])'
  }
  params.push(bounded)
  const {rows}=await client.query(
    `SELECT sequence,id,workspace_id,event_type,resource_type,resource_id,payload,created_at
     FROM ace_realtime_events
     WHERE ${where}
     ORDER BY sequence ASC
     LIMIT $${params.length}`,
    params
  )
  return rows.map(row=>({
    sequence:Number(row.sequence),
    id:row.id,
    workspaceId:row.workspace_id,
    type:row.event_type,
    resourceType:row.resource_type,
    resourceId:row.resource_id,
    occurredAt:row.created_at,
    payload:row.payload||{}
  }))
})

export const purgeRealtimeEventsBefore=async({before,limit=5000})=>
  withSystemDbTransaction(async client=>{
    const {rowCount}=await client.query(
      `DELETE FROM ace_realtime_events
       WHERE sequence IN (
         SELECT sequence FROM ace_realtime_events
         WHERE created_at<$1::timestamptz
         ORDER BY sequence
         LIMIT $2
       )`,
      [before,Math.max(1,Math.min(50_000,Number(limit)||5000))]
    )
    return rowCount||0
  })
