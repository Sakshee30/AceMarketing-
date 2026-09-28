import {api} from '../../../lib/api'

export const matchbackApi={
  load:()=>api.matchback(),
  createRule:(payload:Record<string,unknown>)=>api.createMatchbackRule(payload),
  toggleRule:(id:string,enabled:boolean)=>api.toggleMatchbackRule(id,enabled),
  reconcile:(ruleId:string)=>api.reconcileMatchback(ruleId),
  unmatched:()=>api.unmatchedMatchback()
}
