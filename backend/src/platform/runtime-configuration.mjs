import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto'
import {pool} from '../database.mjs'
import {platformFeatureCatalog} from './feature-catalog.mjs'

const allowedFeatureStates=new Set(['enabled','read_only','draining','disabled','degraded'])
const allowedEmergencyControls=new Set(['stop_uploads','pause_integrations','suspend_ai','disable_signup','read_only'])
const allowedScopes=new Set(['platform','region','cell','tenant','workspace','service','feature'])

const canonical=value=>{
  if(value===null||typeof value!=='object')return value
  if(Array.isArray(value))return value.map(canonical)
  return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]))
}
const stable=value=>JSON.stringify(canonical(value))
const sha=value=>createHash('sha256').update(stable(value)).digest('hex')
const signingSecret=()=>String(process.env.RUNTIME_CONFIG_SIGNING_SECRET||process.env.CONTROL_SESSION_SECRET||'')
const signingKeyId=()=>String(process.env.RUNTIME_CONFIG_SIGNING_KEY_ID||'control-hmac-v1')
const assertDb=()=>{
  if(!pool)throw Object.assign(new Error('runtime configuration store unavailable'),{status:503,code:'runtime_config_store_unavailable'})
}

const validateFeatureStates=features=>{
  const byId=new Map(platformFeatureCatalog.map(item=>[item.id,item]))
  for(const [id,state] of Object.entries(features||{})){
    if(!byId.has(id))throw Object.assign(new Error('unknown feature in runtime configuration: '+id),{status:400})
    if(!allowedFeatureStates.has(String(state)))throw Object.assign(new Error('invalid feature state for '+id),{status:400})
    if(byId.get(id).locked&&state!=='enabled'){
      throw Object.assign(new Error('locked safety feature cannot be disabled or degraded: '+id),{status:409,code:'locked_feature'})
    }
  }
}

const activeEmergencyControls=async()=>{
  assertDb()
  await pool.query(
    `UPDATE ace_emergency_controls
     SET state='expired',version=version+1
     WHERE state='active' AND expires_at<=now()`
  )
  return (await pool.query(
    `SELECT id,scope_type,scope_id,control_type,reason,expires_at,created_at
     FROM ace_emergency_controls
     WHERE state='active' AND expires_at>now()
     ORDER BY created_at ASC`
  )).rows
}

export const buildRuntimePayload=async({
  environment,
  features={},
  providerOverrides={},
  admission={},
  source='control-plane'
}={})=>{
  const env=String(environment||process.env.NODE_ENV||'development').trim()
  validateFeatureStates(features)
  const emergency=await activeEmergencyControls()
  const normalizedFeatures=Object.fromEntries(platformFeatureCatalog.map(item=>[
    item.id,
    item.locked?'enabled':String(features[item.id]||'enabled')
  ]))
  return {
    schemaVersion:'ace.runtime-config.v1',
    environment:env,
    source,
    generatedAt:new Date().toISOString(),
    features:normalizedFeatures,
    providerOverrides:providerOverrides&&typeof providerOverrides==='object'?providerOverrides:{},
    admission:admission&&typeof admission==='object'?admission:{},
    emergency:emergency.map(item=>({
      id:item.id,
      scopeType:item.scope_type,
      scopeId:item.scope_id,
      controlType:item.control_type,
      reason:item.reason,
      expiresAt:item.expires_at
    }))
  }
}

export const publishRuntimeSnapshot=async({
  environment,
  features={},
  providerOverrides={},
  admission={},
  sourceChangeId=null,
  createdBy
})=>{
  assertDb()
  const secret=signingSecret()
  if(!secret)throw Object.assign(new Error('runtime configuration signing secret is not configured'),{status:503,code:'runtime_config_signing_unavailable'})
  const payload=await buildRuntimePayload({environment,features,providerOverrides,admission})
  const checksum=sha(payload)
  const id='rcs_'+randomUUID()
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const inserted=await client.query(
      `INSERT INTO ace_runtime_config_snapshots
        (id,environment,payload,checksum,signature,signing_key_id,lease_expires_at,source_change_id,created_by)
       VALUES ($1,$2,$3::jsonb,$4,'pending',$5,now()+interval '90 seconds',$6,$7)
       RETURNING version,created_at,lease_expires_at`,
      [id,payload.environment,JSON.stringify(payload),checksum,signingKeyId(),sourceChangeId,createdBy]
    )
    const meta=inserted.rows[0]
    const signedEnvelope={
      id,
      version:Number(meta.version),
      environment:payload.environment,
      checksum,
      leaseExpiresAt:meta.lease_expires_at,
      payload
    }
    const signature=createHmac('sha256',secret).update(stable(signedEnvelope)).digest('hex')
    await client.query(
      `UPDATE ace_runtime_config_snapshots
       SET signature=$2,state='active'
       WHERE id=$1`,
      [id,signature]
    )
    await client.query(
      `UPDATE ace_runtime_config_snapshots
       SET state='superseded'
       WHERE environment=$1 AND id<>$2 AND state='active'`,
      [payload.environment,id]
    )
    await client.query('COMMIT')
    return {...signedEnvelope,signature,signingKeyId:signingKeyId(),createdAt:meta.created_at}
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{client.release()}
}

export const latestRuntimeSnapshot=async environment=>{
  assertDb()
  const env=String(environment||process.env.NODE_ENV||'development').trim()
  const {rows}=await pool.query(
    `SELECT * FROM ace_runtime_config_snapshots
     WHERE environment=$1 AND state='active'
     ORDER BY version DESC LIMIT 1`,
    [env]
  )
  const row=rows[0]
  if(!row)return null
  return {
    id:row.id,
    version:Number(row.version),
    environment:row.environment,
    checksum:row.checksum,
    signature:row.signature,
    signingKeyId:row.signing_key_id,
    leaseExpiresAt:row.lease_expires_at,
    createdAt:row.created_at,
    payload:row.payload
  }
}

