import {randomUUID} from 'node:crypto'
import {pool} from '../database.mjs'

const clean=(value,max=240)=>{
  if(value==null)return null
  const text=String(value).trim()
  return text?text.slice(0,max):null
}

const safeMetadata=value=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return {}
  const out={}
  for(const [key,item] of Object.entries(value)){
    if(/token|secret|password|authorization|cookie/i.test(key))continue
    if(item==null||typeof item==='string'||typeof item==='number'||typeof item==='boolean')out[key]=item
  }
  return out
}

export const auditStoreAvailable=()=>Boolean(pool)

export const appendAuditRecord=async({
  workspaceId,
  actorId=null,
  actorType='user',
  action,
  entityType=null,
  entityId=null,
  requestId=null,
  traceId=null,
  outcome='success',
  metadata={}
})=>{
  if(!pool)return null
  if(!workspaceId||!action)throw new Error('workspaceId and action are required for audit records')
  const id='audit_'+randomUUID()
  const safeOutcome=['success','denied','failed','unknown'].includes(outcome)?outcome:'unknown'
  const {rows}=await pool.query(
    `INSERT INTO ace_platform_audit
      (id,workspace_id,actor_id,actor_type,action,entity_type,entity_id,request_id,trace_id,outcome,metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
     RETURNING *`,
    [
      id,
      clean(workspaceId,64),
      clean(actorId,160),
      clean(actorType,40)||'user',
      clean(action,180),
      clean(entityType,120),
      clean(entityId,240),
      clean(requestId,160),
      clean(traceId,160),
      safeOutcome,
      JSON.stringify(safeMetadata(metadata))
    ]
  )
  return rows[0]
}

export const listAuditRecords=async({workspaceId,limit=100,before=null}={})=>{
  if(!pool)return []
  const capped=Math.max(1,Math.min(500,Number(limit)||100))
  const params=[workspaceId,capped]
  let timeClause=''
  if(before){
    params.push(before)
    timeClause=' AND created_at<$3::timestamptz'
  }
  const {rows}=await pool.query(
    `SELECT * FROM ace_platform_audit
     WHERE workspace_id=$1${timeClause}
     ORDER BY created_at DESC
     LIMIT $2`,
    params
  )
  return rows
}
