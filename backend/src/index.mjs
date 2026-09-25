import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { URL } from 'node:url'
import { createToken, verifyToken, verifyPassword, createRateLimiter, securityHeaders, resolveCorsOrigin } from './security.mjs'
import { getState, mutateState } from './store.mjs'
import { publicNavigation, publicIndustries, publicAgents, publicIntegrations } from './public-content.mjs'

const PORT = Number(process.env.PORT || 3001)
const IS_PROD = process.env.NODE_ENV === 'production'
const AUTH_REQUIRED = process.env.AUTH_REQUIRED === 'true' || IS_PROD
const JWT_SECRET = process.env.JWT_SECRET || (IS_PROD ? '' : 'dev-only-change-me')
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ''
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || ''
const allowedOrigins = new Set((process.env.CORS_ALLOWED_ORIGINS || (IS_PROD ? '' : '*')).split(',').map(x=>x.trim()).filter(Boolean))
if (IS_PROD && (!JWT_SECRET || JWT_SECRET.length < 32)) throw new Error('JWT_SECRET must be at least 32 characters in production')
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
    'Access-Control-Allow-Headers':'Content-Type, Authorization, X-Request-ID',
    'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
    'X-Request-ID':requestId,
    ...extra,
  })
  res.end(status===204?'':JSON.stringify(data))
}

