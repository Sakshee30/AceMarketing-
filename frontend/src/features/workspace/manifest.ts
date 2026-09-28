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
  authRequired:true
  workspaceRequired:true
  unsavedWork:'allow'|'confirm'
  releaseBoundary:'current-composition'
}

const groupTabs:Record<WorkspaceFeatureGroupId,readonly string[]>={
  workspace:['Overview','Launchpad'],
  tracking:['AdSync','ChatGPT Ads','Funnel','Leak Monitor','Events','Adjustments','Diagnostics','Match Quality','Reconciliation','Fraud','Deep Links','Sites','Fingerprinting','Live Sync','Data Hub','Customer 360','Offline Attribution','Matchback','POS & Stores'],
  measurement:['Journeys','Identity','Models','Attribution','Planner','Reports','Grouped Performance','Executive Briefs'],
  conversion:['Enrich','Lead Grading','Behavior','Feed','Agents','Routing','Follow-ups','Calls','Meetings','Feedback','Approvals','Ask Ace'],
  activation:['Integrations','Data Flows','Real-Time Activation','Personalization','Exclusions','Audiences','Delivery'],
  operations:['Monitoring','Alerts','Compliance','Developers','Settings']
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

export const workspaceFeatureManifest:readonly WorkspaceFeatureManifest[]=(
  Object.entries(groupTabs) as [WorkspaceFeatureGroupId,readonly string[]][]
).flatMap(([group,tabs])=>tabs.map(label=>({
  id:slugify(label),
  label,
  group,
  routeId:'workspace.'+slugify(label),
  authRequired:true as const,
  workspaceRequired:true as const,
  unsavedWork:longFormFeatures.has(label)?'confirm' as const:'allow' as const,
  releaseBoundary:'current-composition' as const
})))

export const workspaceFeatureByLabel=new Map(
  workspaceFeatureManifest.map(feature=>[feature.label,feature])
)

export const assertWorkspaceFeatureManifest=()=>{
  const ids=new Set<string>()
  const routeIds=new Set<string>()
  for(const feature of workspaceFeatureManifest){
    if(ids.has(feature.id))throw new Error('Duplicate workspace feature id: '+feature.id)
    if(routeIds.has(feature.routeId))throw new Error('Duplicate workspace route id: '+feature.routeId)
    ids.add(feature.id)
    routeIds.add(feature.routeId)
  }
  return true
}
