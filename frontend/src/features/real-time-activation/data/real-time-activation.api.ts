import {api as sharedApi} from '../../../lib/api'
export const realTimeActivationApi={
  activationRules:()=>sharedApi.activationRules(),
  createActivationRule:(payload:Record<string,unknown>)=>sharedApi.createActivationRule(payload),
  toggleActivationRule:(id:string,enabled:boolean)=>sharedApi.toggleActivationRule(id,enabled),
  testActivationRule:(id:string,event:Record<string,unknown>)=>sharedApi.testActivationRule(id,event)
}
