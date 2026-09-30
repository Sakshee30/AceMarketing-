import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto'
import {extname} from 'node:path'
import {embeddedDatabase,pool} from '../database.mjs'
import {withTenantDbTransaction} from './tenant-db.mjs'
import {createApprovedDownloadUrl,createQuarantineUploadUrl,objectStorageConfigured} from './object-storage.mjs'

const DEFAULT_MAX_BYTES=Number(process.env.OBJECT_MAX_UPLOAD_BYTES||25*1024*1024)
const WORKSPACE_MAX_BYTES=Number(process.env.OBJECT_WORKSPACE_MAX_BYTES||5*1024*1024*1024)
const UPLOAD_GRANT_TTL_SECONDS=Math.max(60,Math.min(3600,Number(process.env.OBJECT_UPLOAD_GRANT_TTL_SECONDS||600)))
const DOWNLOAD_GRANT_TTL_SECONDS=Math.max(30,Math.min(900,Number(process.env.OBJECT_DOWNLOAD_GRANT_TTL_SECONDS||300)))
const REQUIRE_VERSIONED_STORAGE=String(process.env.OBJECT_REQUIRE_VERSIONED_STORAGE??(process.env.NODE_ENV==='production'?'true':'false')).toLowerCase()!=='false'

const allowedMime=new Set(String(process.env.OBJECT_ALLOWED_MIME_TYPES||
  'application/pdf,text/plain,text/csv,application/json,image/png,image/jpeg,image/webp'
).split(',').map(x=>x.trim().toLowerCase()).filter(Boolean))

const allowedExtensions=new Set(String(process.env.OBJECT_ALLOWED_EXTENSIONS||
  '.pdf,.txt,.csv,.json,.png,.jpg,.jpeg,.webp'
).split(',').map(x=>x.trim().toLowerCase()).filter(Boolean))

const sha256=value=>createHash('sha256').update(value).digest('hex')
const tokenHash=value=>sha256(String(value))
const validDigest=value=>/^[a-f0-9]{64}$/i.test(String(value||''))
const cleanName=value=>String(value||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,255)

const normalizedPolicy=value=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return {}
  const roles=Array.isArray(value.allowedRoles)
    ?Array.from(new Set(value.allowedRoles.map(x=>String(x).trim()).filter(Boolean))).slice(0,20)
    :[]
  return roles.length?{allowedRoles:roles}:{}
}

export const canReadObject=(policy,role)=>{
  const roles=Array.isArray(policy?.allowedRoles)?policy.allowedRoles:[]
  return !roles.length||role==='owner'||roles.includes(role)
}

const validateIntent=({name,mime,size,sha256Hex})=>{
  const filename=cleanName(name)
  if(!filename)throw new Error('file name is required')
  const extension=extname(filename).toLowerCase()
  if(!allowedExtensions.has(extension))throw new Error('file extension is not allowed')
  const declaredMime=String(mime||'').toLowerCase().trim()
  if(!allowedMime.has(declaredMime))throw new Error('file MIME type is not allowed')
  const expectedSize=Number(size)
  if(!Number.isSafeInteger(expectedSize)||expectedSize<=0)throw new Error('file size must be a positive integer')
  if(expectedSize>DEFAULT_MAX_BYTES)throw new Error('file exceeds configured upload limit')
  if(!validDigest(sha256Hex))throw new Error('sha256 must be a 64-character hexadecimal digest')
  return {filename,extension,declaredMime,expectedSize,expectedSha256:String(sha256Hex).toLowerCase()}
}

const workspaceUsage=async(client,workspaceId)=>{
  const {rows}=await client.query(
    `SELECT COALESCE(SUM(COALESCE(actual_size,expected_size)),0)::bigint used
     FROM ace_objects
     WHERE workspace_id=$1 AND status<>'deleted'`,
    [workspaceId]
  )
  return Number(rows[0]?.used||0)
}

