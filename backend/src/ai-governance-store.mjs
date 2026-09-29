import {createHash,randomUUID} from 'node:crypto'
import {pool} from './database.mjs'
import {modelRegistryItem} from './ai-registry.mjs'
import {aiObjectStoreStatus,storeAiObject,storeAiText} from './ai-object-store.mjs'
import {enforceTenantPolicyWithinPlatform,platformTaskPolicy} from './ai-platform-policy.mjs'
import {evaluateDeploymentTraffic} from './ai-deployment-controls.mjs'

const readTaskUsage=async(workspaceId,task)=>{
  if(!pool)return {activeJobs:0,monthUnits:0,estimatedCost:null,costStatus:'not_configured'}
  const [active,usage]=await Promise.all([
    pool.query(
      `SELECT count(*)::int AS count FROM ace_jobs
       WHERE workspace_id=$1 AND kind IN ('ai_hosted_task','ml_task')
         AND COALESCE(payload->>'task','')=$2
         AND status IN ('pending','retry','leased','unknown_outcome')`,
      [workspaceId,task]
    ),
    pool.query(
      `SELECT COALESCE(sum(CASE WHEN status='committed' THEN COALESCE(actual_units,reserved_units,0) ELSE reserved_units END),0)::float8 AS units
       FROM ace_ai_usage_reservations
       WHERE workspace_id=$1 AND task=$2
         AND created_at>=date_trunc('month',now())
         AND status IN ('reserved','committed','unknown')`,
      [workspaceId,task]
    )
  ])
  return {
    activeJobs:Number(active.rows[0]?.count||0),
    monthUnits:Number(usage.rows[0]?.units||0),
    estimatedCost:null,
    costStatus:'not_configured'
  }
}

const asInt=(value,fallback,min,max)=>{
  const n=Number(value)
  return Number.isInteger(n)&&n>=min&&n<=max?n:fallback
}

export const getAiTaskPolicy=async(workspaceId,task)=>{
  const route=modelRegistryItem(task)
  if(!route) return null
  if(!pool)return {
    workspaceId,task,enabled:true,approvedRequestedModel:null,maxConcurrentJobs:4,
    monthlyUnitBudget:null,featureFlags:{},policyVersion:'implicit-v1',source:'implicit',
    usage:{activeJobs:0,monthUnits:0,estimatedCost:null,costStatus:'not_configured'},
    platformPolicy:platformTaskPolicy(task)
  }
  const {rows}=await pool.query(
    `SELECT * FROM ace_ai_task_policies WHERE workspace_id=$1 AND task=$2`,
    [workspaceId,task]
  )
  if(!rows[0])return {
    workspaceId,task,enabled:true,approvedRequestedModel:null,maxConcurrentJobs:4,
    monthlyUnitBudget:null,featureFlags:{},policyVersion:'implicit-v1',source:'implicit',
    usage:await readTaskUsage(workspaceId,task),
    platformPolicy:platformTaskPolicy(task)
  }
  const row=rows[0]
  return {
    workspaceId:row.workspace_id,
    task:row.task,
    enabled:Boolean(row.enabled),
    approvedRequestedModel:row.approved_requested_model,
    maxConcurrentJobs:Number(row.max_concurrent_jobs),
    monthlyUnitBudget:row.monthly_unit_budget==null?null:Number(row.monthly_unit_budget),
    featureFlags:row.feature_flags||{},
    policyVersion:row.policy_version,
    updatedBy:row.updated_by,
    updatedAt:row.updated_at,
    source:'persisted',
    usage:await readTaskUsage(workspaceId,task),
    platformPolicy:platformTaskPolicy(task)
  }
}

export const listAiTaskPolicies=async workspaceId=>{
  const tasks=[]
  const {modelRegistrySnapshot}=await import('./ai-registry.mjs')
  for(const route of modelRegistrySnapshot()){
    tasks.push(await getAiTaskPolicy(workspaceId,route.task))
  }
  return tasks
}

