import {createHash,randomUUID} from 'node:crypto'
import {pool} from '../database.mjs'

const allowedStates=new Set([
  'draft','validating','impact_analysis','waiting_approval','approved',
  'provisioning','deploying','verifying','stabilizing','completed',
  'rejected','failed','rollback_requested','rolling_back','rolled_back',
  'manual_recovery_required'
])

const transitions=Object.freeze({
  draft:['validating','rejected'],
  validating:['impact_analysis','failed','rejected'],
  impact_analysis:['waiting_approval','failed','rejected'],
  waiting_approval:['approved','rejected'],
  approved:['provisioning','deploying','rollback_requested'],
  provisioning:['deploying','failed','rollback_requested'],
  deploying:['verifying','failed','rollback_requested'],
  verifying:['stabilizing','failed','rollback_requested','manual_recovery_required'],
  stabilizing:['completed','failed','rollback_requested','manual_recovery_required'],
  failed:['rollback_requested','manual_recovery_required'],
  rollback_requested:['rolling_back','manual_recovery_required'],
  rolling_back:['rolled_back','manual_recovery_required'],
  completed:[],
  rejected:[],
  rolled_back:[],
  manual_recovery_required:[]
})

const canonical=value=>{
  if(value===null||typeof value!=='object')return value
  if(Array.isArray(value))return value.map(canonical)
  return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]))
}
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
const cleanText=(value,max=2000)=>String(value??'').trim().slice(0,max)

const assertDb=()=>{
  if(!pool)throw Object.assign(new Error('control change store unavailable'),{status:503,code:'control_store_unavailable'})
}

const assertExpectedVersion=(current,expectedVersion)=>{
  if(expectedVersion===undefined||expectedVersion===null)return
  if(Number(expectedVersion)!==Number(current.version)){
    throw Object.assign(new Error('change version conflict; refresh observed state before retrying'),{
      status:409,
      code:'change_version_conflict',
      currentVersion:Number(current.version)
    })
  }
}

