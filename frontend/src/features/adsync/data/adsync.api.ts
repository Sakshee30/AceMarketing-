import {api} from '../../../lib/api'

export const adsyncApi={
  events:()=>api.events(),
  signalDeliveries:()=>api.signalDeliveries(),
  createEventRule:(payload:Record<string,unknown>)=>api.createEventRule(payload),
  toggleEventRule:(id:string,enabled:boolean)=>api.toggleEventRule(id,enabled),
  track:(payload:Record<string,unknown>)=>api.track(payload)
}
