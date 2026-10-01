import {submitForm} from '../../../../../../src/platform/forms-store.mjs'

export const handleSubmitForm=async({
  workspaceId,
  id,
  data,
  actorId=null,
  submissionId=null,
  submit=submitForm
})=>{
  const scope=String(workspaceId||'').trim()
  const formId=String(id||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(!formId)throw Object.assign(new Error('form id required'),{status:400,code:'form_id_required'})
  return submit({
    workspaceId:scope,
    id:formId,
    data,
    actorId,
    submissionId:submissionId==null?null:String(submissionId)
  })
}
