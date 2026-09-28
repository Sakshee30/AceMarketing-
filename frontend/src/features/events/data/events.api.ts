import {api} from '../../../lib/api'

export const eventsApi={
  load:()=>api.events(),
  createRule:(payload:Record<string,unknown>)=>api.createEventRule(payload),
  toggleRule:(id:string,enabled:boolean)=>api.toggleEventRule(id,enabled)
}