export const normalizeAiTaskPolicyInput=(task,input={})=>{
  const route=modelRegistryItem(task)
  if(!route)throw new Error('unknown AI task')
  const enabled=input.enabled!==false
  const approvedRequestedModel=input.approvedRequestedModel==null||input.approvedRequestedModel===''?null:String(input.approvedRequestedModel)
  if(approvedRequestedModel&&approvedRequestedModel!==route.requestedModel){
    throw new Error('approvedRequestedModel must match the registry requested model; silent substitution is not allowed')
  }
  const rawConcurrent=input.maxConcurrentJobs==null?4:Number(input.maxConcurrentJobs)
  if(!Number.isInteger(rawConcurrent)||rawConcurrent<1||rawConcurrent>1000)throw new Error('maxConcurrentJobs must be an integer between 1 and 1000')
  const monthlyUnitBudget=input.monthlyUnitBudget==null||input.monthlyUnitBudget===''?null:Number(input.monthlyUnitBudget)
  if(monthlyUnitBudget!=null&&(!Number.isFinite(monthlyUnitBudget)||monthlyUnitBudget<0))throw new Error('monthlyUnitBudget must be null or a non-negative number')
  const featureFlags=input.featureFlags==null?{}:input.featureFlags
  if(!featureFlags||typeof featureFlags!=='object'||Array.isArray(featureFlags))throw new Error('featureFlags must be an object')
  const policyVersion=String(input.policyVersion||'v1').trim().slice(0,120)
  if(!policyVersion)throw new Error('policyVersion required')
  return {route,enabled,approvedRequestedModel,maxConcurrentJobs:rawConcurrent,monthlyUnitBudget,featureFlags,policyVersion}
}

export const saveAiTaskPolicy=async({workspaceId,task,input,actor})=>{
  const {enabled,approvedRequestedModel,maxConcurrentJobs,monthlyUnitBudget,featureFlags,policyVersion}=normalizeAiTaskPolicyInput(task,input)
  enforceTenantPolicyWithinPlatform({task,enabled,approvedRequestedModel,maxConcurrentJobs,monthlyUnitBudget})
  if(!pool)throw new Error('DATABASE_URL is required to persist AI task policy')
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const {rows}=await client.query(
      `INSERT INTO ace_ai_task_policies
        (workspace_id,task,enabled,approved_requested_model,max_concurrent_jobs,monthly_unit_budget,feature_flags,policy_version,updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)
       ON CONFLICT (workspace_id,task)
       DO UPDATE SET enabled=EXCLUDED.enabled,approved_requested_model=EXCLUDED.approved_requested_model,
         max_concurrent_jobs=EXCLUDED.max_concurrent_jobs,monthly_unit_budget=EXCLUDED.monthly_unit_budget,
         feature_flags=EXCLUDED.feature_flags,policy_version=EXCLUDED.policy_version,updated_by=EXCLUDED.updated_by,updated_at=now()
       RETURNING *`,
      [workspaceId,task,enabled,approvedRequestedModel,maxConcurrentJobs,monthlyUnitBudget,JSON.stringify(featureFlags),policyVersion,actor?.userId||actor?.email||null]
    )
    if(!enabled){
      await client.query(
        `UPDATE ace_jobs
         SET cancel_requested_at=COALESCE(cancel_requested_at,now()),
             status=CASE WHEN status IN ('pending','retry') THEN 'cancelled' ELSE status END,
             completed_at=CASE WHEN status IN ('pending','retry') THEN COALESCE(completed_at,now()) ELSE completed_at END,
             last_error=CASE
               WHEN status IN ('pending','retry') THEN COALESCE(last_error,'cancelled because AI task policy was disabled')
               ELSE last_error
             END,
             updated_at=now()
         WHERE workspace_id=$1
           AND kind IN ('ai_hosted_task','ml_task')
           AND COALESCE(payload->>'task','')=$2
           AND status IN ('pending','retry','leased','unknown_outcome')`,
        [workspaceId,task]
      )
    }
    await client.query('COMMIT')
    return getAiTaskPolicy(workspaceId,rows[0].task)
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
}

