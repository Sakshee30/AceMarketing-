import http from 'node:http'
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { URL } from 'node:url'
import { createToken, verifyToken, verifyPassword, hashPassword, hasPermission, createRateLimiter, securityHeaders, resolveCorsOrigin } from './security.mjs'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from './store.mjs'
import { connectorVaultReady, encryptSecret } from './vault.mjs'
import { enqueueJob, queueAvailable, queueStats } from './queue.mjs'
import { attributionStats, captureClickSession, closeAttributionStore, recordAssistedEvent, reconcileAttribution } from './attribution-store.mjs'
import { audienceOpsStats, closeLeadOps, createActivationRun, createAudience as createLeadAudience, getAudienceBundle, getLeadProfile, leadOpsStats, listActivationRuns, listAudiences as listLeadAudiences, listLeadProfiles, materializeAudience, overrideLeadGrade as persistLeadGrade, previewAudience as previewLeadAudience, scoreLead, upsertLeadProfile, updateAudienceSyncState } from './lead-ops.mjs'
import { closeAgentOrchestrator, completeFollowUp as persistCompleteFollowUp, createAgentRun, createFollowUp, createMeeting, getMeeting, listAgentRuns, listFeedback as listPersistedFeedback, listFollowUps as listPersistedFollowUps, listMeetings as listPersistedMeetings, listRoutingDecisions, recordFeedback, rescheduleMeeting, routeLead } from './agent-orchestrator.mjs'
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