const createGrant=async(client,{workspaceId,objectId,purpose,createdBy,ttlSeconds})=>{
  const raw=randomBytes(32).toString('base64url')
  const id='og_'+randomUUID()
  const expiresAt=new Date(Date.now()+ttlSeconds*1000).toISOString()
  await client.query(
    `INSERT INTO ace_object_access_grants
      (id,workspace_id,object_id,purpose,token_hash,expires_at,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id,workspaceId,objectId,purpose,tokenHash(raw),expiresAt,createdBy||null]
  )
  return {id,token:raw,expiresAt}
}

export const createUploadIntent=async({workspaceId,name,mime,size,sha256:sha256Hex,accessPolicy={},actorId=null})=>{
  if(!pool)throw new Error('database unavailable')
  const validated=validateIntent({name,mime,size,sha256Hex})
  return withTenantDbTransaction(workspaceId,async client=>{
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      ['object-quota:'+workspaceId]
    ).catch(error=>{if(!embeddedDatabase)throw error})
    const used=await workspaceUsage(client,workspaceId)
    if(WORKSPACE_MAX_BYTES>0&&used+validated.expectedSize>WORKSPACE_MAX_BYTES){
      const error=new Error('workspace object-storage quota exceeded')
      error.code='object_quota_exceeded'
      error.status=429
      throw error
    }
    const id='obj_'+randomUUID()
    const objectKey='workspaces/'+workspaceId+'/quarantine/'+randomUUID()+validated.extension
    const policy=normalizedPolicy(accessPolicy)
    const {rows}=await client.query(
      `INSERT INTO ace_objects
        (id,workspace_id,object_key,original_name,declared_mime,expected_size,expected_sha256,access_policy,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
       RETURNING *`,
      [id,workspaceId,objectKey,validated.filename,validated.declaredMime,validated.expectedSize,validated.expectedSha256,JSON.stringify(policy),actorId]
    )
    const grant=await createGrant(client,{workspaceId,objectId:id,purpose:'upload',createdBy:actorId,ttlSeconds:UPLOAD_GRANT_TTL_SECONDS})
    let directUpload=null
    if(objectStorageConfigured()){
      directUpload=createQuarantineUploadUrl({
        key:objectKey,
        workspaceId,
        sha256:validated.expectedSha256,
        expiresSeconds:UPLOAD_GRANT_TTL_SECONDS
      })
    }else if(process.env.NODE_ENV==='production'){
      throw new Error('durable object storage is not configured')
    }
    return {
      object:rows[0],
      uploadGrant:{token:grant.token,expiresAt:grant.expiresAt},
      directUpload,
      storageConfigured:objectStorageConfigured(),
      constraints:{
        maxBytes:DEFAULT_MAX_BYTES,
        expectedSize:validated.expectedSize,
        expectedSha256:validated.expectedSha256,
        declaredMime:validated.declaredMime
      }
    }
  })
}

export const verifyUploadGrant=async({workspaceId,objectId,token})=>{
  if(!pool)return false
  const hash=tokenHash(token)
  return withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query(
      `SELECT token_hash
       FROM ace_object_access_grants
       WHERE workspace_id=$1 AND object_id=$2 AND purpose='upload'
         AND used_at IS NULL AND expires_at>now()
       ORDER BY created_at DESC LIMIT 1`,
      [workspaceId,objectId]
    )
    const saved=String(rows[0]?.token_hash||'')
    if(!saved)return false
    const a=Buffer.from(saved),b=Buffer.from(hash)
    return a.length===b.length&&timingSafeEqual(a,b)
  })
}

export const markObjectQuarantined=async({
  workspaceId,objectId,grantToken,actualSize,actualSha256,detectedMime,storageProvider='object-storage',storageVersion=null
})=>{
  if(!pool)throw new Error('database unavailable')
  if(!validDigest(actualSha256))throw new Error('actual sha256 is invalid')
  const normalizedSize=Number(actualSize)
  if(!Number.isSafeInteger(normalizedSize)||normalizedSize<=0)throw new Error('actual size is invalid')
  return withTenantDbTransaction(workspaceId,async client=>{
    const hash=tokenHash(grantToken)
    const grant=(await client.query(
      `SELECT * FROM ace_object_access_grants
       WHERE workspace_id=$1 AND object_id=$2 AND purpose='upload'
         AND token_hash=$3 AND used_at IS NULL AND expires_at>now()
       FOR UPDATE`,
      [workspaceId,objectId,hash]
    )).rows[0]
    if(!grant)throw new Error('upload grant is invalid or expired')
    const object=(await client.query(
      `SELECT * FROM ace_objects WHERE workspace_id=$1 AND id=$2 FOR UPDATE`,
      [workspaceId,objectId]
    )).rows[0]
    if(!object)throw new Error('object not found')
    if(object.status!=='upload_pending')throw new Error('object is not awaiting upload')
    const mismatch=
      Number(object.expected_size)!==normalizedSize||
      String(object.expected_sha256).toLowerCase()!==String(actualSha256).toLowerCase()||
      String(object.declared_mime).toLowerCase()!==String(detectedMime||'').toLowerCase()
    const nextStatus=mismatch?'rejected':'quarantined'
    const nextScan=mismatch?'error':'pending'
    const {rows}=await client.query(
      `UPDATE ace_objects SET
         actual_size=$3,actual_sha256=$4,detected_mime=$5,storage_provider=$6,storage_version=$7,
         status=$8,scan_status=$9,updated_at=now()
       WHERE workspace_id=$1 AND id=$2
       RETURNING *`,
      [workspaceId,objectId,normalizedSize,String(actualSha256).toLowerCase(),String(detectedMime||'').toLowerCase(),storageProvider,storageVersion,nextStatus,nextScan]
    )
    await client.query(
      `UPDATE ace_object_access_grants SET used_at=now()
       WHERE workspace_id=$1 AND id=$2`,
      [workspaceId,grant.id]
    )
    return {object:rows[0],integrityMatched:!mismatch}
  })
}

export const recordObjectScan=async({workspaceId,objectId,result,evidence={},actorId=null})=>{
  if(!['clean','infected','error'].includes(String(result)))throw new Error('invalid scan result')
  return withTenantDbTransaction(workspaceId,async client=>{
    const object=(await client.query(
      `SELECT * FROM ace_objects WHERE workspace_id=$1 AND id=$2 FOR UPDATE`,
      [workspaceId,objectId]
    )).rows[0]
    if(!object)throw new Error('object not found')
    if(!['quarantined','verifying'].includes(object.status))throw new Error('object is not available for scanning')
    const approved=result==='clean'
    if(approved&&REQUIRE_VERSIONED_STORAGE&&!object.storage_version){
      throw new Error('clean scan cannot approve an object without an immutable storage version')
    }
    const {rows}=await client.query(
      `UPDATE ace_objects SET
         scan_status=$3,
         scan_evidence=$4::jsonb,
         status=$5,
         approved_storage_version=CASE WHEN $5='approved' THEN storage_version ELSE approved_storage_version END,
         approved_sha256=CASE WHEN $5='approved' THEN actual_sha256 ELSE approved_sha256 END,
         extraction_status=CASE WHEN $5='approved' THEN 'pending' ELSE extraction_status END,
         indexing_status=CASE WHEN $5='approved' THEN 'not_started' ELSE indexing_status END,
         approved_at=CASE WHEN $5='approved' THEN now() ELSE approved_at END,
         updated_at=now()
       WHERE workspace_id=$1 AND id=$2
       RETURNING *`,
      [workspaceId,objectId,result,JSON.stringify({...evidence,recordedBy:actorId||null,storageVersion:object.storage_version||null,sha256:object.actual_sha256||null}),approved?'approved':'rejected']
    )
    return rows[0]
  })
}

export const listObjects=async({workspaceId,role='viewer',limit=100})=>{
  if(!pool)return []
  return withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query(
      `SELECT id,object_key,original_name,declared_mime,detected_mime,expected_size,actual_size,
              expected_sha256,actual_sha256,storage_provider,storage_version,approved_storage_version,approved_sha256,
              status,scan_status,extraction_status,indexing_status,searchable_at,processing_error,
              access_policy,retention_until,legal_hold,created_by,created_at,updated_at,approved_at
       FROM ace_objects
       WHERE workspace_id=$1 AND status<>'deleted'
       ORDER BY created_at DESC LIMIT $2`,
      [workspaceId,Math.max(1,Math.min(500,Number(limit)||100))]
    )
    return rows.filter(row=>canReadObject(row.access_policy,role))
  })
}

export const createDownloadGrant=async({workspaceId,objectId,role='viewer',actorId=null})=>{
  return withTenantDbTransaction(workspaceId,async client=>{
    const object=(await client.query(
      `SELECT * FROM ace_objects WHERE workspace_id=$1 AND id=$2`,
      [workspaceId,objectId]
    )).rows[0]
    if(!object||object.status!=='approved')throw new Error('approved object not found')
    if(!canReadObject(object.access_policy,role))throw new Error('object access denied')
    const grant=await createGrant(client,{workspaceId,objectId,purpose:'download',createdBy:actorId,ttlSeconds:DOWNLOAD_GRANT_TTL_SECONDS})
    if(!object.approved_sha256||!object.approved_storage_version){
      throw new Error('approved immutable object version is unavailable')
    }
    const directDownload=objectStorageConfigured()
      ?createApprovedDownloadUrl({
        key:object.object_key,
        filename:object.original_name,
        versionId:object.approved_storage_version,
        expiresSeconds:DOWNLOAD_GRANT_TTL_SECONDS
      })
      :null
    if(process.env.NODE_ENV==='production'&&!directDownload)throw new Error('durable object storage is not configured')
    return {
      object:{
        id:object.id,
        name:object.original_name,
        mime:object.detected_mime||object.declared_mime,
        size:object.actual_size||object.expected_size,
        sha256:object.approved_sha256,
        storageVersion:object.approved_storage_version
      },
      downloadGrant:{token:grant.token,expiresAt:grant.expiresAt},
      directDownload,
      storageConfigured:objectStorageConfigured()
    }
  })
}

export const softDeleteObject=async({workspaceId,objectId,actorId=null})=>{
  return withTenantDbTransaction(workspaceId,async client=>{
    const object=(await client.query(
      `SELECT * FROM ace_objects WHERE workspace_id=$1 AND id=$2 FOR UPDATE`,
      [workspaceId,objectId]
    )).rows[0]
    if(!object)return null
    if(object.legal_hold)throw new Error('object is under legal hold')
    if(object.retention_until&&Date.parse(object.retention_until)>Date.now())throw new Error('object retention period has not expired')
    const {rows}=await client.query(
      `UPDATE ace_objects SET status='deleted',deleted_at=now(),updated_at=now(),
         extraction_status='deleted',indexing_status='deleted',searchable_at=NULL,
         scan_evidence=scan_evidence||$3::jsonb
       WHERE workspace_id=$1 AND id=$2 RETURNING id,status,deleted_at`,
      [workspaceId,objectId,JSON.stringify({deletedBy:actorId||null})]
    )
    return rows[0]||null
  })
}
