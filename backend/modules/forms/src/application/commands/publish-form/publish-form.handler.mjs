import {publishForm} from '../../../../../../src/platform/forms-store.mjs'

export const handlePublishForm=async({
  workspaceId,
  id,
  actorId=null,
  publish=publishForm
})=>{
  const scope=String(workspaceId||'').trim()
  const formId=String(id||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(!formId)throw Object.assign(new Error('form id required'),{status:400,code:'form_id_required'})
  return publish({workspaceId:scope,id:formId,actorId})
}
