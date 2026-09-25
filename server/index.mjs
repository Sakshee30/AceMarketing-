import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { URL } from 'node:url'

const PORT = Number(process.env.PORT || 3001)

const integrations = ['Google Ads','Meta Ads','LinkedIn Ads','Microsoft Ads','GA4','Zoho CRM','Salesforce','HubSpot','LeadSquared','HighLevel','WhatsApp','WATI','Gupshup','MoEngage','CleverTap','Exotel','Knowlarity','Tata Tele','MyOperator','Shopify','WooCommerce','Magento','WordPress','Custom Backend']
const agents = ['Meta Advanced CAPI','Google ECL / OCI','Call Tracking Events','Custom Integration','Lead Grading','CRM Enrichment','Voice Lead Qualification','Voice Scheduler','Meeting Reminder','Feedback Agent','Ask Ace']
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
    if (req.method === 'GET' && url.pathname === '/api/events') return send(res,200,{items:events})
    if (req.method === 'GET' && url.pathname === '/api/journeys') return send(res,200,{items:[
      {lead:'Aarav Sharma',source:'Google Ads',stage:'Qualified',touchpoints:6,duration:'18m'},
      {lead:'Meera Patel',source:'Meta Ads',stage:'Consultation',touchpoints:8,duration:'4h'},
      {lead:'Rohan Kumar',source:'WhatsApp',stage:'Enrolled',touchpoints:11,duration:'2d'}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/attribution') return send(res,200,{revenue:28400000,journeys:92418,averageTouches:5.4,channels:[['Google Ads',42],['Meta Ads',26],['WhatsApp',14],['Organic Search',11],['Direct / Other',7]]})
    if (req.method === 'GET' && url.pathname === '/api/agents') return send(res,200,{items:agents.map((name,i)=>({name,status:i<7?'active':'available'}))})
    if (req.method === 'GET' && url.pathname === '/api/audiences') return send(res,200,{items:[
      {name:'High intent leads',size:3106,mode:'activate'},
      {name:'Converted / enrolled',size:18204,mode:'suppress'},
      {name:'Website visitors · 180d',size:82416,mode:'retarget'}
    ]})
    if (req.method === 'GET' && url.pathname === '/api/monitoring') return send(res,200,{status:'healthy',eventsPerMinute:8412,failedEventRate:0.18,p95LatencySeconds:1.7})
    return send(res,404,{error:'not found'})
  } catch (error) {
    return send(res,500,{error:error instanceof Error?error.message:'internal error'})
  }
})

server.listen(PORT,()=>console.log(`AceMarketing API listening on http://localhost:${PORT}`))
