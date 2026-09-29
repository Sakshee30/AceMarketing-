import { createHash, randomUUID } from 'node:crypto'
import {pool} from './database.mjs'
import { enqueueJob } from './queue.mjs'
import { executeHostedTask, ProviderExecutionError } from './ai-providers.mjs'
import { modelRegistryItem } from './ai-registry.mjs'
import { getTenantRegistry, syncTenantRegistry } from './ai-registry-store.mjs'
import { evaluateAiTaskAdmission, persistCreativeAsset, persistTranscript } from './ai-governance-store.mjs'
import { recordActivationProposalReviewerFailure, recordActivationProposalReviewerResult } from './ai-activation-proposals.mjs'

export const aiRuntimeAvailable=()=>Boolean(pool)

const fingerprint=value=>createHash('sha256').update(JSON.stringify(value||{})).digest('hex')

export const submitHostedAiJob=async({
  workspaceId,
  task,
  input,
  sourceSnapshot,
  idempotencyKey,
  deadlineAt=null,
  actor=null,
  executionMode='serve'
})=>{
  const staticRoute=modelRegistryItem(task)
  if(!staticRoute) return {accepted:false,status:400,error:'unknown AI task'}
  if(staticRoute.kind!=='hosted_model') return {accepted:false,status:400,error:'task is not a hosted-provider route'}
  await syncTenantRegistry(workspaceId)
  const tenantRegistry=await getTenantRegistry(workspaceId)
  const route=tenantRegistry.find(item=>item.task===task)||staticRoute
  const trafficKey=String(idempotencyKey||fingerprint({workspaceId,task,input,sourceSnapshot}))
  const admission=await evaluateAiTaskAdmission({
    workspaceId,
    task,
    requestedModel:route.requestedModel,
    reservedUnits:1,
    trafficKey,
    enforceDeploymentTraffic:true,
    allowShadow:executionMode==='shadow'
  })
  if(!admission.allowed){
    return {
      accepted:false,
      status:429,
      error:'AI task is blocked by tenant policy',
      readiness:'blocked',
      prerequisites:admission.reasons,
      policy:admission.policy,
      usage:admission.usage
    }
  }
  const prerequisites=[]
  if(route.documentationVerified!==true)prerequisites.push('documentation verification')
  if(route.accessVerified!==true)prerequisites.push('provider access verification')
  if(route.evaluationStatus!=='qualified')prerequisites.push('qualified evaluation')
  if(route.approvalStatus!=='approved')prerequisites.push('approval')
  if(route.deploymentStatus!=='deployed')prerequisites.push('deployment')
  if(prerequisites.length){
    return {
      accepted:false,
      status:409,
      error:'AI task is not active',
      readiness:'blocked',
      prerequisites
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
    payload:{
      task,
      input:input||{},
      sourceSnapshot:sourceSnapshot||{},
      deploymentDecision:admission.deployment?{
        mode:admission.deployment.mode,
        bucket:admission.deployment.bucket,
        servedCandidate:admission.deployment.servedCandidate,
        shadow:admission.deployment.shadow
      }:null
    },
    idempotencyKey:'ai:'+task+':'+key,
    maxAttempts:Number(process.env.AI_JOB_MAX_ATTEMPTS||2),
    deadlineAt:deadline,
    inputSnapshot:snapshot,
    resultSchemaVersion:'ai-result.v1',
    aiUsageReservation:{
      task,
      provider:route.provider,
      requestedModel:route.requestedModel,
      reservedUnits:1
    },
    outboxEvent:{
      eventType:'ai.job.accepted',
      schemaVersion:'ai-job-event.v1',
      payload:{task,provider:route.provider,requestedModel:route.requestedModel}
    }
  })
  return {accepted:true,status:202,job,route,deployment:admission.deployment||null}
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

const persistResult=async({workspaceId,job,execution,mediaPersistenceError=null})=>{
  if(!pool) return null
  const task=String(job.payload?.task||'')
  const route=modelRegistryItem(task)
  const id='aires_'+randomUUID()
  const evidenceRefs=Array.isArray(job.payload?.sourceSnapshot?.evidenceIds)?job.payload.sourceSnapshot.evidenceIds:[]
  const payload=task==='analyst'
    ?{text:execution.text||'',rawStatus:execution.rawStatus||null}
    :task==='creative_image'
      ?{provider:execution.provider,requestedModel:execution.requestedModel,resolvedModel:execution.resolvedModel,providerRequestId:execution.providerRequestId||null,assetStored:!mediaPersistenceError}
      :task==='call_transcription'
        ?{text:String(execution.text||'').slice(0,20000),transcriptionConfig:execution.transcriptionConfig||null,providerRequestId:execution.providerRequestId||null}
        :execution
  const {rows}=await pool.query(
    `INSERT INTO ace_ai_results
      (id,workspace_id,job_id,task,status,result_type,requested_model,resolved_model,artifact_version,schema_version,source_snapshot,warnings,evidence_refs,payload,usage)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ai-result.v1',$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb)
     RETURNING *`,
    [
      id,
      workspaceId,
      job.id,
      task,
      job.payload?.deploymentDecision?.shadow?'shadow':mediaPersistenceError?'degraded':'completed',
      task==='analyst'?'provider_output':task==='call_transcription'?'transcript':task==='creative_image'?'generated_asset':'provider_output',
      route?.requestedModel||null,
      execution?.resolvedModel||route?.requestedModel||null,
      null,
      JSON.stringify(job.payload?.sourceSnapshot||{}),
      JSON.stringify(mediaPersistenceError?[String(mediaPersistenceError).slice(0,1000)]:[]),
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
    let transcript=null
    let creativeAsset=null
    let mediaPersistenceError=null
    if(task==='call_transcription'){
      try{transcript=await persistTranscript({workspaceId,job,execution,route:modelRegistryItem(task)})}
      catch(error){mediaPersistenceError=error instanceof Error?error.message:String(error)}
    }
    if(task==='creative_image'){
      try{creativeAsset=await persistCreativeAsset({workspaceId,job,execution,route:modelRegistryItem(task)})}
      catch(error){mediaPersistenceError=error instanceof Error?error.message:String(error)}
    }
    const result=await persistResult({workspaceId,job,execution,mediaPersistenceError})
    if(task==='recommendation_reviewer'){
      await recordActivationProposalReviewerResult({
        workspaceId,
        jobId:job.id,
        resultId:result?.id||null,
        summary:execution?.text||''
      }).catch(()=>{})
    }
    return {
      task,
      resultId:result?.id||null,
      transcriptId:transcript?.id||null,
      creativeAssetId:creativeAsset?.id||null,
      provider:execution.provider,
      requestedModel:execution.requestedModel,
      resolvedModel:execution.resolvedModel,
      providerRequestId:execution.providerRequestId||null,
      usage:execution.usage||null,
      mediaPersistenceError,
      ...(task==='analyst'?{text:execution.text||''}:{})
    }
  }catch(error){
    if(task==='recommendation_reviewer'){
      await recordActivationProposalReviewerFailure({
        workspaceId,
        jobId:job.id,
        reason:error instanceof Error?error.message:String(error)
      }).catch(()=>{})
    }
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

export const closeAiRuntime=async()=>{}
