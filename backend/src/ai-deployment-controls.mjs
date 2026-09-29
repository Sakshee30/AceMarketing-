import {createHash,randomUUID} from 'node:crypto'
import {pool} from './database.mjs'
import {modelRegistryItem} from './ai-registry.mjs'

const clamp=(value,min,max)=>Math.max(min,Math.min(Number(value),max))
const finite=(value,fallback)=>{
  const n=Number(value)
  return Number.isFinite(n)?n:fallback
}
const integer=(value,fallback,min,max)=>{
  const n=Number(value)
  return Number.isInteger(n)&&n>=min&&n<=max?n:fallback
}

export const normalizeDeploymentControlInput=(task,input={})=>{
  const route=modelRegistryItem(task)
  if(!route)throw new Error('unknown AI task')
  const mode=String(input.mode||'active').trim().toLowerCase()
  if(!['off','shadow','canary','active'].includes(mode))throw new Error('deployment mode must be off, shadow, canary or active')
  const requestedPercent=input.canaryPercent==null
    ?(mode==='active'?100:mode==='canary'?10:0)
    :finite(input.canaryPercent,NaN)
  if(!Number.isFinite(requestedPercent)||requestedPercent<0||requestedPercent>100){
    throw new Error('canaryPercent must be between 0 and 100')
  }
  const canaryPercent=mode==='active'?100:mode==='off'||mode==='shadow'?0:requestedPercent
  if(mode==='canary'&&(canaryPercent<=0||canaryPercent>=100)){
    throw new Error('canary mode requires canaryPercent greater than 0 and less than 100')
  }
  const maxErrorRatePct=finite(input.maxErrorRatePct,5)
  if(maxErrorRatePct<0||maxErrorRatePct>100)throw new Error('maxErrorRatePct must be between 0 and 100')
  const maxP95LatencyMs=integer(input.maxP95LatencyMs,5000,1,600000)
  const minObservations=integer(input.minObservations,20,1,100000)
  return {
    task,
    mode,
    canaryPercent:Number(canaryPercent),
    autoRollback:input.autoRollback===true,
    maxErrorRatePct:Number(maxErrorRatePct),
    maxP95LatencyMs,
    minObservations
  }
}

const defaults=task=>({
  workspaceId:null,
  task,
  mode:'active',
  canaryPercent:100,
  autoRollback:false,
  maxErrorRatePct:5,
  maxP95LatencyMs:5000,
  minObservations:20,
  configured:false,
  updatedBy:null,
  updatedAt:null
})

const rowToControl=row=>({
  workspaceId:row.workspace_id,
  task:row.task,
  mode:row.mode,
  canaryPercent:Number(row.canary_percent),
  autoRollback:Boolean(row.auto_rollback),
  maxErrorRatePct:Number(row.max_error_rate_pct),
  maxP95LatencyMs:Number(row.max_p95_latency_ms),
  minObservations:Number(row.min_observations),
  configured:true,
  updatedBy:row.updated_by,
  updatedAt:row.updated_at
})

export const getDeploymentControl=async({workspaceId,task})=>{
  if(!modelRegistryItem(task))throw new Error('unknown AI task')
  if(!pool)return defaults(task)
  const {rows}=await pool.query(
    `SELECT * FROM ace_ai_deployment_controls WHERE workspace_id=$1 AND task=$2`,
    [workspaceId,task]
  )
  return rows[0]?rowToControl(rows[0]):defaults(task)
}

export const listDeploymentControls=async workspaceId=>{
  const tasks=[]
  const {modelRegistrySnapshot}=await import('./ai-registry.mjs')
  for(const route of modelRegistrySnapshot()){
    tasks.push(await getDeploymentControl({workspaceId,task:route.task}))
  }
  return tasks
}

export const saveDeploymentControl=async({workspaceId,task,input,actor=null})=>{
  if(!pool)throw new Error('DATABASE_URL is required to persist deployment controls')
  const normalized=normalizeDeploymentControlInput(task,input)
  const {rows}=await pool.query(
    `INSERT INTO ace_ai_deployment_controls
      (workspace_id,task,mode,canary_percent,auto_rollback,max_error_rate_pct,max_p95_latency_ms,min_observations,updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (workspace_id,task)
     DO UPDATE SET mode=EXCLUDED.mode,canary_percent=EXCLUDED.canary_percent,
       auto_rollback=EXCLUDED.auto_rollback,max_error_rate_pct=EXCLUDED.max_error_rate_pct,
       max_p95_latency_ms=EXCLUDED.max_p95_latency_ms,min_observations=EXCLUDED.min_observations,
       updated_by=EXCLUDED.updated_by,updated_at=now()
     RETURNING *`,
    [workspaceId,task,normalized.mode,normalized.canaryPercent,normalized.autoRollback,
     normalized.maxErrorRatePct,normalized.maxP95LatencyMs,normalized.minObservations,
     actor?.userId||actor?.email||null]
  )
  return rowToControl(rows[0])
}

