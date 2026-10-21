import {parseQaWorkbook} from '../../qa-excel-fixtures.mjs'
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from '../../store.mjs'
import { getJob, queueAvailable, queueStats, requestJobCancellation } from '../../queue.mjs'
import { attributionStats, captureClickSession, closeAttributionStore, recordAssistedEvent, reconcileAttribution } from '../../attribution-store.mjs'
import { audienceOpsStats, closeLeadOps, createActivationRun, createAudience as createLeadAudience, getAudienceBundle, getLeadProfile, leadIdentityStats, leadOpsStats, listActivationRuns, listAudiences as listLeadAudiences, listLeadProfiles, materializeAudience, overrideLeadGrade as persistLeadGrade, previewAudience as previewLeadAudience, scoreLead, upsertLeadProfile, updateAudienceSyncState } from '../../lead-ops.mjs'
import { closeAgentOrchestrator, completeFollowUp as persistCompleteFollowUp, createAgentRun, createFollowUp, createMeeting, followUpStats, getMeeting, listAgentRuns, listFeedback as listPersistedFeedback, listFollowUps as listPersistedFollowUps, listMeetings as listPersistedMeetings, listRoutingDecisions, recordFeedback, rescheduleMeeting, routeLead, updateAgentRun } from '../../agent-orchestrator.mjs'
import {connectorReadCatalog,listConnectorSyncRuns,connectorDataSummary,listConnectorSyncSchedules,saveConnectorSyncSchedule,upsertCampaignDailyFact} from '../../connector-ingestion.mjs'
import {appendTrackedEvent,listTrackedEvents,trackedEventStats} from '../../tracked-events.mjs'

