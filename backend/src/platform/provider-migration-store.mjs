import {randomUUID} from 'node:crypto'
import {pool} from '../database.mjs'

const states=new Set([
  'draft','validating','shadowing','canary','cutover','verifying','stabilizing','completed',
  'failed','rollback_requested','rolling_back','rolled_back','manual_recovery_required'
])

const transitions=Object.freeze({
  draft:['validating','failed'],
  validating:['shadowing','failed'],
  shadowing:['canary','failed','rollback_requested'],
  canary:['canary','cutover','failed','rollback_requested'],
  cutover:['verifying','failed','rollback_requested'],
  verifying:['stabilizing','failed','rollback_requested','manual_recovery_required'],
  stabilizing:['completed','failed','rollback_requested','manual_recovery_required'],
  failed:['rollback_requested','manual_recovery_required'],
  rollback_requested:['rolling_back','manual_recovery_required'],
  rolling_back:['rolled_back','manual_recovery_required'],
  completed:[],
  rolled_back:[],
  manual_recovery_required:[]
})

const assertDb=()=>{
  if(!pool)throw Object.assign(new Error('provider migration store unavailable'),{status:503})
}

const clean=(value,max=200)=>String(value??'').trim().slice(0,max)

const assertVersion=(row,expectedVersion)=>{
  if(Number(expectedVersion)!==Number(row.version)){
    throw Object.assign(new Error('provider migration version conflict'),{
      status:409,
      code:'provider_migration_version_conflict',
      currentVersion:Number(row.version)
    })
  }
}

export const listProviderMigrations=async({environment=null,limit=100}={})=>{
  assertDb()
  const params=[]
  let where=''
  if(environment){
    params.push(String(environment))
    where='WHERE environment=$1'
  }
  params.push(Math.max(1,Math.min(500,Number(limit)||100)))
  return (await pool.query(
    `SELECT * FROM ace_provider_migrations
     ${where}
     ORDER BY updated_at DESC
     LIMIT $${params.length}`,
    params
  )).rows
}

export const createProviderMigration=async({
  capability,environment,fromProvider,toProvider,strategy='shadow',
  compatibilityReport={},cutoverBoundary={},rollbackPlan={},requestedBy,sourceChangeId=null
})=>{
  assertDb()
  const cap=clean(capability,120)
  const env=clean(environment,80)
  const from=clean(fromProvider,120)
  const to=clean(toProvider,120)
  if(!cap||!env||!from||!to)throw Object.assign(new Error('capability, environment, fromProvider and toProvider are required'),{status:400})
  if(from===to)throw Object.assign(new Error('provider migration source and target must differ'),{status:400})
  if(!['shadow','canary','dual_route','cutover'].includes(strategy))throw Object.assign(new Error('invalid provider migration strategy'),{status:400})
  const id='pvm_'+randomUUID()
  const {rows}=await pool.query(
    `INSERT INTO ace_provider_migrations
      (id,capability,environment,from_provider,to_provider,strategy,
       compatibility_report,cutover_boundary,rollback_plan,requested_by,source_change_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11)
     RETURNING *`,
    [
      id,cap,env,from,to,strategy,
      JSON.stringify(compatibilityReport||{}),
      JSON.stringify(cutoverBoundary||{}),
      JSON.stringify(rollbackPlan||{}),
      clean(requestedBy,320),
      sourceChangeId
    ]
  )
  return rows[0]
}

export const advanceProviderMigration=async({
  id,toState,trafficPercent,compatibilityReport,cutoverBoundary,actor,expectedVersion,failureReason=null
})=>{
  assertDb()
  if(!states.has(toState))throw Object.assign(new Error('invalid provider migration state'),{status:400})
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const current=(await client.query('SELECT * FROM ace_provider_migrations WHERE id=$1 FOR UPDATE',[id])).rows[0]
    if(!current)throw Object.assign(new Error('provider migration not found'),{status:404})
    assertVersion(current,expectedVersion)
    if(!(transitions[current.state]||[]).includes(toState)){
      throw Object.assign(new Error('invalid provider migration transition: '+current.state+' -> '+toState),{status:409})
    }

    const nextCompatibility=compatibilityReport===undefined?current.compatibility_report:compatibilityReport
    const nextBoundary=cutoverBoundary===undefined?current.cutover_boundary:cutoverBoundary
    let nextTraffic=trafficPercent===undefined?Number(current.traffic_percent):Number(trafficPercent)
    if(!Number.isInteger(nextTraffic)||nextTraffic<0||nextTraffic>100){
      throw Object.assign(new Error('trafficPercent must be an integer between 0 and 100'),{status:400})
    }

    if(['shadowing'].includes(toState))nextTraffic=0
    if(toState==='canary'){
      if(nextCompatibility?.validated!==true){
        throw Object.assign(new Error('validated compatibility report is required before canary traffic'),{status:409})
      }
      if(nextTraffic<=0||nextTraffic>=100){
        throw Object.assign(new Error('canary traffic must be between 1 and 99 percent'),{status:400})
      }
      if(current.state==='canary'&&nextTraffic<Number(current.traffic_percent)){
        throw Object.assign(new Error('forward canary traffic cannot decrease; request rollback instead'),{status:409})
      }
    }
    if(toState==='cutover'){
      if(nextCompatibility?.validated!==true)throw Object.assign(new Error('validated compatibility report is required before cutover'),{status:409})
      nextTraffic=100
      if(!nextBoundary||Object.keys(nextBoundary).length===0){
        throw Object.assign(new Error('cutover boundary is required before cutover'),{status:409})
      }
    }
    if(toState==='rolling_back'||toState==='rolled_back')nextTraffic=0

    const completedAt=toState==='completed'?new Date().toISOString():null
    const reason=toState==='failed'?clean(failureReason||'provider migration failed',2000):current.failure_reason
    const {rows}=await client.query(
      `UPDATE ace_provider_migrations SET
         state=$2,traffic_percent=$3,compatibility_report=$4::jsonb,cutover_boundary=$5::jsonb,
         failure_reason=$6,version=version+1,updated_at=now(),
         completed_at=CASE WHEN $2='completed' THEN now() ELSE completed_at END
       WHERE id=$1
       RETURNING *`,
      [
        id,toState,nextTraffic,
        JSON.stringify(nextCompatibility||{}),
        JSON.stringify(nextBoundary||{}),
        reason||null
      ]
    )
    await client.query('COMMIT')
    return {...rows[0],actor:clean(actor,320)}
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{client.release()}
}

export const requestProviderRollback=async({id,actor,expectedVersion,reason})=>{
  return advanceProviderMigration({
    id,
    toState:'rollback_requested',
    actor,
    expectedVersion,
    failureReason:reason||null
  })
}

export const providerMigrationOverride=row=>({
  capability:row.capability,
  fromProvider:row.from_provider,
  toProvider:row.to_provider,
  mode:row.state,
  trafficPercent:Number(row.traffic_percent||0),
  cutoverBoundary:row.cutover_boundary||{},
  version:Number(row.version||0)
})