export const deploymentTrafficBucket=({workspaceId,task,key})=>{
  const digest=createHash('sha256').update(String(workspaceId)+'\n'+String(task)+'\n'+String(key||'default')).digest('hex')
  return (parseInt(digest.slice(0,8),16)%10000)/100
}

export const deploymentTrafficDecision=({workspaceId,task,key,control,allowShadow=false})=>{
  const current=control||defaults(task)
  const bucket=deploymentTrafficBucket({workspaceId,task,key})
  if(current.mode==='off')return {allowed:false,mode:'off',bucket,servedCandidate:false,shadow:false,reason:'AI deployment is turned off'}
  if(current.mode==='shadow'){
    if(allowShadow)return {allowed:true,mode:'shadow',bucket,servedCandidate:true,shadow:true,reason:null}
    return {allowed:false,mode:'shadow',bucket,servedCandidate:false,shadow:true,reason:'candidate is shadow-only and cannot serve user traffic'}
  }
  if(current.mode==='canary'){
    const allowed=bucket<Number(current.canaryPercent)
    return {
      allowed,
      mode:'canary',
      bucket,
      servedCandidate:allowed,
      shadow:false,
      reason:allowed?null:'request is outside candidate canary allocation; predecessor/baseline should continue serving'
    }
  }
  return {allowed:true,mode:'active',bucket,servedCandidate:true,shadow:false,reason:null}
}

export const evaluateDeploymentTraffic=async({workspaceId,task,key,allowShadow=false})=>{
  const control=await getDeploymentControl({workspaceId,task})
  return {...deploymentTrafficDecision({workspaceId,task,key,control,allowShadow}),control}
}

export const recordDeploymentObservation=async({
  workspaceId,task,mode='active',bucket=null,servedCandidate=true,outcome,latencyMs=null,jobId=null
})=>{
  if(!pool||!workspaceId||!task)return null
  const cleanOutcome=['succeeded','failed','unknown','cancelled'].includes(String(outcome))?String(outcome):'failed'
  const {rows}=await pool.query(
    `INSERT INTO ace_ai_deployment_observations
      (id,workspace_id,task,deployment_mode,traffic_bucket,served_candidate,outcome,latency_ms,job_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    ['aidobs_'+randomUUID(),workspaceId,task,String(mode||'active'),bucket==null?null:clamp(bucket,0,100),
     Boolean(servedCandidate),cleanOutcome,latencyMs==null?null:Math.max(0,Math.round(Number(latencyMs)||0)),jobId]
  )
  return rows[0]||null
}

const percentile95=values=>{
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b)
  if(!sorted.length)return 0
  return sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(sorted.length*0.95)-1))]
}

export const deploymentHealth=async({workspaceId,task,limit=500})=>{
  const control=await getDeploymentControl({workspaceId,task})
  if(!pool)return {control,sampleSize:0,errorRatePct:0,p95LatencyMs:0,rollbackRecommended:false,reasons:[]}
  const {rows}=await pool.query(
    `SELECT outcome,latency_ms,served_candidate,created_at
     FROM ace_ai_deployment_observations
     WHERE workspace_id=$1 AND task=$2 AND served_candidate=true
     ORDER BY created_at DESC LIMIT $3`,
    [workspaceId,task,Math.max(1,Math.min(Number(limit||500),5000))]
  )
  const sampleSize=rows.length
  const failures=rows.filter(row=>row.outcome==='failed'||row.outcome==='unknown').length
  const errorRatePct=sampleSize?Number(((failures/sampleSize)*100).toFixed(3)):0
  const p95LatencyMs=percentile95(rows.map(row=>Number(row.latency_ms)).filter(Number.isFinite))
  const reasons=[]
  if(sampleSize>=control.minObservations&&errorRatePct>control.maxErrorRatePct)reasons.push('error rate exceeds deployment threshold')
  if(sampleSize>=control.minObservations&&p95LatencyMs>control.maxP95LatencyMs)reasons.push('p95 latency exceeds deployment threshold')
  return {
    control,
    sampleSize,
    failures,
    errorRatePct,
    p95LatencyMs,
    rollbackRecommended:control.autoRollback&&reasons.length>0,
    reasons,
    generatedAt:new Date().toISOString()
  }
}


export const applyDeploymentHealthGuard=async({workspaceId,task})=>{
  const health=await deploymentHealth({workspaceId,task})
  if(!pool||!health.control.autoRollback||!health.reasons.length)return {halted:false,health}
  if(!['canary','active'].includes(health.control.mode))return {halted:false,health}
  const {rows}=await pool.query(
    `UPDATE ace_ai_deployment_controls
     SET mode='off',canary_percent=0,updated_by='system:deployment-health-guard',updated_at=now()
     WHERE workspace_id=$1 AND task=$2 AND auto_rollback=true AND mode IN ('canary','active')
     RETURNING *`,
    [workspaceId,task]
  )
  return {
    halted:Boolean(rows[0]),
    control:rows[0]?rowToControl(rows[0]):health.control,
    health,
    note:rows[0]?'Candidate traffic was halted after a configured deployment-health threshold breach. Artifact rollback still requires the governed rollback operation.':null
  }
}
