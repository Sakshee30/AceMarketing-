import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from '../../store.mjs'
import { attributionStats, captureClickSession, closeAttributionStore, recordAssistedEvent, reconcileAttribution } from '../../attribution-store.mjs'
import { audienceOpsStats, closeLeadOps, createActivationRun, createAudience as createLeadAudience, getAudienceBundle, getLeadProfile, leadIdentityStats, leadOpsStats, listActivationRuns, listAudiences as listLeadAudiences, listLeadProfiles, materializeAudience, overrideLeadGrade as persistLeadGrade, previewAudience as previewLeadAudience, scoreLead, upsertLeadProfile, updateAudienceSyncState } from '../../lead-ops.mjs'
import { closeAgentOrchestrator, completeFollowUp as persistCompleteFollowUp, createAgentRun, createFollowUp, createMeeting, followUpStats, getMeeting, listAgentRuns, listFeedback as listPersistedFeedback, listFollowUps as listPersistedFollowUps, listMeetings as listPersistedMeetings, listRoutingDecisions, recordFeedback, rescheduleMeeting, routeLead, updateAgentRun } from '../../agent-orchestrator.mjs'
import { closeCohortAnalytics, cohortAnalytics } from '../../cohort-analytics.mjs'
import { closeReportScheduler, listReportDeliveries, listReportSchedules, queueReportNow, reportMailConfigured, saveReportSchedule } from '../../report-scheduler.mjs'
import {handleRunReport} from '../../../modules/reporting/src/application/commands/run-report/run-report.handler.mjs'

