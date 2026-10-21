import { randomUUID } from 'node:crypto'
import { getState, mutateState } from '../../store.mjs'
import { queueStats } from '../../queue.mjs'
import { attributionStats } from '../../attribution-store.mjs'
import { audienceOpsStats } from '../../lead-ops.mjs'
import { leadIdentityStats, leadOpsStats, listLeadProfiles } from '../../lead-ops.mjs'
import { listAgentRuns } from '../../agent-orchestrator.mjs'
import { listEventRules } from '../../event-rules.mjs'

export async function handleWorkspaceOperationsRoutes({req,res,url,workspaceId,readBody,send:writeResponse,trackedEvents}) {
  const send=(...args)=>{writeResponse(...args);return true}
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
      const [recentProfiles,identityStats,attr]=await Promise.all([
        listLeadProfiles(workspaceId,50),
        leadIdentityStats(workspaceId),
        attributionStats(workspaceId).catch(()=>({available:false}))
      ])
      const idCount=lead=>[lead.external_lead_id,lead.email_sha256,lead.phone_sha256,lead.device_id].filter(Boolean).length
      const identifiers=[
        identityStats?.identifiers?.customer_id?'customer_id':null,
        identityStats?.identifiers?.email_sha256?'email_sha256':null,
        identityStats?.identifiers?.phone_sha256?'phone_sha256':null,
        identityStats?.identifiers?.device_id?'device_id':null,
        Number(attr?.clickIdCoverage?.gclid||0)>0?'gclid':null,
        Number(attr?.clickIdCoverage?.fbclid||0)>0?'fbclid':null,
        Number(attr?.clickIdCoverage?.braid||0)>0?'gbraid/wbraid':null
      ].filter(Boolean)
      const recent=recentProfiles.map(lead=>({
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
      const total=Number(identityStats?.total||0)
      const stitchedProfiles=Number(identityStats?.stitchedProfiles||0)
      const deterministicRate=total?Number((stitchedProfiles/total*100).toFixed(1)):null
      return send(req,res,200,{
        available:true,
        profiles:total,
        stitchedProfiles,
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
  return false
}

