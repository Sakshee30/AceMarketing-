import {randomUUID} from 'node:crypto'
import {pool} from '../database.mjs'

const scenarios=new Set([
  'process_loss','availability_zone_loss','database_failover','regional_disaster',
  'data_corruption','tenant_restore','object_recovery','queue_reconciliation','credential_recovery'
])
const states=new Set(['planned','running','passed','failed','manual_recovery_required'])

const assertDb=()=>{
  if(!pool)throw Object.assign(new Error('recovery evidence store unavailable'),{status:503,code:'recovery_store_unavailable'})
}
const clean=(value,max=500)=>String(value??'').trim().slice(0,max)
const boundedMinutes=value=>{
  if(value===null||value===undefined||value==='')return null
  const number=Number(value)
  if(!Number.isFinite(number)||number<0||number>525600)throw Object.assign(new Error('recovery minutes must be between 0 and 525600'),{status:400})
  return Math.round(number)
}

export const listRecoveryExercises=async({environment=null,limit=100}={})=>{
  assertDb()
  const max=Math.max(1,Math.min(500,Number(limit)||100))
  if(environment){
    return (await pool.query(
      `SELECT * FROM ace_recovery_exercises
       WHERE environment=$1
       ORDER BY updated_at DESC LIMIT $2`,
      [String(environment),max]
    )).rows
  }
  return (await pool.query(
    `SELECT * FROM ace_recovery_exercises
     ORDER BY updated_at DESC LIMIT $1`,
    [max]
  )).rows
}

export const listBackupEvidence=async({environment=null,limit=100}={})=>{
  assertDb()
  const max=Math.max(1,Math.min(500,Number(limit)||100))
  if(environment){
    return (await pool.query(
      `SELECT * FROM ace_backup_evidence
       WHERE environment=$1
       ORDER BY observed_at DESC LIMIT $2`,
      [String(environment),max]
    )).rows
  }
  return (await pool.query(
    `SELECT * FROM ace_backup_evidence
     ORDER BY observed_at DESC LIMIT $1`,
    [max]
  )).rows
}

