import http from 'node:http'
import {parseQaWorkbook} from './qa-excel-fixtures.mjs'
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { URL } from 'node:url'
import { createToken, verifyToken, hashPassword, hasPermission, createRateLimiter, securityHeaders, resolveCorsOrigin } from './security.mjs'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from './store.mjs'
import { connectorVaultReady, decryptSecret, encryptSecret } from './vault.mjs'
import { getJob, queueAvailable, queueStats, requestJobCancellation } from './queue.mjs'
import { attributionStats, captureClickSession, closeAttributionStore, recordAssistedEvent, reconcileAttribution } from './attribution-store.mjs'
import { audienceOpsStats, closeLeadOps, leadOpsStats, upsertLeadProfile } from './lead-ops.mjs'
import { closeAgentOrchestrator, completeFollowUp as persistCompleteFollowUp, createAgentRun, createFollowUp, createMeeting, followUpStats, getMeeting, listAgentRuns, listFeedback as listPersistedFeedback, listFollowUps as listPersistedFollowUps, listMeetings as listPersistedMeetings, listRoutingDecisions, recordFeedback, rescheduleMeeting, routeLead, updateAgentRun } from './agent-orchestrator.mjs'
import { closeCustomIntegrations, createCustomIntegration as persistCustomIntegration, testCustomIntegration as runCustomIntegrationTest } from './custom-integrations.mjs'
import { closeObservability, listAlerts as listLiveAlerts, monitoringSnapshot, recordApiTelemetry, resolveAlert as resolveLiveAlert } from './observability.mjs'
import { closeEntitlements, finalizeReservation, resourceCountAllowed, subscriptionSummary } from './entitlements.mjs'
import { closeBillingProvider, verifyStripeWebhook } from './billing-provider.mjs'
import { closeConsentStore, consentAllows, consentStats, getConsent, saveConsent } from './consent.mjs'
import { closePrivacyOps } from './privacy-ops.mjs'
import { closeAudienceScheduler, listAudienceRefreshRuns, listAudienceSchedules, saveAudienceSchedule } from './audience-scheduler.mjs'
import { closeCohortAnalytics, cohortAnalytics } from './cohort-analytics.mjs'
import {connectorReadCatalog,listConnectorSyncRuns,connectorDataSummary,listConnectorSyncSchedules,saveConnectorSyncSchedule,upsertCampaignDailyFact} from './connector-ingestion.mjs'
import {appendTrackedEvent,listTrackedEvents,trackedEventStats} from './tracked-events.mjs'
import {trackingInputError} from './tracking-input.mjs'
import { closeReportScheduler, listReportDeliveries, listReportSchedules, queueReportNow, reportMailConfigured, saveReportSchedule } from './report-scheduler.mjs'
import { closeEventRules, createEventRule, evaluateEventRules, eventRuleStats, listEventRuleRuns, listEventRules, markEventRuleActivation, setEventRuleEnabled } from './event-rules.mjs'
import { publicNavigation, publicIndustries, publicAgents, publicIntegrations, publicChallenges, publicCaseStudies, publicResources, publicResourceCenter } from './public-content.mjs'
import { parseWhatsAppWebhook, resolveWhatsAppWorkspace, sendWhatsAppMessage, verifyWhatsAppWebhookChallenge, verifyWhatsAppWebhookSignature } from './whatsapp-cloud.mjs'
import { normalizeCallEvent, resolveCallWorkspace, verifyCallWebhook } from './call-events.mjs'
import { createCalendarEvent, updateCalendarEvent } from './calendar-provider.mjs'
import {bindActorToRequestContext,createRequestContext} from './platform/request-context.mjs'
import {globalAdmission} from './platform/admission-control.mjs'
import {assertActorWorkspace,requestedWorkspaceId,tenantExecutionScope} from './platform/tenant-context.mjs'
import {appendAuditRecord,listAuditRecords} from './platform/audit-store.mjs'
import {permissionForRequest as centralizedPermissionForRequest} from './platform/access-policy.mjs'
import {assertWorkspaceMembership,seedWorkspaceCreator,listActorWorkspaces} from './platform/workspace-access.mjs'
import {validateOutboundDestination} from './platform/egress-policy.mjs'
import {markInboxProcessed,recordInboxEvent} from './platform/reliability-store.mjs'
import {createWebhookSubscription,createWebhookTestDelivery,listWebhookDeliveries,listWebhookDeliveryAttempts,listWebhookSubscriptions,replayWebhookDelivery,setWebhookSubscriptionStatus} from './platform/webhook-delivery-store.mjs'
import { handleWorkflowRoutes } from './http/routes/workflow-routes.mjs'
import { handlePlatformRoutes } from './http/routes/platform-routes.mjs'
import { handleEngagementRoutes } from './http/routes/engagement-routes.mjs'
import { handleAdminRoutes } from './http/routes/admin-routes.mjs'
import { handlePublicRoutes } from './http/routes/public-routes.mjs'
import { handleIdentityRoutes } from './http/routes/identity-routes.mjs'
import { handleIntegrationRoutes } from './http/routes/integration-routes.mjs'
import { handleDataQualityRoutes } from './http/routes/data-quality-routes.mjs'
import { handleDataOperationsRoutes } from './http/routes/data-operations-routes.mjs'
import { handleAttributionRoutes } from './http/routes/attribution-routes.mjs'
import { handleLeadOperationsRoutes } from './http/routes/lead-operations-routes.mjs'
import { handleAudienceRoutes } from './http/routes/audience-routes.mjs'
import { handleDeliveryRoutes } from './http/routes/delivery-routes.mjs'
import { handleComplianceRoutes } from './http/routes/compliance-routes.mjs'
import { handleConsoleRoutes } from './http/routes/console-routes.mjs'
import { handleWorkspaceOperationsRoutes } from './http/routes/workspace-operations-routes.mjs'
import {runtimeGuardForRequest} from './platform/runtime-config-runtime.mjs'
import {beginProcessDrain,livenessState,markStartupComplete,readinessState,startupState} from './platform/process-health.mjs'
import {runtimeRoleAllows,runtimeRolePolicy} from './platform/runtime-role.mjs'
import {assertWorkspaceCell} from './platform/cell-placement.mjs'
import {evaluateAccessPermission} from '../modules/authorization/src/application/queries/evaluate-access/evaluate-access.handler.mjs'
import {handleUpdateWorkspace} from '../modules/workspaces/src/application/commands/update-workspace/update-workspace.handler.mjs'
import {handleRemoveMember} from '../modules/memberships/src/application/commands/remove-member/remove-member.handler.mjs'
import {handleConnectProvider} from '../modules/integrations/src/application/commands/connect-provider/connect-provider.handler.mjs'
import {handleReconcileIntegration} from '../modules/integrations/src/application/commands/reconcile-sync/reconcile-sync.handler.mjs'
import {handleReplayWebhookDelivery} from '../modules/webhooks/src/application/commands/replay-delivery/replay-delivery.handler.mjs'
import {handleReserveQuota} from '../modules/usage/src/application/commands/reserve-quota/reserve-quota.handler.mjs'
import {handleReconcilePayment} from '../modules/billing/src/application/commands/reconcile-payment/reconcile-payment.handler.mjs'
import {handleSubmitJob} from '../modules/jobs/src/application/commands/submit-job/submit-job.handler.mjs'
import {handleRunReport} from '../modules/reporting/src/application/commands/run-report/run-report.handler.mjs'
import {handleStartLogin} from '../modules/identity/src/application/commands/start-login/start-login.handler.mjs'
import {handleRecoverAccount} from '../modules/identity/src/application/commands/recover-account/recover-account.handler.mjs'
import {handleUpdateOrganization} from '../modules/organizations/src/application/commands/update-organization/update-organization.handler.mjs'
import {handleSearchAudit} from '../modules/audit/src/application/queries/search-audit/search-audit.handler.mjs'
import {handleExportAudit} from '../modules/audit/src/application/commands/export-audit/export-audit.handler.mjs'
import { handleMcpRoutes } from './http/routes/mcp-routes.mjs'

const runtimeRole=runtimeRolePolicy()

