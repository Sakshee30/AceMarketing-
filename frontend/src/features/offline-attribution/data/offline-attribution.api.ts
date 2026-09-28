import {api} from '../../../lib/api'

export const offlineAttributionApi={
  load:()=>api.offlineAttribution(),
  ctwa:()=>api.ctwaAttribution(),
  createRule:(payload:Record<string,unknown>)=>api.createOfflineAttributionRule(payload),
  toggleRule:(id:string,enabled:boolean)=>api.toggleOfflineAttributionRule(id,enabled),
  testRule:(payload:Record<string,unknown>)=>api.testOfflineAttributionRule(payload)
}