export const evaluateAiTaskAdmission=async({workspaceId,task,requestedModel,reservedUnits=1,trafficKey=null,enforceDeploymentTraffic=false,allowShadow=false})=>{
  const policy=await getAiTaskPolicy(workspaceId,task)
  if(!policy)return {allowed:false,reasons:['unknown AI task'],policy:null}
  const reasons=[]
  const platform=platformTaskPolicy(task)
  if(platform?.enabled===false)reasons.push('task disabled by platform policy')
  if(platform?.allowedRequestedModel&&platform.allowedRequestedModel!==requestedModel)reasons.push('requested model is not allowed by platform policy')
  if(!policy.enabled)reasons.push('task disabled by tenant policy')
  if(policy.approvedRequestedModel&&policy.approvedRequestedModel!==requestedModel)reasons.push('requested model is not approved by tenant policy')
  if(['creative_image','call_transcription'].includes(task)){
    const storage=aiObjectStoreStatus()
    if(!storage.configured)reasons.push('durable AI object storage is unavailable: '+storage.reason)
  }
  let activeJobs=0
  let monthUnits=0
  if(pool){
    const active=await pool.query(
      `SELECT count(*)::int AS count FROM ace_jobs
       WHERE workspace_id=$1 AND kind IN ('ai_hosted_task','ml_task')
         AND COALESCE(payload->>'task','')=$2
         AND status IN ('pending','retry','leased','unknown_outcome')`,
      [workspaceId,task]
    )
    activeJobs=Number(active.rows[0]?.count||0)
    const usage=await pool.query(
      `SELECT COALESCE(sum(CASE WHEN status='committed' THEN COALESCE(actual_units,reserved_units,0) ELSE reserved_units END),0)::float8 AS units
       FROM ace_ai_usage_reservations
       WHERE workspace_id=$1 AND task=$2
         AND created_at>=date_trunc('month',now())
         AND status IN ('reserved','committed','unknown')`,
      [workspaceId,task]
    )
    monthUnits=Number(usage.rows[0]?.units||0)
  }
  const effectiveConcurrent=Math.min(Number(policy.maxConcurrentJobs||1),Number(platform?.maxConcurrentJobs||policy.maxConcurrentJobs||1))
  if(activeJobs>=effectiveConcurrent)reasons.push('task concurrency limit reached')
  const budgetCandidates=[policy.monthlyUnitBudget,platform?.monthlyUnitBudget].filter(value=>value!=null).map(Number)
  const effectiveBudget=budgetCandidates.length?Math.min(...budgetCandidates):null
  if(effectiveBudget!=null&&monthUnits+Math.max(0,Number(reservedUnits||0))>effectiveBudget)reasons.push('task monthly unit budget exceeded')
  let deployment=null
  if(enforceDeploymentTraffic){
    deployment=await evaluateDeploymentTraffic({workspaceId,task,key:trafficKey||task,allowShadow})
    if(!deployment.allowed)reasons.push(deployment.reason||'deployment traffic policy blocked this request')
  }
  return {allowed:reasons.length===0,reasons,policy,platformPolicy:platform,deployment,usage:{activeJobs,monthUnits,reservedUnits:Number(reservedUnits||0),effectiveConcurrent,effectiveBudget}}
}

const sha256=value=>createHash('sha256').update(value).digest('hex')

export const persistTranscript=async({workspaceId,job,execution,route})=>{
  if(!pool)return null
  const text=String(execution?.text||'')
  const evidenceRefs=Array.isArray(job.payload?.sourceSnapshot?.evidenceIds)?job.payload.sourceSnapshot.evidenceIds:[]
  const assetRef=String(job.payload?.input?.fileUri||'')
  const stored=await storeAiText({workspaceId,text,kind:'transcript'})
  const id='aitr_'+randomUUID()
  const {rows}=await pool.query(
    `INSERT INTO ace_ai_transcripts
      (id,workspace_id,job_id,asset_ref,provider,requested_model,resolved_model,language_metadata,speaker_metadata,timestamp_metadata,
       transcript_object_ref,transcript_text,redaction_status,review_status,evidence_refs,retention_until)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,'pending','unreviewed',$13::jsonb,
       CASE WHEN $14::int>0 THEN now()+($14::int*interval '1 day') ELSE NULL END)
     RETURNING *`,
    [id,workspaceId,job.id,assetRef,route.provider,route.requestedModel,execution?.resolvedModel||route.requestedModel,
     JSON.stringify({languageCodes:execution?.transcriptionConfig?.languageCodes||[]}),
     JSON.stringify({diarization:Boolean(execution?.transcriptionConfig?.diarization)}),
     JSON.stringify({wordTimestamps:Boolean(execution?.transcriptionConfig?.wordTimestamp)}),
     stored.objectRef,text.slice(0,20000),JSON.stringify(evidenceRefs),Number(process.env.AI_TRANSCRIPT_RETENTION_DAYS||30)]
  )
  return rows[0]
}

