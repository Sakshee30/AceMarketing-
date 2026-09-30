import {randomUUID} from 'node:crypto'
import {pool} from '../database.mjs'
import {withTenantDbTransaction} from './tenant-db.mjs'
import {deleteSearchProjection,upsertSearchDocument} from './search-port.mjs'

const stages=new Set(['scan','extract','index','retention','delete'])
const statuses=new Set(['pending','running','completed','failed','skipped'])

const recordEvent=async(client,{workspaceId,objectId,stage,status,objectSha256,storageVersion,evidence={},error=null})=>{
  if(!stages.has(stage)||!statuses.has(status))throw new Error('invalid object processing event')
  await client.query(
    `INSERT INTO ace_object_processing_events
      (id,workspace_id,object_id,stage,status,object_sha256,storage_version,evidence,error)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
    ['ope_'+randomUUID(),workspaceId,objectId,stage,status,objectSha256||null,storageVersion||null,JSON.stringify(evidence||{}),error]
  )
}

export const recordObjectExtraction=async({workspaceId,objectId,text,evidence={}})=>{
  if(!pool)throw new Error('database unavailable')
  const extracted=String(text||'')
  if(!extracted.trim())throw new Error('extracted text is required')
  const maxBytes=Math.max(10_000,Math.min(10_000_000,Number(process.env.OBJECT_MAX_EXTRACTED_TEXT_BYTES||2_000_000)))
  if(Buffer.byteLength(extracted,'utf8')>maxBytes)throw new Error('extracted text exceeds configured limit')
  return withTenantDbTransaction(workspaceId,async client=>{
    const object=(await client.query(
      'SELECT * FROM ace_objects WHERE workspace_id=$1 AND id=$2 FOR UPDATE',
      [workspaceId,objectId]
    )).rows[0]
    if(!object||object.status!=='approved'||object.scan_status!=='clean')throw new Error('object is not approved for extraction')
    if(!object.approved_sha256||!object.approved_storage_version)throw new Error('approved immutable object version is missing')
    await recordEvent(client,{
      workspaceId,objectId,stage:'extract',status:'completed',
      objectSha256:object.approved_sha256,storageVersion:object.approved_storage_version,evidence
    })
    await client.query(
      `UPDATE ace_objects SET extraction_status='completed',indexing_status='pending',
         processing_error=NULL,updated_at=now()
       WHERE workspace_id=$1 AND id=$2`,
      [workspaceId,objectId]
    )
    return {
      objectId,
      text:extracted,
      approvedSha256:object.approved_sha256,
      approvedStorageVersion:object.approved_storage_version,
      accessPolicy:object.access_policy,
      title:object.original_name
    }
  })
}

export const indexExtractedObject=async({workspaceId,objectId,text,evidence={}})=>{
  const extraction=await recordObjectExtraction({workspaceId,objectId,text,evidence})
  const indexed=await upsertSearchDocument({
    workspaceId,
    sourceType:'object',
    sourceId:objectId,
    sourceVersion:extraction.approvedStorageVersion,
    title:extraction.title,
    body:extraction.text,
    accessPolicy:extraction.accessPolicy,
    metadata:{
      objectSha256:extraction.approvedSha256,
      storageVersion:extraction.approvedStorageVersion
    }
  })
  return withTenantDbTransaction(workspaceId,async client=>{
    const object=(await client.query(
      'SELECT * FROM ace_objects WHERE workspace_id=$1 AND id=$2 FOR UPDATE',
      [workspaceId,objectId]
    )).rows[0]
    if(!object||object.approved_storage_version!==extraction.approvedStorageVersion||
       object.approved_sha256!==extraction.approvedSha256){
      await deleteSearchProjection({workspaceId,sourceType:'object',sourceId:objectId})
      throw new Error('object version changed during indexing')
    }
    await recordEvent(client,{
      workspaceId,objectId,stage:'index',status:'completed',
      objectSha256:object.approved_sha256,storageVersion:object.approved_storage_version,evidence:{...evidence,searchDocumentId:indexed.id}
    })
    const {rows}=await client.query(
      `UPDATE ace_objects SET indexing_status='completed',searchable_at=now(),processing_error=NULL,updated_at=now()
       WHERE workspace_id=$1 AND id=$2 RETURNING *`,
      [workspaceId,objectId]
    )
    return rows[0]
  })
}

export const markObjectProcessingFailure=async({workspaceId,objectId,stage,error,evidence={}})=>{
  const message=String(error||'processing failed').slice(0,2000)
  return withTenantDbTransaction(workspaceId,async client=>{
    const object=(await client.query(
      'SELECT * FROM ace_objects WHERE workspace_id=$1 AND id=$2 FOR UPDATE',
      [workspaceId,objectId]
    )).rows[0]
    if(!object)throw new Error('object not found')
    await recordEvent(client,{
      workspaceId,objectId,stage,status:'failed',
      objectSha256:object.approved_sha256||object.actual_sha256,
      storageVersion:object.approved_storage_version||object.storage_version,
      evidence,error:message
    })
    const field=stage==='extract'?'extraction_status':stage==='index'?'indexing_status':null
    if(field)await client.query(
      `UPDATE ace_objects SET ${field}='failed',processing_error=$3,updated_at=now()
       WHERE workspace_id=$1 AND id=$2`,
      [workspaceId,objectId,message]
    )
    return {objectId,stage,status:'failed',error:message}
  })
}
