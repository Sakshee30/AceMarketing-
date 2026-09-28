export type WorkspaceFeatureGroupId =
  | 'workspace'
  | 'tracking'
  | 'measurement'
  | 'conversion'
  | 'activation'
  | 'operations'

export type WorkspaceFeatureManifest = {
  id:string
  label:string
  group:WorkspaceFeatureGroupId
  routeId:string
  canonicalHash:string
  title:string
  breadcrumb:string
  telemetryId:string
  authRequired:true
  workspaceRequired:true
  permission:'workspace.read'
  unsavedWork:'allow'|'confirm'
  implementation:'current-composition'|'feature-chunk'
  errorBoundary:'workspace-section'
}

const groupTabs:Record<WorkspaceFeatureGroupId,readonly string[]>={
  workspace:['Overview','Launchpad'],
  tracking:['AdSync','ChatGPT Ads','Funnel','Leak Monitor','Events','Adjustments','Diagnostics','Match Quality','Reconciliation','Fraud','Deep Links','Sites','Fingerprinting','Live Sync','Data Hub','Customer 360','Offline Attribution','Matchback','POS & Stores'],
  measurement:['Journeys','Identity','Models','Attribution','Planner','Reports','Grouped Performance','Executive Briefs'],
  conversion:['Enrich','Lead Grading','Behavior','Feed','Agents','Routing','Follow-ups','Calls','Meetings','Feedback','Approvals','Ask Ace'],
  activation:['Integrations','Data Flows','Real-Time Activation','Personalization','Exclusions','Audiences','Delivery'],
  operations:['Monitoring','Alerts','Compliance','Developers','Settings']
}

const groupTitles:Record<WorkspaceFeatureGroupId,string>={
  workspace:'Workspace',
  tracking:'Tracking & Data',
  measurement:'Measurement & Intelligence',
  conversion:'Lead & Conversion',
  activation:'Activation & Integrations',
  operations:'Operations & Developer'
}

const slugify=(value:string)=>value
  .toLowerCase()
  .replace(/&/g,'and')
  .replace(/[^a-z0-9]+/g,'-')
  .replace(/^-|-$/g,'')

const longFormFeatures=new Set([
  'Launchpad',
  'Data Flows',
  'Models',
  'Planner',
  'Audiences',
  'Settings'
])

export const workspaceFeatureManifest:readonly WorkspaceFeatureManifest[]=(Object.entries(groupTabs) as [WorkspaceFeatureGroupId,readonly string[]][])
  .flatMap(([group,tabs])=>tabs.map(label=>{
    const id=slugify(label)
    return {
      id,
      label,
      group,
      routeId:'workspace.'+id,
      canonicalHash:'#/workspace?tab='+encodeURIComponent(label),
      title:label+' · AceMarketing',
      breadcrumb:groupTitles[group]+' / '+label,
      telemetryId:'workspace.'+id,
      authRequired:true as const,
      workspaceRequired:true as const,
      permission:'workspace.read' as const,
      unsavedWork:longFormFeatures.has(label)?'confirm' as const:'allow' as const,
      implementation:(label==='Approvals'?'feature-chunk':'current-composition') as WorkspaceFeatureManifest['implementation'],
      errorBoundary:'workspace-section' as const
    }
  }))

export const workspaceFeatureByLabel=new Map(workspaceFeatureManifest.map(feature=>[feature.label,feature]))
export const workspaceFeatureByRouteId=new Map(workspaceFeatureManifest.map(feature=>[feature.routeId,feature]))

export const parseWorkspaceTabFromHash=(hash:string)=>{
  if(!hash.startsWith('#/workspace'))return null
  const query=hash.split('?')[1]||''
  const requested=new URLSearchParams(query).get('tab')
  if(!requested)return null
  return workspaceFeatureByLabel.has(requested)?requested:null
}

export const assertWorkspaceFeatureManifest=()=>{
  const ids=new Set<string>()
  const routeIds=new Set<string>()
  const hashes=new Set<string>()
  for(const feature of workspaceFeatureManifest){
    if(ids.has(feature.id))throw new Error('Duplicate workspace feature id: '+feature.id)
    if(routeIds.has(feature.routeId))throw new Error('Duplicate workspace route id: '+feature.routeId)
    if(hashes.has(feature.canonicalHash))throw new Error('Duplicate workspace canonical hash: '+feature.canonicalHash)
    ids.add(feature.id)
    routeIds.add(feature.routeId)
    hashes.add(feature.canonicalHash)
  }
  return true
}
