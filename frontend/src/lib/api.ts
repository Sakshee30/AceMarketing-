export type DemoRequest = Record<string, FormDataEntryValue>

const getToken = () => typeof window !== 'undefined' ? window.localStorage.getItem('ace_token') : null
const getWorkspace = () => typeof window !== 'undefined' ? (window.localStorage.getItem('ace_workspace_id') || 'ws_default') : 'ws_default'

export class AceApiError extends Error {
  status:number
  requestId:string
  details:any
  constructor(message:string,status:number,requestId:string,details:any){
    super(message)
    this.name='AceApiError'
    this.status=status
    this.requestId=requestId
    this.details=details
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token=getToken()
  let response:Response
  try{
    response = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json', 'X-Workspace-ID': getWorkspace(), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers || {}) },
      ...init,
    })
  }catch(error){
    const message=error instanceof Error?error.message:'Network request failed'
    throw new AceApiError(message,0,'',{cause:'network',path})
  }

  const requestId=response.headers.get('x-request-id')||''
  if(response.status===204) return undefined as T

  const raw=await response.text()
  let payload:any=null
  if(raw){
    try{payload=JSON.parse(raw)}catch{payload={message:raw}}
  }

  if(!response.ok){
    const message=payload?.error||payload?.message||`API request failed: ${response.status}`
    throw new AceApiError(message,response.status,requestId,payload)
  }

  return payload as T
}