const integrations = ['Google Ads','Meta Ads','LinkedIn Ads','Microsoft Ads','GA4','Google Calendar','Zoho CRM','Salesforce','HubSpot','LeadSquared','HighLevel','WhatsApp','WATI','Gupshup','MoEngage','CleverTap','Exotel','Knowlarity','Tata Tele','MyOperator','Shopify','WooCommerce','Magento','WordPress','Custom Backend']
const agents = ['Meta Advanced CAPI','Google ECL / OCI','Call Tracking Events','Custom Integration','Lead Grading','CRM Enrichment','Voice Lead Qualification','Voice Scheduler','Meeting Reminder','Feedback Agent','Ask Ace']
const trackedEvents = []

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
            attributes:{callEventId:event.id,provider:event.provider,direction:event.direction,to:event.to}
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
            data:{provider:event.provider,status:event.status,durationSeconds:event.durationSeconds,campaign:event.campaign}
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
      const [leadStats,attr,audienceStats,queue,monitoring,eventRules,agentRuns,meetings,followUps]=await Promise.all([
        safe(()=>leadOpsStats(workspaceId),{available:false,total:0,aGrade:0,abQuality:0}),
        safe(()=>attributionStats(workspaceId),{available:false,matchedEvents:0,unmatchedEvents:0,assistedEvents:0,activeClickSessions:0}),
        safe(()=>audienceOpsStats(workspaceId),{available:false,audiences:{total:0,active:0,activatedIdentities:0,suppressedIdentities:0,errors:0},profiles:{total:0}}),
        safe(()=>queueStats(workspaceId),{backend:'disabled',pending:0,leased:0,retry:0,succeeded:0,deadLetter:0}),
        safe(()=>monitoringSnapshot(workspaceId),{}),
        safe(()=>listEventRules(workspaceId),[]),
        safe(()=>listAgentRuns(workspaceId),[]),
        safe(()=>listPersistedMeetings(workspaceId),[]),
        safe(()=>listPersistedFollowUps(workspaceId),[])
      ])
      const connectors=state.connectorConnections||[]
      const connectedConnectors=connectors.filter(x=>['connected','healthy','active'].includes(String(x.status||'').toLowerCase()))
      const deliveries=state.signalDeliveries||[]
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
        {key:'activation',title:'Activation',tab:'Audiences',ready:Number(audienceStats?.audiences?.total||0)>0||deliveries.length>0,primary:Number(audienceStats?.audiences?.total||0),detail:Number(audienceStats?.audiences?.total||0)+' audiences · '+deliveries.length+' deliveries'},
        {key:'operations',title:'Operations',tab:'Monitoring',ready:connectedConnectors.length>0,primary:connectedConnectors.length,detail:connectedConnectors.length+' connected · '+failedDeliveries+' failed deliveries'}
      ]
      const readiness=Math.round(areas.filter(x=>x.ready).length/areas.length*100)
      const recent=[
        ...trackedEvents.slice(-8).map(x=>({id:x.id||randomUUID(),kind:'event',title:x.event||x.eventType||x.name||'Tracked event',meta:x.source||x.channel||'First-party',time:x.receivedAt||x.occurredAt||x.timestamp||null,tab:'Live Sync'})),
        ...deliveries.slice(0,8).map(x=>({id:'delivery:'+x.id,kind:'delivery',title:(x.event||'Signal')+' → '+(x.destination||'destination'),meta:x.status||'queued',time:x.updatedAt||x.createdAt||null,tab:'Delivery'})),
        ...agentRuns.slice(0,5).map(x=>({id:'agent:'+x.id,kind:'agent',title:x.agent_type||x.agentType||x.action_type||'Agent run',meta:x.status||'queued',time:x.created_at||x.createdAt||null,tab:'Agents'}))
      ].filter(x=>x.time).sort((a,b)=>Date.parse(b.time)-Date.parse(a.time)).slice(0,12)
      return send(req,res,200,{
        generatedAt:new Date().toISOString(),
        readiness,
        areas,
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
      if(challenges.includes('Conversion leakage')) names.push('Lead Grading','CRM Enrichment','Voice Lead Qualification','Voice Scheduler','Meeting Reminder','Feedback Agent')
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
    if (req.method === 'GET' && url.pathname === '/api/workspace/overview') return send(req,res,200,{revenueAttributed:28400000,qualifiedLeads:7621,signalCoverage:94.8,activeAgents:7})
    if (req.method === 'GET' && url.pathname === '/api/integrations') {
      const state=await getState()
      const tokenHealth=await connectorTokenHealth(workspaceId).catch(()=>[])
      const connections=state.connectorConnections||[]
      return send(req,res,200,{items:integrations.map(name=>{
        const saved=connections.find(x=>x.connector===name)
        const provider=CONNECTOR_PROVIDERS[name]
        return {
          name,
          status:saved?.status||(provider?'available':'manual'),
          provider:provider?.provider||'custom',
          authType:provider?.authType||'manual',
          configured:Boolean(provider?.clientId&&provider?.clientSecret&&CONNECTOR_REDIRECT_URI),
          updatedAt:saved?.updatedAt||null
        }
      })})
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
      const [attribution,leadStats,leads,activationRuns,audiences,monitoring,state]=await Promise.all([
        attributionStats(workspaceId).catch(()=>({available:false})),
        leadOpsStats(workspaceId).catch(()=>({available:false})),
        listLeadProfiles(workspaceId,500).catch(()=>[]),
        listActivationRuns(workspaceId,200).catch(()=>[]),
        listLeadAudiences(workspaceId).catch(()=>[]),
        monitoringSnapshot(workspaceId).catch(()=>({})),
        getState().catch(()=>({}))
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
      let intent='workspace_summary'
      let answer=''
      let insights=[]
      let confidence='medium'
      let followUps=[]
      if(q.includes('campaign')||q.includes('revenue')||q.includes('roas')||q.includes('channel')){
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
        {name:'Pricing-page Lead',sourceEvent:'form_submitted',condition:{field:'properties.pricingPageViews',operator:'gte',value:1},outputEvent:'pricing_page_lead'},
        {name:'High-value Purchase',sourceEvent:'purchase',condition:{field:'value',operator:'gte',value:4000},outputEvent:'high_value_purchase'},
        {name:'Prepaid Order',sourceEvent:'purchase',condition:{field:'properties.paymentType',operator:'equals',value:'prepaid'},outputEvent:'prepaid_order'},
        {name:'Fulfilled Order',sourceEvent:'order_status',condition:{field:'properties.status',operator:'equals',value:'fulfilled'},outputEvent:'fulfilled_order'},
        {name:'Returned Order',sourceEvent:'order_status',condition:{field:'properties.status',operator:'equals',value:'returned'},outputEvent:'returned_order'}
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
      let state=await getState()
      if(!(state.adjustments||[]).length){
        const now=new Date().toISOString()
        await mutateState(s=>{
          s.adjustments=[
            {id:'adj_501',event:'partial_payment',source:'crm_billing',destination:'google_ads',fromValue:15000,toValue:84000,currency:'INR',reason:'Final payment received',status:'pending',createdAt:now},
            {id:'adj_500',event:'returned_order',source:'commerce_backend',destination:'google_ads',fromValue:7200,toValue:0,currency:'INR',reason:'Order returned / revenue reversed',status:'pending',createdAt:now},
            {id:'adj_499',event:'low_quality_lead',source:'crm',destination:'google_ads',fromValue:'lead',toValue:'excluded',reason:'Lead disposition = junk / invalid',status:'applied',createdAt:now},
            {id:'adj_498',event:'duplicate_lead',source:'crm',destination:'meta_ads',fromValue:'lead',toValue:'deduplicated',reason:'Existing customer identity match',status:'applied',createdAt:now}
          ]
        })
        state=await getState()
      }
      return send(req,res,200,{items:(state.adjustments||[]).slice(0,500)})
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
      const [profiles,meetings]=await Promise.all([listLeadProfiles(workspaceId,500),listPersistedMeetings(workspaceId)])
      const qualifiedStages=new Set(['qualified','consultation','opportunity','converted','enrolled','closed_won','customer'])
      const consultationStages=new Set(['consultation','opportunity','converted','enrolled','closed_won','customer'])
      const bookingStages=new Set(['converted','enrolled','closed_won','customer'])
      const leadKey=lead=>String(lead.external_lead_id||lead.name||lead.id)
      const profileByLead=new Map()
      for(const lead of profiles){
        profileByLead.set(leadKey(lead),lead)
        if(lead.name)profileByLead.set(String(lead.name),lead)
      }
      const campaigns=new Map()
      const ensure=lead=>{
        const name=String(lead.campaign||lead.source||'Unattributed')
        const row=campaigns.get(name)||{name,channel:String(lead.source||'First-party'),leads:0,qualified:0,appointments:0,consultations:0,bookings:0}
        campaigns.set(name,row)
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
      const stages={
        leads:profiles.length,
        qualified:profiles.filter(lead=>['A','B'].includes(String(lead.grade))||qualifiedStages.has(String(lead.crm_stage||'').toLowerCase())).length,
        appointments:meetings.length,
        consultations:profiles.filter(lead=>consultationStages.has(String(lead.crm_stage||'').toLowerCase())).length,
        bookings:profiles.filter(lead=>bookingStages.has(String(lead.crm_stage||'').toLowerCase())).length
      }
      return send(req,res,200,{available:true,stages,campaigns:[...campaigns.values()].sort((a,b)=>b.leads-a.leads),generatedAt:new Date().toISOString()})
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
      const live=await attributionStats(workspaceId)
      return send(req,res,200,{live,rules:[
        {name:'closed_won_mba_search',source:'crm_billing',destination:'google_ads',matchedRevenue:8400000,closedOutcomes:982,matchRate:96.8},
        {name:'enrolment_executive_program',source:'crm_billing',destination:'meta_ads',matchedRevenue:5160000,closedOutcomes:611,matchRate:95.9},
        {name:'consultation_sale_whatsapp',source:'crm_whatsapp',destination:'meta_google',matchedRevenue:2840000,closedOutcomes:314,matchRate:92.7},
        {name:'store_sale_offline',source:'pos_crm',destination:'google_meta',matchedRevenue:1980000,closedOutcomes:227,matchRate:94.1}
      ],unmatched:live.available?live.unmatchedEvents:4})
    }
    if (req.method === 'GET' && url.pathname === '/api/matchback/unmatched') {
      const live=await attributionStats(workspaceId)
      return send(req,res,200,{items:(live?.recent||[]).filter(x=>x.status==='unmatched'),total:Number(live?.unmatchedEvents||0)})
    }
    if (req.method === 'POST' && url.pathname === '/api/matchback/reconcile') {
      const body=await readBody(req)
      if(!body.rule) return send(req,res,400,{error:'rule required'})
      const result=await reconcileAttribution(workspaceId,body.limit||250)
      return send(req,res,200,{rule:body.rule,status:'reconciled',...result,auditId:randomUUID(),completedAt:new Date().toISOString()})
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
      const records=Number(body.records)
      if(!body.location || !Number.isFinite(records) || records<=0) return send(req,res,400,{error:'location and positive records required'})
      const matched=Math.max(0,Math.min(records,Number(body.matched??0)))
      const batch={batchId:'pos_'+randomUUID(),location:String(body.location),locationName:String(body.locationName||body.location),records,revenue:Number(body.revenue||0),matched,status:'processed',createdAt:new Date().toISOString()}
      await mutateState(s=>{s.posBatches=s.posBatches||[];s.posBatches.unshift(batch);s.posBatches=s.posBatches.slice(0,2000);s.audit=s.audit||[];s.audit.unshift({id:randomUUID(),action:'pos.import_processed',entityId:batch.batchId,location:batch.location,records,at:batch.createdAt});s.audit=s.audit.slice(0,1000)})
      if(body.customerId||body.email||body.phone||body.gclid||body.fbclid){
        await recordAssistedEvent(workspaceId,{event:'pos.batch_imported',eventType:'pos.batch_imported',eventId:batch.batchId,customerId:body.customerId||null,email:body.email||null,phone:body.phone||null,gclid:body.gclid||null,fbclid:body.fbclid||null,source:'pos',occurredAt:batch.createdAt,value:Number(body.revenue||0),currency:body.currency||'INR',data:{location:batch.location,records}}).catch(()=>null)
      }
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
        rules:[
          {conversion:'Inbound Call',source:'Telephony',match:'first-party identity + session/click reconciliation',destination:['Google Ads','Meta Ads']},
          {conversion:'WhatsApp Enquiry',source:'WhatsApp',match:'persisted click/customer identity + phone',destination:['Google Ads','Meta Ads']},
          {conversion:'Partial Payment',source:'Custom Backend',match:'customer_id + order',destination:['Google Ads']}
        ]
      })
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
      const stats=await attributionStats(workspaceId)
      return send(req,res,200,stats)
    }
    if (req.method === 'GET' && url.pathname === '/api/journeys') {
      const profiles=await listLeadProfiles(workspaceId,500)
      const humanDuration=(from,to)=>{
        const ms=Math.max(0,Date.parse(to||'')-Date.parse(from||''))
        if(!Number.isFinite(ms)||ms<=0)return '—'
        const minutes=Math.round(ms/60000)
        if(minutes<60)return minutes+'m'
        const hours=Math.round(minutes/60)
        if(hours<48)return hours+'h'
        return Math.round(hours/24)+'d'
      }
      const items=profiles.map(lead=>{
        const journey=lead.journey||{}
        const touchpoints=Math.max(0,Number(journey.journeyDepth||0))+Number(journey.pricingPageViews||0)+(journey.whatsappEngaged?1:0)+(journey.callOutcome?1:0)+(journey.meetingStatus?1:0)
        return {
          id:lead.id,
          lead:lead.name||lead.external_lead_id,
          externalLeadId:lead.external_lead_id,
          source:lead.source||'First-party',
          campaign:lead.campaign||null,
          stage:lead.crm_stage||lead.grade||'Lead',
          grade:lead.grade,
          score:lead.score,
          touchpoints,
          duration:humanDuration(lead.created_at,journey.lastActivity||lead.updated_at),
          lastActivity:journey.lastActivity||lead.updated_at,
          devicePlatform:lead.device_platform||null
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
      const [state,profiles,runs,customIntegrations]=await Promise.all([getState(),listLeadProfiles(workspaceId,1),listAgentRuns(workspaceId),listCustomIntegrations(workspaceId)])
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
        else if(name==='Ask Ace')status='available'
        return {id:'builtin_'+i,name,status,type:'built_in'}
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
      const mode=lead.grade==='D'?'Suppress':lead.grade==='C'?'Retarget':'Activate'
      return send(req,res,202,{lead:lead.name||lead.external_lead_id,grade:lead.grade,status:'ready_for_activation',mode,destinations:['crm','routing','ad_signals'],queuedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/behavior') {
      const counts=new Map()
      let known=0,highIntent=0
      for(const event of trackedEvents){
        const name=String(event.event||event.eventType||event.name||'event')
        counts.set(name,(counts.get(name)||0)+1)
        if(event.customerId||event.email||event.phone||event.emailSha256||event.phoneSha256)known++
        if(/pricing|checkout|book|consult|apply|purchase|revenue/i.test(name))highIntent++
      }
      const events=[...counts.entries()].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count)
      return send(req,res,200,{events,stats:{events:trackedEvents.length,knownIdentities:known,knownIdentityRate:trackedEvents.length?Number((known/trackedEvents.length*100).toFixed(1)):0,highIntentEvents:highIntent},recent:trackedEvents.slice(-50).reverse(),generatedAt:new Date().toISOString()})
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
      return send(req,res,200,{attributes:[...attrs.values()],stats:{activeAttributes:attrs.size,profiles:profiles.length,deliveries:deliveries.length,quarantined:Number((state.quarantinedEvents||[]).length)},destinations})
    }
    if (req.method === 'POST' && url.pathname === '/api/feed/attributes') {
      const body=await readBody(req)
      const key=String(body.key||'').trim()
      if(!/^[A-Za-z][A-Za-z0-9_]{1,63}$/.test(key))return send(req,res,400,{error:'attribute key must be 2-64 alphanumeric/underscore characters'})
      const item={key,source:String(body.source||'custom'),sample:body.sample==null?null:String(body.sample).slice(0,120),status:'mapped',createdAt:new Date().toISOString()}
      await mutateState(s=>{s.customFeedAttributes=s.customFeedAttributes||[];const i=s.customFeedAttributes.findIndex(x=>x.key===key);if(i>=0)s.customFeedAttributes[i]=item;else s.customFeedAttributes.unshift(item);s.customFeedAttributes=s.customFeedAttributes.slice(0,500)})
      return send(req,res,201,item)
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
      return send(req,res,200,{items:[
        {name:'Lead quality scoring',version:'v2.0',status:Number(stats?.total||0)>0?'active':'ready',type:'Scoring',metric:'Average lead score',value:Number(stats?.averageScore||0),description:'Explainable scoring over persisted CRM, journey and interaction evidence.'},
        {name:'Journey propensity features',version:'workspace',status:Number(stats?.total||0)>0?'active':'ready',type:'Feature set',metric:'Profiles available',value:Number(stats?.total||0),description:'Uses persisted journey depth, pricing views, messaging, calls, meetings and CRM stage as model features.'}
      ],runs})
    }
    if (req.method === 'POST' && url.pathname === '/api/models/run') {
      const body=await readBody(req)
      if(!body.name) return send(req,res,400,{error:'name required'})
      const profiles=await listLeadProfiles(workspaceId,500)
      const stats=await leadOpsStats(workspaceId).catch(()=>({averageScore:0}))
      const startedAt=new Date().toISOString()
      const run={id:'modelrun_'+randomUUID(),kind:'model',name:String(body.name),status:profiles.length?'completed':'no_data',rowsScored:profiles.length,averageScore:Number(stats?.averageScore||0),startedAt,completedAt:new Date().toISOString()}
      await mutateState(s=>{
        s.agentRuns=s.agentRuns||[]
        s.agentRuns.unshift(run)
        s.agentRuns=s.agentRuns.slice(0,500)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'model.run',entityId:run.id,rowsScored:run.rowsScored,status:run.status,at:run.completedAt})
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
      return send(req,res,200,{rules:[
        {id:'rr_1',name:'High-intent education lead',when:'score >= 85',destination:'Senior counsellor pool',slaSeconds:60,status:'active'},
        {id:'rr_2',name:'Financing requested',when:'financingInterest = true',destination:'Finance-trained counsellor',slaSeconds:300,status:'active'},
        {id:'rr_3',name:'WhatsApp re-engagement',when:'source = whatsapp',destination:'WhatsApp nurture',slaSeconds:180,status:'active'},
        {id:'rr_4',name:'Low confidence review',when:'identityConfidence < 0.65',destination:'Manual review',slaSeconds:900,status:'active'}
      ],recent:await listRoutingDecisions(workspaceId,50)})
    }
    if (req.method === 'POST' && url.pathname === '/api/routing/test') {
      const body=await readBody(req)
      const decision=await routeLead(workspaceId,{leadRef:body.leadRef||'test_lead',score:body.score??90,source:body.source||'web',financingInterest:body.financingInterest,identityConfidence:body.identityConfidence??0.95})
      return send(req,res,200,{rule:decision.rule_name,matched:true,destination:decision.destination,reason:decision.reason,slaSeconds:decision.sla_seconds,evaluatedAt:decision.created_at})
    }
    if (req.method === 'GET' && url.pathname === '/api/follow-ups') return send(req,res,200,{items:await listPersistedFollowUps(workspaceId)})
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
    if (req.method === 'GET' && url.pathname === '/api/feedback') return send(req,res,200,await listPersistedFeedback(workspaceId))
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
