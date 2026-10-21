import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { URL } from 'node:url'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from '../../store.mjs'
import { attributionStats, captureClickSession, closeAttributionStore, recordAssistedEvent, reconcileAttribution } from '../../attribution-store.mjs'
import { audienceOpsStats, closeLeadOps, createActivationRun, createAudience as createLeadAudience, getAudienceBundle, getLeadProfile, leadIdentityStats, leadOpsStats, listActivationRuns, listAudiences as listLeadAudiences, listLeadProfiles, materializeAudience, overrideLeadGrade as persistLeadGrade, previewAudience as previewLeadAudience, scoreLead, upsertLeadProfile, updateAudienceSyncState } from '../../lead-ops.mjs'
import { closeAgentOrchestrator, completeFollowUp as persistCompleteFollowUp, createAgentRun, createFollowUp, createMeeting, followUpStats, getMeeting, listAgentRuns, listFeedback as listPersistedFeedback, listFollowUps as listPersistedFollowUps, listMeetings as listPersistedMeetings, listRoutingDecisions, recordFeedback, rescheduleMeeting, routeLead, updateAgentRun } from '../../agent-orchestrator.mjs'
import { closeCustomIntegrations, createCustomIntegration as persistCustomIntegration, listCustomIntegrations, testCustomIntegration as runCustomIntegrationTest } from '../../custom-integrations.mjs'
import { closeEventRules, createEventRule, evaluateEventRules, eventRuleStats, listEventRuleRuns, listEventRules, markEventRuleActivation, setEventRuleEnabled } from '../../event-rules.mjs'
import {handleSubmitJob} from '../../../modules/jobs/src/application/commands/submit-job/submit-job.handler.mjs'

export async function handleLeadOperationsRoutes({req,res,url,workspaceId,readBody,send:writeResponse,agents,agentCatalog}) {
    const send=(...args)=>{writeResponse(...args);return true}
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
        else if(name==='Voice Scheduler'&&(process.env.VOICE_SCHEDULER_WEBHOOK_URL||process.env.VOICE_AGENT_WEBHOOK_URL))status='configured'
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
      const job=await handleSubmitJob({workspaceId,kind:'crm_writeback',idempotencyKey:'crm:'+run.id,payload:{leadRef:lead.id,provider:String(body.provider),fields:body.fields||{},activationRunId:run.id}})
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

    return false
}

