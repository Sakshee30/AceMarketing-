import { randomUUID } from 'node:crypto'
import { closeQueue, completeJob, failJob, leaseJobs, queueAvailable } from './queue.mjs'
import { deliverSignal } from './providers.mjs'
import { syncAudienceProvider, writebackLead } from './activation-adapters.mjs'
import { closeLeadOps, updateActivationRun, updateAudienceSyncState } from './lead-ops.mjs'
import { closeAudienceScheduler, runDueAudienceSchedules } from './audience-scheduler.mjs'
import { closeReportScheduler, deliverReport, markReportDeliveryFailure, runDueReportSchedules } from './report-scheduler.mjs'
import { dispatchAgentTransport, markMeetingReminder, updateAgentRun } from './agent-orchestrator.mjs'
import { closeStore, mutateState, withWorkspace } from './store.mjs'

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

const updateDelivery=async(workspaceId,deliveryId,patch)=>withWorkspace(workspaceId,()=>mutateState(s=>{
  const item=(s.signalDeliveries||[]).find(x=>x.id===deliveryId)
  if(item) Object.assign(item,patch,{updatedAt:new Date().toISOString()})
}))

const handle=async job=>{
  if(job.kind==='signal_delivery'){
    const signal={...(job.payload||{}),deliveryId:job.payload?.deliveryId}
    const result=await deliverSignal(job.workspace_id,signal)
    await updateDelivery(job.workspace_id,signal.deliveryId,{status:'delivered',attempts:job.attempts,httpStatus:result.status,latencyMs:result.latencyMs,lastError:null,deliveredAt:new Date().toISOString()})
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
    await updateAgentRun(job.workspace_id,agentRunId,{status:'succeeded',externalId:result.externalId,output:{provider:result.provider,status:result.status},attempts:job.attempts})
    return result
  }
  throw new Error('unsupported job kind: '+job.kind)
}

const runBatch=async()=>{
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
    try{
      const result=await handle(job)
      await completeJob(job.id,result)
    }catch(error){
      const failed=await failJob(job.id,error instanceof Error?error.message:String(error))
      const message=error instanceof Error?error.message:String(error)
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
  await Promise.allSettled([closeQueue(),closeStore(),closeLeadOps(),closeAudienceScheduler(),closeReportScheduler()])
  process.exit(0)
}
process.on('SIGTERM',()=>shutdown('SIGTERM'))
process.on('SIGINT',()=>shutdown('SIGINT'))
await loop()
