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
const clientRoots=[
  frontend,
  path.join(root,'website','public-site','src'),
  path.join(root,'packages','design-system','src'),
  path.join(root,'packages','client-core','src'),
  path.join(root,'packages','localization','src'),
  path.join(root,'frontend','platform-admin','src')
].filter(fs.existsSync)
for(const clientRoot of clientRoots)for(const file of walk(clientRoot)){
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
  for(const rootOwnedName of ['ConsentBanner','Login','DeepLinkResolver']){
    if(new RegExp('function\\s+'+rootOwnedName+'\\s*\\(').test(source)){
      failures.push('frontend/src/AcePlatform.tsx still owns '+rootOwnedName+' after boundary extraction.')
    }
  }
  for(const legacyPublicName of ['Header','Marketing','PublicFooter','PublicPageFrame','IndustriesPublicPage','AgentsPublicPage','IntegrationsPublicPage','DemoPage','CompanyPage','SolutionsPage','CaseStudiesPage','ResourcesPage','LegalPage','Pricing','DemoSection']){
    if(new RegExp('function\\s+'+legacyPublicName+'\\s*\\(').test(source)){
      failures.push('frontend/src/AcePlatform.tsx still contains public website implementation '+legacyPublicName+' after website/public-site extraction.')
    }
  }
  if(/function\s+Product\s*\(/.test(source)||source.includes("const appTabs=")){
    failures.push('frontend/src/AcePlatform.tsx must not contain authenticated customer-workspace composition after extraction.')
  }
  if(/from\s+['"]\.\/features\//.test(source)||/import\(['"]\.\/features\//.test(source)){
    failures.push('frontend/src/AcePlatform.tsx must not directly own customer feature imports after customer-app composition extraction.')
  }
  if(/function\s+Customer360\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Customer 360 implementation after feature extraction.')
  }
  if(/function\s+OfflineAttribution\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Offline Attribution implementation after feature extraction.')
  }
  if(/function\s+FollowUps\s*\(/.test(source)||/function\s+Calls\s*\(/.test(source)||/function\s+Meetings\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains extracted conversion-operation feature implementations.')
  }
  if(/function\s+Feedback\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Feedback implementation after feature extraction.')
  }
  if(/function\s+AskAce\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Ask Ace implementation after feature extraction.')
  }
  if(/function\s+Routing\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Routing implementation after feature extraction.')
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

  const routingPath=path.join(frontend,'features','routing','pages','RoutingPage.tsx')
  if(fs.existsSync(routingPath)){
    const routing=fs.readFileSync(routingPath,'utf8')
    if(!routing.includes('AccessibleDialog ariaLabel="New routing rule"')){
      failures.push('Routing builder must use the shared accessible dialog boundary.')
    }
    if(!routing.includes("routing-rule-draft")){
      failures.push('Routing builder must participate in dirty-work protection.')
    }
    if(!routing.includes("kind:'unknown'")){
      failures.push('Routing writes must preserve explicit unknown-outcome handling for timeout/network ambiguity.')
    }
  }

  const askAcePath=path.join(frontend,'features','ask-ace','pages','AskAcePage.tsx')
  if(fs.existsSync(askAcePath)){
    const askAce=fs.readFileSync(askAcePath,'utf8')
    if(!askAce.includes('MAX_MESSAGES=100')||!askAce.includes('MAX_JOURNEY_EVENTS=100')){
      failures.push('Ask Ace conversation and journey rendering must remain bounded for long-running browser sessions.')
    }
    if(!askAce.includes('No fabricated metrics')){
      failures.push('Ask Ace must keep the explicit grounded-evidence boundary visible to customers.')
    }
  }

  const feedbackPath=path.join(frontend,'features','feedback','pages','FeedbackPage.tsx')
  if(fs.existsSync(feedbackPath)){
    const feedback=fs.readFileSync(feedbackPath,'utf8')
    if(!feedback.includes('AccessibleDialog ariaLabel="Record feedback"')||!feedback.includes('AccessibleDialog ariaLabel="Request feedback"')){
      failures.push('Feedback mutation forms must use the shared accessible dialog boundary.')
    }
    if(!feedback.includes("feedback-record-draft")||!feedback.includes("feedback-request-draft")){
      failures.push('Feedback forms must participate in dirty-work protection.')
    }
    if(!feedback.includes("kind:'unknown'")){
      failures.push('Feedback writes must preserve explicit unknown-outcome handling for timeout/network ambiguity.')
    }
  }

  const followUpsPath=path.join(frontend,'features','follow-ups','pages','FollowUpsPage.tsx')
  const callsPath=path.join(frontend,'features','calls','pages','CallsPage.tsx')
  const meetingsPath=path.join(frontend,'features','meetings','pages','MeetingsPage.tsx')
  for(const [label,file] of [['Follow-ups',followUpsPath],['Calls',callsPath],['Meetings',meetingsPath]]){
    if(!fs.existsSync(file))continue
    const feature=fs.readFileSync(file,'utf8')
    if(!feature.includes('AccessibleDialog')){
      failures.push(label+' mutation surfaces must use the shared accessible dialog boundary.')
    }
    if(!feature.includes("kind:'unknown'")){
      failures.push(label+' writes must preserve explicit unknown-outcome handling for timeout/network ambiguity.')
    }
  }

  const customerWorkspacePath=path.join(frontend,'customer-app','CustomerWorkspace.tsx')
  if(fs.existsSync(customerWorkspacePath)){
    const customerWorkspace=fs.readFileSync(customerWorkspacePath,'utf8')
    if(!customerWorkspace.includes("cancelWorkspaceRequests('workspace_scope_changed')")){
      failures.push('Customer workspace switch must cancel old-scope requests before activating a new workspace.')
    }
    if(!customerWorkspace.includes('confirmDiscardDirtyWork')){
      failures.push('Customer workspace navigation must preserve dirty-work protection.')
    }
    if(!customerWorkspace.includes('WorkspaceSectionBoundary')){
      failures.push('Customer workspace composition must preserve section-level failure containment.')
    }
  }

  const publicSitePath=path.join(root,'website','public-site','src','PublicSite.tsx')
  if(fs.existsSync(publicSitePath)){
    const publicSite=fs.readFileSync(publicSitePath,'utf8')
    if(publicSite.includes("customer-app")||publicSite.includes("features/workspace")){
      failures.push('Public website composition must not depend on authenticated customer-app internals.')
    }
    if(!publicSite.includes("PublicSiteView")||!publicSite.includes("PublicPageFrame")){
      failures.push('Public website must preserve its owned route/composition boundary.')
    }
  }

  const authPath=path.join(frontend,'auth','LoginPage.tsx')
  if(fs.existsSync(authPath)){
    const auth=fs.readFileSync(authPath,'utf8')
    if(!auth.includes('googleLoginExchange')||!auth.includes('resetPassword')){
      failures.push('Auth composition must preserve Google exchange and password-reset customer journeys.')
    }
  }
  const consentPath=path.join(frontend,'components','system','ConsentBanner.tsx')
  if(fs.existsSync(consentPath)){
    const consent=fs.readFileSync(consentPath,'utf8')
    if(!consent.includes('Essential only')||!consent.includes('Allow analytics')||!consent.includes('Allow all')){
      failures.push('Consent boundary must preserve the existing three customer privacy choices.')
    }
  }

  const publicApiPath=path.join(root,'website','public-site','src','lib','public-api.ts')
  if(fs.existsSync(publicApiPath)){
    const publicApi=fs.readFileSync(publicApiPath,'utf8')
    if(publicApi.includes('ace_token')||publicApi.includes('ace_workspace_id')||publicApi.includes('Authorization')){
      failures.push('Public-site API client must not inherit authenticated customer token/workspace authority.')
    }
  }
  const publicSitePathForApi=path.join(root,'website','public-site','src','PublicSite.tsx')
  if(fs.existsSync(publicSitePathForApi)){
    const publicSite=fs.readFileSync(publicSitePathForApi,'utf8')
    if(publicSite.includes("frontend/src/lib/api")){
      failures.push('Public website must use its own public API boundary, not the authenticated customer API client.')
    }
  }

  const customerEntryPath=path.join(root,'frontend','customer-app','main.tsx')
  if(fs.existsSync(customerEntryPath)){
    const customerEntry=fs.readFileSync(customerEntryPath,'utf8')
    if(!customerEntry.includes("noindex")&&fs.existsSync(path.join(root,'frontend','customer-app','index.html'))){
      const html=fs.readFileSync(path.join(root,'frontend','customer-app','index.html'),'utf8')
      if(!html.includes('noindex,nofollow'))failures.push('Standalone customer app must remain excluded from public indexing.')
    }
    if(!customerEntry.includes('installBeforeUnloadDirtyWorkGuard')){
      failures.push('Standalone customer app must preserve dirty-work protection at bootstrap.')
    }
  }

  const controlApiPath=path.join(root,'frontend','platform-admin','src','lib','control-api.ts')
  if(fs.existsSync(controlApiPath)){
    const controlApiSource=fs.readFileSync(controlApiPath,'utf8')
    if(controlApiSource.includes('ace_token')||controlApiSource.includes('ace_workspace_id')||controlApiSource.includes('Authorization:')){
      failures.push('Platform control frontend must not reuse customer token/workspace authority.')
    }
  }
  const controlAppPath=path.join(root,'frontend','platform-admin','src','ControlCenterApp.tsx')
  if(fs.existsSync(controlAppPath)){
    const controlAppSource=fs.readFileSync(controlAppPath,'utf8')
    if(/apply|execute|rollback|delete/i.test(controlAppSource)&&!controlAppSource.includes('Write controls remain intentionally absent')){
      failures.push('Platform control frontend must remain read-only until control backend write contracts exist.')
    }
  }

  const perfPath=path.join(root,'packages','client-core','src','frontend-performance.ts')
  if(fs.existsSync(perfPath)){
    const perf=fs.readFileSync(perfPath,'utf8')
    if(!perf.includes("slice(-200)"))failures.push('Frontend performance telemetry must keep a bounded browser buffer.')
    if(/token|password|secret/i.test(perf))failures.push('Frontend performance telemetry must not collect credential-shaped fields.')
  }

  const accessibilityPath=path.join(root,'packages','design-system','src','Accessibility.tsx')
  if(fs.existsSync(accessibilityPath)){
    const accessibility=fs.readFileSync(accessibilityPath,'utf8')
    if(!accessibility.includes('ace-skip-link'))failures.push('Shared accessibility package must preserve the skip-link primitive.')
  }

  const publicApiClientPath=path.join(root,'website','public-site','src','lib','public-api.ts')
  if(fs.existsSync(publicApiClientPath)){
    const publicApiClient=fs.readFileSync(publicApiClientPath,'utf8')
    if(!publicApiClient.includes('maxPublicWriteBodyBytes'))failures.push('Public form client must enforce a bounded request payload before submission.')
    if(!publicApiClient.includes('activePublicWrites'))failures.push('Public form client must suppress duplicate in-flight writes.')
  }
  const publicSiteUiPath=path.join(root,'website','public-site','src','PublicSite.tsx')
  if(fs.existsSync(publicSiteUiPath)){
    const publicSiteUi=fs.readFileSync(publicSiteUiPath,'utf8')
    if(!publicSiteUi.includes('AccessibleDialog ariaLabel="Request a connector"'))failures.push('Public connector request must use the shared accessible dialog boundary.')
  }

  const publicSiteMutationPath=path.join(root,'website','public-site','src','PublicSite.tsx')
  if(fs.existsSync(publicSiteMutationPath)){
    const publicSiteMutations=fs.readFileSync(publicSiteMutationPath,'utf8')
    if(!publicSiteMutations.includes('isUnknownPublicOutcome'))failures.push('Public-site writes must distinguish timeout/network ambiguity from confirmed failure.')
    if(!publicSiteMutations.includes("'unknown'"))failures.push('Public-site mutation UI must preserve an explicit unknown-outcome state.')
    if(!publicSiteMutations.includes('Do not submit the same request again'))failures.push('Public-site unknown outcomes must discourage duplicate writes before reconciliation.')
  }

  const localizationPath=path.join(root,'packages','localization','src','index.ts')
  if(fs.existsSync(localizationPath)){
    const localization=fs.readFileSync(localizationPath,'utf8')
    if(!localization.includes('Intl.DateTimeFormat')||!localization.includes('Intl.NumberFormat')){
      failures.push('Localization package must own locale-aware date and number formatting.')
    }
  }
  const publicLocalizationPath=path.join(root,'website','public-site','src','PublicSite.tsx')
  if(fs.existsSync(publicLocalizationPath)){
    const publicLocalization=fs.readFileSync(publicLocalizationPath,'utf8')
    if(publicLocalization.includes('.toLocaleString(')||publicLocalization.includes('.toLocaleDateString(')){
      failures.push('Public site must use the owned localization package instead of ad-hoc locale formatting.')
    }
  }

  const sessionAuthorityPath=path.join(root,'packages','client-core','src','session-authority.ts')
  if(fs.existsSync(sessionAuthorityPath)){
    const authority=fs.readFileSync(sessionAuthorityPath,'utf8')
    if(!authority.includes("sessionTokenKey='ace_session_token'"))failures.push('Customer session authority must keep bearer authority tab-scoped during compatibility migration.')
    if(!authority.includes('removeItem(legacyPersistentTokenKey)'))failures.push('Legacy persistent bearer tokens must be removed after migration.')
  }
  const customerApiPath=path.join(frontend,'lib','api.ts')
  if(fs.existsSync(customerApiPath)){
    const customerApi=fs.readFileSync(customerApiPath,'utf8')
    if(customerApi.includes("localStorage.getItem('ace_token')")||customerApi.includes("localStorage.setItem('ace_token'"))){
      failures.push('Customer API client must not persist bearer credentials in localStorage.')
    }
  }

  const customerWorkspaceQueryPath=path.join(frontend,'customer-app','CustomerWorkspace.tsx')
  if(fs.existsSync(customerWorkspaceQueryPath)){
    const customerWorkspaceQuery=fs.readFileSync(customerWorkspaceQueryPath,'utf8')
    if(!customerWorkspaceQuery.includes('QueryClientProvider'))failures.push('Customer application must expose one canonical TanStack Query cache for the active session scope.')
    if(!customerWorkspaceQuery.includes('queryClient.cancelQueries()')||!customerWorkspaceQuery.includes('queryClient.clear()'))failures.push('Workspace transitions must cancel and clear old-scope query state.')
    if(!customerWorkspaceQuery.includes('customerQueryKeys.dashboard'))failures.push('Workspace shell remote state must use scope-aware query keys.')
  }

  const workspaceManifestPath=path.join(frontend,'features','workspace','manifest.ts')
  if(fs.existsSync(workspaceManifestPath)){
    const workspaceManifest=fs.readFileSync(workspaceManifestPath,'utf8')
    if(!workspaceManifest.includes('parseWorkspaceIdFromHash')||!workspaceManifest.includes('buildWorkspaceHash')){
      failures.push('Workspace route contract must own workspace identity parsing and scoped URL construction.')
    }
  }
  const customerScopePath=path.join(frontend,'customer-app','CustomerWorkspace.tsx')
  if(fs.existsSync(customerScopePath)){
    const customerScope=fs.readFileSync(customerScopePath,'utf8')
    if(!customerScope.includes("window.addEventListener('ace-session-state'"))failures.push('Customer query cache must react to session authority changes.')
    if(!customerScope.includes("buildWorkspaceHash(tab,String(x.id))"))failures.push('Authorized workspace switches must update route-owned workspace identity.')
  }

  const customerBootstrapPath=path.join(frontend,'customer-app','CustomerBootstrap.tsx')
  if(fs.existsSync(customerBootstrapPath)){
    const bootstrap=fs.readFileSync(customerBootstrapPath,'utf8')
    if(!bootstrap.includes("'session-resolving'")||!bootstrap.includes("'recoverable-error'")||!bootstrap.includes("'signed-out'")){
      failures.push('Customer bootstrap must preserve explicit resolving, signed-out and recoverable-error states.')
    }
    if(!bootstrap.includes('event.persisted'))failures.push('Protected customer access must revalidate after bfcache restoration.')
    if(!bootstrap.includes('status===401||status===403'))failures.push('Signed-out state must require authoritative authentication/authorization denial.')
  }

  const overviewPagePath=path.join(frontend,'features','overview','pages','OverviewPage.tsx')
  const overviewManifestPath=path.join(frontend,'features','overview','feature.manifest.ts')
  if(fs.existsSync(overviewPagePath)){
    const overviewPage=fs.readFileSync(overviewPagePath,'utf8')
    if(!overviewPage.includes('useQuery({'))failures.push('Overview feature must use the canonical TanStack Query server-state cache.')
    if(overviewPage.includes('useEffect('))failures.push('Overview feature must not maintain a second manual remote-data lifecycle.')
    if(!overviewPage.includes('overviewKeys.summary()')||!overviewPage.includes('overviewKeys.liveSync()')||!overviewPage.includes('overviewKeys.funnel()')){
      failures.push('Overview feature must use feature-owned scope-aware query keys.')
    }
  }
  if(fs.existsSync(overviewManifestPath)){
    const overviewManifest=fs.readFileSync(overviewManifestPath,'utf8')
    if(!overviewManifest.includes('requestBudget'))failures.push('Overview route must declare its request budget.')
  }

  const launchpadManifestPath=path.join(frontend,'features','launchpad','feature.manifest.ts')
  if(fs.existsSync(launchpadManifestPath)){
    const launchpadManifest=fs.readFileSync(launchpadManifestPath,'utf8')
    if(!launchpadManifest.includes('requestBudget'))failures.push('Launchpad route must declare its request budget.')
  }

  const launchpadPagePath=path.join(frontend,'features','launchpad','pages','LaunchpadPage.tsx')
  if(fs.existsSync(launchpadPagePath)){
    const launchpadPage=fs.readFileSync(launchpadPagePath,'utf8')
    if(!launchpadPage.includes('useQuery({')||!launchpadPage.includes('useMutation({'))failures.push('Launchpad golden feature must use canonical query and mutation state.')
    if(!launchpadPage.includes("phase:'OUTCOME_UNKNOWN'"))failures.push('Launchpad write must preserve explicit outcome-unknown reconciliation.')
    if(!launchpadPage.includes('Refresh authoritative evidence'))failures.push('Unknown Launchpad writes must reconcile before repeat.')
    if(launchpadPage.includes('useEffect('))failures.push('Launchpad must not keep a second manual remote-data lifecycle.')
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
  'frontend/src/features/follow-ups/data/follow-ups.api.ts',
  'frontend/src/features/follow-ups/pages/FollowUpsPage.tsx',
  'frontend/src/features/follow-ups/public.ts',
  'frontend/src/features/follow-ups/feature.manifest.ts',
  'frontend/src/features/calls/data/calls.api.ts',
  'frontend/src/features/calls/pages/CallsPage.tsx',
  'frontend/src/features/calls/public.ts',
  'frontend/src/features/calls/feature.manifest.ts',
  'frontend/src/features/meetings/data/meetings.api.ts',
  'frontend/src/features/meetings/pages/MeetingsPage.tsx',
  'frontend/src/features/meetings/public.ts',
  'frontend/src/features/meetings/feature.manifest.ts',
  'frontend/src/auth/LoginPage.tsx',
  'frontend/src/deep-link/DeepLinkResolver.tsx',
  'frontend/src/components/system/ConsentBanner.tsx',
  'website/public-site/src/PublicSite.tsx',
  'website/public-site/src/public.ts',
  'packages/design-system/src/Brand.tsx',
  'packages/design-system/src/Accessibility.tsx',
  'packages/design-system/src/AccessibleDialog.tsx',
  'packages/localization/src/index.ts',
  'docs/project-annex/LOCALIZATION_TIMEZONE.md',
  'frontend/platform-admin/src/main.tsx',
  'frontend/platform-admin/src/ControlCenterApp.tsx',
  'frontend/platform-admin/src/features/manifest.ts',
  'frontend/platform-admin/src/lib/control-api.ts',
  'vite.platform-admin.config.ts',
  'deploy/nginx.platform-admin.conf',
  'packages/client-core/src/frontend-performance.ts',
  'packages/client-core/src/session-authority.ts',
  'packages/client-core/src/query-scope.ts',
  'playwright.soak.config.ts',
  'tests/e2e/frontend-soak.spec.ts',
  'docs/project-annex/FRONTEND_SUPPORT_MATRIX.md',
  'playwright.standalone.config.ts',
  'playwright.matrix.config.ts',
  'tests/e2e/standalone-frontends.spec.ts',
  'tests/e2e/frontend-matrix.spec.ts',
  'scripts/frontend-evidence.mjs',
  'docs/evidence/FRONTEND_RELEASE_EVIDENCE.md',
  'frontend/customer-app/main.tsx',
  'frontend/customer-app/index.html',
  'vite.customer-app.config.ts',
  'deploy/nginx.customer-app.conf',
  'deploy/nginx.public-site.conf',
  'frontend/src/customer-app/CustomerWorkspace.tsx',
  'frontend/src/customer-app/CustomerBootstrap.tsx',
  'frontend/src/customer-app/public.ts',
  'frontend/src/features/feedback/data/feedback.api.ts',
  'frontend/src/features/feedback/pages/FeedbackPage.tsx',
  'frontend/src/features/feedback/public.ts',
  'frontend/src/features/feedback/feature.manifest.ts',
  'frontend/src/features/ask-ace/data/ask-ace.api.ts',
  'frontend/src/features/ask-ace/pages/AskAcePage.tsx',
  'frontend/src/features/ask-ace/public.ts',
  'frontend/src/features/ask-ace/feature.manifest.ts',
  'frontend/src/features/routing/data/routing.api.ts',
  'frontend/src/features/routing/pages/RoutingPage.tsx',
  'frontend/src/features/routing/public.ts',
  'frontend/src/features/routing/feature.manifest.ts',
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
