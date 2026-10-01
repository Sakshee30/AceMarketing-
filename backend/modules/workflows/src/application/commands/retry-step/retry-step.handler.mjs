import {retryWorkflowExecution} from '../../../../../../src/platform/workflow-store.mjs'

export const handleRetryWorkflowExecution=async({
  workspaceId,
  executionId,
  actorId=null,
  retry=retryWorkflowExecution
})=>{
  const scope=String(workspaceId||'').trim()
  const id=String(executionId||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(!id)throw Object.assign(new Error('workflow execution id required'),{status:400,code:'workflow_execution_id_required'})
  return retry({workspaceId:scope,executionId:id,actorId})
}
