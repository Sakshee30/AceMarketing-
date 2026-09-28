import {api as sharedApi} from '../../../lib/api'
export const personalizationApi={
  personalizationRules:()=>sharedApi.personalizationRules(),
  createPersonalizationRule:(payload:Record<string,unknown>)=>sharedApi.createPersonalizationRule(payload),
  togglePersonalizationRule:(id:string,enabled:boolean)=>sharedApi.togglePersonalizationRule(id,enabled),
  decidePersonalization:(payload:Record<string,unknown>)=>sharedApi.decidePersonalization(payload),
  personalizationFeedback:(payload:Record<string,unknown>)=>sharedApi.personalizationFeedback(payload)
}