export async function handleAttributionReportingRoutes({req,res,url,workspaceId,readBody,send:writeResponse,trackedEvents}) {
  const send=(...args)=>{writeResponse(...args);return true}
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
    if (req.method === 'GET' && url.pathname === '/api/customer-360') {
      const [profiles,meetings,followUps,feedbackResult,routingDecisions,agentRuns,audiences]=await Promise.all([
        listLeadProfiles(workspaceId,500),
        listPersistedMeetings(workspaceId),
        listPersistedFollowUps(workspaceId),
        listPersistedFeedback(workspaceId),
        listRoutingDecisions(workspaceId,500),
        listAgentRuns(workspaceId,500),
        listLeadAudiences(workspaceId)
      ])
      const feedback=feedbackResult?.items||[]
      const sameLead=(lead,ref)=>{
        const value=String(ref||'').trim().toLowerCase()
        if(!value)return false
        return [lead.id,lead.external_lead_id,lead.name].filter(Boolean).some(x=>String(x).trim().toLowerCase()===value)
      }
      const trackedForLead=lead=>trackedEvents.filter(event=>{
        const refs=[event.customerId,event.leadId,event.externalLeadId,event.visitorId,event.deviceId,event.device_id]
        return refs.some(ref=>sameLead(lead,ref))||(lead.device_id&&refs.some(ref=>String(ref||'')===String(lead.device_id)))
      })
      const summaries=profiles.map(lead=>{
        const events=trackedForLead(lead)
        const leadMeetings=meetings.filter(x=>sameLead(lead,x.lead_ref))
        const leadFollowUps=followUps.filter(x=>sameLead(lead,x.lead_ref))
        const leadFeedback=feedback.filter(x=>sameLead(lead,x.lead_ref))
        const leadRoutes=routingDecisions.filter(x=>sameLead(lead,x.lead_ref))
        const leadRuns=agentRuns.filter(x=>sameLead(lead,x.entity_id)||sameLead(lead,x.input?.lead)||sameLead(lead,x.input?.leadRef))
        return {
          id:lead.id,
          externalLeadId:lead.external_lead_id,
          name:lead.name||lead.external_lead_id,
          source:lead.source||'First-party',
          campaign:lead.campaign||null,
          stage:lead.crm_stage||'Lead',
          grade:lead.grade||null,
          score:Number(lead.score||0),
          intent:Number(lead.intent||0),
          updatedAt:lead.updated_at,
          activityCount:events.length+leadMeetings.length+leadFollowUps.length+leadFeedback.length+leadRoutes.length+leadRuns.length,
          meetings:leadMeetings.length,
          followUps:leadFollowUps.length,
          feedback:leadFeedback.length
        }
      })
      const requested=String(url.searchParams.get('id')||'').trim()
      const selected=requested
        ?profiles.find(x=>[x.id,x.external_lead_id,x.name].filter(Boolean).some(v=>String(v)===requested))
        :profiles[0]
      if(!selected) return send(req,res,200,{available:true,total:summaries.length,items:summaries,customer:null,generatedAt:new Date().toISOString()})

      const events=trackedForLead(selected)
      const leadMeetings=meetings.filter(x=>sameLead(selected,x.lead_ref))
      const leadFollowUps=followUps.filter(x=>sameLead(selected,x.lead_ref))
      const leadFeedback=feedback.filter(x=>sameLead(selected,x.lead_ref))
      const leadRoutes=routingDecisions.filter(x=>sameLead(selected,x.lead_ref))
      const leadRuns=agentRuns.filter(x=>sameLead(selected,x.entity_id)||sameLead(selected,x.input?.lead)||sameLead(selected,x.input?.leadRef))
      const audienceBundles=await Promise.all(audiences.slice(0,50).map(async audience=>{
        const bundle=await getAudienceBundle(workspaceId,audience.id).catch(()=>null)
        const member=(bundle?.members||[]).find(x=>sameLead(selected,x.external_lead_id)||String(x.device_id||'')===String(selected.device_id||'__none__'))
        return member?{id:audience.id,name:audience.name,mode:audience.mode,destination:audience.destination,status:audience.status,action:member.action||audience.mode}:null
      }))
      const timeline=[]
      const push=(type,title,detail,at,source,meta={})=>{if(at)timeline.push({id:type+'_'+randomUUID(),type,title,detail,at,source,...meta})}
      push('profile','Customer profile created','Canonical lead/customer profile entered the workspace.',selected.created_at,'CRM / identity')
      for(const event of events)push('event',String(event.event||event.eventType||event.name||'Tracked event').replaceAll('_',' '),'First-party activity captured.',event.occurredAt||event.receivedAt||event.timestamp,event.source||event.channel||'Tracking',{value:event.value||null})
      for(const item of leadRoutes)push('routing',item.rule_name||'Lead routed',item.destination||item.reason||'Routing decision',item.created_at,'Routing',{destination:item.destination||null})
      for(const item of leadFollowUps){
        push('follow_up',item.reason||'Follow-up created',(item.channel||'channel')+' · '+(item.status||'open'),item.created_at,'Follow-up',{status:item.status||null})
        if(item.completed_at)push('follow_up_completed','Follow-up completed',item.reason||'',item.completed_at,'Follow-up',{status:'completed'})
      }
      for(const item of leadMeetings){
        push('meeting','Meeting scheduled',(item.owner||'Owner')+' · '+(item.status||'confirmed'),item.starts_at||item.created_at,'Meetings',{meetingLink:item.meeting_link||null})
        if(item.last_reminder_at)push('reminder','Meeting reminder sent',String(item.reminders_sent||1)+' reminder(s)',item.last_reminder_at,'Meetings')
      }
      for(const item of leadFeedback)push('feedback','Feedback recorded',(item.theme||'Uncategorized')+(item.score!=null?' · '+item.score+'/5':''),item.created_at,'Feedback',{score:item.score,theme:item.theme||null})
      for(const item of leadRuns)push('agent',String(item.agent_type||item.action_type||'Agent run').replaceAll('_',' '),String(item.status||'queued'),item.created_at,'Agents',{status:item.status||null})
      if(selected.call_summary)push('call','Call context',String(selected.call_summary),selected.updated_at,'Calls')
      if(selected.whatsapp_summary)push('whatsapp','WhatsApp context',String(selected.whatsapp_summary),selected.updated_at,'WhatsApp')
      timeline.sort((a,b)=>Date.parse(b.at||0)-Date.parse(a.at||0))

      const journey=selected.journey||{}
      const customer={
        id:selected.id,
        externalLeadId:selected.external_lead_id,
        name:selected.name||selected.external_lead_id,
        source:selected.source||'First-party',
        campaign:selected.campaign||null,
        stage:selected.crm_stage||'Lead',
        grade:selected.grade||null,
        score:Number(selected.score||0),
        intent:Number(selected.intent||0),
        createdAt:selected.created_at,
        updatedAt:selected.updated_at,
        identity:{
          deviceId:selected.device_id||null,
          platform:selected.device_platform||null,
          appId:selected.app_id||null,
          hasEmailHash:Boolean(selected.email_sha256),
          hasPhoneHash:Boolean(selected.phone_sha256)
        },
        attributes:selected.attributes||{},
        journey,
        callSummary:selected.call_summary||null,
        whatsappSummary:selected.whatsapp_summary||null,
        audiences:audienceBundles.filter(Boolean),
        operations:{
          meetings:leadMeetings.length,
          followUps:leadFollowUps.length,
          feedback:leadFeedback.length,
          routes:leadRoutes.length,
          agentRuns:leadRuns.length,
          trackedEvents:events.length
        },
        timeline
      }
      return send(req,res,200,{available:true,total:summaries.length,items:summaries,customer,generatedAt:new Date().toISOString()})
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
    if (req.method === 'GET' && url.pathname === '/api/grouped-performance') {
      const state=await getState()
      const dimension=String(url.searchParams.get('dimension')||'category')
      const allowed=new Set(['category','productCategory','product','brand','source','campaign'])
      if(!allowed.has(dimension)) return send(req,res,400,{error:'unsupported grouping dimension'})
      const analytics=await cohortAnalytics(workspaceId,{months:Number(url.searchParams.get('months')||6)}).catch(()=>({available:false,eventDefinitions:{conversion:[]}}))
      const conversionContract=(analytics.eventDefinitions?.conversion?.length?analytics.eventDefinitions.conversion:String(process.env.COHORT_CONVERSION_EVENTS||'purchase,enrolment,enrollment,booking,revenue.closed,closed_won,sale').split(',').map(x=>x.trim()).filter(Boolean))
      const conversionEvents=new Set(conversionContract.map(x=>String(x).toLowerCase()))
      const events=(state.recentEvents||[]).slice(0,5000)
      const costs=state.groupingCosts?.[dimension]||{}
      const rows=new Map()
      const pick=(event,key)=>{
        const aliases={
          category:['category','productCategory','product_category'],
          productCategory:['productCategory','product_category','category'],
          product:['product','productName','product_name','sku'],
          brand:['brand'],
          source:['source','utm_source'],
          campaign:['campaign','utm_campaign']
        }[key]||[key]
        for(const name of aliases){
          if(event[name]!=null&&String(event[name]).trim())return String(event[name]).trim()
          if(event.data&&event.data[name]!=null&&String(event.data[name]).trim())return String(event.data[name]).trim()
          if(event.properties&&event.properties[name]!=null&&String(event.properties[name]).trim())return String(event.properties[name]).trim()
        }
        return 'Unassigned'
      }
      const subject=e=>String(e.customerId||e.leadId||e.visitorId||e.deviceId||e.device_id||e.emailSha256||e.phoneSha256||e.id||'')
      for(const event of events){
        const key=pick(event,dimension)
        const row=rows.get(key)||{key,events:0,subjects:new Set(),conversions:new Set(),revenue:0}
        row.events++
        row.subjects.add(subject(event))
        const eventName=String(event.event||event.eventType||event.name||'').toLowerCase()
        if(conversionEvents.has(eventName)){
          row.conversions.add(subject(event))
          const value=Number(event.value??event.revenue??event.amount??event.data?.value??0)
          if(Number.isFinite(value))row.revenue+=value
        }
        rows.set(key,row)
      }
      const items=[...rows.values()].map(row=>{
        const costRaw=costs[row.key]
        const cost=costRaw==null?null:Number(costRaw)
        const contribution=cost==null?null:Number((row.revenue-cost).toFixed(2))
        const marginRate=cost==null||row.revenue<=0?null:Number(((row.revenue-cost)/row.revenue*100).toFixed(1))
        return {
          key:row.key,
          events:row.events,
          subjects:row.subjects.size,
          conversions:row.conversions.size,
          conversionRate:row.subjects.size?Number((row.conversions.size/row.subjects.size*100).toFixed(1)):0,
          revenue:Number(row.revenue.toFixed(2)),
          cost,
          contribution,
          marginRate
        }
      }).sort((a,b)=>b.revenue-a.revenue||b.conversions-a.conversions||b.subjects-a.subjects)
      const totals=items.reduce((a,x)=>({events:a.events+x.events,subjects:a.subjects+x.subjects,conversions:a.conversions+x.conversions,revenue:a.revenue+x.revenue,cost:a.cost+(x.cost||0),costedGroups:a.costedGroups+(x.cost!=null?1:0)}),{events:0,subjects:0,conversions:0,revenue:0,cost:0,costedGroups:0})
      return send(req,res,200,{
        dimension,
        available:events.length>0,
        conversionEvents:[...conversionEvents],
        totals:{...totals,conversionRate:totals.subjects?Number((totals.conversions/totals.subjects*100).toFixed(1)):0,contribution:totals.costedGroups?Number((totals.revenue-totals.cost).toFixed(2)):null,marginRate:totals.costedGroups&&totals.revenue>0?Number(((totals.revenue-totals.cost)/totals.revenue*100).toFixed(1)):null},
        items,
        generatedAt:new Date().toISOString()
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/grouped-performance/costs') {
      const body=await readBody(req)
      const dimension=String(body.dimension||'')
      const key=String(body.key||'').trim()
      const allowed=new Set(['category','productCategory','product','brand','source','campaign'])
      if(!allowed.has(dimension)) return send(req,res,400,{error:'unsupported grouping dimension'})
      if(!key) return send(req,res,400,{error:'group key required'})
      if(body.cost===null||body.cost===''){
        await mutateState(s=>{s.groupingCosts=s.groupingCosts||{};s.groupingCosts[dimension]=s.groupingCosts[dimension]||{};delete s.groupingCosts[dimension][key]})
        return send(req,res,200,{dimension,key,cost:null})
      }
      const cost=Number(body.cost)
      if(!Number.isFinite(cost)||cost<0) return send(req,res,400,{error:'cost must be a non-negative number'})
      await mutateState(s=>{
        s.groupingCosts=s.groupingCosts||{}
        s.groupingCosts[dimension]=s.groupingCosts[dimension]||{}
        s.groupingCosts[dimension][key]=Number(cost.toFixed(2))
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'grouped_performance.cost_saved',dimension,group:key,cost:Number(cost.toFixed(2)),at:new Date().toISOString()})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,{dimension,key,cost:Number(cost.toFixed(2))})
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
      try{return send(req,res,202,await handleRunReport({workspaceId,scheduleId:String(body.id)}))}
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


  return false
}
