import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from '../../store.mjs'
import { audienceOpsStats, closeLeadOps, createActivationRun, createAudience as createLeadAudience, getAudienceBundle, getLeadProfile, leadIdentityStats, leadOpsStats, listActivationRuns, listAudiences as listLeadAudiences, listLeadProfiles, materializeAudience, overrideLeadGrade as persistLeadGrade, previewAudience as previewLeadAudience, scoreLead, upsertLeadProfile, updateAudienceSyncState } from '../../lead-ops.mjs'
import { closeAgentOrchestrator, completeFollowUp as persistCompleteFollowUp, createAgentRun, createFollowUp, createMeeting, followUpStats, getMeeting, listAgentRuns, listFeedback as listPersistedFeedback, listFollowUps as listPersistedFollowUps, listMeetings as listPersistedMeetings, listRoutingDecisions, recordFeedback, rescheduleMeeting, routeLead, updateAgentRun } from '../../agent-orchestrator.mjs'
import { createCalendarEvent, updateCalendarEvent } from '../../calendar-provider.mjs'
import {handleSubmitJob} from '../../../modules/jobs/src/application/commands/submit-job/submit-job.handler.mjs'

export async function handleEngagementRoutes({req,res,url,workspaceId,readBody,send:writeResponse,authenticatedUser,authRequired,trackedEvents,leadReactivationCandidates}) {
    const send=(...args)=>{writeResponse(...args);return true}
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
      const totals=await followUpStats(workspaceId,start.toISOString()).catch(()=>null)
      return send(req,res,200,{items,stats:totals||{open:open.length,completedToday,completedTotal:completed.length,overdue}})
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
    if (req.method === 'GET' && url.pathname === '/api/voice-scheduler') {
      const runs=(await listAgentRuns(workspaceId,100)).filter(x=>x.agent_type==='voice_scheduler')
      return send(req,res,200,{items:runs.map(x=>({id:x.id,lead:x.input?.lead||x.input?.leadRef||x.entity_id||'Lead',phone:x.input?.phone||x.input?.attendeePhone||'',status:x.status,preferredWindow:x.input?.preferredWindow||null,proposedStartsAt:x.input?.proposedStartsAt||null,meetingId:x.output?.meetingId||null,startsAt:x.output?.startsAt||null,meetingLink:x.output?.meetingLink||null,calendarSynced:Boolean(x.output?.calendarSynced),schedulerStatus:x.output?.schedulerStatus||null,externalId:x.external_id,lastError:x.last_error,createdAt:x.created_at}))})
    }
    if (req.method === 'POST' && url.pathname === '/api/voice-scheduler') {
      const body=await readBody(req)
      const leadRef=String(body.leadRef||body.lead||'').trim()
      const phone=String(body.phone||body.attendeePhone||'').trim()
      if(!leadRef)return send(req,res,400,{error:'leadRef or lead required'})
      if(!phone)return send(req,res,400,{error:'phone required'})
      if(body.proposedStartsAt&&Number.isNaN(Date.parse(String(body.proposedStartsAt))))return send(req,res,400,{error:'invalid proposedStartsAt'})
      const input={
        leadRef,
        lead:String(body.lead||leadRef),
        phone,
        attendeePhone:phone,
        attendeeEmail:String(body.attendeeEmail||'').trim(),
        preferredWindow:String(body.preferredWindow||'').trim(),
        proposedStartsAt:body.proposedStartsAt?new Date(body.proposedStartsAt).toISOString():null,
        durationMinutes:Math.max(15,Math.min(180,Number(body.durationMinutes||45))),
        owner:String(body.owner||'Voice Scheduler'),
        title:String(body.title||('Consultation · '+leadRef)),
        syncCalendar:body.syncCalendar!==false,
        requireCalendar:body.requireCalendar===true,
        timezone:String(body.timezone||'Asia/Kolkata')
      }
      const run=await createAgentRun(workspaceId,{agentType:'voice_scheduler',entityId:leadRef,triggerKey:String(body.trigger||'manual_voice_scheduler'),input})
      const job=await handleSubmitJob({workspaceId,kind:'agent_action',idempotencyKey:'agent:'+run.id,payload:{agentRunId:run.id,actionType:'voice_scheduler',payload:{...input,runId:run.id}}})
      return send(req,res,202,{id:run.id,status:'queued',jobId:job?.id||null,leadRef})
    }
    if (req.method === 'GET' && url.pathname === '/api/qualification-calls') {
      const runs=(await listAgentRuns(workspaceId,100)).filter(x=>x.agent_type==='voice_qualification')
      return send(req,res,200,{items:runs.map(x=>({id:x.id,lead:x.input?.lead||x.entity_id||'Lead',source:x.input?.source||'Unknown',agent:'Voice Lead Qualification',status:x.status,duration:x.output?.duration||'—',intent:x.output?.intent??x.input?.intent??0,next:x.output?.next||'Awaiting execution',attempts:x.attempts,externalId:x.external_id,lastError:x.last_error,createdAt:x.created_at}))})
    }
    if (req.method === 'POST' && url.pathname === '/api/qualification-calls/retry') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      const run=await createAgentRun(workspaceId,{agentType:'voice_qualification',entityId:String(body.id),triggerKey:'manual_retry',input:{lead:body.lead||'Lead',source:body.source||'workspace',intent:body.intent||0}})
      const job=await handleSubmitJob({workspaceId,kind:'agent_action',idempotencyKey:'agent:'+run.id,payload:{agentRunId:run.id,actionType:'voice_qualification',payload:{lead:body.lead||'Lead',source:body.source||'workspace',intent:body.intent||0,runId:run.id}}})
      return send(req,res,202,{id:run.id,status:'queued',jobId:job?.id||null})
    }
    if (req.method === 'POST' && url.pathname === '/api/qualification-calls') {
      const body=await readBody(req)
      if(!body.lead) return send(req,res,400,{error:'lead required'})
      const run=await createAgentRun(workspaceId,{agentType:'voice_qualification',entityId:String(body.leadRef||body.lead),triggerKey:String(body.trigger||'lead_created'),input:body})
      const job=await handleSubmitJob({workspaceId,kind:'agent_action',idempotencyKey:'agent:'+run.id,payload:{agentRunId:run.id,actionType:'voice_qualification',payload:{...body,runId:run.id}}})
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
      const job=await handleSubmitJob({workspaceId,kind:'agent_action',idempotencyKey:'agent:'+run.id,payload:{agentRunId:run.id,actionType:'meeting_reminder',payload:{...reminderPayload,runId:run.id}}})
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
      const job=await handleSubmitJob({workspaceId,kind:'agent_action',idempotencyKey:'agent:'+run.id,payload:{agentRunId:run.id,actionType:'feedback',payload:{...body,runId:run.id}}})
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

    return false
}

