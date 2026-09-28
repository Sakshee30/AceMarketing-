import {api} from '../../../lib/api'

export const routingApi={
  load:()=>api.routing(),
  create:(payload:Record<string,unknown>)=>api.createRoutingRule(payload),
  toggle:(id:string,enabled:boolean)=>api.toggleRoutingRule(id,enabled),
  test:(ruleId:string)=>api.testRoutingRule(ruleId)
}
