import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { modelRegistrySnapshot } from './ai-registry.mjs'

const { Pool }=pg
const databaseUrl=process.env.DATABASE_URL||''
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.AI_REGISTRY_DB_POOL_MAX||5),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

const staticByTask=()=>new Map(modelRegistrySnapshot().map(item=>[item.task,item]))

export const syncTenantRegistry=async workspaceId=>{
  if(!pool)return []
  const items=modelRegistrySnapshot()
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    for(const item of items){
      await client.query(
        `INSERT INTO ace_ai_model_registry
          (workspace_id,task,kind,provider,requested_model,resolved_model,input_schema_version,output_schema_version,
           permitted_regions,data_classifications,configuration_status,implementation_status,training_status,
           evaluation_status,approval_status,deployment_status,documentation_verified,access_verified,
           documentation_source,documentation_verified_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,'ai-input.v1','ai-result.v1',$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16,$17,
                 CASE WHEN $15 THEN now() ELSE NULL END,now())
         ON CONFLICT (workspace_id,task)
         DO UPDATE SET
           kind=EXCLUDED.kind,
           provider=EXCLUDED.provider,
           requested_model=EXCLUDED.requested_model,
           documentation_verified=EXCLUDED.documentation_verified,
           documentation_source=EXCLUDED.documentation_source,
           implementation_status=EXCLUDED.implementation_status,
           data_classifications=EXCLUDED.data_classifications,
           permitted_regions=EXCLUDED.permitted_regions,
           updated_at=now()`,
        [
          workspaceId,item.task,item.kind,item.provider,item.requestedModel,item.resolvedModel,
          JSON.stringify(item.permittedRegions||[]),JSON.stringify(item.dataClassifications||[]),
          item.readiness==='disabled'?'disabled':item.credentialConfigured===false?'unconfigured':'configured',
          item.implementationStatus||'implemented',
          item.trainingStatus||'not_applicable',
          item.evaluationStatus||'not_evaluated',
          item.approvalStatus||'not_approved',
          item.deploymentStatus||'not_deployed',
          Boolean(item.documentationVerified),
          Boolean(item.accessVerified),
          item.documentationSource||null
        ]
      )
    }
    await client.query('COMMIT')
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
  return getTenantRegistry(workspaceId)
}

export const getTenantRegistry=async workspaceId=>{
  if(!pool)return modelRegistrySnapshot()
  const {rows}=await pool.query(
    `SELECT workspace_id,task,kind,provider,requested_model,resolved_model,artifact_revision,artifact_hash,
            input_schema_version,output_schema_version,runtime_requirements,permitted_regions,data_classifications,
            configuration_status,implementation_status,training_status,evaluation_status,approval_status,deployment_status,
            documentation_verified,access_verified,documentation_source,documentation_verified_at,evaluation_reference,
            rollback_predecessor,promoted_by,promoted_at,created_at,updated_at
     FROM ace_ai_model_registry WHERE workspace_id=$1 ORDER BY task`,
    [workspaceId]
  )
  if(!rows.length)return modelRegistrySnapshot()
  const defaults=staticByTask()
  return rows.map(row=>{
    const base=defaults.get(row.task)||{}
    return {
      ...base,
      task:row.task,
      kind:row.kind,
      provider:row.provider,
      requestedModel:row.requested_model,
      resolvedModel:row.resolved_model,
      artifactRevision:row.artifact_revision,
      artifactHash:row.artifact_hash,
      inputSchemaVersion:row.input_schema_version,
      outputSchemaVersion:row.output_schema_version,
      runtimeRequirements:row.runtime_requirements,
      permittedRegions:row.permitted_regions,
      dataClassifications:row.data_classifications,
      configurationStatus:row.configuration_status,
      implementationStatus:row.implementation_status,
      trainingStatus:row.training_status,
      evaluationStatus:row.evaluation_status,
      approvalStatus:row.approval_status,
      deploymentStatus:row.deployment_status,
      documentationVerified:Boolean(row.documentation_verified),
      accessVerified:Boolean(row.access_verified),
      documentationSource:row.documentation_source,
      documentationVerifiedAt:row.documentation_verified_at,
      evaluationReference:row.evaluation_reference,
      rollbackPredecessor:row.rollback_predecessor,
      promotedBy:row.promoted_by,
      promotedAt:row.promoted_at
    }
  })
}

const resultTypeForTask=task=>{
  if(['lead_qualification','paid_conversion','customer_churn'].includes(task))return 'calibrated_probability'
  if(task==='future_customer_value')return 'regression_estimate'
  if(task.startsWith('forecast_'))return 'forecast_distribution'
  if(task==='incrementality'||task==='marketing_mix')return 'causal_estimate'
  if(task==='anomaly_detection')return 'anomaly_score'
  if(task==='behavioral_segments')return 'cluster_assignment'
  if(task==='offer_ranking')return 'ranking'
  return 'model_result'
}

const evaluationMetrics=result=>{
  if(result?.metrics&&typeof result.metrics==='object')return result.metrics
  if(result?.backtest&&typeof result.backtest==='object')return {backtest:result.backtest}
  if(result?.healthStatus)return {healthStatus:result.healthStatus}
  return {}
}

