import {processStripeEvent} from '../../../../../../src/billing-provider.mjs'

export const handleReconcilePayment=async({
  event,
  reconcile=processStripeEvent
})=>{
  if(!event||typeof event!=='object'||Array.isArray(event)){
    throw Object.assign(new Error('billing event required'),{status:400,code:'billing_event_required'})
  }
  if(!event.id||!event.type){
    throw Object.assign(new Error('billing event id and type are required'),{status:400,code:'billing_event_invalid'})
  }
  return reconcile(event)
}
