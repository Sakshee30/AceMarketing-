import {enqueueJob,queueAvailable,queueStats} from '../../src/queue.mjs'

export type DurableJobInput={
  workspaceId:string
  kind:string
  payload:unknown
  idempotencyKey?:string|null
}

export const sqsJobQueueProfile=()=>({
  provider:'sqs',
  queueUrl:process.env.SQS_QUEUE_URL||null,
  configured:Boolean(process.env.SQS_QUEUE_URL),
  durableIntentAuthority:'postgres',
  synchronousProductionFallback:false
})

export const assertSqsQueueConfiguration=()=>{
  const selected=String(process.env.JOB_QUEUE_PROVIDER||'postgres').toLowerCase()
  if(selected==='sqs'&&!process.env.SQS_QUEUE_URL){
    const error=new Error('SQS is selected but SQS_QUEUE_URL is not configured') as Error & {code?:string}
    error.code='sqs_not_configured'
    throw error
  }
  return selected
}

export const enqueueDurableJob=async(input:DurableJobInput)=>{
  assertSqsQueueConfiguration()
  if(!queueAvailable()){
    const error=new Error('durable job intent store is unavailable') as Error & {code?:string}
    error.code='durable_job_store_unavailable'
    throw error
  }
  return enqueueJob(input)
}

export const durableQueueHealth=async(workspaceId:string)=>({
  ...sqsJobQueueProfile(),
  intentStoreAvailable:queueAvailable(),
  stats:await queueStats(workspaceId)
})
