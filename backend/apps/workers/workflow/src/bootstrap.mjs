export const bootstrapWorkflowWorker=async()=>{
  process.env.WORKER_CLASS='workflow'
  process.env.WORKER_RUN_SCHEDULERS='false'
  return import('../../../../src/worker.mjs')
}
