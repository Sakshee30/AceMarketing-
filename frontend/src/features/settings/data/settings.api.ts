import {api as sharedApi} from '../../../lib/api'

export const settingsApi={
  settings:()=>sharedApi.settings(),
  saveSettings:(payload:Record<string,unknown>)=>sharedApi.saveSettings(payload),
  createApiKey:(payload:{name:string})=>sharedApi.createApiKey(payload),

  members:()=>sharedApi.members(),
  inviteMember:(payload:{email:string;role:string})=>sharedApi.inviteMember(payload),
  changeMemberRole:(memberId:string,role:string)=>sharedApi.changeMemberRole(memberId,role),
  deactivateMember:(memberId:string)=>sharedApi.deactivateMember(memberId),

  consentStats:()=>sharedApi.consentStats(),
  privacyRequests:()=>sharedApi.privacyRequests(),
  privacyExport:(selectorType:string,selector:string)=>sharedApi.privacyExport(selectorType,selector),
  privacyDelete:(selectorType:string,selector:string)=>sharedApi.privacyDelete(selectorType,selector),
  privacyRetentionPurge:(dryRun=true)=>sharedApi.privacyRetentionPurge(dryRun),

  billingUsage:()=>sharedApi.billingUsage(),
  subscription:()=>sharedApi.subscription(),
  createBillingCheckout:(planCode:string)=>sharedApi.createBillingCheckout(planCode),
  createBillingPortal:()=>sharedApi.createBillingPortal()
}
