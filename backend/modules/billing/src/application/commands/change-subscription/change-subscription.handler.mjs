import {updateWorkspaceEntitlements} from '../../../../../../src/entitlements.mjs'

export const handleChangeSubscription=async({
  workspaceId,
  input,
  change=updateWorkspaceEntitlements
})=>{
  const scope=String(workspaceId||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  const payload=input&&typeof input==='object'&&!Array.isArray(input)?input:{}
  return change(scope,payload)
}
