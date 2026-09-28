import {api} from '../../../lib/api'

export const followUpsApi={
  load:()=>api.followUps(),
  reactivation:(dormantDays:number,recentDays:number)=>api.leadReactivation(dormantDays,recentDays),
  complete:(id:string)=>api.completeFollowUp(id),
  create:(payload:Record<string,unknown>)=>api.createFollowUp(payload),
  reactivate:(payload:Record<string,unknown>)=>api.runLeadReactivation(payload),
  journeys:()=>api.journeys()
}