export const verifyRuntimeSnapshot=snapshot=>{
  const secret=signingSecret()
  if(!secret||!snapshot)return {valid:false,reason:'signing-secret-unavailable'}
  if(new Date(snapshot.leaseExpiresAt).getTime()<=Date.now())return {valid:false,reason:'lease-expired'}
  const envelope={
    id:snapshot.id,
    version:Number(snapshot.version),
    environment:snapshot.environment,
    checksum:snapshot.checksum,
    leaseExpiresAt:snapshot.leaseExpiresAt,
    payload:snapshot.payload
  }
  if(sha(snapshot.payload)!==snapshot.checksum)return {valid:false,reason:'checksum-mismatch'}
  const expected=createHmac('sha256',secret).update(stable(envelope)).digest()
  let provided
  try{provided=Buffer.from(String(snapshot.signature||''),'hex')}catch{return {valid:false,reason:'invalid-signature'}}
  if(provided.length!==expected.length||!timingSafeEqual(provided,expected))return {valid:false,reason:'signature-mismatch'}
  try{validateFeatureStates(snapshot.payload?.features||{})}catch(error){return {valid:false,reason:error instanceof Error?error.message:'invalid-feature-state'}}
  return {valid:true,reason:null}
}

export const createEmergencyControl=async({
  scopeType,scopeId=null,controlType,reason,durationMinutes=30,createdBy
})=>{
  assertDb()
  const scope=String(scopeType||'').trim()
  const control=String(controlType||'').trim()
  const why=String(reason||'').trim()
  if(!allowedScopes.has(scope))throw Object.assign(new Error('invalid emergency control scope'),{status:400})
  if(!allowedEmergencyControls.has(control))throw Object.assign(new Error('invalid emergency control type'),{status:400})
  if(!why)throw Object.assign(new Error('emergency control reason is required'),{status:400})
  const minutes=Math.max(5,Math.min(240,Number(durationMinutes)||30))
  const id='emg_'+randomUUID()
  const expiresAt=new Date(Date.now()+minutes*60_000).toISOString()
  const {rows}=await pool.query(
    `INSERT INTO ace_emergency_controls
      (id,scope_type,scope_id,control_type,reason,created_by,expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [id,scope,scopeId?String(scopeId).trim():null,control,why.slice(0,4000),createdBy,expiresAt]
  )
  return rows[0]
}

export const revokeEmergencyControl=async({id,revokedBy,expectedVersion})=>{
  assertDb()
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const current=(await client.query('SELECT * FROM ace_emergency_controls WHERE id=$1 FOR UPDATE',[id])).rows[0]
    if(!current)throw Object.assign(new Error('emergency control not found'),{status:404})
    if(Number(expectedVersion)!==Number(current.version))throw Object.assign(new Error('emergency control version conflict'),{status:409,code:'emergency_version_conflict',currentVersion:Number(current.version)})
    if(current.state!=='active')throw Object.assign(new Error('emergency control is not active'),{status:409})
    const {rows}=await client.query(
      `UPDATE ace_emergency_controls
       SET state='revoked',revoked_by=$2,revoked_at=now(),version=version+1
       WHERE id=$1 RETURNING *`,
      [id,revokedBy]
    )
    await client.query('COMMIT')
    return rows[0]
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{client.release()}
}

export const listEmergencyControls=async()=>{
  await activeEmergencyControls()
  return (await pool.query(
    `SELECT * FROM ace_emergency_controls
     ORDER BY created_at DESC LIMIT 200`
  )).rows
}

export const evaluateRuntimeControl=({snapshot,featureId,scopeType,scopeId,operation='execute'})=>{
  const verification=verifyRuntimeSnapshot(snapshot)
  if(!verification.valid)return {allowed:false,state:'degraded',code:'runtime_config_invalid',reason:verification.reason}
  const state=String(snapshot.payload?.features?.[featureId]||'enabled')
  if(state==='disabled')return {allowed:false,state,code:'feature_disabled',reason:'Feature is disabled by runtime configuration.'}
  if(state==='draining'&&operation==='admit')return {allowed:false,state,code:'feature_draining',reason:'New work is not admitted while the feature drains existing work.'}
  if(state==='read_only'&&operation==='write')return {allowed:false,state,code:'feature_read_only',reason:'Writes are disabled while the feature is read-only.'}
  const emergency=Array.isArray(snapshot.payload?.emergency)?snapshot.payload.emergency:[]
  const applicable=emergency.filter(item=>
    item.scopeType==='platform'||
    (item.scopeType===scopeType&&(!item.scopeId||String(item.scopeId)===String(scopeId||'')))||
    (item.scopeType==='feature'&&String(item.scopeId||'')===String(featureId||''))
  )
  if(featureId==='ai'&&applicable.some(item=>item.controlType==='suspend_ai'))return {allowed:false,state:'disabled',code:'ai_admission_suspended',reason:'AI admission is temporarily suspended.'}
  if(featureId==='integrations'&&applicable.some(item=>item.controlType==='pause_integrations'))return {allowed:false,state:'draining',code:'integration_side_effects_paused',reason:'New outbound integration side effects are paused.'}
  if(featureId==='files'&&applicable.some(item=>item.controlType==='stop_uploads')&&operation==='admit')return {allowed:false,state:'disabled',code:'uploads_suspended',reason:'New uploads are temporarily suspended.'}
  if(applicable.some(item=>item.controlType==='read_only')&&operation==='write')return {allowed:false,state:'read_only',code:'scope_read_only',reason:'This scope is temporarily read-only.'}
  return {allowed:true,state,code:null,reason:null}
}
