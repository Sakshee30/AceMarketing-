import { randomUUID } from 'node:crypto'
import { closeQueue, completeJob, failJob, heartbeatJob, leaseJobs, markUnknownOutcome, queueAvailable, reconcileAiUsageReservation } from './queue.mjs'
import { deliverSignal } from './providers.mjs'
import { syncAudienceProvider, writebackLead } from './activation-adapters.mjs'
import { closeLeadOps, updateActivationRun, updateAudienceSyncState } from './lead-ops.mjs'
import { closeAudienceScheduler, runDueAudienceSchedules } from './audience-scheduler.mjs'
import { closeReportScheduler, deliverReport, markReportDeliveryFailure, runDueReportSchedules } from './report-scheduler.mjs'
import { createMeeting, dispatchAgentTransport, markMeetingReminder, updateAgentRun } from './agent-orchestrator.mjs'
import { createCalendarEvent } from './calendar-provider.mjs'
import { closeStore, mutateState, withWorkspace } from './store.mjs'
import { closeAiRuntime, executeHostedAiJob } from './ai-runtime.mjs'
import { ProviderExecutionError } from './ai-providers.mjs'
import { executeMlJob } from './ml-client.mjs'
import { closeKnowledge, embedKnowledgeSourceJob, searchKnowledgeJob } from './knowledge.mjs'
import { closeRegistryStore, recordMlExecution, syncTenantRegistry } from './ai-registry-store.mjs'
import {executeAiActivationJob,reconcileStaleActivationDispatches} from './ai-activation-execution.mjs'

if(!queueAvailable()) throw new Error('DATABASE_URL is required for the worker runtime')

const workerId=process.env.WORKER_ID||('worker_'+randomUUID())
const batchSize=Number(process.env.WORKER_BATCH_SIZE||10)
const pollMs=Number(process.env.WORKER_POLL_MS||1000)
const audienceScheduleBatch=Number(process.env.AUDIENCE_SCHEDULER_BATCH_SIZE||5)
const audienceSchedulePollMs=Number(process.env.AUDIENCE_SCHEDULER_POLL_MS||15000)
const reportScheduleBatch=Number(process.env.REPORT_SCHEDULER_BATCH_SIZE||5)
const reportSchedulePollMs=Number(process.env.REPORT_SCHEDULER_POLL_MS||30000)
let lastAudienceSchedulePoll=0
let lastReportSchedulePoll=0
let stopping=false

const usageUnitsFromResult=result=>{
  const usage=result?.usage
  if(!usage||typeof usage!=='object')return null
  const candidates=[
    usage.total_tokens,usage.totalTokens,usage.totalTokenCount,
    usage.input_tokens!=null&&usage.output_tokens!=null?Number(usage.input_tokens)+Number(usage.output_tokens):null,
    usage.promptTokenCount!=null&&usage.candidatesTokenCount!=null?Number(usage.promptTokenCount)+Number(usage.candidatesTokenCount):null
  ]
  const value=candidates.map(Number).find(Number.isFinite)
  return Number.isFinite(value)?Math.max(0,value):null
}

const updateDelivery=async(workspaceId,deliveryId,patch)=>withWorkspace(workspaceId,()=>mutateState(s=>{
  const item=(s.signalDeliveries||[]).find(x=>x.id===deliveryId)
  if(item) Object.assign(item,patch,{updatedAt:new Date().toISOString()})
}))