export async function handleDiagnosticsRoutes({req,res,url,workspaceId,readBody,send:writeResponse,trackedEvents,buildSignalReplayPayload}) {
  const send=(...args)=>{writeResponse(...args);return true}
    if (req.method === 'GET' && url.pathname === '/api/diagnostics') {
      const [state,attr,jobs]=await Promise.all([getState(),attributionStats(workspaceId),queueStats(workspaceId)])
      const deliveries=state.signalDeliveries||[]
      const delivered=deliveries.filter(x=>x.status==='delivered').length
      const failed=deliveries.filter(x=>x.status==='dead_letter').length
      const duplicateCount=(state.audit||[]).filter(x=>String(x.action||'').includes('duplicate')).length
      const clickTotal=Number(attr?.activeClickSessions||0)
      const clickCovered=Number(attr?.clickIdCoverage?.gclid||0)+Number(attr?.clickIdCoverage?.fbclid||0)+Number(attr?.clickIdCoverage?.braid||0)
      const clickIdCoverage=clickTotal?Number(Math.min(100,(clickCovered/clickTotal*100)).toFixed(2)):0
      const connectorProblems=(state.connectorHealth||[]).filter(x=>String(x.status||'').toLowerCase()!=='healthy')
      const quarantined=Number(state.quarantinedEvents?.length||0)
      const deliveryRate=deliveries.length?delivered/deliveries.length:1
      const score=Math.max(0,Math.min(100,Math.round(100-(failed*4)-(connectorProblems.length*3)-(quarantined>0?4:0)-(clickTotal&&clickIdCoverage<90?6:0))))
      const issues=[]
      if(duplicateCount) issues.push({key:'duplicate_conversions',severity:'warning',affected:duplicateCount})
      if(clickTotal&&clickIdCoverage<95) issues.push({key:'missing_click_ids',severity:'warning',affectedPercent:Number((100-clickIdCoverage).toFixed(2))})
      if(failed) issues.push({key:'delivery_failures',severity:failed>10?'critical':'warning',affected:failed})
      for(const item of connectorProblems.slice(0,5)) issues.push({key:'connector_health',severity:'warning',connector:item.name,status:item.status})
      if(quarantined) issues.push({key:'schema_mismatch',severity:'info',quarantined})
      return send(req,res,200,{available:true,score,duplicateRate:deliveries.length?Number((duplicateCount/Math.max(1,deliveries.length)*100).toFixed(2)):0,clickIdCoverage,quarantined,deliveryRate:Number((deliveryRate*100).toFixed(2)),queue:jobs,issues,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/diagnostics/scan') {
      const resultId='scan_'+randomUUID()
      const startedAt=new Date().toISOString()
      const [state,attr,jobs]=await Promise.all([getState(),attributionStats(workspaceId),queueStats(workspaceId)])
      const result={
        id:resultId,
        startedAt,
        completedAt:new Date().toISOString(),
        signalDeliveries:(state.signalDeliveries||[]).length,
        deadLetter:(state.signalDeliveries||[]).filter(x=>x.status==='dead_letter').length,
        connectorIssues:(state.connectorHealth||[]).filter(x=>String(x.status||'').toLowerCase()!=='healthy').length,
        unmatchedAttribution:Number(attr?.unmatchedEvents||0),
        queue:jobs
      }
      await mutateState(s=>{
        s.diagnosticScans=s.diagnosticScans||[]
        s.diagnosticScans.unshift(result)
        s.diagnosticScans=s.diagnosticScans.slice(0,100)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'diagnostics.scan_completed',entityId:resultId,at:result.completedAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,result)
    }
    if (req.method === 'POST' && url.pathname === '/api/diagnostics/replay') {
      const body=await readBody(req)
      if(!body.issue) return send(req,res,400,{error:'issue required'})
      const replayId='diag_'+randomUUID()
      const now=new Date().toISOString()
      await mutateState(s=>{
        s.diagnosticReplays=s.diagnosticReplays||[]
        s.diagnosticReplays.unshift({id:replayId,issue:String(body.issue),status:'queued',createdAt:now})
        s.diagnosticReplays=s.diagnosticReplays.slice(0,250)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'diagnostics.replay_queued',entityId:replayId,issue:String(body.issue),at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,202,{queued:true,issue:body.issue,replayId,status:'queued'})
    }
    if (req.method === 'GET' && url.pathname === '/api/leak-monitor') {
      const [profiles,followUps,meetings,routes,state]=await Promise.all([
        listLeadProfiles(workspaceId,500),
        listPersistedFollowUps(workspaceId),
        listPersistedMeetings(workspaceId),
        listRoutingDecisions(workspaceId,500),
        getState()
      ])
      const defaults={new:30,lead:60,qualified:60,routed:120,contacted:240,consultation:720}
      const thresholds={...defaults,...(state.leakMonitorSettings||{})}
      const now=Date.now()
      const leadRef=lead=>String(lead.external_lead_id||lead.id||lead.name||'')
      const stageKey=value=>{
        const s=String(value||'lead').toLowerCase()
        if(/won|converted|customer|enrolled|closed/.test(s))return 'converted'
        if(/consult|meeting|appointment|demo/.test(s))return 'consultation'
        if(/contact|called|reached/.test(s))return 'contacted'
        if(/route|assign|owner/.test(s))return 'routed'
        if(/qualif|mql|sql/.test(s))return 'qualified'
        if(/new|created/.test(s))return 'new'
        return 'lead'
      }
      const getActivity=lead=>{
        const candidates=[lead.updated_at,lead.created_at,lead.journey?.lastActivity,lead.attributes?.lastActivity].filter(Boolean).map(x=>Date.parse(x)).filter(Number.isFinite)
        return candidates.length?Math.max(...candidates):Date.parse(lead.created_at||0)
      }
      const items=[]
      for(const lead of profiles){
        const stage=stageKey(lead.crm_stage)
        if(stage==='converted')continue
        const ref=leadRef(lead)
        const last=getActivity(lead)
        const ageMinutes=Math.max(0,Math.round((now-last)/60000))
        const threshold=Number(thresholds[stage]||thresholds.lead||60)
        const openFollowUps=followUps.filter(x=>String(x.lead_ref)===ref&&String(x.status)==='open')
        const futureMeetings=meetings.filter(x=>String(x.lead_ref)===ref&&Date.parse(x.starts_at||0)>now&&String(x.status)!=='cancelled')
        const route=routes.find(x=>String(x.lead_ref)===ref)
        const recovered=(state.leakRecoveries||[]).find(x=>x.leadRef===ref&&x.status==='queued')
        const missingHandoff=
          stage==='qualified'&&!route?'Qualified lead has no routing decision':
          stage==='routed'&&!openFollowUps.length?'Routed lead has no open follow-up':
          stage==='contacted'&&!futureMeetings.length?'Contacted lead has no future meeting':
          stage==='consultation'&&!openFollowUps.length?'Consultation-stage lead has no recovery follow-up':
          ''
        const stalled=ageMinutes>=threshold
        if(!stalled&&!missingHandoff)continue
        const severity=missingHandoff&&ageMinutes>=threshold*2?'critical':ageMinutes>=threshold*2?'high':'medium'
        items.push({
          id:'leak_'+String(lead.id||ref),
          leadRef:ref,
          name:lead.name||ref,
          stage,
          crmStage:lead.crm_stage||'Lead',
          grade:lead.grade||null,
          score:Number(lead.score||0),
          source:lead.source||'First-party',
          campaign:lead.campaign||null,
          ageMinutes,
          thresholdMinutes:threshold,
          severity,
          reason:missingHandoff||('No meaningful activity for '+ageMinutes+' minutes'),
          evidence:{
            hasRoute:Boolean(route),
            openFollowUps:openFollowUps.length,
            futureMeetings:futureMeetings.length,
            lastActivity:last?new Date(last).toISOString():null
          },
          recoveryQueued:Boolean(recovered)
        })
      }
      items.sort((a,b)=>((({critical:3,high:2,medium:1}[b.severity]||0)-({critical:3,high:2,medium:1}[a.severity]||0))||b.ageMinutes-a.ageMinutes))
      const stageCounts=items.reduce((acc,x)=>{acc[x.stage]=(acc[x.stage]||0)+1;return acc},{})
      const recoveries=(state.leakRecoveries||[]).slice(0,100)
      return send(req,res,200,{
        items,
        thresholds,
        stats:{
          total:items.length,
          critical:items.filter(x=>x.severity==='critical').length,
          high:items.filter(x=>x.severity==='high').length,
          medium:items.filter(x=>x.severity==='medium').length,
          recoveryQueued:items.filter(x=>x.recoveryQueued).length,
          stageCounts
        },
        recoveries,
        generatedAt:new Date().toISOString()
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/leak-monitor/settings') {
      const body=await readBody(req)
      const allowed=['new','lead','qualified','routed','contacted','consultation']
      const settings={}
      for(const key of allowed){
        if(body[key]==null)continue
        const value=Number(body[key])
        if(!Number.isFinite(value)||value<5||value>43200) return send(req,res,400,{error:key+' threshold must be 5-43200 minutes'})
        settings[key]=Math.round(value)
      }
      await mutateState(s=>{s.leakMonitorSettings={...(s.leakMonitorSettings||{}),...settings};s.audit=s.audit||[];s.audit.unshift({id:randomUUID(),action:'leak_monitor.settings_updated',settings,at:new Date().toISOString()});s.audit=s.audit.slice(0,1000)})
      return send(req,res,200,{settings})
    }
    if (req.method === 'POST' && url.pathname === '/api/leak-monitor/recover') {
      const body=await readBody(req)
      const leadRef=String(body.leadRef||'').trim()
      if(!leadRef) return send(req,res,400,{error:'leadRef required'})
      const channel=String(body.channel||'call').toLowerCase()
      if(!['call','voice','whatsapp','email'].includes(channel)) return send(req,res,400,{error:'unsupported recovery channel'})
      const delayMinutes=Math.max(0,Math.min(10080,Number(body.delayMinutes||0)))
      const reason=String(body.reason||'Funnel leak recovery').trim().slice(0,300)
      const existing=(await listPersistedFollowUps(workspaceId)).find(x=>String(x.lead_ref)===leadRef&&String(x.status)==='open'&&String(x.reason||'').startsWith('Leak recovery'))
      if(existing) return send(req,res,200,{duplicate:true,item:existing})
      const followUp=await createFollowUp(workspaceId,{leadRef,reason:'Leak recovery · '+reason,channel,priority:String(body.priority||'high'),delayMinutes,owner:String(body.owner||'Growth recovery queue')})
      if(!followUp) return send(req,res,503,{error:'follow-up store unavailable'})
      const recovery={id:'leakrec_'+randomUUID(),leadRef,followUpId:followUp.id,channel,status:'queued',reason,createdAt:new Date().toISOString(),createdBy:req.user?.email||req.user?.userId||'workspace'}
      await mutateState(s=>{s.leakRecoveries=s.leakRecoveries||[];s.leakRecoveries.unshift(recovery);s.leakRecoveries=s.leakRecoveries.slice(0,1000);s.audit=s.audit||[];s.audit.unshift({id:randomUUID(),action:'leak_monitor.recovery_queued',entityId:recovery.id,leadRef,followUpId:followUp.id,at:recovery.createdAt});s.audit=s.audit.slice(0,1000)})
      return send(req,res,201,{duplicate:false,item:followUp,recovery})
    }
    if (req.method === 'GET' && url.pathname === '/api/funnel') {
      const [allProfiles,allMeetings]=await Promise.all([listLeadProfiles(workspaceId,500),listPersistedMeetings(workspaceId)])
      const allowedPeriods=new Set([7,30,90])
      const requestedDays=Number(url.searchParams.get('periodDays')||30)
      const periodDays=allowedPeriods.has(requestedDays)?requestedDays:30
      const cutoff=Date.now()-periodDays*24*60*60*1000
      const requestedChannel=String(url.searchParams.get('channel')||'').trim()
      const requestedAccount=String(url.searchParams.get('account')||'').trim()
      const requestedDisposition=String(url.searchParams.get('disposition')||'').trim()
      const inWindow=item=>{
        const raw=item.updated_at||item.updatedAt||item.created_at||item.createdAt||item.starts_at||item.startsAt||null
        if(!raw)return true
        const time=Date.parse(raw)
        return Number.isNaN(time)||time>=cutoff
      }
      const accountFor=lead=>String(
        lead.attributes?.adAccountName||
        lead.attributes?.adAccount||
        lead.attributes?.accountName||
        lead.attributes?.account||
        'Default / Unknown'
      )
      const periodProfiles=allProfiles.filter(inWindow)
      const channels=[...new Set(periodProfiles.map(lead=>String(lead.source||'First-party')))].sort((a,b)=>a.localeCompare(b))
      const accounts=[...new Set(periodProfiles.map(accountFor))].sort((a,b)=>a.localeCompare(b))
      let profiles=periodProfiles
      if(requestedChannel)profiles=profiles.filter(lead=>String(lead.source||'First-party')===requestedChannel)
      if(requestedAccount)profiles=profiles.filter(lead=>accountFor(lead)===requestedAccount)
      const qualifiedStages=new Set(['qualified','consultation','opportunity','converted','enrolled','closed_won','customer'])
      const consultationStages=new Set(['consultation','opportunity','converted','enrolled','closed_won','customer'])
      const bookingStages=new Set(['converted','enrolled','closed_won','customer'])
      const leadKey=lead=>String(lead.external_lead_id||lead.name||lead.id)
      const profileByLead=new Map()
      for(const lead of profiles){
        profileByLead.set(leadKey(lead),lead)
        if(lead.name)profileByLead.set(String(lead.name),lead)
      }
      const meetings=allMeetings.filter(inWindow).filter(meeting=>profileByLead.has(String(meeting.lead_ref||'')))
      const campaigns=new Map()
      const ensure=lead=>{
        const name=String(lead.campaign||lead.source||'Unattributed')
        const account=accountFor(lead)
        const channel=String(lead.source||'First-party')
        const key=channel+'::'+account+'::'+name
        const row=campaigns.get(key)||{key,name,account,channel,leads:0,qualified:0,appointments:0,consultations:0,bookings:0}
        campaigns.set(key,row)
        return row
      }
      for(const lead of profiles){
        const row=ensure(lead)
        row.leads++
        const stage=String(lead.crm_stage||'').toLowerCase()
        if(['A','B'].includes(String(lead.grade))||qualifiedStages.has(stage))row.qualified++
        if(consultationStages.has(stage))row.consultations++
        if(bookingStages.has(stage))row.bookings++
      }
      for(const meeting of meetings){
        const lead=profileByLead.get(String(meeting.lead_ref||''))
        if(lead)ensure(lead).appointments++
      }
      const rate=(part,total)=>total?Number((Number(part||0)/Number(total)*100).toFixed(1)):0
      const enrichRates=row=>({
        ...row,
        leadToQualifiedRate:rate(row.qualified,row.leads),
        qualifiedToAppointmentRate:rate(row.appointments,row.qualified),
        appointmentToConsultationRate:rate(row.consultations,row.appointments),
        consultationToBookingRate:rate(row.bookings,row.consultations),
        leadToBookingRate:rate(row.bookings,row.leads)
      })
      const dispositionKey={
        Qualified:'qualified',
        Appointments:'appointments',
        Consultations:'consultations',
        Bookings:'bookings'
      }[requestedDisposition]||''
      let campaignRows=[...campaigns.values()].map(enrichRates).sort((a,b)=>b.leads-a.leads||b.bookings-a.bookings)
      if(dispositionKey)campaignRows=campaignRows.filter(row=>Number(row[dispositionKey]||0)>0)
      const stages={
        leads:profiles.length,
        qualified:profiles.filter(lead=>['A','B'].includes(String(lead.grade))||qualifiedStages.has(String(lead.crm_stage||'').toLowerCase())).length,
        appointments:meetings.length,
        consultations:profiles.filter(lead=>consultationStages.has(String(lead.crm_stage||'').toLowerCase())).length,
        bookings:profiles.filter(lead=>bookingStages.has(String(lead.crm_stage||'').toLowerCase())).length
      }
      const stageRates={
        leadToQualified:rate(stages.qualified,stages.leads),
        qualifiedToAppointment:rate(stages.appointments,stages.qualified),
        appointmentToConsultation:rate(stages.consultations,stages.appointments),
        consultationToBooking:rate(stages.bookings,stages.consultations),
        leadToBooking:rate(stages.bookings,stages.leads)
      }
      return send(req,res,200,{
        available:true,
        stages,
        stageRates,
        campaigns:campaignRows,
        filters:{
          channel:requestedChannel||'All channels',
          account:requestedAccount||'All accounts',
          disposition:requestedDisposition||'All dispositions',
          periodDays,
          channels,
          accounts
        },
        generatedAt:new Date().toISOString()
      })
    }
    const qaMatch=url.pathname.match(/^\/api\/qa-fixtures\/([a-z0-9-]{1,80})$/)
    if(qaMatch&&(req.method==='GET'||req.method==='POST')){
      const feature=qaMatch[1]
      if(!req.user)return send(req,res,401,{error:'Authenticated workspace membership required'})
      if(req.method==='GET'){
        const state=await getState()
        return send(req,res,200,{feature,fixture:state.qaFeatureFixtures?.[workspaceId]?.[feature]||null})
      }
      if(!['owner','admin','operator'].includes(req.user.role))return send(req,res,403,{error:'Write permission required'})
      const body=await readBody(req,2_800_000)
      if(typeof body?.base64!=='string'||body.base64.length>2_700_000||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.base64))return send(req,res,400,{error:'Valid XLSX data (maximum 2 MB) required'})
      const filename=String(body.filename||'').slice(0,200)
      if(!/\.xlsx$/i.test(filename))return send(req,res,400,{error:'Only XLSX files supported'})
      let parsed
      try{parsed=parseQaWorkbook(Buffer.from(body.base64,'base64'))}catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'Invalid XLSX workbook'})}
      const emptyCells=parsed.records.reduce((total,row)=>total+parsed.columns.filter(column=>row[column]===null||row[column]===undefined||String(row[column]).trim()==='').length,0)
      const numeric=parsed.columns.filter(column=>!/\b(id|phone|mobile|tel|zip|postal|date|year|code)\b/i.test(column)).map(column=>{
        const values=parsed.records.map(row=>Number(row[column])).filter(value=>Number.isFinite(value))
        return values.length?{column,count:values.length,total:Number(values.reduce((sum,value)=>sum+value,0).toFixed(2)),average:Number((values.reduce((sum,value)=>sum+value,0)/values.length).toFixed(2))}:null
      }).filter(Boolean).slice(0,8)
      const fixture={filename,columns:parsed.columns,records:parsed.records,recordCount:parsed.records.length,uploadedAt:new Date().toISOString(),uploadedBy:req.user.userId,result:{status:emptyCells?'passed_with_warnings':'passed',feature,validRows:parsed.records.length,columns:parsed.columns.length,emptyCells,numeric}}
      await mutateState(state=>{state.qaFeatureFixtures=state.qaFeatureFixtures||{};state.qaFeatureFixtures[workspaceId]=state.qaFeatureFixtures[workspaceId]||{};state.qaFeatureFixtures[workspaceId][feature]=fixture;state.audit=state.audit||[];state.audit.unshift({id:randomUUID(),action:'qa_fixture.upload',feature,workspaceId,records:fixture.recordCount,actorId:req.user.userId,at:fixture.uploadedAt});state.audit=state.audit.slice(0,1000)})
      let applied={target:'test result',records:0}
      if(['enrich','lead-grading','customer-360','identity'].includes(feature)){
        const persisted=[]
        for(const row of parsed.records){
          const item=await upsertLeadProfile(workspaceId,{externalLeadId:row.lead_id||row.customer_id||row.email,name:row.full_name||row.name,email:row.email,phone:row.phone,source:row.source,campaign:row.campaign||row.campaign_id,crmStage:row.lead_status||row.stage,attributes:{qaFixture:true,fixture:filename,city:row.city,marketingConsent:row.marketing_consent},lastActivity:row.created_date||new Date().toISOString()})
          if(item)persisted.push(item.id)
        }
        applied={target:feature==='lead-grading'?'lead grading':feature==='customer-360'?'customer profiles':feature==='identity'?'identity profiles':'CRM enrichment',records:persisted.length}
      }
      if(['events','journeys','live-sync'].includes(feature)){
        let persisted=0
        for(const row of parsed.records){
          await appendTrackedEvent(workspaceId,{eventId:row.event_id||row.touch_id||row.id||randomUUID(),event:row.event||row.event_name||row.touch_type||'test_event',eventType:row.event_type||row.touch_type||row.event||'test_event',customerId:row.customer_id||row.lead_id||null,leadId:row.lead_id||null,sessionId:row.session_id||null,source:row.source||row.channel||'QA workbook',channel:row.channel||row.source||null,campaign:row.campaign||row.campaign_id||null,occurredAt:row.occurred_at||row.timestamp||row.date||new Date().toISOString(),attributes:{qaFixture:true,fixture:filename,...row}})
          persisted++
        }
        applied={target:feature==='journeys'?'customer journeys':feature==='live-sync'?'live event stream':'event manager',records:persisted}
      }
      if(feature==='follow-ups'){
        let persisted=0
        for(const row of parsed.records){await createFollowUp(workspaceId,{leadRef:row.lead_id||row.customer_id||row.lead||'QA lead',title:row.title||row.action||row.follow_up||'QA follow-up',dueAt:row.due_at||row.due_date||row.date||new Date().toISOString(),owner:row.owner||'QA tester',status:row.status||'open',notes:row.notes||row.description||'Imported test fixture'});persisted++}
        applied={target:'follow-up actions',records:persisted}
      }
      if(feature==='meetings'){
        let persisted=0
        for(const row of parsed.records){await createMeeting(workspaceId,{leadRef:row.lead_id||row.customer_id||row.lead||'QA lead',title:row.title||row.meeting_title||'QA meeting',startsAt:row.starts_at||row.date||new Date().toISOString(),durationMinutes:Number(row.duration_minutes||row.duration||30),attendees:[],status:row.status||'scheduled',meetingLink:'',externalCalendarId:'',source:'qa_fixture'});persisted++}
        applied={target:'meetings',records:persisted}
      }
      if(feature==='adjustments'){
        const imported=parsed.records.map(row=>({id:'adj_'+randomUUID(),event:'campaign performance',source:row.channel||'QA workbook',destination:row.campaign_id||'campaign',fromValue:Number(row.spend||0),toValue:Number(row.revenue||0),currency:row.currency||'INR',reason:'Imported QA adjustment for '+String(row.date||'test date'),status:'pending',createdAt:new Date().toISOString(),createdBy:req.user?.userId||null}))
        await mutateState(state=>{state.adjustments=[...imported,...(state.adjustments||[])].slice(0,1000)})
        applied={target:'adjustments',records:imported.length}
      }
      if(feature==='pos-stores'){
        const imported=parsed.records.map(row=>({batchId:'pos_'+randomUUID(),location:row.store_id||row.store_name,locationName:row.store_name||row.store_id,records:1,revenue:0,matched:0,createdAt:new Date().toISOString(),currency:row.currency||'INR',qaFixture:true,store:{city:row.city,region:row.region,mode:row.mode}}))
        await mutateState(state=>{state.posBatches=[...imported,...(state.posBatches||[])].slice(0,1000)})
        applied={target:'POS stores',records:imported.length}
      }
      // Workbook rows are deliberately written to the same local stores that power
      // the feature pages.  Nothing in this import invokes a provider, webhook, or
      // activation action; it is a safe way to exercise the existing UI with data.
      const leadProfileFeatures=new Set(['agents','compliance','customer-360','data-hub','enrich','identity','lead-grading','routing'])
      const eventFeatures=new Set(['behavior','data-flows','delivery','developers','events','feed','fingerprinting','funnel','live-sync','real-time-activation','sites'])
      const performanceFeatures=new Set(['adjustments','alerts','ask-ace','executive-briefs','grouped-performance','intelligence','leak-monitor','models','monitoring','overview','reports'])
      const campaignFeatures=new Set(['adsync','approvals','chatgpt-ads','integrations','launchpad','planner','settings'])
      if(leadProfileFeatures.has(feature)&&!['enrich','lead-grading','customer-360','identity'].includes(feature)){
        let persisted=0
        for(const row of parsed.records){
          const item=await upsertLeadProfile(workspaceId,{externalLeadId:row.lead_id||row.customer_id||row.email,name:row.full_name||row.name,email:row.email,phone:row.phone,source:row.source,campaign:row.campaign||row.campaign_id,crmStage:row.lead_status||row.stage,attributes:{qaFixture:true,fixture:filename,city:row.city,marketingConsent:row.marketing_consent},lastActivity:row.created_date||new Date().toISOString()})
          if(item)persisted++
        }
        applied={target:feature==='agents'?'agent lead context':feature==='compliance'?'consent profiles':feature==='routing'?'routing lead queue':'customer data hub',records:persisted}
      }
      if(eventFeatures.has(feature)&&!['events','live-sync'].includes(feature)){
        let persisted=0
        for(const row of parsed.records){
          await appendTrackedEvent(workspaceId,{eventId:row.event_id||row.id||randomUUID(),event:row.event||row.event_name||'test_event',eventType:row.event_type||row.event_name||'test_event',customerId:row.customer_id||row.lead_id||null,leadId:row.lead_id||null,sessionId:row.session_id||null,source:row.source||row.channel||'QA workbook',channel:row.channel||row.source||null,campaign:row.campaign||row.campaign_id||null,occurredAt:row.occurred_at_utc||row.occurred_at||row.timestamp||row.date||new Date().toISOString(),attributes:{qaFixture:true,fixture:filename,...row}})
          persisted++
        }
        applied={target:feature==='behavior'?'behavior timeline':feature==='funnel'?'funnel events':feature==='delivery'?'delivery event stream':feature==='real-time-activation'?'activation event stream':'event stream',records:persisted}
      }
      if(['attribution','deep-links','journeys','match-quality'].includes(feature)&&feature!=='journeys'){
        let persisted=0
        for(const row of parsed.records){
          const body={eventId:row.touch_id||row.event_id||randomUUID(),customerId:row.customer_id||null,visitorId:row.session_id||null,utm_source:row.channel||row.source||'QA workbook',utm_campaign:row.campaign_id||null,event:row.touch_type||'touch',eventType:row.touch_type||'touch',source:row.channel||row.source||'QA workbook',occurredAt:row.date||new Date().toISOString(),data:{qaFixture:true,fixture:filename,...row}}
          await captureClickSession(workspaceId,body)
          await recordAssistedEvent(workspaceId,body)
          persisted++
        }
        applied={target:feature==='attribution'?'attribution journeys':feature==='deep-links'?'deep-link attribution':feature==='match-quality'?'match-quality evidence':'customer journeys',records:persisted}
      }
      if(performanceFeatures.has(feature)&&feature!=='adjustments'){
        let persisted=0
        for(const row of parsed.records){
          const day=String(row.date||new Date().toISOString().slice(0,10)).slice(0,10)
          await upsertCampaignDailyFact({workspaceId,connector:'qa_fixture',accountId:'local_test',campaignId:row.campaign_id||row.campaign||'qa_campaign',campaignName:row.campaign_name||row.campaign_id||'QA campaign',day,currency:row.currency||'INR',spend:row.spend||0,impressions:row.impressions||0,clicks:row.clicks||0,conversions:row.conversions||0,conversionValue:row.revenue||0,extra:{qaFixture:true,fixture:filename,channel:row.channel||null}})
          await appendTrackedEvent(workspaceId,{eventId:'qa_performance_'+feature+'_'+row.campaign_id+'_'+day,event:'purchase',eventType:'purchase',source:row.channel||'QA workbook',channel:row.channel||null,campaign:row.campaign_id||null,occurredAt:day,value:Number(row.revenue||0),attributes:{qaFixture:true,fixture:filename,spend:Number(row.spend||0),impressions:Number(row.impressions||0),clicks:Number(row.clicks||0),conversions:Number(row.conversions||0)}})
          persisted++
        }
        applied={target:'campaign analytics',records:persisted}
      }
      if(campaignFeatures.has(feature)){
        let persisted=0
        for(const row of parsed.records){
          const day=String(row.start_date||new Date().toISOString().slice(0,10)).slice(0,10)
          await upsertCampaignDailyFact({workspaceId,connector:'qa_fixture',accountId:'local_test',campaignId:row.campaign_id||'qa_campaign',campaignName:row.campaign_name||row.campaign_id||'QA campaign',day,currency:row.currency||'INR',extra:{qaFixture:true,fixture:filename,channel:row.channel,status:row.status,budget:Number(row.budget||0),endDate:row.end_date||null}})
          persisted++
        }
        applied={target:'campaign configuration',records:persisted}
      }
      if(['audiences','exclusions','personalization'].includes(feature)){
        let persisted=0
        for(const row of parsed.records){
          const item=await createLeadAudience(workspaceId,{name:row.audience_name||row.audience_id||'QA audience',mode:feature==='exclusions'?'Suppress':'Activate',destination:'local_test',condition:'source',operator:'equals',value:'__qa_fixture_no_external_delivery__',identityMode:'auto'})
          if(item)persisted++
        }
        applied={target:feature==='exclusions'?'suppression audiences':feature==='personalization'?'personalization audiences':'audiences',records:persisted}
      }
      if(feature==='calls'){
        const imported=parsed.records.map(row=>({id:row.call_id||randomUUID(),customerId:row.customer_id||null,startedAt:row.call_time_utc||new Date().toISOString(),endedAt:row.call_time_utc||new Date().toISOString(),durationSeconds:Number(row.duration_seconds||0),status:row.outcome||'completed',campaign:row.campaign_id||null,source:'QA workbook',qaFixture:true}))
        await mutateState(state=>{state.callEvents=[...imported,...(state.callEvents||[])].slice(0,1000)})
        applied={target:'call history',records:imported.length}
      }
      if(feature==='feedback'){
        let persisted=0
        for(const row of parsed.records){const item=await recordFeedback(workspaceId,{leadRef:row.customer_id||row.lead_id||'QA lead',channel:'QA workbook',score:row.score||row.rating||null,theme:row.outcome||row.theme||'Call feedback',response:row.notes||row.response||row.outcome||'Imported QA feedback'});if(item)persisted++}
        applied={target:'feedback responses',records:persisted}
      }
      if(['diagnostics','fraud'].includes(feature)){
        const imported=parsed.records.map(row=>({id:row.case_id||randomUUID(),...row,qaFixture:true,fixture:filename,createdAt:new Date().toISOString()}))
        await mutateState(state=>{state.qaDiagnostics=state.qaDiagnostics||{};state.qaDiagnostics[workspaceId]=state.qaDiagnostics[workspaceId]||{};state.qaDiagnostics[workspaceId][feature]=imported})
        applied={target:feature==='fraud'?'fraud review queue':'diagnostic findings',records:imported.length}
      }
      if(['matchback','offline-attribution'].includes(feature)){
        let persisted=0
        for(const row of parsed.records){await recordAssistedEvent(workspaceId,{eventId:row.conversion_id||randomUUID(),customerId:row.customer_id||null,event:'conversion',eventType:row.conversion_type||'conversion',source:'QA workbook',occurredAt:row.date||new Date().toISOString(),value:row.value||0,currency:row.currency||'INR',data:{qaFixture:true,fixture:filename,...row}});persisted++}
        applied={target:feature==='matchback'?'conversion matchbacks':'offline attribution',records:persisted}
      }
      if(feature==='reconciliation'){
        const imported=parsed.records.map(row=>({id:row.order_id||randomUUID(),...row,qaFixture:true,fixture:filename,importedAt:new Date().toISOString()}))
        await mutateState(state=>{state.qaReconciliation=state.qaReconciliation||{};state.qaReconciliation[workspaceId]=imported})
        applied={target:'reconciliation ledger',records:imported.length}
      }
      return send(req,res,200,{feature,fixture,applied})
    }


  return false
}
