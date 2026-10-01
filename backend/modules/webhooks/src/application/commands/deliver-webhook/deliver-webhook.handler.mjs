import {dispatchWebhookDelivery} from '../../../../../../src/platform/webhook-delivery-worker.mjs'

export const handleDeliverWebhook=async({
  workspaceId,
  deliveryId,
  dispatch=dispatchWebhookDelivery
})=>{
  const scope=String(workspaceId||'').trim()
  const id=String(deliveryId||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(!id)throw Object.assign(new Error('webhook delivery id required'),{status:400,code:'webhook_delivery_id_required'})
  return dispatch({workspaceId:scope,deliveryId:id})
}
