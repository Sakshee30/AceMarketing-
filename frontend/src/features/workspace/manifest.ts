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
  permission:'workspace.read'|'boards.read'
  unsavedWork:'allow'|'confirm'
  implementation:'current-composition'|'feature-chunk'
  errorBoundary:'workspace-section'
}

const groupTabs:Record<WorkspaceFeatureGroupId,readonly string[]>={
  workspace:['Overview','Launchpad','Boards'],
  tracking:['AdSync','ChatGPT Ads','Funnel','Leak Monitor','Events','Adjustments','Diagnostics','Match Quality','Reconciliation','Fraud','Deep Links','Sites','Fingerprinting','Live Sync','Data Hub','Customer 360','Offline Attribution','Matchback','POS & Stores'],
  measurement:['Journeys','Identity','Models','AI Intelligence','Attribution','Planner','Reports','Grouped Performance','Executive Briefs'],
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
  'AdSync',
  'ChatGPT Ads',
  'Funnel',
  'Leak Monitor',
  'Events',
  'Deep Links',
  'Sites',
  'Fingerprinting',
  'Live Sync',
  'Data Hub',
  'Matchback',
  'POS & Stores',
  'Journeys',
  'Identity',
  'Attribution',
  'Grouped Performance',
  'Enrich',
  'Lead Grading',
  'Behavior',
  'Data Flows',
  'Models',
  'AI Intelligence',
  'Planner',
  'Audiences',
  'Settings',
  'Executive Briefs',
  'Integrations',
  'Developers',
  'Real-Time Activation',
  'Personalization',
  'Adjustments'
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
      permission:(label==='Boards'?'boards.read':'workspace.read') as WorkspaceFeatureManifest['permission'],
      unsavedWork:longFormFeatures.has(label)?'confirm' as const:'allow' as const,
      implementation:((label==='Launchpad'||label==='Overview'||label==='Boards'||label==='AdSync'||label==='ChatGPT Ads'||label==='Funnel'||label==='Leak Monitor'||label==='Events'||label==='Deep Links'||label==='Sites'||label==='Fingerprinting'||label==='Live Sync'||label==='Data Hub'||label==='Matchback'||label==='POS & Stores'||label==='Journeys'||label==='Identity'||label==='Attribution'||label==='Grouped Performance'||label==='Enrich'||label==='Lead Grading'||label==='Behavior'||label==='Approvals'||label==='Monitoring'||label==='Alerts'||label==='Reports'||label==='Executive Briefs'||label==='Integrations'||label==='Data Flows'||label==='Audiences'||label==='Planner'||label==='Models'||label==='AI Intelligence'||label==='Settings'||label==='Compliance'||label==='Developers'||label==='Delivery'||label==='Real-Time Activation'||label==='Personalization'||label==='Exclusions'||label==='Adjustments'||label==='Diagnostics'||label==='Match Quality'||label==='Reconciliation'||label==='Fraud')?'feature-chunk':'current-composition') as WorkspaceFeatureManifest['implementation'],
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


export const parseWorkspaceIdFromHash=(hash:string)=>{
  if(!hash.startsWith('#/workspace'))return null
  const query=hash.split('?')[1]||''
  const value=new URLSearchParams(query).get('workspace')
  return value&&value.trim()?value.trim():null
}

export const buildWorkspaceHash=(label:string,workspaceId?:string|null)=>{
  const feature=workspaceFeatureByLabel.get(label)
  if(!feature)return '#/workspace'
  const params=new URLSearchParams()
  params.set('tab',feature.label)
  if(workspaceId)params.set('workspace',workspaceId)
  return '#/workspace?'+params.toString()
}
