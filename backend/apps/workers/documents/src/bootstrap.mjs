export const bootstrapDocumentWorker=async()=>{
  process.env.WORKER_CLASS='ai-document'
  process.env.WORKER_RUN_SCHEDULERS='false'
  return import('../../../../src/worker.mjs')
}
