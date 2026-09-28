import {api as sharedApi} from '../../../lib/api'

export const complianceApi={
  center:()=>sharedApi.complianceCenter(),
  privacyExport:(selectorType:string,selector:string)=>sharedApi.privacyExport(selectorType,selector),
  privacyDelete:(selectorType:string,selector:string)=>sharedApi.privacyDelete(selectorType,selector),
  privacyRetentionPurge:(dryRun=true)=>sharedApi.privacyRetentionPurge(dryRun)
}
