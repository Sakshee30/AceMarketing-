import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { URL } from 'node:url'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from '../../store.mjs'
import { getJob, queueAvailable, queueStats, requestJobCancellation } from '../../queue.mjs'
import { attributionStats, captureClickSession, closeAttributionStore, recordAssistedEvent, reconcileAttribution } from '../../attribution-store.mjs'
import { audienceOpsStats, closeLeadOps, createActivationRun, createAudience as createLeadAudience, getAudienceBundle, getLeadProfile, leadIdentityStats, leadOpsStats, listActivationRuns, listAudiences as listLeadAudiences, listLeadProfiles, materializeAudience, overrideLeadGrade as persistLeadGrade, previewAudience as previewLeadAudience, scoreLead, upsertLeadProfile, updateAudienceSyncState } from '../../lead-ops.mjs'
import { modelCatalogItems, modelRegistryItem, registrySummary } from '../../ai-registry.mjs'
import { verifyProviderAccess } from '../../ai-providers.mjs'
import { closeAiRuntime, listAiResults } from '../../ai-runtime.mjs'
import { getMlCapabilities, mlServiceConfigured } from '../../ml-client.mjs'
import { closeKnowledge, ingestKnowledgeText, listKnowledgeSources, revokeKnowledgeSource } from '../../knowledge.mjs'
import { deployModel, getEvaluationPolicy, getTenantRegistry, listEvaluations, promoteModel, qualifyEvaluation, recordProviderAccessVerification, rollbackModel, syncTenantRegistry, undeployModel, upsertEvaluationPolicy } from '../../ai-registry-store.mjs'
import { closeAiDatasets, createAiDataset, getAiDataset, listAiDatasets, retireAiDataset, trainingRequestFromDataset, trainingRequestFromDatasetWithHorizon } from '../../ai-datasets.mjs'
import { metricCatalog } from '../../metric-catalog.mjs'
import { closeLiveVoice, createLiveVoiceSession, getLiveVoiceSession, installLiveVoiceWebSocket, terminateLiveVoiceSession } from '../../live-voice.mjs'
import { validateHostedTaskInput } from '../../ai-input-validation.mjs'
import { evaluateAiTaskAdmission, getAiTaskPolicy, listAiTaskPolicies, listCreativeAssets, listTranscripts, reviewCreativeAsset, saveAiTaskPolicy } from '../../ai-governance-store.mjs'
import { getSegmentMemberships, listAnomalyItems, listCausalRecords, listForecastRecords, listMarketingMixRecords, listRankingItems, listSegmentSnapshots, reviewAnomalyItem } from '../../ai-domain-results.mjs'
import { approveAiActivationProposal, attachActivationProposalReviewerJob, createAiActivationProposal, listAiActivationProposals, markActivationProposalReviewerBlocked, rejectAiActivationProposal } from '../../ai-activation-proposals.mjs'
import {analystToolNames,executeAnalystTool,executeAnalystToolSet} from '../../ai-analyst-tools.mjs'
import {deploymentHealth,listDeploymentControls,saveDeploymentControl} from '../../ai-deployment-controls.mjs'
import {aiMonitoringSnapshot} from '../../ai-monitoring.mjs'
import {handleSubmitJob} from '../../../modules/jobs/src/application/commands/submit-job/submit-job.handler.mjs'
import {hostedEvaluationSupported,runHostedGroundingEvaluation} from '../../ai-hosted-evaluation.mjs'
import {handleRequestInference} from '../../../modules/ai/src/application/commands/request-inference/request-inference.handler.mjs'
import {handleActivateModelResult} from '../../../modules/ai/src/application/commands/activate-model-result/activate-model-result.handler.mjs'
import {handleReplayDeadLetter} from '../../../modules/jobs/src/application/commands/replay-dead-letter/replay-dead-letter.handler.mjs'

