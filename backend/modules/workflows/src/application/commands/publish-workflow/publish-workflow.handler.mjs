import {publishWorkflow} from '../../../../../../src/platform/workflow-store.mjs'

export const handlePublishWorkflow=async({
  workspaceId,
  id,
  publish=publishWorkflow
})=>{
  const scope=String(workspaceId||'').trim()
  const workflowId=String(id||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(!workflowId)throw Object.assign(new Error('workflow id required'),{status:400,code:'workflow_id_required'})
  return publish({workspaceId:scope,id:workflowId})
}
