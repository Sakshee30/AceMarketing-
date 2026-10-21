import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from '../../store.mjs'
import { attributionStats, captureClickSession, closeAttributionStore, recordAssistedEvent, reconcileAttribution } from '../../attribution-store.mjs'
import { audienceOpsStats, closeLeadOps, createActivationRun, createAudience as createLeadAudience, getAudienceBundle, getLeadProfile, leadIdentityStats, leadOpsStats, listActivationRuns, listAudiences as listLeadAudiences, listLeadProfiles, materializeAudience, overrideLeadGrade as persistLeadGrade, previewAudience as previewLeadAudience, scoreLead, upsertLeadProfile, updateAudienceSyncState } from '../../lead-ops.mjs'
import { closeAgentOrchestrator, completeFollowUp as persistCompleteFollowUp, createAgentRun, createFollowUp, createMeeting, followUpStats, getMeeting, listAgentRuns, listFeedback as listPersistedFeedback, listFollowUps as listPersistedFollowUps, listMeetings as listPersistedMeetings, listRoutingDecisions, recordFeedback, rescheduleMeeting, routeLead, updateAgentRun } from '../../agent-orchestrator.mjs'
import { closeConsentStore, consentAllows, consentStats, getConsent, listConsentAudit, saveConsent } from '../../consent.mjs'
import { closeCohortAnalytics, cohortAnalytics } from '../../cohort-analytics.mjs'
import {appendTrackedEvent,listTrackedEvents,trackedEventStats} from '../../tracked-events.mjs'
import {trackingInputError} from '../../tracking-input.mjs'
import { closeReportScheduler, listReportDeliveries, listReportSchedules, queueReportNow, reportMailConfigured, saveReportSchedule } from '../../report-scheduler.mjs'
import { closeEventRules, createEventRule, evaluateEventRules, eventRuleStats, listEventRuleRuns, listEventRules, markEventRuleActivation, setEventRuleEnabled } from '../../event-rules.mjs'
import {handleSubmitJob} from '../../../modules/jobs/src/application/commands/submit-job/submit-job.handler.mjs'
import {handleRunReport} from '../../../modules/reporting/src/application/commands/run-report/run-report.handler.mjs'

