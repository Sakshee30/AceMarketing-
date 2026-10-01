import {mutateState} from '../../../../../../src/store.mjs'

export const workspaceSettingKeys=Object.freeze([
  'organization','timezone','currency','reportingWeek','defaultAttribution','environment','primaryDomain',
  'crossDomainTracking','gclidPersistenceDays','fbclidPersistenceDays','notifyDeliveryFailures',
  'notifyTokenExpiry','notifyAudienceStale','notifyDailySummary','notificationEmail','notificationSlack',
  'approvalSignalReturn','approvalCrmEnrichment','approvalLeadQualification','approvalAudienceSuppression',
  'approvalCustomIntegration'
])

export const normalizeWorkspaceSettingsPatch=input=>{
  const source=input&&typeof input==='object'&&!Array.isArray(input)?input:{}
  const patch={}
  for(const key of workspaceSettingKeys)if(source[key]!==undefined)patch[key]=source[key]
  if(!Object.keys(patch).length){
    throw Object.assign(new Error('no supported settings provided'),{status:400,code:'workspace_settings_empty'})
  }
  return patch
}

export const handleUpdateWorkspace=async({
  workspaceId,
  patch,
  actorId=null,
  mutate=mutateState,
  now=()=>new Date().toISOString()
})=>{
  const scope=String(workspaceId||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  const normalized=normalizeWorkspaceSettingsPatch(patch)
  const at=now()
  let saved={}
  await mutate(state=>{
    state.workspaceSettings={...(state.workspaceSettings||{}),...normalized,updatedAt:at}
    saved={...state.workspaceSettings}
    state.audit=state.audit||[]
    state.audit.unshift({
      id:'workspace_settings_'+at,
      action:'workspace.settings_updated',
      entityId:scope,
      actorId,
      fields:Object.keys(normalized),
      at
    })
    state.audit=state.audit.slice(0,1000)
  })
  return saved
}
