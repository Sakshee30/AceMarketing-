import {createCustomIntegration} from '../../../../../../src/custom-integrations.mjs'

export const handleConnectProvider=async({
  workspaceId,
  input,
  create=createCustomIntegration
})=>{
  const scope=String(workspaceId||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  const payload=input&&typeof input==='object'&&!Array.isArray(input)?input:{}
  return create(scope,payload)
}
