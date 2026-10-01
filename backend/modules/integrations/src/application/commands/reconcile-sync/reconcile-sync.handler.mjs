import {testCustomIntegration} from '../../../../../../src/custom-integrations.mjs'

export const handleReconcileIntegration=async({
  workspaceId,
  input,
  test=testCustomIntegration
})=>{
  const scope=String(workspaceId||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  const payload=input&&typeof input==='object'&&!Array.isArray(input)?input:{}
  if(!payload.id&&!payload.baseUrl)throw Object.assign(new Error('baseUrl or id required'),{status:400,code:'integration_target_required'})
  return test(scope,payload)
}
