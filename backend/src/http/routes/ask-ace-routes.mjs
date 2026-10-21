import { closeStore, getState, mutateState, storageHealth, withWorkspace } from '../../store.mjs'
import { attributionStats, captureClickSession, closeAttributionStore, recordAssistedEvent, reconcileAttribution } from '../../attribution-store.mjs'
import { audienceOpsStats, closeLeadOps, createActivationRun, createAudience as createLeadAudience, getAudienceBundle, getLeadProfile, leadIdentityStats, leadOpsStats, listActivationRuns, listAudiences as listLeadAudiences, listLeadProfiles, materializeAudience, overrideLeadGrade as persistLeadGrade, previewAudience as previewLeadAudience, scoreLead, upsertLeadProfile, updateAudienceSyncState } from '../../lead-ops.mjs'
import { closeAgentOrchestrator, completeFollowUp as persistCompleteFollowUp, createAgentRun, createFollowUp, createMeeting, followUpStats, getMeeting, listAgentRuns, listFeedback as listPersistedFeedback, listFollowUps as listPersistedFollowUps, listMeetings as listPersistedMeetings, listRoutingDecisions, recordFeedback, rescheduleMeeting, routeLead, updateAgentRun } from '../../agent-orchestrator.mjs'
import { closeObservability, listAlerts as listLiveAlerts, listMonitoringRules as listLiveMonitoringRules, monitoringSnapshot, recordApiTelemetry, resolveAlert as resolveLiveAlert, saveMonitoringRule } from '../../observability.mjs'

