import { createHash, randomUUID } from 'node:crypto'
import pg from 'pg'
import { enqueueJob } from './queue.mjs'
import { executeHostedTask, ProviderExecutionError } from './ai-providers.mjs'
import { modelRegistryItem } from './ai-registry.mjs'

const { Pool }=pg
const databaseUrl=process.env.DATABASE_URL||''
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.AI_DB_POOL_MAX||5),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

export const aiRuntimeAvailable=()=>Boolean(pool)

const fingerprint=value=>createHash('sha256').update(JSON.stringify(value||{})).digest('hex')

export const submitHostedAiJob=async({
  workspaceId,
  task,
  input,
  sourceSnapshot,
  idempotencyKey,
  deadlineAt=null,
  actor=null
})=>{
  const route=modelRegistryItem(task)
  if(!route) return {accepted:false,status:400,error:'unknown AI task'}
  if(route.kind!=='hosted_model') return {accepted:false,status:400,error:'task is not a hosted-provider route'}
  if(route.readiness!=='active'){
    return {
      accepted:false,
      status:409,
      error:'AI task is not active',
      readiness:route.readiness,
      prerequisites:route.warnings
    }
  }
  if(!pool) return {accepted:false,status:503,error:'durable AI runtime requires DATABASE_URL'}
  const snapshot={
    schemaVersion:'ai-input.v1',
    task,
    capturedAt:new Date().toISOString(),
    actor:actor?{userId:actor.userId||null,role:actor.role||null}:null,
    evidence:sourceSnapshot||{},
    input:input||{}
  }
  const key=String(idempotencyKey||fingerprint({workspaceId,task,snapshot}))
  const deadline=deadlineAt||new Date(Date.now()+Number(process.env.AI_JOB_DEADLINE_MS||120000)).toISOString()
  const job=await enqueueJob({
    workspaceId,
    kind:'ai_hosted_task',
    payload:{task,input:input||{},sourceSnapshot:sourceSnapshot||{}},
    idempotencyKey:'ai:'+task+':'+key,
    maxAttempts:Number(process.env.AI_JOB_MAX_ATTEMPTS||2),
    deadlineAt:deadline,
    inputSnapshot:snapshot,
    resultSchemaVersion:'ai-result.v1'
  })
  return {accepted:true,status:202,job,route}
}

const providerRequestStart=async({workspaceId,job})=>{
  if(!pool) return null
  const task=String(job.payload?.task||'')
  const route=modelRegistryItem(task)
  if(!route) throw new Error('AI registry route not found for '+task)
  const id='aipr_'+randomUUID()
  const requestFingerprint=fingerprint({
    workspaceId,
    jobId:job.id,
    task,
    requestedModel:route.requestedModel,
    input:job.payload?.input||{},
    sourceSnapshot:job.payload?.sourceSnapshot||{}
  })
  const {rows}=await pool.query(
    `INSERT INTO ace_ai_provider_requests
      (id,workspace_id,job_id,provider,task,requested_model,outcome,request_fingerprint,started_at)
     VALUES ($1,$2,$3,$4,$5,$6,'submitted',$7,now())
     ON CONFLICT (workspace_id,job_id,provider)
     DO UPDATE SET outcome='submitted',request_fingerprint=EXCLUDED.request_fingerprint,started_at=now(),last_error=NULL
     RETURNING *`,
    [id,workspaceId,job.id,route.provider,task,route.requestedModel,requestFingerprint]
  )
  return rows[0]
}

const providerRequestFinish=async({workspaceId,job,execution,outcome='confirmed',error=null})=>{
  if(!pool) return null
  const task=String(job.payload?.task||'')
  const route=modelRegistryItem(task)
  const {rows}=await pool.query(
    `UPDATE ace_ai_provider_requests
     SET outcome=$4,
         resolved_model=COALESCE($5,resolved_model),
         provider_request_id=COALESCE($6,provider_request_id),
         completed_at=CASE WHEN $4 IN ('confirmed','failed') THEN now() ELSE completed_at END,
         last_error=$7,
         metadata=COALESCE(metadata,'{}'::jsonb)||$8::jsonb
     WHERE workspace_id=$1 AND job_id=$2 AND provider=$3
     RETURNING *`,
    [
      workspaceId,
      job.id,
      route?.provider||'unknown',
      outcome,
      execution?.resolvedModel||null,
      execution?.providerRequestId||null,
      error?String(error).slice(0,4000):null,
      JSON.stringify({
        requestFingerprint:execution?.requestFingerprint||null,
        usage:execution?.usage||null
      })
    ]
  )
  return rows[0]||null
}

