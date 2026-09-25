import { randomUUID } from 'node:crypto'
import { closeQueue, completeJob, failJob, leaseJobs, queueAvailable } from './queue.mjs'
import { deliverSignal } from './providers.mjs'
import { closeStore, mutateState, withWorkspace } from './store.mjs'

if(!queueAvailable()) throw new Error('DATABASE_URL is required for the worker runtime')

const workerId=process.env.WORKER_ID||('worker_'+randomUUID())
const batchSize=Number(process.env.WORKER_BATCH_SIZE||10)
const pollMs=Number(process.env.WORKER_POLL_MS||1000)
let stopping=false

const updateDelivery=async(workspaceId,deliveryId,patch)=>withWorkspace(workspaceId,()=>mutateState(s=>{
  const item=(s.signalDeliveries||[]).find(x=>x.id===deliveryId)
  if(item) Object.assign(item,patch,{updatedAt:new Date().toISOString()})
}))

const handle=async job=>{
  if(job.kind!=='signal_delivery') throw new Error('unsupported job kind: '+job.kind)
  const signal={...(job.payload||{}),deliveryId:job.payload?.deliveryId}
  const result=await deliverSignal(job.workspace_id,signal)
  await updateDelivery(job.workspace_id,signal.deliveryId,{
    status:'delivered',
    attempts:job.attempts,
    httpStatus:result.status,
    latencyMs:result.latencyMs,
    lastError:null,
    deliveredAt:new Date().toISOString()
  })
  return {provider:result.provider,httpStatus:result.status,latencyMs:result.latencyMs}
}

const runBatch=async()=>{
  const jobs=await leaseJobs({workerId,limit:batchSize})
  for(const job of jobs){
    try{
      const result=await handle(job)
      await completeJob(job.id,result)
    }catch(error){
      const failed=await failJob(job.id,error instanceof Error?error.message:String(error))
      if(job.payload?.deliveryId){
        await updateDelivery(job.workspace_id,job.payload.deliveryId,{
          status:failed?.status==='dead_letter'?'dead_letter':'retrying',
          attempts:job.attempts,
          lastError:error instanceof Error?error.message:String(error),
          nextAttemptAt:failed?.available_at||null
        }).catch(()=>{})
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
  await Promise.allSettled([closeQueue(),closeStore()])
  process.exit(0)
}
process.on('SIGTERM',()=>shutdown('SIGTERM'))
process.on('SIGINT',()=>shutdown('SIGINT'))
await loop()
