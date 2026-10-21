import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { modelCatalogItems, modelRegistryItem, registrySummary } from '../../ai-registry.mjs'
import { verifyProviderAccess } from '../../ai-providers.mjs'
import { getMlCapabilities, mlServiceConfigured } from '../../ml-client.mjs'
import { deployModel, getEvaluationPolicy, getTenantRegistry, listEvaluations, promoteModel, qualifyEvaluation, recordProviderAccessVerification, rollbackModel, syncTenantRegistry, undeployModel, upsertEvaluationPolicy } from '../../ai-registry-store.mjs'
import { closeAiDatasets, createAiDataset, getAiDataset, listAiDatasets, retireAiDataset, trainingRequestFromDataset, trainingRequestFromDatasetWithHorizon } from '../../ai-datasets.mjs'
import { metricCatalog } from '../../metric-catalog.mjs'
import { closeLiveVoice, createLiveVoiceSession, getLiveVoiceSession, installLiveVoiceWebSocket, terminateLiveVoiceSession } from '../../live-voice.mjs'
import { evaluateAiTaskAdmission, getAiTaskPolicy, listAiTaskPolicies, listCreativeAssets, listTranscripts, reviewCreativeAsset, saveAiTaskPolicy } from '../../ai-governance-store.mjs'
import { approveAiActivationProposal, attachActivationProposalReviewerJob, createAiActivationProposal, listAiActivationProposals, markActivationProposalReviewerBlocked, rejectAiActivationProposal } from '../../ai-activation-proposals.mjs'
import {deploymentHealth,listDeploymentControls,saveDeploymentControl} from '../../ai-deployment-controls.mjs'
import {aiMonitoringSnapshot} from '../../ai-monitoring.mjs'
import {handleSubmitJob} from '../../../modules/jobs/src/application/commands/submit-job/submit-job.handler.mjs'
import {hostedEvaluationSupported,runHostedGroundingEvaluation} from '../../ai-hosted-evaluation.mjs'
import {handleRequestInference} from '../../../modules/ai/src/application/commands/request-inference/request-inference.handler.mjs'
import {handleActivateModelResult} from '../../../modules/ai/src/application/commands/activate-model-result/activate-model-result.handler.mjs'

