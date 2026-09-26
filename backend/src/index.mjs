import http from 'node:http'
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { URL } from 'node:url'
import { createToken, verifyToken, verifyPassword, hashPassword, hasPermission, createRateLimiter, securityHeaders, resolveCorsOrigin } from './security.mjs'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from './store.mjs'
import { connectorVaultReady, decryptSecret, encryptSecret } from './vault.mjs'
import { enqueueJob, queueAvailable, queueStats } from './queue.mjs'
import { attributionStats, captureClickSession, closeAttributionStore, recordAssistedEvent, reconcileAttribution } from './attribution-store.mjs'
import { audienceOpsStats, closeLeadOps, createActivationRun, createAudience as createLeadAudience, getAudienceBundle, getLeadProfile, leadOpsStats, listActivationRuns, listAudiences as listLeadAudiences, listLeadProfiles, materializeAudience, overrideLeadGrade as persistLeadGrade, previewAudience as previewLeadAudience, scoreLead, upsertLeadProfile, updateAudienceSyncState } from './lead-ops.mjs'
import { closeAgentOrchestrator, completeFollowUp as persistCompleteFollowUp, createAgentRun, createFollowUp, createMeeting, getMeeting, listAgentRuns, listFeedback as listPersistedFeedback, listFollowUps as listPersistedFollowUps, listMeetings as listPersistedMeetings, listRoutingDecisions, recordFeedback, rescheduleMeeting, routeLead, updateAgentRun } from './agent-orchestrator.mjs'
import { closeCustomIntegrations, createCustomIntegration as persistCustomIntegration, listCustomIntegrations, testCustomIntegration as runCustomIntegrationTest } from './custom-integrations.mjs'
import { closeObservability, listAlerts as listLiveAlerts, listMonitoringRules as listLiveMonitoringRules, monitoringSnapshot, recordApiTelemetry, resolveAlert as resolveLiveAlert, saveMonitoringRule } from './observability.mjs'
import { assertCapacity, closeEntitlements, finalizeReservation, resourceCountAllowed, subscriptionSummary, updateWorkspaceEntitlements } from './entitlements.mjs'
import { billingConfigured, billingEventHistory, closeBillingProvider, createCheckoutSession, createPortalSession, processStripeEvent, verifyStripeWebhook } from './billing-provider.mjs'
import { closeConsentStore, consentAllows, consentStats, getConsent, listConsentAudit, saveConsent } from './consent.mjs'
import { closePrivacyOps, deleteSubject, exportSubject, listPrivacyRequests, purgeRetention, retentionPolicy } from './privacy-ops.mjs'
import { closeAudienceScheduler, listAudienceRefreshRuns, listAudienceSchedules, saveAudienceSchedule } from './audience-scheduler.mjs'
import { closeCohortAnalytics, cohortAnalytics } from './cohort-analytics.mjs'
import { closeReportScheduler, listReportDeliveries, listReportSchedules, queueReportNow, reportMailConfigured, saveReportSchedule } from './report-scheduler.mjs'
import { closeEventRules, createEventRule, evaluateEventRules, eventRuleStats, listEventRuleRuns, listEventRules, markEventRuleActivation, setEventRuleEnabled } from './event-rules.mjs'
import { publicNavigation, publicIndustries, publicAgents, publicIntegrations, publicChallenges, publicCaseStudies, publicResources, publicResourceCenter } from './public-content.mjs'
import { parseWhatsAppWebhook, resolveWhatsAppWorkspace, sendWhatsAppMessage, verifyWhatsAppWebhookChallenge, verifyWhatsAppWebhookSignature } from './whatsapp-cloud.mjs'
import { normalizeCallEvent, resolveCallWorkspace, verifyCallWebhook } from './call-events.mjs'
import { createCalendarEvent, updateCalendarEvent } from './calendar-provider.mjs'
import { authMailConfigured, sendPasswordReset } from './auth-mailer.mjs'

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
  'LinkedIn Ads':{provider:'linkedin',authType:'oauth2',clientId:process.env.LINKEDIN_OAUTH_CLIENT_ID||'',clientSecret:process.env.LINKEDIN_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://www.linkedin.com/oauth/v2/authorization',tokenUrl:'https://www.linkedin.com/oauth/v2/accessToken',scopes:['r_ads','rw_ads']},
  'HubSpot':{provider:'hubspot',authType:'oauth2',clientId:process.env.HUBSPOT_OAUTH_CLIENT_ID||'',clientSecret:process.env.HUBSPOT_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://app.hubspot.com/oauth/authorize',tokenUrl:'https://api.hubapi.com/oauth/2026-03/token',scopes:['crm.objects.contacts.read','crm.objects.contacts.write']},
  'Salesforce':{provider:'salesforce',authType:'oauth2',clientId:process.env.SALESFORCE_OAUTH_CLIENT_ID||'',clientSecret:process.env.SALESFORCE_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://login.salesforce.com/services/oauth2/authorize',tokenUrl:'https://login.salesforce.com/services/oauth2/token',scopes:['api','refresh_token']},
  'Zoho CRM':{provider:'zoho',authType:'oauth2',clientId:process.env.ZOHO_OAUTH_CLIENT_ID||'',clientSecret:process.env.ZOHO_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://accounts.zoho.com/oauth/v2/auth',tokenUrl:'https://accounts.zoho.com/oauth/v2/token',scopes:['ZohoCRM.modules.ALL','ZohoCRM.settings.ALL']},
  'GA4':{provider:'google',authType:'oauth2',clientId:process.env.GOOGLE_OAUTH_CLIENT_ID||'',clientSecret:process.env.GOOGLE_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://accounts.google.com/o/oauth2/v2/auth',tokenUrl:'https://oauth2.googleapis.com/token',scopes:['openid','email','https://www.googleapis.com/auth/analytics.readonly']},
  'Google Calendar':{provider:'google',authType:'oauth2',clientId:process.env.GOOGLE_OAUTH_CLIENT_ID||'',clientSecret:process.env.GOOGLE_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://accounts.google.com/o/oauth2/v2/auth',tokenUrl:'https://oauth2.googleapis.com/token',scopes:['openid','email','https://www.googleapis.com/auth/calendar.events']},
  'WhatsApp':{provider:'meta',authType:'oauth2',clientId:process.env.META_OAUTH_CLIENT_ID||'',clientSecret:process.env.META_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://www.facebook.com/v23.0/dialog/oauth',tokenUrl:'https://graph.facebook.com/v23.0/oauth/access_token',scopes:['whatsapp_business_management','whatsapp_business_messaging']}
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
const allowedOrigins = new Set((process.env.CORS_ALLOWED_ORIGINS || (IS_PROD ? '' : '*')).split(',').map(x=>x.trim()).filter(Boolean))
if (IS_PROD && (!JWT_SECRET || JWT_SECRET.length < 32)) throw new Error('JWT_SECRET must be at least 32 characters in production')
if (IS_PROD && CONNECTOR_STATE_SECRET.length < 32) throw new Error('CONNECTOR_OAUTH_STATE_SECRET must be at least 32 characters in production')
if (IS_PROD && (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH)) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD_HASH are required in production')
if (IS_PROD && allowedOrigins.size===0) throw new Error('CORS_ALLOWED_ORIGINS is required in production')
const limitRequest=createRateLimiter({windowMs:60_000,max:Number(process.env.RATE_LIMIT_PER_MINUTE||240)})

const integrations = [
  'Zoho CRM','Salesforce','LeadSquared','Meritto','HubSpot','HighLevel','Microsoft Dynamics 365','Freshsales','Custom CRM',
  'WhatsApp','Bitespeed','AiSensy','Gupshup','WATI','MoEngage','CleverTap','Mailchimp','Klaviyo','Brevo','Twilio SendGrid',
  'Exotel','Knowlarity','Tata Tele','MyOperator','Twilio',
  'Shopify','WooCommerce','Magento','WordPress','Typeform','React App','Custom Backend',
  'BigQuery','Snowflake','MongoDB','Oracle DB','Google Cloud Storage','Amazon S3',
  'Google Ads','Meta Ads','LinkedIn Ads','Microsoft Ads / Bing Ads','X','Pinterest','TikTok Ads','Yahoo Ads','Taboola','Spotify Ads','Snapchat Ads','Criteo','DV360','Google Merchant Center','Meta Lead Ads','Meta CAPI','Meta Catalog','GA4','Google Calendar',
  'Apollo','Lusha','Calixa'
]
const agents = ['Meta Advanced CAPI','Google ECL / OCI','Call Tracking Events','Custom Integration','Lead Grading','CRM Enrichment','Voice Lead Qualification','Voice Scheduler','Meeting Reminder','Feedback Agent','Lead Reactivation','Attribution Agent','Deep Linking Agent','Fraud Detection Agent','Customer Journey Agent','Audiences Agent','Event Agent','Ask Ace']
const agentCatalog={
  'Meta Advanced CAPI':{category:'Lead Quality · Signal Return',description:'Send deduplicated server-side business outcomes to Meta Ads.',operationTab:'Delivery',action:'Operate Meta signal delivery',prerequisites:['Meta Ads connection','First-party identity','Business event']},
  'Google ECL / OCI':{category:'Lead Quality · Signal Return',description:'Return enhanced and offline conversion outcomes to Google Ads.',operationTab:'AdSync',action:'Operate Google conversion signals',prerequisites:['Google Ads connection','GCLID/GBRAID/WBRAID or hashed identity','Conversion action']},
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
    const lastRaw=lead.journey?.lastActivity||lead.journey?.last_activity||null
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
    fbc:body.fbc||null,
    fbp:body.fbp||null,
    emailSha256:body.emailSha256||body.email_sha256||(body.email?sha256Normalized(body.email):null),
    phoneSha256:body.phoneSha256||body.phone_sha256||(body.phone?sha256Phone(body.phone):null),
    actionSource:body.actionSource||null,
    eventSourceUrl:body.eventSourceUrl||null,
    metaDatasetId:body.metaDatasetId||null,
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
  if(!destination.includes('meta')&&!destination.includes('google')&&!destination.includes('webhook')) return 'unsupported delivery destination'
  if(destination.includes('google')){
    const hasIdentity=Boolean(body.gclid||body.gbraid||body.wbraid||body.email||body.emailSha256||body.email_sha256||body.phone||body.phoneSha256||body.phone_sha256)
    if(!hasIdentity) return 'Google delivery requires gclid, gbraid, wbraid, or a user identifier'
  }
  if(destination.includes('meta')){
    const hasIdentity=Boolean(body.email||body.emailSha256||body.email_sha256||body.phone||body.phoneSha256||body.phone_sha256||body.externalId||body.customerId||body.fbc||body.fbp)
    if(!hasIdentity) return 'Meta delivery requires a customer identifier, click/browser identifier, email, or phone'
  }
  if(destination.includes('webhook')&&body.webhookUrl){
    try{
      const target=new URL(String(body.webhookUrl))
      if(target.protocol!=='https:'&&!(!IS_PROD&&target.protocol==='http:')) return 'webhookUrl must use HTTPS'
    }catch{return 'webhookUrl is invalid'}
  }
  return null
}

const events = [
  {name:'Qualified Lead',source:'CRM',destinations:['Google Ads','Meta Ads'],latency:'real-time',status:'active'},
  {name:'Consultation Booked',source:'CRM',destinations:['Google Ads'],latency:'real-time',status:'active'},
  {name:'WhatsApp Started',source:'WhatsApp',destinations:['Google Ads','Meta Ads'],latency:'real-time',status:'active'},
  {name:'Call Connected',source:'Calling',destinations:['Meta Ads'],latency:'real-time',status:'active'},
  {name:'Enrolment',source:'CRM / Billing',destinations:['Google Ads','Meta Ads','LinkedIn Ads'],latency:'real-time',status:'active'},
]

const permissionForRequest=(method,path)=>{
  if(path==='/api/auth/logout'||path==='/api/auth/me') return 'workspace.read'
  if(method==='GET'){
    if(path.startsWith('/api/members')) return 'members.read'
    if(path.startsWith('/api/reports')||path.startsWith('/api/attribution')||path.startsWith('/api/journeys')) return 'reports.read'
    if(path.startsWith('/api/monitoring')||path.startsWith('/api/alerts')||path.startsWith('/api/connector-health')) return 'monitoring.read'
    return 'workspace.read'
  }
  if(path.startsWith('/api/members')||path.startsWith('/api/invitations')) return 'members.write'
  if(path.startsWith('/api/integrations')||path.startsWith('/api/custom-integrations')) return 'integrations.write'
  if(path.startsWith('/api/agents')||path.startsWith('/api/models/run')) return 'agents.write'
  if(path.startsWith('/api/audiences')) return 'audiences.write'
  if(path.startsWith('/api/approvals')) return 'approvals.write'
  if(path.startsWith('/api/follow-ups')) return 'followups.write'
  if(path.startsWith('/api/qualification-calls')) return 'calls.write'
  if(path.startsWith('/api/meetings')) return 'meetings.write'
  if(path.startsWith('/api/signal-deliveries')) return 'delivery.write'
  if(path.startsWith('/api/api-keys')||path.startsWith('/api/webhooks')) return 'developer.write'
  return 'workspace.write'
}

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

const readBody = req => new Promise((resolve,reject)=>{
  let body=''
  req.on('data', chunk => {
    body += chunk
    if (body.length > 1_000_000) { reject(new Error('payload too large')); req.destroy() }
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

const publicPaths=new Set(['/api/health','/api/ready','/api/auth/login','/api/auth/google/start','/api/auth/google/exchange','/api/auth/password/forgot','/api/auth/password/reset','/api/invitations/activate','/api/demo-requests','/api/track','/api/pricing/recommend','/api/pricing/quote','/api/public/navigation','/api/public/industries','/api/public/agents','/api/public/integrations','/api/public/challenges','/api/public/case-studies','/api/public/resources','/api/public/resource-center','/api/webhooks/whatsapp','/api/webhooks/calls'])
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
  const requestStartedAt=Date.now()
  req.requestId=String(req.headers['x-request-id']||randomUUID())
  const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim()
  const rate=limitRequest(ip)
  if(!rate.allowed) return send(req,res,429,{error:'rate limit exceeded'},{'Retry-After':String(Math.max(1,Math.ceil((rate.resetAt-Date.now())/1000)))})
  const url = new URL(req.url, `http://localhost:${PORT}`)
  if (req.method === 'OPTIONS') return send(req,res,204,{})
  if (req.headers.origin && !resolveCorsOrigin(req.headers.origin,allowedOrigins)) return send(req,res,403,{error:'origin not allowed'})
  let workspaceId=String(req.headers['x-workspace-id']||process.env.DEFAULT_WORKSPACE_ID||'ws_default')
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
      const result=await processStripeEvent(event)
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
            attributes:{whatsappMessageId:event.id,messageType:event.messageType,phoneNumberId:event.phoneNumberId}
          }).catch(()=>null)
          await recordAssistedEvent(workspaceId,{
            event:'whatsapp.message_received',
            eventType:'whatsapp.message_received',
            eventId:event.id,
            customerId:'whatsapp:'+event.from,
            phone:event.from,
            source:'whatsapp',
            occurredAt:event.timestamp,
            data:{messageType:event.messageType,phoneNumberId:event.phoneNumberId}
          }).catch(()=>null)
        }
      })
      return send(req,res,200,{received:true,workspaceId,events:events.length})
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
      let duplicate=false
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
  res.once('finish',()=>{
    recordApiTelemetry(workspaceId,{requestId:req.requestId,method:req.method||'GET',path:url.pathname,statusCode:res.statusCode,latencyMs:Date.now()-requestStartedAt}).catch(()=>{})
  })
  let usageReservationId=null
  const meteredMetric=meteredMetricFor(req.method||'GET',url.pathname)
  if(meteredMetric){
    const capacity=await assertCapacity(workspaceId,meteredMetric,1,req.requestId).catch(()=>({allowed:true,reservationId:null}))
    if(!capacity.allowed) return send(req,res,429,{error:'usage quota exceeded',metric:meteredMetric,usage:capacity})
    usageReservationId=capacity.reservationId||null
    res.once('finish',()=>finalizeReservation(usageReservationId,res.statusCode<400).catch(()=>{}))
  }
  let authenticatedUser=null
  if(AUTH_REQUIRED && url.pathname.startsWith('/api/') && !isPublicRequest(req.method||'GET',url.pathname)){
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'')
    authenticatedUser=verifyToken(token,JWT_SECRET)
    if(!authenticatedUser) return send(req,res,401,{error:'unauthorized'})
    if(authenticatedUser.workspaceId!==workspaceId) return send(req,res,403,{error:'token workspace mismatch'})
  }
  return withWorkspace(workspaceId,async()=>{
  let trackedEvents=trackedEventsByWorkspace.get(workspaceId)
  if(!trackedEvents){trackedEvents=[];trackedEventsByWorkspace.set(workspaceId,trackedEvents)}
  try {
    if(authenticatedUser){
      const authState=await getState()
      const session=(authState.sessions||[]).find(x=>x.jti===authenticatedUser.jti&&x.status==='active')
      const member=(authState.members||[]).find(x=>x.id===authenticatedUser.userId&&x.status==='active')
      if(!session||!member) return send(req,res,401,{error:'session revoked or member inactive'})
      if(session.expiresAt&&Date.parse(session.expiresAt)<=Date.now()) return send(req,res,401,{error:'session expired'})
      authenticatedUser={...authenticatedUser,role:member.role,email:member.email,userId:member.id}
      req.user=authenticatedUser
      const permission=permissionForRequest(req.method||'GET',url.pathname)
      if(!hasPermission(member.role,permission)) return send(req,res,403,{error:'forbidden',permission,role:member.role})
    }
    if (req.method === 'GET' && url.pathname === '/api/health') return send(req,res,200,{ok:true,service:'ace-marketing-api',time:new Date().toISOString(),requestId:req.requestId})
    if (req.method === 'GET' && url.pathname === '/api/dashboard-summary') {
      const state=await getState()
      const safe=async(fn,fallback)=>{try{return await fn()}catch{return fallback}}
      const [leadStats,attr,audienceStats,queue,monitoring,eventRules,agentRuns,meetings,followUps,feedbackResult]=await Promise.all([
        safe(()=>leadOpsStats(workspaceId),{available:false,total:0,aGrade:0,abQuality:0}),
        safe(()=>attributionStats(workspaceId),{available:false,matchedEvents:0,unmatchedEvents:0,assistedEvents:0,activeClickSessions:0}),
        safe(()=>audienceOpsStats(workspaceId),{available:false,audiences:{total:0,active:0,activatedIdentities:0,suppressedIdentities:0,errors:0},profiles:{total:0}}),
        safe(()=>queueStats(workspaceId),{backend:'disabled',pending:0,leased:0,retry:0,succeeded:0,deadLetter:0}),
        safe(()=>monitoringSnapshot(workspaceId),{}),
        safe(()=>listEventRules(workspaceId),[]),
        safe(()=>listAgentRuns(workspaceId),[]),
        safe(()=>listPersistedMeetings(workspaceId),[]),
        safe(()=>listPersistedFollowUps(workspaceId),[]),
        safe(()=>listPersistedFeedback(workspaceId),{items:[]})
      ])
      const connectors=state.connectorConnections||[]
      const connectedConnectors=connectors.filter(x=>['connected','healthy','active'].includes(String(x.status||'').toLowerCase()))
      const deliveries=state.signalDeliveries||[]
      const integrationFlows=state.integrationFlows||[]
      const activeIntegrationFlows=integrationFlows.filter(x=>x.status==='active').length
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
        {key:'activation',title:'Activation',tab:'Audiences',ready:Number(audienceStats?.audiences?.total||0)>0||deliveries.length>0||activeIntegrationFlows>0,primary:Number(audienceStats?.audiences?.total||0)+activeIntegrationFlows,detail:Number(audienceStats?.audiences?.total||0)+' audiences · '+activeIntegrationFlows+' active flows · '+deliveries.length+' deliveries'},
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
        Funnel:section(profiles?'live':trackedCount?'attention':'setup',profiles,profiles+' known lead profiles'),
        Events:section(eventRules.length?'live':'setup',eventRules.length,eventRules.length+' conversion rules'),
        Diagnostics:section(trackedCount||eventRules.length?'live':'setup',Number((state.quarantinedEvents||[]).length),(state.quarantinedEvents||[]).length+' quarantined events'),
        'Live Sync':section(trackedCount?'live':'setup',trackedCount,trackedCount+' tracked events'),
        'Data Hub':section(profiles||trackedCount?'live':'setup',profiles,profiles+' unified profiles'),
        Journeys:section(profiles?'live':'setup',profiles,profiles+' stitched profiles'),
        Attribution:section(Number(attr?.matchedEvents||0)>0?'live':attr?.available?'attention':'setup',Number(attr?.matchedEvents||0),Number(attr?.matchedEvents||0)+' matched conversions'),
        Enrich:section(profiles?'live':'setup',profiles,profiles+' enriched profiles'),
        'Lead Grading':section(profiles?'live':'setup',Number(leadStats?.abQuality||0),Number(leadStats?.abQuality||0)+' A/B leads'),
        Agents:section(agentRuns.length?'live':'attention',agentRuns.length,agentRuns.length+' persisted runs'),
        Routing:section(Number((state.routingDecisions||[]).length)>0?'live':profiles?'attention':'setup',Number((state.routingDecisions||[]).length),(state.routingDecisions||[]).length+' routing decisions'),
        'Follow-ups':section(followUps.length?'live':profiles?'attention':'setup',followUps.length,followUps.length+' follow-up tasks'),
        Calls:section(voiceRuns.length?'live':connectedConnectors.some(x=>/exotel|knowlarity|twilio|myoperator|tata/i.test(String(x.connector||x.name||'')))?'attention':'setup',voiceRuns.length,voiceRuns.length+' qualification runs'),
        Meetings:section(meetings.length?'live':connectedConnectors.some(x=>/calendar/i.test(String(x.connector||x.name||'')))?'attention':'setup',meetings.length,meetings.length+' scheduled meetings'),
        Feedback:section(feedbackItems.length?'live':agentRuns.some(x=>String(x.agent_type||'').toLowerCase()==='feedback')?'attention':'setup',feedbackItems.length,feedbackItems.length+' feedback responses'),
        'Ask Ace':section(profiles||Number(attr?.matchedEvents||0)>0?'live':'attention',profiles+Number(attr?.matchedEvents||0),profiles||Number(attr?.matchedEvents||0)>0?'Grounded data available':'Connect data for grounded answers'),
        Integrations:section(connectedConnectors.length?'live':'setup',connectedConnectors.length,connectedConnectors.length+' connected systems'),
        'Data Flows':section(activeIntegrationFlows?'live':integrationFlows.length?'attention':'setup',activeIntegrationFlows,activeIntegrationFlows+' active flows'),
        Audiences:section(Number(audienceStats?.audiences?.total||0)>0?'live':'setup',Number(audienceStats?.audiences?.total||0),Number(audienceStats?.audiences?.total||0)+' audiences'),
        Delivery:section(deliveries.length?'live':'setup',deliveries.length,deliveries.length+' delivery records'),
        Monitoring:section('live',Number(monitoring?.openAlerts||monitoring?.alerts?.open||0),Number(monitoring?.openAlerts||monitoring?.alerts?.open||0)+' open alerts'),
        Alerts:section(Number(monitoring?.openAlerts||monitoring?.alerts?.open||0)>0?'attention':'live',Number(monitoring?.openAlerts||monitoring?.alerts?.open||0),Number(monitoring?.openAlerts||monitoring?.alerts?.open||0)+' open alerts'),
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
    if (req.method === 'GET' && url.pathname === '/api/public/navigation') return send(req,res,200,publicNavigation)
    if (req.method === 'GET' && url.pathname === '/api/public/industries') return send(req,res,200,{items:publicIndustries})
    if (req.method === 'GET' && url.pathname === '/api/public/agents') return send(req,res,200,{items:publicAgents})
    if (req.method === 'GET' && url.pathname === '/api/public/integrations') return send(req,res,200,{groups:publicIntegrations})
    if (req.method === 'GET' && url.pathname === '/api/public/challenges') return send(req,res,200,{items:publicChallenges})
    if (req.method === 'GET' && url.pathname === '/api/public/case-studies') return send(req,res,200,{items:publicCaseStudies})
    if (req.method === 'GET' && url.pathname === '/api/public/resources') return send(req,res,200,{items:publicResources})
    if (req.method === 'GET' && url.pathname === '/api/public/resource-center') return send(req,res,200,publicResourceCenter)
    if (req.method === 'GET' && url.pathname === '/api/call-events') {
      const state=await getState()
      return send(req,res,200,{items:(state.callEvents||[]).slice(0,200)})
    }
    if (req.method === 'GET' && url.pathname === '/api/whatsapp/messages') {
      const state=await getState()
      return send(req,res,200,{items:(state.whatsappEvents||[]).slice(0,200)})
    }
    if (req.method === 'POST' && url.pathname === '/api/whatsapp/messages') {
      const body=await readBody(req)
      const to=String(body.to||'').replace(/\D/g,'')
      if(!to) return send(req,res,400,{error:'recipient phone is required'})
      const purpose=String(body.purpose||'transactional').toLowerCase()
      if(purpose==='marketing'){
        const subjectId=String(body.customerId||to)
        const consent=await consentAllows(workspaceId,{subjectType:body.customerId?'customer':'visitor',subjectId,category:'marketing'})
        if(!consent.allowed) return send(req,res,403,{error:'marketing consent required',reason:consent.reason})
      }
      try{
        const result=await sendWhatsAppMessage(workspaceId,body)
        const now=new Date().toISOString()
        await mutateState(s=>{
          s.whatsappEvents=s.whatsappEvents||[]
          s.whatsappEvents.unshift({
            kind:'outbound',
            id:result.externalId||('wa_out_'+randomUUID()),
            phoneNumberId:String(body.phoneNumberId||process.env.WHATSAPP_PHONE_NUMBER_ID||''),
            recipientId:to,
            messageType:body.templateName?'template':'text',
            text:body.text?String(body.text).slice(0,4000):'',
            templateName:body.templateName||null,
            status:'accepted',
            timestamp:now,
            provider:'whatsapp_cloud',
            latencyMs:result.latencyMs,
            receivedAt:now
          })
          s.whatsappEvents=s.whatsappEvents.slice(0,10000)
          s.audit=s.audit||[]
          s.audit.unshift({id:randomUUID(),action:'whatsapp.message.sent',entityId:result.externalId||null,recipient:to,at:now})
          s.audit=s.audit.slice(0,1000)
        })
        return send(req,res,202,{accepted:true,provider:result.provider,externalId:result.externalId,latencyMs:result.latencyMs})
      }catch(error){
        return send(req,res,400,{error:error instanceof Error?error.message:'WhatsApp message failed'})
      }
    }
    if (req.method === 'POST' && url.pathname === '/api/pricing/recommend') {
      const body=await readBody(req)
      const challenges=Array.isArray(body.challenges)?body.challenges:[]
      const names=[]
      if(challenges.includes('Lead quality')) names.push('Meta Advanced CAPI','Google ECL / OCI','Call Tracking Events','Custom Integration')
      if(challenges.includes('Conversion leakage')) names.push('Lead Grading','CRM Enrichment','Voice Lead Qualification','Voice Scheduler','Meeting Reminder','Feedback Agent','Lead Reactivation')
      if(challenges.includes('Attribution')) names.push('Ask Ace')
      return send(req,res,200,{recommended:[...new Set(names)],generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/pricing/quote') {
      const body=await readBody(req)
      const leads=Number(body.leads||0)
      const channels=Array.isArray(body.channels)?body.channels:[]
      const agents=Array.isArray(body.agents)?body.agents:[]
      if(!Number.isFinite(leads)||leads<1) return send(req,res,400,{error:'valid lead volume required'})
      if(channels.length===0) return send(req,res,400,{error:'at least one channel required'})
      if(agents.length===0) return send(req,res,400,{error:'at least one agent required'})
      const item={id:'quote_'+randomUUID(),status:'captured',leads,channels,agents,dataHomes:Array.isArray(body.dataHomes)?body.dataHomes:[],challenges:Array.isArray(body.challenges)?body.challenges:[],createdAt:new Date().toISOString()}
      await mutateState(s=>{s.quoteRequests.unshift(item);s.quoteRequests=s.quoteRequests.slice(0,5000);s.audit.unshift({id:randomUUID(),action:'pricing.quote_requested',entityId:item.id,at:item.createdAt})})
      return send(req,res,201,item)
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body=await readBody(req)
      const email=String(body.email||'').trim().toLowerCase()
      const password=String(body.password||'')
      if(!email.includes('@')||password.length<6) return send(req,res,400,{error:'valid email and password length >= 6 required'})
      const state=await getState()
      let member=(state.members||[]).find(x=>String(x.email).toLowerCase()===email&&x.status==='active')
      let passwordOk=false
      if(member?.passwordHash) passwordOk=verifyPassword(password,member.passwordHash)
      else if(email===String(ADMIN_EMAIL).toLowerCase() && ADMIN_PASSWORD_HASH && ADMIN_PASSWORD_HASH!=='salt:scrypt-hex') passwordOk=verifyPassword(password,ADMIN_PASSWORD_HASH)
      else if(!IS_PROD && member) passwordOk=true
      if(!member||!passwordOk) return send(req,res,401,{error:'invalid credentials'})
      const ttl=Number(process.env.TOKEN_TTL_SECONDS||3600)
      const jti=randomUUID()
      const expiresAt=new Date(Date.now()+ttl*1000).toISOString()
      const token=createToken({email:member.email,userId:member.id,workspaceId,role:member.role,jti},JWT_SECRET,ttl)
      await mutateState(s=>{
        s.sessions=s.sessions||[]
        s.sessions.unshift({jti,userId:member.id,email:member.email,role:member.role,status:'active',createdAt:new Date().toISOString(),expiresAt})
        s.sessions=s.sessions.filter(x=>!x.expiresAt||Date.parse(x.expiresAt)>Date.now()).slice(0,5000)
        s.audit.unshift({id:randomUUID(),action:'auth.login',entityId:member.id,at:new Date().toISOString()})
      })
      return send(req,res,200,{token,user:{id:member.id,email:member.email,name:member.name,role:member.role},workspaceId,expiresIn:ttl})
    }
    if (req.method === 'GET' && url.pathname === '/api/auth/google/start') {
      if(!process.env.GOOGLE_OAUTH_CLIENT_ID||!process.env.GOOGLE_OAUTH_CLIENT_SECRET||!AUTH_GOOGLE_REDIRECT_URI) return send(req,res,503,{error:'Google login is not configured'})
      const stateToken=createOAuthState(workspaceId)
      const pkce=createPkce()
      const now=new Date().toISOString()
      const expiresAt=new Date(Date.now()+10*60*1000).toISOString()
      await mutateState(s=>{
        s.googleLoginStates=s.googleLoginStates||[]
        s.googleLoginStates=s.googleLoginStates.filter(x=>Date.parse(x.expiresAt)>Date.now())
        s.googleLoginStates.unshift({stateHash:hashOAuthState(stateToken),workspaceId,verifier:pkce.verifier,createdAt:now,expiresAt})
      })
      const auth=new URL('https://accounts.google.com/o/oauth2/v2/auth')
      auth.searchParams.set('client_id',process.env.GOOGLE_OAUTH_CLIENT_ID)
      auth.searchParams.set('redirect_uri',AUTH_GOOGLE_REDIRECT_URI)
      auth.searchParams.set('response_type','code')
      auth.searchParams.set('state',stateToken)
      auth.searchParams.set('scope','openid email profile')
      auth.searchParams.set('code_challenge',pkce.challenge)
      auth.searchParams.set('code_challenge_method','S256')
      auth.searchParams.set('prompt','select_account')
      return send(req,res,200,{authorizationUrl:auth.toString(),expiresAt})
    }
    if (req.method === 'GET' && url.pathname === '/api/auth/google/callback') {
      const stateToken=String(url.searchParams.get('state')||'')
      const code=String(url.searchParams.get('code')||'')
      const providerError=String(url.searchParams.get('error')||'')
      if(providerError) return send(req,res,400,{error:'Google authorization failed',providerError})
      const parsed=parseOAuthState(stateToken)
      if(!parsed||!code) return send(req,res,400,{error:'invalid Google login callback'})
      workspaceId=parsed.workspaceId
      return withWorkspace(workspaceId,async()=>{
        const state=await getState()
        const pending=(state.googleLoginStates||[]).find(x=>x.stateHash===hashOAuthState(stateToken)&&Date.parse(x.expiresAt)>Date.now())
        if(!pending) return send(req,res,400,{error:'expired Google login state'})
        const body=new URLSearchParams({
          grant_type:'authorization_code',
          code,
          client_id:process.env.GOOGLE_OAUTH_CLIENT_ID||'',
          client_secret:process.env.GOOGLE_OAUTH_CLIENT_SECRET||'',
          redirect_uri:AUTH_GOOGLE_REDIRECT_URI,
          code_verifier:pending.verifier
        })
        const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body})
        const tokenRaw=await tokenResponse.text()
        let tokenBody={}
        try{tokenBody=tokenRaw?JSON.parse(tokenRaw):{}}catch{}
        if(!tokenResponse.ok||!tokenBody.access_token) return send(req,res,400,{error:'Google token exchange failed'})
        const userResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+tokenBody.access_token}})
        const user=await userResponse.json()
        const email=String(user.email||'').trim().toLowerCase()
        if(!email||user.email_verified===false) return send(req,res,403,{error:'verified Google email required'})
        const member=(state.members||[]).find(x=>String(x.email).toLowerCase()===email&&x.status==='active')
        if(!member){
          if(AUTH_GOOGLE_SUCCESS_URL){
            const target=new URL(AUTH_GOOGLE_SUCCESS_URL)
            target.searchParams.set('auth_error','not_member')
            target.hash='/login'
            res.writeHead(302,{Location:target.toString()});res.end();return
          }
          return send(req,res,403,{error:'Google account is not an active workspace member'})
        }
        const rawCode=randomBytes(32).toString('base64url')
        const codeHash=createHash('sha256').update(rawCode).digest('hex')
        const expiresAt=new Date(Date.now()+2*60*1000).toISOString()
        await mutateState(s=>{
          s.googleLoginStates=(s.googleLoginStates||[]).filter(x=>x.stateHash!==pending.stateHash)
          s.googleLoginExchanges=s.googleLoginExchanges||[]
          s.googleLoginExchanges.unshift({codeHash,userId:member.id,email:member.email,role:member.role,name:member.name,workspaceId,expiresAt,used:false})
          s.googleLoginExchanges=s.googleLoginExchanges.filter(x=>!x.used&&Date.parse(x.expiresAt)>Date.now()).slice(0,200)
          s.audit=s.audit||[]
          s.audit.unshift({id:randomUUID(),action:'auth.google_verified',entityId:member.id,at:new Date().toISOString()})
          s.audit=s.audit.slice(0,1000)
        })
        if(!AUTH_GOOGLE_SUCCESS_URL) return send(req,res,200,{exchangeCode:rawCode,workspaceId})
        const target=new URL(AUTH_GOOGLE_SUCCESS_URL)
        target.searchParams.set('google_code',rawCode)
        target.searchParams.set('google_workspace',workspaceId)
        target.hash='/login'
        res.writeHead(302,{Location:target.toString()});res.end()
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/google/exchange') {
      const body=await readBody(req)
      const code=String(body.code||'')
      const targetWorkspace=String(body.workspaceId||workspaceId)
      if(!code||!/^[A-Za-z0-9_-]{1,64}$/.test(targetWorkspace)) return send(req,res,400,{error:'code and valid workspaceId required'})
      workspaceId=targetWorkspace
      return withWorkspace(workspaceId,async()=>{
        const state=await getState()
        const codeHash=createHash('sha256').update(code).digest('hex')
        const exchange=(state.googleLoginExchanges||[]).find(x=>x.codeHash===codeHash&&!x.used&&Date.parse(x.expiresAt)>Date.now())
        if(!exchange) return send(req,res,400,{error:'invalid or expired Google login code'})
        const ttl=Number(process.env.TOKEN_TTL_SECONDS||3600)
        const jti=randomUUID()
        const expiresAt=new Date(Date.now()+ttl*1000).toISOString()
        const token=createToken({email:exchange.email,userId:exchange.userId,workspaceId,role:exchange.role,jti},JWT_SECRET,ttl)
        await mutateState(s=>{
          const found=(s.googleLoginExchanges||[]).find(x=>x.codeHash===codeHash)
          if(found){found.used=true;found.usedAt=new Date().toISOString()}
          s.sessions=s.sessions||[]
          s.sessions.unshift({jti,userId:exchange.userId,email:exchange.email,role:exchange.role,status:'active',createdAt:new Date().toISOString(),expiresAt})
          s.sessions=s.sessions.filter(x=>!x.expiresAt||Date.parse(x.expiresAt)>Date.now()).slice(0,5000)
          s.audit=s.audit||[]
          s.audit.unshift({id:randomUUID(),action:'auth.google_login',entityId:exchange.userId,at:new Date().toISOString()})
          s.audit=s.audit.slice(0,1000)
        })
        return send(req,res,200,{token,user:{id:exchange.userId,email:exchange.email,name:exchange.name,role:exchange.role},workspaceId,expiresIn:ttl})
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/password/forgot') {
      const body=await readBody(req)
      const email=String(body.email||'').trim().toLowerCase()
      if(!email.includes('@')) return send(req,res,202,{accepted:true})
      const state=await getState()
      const member=(state.members||[]).find(x=>String(x.email).toLowerCase()===email&&x.status==='active')
      if(member){
        const token=randomBytes(32).toString('base64url')
        const tokenHash=createHash('sha256').update(token).digest('hex')
        const now=new Date().toISOString()
        const expiresAt=new Date(Date.now()+30*60*1000).toISOString()
        await mutateState(s=>{
          s.passwordResets=s.passwordResets||[]
          s.passwordResets.unshift({tokenHash,userId:member.id,email:member.email,expiresAt,createdAt:now,used:false})
          s.passwordResets=s.passwordResets.filter(x=>!x.used&&Date.parse(x.expiresAt)>Date.now()).slice(0,200)
          s.audit=s.audit||[]
          s.audit.unshift({id:randomUUID(),action:'auth.password_reset_requested',entityId:member.id,at:now})
          s.audit=s.audit.slice(0,1000)
        })
        if(authMailConfigured()) await sendPasswordReset({email:member.email,token})
        else if(!IS_PROD) return send(req,res,202,{accepted:true,developmentResetToken:token,expiresAt})
      }
      return send(req,res,202,{accepted:true})
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/password/reset') {
      const body=await readBody(req)
      const token=String(body.token||'')
      const password=String(body.password||'')
      if(!token||password.length<8) return send(req,res,400,{error:'valid token and password length >= 8 required'})
      const tokenHash=createHash('sha256').update(token).digest('hex')
      const state=await getState()
      const reset=(state.passwordResets||[]).find(x=>x.tokenHash===tokenHash&&!x.used&&Date.parse(x.expiresAt)>Date.now())
      if(!reset) return send(req,res,400,{error:'invalid or expired reset token'})
      const now=new Date().toISOString()
      await mutateState(s=>{
        const member=(s.members||[]).find(x=>x.id===reset.userId)
        if(member){member.passwordHash=hashPassword(password);member.updatedAt=now}
        const found=(s.passwordResets||[]).find(x=>x.tokenHash===tokenHash)
        if(found){found.used=true;found.usedAt=now}
        s.sessions=(s.sessions||[]).map(x=>x.userId===reset.userId?{...x,status:'revoked',revokedAt:now}:x)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'auth.password_reset_completed',entityId:reset.userId,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,{ok:true})
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      const jti=req.user?.jti
      if(jti) await mutateState(s=>{
        const session=(s.sessions||[]).find(x=>x.jti===jti)
        if(session){session.status='revoked';session.revokedAt=new Date().toISOString()}
        s.audit.unshift({id:randomUUID(),action:'auth.logout',entityId:req.user?.userId||'unknown',at:new Date().toISOString()})
      })
      return send(req,res,200,{ok:true})
    }
    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      return send(req,res,200,{user:{id:req.user.userId,email:req.user.email,role:req.user.role},workspaceId})
    }
    if (req.method === 'GET' && url.pathname === '/api/members') {
      const state=await getState()
      return send(req,res,200,{items:(state.members||[]).map(({passwordHash,...member})=>member)})
    }
    if (req.method === 'POST' && url.pathname === '/api/members/invite') {
      const memberCapacity=await resourceCountAllowed(workspaceId,'members')
      if(!memberCapacity.allowed) return send(req,res,429,{error:'member limit reached',usage:memberCapacity})
      const body=await readBody(req)
      const email=String(body.email||'').trim().toLowerCase()
      const role=String(body.role||'analyst')
      if(!email.includes('@')) return send(req,res,400,{error:'valid email required'})
      if(!['owner','admin','analyst','operator'].includes(role)) return send(req,res,400,{error:'invalid role'})
      const state=await getState()
      if((state.members||[]).some(x=>String(x.email).toLowerCase()===email&&x.status==='active')) return send(req,res,409,{error:'member already exists'})
      const rawToken=randomBytes(24).toString('base64url')
      const tokenHash=createHash('sha256').update(rawToken).digest('hex')
      const invitation={id:'inv_'+randomUUID(),email,role,tokenHash,status:'pending',createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+7*24*60*60*1000).toISOString(),invitedBy:req.user.userId}
      await mutateState(s=>{
        s.invitations=s.invitations||[]
        s.invitations.unshift(invitation)
        s.audit.unshift({id:randomUUID(),action:'member.invited',entityId:invitation.id,email,role,at:invitation.createdAt})
      })
      return send(req,res,201,{id:invitation.id,email,role,status:'pending',expiresAt:invitation.expiresAt,inviteToken:rawToken,notice:'Send this invite token through your approved email provider; only its SHA-256 hash is stored.'})
    }
    if (req.method === 'POST' && url.pathname === '/api/members/role') {
      const body=await readBody(req)
      const memberId=String(body.memberId||'')
      const role=String(body.role||'')
      if(!memberId||!['owner','admin','analyst','operator'].includes(role)) return send(req,res,400,{error:'memberId and valid role required'})
      if(memberId===req.user.userId&&req.user.role==='owner'&&role!=='owner') return send(req,res,409,{error:'owner cannot remove their own owner role'})
      let updated=null
      await mutateState(s=>{
        const member=(s.members||[]).find(x=>x.id===memberId)
        if(member){member.role=role;member.updatedAt=new Date().toISOString();updated={...member};delete updated.passwordHash}
        s.sessions=(s.sessions||[]).map(x=>x.userId===memberId?{...x,status:'revoked',revokedAt:new Date().toISOString()}:x)
        s.audit.unshift({id:randomUUID(),action:'member.role_changed',entityId:memberId,role,at:new Date().toISOString()})
      })
      return updated?send(req,res,200,updated):send(req,res,404,{error:'member not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/members/deactivate') {
      const body=await readBody(req)
      const memberId=String(body.memberId||'')
      if(!memberId) return send(req,res,400,{error:'memberId required'})
      if(memberId===req.user.userId) return send(req,res,409,{error:'cannot deactivate your own active session'})
      let updated=null
      await mutateState(s=>{
        const member=(s.members||[]).find(x=>x.id===memberId)
        if(member){member.status='inactive';member.updatedAt=new Date().toISOString();updated={...member};delete updated.passwordHash}
        s.sessions=(s.sessions||[]).map(x=>x.userId===memberId?{...x,status:'revoked',revokedAt:new Date().toISOString()}:x)
        s.audit.unshift({id:randomUUID(),action:'member.deactivated',entityId:memberId,at:new Date().toISOString()})
      })
      return updated?send(req,res,200,updated):send(req,res,404,{error:'member not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/invitations/activate') {
      const body=await readBody(req)
      const inviteToken=String(body.inviteToken||'')
      const password=String(body.password||'')
      const name=String(body.name||'').trim()
      if(!inviteToken||password.length<8||!name) return send(req,res,400,{error:'inviteToken, name and password length >= 8 required'})
      const tokenHash=createHash('sha256').update(inviteToken).digest('hex')
      const state=await getState()
      const invitation=(state.invitations||[]).find(x=>x.tokenHash===tokenHash&&x.status==='pending')
      if(!invitation||Date.parse(invitation.expiresAt)<=Date.now()) return send(req,res,400,{error:'invalid or expired invitation'})
      const member={id:'usr_'+randomUUID(),email:invitation.email,name,role:invitation.role,status:'active',passwordHash:hashPassword(password),createdAt:new Date().toISOString()}
      await mutateState(s=>{
        s.members=s.members||[]
        s.members.push(member)
        const inv=(s.invitations||[]).find(x=>x.id===invitation.id)
        if(inv){inv.status='accepted';inv.acceptedAt=new Date().toISOString()}
        s.audit.unshift({id:randomUUID(),action:'member.activated',entityId:member.id,email:member.email,role:member.role,at:member.createdAt})
      })
      return send(req,res,201,{user:{id:member.id,email:member.email,name:member.name,role:member.role},workspaceId})
    }
    if (req.method === 'POST' && url.pathname === '/api/demo-requests') {
      const body = await readBody(req)
      if (!body.email || !body.company) return send(req,res,400,{error:'email and company are required'})
      const item={id:randomUUID(),status:'captured',request:body,createdAt:new Date().toISOString()}
      await mutateState(s=>{s.demoRequests.unshift(item);s.demoRequests=s.demoRequests.slice(0,5000)})
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
    if (req.method === 'GET' && url.pathname === '/api/integrations') {
      const state=await getState()
      const tokenHealth=await connectorTokenHealth(workspaceId).catch(()=>[])
      const connections=state.connectorConnections||[]
      return send(req,res,200,{items:integrations.map(name=>{
        const saved=connections.find(x=>x.connector===name)
        const provider=CONNECTOR_PROVIDERS[name]
        const health=tokenHealth.find(x=>x.connector===name)||null
        return {
          name,
          status:saved?.status||(provider?'available':'manual'),
          provider:provider?.provider||'custom',
          authType:provider?.authType||'manual',
          capability:provider?'native_oauth':'configurable_adapter',
          configured:Boolean(provider?.clientId&&provider?.clientSecret&&CONNECTOR_REDIRECT_URI),
          updatedAt:saved?.updatedAt||null,
          tokenHealth:health
        }
      }),requests:(state.integrationRequests||[]).slice(0,100)})
    }
    if (req.method === 'GET' && url.pathname === '/api/integration-flows') {
      const state=await getState()
      const items=(state.integrationFlows||[]).slice().sort((a,b)=>Date.parse(b.updatedAt||b.createdAt||0)-Date.parse(a.updatedAt||a.createdAt||0))
      const active=items.filter(x=>x.status==='active').length
      const healthy=items.filter(x=>x.lastTestStatus==='passed').length
      return send(req,res,200,{items,stats:{total:items.length,active,healthy,needsAttention:Math.max(0,items.length-healthy)}})
    }
    if (req.method === 'POST' && url.pathname === '/api/integration-flows') {
      const body=await readBody(req)
      const name=String(body.name||'').trim()
      const source=String(body.source||'').trim()
      const destination=String(body.destination||'').trim()
      if(name.length<2||name.length>120) return send(req,res,400,{error:'name must be 2-120 characters'})
      if(!source||!destination) return send(req,res,400,{error:'source and destination are required'})
      if(source===destination) return send(req,res,400,{error:'source and destination must be different'})
      const now=new Date().toISOString()
      const item={
        id:'flow_'+randomUUID(),
        name,
        source,
        destination,
        object:String(body.object||'Lead / customer event').slice(0,120),
        trigger:String(body.trigger||'On record change').slice(0,120),
        identityField:String(body.identityField||'email / phone / click id').slice(0,120),
        mode:['Real-time','Every 15 minutes','Hourly','Daily'].includes(body.mode)?body.mode:'Real-time',
        status:'paused',
        lastTestAt:null,
        lastTestStatus:'not_tested',
        lastTestDetail:'Run a readiness test before activation.',
        createdAt:now,
        updatedAt:now
      }
      await mutateState(s=>{
        s.integrationFlows=s.integrationFlows||[]
        s.integrationFlows.unshift(item)
        s.integrationFlows=s.integrationFlows.slice(0,500)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'integration_flow.created',entityId:item.id,source,destination,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item})
    }
    if (req.method === 'POST' && url.pathname === '/api/integration-flows/test') {
      const body=await readBody(req)
      const id=String(body.id||'')
      const state=await getState()
      const item=(state.integrationFlows||[]).find(x=>x.id===id)
      if(!item) return send(req,res,404,{error:'integration flow not found'})
      const connections=state.connectorConnections||[]
      const custom=await listCustomIntegrations(workspaceId).catch(()=>[])
      const readiness=name=>{
        const native=connections.find(x=>x.connector===name)
        const customMatch=custom.find(x=>String(x.name||'').toLowerCase()===String(name).toLowerCase())
        if(native) return ['connected','healthy','active'].includes(String(native.status||'').toLowerCase())
        if(customMatch) return ['healthy','connected','active'].includes(String(customMatch.status||'').toLowerCase())
        return false
      }
      const sourceReady=readiness(item.source)
      const destinationReady=readiness(item.destination)
      const passed=sourceReady&&destinationReady
      const now=new Date().toISOString()
      const detail=passed
        ?'Source and destination are connected and ready for governed synchronization.'
        :'Connect '+[!sourceReady?item.source:null,!destinationReady?item.destination:null].filter(Boolean).join(' and ')+' before activation.'
      await mutateState(s=>{
        const flow=(s.integrationFlows||[]).find(x=>x.id===id)
        if(flow){flow.lastTestAt=now;flow.lastTestStatus=passed?'passed':'needs_attention';flow.lastTestDetail=detail;flow.updatedAt=now}
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'integration_flow.tested',entityId:id,status:passed?'passed':'needs_attention',at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,{id,passed,sourceReady,destinationReady,detail,testedAt:now})
    }
    if (req.method === 'POST' && url.pathname === '/api/integration-flows/toggle') {
      const body=await readBody(req)
      const id=String(body.id||'')
      const enabled=Boolean(body.enabled)
      const snapshot=await getState()
      const existing=(snapshot.integrationFlows||[]).find(x=>x.id===id)
      if(!existing) return send(req,res,404,{error:'integration flow not found'})
      if(enabled&&existing.lastTestStatus!=='passed') return send(req,res,409,{error:'flow must pass its readiness test before activation'})
      const now=new Date().toISOString()
      await mutateState(s=>{
        const flow=(s.integrationFlows||[]).find(x=>x.id===id)
        if(flow){flow.status=enabled?'active':'paused';flow.updatedAt=now}
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:enabled?'integration_flow.activated':'integration_flow.paused',entityId:id,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,{id,status:enabled?'active':'paused',updatedAt:now})
    }
    if (req.method === 'POST' && url.pathname === '/api/integration-requests') {
      const body=await readBody(req)
      const connector=String(body.connector||'').trim()
      const businessNeed=String(body.businessNeed||'').trim()
      if(connector.length<2||connector.length>120) return send(req,res,400,{error:'connector must be 2-120 characters'})
      if(businessNeed.length<5||businessNeed.length>1000) return send(req,res,400,{error:'businessNeed must be 5-1000 characters'})
      const now=new Date().toISOString()
      const item={
        id:'ireq_'+randomUUID(),
        connector,
        businessNeed,
        direction:['Inbound','Outbound','Bidirectional'].includes(body.direction)?body.direction:'Bidirectional',
        priority:['Normal','High','Critical'].includes(body.priority)?body.priority:'Normal',
        status:'requested',
        requestedBy:req.user?.email||req.user?.userId||'workspace',
        createdAt:now
      }
      await mutateState(s=>{
        s.integrationRequests=s.integrationRequests||[]
        s.integrationRequests.unshift(item)
        s.integrationRequests=s.integrationRequests.slice(0,500)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'integration.requested',entityId:item.id,connector:item.connector,priority:item.priority,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item})
    }
    if (req.method === 'GET' && url.pathname === '/api/custom-integrations') return send(req,res,200,{items:await listCustomIntegrations(workspaceId)})
    if (req.method === 'POST' && url.pathname === '/api/custom-integrations/test') {
      const body=await readBody(req)
      if(!body.baseUrl&&!body.id) return send(req,res,400,{error:'baseUrl or id required'})
      try{
        const result=await runCustomIntegrationTest(workspaceId,body)
        return send(req,res,result.ok?200:422,{...result,testedAt:new Date().toISOString()})
      }catch(error){
        return send(req,res,422,{ok:false,error:error instanceof Error?error.message:'connection test failed',testedAt:new Date().toISOString()})
      }
    }
    if (req.method === 'POST' && url.pathname === '/api/custom-integrations') {
      const integrationCapacity=await resourceCountAllowed(workspaceId,'custom_integrations')
      if(!integrationCapacity.allowed) return send(req,res,429,{error:'custom integration limit reached',usage:integrationCapacity})
      const body=await readBody(req)
      if(!body.name || !body.baseUrl || !body.identity) return send(req,res,400,{error:'name, baseUrl and identity required'})
      const item=await persistCustomIntegration(workspaceId,body)
      await mutateState(s=>{s.audit.unshift({id:randomUUID(),action:'custom_integration.created',entityId:item.id,at:new Date().toISOString()});s.audit=s.audit.slice(0,1000)})
      return send(req,res,201,item)
    }
    if (req.method === 'POST' && url.pathname === '/api/integrations/connect') {
      const body=await readBody(req)
      const connector=String(body.connector||'')
      if(!connector) return send(req,res,400,{error:'connector required'})
      const provider=CONNECTOR_PROVIDERS[connector]
      if(!provider) return send(req,res,200,{connector,status:'manual_configuration_required',authType:'manual'})
      if(!CONNECTOR_REDIRECT_URI || !provider.clientId || !provider.clientSecret) {
        const now=new Date().toISOString()
        await mutateState(s=>{
          s.connectorConnections=s.connectorConnections||[]
          const existing=s.connectorConnections.find(x=>x.connector===connector)
          const record={id:existing?.id||'conn_'+randomUUID(),connector,provider:provider.provider,status:'needs_configuration',authType:provider.authType,createdAt:existing?.createdAt||now,updatedAt:now}
          if(existing) Object.assign(existing,record); else s.connectorConnections.unshift(record)
        })
        return send(req,res,409,{connector,status:'needs_configuration',required:['CONNECTOR_OAUTH_REDIRECT_URI',provider.provider.toUpperCase()+'_OAUTH_CLIENT_ID',provider.provider.toUpperCase()+'_OAUTH_CLIENT_SECRET']})
      }
      const stateToken=createOAuthState(workspaceId)
      const pkce=createPkce()
      const createdAt=new Date().toISOString()
      const expiresAt=new Date(Date.now()+10*60*1000).toISOString()
      await mutateState(s=>{
        s.oauthStates=s.oauthStates||[]
        s.oauthStates=s.oauthStates.filter(x=>Date.parse(x.expiresAt)>Date.now())
        s.oauthStates.unshift({stateHash:hashOAuthState(stateToken),workspaceId,connector,provider:provider.provider,verifier:pkce.verifier,createdAt,expiresAt})
        s.audit.unshift({id:randomUUID(),action:'connector.oauth_started',entityId:connector,at:createdAt})
      })
      const auth=new URL(provider.authorizeUrl)
      auth.searchParams.set('client_id',provider.clientId)
      auth.searchParams.set('redirect_uri',CONNECTOR_REDIRECT_URI)
      auth.searchParams.set('response_type','code')
      auth.searchParams.set('state',stateToken)
      auth.searchParams.set('scope',provider.scopes.join(' '))
      auth.searchParams.set('code_challenge',pkce.challenge)
      auth.searchParams.set('code_challenge_method','S256')
      if(provider.provider==='google') auth.searchParams.set('access_type','offline')
      if(provider.provider==='google') auth.searchParams.set('prompt','consent')
      if(connector==='Zoho CRM'){auth.searchParams.set('access_type','offline');auth.searchParams.set('prompt','consent')}
      return send(req,res,200,{connector,status:'authorization_required',authorizationUrl:auth.toString(),expiresAt})
    }
    if (req.method === 'GET' && url.pathname === '/api/integrations/oauth/callback') {
      const stateToken=String(url.searchParams.get('state')||'')
      const code=String(url.searchParams.get('code')||'')
      const providerError=String(url.searchParams.get('error')||'')
      if(providerError) return send(req,res,400,{error:'provider authorization failed',providerError})
      if(!stateToken||!code) return send(req,res,400,{error:'state and code required'})
      const snapshot=await getState()
      const pending=(snapshot.oauthStates||[]).find(x=>x.stateHash===hashOAuthState(stateToken)&&x.workspaceId===workspaceId)
      if(!pending || Date.parse(pending.expiresAt)<=Date.now()) return send(req,res,400,{error:'invalid or expired oauth state'})
      const provider=CONNECTOR_PROVIDERS[pending.connector]
      if(!provider) return send(req,res,400,{error:'unsupported connector provider'})
      const tokenBody=new URLSearchParams({
        client_id:provider.clientId,
        client_secret:provider.clientSecret,
        redirect_uri:CONNECTOR_REDIRECT_URI,
        code,
        grant_type:'authorization_code',
        code_verifier:pending.verifier
      })
      const tokenResponse=await fetch(provider.tokenUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:tokenBody})
      const tokenPayload=await tokenResponse.json().catch(()=>({}))
      if(!tokenResponse.ok) return send(req,res,502,{error:'oauth token exchange failed',provider:provider.provider,status:tokenResponse.status})
      if(!connectorVaultReady()) return send(req,res,503,{error:'connector credential vault is not configured'})
      const encrypted=encryptSecret(tokenPayload)
      const now=new Date().toISOString()
      const expiresAt=tokenPayload.expires_in?new Date(Date.now()+Number(tokenPayload.expires_in)*1000).toISOString():null
      await mutateState(s=>{
        s.oauthStates=(s.oauthStates||[]).filter(x=>x.stateHash!==hashOAuthState(stateToken))
        s.connectorCredentials=s.connectorCredentials||[]
        const old=s.connectorCredentials.find(x=>x.connector===pending.connector)
        const credential={id:old?.id||'cred_'+randomUUID(),connector:pending.connector,provider:provider.provider,encrypted,expiresAt,updatedAt:now,createdAt:old?.createdAt||now}
        if(old) Object.assign(old,credential); else s.connectorCredentials.unshift(credential)
        s.connectorConnections=s.connectorConnections||[]
        const connection=s.connectorConnections.find(x=>x.connector===pending.connector)
        const record={id:connection?.id||'conn_'+randomUUID(),connector:pending.connector,provider:provider.provider,status:'connected',authType:'oauth2',createdAt:connection?.createdAt||now,updatedAt:now,expiresAt}
        if(connection) Object.assign(connection,record); else s.connectorConnections.unshift(record)
        s.audit.unshift({id:randomUUID(),action:'connector.connected',entityId:pending.connector,provider:provider.provider,at:now})
      })
      if(CONNECTOR_SUCCESS_URL){
        const success=new URL(CONNECTOR_SUCCESS_URL)
        success.searchParams.set('connector',pending.connector)
        success.searchParams.set('status','connected')
        res.writeHead(302,{Location:success.toString(),'Cache-Control':'no-store'})
        return res.end()
      }
      return send(req,res,200,{connector:pending.connector,status:'connected',expiresAt})
    }
    if (req.method === 'POST' && url.pathname === '/api/integrations/oauth/callback') {
      const body=await readBody(req)
      const stateToken=String(body.state||'')
      const code=String(body.code||'')
      if(!stateToken||!code) return send(req,res,400,{error:'state and code required'})
      const snapshot=await getState()
      const pending=(snapshot.oauthStates||[]).find(x=>x.stateHash===hashOAuthState(stateToken)&&x.workspaceId===workspaceId)
      if(!pending || Date.parse(pending.expiresAt)<=Date.now()) return send(req,res,400,{error:'invalid or expired oauth state'})
      const provider=CONNECTOR_PROVIDERS[pending.connector]
      if(!provider) return send(req,res,400,{error:'unsupported connector provider'})
      const tokenBody=new URLSearchParams({
        client_id:provider.clientId,
        client_secret:provider.clientSecret,
        redirect_uri:CONNECTOR_REDIRECT_URI,
        code,
        grant_type:'authorization_code',
        code_verifier:pending.verifier
      })
      const tokenResponse=await fetch(provider.tokenUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:tokenBody})
      const tokenPayload=await tokenResponse.json().catch(()=>({}))
      if(!tokenResponse.ok) return send(req,res,502,{error:'oauth token exchange failed',provider:provider.provider,status:tokenResponse.status})
      if(!connectorVaultReady()) return send(req,res,503,{error:'connector credential vault is not configured'})
      const encrypted=encryptSecret(tokenPayload)
      const now=new Date().toISOString()
      const expiresAt=tokenPayload.expires_in?new Date(Date.now()+Number(tokenPayload.expires_in)*1000).toISOString():null
      await mutateState(s=>{
        s.oauthStates=(s.oauthStates||[]).filter(x=>x.stateHash!==hashOAuthState(stateToken))
        s.connectorCredentials=s.connectorCredentials||[]
        const old=s.connectorCredentials.find(x=>x.connector===pending.connector)
        const credential={id:old?.id||'cred_'+randomUUID(),connector:pending.connector,provider:provider.provider,encrypted,expiresAt,updatedAt:now,createdAt:old?.createdAt||now}
        if(old) Object.assign(old,credential); else s.connectorCredentials.unshift(credential)
        s.connectorConnections=s.connectorConnections||[]
        const connection=s.connectorConnections.find(x=>x.connector===pending.connector)
        const record={id:connection?.id||'conn_'+randomUUID(),connector:pending.connector,provider:provider.provider,status:'connected',authType:'oauth2',createdAt:connection?.createdAt||now,updatedAt:now,expiresAt}
        if(connection) Object.assign(connection,record); else s.connectorConnections.unshift(record)
        s.audit.unshift({id:randomUUID(),action:'connector.connected',entityId:pending.connector,provider:provider.provider,at:now})
      })
      return send(req,res,200,{connector:pending.connector,status:'connected',expiresAt})
    }
    if (req.method === 'POST' && url.pathname === '/api/integrations/refresh') {
      const body=await readBody(req)
      const connector=String(body.connector||'')
      if(!connector)return send(req,res,400,{error:'connector required'})
      try{
        const result=await refreshConnectorCredential(workspaceId,connector)
        return send(req,res,200,{connector,status:'connected',refreshed:result.refreshed,expiresAt:result.expiresAt})
      }catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'connector refresh failed',connector})}
    }
    if (req.method === 'POST' && url.pathname === '/api/integrations/disconnect') {
      const body=await readBody(req)
      const connector=String(body.connector||'')
      if(!connector) return send(req,res,400,{error:'connector required'})
      const now=new Date().toISOString()
      await mutateState(s=>{
        s.connectorCredentials=(s.connectorCredentials||[]).filter(x=>x.connector!==connector)
        s.connectorConnections=s.connectorConnections||[]
        const connection=s.connectorConnections.find(x=>x.connector===connector)
        if(connection){connection.status='disconnected';connection.updatedAt=now}
        s.audit.unshift({id:randomUUID(),action:'connector.disconnected',entityId:connector,at:now})
      })
      return send(req,res,200,{connector,status:'disconnected'})
    }
    if (req.method === 'POST' && url.pathname === '/api/ask-ace') {
      const body=await readBody(req)
      const question=String(body.question||'').trim()
      if(!question) return send(req,res,400,{error:'question required'})
      if(question.length>500) return send(req,res,400,{error:'question too long'})
      const q=question.toLowerCase()
      const [attribution,leadStats,leads,activationRuns,audiences,monitoring,state,routingDecisions,agentRuns,meetings,feedbackResult,followUpItems]=await Promise.all([
        attributionStats(workspaceId).catch(()=>({available:false})),
        leadOpsStats(workspaceId).catch(()=>({available:false})),
        listLeadProfiles(workspaceId,500).catch(()=>[]),
        listActivationRuns(workspaceId,200).catch(()=>[]),
        listLeadAudiences(workspaceId).catch(()=>[]),
        monitoringSnapshot(workspaceId).catch(()=>({})),
        getState().catch(()=>({})),
        listRoutingDecisions(workspaceId,500).catch(()=>[]),
        listAgentRuns(workspaceId,500).catch(()=>[]),
        listPersistedMeetings(workspaceId).catch(()=>[]),
        listPersistedFeedback(workspaceId).catch(()=>({items:[]})),
        listPersistedFollowUps(workspaceId).catch(()=>[])
      ])
      const pct=(part,total)=>total?Number(((Number(part||0)/Number(total))*100).toFixed(1)):0
      const money=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(value||0))
      const sourceMap=new Map()
      const campaignMap=new Map()
      for(const lead of leads){
        const source=String(lead.source||'Unknown')
        const campaign=String(lead.campaign||'Unattributed')
        const high=['A','B'].includes(String(lead.grade||''))
        const score=Number(lead.score||0)
        for(const [map,key] of [[sourceMap,source],[campaignMap,campaign]]){
          const current=map.get(key)||{name:key,total:0,highQuality:0,scoreTotal:0}
          current.total+=1
          current.scoreTotal+=score
          if(high) current.highQuality+=1
          map.set(key,current)
        }
      }
      const summarize=map=>[...map.values()].map(x=>({...x,qualityRate:pct(x.highQuality,x.total),averageScore:x.total?Number((x.scoreTotal/x.total).toFixed(1)):0})).sort((a,b)=>b.highQuality-a.highQuality)
      const sources=summarize(sourceMap)
      const campaigns=summarize(campaignMap)
      const topSource=sources[0]||null
      const topCampaign=campaigns[0]||null
      const connectorConnections=(state.connectorConnections||[])
      const connectorHealth=(state.connectorHealth||[])
      const connectedConnectors=connectorConnections.filter(x=>x.status==='connected').length
      const unhealthyConnectors=connectorHealth.filter(x=>!['healthy','connected','active'].includes(String(x.status||'').toLowerCase()))
      const failedActivations=activationRuns.filter(x=>x.status==='failed').length
      const completedActivations=activationRuns.filter(x=>x.status==='succeeded').length
      const activationSuccess=pct(completedActivations,completedActivations+failedActivations)
      const suppressAudiences=audiences.filter(x=>String(x.mode||'').toLowerCase()==='suppress')
      const staleAudiences=audiences.filter(x=>x.status==='error'||x.last_sync_error)
      const evidence=(label,value,note,source)=>({label,value:String(value),note,source})
      const normalizeRef=value=>String(value||'').trim().toLowerCase()
      const knownLeadRefs=new Set(leads.flatMap(x=>[x.external_lead_id,x.name,x.customer_id].map(normalizeRef).filter(Boolean)))
      const uniqueKnown=(rows,selector)=>{
        const refs=new Set()
        for(const row of rows||[]){
          const ref=normalizeRef(selector(row))
          if(ref&&(!knownLeadRefs.size||knownLeadRefs.has(ref)))refs.add(ref)
        }
        return refs.size
      }
      const voiceRuns=(agentRuns||[]).filter(x=>String(x.agent_type||'')==='voice_qualification')
      const feedbackItems=feedbackResult?.items||[]
      const followUpCoverageCount=uniqueKnown(followUpItems,x=>x.lead_ref)
      const funnelCoverage=[
        {key:'lead',label:'Lead profiles',count:leads.length,source:'Lead operations'},
        {key:'routing',label:'Routed leads',count:uniqueKnown(routingDecisions,x=>x.lead_ref),source:'Routing decisions'},
        {key:'qualification',label:'Voice-qualified/attempted',count:uniqueKnown(voiceRuns,x=>x.entity_id||x.input?.lead),source:'Agent runs'},
        {key:'meeting',label:'Meetings scheduled',count:uniqueKnown(meetings,x=>x.lead_ref),source:'Meetings'},
        {key:'follow_up',label:'Follow-ups created',count:followUpCoverageCount,source:'Follow-up operations'},
        {key:'feedback',label:'Feedback captured',count:uniqueKnown(feedbackItems,x=>x.lead_ref),source:'Feedback'}
      ].map((x,index)=>({...x,coverage:index===0?100:pct(x.count,Math.max(1,leads.length))}))
      const weakestHandoff=funnelCoverage.slice(1).sort((a,b)=>a.coverage-b.coverage)[0]||null
      let intent='workspace_summary'
      let answer=''
      let insights=[]
      let confidence='medium'
      let followUps=[]
      if(q.includes('funnel')||q.includes('drop')||q.includes('handoff')||q.includes('step-by-step')||q.includes('step by step')||q.includes('stage coverage')){
        intent='funnel_monitoring'
        const total=leads.length
        answer=total
          ? 'The workspace has '+total+' persisted lead profiles. '+funnelCoverage.slice(1).map(x=>x.label+': '+x.count+' ('+x.coverage+'% coverage)').join(' · ')+'.'+(weakestHandoff?' The thinnest observed handoff is '+weakestHandoff.label+' at '+weakestHandoff.coverage+'% coverage.':'')
          : 'There are no persisted lead profiles yet, so step-by-step funnel coverage cannot be measured reliably.'
        insights=funnelCoverage.map(x=>evidence(x.label,x.count,(x.coverage||0)+'% of persisted lead profiles',x.source))
        confidence=total?'high':'low'
        followUps=['Which leads have not reached routing yet?','How many leads reached meetings?','Where is attribution breaking after the handoff?']
      }else if(q.includes('campaign')||q.includes('revenue')||q.includes('roas')||q.includes('channel')){
        intent='campaign_performance'
        const matchedValue=Number(attribution.matchedValue||0)
        answer=topCampaign
          ? topCampaign.name+' currently has the strongest observed lead-quality signal: '+topCampaign.highQuality+' A/B-grade leads from '+topCampaign.total+' profiled leads.'+(matchedValue>0?' Matched assisted-event value is '+money(matchedValue)+'.':'')
          : matchedValue>0
            ? 'The workspace has '+money(matchedValue)+' in matched assisted-event value, but there is not enough campaign-level lead data to name a strongest campaign confidently.'
            : 'There is not enough connected campaign or matched-revenue data to answer this reliably yet.'
        insights=[
          evidence('Top campaign',topCampaign?.name||'Not enough data',topCampaign?topCampaign.qualityRate+'% A/B lead rate':'No campaign profile data','Lead profiles'),
          evidence('Matched value',matchedValue?money(matchedValue):'No matched value',Number(attribution.matchedEvents||0)+' matched assisted events','Attribution store'),
          evidence('Attribution match rate',attribution.available?Number(attribution.matchRate||0)+'%':'Unavailable',Number(attribution.unmatchedEvents||0)+' unmatched events','Attribution store')
        ]
        confidence=topCampaign||matchedValue?'high':'low'
        followUps=['Which campaign has the weakest lead quality?','How much revenue is currently unmatched?','Which source should I scale based on lead quality?']
      }else if(q.includes('qualified')||q.includes('lead quality')||q.includes('lead')||q.includes('junk')){
        intent='lead_quality'
        const high=Number(leadStats.abQuality||0),total=Number(leadStats.total||0),rate=pct(high,total)
        answer=total
          ? high+' of '+total+' active lead profiles are A/B grade ('+rate+'%). Average score is '+Number(leadStats.averageScore||0)+'.'+(topSource?' '+topSource.name+' currently contributes the most high-quality profiles.':'')
          : 'No persisted lead profiles are available yet, so lead-quality conclusions would be speculative.'
        insights=[
          evidence('A/B-grade leads',high,rate+'% of active profiles','Lead operations'),
          evidence('Average lead score',Number(leadStats.averageScore||0),'A grade: '+Number(leadStats.aGrade||0)+' · D grade: '+Number(leadStats.dGrade||0),'Lead operations'),
          evidence('Strongest source',topSource?.name||'Not enough data',topSource?topSource.highQuality+' high-quality leads · '+topSource.qualityRate+'% quality rate':'No source profile data','Lead profiles')
        ]
        confidence=total?'high':'low'
        followUps=['Which source is sending the most low-quality leads?','Which campaign has the highest A/B-grade rate?','What should we suppress to reduce wasted spend?']
      }else if(q.includes('suppress')||q.includes('audience')||q.includes('retarget')){
        intent='audience_suppression'
        const lowQuality=Number(leadStats.dGrade||0)+Number(leadStats.cGrade||0)
        const first=suppressAudiences[0]
        answer=first
          ? first.name+' is already configured as a suppression audience with '+Number(first.matched_size||0)+' matched identities.'+(lowQuality>0?' There are also '+lowQuality+' C/D-grade leads that may be candidates for tighter exclusion rules, subject to your policy.':'')
          : lowQuality>0
            ? 'There are '+lowQuality+' C/D-grade leads in the current profile set, but no persisted suppression audience is available to confirm they are excluded from paid media.'
            : 'There is not enough audience or lead-grade data to recommend a suppression action confidently.'
        insights=[
          evidence('Suppression audiences',suppressAudiences.length,first?first.name:'None persisted','Audience store'),
          evidence('C/D-grade leads',lowQuality,'Potential low-quality pool before policy checks','Lead operations'),
          evidence('Audience sync issues',staleAudiences.length,staleAudiences.length?'Review provider sync state':'No audience sync errors observed','Audience store')
        ]
        confidence=first||lowQuality?'medium':'low'
        followUps=['Which audience has a sync error?','How many low-quality users are still targetable?','Which high-intent audience is ready to activate?']
      }else if(q.includes('integration')||q.includes('connector')||q.includes('sync')||q.includes('signal health')||q.includes('delivery')){
        intent='signal_health'
        answer=connectedConnectors+' of '+connectorConnections.length+' configured connectors are connected. '+(unhealthyConnectors.length?unhealthyConnectors.length+' connector-health records need review.':'No connector-health records are currently flagged.')+(failedActivations?' '+failedActivations+' recent activation runs failed.':'')
        insights=[
          evidence('Connected connectors',connectedConnectors,connectorConnections.length+' configured connection records','Workspace state'),
          evidence('Connector health issues',unhealthyConnectors.length,unhealthyConnectors.length?'Review connector-health details':'No connector-health issues observed','Connector state'),
          evidence('Activation success rate',activationSuccess+'%',failedActivations+' failed · '+activationRuns.filter(x=>['queued','processing','retrying'].includes(String(x.status))).length+' queued/retrying','Activation runs'),
          evidence('API health',monitoring?.api?.errorRate!==undefined?Number(monitoring.api.errorRate)+'% error rate':'Available in monitoring','Latest operational snapshot','Observability')
        ]
        confidence=connectorConnections.length||activationRuns.length?'high':'medium'
        followUps=['Which connector needs attention first?','How many activation runs are failing?','Are any audiences failing to sync?']
      }else if(q.includes('attribution')||q.includes('match')||q.includes('unmatched')||q.includes('journey')){
        intent='attribution_health'
        answer=attribution.available
          ? 'Attribution currently matches '+Number(attribution.matchedEvents||0)+' of '+Number(attribution.assistedEvents||0)+' assisted events ('+Number(attribution.matchRate||0)+'%). '+Number(attribution.unmatchedEvents||0)+' remain unmatched, with '+money(attribution.matchedValue||0)+' in matched value.'
          : 'The attribution store is not available, so I cannot give a grounded journey-match answer.'
        insights=[
          evidence('Match rate',attribution.available?Number(attribution.matchRate||0)+'%':'Unavailable',Number(attribution.matchedEvents||0)+' matched events','Attribution store'),
          evidence('Unmatched events',Number(attribution.unmatchedEvents||0),'Needs identity or source reconciliation','Attribution store'),
          evidence('Matched value',money(attribution.matchedValue||0),Number(attribution.activeClickSessions||0)+' active click sessions','Attribution store')
        ]
        confidence=attribution.available?'high':'low'
        followUps=['Why are events unmatched?','Which identity method is matching most events?','How much matched value comes from assisted conversions?']
      }else{
        const readiness=[attribution.available,leadStats.available,connectedConnectors>0,audiences.length>0,activationRuns.length>0].filter(Boolean).length
        answer='I can currently ground answers across '+readiness+'/5 operational data areas: attribution, lead profiles, connectors, audiences, and activation runs. Ask about lead quality, campaigns/revenue, attribution, audience suppression, or signal health for a more specific analysis.'
        insights=[
          evidence('Lead profiles',Number(leadStats.total||0),'Average score '+Number(leadStats.averageScore||0),'Lead operations'),
          evidence('Attribution match rate',attribution.available?Number(attribution.matchRate||0)+'%':'Unavailable',Number(attribution.unmatchedEvents||0)+' unmatched','Attribution store'),
          evidence('Connected connectors',connectedConnectors,unhealthyConnectors.length+' health issue(s)','Workspace state')
        ]
        confidence=readiness>=3?'high':'medium'
        followUps=['Which campaign is producing the best-quality leads?','Where is attribution breaking?','Which audience should we suppress?']
      }
      return send(req,res,200,{answer,insights,intent,confidence,followUps,generatedAt:new Date().toISOString(),grounded:true})
    }
    if (req.method === 'GET' && url.pathname === '/api/events') {
      const [items,runs,stats]=await Promise.all([listEventRules(workspaceId),listEventRuleRuns(workspaceId,50),eventRuleStats(workspaceId)])
      return send(req,res,200,{items,runs,stats,templates:[
        {id:'pricing_page_lead',category:'Lead quality',name:'Pricing-page Lead',description:'Identify form submissions that showed pricing-page intent before converting.',useCase:'Prioritize high-commercial-intent leads and return a stronger optimization signal.',sourceEvent:'form_submitted',condition:{field:'properties.pricingPageViews',operator:'gte',value:1},outputEvent:'pricing_page_lead',destinations:['Google Ads','Meta Ads'],valueMode:'copy',currency:'INR'},
        {id:'new_customer_purchase',category:'Commerce',name:'New Customer Purchase',description:'Separate first-time buyers from repeat purchasers.',useCase:'Measure and optimize true new-customer acquisition and CAC.',sourceEvent:'purchase',condition:{field:'properties.customerType',operator:'equals',value:'new'},outputEvent:'new_customer_purchase',destinations:['Google Ads','Meta Ads'],valueMode:'copy',currency:'INR'},
        {id:'repeat_purchase',category:'Commerce',name:'Repeat Purchase',description:'Identify purchases from customers with prior completed orders.',useCase:'Build retention and loyalty cohorts and separate repeat revenue from acquisition revenue.',sourceEvent:'purchase',condition:{field:'properties.purchaseCount',operator:'gte',value:2},outputEvent:'repeat_purchase',destinations:['Google Ads','Meta Ads'],valueMode:'copy',currency:'INR'},
        {id:'abandoned_checkout',category:'Commerce',name:'Abandoned Checkout',description:'Accept a checkout-abandoned event emitted by your commerce webhook/backend after the configured inactivity window.',useCase:'Build recovery audiences and measure checkout leakage without pretending a stateless browser rule can detect elapsed time.',sourceEvent:'checkout_abandoned',condition:{field:'properties.reason',operator:'exists',value:null},outputEvent:'abandoned_checkout',destinations:['Google Ads','Meta Ads'],valueMode:'copy',currency:'INR'},
        {id:'high_value_purchase',category:'Commerce',name:'High-value Purchase',description:'Create a conversion signal only when order value crosses the configured threshold.',useCase:'Build high-value cohorts and teach bidding systems which purchases matter most.',sourceEvent:'purchase',condition:{field:'value',operator:'gte',value:4000},outputEvent:'high_value_purchase',destinations:['Google Ads','Meta Ads'],valueMode:'copy',currency:'INR'},
        {id:'category_interest_event',category:'Personalization',name:'Category Interest',description:'Create a category-specific intent signal from viewed or purchased product categories.',useCase:'Build category audiences and feed personalization workflows from first-party behavior.',sourceEvent:'product_interaction',condition:{field:'properties.productCategory',operator:'equals',value:'skin'},outputEvent:'category_interest',destinations:['Google Ads','Meta Ads'],valueMode:'copy',currency:'INR'},
        {id:'prepaid_order',category:'Commerce',name:'Prepaid Order',description:'Separate prepaid orders from cash-on-delivery or other payment modes.',useCase:'Optimize acquisition toward lower-risk, higher-confidence orders.',sourceEvent:'purchase',condition:{field:'properties.paymentType',operator:'equals',value:'prepaid'},outputEvent:'prepaid_order',destinations:['Google Ads','Meta Ads'],valueMode:'copy',currency:'INR'},
        {id:'fulfilled_order',category:'Commerce',name:'Fulfilled Order',description:'Promote only orders that progressed to fulfillment.',useCase:'Return post-purchase quality instead of optimizing only on checkout completion.',sourceEvent:'order_status',condition:{field:'properties.status',operator:'equals',value:'fulfilled'},outputEvent:'fulfilled_order',destinations:['Google Ads','Meta Ads'],valueMode:'copy',currency:'INR'},
        {id:'returned_order',category:'Commerce',name:'Returned Order',description:'Capture returned or rejected orders as a downstream quality signal.',useCase:'Exclude poor-fit cohorts from lookalikes and analyze return-driven waste.',sourceEvent:'order_status',condition:{field:'properties.status',operator:'equals',value:'returned'},outputEvent:'returned_order',destinations:[],valueMode:'copy',currency:'INR'},
        {id:'first_touch_attribution',category:'Attribution',name:'First-touch Attribution',description:'Capture the first known marketing touch for a stitched customer journey.',useCase:'Preserve acquisition-source evidence for first-touch reporting and journey analysis.',sourceEvent:'attribution_touch',condition:{field:'properties.touchType',operator:'equals',value:'first'},outputEvent:'first_touch_attribution',destinations:[],valueMode:'copy',currency:'INR'},
        {id:'last_touch_attribution',category:'Attribution',name:'Last-touch Attribution',description:'Capture the final marketing touch before a qualified or revenue outcome.',useCase:'Compare closing-channel influence against first-touch and multi-touch views.',sourceEvent:'attribution_touch',condition:{field:'properties.touchType',operator:'equals',value:'last'},outputEvent:'last_touch_attribution',destinations:[],valueMode:'copy',currency:'INR'}
      ]})
    }
    if (req.method === 'POST' && url.pathname === '/api/events/rules') {
      const body=await readBody(req)
      try{
        const item=await createEventRule(workspaceId,body,req.user?.email||req.user?.userId||null)
        return send(req,res,201,{item})
      }catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'invalid event rule'})}
    }
    if (req.method === 'POST' && url.pathname === '/api/events/rules/toggle') {
      const body=await readBody(req)
      if(!body.id||typeof body.enabled!=='boolean') return send(req,res,400,{error:'id and enabled boolean required'})
      const item=await setEventRuleEnabled(workspaceId,String(body.id),body.enabled)
      return item?send(req,res,200,{item}):send(req,res,404,{error:'event rule not found'})
    }
    if (req.method === 'GET' && url.pathname === '/api/adjustments') {
      const state=await getState()
      return send(req,res,200,{items:(state.adjustments||[]).slice(0,500)})
    }
    if (req.method === 'POST' && url.pathname === '/api/adjustments') {
      const body=await readBody(req)
      const event=String(body.event||'').trim()
      const source=String(body.source||'').trim()
      const destination=String(body.destination||'').trim()
      const reason=String(body.reason||'').trim()
      if(!event||!source||!destination||!reason) return send(req,res,400,{error:'event, source, destination and reason are required'})
      const parseValue=value=>{
        if(value==null||value==='')return null
        const numeric=Number(value)
        return Number.isFinite(numeric)?numeric:String(value).slice(0,200)
      }
      const now=new Date().toISOString()
      const item={
        id:'adj_'+randomUUID(),
        event:event.slice(0,160),
        source:source.slice(0,160),
        destination:destination.slice(0,160),
        fromValue:parseValue(body.fromValue),
        toValue:parseValue(body.toValue),
        currency:String(body.currency||'INR').slice(0,12),
        reason:reason.slice(0,500),
        status:'pending',
        createdAt:now,
        createdBy:req.user?.email||req.user?.userId||null
      }
      await mutateState(s=>{
        s.adjustments=s.adjustments||[]
        s.adjustments.unshift(item)
        s.adjustments=s.adjustments.slice(0,1000)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'adjustment.created',entityId:item.id,event:item.event,destination:item.destination,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item})
    }
    if (req.method === 'POST' && url.pathname === '/api/adjustments/preview') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      const state=await getState()
      const item=(state.adjustments||[]).find(x=>x.id===body.id)
      if(!item) return send(req,res,404,{error:'adjustment not found'})
      const payload={
        eventId:item.id,
        event:item.event,
        destination:item.destination,
        adjustment:{from:item.fromValue??null,to:item.toValue??null,currency:item.currency||null,reason:item.reason||null},
        idempotencyKey:createHash('sha256').update(workspaceId+':'+item.id).digest('hex')
      }
      return send(req,res,200,{item,payload,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/adjustments/apply') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      const now=new Date().toISOString()
      let updated=null
      await mutateState(s=>{
        const item=(s.adjustments||[]).find(x=>x.id===body.id)
        if(item){item.status='applied';item.appliedAt=now;item.updatedAt=now;updated={...item}}
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'adjustment.applied',entityId:String(body.id),at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return updated?send(req,res,200,{...updated,auditId:randomUUID()}):send(req,res,404,{error:'adjustment not found'})
    }
    if (req.method === 'GET' && url.pathname === '/api/fingerprinting') {
      const [attr,profiles,state]=await Promise.all([attributionStats(workspaceId),listLeadProfiles(workspaceId,500),getState()])
      const matched=Number(attr?.matchedEvents||0),unmatched=Number(attr?.unmatchedEvents||0),total=matched+unmatched
      const deviceProfiles=profiles.filter(x=>x.device_id).length
      const wa=(state.whatsappEvents||[]).filter(x=>x.kind==='message').length
      const calls=(state.callEvents||[]).length
      const scenarios=[
        {name:'third_party_checkout',evidence:Number(attr?.activeClickSessions||0),matchRate:total?Number((matched/total*100).toFixed(1)):null},
        {name:'whatsapp_handoff',evidence:wa,matchRate:wa&&total?Number((matched/total*100).toFixed(1)):null},
        {name:'call_handoff',evidence:calls,matchRate:calls&&total?Number((matched/total*100).toFixed(1)):null},
        {name:'returning_device',evidence:deviceProfiles,matchRate:deviceProfiles&&profiles.length?Number((deviceProfiles/profiles.length*100).toFixed(1)):null}
      ]
      return send(req,res,200,{available:true,continuityRate:total?Number((matched/total*100).toFixed(1)):null,ambiguousRate:total?Number((unmatched/total*100).toFixed(1)):null,scenarios,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/fingerprinting/test') {
      const body=await readBody(req)
      if(!body.scenario) return send(req,res,400,{error:'scenario required'})
      const [attr,profiles,state]=await Promise.all([attributionStats(workspaceId),listLeadProfiles(workspaceId,500),getState()])
      const key=String(body.scenario).toLowerCase()
      const evidence=key.includes('whatsapp')?(state.whatsappEvents||[]).length:key.includes('call')?(state.callEvents||[]).length:key.includes('device')?profiles.filter(x=>x.device_id).length:Number(attr?.activeClickSessions||0)
      const result={id:'fptest_'+randomUUID(),scenario:String(body.scenario),status:evidence>0?'evidence_available':'no_evidence',deterministicMatch:Number(attr?.matchedEvents||0)>0,evidenceCount:evidence,testedAt:new Date().toISOString()}
      await mutateState(s=>{s.fingerprintTests=s.fingerprintTests||[];s.fingerprintTests.unshift(result);s.fingerprintTests=s.fingerprintTests.slice(0,200);s.audit=s.audit||[];s.audit.unshift({id:randomUUID(),action:'fingerprinting.test',entityId:result.id,scenario:result.scenario,status:result.status,at:result.testedAt});s.audit=s.audit.slice(0,1000)})
      return send(req,res,200,result)
    }
    if (req.method === 'GET' && url.pathname === '/api/fingerprinting/matches') {
      const live=await attributionStats(workspaceId)
      return send(req,res,200,{items:(live?.recent||[]).filter(x=>x.status==='matched').slice(0,100),methods:live?.methods||[]})
    }
    if (req.method === 'GET' && url.pathname === '/api/sites') {
      const state=await getState()
      const settings=state.settings||{}
      const domainMap=new Map()
      const ensure=(domain,environment='production')=>{
        if(!domain)return null
        const clean=String(domain).replace(/^https?:\/\//,'').split('/')[0]
        if(!clean)return null
        const item=domainMap.get(clean)||{domain:clean,environment,events:0,lastEventAt:null}
        domainMap.set(clean,item)
        return item
      }
      ensure(settings.primaryDomain||state.launchpad?.primaryDomain||'')
      for(const event of trackedEvents){
        let domain=event.domain||event.host||''
        if(!domain&&event.url){try{domain=new URL(String(event.url)).host}catch{}}
        const item=ensure(domain,event.environment||'production')
        if(item){item.events++;const time=event.receivedAt||event.occurredAt||event.timestamp;if(time&&(!item.lastEventAt||Date.parse(time)>Date.parse(item.lastEventAt)))item.lastEventAt=time}
      }
      for(const cfg of state.sites||[]){const item=ensure(cfg.domain,cfg.environment||'production');if(item)Object.assign(item,cfg)}
      const totalTracked=Math.max(1,trackedEvents.length)
      const items=[...domainMap.values()].map(x=>({
        domain:x.domain,
        environment:x.environment||'production',
        pixel:x.events>0?'active':'needs_review',
        server:'connected',
        coverage:Number((x.events/totalTracked*100).toFixed(1)),
        events:x.events,
        lastEventAt:x.lastEventAt,
        consent:'workspace policy'
      }))
      return send(req,res,200,{items,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/sites') {
      const body=await readBody(req)
      const raw=String(body.domain||'').trim().toLowerCase()
      const domain=raw.replace(/^https?:\/\//,'').split('/')[0]
      if(!domain||!domain.includes('.')) return send(req,res,400,{error:'valid domain required'})
      const environment=['production','staging','development'].includes(String(body.environment||'').toLowerCase())?String(body.environment).toLowerCase():'production'
      const now=new Date().toISOString()
      let item=null
      await mutateState(s=>{
        s.sites=s.sites||[]
        const existing=s.sites.find(x=>String(x.domain).toLowerCase()===domain)
        if(existing){existing.environment=environment;existing.updatedAt=now;item={...existing};return}
        item={id:'site_'+randomUUID(),domain,environment,createdAt:now}
        s.sites.unshift(item)
        s.sites=s.sites.slice(0,200)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'site.created',entityId:item.id,domain,environment,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,item?.createdAt===now?201:200,{item})
    }
    if (req.method === 'POST' && url.pathname === '/api/sites/test') {
      const body=await readBody(req)
      if(!body.domain) return send(req,res,400,{error:'domain required'})
      const domain=String(body.domain)
      const matching=trackedEvents.filter(x=>{
        const raw=String(x.domain||x.host||x.url||'')
        return raw.includes(domain)
      })
      const state=await getState()
      const consentReady=Boolean((state.consentPreferences||state.settings?.consentMode||state.settings?.primaryDomain))
      const result={id:'sitetest_'+randomUUID(),domain,pixel:matching.length>0,server:true,consent:consentReady,crossDomain:matching.some(x=>x.customerId||x.visitorId||x.deviceId||x.device_id),eventsObserved:matching.length,testedAt:new Date().toISOString()}
      await mutateState(s=>{s.siteTests=s.siteTests||[];s.siteTests.unshift(result);s.siteTests=s.siteTests.slice(0,200)})
      return send(req,res,200,result)
    }
    if (req.method === 'GET' && url.pathname === '/api/sites/debug') {
      const domain=String(url.searchParams.get('domain')||'')
      const state=await getState()
      const source=[...trackedEvents].slice(-200).reverse()
      const persisted=(state.recentEvents||[]).slice(0,200)
      const items=[...source,...persisted].filter((x,index,arr)=>arr.findIndex(y=>String(y.id||y.eventId||'')===String(x.id||x.eventId||''))===index)
      return send(req,res,200,{domain,items:items.filter(x=>!domain||String(x.domain||x.host||x.url||'').includes(domain)).slice(0,100)})
    }
    if (req.method === 'GET' && url.pathname === '/api/fraud') {
      const [profiles,state]=await Promise.all([listLeadProfiles(workspaceId,500),getState()])
      const countDriver=key=>profiles.filter(x=>(x.score_drivers||[]).some(d=>d.key===key)).length
      const duplicates=countDriver('duplicate')
      const invalid=countDriver('invalid_contact')
      const fraudHigh=profiles.filter(x=>(x.score_drivers||[]).some(d=>d.key==='fraud'&&Number(d.points)<=-30)).length
      const lowQuality=profiles.filter(x=>x.grade==='D').length
      const recent=trackedEvents.filter(x=>Date.now()-Date.parse(x.receivedAt||x.occurredAt||0)<5*60*1000)
      const identityCounts=new Map()
      for(const event of recent){const id=event.customerId||event.visitorId||event.deviceId||event.device_id||event.emailSha256||event.phoneSha256;if(id)identityCounts.set(id,(identityCounts.get(id)||0)+1)}
      const burst=[...identityCounts.values()].filter(n=>n>=20).length
      const items=[
        {key:'duplicate_lead_burst',name:'Duplicate lead burst',severity:duplicates?'high':'info',affected:duplicates,source:'Lead profiles',description:'Profiles penalized by duplicate-identity scoring evidence.'},
        {key:'bot_form_activity',name:'High-velocity identity activity',severity:burst?'high':'info',affected:burst,source:'First-party events',description:'Identities generating unusually high event volume in a five-minute window.'},
        {key:'invalid_phone_pattern',name:'Invalid contact evidence',severity:invalid?'medium':'info',affected:invalid,source:'Lead profiles',description:'Profiles penalized by contact-validation evidence.'},
        {key:'high_fraud_score',name:'High fraud-risk profiles',severity:fraudHigh?'high':'info',affected:fraudHigh,source:'Lead scoring',description:'Profiles with the strongest fraud-risk penalty.'},
        {key:'low_quality_pool',name:'Low-quality lead pool',severity:lowQuality?'low':'info',affected:lowQuality,source:'Lead grades',description:'D-grade leads available for review or suppression policy.'}
      ].filter(x=>x.affected>0)
      return send(req,res,200,{items,blocked:state.fraudBlocks||[],reviews:(state.reviewQueue||[]).filter(x=>x.kind==='fraud'),generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/fraud/block') {
      const body=await readBody(req)
      if(!body.pattern) return send(req,res,400,{error:'pattern required'})
      const item={pattern:String(body.pattern),status:'blocked_from_optimization',ruleId:'fraud_'+randomUUID(),appliedAt:new Date().toISOString(),appliedBy:req.user?.email||req.user?.userId||null}
      await mutateState(s=>{s.fraudBlocks=s.fraudBlocks||[];if(!s.fraudBlocks.some(x=>x.pattern===item.pattern))s.fraudBlocks.unshift(item);s.fraudBlocks=s.fraudBlocks.slice(0,500);s.audit=s.audit||[];s.audit.unshift({id:randomUUID(),action:'fraud.blocked',entityId:item.ruleId,pattern:item.pattern,at:item.appliedAt});s.audit=s.audit.slice(0,1000)})
      return send(req,res,200,item)
    }
    if (req.method === 'POST' && url.pathname === '/api/fraud/review') {
      const body=await readBody(req)
      if(!body.pattern) return send(req,res,400,{error:'pattern required'})
      const now=new Date().toISOString()
      const item={id:'review_'+randomUUID(),kind:'fraud',pattern:String(body.pattern),status:'queued',createdAt:now,requestedBy:req.user?.email||req.user?.userId||null}
      await mutateState(s=>{
        s.reviewQueue=s.reviewQueue||[]
        s.reviewQueue.unshift(item)
        s.reviewQueue=s.reviewQueue.slice(0,1000)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'fraud.review_queued',entityId:item.id,pattern:item.pattern,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,202,item)
    }
    if (req.method === 'GET' && url.pathname === '/api/deep-links') {
      const state=await getState()
      const items=(state.deepLinks||[]).map(link=>{
        const events=(state.deepLinkEvents||[]).filter(x=>x.slug===link.slug)
        const clicks=events.filter(x=>x.kind==='click').length
        const appOpens=events.filter(x=>x.kind==='app_open').length
        const conversions=events.filter(x=>x.kind==='conversion').length
        return {...link,clicks,appOpens,conversions,conversionRate:clicks?Number((conversions/clicks*100).toFixed(1)):0}
      })
      return send(req,res,200,{items,stats:{active:items.filter(x=>x.status==='active').length,draft:items.filter(x=>x.status!=='active').length,clicks:items.reduce((n,x)=>n+x.clicks,0),appOpens:items.reduce((n,x)=>n+x.appOpens,0),conversions:items.reduce((n,x)=>n+x.conversions,0)},generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/deep-links') {
      const body=await readBody(req)
      if(!body.name||!body.slug||!body.target||!body.fallback) return send(req,res,400,{error:'name, slug, target and fallback required'})
      const slug=String(body.slug).trim().toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'')
      if(!slug)return send(req,res,400,{error:'valid slug required'})
      let created=null
      await mutateState(s=>{
        s.deepLinks=s.deepLinks||[]
        if(s.deepLinks.some(x=>x.slug===slug))return
        created={id:'dl_'+randomUUID(),name:String(body.name),slug,target:String(body.target),fallback:String(body.fallback),status:'draft',createdAt:new Date().toISOString()}
        s.deepLinks.unshift(created)
      })
      return created?send(req,res,201,created):send(req,res,409,{error:'slug already exists'})
    }
    if (req.method === 'POST' && url.pathname === '/api/deep-links/event') {
      const body=await readBody(req)
      if(!body.slug||!['click','app_open','conversion'].includes(String(body.kind))) return send(req,res,400,{error:'slug and valid kind required'})
      const event={id:'dle_'+randomUUID(),slug:String(body.slug),kind:String(body.kind),customerId:body.customerId||null,value:body.value??null,source:body.source||null,createdAt:new Date().toISOString()}
      await mutateState(s=>{s.deepLinkEvents=s.deepLinkEvents||[];s.deepLinkEvents.unshift(event);s.deepLinkEvents=s.deepLinkEvents.slice(0,10000)})
      return send(req,res,201,event)
    }
    if (req.method === 'POST' && url.pathname === '/api/deep-links/activate') {
      const body=await readBody(req)
      if(!body.slug) return send(req,res,400,{error:'slug required'})
      let updated=null
      await mutateState(s=>{const item=(s.deepLinks||[]).find(x=>x.slug===String(body.slug));if(item){item.status='active';item.activatedAt=new Date().toISOString();updated={...item}}})
      return updated?send(req,res,200,updated):send(req,res,404,{error:'deep link not found'})
    }
    if (req.method === 'GET' && url.pathname === '/api/diagnostics') {
      const [state,attr,jobs]=await Promise.all([getState(),attributionStats(workspaceId),queueStats(workspaceId)])
      const deliveries=state.signalDeliveries||[]
      const delivered=deliveries.filter(x=>x.status==='delivered').length
      const failed=deliveries.filter(x=>x.status==='dead_letter').length
      const duplicateCount=(state.audit||[]).filter(x=>String(x.action||'').includes('duplicate')).length
      const clickTotal=Number(attr?.activeClickSessions||0)
      const clickCovered=Number(attr?.clickIdCoverage?.gclid||0)+Number(attr?.clickIdCoverage?.fbclid||0)+Number(attr?.clickIdCoverage?.braid||0)
      const clickIdCoverage=clickTotal?Number(Math.min(100,(clickCovered/clickTotal*100)).toFixed(2)):0
      const connectorProblems=(state.connectorHealth||[]).filter(x=>String(x.status||'').toLowerCase()!=='healthy')
      const quarantined=Number(state.quarantinedEvents?.length||0)
      const deliveryRate=deliveries.length?delivered/deliveries.length:1
      const score=Math.max(0,Math.min(100,Math.round(100-(failed*4)-(connectorProblems.length*3)-(quarantined>0?4:0)-(clickTotal&&clickIdCoverage<90?6:0))))
      const issues=[]
      if(duplicateCount) issues.push({key:'duplicate_conversions',severity:'warning',affected:duplicateCount})
      if(clickTotal&&clickIdCoverage<95) issues.push({key:'missing_click_ids',severity:'warning',affectedPercent:Number((100-clickIdCoverage).toFixed(2))})
      if(failed) issues.push({key:'delivery_failures',severity:failed>10?'critical':'warning',affected:failed})
      for(const item of connectorProblems.slice(0,5)) issues.push({key:'connector_health',severity:'warning',connector:item.name,status:item.status})
      if(quarantined) issues.push({key:'schema_mismatch',severity:'info',quarantined})
      return send(req,res,200,{available:true,score,duplicateRate:deliveries.length?Number((duplicateCount/Math.max(1,deliveries.length)*100).toFixed(2)):0,clickIdCoverage,quarantined,deliveryRate:Number((deliveryRate*100).toFixed(2)),queue:jobs,issues,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/diagnostics/scan') {
      const resultId='scan_'+randomUUID()
      const startedAt=new Date().toISOString()
      const [state,attr,jobs]=await Promise.all([getState(),attributionStats(workspaceId),queueStats(workspaceId)])
      const result={
        id:resultId,
        startedAt,
        completedAt:new Date().toISOString(),
        signalDeliveries:(state.signalDeliveries||[]).length,
        deadLetter:(state.signalDeliveries||[]).filter(x=>x.status==='dead_letter').length,
        connectorIssues:(state.connectorHealth||[]).filter(x=>String(x.status||'').toLowerCase()!=='healthy').length,
        unmatchedAttribution:Number(attr?.unmatchedEvents||0),
        queue:jobs
      }
      await mutateState(s=>{
        s.diagnosticScans=s.diagnosticScans||[]
        s.diagnosticScans.unshift(result)
        s.diagnosticScans=s.diagnosticScans.slice(0,100)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'diagnostics.scan_completed',entityId:resultId,at:result.completedAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,result)
    }
    if (req.method === 'POST' && url.pathname === '/api/diagnostics/replay') {
      const body=await readBody(req)
      if(!body.issue) return send(req,res,400,{error:'issue required'})
      const replayId='diag_'+randomUUID()
      const now=new Date().toISOString()
      await mutateState(s=>{
        s.diagnosticReplays=s.diagnosticReplays||[]
        s.diagnosticReplays.unshift({id:replayId,issue:String(body.issue),status:'queued',createdAt:now})
        s.diagnosticReplays=s.diagnosticReplays.slice(0,250)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'diagnostics.replay_queued',entityId:replayId,issue:String(body.issue),at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,202,{queued:true,issue:body.issue,replayId,status:'queued'})
    }
    if (req.method === 'GET' && url.pathname === '/api/funnel') {
      const [allProfiles,allMeetings]=await Promise.all([listLeadProfiles(workspaceId,500),listPersistedMeetings(workspaceId)])
      const allowedPeriods=new Set([7,30,90])
      const requestedDays=Number(url.searchParams.get('periodDays')||30)
      const periodDays=allowedPeriods.has(requestedDays)?requestedDays:30
      const cutoff=Date.now()-periodDays*24*60*60*1000
      const requestedChannel=String(url.searchParams.get('channel')||'').trim()
      const requestedAccount=String(url.searchParams.get('account')||'').trim()
      const requestedDisposition=String(url.searchParams.get('disposition')||'').trim()
      const inWindow=item=>{
        const raw=item.updated_at||item.updatedAt||item.created_at||item.createdAt||item.starts_at||item.startsAt||null
        if(!raw)return true
        const time=Date.parse(raw)
        return Number.isNaN(time)||time>=cutoff
      }
      const accountFor=lead=>String(
        lead.attributes?.adAccountName||
        lead.attributes?.adAccount||
        lead.attributes?.accountName||
        lead.attributes?.account||
        'Default / Unknown'
      )
      const periodProfiles=allProfiles.filter(inWindow)
      const channels=[...new Set(periodProfiles.map(lead=>String(lead.source||'First-party')))].sort((a,b)=>a.localeCompare(b))
      const accounts=[...new Set(periodProfiles.map(accountFor))].sort((a,b)=>a.localeCompare(b))
      let profiles=periodProfiles
      if(requestedChannel)profiles=profiles.filter(lead=>String(lead.source||'First-party')===requestedChannel)
      if(requestedAccount)profiles=profiles.filter(lead=>accountFor(lead)===requestedAccount)
      const qualifiedStages=new Set(['qualified','consultation','opportunity','converted','enrolled','closed_won','customer'])
      const consultationStages=new Set(['consultation','opportunity','converted','enrolled','closed_won','customer'])
      const bookingStages=new Set(['converted','enrolled','closed_won','customer'])
      const leadKey=lead=>String(lead.external_lead_id||lead.name||lead.id)
      const profileByLead=new Map()
      for(const lead of profiles){
        profileByLead.set(leadKey(lead),lead)
        if(lead.name)profileByLead.set(String(lead.name),lead)
      }
      const meetings=allMeetings.filter(inWindow).filter(meeting=>profileByLead.has(String(meeting.lead_ref||'')))
      const campaigns=new Map()
      const ensure=lead=>{
        const name=String(lead.campaign||lead.source||'Unattributed')
        const account=accountFor(lead)
        const channel=String(lead.source||'First-party')
        const key=channel+'::'+account+'::'+name
        const row=campaigns.get(key)||{key,name,account,channel,leads:0,qualified:0,appointments:0,consultations:0,bookings:0}
        campaigns.set(key,row)
        return row
      }
      for(const lead of profiles){
        const row=ensure(lead)
        row.leads++
        const stage=String(lead.crm_stage||'').toLowerCase()
        if(['A','B'].includes(String(lead.grade))||qualifiedStages.has(stage))row.qualified++
        if(consultationStages.has(stage))row.consultations++
        if(bookingStages.has(stage))row.bookings++
      }
      for(const meeting of meetings){
        const lead=profileByLead.get(String(meeting.lead_ref||''))
        if(lead)ensure(lead).appointments++
      }
      const rate=(part,total)=>total?Number((Number(part||0)/Number(total)*100).toFixed(1)):0
      const enrichRates=row=>({
        ...row,
        leadToQualifiedRate:rate(row.qualified,row.leads),
        qualifiedToAppointmentRate:rate(row.appointments,row.qualified),
        appointmentToConsultationRate:rate(row.consultations,row.appointments),
        consultationToBookingRate:rate(row.bookings,row.consultations),
        leadToBookingRate:rate(row.bookings,row.leads)
      })
      const dispositionKey={
        Qualified:'qualified',
        Appointments:'appointments',
        Consultations:'consultations',
        Bookings:'bookings'
      }[requestedDisposition]||''
      let campaignRows=[...campaigns.values()].map(enrichRates).sort((a,b)=>b.leads-a.leads||b.bookings-a.bookings)
      if(dispositionKey)campaignRows=campaignRows.filter(row=>Number(row[dispositionKey]||0)>0)
      const stages={
        leads:profiles.length,
        qualified:profiles.filter(lead=>['A','B'].includes(String(lead.grade))||qualifiedStages.has(String(lead.crm_stage||'').toLowerCase())).length,
        appointments:meetings.length,
        consultations:profiles.filter(lead=>consultationStages.has(String(lead.crm_stage||'').toLowerCase())).length,
        bookings:profiles.filter(lead=>bookingStages.has(String(lead.crm_stage||'').toLowerCase())).length
      }
      const stageRates={
        leadToQualified:rate(stages.qualified,stages.leads),
        qualifiedToAppointment:rate(stages.appointments,stages.qualified),
        appointmentToConsultation:rate(stages.consultations,stages.appointments),
        consultationToBooking:rate(stages.bookings,stages.consultations),
        leadToBooking:rate(stages.bookings,stages.leads)
      }
      return send(req,res,200,{
        available:true,
        stages,
        stageRates,
        campaigns:campaignRows,
        filters:{
          channel:requestedChannel||'All channels',
          account:requestedAccount||'All accounts',
          disposition:requestedDisposition||'All dispositions',
          periodDays,
          channels,
          accounts
        },
        generatedAt:new Date().toISOString()
      })
    }
    if (req.method === 'GET' && url.pathname === '/api/data-hub') {
      const [state,leadStats,attr]=await Promise.all([getState(),leadOpsStats(workspaceId),attributionStats(workspaceId)])
      const now=Date.now()
      const sourceMap=new Map()
      const touch=(name,type,eventTime,count=1,status='healthy',fields=[])=>{
        const key=String(name||'Unknown')
        const current=sourceMap.get(key)||{name:key,type,records:0,lastEventAt:null,status,fields:new Set()}
        current.records+=Number(count||0)
        if(eventTime&&(!current.lastEventAt||Date.parse(eventTime)>Date.parse(current.lastEventAt)))current.lastEventAt=eventTime
        if(status!=='healthy')current.status=status
        for(const field of fields)current.fields.add(field)
        sourceMap.set(key,current)
      }
      for(const event of trackedEvents){
        const source=event.source||event.channel||event.utm_source||'First-party web/app'
        touch(source,'first_party',event.receivedAt||event.occurredAt||event.timestamp,1,'healthy',Object.keys(event).filter(k=>!['id','receivedAt'].includes(k)).slice(0,12))
      }
      const waEvents=(state.whatsappEvents||[])
      const waLatest=waEvents.map(x=>x.timestamp||x.receivedAt).filter(Boolean).sort().at(-1)||null
      if(waEvents.length)touch('WhatsApp','messaging',waLatest,waEvents.length,'healthy',['phone','message','status','timestamp'])
      const callEvents=(state.callEvents||[])
      const callLatest=callEvents.map(x=>x.endedAt||x.startedAt||x.receivedAt).filter(Boolean).sort().at(-1)||null
      if(callEvents.length)touch('Telephony','calling',callLatest,callEvents.length,'healthy',['phone','duration','status','campaign'])
      if(leadStats?.available)touch('Lead profiles','crm_identity',new Date().toISOString(),Number(leadStats.total||0),'healthy',['customer_id','email_hash','phone_hash','stage','grade','device_id'])
      if(attr?.available)touch('Attribution store','measurement',new Date().toISOString(),Number(attr.assistedEvents||0)+Number(attr.activeClickSessions||0),'healthy',['click_id','session','event','match_method','value'])
      const deliveries=(state.signalDeliveries||[])
      if(deliveries.length)touch('Activation deliveries','activation',deliveries[0]?.updatedAt||deliveries[0]?.createdAt||null,deliveries.length,deliveries.some(x=>['failed','dead_letter'].includes(String(x.status||'').toLowerCase()))?'review':'healthy',['event','destination','status','attempts'])
      for(const health of state.connectorHealth||[]){
        if(!sourceMap.has(health.name))touch(health.name,'connector',health.checkedAt||health.updatedAt||null,0,['healthy','connected','active'].includes(String(health.status||'').toLowerCase())?'healthy':'review',['connection_state'])
      }
      const sources=[...sourceMap.values()].map(x=>({
        name:x.name,
        type:x.type,
        records:x.records,
        lastEventAt:x.lastEventAt,
        freshnessSeconds:x.lastEventAt?Math.max(0,Math.floor((now-Date.parse(x.lastEventAt))/1000)):null,
        status:x.status,
        fields:[...x.fields]
      })).sort((a,b)=>b.records-a.records)
      const records=sources.reduce((sum,x)=>sum+x.records,0)
      const quarantined=Number((state.quarantinedEvents||[]).length)
      const schemaHealth=records?Number((Math.max(0,records-quarantined)/records*100).toFixed(2)):100
      const recent=[
        ...trackedEvents.slice(-40).map(x=>({id:x.id||randomUUID(),time:x.receivedAt||x.occurredAt||x.timestamp,source:x.source||x.channel||x.utm_source||'First-party',kind:'event',operation:'append',status:'healthy'})),
        ...waEvents.slice(0,20).map(x=>({id:'wa:'+x.id,time:x.timestamp||x.receivedAt,source:'WhatsApp',kind:x.kind||'message',operation:'append',status:x.error?'review':'healthy'})),
        ...callEvents.slice(0,20).map(x=>({id:'call:'+x.id,time:x.endedAt||x.startedAt||x.receivedAt,source:'Telephony',kind:'call',operation:'append',status:'healthy'})),
        ...deliveries.slice(0,20).map(x=>({id:'delivery:'+x.id,time:x.updatedAt||x.createdAt,source:x.destination||'Activation',kind:x.event||'signal',operation:'deliver',status:['failed','dead_letter'].includes(String(x.status||'').toLowerCase())?'review':'healthy'}))
      ].filter(x=>x.time).sort((a,b)=>Date.parse(b.time)-Date.parse(a.time)).slice(0,50)
      return send(req,res,200,{available:true,records,knownIdentities:Number(leadStats?.total||0),schemaHealth,quarantined,matchedEvents:Number(attr?.matchedEvents||0),sources,recent,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/data-hub/rebuild') {
      const [state,leadStats,attr]=await Promise.all([getState(),leadOpsStats(workspaceId),attributionStats(workspaceId)])
      const snapshot={
        id:'dh_'+randomUUID(),
        scope:'canonical_view',
        status:'completed',
        trackedEvents:trackedEvents.length,
        leadProfiles:Number(leadStats?.total||0),
        assistedEvents:Number(attr?.assistedEvents||0),
        clickSessions:Number(attr?.activeClickSessions||0),
        whatsappEvents:Number((state.whatsappEvents||[]).length),
        callEvents:Number((state.callEvents||[]).length),
        signalDeliveries:Number((state.signalDeliveries||[]).length),
        quarantinedEvents:Number((state.quarantinedEvents||[]).length),
        completedAt:new Date().toISOString()
      }
      await mutateState(s=>{
        s.dataHubRebuilds=s.dataHubRebuilds||[]
        s.dataHubRebuilds.unshift(snapshot)
        s.dataHubRebuilds=s.dataHubRebuilds.slice(0,100)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'data_hub.canonical_snapshot_rebuilt',entityId:snapshot.id,at:snapshot.completedAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,snapshot)
    }
    if (req.method === 'GET' && url.pathname === '/api/live-sync') {
      const state=await getState()
      const now=Date.now()
      const recentTracked=trackedEvents.slice(-250)
      const lastMinute=recentTracked.filter(x=>{
        const t=Date.parse(x.receivedAt||x.occurredAt||x.timestamp||'')
        return Number.isFinite(t)&&now-t<=60_000
      })
      const deliveries=(state.signalDeliveries||[]).slice(0,1000)
      const delivered=deliveries.filter(x=>x.status==='delivered')
      const successful=deliveries.filter(x=>['delivered','succeeded'].includes(String(x.status||'').toLowerCase())).length
      const terminal=deliveries.filter(x=>['delivered','succeeded','dead_letter','failed'].includes(String(x.status||'').toLowerCase())).length
      const latencies=delivered.map(x=>Number(x.latencyMs||x.providerResponse?.latencyMs||0)).filter(x=>Number.isFinite(x)&&x>=0).sort((a,b)=>a-b)
      const medianLatencyMs=latencies.length?latencies[Math.floor(latencies.length/2)]:null
      const byDestination={}
      for(const item of deliveries){
        const key=String(item.destination||'Unknown')
        byDestination[key]=byDestination[key]||{destination:key,total:0,delivered:0,failed:0}
        byDestination[key].total++
        if(['delivered','succeeded'].includes(String(item.status||'').toLowerCase()))byDestination[key].delivered++
        if(['dead_letter','failed'].includes(String(item.status||'').toLowerCase()))byDestination[key].failed++
      }
      const destinationThroughput=Object.values(byDestination).map(x=>({...x,deliveryRate:x.total?Number((x.delivered/x.total*100).toFixed(2)):0}))
      const recent=[
        ...recentTracked.slice(-50).map(x=>({
          id:x.id||x.eventId||randomUUID(),
          time:x.receivedAt||x.occurredAt||x.timestamp||null,
          source:x.source||x.channel||'First-party',
          event:x.event||x.eventType||x.name||'event',
          destination:'Ingestion',
          status:'accepted',
          matchKey:x.customerId?'customer_id':x.deviceId||x.device_id?'device_id':x.gclid?'gclid':x.fbclid?'fbclid':x.visitorId?'visitor_id':'event_id'
        })),
        ...deliveries.slice(0,50).map(x=>({
          id:x.id,
          time:x.updatedAt||x.createdAt||null,
          source:'Activation queue',
          event:x.event||'signal',
          destination:x.destination||'Unknown',
          status:x.status||'queued',
          matchKey:x.customerId?'customer_id':x.replayPayload?.gclid?'gclid':x.replayPayload?.emailSha256?'email_sha256':x.replayPayload?.phoneSha256?'phone_sha256':'event_id'
        }))
      ].sort((a,b)=>Date.parse(b.time||0)-Date.parse(a.time||0)).slice(0,50)
      return send(req,res,200,{
        available:true,
        status:recentTracked.length||deliveries.length?'active':'idle',
        medianLatencyMs,
        deliveryRate:terminal?Number((successful/terminal*100).toFixed(2)):null,
        eventsPerMinute:lastMinute.length,
        recent,
        destinations:destinationThroughput,
        generatedAt:new Date().toISOString()
      })
    }
    if (req.method === 'GET' && url.pathname === '/api/matchback') {
      const [live,state]=await Promise.all([attributionStats(workspaceId),getState()])
      return send(req,res,200,{
        live,
        rules:state.matchbackRules||[],
        unmatched:live.available?Number(live.unmatchedEvents||0):0,
        templates:[
          {name:'Closed-won revenue',source:'crm_billing',eventType:'closed_won',destination:'Google Ads',identityMethod:'customer_id + click ID'},
          {name:'Enrolment conversion',source:'crm',eventType:'enrolment',destination:'Meta Ads',identityMethod:'customer_id + hashed contact'},
          {name:'WhatsApp consultation sale',source:'crm_whatsapp',eventType:'closed_won',destination:'Google Ads + Meta Ads',identityMethod:'phone + click history'},
          {name:'Offline store sale',source:'pos_crm',eventType:'store_sale',destination:'Google Ads + Meta Ads',identityMethod:'customer_id / hashed contact / click ID'}
        ]
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/matchback/rules') {
      const body=await readBody(req)
      const name=String(body.name||'').trim()
      const source=String(body.source||'').trim()
      const eventType=String(body.eventType||'').trim()
      const destination=String(body.destination||'').trim()
      const identityMethod=String(body.identityMethod||'').trim()
      if(!name||!source||!eventType||!destination||!identityMethod) return send(req,res,400,{error:'name, source, eventType, destination and identityMethod are required'})
      const now=new Date().toISOString()
      const item={id:'mb_'+randomUUID(),name:name.slice(0,160),source:source.slice(0,120),eventType:eventType.slice(0,120),destination:destination.slice(0,160),identityMethod:identityMethod.slice(0,240),status:'active',createdAt:now}
      await mutateState(s=>{
        s.matchbackRules=s.matchbackRules||[]
        s.matchbackRules.unshift(item)
        s.matchbackRules=s.matchbackRules.slice(0,200)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'matchback.rule_created',entityId:item.id,name:item.name,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item})
    }
    if (req.method === 'POST' && url.pathname === '/api/matchback/rules/toggle') {
      const body=await readBody(req)
      if(!body.id||typeof body.enabled!=='boolean') return send(req,res,400,{error:'id and enabled are required'})
      let updated=null
      await mutateState(s=>{
        const item=(s.matchbackRules||[]).find(x=>x.id===body.id)
        if(item){item.status=body.enabled?'active':'paused';item.updatedAt=new Date().toISOString();updated={...item}}
      })
      return updated?send(req,res,200,{item:updated}):send(req,res,404,{error:'matchback rule not found'})
    }
    if (req.method === 'GET' && url.pathname === '/api/matchback/unmatched') {
      const live=await attributionStats(workspaceId)
      return send(req,res,200,{items:(live?.recent||[]).filter(x=>x.status==='unmatched'),total:Number(live?.unmatchedEvents||0)})
    }
    if (req.method === 'POST' && url.pathname === '/api/matchback/reconcile') {
      const body=await readBody(req)
      if(!body.ruleId) return send(req,res,400,{error:'ruleId required'})
      const state=await getState()
      const rule=(state.matchbackRules||[]).find(x=>x.id===body.ruleId)
      if(!rule) return send(req,res,404,{error:'matchback rule not found'})
      if(rule.status==='paused') return send(req,res,409,{error:'matchback rule is paused'})
      const result=await reconcileAttribution(workspaceId,body.limit||250)
      const completedAt=new Date().toISOString()
      await mutateState(s=>{
        const item=(s.matchbackRules||[]).find(x=>x.id===body.ruleId)
        if(item){item.lastRunAt=completedAt;item.lastRunStatus='reconciled';item.lastRunMatched=Number(result?.matched||0);item.lastRunUnmatched=Number(result?.unmatched||0)}
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'matchback.reconciled',entityId:body.ruleId,name:rule.name,matched:Number(result?.matched||0),unmatched:Number(result?.unmatched||0),at:completedAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,{ruleId:body.ruleId,rule:rule.name,status:'reconciled',...result,completedAt})
    }
    if (req.method === 'GET' && url.pathname === '/api/pos-stores') {
      const state=await getState()
      const batches=state.posBatches||[]
      const locations=new Map()
      for(const batch of batches){
        const key=String(batch.location)
        const row=locations.get(key)||{name:batch.locationName||key,id:key,transactions:0,revenue:0,matched:0,imports:0,lastImportAt:null}
        row.transactions+=Number(batch.records||0);row.revenue+=Number(batch.revenue||0);row.matched+=Number(batch.matched||0);row.imports++;row.lastImportAt=batch.createdAt
        locations.set(key,row)
      }
      const items=[...locations.values()].map(x=>({...x,matchRate:x.transactions?Number((x.matched/x.transactions*100).toFixed(1)):0,status:x.transactions&&x.matched<x.transactions?'review':'healthy'}))
      return send(req,res,200,{locations:items,totals:{transactions:items.reduce((n,x)=>n+x.transactions,0),revenue:items.reduce((n,x)=>n+x.revenue,0),matched:items.reduce((n,x)=>n+x.matched,0),imports:batches.length},recent:batches.slice(0,50),generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/pos-stores/import') {
      const body=await readBody(req)
      const location=String(body.location||'').trim()
      const rows=Array.isArray(body.transactions)?body.transactions.slice(0,500):[]
      if(!location||!rows.length) return send(req,res,400,{error:'location and at least one transaction row are required'})
      const createdAt=new Date().toISOString()
      const normalized=[]
      let matched=0
      let revenue=0
      for(let index=0;index<rows.length;index++){
        const row=rows[index]||{}
        const transactionId=String(row.transactionId||row.transaction_id||'').trim()||('row_'+(index+1))
        const value=Math.max(0,Number(row.netRevenue??row.net_revenue??row.value??0)||0)
        const occurredAt=row.occurredAt||row.occurred_at||createdAt
        const currency=String(row.currency||body.currency||'INR').slice(0,12)
        const event=await recordAssistedEvent(workspaceId,{
          event:'store_sale',
          eventType:'store_sale',
          eventId:'pos_'+location+'_'+transactionId,
          customerId:row.customerId||row.customer_id||null,
          email:row.email||null,
          phone:row.phone||null,
          gclid:row.gclid||null,
          fbclid:row.fbclid||null,
          source:'pos',
          occurredAt,
          value,
          currency,
          data:{location,transactionId,batchImport:true}
        }).catch(()=>null)
        if(event?.status==='matched')matched++
        revenue+=value
        normalized.push({
          transactionId,
          status:event?.status||'unavailable',
          matchMethod:event?.match_method||null,
          value,
          currency,
          occurredAt
        })
      }
      const records=normalized.length
      const batch={
        batchId:'pos_'+randomUUID(),
        location,
        locationName:String(body.locationName||location),
        records,
        revenue:Number(revenue.toFixed(2)),
        matched,
        unmatched:records-matched,
        matchRate:records?Number((matched/records*100).toFixed(1)):0,
        status:'processed',
        createdAt,
        sample:normalized.slice(0,25)
      }
      await mutateState(s=>{
        s.posBatches=s.posBatches||[]
        s.posBatches.unshift(batch)
        s.posBatches=s.posBatches.slice(0,2000)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'pos.import_processed',entityId:batch.batchId,location:batch.location,records,matched,revenue:batch.revenue,at:batch.createdAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,batch)
    }
    if (req.method === 'GET' && url.pathname === '/api/offline-attribution') {
      const [state,stats]=await Promise.all([getState(),attributionStats(workspaceId)])
      const calls=(state.callEvents||[])
      const whatsapp=(state.whatsappEvents||[]).filter(x=>x.kind==='message')
      const connectedCalls=calls.filter(x=>['answered','completed','connected','qualified'].includes(String(x.status||'').toLowerCase()))
      const waWithIdentity=whatsapp.filter(x=>x.from)
      return send(req,res,200,{
        generatedAt:new Date().toISOString(),
        callAttribution:{
          events:calls.length,
          connected:connectedCalls.length,
          providers:[...new Set(calls.map(x=>x.provider).filter(Boolean))],
          method:'first-party identity + click/session reconciliation'
        },
        whatsapp:{
          messages:whatsapp.length,
          identifiable:waWithIdentity.length,
          identifiers:['phone','gclid','fbclid','customer_id']
        },
        attribution:{
          available:Boolean(stats?.available),
          matchedEvents:Number(stats?.matchedEvents||0),
          unmatchedEvents:Number(stats?.unmatchedEvents||0),
          matchRate:Number(stats?.matchRate||0),
          matchedValue:Number(stats?.matchedValue||0)
        },
        rules:state.offlineAttributionRules||[],
        templates:[
          {conversion:'Inbound Call',source:'Telephony',match:'first-party identity + session/click reconciliation',identifier:'Phone / click ID',destination:['Google Ads','Meta Ads']},
          {conversion:'WhatsApp Enquiry',source:'WhatsApp',match:'persisted click/customer identity + phone',identifier:'Phone / GCLID / FBCLID',destination:['Google Ads','Meta Ads']},
          {conversion:'Partial Payment',source:'Custom Backend',match:'customer_id + order mapping',identifier:'Customer ID / order ID',destination:['Google Ads']},
          {conversion:'Walk-in / Offline Sale',source:'CRM / POS',match:'hashed phone/email + click history',identifier:'Hashed contact / click ID',destination:['Google Ads','Meta Ads']}
        ]
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/offline-attribution/rules') {
      const body=await readBody(req)
      const conversion=String(body.conversion||'').trim()
      const source=String(body.source||'').trim()
      const match=String(body.match||'').trim()
      const identifier=String(body.identifier||'').trim()
      const destination=Array.isArray(body.destination)?body.destination.map(String).filter(Boolean):[String(body.destination||'').trim()].filter(Boolean)
      if(!conversion||!source||!match||!identifier||!destination.length) return send(req,res,400,{error:'conversion, source, match, identifier and destination are required'})
      const now=new Date().toISOString()
      const item={id:'off_'+randomUUID(),conversion:conversion.slice(0,160),source:source.slice(0,160),match:match.slice(0,300),identifier:identifier.slice(0,200),destination:destination.slice(0,5),status:'active',createdAt:now}
      await mutateState(s=>{
        s.offlineAttributionRules=s.offlineAttributionRules||[]
        s.offlineAttributionRules.unshift(item)
        s.offlineAttributionRules=s.offlineAttributionRules.slice(0,200)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'offline_attribution.rule_created',entityId:item.id,conversion:item.conversion,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item})
    }
    if (req.method === 'POST' && url.pathname === '/api/offline-attribution/rules/toggle') {
      const body=await readBody(req)
      if(!body.id||typeof body.enabled!=='boolean') return send(req,res,400,{error:'id and enabled are required'})
      let updated=null
      await mutateState(s=>{
        const item=(s.offlineAttributionRules||[]).find(x=>x.id===body.id)
        if(item){item.status=body.enabled?'active':'paused';item.updatedAt=new Date().toISOString();updated={...item}}
      })
      return updated?send(req,res,200,{item:updated}):send(req,res,404,{error:'offline attribution rule not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/offline-attribution/test') {
      const body=await readBody(req)
      const state=await getState()
      const rule=(state.offlineAttributionRules||[]).find(x=>x.id===body.ruleId)
      if(!rule) return send(req,res,404,{error:'offline attribution rule not found'})
      if(rule.status==='paused') return send(req,res,409,{error:'offline attribution rule is paused'})
      const eventId='offtest_'+randomUUID()
      const item=await recordAssistedEvent(workspaceId,{
        event:body.event||rule.conversion.toLowerCase().replace(/[^a-z0-9]+/g,'_'),
        eventType:body.eventType||rule.conversion.toLowerCase().replace(/[^a-z0-9]+/g,'_'),
        eventId,
        customerId:body.customerId||null,
        email:body.email||null,
        phone:body.phone||null,
        gclid:body.gclid||null,
        fbclid:body.fbclid||null,
        source:rule.source,
        occurredAt:new Date().toISOString(),
        value:Number(body.value||0),
        currency:String(body.currency||'INR'),
        data:{offlineRuleId:rule.id,test:true}
      })
      if(!item) return send(req,res,503,{error:'attribution store unavailable'})
      const now=new Date().toISOString()
      await mutateState(s=>{
        const saved=(s.offlineAttributionRules||[]).find(x=>x.id===rule.id)
        if(saved){saved.lastTestAt=now;saved.lastTestStatus=item.status;saved.lastTestMethod=item.match_method||null}
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'offline_attribution.rule_tested',entityId:rule.id,eventId,status:item.status,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{id:item.id,status:item.status,matchMethod:item.match_method,matchConfidence:item.match_confidence,matchedSessionId:item.matched_session_id})
    }
    if (req.method === 'POST' && url.pathname === '/api/track') {
      const body=await readBody(req)
      const category=['essential','analytics','marketing','personalization'].includes(String(body.eventCategory))?String(body.eventCategory):'analytics'
      const trackingSubjectId=body.customerId||body.visitorId||body.deviceId||body.device_id
      if(!trackingSubjectId) return send(req,res,400,{accepted:false,error:'customerId, visitorId, or deviceId required'})
      const consent=await consentAllows(workspaceId,{subjectType:body.customerId?'customer':'visitor',subjectId:trackingSubjectId,category})
      if(!consent.allowed) return send(req,res,403,{accepted:false,error:'consent required',reason:consent.reason,category})
      const event={id:randomUUID(),receivedAt:new Date().toISOString(),consentCategory:category,...body}
      trackedEvents.push(event)
      if(trackedEvents.length>5000) trackedEvents.splice(0,trackedEvents.length-5000)
      const persistedEvent={...event}
      if(persistedEvent.email){
        persistedEvent.emailSha256=persistedEvent.emailSha256||persistedEvent.email_sha256||sha256Normalized(persistedEvent.email)
        delete persistedEvent.email
      }
      if(persistedEvent.phone){
        persistedEvent.phoneSha256=persistedEvent.phoneSha256||persistedEvent.phone_sha256||sha256Phone(persistedEvent.phone)
        delete persistedEvent.phone
      }
      await mutateState(s=>{
        s.recentEvents=s.recentEvents||[]
        s.recentEvents.unshift(persistedEvent)
        s.recentEvents=s.recentEvents.slice(0,5000)
      })
      let leadProfile=null
      if(body.customerId||body.email||body.phone||body.emailSha256||body.email_sha256||body.phoneSha256||body.phone_sha256||body.deviceId||body.device_id){
        leadProfile=await upsertLeadProfile(workspaceId,{
          externalLeadId:body.customerId||body.leadId||body.visitorId||body.deviceId||body.device_id,
          customerId:body.customerId,
          leadId:body.leadId,
          email:body.email,
          phone:body.phone,
          emailSha256:body.emailSha256||body.email_sha256,
          phoneSha256:body.phoneSha256||body.phone_sha256,
          deviceId:body.deviceId||body.device_id,
          devicePlatform:body.devicePlatform||body.device_platform,
          appId:body.appId||body.app_id,
          source:body.source||body.utm_source||'first_party',
          campaign:body.campaign||body.utm_campaign||null,
          crmStage:body.crmStage||body.stage||null,
          journeyDepth:body.journeyDepth||body.pagesViewed||0,
          pricingPageViews:body.pricingPageViews||0,
          conversionPropensity:body.conversionPropensity||0,
          ltvTier:body.ltvTier||null,
          lastActivity:body.occurredAt||event.receivedAt,
          attributes:{channel:body.channel||null,event:body.event||body.name||null,platform:body.platform||null,consentSubjectType:body.customerId?'customer':'visitor',consentSubjectId:trackingSubjectId}
        }).catch(()=>null)
      }
      let clickSession=null
      let assisted=null
      if(body.gclid||body.gbraid||body.wbraid||body.fbclid||body.msclkid||body.utm_source||body.utm_campaign||body.visitorId||body.deviceId||body.device_id){
        clickSession=await captureClickSession(workspaceId,{...body,eventId:event.id,userAgent:req.headers['user-agent']}).catch(()=>null)
      }
      if(body.assisted===true||['call','whatsapp','crm','pos','billing','offline'].includes(String(body.source||'').toLowerCase())){
        assisted=await recordAssistedEvent(workspaceId,{...body,eventId:body.eventId||event.id}).catch(()=>null)
      }
      const derived=await evaluateEventRules(workspaceId,{...body,eventId:body.eventId||event.id},{sourceEventId:event.id}).catch(()=>[])
      const derivedDeliveries=[]
      if(derived.length){
        const marketingConsent=await consentAllows(workspaceId,{subjectType:body.customerId?'customer':'visitor',subjectId:trackingSubjectId,category:'marketing'})
        for(const match of derived){
          let queued=0
          if(marketingConsent.allowed){
            for(const destination of match.destinations){
              const deliveryId='sig_'+randomUUID()
              const idempotencyKey=createHash('sha256').update('event-rule:'+match.runId+':'+destination).digest('hex')
              const now=new Date().toISOString()
              const item={id:deliveryId,event:match.outputEvent,destination,customerId:body.customerId?String(body.customerId):null,externalEventId:match.assistedEvent?.id||match.runId,status:'queued',attempts:0,idempotencyKey,createdAt:now,updatedAt:now,nextAttemptAt:now}
              item.replayPayload=buildSignalReplayPayload({...body,event:match.outputEvent,destination,value:match.assistedEvent?.value??body.value??null,currency:match.assistedEvent?.currency||body.currency||null},{...item,idempotencyKey})
              await mutateState(s=>{s.signalDeliveries=s.signalDeliveries||[];s.signalDeliveries.unshift(item);s.signalDeliveries=s.signalDeliveries.slice(0,10000);s.audit.unshift({id:randomUUID(),action:'event-rule.signal.queued',entityId:deliveryId,ruleId:match.ruleId,destination,event:match.outputEvent,at:now});s.audit=s.audit.slice(0,1000)})
              const job=await enqueueJob({workspaceId,kind:'signal_delivery',idempotencyKey:'rule-signal:'+idempotencyKey,payload:item.replayPayload})
              derivedDeliveries.push({ruleId:match.ruleId,outputEvent:match.outputEvent,destination,deliveryId,jobId:job?.id||null})
              queued++
            }
          }
          await markEventRuleActivation(workspaceId,match.runId,queued).catch(()=>{})
        }
      }
      return send(req,res,202,{accepted:true,eventId:event.id,leadProfileId:leadProfile?.id||null,clickSessionId:clickSession?.id||null,assistedEventId:assisted?.id||null,derivedEvents:derived.map(x=>({runId:x.runId,ruleId:x.ruleId,outputEvent:x.outputEvent,assistedEventId:x.assistedEvent?.id||null,destinations:x.destinations})),derivedDeliveries,match:assisted?{status:assisted.status,method:assisted.match_method,confidence:assisted.match_confidence}:null})
    }
    if (req.method === 'POST' && url.pathname === '/api/assisted-events') {
      const body=await readBody(req)
      if(!body.event&&!body.eventType) return send(req,res,400,{error:'event or eventType required'})
      const item=await recordAssistedEvent(workspaceId,body)
      if(!item) return send(req,res,503,{error:'attribution store unavailable'})
      return send(req,res,201,{id:item.id,status:item.status,matchMethod:item.match_method,matchConfidence:item.match_confidence,matchedSessionId:item.matched_session_id})
    }
    if (req.method === 'GET' && url.pathname === '/api/attribution-identity/stats') {
      const periodDays=Number(url.searchParams.get('periodDays')||0)||null
      const stats=await attributionStats(workspaceId,{periodDays})
      return send(req,res,200,stats)
    }
    if (req.method === 'GET' && url.pathname === '/api/journeys') {
      const [profiles,meetings,followUps,feedbackResult,routingDecisions,state]=await Promise.all([
        listLeadProfiles(workspaceId,500),
        listPersistedMeetings(workspaceId),
        listPersistedFollowUps(workspaceId),
        listPersistedFeedback(workspaceId),
        listRoutingDecisions(workspaceId,500),
        getState()
      ])
      const feedback=feedbackResult?.items||[]
      const humanDuration=(from,to)=>{
        const ms=Math.max(0,Date.parse(to||'')-Date.parse(from||''))
        if(!Number.isFinite(ms)||ms<=0)return '—'
        const minutes=Math.round(ms/60000)
        if(minutes<60)return minutes+'m'
        const hours=Math.round(minutes/60)
        if(hours<48)return hours+'h'
        return Math.round(hours/24)+'d'
      }
      const sameLead=(lead,ref)=>{
        const value=String(ref||'').toLowerCase()
        if(!value)return false
        return [lead.id,lead.external_lead_id,lead.name].filter(Boolean).some(x=>String(x).toLowerCase()===value)
      }
      const trackedForLead=lead=>trackedEvents.filter(event=>{
        const refs=[event.customerId,event.leadId,event.externalLeadId,event.visitorId,event.deviceId,event.device_id]
        return refs.some(ref=>sameLead(lead,ref))||(lead.device_id&&refs.some(ref=>String(ref||'')===String(lead.device_id)))
      })
      const items=profiles.map(lead=>{
        const journey=lead.journey||{}
        const timeline=[]
        const push=(type,source,title,detail,at,meta={})=>{
          if(!at)return
          timeline.push({id:type+'_'+randomUUID(),type,source,title,detail,at,...meta})
        }
        push('lead','CRM / identity','Lead profile created','First persisted lead profile',lead.created_at,{stage:lead.crm_stage||lead.grade||'Lead'})
        for(const event of trackedForLead(lead)){
          push('event',event.source||event.channel||'First-party',String(event.event||event.eventType||event.name||'Tracked event').replaceAll('_',' '),'First-party tracked activity',event.occurredAt||event.receivedAt||event.timestamp,{event:event.event||event.eventType||event.name||null})
        }
        for(const item of routingDecisions.filter(x=>sameLead(lead,x.lead_ref))){
          push('routing','Routing',item.rule_name||'Lead routed',item.destination||item.reason||'Routing decision',item.created_at,{destination:item.destination||null})
        }
        for(const item of followUps.filter(x=>sameLead(lead,x.lead_ref))){
          push('follow_up','Follow-up',item.reason||'Follow-up created',(item.channel||'channel')+' · '+(item.status||'open'),item.created_at,{status:item.status||null,dueAt:item.due_at||null})
          if(item.completed_at)push('follow_up_completed','Follow-up','Follow-up completed',item.reason||'',item.completed_at,{status:'completed'})
        }
        for(const item of meetings.filter(x=>sameLead(lead,x.lead_ref))){
          push('meeting','Meetings','Consultation scheduled',(item.owner||'Counsellor')+' · '+(item.status||'confirmed'),item.created_at||item.starts_at,{startsAt:item.starts_at,status:item.status||null,meetingLink:item.meeting_link||null})
          if(item.last_reminder_at)push('reminder','Meetings','Meeting reminder sent',String(item.reminders_sent||1)+' reminder(s) sent',item.last_reminder_at)
        }
        for(const item of feedback.filter(x=>sameLead(lead,x.lead_ref))){
          push('feedback','Feedback','Feedback recorded',(item.theme||'Uncategorized')+(item.score!=null?' · '+item.score+'/5':''),item.created_at,{score:item.score,theme:item.theme||null})
        }
        const callSummary=lead.call_summary||journey.callOutcome
        if(callSummary)push('call','Calls','Call context updated',String(callSummary),lead.updated_at)
        const whatsappSummary=lead.whatsapp_summary||(journey.whatsappEngaged?'WhatsApp engagement recorded':null)
        if(whatsappSummary)push('whatsapp','WhatsApp','WhatsApp context updated',String(whatsappSummary),lead.updated_at)
        if(lead.crm_stage)push('stage','CRM','Current CRM stage',String(lead.crm_stage),lead.updated_at,{stage:lead.crm_stage})
        timeline.sort((a,b)=>Date.parse(a.at||0)-Date.parse(b.at||0))
        const lastAt=timeline[timeline.length-1]?.at||journey.lastActivity||lead.updated_at
        return {
          id:lead.id,
          lead:lead.name||lead.external_lead_id,
          externalLeadId:lead.external_lead_id,
          source:lead.source||'First-party',
          campaign:lead.campaign||null,
          stage:lead.crm_stage||lead.grade||'Lead',
          grade:lead.grade,
          score:lead.score,
          touchpoints:timeline.length,
          duration:humanDuration(lead.created_at,lastAt),
          lastActivity:lastAt,
          devicePlatform:lead.device_platform||null,
          timeline
        }
      })
      return send(req,res,200,{available:true,items,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/planner') {
      const analytics=await cohortAnalytics(workspaceId,{months:6})
      const sources=analytics?.sources||[]
      const totalRevenue=sources.reduce((n,x)=>n+Number(x.revenue||0),0)
      const totalAcquired=sources.reduce((n,x)=>n+Number(x.acquired||0),0)
      const channels=sources.map(x=>{
        const revenue=Number(x.revenue||0),acquired=Number(x.acquired||0),conversions=Number(x.conversions||0)
        const shareBase=totalRevenue>0?revenue:acquired
        const shareTotal=totalRevenue>0?totalRevenue:totalAcquired
        const share=shareTotal?Number((shareBase/shareTotal*100).toFixed(1)):0
        return {
          name:x.source,
          share,
          acquired,
          conversions,
          conversionRate:Number(x.conversionRate||0),
          revenue,
          revenuePerAcquired:Number(x.revenuePerAcquired||0),
          evidence:totalRevenue>0?'revenue_contribution':'acquisition_volume'
        }
      }).sort((a,b)=>b.share-a.share)
      const state=await getState()
      return send(req,res,200,{
        available:Boolean(analytics?.available&&channels.length),
        channels,
        evidence:{months:analytics?.lookbackMonths||6,totalRevenue,totalAcquired,eventDefinitions:analytics?.eventDefinitions||null},
        savedScenarios:(state.plannerScenarios||[]).slice(0,20),
        notice:channels.length?'Allocation weights are derived from observed '+(totalRevenue>0?'attributed revenue':'acquisition volume')+'. Spend/CAC is not inferred when spend data is unavailable.':'Not enough source-level cohort evidence to recommend an allocation.'
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/planner/scenarios') {
      const body=await readBody(req)
      const budget=Number(body.budget)
      if(!Number.isFinite(budget)||budget<=0) return send(req,res,400,{error:'positive budget required'})
      const allocations=Array.isArray(body.allocations)?body.allocations:[]
      if(!allocations.length) return send(req,res,400,{error:'allocations required'})
      const totalShare=allocations.reduce((n,x)=>n+Number(x.share||0),0)
      if(Math.abs(totalShare-100)>0.5) return send(req,res,400,{error:'allocation shares must total 100%'})
      const item={id:'plan_'+randomUUID(),name:String(body.name||'Media scenario'),budget,allocations,createdAt:new Date().toISOString(),createdBy:req.user?.email||req.user?.userId||null}
      await mutateState(s=>{
        s.plannerScenarios=s.plannerScenarios||[]
        s.plannerScenarios.unshift(item)
        s.plannerScenarios=s.plannerScenarios.slice(0,100)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'planner.scenario_saved',entityId:item.id,budget,at:item.createdAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,item)
    }
    if (req.method === 'GET' && url.pathname === '/api/cohorts') {
      const months=Number(url.searchParams.get('months')||6)
      return send(req,res,200,await cohortAnalytics(workspaceId,{months}))
    }
    if (req.method === 'GET' && url.pathname === '/api/report-schedules') return send(req,res,200,{configured:reportMailConfigured(),items:await listReportSchedules(workspaceId),deliveries:await listReportDeliveries(workspaceId,30)})
    if (req.method === 'POST' && url.pathname === '/api/report-schedules') {
      const body=await readBody(req)
      try{return send(req,res,200,await saveReportSchedule(workspaceId,body,req.user?.email||req.user?.userId||null))}
      catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'invalid report schedule'})}
    }
    if (req.method === 'POST' && url.pathname === '/api/report-schedules/run-now') {
      const body=await readBody(req)
      if(!body.id)return send(req,res,400,{error:'id required'})
      try{return send(req,res,202,await queueReportNow(workspaceId,String(body.id)))}
      catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'report queue failed'})}
    }
    if (req.method === 'GET' && url.pathname === '/api/reports') {
      const [analytics,schedules,deliveries]=await Promise.all([cohortAnalytics(workspaceId,{months:6}),listReportSchedules(workspaceId),listReportDeliveries(workspaceId,30)])
      return send(req,res,200,{analytics,schedules,deliveries,configured:reportMailConfigured()})
    }
    if (req.method === 'POST' && url.pathname === '/api/reports/send-test') {
      const body=await readBody(req)
      if(!body.report) return send(req,res,400,{error:'report required'})
      return send(req,res,200,{sent:true,report:body.report,delivery:'email',at:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/attribution') return send(req,res,200,await attributionStats(workspaceId))
    if (req.method === 'GET' && url.pathname === '/api/agents') {
      const [state,profiles,runs,customIntegrations,eventRules,audiences,attribution]=await Promise.all([
        getState(),
        listLeadProfiles(workspaceId,1),
        listAgentRuns(workspaceId),
        listCustomIntegrations(workspaceId),
        listEventRules(workspaceId).catch(()=>[]),
        listLeadAudiences(workspaceId).catch(()=>[]),
        attributionStats(workspaceId).catch(()=>({available:false}))
      ])
      const connected=new Set((state.connectorConnections||[]).filter(x=>String(x.status||'').toLowerCase()==='connected').map(x=>x.connector))
      const hasProfiles=profiles.length>0
      const builtIn=agents.map((name,i)=>{
        let status='available'
        if(name==='Meta Advanced CAPI'&&connected.has('Meta Ads'))status='configured'
        else if(name==='Google ECL / OCI'&&connected.has('Google Ads'))status='configured'
        else if(name==='Call Tracking Events'&&(state.callEvents||[]).length)status='configured'
        else if(name==='Custom Integration'&&customIntegrations.length)status='configured'
        else if((name==='Lead Grading'||name==='CRM Enrichment')&&hasProfiles)status='configured'
        else if(name==='Voice Lead Qualification'&&(process.env.VOICE_QUALIFICATION_WEBHOOK_URL||process.env.VOICE_AGENT_WEBHOOK_URL))status='configured'
        else if(name==='Voice Scheduler'&&(connected.has('Google Calendar')||(state.meetings||[]).length))status='configured'
        else if(name==='Meeting Reminder'&&process.env.MEETING_REMINDER_WEBHOOK_URL)status='configured'
        else if(name==='Feedback Agent'&&process.env.FEEDBACK_WEBHOOK_URL)status='configured'
        else if(name==='Lead Reactivation'&&hasProfiles)status='configured'
        else if(name==='Attribution Agent'&&Boolean(attribution?.available)&&(Number(attribution?.matchedEvents||0)>0||Number(attribution?.activeClickSessions||0)>0))status='configured'
        else if(name==='Deep Linking Agent'&&(state.deepLinks||[]).length)status='configured'
        else if(name==='Fraud Detection Agent'&&(state.fraudPatterns||[]).length)status='configured'
        else if(name==='Customer Journey Agent'&&hasProfiles)status='configured'
        else if(name==='Audiences Agent'&&audiences.length)status='configured'
        else if(name==='Event Agent'&&eventRules.length)status='configured'
        else if(name==='Ask Ace')status='available'
        const meta=agentCatalog[name]||{}
        return {id:'builtin_'+i,name,status,type:'built_in',...meta}
      })
      return send(req,res,200,{items:[...builtIn,...(state.customAgents||[])],runs:runs.slice(0,50),configured:builtIn.filter(x=>x.status==='configured').length,custom:(state.customAgents||[]).length})
    }
    if (req.method === 'GET' && url.pathname === '/api/enrich') {
      const [items,stats,runs]=await Promise.all([listLeadProfiles(workspaceId,100),leadOpsStats(workspaceId),listActivationRuns(workspaceId,50)])
      return send(req,res,200,{stats,writebacks:runs.filter(x=>x.kind==='crm_writeback'),items:items.map(x=>({id:x.id,leadId:x.external_lead_id,name:x.name,source:x.source,campaign:x.campaign,stage:x.crm_stage,intent:x.intent,score:x.score,grade:x.grade,drivers:x.score_drivers,attributes:x.attributes,journey:x.journey,callSummary:x.call_summary,whatsappSummary:x.whatsapp_summary,updatedAt:x.updated_at}))})
    }
    if (req.method === 'POST' && url.pathname === '/api/enrich/upsert') {
      const body=await readBody(req)
      const item=await upsertLeadProfile(workspaceId,body)
      if(!item) return send(req,res,503,{error:'lead operations store unavailable'})
      return send(req,res,201,{id:item.id,leadId:item.external_lead_id,name:item.name,score:item.score,grade:item.grade,drivers:item.score_drivers,updatedAt:item.updated_at})
    }
    if (req.method === 'POST' && url.pathname === '/api/enrich/writeback') {
      const body=await readBody(req)
      if(!body.lead || !body.provider) return send(req,res,400,{error:'lead and provider required'})
      const lead=await getLeadProfile(workspaceId,String(body.lead))
      if(!lead) return send(req,res,404,{error:'lead not found'})
      const run=await createActivationRun(workspaceId,{kind:'crm_writeback',entityId:lead.id,provider:String(body.provider),requestSummary:{lead:lead.external_lead_id,grade:lead.grade,score:lead.score}})
      const job=await enqueueJob({workspaceId,kind:'crm_writeback',idempotencyKey:'crm:'+run.id,payload:{leadRef:lead.id,provider:String(body.provider),fields:body.fields||{},activationRunId:run.id}})
      return send(req,res,202,{runId:run.id,jobId:job?.id||null,status:'queued',provider:body.provider})
    }
    if (req.method === 'POST' && url.pathname === '/api/lead-grading/score') {
      const body=await readBody(req)
      return send(req,res,200,scoreLead(body))
    }
    if (req.method === 'GET' && url.pathname === '/api/lead-grading') {
      const [items,stats]=await Promise.all([listLeadProfiles(workspaceId,100),leadOpsStats(workspaceId)])
      return send(req,res,200,{version:'v2.0',stats,items:items.map(x=>({id:x.id,lead:x.name||x.external_lead_id,leadId:x.external_lead_id,score:x.score,grade:x.grade,source:x.source,stage:x.crm_stage||'lead',reason:(x.score_drivers||[]).slice(0,3).map(d=>d.label).join(' · '),drivers:x.score_drivers,updatedAt:x.updated_at}))})
    }
    if (req.method === 'POST' && url.pathname === '/api/lead-grading/override') {
      const body=await readBody(req)
      if(!body.lead || !['A','B','C','D'].includes(body.grade)) return send(req,res,400,{error:'lead and grade A-D required'})
      const item=await persistLeadGrade(workspaceId,String(body.lead),String(body.grade))
      return item?send(req,res,200,{lead:item.name||item.external_lead_id,grade:item.grade,score:item.score,overridden:true,auditId:randomUUID(),updatedAt:item.updated_at}):send(req,res,404,{error:'lead not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/lead-grading/activate') {
      const body=await readBody(req)
      if(!body.lead) return send(req,res,400,{error:'lead required'})
      const profiles=await listLeadProfiles(workspaceId,500)
      const lead=profiles.find(x=>x.external_lead_id===body.lead||x.name===body.lead)
      if(!lead) return send(req,res,404,{error:'lead not found'})
      const grade=String(lead.grade||'D').toUpperCase()
      let operation=null
      let nextTab='Audiences'
      let action='suppression_review'
      if(grade==='A'||grade==='B'){
        const destination=grade==='A'?'Priority sales queue':'Sales queue'
        operation=await routeLead(workspaceId,{
          leadRef:lead.external_lead_id,
          score:lead.score,
          source:lead.source||'Lead grading',
          routingRule:{
            name:'Grade '+grade+' activation',
            destination,
            reason:'Lead grading activation · grade '+grade+' · score '+Number(lead.score||0),
            slaSeconds:grade==='A'?120:300
          }
        })
        nextTab='Routing'
        action='routing'
      }else if(grade==='C'){
        operation=await createFollowUp(workspaceId,{
          leadRef:lead.external_lead_id,
          reason:'Lead grading nurture · grade C · score '+Number(lead.score||0),
          channel:'whatsapp',
          priority:'medium',
          delayMinutes:60,
          owner:'Nurture queue'
        })
        nextTab='Follow-ups'
        action='nurture_followup'
      }else{
        operation=await createFollowUp(workspaceId,{
          leadRef:lead.external_lead_id,
          reason:'Review Grade D lead for acquisition suppression',
          channel:'review',
          priority:'low',
          delayMinutes:15,
          owner:'Marketing operations'
        })
        nextTab='Audiences'
        action='suppression_review'
      }
      const now=new Date().toISOString()
      await mutateState(s=>{
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'lead_grade.activated',entityId:lead.id,leadRef:lead.external_lead_id,grade,operationType:action,operationId:operation?.id||null,nextTab,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,202,{
        lead:lead.name||lead.external_lead_id,
        leadId:lead.external_lead_id,
        grade,
        status:'activated',
        action,
        nextTab,
        operation:operation?{id:operation.id,status:operation.status||'open',destination:operation.destination||operation.owner||null,dueAt:operation.due_at||null}:null,
        queuedAt:now
      })
    }
    if (req.method === 'GET' && url.pathname === '/api/behavior') {
      const state=await getState()
      const sourceEvents=(state.recentEvents||[]).length?(state.recentEvents||[]):trackedEvents
      const countBy=(selector)=>{
        const map=new Map()
        for(const event of sourceEvents){
          const key=String(selector(event)||'Unknown').trim()||'Unknown'
          map.set(key,(map.get(key)||0)+1)
        }
        return [...map.entries()].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count)
      }
      const eventCounts=new Map()
      let known=0,highIntent=0,deviceIdentified=0
      for(const event of sourceEvents){
        const name=String(event.event||event.eventType||event.name||'event')
        eventCounts.set(name,(eventCounts.get(name)||0)+1)
        if(event.customerId||event.visitorId||event.deviceId||event.device_id||event.emailSha256||event.email_sha256||event.phoneSha256||event.phone_sha256)known++
        if(event.deviceId||event.device_id)deviceIdentified++
        if(/pricing|checkout|book|consult|apply|purchase|revenue|qualified|enrol|closed_won/i.test(name))highIntent++
      }
      const events=[...eventCounts.entries()].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count)
      const sources=countBy(event=>event.utm_source||event.source||event.channel||'Direct / First-party')
      const campaigns=countBy(event=>event.utm_campaign||event.campaign||'Unattributed campaign')
      const devices=countBy(event=>event.devicePlatform||event.device_platform||event.platform||'Unknown device')
      const total=sourceEvents.length
      return send(req,res,200,{
        events,
        sources,
        campaigns,
        devices,
        stats:{
          events:total,
          knownIdentities:known,
          knownIdentityRate:total?Number((known/total*100).toFixed(1)):0,
          deviceIdentifiedEvents:deviceIdentified,
          deviceIdentityRate:total?Number((deviceIdentified/total*100).toFixed(1)):0,
          highIntentEvents:highIntent,
          highIntentRate:total?Number((highIntent/total*100).toFixed(1)):0
        },
        recent:sourceEvents.slice(0,100),
        persistence:(state.recentEvents||[]).length?'workspace_store':'process_window',
        generatedAt:new Date().toISOString()
      })
    }
    if (req.method === 'GET' && url.pathname === '/api/feed') {
      const [profiles,state]=await Promise.all([listLeadProfiles(workspaceId,200),getState()])
      const attrs=new Map()
      const add=(key,source,value)=>{if(!key)return;const entry=attrs.get(key)||{key,source,count:0,sample:null,status:'mapped'};entry.count++;if(entry.sample==null&&value!=null&&typeof value!=='object')entry.sample=String(value).slice(0,120);attrs.set(key,entry)}
      for(const p of profiles){
        add('lead_score','model',p.score);add('lead_grade','model',p.grade);add('lifecycle_stage','crm',p.crm_stage);add('device_platform','identity',p.device_platform);add('app_id','identity',p.app_id)
        for(const [k,v] of Object.entries(p.attributes||{}))add(k,'profile',v)
        for(const [k,v] of Object.entries(p.journey||{}))add(k,'journey',v)
      }
      for(const x of state.customFeedAttributes||[])attrs.set(x.key,{...x,status:'mapped'})
      const deliveries=state.signalDeliveries||[]
      const destinations=[...new Set(deliveries.map(x=>x.destination).filter(Boolean))].map(destination=>{const list=deliveries.filter(x=>x.destination===destination);const enriched=list.filter(x=>Object.keys(x.replayPayload?.data||{}).length>0).length;return {destination,total:list.length,enriched,enrichedRate:list.length?Number((enriched/list.length*100).toFixed(1)):0}})
      return send(req,res,200,{attributes:[...attrs.values()],mappings:(state.feedMappings||[]),stats:{activeAttributes:attrs.size,profiles:profiles.length,deliveries:deliveries.length,quarantined:Number((state.quarantinedEvents||[]).length)},destinations})
    }
    if (req.method === 'POST' && url.pathname === '/api/feed/attributes') {
      const body=await readBody(req)
      const key=String(body.key||'').trim()
      if(!/^[A-Za-z][A-Za-z0-9_]{1,63}$/.test(key))return send(req,res,400,{error:'attribute key must be 2-64 alphanumeric/underscore characters'})
      const item={key,source:String(body.source||'custom'),sample:body.sample==null?null:String(body.sample).slice(0,120),status:'mapped',createdAt:new Date().toISOString()}
      await mutateState(s=>{s.customFeedAttributes=s.customFeedAttributes||[];const i=s.customFeedAttributes.findIndex(x=>x.key===key);if(i>=0)s.customFeedAttributes[i]=item;else s.customFeedAttributes.unshift(item);s.customFeedAttributes=s.customFeedAttributes.slice(0,500)})
      return send(req,res,201,item)
    }
    if (req.method === 'POST' && url.pathname === '/api/feed/mappings') {
      const body=await readBody(req)
      const sourceKey=String(body.sourceKey||'').trim()
      const destination=String(body.destination||'').trim()
      const targetKey=String(body.targetKey||'').trim()
      if(!/^[A-Za-z][A-Za-z0-9_]{1,63}$/.test(sourceKey))return send(req,res,400,{error:'sourceKey must be 2-64 alphanumeric/underscore characters'})
      if(!destination||!targetKey)return send(req,res,400,{error:'destination and targetKey are required'})
      const now=new Date().toISOString()
      const item={id:'feedmap_'+randomUUID(),sourceKey,destination:destination.slice(0,120),targetKey:targetKey.slice(0,120),transform:String(body.transform||'copy').slice(0,60),enabled:true,createdAt:now}
      await mutateState(s=>{
        s.feedMappings=s.feedMappings||[]
        const i=s.feedMappings.findIndex(x=>x.sourceKey===sourceKey&&x.destination===item.destination&&x.targetKey===item.targetKey)
        if(i>=0)s.feedMappings[i]={...s.feedMappings[i],...item,id:s.feedMappings[i].id,createdAt:s.feedMappings[i].createdAt,updatedAt:now}
        else s.feedMappings.unshift(item)
        s.feedMappings=s.feedMappings.slice(0,500)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'feed.mapping_saved',entityId:item.id,sourceKey,destination:item.destination,targetKey:item.targetKey,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item})
    }
    if (req.method === 'POST' && url.pathname === '/api/feed/mappings/toggle') {
      const body=await readBody(req)
      if(!body.id||typeof body.enabled!=='boolean')return send(req,res,400,{error:'id and enabled required'})
      let updated=null
      await mutateState(s=>{
        const item=(s.feedMappings||[]).find(x=>x.id===body.id)
        if(item){item.enabled=body.enabled;item.updatedAt=new Date().toISOString();updated={...item}}
      })
      return updated?send(req,res,200,{item:updated}):send(req,res,404,{error:'feed mapping not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/feed/preview') {
      const body=await readBody(req)
      const state=await getState()
      const profiles=await listLeadProfiles(workspaceId,20)
      const destination=String(body.destination||'').trim()
      const mappings=(state.feedMappings||[]).filter(x=>x.enabled!==false&&(!destination||x.destination===destination))
      const profile=profiles[0]||null
      const lookup=(key)=>{
        if(!profile)return null
        if(key==='lead_score')return profile.score
        if(key==='lead_grade')return profile.grade
        if(key==='lifecycle_stage')return profile.crm_stage
        if(key==='device_platform')return profile.device_platform
        if(key==='app_id')return profile.app_id
        if(Object.prototype.hasOwnProperty.call(profile.attributes||{},key))return profile.attributes[key]
        if(Object.prototype.hasOwnProperty.call(profile.journey||{},key))return profile.journey[key]
        const custom=(state.customFeedAttributes||[]).find(x=>x.key===key)
        return custom?.sample??null
      }
      const payload={}
      for(const mapping of mappings){
        let value=lookup(mapping.sourceKey)
        if(mapping.transform==='string'&&value!=null)value=String(value)
        if(mapping.transform==='number'&&value!=null&&Number.isFinite(Number(value)))value=Number(value)
        payload[mapping.targetKey]=value
      }
      return send(req,res,200,{destination:destination||null,profileId:profile?.id||null,mappings:mappings.length,payload,generatedAt:new Date().toISOString(),notice:profile?'Preview generated from the latest persisted profile plus custom attribute samples.':'No persisted profile available; custom samples may still appear.'})
    }
    if (req.method === 'GET' && url.pathname === '/api/solutions') return send(req,res,200,{items:['Agency','Lead Generation','Enterprise','Mid Market Brand','Attribution Model','Alerts and Monitoring','Server to Server Integration']})
    if (req.method === 'POST' && url.pathname === '/api/audiences/preview') {
      const body=await readBody(req)
      if(!body.name || !body.condition) return send(req,res,400,{error:'name and condition required'})
      const preview=await previewLeadAudience(workspaceId,body)
      return send(req,res,200,preview)
    }
    if (req.method === 'POST' && url.pathname === '/api/audiences') {
      const body=await readBody(req)
      if(!body.name || !body.destination || !body.condition) return send(req,res,400,{error:'name, destination and condition required'})
      const item=await createLeadAudience(workspaceId,body)
      if(!item) return send(req,res,503,{error:'audience store unavailable'})
      await mutateState(s=>{s.audit.unshift({id:randomUUID(),action:'audience.materialized',entityId:item.id,at:new Date().toISOString()});s.audit=s.audit.slice(0,1000)})
      return send(req,res,201,{id:item.id,name:item.name,status:item.status,destination:item.destination,mode:item.mode,size:item.matched_size,estimatedSize:item.estimated_size,createdAt:item.created_at})
    }
    if (req.method === 'POST' && url.pathname === '/api/audiences/materialize') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      const result=await materializeAudience(workspaceId,String(body.id))
      return result?send(req,res,200,result):send(req,res,404,{error:'audience not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/audiences/sync') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      const bundle=await getAudienceBundle(workspaceId,String(body.id))
      if(!bundle) return send(req,res,404,{error:'audience not found'})
      const configured=String(body.provider||bundle.audience.destination||'').split(/·|,/).map(x=>x.trim()).filter(Boolean)
      const providers=configured.map(x=>x.toLowerCase().includes('meta')?'Meta Ads':x.toLowerCase().includes('google')?'Google Ads':null).filter(Boolean)
      if(!providers.length) return send(req,res,400,{error:'audience destination must include Meta Ads or Google Ads'})
      const queued=[]
      for(const provider of [...new Set(providers)]){
        const key=provider==='Meta Ads'?'meta':'google'
        await updateAudienceSyncState(workspaceId,bundle.audience.id,key,{status:'queued',error:null})
        const run=await createActivationRun(workspaceId,{kind:'audience_sync',entityId:bundle.audience.id,provider,requestSummary:{audience:bundle.audience.name,members:bundle.members.length,mode:bundle.audience.mode}})
        const job=await enqueueJob({workspaceId,kind:'audience_sync',idempotencyKey:'audience:'+bundle.audience.id+':'+key+':'+Date.now(),payload:{audienceId:bundle.audience.id,provider,activationRunId:run.id}})
        queued.push({provider,runId:run.id,jobId:job?.id||null})
      }
      return send(req,res,202,{id:bundle.audience.id,status:'syncing',queued})
    }
    if (req.method === 'GET' && url.pathname === '/api/audience-schedules') {
      return send(req,res,200,{items:await listAudienceSchedules(workspaceId),runs:await listAudienceRefreshRuns(workspaceId,null,50)})
    }
    if (req.method === 'POST' && url.pathname === '/api/audience-schedules') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      try{
        const item=await saveAudienceSchedule(workspaceId,String(body.id),body)
        return item?send(req,res,200,item):send(req,res,404,{error:'audience not found'})
      }catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'invalid audience schedule'})}
    }
    if (req.method === 'GET' && url.pathname === '/api/activation-runs') {
      return send(req,res,200,{items:await listActivationRuns(workspaceId,100)})
    }
    if (req.method === 'GET' && url.pathname === '/api/audiences') {
      const [items,schedules,stats]=await Promise.all([listLeadAudiences(workspaceId),listAudienceSchedules(workspaceId),audienceOpsStats(workspaceId)])
      const scheduleById=Object.fromEntries(schedules.map(x=>[x.audience_id,x]))
      return send(req,res,200,{items:items.map(x=>{const s=scheduleById[x.id];return {id:x.id,name:x.name,size:x.matched_size,estimatedSize:x.estimated_size,mode:x.mode,destination:x.destination,identityMode:x.identity_mode,status:x.status,cadence:s?.cadenceLabel||'Manual',schedule:s||null,definition:x.definition,providerState:x.provider_state,lastSyncError:x.last_sync_error,lastSyncedAt:x.last_synced_at,lastMaterializedAt:x.last_materialized_at}}),stats})
    }
    if (req.method === 'GET' && url.pathname === '/api/alerts') return send(req,res,200,{items:await listLiveAlerts(workspaceId)})
    if (req.method === 'POST' && url.pathname === '/api/alerts/resolve') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      const item=await resolveLiveAlert(workspaceId,String(body.id))
      return item?send(req,res,200,item):send(req,res,404,{error:'alert not found'})
    }
    if (req.method === 'GET' && url.pathname === '/api/signal-deliveries') {
      const state=await getState()
      const items=(state.signalDeliveries||[]).slice().sort((a,b)=>String(b.updatedAt||b.createdAt).localeCompare(String(a.updatedAt||a.createdAt)))
      const summary={
        total:items.length,
        delivered:items.filter(x=>x.status==='delivered').length,
        retrying:items.filter(x=>x.status==='retrying'||x.status==='queued').length,
        deadLetter:items.filter(x=>x.status==='dead_letter').length
      }
      return send(req,res,200,{summary,items})
    }
    if (req.method === 'POST' && url.pathname === '/api/signal-deliveries/dispatch') {
      const body=await readBody(req)
      const validationError=validateSignalDispatch(body)
      if(validationError) return send(req,res,400,{error:validationError})
      if(!queueAvailable()) return send(req,res,503,{error:'signal delivery queue unavailable',required:'DATABASE_URL'})
      if(body.customerId||body.visitorId){
        const consent=await consentAllows(workspaceId,{subjectType:body.customerId?'customer':'visitor',subjectId:body.customerId||body.visitorId,category:'marketing'})
        if(!consent.allowed) return send(req,res,403,{error:'marketing consent required',reason:consent.reason})
      }
      const rawKey=String(body.idempotencyKey||JSON.stringify([body.event,body.destination,body.customerId||'',body.externalEventId||'',body.occurredAt||'']))
      const idempotencyKey=createHash('sha256').update(rawKey).digest('hex')
      const state=await getState()
      const existing=(state.signalDeliveries||[]).find(x=>x.idempotencyKey===idempotencyKey)
      if(existing) return send(req,res,200,{duplicate:true,item:existing})
      const now=new Date().toISOString()
      const item={
        id:'sig_'+randomUUID(),
        event:String(body.event),
        destination:String(body.destination),
        customerId:body.customerId?String(body.customerId):null,
        externalEventId:body.externalEventId?String(body.externalEventId):null,
        status:'queued',
        attempts:0,
        idempotencyKey,
        createdAt:now,
        updatedAt:now,
        nextAttemptAt:now
      }
      item.replayPayload=buildSignalReplayPayload(body,{...item,idempotencyKey})
      await mutateState(s=>{
        s.signalDeliveries=s.signalDeliveries||[]
        s.signalDeliveries.unshift(item)
        s.signalDeliveries=s.signalDeliveries.slice(0,10000)
        s.audit.unshift({id:randomUUID(),action:'signal.queued',entityId:item.id,destination:item.destination,event:item.event,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      const job=await enqueueJob({
        workspaceId,
        kind:'signal_delivery',
        idempotencyKey:'signal:'+idempotencyKey,
        payload:item.replayPayload
      })
      return send(req,res,202,{duplicate:false,item,job:job?{id:job.id,status:job.status}:null})
    }
    if (req.method === 'POST' && url.pathname === '/api/signal-deliveries/retry') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      if(!queueAvailable()) return send(req,res,503,{error:'signal delivery queue unavailable',required:'DATABASE_URL'})
      let updated=null
      const now=new Date().toISOString()
      await mutateState(s=>{
        const item=(s.signalDeliveries||[]).find(x=>x.id===body.id)
        if(item){
          item.status='queued'
          item.nextAttemptAt=now
          item.updatedAt=now
          item.lastError=null
          updated={...item}
        }
        s.audit.unshift({id:randomUUID(),action:'signal.retry_queued',entityId:String(body.id),at:now})
        s.audit=s.audit.slice(0,1000)
      })
      if(updated){
        const replayPayload=updated.replayPayload||buildSignalReplayPayload(updated,updated)
        await enqueueJob({
          workspaceId,
          kind:'signal_delivery',
          idempotencyKey:'retry:'+updated.id+':'+Date.now(),
          payload:{...replayPayload,deliveryId:updated.id,event:updated.event,destination:updated.destination,idempotencyKey:updated.idempotencyKey}
        })
        return send(req,res,202,updated)
      }
      return send(req,res,404,{error:'delivery not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/signal-deliveries/replay-dlq') {
      if(!queueAvailable()) return send(req,res,503,{error:'signal delivery queue unavailable',required:'DATABASE_URL'})
      const now=new Date().toISOString()
      const replayItems=[]
      await mutateState(s=>{
        for(const item of (s.signalDeliveries||[])){
          if(item.status==='dead_letter'){
            item.status='queued'
            item.nextAttemptAt=now
            item.updatedAt=now
            item.lastError=null
            replayItems.push({...item})
          }
        }
        s.audit.unshift({id:randomUUID(),action:'signal.dlq_replayed',count:replayItems.length,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      const jobs=[]
      for(const item of replayItems){
        const replayPayload=item.replayPayload||buildSignalReplayPayload(item,item)
        const job=await enqueueJob({
          workspaceId,
          kind:'signal_delivery',
          idempotencyKey:'dlq-replay:'+item.id+':'+Date.now(),
          payload:{...replayPayload,deliveryId:item.id,event:item.event,destination:item.destination,idempotencyKey:item.idempotencyKey}
        })
        jobs.push(job?.id||null)
      }
      return send(req,res,202,{replayed:replayItems.length,jobs:jobs.filter(Boolean),queuedAt:now})
    }
    if (req.method === 'GET' && url.pathname === '/api/connector-health') {
      const state=await getState()
      const jobs=await queueStats(workspaceId)
      return send(req,res,200,{items:state.connectorHealth||[],jobs,checkedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/webhooks/deliveries') {
      const state=await getState()
      return send(req,res,200,{items:(state.webhookDeliveries||[]).slice(0,250),endpoints:(state.webhookEndpoints||[]).slice(0,100)})
    }
    if (req.method === 'GET' && url.pathname === '/api/webhooks/endpoints') {
      const state=await getState()
      return send(req,res,200,{items:(state.webhookEndpoints||[]).slice(0,100)})
    }
    if (req.method === 'POST' && url.pathname === '/api/webhooks/endpoints') {
      const body=await readBody(req)
      const event=String(body.event||'').trim()
      const target=String(body.url||'').trim()
      if(!event||!target) return send(req,res,400,{error:'event and url required'})
      let parsed
      try{parsed=new URL(target)}catch{return send(req,res,400,{error:'valid webhook URL required'})}
      if(parsed.protocol!=='https:'&&!(!IS_PROD&&parsed.protocol==='http:')) return send(req,res,400,{error:'webhook URL must use HTTPS'})
      const now=new Date().toISOString()
      const item={id:'wh_'+randomUUID(),event,url:parsed.toString(),status:'active',createdAt:now,updatedAt:now}
      await mutateState(s=>{
        s.webhookEndpoints=s.webhookEndpoints||[]
        s.webhookEndpoints.unshift(item)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'webhook.endpoint_created',entityId:item.id,event:item.event,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,item)
    }
    if (req.method === 'POST' && url.pathname === '/api/webhooks/retry') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      let item=null
      const now=new Date().toISOString()
      await mutateState(s=>{
        const delivery=(s.webhookDeliveries||[]).find(x=>x.id===body.id)
        if(delivery){
          delivery.status='queued'
          delivery.updatedAt=now
          delivery.attempts=Number(delivery.attempts||0)+1
          delivery.lastError=null
          item={...delivery}
        }
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'webhook.retry_queued',entityId:String(body.id),at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return item?send(req,res,202,item):send(req,res,404,{error:'webhook delivery not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/webhooks/secret/rotate') {
      const secret='whsec_'+randomUUID().replaceAll('-','')+randomBytes(8).toString('hex')
      const fingerprint=createHash('sha256').update(secret).digest('hex')
      const createdAt=new Date().toISOString()
      await mutateState(s=>{
        s.webhookSigningSecret={fingerprint,createdAt}
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'webhook.secret_rotated',entityId:fingerprint.slice(0,12),at:createdAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{secret,createdAt,notice:'Store this secret now; only its SHA-256 fingerprint is persisted.'})
    }
    if (req.method === 'GET' && url.pathname === '/api/consent/stats') return send(req,res,200,{stats:await consentStats(workspaceId),audit:await listConsentAudit(workspaceId,50)})
    if (req.method === 'GET' && url.pathname === '/api/privacy/requests') {
      if(!['owner','admin'].includes(req.user?.role||'')) return send(req,res,403,{error:'owner or admin role required'})
      return send(req,res,200,{policy:retentionPolicy(),items:await listPrivacyRequests(workspaceId,100)})
    }
    if (req.method === 'POST' && url.pathname === '/api/privacy/export') {
      if(!['owner','admin'].includes(req.user?.role||'')) return send(req,res,403,{error:'owner or admin role required'})
      const body=await readBody(req)
      try{return send(req,res,200,await exportSubject(workspaceId,body,req.user?.email||req.user?.userId||null))}
      catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'privacy export failed'})}
    }
    if (req.method === 'POST' && url.pathname === '/api/privacy/delete') {
      if(!['owner','admin'].includes(req.user?.role||'')) return send(req,res,403,{error:'owner or admin role required'})
      const body=await readBody(req)
      try{return send(req,res,200,await deleteSubject(workspaceId,body,req.user?.email||req.user?.userId||null))}
      catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'privacy deletion failed'})}
    }
    if (req.method === 'POST' && url.pathname === '/api/privacy/retention/purge') {
      if(!['owner','admin'].includes(req.user?.role||'')) return send(req,res,403,{error:'owner or admin role required'})
      const body=await readBody(req)
      try{return send(req,res,200,await purgeRetention(workspaceId,{dryRun:body.dryRun!==false,requestedBy:req.user?.email||req.user?.userId||null}))}
      catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'retention purge failed'})}
    }
    if (req.method === 'GET' && url.pathname === '/api/monitoring') return send(req,res,200,await monitoringSnapshot(workspaceId))
    if (req.method === 'GET' && url.pathname === '/api/billing/usage') return send(req,res,200,await subscriptionSummary(workspaceId))
    if (req.method === 'GET' && url.pathname === '/api/billing/subscription') {
      const summary=await subscriptionSummary(workspaceId)
      return send(req,res,200,{...summary,providerConfigured:billingConfigured(),events:await billingEventHistory(workspaceId,20)})
    }
    if (req.method === 'POST' && url.pathname === '/api/billing/checkout') {
      if(req.user?.role!=='owner') return send(req,res,403,{error:'owner role required'})
      const body=await readBody(req)
      if(!body.planCode) return send(req,res,400,{error:'planCode required'})
      try{return send(req,res,201,await createCheckoutSession(workspaceId,body))}
      catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'checkout creation failed'})}
    }
    if (req.method === 'POST' && url.pathname === '/api/billing/portal') {
      if(req.user?.role!=='owner') return send(req,res,403,{error:'owner role required'})
      try{return send(req,res,201,await createPortalSession(workspaceId))}
      catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'billing portal unavailable'})}
    }
    if (req.method === 'POST' && url.pathname === '/api/billing/entitlements') {
      if(req.user?.role!=='owner') return send(req,res,403,{error:'owner role required'})
      const body=await readBody(req)
      try{
        await updateWorkspaceEntitlements(workspaceId,body)
        return send(req,res,200,await subscriptionSummary(workspaceId))
      }catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'invalid entitlements'})}
    }
    if (req.method === 'GET' && url.pathname === '/api/signal-console') {
      const [state,jobs]=await Promise.all([getState(),queueStats(workspaceId)])
      const deliveries=(state.signalDeliveries||[]).slice()
      const aggregate=provider=>{
        const selected=deliveries.filter(x=>String(x.destination||'').toLowerCase().includes(provider))
        const grouped=new Map()
        for(const item of selected){
          const key=String(item.event||'Unknown')
          const row=grouped.get(key)||{event:key,total:0,delivered:0,retrying:0,deadLetter:0,latencyMs:[]}
          row.total+=1
          if(item.status==='delivered') row.delivered+=1
          if(item.status==='queued'||item.status==='retrying') row.retrying+=1
          if(item.status==='dead_letter') row.deadLetter+=1
          if(Number.isFinite(Number(item.latencyMs))) row.latencyMs.push(Number(item.latencyMs))
          grouped.set(key,row)
        }
        return [...grouped.values()].map(row=>({
          event:row.event,
          total:row.total,
          delivered:row.delivered,
          retrying:row.retrying,
          deadLetter:row.deadLetter,
          deliveryRate:row.total?Number((row.delivered/row.total*100).toFixed(2)):0,
          averageLatencyMs:row.latencyMs.length?Math.round(row.latencyMs.reduce((a,b)=>a+b,0)/row.latencyMs.length):null
        })).sort((a,b)=>b.total-a.total)
      }
      return send(req,res,200,{
        generatedAt:new Date().toISOString(),
        queue:jobs,
        summary:{
          total:deliveries.length,
          delivered:deliveries.filter(x=>x.status==='delivered').length,
          retrying:deliveries.filter(x=>x.status==='queued'||x.status==='retrying').length,
          deadLetter:deliveries.filter(x=>x.status==='dead_letter').length
        },
        google:aggregate('google'),
        meta:aggregate('meta'),
        webhook:aggregate('webhook'),
        recent:deliveries.sort((a,b)=>String(b.updatedAt||b.createdAt).localeCompare(String(a.updatedAt||a.createdAt))).slice(0,25)
      })
    }
    if (req.method === 'GET' && url.pathname === '/api/resources') return send(req,res,200,{items:['Custom Events','Server-Side Activation','Attribution','CRM Enrichment','Offline Conversion Tracking','Audience Operations']})
    if (req.method === 'GET' && url.pathname === '/api/ai-action') return send(req,res,200,{steps:[
      {step:1,agent:'Lead Grading',action:'score_intent'},
      {step:2,agent:'CRM Enrichment',action:'assemble_context'},
      {step:3,agent:'Voice Lead Qualification',action:'qualify'},
      {step:4,agent:'Voice Scheduler',action:'schedule'},
      {step:5,agent:'Meeting Reminder',action:'remind'},
      {step:6,agent:'Signal Return',action:'match_and_activate'}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/source-notes') return send(req,res,200,{notes:[
      {topic:'Shopify support',publicSite:'Current demo page says ecommerce Shopify is unsupported',brochure:'Shopify appears in integration list',aceMarketing:'planned_connector_with_source_conflict_label'}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/case-studies') return send(req,res,200,{items:[
      {name:'Apollo Ayurvaid',sector:'Healthcare',pattern:'Call + WhatsApp attribution'},
      {name:'Jaro Education',sector:'EdTech',pattern:'High-volume OCI/ECL'},
      {name:'GemPundit',sector:'High AOV',pattern:'WhatsApp + partial payment'},
      {name:'Berger Paints',sector:'Home Services',pattern:'CAPI + CTWA quality optimization'}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/event-templates') return send(req,res,200,{items:['Pricing-page Lead','High-value Purchase','Prepaid Order','Fulfilled Order','Returned Order','Partial Payment']})
    if (req.method === 'POST' && url.pathname === '/api/consent-preferences') {
      const body = await readBody(req)
      return send(req,res,200,{saved:true,preferences:{necessary:true,analytics:Boolean(body.analytics),advertising:Boolean(body.advertising),functionality:Boolean(body.functionality)}})
    }
    if (req.method === 'GET' && url.pathname === '/api/monitoring-rules') return send(req,res,200,{items:await listLiveMonitoringRules(workspaceId)})
    if (req.method === 'POST' && url.pathname === '/api/monitoring-rules') {
      const body=await readBody(req)
      try{return send(req,res,201,await saveMonitoringRule(workspaceId,body))}
      catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'invalid monitoring rule'})}
    }
    if (req.method === 'GET' && url.pathname === '/api/security-posture') return send(req,res,200,{controls:[
      {name:'ISO 27001',status:'roadmap'},
      {name:'SHA-256 hashing',status:'design_implemented'},
      {name:'GDPR',status:'roadmap'},
      {name:'HIPAA',status:'roadmap'},
      {name:'India DPDP',status:'roadmap'}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/launchpad') {
      const state=await getState()
      const safe=async(fn,fallback)=>{try{return await fn()}catch{return fallback}}
      const [leadStats,attr,audiences,queue,eventRules,agentRuns]=await Promise.all([
        safe(()=>leadOpsStats(workspaceId),{available:false,total:0}),
        safe(()=>attributionStats(workspaceId),{available:false,matchedEvents:0,activeClickSessions:0}),
        safe(()=>audienceOpsStats(workspaceId),{available:false,audiences:{total:0}}),
        safe(()=>queueStats(workspaceId),{backend:'disabled',pending:0,retry:0,deadLetter:0}),
        safe(()=>listEventRules(workspaceId),[]),
        safe(()=>listAgentRuns(workspaceId),[])
      ])
      const settings=state.workspaceSettings||{}
      const connectors=state.connectorConnections||[]
      const connected=connectors.filter(x=>['connected','healthy','active'].includes(String(x.status||'').toLowerCase()))
      const tracked=trackedEvents.length
      const deliveries=state.signalDeliveries||[]
      const steps=[
        {key:'workspace',title:'Workspace',ready:Boolean(settings.organization||settings.primaryDomain||state.launchpad?.workspaceConfigured),detail:settings.organization||'Workspace profile not completed',tab:'Settings'},
        {key:'connect',title:'Connect data',ready:connected.length>0,detail:connected.length+' connected system(s)',tab:'Integrations'},
        {key:'funnel',title:'Map funnel',ready:Number(leadStats?.total||0)>0||Boolean(state.launchpad?.funnelConfigured),detail:Number(leadStats?.total||0)+' lead profile(s)',tab:'Funnel'},
        {key:'tracking',title:'Install tracking',ready:tracked>0||Boolean(settings.primaryDomain),detail:tracked+' tracked event(s)',tab:'Sites'},
        {key:'signal',title:'Test signal',ready:deliveries.length>0||eventRules.length>0,detail:eventRules.length+' event rule(s) · '+deliveries.length+' delivery record(s)',tab:'Delivery'},
        {key:'agents',title:'Activate agents',ready:agentRuns.length>0||Boolean((state.customAgents||[]).length),detail:agentRuns.length+' run(s) · '+(state.customAgents||[]).length+' custom agent(s)',tab:'Agents'}
      ]
      return send(req,res,200,{
        ...(state.launchpad||{}),
        readiness:Math.round(steps.filter(x=>x.ready).length/steps.length*100),
        steps,
        evidence:{
          connectedConnectors:connected.length,
          trackedEvents:tracked,
          profiles:Number(leadStats?.total||0),
          activeClickSessions:Number(attr?.activeClickSessions||0),
          matchedEvents:Number(attr?.matchedEvents||0),
          audiences:Number(audiences?.audiences?.total||0),
          eventRules:eventRules.length,
          deliveries:deliveries.length,
          queue
        }
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/launchpad') {
      const body=await readBody(req)
      const updatedAt=new Date().toISOString()
      await mutateState(s=>{
        s.launchpad={...(s.launchpad||{}),...body,updatedAt}
        s.audit.unshift({id:randomUUID(),action:'launchpad.updated',entityId:'workspace',at:updatedAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,{saved:true,updatedAt})
    }
    if (req.method === 'GET' && url.pathname === '/api/identity') {
      const [profiles,attr]=await Promise.all([listLeadProfiles(workspaceId,500),attributionStats(workspaceId).catch(()=>({available:false}))])
      const idCount=lead=>[lead.external_lead_id,lead.email_sha256,lead.phone_sha256,lead.device_id].filter(Boolean).length
      const stitched=profiles.filter(lead=>idCount(lead)>=2)
      const identifiers=[
        profiles.some(x=>x.external_lead_id)?'customer_id':null,
        profiles.some(x=>x.email_sha256)?'email_sha256':null,
        profiles.some(x=>x.phone_sha256)?'phone_sha256':null,
        profiles.some(x=>x.device_id)?'device_id':null,
        Number(attr?.clickIdCoverage?.gclid||0)>0?'gclid':null,
        Number(attr?.clickIdCoverage?.fbclid||0)>0?'fbclid':null,
        Number(attr?.clickIdCoverage?.braid||0)>0?'gbraid/wbraid':null
      ].filter(Boolean)
      const recent=profiles.slice(0,50).map(lead=>({
        id:lead.external_lead_id||lead.id,
        name:lead.name||lead.external_lead_id||'Anonymous profile',
        identifierCount:idCount(lead),
        touchpoints:Math.max(0,Number(lead.journey?.journeyDepth||0))+Number(lead.journey?.pricingPageViews||0)+(lead.journey?.whatsappEngaged?1:0)+(lead.journey?.callOutcome?1:0)+(lead.journey?.meetingStatus?1:0),
        confidence:idCount(lead)>=3?'High':idCount(lead)>=2?'Medium':'Single-key',
        identifiers:{
          customerId:Boolean(lead.external_lead_id),
          email:Boolean(lead.email_sha256),
          phone:Boolean(lead.phone_sha256),
          device:Boolean(lead.device_id)
        }
      }))
      const total=profiles.length
      const deterministicRate=total?Number((stitched.length/total*100).toFixed(1)):null
      return send(req,res,200,{
        available:true,
        profiles:total,
        stitchedProfiles:stitched.length,
        deterministicMatchRate:deterministicRate,
        clickCoverage:attr?.clickIdCoverage||{},
        identifiers,
        rules:[
          {priority:1,key:'customer_id',mode:'exact'},
          {priority:2,key:'email_sha256',mode:'exact'},
          {priority:3,key:'phone_sha256',mode:'exact'},
          {priority:4,key:'device_id',mode:'supporting'},
          {priority:5,key:'click_id + session',mode:'deterministic'}
        ],
        recent
      })
    }
    if (req.method === 'GET' && url.pathname === '/api/models') {
      const state=await getState()
      const stats=await leadOpsStats(workspaceId).catch(()=>({available:false,total:0,averageScore:0}))
      const runs=(state.agentRuns||[]).filter(x=>x.kind==='model').slice(0,20)
      const builtIn=[
        {id:'builtin_lead_quality',name:'Lead quality scoring',version:'v2.0',status:Number(stats?.total||0)>0?'active':'ready',type:'Scoring',metric:'Average lead score',value:Number(stats?.averageScore||0),description:'Explainable scoring over persisted CRM, journey and interaction evidence.',builtIn:true},
        {id:'builtin_journey_features',name:'Journey propensity features',version:'workspace',status:Number(stats?.total||0)>0?'active':'ready',type:'Feature set',metric:'Profiles available',value:Number(stats?.total||0),description:'Uses persisted journey depth, pricing views, messaging, calls, meetings and CRM stage as model features.',builtIn:true}
      ]
      const custom=(state.customModels||[]).map(x=>({...x,builtIn:false,status:x.status||'ready',type:'Weighted scoring',metric:'Average custom score',value:x.lastAverageScore??'—'}))
      return send(req,res,200,{items:[...builtIn,...custom],runs})
    }
    if (req.method === 'POST' && url.pathname === '/api/models') {
      const body=await readBody(req)
      const name=String(body.name||'').trim()
      if(!name)return send(req,res,400,{error:'name required'})
      const rawWeights=body.weights&&typeof body.weights==='object'?body.weights:{}
      const allowed=['lead_score','journey_depth','pricing_views','whatsapp_engaged','meeting_present']
      const weights={}
      for(const key of allowed){
        const value=Number(rawWeights[key]??0)
        if(Number.isFinite(value))weights[key]=Math.max(-100,Math.min(100,value))
      }
      const totalWeight=Object.values(weights).reduce((n,x)=>n+Math.abs(Number(x||0)),0)
      if(totalWeight<=0)return send(req,res,400,{error:'at least one non-zero feature weight required'})
      const now=new Date().toISOString()
      const item={id:'model_'+randomUUID(),name:name.slice(0,160),version:'workspace-1',description:String(body.description||'Workspace-defined explainable weighted scoring model.').slice(0,500),weights,status:'ready',createdAt:now,updatedAt:now}
      await mutateState(s=>{
        s.customModels=s.customModels||[]
        s.customModels.unshift(item)
        s.customModels=s.customModels.slice(0,100)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'model.created',entityId:item.id,name:item.name,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item})
    }
    if (req.method === 'POST' && url.pathname === '/api/models/run') {
      const body=await readBody(req)
      if(!body.name) return send(req,res,400,{error:'name required'})
      const [profiles,state,stats]=await Promise.all([listLeadProfiles(workspaceId,500),getState(),leadOpsStats(workspaceId).catch(()=>({averageScore:0}))])
      const custom=(state.customModels||[]).find(x=>x.name===String(body.name)||x.id===String(body.id||''))
      const scoreProfile=lead=>{
        if(!custom)return Number(lead.score||0)
        const f={
          lead_score:Math.max(0,Math.min(1,Number(lead.score||0)/100)),
          journey_depth:Math.max(0,Math.min(1,Number(lead.journey?.journeyDepth||0)/10)),
          pricing_views:Math.max(0,Math.min(1,Number(lead.journey?.pricingPageViews||0)/5)),
          whatsapp_engaged:lead.journey?.whatsappEngaged?1:0,
          meeting_present:lead.journey?.meetingStatus?1:0
        }
        const entries=Object.entries(custom.weights||{})
        const denominator=entries.reduce((n,[,w])=>n+Math.abs(Number(w||0)),0)||1
        const weighted=entries.reduce((n,[key,w])=>n+Number(f[key]||0)*Number(w||0),0)
        return Number(Math.max(0,Math.min(100,weighted/denominator*100)).toFixed(1))
      }
      const scores=profiles.map(scoreProfile)
      const average=scores.length?Number((scores.reduce((n,x)=>n+x,0)/scores.length).toFixed(1)):0
      const startedAt=new Date().toISOString()
      const run={id:'modelrun_'+randomUUID(),kind:'model',name:String(body.name),modelId:custom?.id||null,status:profiles.length?'completed':'no_data',rowsScored:profiles.length,averageScore:custom?average:Number(stats?.averageScore||0),scoreMin:scores.length?Math.min(...scores):0,scoreMax:scores.length?Math.max(...scores):0,startedAt,completedAt:new Date().toISOString()}
      await mutateState(s=>{
        s.agentRuns=s.agentRuns||[]
        s.agentRuns.unshift(run)
        s.agentRuns=s.agentRuns.slice(0,500)
        if(custom){
          const model=(s.customModels||[]).find(x=>x.id===custom.id)
          if(model){model.lastRunAt=run.completedAt;model.lastAverageScore=run.averageScore;model.lastRowsScored=run.rowsScored;model.status=profiles.length?'active':'ready';model.updatedAt=run.completedAt}
        }
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'model.run',entityId:run.id,modelId:custom?.id||null,rowsScored:run.rowsScored,status:run.status,at:run.completedAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,202,run)
    }
    if (req.method === 'GET' && url.pathname === '/api/models/validation') {
      const name=String(url.searchParams.get('name')||'')
      const state=await getState()
      const runs=(state.agentRuns||[]).filter(x=>x.kind==='model'&&(!name||x.name===name)).slice(0,20)
      const leadStats=await leadOpsStats(workspaceId).catch(()=>({}))
      return send(req,res,200,{name:name||null,runs,leadPopulation:Number(leadStats?.total||0),averageLeadScore:Number(leadStats?.averageScore||0),generatedAt:new Date().toISOString(),notice:'Validation surface reflects persisted scoring runs and lead population; it is not a substitute for offline statistical validation.'})
    }
    if (req.method === 'GET' && url.pathname === '/api/routing') {
      const recent=await listRoutingDecisions(workspaceId,200)
      const state=await getState()
      const defaults=[
        {id:'rr_1',name:'High-intent education lead',when:'score >= 85',destination:'Senior counsellor pool',slaSeconds:60,status:'active',priority:'Priority',builtIn:true},
        {id:'rr_2',name:'Financing requested',when:'financingInterest = true',destination:'Finance-trained counsellor',slaSeconds:300,status:'active',priority:'Priority',builtIn:true},
        {id:'rr_3',name:'WhatsApp re-engagement',when:'source = whatsapp',destination:'WhatsApp nurture',slaSeconds:180,status:'active',priority:'Automated',builtIn:true},
        {id:'rr_4',name:'Low confidence review',when:'identityConfidence < 0.65',destination:'Manual review',slaSeconds:900,status:'active',priority:'Review',builtIn:true},
        {id:'rr_default',name:'Default routing',when:'fallback',destination:'General admissions queue',slaSeconds:600,status:'active',priority:'Fallback',builtIn:true}
      ]
      const rules=[...defaults,...(state.routingRules||[])]
      const today=new Date();today.setHours(0,0,0,0)
      const routedToday=recent.filter(x=>Date.parse(x.created_at||x.createdAt||0)>=today.getTime())
      const destinations={}
      for(const row of recent){
        const key=String(row.destination||'Unknown')
        destinations[key]=(destinations[key]||0)+1
      }
      return send(req,res,200,{
        rules,
        recent:recent.slice(0,50),
        stats:{
          routedToday:routedToday.length,
          totalDecisions:recent.length,
          destinations:Object.keys(destinations).length,
          matchedRules:new Set(recent.map(x=>x.rule_name).filter(Boolean)).size
        },
        destinationLoad:Object.entries(destinations).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count)
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/routing/rules') {
      const body=await readBody(req)
      if(!body.name||!body.when||!body.destination)return send(req,res,400,{error:'name, when and destination required'})
      const item={id:'rr_'+randomUUID(),name:String(body.name).slice(0,160),when:String(body.when).slice(0,240),destination:String(body.destination).slice(0,160),slaSeconds:Math.max(0,Number(body.slaSeconds||600)),status:'active',priority:String(body.priority||'Custom').slice(0,40),builtIn:false,createdAt:new Date().toISOString()}
      await mutateState(s=>{s.routingRules=s.routingRules||[];s.routingRules.unshift(item);s.routingRules=s.routingRules.slice(0,200);s.audit=s.audit||[];s.audit.unshift({id:randomUUID(),action:'routing.rule_created',entityId:item.id,name:item.name,at:item.createdAt});s.audit=s.audit.slice(0,1000)})
      return send(req,res,201,{item})
    }
    if (req.method === 'POST' && url.pathname === '/api/routing/rules/toggle') {
      const body=await readBody(req)
      if(!body.id||typeof body.enabled!=='boolean')return send(req,res,400,{error:'id and enabled required'})
      let updated=null
      await mutateState(s=>{const item=(s.routingRules||[]).find(x=>x.id===body.id);if(item){item.status=body.enabled?'active':'paused';item.updatedAt=new Date().toISOString();updated={...item}}})
      return updated?send(req,res,200,{item:updated}):send(req,res,404,{error:'custom routing rule not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/routing/test') {
      const body=await readBody(req)
      const state=await getState()
      const custom=(state.routingRules||[]).find(x=>x.id===body.ruleId&&x.status!=='paused')
      const fallback=[
        {id:'rr_1',name:'High-intent education lead',when:'score >= 85',destination:'Senior counsellor pool',slaSeconds:60},
        {id:'rr_2',name:'Financing requested',when:'financingInterest = true',destination:'Finance-trained counsellor',slaSeconds:300},
        {id:'rr_3',name:'WhatsApp re-engagement',when:'source = whatsapp',destination:'WhatsApp nurture',slaSeconds:180},
        {id:'rr_4',name:'Low confidence review',when:'identityConfidence < 0.65',destination:'Manual review',slaSeconds:900},
        {id:'rr_default',name:'Default routing',when:'fallback',destination:'General admissions queue',slaSeconds:600}
      ].find(x=>x.id===body.ruleId)
      const selected=custom||fallback||null
      const decision=await routeLead(workspaceId,{leadRef:body.leadRef||'test_lead',score:body.score??90,source:body.source||'web',financingInterest:body.financingInterest,identityConfidence:body.identityConfidence??0.95,...(selected?{routingRule:{...selected,reason:'manual test of '+selected.when}}:{})})
      return send(req,res,200,{rule:decision.rule_name,matched:true,destination:decision.destination,reason:decision.reason,slaSeconds:decision.sla_seconds,evaluatedAt:decision.created_at})
    }
    if (req.method === 'GET' && url.pathname === '/api/lead-reactivation') {
      const dormantDays=Number(url.searchParams.get('dormantDays')||30)
      const recentDays=Number(url.searchParams.get('recentDays')||7)
      const [profiles,followUps]=await Promise.all([listLeadProfiles(workspaceId,500),listPersistedFollowUps(workspaceId)])
      const candidates=leadReactivationCandidates(profiles,trackedEvents,followUps,{dormantDays,recentDays})
      return send(req,res,200,{items:candidates,stats:{candidates:candidates.length,dormantDays,recentDays},generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/lead-reactivation/run') {
      const body=await readBody(req)
      const leadRef=String(body.leadRef||'').trim()
      if(!leadRef)return send(req,res,400,{error:'leadRef required'})
      const dormantDays=Number(body.dormantDays||30)
      const recentDays=Number(body.recentDays||7)
      const [profiles,followUps]=await Promise.all([listLeadProfiles(workspaceId,500),listPersistedFollowUps(workspaceId)])
      const candidates=leadReactivationCandidates(profiles,trackedEvents,followUps,{dormantDays,recentDays})
      const candidate=candidates.find(x=>x.leadRef===leadRef||x.name===leadRef)
      if(!candidate)return send(req,res,409,{error:'lead is not currently eligible for reactivation'})
      const item=await createFollowUp(workspaceId,{
        leadRef:candidate.leadRef,
        reason:candidate.reason+' · '+candidate.renewedEvent,
        channel:String(body.channel||'WhatsApp'),
        priority:String(body.priority||'high'),
        delayMinutes:Number(body.delayMinutes??5),
        owner:String(body.owner||'Reactivation queue')
      })
      const now=new Date().toISOString()
      await mutateState(s=>{
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'lead_reactivation.followup_created',entityId:item?.id||null,leadRef:candidate.leadRef,renewedEvent:candidate.renewedEvent,renewedAt:candidate.renewedAt,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item,candidate})
    }
    if (req.method === 'GET' && url.pathname === '/api/follow-ups') {
      const items=await listPersistedFollowUps(workspaceId)
      const now=Date.now()
      const start=new Date();start.setHours(0,0,0,0)
      const open=items.filter(x=>x.status==='open')
      const completed=items.filter(x=>x.status==='completed')
      const completedToday=completed.filter(x=>Date.parse(x.completed_at||0)>=start.getTime()).length
      const overdue=open.filter(x=>x.due_at&&Date.parse(x.due_at)<now).length
      return send(req,res,200,{items,stats:{open:open.length,completedToday,completedTotal:completed.length,overdue}})
    }
    if (req.method === 'POST' && url.pathname === '/api/follow-ups') {
      const body=await readBody(req)
      const item=await createFollowUp(workspaceId,body)
      return send(req,res,201,item)
    }
    if (req.method === 'POST' && url.pathname === '/api/follow-ups/complete') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      const updated=await persistCompleteFollowUp(workspaceId,String(body.id))
      return updated?send(req,res,200,updated):send(req,res,404,{error:'follow-up not found'})
    }
    if (req.method === 'GET' && url.pathname === '/api/qualification-calls') {
      const runs=(await listAgentRuns(workspaceId,100)).filter(x=>x.agent_type==='voice_qualification')
      return send(req,res,200,{items:runs.map(x=>({id:x.id,lead:x.input?.lead||x.entity_id||'Lead',source:x.input?.source||'Unknown',agent:'Voice Lead Qualification',status:x.status,duration:x.output?.duration||'—',intent:x.output?.intent??x.input?.intent??0,next:x.output?.next||'Awaiting execution',attempts:x.attempts,externalId:x.external_id,lastError:x.last_error,createdAt:x.created_at}))})
    }
    if (req.method === 'POST' && url.pathname === '/api/qualification-calls/retry') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      const run=await createAgentRun(workspaceId,{agentType:'voice_qualification',entityId:String(body.id),triggerKey:'manual_retry',input:{lead:body.lead||'Lead',source:body.source||'workspace',intent:body.intent||0}})
      const job=await enqueueJob({workspaceId,kind:'agent_action',idempotencyKey:'agent:'+run.id,payload:{agentRunId:run.id,actionType:'voice_qualification',payload:{lead:body.lead||'Lead',source:body.source||'workspace',intent:body.intent||0,runId:run.id}}})
      return send(req,res,202,{id:run.id,status:'queued',jobId:job?.id||null})
    }
    if (req.method === 'POST' && url.pathname === '/api/qualification-calls') {
      const body=await readBody(req)
      if(!body.lead) return send(req,res,400,{error:'lead required'})
      const run=await createAgentRun(workspaceId,{agentType:'voice_qualification',entityId:String(body.leadRef||body.lead),triggerKey:String(body.trigger||'lead_created'),input:body})
      const job=await enqueueJob({workspaceId,kind:'agent_action',idempotencyKey:'agent:'+run.id,payload:{agentRunId:run.id,actionType:'voice_qualification',payload:{...body,runId:run.id}}})
      return send(req,res,202,{id:run.id,status:'queued',jobId:job?.id||null})
    }
    if (req.method === 'GET' && url.pathname === '/api/meetings') return send(req,res,200,{items:await listPersistedMeetings(workspaceId)})
    if (req.method === 'POST' && url.pathname === '/api/meetings') {
      const body=await readBody(req)
      if(!body.leadRef&&!body.lead) return send(req,res,400,{error:'leadRef or lead required'})
      if(!body.startsAt) return send(req,res,400,{error:'startsAt required'})
      try{
        let calendar=null
        if(body.syncCalendar!==false){
          calendar=await createCalendarEvent(workspaceId,{
            ...body,
            title:body.title||('Consultation · '+String(body.leadRef||body.lead)),
            attendees:body.attendees||[]
          })
        }
        const item=await createMeeting(workspaceId,{
          ...body,
          externalCalendarId:calendar?.externalId||body.externalCalendarId||'',
          meetingLink:calendar?.meetingLink||body.meetingLink||'',
          calendarHtmlLink:calendar?.htmlLink||body.calendarHtmlLink||''
        })
        return send(req,res,201,{...item,calendar})
      }catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'meeting creation failed'})}
    }
    if (req.method === 'POST' && url.pathname === '/api/meetings/reschedule') {
      const body=await readBody(req)
      if(!body.id||!body.startsAt) return send(req,res,400,{error:'id and startsAt required'})
      const current=await getMeeting(workspaceId,String(body.id))
      if(!current) return send(req,res,404,{error:'meeting not found'})
      try{
        let calendar=null
        if(current.external_calendar_id){
          calendar=await updateCalendarEvent(workspaceId,current.external_calendar_id,{...body,startsAt:body.startsAt})
        }else if(body.syncCalendar!==false){
          calendar=await createCalendarEvent(workspaceId,{...body,leadRef:current.lead_ref,startsAt:body.startsAt,title:'Consultation · '+current.lead_ref})
        }
        const item=await rescheduleMeeting(workspaceId,String(body.id),{
          startsAt:body.startsAt,
          externalCalendarId:calendar?.externalId||null,
          meetingLink:calendar?.meetingLink||null,
          calendarHtmlLink:calendar?.htmlLink||null
        })
        return send(req,res,200,{...item,calendar})
      }catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'meeting reschedule failed'})}
    }
    if (req.method === 'POST' && url.pathname === '/api/meetings/remind') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      const meeting=await getMeeting(workspaceId,String(body.id))
      if(!meeting) return send(req,res,404,{error:'meeting not found'})
      if(!meeting.attendee_phone&&!meeting.attendee_email) return send(req,res,400,{error:'meeting has no attendee contact; add attendeePhone or attendeeEmail when scheduling'})
      const reminderPayload={
        meetingId:meeting.id,
        leadRef:meeting.lead_ref,
        startsAt:meeting.starts_at,
        owner:meeting.owner,
        attendeePhone:meeting.attendee_phone||null,
        attendeeEmail:meeting.attendee_email||null,
        meetingLink:meeting.meeting_link||null,
        calendarHtmlLink:meeting.calendar_html_link||null
      }
      const run=await createAgentRun(workspaceId,{agentType:'meeting_reminder',entityId:String(body.id),triggerKey:'manual_reminder',input:reminderPayload})
      const job=await enqueueJob({workspaceId,kind:'agent_action',idempotencyKey:'agent:'+run.id,payload:{agentRunId:run.id,actionType:'meeting_reminder',payload:{...reminderPayload,runId:run.id}}})
      return send(req,res,202,{id:body.id,runId:run.id,status:'queued',jobId:job?.id||null})
    }
    if (req.method === 'GET' && url.pathname === '/api/feedback') {
      const result=await listPersistedFeedback(workspaceId)
      const items=result.items||[]
      const themes={}
      for(const item of items){
        const key=String(item.theme||'Uncategorized')
        themes[key]=(themes[key]||0)+1
      }
      const low=items.filter(x=>x.score!=null&&Number(x.score)<=2).length
      return send(req,res,200,{
        ...result,
        stats:{responses:items.length,average:result.average,lowSatisfaction:low,themes:Object.keys(themes).length},
        themes:Object.entries(themes).map(([theme,count])=>({theme,count})).sort((a,b)=>b.count-a.count)
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/feedback') {
      const body=await readBody(req)
      if(!body.lead) return send(req,res,400,{error:'lead required'})
      const item=await recordFeedback(workspaceId,body)
      return send(req,res,201,item)
    }
    if (req.method === 'POST' && url.pathname === '/api/feedback/request') {
      const body=await readBody(req)
      if(!body.lead) return send(req,res,400,{error:'lead required'})
      const run=await createAgentRun(workspaceId,{agentType:'feedback',entityId:String(body.leadRef||body.lead),triggerKey:'manual_feedback',input:body})
      const job=await enqueueJob({workspaceId,kind:'agent_action',idempotencyKey:'agent:'+run.id,payload:{agentRunId:run.id,actionType:'feedback',payload:{...body,runId:run.id}}})
      return send(req,res,202,{runId:run.id,status:'queued',jobId:job?.id||null})
    }
    if (req.method === 'POST' && url.pathname === '/api/feedback/route') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'feedback id required'})
      const result=await listPersistedFeedback(workspaceId)
      const item=(result.items||[]).find(x=>x.id===String(body.id))
      if(!item) return send(req,res,404,{error:'feedback not found'})
      const score=Number(item.score||0)
      const theme=String(item.theme||'Uncategorized')
      let priority='medium'
      let owner='Customer success'
      let reason='Review customer feedback · '+theme
      let channel='review'
      let delayMinutes=60
      if(score>0&&score<=2){
        priority='high';owner='Customer recovery';reason='Low-satisfaction recovery · '+theme;channel='call';delayMinutes=15
      }else if(/pricing|fee|cost|budget/i.test(theme)){
        priority='high';owner='Sales manager';reason='Pricing objection follow-up · '+theme;channel='call';delayMinutes=30
      }else if(/mismatch|program|product|fit/i.test(theme)){
        priority='medium';owner='Sales operations';reason='Disposition review · '+theme;channel='review';delayMinutes=60
      }else if(score>=4){
        priority='low';owner='Marketing';reason='Promoter / testimonial review · '+theme;channel='email';delayMinutes=240
      }
      const task=await createFollowUp(workspaceId,{leadRef:item.lead_ref,reason,channel,priority,delayMinutes,owner})
      const now=new Date().toISOString()
      await mutateState(s=>{
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'feedback.routed',entityId:item.id,leadRef:item.lead_ref,theme,score,followUpId:task?.id||null,owner,priority,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,202,{feedbackId:item.id,lead:item.lead_ref,theme,score,status:'routed',nextTab:'Follow-ups',task:task?{id:task.id,status:task.status,owner:task.owner,priority:task.priority,channel:task.channel,dueAt:task.due_at,reason:task.reason}:null})
    }
    if (req.method === 'GET' && url.pathname === '/api/agent-runs') return send(req,res,200,{items:await listAgentRuns(workspaceId,200)})
    if (req.method === 'GET' && url.pathname === '/api/approvals') {
      const state=await getState()
      return send(req,res,200,{items:state.approvals||[]})
    }
    if (req.method === 'POST' && url.pathname === '/api/approvals/decision') {
      const body=await readBody(req)
      if(!body.id || !['approved','rejected'].includes(body.decision)) return send(req,res,400,{error:'id and approved|rejected decision required'})
      let updated=null
      await mutateState(s=>{
        s.approvals=s.approvals||[]
        const item=s.approvals.find(x=>x.id===body.id)
        if(item){
          item.status=body.decision
          item.decidedAt=new Date().toISOString()
          updated={...item}
          if(item.agentId){
            const agent=(s.customAgents||[]).find(x=>x.id===item.agentId)
            if(agent) agent.status=body.decision==='approved'?'active':'rejected'
          }
        }
        s.audit.unshift({id:randomUUID(),action:'approval.'+body.decision,entityId:String(body.id),at:new Date().toISOString()})
      })
      return updated?send(req,res,200,updated):send(req,res,404,{error:'approval not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/agents/custom') {
      const body=await readBody(req)
      if(!body.name || !body.trigger || !body.action) return send(req,res,400,{error:'name, trigger and action required'})
      const createdAt=new Date().toISOString()
      const requiresApproval=body.requiresApproval!==false
      const agent={id:'agent_'+randomUUID(),name:String(body.name),trigger:String(body.trigger),action:String(body.action),description:String(body.description||''),status:requiresApproval?'pending_approval':'active',type:'custom',createdAt}
      await mutateState(s=>{
        s.customAgents=s.customAgents||[]
        s.customAgents.unshift(agent)
        if(requiresApproval){
          s.approvals=s.approvals||[]
          s.approvals.unshift({id:'ap_'+randomUUID(),kind:'custom_agent_activation',title:'Activate custom agent: '+agent.name,status:'pending',risk:String(body.risk||'medium'),agentId:agent.id,createdAt})
        }
        s.audit.unshift({id:randomUUID(),action:'agent.custom_created',entityId:agent.id,at:createdAt})
      })
      return send(req,res,201,agent)
    }
    if (req.method === 'POST' && url.pathname === '/api/agents/custom/test') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      const state=await getState()
      const agent=(state.customAgents||[]).find(x=>x.id===String(body.id))
      if(!agent) return send(req,res,404,{error:'custom agent not found'})
      if(agent.status==='pending_approval') return send(req,res,409,{error:'custom agent requires approval before testing',status:agent.status,agentId:agent.id})
      if(agent.status==='rejected') return send(req,res,409,{error:'custom agent activation was rejected',status:agent.status,agentId:agent.id})
      if(agent.status!=='active') return send(req,res,409,{error:'custom agent is not active',status:agent.status,agentId:agent.id})
      const entityId=String(body.leadRef||body.entityId||'agent_test')
      const input={
        test:true,
        leadRef:body.leadRef||null,
        trigger:agent.trigger,
        action:agent.action,
        context:body.context&&typeof body.context==='object'?body.context:{}
      }
      const run=await createAgentRun(workspaceId,{agentType:'custom:'+agent.id,entityId,triggerKey:'manual_test',input})
      if(!run) return send(req,res,503,{error:'agent run store unavailable'})
      let operation=null
      if(agent.action==='Route to sales queue'){
        operation=await routeLead(workspaceId,{
          leadRef:entityId,
          score:Number(body.context?.score||85),
          source:String(body.context?.source||'Custom agent'),
          routingRule:{name:agent.name,destination:String(body.context?.destination||'Sales queue'),reason:'Custom agent test: '+agent.trigger,slaSeconds:Number(body.context?.slaSeconds||300)}
        })
      }
      const output={
        test:true,
        evaluated:true,
        trigger:agent.trigger,
        action:agent.action,
        operation:operation?{kind:'routing',id:operation.id,destination:operation.destination,status:operation.status}:null,
        note:operation?'Safe routing action executed and persisted.':'Definition validated. External mutation requires the destination-specific operational workflow and configured integration.'
      }
      const completed=await updateAgentRun(workspaceId,run.id,{status:'succeeded',output})
      await mutateState(s=>{
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'agent.custom_tested',entityId:agent.id,runId:run.id,operationId:operation?.id||null,at:new Date().toISOString()})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,{run:completed||run,output})
    }
    if (req.method === 'GET' && url.pathname === '/api/settings') {
      const state=await getState()
      return send(req,res,200,state.workspaceSettings||{})
    }
    if (req.method === 'POST' && url.pathname === '/api/settings') {
      const body=await readBody(req)
      const allowed=['organization','timezone','currency','reportingWeek','defaultAttribution','environment','primaryDomain','crossDomainTracking','gclidPersistenceDays','fbclidPersistenceDays','notifyDeliveryFailures','notifyTokenExpiry','notifyAudienceStale','notifyDailySummary','notificationEmail','notificationSlack','approvalSignalReturn','approvalCrmEnrichment','approvalLeadQualification','approvalAudienceSuppression','approvalCustomIntegration']
      const patch={}
      for(const key of allowed) if(body[key]!==undefined) patch[key]=body[key]
      if(!Object.keys(patch).length) return send(req,res,400,{error:'no supported settings provided'})
      const now=new Date().toISOString()
      let saved={}
      await mutateState(s=>{
        s.workspaceSettings={...(s.workspaceSettings||{}),...patch,updatedAt:now}
        saved={...s.workspaceSettings}
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'workspace.settings_updated',entityId:workspaceId,fields:Object.keys(patch),at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,saved)
    }
    if (req.method === 'GET' && url.pathname === '/api/workspaces') {
      const state=await getState()
      return send(req,res,200,{items:state.workspaces||[]})
    }
    if (req.method === 'POST' && url.pathname === '/api/workspaces') {
      const body=await readBody(req)
      const name=String(body.name||'').trim()
      if(name.length<2) return send(req,res,400,{error:'workspace name required'})
      const now=new Date().toISOString()
      let item=null
      await mutateState(s=>{
        s.workspaces=s.workspaces||[]
        if(s.workspaces.some(x=>String(x.name).toLowerCase()===name.toLowerCase())) return
        item={id:'ws_'+randomUUID().replaceAll('-','').slice(0,12),name,environment:String(body.environment||'Production'),initials:String(body.initials||name.split(/\s+/).map(x=>x[0]).join('').slice(0,3)).toUpperCase(),createdAt:now}
        s.workspaces.push(item)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'workspace.created',entityId:item.id,name:item.name,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return item?send(req,res,201,item):send(req,res,409,{error:'workspace name already exists'})
    }
    if (req.method === 'GET' && url.pathname === '/api/audit-log') {
      const state=await getState()
      return send(req,res,200,{items:(state.audit||[]).slice(0,250)})
    }
    if (req.method === 'POST' && url.pathname === '/api/api-keys') {
      const body=await readBody(req)
      const label=String(body.name||'workspace')
      const secret='ace_'+randomBytes(24).toString('base64url')
      const fingerprint=createHash('sha256').update(secret).digest('hex')
      const createdAt=new Date().toISOString()
      const record={id:'key_'+randomUUID(),name:label,prefix:secret.slice(0,12),fingerprint,status:'active',createdAt}
      await mutateState(s=>{
        s.apiKeys=s.apiKeys||[]
        s.apiKeys.unshift(record)
        s.audit.unshift({id:randomUUID(),action:'api_key.created',entityId:record.id,at:createdAt})
      })
      return send(req,res,201,{id:record.id,name:record.name,prefix:record.prefix,key:secret,createdAt,notice:'Store this key now; only its SHA-256 fingerprint is persisted.'})
    }
    return send(req,res,404,{error:'not found'})
  } catch (error) {
    return send(req,res,500,{error:error instanceof Error?error.message:'internal error'})
  }
  })
})

server.keepAliveTimeout=65_000
server.headersTimeout=66_000
server.requestTimeout=30_000
server.listen(PORT,()=>console.log(`AceMarketing API listening on http://localhost:${PORT}`))
const shutdown=signal=>{console.log(`${signal} received; shutting down`);server.close(async err=>{await Promise.allSettled([closeStore(),closeAttributionStore(),closeLeadOps(),closeAgentOrchestrator(),closeCustomIntegrations(),closeObservability(),closeEntitlements(),closeBillingProvider(),closeConsentStore(),closePrivacyOps(),closeAudienceScheduler(),closeCohortAnalytics(),closeEventRules()]);process.exit(err?1:0)});setTimeout(()=>process.exit(1),10_000).unref()}
process.on('SIGTERM',()=>shutdown('SIGTERM'))
process.on('SIGINT',()=>shutdown('SIGINT'))
