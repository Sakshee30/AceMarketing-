export const bootstrapGeneralWorker=async()=>{
  process.env.WORKER_CLASS='general'
  process.env.WORKER_RUN_SCHEDULERS='false'
  return import('../../../../src/worker.mjs')
}
