import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from '../../store.mjs'
import { attributionStats, captureClickSession, closeAttributionStore, recordAssistedEvent, reconcileAttribution } from '../../attribution-store.mjs'
import { audienceOpsStats, closeLeadOps, createActivationRun, createAudience as createLeadAudience, getAudienceBundle, getLeadProfile, leadIdentityStats, leadOpsStats, listActivationRuns, listAudiences as listLeadAudiences, listLeadProfiles, materializeAudience, overrideLeadGrade as persistLeadGrade, previewAudience as previewLeadAudience, scoreLead, upsertLeadProfile, updateAudienceSyncState } from '../../lead-ops.mjs'
import { closeAgentOrchestrator, completeFollowUp as persistCompleteFollowUp, createAgentRun, createFollowUp, createMeeting, followUpStats, getMeeting, listAgentRuns, listFeedback as listPersistedFeedback, listFollowUps as listPersistedFollowUps, listMeetings as listPersistedMeetings, listRoutingDecisions, recordFeedback, rescheduleMeeting, routeLead, updateAgentRun } from '../../agent-orchestrator.mjs'
import { closeConsentStore, consentAllows, consentStats, getConsent, listConsentAudit, saveConsent } from '../../consent.mjs'
import {appendTrackedEvent,listTrackedEvents,trackedEventStats} from '../../tracked-events.mjs'
import {trackingInputError} from '../../tracking-input.mjs'
import { closeEventRules, createEventRule, evaluateEventRules, eventRuleStats, listEventRuleRuns, listEventRules, markEventRuleActivation, setEventRuleEnabled } from '../../event-rules.mjs'
import {handleSubmitJob} from '../../../modules/jobs/src/application/commands/submit-job/submit-job.handler.mjs'

const activationValue=(body,field)=>{
  if(!field)return null
  if(Object.prototype.hasOwnProperty.call(body,field))return body[field]
  if(body.data&&typeof body.data==='object'&&Object.prototype.hasOwnProperty.call(body.data,field))return body.data[field]
  return null
}
const activationConditionMatches=(condition,body)=>{
  if(!condition||!condition.field)return true
  const actual=activationValue(body,String(condition.field))
  const expected=condition.value
  const op=String(condition.operator||'equals')
  if(op==='exists')return actual!==null&&actual!==undefined&&String(actual)!==''
  if(op==='not_exists')return actual===null||actual===undefined||String(actual)===''
  if(op==='contains')return String(actual||'').toLowerCase().includes(String(expected||'').toLowerCase())
  if(op==='greater_than')return Number(actual)>Number(expected)
  if(op==='less_than')return Number(actual)<Number(expected)
  if(op==='one_of')return String(expected||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).includes(String(actual||'').toLowerCase())
  return String(actual??'').toLowerCase()===String(expected??'').toLowerCase()
}
const activationRuleMatches=(rule,body)=>{
  if(String(rule.status||'active')!=='active')return false
  const trigger=String(rule.triggerEvent||'*').trim().toLowerCase()
  const eventName=String(body.event||body.eventType||body.name||'').trim().toLowerCase()
  if(trigger!=='*'&&trigger!==eventName)return false
  return (rule.conditions||[]).every(condition=>activationConditionMatches(condition,body))
}

export async function handleAttributionEngagementRoutes({req,res,url,workspaceId,readBody,send:writeResponse,trackedEvents}) {
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

  return false
}