export const recordMlExecution=async({workspaceId,job,result})=>{
  if(!pool)return null
  const task=String(result?.task||job.payload?.task||'')
  if(!task)throw new Error('ML result task is required')
  const payload=result?.result||result
  const artifact=payload?.artifact||null
  const evaluated=String(payload?.status||'').includes('evaluated')||Boolean(payload?.metrics)||Boolean(payload?.backtest)||Boolean(payload?.healthStatus)
  const blocked=String(payload?.status||'').includes('blocked')
  const evalId=evaluated?'eval_'+randomUUID():null
  const resultId='aires_'+randomUUID()
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO ace_ai_results
        (id,workspace_id,job_id,task,status,result_type,requested_model,resolved_model,artifact_version,schema_version,
         source_snapshot,target,horizon,warnings,evidence_refs,payload,usage)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ml-result.v1',$10::jsonb,$11,$12,$13::jsonb,'[]'::jsonb,$14::jsonb,NULL)`,
      [
        resultId,workspaceId,job.id,task,blocked?'blocked':'completed',resultTypeForTask(task),
        null,null,artifact?.artifactId||null,JSON.stringify(job.input_snapshot||{}),
        payload?.target||null,payload?.horizon||null,JSON.stringify(payload?.warnings||payload?.warning?[].concat(payload.warnings||[],payload.warning||[]):[]),
        JSON.stringify(payload)
      ]
    )
    if(evalId){
      const metrics=evaluationMetrics(payload)
      await client.query(
        `INSERT INTO ace_ai_evaluations
          (id,workspace_id,task,model_ref,dataset_ref,split_definition,metrics,thresholds,sample_size,qualified,status,warnings,created_by,completed_at)
         VALUES ($1,$2,$3,$4,NULL,$5::jsonb,$6::jsonb,'{}'::jsonb,$7,false,$8,$9::jsonb,NULL,now())`,
        [
          evalId,workspaceId,task,artifact?.artifactId||String(payload?.model||task),
          JSON.stringify({source:'service-reported',promotionGate:'not_evaluated_against_predeclared_thresholds'}),
          JSON.stringify(metrics),Number(metrics?.testRows||payload?.sampleSize||0)||null,
          blocked?'blocked':'evidence_recorded',
          JSON.stringify([].concat(payload?.warnings||[],payload?.warning||[]).filter(Boolean))
        ]
      )
    }
    await client.query(
      `UPDATE ace_ai_model_registry
       SET training_status=CASE
             WHEN $4 IS NOT NULL THEN 'trained'
             WHEN training_status='not_applicable' THEN training_status
             ELSE training_status
           END,
           evaluation_status=CASE
             WHEN $5::boolean THEN 'evidence_recorded'
             ELSE evaluation_status
           END,
           artifact_revision=COALESCE($4,artifact_revision),
           artifact_hash=COALESCE($6,artifact_hash),
           evaluation_reference=COALESCE($7,evaluation_reference),
           updated_at=now()
       WHERE workspace_id=$1 AND task=$2`,
      [workspaceId,task,resultId,artifact?.artifactId||null,evaluated,artifact?.sha256||null,evalId]
    )
    await client.query('COMMIT')
    return {resultId,evaluationId:evalId}
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
}

export const listEvaluations=async({workspaceId,task=null,limit=100})=>{
  if(!pool)return []
  const params=[workspaceId]
  let where='workspace_id=$1'
  if(task){params.push(task);where+=' AND task=$2'}
  params.push(Math.max(1,Math.min(Number(limit||100),500)))
  const {rows}=await pool.query(
    `SELECT id,task,model_ref,dataset_ref,split_definition,metrics,thresholds,sample_size,qualified,status,warnings,created_by,created_at,completed_at
     FROM ace_ai_evaluations WHERE ${where}
     ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  )
  return rows
}

export const promoteModel=async({workspaceId,task,actor,evaluationId})=>{
  if(!pool)throw new Error('DATABASE_URL is required for promotion')
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const evalResult=await client.query(
      `SELECT * FROM ace_ai_evaluations WHERE id=$1 AND workspace_id=$2 AND task=$3 FOR UPDATE`,
      [evaluationId,workspaceId,task]
    )
    const evaluation=evalResult.rows[0]
    if(!evaluation)throw new Error('evaluation not found')
    if(evaluation.qualified!==true)throw new Error('evaluation has not passed its predeclared qualification threshold')
    const previous=await client.query(
      `SELECT artifact_revision FROM ace_ai_model_registry WHERE workspace_id=$1 AND task=$2 FOR UPDATE`,
      [workspaceId,task]
    )
    const predecessor=previous.rows[0]?.artifact_revision||null
    const {rows}=await client.query(
      `UPDATE ace_ai_model_registry
       SET approval_status='approved',deployment_status='not_deployed',evaluation_status='qualified',
           evaluation_reference=$3,rollback_predecessor=$4,promoted_by=$5,promoted_at=now(),updated_at=now()
       WHERE workspace_id=$1 AND task=$2
       RETURNING *`,
      [workspaceId,task,evaluationId,predecessor,actor?.userId||null]
    )
    if(!rows[0])throw new Error('model registry entry not found')
    await client.query('COMMIT')
    return rows[0]
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
}

export const closeRegistryStore=async()=>{if(pool)await pool.end()}