const addEvent=async(client,{changeId,actor,actorRole,eventType,fromState=null,toState=null,metadata={}})=>{
  await client.query(
    `INSERT INTO ace_platform_change_events
      (id,change_id,actor,actor_role,event_type,from_state,to_state,metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    ['pce_'+randomUUID(),changeId,actor,actorRole,eventType,fromState,toState,JSON.stringify(metadata||{})]
  )
}

const planFor=row=>({
  environment:row.environment,
  scopeType:row.scope_type,
  scopeId:row.scope_id,
  desiredState:row.desired_state||{},
  impactReport:row.impact_report||{},
  healthGates:row.health_gates||[],
  rollbackPlan:row.rollback_plan||{}
})

export const listPlatformChanges=async({limit=100,state=null}={})=>{
  assertDb()
  const params=[]
  let where=''
  if(state){
    params.push(state)
    where='WHERE state=$1'
  }
  params.push(Math.max(1,Math.min(500,Number(limit)||100)))
  const {rows}=await pool.query(
    `SELECT * FROM ace_platform_changes
     ${where}
     ORDER BY updated_at DESC
     LIMIT $${params.length}`,
    params
  )
  return rows
}

export const getPlatformChange=async id=>{
  assertDb()
  const {rows}=await pool.query('SELECT * FROM ace_platform_changes WHERE id=$1',[id])
  if(!rows[0])return null
  const approvals=(await pool.query(
    'SELECT * FROM ace_platform_change_approvals WHERE change_id=$1 ORDER BY created_at DESC',[id]
  )).rows
  const events=(await pool.query(
    'SELECT * FROM ace_platform_change_events WHERE change_id=$1 ORDER BY created_at ASC',[id]
  )).rows
  return {...rows[0],approvals,events}
}

export const createPlatformChange=async({
  environment,scopeType,scopeId=null,requestedBy,requestedRole,reason,ticket=null,risk='medium',
  oldState={},desiredState={},impactReport={},healthGates=[],rollbackPlan={}
})=>{
  assertDb()
  const env=cleanText(environment,80)
  const scope=cleanText(scopeType,80)
  const requestReason=cleanText(reason,4000)
  if(!env||!scope||!requestReason)throw Object.assign(new Error('environment, scopeType and reason are required'),{status:400})
  if(!['low','medium','high','critical'].includes(risk))throw Object.assign(new Error('invalid change risk'),{status:400})
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const id='pch_'+randomUUID()
    const {rows}=await client.query(
      `INSERT INTO ace_platform_changes
        (id,environment,scope_type,scope_id,requested_by,requested_role,reason,ticket,risk,
         old_state,desired_state,impact_report,health_gates,rollback_plan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb)
       RETURNING *`,
      [
        id,env,scope,scopeId?cleanText(scopeId,200):null,cleanText(requestedBy,320),cleanText(requestedRole,80),
        requestReason,ticket?cleanText(ticket,300):null,risk,
        JSON.stringify(oldState||{}),JSON.stringify(desiredState||{}),JSON.stringify(impactReport||{}),
        JSON.stringify(Array.isArray(healthGates)?healthGates:[]),JSON.stringify(rollbackPlan||{})
      ]
    )
    await addEvent(client,{
      changeId:id,actor:requestedBy,actorRole:requestedRole,eventType:'change.created',
      toState:'draft',metadata:{environment:env,scopeType:scope,risk}
    })
    await client.query('COMMIT')
    return rows[0]
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{client.release()}
}

export const updatePlatformChangePlan=async({
  id,actor,actorRole,desiredState,impactReport,healthGates,rollbackPlan,ticket,risk,expectedVersion
})=>{
  assertDb()
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const current=(await client.query('SELECT * FROM ace_platform_changes WHERE id=$1 FOR UPDATE',[id])).rows[0]
    if(!current)throw Object.assign(new Error('change not found'),{status:404})
    assertExpectedVersion(current,expectedVersion)
    if(['approved','provisioning','deploying','verifying','stabilizing','completed','rollback_requested','rolling_back','rolled_back'].includes(current.state)){
      throw Object.assign(new Error('approved or executing change plan is immutable; create a new change or rollback request'),{status:409})
    }
    const nextDesired=desiredState===undefined?current.desired_state:desiredState
    const nextImpact=impactReport===undefined?current.impact_report:impactReport
    const nextHealth=healthGates===undefined?current.health_gates:healthGates
    const nextRollback=rollbackPlan===undefined?current.rollback_plan:rollbackPlan
    const nextRisk=risk===undefined?current.risk:risk
    if(!['low','medium','high','critical'].includes(nextRisk))throw Object.assign(new Error('invalid change risk'),{status:400})
    const nextPlanDigest=digest({
      environment:current.environment,
      scopeType:current.scope_type,
      scopeId:current.scope_id,
      desiredState:nextDesired||{},
      impactReport:nextImpact||{},
      healthGates:Array.isArray(nextHealth)?nextHealth:[],
      rollbackPlan:nextRollback||{}
    })
    const {rows}=await client.query(
      `UPDATE ace_platform_changes SET
        desired_state=$2::jsonb,impact_report=$3::jsonb,health_gates=$4::jsonb,rollback_plan=$5::jsonb,
        ticket=$6,risk=$7,plan_digest=$8,updated_at=now(),version=version+1
       WHERE id=$1 RETURNING *`,
      [
        id,JSON.stringify(nextDesired||{}),JSON.stringify(nextImpact||{}),
        JSON.stringify(Array.isArray(nextHealth)?nextHealth:[]),JSON.stringify(nextRollback||{}),
        ticket===undefined?current.ticket:(ticket?cleanText(ticket,300):null),nextRisk,nextPlanDigest
      ]
    )
    await addEvent(client,{changeId:id,actor,actorRole,eventType:'change.plan_updated',fromState:current.state,toState:current.state,metadata:{planDigest:nextPlanDigest}})
    await client.query('COMMIT')
    return rows[0]
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{client.release()}
}

export const transitionPlatformChange=async({id,toState,actor,actorRole,metadata={},expectedVersion})=>{
  assertDb()
  if(!allowedStates.has(toState))throw Object.assign(new Error('invalid change state'),{status:400})
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const current=(await client.query('SELECT * FROM ace_platform_changes WHERE id=$1 FOR UPDATE',[id])).rows[0]
    if(!current)throw Object.assign(new Error('change not found'),{status:404})
    assertExpectedVersion(current,expectedVersion)
    const allowed=transitions[current.state]||[]
    if(!allowed.includes(toState))throw Object.assign(new Error('invalid change transition: '+current.state+' -> '+toState),{status:409})
    if(toState==='approved'){
      throw Object.assign(new Error('approval requires an explicit approval record'),{status:409})
    }
    if(['provisioning','deploying','verifying','stabilizing'].includes(toState)){
      if(!current.approved_plan_digest)throw Object.assign(new Error('change has no approved plan digest'),{status:409})
      const liveDigest=current.plan_digest||digest(planFor(current))
      if(liveDigest!==current.approved_plan_digest)throw Object.assign(new Error('approved plan digest no longer matches current plan'),{status:409})
    }
    const completedAt=toState==='completed'?new Date().toISOString():null
    const failureReason=toState==='failed'?cleanText(metadata?.reason||'change execution failed',2000):current.failure_reason
    const {rows}=await client.query(
      `UPDATE ace_platform_changes SET state=$2,updated_at=now(),version=version+1,
        completed_at=CASE WHEN $2='completed' THEN now() ELSE completed_at END,
        failure_reason=$3
       WHERE id=$1 RETURNING *`,
      [id,toState,failureReason||null]
    )
    await addEvent(client,{changeId:id,actor,actorRole,eventType:'change.transitioned',fromState:current.state,toState,metadata})
    await client.query('COMMIT')
    return rows[0]
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{client.release()}
}

export const decidePlatformChange=async({id,decision,approver,approverRole,comment=null,expectedVersion})=>{
  assertDb()
  if(!['approved','rejected'].includes(decision))throw Object.assign(new Error('invalid approval decision'),{status:400})
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const current=(await client.query('SELECT * FROM ace_platform_changes WHERE id=$1 FOR UPDATE',[id])).rows[0]
    if(!current)throw Object.assign(new Error('change not found'),{status:404})
    assertExpectedVersion(current,expectedVersion)
    if(current.state!=='waiting_approval')throw Object.assign(new Error('change is not waiting for approval'),{status:409})
    if(current.requested_by===approver&&['high','critical'].includes(current.risk)){
      throw Object.assign(new Error('high-risk change requires a separate approver'),{status:403})
    }
    const planDigest=current.plan_digest||digest(planFor(current))
    await client.query(
      `INSERT INTO ace_platform_change_approvals
        (id,change_id,approver,approver_role,decision,comment,plan_digest)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      ['pca_'+randomUUID(),id,approver,approverRole,decision,comment?cleanText(comment,2000):null,planDigest]
    )
    const next=decision==='approved'?'approved':'rejected'
    const {rows}=await client.query(
      `UPDATE ace_platform_changes SET state=$2,plan_digest=$3,
        approved_plan_digest=CASE WHEN $2='approved' THEN $3 ELSE approved_plan_digest END,
        approved_at=CASE WHEN $2='approved' THEN now() ELSE approved_at END,
        updated_at=now(),version=version+1
       WHERE id=$1 RETURNING *`,
      [id,next,planDigest]
    )
    await addEvent(client,{changeId:id,actor:approver,actorRole:approverRole,eventType:'change.'+decision,fromState:current.state,toState:next,metadata:{planDigest}})
    await client.query('COMMIT')
    return rows[0]
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{client.release()}
}

export const requestPlatformRollback=async({id,actor,actorRole,reason,expectedVersion})=>{
  return transitionPlatformChange({
    id,toState:'rollback_requested',actor,actorRole,expectedVersion,
    metadata:{reason:cleanText(reason||'rollback requested',2000)}
  })
}

export const platformChangeStates=()=>Object.keys(transitions)
