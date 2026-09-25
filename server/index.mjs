import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { URL } from 'node:url'

const PORT = Number(process.env.PORT || 3001)

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

const send = (res,status,data) => {
  res.writeHead(status, {
    'Content-Type':'application/json; charset=utf-8',
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Headers':'Content-Type, Authorization',
    'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  })
  res.end(JSON.stringify(data))
}

const server = http.createServer(async (req,res)=>{
  if (req.method === 'OPTIONS') return send(res,204,{})
  const url = new URL(req.url, `http://localhost:${PORT}`)
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return send(res,200,{ok:true,service:'ace-marketing-api',time:new Date().toISOString()})
    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readBody(req)
      if (!body.email || !String(body.email).includes('@') || String(body.password || '').length < 6) return send(res,400,{error:'valid email and password length >= 6 required'})
      return send(res,200,{token:`demo_${randomUUID()}`,user:{email:body.email,role:'workspace_owner'}})
    }
    if (req.method === 'POST' && url.pathname === '/api/demo-requests') {
      const body = await readBody(req)
      if (!body.email || !body.company) return send(res,400,{error:'email and company are required'})
      return send(res,201,{id:randomUUID(),status:'captured',request:body})
    }
    if (req.method === 'GET' && url.pathname === '/api/workspace/overview') return send(res,200,{revenueAttributed:28400000,qualifiedLeads:7621,signalCoverage:94.8,activeAgents:7})
    if (req.method === 'GET' && url.pathname === '/api/integrations') return send(res,200,{items:integrations.map((name,i)=>({name,status:i<12?'connected':'available'}))})
    if (req.method === 'POST' && url.pathname === '/api/integrations/connect') {
      const body = await readBody(req)
      if (!body.connector) return send(res,400,{error:'connector required'})
      return send(res,200,{connector:body.connector,status:'connected',sync:'enabled'})
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
      return send(res,200,{answer,insights})
    }
    if (req.method === 'GET' && url.pathname === '/api/events') return send(res,200,{items:events})
    if (req.method === 'GET' && url.pathname === '/api/adjustments') return send(res,200,{items:[
      {id:'adj_501',event:'partial_payment',source:'crm_billing',destination:'google_ads',status:'pending'},
      {id:'adj_500',event:'returned_order',source:'commerce_backend',destination:'google_ads',status:'pending'},
      {id:'adj_499',event:'low_quality_lead',source:'crm',destination:'google_ads',status:'applied'},
      {id:'adj_498',event:'duplicate_lead',source:'crm',destination:'meta_ads',status:'applied'}
    ]})
    if (req.method === 'POST' && url.pathname === '/api/adjustments/apply') {
      const body=await readBody(req)
      if(!body.id) return send(res,400,{error:'id required'})
      return send(res,200,{id:body.id,status:'applied',appliedAt:new Date().toISOString(),auditId:randomUUID()})
    }
    if (req.method === 'GET' && url.pathname === '/api/sites') return send(res,200,{items:[
      {domain:'www.aceedtech.example',environment:'production',pixel:'active',server:'connected',coverage:97.4},
      {domain:'apply.aceedtech.example',environment:'production',pixel:'active',server:'connected',coverage:95.8},
      {domain:'checkout.aceedtech.example',environment:'production',pixel:'needs_review',server:'connected',coverage:88.6},
      {domain:'staging.aceedtech.example',environment:'sandbox',pixel:'active',server:'sandbox',coverage:100}
    ]})
    if (req.method === 'POST' && url.pathname === '/api/sites/test') {
      const body=await readBody(req)
      if(!body.domain) return send(res,400,{error:'domain required'})
      return send(res,200,{domain:body.domain,pixel:true,server:true,consent:true,crossDomain:true,testedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/diagnostics') return send(res,200,{score:91,duplicateRate:1.7,clickIdCoverage:93.2,quarantined:42,issues:[
      {key:'duplicate_conversions',severity:'critical',affected:1284},
      {key:'missing_click_ids',severity:'warning',affectedPercent:6.8},
      {key:'cross_domain_break',severity:'warning',domain:'checkout.example.com'},
      {key:'late_crm_outcomes',severity:'warning',p95Minutes:18},
      {key:'schema_mismatch',severity:'info',quarantined:42}
    ]})
    if (req.method === 'POST' && url.pathname === '/api/diagnostics/replay') {
      const body=await readBody(req)
      if(!body.issue) return send(res,400,{error:'issue required'})
      return send(res,202,{queued:true,issue:body.issue,replayId:randomUUID(),status:'queued'})
    }
    if (req.method === 'GET' && url.pathname === '/api/funnel') return send(res,200,{stages:{leads:12842,qualified:7621,appointments:2314,consultations:1506,bookings:982},campaigns:[
      {name:'MBA Search - Brand',channel:'Google Ads',leads:2841,qualified:1812,appointments:932,consultations:421,bookings:188},
      {name:'Executive Program',channel:'Meta Ads',leads:1964,qualified:1048,appointments:641,consultations:288,bookings:119},
      {name:'PGDM Retargeting',channel:'Meta Ads',leads:1510,qualified:903,appointments:527,consultations:210,bookings:96}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/live-sync') return send(res,200,{status:'always_on',medianLatencySeconds:42,deliveryRate:99.82,eventsPerMinute:8412,recent:trackedEvents.slice(-25).reverse()})
    if (req.method === 'GET' && url.pathname === '/api/offline-attribution') return send(res,200,{
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
      return send(res,202,{accepted:true,eventId:event.id})
    }
    if (req.method === 'GET' && url.pathname === '/api/journeys') return send(res,200,{items:[
      {lead:'Aarav Sharma',source:'Google Ads',stage:'Qualified',touchpoints:6,duration:'18m'},
      {lead:'Meera Patel',source:'Meta Ads',stage:'Consultation',touchpoints:8,duration:'4h'},
      {lead:'Rohan Kumar',source:'WhatsApp',stage:'Enrolled',touchpoints:11,duration:'2d'}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/reports') return send(res,200,{items:[
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
      if(!body.report) return send(res,400,{error:'report required'})
      return send(res,200,{sent:true,report:body.report,delivery:'email',at:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/attribution') return send(res,200,{revenue:28400000,journeys:92418,averageTouches:5.4,channels:[['Google Ads',42],['Meta Ads',26],['WhatsApp',14],['Organic Search',11],['Direct / Other',7]]})
    if (req.method === 'GET' && url.pathname === '/api/agents') return send(res,200,{items:agents.map((name,i)=>({name,status:i<7?'active':'available'}))})
    if (req.method === 'GET' && url.pathname === '/api/behavior') return send(res,200,{events:[
      {name:'page_view',count:92418},
      {name:'pricing_page_viewed',count:18204},
      {name:'form_started',count:14066},
      {name:'form_submitted',count:12842},
      {name:'whatsapp_click',count:6904},
      {name:'call_cta_click',count:4882}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/feed') return send(res,200,{attributes:[
      {key:'customer_tier',source:'customer',status:'mapped'},
      {key:'order_type',source:'order',status:'mapped'},
      {key:'product_category',source:'product',status:'mapped'},
      {key:'lead_score',source:'model',status:'mapped'},
      {key:'lifecycle_stage',source:'crm',status:'mapped'}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/solutions') return send(res,200,{items:['Agency','Lead Generation','Enterprise','Mid Market Brand','Attribution Model','Alerts and Monitoring','Server to Server Integration']})
    if (req.method === 'GET' && url.pathname === '/api/audiences') return send(res,200,{items:[
      {name:'High intent leads',size:3106,mode:'activate'},
      {name:'Converted / enrolled',size:18204,mode:'suppress'},
      {name:'Website visitors · 180d',size:82416,mode:'retarget'}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/alerts') return send(res,200,{items:[
      {id:'al_1',severity:'critical',title:'Audience sync stalled',status:'open'},
      {id:'al_2',severity:'warning',title:'GCLID coverage below threshold',status:'open'},
      {id:'al_3',severity:'warning',title:'CRM sync latency elevated',status:'open'}
    ]})
    if (req.method === 'POST' && url.pathname === '/api/alerts/resolve') {
      const body=await readBody(req)
      if(!body.id) return send(res,400,{error:'id required'})
      return send(res,200,{id:body.id,status:'resolved',resolvedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/webhooks/deliveries') return send(res,200,{items:[
      {id:'evt_91',event:'lead.qualified',statusCode:200,latencyMs:412,status:'delivered'},
      {id:'evt_90',event:'revenue.closed',statusCode:200,latencyMs:588,status:'delivered'},
      {id:'evt_89',event:'sync.failed',statusCode:500,latencyMs:1900,status:'failed'},
      {id:'evt_88',event:'audience.updated',statusCode:200,latencyMs:376,status:'delivered'}
    ]})
    if (req.method === 'POST' && url.pathname === '/api/webhooks/retry') {
      const body=await readBody(req)
      if(!body.id) return send(res,400,{error:'id required'})
      return send(res,202,{id:body.id,status:'queued',retryId:randomUUID()})
    }
    if (req.method === 'POST' && url.pathname === '/api/webhooks/secret/rotate') return send(res,201,{secret:'whsec_'+randomUUID().replaceAll('-',''),createdAt:new Date().toISOString()})
    if (req.method === 'GET' && url.pathname === '/api/monitoring') return send(res,200,{status:'healthy',eventsPerMinute:8412,failedEventRate:0.18,p95LatencySeconds:1.7})
    if (req.method === 'GET' && url.pathname === '/api/signal-console') return send(res,200,{google:[['Qualified Lead',8214,96.1],['Consultation',2314,94.7],['Enrolment',982,97.3]],meta:[['Lead',12842,94.8],['Qualified',7621,95.4],['Purchase',982,96.2]],whatsapp:[['Chat Started',6904,'Matched'],['Qualified',3086,'Synced'],['Booked',711,'Revenue linked']]})
    if (req.method === 'GET' && url.pathname === '/api/resources') return send(res,200,{items:['Custom Events','Server-Side Activation','Attribution','CRM Enrichment','Offline Conversion Tracking','Audience Operations']})
    if (req.method === 'GET' && url.pathname === '/api/ai-action') return send(res,200,{steps:[
      {step:1,agent:'Lead Grading',action:'score_intent'},
      {step:2,agent:'CRM Enrichment',action:'assemble_context'},
      {step:3,agent:'Voice Lead Qualification',action:'qualify'},
      {step:4,agent:'Voice Scheduler',action:'schedule'},
      {step:5,agent:'Meeting Reminder',action:'remind'},
      {step:6,agent:'Signal Return',action:'match_and_activate'}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/source-notes') return send(res,200,{notes:[
      {topic:'Shopify support',publicSite:'Current demo page says ecommerce Shopify is unsupported',brochure:'Shopify appears in integration list',aceMarketing:'planned_connector_with_source_conflict_label'}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/case-studies') return send(res,200,{items:[
      {name:'Apollo Ayurvaid',sector:'Healthcare',pattern:'Call + WhatsApp attribution'},
      {name:'Jaro Education',sector:'EdTech',pattern:'High-volume OCI/ECL'},
      {name:'GemPundit',sector:'High AOV',pattern:'WhatsApp + partial payment'},
      {name:'Berger Paints',sector:'Home Services',pattern:'CAPI + CTWA quality optimization'}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/event-templates') return send(res,200,{items:['Pricing-page Lead','High-value Purchase','Prepaid Order','Fulfilled Order','Returned Order','Partial Payment']})
    if (req.method === 'POST' && url.pathname === '/api/consent-preferences') {
      const body = await readBody(req)
      return send(res,200,{saved:true,preferences:{necessary:true,analytics:Boolean(body.analytics),advertising:Boolean(body.advertising),functionality:Boolean(body.functionality)}})
    }
    if (req.method === 'GET' && url.pathname === '/api/monitoring-rules') return send(res,200,{items:[
      {metric:'event_delivery_rate',operator:'lt',threshold:98,severity:'critical'},
      {metric:'gclid_coverage',operator:'lt',threshold:85,severity:'warning'},
      {metric:'crm_sync_latency_minutes',operator:'gt',threshold:5,severity:'warning'},
      {metric:'audience_sync_age_minutes',operator:'gt',threshold:60,severity:'critical'}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/security-posture') return send(res,200,{controls:[
      {name:'ISO 27001',status:'roadmap'},
      {name:'SHA-256 hashing',status:'design_implemented'},
      {name:'GDPR',status:'roadmap'},
      {name:'HIPAA',status:'roadmap'},
      {name:'India DPDP',status:'roadmap'}
    ]})
    return send(res,404,{error:'not found'})
  } catch (error) {
    return send(res,500,{error:error instanceof Error?error.message:'internal error'})
  }
})

server.listen(PORT,()=>console.log(`AceMarketing API listening on http://localhost:${PORT}`))
