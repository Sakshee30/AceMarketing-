import {createHash,randomUUID} from 'node:crypto'
import pg from 'pg'

const {Pool}=pg
const databaseUrl=process.env.DATABASE_URL||''
const policyVersion=process.env.CONSENT_POLICY_VERSION||'v1'
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.CONSENT_DB_POOL_MAX||10),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

const digest=value=>value?createHash('sha256').update(String(value)).digest('hex'):null
const cleanSubject=value=>String(value||'').trim().slice(0,200)

export const getConsent=async(workspaceId,subjectType,subjectId)=>{
  if(!pool||!subjectId)return null
  const {rows}=await pool.query(
    `SELECT id,subject_type,subject_id,essential,analytics,marketing,personalization,source,policy_version,granted_at,revoked_at,updated_at
     FROM ace_consent_records WHERE workspace_id=$1 AND subject_type=$2 AND subject_id=$3 LIMIT 1`,
    [workspaceId,subjectType,cleanSubject(subjectId)]
  )
  return rows[0]||null
}

export const saveConsent=async(workspaceId,input={},context={})=>{
  if(!pool)throw new Error('consent store unavailable')
  const subjectType=input.subjectType==='customer'?'customer':'visitor'
  const subjectId=cleanSubject(input.subjectId||input.visitorId||input.customerId)
  if(!subjectId)throw new Error('subjectId required')
  const choices={essential:true,analytics:input.analytics===true,marketing:input.marketing===true,personalization:input.personalization===true}
  const revoked=!choices.analytics&&!choices.marketing&&!choices.personalization
  const existing=await getConsent(workspaceId,subjectType,subjectId)
  const id=existing?.id||'consent_'+randomUUID()
  const {rows}=await pool.query(
    `INSERT INTO ace_consent_records
      (id,workspace_id,subject_type,subject_id,essential,analytics,marketing,personalization,source,policy_version,ip_hash,user_agent_hash,granted_at,revoked_at)
     VALUES ($1,$2,$3,$4,true,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (workspace_id,subject_type,subject_id) DO UPDATE SET
       essential=true,analytics=EXCLUDED.analytics,marketing=EXCLUDED.marketing,personalization=EXCLUDED.personalization,
       source=EXCLUDED.source,policy_version=EXCLUDED.policy_version,ip_hash=EXCLUDED.ip_hash,user_agent_hash=EXCLUDED.user_agent_hash,
       granted_at=EXCLUDED.granted_at,revoked_at=EXCLUDED.revoked_at,updated_at=now()
     RETURNING *`,
    [id,workspaceId,subjectType,subjectId,choices.analytics,choices.marketing,choices.personalization,String(input.source||'web').slice(0,60),String(input.policyVersion||policyVersion).slice(0,60),digest(context.ip),digest(context.userAgent),revoked?null:new Date().toISOString(),revoked?new Date().toISOString():null]
  )
  const record=rows[0]
  await pool.query(
    `INSERT INTO ace_consent_audit (id,workspace_id,consent_id,action,snapshot)
     VALUES ($1,$2,$3,$4,$5::jsonb)`,
    ['ca_'+randomUUID(),workspaceId,record.id,existing?(revoked?'revoked':'updated'):'created',JSON.stringify({essential:true,analytics:record.analytics,marketing:record.marketing,personalization:record.personalization,policyVersion:record.policy_version,source:record.source})]
  )
  return record
}

export const consentAllows=async(workspaceId,{subjectType='visitor',subjectId,category='analytics'}={})=>{
  if(category==='essential')return {allowed:true,reason:'essential'}
  if(!subjectId)return {allowed:false,reason:'consent_subject_required'}
  const record=await getConsent(workspaceId,subjectType,subjectId)
  if(!record)return {allowed:false,reason:'consent_required'}
  if(record.revoked_at)return {allowed:false,reason:'consent_revoked',record}
  const allowed=category==='marketing'?record.marketing===true:category==='personalization'?record.personalization===true:record.analytics===true
  return {allowed,reason:allowed?'consent_granted':'consent_denied',record}
}

export const consentStats=async workspaceId=>{
  if(!pool)return {total:0,analytics:0,marketing:0,personalization:0,revoked:0}
  const {rows}=await pool.query(
    `SELECT COUNT(*)::int total,
      COUNT(*) FILTER (WHERE analytics=true)::int analytics,
      COUNT(*) FILTER (WHERE marketing=true)::int marketing,
      COUNT(*) FILTER (WHERE personalization=true)::int personalization,
      COUNT(*) FILTER (WHERE revoked_at IS NOT NULL)::int revoked
     FROM ace_consent_records WHERE workspace_id=$1`,
    [workspaceId]
  )
  return rows[0]
}

export const listConsentAudit=async(workspaceId,limit=100)=>{
  if(!pool)return []
  const {rows}=await pool.query(
    `SELECT a.id,a.action,a.snapshot,a.created_at,c.subject_type,c.subject_id
     FROM ace_consent_audit a
     JOIN ace_consent_records c ON c.id=a.consent_id
     WHERE a.workspace_id=$1 ORDER BY a.created_at DESC LIMIT $2`,
    [workspaceId,Math.max(1,Math.min(500,Number(limit)||100))]
  )
  return rows
}

export const closeConsentStore=async()=>{if(pool)await pool.end()}
