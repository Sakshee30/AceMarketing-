import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const frontend=path.join(root,'frontend','src')
const forbiddenImportPatterns=[
  /from\s+['"][^'"]*backend\//,
  /from\s+['"](?:node:)?(?:fs|child_process|cluster|net|tls|worker_threads)['"]/,
  /from\s+['"]pg['"]/,
  /from\s+['"]@aws-sdk\//
]
const forbiddenCredentialPatterns=[
  /AWS_SECRET_ACCESS_KEY/,
  /DATABASE_URL/,
  /CONNECTOR_ENCRYPTION_KEY/,
  /BEGIN PRIVATE KEY/
]

const walk=(dir)=>{
  const out=[]
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name)
    if(entry.isDirectory())out.push(...walk(full))
    else if(/\.(ts|tsx|js|jsx)$/.test(entry.name))out.push(full)
  }
  return out
}

const failures=[]
for(const file of walk(frontend)){
  const content=fs.readFileSync(file,'utf8')
  for(const pattern of forbiddenImportPatterns){
    if(pattern.test(content))failures.push(path.relative(root,file)+': forbidden server/backend import '+pattern)
  }
  for(const pattern of forbiddenCredentialPatterns){
    if(pattern.test(content))failures.push(path.relative(root,file)+': credential/server secret pattern found '+pattern)
  }
}

const acePlatform=path.join(frontend,'AcePlatform.tsx')
if(fs.existsSync(acePlatform)){
  const source=fs.readFileSync(acePlatform,'utf8')
  if(/function\s+Customer360\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Customer 360 implementation after feature extraction.')
  }
  if(/function\s+OfflineAttribution\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Offline Attribution implementation after feature extraction.')
  }
  if(/function\s+Agents\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Agents implementation after feature extraction.')
  }
  if(/function\s+Feed\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Feed implementation after feature extraction.')
  }
  if(/function\s+Behavior\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Behavior implementation after feature extraction.')
  }
  if(/function\s+LeadGrading\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Lead Grading implementation after feature extraction.')
  }
  if(/function\s+Enrich\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Enrich implementation after feature extraction.')
  }
  if(/function\s+GroupedPerformance\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Grouped Performance implementation after feature extraction.')
  }
  if(/function\s+Attribution\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Attribution implementation after feature extraction.')
  }
  if(/function\s+Identity\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Identity implementation after feature extraction.')
  }
  if(/function\s+Journeys\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Journeys implementation after feature extraction.')
  }
  if(/function\s+POSAndStores\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy POS & Stores implementation after feature extraction.')
  }
  if(/function\s+Matchback\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Matchback implementation after feature extraction.')
  }
  if(/function\s+DataHub\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Data Hub implementation after feature extraction.')
  }
  if(/function\s+LiveSync\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Live Sync implementation after feature extraction.')
  }
  if(/function\s+Fingerprinting\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Fingerprinting implementation after feature extraction.')
  }
  if(/function\s+Sites\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Sites implementation after feature extraction.')
  }
  if(/function\s+DeepLinks\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Deep Links implementation after feature extraction.')
  }
  if(/function\s+Events\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Events implementation after feature extraction.')
  }
  if(/function\s+LeakMonitor\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Leak Monitor implementation after feature extraction.')
  }
  if(/function\s+Funnel\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Funnel implementation after feature extraction.')
  }
  if(/function\s+ChatGPTAds\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy ChatGPT Ads implementation after feature extraction.')
  }
  if(/function\s+AdSync\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy AdSync implementation after feature extraction.')
  }
  if(/function\s+Overview\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Overview implementation after feature extraction.')
  }
  if(/function\s+FunnelPanel\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Overview FunnelPanel implementation after feature extraction.')
  }
  if(/function\s+Launchpad\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Launchpad implementation after feature extraction.')
  }
  if(/function\s+Approvals\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Approvals implementation after feature extraction.')
  }
  if(/function\s+Monitoring\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Monitoring implementation after feature extraction.')
  }
  if(/function\s+Alerts\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Alerts implementation after feature extraction.')
  }
  if(/function\s+Reports\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Reports implementation after feature extraction.')
  }
  if(/function\s+ExecutiveBriefs\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy ExecutiveBriefs implementation after feature extraction.')
  }
  if(/function\s+Integrations\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Integrations implementation after feature extraction.')
  }
  if(/function\s+DataFlows\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy DataFlows implementation after feature extraction.')
  }
  if(/function\s+Audiences\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Audiences implementation after feature extraction.')
  }
  if(/function\s+Planner\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Planner implementation after feature extraction.')
  }
  if(/function\s+Models\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Models implementation after feature extraction.')
  }
  if(/function\s+Compliance\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Compliance implementation after feature extraction.')
  }
  if(/function\s+Developers\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Developers implementation after feature extraction.')
  }
  if(/function\s+DeliveryCenter\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy DeliveryCenter implementation after feature extraction.')
  }
  for(const legacyName of ['MatchQuality','Reconciliation','Fraud']){
    if(new RegExp('function\\s+'+legacyName+'\\s*\\(').test(source)){
      failures.push('frontend/src/AcePlatform.tsx still contains the legacy '+legacyName+' implementation after feature extraction.')
    }
  }
  for(const legacyName of ['Adjustments','Diagnostics']){
    if(new RegExp('function\\s+'+legacyName+'\\s*\\(').test(source)){
      failures.push('frontend/src/AcePlatform.tsx still contains the legacy '+legacyName+' implementation after feature extraction.')
    }
  }
  for(const legacyName of ['RealTimeActivation','Personalization','Exclusions']){
    if(new RegExp('function\\s+'+legacyName+'\\s*\\(').test(source)){
      failures.push('frontend/src/AcePlatform.tsx still contains the legacy '+legacyName+' implementation after feature extraction.')
    }
  }
  for(const legacyName of ['Settings','UsersRolesSettings','GovernanceSettings','BillingUsageSettings']){
    if(new RegExp('function\\s+'+legacyName+'\\s*\\(').test(source)){
      failures.push('frontend/src/AcePlatform.tsx still contains the legacy '+legacyName+' implementation after Settings feature extraction.')
    }
  }
  const customer360=source.match(/function\\s+Customer360\\s*\\(\\)[\\s\\S]*?function\\s+OfflineAttribution\\s*\\(/)?.[0]||''
  if(customer360&&!customer360.includes('requestSequence=useRef(0)')){
    failures.push('Customer 360 must sequence profile requests so stale responses cannot replace the active selection.')
  }
  if(customer360&&!customer360.includes('.slice(0,150)')){
    failures.push('Customer 360 timeline rendering must remain bounded for long-lived customer profiles.')
  }
  const offlineAttribution=source.match(/function\\s+OfflineAttribution\\s*\\(\\)[\\s\\S]*?function\\s+Matchback\\s*\\(/)?.[0]||''
  if(offlineAttribution&&!offlineAttribution.includes('AccessibleDialog ariaLabel="New offline attribution rule"')){
    failures.push('Offline Attribution builder must use the shared accessible dialog.')
  }
  if(offlineAttribution&&!offlineAttribution.includes("offline-attribution-rule-draft")){
    failures.push('Offline Attribution builder must participate in dirty-work protection.')
  }
  if(offlineAttribution&&!offlineAttribution.includes("kind:'unknown'")){
    failures.push('Offline Attribution writes must preserve an explicit unknown-outcome state.')
  }

  const customer360Path=path.join(frontend,'features','customer-360','pages','Customer360Page.tsx')
  if(fs.existsSync(customer360Path)){
    const customer360=fs.readFileSync(customer360Path,'utf8')
    if(!customer360.includes('requestSequence=useRef(0)')){
      failures.push('Customer 360 must sequence profile requests so stale responses cannot replace the active selection.')
    }
    if(!customer360.includes('.slice(0,150)')||!customer360.includes('.slice(0,200)')){
      failures.push('Customer 360 timeline and directory rendering must remain bounded for long-lived workspaces.')
    }
  }
  const offlineAttributionPath=path.join(frontend,'features','offline-attribution','pages','OfflineAttributionPage.tsx')
  if(fs.existsSync(offlineAttributionPath)){
    const offlineAttribution=fs.readFileSync(offlineAttributionPath,'utf8')
    if(!offlineAttribution.includes('AccessibleDialog ariaLabel="New offline attribution rule"')){
      failures.push('Offline Attribution builder must use the shared accessible dialog.')
    }
    if(!offlineAttribution.includes("offline-attribution-rule-draft")){
      failures.push('Offline Attribution builder must participate in dirty-work protection.')
    }
    if(!offlineAttribution.includes("kind:'unknown'")){
      failures.push('Offline Attribution writes must preserve an explicit unknown-outcome state.')
    }
  }

  const feedPath=path.join(frontend,'features','feed','pages','FeedPage.tsx')
  if(fs.existsSync(feedPath)){
    const feed=fs.readFileSync(feedPath,'utf8')
    if(!feed.includes('AccessibleDialog ariaLabel="Add feed attribute"')||!feed.includes('AccessibleDialog ariaLabel="New feed mapping"')){
      failures.push('Feed mutation builders must use the shared accessible dialog boundary.')
    }
    if(!feed.includes("feed-attribute-draft")||!feed.includes("feed-mapping-draft")){
      failures.push('Feed builders must participate in dirty-work protection.')
    }
    if(!feed.includes("kind:'unknown'")){
      failures.push('Feed writes must preserve explicit unknown-outcome handling for timeout/network ambiguity.')
    }
  }

  const agentsPath=path.join(frontend,'features','agents','pages','AgentsPage.tsx')
  if(fs.existsSync(agentsPath)){
    const agents=fs.readFileSync(agentsPath,'utf8')
    if(!agents.includes('AccessibleDialog ariaLabel="Custom Agent Builder"')||!agents.includes('AccessibleDialog ariaLabel="Test custom agent"')){
      failures.push('Agents mutation surfaces must use the shared accessible dialog boundary.')
    }
    if(!agents.includes("custom-agent-draft")||!agents.includes("custom-agent-test-draft")){
      failures.push('Agents builder and test surfaces must participate in dirty-work protection.')
    }
    if(!agents.includes("kind:'unknown'")){
      failures.push('Agents writes must preserve explicit unknown-outcome handling for timeout/network ambiguity.')
    }
  }

  const bytes=fs.statSync(acePlatform).size
  if(bytes>600_000){
    failures.push('frontend/src/AcePlatform.tsx exceeds the temporary 600 KB migration ceiling. Extract features before adding more monolithic code.')
  }else if(bytes>500_000){
    console.warn('[frontend-architecture] AcePlatform.tsx remains above 500 KB; feature extraction is still required before frontend completion.')
  }
}

const required=[
  'frontend/src/features/customer-360/data/customer-360.api.ts',
  'frontend/src/features/customer-360/pages/Customer360Page.tsx',
  'frontend/src/features/customer-360/public.ts',
  'frontend/src/features/customer-360/feature.manifest.ts',
  'frontend/src/features/offline-attribution/data/offline-attribution.api.ts',
  'frontend/src/features/offline-attribution/pages/OfflineAttributionPage.tsx',
  'frontend/src/features/offline-attribution/public.ts',
  'frontend/src/features/offline-attribution/feature.manifest.ts',
  'frontend/src/features/agents/data/agents.api.ts',
  'frontend/src/features/agents/pages/AgentsPage.tsx',
  'frontend/src/features/agents/public.ts',
  'frontend/src/features/agents/feature.manifest.ts',
  'frontend/src/features/feed/data/feed.api.ts',
  'frontend/src/features/feed/pages/FeedPage.tsx',
  'frontend/src/features/feed/public.ts',
  'frontend/src/features/feed/feature.manifest.ts',
  'frontend/src/features/behavior/data/behavior.api.ts',
  'frontend/src/features/behavior/pages/BehaviorPage.tsx',
  'frontend/src/features/behavior/public.ts',
  'frontend/src/features/behavior/feature.manifest.ts',
  'frontend/src/features/lead-grading/data/lead-grading.api.ts',
  'frontend/src/features/lead-grading/pages/LeadGradingPage.tsx',
  'frontend/src/features/lead-grading/public.ts',
  'frontend/src/features/lead-grading/feature.manifest.ts',
  'frontend/src/features/enrich/data/enrich.api.ts',
  'frontend/src/features/enrich/pages/EnrichPage.tsx',
  'frontend/src/features/enrich/public.ts',
  'frontend/src/features/enrich/feature.manifest.ts',
  'frontend/src/features/grouped-performance/data/grouped-performance.api.ts',
  'frontend/src/features/grouped-performance/pages/GroupedPerformancePage.tsx',
  'frontend/src/features/grouped-performance/public.ts',
  'frontend/src/features/grouped-performance/feature.manifest.ts',
  'frontend/src/features/attribution/data/attribution.api.ts',
  'frontend/src/features/attribution/pages/AttributionPage.tsx',
  'frontend/src/features/attribution/public.ts',
  'frontend/src/features/attribution/feature.manifest.ts',
  'frontend/src/features/identity/data/identity.api.ts',
  'frontend/src/features/identity/pages/IdentityPage.tsx',
  'frontend/src/features/identity/public.ts',
  'frontend/src/features/identity/feature.manifest.ts',
  'frontend/src/features/journeys/data/journeys.api.ts',
  'frontend/src/features/journeys/pages/JourneysPage.tsx',
  'frontend/src/features/journeys/public.ts',
  'frontend/src/features/journeys/feature.manifest.ts',
  'frontend/src/features/pos-stores/data/pos-stores.api.ts',
  'frontend/src/features/pos-stores/pages/POSAndStoresPage.tsx',
  'frontend/src/features/pos-stores/public.ts',
  'frontend/src/features/pos-stores/feature.manifest.ts',
  'frontend/src/features/matchback/data/matchback.api.ts',
  'frontend/src/features/matchback/pages/MatchbackPage.tsx',
  'frontend/src/features/matchback/public.ts',
  'frontend/src/features/matchback/feature.manifest.ts',
  'frontend/src/features/data-hub/data/data-hub.api.ts',
  'frontend/src/features/data-hub/pages/DataHubPage.tsx',
  'frontend/src/features/data-hub/public.ts',
  'frontend/src/features/data-hub/feature.manifest.ts',
  'frontend/src/features/live-sync/data/live-sync.api.ts',
  'frontend/src/features/live-sync/pages/LiveSyncPage.tsx',
  'frontend/src/features/live-sync/public.ts',
  'frontend/src/features/live-sync/feature.manifest.ts',
  'frontend/src/features/fingerprinting/data/fingerprinting.api.ts',
  'frontend/src/features/fingerprinting/pages/FingerprintingPage.tsx',
  'frontend/src/features/fingerprinting/public.ts',
  'frontend/src/features/fingerprinting/feature.manifest.ts',
  'frontend/src/features/sites/data/sites.api.ts',
  'frontend/src/features/sites/pages/SitesPage.tsx',
  'frontend/src/features/sites/public.ts',
  'frontend/src/features/sites/feature.manifest.ts',
  'frontend/src/features/deep-links/data/deep-links.api.ts',
  'frontend/src/features/deep-links/pages/DeepLinksPage.tsx',
  'frontend/src/features/deep-links/public.ts',
  'frontend/src/features/deep-links/feature.manifest.ts',
  'frontend/src/features/events/data/events.api.ts',
  'frontend/src/features/events/pages/EventsPage.tsx',
  'frontend/src/features/events/public.ts',
  'frontend/src/features/events/feature.manifest.ts',
  'frontend/src/features/leak-monitor/data/leak-monitor.api.ts',
  'frontend/src/features/leak-monitor/pages/LeakMonitorPage.tsx',
  'frontend/src/features/leak-monitor/public.ts',
  'frontend/src/features/leak-monitor/feature.manifest.ts',
  'frontend/src/features/funnel/data/funnel.api.ts',
  'frontend/src/features/funnel/pages/FunnelPage.tsx',
  'frontend/src/features/funnel/public.ts',
  'frontend/src/features/funnel/feature.manifest.ts',
  'frontend/src/features/chatgpt-ads/data/chatgpt-ads.api.ts',
  'frontend/src/features/chatgpt-ads/pages/ChatGPTAdsPage.tsx',
  'frontend/src/features/chatgpt-ads/public.ts',
  'frontend/src/features/chatgpt-ads/feature.manifest.ts',
  'frontend/src/features/adsync/data/adsync.api.ts',
  'frontend/src/features/adsync/pages/AdSyncPage.tsx',
  'frontend/src/features/adsync/public.ts',
  'frontend/src/features/adsync/feature.manifest.ts',
  'frontend/src/features/overview/data/overview.api.ts',
  'frontend/src/features/overview/pages/OverviewPage.tsx',
  'frontend/src/features/overview/public.ts',
  'frontend/src/features/overview/feature.manifest.ts',
  'frontend/src/features/launchpad/data/launchpad.api.ts',
  'frontend/src/features/launchpad/pages/LaunchpadPage.tsx',
  'frontend/src/features/launchpad/public.ts',
  'frontend/src/features/launchpad/feature.manifest.ts',
  'frontend/src/features/workspace/manifest.ts',
  'frontend/src/features/fraud/data/fraud.api.ts',
  'frontend/src/features/fraud/pages/FraudPage.tsx',
  'frontend/src/features/fraud/public.ts',
  'frontend/src/features/fraud/feature.manifest.ts',
  'frontend/src/features/reconciliation/data/reconciliation.api.ts',
  'frontend/src/features/reconciliation/pages/ReconciliationPage.tsx',
  'frontend/src/features/reconciliation/public.ts',
  'frontend/src/features/reconciliation/feature.manifest.ts',
  'frontend/src/features/match-quality/data/match-quality.api.ts',
  'frontend/src/features/match-quality/pages/MatchQualityPage.tsx',
  'frontend/src/features/match-quality/public.ts',
  'frontend/src/features/match-quality/feature.manifest.ts',
  'frontend/src/features/diagnostics/data/diagnostics.api.ts',
  'frontend/src/features/diagnostics/pages/DiagnosticsPage.tsx',
  'frontend/src/features/diagnostics/public.ts',
  'frontend/src/features/diagnostics/feature.manifest.ts',
  'frontend/src/features/adjustments/data/adjustments.api.ts',
  'frontend/src/features/adjustments/pages/AdjustmentsPage.tsx',
  'frontend/src/features/adjustments/public.ts',
  'frontend/src/features/adjustments/feature.manifest.ts',
  'frontend/src/features/exclusions/data/exclusions.api.ts',
  'frontend/src/features/exclusions/pages/ExclusionsPage.tsx',
  'frontend/src/features/exclusions/public.ts',
  'frontend/src/features/exclusions/feature.manifest.ts',
  'frontend/src/features/personalization/data/personalization.api.ts',
  'frontend/src/features/personalization/pages/PersonalizationPage.tsx',
  'frontend/src/features/personalization/public.ts',
  'frontend/src/features/personalization/feature.manifest.ts',
  'frontend/src/features/real-time-activation/data/real-time-activation.api.ts',
  'frontend/src/features/real-time-activation/pages/RealTimeActivationPage.tsx',
  'frontend/src/features/real-time-activation/public.ts',
  'frontend/src/features/real-time-activation/feature.manifest.ts',
  'frontend/src/features/delivery/data/delivery.api.ts',
  'frontend/src/features/delivery/pages/DeliveryCenterPage.tsx',
  'frontend/src/features/delivery/public.ts',
  'frontend/src/features/delivery/feature.manifest.ts',
  'frontend/src/features/developers/data/developers.api.ts',
  'frontend/src/features/developers/pages/DevelopersPage.tsx',
  'frontend/src/features/developers/public.ts',
  'frontend/src/features/developers/feature.manifest.ts',
  'frontend/src/features/compliance/data/compliance.api.ts',
  'frontend/src/features/compliance/pages/CompliancePage.tsx',
  'frontend/src/features/compliance/public.ts',
  'frontend/src/features/compliance/feature.manifest.ts',
  'frontend/src/features/settings/components/BillingUsageSettings.tsx',
  'frontend/src/features/settings/components/GovernanceSettings.tsx',
  'frontend/src/features/settings/components/UsersRolesSettings.tsx',
  'frontend/src/features/settings/ui/SettingsPrimitives.tsx',
  'frontend/src/features/settings/data/settings.api.ts',
  'frontend/src/features/settings/pages/SettingsPage.tsx',
  'frontend/src/features/settings/public.ts',
  'frontend/src/features/settings/feature.manifest.ts',
  'frontend/src/features/models/data/models.api.ts',
  'frontend/src/features/models/pages/ModelsPage.tsx',
  'frontend/src/features/models/public.ts',
  'frontend/src/features/models/feature.manifest.ts',
  'frontend/src/features/planner/data/planner.api.ts',
  'frontend/src/features/planner/pages/PlannerPage.tsx',
  'frontend/src/features/planner/public.ts',
  'frontend/src/features/planner/feature.manifest.ts',
  'frontend/src/features/audiences/data/audiences.api.ts',
  'frontend/src/features/audiences/pages/AudiencesPage.tsx',
  'frontend/src/features/audiences/public.ts',
  'frontend/src/features/audiences/feature.manifest.ts',
  'frontend/src/features/data-flows/data/data-flows.api.ts',
  'frontend/src/features/data-flows/pages/DataFlowsPage.tsx',
  'frontend/src/features/data-flows/public.ts',
  'frontend/src/features/data-flows/feature.manifest.ts',
  'frontend/src/features/integrations/data/integrations.api.ts',
  'frontend/src/features/integrations/pages/IntegrationsPage.tsx',
  'frontend/src/features/integrations/public.ts',
  'frontend/src/features/integrations/feature.manifest.ts',
  'frontend/src/features/executive-briefs/data/executive-briefs.api.ts',
  'frontend/src/features/executive-briefs/pages/ExecutiveBriefsPage.tsx',
  'frontend/src/features/executive-briefs/public.ts',
  'frontend/src/features/executive-briefs/feature.manifest.ts',
  'frontend/src/features/reports/data/reports.api.ts',
  'frontend/src/features/reports/pages/ReportsPage.tsx',
  'frontend/src/features/reports/public.ts',
  'frontend/src/features/reports/feature.manifest.ts',
  'frontend/src/features/alerts/data/alerts.api.ts',
  'frontend/src/features/alerts/pages/AlertsPage.tsx',
  'frontend/src/features/alerts/public.ts',
  'frontend/src/features/alerts/feature.manifest.ts',
  'frontend/src/features/monitoring/data/monitoring.api.ts',
  'frontend/src/features/monitoring/pages/MonitoringPage.tsx',
  'frontend/src/features/monitoring/public.ts',
  'frontend/src/features/monitoring/feature.manifest.ts',
  'frontend/src/features/approvals/data/approvals.api.ts',
  'frontend/src/features/approvals/pages/ApprovalPage.tsx',
  'frontend/src/features/approvals/public.ts',
  'frontend/src/features/approvals/feature.manifest.ts',
  'frontend/src/lib/runtime-config.ts',
  'frontend/src/lib/mutation-lifecycle.ts',
  'frontend/src/lib/dirty-work.ts',
  'frontend/src/components/system/FrontendFoundation.tsx',
  'frontend/src/components/system/FrontendStates.tsx',
  'frontend/src/components/system/ConnectionStatus.tsx',
  'frontend/src/components/system/ChunkRecoveryNotice.tsx'
]
for(const relative of required){
  if(!fs.existsSync(path.join(root,relative)))failures.push(relative+': required frontend architecture file missing')
}

if(failures.length){
  console.error('[frontend-architecture] FAILED')
  for(const failure of failures)console.error(' - '+failure)
  process.exit(1)
}
console.log('[frontend-architecture] PASS: frontend/server boundaries and migration ceiling verified.')
