import {recordUsageLedgerEvent} from '../../../../../../src/platform/usage-ledger.mjs'

export const handleRecordUsage=async({
  workspaceId,
  eventId,
  metric,
  quantity=1,
  requestId=null,
  reservationId=null,
  source='api',
  metadata={},
  record=recordUsageLedgerEvent
})=>{
  const scope=String(workspaceId||'').trim()
  const id=String(eventId||'').trim()
  const metricName=String(metric||'').trim()
  const amount=Math.max(1,Math.floor(Number(quantity)||1))
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(!id)throw Object.assign(new Error('usage event id required'),{status:400,code:'usage_event_id_required'})
  if(!metricName)throw Object.assign(new Error('usage metric required'),{status:400,code:'usage_metric_required'})
  return record({
    workspaceId:scope,
    eventId:id,
    metric:metricName,
    quantity:amount,
    requestId,
    reservationId,
    source:String(source||'api'),
    metadata:metadata&&typeof metadata==='object'&&!Array.isArray(metadata)?metadata:{}
  })
}
