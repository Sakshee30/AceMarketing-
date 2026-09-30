import {randomUUID} from 'node:crypto'
import {closeAudienceScheduler,runDueAudienceSchedules} from './audience-scheduler.mjs'
import {closeReportScheduler,runDueReportSchedules} from './report-scheduler.mjs'
import {createDrainController} from './platform/drain-controller.mjs'

const schedulerId=process.env.SCHEDULER_ID||('scheduler_'+randomUUID())
const pollMs=Math.max(1000,Number(process.env.SCHEDULER_POLL_MS||5000))
const audienceBatch=Math.max(1,Number(process.env.AUDIENCE_SCHEDULER_BATCH_SIZE||10))
const reportBatch=Math.max(1,Number(process.env.REPORT_SCHEDULER_BATCH_SIZE||10))
const audienceEveryMs=Math.max(1000,Number(process.env.AUDIENCE_SCHEDULER_POLL_MS||15000))
const reportEveryMs=Math.max(1000,Number(process.env.REPORT_SCHEDULER_POLL_MS||30000))
const drainController=createDrainController()

let stopping=false
let lastAudiencePoll=0
let lastReportPoll=0

const runCycle=async()=>{
  const finish=drainController.beginTask()
  if(!finish)return
  try{
    const now=Date.now()
    if(now-lastAudiencePoll>=audienceEveryMs){
      lastAudiencePoll=now
      await runDueAudienceSchedules(audienceBatch)
    }
    if(now-lastReportPoll>=reportEveryMs){
      lastReportPoll=now
      await runDueReportSchedules(reportBatch)
    }
  }finally{
    finish()
  }
}

const loop=async()=>{
  console.log('AceMarketing scheduler started',{schedulerId,pollMs,audienceBatch,reportBatch})
  while(!stopping){
    try{
      await runCycle()
    }catch(error){
      console.error('[scheduler] cycle failed',error instanceof Error?error.message:error)
    }
    if(!stopping)await new Promise(resolve=>setTimeout(resolve,pollMs))
  }
}

const shutdown=async signal=>{
  if(stopping)return
  stopping=true
  drainController.beginDrain()
  const timeoutMs=Math.max(1000,Number(process.env.SCHEDULER_DRAIN_TIMEOUT_MS||10000))
  console.log(signal+' received; draining scheduler',{schedulerId,timeoutMs})
  await drainController.waitForDrain(timeoutMs)
  await Promise.allSettled([closeAudienceScheduler(),closeReportScheduler()])
}

for(const signal of ['SIGTERM','SIGINT']){
  process.on(signal,()=>{
    void shutdown(signal).finally(()=>process.exit(0))
  })
}

await loop()
