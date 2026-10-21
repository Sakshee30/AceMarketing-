import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { URL } from 'node:url'
import { getJob, queueAvailable, queueStats, requestJobCancellation } from '../../queue.mjs'
import { modelCatalogItems, modelRegistryItem, registrySummary } from '../../ai-registry.mjs'
import { closeAiRuntime, listAiResults } from '../../ai-runtime.mjs'
import { getMlCapabilities, mlServiceConfigured } from '../../ml-client.mjs'
import { closeKnowledge, ingestKnowledgeText, listKnowledgeSources, revokeKnowledgeSource } from '../../knowledge.mjs'
import { evaluateAiTaskAdmission, getAiTaskPolicy, listAiTaskPolicies, listCreativeAssets, listTranscripts, reviewCreativeAsset, saveAiTaskPolicy } from '../../ai-governance-store.mjs'
import { getSegmentMemberships, listAnomalyItems, listCausalRecords, listForecastRecords, listMarketingMixRecords, listRankingItems, listSegmentSnapshots, reviewAnomalyItem } from '../../ai-domain-results.mjs'
import {handleSubmitJob} from '../../../modules/jobs/src/application/commands/submit-job/submit-job.handler.mjs'
import {handleReplayDeadLetter} from '../../../modules/jobs/src/application/commands/replay-dead-letter/replay-dead-letter.handler.mjs'

export async function handleAiKnowledgeRoutes({req,res,url,workspaceId,readBody,send:writeResponse,authenticatedUser,isProd}) {
  const send=(...args)=>{writeResponse(...args);return true}
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

  return false
}
