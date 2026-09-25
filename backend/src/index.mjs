import http from 'node:http'
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { URL } from 'node:url'
import { createToken, verifyToken, verifyPassword, hashPassword, hasPermission, createRateLimiter, securityHeaders, resolveCorsOrigin } from './security.mjs'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from './store.mjs'
import { connectorVaultReady, encryptSecret } from './vault.mjs'
import { enqueueJob, queueStats } from './queue.mjs'
import { attributionStats, captureClickSession, closeAttributionStore, recordAssistedEvent, reconcileAttribution } from './attribution-store.mjs'
import { closeLeadOps, createActivationRun, createAudience as createLeadAudience, getAudienceBundle, getLeadProfile, leadOpsStats, listActivationRuns, listAudiences as listLeadAudiences, listLeadProfiles, materializeAudience, overrideLeadGrade as persistLeadGrade, previewAudience as previewLeadAudience, scoreLead, upsertLeadProfile, updateAudienceSyncState } from './lead-ops.mjs'
import { closeAgentOrchestrator, completeFollowUp as persistCompleteFollowUp, createAgentRun, createFollowUp, createMeeting, listAgentRuns, listFeedback as listPersistedFeedback, listFollowUps as listPersistedFollowUps, listMeetings as listPersistedMeetings, listRoutingDecisions, recordFeedback, routeLead } from './agent-orchestrator.mjs'
import { closeCustomIntegrations, createCustomIntegration as persistCustomIntegration, listCustomIntegrations, testCustomIntegration as runCustomIntegrationTest } from './custom-integrations.mjs'
import { closeObservability, listAlerts as listLiveAlerts, listMonitoringRules as listLiveMonitoringRules, monitoringSnapshot, recordApiTelemetry, resolveAlert as resolveLiveAlert, saveMonitoringRule } from './observability.mjs'
import { assertCapacity, closeEntitlements, finalizeReservation, resourceCountAllowed, subscriptionSummary, updateWorkspaceEntitlements } from './entitlements.mjs'
import { billingConfigured, billingEventHistory, closeBillingProvider, createCheckoutSession, createPortalSession, processStripeEvent, verifyStripeWebhook } from './billing-provider.mjs'
import { publicNavigation, publicIndustries, publicAgents, publicIntegrations, publicChallenges, publicCaseStudies, publicResources, publicResourceCenter } from './public-content.mjs'

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
  'HubSpot':{provider:'hubspot',authType:'oauth2',clientId:process.env.HUBSPOT_OAUTH_CLIENT_ID||'',clientSecret:process.env.HUBSPOT_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://app.hubspot.com/oauth/authorize',tokenUrl:'https://api.hubapi.com/oauth/v1/token',scopes:['crm.objects.contacts.read','crm.objects.contacts.write']},
  'Salesforce':{provider:'salesforce',authType:'oauth2',clientId:process.env.SALESFORCE_OAUTH_CLIENT_ID||'',clientSecret:process.env.SALESFORCE_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://login.salesforce.com/services/oauth2/authorize',tokenUrl:'https://login.salesforce.com/services/oauth2/token',scopes:['api','refresh_token']},
  'Zoho CRM':{provider:'zoho',authType:'oauth2',clientId:process.env.ZOHO_OAUTH_CLIENT_ID||'',clientSecret:process.env.ZOHO_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://accounts.zoho.com/oauth/v2/auth',tokenUrl:'https://accounts.zoho.com/oauth/v2/token',scopes:['ZohoCRM.modules.ALL','ZohoCRM.settings.ALL']},
  'GA4':{provider:'google',authType:'oauth2',clientId:process.env.GOOGLE_OAUTH_CLIENT_ID||'',clientSecret:process.env.GOOGLE_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://accounts.google.com/o/oauth2/v2/auth',tokenUrl:'https://oauth2.googleapis.com/token',scopes:['openid','email','https://www.googleapis.com/auth/analytics.readonly']},
  'WhatsApp':{provider:'meta',authType:'oauth2',clientId:process.env.META_OAUTH_CLIENT_ID||'',clientSecret:process.env.META_OAUTH_CLIENT_SECRET||'',authorizeUrl:'https://www.facebook.com/v23.0/dialog/oauth',tokenUrl:'https://graph.facebook.com/v23.0/oauth/access_token',scopes:['whatsapp_business_management','whatsapp_business_messaging']}
}
const CONNECTOR_REDIRECT_URI=process.env.CONNECTOR_OAUTH_REDIRECT_URI||''
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

const integrations = ['Google Ads','Meta Ads','LinkedIn Ads','Microsoft Ads','GA4','Zoho CRM','Salesforce','HubSpot','LeadSquared','HighLevel','WhatsApp','WATI','Gupshup','MoEngage','CleverTap','Exotel','Knowlarity','Tata Tele','MyOperator','Shopify','WooCommerce','Magento','WordPress','Custom Backend']
const agents = ['Meta Advanced CAPI','Google ECL / OCI','Call Tracking Events','Custom Integration','Lead Grading','CRM Enrichment','Voice Lead Qualification','Voice Scheduler','Meeting Reminder','Feedback Agent','Ask Ace']
const trackedEvents = []

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

const publicPaths=new Set(['/api/health','/api/ready','/api/auth/login','/api/invitations/activate','/api/demo-requests','/api/track','/api/pricing/recommend','/api/pricing/quote','/api/public/navigation','/api/public/industries','/api/public/agents','/api/public/integrations','/api/public/challenges','/api/public/case-studies','/api/public/resources','/api/public/resource-center'])
const isPublicRequest=(method,path)=>publicPaths.has(path)||(method==='GET'&&path==='/api/integrations/oauth/callback')||(method==='POST'&&path==='/api/billing/webhook')
const meteredMetricFor=(method,path)=>{
  if(method!=='POST') return null
  if(path==='/api/track') return 'tracked_events'
  if(path==='/api/assisted-events') return 'assisted_events'
  if(path==='/api/signal-deliveries/dispatch') return 'signal_dispatches'
  if(path==='/api/audiences/sync') return 'audience_syncs'
  if(path==='/api/custom-integrations/test') return 'custom_integration_tests'
  if(path==='/api/qualification-calls'||path==='/api/qualification-calls/retry'||path==='/api/meetings/remind'||path==='/api/feedback/request') return 'agent_actions'
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
      const body = await readBody(req)
      const q = String(body.question || '').toLowerCase()
      let answer='Qualified-lead quality is stable, but the largest measurable leak is between connected leads and consultations.'
      let insights=[
        {label:'Largest leak',value:'Connected → Consultation',note:'57% drop in the sample funnel'},
        {label:'Strongest revenue source',value:'Google Ads',note:'42% measured contribution'},
        {label:'Signal coverage',value:'94.8%',note:'Healthy destination matching'}
      ]
      if(q.includes('campaign')||q.includes('revenue')) answer='Google Ads currently contributes the largest share of measured revenue, led by the MBA Search campaign in the sample workspace.'
      if(q.includes('qualified')||q.includes('lead')) answer='Qualified leads are 7,621 in the sample period. The biggest opportunity is improving progression from qualified/connected leads into consultation.'
      if(q.includes('suppress')||q.includes('audience')) answer='Converted customers and low-intent leads are the strongest suppression candidates because they create avoidable retargeting spend.'
      return send(req,res,200,{answer,insights})
    }
    if (req.method === 'GET' && url.pathname === '/api/events') return send(req,res,200,{items:events})
    if (req.method === 'GET' && url.pathname === '/api/adjustments') return send(req,res,200,{items:[
      {id:'adj_501',event:'partial_payment',source:'crm_billing',destination:'google_ads',status:'pending'},
      {id:'adj_500',event:'returned_order',source:'commerce_backend',destination:'google_ads',status:'pending'},
      {id:'adj_499',event:'low_quality_lead',source:'crm',destination:'google_ads',status:'applied'},
      {id:'adj_498',event:'duplicate_lead',source:'crm',destination:'meta_ads',status:'applied'}
    ]})
    if (req.method === 'POST' && url.pathname === '/api/adjustments/apply') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      return send(req,res,200,{id:body.id,status:'applied',appliedAt:new Date().toISOString(),auditId:randomUUID()})
    }
    if (req.method === 'GET' && url.pathname === '/api/fingerprinting') return send(req,res,200,{continuityRate:96.4,ambiguousRate:1.3,scenarios:[
      {name:'third_party_checkout',matchRate:96.4},
      {name:'whatsapp_handoff',matchRate:92.8},
      {name:'call_handoff',matchRate:91.6},
      {name:'returning_device',matchRate:88.9}
    ]})
    if (req.method === 'POST' && url.pathname === '/api/fingerprinting/test') {
      const body=await readBody(req)
      if(!body.scenario) return send(req,res,400,{error:'scenario required'})
      return send(req,res,200,{scenario:body.scenario,status:'passed',deterministicMatch:true,testedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/sites') return send(req,res,200,{items:[
      {domain:'www.aceedtech.example',environment:'production',pixel:'active',server:'connected',coverage:97.4},
      {domain:'apply.aceedtech.example',environment:'production',pixel:'active',server:'connected',coverage:95.8},
      {domain:'checkout.aceedtech.example',environment:'production',pixel:'needs_review',server:'connected',coverage:88.6},
      {domain:'staging.aceedtech.example',environment:'sandbox',pixel:'active',server:'sandbox',coverage:100}
    ]})
    if (req.method === 'POST' && url.pathname === '/api/sites/test') {
      const body=await readBody(req)
      if(!body.domain) return send(req,res,400,{error:'domain required'})
      return send(req,res,200,{domain:body.domain,pixel:true,server:true,consent:true,crossDomain:true,testedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/fraud') return send(req,res,200,{items:[
      {key:'duplicate_lead_burst',severity:'high',affected:428},
      {key:'bot_form_activity',severity:'high',affected:1214},
      {key:'invalid_phone_pattern',severity:'medium',affected:309},
      {key:'disposable_email_cluster',severity:'medium',affected:184},
      {key:'click_spam_pattern',severity:'low',affected:2918}
    ]})
    if (req.method === 'POST' && url.pathname === '/api/fraud/block') {
      const body=await readBody(req)
      if(!body.pattern) return send(req,res,400,{error:'pattern required'})
      return send(req,res,200,{pattern:body.pattern,status:'blocked_from_optimization',ruleId:randomUUID(),appliedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/deep-links') return send(req,res,200,{items:[
      {name:'MBA Application',slug:'mba-apply',status:'active'},
      {name:'Scholarship Offer',slug:'scholarship',status:'active'},
      {name:'Consultation Booking',slug:'book',status:'active'},
      {name:'Fee Details',slug:'fees',status:'draft'}
    ]})
    if (req.method === 'POST' && url.pathname === '/api/deep-links/activate') {
      const body=await readBody(req)
      if(!body.slug) return send(req,res,400,{error:'slug required'})
      return send(req,res,200,{slug:body.slug,status:'active',activatedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/diagnostics') return send(req,res,200,{score:91,duplicateRate:1.7,clickIdCoverage:93.2,quarantined:42,issues:[
      {key:'duplicate_conversions',severity:'critical',affected:1284},
      {key:'missing_click_ids',severity:'warning',affectedPercent:6.8},
      {key:'cross_domain_break',severity:'warning',domain:'checkout.example.com'},
      {key:'late_crm_outcomes',severity:'warning',p95Minutes:18},
      {key:'schema_mismatch',severity:'info',quarantined:42}
    ]})
    if (req.method === 'POST' && url.pathname === '/api/diagnostics/replay') {
      const body=await readBody(req)
      if(!body.issue) return send(req,res,400,{error:'issue required'})
      return send(req,res,202,{queued:true,issue:body.issue,replayId:randomUUID(),status:'queued'})
    }
    if (req.method === 'GET' && url.pathname === '/api/funnel') return send(req,res,200,{stages:{leads:12842,qualified:7621,appointments:2314,consultations:1506,bookings:982},campaigns:[
      {name:'MBA Search - Brand',channel:'Google Ads',leads:2841,qualified:1812,appointments:932,consultations:421,bookings:188},
      {name:'Executive Program',channel:'Meta Ads',leads:1964,qualified:1048,appointments:641,consultations:288,bookings:119},
      {name:'PGDM Retargeting',channel:'Meta Ads',leads:1510,qualified:903,appointments:527,consultations:210,bookings:96}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/data-hub') return send(req,res,200,{records:742000,knownIdentities:56582,schemaHealth:99.8,sources:[
      {name:'Google Ads',type:'ad_platform',freshnessSeconds:38,records:248916,status:'healthy'},
      {name:'Meta Ads',type:'ad_platform',freshnessSeconds:42,records:311400,status:'healthy'},
      {name:'LeadSquared',type:'crm',freshnessSeconds:72,records:92400,status:'healthy'},
      {name:'WhatsApp',type:'messaging',freshnessSeconds:19,records:66800,status:'healthy'},
      {name:'Exotel',type:'calling',freshnessSeconds:124,records:18200,status:'review'},
      {name:'POS / Billing',type:'offline_revenue',freshnessSeconds:451,records:5800,status:'healthy'}
    ]})
    if (req.method === 'POST' && url.pathname === '/api/data-hub/rebuild') return send(req,res,202,{jobId:randomUUID(),status:'queued',scope:'canonical_view',queuedAt:new Date().toISOString()})
    if (req.method === 'GET' && url.pathname === '/api/live-sync') return send(req,res,200,{status:'always_on',medianLatencySeconds:42,deliveryRate:99.82,eventsPerMinute:8412,recent:trackedEvents.slice(-25).reverse()})
    if (req.method === 'GET' && url.pathname === '/api/matchback') {
      const live=await attributionStats(workspaceId)
      return send(req,res,200,{live,rules:[
        {name:'closed_won_mba_search',source:'crm_billing',destination:'google_ads',matchedRevenue:8400000,closedOutcomes:982,matchRate:96.8},
        {name:'enrolment_executive_program',source:'crm_billing',destination:'meta_ads',matchedRevenue:5160000,closedOutcomes:611,matchRate:95.9},
        {name:'consultation_sale_whatsapp',source:'crm_whatsapp',destination:'meta_google',matchedRevenue:2840000,closedOutcomes:314,matchRate:92.7},
        {name:'store_sale_offline',source:'pos_crm',destination:'google_meta',matchedRevenue:1980000,closedOutcomes:227,matchRate:94.1}
      ],unmatched:live.available?live.unmatchedEvents:4})
    }
    if (req.method === 'POST' && url.pathname === '/api/matchback/reconcile') {
      const body=await readBody(req)
      if(!body.rule) return send(req,res,400,{error:'rule required'})
      const result=await reconcileAttribution(workspaceId,body.limit||250)
      return send(req,res,200,{rule:body.rule,status:'reconciled',...result,auditId:randomUUID(),completedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/pos-stores') return send(req,res,200,{locations:[
      {name:'Delhi Flagship',id:'DL-01',transactions:2184,revenue:4860000,matchRate:96.2},
      {name:'Noida Center',id:'NOI-02',transactions:1476,revenue:3180000,matchRate:94.7},
      {name:'Mumbai Experience',id:'MUM-03',transactions:1128,revenue:2740000,matchRate:91.9},
      {name:'Bengaluru Center',id:'BLR-04',transactions:986,revenue:2210000,matchRate:95.4}
    ]})
    if (req.method === 'POST' && url.pathname === '/api/pos-stores/import') {
      const body=await readBody(req)
      if(!body.location || !body.records) return send(req,res,400,{error:'location and records required'})
      return send(req,res,202,{batchId:randomUUID(),location:body.location,records:body.records,status:'queued',queuedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/offline-attribution') return send(req,res,200,{
      callAttribution:{matched:4218,matchRate:91.6,method:'timestamp_overlap'},
      whatsapp:{matched:6904,identifiers:['gclid','fbclid','phone']},
      revenueAdjustments:{count:1284,types:['partial_payment','full_payment','zero_value_adjustment']},
      rules:[
        {conversion:'Inbound Call',source:'Telephony',match:'active_session_overlap',destination:['Google Ads','Meta Ads']},
        {conversion:'WhatsApp Enquiry',source:'WhatsApp',match:'persisted_click_id_plus_phone',destination:['Google Ads','Meta Ads']},
        {conversion:'Partial Payment',source:'Custom Backend',match:'customer_id_plus_order',destination:['Google Ads']}
      ]
    })
    if (req.method === 'POST' && url.pathname === '/api/track') {
      const body=await readBody(req)
      const event={id:randomUUID(),receivedAt:new Date().toISOString(),...body}
      trackedEvents.push(event)
      if(trackedEvents.length>5000) trackedEvents.splice(0,trackedEvents.length-5000)
      let clickSession=null
      let assisted=null
      if(body.gclid||body.gbraid||body.wbraid||body.fbclid||body.msclkid||body.utm_source||body.utm_campaign||body.visitorId){
        clickSession=await captureClickSession(workspaceId,{...body,eventId:event.id,userAgent:req.headers['user-agent']}).catch(()=>null)
      }
      if(body.assisted===true||['call','whatsapp','crm','pos','billing','offline'].includes(String(body.source||'').toLowerCase())){
        assisted=await recordAssistedEvent(workspaceId,{...body,eventId:body.eventId||event.id}).catch(()=>null)
      }
      return send(req,res,202,{accepted:true,eventId:event.id,clickSessionId:clickSession?.id||null,assistedEventId:assisted?.id||null,match:assisted?{status:assisted.status,method:assisted.match_method,confidence:assisted.match_confidence}:null})
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
    if (req.method === 'GET' && url.pathname === '/api/journeys') return send(req,res,200,{items:[
      {lead:'Aarav Sharma',source:'Google Ads',stage:'Qualified',touchpoints:6,duration:'18m'},
      {lead:'Meera Patel',source:'Meta Ads',stage:'Consultation',touchpoints:8,duration:'4h'},
      {lead:'Rohan Kumar',source:'WhatsApp',stage:'Enrolled',touchpoints:11,duration:'2d'}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/planner') return send(req,res,200,{budget:2500000,channels:[
      {name:'Google Search',share:38,quality:91,cac:6760,action:'scale'},
      {name:'Meta Prospecting',share:28,quality:74,cac:8120,action:'hold'},
      {name:'WhatsApp Retargeting',share:18,quality:88,cac:7040,action:'scale'},
      {name:'LinkedIn',share:10,quality:81,cac:10340,action:'optimize'},
      {name:'Other',share:6,quality:62,cac:11980,action:'reduce'}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/reports') return send(req,res,200,{items:[
      {name:'Executive MBA Cohort',cadence:'weekly',channel:'email',status:'active'},
      {name:'Paid Funnel Performance',cadence:'daily',channel:'email+slack',status:'active'},
      {name:'Attribution Summary',cadence:'weekly',channel:'leadership',status:'active'},
      {name:'Lead Quality by Campaign',cadence:'monthly',channel:'email',status:'draft'}
    ],cohorts:[
      {month:'Jan',leads:1240,qualifiedRate:38,consultationRate:22,enrolmentRate:8.4,cac:7940},
      {month:'Feb',leads:1410,qualifiedRate:41,consultationRate:25,enrolmentRate:9.8,cac:7520},
      {month:'Mar',leads:1622,qualifiedRate:45,consultationRate:28,enrolmentRate:11.1,cac:7080},
      {month:'Apr',leads:1884,qualifiedRate:47,consultationRate:30,enrolmentRate:12.4,cac:6760}
    ]})
    if (req.method === 'POST' && url.pathname === '/api/reports/send-test') {
      const body=await readBody(req)
      if(!body.report) return send(req,res,400,{error:'report required'})
      return send(req,res,200,{sent:true,report:body.report,delivery:'email',at:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/attribution') return send(req,res,200,{revenue:28400000,journeys:92418,averageTouches:5.4,channels:[['Google Ads',42],['Meta Ads',26],['WhatsApp',14],['Organic Search',11],['Direct / Other',7]]})
    if (req.method === 'GET' && url.pathname === '/api/agents') {
      const state=await getState()
      const builtIn=agents.map((name,i)=>({id:'builtin_'+i,name,status:i<7?'active':'available',type:'built_in'}))
      return send(req,res,200,{items:[...builtIn,...(state.customAgents||[])]})
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
    if (req.method === 'GET' && url.pathname === '/api/behavior') return send(req,res,200,{events:[
      {name:'page_view',count:92418},
      {name:'pricing_page_viewed',count:18204},
      {name:'form_started',count:14066},
      {name:'form_submitted',count:12842},
      {name:'whatsapp_click',count:6904},
      {name:'call_cta_click',count:4882}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/feed') return send(req,res,200,{attributes:[
      {key:'customer_tier',source:'customer',status:'mapped'},
      {key:'order_type',source:'order',status:'mapped'},
      {key:'product_category',source:'product',status:'mapped'},
      {key:'lead_score',source:'model',status:'mapped'},
      {key:'lifecycle_stage',source:'crm',status:'mapped'}
    ]})
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
    if (req.method === 'GET' && url.pathname === '/api/activation-runs') {
      return send(req,res,200,{items:await listActivationRuns(workspaceId,100)})
    }
    if (req.method === 'GET' && url.pathname === '/api/audiences') {
      const items=await listLeadAudiences(workspaceId)
      return send(req,res,200,{items:items.map(x=>({id:x.id,name:x.name,size:x.matched_size,estimatedSize:x.estimated_size,mode:x.mode,destination:x.destination,status:x.status,cadence:'Real time',definition:x.definition,providerState:x.provider_state,lastSyncError:x.last_sync_error,lastSyncedAt:x.last_synced_at,lastMaterializedAt:x.last_materialized_at}))})
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
      if(!body.event || !body.destination) return send(req,res,400,{error:'event and destination required'})
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
        payload:{...body,deliveryId:item.id,event:item.event,destination:item.destination,idempotencyKey}
      })
      return send(req,res,202,{duplicate:false,item,job:job?{id:job.id,status:job.status}:null})
    }
    if (req.method === 'POST' && url.pathname === '/api/signal-deliveries/retry') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      let updated=null
      const now=new Date().toISOString()
      await mutateState(s=>{
        const item=(s.signalDeliveries||[]).find(x=>x.id===body.id)
        if(item){
          item.status='queued'
          item.attempts=Number(item.attempts||0)+1
          item.nextAttemptAt=now
          item.updatedAt=now
          item.lastError=null
          updated={...item}
        }
        s.audit.unshift({id:randomUUID(),action:'signal.retry_queued',entityId:String(body.id),at:now})
        s.audit=s.audit.slice(0,1000)
      })
      if(updated){
        await enqueueJob({
          workspaceId,
          kind:'signal_delivery',
          idempotencyKey:'retry:'+updated.id+':'+updated.attempts+':'+Date.now(),
          payload:{deliveryId:updated.id,event:updated.event,destination:updated.destination,idempotencyKey:updated.idempotencyKey}
        })
        return send(req,res,202,updated)
      }
      return send(req,res,404,{error:'delivery not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/signal-deliveries/replay-dlq') {
      const now=new Date().toISOString()
      let replayed=0
      await mutateState(s=>{
        for(const item of (s.signalDeliveries||[])){
          if(item.status==='dead_letter'){
            item.status='queued'
            item.nextAttemptAt=now
            item.updatedAt=now
            item.lastError=null
            replayed+=1
          }
        }
        s.audit.unshift({id:randomUUID(),action:'signal.dlq_replayed',count:replayed,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,202,{replayed,queuedAt:now})
    }
    if (req.method === 'GET' && url.pathname === '/api/connector-health') {
      const state=await getState()
      const jobs=await queueStats(workspaceId)
      return send(req,res,200,{items:state.connectorHealth||[],jobs,checkedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/webhooks/deliveries') return send(req,res,200,{items:[
      {id:'evt_91',event:'lead.qualified',statusCode:200,latencyMs:412,status:'delivered'},
      {id:'evt_90',event:'revenue.closed',statusCode:200,latencyMs:588,status:'delivered'},
      {id:'evt_89',event:'sync.failed',statusCode:500,latencyMs:1900,status:'failed'},
      {id:'evt_88',event:'audience.updated',statusCode:200,latencyMs:376,status:'delivered'}
    ]})
    if (req.method === 'POST' && url.pathname === '/api/webhooks/retry') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      return send(req,res,202,{id:body.id,status:'queued',retryId:randomUUID()})
    }
    if (req.method === 'POST' && url.pathname === '/api/webhooks/secret/rotate') return send(req,res,201,{secret:'whsec_'+randomUUID().replaceAll('-',''),createdAt:new Date().toISOString()})
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
    if (req.method === 'GET' && url.pathname === '/api/signal-console') return send(req,res,200,{google:[['Qualified Lead',8214,96.1],['Consultation',2314,94.7],['Enrolment',982,97.3]],meta:[['Lead',12842,94.8],['Qualified',7621,95.4],['Purchase',982,96.2]],whatsapp:[['Chat Started',6904,'Matched'],['Qualified',3086,'Synced'],['Booked',711,'Revenue linked']]})
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
      return send(req,res,200,state.launchpad||{})
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
      return send(req,res,200,{
        profiles:56582,
        stitchedProfiles:52911,
        deterministicMatchRate:93.5,
        identifiers:['email_sha256','phone_sha256','gclid','fbclid','crm_contact_id'],
        rules:[
          {priority:1,key:'crm_contact_id',mode:'exact'},
          {priority:2,key:'email_sha256',mode:'exact'},
          {priority:3,key:'phone_sha256',mode:'exact'},
          {priority:4,key:'click_id + session',mode:'deterministic'}
        ]
      })
    }
    if (req.method === 'GET' && url.pathname === '/api/models') {
      const state=await getState()
      return send(req,res,200,{items:[
        {name:'Lead Propensity',version:'v1.6',status:'active',metric:'AUC',score:0.87},
        {name:'Conversion Probability',version:'v1.3',status:'active',metric:'AUC',score:0.84},
        {name:'Revenue Quality',version:'v1.1',status:'shadow',metric:'precision',score:0.79}
      ],runs:(state.agentRuns||[]).filter(x=>x.kind==='model').slice(0,20)})
    }
    if (req.method === 'POST' && url.pathname === '/api/models/run') {
      const body=await readBody(req)
      if(!body.name) return send(req,res,400,{error:'name required'})
      const run={id:'modelrun_'+randomUUID(),kind:'model',name:String(body.name),status:'completed',rowsScored:56582,startedAt:new Date().toISOString(),completedAt:new Date().toISOString()}
      await mutateState(s=>{
        s.agentRuns=s.agentRuns||[]
        s.agentRuns.unshift(run)
        s.agentRuns=s.agentRuns.slice(0,500)
        s.audit.unshift({id:randomUUID(),action:'model.run',entityId:run.id,at:run.completedAt})
      })
      return send(req,res,202,run)
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
      const item=await createMeeting(workspaceId,body)
      return send(req,res,201,item)
    }
    if (req.method === 'POST' && url.pathname === '/api/meetings/remind') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      const run=await createAgentRun(workspaceId,{agentType:'meeting_reminder',entityId:String(body.id),triggerKey:'manual_reminder',input:{meetingId:String(body.id)}})
      const job=await enqueueJob({workspaceId,kind:'agent_action',idempotencyKey:'agent:'+run.id,payload:{agentRunId:run.id,actionType:'meeting_reminder',payload:{meetingId:String(body.id),runId:run.id}}})
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
    if (req.method === 'GET' && url.pathname === '/api/workspaces') {
      const state=await getState()
      return send(req,res,200,{items:state.workspaces||[]})
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
const shutdown=signal=>{console.log(`${signal} received; shutting down`);server.close(async err=>{await Promise.allSettled([closeStore(),closeAttributionStore(),closeLeadOps(),closeAgentOrchestrator(),closeCustomIntegrations(),closeObservability(),closeEntitlements(),closeBillingProvider()]);process.exit(err?1:0)});setTimeout(()=>process.exit(1),10_000).unref()}
process.on('SIGTERM',()=>shutdown('SIGTERM'))
process.on('SIGINT',()=>shutdown('SIGINT'))
