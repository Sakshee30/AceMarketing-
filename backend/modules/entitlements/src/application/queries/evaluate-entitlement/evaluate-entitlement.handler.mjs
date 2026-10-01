import {subscriptionSummary} from '../../../../../../src/entitlements.mjs'

export const handleEvaluateEntitlement=async({
  workspaceId,
  summarize=subscriptionSummary
})=>{
  const scope=String(workspaceId||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  return summarize(scope)
}
