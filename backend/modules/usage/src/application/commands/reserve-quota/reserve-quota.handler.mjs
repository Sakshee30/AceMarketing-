import {assertCapacity} from '../../../../../../src/entitlements.mjs'

export const handleReserveQuota=async({
  workspaceId,
  metric,
  quantity=1,
  requestId=null,
  reserve=assertCapacity
})=>{
  const scope=String(workspaceId||'').trim()
  const metricName=String(metric||'').trim()
  const amount=Math.max(1,Math.floor(Number(quantity)||1))
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(!metricName)throw Object.assign(new Error('usage metric required'),{status:400,code:'usage_metric_required'})
  return reserve(scope,metricName,amount,requestId)
}