export const persistCreativeAsset=async({workspaceId,job,execution,route})=>{
  if(!pool)return null
  const response=execution?.response||{}
  const parts=(response?.candidates||[]).flatMap(candidate=>candidate?.content?.parts||[])
  const imagePart=parts.find(part=>part?.inlineData?.data||part?.inline_data?.data)||null
  if(!imagePart)return null
  const data=String(imagePart.inlineData?.data||imagePart.inline_data?.data||'')
  const mimeType=String(imagePart.inlineData?.mimeType||imagePart.inline_data?.mime_type||'application/octet-stream')
  const buffer=Buffer.from(data,'base64')
  const stored=await storeAiObject({workspaceId,data:buffer,mimeType,kind:'creative'})
  const contentHash=stored.hash
  const id='aica_'+randomUUID()
  const objectRef=stored.objectRef
  const evidenceRefs=Array.isArray(job.payload?.sourceSnapshot?.evidenceIds)?job.payload.sourceSnapshot.evidenceIds:[]
  const {rows}=await pool.query(
    `INSERT INTO ace_ai_creative_assets
      (id,workspace_id,job_id,object_ref,content_hash,prompt_version,provider,requested_model,resolved_model,brand_constraints,provenance,review_status,evidence_refs)
     VALUES ($1,$2,$3,$4,$5,'creative-prompt.v1',$6,$7,$8,$9::jsonb,$10::jsonb,'draft',$11::jsonb)
     ON CONFLICT (workspace_id,content_hash) DO UPDATE SET job_id=EXCLUDED.job_id
     RETURNING *`,
    [id,workspaceId,job.id,objectRef,contentHash,route.provider,route.requestedModel,execution?.resolvedModel||route.requestedModel,
     JSON.stringify(job.payload?.input?.brandConstraints||{}),
     JSON.stringify({mimeType,providerRequestId:execution?.providerRequestId||null,generatedAt:new Date().toISOString()}),
     JSON.stringify(evidenceRefs)]
  )
  return rows[0]
}

export const listCreativeAssets=async workspaceId=>{
  if(!pool)return []
  const {rows}=await pool.query(
    `SELECT id,job_id,object_ref,content_hash,prompt_version,provider,requested_model,resolved_model,brand_constraints,provenance,
            review_status,reviewed_by,reviewed_at,version,parent_asset_id,evidence_refs,rejection_reason,created_at
     FROM ace_ai_creative_assets WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 200`,
    [workspaceId]
  )
  return rows
}

export const reviewCreativeAsset=async({workspaceId,id,status,actor,reason=null})=>{
  if(!pool)throw new Error('DATABASE_URL is required')
  if(!['in_review','approved','rejected'].includes(status))throw new Error('invalid creative review status')
  const {rows}=await pool.query(
    `UPDATE ace_ai_creative_assets
     SET review_status=$3,reviewed_by=$4,reviewed_at=now(),rejection_reason=$5
     WHERE workspace_id=$1 AND id=$2 AND review_status IN ('draft','in_review')
     RETURNING *`,
    [workspaceId,id,status,actor?.userId||actor?.email||null,reason?String(reason).slice(0,2000):null]
  )
  return rows[0]||null
}

export const listTranscripts=async workspaceId=>{
  if(!pool)return []
  const {rows}=await pool.query(
    `SELECT id,job_id,asset_ref,provider,requested_model,resolved_model,language_metadata,speaker_metadata,timestamp_metadata,
            transcript_text,redaction_status,review_status,evidence_refs,reviewed_by,reviewed_at,retention_until,created_at
     FROM ace_ai_transcripts WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 200`,
    [workspaceId]
  )
  return rows
}

export const closeAiGovernanceStore=async()=>{}