const publicPaths=new Set(['/api/health','/api/ready','/api/auth/login','/api/demo-requests','/api/track','/api/public/navigation','/api/public/industries','/api/public/agents','/api/public/integrations'])
const server = http.createServer(async (req,res)=>{
  req.requestId=String(req.headers['x-request-id']||randomUUID())
  const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim()
  const rate=limitRequest(ip)
  if(!rate.allowed) return send(req,res,429,{error:'rate limit exceeded'},{'Retry-After':String(Math.max(1,Math.ceil((rate.resetAt-Date.now())/1000)))})
  const url = new URL(req.url, `http://localhost:${PORT}`)
  if (req.method === 'OPTIONS') return send(req,res,204,{})
  if (req.headers.origin && !resolveCorsOrigin(req.headers.origin,allowedOrigins)) return send(req,res,403,{error:'origin not allowed'})
  if(AUTH_REQUIRED && url.pathname.startsWith('/api/') && !publicPaths.has(url.pathname)){
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'')
    const user=verifyToken(token,JWT_SECRET)
    if(!user) return send(req,res,401,{error:'unauthorized'})
    req.user=user
  }
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return send(req,res,200,{ok:true,service:'ace-marketing-api',time:new Date().toISOString(),requestId:req.requestId})
    if (req.method === 'GET' && url.pathname === '/api/ready') { const state=await getState(); return send(req,res,200,{ok:true,persistence:true,records:{audiences:state.audiences.length,customIntegrations:state.customIntegrations.length},time:new Date().toISOString()}) }
    if (req.method === 'GET' && url.pathname === '/api/public/navigation') return send(req,res,200,publicNavigation)
    if (req.method === 'GET' && url.pathname === '/api/public/industries') return send(req,res,200,{items:publicIndustries})
    if (req.method === 'GET' && url.pathname === '/api/public/agents') return send(req,res,200,{items:publicAgents})
    if (req.method === 'GET' && url.pathname === '/api/public/integrations') return send(req,res,200,{groups:publicIntegrations})
    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readBody(req)
      if (!body.email || !String(body.email).includes('@') || String(body.password || '').length < 6) return send(req,res,400,{error:'valid email and password length >= 6 required'})
      if (IS_PROD && (String(body.email).toLowerCase()!==ADMIN_EMAIL.toLowerCase() || !verifyPassword(body.password,ADMIN_PASSWORD_HASH))) return send(req,res,401,{error:'invalid credentials'})
      const token=createToken({email:body.email,role:'workspace_owner'},JWT_SECRET,Number(process.env.TOKEN_TTL_SECONDS||3600))
      return send(req,res,200,{token,user:{email:body.email,role:'workspace_owner'},expiresIn:Number(process.env.TOKEN_TTL_SECONDS||3600)})
    }
    if (req.method === 'POST' && url.pathname === '/api/demo-requests') {
      const body = await readBody(req)
      if (!body.email || !body.company) return send(req,res,400,{error:'email and company are required'})
      const item={id:randomUUID(),status:'captured',request:body,createdAt:new Date().toISOString()}
      await mutateState(s=>{s.demoRequests.unshift(item);s.demoRequests=s.demoRequests.slice(0,5000)})
      return send(req,res,201,item)
    }
    if (req.method === 'GET' && url.pathname === '/api/workspace/overview') return send(req,res,200,{revenueAttributed:28400000,qualifiedLeads:7621,signalCoverage:94.8,activeAgents:7})
    if (req.method === 'GET' && url.pathname === '/api/integrations') return send(req,res,200,{items:integrations.map((name,i)=>({name,status:i<12?'connected':'available'}))})
    if (req.method === 'POST' && url.pathname === '/api/custom-integrations/test') {
      const body=await readBody(req)
      if(!body.name || !body.baseUrl) return send(req,res,400,{error:'name and baseUrl required'})
      return send(req,res,200,{ok:true,statusCode:200,latencyMs:184,sampleRecords:25,schemaValid:true,authValid:true,testedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/custom-integrations') {
      const body=await readBody(req)
      if(!body.name || !body.baseUrl || !body.identity) return send(req,res,400,{error:'name, baseUrl and identity required'})
      const item={id:'ci_'+randomUUID(),name:body.name,status:'connected',direction:body.direction||'Bidirectional',baseUrl:body.baseUrl,identity:body.identity,createdAt:new Date().toISOString()}
      await mutateState(s=>{s.customIntegrations.unshift(item);s.audit.unshift({id:randomUUID(),action:'custom_integration.created',entityId:item.id,at:item.createdAt})})
      return send(req,res,201,item)
    }
    if (req.method === 'POST' && url.pathname === '/api/integrations/connect') {
      const body = await readBody(req)
      if (!body.connector) return send(req,res,400,{error:'connector required'})
      return send(req,res,200,{connector:body.connector,status:'connected',sync:'enabled'})
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
    if (req.method === 'GET' && url.pathname === '/api/matchback') return send(req,res,200,{rules:[
      {name:'closed_won_mba_search',source:'crm_billing',destination:'google_ads',matchedRevenue:8400000,closedOutcomes:982,matchRate:96.8},
      {name:'enrolment_executive_program',source:'crm_billing',destination:'meta_ads',matchedRevenue:5160000,closedOutcomes:611,matchRate:95.9},
      {name:'consultation_sale_whatsapp',source:'crm_whatsapp',destination:'meta_google',matchedRevenue:2840000,closedOutcomes:314,matchRate:92.7},
      {name:'store_sale_offline',source:'pos_crm',destination:'google_meta',matchedRevenue:1980000,closedOutcomes:227,matchRate:94.1}
    ],unmatched:4})
    if (req.method === 'POST' && url.pathname === '/api/matchback/reconcile') {
      const body=await readBody(req)
      if(!body.rule) return send(req,res,400,{error:'rule required'})
      return send(req,res,200,{rule:body.rule,status:'reconciled',matched:982,unmatched:18,returnedSignals:947,auditId:randomUUID(),completedAt:new Date().toISOString()})
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
      const body = await readBody(req)
      const event = {id:randomUUID(),receivedAt:new Date().toISOString(),...body}
      trackedEvents.push(event)
      if (trackedEvents.length > 5000) trackedEvents.splice(0,trackedEvents.length-5000)
      return send(req,res,202,{accepted:true,eventId:event.id})
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
    if (req.method === 'GET' && url.pathname === '/api/agents') return send(req,res,200,{items:agents.map((name,i)=>({name,status:i<7?'active':'available'}))})
    if (req.method === 'GET' && url.pathname === '/api/lead-grading') return send(req,res,200,{version:'v1.6',items:[
      {lead:'Aarav Sharma',score:94,grade:'A',source:'google_ads',stage:'qualified'},
      {lead:'Meera Patel',score:78,grade:'B',source:'meta_ads',stage:'connected'},
      {lead:'Rohan Kumar',score:88,grade:'A',source:'whatsapp',stage:'consultation'},
      {lead:'Anika Roy',score:54,grade:'C',source:'organic',stage:'lead'},
      {lead:'Kabir Singh',score:32,grade:'D',source:'linkedin_ads',stage:'lead'}
    ]})
    if (req.method === 'POST' && url.pathname === '/api/lead-grading/override') {
      const body=await readBody(req)
      if(!body.lead || !['A','B','C','D'].includes(body.grade)) return send(req,res,400,{error:'lead and grade A-D required'})
      return send(req,res,200,{lead:body.lead,grade:body.grade,overridden:true,auditId:randomUUID(),updatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/lead-grading/activate') {
      const body=await readBody(req)
      if(!body.lead) return send(req,res,400,{error:'lead required'})
      return send(req,res,202,{lead:body.lead,status:'queued_for_activation',destinations:['crm','routing','ad_signals'],queuedAt:new Date().toISOString()})
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
      const seed=Math.max(1200,Math.min(18000,3200 + String(body.value||'').length*137))
      return send(req,res,200,{estimatedSize:seed,matchedPercent:Number(((seed/56582)*100).toFixed(1)),freshness:'real_time'})
    }
    if (req.method === 'POST' && url.pathname === '/api/audiences') {
      const body=await readBody(req)
      if(!body.name || !body.destination) return send(req,res,400,{error:'name and destination required'})
      const item={id:'aud_'+randomUUID(),name:body.name,status:'syncing',destination:body.destination,mode:body.mode||'Activate',condition:body.condition||null,value:body.value||null,createdAt:new Date().toISOString()}
      await mutateState(s=>{s.audiences.unshift(item);s.audit.unshift({id:randomUUID(),action:'audience.created',entityId:item.id,at:item.createdAt})})
      return send(req,res,201,item)
    }
    if (req.method === 'GET' && url.pathname === '/api/audiences') { const state=await getState(); return send(req,res,200,{items:[...state.audiences,{name:'High intent leads',size:3106,mode:'activate'},{name:'Converted / enrolled',size:18204,mode:'suppress'},{name:'Website visitors · 180d',size:82416,mode:'retarget'}]}) }
    if (req.method === 'GET' && url.pathname === '/api/alerts') return send(req,res,200,{items:[
      {id:'al_1',severity:'critical',title:'Audience sync stalled',status:'open'},
      {id:'al_2',severity:'warning',title:'GCLID coverage below threshold',status:'open'},
      {id:'al_3',severity:'warning',title:'CRM sync latency elevated',status:'open'}
    ]})
    if (req.method === 'POST' && url.pathname === '/api/alerts/resolve') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      return send(req,res,200,{id:body.id,status:'resolved',resolvedAt:new Date().toISOString()})
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
    if (req.method === 'GET' && url.pathname === '/api/monitoring') return send(req,res,200,{status:'healthy',eventsPerMinute:8412,failedEventRate:0.18,p95LatencySeconds:1.7})
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
    if (req.method === 'GET' && url.pathname === '/api/monitoring-rules') return send(req,res,200,{items:[
      {metric:'event_delivery_rate',operator:'lt',threshold:98,severity:'critical'},
      {metric:'gclid_coverage',operator:'lt',threshold:85,severity:'warning'},
      {metric:'crm_sync_latency_minutes',operator:'gt',threshold:5,severity:'warning'},
      {metric:'audience_sync_age_minutes',operator:'gt',threshold:60,severity:'critical'}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/security-posture') return send(req,res,200,{controls:[
      {name:'ISO 27001',status:'roadmap'},
      {name:'SHA-256 hashing',status:'design_implemented'},
      {name:'GDPR',status:'roadmap'},
      {name:'HIPAA',status:'roadmap'},
      {name:'India DPDP',status:'roadmap'}
    ]})
    return send(req,res,404,{error:'not found'})
  } catch (error) {
    return send(req,res,500,{error:error instanceof Error?error.message:'internal error'})
  }
})

server.keepAliveTimeout=65_000
server.headersTimeout=66_000
server.requestTimeout=30_000
server.listen(PORT,()=>console.log(`AceMarketing API listening on http://localhost:${PORT}`))
const shutdown=signal=>{console.log(`${signal} received; shutting down`);server.close(err=>process.exit(err?1:0));setTimeout(()=>process.exit(1),10_000).unref()}
process.on('SIGTERM',()=>shutdown('SIGTERM'))
process.on('SIGINT',()=>shutdown('SIGINT'))