const persistResult=async({workspaceId,job,execution})=>{
  if(!pool) return null
  const task=String(job.payload?.task||'')
  const route=modelRegistryItem(task)
  const id='aires_'+randomUUID()
  const evidenceRefs=Array.isArray(job.payload?.sourceSnapshot?.evidenceIds)?job.payload.sourceSnapshot.evidenceIds:[]
  const payload=task==='analyst'
    ?{text:execution.text||'',rawStatus:execution.rawStatus||null}
    :execution
  const {rows}=await pool.query(
    `INSERT INTO ace_ai_results
      (id,workspace_id,job_id,task,status,result_type,requested_model,resolved_model,artifact_version,schema_version,source_snapshot,warnings,evidence_refs,payload,usage)
     VALUES ($1,$2,$3,$4,'completed',$5,$6,$7,$8,'ai-result.v1',$9::jsonb,'[]'::jsonb,$10::jsonb,$11::jsonb,$12::jsonb)
     RETURNING *`,
    [
      id,
      workspaceId,
      job.id,
      task,
      task==='analyst'?'observed_metrics':'provider_output',
      route?.requestedModel||null,
      execution?.resolvedModel||route?.requestedModel||null,
      null,
      JSON.stringify(job.payload?.sourceSnapshot||{}),
      JSON.stringify(evidenceRefs),
      JSON.stringify(payload),
      JSON.stringify(execution?.usage||null)
    ]
  )
  return rows[0]
}

export const executeHostedAiJob=async job=>{
  const workspaceId=job.workspace_id
  const task=String(job.payload?.task||'')
  await providerRequestStart({workspaceId,job})
  try{
    const execution=await executeHostedTask({task,input:job.payload?.input||{}})
    await providerRequestFinish({workspaceId,job,execution,outcome:'confirmed'})
    const result=await persistResult({workspaceId,job,execution})
    return {
      task,
      resultId:result?.id||null,
      provider:execution.provider,
      requestedModel:execution.requestedModel,
      resolvedModel:execution.resolvedModel,
      providerRequestId:execution.providerRequestId||null,
      usage:execution.usage||null,
      ...(task==='analyst'?{text:execution.text||''}:{})
    }
  }catch(error){
    if(error instanceof ProviderExecutionError&&error.unknownOutcome){
      await providerRequestFinish({
        workspaceId,
        job,
        execution:{providerRequestId:error.providerRequestId||null},
        outcome:'unknown',
        error:error.message
      }).catch(()=>{})
      throw error
    }
    await providerRequestFinish({
      workspaceId,
      job,
      execution:{providerRequestId:error?.providerRequestId||null},
      outcome:'failed',
      error:error instanceof Error?error.message:String(error)
    }).catch(()=>{})
    throw error
  }
}

export const listAiResults=async({workspaceId,task=null,limit=50})=>{
  if(!pool) return []
  const safeLimit=Math.max(1,Math.min(Number(limit||50),200))
  const params=[workspaceId]
  let where='workspace_id=$1'
  if(task){params.push(String(task));where+=' AND task=$2'}
  params.push(safeLimit)
  const limitParam='$'+params.length
  const {rows}=await pool.query(
    `SELECT id,job_id,task,status,result_type,requested_model,resolved_model,artifact_version,schema_version,
            source_snapshot,cutoff_at,target,horizon,units,warnings,evidence_refs,payload,usage,created_at
     FROM ace_ai_results
     WHERE ${where}
     ORDER BY created_at DESC
     LIMIT ${limitParam}`,
    params
  )
  return rows
}

export const closeAiRuntime=async()=>{if(pool)await pool.end()}