export async function handleAskAceRoutes({req,res,url,workspaceId,readBody,send:writeResponse,trackedEvents}) {
    const send=(...args)=>{writeResponse(...args);return true}
    if (req.method === 'POST' && url.pathname === '/api/ask-ace') {
      const body=await readBody(req)
      const question=String(body.question||'').trim()
      if(!question) return send(req,res,400,{error:'question required'})
      if(question.length>500) return send(req,res,400,{error:'question too long'})
      const q=question.toLowerCase()
      const [attribution,leadStats,leads,activationRuns,audiences,monitoring,state,routingDecisions,agentRuns,meetings,feedbackResult,followUpItems]=await Promise.all([
        attributionStats(workspaceId).catch(()=>({available:false})),
        leadOpsStats(workspaceId).catch(()=>({available:false})),
        listLeadProfiles(workspaceId,500).catch(()=>[]),
        listActivationRuns(workspaceId,200).catch(()=>[]),
        listLeadAudiences(workspaceId).catch(()=>[]),
        monitoringSnapshot(workspaceId).catch(()=>({})),
        getState().catch(()=>({})),
        listRoutingDecisions(workspaceId,500).catch(()=>[]),
        listAgentRuns(workspaceId,500).catch(()=>[]),
        listPersistedMeetings(workspaceId).catch(()=>[]),
        listPersistedFeedback(workspaceId).catch(()=>({items:[]})),
        listPersistedFollowUps(workspaceId).catch(()=>[])
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
      const normalizeRef=value=>String(value||'').trim().toLowerCase()
      const knownLeadRefs=new Set(leads.flatMap(x=>[x.external_lead_id,x.name,x.customer_id].map(normalizeRef).filter(Boolean)))
      const uniqueKnown=(rows,selector)=>{
        const refs=new Set()
        for(const row of rows||[]){
          const ref=normalizeRef(selector(row))
          if(ref&&(!knownLeadRefs.size||knownLeadRefs.has(ref)))refs.add(ref)
        }
        return refs.size
      }
      const voiceRuns=(agentRuns||[]).filter(x=>String(x.agent_type||'')==='voice_qualification')
      const feedbackItems=feedbackResult?.items||[]
      const followUpCoverageCount=uniqueKnown(followUpItems,x=>x.lead_ref)
      const funnelCoverage=[
        {key:'lead',label:'Lead profiles',count:leads.length,source:'Lead operations'},
        {key:'routing',label:'Routed leads',count:uniqueKnown(routingDecisions,x=>x.lead_ref),source:'Routing decisions'},
        {key:'qualification',label:'Voice-qualified/attempted',count:uniqueKnown(voiceRuns,x=>x.entity_id||x.input?.lead),source:'Agent runs'},
        {key:'meeting',label:'Meetings scheduled',count:uniqueKnown(meetings,x=>x.lead_ref),source:'Meetings'},
        {key:'follow_up',label:'Follow-ups created',count:followUpCoverageCount,source:'Follow-up operations'},
        {key:'feedback',label:'Feedback captured',count:uniqueKnown(feedbackItems,x=>x.lead_ref),source:'Feedback'}
      ].map((x,index)=>({...x,coverage:index===0?100:pct(x.count,Math.max(1,leads.length))}))
      const weakestHandoff=funnelCoverage.slice(1).sort((a,b)=>a.coverage-b.coverage)[0]||null
      const candidateLead=leads
        .map(lead=>({
          lead,
          refs:[lead.id,lead.external_lead_id,lead.customer_id,lead.name].filter(Boolean).map(value=>String(value).trim()).filter(value=>value.length>=3)
        }))
        .find(entry=>entry.refs.some(ref=>q.includes(ref.toLowerCase())))?.lead||null
      const sameLeadForAsk=(lead,ref)=>{
        const value=normalizeRef(ref)
        if(!value)return false
        return [lead.id,lead.external_lead_id,lead.customer_id,lead.name].filter(Boolean).some(x=>normalizeRef(x)===value)
      }
      const specificJourney=candidateLead?(()=>{
        const timeline=[]
        const push=(type,title,detail,at,source,meta={})=>{if(at)timeline.push({type,title,detail,at,source,...meta})}
        push('profile','Customer profile created','Canonical lead/customer profile entered the workspace.',candidateLead.created_at,'CRM / identity')
        for(const event of trackedEvents.filter(event=>{
          const refs=[event.customerId,event.leadId,event.externalLeadId,event.visitorId,event.deviceId,event.device_id]
          return refs.some(ref=>sameLeadForAsk(candidateLead,ref))||(candidateLead.device_id&&refs.some(ref=>String(ref||'')===String(candidateLead.device_id)))
        })){
          push('event',String(event.event||event.eventType||event.name||'Tracked event').replaceAll('_',' '),'First-party activity captured.',event.occurredAt||event.receivedAt||event.timestamp,event.source||event.channel||'Tracking',{event:event.event||event.eventType||event.name||null,value:event.value||null})
        }
        for(const item of routingDecisions.filter(x=>sameLeadForAsk(candidateLead,x.lead_ref)))push('routing',item.rule_name||'Lead routed',item.destination||item.reason||'Routing decision',item.created_at,'Routing',{destination:item.destination||null})
        for(const item of followUpItems.filter(x=>sameLeadForAsk(candidateLead,x.lead_ref))){
          push('follow_up',item.reason||'Follow-up created',(item.channel||'channel')+' · '+(item.status||'open'),item.created_at,'Follow-up',{status:item.status||null,dueAt:item.due_at||null})
          if(item.completed_at)push('follow_up_completed','Follow-up completed',item.reason||'',item.completed_at,'Follow-up',{status:'completed'})
        }
        for(const item of meetings.filter(x=>sameLeadForAsk(candidateLead,x.lead_ref))){
          push('meeting','Meeting scheduled',(item.owner||'Owner')+' · '+(item.status||'confirmed'),item.starts_at||item.created_at,'Meetings',{startsAt:item.starts_at,status:item.status||null,meetingLink:item.meeting_link||null})
          if(item.last_reminder_at)push('reminder','Meeting reminder sent',String(item.reminders_sent||1)+' reminder(s)',item.last_reminder_at,'Meetings')
        }
        for(const item of feedbackItems.filter(x=>sameLeadForAsk(candidateLead,x.lead_ref)))push('feedback','Feedback recorded',(item.theme||'Uncategorized')+(item.score!=null?' · '+item.score+'/5':''),item.created_at,'Feedback',{score:item.score,theme:item.theme||null})
        for(const item of agentRuns.filter(x=>sameLeadForAsk(candidateLead,x.entity_id)||sameLeadForAsk(candidateLead,x.input?.lead)||sameLeadForAsk(candidateLead,x.input?.leadRef)))push('agent',String(item.agent_type||item.action_type||'Agent run').replaceAll('_',' '),String(item.status||'queued'),item.created_at,'Agents',{status:item.status||null})
        if(candidateLead.call_summary)push('call','Call context',String(candidateLead.call_summary),candidateLead.updated_at,'Calls')
        if(candidateLead.whatsapp_summary)push('whatsapp','WhatsApp context',String(candidateLead.whatsapp_summary),candidateLead.updated_at,'WhatsApp')
        if(candidateLead.crm_stage)push('stage','Current CRM stage',String(candidateLead.crm_stage),candidateLead.updated_at,'CRM',{stage:candidateLead.crm_stage})
        timeline.sort((a,b)=>Date.parse(a.at||0)-Date.parse(b.at||0))
        return {
          leadId:candidateLead.id,
          externalLeadId:candidateLead.external_lead_id||null,
          name:candidateLead.name||candidateLead.external_lead_id||candidateLead.id,
          source:candidateLead.source||'First-party',
          campaign:candidateLead.campaign||null,
          stage:candidateLead.crm_stage||candidateLead.grade||'Lead',
          grade:candidateLead.grade||null,
          score:Number(candidateLead.score||0),
          touchpoints:timeline.length,
          timeline
        }
      })():null
      let intent='workspace_summary'
      let answer=''
      let insights=[]
      let confidence='medium'
      let followUps=[]
      let journeyTimeline=[]
      if(specificJourney&&(q.includes('journey')||q.includes('timeline')||q.includes('touchpoint')||q.includes('path'))){
        intent='customer_journey'
        journeyTimeline=specificJourney.timeline
        const last=specificJourney.timeline[specificJourney.timeline.length-1]||null
        answer=specificJourney.name+' has '+specificJourney.touchpoints+' persisted touchpoints from '+specificJourney.source+(specificJourney.campaign?' / '+specificJourney.campaign:'')+'. Current stage: '+specificJourney.stage+'.'+(last?' Latest observed activity: '+last.title+' via '+last.source+'.':' No linked operational activity is available beyond the profile.')
        insights=[
          evidence('Customer',specificJourney.name,specificJourney.externalLeadId||specificJourney.leadId,'Lead profile'),
          evidence('Source / campaign',specificJourney.source+(specificJourney.campaign?' · '+specificJourney.campaign:''),specificJourney.touchpoints+' persisted touchpoints','Stitched journey'),
          evidence('Current stage',specificJourney.stage,'Grade '+String(specificJourney.grade||'—')+' · score '+specificJourney.score,'Lead operations')
        ]
        confidence='high'
        followUps=['Where did '+specificJourney.name+' last engage?','What follow-ups exist for '+specificJourney.name+'?','Show attribution health for this workspace']
      }else if(q.includes('funnel')||q.includes('drop')||q.includes('handoff')||q.includes('step-by-step')||q.includes('step by step')||q.includes('stage coverage')){
        intent='funnel_monitoring'
        const total=leads.length
        answer=total
          ? 'The workspace has '+total+' persisted lead profiles. '+funnelCoverage.slice(1).map(x=>x.label+': '+x.count+' ('+x.coverage+'% coverage)').join(' · ')+'.'+(weakestHandoff?' The thinnest observed handoff is '+weakestHandoff.label+' at '+weakestHandoff.coverage+'% coverage.':'')
          : 'There are no persisted lead profiles yet, so step-by-step funnel coverage cannot be measured reliably.'
        insights=funnelCoverage.map(x=>evidence(x.label,x.count,(x.coverage||0)+'% of persisted lead profiles',x.source))
        confidence=total?'high':'low'
        followUps=['Which leads have not reached routing yet?','How many leads reached meetings?','Where is attribution breaking after the handoff?']
      }else if(q.includes('campaign')||q.includes('revenue')||q.includes('roas')||q.includes('channel')){
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
      return send(req,res,200,{answer,insights,intent,confidence,followUps,journey:journeyTimeline.length?specificJourney:null,journeyTimeline,generatedAt:new Date().toISOString(),grounded:true})
    }

    return false
}

