export const bootstrapWebhookWorker=async()=>{
  process.env.WORKER_CLASS='webhook'
  process.env.WORKER_RUN_SCHEDULERS='false'
  return import('../../../../src/worker.mjs')
}