const handle=async job=>{
  if(job.kind==='ai_activation_execution'){
    return executeAiActivationJob(job)
  }
  if(job.kind==='knowledge_embedding'){
    return embedKnowledgeSourceJob(job)
  }
  if(job.kind==='knowledge_search'){
    return searchKnowledgeJob(job)
  }
  if(job.kind==='ml_task'){
    await syncTenantRegistry(job.workspace_id)
    const result=await executeMlJob(job)
    const lifecycle=await recordMlExecution({workspaceId:job.workspace_id,job,result})
    return {...result,lifecycle}
  }
  if(job.kind==='ai_hosted_task'){
    return executeHostedAiJob(job)
  }
  if(job.kind==='signal_delivery'){
    const signal={...(job.payload||{}),deliveryId:job.payload?.deliveryId}
    const result=await deliverSignal(job.workspace_id,signal)
    await updateDelivery(job.workspace_id,signal.deliveryId,{status:'delivered',attempts:job.attempts,provider:result.provider,httpStatus:result.status,latencyMs:result.latencyMs,lastError:null,deliveredAt:new Date().toISOString(),providerResponse:result.body?{eventsReceived:result.body.events_received??null,requestId:result.body.fbtrace_id||result.body.requestId||null}:null})
    return {provider:result.provider,httpStatus:result.status,latencyMs:result.latencyMs}
  }
  if(job.kind==='audience_sync'){
    const {audienceId,provider,activationRunId}=job.payload||{}
    await updateActivationRun(job.workspace_id,activationRunId,{status:'running',attempts:job.attempts})
    await updateAudienceSyncState(job.workspace_id,audienceId,String(provider).toLowerCase(),{status:'running'})
    const result=await syncAudienceProvider(job.workspace_id,audienceId,provider)
    await updateActivationRun(job.workspace_id,activationRunId,{status:'succeeded',externalId:result.externalId,responseSummary:{received:result.received||0,job:result.job||null},attempts:job.attempts})
    await updateAudienceSyncState(job.workspace_id,audienceId,String(provider).toLowerCase(),{status:'succeeded',externalId:result.externalId,received:result.received||0})
    return result
  }
  if(job.kind==='report_delivery'){
    const {scheduleId,deliveryId}=job.payload||{}
    return deliverReport(job.workspace_id,{scheduleId,deliveryId,attempts:job.attempts})
  }
  if(job.kind==='crm_writeback'){
    const {leadRef,provider,fields,activationRunId}=job.payload||{}
    await updateActivationRun(job.workspace_id,activationRunId,{status:'running',attempts:job.attempts})
    const result=await writebackLead(job.workspace_id,leadRef,provider,fields||{})
    await updateActivationRun(job.workspace_id,activationRunId,{status:'succeeded',externalId:result.externalId,responseSummary:{status:result.status},attempts:job.attempts})
    return result
  }
  if(job.kind==='agent_action'){
    const {agentRunId,actionType,payload}=job.payload||{}
    await updateAgentRun(job.workspace_id,agentRunId,{status:'running',attempts:job.attempts})
    const result=await dispatchAgentTransport(actionType,payload||{})
    if(actionType==='meeting_reminder'&&payload?.meetingId) await markMeetingReminder(job.workspace_id,payload.meetingId)
    let schedulerMeeting=null
    let calendar=null
    if(actionType==='voice_scheduler'){
      const confirmedStartsAt=result.response?.startsAt||result.response?.confirmedStartsAt||null
      if(confirmedStartsAt){
        const attendeeEmail=result.response?.attendeeEmail||payload?.attendeeEmail||''
        const attendeePhone=result.response?.attendeePhone||payload?.phone||payload?.attendeePhone||''
        const leadRef=payload?.leadRef||payload?.lead||payload?.customerId||'voice_scheduler_lead'
        if(payload?.syncCalendar!==false){
          try{
            calendar=await createCalendarEvent(job.workspace_id,{
              leadRef,
              startsAt:confirmedStartsAt,
              durationMinutes:Number(result.response?.durationMinutes||payload?.durationMinutes||45),
              title:result.response?.title||payload?.title||('Consultation · '+String(leadRef)),
              attendees:attendeeEmail?[attendeeEmail]:[]
            })
          }catch(error){
            if(payload?.requireCalendar===true) throw error
          }
        }
        schedulerMeeting=await createMeeting(job.workspace_id,{
          leadRef,
          startsAt:confirmedStartsAt,
          owner:result.response?.owner||payload?.owner||'Voice Scheduler',
          attendeeEmail,
          attendeePhone,
          status:'confirmed',
          reminderPlan:['24h','3h','30m'],
          externalCalendarId:calendar?.externalId||'',
          meetingLink:calendar?.meetingLink||result.response?.meetingLink||'',
          calendarHtmlLink:calendar?.htmlLink||'',
          risk:'low'
        })
      }
    }
    const output={provider:result.provider,status:result.status,...(schedulerMeeting?{meetingId:schedulerMeeting.id,startsAt:schedulerMeeting.starts_at,meetingLink:schedulerMeeting.meeting_link||null,calendarSynced:Boolean(calendar?.externalId)}:{schedulerStatus:actionType==='voice_scheduler'?'provider_accepted_no_confirmed_time':undefined})}
    await updateAgentRun(job.workspace_id,agentRunId,{status:'succeeded',externalId:result.externalId,output,attempts:job.attempts})
    return {...result,...(schedulerMeeting?{meeting:schedulerMeeting,calendar}: {})}
  }
  throw new Error('unsupported job kind: '+job.kind)
}

