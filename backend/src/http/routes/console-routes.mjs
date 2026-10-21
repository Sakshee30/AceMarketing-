import { randomUUID } from 'node:crypto'
import { getState, mutateState } from '../../store.mjs'
import { queueStats } from '../../queue.mjs'
import { listMonitoringRules as listLiveMonitoringRules, saveMonitoringRule } from '../../observability.mjs'

export async function handleConsoleRoutes({req,res,url,workspaceId,readBody,send:writeResponse}) {
  const send=(...args)=>{writeResponse(...args);return true}
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
      const preferences={necessary:true,analytics:Boolean(body.analytics),advertising:Boolean(body.advertising),functionality:Boolean(body.functionality)}
      const savedAt=new Date().toISOString()
      await mutateState(s=>{
        s.publicConsentPreferences=s.publicConsentPreferences||[]
        s.publicConsentPreferences.unshift({id:randomUUID(),preferences,savedAt,source:'public_cookie_banner'})
        s.publicConsentPreferences=s.publicConsentPreferences.slice(0,5000)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'public.consent_saved',entityId:'cookie_preferences',preferences,savedAt,at:savedAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,{saved:true,preferences,savedAt})
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

  return false
}
