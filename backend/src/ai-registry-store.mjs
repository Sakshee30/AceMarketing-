import { randomUUID } from 'node:crypto'
import {pool} from './database.mjs'
import { modelRegistrySnapshot } from './ai-registry.mjs'
import { persistDomainResult } from './ai-domain-results.mjs'

const staticByTask=()=>new Map(modelRegistrySnapshot().map(item=>[item.task,item]))

export const assertNoActiveActivationDispatch=async(client,{workspaceId,task})=>{
  const {rows}=await client.query(
    `SELECT id,execution_job_id,execution_lease_until
     FROM ace_ai_activation_proposals
     WHERE workspace_id=$1 AND task=$2
       AND (execution_status='running' OR execution_outcome_state='unknown')
     LIMIT 1`,
    [workspaceId,task]
  )
  if(rows[0]){
    throw new Error('model lifecycle change is blocked while an activation dispatch lease is active')
  }
}

export const syncTenantRegistry=async workspaceId=>{
  if(!pool)return []
  const items=modelRegistrySnapshot()
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    for(const item of items){
      const activeDispatch=await client.query(
        `SELECT 1 FROM ace_ai_activation_proposals
         WHERE workspace_id=$1 AND task=$2
           AND (execution_status='running' OR execution_outcome_state='unknown')
         LIMIT 1`,
        [workspaceId,item.task]
      )
      if(activeDispatch.rows[0])continue
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

const resultTypeForExecution=(task,operation)=>{
  if(operation==='forecast_qualification')return 'model_evaluation'
  if(['classification_train','regression_train','offer_ranking'].includes(operation))return 'model_evaluation'
  if(operation==='artifact_score'){
    if(['lead_qualification','paid_conversion','customer_churn'].includes(task))return 'calibrated_probability'
    if(task==='future_customer_value')return 'regression_estimate'
  }
  if(operation==='offer_ranking_score')return 'ranking'
  if(task.startsWith('forecast_'))return 'forecast_distribution'
  if(task==='incrementality')return 'causal_estimate'
  if(task==='marketing_mix')return 'marketing_mix_analysis'
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
  await syncTenantRegistry(workspaceId)
  const task=String(result?.task||job.payload?.task||'')
  const operation=String(job.payload?.operation||'')
  if(!task)throw new Error('ML result task is required')
  const payload=result?.result||result
  const artifact=payload?.artifact||null
  const warnings=[].concat(Array.isArray(payload?.warnings)?payload.warnings:[],payload?.warning||[]).filter(Boolean)
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
        resultId,workspaceId,job.id,task,blocked?'blocked':'completed',resultTypeForExecution(task,operation),
        null,null,artifact?.artifactId||null,JSON.stringify(job.input_snapshot||{}),
        payload?.target||null,payload?.horizon||null,JSON.stringify(warnings),
        JSON.stringify(payload)
      ]
    )
    await persistDomainResult(client,{workspaceId,resultId,task,operation,payload})
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
          JSON.stringify(warnings)
        ]
      )
    }
    await client.query(
      `UPDATE ace_ai_model_registry
       SET training_status=CASE
             WHEN $3::text IS NOT NULL THEN 'trained'
             WHEN training_status='not_applicable' THEN training_status
             ELSE training_status
           END,
           evaluation_status=CASE
             WHEN $4::boolean THEN 'evidence_recorded'
             ELSE evaluation_status
           END,
           artifact_revision=COALESCE($3::text,artifact_revision),
           artifact_hash=COALESCE($5::text,artifact_hash),
           evaluation_reference=COALESCE($6::text,evaluation_reference),
           updated_at=now()
       WHERE workspace_id=$1 AND task=$2`,
      [workspaceId,task,artifact?.artifactId||null,evaluated,artifact?.sha256||null,evalId]
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

export const recordProviderAccessVerification=async({workspaceId,task,resolvedModel=null,verified=false})=>{
  if(!pool)throw new Error('DATABASE_URL is required to persist provider access verification')
  await syncTenantRegistry(workspaceId)
  const {rows}=await pool.query(
    `UPDATE ace_ai_model_registry
     SET access_verified=$3,
         resolved_model=CASE WHEN $3 THEN COALESCE($4,resolved_model,requested_model) ELSE resolved_model END,
         configuration_status=CASE WHEN $3 THEN 'configured' ELSE configuration_status END,
         updated_at=now()
     WHERE workspace_id=$1 AND task=$2
     RETURNING *`,
    [workspaceId,task,Boolean(verified),resolvedModel]
  )
  if(!rows[0])throw new Error('model registry entry not found')
  return rows[0]
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
    await assertNoActiveActivationDispatch(client,{workspaceId,task})
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


export const upsertEvaluationPolicy=async({workspaceId,task,version,thresholds,notes=null,actor=null})=>{
  if(!pool)throw new Error('DATABASE_URL is required for evaluation policy')
  const clean=thresholds&&typeof thresholds==='object'&&!Array.isArray(thresholds)?thresholds:{}
  if(!Object.keys(clean).length)throw new Error('at least one evaluation threshold is required')
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    await client.query(
      `UPDATE ace_ai_evaluation_policies SET active=false
       WHERE workspace_id=$1 AND task=$2 AND active=true AND version<>$3`,
      [workspaceId,task,version]
    )
    const {rows}=await client.query(
      `INSERT INTO ace_ai_evaluation_policies
        (workspace_id,task,version,thresholds,notes,active,created_by)
       VALUES ($1,$2,$3,$4::jsonb,$5,true,$6)
       ON CONFLICT (workspace_id,task,version)
       DO UPDATE SET thresholds=EXCLUDED.thresholds,notes=EXCLUDED.notes,active=true
       RETURNING *`,
      [workspaceId,task,version,JSON.stringify(clean),notes,actor?.userId||null]
    )
    await client.query('COMMIT')
    return rows[0]
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
}

export const getEvaluationPolicy=async({workspaceId,task})=>{
  if(!pool)return null
  const {rows}=await pool.query(
    `SELECT workspace_id,task,version,thresholds,notes,active,created_by,created_at
     FROM ace_ai_evaluation_policies
     WHERE workspace_id=$1 AND task=$2 AND active=true
     ORDER BY created_at DESC LIMIT 1`,
    [workspaceId,task]
  )
  return rows[0]||null
}

const thresholdPass=(actual,rule)=>{
  if(actual===null||actual===undefined||!Number.isFinite(Number(actual)))return {pass:false,reason:'metric missing'}
  const value=Number(actual)
  if(typeof rule==='number')return {pass:value>=rule,reason:'minimum '+rule}
  if(!rule||typeof rule!=='object')return {pass:false,reason:'invalid threshold'}
  if(rule.min!==undefined&&value<Number(rule.min))return {pass:false,reason:'below minimum '+rule.min}
  if(rule.max!==undefined&&value>Number(rule.max))return {pass:false,reason:'above maximum '+rule.max}
  return {pass:true,reason:'within threshold'}
}

export const qualifyEvaluation=async({workspaceId,evaluationId,actor=null})=>{
  if(!pool)throw new Error('DATABASE_URL is required for qualification')
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const evalResult=await client.query(
      `SELECT * FROM ace_ai_evaluations WHERE id=$1 AND workspace_id=$2 FOR UPDATE`,
      [evaluationId,workspaceId]
    )
    const evaluation=evalResult.rows[0]
    if(!evaluation)throw new Error('evaluation not found')
    const policyResult=await client.query(
      `SELECT * FROM ace_ai_evaluation_policies
       WHERE workspace_id=$1 AND task=$2 AND active=true
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [workspaceId,evaluation.task]
    )
    const policy=policyResult.rows[0]
    if(!policy)throw new Error('no predeclared active evaluation policy exists for this task')
    await assertNoActiveActivationDispatch(client,{workspaceId,task:evaluation.task})
    const details={}
    let qualified=true
    for(const [metric,rule] of Object.entries(policy.thresholds||{})){
      const checked=thresholdPass(evaluation.metrics?.[metric],rule)
      details[metric]={actual:evaluation.metrics?.[metric]??null,rule,...checked}
      if(!checked.pass)qualified=false
    }
    const {rows}=await client.query(
      `UPDATE ace_ai_evaluations
       SET thresholds=$3::jsonb,policy_version=$4,qualified=$5,status=$6,
           qualification_details=$7::jsonb,completed_at=COALESCE(completed_at,now())
       WHERE id=$1 AND workspace_id=$2
       RETURNING *`,
      [
        evaluationId,workspaceId,JSON.stringify(policy.thresholds||{}),policy.version,qualified,
        qualified?'qualified':'failed_gate',JSON.stringify(details)
      ]
    )
    await client.query(
      `UPDATE ace_ai_model_registry
       SET evaluation_status=$3,evaluation_reference=$4,updated_at=now()
       WHERE workspace_id=$1 AND task=$2`,
      [workspaceId,evaluation.task,qualified?'qualified':'failed_gate',evaluationId]
    )
    await client.query('COMMIT')
    return {...rows[0],qualificationActor:actor?.userId||null}
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
}

export const deployModel=async({workspaceId,task,actor=null})=>{
  if(!pool)throw new Error('DATABASE_URL is required for deployment state')
  await syncTenantRegistry(workspaceId)
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const {rows}=await client.query(
      `SELECT * FROM ace_ai_model_registry WHERE workspace_id=$1 AND task=$2 FOR UPDATE`,
      [workspaceId,task]
    )
    const current=rows[0]
    if(!current)throw new Error('model registry entry not found')
    await assertNoActiveActivationDispatch(client,{workspaceId,task})
    if(current.documentation_verified!==true)throw new Error('model documentation verification is incomplete')
    if(current.evaluation_status!=='qualified')throw new Error('model has not passed its predeclared evaluation gate')
    if(current.approval_status!=='approved')throw new Error('model has not been approved')
    if(current.kind==='hosted_model'&&current.access_verified!==true)throw new Error('hosted provider access is not verified')
    if(current.kind!=='hosted_model'&&current.kind!=='deterministic_baseline'&&!current.artifact_revision){
      throw new Error('fitted model has no registered artifact revision')
    }
    const {rows:updated}=await client.query(
      `UPDATE ace_ai_model_registry
       SET deployment_status='deployed',updated_at=now()
       WHERE workspace_id=$1 AND task=$2
       RETURNING *`,
      [workspaceId,task]
    )
    await client.query('COMMIT')
    return {...updated[0],deploymentActor:actor?.userId||null}
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
}

export const undeployModel=async({workspaceId,task,actor=null})=>{
  if(!pool)throw new Error('DATABASE_URL is required for deployment state')
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    await assertNoActiveActivationDispatch(client,{workspaceId,task})
    const {rows}=await client.query(
      `UPDATE ace_ai_model_registry
       SET deployment_status='not_deployed',updated_at=now()
       WHERE workspace_id=$1 AND task=$2
       RETURNING *`,
      [workspaceId,task]
    )
    if(!rows[0])throw new Error('model registry entry not found')
    await client.query('COMMIT')
    return {...rows[0],deploymentActor:actor?.userId||null}
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
}

export const rollbackModel=async({workspaceId,task,actor=null})=>{
  if(!pool)throw new Error('DATABASE_URL is required for rollback')
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const {rows}=await client.query(
      `SELECT * FROM ace_ai_model_registry WHERE workspace_id=$1 AND task=$2 FOR UPDATE`,
      [workspaceId,task]
    )
    const current=rows[0]
    if(!current)throw new Error('model registry entry not found')
    await assertNoActiveActivationDispatch(client,{workspaceId,task})
    if(!current.rollback_predecessor)throw new Error('no rollback predecessor recorded')
    const {rows:updated}=await client.query(
      `UPDATE ace_ai_model_registry
       SET artifact_revision=$3,approval_status='approved',deployment_status='not_deployed',
           rollback_predecessor=$4,promoted_by=$5,promoted_at=now(),updated_at=now()
       WHERE workspace_id=$1 AND task=$2
       RETURNING *`,
      [workspaceId,task,current.rollback_predecessor,current.artifact_revision,actor?.userId||null]
    )
    await client.query('COMMIT')
    return updated[0]
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
}

export const closeRegistryStore=async()=>{}