export const createRecoveryExercise=async({
  environment,scenario,declaredRpoMinutes=null,declaredRtoMinutes=null,
  incidentCommander=null,nextExerciseAt=null,createdBy
})=>{
  assertDb()
  const env=clean(environment,80)
  const scenarioId=clean(scenario,120)
  if(!env)throw Object.assign(new Error('recovery environment is required'),{status:400})
  if(!scenarios.has(scenarioId))throw Object.assign(new Error('unsupported recovery scenario'),{status:400})
  const id='rxe_'+randomUUID()
  const {rows}=await pool.query(
    `INSERT INTO ace_recovery_exercises
      (id,environment,scenario,declared_rpo_minutes,declared_rto_minutes,incident_commander,next_exercise_at,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      id,env,scenarioId,boundedMinutes(declaredRpoMinutes),boundedMinutes(declaredRtoMinutes),
      incidentCommander?clean(incidentCommander,320):null,
      nextExerciseAt?new Date(nextExerciseAt).toISOString():null,
      clean(createdBy,320)
    ]
  )
  return rows[0]
}

export const updateRecoveryExercise=async({
  id,state,expectedVersion,measuredRpoMinutes,measuredRtoMinutes,
  integrityChecks,reconciliation,gaps,remediationOwner,nextExerciseAt,incidentCommander
})=>{
  assertDb()
  if(!states.has(String(state)))throw Object.assign(new Error('invalid recovery exercise state'),{status:400})
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const current=(await client.query('SELECT * FROM ace_recovery_exercises WHERE id=$1 FOR UPDATE',[id])).rows[0]
    if(!current)throw Object.assign(new Error('recovery exercise not found'),{status:404})
    if(Number(expectedVersion)!==Number(current.version)){
      throw Object.assign(new Error('recovery exercise version conflict'),{
        status:409,code:'recovery_version_conflict',currentVersion:Number(current.version)
      })
    }
    const startedAt=state==='running'&&!current.started_at?new Date().toISOString():current.started_at
    const completedAt=['passed','failed','manual_recovery_required'].includes(String(state))
      ?new Date().toISOString()
      :current.completed_at
    const {rows}=await client.query(
      `UPDATE ace_recovery_exercises SET
         state=$2,
         measured_rpo_minutes=$3,
         measured_rto_minutes=$4,
         integrity_checks=$5::jsonb,
         reconciliation=$6::jsonb,
         gaps=$7::jsonb,
         remediation_owner=$8,
         next_exercise_at=$9,
         incident_commander=$10,
         started_at=$11,
         completed_at=$12,
         updated_at=now(),
         version=version+1
       WHERE id=$1 RETURNING *`,
      [
        id,String(state),
        measuredRpoMinutes===undefined?current.measured_rpo_minutes:boundedMinutes(measuredRpoMinutes),
        measuredRtoMinutes===undefined?current.measured_rto_minutes:boundedMinutes(measuredRtoMinutes),
        JSON.stringify(integrityChecks===undefined?current.integrity_checks:(Array.isArray(integrityChecks)?integrityChecks:[])),
        JSON.stringify(reconciliation===undefined?current.reconciliation:(reconciliation||{})),
        JSON.stringify(gaps===undefined?current.gaps:(Array.isArray(gaps)?gaps:[])),
        remediationOwner===undefined?current.remediation_owner:(remediationOwner?clean(remediationOwner,320):null),
        nextExerciseAt===undefined?current.next_exercise_at:(nextExerciseAt?new Date(nextExerciseAt).toISOString():null),
        incidentCommander===undefined?current.incident_commander:(incidentCommander?clean(incidentCommander,320):null),
        startedAt,completedAt
      ]
    )
    await client.query('COMMIT')
    return rows[0]
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{client.release()}
}

export const recordBackupEvidence=async({
  environment,resourceType,resourceRef,backupMode,retentionDays=null,
  pitrEnabled=false,objectVersioningEnabled=false,encryptionVerified=false,
  deletionProtectionVerified=false,independentCopyVerified=false,
  evidence={},observedAt=null,createdBy
})=>{
  assertDb()
  const env=clean(environment,80)
  if(!env)throw Object.assign(new Error('backup environment is required'),{status:400})
  const type=clean(resourceType,120)
  const ref=clean(resourceRef,500)
  const mode=clean(backupMode,120)
  if(!type||!ref||!mode)throw Object.assign(new Error('resourceType, resourceRef and backupMode are required'),{status:400})
  const retention=retentionDays===null||retentionDays===undefined||retentionDays===''?null:Number(retentionDays)
  if(retention!==null&&(!Number.isInteger(retention)||retention<0||retention>36500)){
    throw Object.assign(new Error('retentionDays must be an integer between 0 and 36500'),{status:400})
  }
  const id='bke_'+randomUUID()
  const observed=observedAt?new Date(observedAt):new Date()
  if(Number.isNaN(observed.getTime()))throw Object.assign(new Error('observedAt must be a valid timestamp'),{status:400})
  const {rows}=await pool.query(
    `INSERT INTO ace_backup_evidence
      (id,environment,resource_type,resource_ref,backup_mode,retention_days,pitr_enabled,
       object_versioning_enabled,encryption_verified,deletion_protection_verified,
       independent_copy_verified,evidence,observed_at,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14)
     RETURNING *`,
    [
      id,env,type,ref,mode,retention,Boolean(pitrEnabled),Boolean(objectVersioningEnabled),
      Boolean(encryptionVerified),Boolean(deletionProtectionVerified),Boolean(independentCopyVerified),
      JSON.stringify(evidence||{}),observed.toISOString(),clean(createdBy,320)
    ]
  )
  return rows[0]
}

export const recoverySummary=async({environment=null}={})=>{
  assertDb()
  const [exercises,evidence]=await Promise.all([
    listRecoveryExercises({environment,limit:50}),
    listBackupEvidence({environment,limit:50})
  ])
  const latestByScenario={}
  for(const item of exercises)if(!latestByScenario[item.scenario])latestByScenario[item.scenario]=item
  const passed=exercises.filter(item=>item.state==='passed')
  return {
    schemaVersion:'platform-backup-dr.v1',
    generatedAt:new Date().toISOString(),
    environment:environment||'all',
    exercises,
    backupEvidence:evidence,
    latestByScenario,
    evidenceCounts:{
      exercises:exercises.length,
      passed:passed.length,
      failed:exercises.filter(item=>item.state==='failed'||item.state==='manual_recovery_required').length,
      backupRecords:evidence.length
    },
    measured:{
      worstRpoMinutes:passed.length?Math.max(...passed.map(item=>Number(item.measured_rpo_minutes||0))):null,
      worstRtoMinutes:passed.length?Math.max(...passed.map(item=>Number(item.measured_rto_minutes||0))):null
    }
  }
}