export const api = {
  health: () => request<{ ok: boolean; service: string }>('/health'),
  dashboardSummary: () => request('/dashboard-summary'),
  publicNavigation: () => request('/public/navigation'),
  publicIndustries: () => request('/public/industries'),
  publicAgents: () => request('/public/agents'),
  publicIntegrations: () => request('/public/integrations'),
  publicChallenges: () => request('/public/challenges'),
  publicCaseStudies: () => request('/public/case-studies'),
  publicResources: () => request('/public/resources'),
  publicResourceCenter: () => request('/public/resource-center'),
  launchpad: () => request('/launchpad'),
  saveLaunchpad: (payload: Record<string, unknown>) => request('/launchpad', { method: 'POST', body: JSON.stringify(payload) }),
  googleLoginStart: () => request('/auth/google/start'),
  googleLoginExchange: async (code: string, workspaceId: string) => {
    const result = await request<{ token: string; user: { id?: string; email: string; role: string }; workspaceId?: string; expiresIn: number }>('/auth/google/exchange', {
      method: 'POST',
      body: JSON.stringify({ code, workspaceId })
    })
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ace_token', result.token)
      if (result.workspaceId) window.localStorage.setItem('ace_workspace_id', result.workspaceId)
    }
    return result
  },
  forgotPassword: (email: string) => request('/auth/password/forgot', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) => request('/auth/password/reset', { method: 'POST', body: JSON.stringify({ token, password }) }),
  login: async (email: string, password: string) => {
    const result = await request<{ token: string; user: { id?: string; email: string; role: string }; workspaceId?: string; expiresIn: number }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ace_token', result.token)
      if (result.workspaceId) window.localStorage.setItem('ace_workspace_id', result.workspaceId)
    }
    return result
  },
  logout: async () => {
    try { await request('/auth/logout', { method: 'POST', body: JSON.stringify({}) }) } catch {}
    if (typeof window !== 'undefined') window.localStorage.removeItem('ace_token')
  },
  pricingRecommendation: (payload: Record<string, unknown>) => request<{ recommended: string[] }>('/pricing/recommend', { method: 'POST', body: JSON.stringify(payload) }),
  submitQuote: (payload: Record<string, unknown>) => request<{ id: string; status: string }>('/pricing/quote', { method: 'POST', body: JSON.stringify(payload) }),
  submitDemo: (payload: DemoRequest) =>
    request<{ id: string; status: string }>('/demo-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  overview: () => request('/workspace/overview'),
  integrations: () => request('/integrations'),
  requestIntegration: (payload: Record<string, unknown>) => request('/integration-requests',{method:'POST',body:JSON.stringify(payload)}),
  integrationFlows: () => request('/integration-flows'),
  createIntegrationFlow: (payload: Record<string, unknown>) => request('/integration-flows',{method:'POST',body:JSON.stringify(payload)}),
  testIntegrationFlow: (id:string) => request('/integration-flows/test',{method:'POST',body:JSON.stringify({id})}),
  toggleIntegrationFlow: (id:string,enabled:boolean) => request('/integration-flows/toggle',{method:'POST',body:JSON.stringify({id,enabled})}),

  refreshIntegration: (connector:string) => request('/integrations/refresh',{method:'POST',body:JSON.stringify({connector})}),
  customIntegrations: () => request('/custom-integrations'),
  testCustomIntegration: (payload: Record<string, unknown>) => request('/custom-integrations/test', { method: 'POST', body: JSON.stringify(payload) }),
  createCustomIntegration: (payload: Record<string, unknown>) => request('/custom-integrations', { method: 'POST', body: JSON.stringify(payload) }),
  events: () => request('/events'),
  createEventRule: (payload: Record<string, unknown>) => request('/events/rules',{method:'POST',body:JSON.stringify(payload)}),
  toggleEventRule: (id:string,enabled:boolean) => request('/events/rules/toggle',{method:'POST',body:JSON.stringify({id,enabled})}),
  adjustments: () => request('/adjustments'),
  createAdjustment: (payload: Record<string, unknown>) => request('/adjustments', { method: 'POST', body: JSON.stringify(payload) }),
  applyAdjustment: (id: string) => request('/adjustments/apply', { method: 'POST', body: JSON.stringify({ id }) }),
  previewAdjustment: (id: string) => request('/adjustments/preview', { method: 'POST', body: JSON.stringify({ id }) }),
  diagnostics: () => request('/diagnostics'),
  reconciliation: () => request('/reconciliation'),
  runReconciliationAction: (issue:string,limit=250) => request('/reconciliation/action', { method:'POST', body:JSON.stringify({issue,limit}) }),
  runDiagnosticsScan: () => request('/diagnostics/scan', { method: 'POST', body: JSON.stringify({}) }),
  fraud: () => request('/fraud'),
  blockFraudPattern: (pattern: string) => request('/fraud/block', { method: 'POST', body: JSON.stringify({ pattern }) }),
  reviewFraudPattern: (pattern: string) => request('/fraud/review', { method: 'POST', body: JSON.stringify({ pattern }) }),
  deepLinks: () => request('/deep-links'),
  createDeepLink: (payload: Record<string, unknown>) => request('/deep-links', { method: 'POST', body: JSON.stringify(payload) }),
  recordDeepLinkEvent: (payload: Record<string, unknown>) => request('/deep-links/event', { method: 'POST', body: JSON.stringify(payload) }),
  activateDeepLink: (slug: string) => request('/deep-links/activate', { method: 'POST', body: JSON.stringify({ slug }) }),
  sites: () => request('/sites'),
  createSite: (payload: Record<string, unknown>) => request('/sites', { method: 'POST', body: JSON.stringify(payload) }),
  fingerprinting: () => request('/fingerprinting'),
  fingerprintMatches: () => request('/fingerprinting/matches'),
  testFingerprint: (scenario: string) => request('/fingerprinting/test', { method: 'POST', body: JSON.stringify({ scenario }) }),
  testSite: (domain: string) => request('/sites/test', { method: 'POST', body: JSON.stringify({ domain }) }),
  siteDebug: (domain: string) => request('/sites/debug?domain=' + encodeURIComponent(domain)),
  replayDiagnostic: (issue: string) => request('/diagnostics/replay', { method: 'POST', body: JSON.stringify({ issue }) }),
  funnel: (filters?: { channel?: string; account?: string; disposition?: string; periodDays?: number }) => {
    const params=new URLSearchParams()
    if(filters?.channel&&filters.channel!=='All channels')params.set('channel',filters.channel)
    if(filters?.account&&filters.account!=='All accounts')params.set('account',filters.account)
    if(filters?.disposition&&filters.disposition!=='All dispositions')params.set('disposition',filters.disposition)
    if(filters?.periodDays)params.set('periodDays',String(filters.periodDays))
    return request('/funnel'+(params.toString()?'?'+params.toString():''))
  },
  liveSync: () => request('/live-sync'),
  dataHub: () => request('/data-hub'),
  rebuildDataHub: () => request('/data-hub/rebuild', { method: 'POST', body: JSON.stringify({}) }),
  offlineAttribution: () => request('/offline-attribution'),
  createOfflineAttributionRule: (payload: Record<string, unknown>) => request('/offline-attribution/rules', { method: 'POST', body: JSON.stringify(payload) }),
  toggleOfflineAttributionRule: (id:string,enabled:boolean) => request('/offline-attribution/rules/toggle', { method: 'POST', body: JSON.stringify({id,enabled}) }),
  testOfflineAttributionRule: (payload: Record<string, unknown>) => request('/offline-attribution/test', { method: 'POST', body: JSON.stringify(payload) }),
  callEvents: () => request('/call-events'),
  matchback: () => request('/matchback'),
  createMatchbackRule: (payload: Record<string, unknown>) => request('/matchback/rules', { method: 'POST', body: JSON.stringify(payload) }),
  toggleMatchbackRule: (id:string,enabled:boolean) => request('/matchback/rules/toggle', { method: 'POST', body: JSON.stringify({id,enabled}) }),
  reconcileMatchback: (ruleId: string) => request('/matchback/reconcile', { method: 'POST', body: JSON.stringify({ ruleId }) }),
  unmatchedMatchback: () => request('/matchback/unmatched'),
  attributionIdentityStats: (periodDays?: number) => request('/attribution-identity/stats'+(periodDays?'?periodDays='+encodeURIComponent(String(periodDays)):'')),
  recordAssistedEvent: (payload: Record<string, unknown>) => request('/assisted-events', { method: 'POST', body: JSON.stringify(payload) }),
  posStores: () => request('/pos-stores'),
  importPosBatch: (payload: Record<string, unknown>) => request('/pos-stores/import', { method: 'POST', body: JSON.stringify(payload) }),
  track: (payload: Record<string, unknown>) => request('/track', { method: 'POST', body: JSON.stringify(payload) }),
  journeys: () => request('/journeys'),
  customer360: (id?: string) => request('/customer-360'+(id?'?id='+encodeURIComponent(id):'')),
  identity: () => request('/identity'),
  models: () => request('/models'),
  createModel: (payload: Record<string, unknown>) => request('/models', { method: 'POST', body: JSON.stringify(payload) }),
  modelValidation: (name: string) => request('/models/validation?name=' + encodeURIComponent(name)),
  runModel: (name: string) => request('/models/run', { method: 'POST', body: JSON.stringify({ name }) }),
  attribution: () => request('/attribution'),
  reports: () => request('/reports'),
  cohorts: (months=6) => request('/cohorts?months='+months),
  reportSchedules: () => request('/report-schedules'),
  saveReportSchedule: (payload:any) => request('/report-schedules',{method:'POST',body:JSON.stringify(payload)}),
  runReportNow: (id:string) => request('/report-schedules/run-now',{method:'POST',body:JSON.stringify({id})}),
  planner: () => request('/planner'),
  savePlannerScenario: (payload: Record<string, unknown>) => request('/planner/scenarios', { method: 'POST', body: JSON.stringify(payload) }),
  sendReportTest: (report: string) => request('/reports/send-test', { method: 'POST', body: JSON.stringify({ report }) }),
  enrich: () => request('/enrich'),
  writebackEnrichment: (lead: string, provider: string, fields?: Record<string, unknown>) => request('/enrich/writeback', { method: 'POST', body: JSON.stringify({lead,provider,fields:fields||{}}) }),
  leadGrading: () => request('/lead-grading'),
  overrideLeadGrade: (lead: string, grade: string) => request('/lead-grading/override', { method: 'POST', body: JSON.stringify({lead,grade}) }),
  activateLeadGrade: (lead: string) => request('/lead-grading/activate', { method: 'POST', body: JSON.stringify({lead}) }),
  agents: () => request('/agents'),
  routing: () => request('/routing'),
  createRoutingRule: (payload: Record<string, unknown>) => request('/routing/rules', { method: 'POST', body: JSON.stringify(payload) }),
  toggleRoutingRule: (id:string,enabled:boolean) => request('/routing/rules/toggle', { method: 'POST', body: JSON.stringify({id,enabled}) }),
  testRoutingRule: (ruleId: string) => request('/routing/test', { method: 'POST', body: JSON.stringify({ ruleId }) }),
  followUps: () => request('/follow-ups'),
  leadReactivation: (dormantDays=30,recentDays=7) => request('/lead-reactivation?dormantDays='+dormantDays+'&recentDays='+recentDays),
  runLeadReactivation: (payload: Record<string, unknown>) => request('/lead-reactivation/run', { method: 'POST', body: JSON.stringify(payload) }),
  createFollowUp: (payload: Record<string, unknown>) => request('/follow-ups', { method: 'POST', body: JSON.stringify(payload) }),
  completeFollowUp: (id: string) => request('/follow-ups/complete', { method: 'POST', body: JSON.stringify({ id }) }),
  qualificationCalls: () => request('/qualification-calls'),
  createQualificationCall: (payload: Record<string, unknown>) => request('/qualification-calls', { method: 'POST', body: JSON.stringify(payload) }),
  retryQualificationCall: (id: string) => request('/qualification-calls/retry', { method: 'POST', body: JSON.stringify({ id }) }),
  meetings: () => request('/meetings'),
  createMeeting: (payload: Record<string, unknown>) => request('/meetings', { method: 'POST', body: JSON.stringify(payload) }),
  rescheduleMeeting: (id: string, startsAt: string) => request('/meetings/reschedule', { method: 'POST', body: JSON.stringify({ id, startsAt }) }),
  sendMeetingReminder: (id: string) => request('/meetings/remind', { method: 'POST', body: JSON.stringify({ id }) }),
  feedback: () => request('/feedback'),
  recordFeedback: (payload: Record<string, unknown>) => request('/feedback', { method: 'POST', body: JSON.stringify(payload) }),
  requestFeedback: (payload: Record<string, unknown>) => request('/feedback/request', { method: 'POST', body: JSON.stringify(payload) }),
  routeFeedback: (id: string) => request('/feedback/route', { method: 'POST', body: JSON.stringify({id}) }),
  agentRuns: () => request('/agent-runs'),
  approvals: () => request('/approvals'),
  decideApproval: (id: string, decision: 'approved' | 'rejected') => request('/approvals/decision', { method: 'POST', body: JSON.stringify({ id, decision }) }),
  createAgent: (payload: Record<string, unknown>) => request('/agents/custom', { method: 'POST', body: JSON.stringify(payload) }),
  testCustomAgent: (payload: Record<string, unknown>) => request('/agents/custom/test', { method: 'POST', body: JSON.stringify(payload) }),
  personalizationRules: () => request('/personalization-rules'),
  createPersonalizationRule: (payload: Record<string, unknown>) => request('/personalization-rules', { method:'POST', body:JSON.stringify(payload) }),
  togglePersonalizationRule: (id:string,enabled:boolean) => request('/personalization-rules/toggle', { method:'POST', body:JSON.stringify({id,enabled}) }),
  decidePersonalization: (payload: Record<string, unknown>) => request('/personalization/decide', { method:'POST', body:JSON.stringify(payload) }),
  personalizationFeedback: (payload: Record<string, unknown>) => request('/personalization/feedback', { method:'POST', body:JSON.stringify(payload) }),
  activationRules: () => request('/activation-rules'),
  createActivationRule: (payload: Record<string, unknown>) => request('/activation-rules', { method: 'POST', body: JSON.stringify(payload) }),
  toggleActivationRule: (id:string,enabled:boolean) => request('/activation-rules/toggle', { method: 'POST', body: JSON.stringify({id,enabled}) }),
  testActivationRule: (id:string,event:Record<string,unknown>) => request('/activation-rules/test', { method: 'POST', body: JSON.stringify({id,event}) }),
  audiences: () => request('/audiences'),
  audienceSchedules: () => request('/audience-schedules'),
  saveAudienceSchedule: (id:string,cadence:string,enabled=true,maxStalenessSeconds?:number) => request('/audience-schedules',{method:'POST',body:JSON.stringify({id,cadence,enabled,maxStalenessSeconds})}),
  previewAudience: (payload: Record<string, unknown>) => request('/audiences/preview', { method: 'POST', body: JSON.stringify(payload) }),
  createAudience: (payload: Record<string, unknown>) => request('/audiences', { method: 'POST', body: JSON.stringify(payload) }),
  materializeAudience: (id: string) => request('/audiences/materialize', { method: 'POST', body: JSON.stringify({id}) }),
  syncAudience: (id: string, provider?: string) => request('/audiences/sync', { method: 'POST', body: JSON.stringify({id,provider}) }),
  activationRuns: () => request('/activation-runs'),
  behavior: () => request('/behavior'),
  feed: () => request('/feed'),
  addFeedAttribute: (payload: Record<string, unknown>) => request('/feed/attributes', { method: 'POST', body: JSON.stringify(payload) }),
  saveFeedMapping: (payload: Record<string, unknown>) => request('/feed/mappings', { method: 'POST', body: JSON.stringify(payload) }),
  toggleFeedMapping: (id:string,enabled:boolean) => request('/feed/mappings/toggle', { method: 'POST', body: JSON.stringify({id,enabled}) }),
  previewFeed: (destination:string) => request('/feed/preview', { method: 'POST', body: JSON.stringify({destination}) }),
  solutions: () => request('/solutions'),
  askAce: (question: string) => request('/ask-ace', { method: 'POST', body: JSON.stringify({ question }) }),
  connectIntegration: (connector: string) => request<any>('/integrations/connect', { method: 'POST', body: JSON.stringify({ connector }) }),
  completeIntegrationOAuth: (state: string, code: string) => request('/integrations/oauth/callback', { method: 'POST', body: JSON.stringify({ state, code }) }),
  disconnectIntegration: (connector: string) => request('/integrations/disconnect', { method: 'POST', body: JSON.stringify({ connector }) }),
  signalDeliveries: () => request('/signal-deliveries'),
  dispatchSignal: (payload: Record<string, unknown>) => request('/signal-deliveries/dispatch', { method: 'POST', body: JSON.stringify(payload) }),
  retrySignalDelivery: (id: string) => request('/signal-deliveries/retry', { method: 'POST', body: JSON.stringify({ id }) }),
  replaySignalDlq: () => request('/signal-deliveries/replay-dlq', { method: 'POST', body: JSON.stringify({}) }),
  whatsappMessages: () => request('/whatsapp/messages'),
  sendWhatsAppMessage: (payload: Record<string, unknown>) => request('/whatsapp/messages', { method: 'POST', body: JSON.stringify(payload) }),
  connectorHealth: () => request('/connector-health'),
  monitoring: () => request('/monitoring'),
  consentStats: () => request('/consent/stats'),
  privacyRequests: () => request('/privacy/requests'),
  privacyExport: (selectorType:string,selector:string) => request('/privacy/export',{method:'POST',body:JSON.stringify({selectorType,selector})}),
  privacyDelete: (selectorType:string,selector:string) => request('/privacy/delete',{method:'POST',body:JSON.stringify({selectorType,selector,confirm:'DELETE'})}),
  privacyRetentionPurge: (dryRun=true) => request('/privacy/retention/purge',{method:'POST',body:JSON.stringify({dryRun})}),
  billingUsage: () => request('/billing/usage'),
  subscription: () => request('/billing/subscription'),
  createBillingCheckout: (planCode: string) => request('/billing/checkout', { method: 'POST', body: JSON.stringify({planCode}) }),
  createBillingPortal: () => request('/billing/portal', { method: 'POST', body: JSON.stringify({}) }),
  updateEntitlements: (payload: Record<string, unknown>) => request('/billing/entitlements', { method: 'POST', body: JSON.stringify(payload) }),
  alerts: () => request('/alerts'),
  resolveAlert: (id: string) => request('/alerts/resolve', { method: 'POST', body: JSON.stringify({ id }) }),
  signalConsole: () => request('/signal-console'),
  securityPosture: () => request('/security-posture'),
  resources: () => request('/resources'),
  caseStudies: () => request('/case-studies'),
  aiAction: () => request('/ai-action'),
  sourceNotes: () => request('/source-notes'),
  eventTemplates: () => request('/event-templates'),
  monitoringRules: () => request('/monitoring-rules'),
  saveMonitoringRule: (payload: Record<string, unknown>) => request('/monitoring-rules', { method: 'POST', body: JSON.stringify(payload) }),
  saveConsent: (prefs: Record<string, boolean>) => request('/consent-preferences', { method: 'POST', body: JSON.stringify(prefs) }),
  me: () => request('/auth/me'),
  members: () => request('/members'),
  inviteMember: (payload: {email:string;role:string}) => request('/members/invite', { method: 'POST', body: JSON.stringify(payload) }),
  changeMemberRole: (memberId:string,role:string) => request('/members/role', { method: 'POST', body: JSON.stringify({memberId,role}) }),
  deactivateMember: (memberId:string) => request('/members/deactivate', { method: 'POST', body: JSON.stringify({memberId}) }),
  activateInvitation: (inviteToken:string,name:string,password:string) => request('/invitations/activate', { method: 'POST', body: JSON.stringify({inviteToken,name,password}) }),
  settings: () => request('/settings'),
  workspaces: () => request('/workspaces'),
  createWorkspace: (payload: Record<string, unknown>) => request('/workspaces', { method: 'POST', body: JSON.stringify(payload) }),
  saveSettings: (payload: Record<string, unknown>) => request('/settings', { method: 'POST', body: JSON.stringify(payload) }),
  webhookDeliveries: () => request('/webhooks/deliveries'),
  webhookEndpoints: () => request('/webhooks/endpoints'),
  createWebhookEndpoint: (payload: Record<string, unknown>) => request('/webhooks/endpoints', { method: 'POST', body: JSON.stringify(payload) }),
  retryWebhook: (id: string) => request('/webhooks/retry', { method: 'POST', body: JSON.stringify({ id }) }),
  rotateWebhookSecret: () => request('/webhooks/secret/rotate', { method: 'POST', body: JSON.stringify({}) }),
  auditLog: () => request('/audit-log'),
  createApiKey: () => request('/api-keys', { method: 'POST', body: JSON.stringify({ name: 'workspace' }) }),
}