export async function handleAttributionRoutes({req,res,url,workspaceId,readBody,send:writeResponse,trackedEvents}) {
    const send=(...args)=>{writeResponse(...args);return true}
    if (req.method === 'GET' && url.pathname === '/api/personalization-rules') {
      const state=await getState()
      const items=(state.personalizationRules||[]).slice().sort((a,b)=>Number(b.priority||0)-Number(a.priority||0)||Date.parse(b.updatedAt||b.createdAt||0)-Date.parse(a.updatedAt||a.createdAt||0))
      const decisions=state.personalizationDecisions||[]
      const feedback=state.personalizationFeedback||[]
      const performance=items.map(rule=>{
        const ruleDecisions=decisions.filter(x=>x.ruleId===rule.id)
        const ruleFeedback=feedback.filter(x=>x.ruleId===rule.id)
        const impressions=ruleFeedback.filter(x=>x.kind==='impression').length
        const clicks=ruleFeedback.filter(x=>x.kind==='click').length
        const conversions=ruleFeedback.filter(x=>x.kind==='conversion').length
        return {ruleId:rule.id,decisions:ruleDecisions.length,impressions,clicks,conversions,ctr:impressions?Number((clicks/impressions*100).toFixed(1)):0,conversionRate:impressions?Number((conversions/impressions*100).toFixed(1)):0}
      })
      return send(req,res,200,{items,performance,recentDecisions:decisions.slice(0,100),recentFeedback:feedback.slice(0,100),stats:{total:items.length,active:items.filter(x=>x.status==='active').length,decisions:decisions.length,impressions:feedback.filter(x=>x.kind==='impression').length,clicks:feedback.filter(x=>x.kind==='click').length,conversions:feedback.filter(x=>x.kind==='conversion').length}})
    }
    if (req.method === 'POST' && url.pathname === '/api/personalization-rules') {
      const body=await readBody(req)
      const name=String(body.name||'').trim()
      const surface=String(body.surface||'website').trim()
      const variant=String(body.variant||'').trim()
      if(name.length<3||name.length>120) return send(req,res,400,{error:'name must be 3-120 characters'})
      if(!variant) return send(req,res,400,{error:'variant required'})
      const conditions=(Array.isArray(body.conditions)?body.conditions:[]).slice(0,8).map(x=>({field:String(x.field||'').trim(),operator:String(x.operator||'equals'),value:x.value??''})).filter(x=>x.field)
      const now=new Date().toISOString()
      const item={id:'pers_'+randomUUID(),name,surface,variant,message:String(body.message||'').trim(),cta:String(body.cta||'').trim(),destination:String(body.destination||'').trim(),conditions,priority:Math.max(0,Math.min(1000,Number(body.priority||100))),status:body.enabled===false?'paused':'active',requiresPersonalizationConsent:body.requiresPersonalizationConsent!==false,createdAt:now,updatedAt:now,createdBy:req.user?.email||req.user?.userId||'workspace'}
      await mutateState(s=>{
        s.personalizationRules=s.personalizationRules||[]
        s.personalizationRules.unshift(item)
        s.personalizationRules=s.personalizationRules.slice(0,500)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'personalization_rule.created',entityId:item.id,surface:item.surface,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item})
    }
    if (req.method === 'POST' && url.pathname === '/api/personalization-rules/toggle') {
      const body=await readBody(req)
      const id=String(body.id||'')
      let updated=null
      await mutateState(s=>{
        const item=(s.personalizationRules||[]).find(x=>x.id===id)
        if(item){item.status=body.enabled?'active':'paused';item.updatedAt=new Date().toISOString();updated={...item}}
      })
      return updated?send(req,res,200,{item:updated}):send(req,res,404,{error:'personalization rule not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/personalization/decide') {
      const body=await readBody(req)
      const customerRef=String(body.customerId||body.leadId||body.visitorId||body.deviceId||'').trim()
      if(!customerRef) return send(req,res,400,{error:'customerId, leadId, visitorId, or deviceId required'})
      const consent=await consentAllows(workspaceId,{subjectType:body.customerId?'customer':'visitor',subjectId:customerRef,category:'personalization'})
      const profile=await getLeadProfile(workspaceId,customerRef).catch(()=>null)
      const state=await getState()
      const context={
        ...body,
        ...(profile?.attributes||{}),
        ...(profile?.journey||{}),
        grade:profile?.grade??body.grade,
        score:profile?.score??body.score,
        stage:profile?.crm_stage??body.stage,
        source:profile?.source??body.source,
        campaign:profile?.campaign??body.campaign,
        devicePlatform:profile?.device_platform??body.devicePlatform,
        ltvTier:profile?.journey?.ltvTier??body.ltvTier,
        conversionPropensity:profile?.journey?.conversionPropensity??body.conversionPropensity
      }
      const rules=(state.personalizationRules||[]).filter(x=>x.status==='active'&&(!body.surface||String(x.surface)===String(body.surface))).sort((a,b)=>Number(b.priority||0)-Number(a.priority||0))
      const matched=rules.find(rule=>(rule.conditions||[]).every(condition=>activationConditionMatches(condition,context)))
      const blocked=matched?.requiresPersonalizationConsent&&!consent.allowed
      const decision={id:'pdec_'+randomUUID(),customerRef,surface:String(body.surface||matched?.surface||'website'),ruleId:matched?.id||null,ruleName:matched?.name||null,variant:blocked?null:(matched?.variant||null),message:blocked?null:(matched?.message||null),cta:blocked?null:(matched?.cta||null),destination:blocked?null:(matched?.destination||null),matched:Boolean(matched),status:blocked?'consent_blocked':matched?'decided':'no_match',createdAt:new Date().toISOString()}
      await mutateState(s=>{
        s.personalizationDecisions=s.personalizationDecisions||[]
        s.personalizationDecisions.unshift(decision)
        s.personalizationDecisions=s.personalizationDecisions.slice(0,5000)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'personalization.decided',entityId:decision.id,ruleId:decision.ruleId,status:decision.status,at:decision.createdAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,{decision,consent:{allowed:consent.allowed,reason:consent.reason},profileFound:Boolean(profile)})
    }
    if (req.method === 'POST' && url.pathname === '/api/personalization/feedback') {
      const body=await readBody(req)
      if(!body.decisionId||!['impression','click','conversion'].includes(String(body.kind))) return send(req,res,400,{error:'decisionId and kind impression/click/conversion required'})
      const state=await getState()
      const decision=(state.personalizationDecisions||[]).find(x=>x.id===String(body.decisionId))
      if(!decision) return send(req,res,404,{error:'personalization decision not found'})
      const item={id:'pfb_'+randomUUID(),decisionId:decision.id,ruleId:decision.ruleId,customerRef:decision.customerRef,kind:String(body.kind),value:body.value==null?null:Number(body.value),currency:body.currency||null,createdAt:new Date().toISOString()}
      await mutateState(s=>{
        s.personalizationFeedback=s.personalizationFeedback||[]
        s.personalizationFeedback.unshift(item)
        s.personalizationFeedback=s.personalizationFeedback.slice(0,10000)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'personalization.feedback',entityId:item.id,decisionId:item.decisionId,kind:item.kind,at:item.createdAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item})
    }
    if (req.method === 'GET' && url.pathname === '/api/activation-rules') {
      const state=await getState()
      const items=(state.activationRules||[]).slice().sort((a,b)=>Date.parse(b.updatedAt||b.createdAt||0)-Date.parse(a.updatedAt||a.createdAt||0))
      const runs=(state.activationRuleRuns||[]).slice(0,100)
      const active=items.filter(x=>x.status==='active').length
      return send(req,res,200,{items,runs,stats:{total:items.length,active,paused:items.length-active,runs:runs.length,succeeded:runs.filter(x=>x.status==='succeeded').length,skipped:runs.filter(x=>x.status==='skipped').length}})
    }
    if (req.method === 'POST' && url.pathname === '/api/activation-rules') {
      const body=await readBody(req)
      const name=String(body.name||'').trim()
      const triggerEvent=String(body.triggerEvent||'').trim()
      const actionType=String(body.actionType||'').trim()
      if(name.length<3||name.length>120) return send(req,res,400,{error:'name must be 3-120 characters'})
      if(!triggerEvent) return send(req,res,400,{error:'triggerEvent required'})
      if(!['signal','follow_up','route'].includes(actionType)) return send(req,res,400,{error:'actionType must be signal, follow_up, or route'})
      if(actionType==='signal'&&!String(body.destination||'').trim()) return send(req,res,400,{error:'signal destination required'})
      if(actionType==='route'&&!String(body.destination||'').trim()) return send(req,res,400,{error:'routing destination required'})
      const conditions=(Array.isArray(body.conditions)?body.conditions:[]).slice(0,5).map(x=>({field:String(x.field||'').trim(),operator:String(x.operator||'equals'),value:x.value??''})).filter(x=>x.field)
      const now=new Date().toISOString()
      const item={
        id:'actrule_'+randomUUID(),
        name,
        triggerEvent,
        conditions,
        actionType,
        destination:String(body.destination||'').trim()||null,
        outputEvent:String(body.outputEvent||triggerEvent).trim()||triggerEvent,
        channel:String(body.channel||'whatsapp').trim(),
        owner:String(body.owner||'Marketing automation').trim(),
        priority:String(body.priority||'medium').trim(),
        delayMinutes:Math.max(0,Math.min(10080,Number(body.delayMinutes||0))),
        reason:String(body.reason||name).trim(),
        status:body.enabled===false?'paused':'active',
        requiresMarketingConsent:body.requiresMarketingConsent!==false,
        createdAt:now,
        updatedAt:now,
        createdBy:req.user?.email||req.user?.userId||'workspace'
      }
      await mutateState(s=>{
        s.activationRules=s.activationRules||[]
        s.activationRules.unshift(item)
        s.activationRules=s.activationRules.slice(0,500)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'activation_rule.created',entityId:item.id,triggerEvent:item.triggerEvent,actionType:item.actionType,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item})
    }
    if (req.method === 'POST' && url.pathname === '/api/activation-rules/toggle') {
      const body=await readBody(req)
      const id=String(body.id||'')
      let updated=null
      await mutateState(s=>{
        const item=(s.activationRules||[]).find(x=>x.id===id)
        if(item){item.status=body.enabled?'active':'paused';item.updatedAt=new Date().toISOString();updated={...item}}
      })
      return updated?send(req,res,200,{item:updated}):send(req,res,404,{error:'activation rule not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/activation-rules/test') {
      const body=await readBody(req)
      const state=await getState()
      const rule=(state.activationRules||[]).find(x=>x.id===String(body.id||''))
      if(!rule) return send(req,res,404,{error:'activation rule not found'})
      const sample=body.event&&typeof body.event==='object'?body.event:{event:rule.triggerEvent,customerId:'activation_test_customer',value:100}
      return send(req,res,200,{matched:activationRuleMatches({...rule,status:'active'},sample),ruleId:rule.id,sample,evaluatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/track') {
      const body=await readBody(req)
      const inputError=trackingInputError(body)
      if(inputError)return send(req,res,400,{accepted:false,error:inputError})
      const authorization=String(req.headers.authorization||'')
      const suppliedKey=authorization.replace(/^Bearer\s+/i,'')
      if(suppliedKey.startsWith('ace_')){
        const fingerprint=createHash('sha256').update(suppliedKey).digest('hex')
        const keyState=await getState()
        const apiKey=(keyState.apiKeys||[]).find(x=>x.fingerprint===fingerprint&&x.status!=='revoked')
        if(!apiKey) return send(req,res,401,{accepted:false,error:'invalid or revoked api key'})
        const usedAt=new Date().toISOString()
        await mutateState(s=>{
          const key=(s.apiKeys||[]).find(x=>x.id===apiKey.id)
          if(key) key.lastUsedAt=usedAt
        })
      }
      const category=['essential','analytics','marketing','personalization'].includes(String(body.eventCategory))?String(body.eventCategory):'analytics'
      const trackingSubjectId=body.customerId||body.visitorId||body.deviceId||body.device_id
      if(!trackingSubjectId) return send(req,res,400,{accepted:false,error:'customerId, visitorId, or deviceId required'})
      const consent=await consentAllows(workspaceId,{subjectType:body.customerId?'customer':'visitor',subjectId:trackingSubjectId,category})
      if(!consent.allowed) return send(req,res,403,{accepted:false,error:'consent required',reason:consent.reason,category})
      const event={...body,id:body.id||randomUUID(),receivedAt:new Date().toISOString(),consentCategory:category}
      trackedEvents.push(event)
      if(trackedEvents.length>5000) trackedEvents.splice(0,trackedEvents.length-5000)
      const persistedEvent={...event}
      if(persistedEvent.email){
        persistedEvent.emailSha256=persistedEvent.emailSha256||persistedEvent.email_sha256||sha256Normalized(persistedEvent.email)
        delete persistedEvent.email
      }
      if(persistedEvent.phone){
        persistedEvent.phoneSha256=persistedEvent.phoneSha256||persistedEvent.phone_sha256||sha256Phone(persistedEvent.phone)
        delete persistedEvent.phone
      }
      await mutateState(s=>{
        s.recentEvents=s.recentEvents||[]
        s.recentEvents.unshift(persistedEvent)
        s.recentEvents=s.recentEvents.slice(0,5000)
      })
      await appendTrackedEvent(workspaceId,persistedEvent)
      let leadProfile=null
      if(body.customerId||body.email||body.phone||body.emailSha256||body.email_sha256||body.phoneSha256||body.phone_sha256||body.deviceId||body.device_id){
        leadProfile=await upsertLeadProfile(workspaceId,{
          externalLeadId:body.customerId||body.leadId||body.visitorId||body.deviceId||body.device_id,
          customerId:body.customerId,
          leadId:body.leadId,
          email:body.email,
          phone:body.phone,
          emailSha256:body.emailSha256||body.email_sha256,
          phoneSha256:body.phoneSha256||body.phone_sha256,
          deviceId:body.deviceId||body.device_id,
          devicePlatform:body.devicePlatform||body.device_platform,
          appId:body.appId||body.app_id,
          source:body.source||body.utm_source||'first_party',
          campaign:body.campaign||body.utm_campaign||null,
          crmStage:body.crmStage??body.stage,
          journeyDepth:body.journeyDepth??body.pagesViewed,
          pricingPageViews:body.pricingPageViews,
          conversionPropensity:body.conversionPropensity,
          ltvTier:body.ltvTier,
          lastActivity:body.occurredAt||event.receivedAt,
          attributes:{channel:body.channel||null,event:body.event||body.name||null,platform:body.platform||null,consentSubjectType:body.customerId?'customer':'visitor',consentSubjectId:trackingSubjectId}
        }).catch(()=>null)
      }
      let clickSession=null
      let assisted=null
      if(body.gclid||body.gbraid||body.wbraid||body.fbclid||body.msclkid||body.utm_source||body.utm_campaign||body.visitorId||body.deviceId||body.device_id){
        clickSession=await captureClickSession(workspaceId,{...body,eventId:event.id,userAgent:req.headers['user-agent']}).catch(()=>null)
      }
      if(body.assisted===true||['call','whatsapp','crm','pos','billing','offline'].includes(String(body.source||'').toLowerCase())){
        assisted=await recordAssistedEvent(workspaceId,{...body,eventId:body.eventId||event.id}).catch(()=>null)
      }
      const derived=await evaluateEventRules(workspaceId,{...body,eventId:body.eventId||event.id},{sourceEventId:event.id}).catch(()=>[])
      const derivedDeliveries=[]
      const activationRuns=[]
      if(derived.length){
        const marketingConsent=await consentAllows(workspaceId,{subjectType:body.customerId?'customer':'visitor',subjectId:trackingSubjectId,category:'marketing'})
        for(const match of derived){
          let queued=0
          if(marketingConsent.allowed){
            for(const destination of match.destinations){
              const deliveryId='sig_'+randomUUID()
              const idempotencyKey=createHash('sha256').update('event-rule:'+match.runId+':'+destination).digest('hex')
              const now=new Date().toISOString()
              const item={id:deliveryId,event:match.outputEvent,destination,customerId:body.customerId?String(body.customerId):null,externalEventId:match.assistedEvent?.id||match.runId,status:'queued',attempts:0,idempotencyKey,createdAt:now,updatedAt:now,nextAttemptAt:now}
              item.replayPayload=buildSignalReplayPayload({...body,event:match.outputEvent,destination,value:match.assistedEvent?.value??body.value??null,currency:match.assistedEvent?.currency||body.currency||null},{...item,idempotencyKey})
              await mutateState(s=>{s.signalDeliveries=s.signalDeliveries||[];s.signalDeliveries.unshift(item);s.signalDeliveries=s.signalDeliveries.slice(0,10000);s.audit.unshift({id:randomUUID(),action:'event-rule.signal.queued',entityId:deliveryId,ruleId:match.ruleId,destination,event:match.outputEvent,at:now});s.audit=s.audit.slice(0,1000)})
              const job=await handleSubmitJob({workspaceId,kind:'signal_delivery',idempotencyKey:'rule-signal:'+idempotencyKey,payload:item.replayPayload})
              derivedDeliveries.push({ruleId:match.ruleId,outputEvent:match.outputEvent,destination,deliveryId,jobId:job?.id||null})
              queued++
            }
          }
          await markEventRuleActivation(workspaceId,match.runId,queued).catch(()=>{})
        }
      }
      const activationState=await getState()
      const activationRules=(activationState.activationRules||[]).filter(rule=>activationRuleMatches(rule,body))
      if(activationRules.length){
        const marketingConsent=await consentAllows(workspaceId,{subjectType:body.customerId?'customer':'visitor',subjectId:trackingSubjectId,category:'marketing'})
        for(const rule of activationRules){
          const run={id:'actrun_'+randomUUID(),ruleId:rule.id,ruleName:rule.name,eventId:event.id,customerRef:String(body.customerId||body.leadId||body.visitorId||body.deviceId||body.device_id||''),actionType:rule.actionType,status:'queued',detail:'',createdAt:new Date().toISOString()}
          if(rule.requiresMarketingConsent&& !marketingConsent.allowed){
            run.status='skipped'
            run.detail='Marketing consent unavailable'
          }else{
            try{
              if(rule.actionType==='follow_up'){
                const task=await createFollowUp(workspaceId,{leadRef:run.customerRef,reason:rule.reason||rule.name,channel:rule.channel||'whatsapp',priority:rule.priority||'medium',delayMinutes:Number(rule.delayMinutes||0),owner:rule.owner||'Marketing automation'})
                run.status=task?'succeeded':'failed'
                run.detail=task?'Follow-up '+task.id+' created':'Follow-up store unavailable'
                run.operationId=task?.id||null
              }else if(rule.actionType==='route'){
                const routed=await routeLead(workspaceId,{leadRef:run.customerRef,score:Number(leadProfile?.score||body.score||0),source:body.source||'Real-time activation',routingRule:{name:rule.name,destination:rule.destination,reason:rule.reason||rule.name,slaSeconds:Math.max(60,Number(rule.slaSeconds||300))}})
                run.status=routed?'succeeded':'failed'
                run.detail=routed?'Routed to '+rule.destination:'Routing store unavailable'
                run.operationId=routed?.id||null
              }else if(rule.actionType==='signal'){
                const deliveryId='sig_'+randomUUID()
                const idempotencyKey=createHash('sha256').update('activation-rule:'+rule.id+':'+event.id+':'+rule.destination).digest('hex')
                const now=new Date().toISOString()
                const item={id:deliveryId,event:rule.outputEvent||body.event||body.eventType||'activation_event',destination:rule.destination,customerId:body.customerId?String(body.customerId):null,externalEventId:event.id,status:'queued',attempts:0,idempotencyKey,createdAt:now,updatedAt:now,nextAttemptAt:now}
                item.replayPayload=buildSignalReplayPayload({...body,event:item.event,destination:item.destination},{...item,idempotencyKey})
                const validationError=validateSignalDispatch(item.replayPayload)
                if(validationError){
                  run.status='failed';run.detail=validationError
                }else{
                  await mutateState(s=>{s.signalDeliveries=s.signalDeliveries||[];s.signalDeliveries.unshift(item);s.signalDeliveries=s.signalDeliveries.slice(0,10000)})
                  const job=await handleSubmitJob({workspaceId,kind:'signal_delivery',idempotencyKey:'activation:'+idempotencyKey,payload:item.replayPayload})
                  run.status='succeeded';run.detail='Signal queued for '+rule.destination;run.operationId=deliveryId;run.jobId=job?.id||null
                }
              }
            }catch(error){
              run.status='failed'
              run.detail=error instanceof Error?error.message:'Activation execution failed'
            }
          }
          activationRuns.push(run)
          await mutateState(s=>{
            s.activationRuleRuns=s.activationRuleRuns||[]
            s.activationRuleRuns.unshift(run)
            s.activationRuleRuns=s.activationRuleRuns.slice(0,2000)
            s.audit=s.audit||[]
            s.audit.unshift({id:randomUUID(),action:'activation_rule.executed',entityId:run.id,ruleId:rule.id,status:run.status,eventId:event.id,at:new Date().toISOString()})
            s.audit=s.audit.slice(0,1000)
          })
        }
      }
      return send(req,res,202,{accepted:true,eventId:event.id,leadProfileId:leadProfile?.id||null,clickSessionId:clickSession?.id||null,assistedEventId:assisted?.id||null,derivedEvents:derived.map(x=>({runId:x.runId,ruleId:x.ruleId,outputEvent:x.outputEvent,assistedEventId:x.assistedEvent?.id||null,destinations:x.destinations})),derivedDeliveries,activationRuns,match:assisted?{status:assisted.status,method:assisted.match_method,confidence:assisted.match_confidence}:null})
    }
    if (req.method === 'POST' && url.pathname === '/api/assisted-events') {
      const body=await readBody(req)
      if(!body.event&&!body.eventType) return send(req,res,400,{error:'event or eventType required'})
      const item=await recordAssistedEvent(workspaceId,body)
      if(!item) return send(req,res,503,{error:'attribution store unavailable'})
      return send(req,res,201,{id:item.id,status:item.status,matchMethod:item.match_method,matchConfidence:item.match_confidence,matchedSessionId:item.matched_session_id})
    }
    if (req.method === 'GET' && url.pathname === '/api/attribution-identity/stats') {
      const periodDays=Number(url.searchParams.get('periodDays')||0)||null
      const stats=await attributionStats(workspaceId,{periodDays})
      return send(req,res,200,stats)
    }
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