export async function handleAiGovernanceRoutes({req,res,url,workspaceId,readBody,send:writeResponse,authenticatedUser,isProd}) {
  const send=(...args)=>{writeResponse(...args);return true}
    if (req.method === 'GET' && url.pathname === '/api/ai/metrics/catalog') {
      return send(req,res,200,metricCatalog())
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/datasets') {
      const task=String(url.searchParams.get('task')||'').trim()||null
      const limit=Math.max(1,Math.min(Number(url.searchParams.get('limit')||50),200))
      const items=await listAiDatasets({workspaceId,task,limit}).catch(()=>[])
      return send(req,res,200,{items,task,limit,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/ai/datasets') {
      const body=await readBody(req)
      try{
        const item=await createAiDataset({
          workspaceId,
          task:String(body.task||''),
          rows:body.rows,
          schemaVersion:String(body.schemaVersion||'point-in-time.v1'),
          featureDefinitionVersion:String(body.featureDefinitionVersion||'features.v1'),
          labelDefinitionVersion:String(body.labelDefinitionVersion||'labels.v1'),
          labelObservationCutoff:body.labelObservationCutoff,
          sourceSnapshot:body.sourceSnapshot&&typeof body.sourceSnapshot==='object'?body.sourceSnapshot:{},
          createdBy:authenticatedUser?.userId||null
        })
        return send(req,res,201,{item})
      }catch(error){
        return send(req,res,422,{error:error instanceof Error?error.message:'dataset could not be created'})
      }
    }
    if (req.method === 'GET' && /^\/api\/ai\/datasets\/[^/]+$/.test(url.pathname)) {
      const id=decodeURIComponent(url.pathname.split('/')[4]||'')
      const item=await getAiDataset({workspaceId,id,includeRows:false}).catch(()=>null)
      return item?send(req,res,200,{item}):send(req,res,404,{error:'dataset not found'})
    }
    if (req.method === 'POST' && /^\/api\/ai\/datasets\/[^/]+\/retire$/.test(url.pathname)) {
      if(!['owner','admin'].includes(authenticatedUser?.role||''))return send(req,res,403,{error:'owner or admin role required'})
      const id=decodeURIComponent(url.pathname.split('/')[4]||'')
      const item=await retireAiDataset({workspaceId,id})
      return item?send(req,res,200,{item}):send(req,res,404,{error:'dataset not found'})
    }
    if (req.method === 'POST' && /^\/api\/ai\/datasets\/[^/]+\/train$/.test(url.pathname)) {
      if(!mlServiceConfigured())return send(req,res,503,{error:'ML service is not configured'})
      const id=decodeURIComponent(url.pathname.split('/')[4]||'')
      const body=await readBody(req)
      try{
        const dataset=await getAiDataset({workspaceId,id,includeRows:false})
        if(!dataset)return send(req,res,404,{error:'dataset not found'})
        const task=String(dataset.task||'')
        const datasetAdmission=await evaluateAiTaskAdmission({workspaceId,task,requestedModel:modelRegistryItem(task)?.requestedModel||task,reservedUnits:1})
        if(!datasetAdmission.allowed)return send(req,res,429,{error:'training task is blocked by tenant policy',prerequisites:datasetAdmission.reasons,policy:datasetAdmission.policy,usage:datasetAdmission.usage})
        const request=task==='future_customer_value'
          ?await trainingRequestFromDatasetWithHorizon({
            workspaceId,id,horizon:String(body.horizon||''),randomSeed:Number(body.randomSeed||42),categoricalFeatures:body.categoricalFeatures||[]
          })
          :await trainingRequestFromDataset({
            workspaceId,id,randomSeed:Number(body.randomSeed||42),calibrationMethod:String(body.calibrationMethod||'sigmoid'),categoricalFeatures:body.categoricalFeatures||[]
          })
        const operation=task==='future_customer_value'?'regression_train':'classification_train'
        const requestKey=String(req.headers['idempotency-key']||req.requestId||randomUUID())
        const deadlineAt=new Date(Date.now()+Number(process.env.ML_JOB_DEADLINE_MS||15*60*1000)).toISOString()
        const job=await handleSubmitJob({
          workspaceId,
          kind:'ml_task',
          payload:{operation,task,request},
          idempotencyKey:'ml:dataset:'+id+':'+requestKey,
          maxAttempts:Number(process.env.ML_JOB_MAX_ATTEMPTS||2),
          deadlineAt,
          inputSnapshot:{
            schemaVersion:'ml-dataset-input.v1',
            task,operation,datasetId:id,datasetHash:dataset.content_hash,
            featureSchemaVersion:dataset.feature_definition_version,
            labelSchemaVersion:dataset.label_definition_version,
            capturedAt:new Date().toISOString(),
            actor:authenticatedUser?{userId:authenticatedUser.userId||null,role:authenticatedUser.role||null}:null
          },
          resultSchemaVersion:'ml-result.v1',
          aiUsageReservation:{task,provider:'local_ml',requestedModel:task,reservedUnits:1},
          outboxEvent:{eventType:'ai.job.accepted',schemaVersion:'ai-job-event.v1',payload:{task,operation,datasetId:id}}
        })
        if(!job)return send(req,res,503,{error:'durable queue requires DATABASE_URL'})
        return send(req,res,202,{jobId:job.id,status:job.status,task,operation,datasetId:id,deadlineAt:job.deadline_at||deadlineAt,resultSchemaVersion:'ml-result.v1'})
      }catch(error){
        return send(req,res,422,{error:error instanceof Error?error.message:'dataset training could not be submitted'})
      }
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/task-policies') {
      const items=await listAiTaskPolicies(workspaceId)
      return send(req,res,200,{items,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && /^\/api\/ai\/task-policies\/[^/]+$/.test(url.pathname)) {
      if(!['owner','admin'].includes(authenticatedUser?.role||''))return send(req,res,403,{error:'owner or admin role required'})
      const task=decodeURIComponent(url.pathname.split('/')[4]||'')
      const body=await readBody(req)
      try{
        const item=await saveAiTaskPolicy({workspaceId,task,input:body,actor:authenticatedUser})
        return send(req,res,200,{item})
      }catch(error){
        return send(req,res,400,{error:error instanceof Error?error.message:'AI task policy could not be saved'})
      }
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/activation-proposals') {
      const status=url.searchParams.get('status')
      const limit=Math.max(1,Math.min(Number(url.searchParams.get('limit')||100),500))
      const items=await listAiActivationProposals({workspaceId,status:status||null,limit})
      return send(req,res,200,{items,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/ai/activation-proposals') {
      const body=await readBody(req)
      try{
        const item=await createAiActivationProposal({workspaceId,input:body,actor:authenticatedUser})
        const reviewerSubmission=await handleRequestInference({
          workspaceId,
          task:'recommendation_reviewer',
          input:{
            recommendation:item.payload,
            evidence:item.evidence_snapshot,
            policy:item.policy_result
          },
          sourceSnapshot:{
            schemaVersion:'activation-review.v1',
            proposalId:item.id,
            proposalHash:item.proposal_hash,
            evidenceIds:Array.isArray(item.evidence_snapshot?.evidenceRefs)?item.evidence_snapshot.evidenceRefs:[],
            capturedAt:new Date().toISOString()
          },
          idempotencyKey:'activation-review:'+item.proposal_hash,
          actor:authenticatedUser
        })
        if(!reviewerSubmission.accepted){
          const blocked=await markActivationProposalReviewerBlocked({
            workspaceId,
            id:item.id,
            reason:[reviewerSubmission.error,...(reviewerSubmission.prerequisites||[])].filter(Boolean).join('; ')
          })
          return send(req,res,409,{
            error:'required recommendation reviewer is blocked',
            item:blocked||item,
            prerequisites:reviewerSubmission.prerequisites||[],
            note:'The proposal is preserved but cannot be approved without required reviewer evidence.'
          })
        }
        const reviewed=await attachActivationProposalReviewerJob({workspaceId,id:item.id,jobId:reviewerSubmission.job.id})
        return send(req,res,202,{
          item:reviewed||item,
          reviewerJobId:reviewerSubmission.job.id,
          reviewerStatus:'queued',
          note:'Reviewer output is evidence only and cannot authorize or execute the proposal.'
        })
      }catch(error){
        return send(req,res,409,{error:error instanceof Error?error.message:'activation proposal could not be created'})
      }
    }
    if (req.method === 'POST' && /^\/api\/ai\/activation-proposals\/[^/]+\/approve$/.test(url.pathname)) {
      const id=decodeURIComponent(url.pathname.split('/')[4]||'')
      try{
        const item=await approveAiActivationProposal({workspaceId,id,actor:authenticatedUser})
        return send(req,res,200,{item})
      }catch(error){
        return send(req,res,409,{error:error instanceof Error?error.message:'activation proposal approval failed'})
      }
    }
    if (req.method === 'POST' && /^\/api\/ai\/activation-proposals\/[^/]+\/reject$/.test(url.pathname)) {
      const id=decodeURIComponent(url.pathname.split('/')[4]||'')
      const body=await readBody(req)
      try{
        const item=await rejectAiActivationProposal({workspaceId,id,actor:authenticatedUser,reason:body.reason||null})
        return item?send(req,res,200,{item}):send(req,res,404,{error:'activation proposal not found or no longer pending'})
      }catch(error){
        return send(req,res,409,{error:error instanceof Error?error.message:'activation proposal rejection failed'})
      }
    }
    if (req.method === 'POST' && /^\/api\/ai\/activation-proposals\/[^/]+\/execute$/.test(url.pathname)) {
      const id=decodeURIComponent(url.pathname.split('/')[4]||'')
      try{
        const execution=await handleActivateModelResult({workspaceId,proposalId:id,actor:authenticatedUser})
        return send(req,res,202,{
          item:execution.proposal,
          jobId:execution.job?.id||null,
          status:execution.job?.status||'queued',
          note:'Approved activation execution was queued for a worker. The worker rechecks proposal freshness and the execution safety gate before any provider side effect.'
        })
      }catch(error){
        const message=error instanceof Error?error.message:'activation proposal execution could not be queued'
        const blocked=/disabled|unsupported|blocked/i.test(message)
        return send(req,res,blocked?409:422,{error:message})
      }
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/transcripts') {
      const items=await listTranscripts(workspaceId)
      return send(req,res,200,{items,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/creative-assets') {
      const items=await listCreativeAssets(workspaceId)
      return send(req,res,200,{items,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && /^\/api\/ai\/creative-assets\/[^/]+\/review$/.test(url.pathname)) {
      const id=decodeURIComponent(url.pathname.split('/')[4]||'')
      const body=await readBody(req)
      try{
        const item=await reviewCreativeAsset({workspaceId,id,status:String(body.status||''),actor:authenticatedUser,reason:body.reason||null})
        return item?send(req,res,200,{item}):send(req,res,404,{error:'creative asset not found or no longer reviewable'})
      }catch(error){
        return send(req,res,400,{error:error instanceof Error?error.message:'creative review failed'})
      }
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/registry') {
      const staticRegistry=registrySummary()
      let tenantItems=[]
      let persistence='unavailable'
      try{
        await syncTenantRegistry(workspaceId)
        tenantItems=await getTenantRegistry(workspaceId)
        persistence='postgres'
      }catch(error){
        tenantItems=staticRegistry.items
        persistence='static_fallback'
      }
      return send(req,res,200,{...staticRegistry,tenantItems,persistence})
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/monitoring') {
      const windowHours=Math.max(1,Math.min(Number(url.searchParams.get('windowHours')||24),24*90))
      try{
        return send(req,res,200,await aiMonitoringSnapshot({workspaceId,windowHours}))
      }catch(error){
        return send(req,res,503,{error:error instanceof Error?error.message:'AI monitoring unavailable'})
      }
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/deployment-controls') {
      const controls=await listDeploymentControls(workspaceId)
      const items=await Promise.all(controls.map(async control=>({
        ...control,
        health:await deploymentHealth({workspaceId,task:control.task}).catch(()=>null)
      })))
      return send(req,res,200,{items,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && /^\/api\/ai\/deployment-controls\/[^/]+$/.test(url.pathname)) {
      if(!['owner','admin'].includes(authenticatedUser?.role||''))return send(req,res,403,{error:'owner or admin role required'})
      const task=decodeURIComponent(url.pathname.split('/')[4]||'')
      const body=await readBody(req)
      try{
        const item=await saveDeploymentControl({workspaceId,task,input:body,actor:authenticatedUser})
        const health=await deploymentHealth({workspaceId,task}).catch(()=>null)
        return send(req,res,200,{item,health,note:'Deployment control changes traffic policy only; they do not qualify, approve or deploy an unqualified model.'})
      }catch(error){
        return send(req,res,400,{error:error instanceof Error?error.message:'deployment control could not be saved'})
      }
    }
    if (req.method === 'POST' && /^\/api\/ai\/providers\/[^/]+\/verify$/.test(url.pathname)) {
      if(!['owner','admin'].includes(authenticatedUser?.role||''))return send(req,res,403,{error:'owner or admin role required'})
      const task=decodeURIComponent(url.pathname.split('/')[4]||'')
      try{
        const verification=await verifyProviderAccess(task)
        const registryEntry=await recordProviderAccessVerification({
          workspaceId,
          task,
          resolvedModel:verification.resolvedModel||null,
          verified:true
        })
        return send(req,res,200,{
          task,
          provider:verification.provider,
          requestedModel:verification.requestedModel,
          resolvedModel:verification.resolvedModel||null,
          accessVerified:true,
          usage:verification.usage||null,
          registryEntry,
          note:'Credential/model access was verified by an explicitly enabled bounded provider test. This does not qualify, approve or deploy the model.'
        })
      }catch(error){
        return send(req,res,error?.status||503,{
          error:error instanceof Error?error.message:'provider access verification failed',
          task,
          accessVerified:false
        })
      }
    }
    if (req.method === 'POST' && /^\/api\/ai\/models\/[^/]+\/deploy$/.test(url.pathname)) {
      if(!['owner','admin'].includes(authenticatedUser?.role||''))return send(req,res,403,{error:'owner or admin role required'})
      const task=decodeURIComponent(url.pathname.split('/')[4]||'')
      try{
        const item=await deployModel({workspaceId,task,actor:authenticatedUser})
        return send(req,res,200,{item})
      }catch(error){
        return send(req,res,409,{error:error instanceof Error?error.message:'deployment gate failed'})
      }
    }
    if (req.method === 'POST' && /^\/api\/ai\/models\/[^/]+\/undeploy$/.test(url.pathname)) {
      if(!['owner','admin'].includes(authenticatedUser?.role||''))return send(req,res,403,{error:'owner or admin role required'})
      const task=decodeURIComponent(url.pathname.split('/')[4]||'')
      try{
        const item=await undeployModel({workspaceId,task,actor:authenticatedUser})
        return send(req,res,200,{item})
      }catch(error){
        return send(req,res,409,{error:error instanceof Error?error.message:'undeploy failed'})
      }
    }
    if (req.method === 'POST' && url.pathname === '/api/ai/live-voice/sessions') {
      try{
        await syncTenantRegistry(workspaceId)
        const registry=await getTenantRegistry(workspaceId)
        const route=registry.find(item=>item.task==='live_voice')
        const liveAdmission=await evaluateAiTaskAdmission({workspaceId,task:'live_voice',requestedModel:route?.requestedModel||'',reservedUnits:1})
        if(!liveAdmission.allowed)return send(req,res,429,{error:'live voice is blocked by tenant policy',prerequisites:liveAdmission.reasons,policy:liveAdmission.policy,usage:liveAdmission.usage})
        const missing=[]
        if(route?.documentationVerified!==true)missing.push('documentation verification')
        if(route?.accessVerified!==true)missing.push('provider access verification')
        if(route?.evaluationStatus!=='qualified')missing.push('qualified evaluation')
        if(route?.approvalStatus!=='approved')missing.push('approval')
        if(route?.deploymentStatus!=='deployed')missing.push('deployment')
        if(missing.length)return send(req,res,409,{error:'live voice is blocked by governance prerequisites',prerequisites:missing})
        const session=await createLiveVoiceSession({workspaceId,userId:authenticatedUser?.userId||null})
        return send(req,res,201,session)
      }catch(error){
        return send(req,res,503,{error:error instanceof Error?error.message:'live voice session could not be created'})
      }
    }
    if (req.method === 'GET' && /^\/api\/ai\/live-voice\/sessions\/[^/]+$/.test(url.pathname)) {
      const id=decodeURIComponent(url.pathname.split('/')[5]||'')
      const item=await getLiveVoiceSession({workspaceId,id}).catch(()=>null)
      return item?send(req,res,200,{item}):send(req,res,404,{error:'live voice session not found'})
    }
    if (req.method === 'POST' && /^\/api\/ai\/live-voice\/sessions\/[^/]+\/terminate$/.test(url.pathname)) {
      const id=decodeURIComponent(url.pathname.split('/')[5]||'')
      const item=await terminateLiveVoiceSession({workspaceId,id})
      return item?send(req,res,200,{item}):send(req,res,404,{error:'live voice session not found'})
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/evaluations') {
      const task=String(url.searchParams.get('task')||'').trim()||null
      const limit=Math.max(1,Math.min(Number(url.searchParams.get('limit')||100),500))
      const items=await listEvaluations({workspaceId,task,limit}).catch(()=>[])
      return send(req,res,200,{items,task,limit,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/evaluation-policy') {
      const task=String(url.searchParams.get('task')||'').trim()
      if(!task)return send(req,res,400,{error:'task required'})
      const item=await getEvaluationPolicy({workspaceId,task})
      return send(req,res,200,{item,task})
    }
    if (req.method === 'POST' && url.pathname === '/api/ai/evaluation-policy') {
      if(!['owner','admin'].includes(authenticatedUser?.role||''))return send(req,res,403,{error:'owner or admin role required'})
      const body=await readBody(req)
      const task=String(body.task||'').trim()
      const version=String(body.version||'').trim()
      if(!task||!version)return send(req,res,400,{error:'task and version required'})
      if(!body.thresholds||typeof body.thresholds!=='object'||Array.isArray(body.thresholds))return send(req,res,400,{error:'thresholds object required'})
      try{
        const item=await upsertEvaluationPolicy({
          workspaceId,
          task,
          version:version.slice(0,120),
          thresholds:body.thresholds,
          notes:body.notes?String(body.notes).slice(0,2000):null,
          actor:authenticatedUser
        })
        return send(req,res,200,{item})
      }catch(error){
        return send(req,res,400,{error:error instanceof Error?error.message:'evaluation policy could not be saved'})
      }
    }
    if (req.method === 'POST' && url.pathname === '/api/ai/evaluations/run') {
      if(!['owner','admin'].includes(authenticatedUser?.role||''))return send(req,res,403,{error:'owner or admin role required'})
      if(process.env.AI_PROVIDER_TESTS_ENABLED!=='true')return send(req,res,503,{error:'provider evaluation is disabled; set AI_PROVIDER_TESTS_ENABLED=true for an authorized bounded evaluation'})
      const body=await readBody(req)
      const task=String(body.task||'').trim()
      if(!hostedEvaluationSupported(task))return send(req,res,400,{error:'grounding evaluation is implemented for the analyst task only'})
      try{
        const item=await runHostedGroundingEvaluation({workspaceId,task,actor:authenticatedUser})
        return send(req,res,201,{item,note:'Evaluation evidence is recorded. It must still be qualified against the predeclared policy, approved and deployed.'})
      }catch(error){
        return send(req,res,error?.status||502,{error:error instanceof Error?error.message:'evaluation failed'})
      }
    }
    if (req.method === 'POST' && /^\/api\/ai\/evaluations\/[^/]+\/qualify$/.test(url.pathname)) {
      if(!['owner','admin'].includes(authenticatedUser?.role||''))return send(req,res,403,{error:'owner or admin role required'})
      const parts=url.pathname.split('/')
      const evaluationId=decodeURIComponent(parts[4]||'')
      try{
        const item=await qualifyEvaluation({workspaceId,evaluationId,actor:authenticatedUser})
        return send(req,res,200,{item})
      }catch(error){
        return send(req,res,409,{error:error instanceof Error?error.message:'evaluation qualification failed'})
      }
    }
    if (req.method === 'POST' && /^\/api\/ai\/models\/[^/]+\/promote$/.test(url.pathname)) {
      if(!['owner','admin'].includes(authenticatedUser?.role||''))return send(req,res,403,{error:'owner or admin role required'})
      const parts=url.pathname.split('/')
      const task=decodeURIComponent(parts[4]||'')
      const body=await readBody(req)
      const evaluationId=String(body.evaluationId||'').trim()
      if(!evaluationId)return send(req,res,400,{error:'evaluationId required'})
      try{
        const item=await promoteModel({workspaceId,task,evaluationId,actor:authenticatedUser})
        return send(req,res,200,{item})
      }catch(error){
        return send(req,res,409,{error:error instanceof Error?error.message:'model promotion failed'})
      }
    }
    if (req.method === 'POST' && /^\/api\/ai\/models\/[^/]+\/rollback$/.test(url.pathname)) {
      if(!['owner','admin'].includes(authenticatedUser?.role||''))return send(req,res,403,{error:'owner or admin role required'})
      const parts=url.pathname.split('/')
      const task=decodeURIComponent(parts[4]||'')
      try{
        const item=await rollbackModel({workspaceId,task,actor:authenticatedUser})
        return send(req,res,200,{item})
      }catch(error){
        return send(req,res,409,{error:error instanceof Error?error.message:'model rollback failed'})
      }
    }

  return false
}
