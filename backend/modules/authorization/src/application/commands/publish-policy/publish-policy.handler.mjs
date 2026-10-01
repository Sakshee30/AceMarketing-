import {publishPolicyRule} from '../../../../../../src/platform/policy-engine.mjs'

export const handlePublishPolicy=async({
  workspaceId,
  id,
  publish=publishPolicyRule
})=>{
  const scope=String(workspaceId||'').trim()
  const policyId=String(id||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(!policyId)throw Object.assign(new Error('policy rule id required'),{status:400,code:'policy_rule_id_required'})
  return publish({workspaceId:scope,id:policyId})
}