const runBatch=async()=>{
  await reconcileStaleActivationDispatches({limit:25})
  if(Date.now()-lastAudienceSchedulePoll>=audienceSchedulePollMs){
    lastAudienceSchedulePoll=Date.now()
    await runDueAudienceSchedules(audienceScheduleBatch)
  }
  if(Date.now()-lastReportSchedulePoll>=reportSchedulePollMs){
    lastReportSchedulePoll=Date.now()
    await runDueReportSchedules(reportScheduleBatch)
  }
  const jobs=await leaseJobs({workerId,limit:batchSize})
  for(const job of jobs){
    let heartbeatTimer=null
    try{
      const heartbeatEvery=Math.max(1000,Math.floor(Number(process.env.WORKER_LEASE_MS||60000)/3))
      heartbeatTimer=setInterval(()=>{
        void heartbeatJob({
          id:job.id,
          workerId,
          fencingToken:job.fencing_token,
          extendMs:Number(process.env.WORKER_LEASE_MS||60000)
        }).catch(error=>console.error('[worker] heartbeat failed',job.id,error instanceof Error?error.message:error))
      },heartbeatEvery)
      heartbeatTimer.unref?.()
      const result=await handle(job)
      await completeJob(job.id,result,{
        workerId,
        fencingToken:job.fencing_token,
        externalRequestId:result?.providerRequestId||null,
        resultSchemaVersion:job.result_schema_version||null,
        actualUnits:usageUnitsFromResult(result)
      })
    }catch(error){
      if(error instanceof ProviderExecutionError&&error.unknownOutcome){
        await markUnknownOutcome({
          id:job.id,
          workerId,
          fencingToken:job.fencing_token,
          externalRequestId:error.providerRequestId||null,
          errorMessage:error.message
        }).catch(()=>{})
        if(['ai_hosted_task','ml_task'].includes(job.kind)){
          await reconcileAiUsageReservation({workspaceId:job.workspace_id,jobId:job.id,actualUnits:null,status:'unknown'}).catch(()=>{})
        }
        continue
      }
      const failed=await failJob(job.id,error instanceof Error?error.message:String(error),{workerId,fencingToken:job.fencing_token})
      const message=error instanceof Error?error.message:String(error)
      if(failed?.status==='dead_letter'&&['ai_hosted_task','ml_task'].includes(job.kind)){
        await reconcileAiUsageReservation({workspaceId:job.workspace_id,jobId:job.id,actualUnits:null,status:'released'}).catch(()=>{})
      }
      if(job.payload?.deliveryId){
        await updateDelivery(job.workspace_id,job.payload.deliveryId,{status:failed?.status==='dead_letter'?'dead_letter':'retrying',attempts:job.attempts,lastError:message,nextAttemptAt:failed?.available_at||null}).catch(()=>{})
      }
      if(job.kind==='audience_sync'&&job.payload?.activationRunId){
        const state=failed?.status==='dead_letter'?'failed':'retrying'
        await updateActivationRun(job.workspace_id,job.payload.activationRunId,{status:state,error:message,attempts:job.attempts}).catch(()=>{})
        await updateAudienceSyncState(job.workspace_id,job.payload.audienceId,String(job.payload.provider).toLowerCase(),{status:state==='failed'?'failed':'retrying',error:message}).catch(()=>{})
      }
      if(job.kind==='agent_action'&&job.payload?.agentRunId){
        await updateAgentRun(job.workspace_id,job.payload.agentRunId,{status:failed?.status==='dead_letter'?'failed':'retrying',error:message,attempts:job.attempts}).catch(()=>{})
      }
      if(job.kind==='report_delivery'&&job.payload?.deliveryId){
        await markReportDeliveryFailure(job.workspace_id,job.payload.deliveryId,job.payload.scheduleId,failed?.status==='dead_letter'?'failed':'retrying',message,job.attempts).catch(()=>{})
      }
      if(job.kind==='crm_writeback'&&job.payload?.activationRunId){
        await updateActivationRun(job.workspace_id,job.payload.activationRunId,{status:failed?.status==='dead_letter'?'failed':'retrying',error:message,attempts:job.attempts}).catch(()=>{})
      }
    }finally{
      if(heartbeatTimer)clearInterval(heartbeatTimer)
    }
  }
}

const loop=async()=>{
  console.log(`AceMarketing worker ${workerId} started`)
  while(!stopping){
    try{
      await runBatch()
    }catch(error){
      console.error('worker batch failed',error)
    }
    if(!stopping) await new Promise(resolve=>setTimeout(resolve,pollMs))
  }
}

const shutdown=async signal=>{
  if(stopping) return
  stopping=true
  console.log(`${signal} received; stopping worker`)
  await Promise.allSettled([closeQueue(),closeAiRuntime(),closeKnowledge(),closeRegistryStore(),closeStore(),closeLeadOps(),closeAudienceScheduler(),closeReportScheduler()])
  process.exit(0)
}
process.on('SIGTERM',()=>shutdown('SIGTERM'))
process.on('SIGINT',()=>shutdown('SIGINT'))
await loop()
