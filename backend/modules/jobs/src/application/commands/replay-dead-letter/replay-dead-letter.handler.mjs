import {replayDeadLetterJob} from '../../../../../../src/queue.mjs'

export const handleReplayDeadLetter=async({
  workspaceId,
  jobId,
  replay=replayDeadLetterJob
})=>{
  const scope=String(workspaceId||'').trim()
  const id=String(jobId||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(!id)throw Object.assign(new Error('job id required'),{status:400,code:'job_id_required'})
  const job=await replay({workspaceId:scope,id})
  if(!job)throw Object.assign(new Error('dead-letter job not found'),{status:404,code:'dead_letter_job_not_found'})
  return job
}