export async function handleAiRoutes({req,res,url,workspaceId,readBody,send:writeResponse,authenticatedUser,isProd}) {
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
    if (req.method === 'GET' && url.pathname === '/api/ai/knowledge') {
      const items=await listKnowledgeSources({workspaceId,role:authenticatedUser?.role||'viewer'})
      return send(req,res,200,{items,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/ai/knowledge') {
      const body=await readBody(req)
      const text=String(body.text||'')
      const name=String(body.name||'').trim()
      if(!name)return send(req,res,400,{error:'name required'})
      if(!text.trim())return send(req,res,400,{error:'text required'})
      const result=await ingestKnowledgeText({
        workspaceId,
        name,
        text,
        sourceLocation:body.sourceLocation?String(body.sourceLocation):null,
        documentVersion:String(body.documentVersion||'v1'),
        accessPolicy:body.accessPolicy&&typeof body.accessPolicy==='object'?body.accessPolicy:{},
        actor:authenticatedUser
      })
      return send(req,res,201,result)
    }
    if (req.method === 'POST' && /^\/api\/ai\/knowledge\/[^/]+\/revoke$/.test(url.pathname)) {
      const parts=url.pathname.split('/')
      const id=decodeURIComponent(parts[4]||'')
      const result=await revokeKnowledgeSource({workspaceId,id})
      return result?send(req,res,200,result):send(req,res,404,{error:'knowledge source not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/ai/knowledge/search') {
      const body=await readBody(req)
      const query=String(body.query||'').trim()
      if(!query)return send(req,res,400,{error:'query required'})
      if(query.length>1000)return send(req,res,400,{error:'query exceeds 1000 characters'})
      const job=await handleSubmitJob({
        workspaceId,
        kind:'knowledge_search',
        payload:{query,role:authenticatedUser?.role||'viewer',limit:Math.max(1,Math.min(Number(body.limit||10),20))},
        idempotencyKey:'knowledge-search:'+String(req.headers['idempotency-key']||req.requestId||randomUUID()),
        maxAttempts:Number(process.env.AI_JOB_MAX_ATTEMPTS||2),
        deadlineAt:new Date(Date.now()+Number(process.env.KNOWLEDGE_SEARCH_DEADLINE_MS||120000)).toISOString(),
        inputSnapshot:{schemaVersion:'knowledge-search.v1',query,capturedAt:new Date().toISOString(),role:authenticatedUser?.role||'viewer'},
        resultSchemaVersion:'knowledge-search-result.v1'
      })
      if(!job)return send(req,res,503,{error:'durable queue requires DATABASE_URL'})
      return send(req,res,202,{jobId:job.id,status:job.status,resultSchemaVersion:'knowledge-search-result.v1'})
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/ml/capabilities') {
      if(!mlServiceConfigured()){
        return send(req,res,200,{
          configured:false,
          items:registrySummary().items.filter(item=>item.provider==='local_ml'||item.kind==='deterministic_baseline'),
          warning:'ML service URL/authentication are not configured; training and specialist inference remain blocked.'
        })
      }
      try{
        const capabilities=await getMlCapabilities()
        return send(req,res,200,{configured:true,...capabilities})
      }catch(error){
        return send(req,res,503,{configured:true,error:error instanceof Error?error.message:'ML service unavailable'})
      }
    }
    const mlOperationByPath={
      '/api/ai/ml/train/classification':{operation:'classification_train',taskFromBody:true},
      '/api/ai/ml/train/regression':{operation:'regression_train',taskFromBody:true},
      '/api/ai/ml/score':{operation:'artifact_score',taskFromBody:true},
      '/api/ai/ml/forecast/seasonal-naive':{operation:'forecast_baseline',task:'forecast_baseline'},
      '/api/ai/ml/forecast/chronos-2':{operation:'forecast_chronos',task:'forecast_primary'},
      '/api/ai/ml/forecast/qualify':{operation:'forecast_qualification',task:'forecast_primary'},
      '/api/ai/ml/forecast/catboost-challenger':{operation:'forecast_challenger',task:'forecast_challenger'},
      '/api/ai/ml/incrementality':{operation:'incrementality',task:'incrementality'},
      '/api/ai/ml/marketing-mix':{operation:'marketing_mix',task:'marketing_mix'},
      '/api/ai/ml/anomalies':{operation:'anomaly_detection',task:'anomaly_detection'},
      '/api/ai/ml/segments':{operation:'behavioral_segments',task:'behavioral_segments'},
      '/api/ai/ml/rank':{operation:'offer_ranking',task:'offer_ranking'},
      '/api/ai/ml/rank/score':{operation:'offer_ranking_score',task:'offer_ranking'}
    }
    if(req.method==='POST'&&mlOperationByPath[url.pathname]){
      const spec=mlOperationByPath[url.pathname]
      if(!mlServiceConfigured(spec.operation)) return send(req,res,503,{error:'ML service profile for '+spec.operation+' is not configured'})
      const body=await readBody(req)
      const task=spec.taskFromBody?String(body.task||''):spec.task
      if(!task)return send(req,res,400,{error:'task required'})
      if(isProd&&['classification_train','regression_train'].includes(spec.operation)&&process.env.AI_ALLOW_INLINE_TRAINING!=='true'){
        return send(req,res,409,{error:'production supervised training requires an immutable dataset snapshot; create /api/ai/datasets and submit /api/ai/datasets/:id/train'})
      }
      const allowedTasks=new Set(['lead_qualification','paid_conversion','customer_churn','future_customer_value','forecast_baseline','forecast_primary','forecast_challenger','incrementality','marketing_mix','anomaly_detection','behavioral_segments','offer_ranking'])
      if(!allowedTasks.has(task))return send(req,res,400,{error:'unsupported ML task'})
      const admission=await evaluateAiTaskAdmission({workspaceId,task,requestedModel:modelRegistryItem(task)?.requestedModel||task,reservedUnits:1})
      if(!admission.allowed)return send(req,res,429,{error:'ML task is blocked by tenant policy',prerequisites:admission.reasons,policy:admission.policy,usage:admission.usage})
      const requestKey=String(req.headers['idempotency-key']||req.requestId||randomUUID())
      const deadlineAt=new Date(Date.now()+Number(process.env.ML_JOB_DEADLINE_MS||15*60*1000)).toISOString()
      const job=await handleSubmitJob({
        workspaceId,
        kind:'ml_task',
        payload:{operation:spec.operation,task,request:body},
        idempotencyKey:'ml:'+spec.operation+':'+requestKey,
        maxAttempts:Number(process.env.ML_JOB_MAX_ATTEMPTS||2),
        deadlineAt,
        inputSnapshot:{
          schemaVersion:'ml-input.v1',
          task,
          operation:spec.operation,
          capturedAt:new Date().toISOString(),
          actor:authenticatedUser?{userId:authenticatedUser.userId||null,role:authenticatedUser.role||null}:null,
          request:body
        },
        resultSchemaVersion:'ml-result.v1',
        aiUsageReservation:{task,provider:'local_ml',requestedModel:task,reservedUnits:1},
        outboxEvent:{eventType:'ai.job.accepted',schemaVersion:'ai-job-event.v1',payload:{task,operation:spec.operation}}
      })
      if(!job)return send(req,res,503,{error:'durable queue requires DATABASE_URL'})
      return send(req,res,202,{
        jobId:job.id,
        status:job.status,
        task,
        operation:spec.operation,
        deadlineAt:job.deadline_at||deadlineAt,
        resultSchemaVersion:'ml-result.v1'
      })
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/forecast-records') {
      const task=String(url.searchParams.get('task')||'').trim()||null
      const limit=Math.max(1,Math.min(Number(url.searchParams.get('limit')||100),500))
      const items=await listForecastRecords({workspaceId,task,limit})
      return send(req,res,200,{items,task,limit,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/causal-records') {
      const limit=Math.max(1,Math.min(Number(url.searchParams.get('limit')||100),500))
      const items=await listCausalRecords({workspaceId,limit})
      return send(req,res,200,{items,limit,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/marketing-mix-records') {
      const limit=Math.max(1,Math.min(Number(url.searchParams.get('limit')||100),500))
      const items=await listMarketingMixRecords({workspaceId,limit})
      return send(req,res,200,{items,limit,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/anomalies') {
      const status=String(url.searchParams.get('status')||'').trim()||null
      const limit=Math.max(1,Math.min(Number(url.searchParams.get('limit')||200),1000))
      const items=await listAnomalyItems({workspaceId,status,limit})
      return send(req,res,200,{items,status,limit,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && /^\/api\/ai\/anomalies\/[^/]+\/[^/]+\/review$/.test(url.pathname)) {
      const parts=url.pathname.split('/')
      const resultId=decodeURIComponent(parts[4]||'')
      const entityId=decodeURIComponent(parts[5]||'')
      const body=await readBody(req)
      try{
        const item=await reviewAnomalyItem({workspaceId,resultId,entityId,status:String(body.status||''),feedback:body.feedback||null,suppressedUntil:body.suppressedUntil||null,actor:authenticatedUser})
        return item?send(req,res,200,{item}):send(req,res,404,{error:'anomaly item not found'})
      }catch(error){
        return send(req,res,400,{error:error instanceof Error?error.message:'anomaly review failed'})
      }
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/segments') {
      const limit=Math.max(1,Math.min(Number(url.searchParams.get('limit')||50),200))
      const items=await listSegmentSnapshots({workspaceId,limit})
      return send(req,res,200,{items,limit,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && /^\/api\/ai\/segments\/[^/]+\/members$/.test(url.pathname)) {
      const snapshotId=decodeURIComponent(url.pathname.split('/')[4]||'')
      const limit=Math.max(1,Math.min(Number(url.searchParams.get('limit')||1000),5000))
      const items=await getSegmentMemberships({workspaceId,snapshotId,limit})
      return send(req,res,200,{items,snapshotId,limit})
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/rankings') {
      const resultId=String(url.searchParams.get('resultId')||'').trim()||null
      const limit=Math.max(1,Math.min(Number(url.searchParams.get('limit')||500),5000))
      const items=await listRankingItems({workspaceId,resultId,limit})
      return send(req,res,200,{items,resultId,limit,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/results') {
      const task=String(url.searchParams.get('task')||'').trim()||null
      const limit=Math.max(1,Math.min(Number(url.searchParams.get('limit')||50),200))
      const items=await listAiResults({workspaceId,task,limit}).catch(()=>[])
      return send(req,res,200,{items,task,limit,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && /^\/api\/ai\/jobs\/[^/]+$/.test(url.pathname)) {
      const id=decodeURIComponent(url.pathname.split('/').pop()||'')
      const job=await getJob({workspaceId,id})
      return job?send(req,res,200,{job}):send(req,res,404,{error:'AI job not found'})
    }
    if (req.method === 'GET' && /^\/api\/ai\/jobs\/[^/]+\/events$/.test(url.pathname)) {
      const parts=url.pathname.split('/')
      const id=decodeURIComponent(parts[4]||'')
      const initial=await getJob({workspaceId,id})
      if(!initial)return send(req,res,404,{error:'AI job not found'})
      res.writeHead(200,{
        'Content-Type':'text/event-stream; charset=utf-8',
        'Cache-Control':'no-cache, no-transform',
        'Connection':'keep-alive',
        'X-Accel-Buffering':'no'
      })
      let closed=false
      let lastSignature=''
      const terminal=new Set(['succeeded','completed','failed','cancelled','dead_letter','unknown'])
      const writeEvent=(event,data)=>{
        if(closed)return
        res.write('event: '+event+'\n')
        res.write('data: '+JSON.stringify(data)+'\n\n')
      }
      const emit=async()=>{
        if(closed)return
        const job=await getJob({workspaceId,id}).catch(()=>null)
        if(!job){writeEvent('error',{error:'AI job disappeared from tenant scope'});closed=true;return res.end()}
        const signature=JSON.stringify([job.status,job.updated_at,job.completed_at,job.last_error,job.cancel_requested_at])
        if(signature!==lastSignature){
          lastSignature=signature
          writeEvent('status',{jobId:job.id,status:job.status,attempts:job.attempts,updatedAt:job.updated_at,completedAt:job.completed_at||null,lastError:job.last_error||null,cancelRequestedAt:job.cancel_requested_at||null})
        }
        if(terminal.has(String(job.status||'').toLowerCase())){writeEvent('complete',{jobId:job.id,status:job.status});closed=true;return res.end()}
      }
      req.on('close',()=>{closed=true})
      writeEvent('ready',{jobId:id,status:initial.status})
      await emit()
      if(closed)return
      const interval=setInterval(()=>void emit(),1000)
      interval.unref?.()
      const timeout=setTimeout(()=>{if(!closed){writeEvent('timeout',{jobId:id});closed=true;res.end()}},Number(process.env.AI_JOB_EVENT_STREAM_MAX_MS||120000))
      timeout.unref?.()
      res.on('close',()=>{closed=true;clearInterval(interval);clearTimeout(timeout)})
      return
    }

    if (req.method === 'POST' && /^\/api\/ai\/jobs\/[^/]+\/replay$/.test(url.pathname)) {
      const parts=url.pathname.split('/')
      const id=decodeURIComponent(parts[4]||'')
      try{
        const job=await handleReplayDeadLetter({workspaceId,jobId:id})
        return send(req,res,202,{job})
      }catch(error){
        return send(req,res,Number(error?.status||400),{error:error instanceof Error?error.message:'dead-letter replay failed',code:error?.code||'dead_letter_replay_failed'})
      }
    }
    if (req.method === 'POST' && /^\/api\/ai\/jobs\/[^/]+\/cancel$/.test(url.pathname)) {
      const parts=url.pathname.split('/')
      const id=decodeURIComponent(parts[4]||'')
      const job=await requestJobCancellation({workspaceId,id})
      return job?send(req,res,200,{job}):send(req,res,404,{error:'cancellable AI job not found'})
    }
    if (req.method === 'GET' && url.pathname === '/api/ai/analyst/tools') {
      return send(req,res,200,{items:analystToolNames(),schemaVersion:'analyst-tool-catalog.v1'})
    }
    if (req.method === 'POST' && /^\/api\/ai\/analyst\/tools\/[^/]+$/.test(url.pathname)) {
      const tool=decodeURIComponent(url.pathname.split('/')[5]||'')
      const body=await readBody(req)
      try{
        const item=await executeAnalystTool({workspaceId,name:tool,args:body,principal:authenticatedUser})
        return send(req,res,200,{item})
      }catch(error){
        return send(req,res,400,{error:error instanceof Error?error.message:'analyst tool execution failed'})
      }
    }
    if (req.method === 'POST' && /^\/api\/ai\/tasks\/[^/]+\/shadow$/.test(url.pathname)) {
      const task=decodeURIComponent(url.pathname.split('/')[4]||'')
      if(task==='live_voice')return send(req,res,400,{error:'live_voice uses the dedicated session endpoint'})
      const body=await readBody(req)
      const validated=validateHostedTaskInput(task,body)
      if(!validated.ok)return send(req,res,400,{error:validated.error,task})
      const sourceSnapshot={
        schemaVersion:'hosted-task-shadow-input.v1',
        task,
        capturedAt:new Date().toISOString(),
        evidenceIds:Array.isArray(body.evidenceIds)?body.evidenceIds.map(String).slice(0,100):[],
        clientMetadata:body.clientMetadata&&typeof body.clientMetadata==='object'?body.clientMetadata:{},
        shadow:true
      }
      const submission=await handleRequestInference({
        workspaceId,
        task,
        input:validated.input,
        sourceSnapshot,
        idempotencyKey:String(req.headers['idempotency-key']||req.requestId||randomUUID()),
        actor:authenticatedUser,
        executionMode:'shadow'
      })
      if(!submission.accepted){
        return send(req,res,submission.status||409,{error:submission.error,task,readiness:submission.readiness||null,prerequisites:submission.prerequisites||[]})
      }
      return send(req,res,202,{
        jobId:submission.job.id,
        status:submission.job.status,
        task,
        shadow:true,
        deployment:submission.deployment,
        requestedModel:submission.route.requestedModel,
        resultSchemaVersion:'ai-result.v1'
      })
    }
    if (req.method === 'POST' && /^\/api\/ai\/tasks\/[^/]+\/submit$/.test(url.pathname)) {
      const task=decodeURIComponent(url.pathname.split('/')[4]||'')
      if(task==='live_voice')return send(req,res,400,{error:'live_voice uses the dedicated session endpoint'})
      const body=await readBody(req)
      const validated=validateHostedTaskInput(task,body)
      if(!validated.ok)return send(req,res,400,{error:validated.error,task})
      const sourceSnapshot={
        schemaVersion:'hosted-task-input.v1',
        task,
        capturedAt:new Date().toISOString(),
        evidenceIds:Array.isArray(body.evidenceIds)?body.evidenceIds.map(String).slice(0,100):[],
        clientMetadata:body.clientMetadata&&typeof body.clientMetadata==='object'?body.clientMetadata:{}
      }
      const submission=await handleRequestInference({
        workspaceId,
        task,
        input:validated.input,
        sourceSnapshot,
        idempotencyKey:String(req.headers['idempotency-key']||req.requestId||randomUUID()),
        actor:authenticatedUser
      })
      if(!submission.accepted){
        return send(req,res,submission.status||409,{error:submission.error,task,readiness:submission.readiness||null,prerequisites:submission.prerequisites||[]})
      }
      return send(req,res,202,{
        jobId:submission.job.id,
        status:submission.job.status,
        task,
        provider:submission.route.provider,
        requestedModel:submission.route.requestedModel,
        readiness:submission.route.readiness,
        deployment:submission.deployment||null,
        resultSchemaVersion:'ai-result.v1'
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/ai/analysis') {
      const body=await readBody(req)
      const question=String(body.question||'').trim()
      if(!question)return send(req,res,400,{error:'question required'})
      if(question.length>8000)return send(req,res,400,{error:'question exceeds 8000 characters'})
      const requestedTools=Array.isArray(body.tools)
        ?body.tools.slice(0,9)
        :[
          {name:'campaign_performance',args:{limit:20}},
          {name:'funnel_comparison',args:{limit:50}},
          {name:'customer_aggregates',args:{limit:25}},
          {name:'attribution_summary',args:{}},
          {name:'forecasts',args:{limit:20}},
          {name:'prediction_explanations',args:{limit:20}},
          {name:'anomalies',args:{limit:20}},
          {name:'experiment_results',args:{limit:20}}
        ]
      let analystTools=[]
      try{
        analystTools=await executeAnalystToolSet({workspaceId,requests:requestedTools,principal:authenticatedUser})
      }catch(error){
        return send(req,res,400,{error:error instanceof Error?error.message:'invalid analyst tool request'})
      }
      const [leadStats,attr,state]=await Promise.all([
        leadOpsStats(workspaceId).catch(()=>({available:false,total:0,averageScore:0})),
        attributionStats(workspaceId).catch(()=>({available:false,matchedEvents:0,unmatchedEvents:0,assistedEvents:0})),
        getState()
      ])
      const deliveries=state.signalDeliveries||[]
      const connectors=state.connectorConnections||[]
      const evidenceIds=[
        'lead_ops:'+workspaceId,
        'attribution:'+workspaceId,
        'connector_state:'+workspaceId,
        'signal_delivery:'+workspaceId
      ]
      const sourceSnapshot={
        schemaVersion:'workspace-analytics.v1',
        capturedAt:new Date().toISOString(),
        evidenceIds,
        leadOps:{
          available:Boolean(leadStats?.available),
          total:Number(leadStats?.total||0),
          averageScore:Number(leadStats?.averageScore||0),
          aGrade:Number(leadStats?.aGrade||0),
          abQuality:Number(leadStats?.abQuality||0)
        },
        attribution:{
          available:Boolean(attr?.available),
          matchedEvents:Number(attr?.matchedEvents||0),
          unmatchedEvents:Number(attr?.unmatchedEvents||0),
          assistedEvents:Number(attr?.assistedEvents||0)
        },
        operations:{
          connectors:connectors.length,
          connectedConnectors:connectors.filter(x=>['connected','healthy','active'].includes(String(x.status||'').toLowerCase())).length,
          signalDeliveries:deliveries.length,
          deliveryFailures:deliveries.filter(x=>['failed','dead_letter'].includes(String(x.status||'').toLowerCase())).length
        },
        analystTools
      }
      const submission=await handleRequestInference({
        workspaceId,
        task:'analyst',
        input:{
          question,
          evidence:sourceSnapshot,
          instructions:'Use only the supplied immutable workspace snapshot. Every numerical statement must be traceable to an evidence ID. Distinguish observed facts from hypotheses and do not invent forecasts.'
        },
        sourceSnapshot,
        idempotencyKey:String(req.headers['idempotency-key']||req.requestId||randomUUID()),
        actor:authenticatedUser
      })
      if(!submission.accepted){
        return send(req,res,submission.status||409,{
          error:submission.error,
          readiness:submission.readiness||null,
          prerequisites:submission.prerequisites||[]
        })
      }
      return send(req,res,202,{
        jobId:submission.job.id,
        status:submission.job.status,
        task:'analyst',
        readiness:submission.route.readiness,
        requestedModel:submission.route.requestedModel,
        resultSchemaVersion:'ai-result.v1'
      })
    }

    return false
}

