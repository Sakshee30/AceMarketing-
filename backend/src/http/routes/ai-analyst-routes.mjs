import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from '../../store.mjs'
import { attributionStats, captureClickSession, closeAttributionStore, recordAssistedEvent, reconcileAttribution } from '../../attribution-store.mjs'
import { audienceOpsStats, closeLeadOps, createActivationRun, createAudience as createLeadAudience, getAudienceBundle, getLeadProfile, leadIdentityStats, leadOpsStats, listActivationRuns, listAudiences as listLeadAudiences, listLeadProfiles, materializeAudience, overrideLeadGrade as persistLeadGrade, previewAudience as previewLeadAudience, scoreLead, upsertLeadProfile, updateAudienceSyncState } from '../../lead-ops.mjs'
import { validateHostedTaskInput } from '../../ai-input-validation.mjs'
import {analystToolNames,executeAnalystTool,executeAnalystToolSet} from '../../ai-analyst-tools.mjs'
import {handleRequestInference} from '../../../modules/ai/src/application/commands/request-inference/request-inference.handler.mjs'

export async function handleAiAnalystRoutes({req,res,url,workspaceId,readBody,send:writeResponse,authenticatedUser,isProd}) {
  const send=(...args)=>{writeResponse(...args);return true}
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