const CONNECTOR_PROVIDERS={
  'Google Ads':{
    provider:'google',
    authType:'oauth2',
    clientId:process.env.GOOGLE_OAUTH_CLIENT_ID||'',
    clientSecret:process.env.GOOGLE_OAUTH_CLIENT_SECRET||'',
    authorizeUrl:'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl:'https://oauth2.googleapis.com/token',
    scopes:['openid','email','https://www.googleapis.com/auth/adwords']
  },
  'Meta Ads':{
    provider:'meta',
    authType:'oauth2',
    clientId:process.env.META_OAUTH_CLIENT_ID||'',
    clientSecret:process.env.META_OAUTH_CLIENT_SECRET||'',
    authorizeUrl:'https://www.facebook.com/v23.0/dialog/oauth',
    tokenUrl:'https://graph.facebook.com/v23.0/oauth/access_token',
    scopes:['ads_management','ads_read','business_management']
  },
  'Microsoft Ads / Bing Ads':{provider:'microsoft_ads',authType:'oauth2',clientId:process.env.MICROSOFT_ADS_OAUTH_CLIENT_ID||'',clientSecret:process.env.MICROSOFT_ADS_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',tokenUrl:'https://login.microsoftonline.com/common/oauth2/v2.0/token',scopes:['openid','offline_access','https://ads.microsoft.com/msads.manage'],tokenScopes:['https://ads.microsoft.com/msads.manage','offline_access']},
  'LinkedIn Ads':{provider:'linkedin',authType:'oauth2',clientId:process.env.LINKEDIN_OAUTH_CLIENT_ID||'',clientSecret:process.env.LINKEDIN_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://www.linkedin.com/oauth/v2/authorization',tokenUrl:'https://www.linkedin.com/oauth/v2/accessToken',scopes:['rw_conversions','r_ads','r_ads_reporting']},
  'HubSpot':{provider:'hubspot',authType:'oauth2',clientId:process.env.HUBSPOT_OAUTH_CLIENT_ID||'',clientSecret:process.env.HUBSPOT_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://app.hubspot.com/oauth/authorize',tokenUrl:'https://api.hubapi.com/oauth/2026-03/token',scopes:['crm.objects.contacts.read','crm.objects.contacts.write','crm.objects.companies.read','crm.objects.deals.read']},
  'Salesforce':{provider:'salesforce',authType:'oauth2',clientId:process.env.SALESFORCE_OAUTH_CLIENT_ID||'',clientSecret:process.env.SALESFORCE_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://login.salesforce.com/services/oauth2/authorize',tokenUrl:'https://login.salesforce.com/services/oauth2/token',scopes:['api','refresh_token']},
  'Zoho CRM':{provider:'zoho',authType:'oauth2',clientId:process.env.ZOHO_OAUTH_CLIENT_ID||'',clientSecret:process.env.ZOHO_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://accounts.zoho.com/oauth/v2/auth',tokenUrl:'https://accounts.zoho.com/oauth/v2/token',scopes:['ZohoCRM.modules.ALL','ZohoCRM.settings.ALL']},
  'GA4':{provider:'google',authType:'oauth2',clientId:process.env.GOOGLE_OAUTH_CLIENT_ID||'',clientSecret:process.env.GOOGLE_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://accounts.google.com/o/oauth2/v2/auth',tokenUrl:'https://oauth2.googleapis.com/token',scopes:['openid','email','https://www.googleapis.com/auth/analytics.readonly']},
  'Google Calendar':{provider:'google',authType:'oauth2',clientId:process.env.GOOGLE_OAUTH_CLIENT_ID||'',clientSecret:process.env.GOOGLE_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://accounts.google.com/o/oauth2/v2/auth',tokenUrl:'https://oauth2.googleapis.com/token',scopes:['openid','email','https://www.googleapis.com/auth/calendar.events']},
  'WhatsApp':{provider:'meta',authType:'oauth2',clientId:process.env.META_OAUTH_CLIENT_ID||'',clientSecret:process.env.META_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://www.facebook.com/v23.0/dialog/oauth',tokenUrl:'https://graph.facebook.com/v23.0/oauth/access_token',scopes:['whatsapp_business_management','whatsapp_business_messaging']}
}
const SERVER_SECRET_CONNECTORS={
  'TikTok Ads':{
    provider:'tiktok',
    authType:'server_secret',
    capability:'native_server_capi',
    fields:[
      {key:'pixel_id',label:'Pixel / Event Source ID',secret:false},
      {key:'advertiser_id',label:'TikTok advertiser ID',secret:false},
      {key:'access_token',label:'Events / Reporting API access token',secret:true}
    ]
  },
  'Pinterest':{
    provider:'pinterest',
    authType:'server_secret',
    capability:'native_server_capi',
    fields:[
      {key:'ad_account_id',label:'Pinterest ad account ID',secret:false},
      {key:'access_token',label:'Conversions API access token',secret:true}
    ]
  },
  'Microsoft Ads CAPI':{
    provider:'microsoft_ads_capi',
    authType:'server_secret',
    capability:'native_server_capi',
    fields:[
      {key:'tag_id',label:'Microsoft UET tag ID',secret:false},
      {key:'capi_token',label:'Microsoft UET CAPI token',secret:true}
    ]
  },
  'X':{
    provider:'x_ads',
    authType:'server_secret',
    capability:'native_server_capi',
    fields:[
      {key:'pixel_id',label:'X Pixel ID',secret:false},
      {key:'access_token',label:'Conversion API access token',secret:true}
    ]
  }
}
const connectorTokenHealth=async(workspaceId)=>{
  const state=await getState()
  const connections=state.connectorConnections||[]
  const credentials=state.connectorCredentials||[]
  return connections.map(connection=>{
    const credential=credentials.find(x=>x.connector===connection.connector)
    const expiresAt=credential?.expiresAt||connection.expiresAt||null
    const expiresInSeconds=expiresAt?Math.floor((Date.parse(expiresAt)-Date.now())/1000):null
    const needsRefresh=expiresInSeconds!==null&&expiresInSeconds<=15*60
    const expired=expiresInSeconds!==null&&expiresInSeconds<=0
    return {
      connector:connection.connector,
      expiresAt,
      expiresInSeconds,
      needsRefresh,
      expired,
      status:expired?'expired':needsRefresh?'refresh_required':connection.status||'connected'
    }
  })
}

const refreshConnectorCredential=async(workspaceId,connector)=>{
  const provider=CONNECTOR_PROVIDERS[connector]
  if(!provider) throw new Error('connector does not support OAuth refresh')
  if(!provider.clientId||!provider.clientSecret) throw new Error('connector OAuth credentials are not configured')
  if(!connectorVaultReady()) throw new Error('connector credential vault is not configured')
  const state=await getState()
  const credential=(state.connectorCredentials||[]).find(x=>x.connector===connector)
  if(!credential?.encrypted) throw new Error(connector+' credential is not connected')
  const current=decryptSecret(credential.encrypted)
  const refreshToken=current?.refresh_token
  if(!refreshToken) throw new Error(connector+' did not provide a refresh token; reconnect the integration')
  const form=new URLSearchParams({
    grant_type:'refresh_token',
    refresh_token:String(refreshToken),
    client_id:provider.clientId,
    client_secret:provider.clientSecret
  })
  if(Array.isArray(provider.tokenScopes)&&provider.tokenScopes.length)form.set('scope',provider.tokenScopes.join(' '))
  const response=await fetch(provider.tokenUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form})
  const body=await response.json().catch(()=>({}))
  if(!response.ok||!body.access_token) throw new Error('OAuth token refresh failed: '+response.status)
  const merged={...current,...body,refresh_token:body.refresh_token||refreshToken}
  const now=new Date().toISOString()
  const expiresAt=body.expires_in?new Date(Date.now()+Number(body.expires_in)*1000).toISOString():credential.expiresAt||null
  await mutateState(s=>{
    const saved=(s.connectorCredentials||[]).find(x=>x.connector===connector)
    if(saved){saved.encrypted=encryptSecret(merged);saved.expiresAt=expiresAt;saved.updatedAt=now}
    const connection=(s.connectorConnections||[]).find(x=>x.connector===connector)
    if(connection){connection.status='connected';connection.expiresAt=expiresAt;connection.updatedAt=now}
    s.audit=s.audit||[]
    s.audit.unshift({id:randomUUID(),action:'connector.token_refreshed',entityId:connector,provider:provider.provider,at:now})
    s.audit=s.audit.slice(0,1000)
  })
  return {refreshed:true,expiresAt}
}

const CONNECTOR_REDIRECT_URI=process.env.CONNECTOR_OAUTH_REDIRECT_URI||''
const AUTH_GOOGLE_REDIRECT_URI=process.env.AUTH_GOOGLE_REDIRECT_URI||''
const AUTH_GOOGLE_SUCCESS_URL=process.env.AUTH_GOOGLE_SUCCESS_URL||''
const AUTH_PUBLIC_APP_URL=process.env.AUTH_PUBLIC_APP_URL||''
const CONNECTOR_SUCCESS_URL=process.env.CONNECTOR_OAUTH_SUCCESS_URL||''
const CONNECTOR_STATE_SECRET=process.env.CONNECTOR_OAUTH_STATE_SECRET||process.env.JWT_SECRET||'dev-only-change-me'
const base64url=value=>Buffer.from(value).toString('base64url')
const hashOAuthState=value=>createHash('sha256').update(String(value)).digest('hex')
const createOAuthState=workspaceId=>{
  const payload=Buffer.from(JSON.stringify({workspaceId,nonce:randomBytes(24).toString('base64url'),iat:Date.now()})).toString('base64url')
  const signature=createHmac('sha256',CONNECTOR_STATE_SECRET).update(payload).digest('base64url')
  return payload+'.'+signature
}
const parseOAuthState=value=>{
  try{
    const [payload,signature]=String(value||'').split('.')
    if(!payload||!signature) return null
    const expected=createHmac('sha256',CONNECTOR_STATE_SECRET).update(payload).digest()
    const actual=Buffer.from(signature,'base64url')
    if(actual.length!==expected.length||!timingSafeEqual(actual,expected)) return null
    const decoded=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'))
    if(!decoded?.workspaceId||!/^[A-Za-z0-9_-]{1,64}$/.test(decoded.workspaceId)) return null
    if(!Number.isFinite(decoded.iat)||Date.now()-decoded.iat>15*60*1000) return null
    return decoded
  }catch{return null}
}
const createPkce=()=>{
  const verifier=base64url(randomBytes(48))
  const challenge=createHash('sha256').update(verifier).digest('base64url')
  return {verifier,challenge}
}

const PORT = Number(process.env.PORT || 3001)
const IS_PROD = process.env.NODE_ENV === 'production'
const AUTH_REQUIRED = process.env.AUTH_REQUIRED === 'true' || IS_PROD
const JWT_SECRET = process.env.JWT_SECRET || (IS_PROD ? '' : 'dev-only-change-me')
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ''
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || ''
const OBJECT_WORKER_TOKEN = process.env.OBJECT_WORKER_TOKEN || ''
const allowedOrigins = new Set((process.env.CORS_ALLOWED_ORIGINS || (IS_PROD ? '' : '*')).split(',').map(x=>x.trim()).filter(Boolean))
if (IS_PROD && (!JWT_SECRET || JWT_SECRET.length < 32)) throw new Error('JWT_SECRET must be at least 32 characters in production')
if (IS_PROD && CONNECTOR_STATE_SECRET.length < 32) throw new Error('CONNECTOR_OAUTH_STATE_SECRET must be at least 32 characters in production')
if (IS_PROD && (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH)) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD_HASH are required in production')
if (IS_PROD && allowedOrigins.size===0) throw new Error('CORS_ALLOWED_ORIGINS is required in production')
// The local workspace mounts many feature panels at once, so a shared loopback-IP
// limit of 240 can lock the developer out during a normal initial render. Keep the
// production default strict while allowing the full local dashboard to bootstrap.
const defaultRateLimitPerMinute=IS_PROD?240:5_000
const limitRequest=createRateLimiter({windowMs:60_000,max:Number(process.env.RATE_LIMIT_PER_MINUTE||defaultRateLimitPerMinute)})

const integrations = [
  'Ace Data Hub','Zoho CRM','Salesforce','LeadSquared','Meritto','HubSpot','HighLevel','Microsoft Dynamics 365','Freshsales','Custom CRM',
  'WhatsApp','Bitespeed','AiSensy','Gupshup','WATI','MoEngage','CleverTap','Mailchimp','Klaviyo','Brevo','Twilio SendGrid',
  'Exotel','Knowlarity','Tata Tele','MyOperator','Twilio',
  'Shopify','WooCommerce','Magento','WordPress','Typeform','React App','Custom Backend',
  'BigQuery','Snowflake','MongoDB','Oracle DB','Google Cloud Storage','Amazon S3',
  'Google Ads','Meta Ads','ChatGPT Ads','LinkedIn Ads','Microsoft Ads / Bing Ads','Microsoft Ads CAPI','X','Pinterest','TikTok Ads','Yahoo Ads','Taboola','Spotify Ads','Snapchat Ads','Criteo','DV360','Google Merchant Center','Meta Lead Ads','Meta CAPI','Meta Catalog','GA4','Google Calendar',
  'Apollo','Lusha','Calixa'
]
const agents = ['Meta Advanced CAPI','Google ECL / OCI','ChatGPT Ads CAPI','Call Tracking Events','Custom Integration','Lead Grading','CRM Enrichment','Voice Lead Qualification','Voice Scheduler','Meeting Reminder','Feedback Agent','Lead Reactivation','Attribution Agent','Deep Linking Agent','Fraud Detection Agent','Customer Journey Agent','Audiences Agent','Event Agent','Ask Ace']
const agentCatalog={
  'Meta Advanced CAPI':{category:'Lead Quality · Signal Return',description:'Send deduplicated server-side business outcomes to Meta Ads.',operationTab:'Delivery',action:'Operate Meta signal delivery',prerequisites:['Meta Ads connection','First-party identity','Business event']},
  'Google ECL / OCI':{category:'Lead Quality · Signal Return',description:'Return enhanced and offline conversion outcomes to Google Ads.',operationTab:'AdSync',action:'Operate Google conversion signals',prerequisites:['Google Ads connection','GCLID/GBRAID/WBRAID or hashed identity','Conversion action']},
  'ChatGPT Ads CAPI':{category:'Lead Quality · Signal Return',description:'Send server-side conversion events to ChatGPT Ads with oppref matching and event-ID deduplication.',operationTab:'ChatGPT Ads',action:'Operate ChatGPT Ads conversion measurement',prerequisites:['OPENAI_CONVERSIONS_API_KEY','OPENAI_ADS_PIXEL_ID','Consent-aware first-party conversion event']},
  'Call Tracking Events':{category:'Lead Quality · Signal Return',description:'Capture signed telephony events and attribute calls to acquisition context.',operationTab:'Calls',action:'Open call operations',prerequisites:['Call webhook provider','Customer or click identity']},
  'Custom Integration':{category:'Lead Quality · Signal Return',description:'Build tested adapters for proprietary CRM, backend, webhook or data systems.',operationTab:'Integrations',action:'Configure integrations',prerequisites:['Endpoint or source system','Authentication method','Field mapping']},
  'Lead Grading':{category:'Conversion · Handoff',description:'Score and prioritize persisted leads from CRM, journey and behavioral evidence.',operationTab:'Lead Grading',action:'Open lead grading',prerequisites:['Lead profiles','Journey or CRM evidence']},
  'CRM Enrichment':{category:'Conversion · Handoff',description:'Give sales acquisition, journey, behavior, call and messaging context before outreach.',operationTab:'Enrich',action:'Open enrichment',prerequisites:['Lead profile','CRM connection for writeback']},
  'Voice Lead Qualification':{category:'Conversion · Handoff',description:'Queue provider-backed qualification calls and preserve execution state.',operationTab:'Calls',action:'Open qualification calls',prerequisites:['Voice qualification provider','Lead phone','Approval policy']},
  'Voice Scheduler':{category:'Conversion · Handoff',description:'Create consultations from qualified leads and synchronize calendar context.',operationTab:'Meetings',action:'Open scheduling',prerequisites:['Qualified lead','Calendar or meeting provider']},
  'Meeting Reminder':{category:'Conversion · Handoff',description:'Send provider-backed reminders and persist reminder execution state.',operationTab:'Meetings',action:'Open reminders',prerequisites:['Scheduled meeting','Reminder provider']},
  'Feedback Agent':{category:'Conversion · Handoff',description:'Collect post-interaction feedback and surface objection themes.',operationTab:'Feedback',action:'Open feedback operations',prerequisites:['Customer interaction','Feedback provider or manual record']},
  'Lead Reactivation':{category:'Conversion · Recovery',description:'Detect renewed high-intent behavior from dormant leads and turn it into governed re-engagement work.',operationTab:'Follow-ups',action:'Open reactivation queue',prerequisites:['Persisted lead activity','Recent first-party intent event']},
  'Attribution Agent':{category:'Visibility & Attribution',description:'Inspect persisted first-touch, last-touch and assisted conversion evidence across stitched journeys.',operationTab:'Attribution',action:'Open attribution',prerequisites:['Tracked acquisition touch','Assisted conversion evidence']},
  'Deep Linking Agent':{category:'Tracking & Journey',description:'Create and operate governed deep-link routes with fallback destinations and activation evidence.',operationTab:'Deep Links',action:'Open deep links',prerequisites:['Destination route','Web fallback']},
  'Fraud Detection Agent':{category:'Tracking & Quality',description:'Surface suspicious identity and traffic patterns for review or blocking without silently discarding evidence.',operationTab:'Fraud',action:'Open fraud detection',prerequisites:['Tracked events','Identity or traffic evidence']},
  'Customer Journey Agent':{category:'Visibility & Attribution',description:'Explore stitched chronology across acquisition, CRM, calls, meetings, follow-ups and revenue outcomes.',operationTab:'Journeys',action:'Open customer journeys',prerequisites:['Persisted lead or customer identity','Journey events']},
  'Audiences Agent':{category:'Activation',description:'Build, materialize, suppress and sync first-party audiences from governed profile and behavioral evidence.',operationTab:'Audiences',action:'Open audience management',prerequisites:['Lead profiles','Consent-aware destination']},
  'Event Agent':{category:'Tracking & Activation',description:'Define safe business-event transformations and activate approved derived signals to destinations.',operationTab:'Events',action:'Open event manager',prerequisites:['Source event','Business condition']},
  'Ask Ace':{category:'Visibility & Attribution',description:'Query stitched journey, attribution, lead quality, audience and signal evidence in natural language.',operationTab:'Ask Ace',action:'Ask workspace questions',prerequisites:['Workspace evidence']}
}
const trackedEventsByWorkspace = new Map()

const leadReactivationCandidates=(profiles=[],events=[],followUps=[],options={})=>{
  const dormantDays=Math.max(7,Math.min(365,Number(options.dormantDays||30)))
  const recentDays=Math.max(1,Math.min(30,Number(options.recentDays||7)))
  const now=Date.now()
  const dormantCutoff=now-dormantDays*24*60*60*1000
  const recentCutoff=now-recentDays*24*60*60*1000
  const highIntent=/pricing|checkout|book|consult|apply|purchase|revenue|qualified|enrol|demo|contact_sales/i
  const openReactivation=new Set(
    (followUps||[])
      .filter(x=>x.status==='open'&&/reactivat/i.test(String(x.reason||'')))
      .map(x=>String(x.lead_ref||'').toLowerCase())
  )
  const candidates=[]
  for(const lead of profiles||[]){
    const leadRef=String(lead.external_lead_id||lead.name||lead.id||'')
    if(!leadRef||openReactivation.has(leadRef.toLowerCase()))continue
    const lastRaw=lead.journey?.previousLastActivity||lead.journey?.lastActivity||lead.journey?.last_activity||null
    if(!lastRaw)continue
    const lastTime=Date.parse(lastRaw)
    if(!Number.isFinite(lastTime)||lastTime>dormantCutoff)continue
    const matches=(events||[]).filter(event=>{
      const at=Date.parse(event.receivedAt||event.occurredAt||event.timestamp||'')
      if(!Number.isFinite(at)||at<recentCutoff)return false
      const name=String(event.event||event.eventType||event.name||'')
      if(!highIntent.test(name))return false
      const customer=String(event.customerId||event.customer_id||'')
      const device=String(event.deviceId||event.device_id||'')
      return customer===String(lead.external_lead_id||'')||(lead.device_id&&device===String(lead.device_id))
    }).sort((a,b)=>Date.parse(b.receivedAt||b.occurredAt||b.timestamp||'')-Date.parse(a.receivedAt||a.occurredAt||a.timestamp||''))
    const event=matches[0]
    if(!event)continue
    const eventAt=event.receivedAt||event.occurredAt||event.timestamp
    candidates.push({
      leadRef,
      name:lead.name||leadRef,
      grade:lead.grade||null,
      score:Number(lead.score||0),
      source:lead.source||null,
      campaign:lead.campaign||null,
      lastActivity:new Date(lastTime).toISOString(),
      dormantDays:Math.max(0,Math.floor((now-lastTime)/(24*60*60*1000))),
      renewedEvent:String(event.event||event.eventType||event.name||'high_intent_activity'),
      renewedAt:eventAt,
      renewedSource:event.utm_source||event.source||event.channel||'First-party',
      renewedCampaign:event.utm_campaign||event.campaign||null,
      reason:'Lead reactivation · renewed intent after '+Math.max(0,Math.floor((now-lastTime)/(24*60*60*1000)))+' dormant days'
    })
  }
  return candidates.sort((a,b)=>Date.parse(b.renewedAt)-Date.parse(a.renewedAt))
}

const sha256Normalized=value=>createHash('sha256').update(String(value||'').trim().toLowerCase()).digest('hex')
const sha256Phone=value=>createHash('sha256').update(String(value||'').replace(/\D/g,'')).digest('hex')
const buildSignalReplayPayload=(body,item={})=>{
  const payload={
    deliveryId:item.id||body.deliveryId||null,
    event:String(item.event||body.event||''),
    destination:String(item.destination||body.destination||''),
    idempotencyKey:item.idempotencyKey||body.idempotencyKey||null,
    customerId:item.customerId||body.customerId||null,
    externalEventId:item.externalEventId||body.externalEventId||null,
    occurredAt:body.occurredAt||null,
    value:body.value??null,
    currency:body.currency||null,
    orderId:body.orderId||null,
    gclid:body.gclid||null,
    gbraid:body.gbraid||null,
    wbraid:body.wbraid||null,
    msclkid:body.msclkid||body.data?.msclkid||null,
    epik:body.epik||body.data?.epik||body.data?.click_id||null,
    ttclid:body.ttclid||body.data?.ttclid||null,
    ttp:body.ttp||body.data?.ttp||null,
    twclid:body.twclid||body.data?.twclid||null,
    twpid:body.twpid||body.data?.twpid||null,
    fbc:body.fbc||null,
    fbp:body.fbp||null,
    oppref:body.oppref||body.openaiClickRef||null,
    obref:body.obref||body.openaiBrowserRef||null,
    openaiEventType:body.openaiEventType||null,
    openaiCustomEventName:body.openaiCustomEventName||null,
    openaiAmountMinor:body.openaiAmountMinor??body.data?.openaiAmountMinor??null,
    planId:body.planId||body.data?.planId||null,
    contents:Array.isArray(body.contents)?body.contents:(Array.isArray(body.data?.contents)?body.data.contents:null),
    optOut:body.optOut,
    country:body.country||null,
    city:body.city||null,
    region:body.region||null,
    postalCode:body.postalCode||body.postal_code||null,
    ipAddress:body.ipAddress||body.data?.ipAddress||null,
    userAgent:body.userAgent||body.data?.userAgent||null,
    anonymousId:body.anonymousId||body.visitorId||body.data?.anonymousId||body.data?.visitorId||null,
    externalId:body.externalId||body.data?.externalId||null,
    idfa:body.idfa||body.data?.idfa||null,
    androidAdvertisingId:body.androidAdvertisingId||body.data?.androidAdvertisingId||null,
    linkedinFirstPartyAdsTrackingUuid:body.linkedinFirstPartyAdsTrackingUuid||body.liFatId||body.data?.linkedinFirstPartyAdsTrackingUuid||body.data?.liFatId||null,
    linkedinConversionUrn:body.linkedinConversionUrn||body.data?.linkedinConversionUrn||null,
    microsoftUetTagId:body.microsoftUetTagId||body.data?.microsoftUetTagId||null,
    pinterestAdvertiserId:body.pinterestAdvertiserId||body.data?.pinterestAdvertiserId||null,
    tiktokPixelId:body.tiktokPixelId||body.data?.tiktokPixelId||null,
    tiktokEventSource:body.tiktokEventSource||body.data?.tiktokEventSource||null,
    xPixelId:body.xPixelId||body.data?.xPixelId||null,
    xEventId:body.xEventId||body.data?.xEventId||null,
    xEventName:body.xEventName||body.data?.xEventName||null,
    openaiPixelId:body.openaiPixelId||null,
    validateOnly:body.validateOnly===true,
    emailSha256:body.emailSha256||body.email_sha256||(body.email?sha256Normalized(body.email):null),
    phoneSha256:body.phoneSha256||body.phone_sha256||(body.phone?sha256Phone(body.phone):null),
    actionSource:body.actionSource||body.data?.actionSource||null,
    eventSourceUrl:body.eventSourceUrl||body.pageUrl||body.url||body.data?.eventSourceUrl||body.data?.pageUrl||body.data?.url||null,
    metaDatasetId:body.metaDatasetId||body.data?.metaDatasetId||null,
    googleCustomerId:body.googleCustomerId||null,
    googleConversionAction:body.googleConversionAction||null,
    adUserDataConsent:body.adUserDataConsent!==false,
    webhookUrl:body.webhookUrl||null,
    data:body.data&&typeof body.data==='object'?body.data:{}
  }
  return Object.fromEntries(Object.entries(payload).filter(([,value])=>value!==null&&value!==undefined&&value!==''))
}
const validateSignalDispatch=body=>{
  const destination=String(body.destination||'').toLowerCase()
  if(!body.event||!destination) return 'event and destination required'
  const isX=destination==='x'||destination.includes('x ads')||destination.includes('twitter')
  if(!destination.includes('meta')&&!destination.includes('google')&&!destination.includes('linkedin')&&!destination.includes('microsoft')&&!destination.includes('bing')&&!destination.includes('pinterest')&&!destination.includes('tiktok')&&!isX&&!destination.includes('webhook')&&!destination.includes('chatgpt')&&!destination.includes('openai')) return 'unsupported delivery destination'
  if(destination.includes('google')){
    const hasIdentity=Boolean(body.gclid||body.gbraid||body.wbraid||body.email||body.emailSha256||body.email_sha256||body.phone||body.phoneSha256||body.phone_sha256)
    if(!hasIdentity) return 'Google delivery requires gclid, gbraid, wbraid, or a user identifier'
  }
  if(destination.includes('meta')){
    const hasIdentity=Boolean(body.email||body.emailSha256||body.email_sha256||body.phone||body.phoneSha256||body.phone_sha256||body.externalId||body.customerId||body.fbc||body.fbp)
    if(!hasIdentity) return 'Meta delivery requires a customer identifier, click/browser identifier, email, or phone'
  }
  if(destination.includes('linkedin')){
    const hasIdentity=Boolean(body.email||body.emailSha256||body.email_sha256||body.linkedinFirstPartyAdsTrackingUuid||body.liFatId||body.androidAdvertisingId||body.data?.emailSha256||body.data?.linkedinFirstPartyAdsTrackingUuid||body.data?.liFatId||body.data?.androidAdvertisingId)
    if(!hasIdentity) return 'LinkedIn delivery requires hashed email, LinkedIn first-party tracking UUID, or Google advertising ID'
  }
  if(destination.includes('microsoft')||destination.includes('bing')){
    const hasIdentity=Boolean(body.msclkid||body.email||body.emailSha256||body.email_sha256||body.phone||body.phoneSha256||body.phone_sha256||body.anonymousId||body.visitorId||body.externalId||body.customerId||body.idfa||body.androidAdvertisingId||body.data?.msclkid)
    if(!hasIdentity) return 'Microsoft delivery requires msclkid or a supported first-party/device identifier'
  }
  if(destination.includes('pinterest')){
    const hasEmail=Boolean(body.email||body.emailSha256||body.email_sha256||body.data?.emailSha256)
    const hasMaid=Boolean(body.androidAdvertisingId||body.idfa||body.data?.androidAdvertisingId||body.data?.idfa)
    const hasRequestContext=Boolean((body.ipAddress||body.data?.ipAddress)&&(body.userAgent||body.data?.userAgent))
    if(!hasEmail&&!hasMaid&&!hasRequestContext) return 'Pinterest delivery requires hashed email, mobile advertising ID, or IP plus user agent'
  }
  if(destination.includes('tiktok')){
    const hasIdentity=Boolean(body.ttclid||body.ttp||body.email||body.emailSha256||body.email_sha256||body.phone||body.phoneSha256||body.phone_sha256||body.externalId||body.customerId||body.ipAddress||body.userAgent||body.data?.ttclid||body.data?.ttp)
    if(!hasIdentity) return 'TikTok delivery requires a click/cookie identifier, customer identifier, hashed contact, or request context'
  }
  if(isX){
    const hasIdentity=Boolean(body.twclid||body.twpid||body.email||body.emailSha256||body.email_sha256||body.phone||body.phoneSha256||body.phone_sha256||body.ipAddress||body.userAgent||body.data?.twclid||body.data?.twpid)
    if(!hasIdentity) return 'X delivery requires twclid/twpid, hashed contact, IP, or user agent'
  }
  if(destination.includes('chatgpt')||destination.includes('openai')){
    const actionSource=String(body.actionSource||'web').toLowerCase()
    if(['web','website'].includes(actionSource)&&!body.eventSourceUrl) return 'ChatGPT Ads web events require eventSourceUrl'
    if(body.openaiAmountMinor!==undefined&&body.openaiAmountMinor!==null&&body.openaiAmountMinor!==''){
      const amount=Number(body.openaiAmountMinor)
      if(!Number.isInteger(amount)||amount<0) return 'ChatGPT Ads amount must be a non-negative integer in currency minor units'
      if(!body.currency) return 'ChatGPT Ads currency is required when amount is present'
    }
  }
  if(destination.includes('webhook')&&body.webhookUrl){
    try{
      const target=new URL(String(body.webhookUrl))
      if(target.protocol!=='https:'&&!(!IS_PROD&&target.protocol==='http:')) return 'webhookUrl must use HTTPS'
    }catch{return 'webhookUrl is invalid'}
  }
  return null
}

const activationValue=(body,field)=>{
  if(!field)return null
  if(Object.prototype.hasOwnProperty.call(body,field))return body[field]
  if(body.data&&typeof body.data==='object'&&Object.prototype.hasOwnProperty.call(body.data,field))return body.data[field]
  return null
}
const activationConditionMatches=(condition,body)=>{
  if(!condition||!condition.field)return true
  const actual=activationValue(body,String(condition.field))
  const expected=condition.value
  const op=String(condition.operator||'equals')
  if(op==='exists')return actual!==null&&actual!==undefined&&String(actual)!==''
  if(op==='not_exists')return actual===null||actual===undefined||String(actual)===''
  if(op==='contains')return String(actual||'').toLowerCase().includes(String(expected||'').toLowerCase())
  if(op==='greater_than')return Number(actual)>Number(expected)
  if(op==='less_than')return Number(actual)<Number(expected)
  if(op==='one_of')return String(expected||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).includes(String(actual||'').toLowerCase())
  return String(actual??'').toLowerCase()===String(expected??'').toLowerCase()
}
const activationRuleMatches=(rule,body)=>{
  if(String(rule.status||'active')!=='active')return false
  const trigger=String(rule.triggerEvent||'*').trim().toLowerCase()
  const eventName=String(body.event||body.eventType||body.name||'').trim().toLowerCase()
  if(trigger!=='*'&&trigger!==eventName)return false
  return (rule.conditions||[]).every(condition=>activationConditionMatches(condition,body))
}

const events = [
  {name:'Qualified Lead',source:'CRM',destinations:['Google Ads','Meta Ads'],latency:'real-time',status:'active'},
  {name:'Consultation Booked',source:'CRM',destinations:['Google Ads'],latency:'real-time',status:'active'},
  {name:'WhatsApp Started',source:'WhatsApp',destinations:['Google Ads','Meta Ads'],latency:'real-time',status:'active'},
  {name:'Call Connected',source:'Calling',destinations:['Meta Ads'],latency:'real-time',status:'active'},
  {name:'Enrolment',source:'CRM / Billing',destinations:['Google Ads','Meta Ads','LinkedIn Ads'],latency:'real-time',status:'active'},
]

const permissionForRequest=(method,path)=>evaluateAccessPermission(method,path)

const readRawBody = req => new Promise((resolve,reject)=>{
  const chunks=[]
  let size=0
  req.on('data',chunk=>{
    size+=chunk.length
    if(size>1_000_000){reject(new Error('payload too large'));req.destroy();return}
    chunks.push(chunk)
  })
  req.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')))
  req.on('error',reject)
})

const readBody = (req,maxBytes=1_000_000) => new Promise((resolve,reject)=>{
  let body=''
  req.on('data', chunk => {
    body += chunk
    if (body.length > maxBytes) { reject(new Error('payload too large')); req.destroy() }
  })
  req.on('end', () => {
    if (!body) return resolve({})
    try { resolve(JSON.parse(body)) } catch { reject(new Error('invalid json')) }
  })
})

const send = (req,res,status,data,extra={}) => {
  const origin=resolveCorsOrigin(req.headers.origin,allowedOrigins)
  const requestId=req.requestId || randomUUID()
  res.writeHead(status, {
    ...securityHeaders,
    'Content-Type':'application/json; charset=utf-8',
    'Access-Control-Allow-Origin':origin,
    'Vary':'Origin',
    'Access-Control-Allow-Headers':'Content-Type, Authorization, X-Request-ID, X-Workspace-ID',
    'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
    'X-Request-ID':requestId,
    ...extra,
  })
  res.end(status===204?'':JSON.stringify(data))
}

const publicPaths=new Set(['/api/health','/api/ready','/api/auth/login','/api/auth/google/start','/api/auth/google/exchange','/api/auth/password/forgot','/api/auth/password/reset','/api/invitations/activate','/api/demo-requests','/api/demo-bookings','/api/track','/api/pricing/recommend','/api/pricing/quote','/api/public/navigation','/api/public/industries','/api/public/agents','/api/public/integrations','/api/public/connector-requests','/api/public/challenges','/api/public/case-studies','/api/public/resources','/api/public/resource-center','/api/webhooks/whatsapp','/api/webhooks/calls'])
const isPublicRequest=(method,path)=>publicPaths.has(path)||(method==='GET'&&path==='/api/integrations/oauth/callback')||(method==='GET'&&path==='/api/auth/google/callback')||(method==='POST'&&path==='/api/billing/webhook')||path==='/api/consent'
const meteredMetricFor=(method,path)=>{
  if(method!=='POST') return null
  if(path==='/api/track') return 'tracked_events'
  if(path==='/api/assisted-events') return 'assisted_events'
  if(path==='/api/signal-deliveries/dispatch') return 'signal_dispatches'
  if(path==='/api/audiences/sync') return 'audience_syncs'
  if(path==='/api/custom-integrations/test') return 'custom_integration_tests'
  if(path==='/api/qualification-calls'||path==='/api/qualification-calls/retry'||path==='/api/meetings/remind'||path==='/api/feedback/request') return 'agent_actions'
  if(path==='/api/whatsapp/messages') return 'agent_actions'
  return null
}
const server = http.createServer(async (req,res)=>{
  const requestContext=createRequestContext({req})
  req.context=requestContext
  req.requestId=requestContext.requestId
  const healthUrl=new URL(req.url, `http://localhost:${PORT}`)
  if(req.method==='GET'&&healthUrl.pathname==='/healthz'){
    return send(req,res,200,{...livenessState(),service:runtimeRole.role==='integration-ingress'?'ace-marketing-integration-ingress':'ace-marketing-api',requestId:req.requestId})
  }
  if(req.method==='GET'&&healthUrl.pathname==='/startupz'){
    const state=startupState()
    return send(req,res,state.ok?200:503,{...state,service:runtimeRole.role==='integration-ingress'?'ace-marketing-integration-ingress':'ace-marketing-api',requestId:req.requestId})
  }
  if(req.method==='GET'&&healthUrl.pathname==='/readyz'){
    const state=await readinessState({storageHealth})
    return send(req,res,state.ok?200:503,{...state,service:runtimeRole.role==='integration-ingress'?'ace-marketing-integration-ingress':'ace-marketing-api',requestId:req.requestId})
  }
  if(!runtimeRoleAllows({role:runtimeRole.role,method:req.method,path:healthUrl.pathname})){
    return send(req,res,404,{error:'not found',code:'runtime_route_not_exposed'})
  }
  const releaseAdmission=globalAdmission.acquire()
  if(!releaseAdmission){
    return send(req,res,503,{error:'server busy',code:'admission_capacity_exhausted',retryable:true},{'Retry-After':'1'})
  }
  let admissionReleased=false
  const releaseAdmissionOnce=()=>{
    if(admissionReleased)return
    admissionReleased=true
    releaseAdmission()
  }
  res.once('finish',releaseAdmissionOnce)
  res.once('close',releaseAdmissionOnce)
  const requestStartedAt=requestContext.startedAt
  const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim()
  const rate=limitRequest(ip)
  if(!rate.allowed) return send(req,res,429,{error:'rate limit exceeded'},{'Retry-After':String(Math.max(1,Math.ceil((rate.resetAt-Date.now())/1000)))})
  const url = new URL(req.url, `http://localhost:${PORT}`)
  if (req.method === 'OPTIONS') return send(req,res,204,{})
  if (req.headers.origin && !resolveCorsOrigin(req.headers.origin,allowedOrigins)) return send(req,res,403,{error:'origin not allowed'})
  let workspaceId
  try{
    workspaceId=requestedWorkspaceId(req,{defaultWorkspaceId:process.env.DEFAULT_WORKSPACE_ID||'ws_default'})
  }catch(error){
    return send(req,res,400,{error:error instanceof Error?error.message:'invalid workspace scope',code:error?.code||'invalid_workspace_scope'})
  }
  if(String(process.env.CELL_ROUTING_REQUIRED||'false').toLowerCase()==='true'){
    try{
      await assertWorkspaceCell({
        workspaceId,
        expectedCell:process.env.ACE_CELL_ID||'',
        expectedRegion:process.env.ACE_CELL_REGION||null,
        routingEpoch:req.headers['x-ace-routing-epoch']||null
      })
    }catch(error){
      return send(req,res,Number(error?.status||503),{error:error instanceof Error?error.message:'workspace placement unavailable',code:error?.code||'cell_placement_unavailable'})
    }
  }
  if(url.pathname==='/api/consent'){
    if(req.method==='GET'){
      const subjectType=url.searchParams.get('subjectType')==='customer'?'customer':'visitor'
      const subjectId=String(url.searchParams.get('subjectId')||'')
      if(!subjectId) return send(req,res,400,{error:'subjectId required'})
      const record=await getConsent(workspaceId,subjectType,subjectId)
      return send(req,res,200,{record:record||null,defaults:{essential:true,analytics:false,marketing:false,personalization:false},policyVersion:process.env.CONSENT_POLICY_VERSION||'v1'})
    }
    if(req.method==='POST'){
      const body=await readBody(req)
      try{
        const forwarded=String(req.headers['x-forwarded-for']||'').split(',')[0].trim()
        const record=await saveConsent(workspaceId,body,{ip:forwarded||req.socket.remoteAddress||'',userAgent:req.headers['user-agent']||''})
        return send(req,res,200,{record})
      }catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'invalid consent request'})}
    }
  }
  if(req.method==='POST'&&url.pathname==='/api/billing/webhook'){
    try{
      const raw=await readRawBody(req)
      const event=verifyStripeWebhook(raw,req.headers['stripe-signature'])
      const result=await handleReconcilePayment({event})
      return send(req,res,200,{received:true,...result})
    }catch(error){
      return send(req,res,400,{error:error instanceof Error?error.message:'invalid billing webhook'})
    }
  }
  if(req.method==='GET'&&url.pathname==='/api/webhooks/whatsapp'){
    const check=verifyWhatsAppWebhookChallenge({
      mode:url.searchParams.get('hub.mode'),
      verifyToken:url.searchParams.get('hub.verify_token'),
      challenge:url.searchParams.get('hub.challenge')
    })
    if(!check.ok) return send(req,res,check.status,{error:check.error})
    res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','X-Request-ID':req.requestId})
    res.end(check.challenge)
    return
  }
  if(req.method==='POST'&&url.pathname==='/api/webhooks/whatsapp'){
    try{
      const raw=await readRawBody(req)
      if(!verifyWhatsAppWebhookSignature(raw,req.headers['x-hub-signature-256'])) return send(req,res,401,{error:'invalid WhatsApp webhook signature'})
      let payload={}
      try{payload=raw?JSON.parse(raw):{}}catch{return send(req,res,400,{error:'invalid WhatsApp webhook json'})}
      const events=parseWhatsAppWebhook(payload)
      const resolvedWorkspace=resolveWhatsAppWorkspace(events,req.headers['x-workspace-id'])
      if(!resolvedWorkspace) return send(req,res,400,{error:'unable to resolve workspace for WhatsApp phone number'})
      workspaceId=resolvedWorkspace
      const payloadHash=createHash('sha256').update(raw).digest('hex')
      const inboxRecords=[]
      for(const event of events){
        if(!event?.id)continue
        const record=await recordInboxEvent({
          source:'whatsapp',
          eventId:String(event.id)+':'+String(event.kind||'event')+':'+String(event.status||''),
          workspaceId,
          payloadHash
        }).catch(error=>{throw error})
        inboxRecords.push({event,record})
      }
      const duplicateCount=inboxRecords.filter(item=>item.record?.processed_at).length
      await withWorkspace(workspaceId,async()=>{
        const now=new Date().toISOString()
        await mutateState(s=>{
          s.whatsappEvents=s.whatsappEvents||[]
          for(const event of events){
            const duplicate=s.whatsappEvents.some(x=>x.id===event.id&&x.kind===event.kind&&x.status===event.status)
            if(!duplicate) s.whatsappEvents.unshift({...event,receivedAt:now})
          }
          s.whatsappEvents=s.whatsappEvents.slice(0,10000)
          s.audit=s.audit||[]
          s.audit.unshift({id:randomUUID(),action:'whatsapp.webhook.received',entityId:events[0]?.id||null,count:events.length,at:now})
          s.audit=s.audit.slice(0,1000)
        })
        for(const event of events){
          if(event.kind!=='message'||!event.from) continue
          await upsertLeadProfile(workspaceId,{
            externalLeadId:'whatsapp:'+event.from,
            name:event.contactName||null,
            phone:event.from,
            source:'WhatsApp',
            whatsappEngaged:true,
            lastActivity:event.timestamp,
            whatsappSummary:event.text||event.messageType,
            attributes:{whatsappMessageId:event.id,messageType:event.messageType,phoneNumberId:event.phoneNumberId,ctwaClid:event.referral?.ctwaClid||null,ctwaSourceId:event.referral?.sourceId||null,ctwaSourceUrl:event.referral?.sourceUrl||null,ctwaHeadline:event.referral?.headline||null}
          }).catch(()=>null)
          await recordAssistedEvent(workspaceId,{
            event:'whatsapp.message_received',
            eventType:'whatsapp.message_received',
            eventId:event.id,
            customerId:'whatsapp:'+event.from,
            phone:event.from,
            source:event.referral?.ctwaClid?'ctwa':'whatsapp',
            occurredAt:event.timestamp,
            data:{messageType:event.messageType,phoneNumberId:event.phoneNumberId,ctwaClid:event.referral?.ctwaClid||null,sourceId:event.referral?.sourceId||null,sourceUrl:event.referral?.sourceUrl||null,headline:event.referral?.headline||null,sourceType:event.referral?.sourceType||null}
          }).catch(()=>null)
        }
      })
      for(const {event,record} of inboxRecords){
        if(record?.processed_at||!event?.id)continue
        await markInboxProcessed({
          source:'whatsapp',
          eventId:String(event.id)+':'+String(event.kind||'event')+':'+String(event.status||''),
          workspaceId,
          result:{received:true}
        }).catch(()=>{})
      }
      return send(req,res,200,{received:true,workspaceId,events:events.length,duplicates:duplicateCount})
    }catch(error){
      return send(req,res,400,{error:error instanceof Error?error.message:'invalid WhatsApp webhook'})
    }
  }
  if(req.method==='POST'&&url.pathname==='/api/webhooks/calls'){
    try{
      const raw=await readRawBody(req)
      const verified=verifyCallWebhook(raw,req.headers)
      if(!verified.ok) return send(req,res,401,{error:verified.error})
      let body={}
      try{body=raw?JSON.parse(raw):{}}catch{return send(req,res,400,{error:'invalid call webhook json'})}
      const resolvedWorkspace=resolveCallWorkspace(body,req.headers['x-workspace-id'])
      if(!resolvedWorkspace) return send(req,res,400,{error:'unable to resolve workspace for call event'})
      workspaceId=resolvedWorkspace
      const event=normalizeCallEvent(body)
      const payloadHash=createHash('sha256').update(raw).digest('hex')
      const inboxRecord=await recordInboxEvent({
        source:'calls:'+String(event.provider||'provider'),
        eventId:String(event.id),
        workspaceId,
        payloadHash
      })
      let duplicate=Boolean(inboxRecord?.processed_at)
      await withWorkspace(workspaceId,async()=>{
        const now=new Date().toISOString()
        await mutateState(s=>{
          s.callEvents=s.callEvents||[]
          duplicate=s.callEvents.some(x=>x.id===event.id)
          if(!duplicate) s.callEvents.unshift({...event,receivedAt:now})
          s.callEvents=s.callEvents.slice(0,10000)
          s.audit=s.audit||[]
          s.audit.unshift({id:randomUUID(),action:'call.webhook.received',entityId:event.id,provider:event.provider,duplicate,at:now})
          s.audit=s.audit.slice(0,1000)
        })
        if(!duplicate){
          await upsertLeadProfile(workspaceId,{
            externalLeadId:event.customerId||('call:'+event.from),
            phone:event.from||null,
            source:event.source||'Telephony',
            campaign:event.campaign||null,
            keepExistingAcquisition:true,
            lastActivity:event.endedAt||event.startedAt,
            callOutcome:event.disposition||event.status,
            callSummary:[event.status,event.durationSeconds?event.durationSeconds+'s':null,event.disposition].filter(Boolean).join(' · '),
            attributes:{callEventId:event.id,provider:event.provider,direction:event.direction,to:event.to,keyword:event.keyword||null,creative:event.creative||null,adGroup:event.adGroup||null}
          }).catch(()=>null)
          await recordAssistedEvent(workspaceId,{
            event:'call.completed',
            eventType:'call.completed',
            eventId:event.id,
            customerId:event.customerId||('call:'+event.from),
            phone:event.from||null,
            source:'call',
            occurredAt:event.endedAt||event.startedAt,
            gclid:event.gclid||null,
            fbclid:event.fbclid||null,
            msclkid:event.msclkid||null,
            data:{provider:event.provider,status:event.status,durationSeconds:event.durationSeconds,campaign:event.campaign,keyword:event.keyword,creative:event.creative,adGroup:event.adGroup}
          }).catch(()=>null)
        }
      })
      if(!inboxRecord?.processed_at){
        await markInboxProcessed({
          source:'calls:'+String(event.provider||'provider'),
          eventId:String(event.id),
          workspaceId,
          result:{received:true}
        }).catch(()=>{})
      }
      return send(req,res,200,{received:true,duplicate,workspaceId,eventId:event.id})
    }catch(error){
      return send(req,res,400,{error:error instanceof Error?error.message:'invalid call webhook'})
    }
  }
  if(req.method==='GET'&&url.pathname==='/api/integrations/oauth/callback'){
    const signed=parseOAuthState(url.searchParams.get('state'))
    if(!signed) return send(req,res,400,{error:'invalid or expired oauth state'})
    workspaceId=signed.workspaceId
  }
  if(!/^[A-Za-z0-9_-]{1,64}$/.test(workspaceId)) return send(req,res,400,{error:'invalid workspace id'})
  let usageReservationId=null
  const meteredMetric=meteredMetricFor(req.method||'GET',url.pathname)
  res.once('finish',()=>{
    const success=res.statusCode<400
    recordApiTelemetry(workspaceId,{
      requestId:req.requestId,
      method:req.method||'GET',
      path:url.pathname,
      statusCode:res.statusCode,
      latencyMs:Date.now()-requestStartedAt,
      usageReservationId:success?usageReservationId:null
    }).catch(()=>{}).finally(()=>{
      if(usageReservationId)finalizeReservation(workspaceId,usageReservationId,success).catch(()=>{})
    })
  })
  if(meteredMetric){
    let capacity
    try{
      capacity=await handleReserveQuota({workspaceId,metric:meteredMetric,quantity:1,requestId:req.requestId})
    }catch(error){
      return send(req,res,503,{
        error:'usage quota check unavailable',
        code:'quota_check_unavailable',
        retryable:true
      },{'Retry-After':'1'})
    }
    if(!capacity.allowed) return send(req,res,429,{error:'usage quota exceeded',metric:meteredMetric,usage:capacity})
    usageReservationId=capacity.reservationId||null
  }
  let authenticatedUser=null
  const protectedRequest=url.pathname.startsWith('/api/')&&!isPublicRequest(req.method||'GET',url.pathname)
  if(protectedRequest){
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'')
    if(token){
      authenticatedUser=verifyToken(token,JWT_SECRET)
      if(!authenticatedUser) return send(req,res,401,{error:'unauthorized'})
      try{assertActorWorkspace(authenticatedUser,workspaceId)}catch(error){
        return send(req,res,403,{error:'token workspace mismatch',code:error?.code||'workspace_scope_mismatch'})
      }
    }else if(AUTH_REQUIRED){
      return send(req,res,401,{error:'unauthorized'})
    }else{
      const devState=await withWorkspace(workspaceId,()=>getState())
      const devMember=(devState.members||[]).find(x=>x.status==='active'&&x.role==='owner')||(devState.members||[]).find(x=>x.status==='active')
      if(devMember){
        authenticatedUser={userId:devMember.id,email:devMember.email,role:devMember.role,workspaceId,jti:null,developmentBypass:true}
      }else if(url.pathname==='/api/auth/me'){
        return send(req,res,401,{error:'unauthorized'})
      }
    }
  }
  return withWorkspace(workspaceId,async()=>{
  let trackedEvents=trackedEventsByWorkspace.get(workspaceId)
  if(!trackedEvents){
    trackedEvents=(await listTrackedEvents(workspaceId,{limit:5000}).catch(()=>[])).reverse()
    trackedEventsByWorkspace.set(workspaceId,trackedEvents)
  }
  try {
    if(authenticatedUser){
      const authState=await getState()
      const member=(authState.members||[]).find(x=>x.id===authenticatedUser.userId&&x.status==='active')
      const session=authenticatedUser.developmentBypass?{status:'active'}:(authState.sessions||[]).find(x=>x.jti===authenticatedUser.jti&&x.status==='active')
      if(!session||!member) return send(req,res,401,{error:'session revoked or member inactive'})
      if(!authenticatedUser.developmentBypass&&session.expiresAt&&Date.parse(session.expiresAt)<=Date.now()) return send(req,res,401,{error:'session expired'})
      authenticatedUser={...authenticatedUser,role:member.role,email:member.email,userId:member.id}
      req.user=authenticatedUser
      req.tenantScope=tenantExecutionScope({actor:authenticatedUser,workspaceId})
      req.context=bindActorToRequestContext(req.context,{actor:authenticatedUser,workspaceId,tenantId:req.tenantScope.tenantId})
      const permission=permissionForRequest(req.method||'GET',url.pathname)
      if(!hasPermission(member.role,permission)) return send(req,res,403,{error:'forbidden',permission,role:member.role})
    }
    if(protectedRequest){
      const runtimeDecision=await runtimeGuardForRequest({
        method:req.method||'GET',
        path:url.pathname,
        workspaceId
      }).catch(error=>({
        allowed:false,
        state:'degraded',
        code:'runtime_config_unavailable',
        reason:error instanceof Error?error.message:'runtime configuration could not be evaluated',
        configurationVersion:null
      }))
      if(!runtimeDecision.allowed){
        return send(req,res,503,{
          error:runtimeDecision.reason||'operation unavailable under current runtime policy',
          code:runtimeDecision.code||'runtime_policy_blocked',
          state:runtimeDecision.state,
          configurationVersion:runtimeDecision.configurationVersion,
          retryable:['runtime_config_invalid','runtime_config_unavailable'].includes(runtimeDecision.code)
        })
      }
      req.runtimeConfigurationVersion=runtimeDecision.configurationVersion||null
    }
    if (req.method === 'GET' && url.pathname === '/api/health') return send(req,res,200,{ok:true,service:runtimeRole.role==='integration-ingress'?'ace-marketing-integration-ingress':'ace-marketing-api',time:new Date().toISOString(),requestId:req.requestId})
    if (req.method === 'GET' && url.pathname === '/api/dashboard-summary') {
      const state=await getState()
      const safe=async(fn,fallback)=>{try{return await fn()}catch{return fallback}}
      const [leadStats,attr,audienceStats,queue,monitoring,eventRules,agentRuns,meetings,followUps,feedbackResult,consentSummary,reportSchedules]=await Promise.all([
        safe(()=>leadOpsStats(workspaceId),{available:false,total:0,aGrade:0,abQuality:0}),
        safe(()=>attributionStats(workspaceId),{available:false,matchedEvents:0,unmatchedEvents:0,assistedEvents:0,activeClickSessions:0}),
        safe(()=>audienceOpsStats(workspaceId),{available:false,audiences:{total:0,active:0,activatedIdentities:0,suppressedIdentities:0,errors:0},profiles:{total:0}}),
        safe(()=>queueStats(workspaceId),{backend:'disabled',pending:0,leased:0,retry:0,succeeded:0,deadLetter:0}),
        safe(()=>monitoringSnapshot(workspaceId),{}),
        safe(()=>listEventRules(workspaceId),[]),
        safe(()=>listAgentRuns(workspaceId),[]),
        safe(()=>listPersistedMeetings(workspaceId),[]),
        safe(()=>listPersistedFollowUps(workspaceId),[]),
        safe(()=>listPersistedFeedback(workspaceId),{items:[]}),
        safe(()=>consentStats(workspaceId),{total:0,analytics:0,marketing:0,personalization:0,revoked:0}),
        safe(()=>listReportSchedules(workspaceId),[])
      ])
      const connectors=state.connectorConnections||[]
      const connectedConnectors=connectors.filter(x=>['connected','healthy','active'].includes(String(x.status||'').toLowerCase()))
      const deliveries=state.signalDeliveries||[]
      const integrationFlows=state.integrationFlows||[]
      const activeIntegrationFlows=integrationFlows.filter(x=>x.status==='active').length
      const activationRules=state.activationRules||[]
      const activeActivationRules=activationRules.filter(x=>x.status==='active').length
      const activationRuleRuns=state.activationRuleRuns||[]
      const failedDeliveries=deliveries.filter(x=>['failed','dead_letter'].includes(String(x.status||'').toLowerCase())).length
      const delivered=deliveries.filter(x=>['delivered','succeeded'].includes(String(x.status||'').toLowerCase())).length
      const terminal=deliveries.filter(x=>['delivered','succeeded','failed','dead_letter'].includes(String(x.status||'').toLowerCase())).length
      const deliveryRate=terminal?Number((delivered/terminal*100).toFixed(1)):null
      const trackedCount=trackedEvents.length
      const profiles=Number(leadStats?.total||audienceStats?.profiles?.total||0)
      const areas=[
        {key:'data',title:'Data foundation',tab:'Data Hub',ready:trackedCount>0||profiles>0,primary:trackedCount+profiles,detail:trackedCount+' tracked events · '+profiles+' profiles'},
        {key:'tracking',title:'Tracking & quality',tab:'Diagnostics',ready:eventRules.length>0||trackedCount>0,primary:eventRules.length,detail:eventRules.length+' event rules · '+Number((state.quarantinedEvents||[]).length)+' quarantined'},
        {key:'measurement',title:'Measurement',tab:'Attribution',ready:Boolean(attr?.available&&Number(attr?.matchedEvents||0)>0),primary:Number(attr?.matchedEvents||0),detail:Number(attr?.matchedEvents||0)+' matched · '+Number(attr?.unmatchedEvents||0)+' unmatched'},
        {key:'conversion',title:'Lead & conversion',tab:'Lead Grading',ready:profiles>0,primary:Number(leadStats?.abQuality||0),detail:Number(leadStats?.abQuality||0)+' A/B leads · '+meetings.length+' meetings'},
        {key:'activation',title:'Activation',tab:'Audiences',ready:Number(audienceStats?.audiences?.total||0)>0||deliveries.length>0||activeIntegrationFlows>0||activeActivationRules>0,primary:Number(audienceStats?.audiences?.total||0)+activeIntegrationFlows+activeActivationRules,detail:Number(audienceStats?.audiences?.total||0)+' audiences · '+activeIntegrationFlows+' active flows · '+activeActivationRules+' activation rules · '+deliveries.length+' deliveries'},
        {key:'operations',title:'Operations',tab:'Monitoring',ready:connectedConnectors.length>0,primary:connectedConnectors.length,detail:connectedConnectors.length+' connected · '+failedDeliveries+' failed deliveries'}
      ]
      const readiness=Math.round(areas.filter(x=>x.ready).length/areas.length*100)
      const feedbackItems=feedbackResult?.items||[]
      const voiceRuns=agentRuns.filter(x=>String(x.agent_type||x.agentType||'').toLowerCase()==='voice_qualification')
      const section=(state,count,detail)=>({state,count:Number(count||0),detail})
      const sections={
        Launchpad:section(readiness>=80?'live':readiness>0?'attention':'setup',readiness,readiness+'% workspace readiness'),
        Overview:section('live',trackedCount+profiles,'Live workspace summary'),
        AdSync:section(deliveries.length?'live':connectedConnectors.length?'attention':'setup',deliveries.length,deliveries.length+' signal deliveries'),
        'ChatGPT Ads':section(deliveries.some(x=>/chatgpt|openai/i.test(String(x.destination||'')))?'live':(process.env.OPENAI_CONVERSIONS_API_KEY&&process.env.OPENAI_ADS_PIXEL_ID)?'attention':'setup',deliveries.filter(x=>/chatgpt|openai/i.test(String(x.destination||''))).length,deliveries.filter(x=>/chatgpt|openai/i.test(String(x.destination||''))).length+' ChatGPT Ads deliveries'),
        Funnel:section(profiles?'live':trackedCount?'attention':'setup',profiles,profiles+' known lead profiles'),
        'Leak Monitor':section(profiles?'live':'setup',Number((state.leakRecoveries||[]).length),(state.leakRecoveries||[]).length+' recovery actions'),
        Events:section(eventRules.length?'live':'setup',eventRules.length,eventRules.length+' conversion rules'),
        Diagnostics:section(trackedCount||eventRules.length?'live':'setup',Number((state.quarantinedEvents||[]).length),(state.quarantinedEvents||[]).length+' quarantined events'),
        Adjustments:section(Number((state.performanceAdjustments||[]).length)>0?'live':Number(attr?.matchedEvents||0)>0?'attention':'setup',Number((state.performanceAdjustments||[]).length),(state.performanceAdjustments||[]).length+' governed adjustments'),
        'Match Quality':section((state.recentEvents||[]).length?'live':'setup',(state.recentEvents||[]).length,(state.recentEvents||[]).length+' events scored for identity coverage'),
        Reconciliation:section(trackedCount||deliveries.length||Number(attr?.assistedEvents||0)>0?'live':'setup',failedDeliveries+Number(attr?.unmatchedEvents||0),failedDeliveries+' failed · '+Number(attr?.unmatchedEvents||0)+' unmatched'),
        Fraud:section(Number((state.fraudSignals||[]).length)>0?'attention':trackedCount?'live':'setup',Number((state.fraudSignals||[]).length),(state.fraudSignals||[]).length+' suspicious signals'),
        'Deep Links':section(Number((state.deepLinks||[]).length)>0?'live':'setup',Number((state.deepLinks||[]).length),(state.deepLinks||[]).length+' measurable routes'),
        Sites:section(Number((state.sites||state.trackedSites||[]).length)>0?'live':trackedCount?'attention':'setup',Number((state.sites||state.trackedSites||[]).length),(state.sites||state.trackedSites||[]).length+' tracked sites'),
        Fingerprinting:section(trackedCount?'live':'setup',trackedCount,trackedCount+' events available for privacy-aware matching'),
        'Live Sync':section(trackedCount?'live':'setup',trackedCount,trackedCount+' tracked events'),
        'Data Hub':section(profiles||trackedCount?'live':'setup',profiles,profiles+' unified profiles'),
        'Customer 360':section(profiles?'live':'setup',profiles,profiles+' stitched customer profiles'),
        'Offline Attribution':section(Number(attr?.assistedEvents||0)>0?'live':connectedConnectors.length?'attention':'setup',Number(attr?.assistedEvents||0),Number(attr?.assistedEvents||0)+' assisted/offline events'),
        Matchback:section(Number(attr?.unmatchedEvents||0)>0?'attention':Number(attr?.matchedEvents||0)>0?'live':'setup',Number(attr?.unmatchedEvents||0),Number(attr?.unmatchedEvents||0)+' unmatched conversions'),
        'POS & Stores':section(Number((state.posTransactions||state.storeTransactions||[]).length)>0?'live':connectedConnectors.some(x=>/pos|shopify|woocommerce|magento|store/i.test(String(x.connector||x.name||'')))?'attention':'setup',Number((state.posTransactions||state.storeTransactions||[]).length),(state.posTransactions||state.storeTransactions||[]).length+' store transactions'),
        Journeys:section(profiles?'live':'setup',profiles,profiles+' stitched profiles'),
        Identity:section(profiles?'live':trackedCount?'attention':'setup',profiles,profiles+' resolved profiles'),
        Models:section(Number(attr?.matchedEvents||0)>0?'live':attr?.available?'attention':'setup',Number(attr?.matchedEvents||0),Number(attr?.matchedEvents||0)+' events available for model comparison'),
        Attribution:section(Number(attr?.matchedEvents||0)>0?'live':attr?.available?'attention':'setup',Number(attr?.matchedEvents||0),Number(attr?.matchedEvents||0)+' matched conversions'),
        Planner:section(Number(attr?.matchedEvents||0)>0?'live':attr?.available?'attention':'setup',Number(attr?.matchedEvents||0),Number(attr?.matchedEvents||0)+' matched events for planning'),
        Reports:section(reportSchedules.length?'live':Number(attr?.matchedEvents||0)>0?'attention':'setup',reportSchedules.length,reportSchedules.length+' scheduled reports'),
        'Grouped Performance':section((state.recentEvents||[]).length?'live':'setup',(state.recentEvents||[]).length,(state.recentEvents||[]).length+' persisted events available for grouping'),
        'Executive Briefs':section(reportSchedules.some(x=>x.report_type==='executive_brief')?'live':reportMailConfigured()?'attention':'setup',reportSchedules.filter(x=>x.report_type==='executive_brief').length,reportSchedules.filter(x=>x.report_type==='executive_brief').length+' executive briefs'),
        Enrich:section(profiles?'live':'setup',profiles,profiles+' enriched profiles'),
        'Lead Grading':section(profiles?'live':'setup',Number(leadStats?.abQuality||0),Number(leadStats?.abQuality||0)+' A/B leads'),
        Behavior:section(trackedCount||profiles?'live':'setup',trackedCount,trackedCount+' behavioral events'),
        Feed:section(deliveries.length?'live':connectedConnectors.length?'attention':'setup',deliveries.length,deliveries.length+' outbound feed deliveries'),
        Agents:section(agentRuns.length?'live':'attention',agentRuns.length,agentRuns.length+' persisted runs'),
        Routing:section(Number((state.routingDecisions||[]).length)>0?'live':profiles?'attention':'setup',Number((state.routingDecisions||[]).length),(state.routingDecisions||[]).length+' routing decisions'),
        'Follow-ups':section(followUps.length?'live':profiles?'attention':'setup',followUps.length,followUps.length+' follow-up tasks'),
        Calls:section(voiceRuns.length?'live':connectedConnectors.some(x=>/exotel|knowlarity|twilio|myoperator|tata/i.test(String(x.connector||x.name||'')))?'attention':'setup',voiceRuns.length,voiceRuns.length+' qualification runs'),
        Meetings:section(meetings.length?'live':connectedConnectors.some(x=>/calendar/i.test(String(x.connector||x.name||'')))?'attention':'setup',meetings.length,meetings.length+' scheduled meetings'),
        Feedback:section(feedbackItems.length?'live':agentRuns.some(x=>String(x.agent_type||'').toLowerCase()==='feedback')?'attention':'setup',feedbackItems.length,feedbackItems.length+' feedback responses'),
        Approvals:section(Number((state.approvals||state.approvalQueue||[]).length)>0?'attention':agentRuns.length?'live':'setup',Number((state.approvals||state.approvalQueue||[]).length),(state.approvals||state.approvalQueue||[]).length+' pending/recent approvals'),
        'Ask Ace':section(profiles||Number(attr?.matchedEvents||0)>0?'live':'attention',profiles+Number(attr?.matchedEvents||0),profiles||Number(attr?.matchedEvents||0)>0?'Grounded data available':'Connect data for grounded answers'),
        Integrations:section(connectedConnectors.length?'live':'setup',connectedConnectors.length,connectedConnectors.length+' connected systems'),
        'Data Flows':section(activeIntegrationFlows?'live':integrationFlows.length?'attention':'setup',activeIntegrationFlows,activeIntegrationFlows+' active flows'),
        'Real-Time Activation':section(activeActivationRules?'live':activationRules.length?'attention':'setup',activeActivationRules,activeActivationRules+' active rules · '+activationRuleRuns.length+' runs'),
        Personalization:section(Number((state.personalizationRules||[]).filter(x=>x.status==='active').length)?'live':(state.personalizationRules||[]).length?'attention':'setup',Number((state.personalizationRules||[]).filter(x=>x.status==='active').length),(state.personalizationRules||[]).length+' rules · '+(state.personalizationDecisions||[]).length+' decisions'),
        Exclusions:section(Number(audienceStats?.audiences?.suppressedIdentities||0)>0?'live':Number(audienceStats?.exclusions?.deviceIds||0)>0||Number(audienceStats?.exclusions?.converted||0)>0?'attention':'setup',Number(audienceStats?.audiences?.suppressedIdentities||0),Number(audienceStats?.audiences?.suppressedIdentities||0)+' suppressed identities'),
        Audiences:section(Number(audienceStats?.audiences?.total||0)>0?'live':'setup',Number(audienceStats?.audiences?.total||0),Number(audienceStats?.audiences?.total||0)+' audiences'),
        Delivery:section(deliveries.length?'live':'setup',deliveries.length,deliveries.length+' delivery records'),
        Monitoring:section('live',Number(monitoring?.openAlerts||monitoring?.alerts?.open||0),Number(monitoring?.openAlerts||monitoring?.alerts?.open||0)+' open alerts'),
        Alerts:section(Number(monitoring?.openAlerts||monitoring?.alerts?.open||0)>0?'attention':'live',Number(monitoring?.openAlerts||monitoring?.alerts?.open||0),Number(monitoring?.openAlerts||monitoring?.alerts?.open||0)+' open alerts'),
        Compliance:section(Number(consentSummary?.total||0)>0?'live':'attention',Number(consentSummary?.total||0),Number(consentSummary?.total||0)+' consent subjects'),
        Developers:section(Number((state.apiKeys||[]).filter(x=>x.status!=='revoked').length)>0||Number((state.webhooks||[]).length)>0?'live':'setup',Number((state.apiKeys||[]).filter(x=>x.status!=='revoked').length)+Number((state.webhooks||[]).length),(state.apiKeys||[]).filter(x=>x.status!=='revoked').length+' active API keys · '+(state.webhooks||[]).length+' webhooks'),
        Settings:section('live',connectedConnectors.length,'Workspace configuration')
      }
      const recent=[
        ...trackedEvents.slice(-8).map(x=>({id:x.id||randomUUID(),kind:'event',title:x.event||x.eventType||x.name||'Tracked event',meta:x.source||x.channel||'First-party',time:x.receivedAt||x.occurredAt||x.timestamp||null,tab:'Live Sync'})),
        ...deliveries.slice(0,8).map(x=>({id:'delivery:'+x.id,kind:'delivery',title:(x.event||'Signal')+' → '+(x.destination||'destination'),meta:x.status||'queued',time:x.updatedAt||x.createdAt||null,tab:'Delivery'})),
        ...agentRuns.slice(0,5).map(x=>({id:'agent:'+x.id,kind:'agent',title:x.agent_type||x.agentType||x.action_type||'Agent run',meta:x.status||'queued',time:x.created_at||x.createdAt||null,tab:'Agents'}))
      ].filter(x=>x.time).sort((a,b)=>Date.parse(b.time)-Date.parse(a.time)).slice(0,12)
      return send(req,res,200,{
        generatedAt:new Date().toISOString(),
        readiness,
        areas,
        sections,
        totals:{
          trackedEvents:trackedCount,
          profiles,
          connectedConnectors:connectedConnectors.length,
          totalConnectors:connectors.length,
          eventRules:eventRules.length,
          audiences:Number(audienceStats?.audiences?.total||0),
          activeAudiences:Number(audienceStats?.audiences?.active||0),
          matchedEvents:Number(attr?.matchedEvents||0),
          meetings:meetings.length,
          followUps:followUps.length,
          agentRuns:agentRuns.length,
          deliveries:deliveries.length,
          integrationFlows:integrationFlows.length,
          activeIntegrationFlows,
          activationRules:activationRules.length,
          activeActivationRules,
          activationRuleRuns:activationRuleRuns.length,
          failedDeliveries,
          deliveryRate,
          queueDeadLetter:Number(queue?.deadLetter||queue?.dead_letter||0),
          openAlerts:Number(monitoring?.openAlerts||monitoring?.alerts?.open||0)
        },
        recent
      })
    }
    if (req.method === 'GET' && url.pathname === '/api/ready') {
      const persistence=await storageHealth()
      if(!persistence.ok) return send(req,res,503,{ok:false,persistence,time:new Date().toISOString()})
      const state=await getState()
      return send(req,res,200,{ok:true,persistence,records:{audiences:state.audiences.length,customIntegrations:state.customIntegrations.length},time:new Date().toISOString()})
    }
    if (await handlePublicRoutes({req,res,url,workspaceId,readBody,send})) return
    if (await handleIdentityRoutes({req,res,url,workspaceId,readBody,send,JWT_SECRET,ADMIN_EMAIL,ADMIN_PASSWORD_HASH,IS_PROD,AUTH_GOOGLE_REDIRECT_URI,AUTH_GOOGLE_SUCCESS_URL,createOAuthState,hashOAuthState,createPkce,parseOAuthState})) return
    if (req.method === 'POST' && url.pathname === '/api/demo-requests') {
      const body = await readBody(req)
      if (!body.email || !body.company) return send(req,res,400,{error:'email and company are required'})
      const item={id:randomUUID(),status:'captured',request:body,createdAt:new Date().toISOString()}
      await mutateState(s=>{s.demoRequests.unshift(item);s.demoRequests=s.demoRequests.slice(0,5000)})
      return send(req,res,201,item)
    }
    if (req.method === 'POST' && url.pathname === '/api/demo-bookings') {
      const body=await readBody(req)
      const demoRequestId=String(body.demoRequestId||'').trim()
      const startsAt=String(body.startsAt||'').trim()
      if(!demoRequestId) return send(req,res,400,{error:'demoRequestId required'})
      const startDate=new Date(startsAt)
      if(!startsAt||Number.isNaN(startDate.getTime())) return send(req,res,400,{error:'valid startsAt required'})
      if(startDate.getTime()<Date.now()-60000) return send(req,res,400,{error:'demo booking must be in the future'})
      if(startDate.getTime()>Date.now()+90*24*60*60*1000) return send(req,res,400,{error:'demo booking must be within 90 days'})
      const state=await getState()
      const demoRequest=(state.demoRequests||[]).find(x=>x.id===demoRequestId)
      if(!demoRequest) return send(req,res,404,{error:'demo request not found'})
      const existing=(state.demoBookings||[]).find(x=>x.demoRequestId===demoRequestId&&x.status==='confirmed')
      if(existing) return send(req,res,200,existing)
      const item={
        id:'demo_booking_'+randomUUID(),demoRequestId,status:'confirmed',startsAt:startDate.toISOString(),
        durationMinutes:45,email:String(demoRequest.request?.email||''),company:String(demoRequest.request?.company||''),
        createdAt:new Date().toISOString()
      }
      await mutateState(s=>{
        s.demoBookings=s.demoBookings||[]
        s.demoBookings.unshift(item)
        s.demoBookings=s.demoBookings.slice(0,5000)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'demo.booking_confirmed',entityId:item.id,demoRequestId,startsAt:item.startsAt,at:item.createdAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,item)
    }
    if (req.method === 'GET' && url.pathname === '/api/workspace/overview') {
      const [leadStats,attr,agentRuns]=await Promise.all([
        leadOpsStats(workspaceId).catch(()=>({available:false,total:0,abQuality:0})),
        attributionStats(workspaceId).catch(()=>({available:false,matchedEvents:0,matchedValue:0,matchRate:0})),
        listAgentRuns(workspaceId,100).catch(()=>[])
      ])
      const state=await getState()
      const activeAgents=new Set(agentRuns.filter(x=>['queued','running','succeeded','completed'].includes(String(x.status||'').toLowerCase())).map(x=>x.agent_type||x.agentType)).size
      return send(req,res,200,{
        revenueAttributed:Number(attr?.matchedValue||0),
        qualifiedLeads:Number(leadStats?.abQuality||0),
        signalCoverage:attr?.matchRate==null?null:Number(attr.matchRate),
        activeAgents,
        profiles:Number(leadStats?.total||0),
        matchedEvents:Number(attr?.matchedEvents||0),
        deliveries:Number((state.signalDeliveries||[]).length)
      })
    }
    if (await handleIntegrationRoutes({req,res,url,workspaceId,readBody,send,integrations,CONNECTOR_PROVIDERS,SERVER_SECRET_CONNECTORS,CONNECTOR_REDIRECT_URI,CONNECTOR_SUCCESS_URL,connectorTokenHealth,refreshConnectorCredential,createOAuthState,hashOAuthState,createPkce})) return
    if (await handleDataQualityRoutes({req,res,url,workspaceId,readBody,send,trackedEvents,buildSignalReplayPayload})) return
    if (await handleDataOperationsRoutes({req,res,url,workspaceId,readBody,send,trackedEvents})) return
    if (await handleAttributionRoutes({req,res,url,workspaceId,readBody,send,trackedEvents})) return
    if (await handleLeadOperationsRoutes({req,res,url,workspaceId,readBody,send,agents,agentCatalog})) return
    if (await handleAudienceRoutes({req,res,url,workspaceId,readBody,send,trackedEvents})) return
    if (await handleDeliveryRoutes({req,res,url,workspaceId,readBody,send,buildSignalReplayPayload,validateSignalDispatch,IS_PROD})) return
    if (await handleComplianceRoutes({req,res,url,workspaceId,readBody,send})) return
    if (await handleConsoleRoutes({req,res,url,workspaceId,readBody,send})) return
    if (await handleWorkspaceOperationsRoutes({req,res,url,workspaceId,readBody,send,trackedEvents})) return
    if (await handleEngagementRoutes({req,res,url,workspaceId,readBody,send,authenticatedUser,authRequired:AUTH_REQUIRED,trackedEvents,leadReactivationCandidates})) return
    if (await handleAdminRoutes({req,res,url,workspaceId,readBody,send})) return
    if (await handleMcpRoutes({req,res,url,workspaceId,readBody,send})) return
    if (await handlePlatformRoutes({req,res,url,workspaceId,readBody,send,objectWorkerToken:OBJECT_WORKER_TOKEN,authRequired:AUTH_REQUIRED})) return
    if (await handleWorkflowRoutes({req,res,url,workspaceId,readBody,send})) return

    return send(req,res,404,{error:'not found'})
  } catch (error) {
    return send(req,res,500,{error:error instanceof Error?error.message:'internal error'})
  }
  })
})

server.keepAliveTimeout=65_000
server.headersTimeout=66_000
server.requestTimeout=30_000
server.listen(PORT,()=>{markStartupComplete();console.log(`AceMarketing API listening on http://localhost:${PORT}`)})
const shutdown=signal=>{beginProcessDrain();console.log(`${signal} received; draining before shutdown`);server.close(async err=>{await Promise.allSettled([closeStore(),closeAttributionStore(),closeLeadOps(),closeAgentOrchestrator(),closeCustomIntegrations(),closeObservability(),closeEntitlements(),closeBillingProvider(),closeConsentStore(),closePrivacyOps(),closeAudienceScheduler(),closeCohortAnalytics(),closeEventRules()]);process.exit(err?1:0)});setTimeout(()=>process.exit(1),10_000).unref()}
process.on('SIGTERM',()=>shutdown('SIGTERM'))
process.on('SIGINT',()=>shutdown('SIGINT'))
