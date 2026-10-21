import http from 'node:http'
import {parseQaWorkbook} from '../../qa-excel-fixtures.mjs'
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { URL } from 'node:url'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from '../../store.mjs'
import { getJob, queueAvailable, queueStats, requestJobCancellation } from '../../queue.mjs'
import { attributionStats, captureClickSession, closeAttributionStore, recordAssistedEvent, reconcileAttribution } from '../../attribution-store.mjs'
import { audienceOpsStats, closeLeadOps, createActivationRun, createAudience as createLeadAudience, getAudienceBundle, getLeadProfile, leadIdentityStats, leadOpsStats, listActivationRuns, listAudiences as listLeadAudiences, listLeadProfiles, materializeAudience, overrideLeadGrade as persistLeadGrade, previewAudience as previewLeadAudience, scoreLead, upsertLeadProfile, updateAudienceSyncState } from '../../lead-ops.mjs'
import { closeAgentOrchestrator, completeFollowUp as persistCompleteFollowUp, createAgentRun, createFollowUp, createMeeting, followUpStats, getMeeting, listAgentRuns, listFeedback as listPersistedFeedback, listFollowUps as listPersistedFollowUps, listMeetings as listPersistedMeetings, listRoutingDecisions, recordFeedback, rescheduleMeeting, routeLead, updateAgentRun } from '../../agent-orchestrator.mjs'
import {connectorReadCatalog,listConnectorSyncRuns,connectorDataSummary,listConnectorSyncSchedules,saveConnectorSyncSchedule,upsertCampaignDailyFact} from '../../connector-ingestion.mjs'
import {appendTrackedEvent,listTrackedEvents,trackedEventStats} from '../../tracked-events.mjs'
import { closeEventRules, createEventRule, evaluateEventRules, eventRuleStats, listEventRuleRuns, listEventRules, markEventRuleActivation, setEventRuleEnabled } from '../../event-rules.mjs'
import {handleSubmitJob} from '../../../modules/jobs/src/application/commands/submit-job/submit-job.handler.mjs'

export async function handleDataQualityRoutes({req,res,url,workspaceId,readBody,send:writeResponse,trackedEvents,buildSignalReplayPayload}) {
    const send=(...args)=>{writeResponse(...args);return true}
    if (req.method === 'GET' && url.pathname === '/api/events') {
      const [items,runs,stats]=await Promise.all([listEventRules(workspaceId),listEventRuleRuns(workspaceId,50),eventRuleStats(workspaceId)])
      return send(req,res,200,{items,runs,stats,templates:[
        {id:'pricing_page_lead',category:'Lead quality',name:'Pricing-page Lead',description:'Identify form submissions that showed pricing-page intent before converting.',useCase:'Prioritize high-commercial-intent leads and return a stronger optimization signal.',sourceEvent:'form_submitted',condition:{field:'properties.pricingPageViews',operator:'gte',value:1},outputEvent:'pricing_page_lead',destinations:['Google Ads','Meta Ads'],valueMode:'copy',currency:'INR'},
        {id:'new_customer_purchase',category:'Commerce',name:'New Customer Purchase',description:'Separate first-time buyers from repeat purchasers.',useCase:'Measure and optimize true new-customer acquisition and CAC.',sourceEvent:'purchase',condition:{field:'properties.customerType',operator:'equals',value:'new'},outputEvent:'new_customer_purchase',destinations:['Google Ads','Meta Ads'],valueMode:'copy',currency:'INR'},
        {id:'repeat_purchase',category:'Commerce',name:'Repeat Purchase',description:'Identify purchases from customers with prior completed orders.',useCase:'Build retention and loyalty cohorts and separate repeat revenue from acquisition revenue.',sourceEvent:'purchase',condition:{field:'properties.purchaseCount',operator:'gte',value:2},outputEvent:'repeat_purchase',destinations:['Google Ads','Meta Ads'],valueMode:'copy',currency:'INR'},
        {id:'abandoned_checkout',category:'Commerce',name:'Abandoned Checkout',description:'Accept a checkout-abandoned event emitted by your commerce webhook/backend after the configured inactivity window.',useCase:'Build recovery audiences and measure checkout leakage without pretending a stateless browser rule can detect elapsed time.',sourceEvent:'checkout_abandoned',condition:{field:'properties.reason',operator:'exists',value:null},outputEvent:'abandoned_checkout',destinations:['Google Ads','Meta Ads'],valueMode:'copy',currency:'INR'},
        {id:'high_value_purchase',category:'Commerce',name:'High-value Purchase',description:'Create a conversion signal only when order value crosses the configured threshold.',useCase:'Build high-value cohorts and teach bidding systems which purchases matter most.',sourceEvent:'purchase',condition:{field:'value',operator:'gte',value:4000},outputEvent:'high_value_purchase',destinations:['Google Ads','Meta Ads'],valueMode:'copy',currency:'INR'},
        {id:'category_interest_event',category:'Personalization',name:'Category Interest',description:'Create a category-specific intent signal from viewed or purchased product categories.',useCase:'Build category audiences and feed personalization workflows from first-party behavior.',sourceEvent:'product_interaction',condition:{field:'properties.productCategory',operator:'equals',value:'skin'},outputEvent:'category_interest',destinations:['Google Ads','Meta Ads'],valueMode:'copy',currency:'INR'},
        {id:'prepaid_order',category:'Commerce',name:'Prepaid Order',description:'Separate prepaid orders from cash-on-delivery or other payment modes.',useCase:'Optimize acquisition toward lower-risk, higher-confidence orders.',sourceEvent:'purchase',condition:{field:'properties.paymentType',operator:'equals',value:'prepaid'},outputEvent:'prepaid_order',destinations:['Google Ads','Meta Ads'],valueMode:'copy',currency:'INR'},
        {id:'fulfilled_order',category:'Commerce',name:'Fulfilled Order',description:'Promote only orders that progressed to fulfillment.',useCase:'Return post-purchase quality instead of optimizing only on checkout completion.',sourceEvent:'order_status',condition:{field:'properties.status',operator:'equals',value:'fulfilled'},outputEvent:'fulfilled_order',destinations:['Google Ads','Meta Ads'],valueMode:'copy',currency:'INR'},
        {id:'returned_order',category:'Commerce',name:'Returned Order',description:'Capture returned or rejected orders as a downstream quality signal.',useCase:'Exclude poor-fit cohorts from lookalikes and analyze return-driven waste.',sourceEvent:'order_status',condition:{field:'properties.status',operator:'equals',value:'returned'},outputEvent:'returned_order',destinations:[],valueMode:'copy',currency:'INR'},
        {id:'first_touch_attribution',category:'Attribution',name:'First-touch Attribution',description:'Capture the first known marketing touch for a stitched customer journey.',useCase:'Preserve acquisition-source evidence for first-touch reporting and journey analysis.',sourceEvent:'attribution_touch',condition:{field:'properties.touchType',operator:'equals',value:'first'},outputEvent:'first_touch_attribution',destinations:[],valueMode:'copy',currency:'INR'},
        {id:'last_touch_attribution',category:'Attribution',name:'Last-touch Attribution',description:'Capture the final marketing touch before a qualified or revenue outcome.',useCase:'Compare closing-channel influence against first-touch and multi-touch views.',sourceEvent:'attribution_touch',condition:{field:'properties.touchType',operator:'equals',value:'last'},outputEvent:'last_touch_attribution',destinations:[],valueMode:'copy',currency:'INR'}
      ]})
    }
    if (req.method === 'POST' && url.pathname === '/api/events/rules') {
      const body=await readBody(req)
      try{
        const item=await createEventRule(workspaceId,body,req.user?.email||req.user?.userId||null)
        return send(req,res,201,{item})
      }catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'invalid event rule'})}
    }
    if (req.method === 'POST' && url.pathname === '/api/events/rules/toggle') {
      const body=await readBody(req)
      if(!body.id||typeof body.enabled!=='boolean') return send(req,res,400,{error:'id and enabled boolean required'})
      const item=await setEventRuleEnabled(workspaceId,String(body.id),body.enabled)
      return item?send(req,res,200,{item}):send(req,res,404,{error:'event rule not found'})
    }
    if (req.method === 'GET' && url.pathname === '/api/adjustments') {
      const state=await getState()
      return send(req,res,200,{items:(state.adjustments||[]).slice(0,500)})
    }
    if (req.method === 'POST' && url.pathname === '/api/adjustments') {
      const body=await readBody(req)
      const event=String(body.event||'').trim()
      const source=String(body.source||'').trim()
      const destination=String(body.destination||'').trim()
      const reason=String(body.reason||'').trim()
      if(!event||!source||!destination||!reason) return send(req,res,400,{error:'event, source, destination and reason are required'})
      const parseValue=value=>{
        if(value==null||value==='')return null
        const numeric=Number(value)
        return Number.isFinite(numeric)?numeric:String(value).slice(0,200)
      }
      const now=new Date().toISOString()
      const item={
        id:'adj_'+randomUUID(),
        event:event.slice(0,160),
        source:source.slice(0,160),
        destination:destination.slice(0,160),
        fromValue:parseValue(body.fromValue),
        toValue:parseValue(body.toValue),
        currency:String(body.currency||'INR').slice(0,12),
        reason:reason.slice(0,500),
        status:'pending',
        createdAt:now,
        createdBy:req.user?.email||req.user?.userId||null
      }
      await mutateState(s=>{
        s.adjustments=s.adjustments||[]
        s.adjustments.unshift(item)
        s.adjustments=s.adjustments.slice(0,1000)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'adjustment.created',entityId:item.id,event:item.event,destination:item.destination,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item})
    }
    if (req.method === 'POST' && url.pathname === '/api/adjustments/preview') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      const state=await getState()
      const item=(state.adjustments||[]).find(x=>x.id===body.id)
      if(!item) return send(req,res,404,{error:'adjustment not found'})
      const payload={
        eventId:item.id,
        event:item.event,
        destination:item.destination,
        adjustment:{from:item.fromValue??null,to:item.toValue??null,currency:item.currency||null,reason:item.reason||null},
        idempotencyKey:createHash('sha256').update(workspaceId+':'+item.id).digest('hex')
      }
      return send(req,res,200,{item,payload,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/adjustments/apply') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      const now=new Date().toISOString()
      let updated=null
      await mutateState(s=>{
        const item=(s.adjustments||[]).find(x=>x.id===body.id)
        if(item){item.status='applied';item.appliedAt=now;item.updatedAt=now;updated={...item}}
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'adjustment.applied',entityId:String(body.id),at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return updated?send(req,res,200,{...updated,auditId:randomUUID()}):send(req,res,404,{error:'adjustment not found'})
    }
    if (req.method === 'GET' && url.pathname === '/api/fingerprinting') {
      const [attr,profiles,state]=await Promise.all([attributionStats(workspaceId),listLeadProfiles(workspaceId,500),getState()])
      const matched=Number(attr?.matchedEvents||0),unmatched=Number(attr?.unmatchedEvents||0),total=matched+unmatched
      const deviceProfiles=profiles.filter(x=>x.device_id).length
      const wa=(state.whatsappEvents||[]).filter(x=>x.kind==='message').length
      const calls=(state.callEvents||[]).length
      const scenarios=[
        {name:'third_party_checkout',evidence:Number(attr?.activeClickSessions||0),matchRate:total?Number((matched/total*100).toFixed(1)):null},
        {name:'whatsapp_handoff',evidence:wa,matchRate:wa&&total?Number((matched/total*100).toFixed(1)):null},
        {name:'call_handoff',evidence:calls,matchRate:calls&&total?Number((matched/total*100).toFixed(1)):null},
        {name:'returning_device',evidence:deviceProfiles,matchRate:deviceProfiles&&profiles.length?Number((deviceProfiles/profiles.length*100).toFixed(1)):null}
      ]
      return send(req,res,200,{available:true,continuityRate:total?Number((matched/total*100).toFixed(1)):null,ambiguousRate:total?Number((unmatched/total*100).toFixed(1)):null,scenarios,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/fingerprinting/test') {
      const body=await readBody(req)
      if(!body.scenario) return send(req,res,400,{error:'scenario required'})
      const [attr,profiles,state]=await Promise.all([attributionStats(workspaceId),listLeadProfiles(workspaceId,500),getState()])
      const key=String(body.scenario).toLowerCase()
      const evidence=key.includes('whatsapp')?(state.whatsappEvents||[]).length:key.includes('call')?(state.callEvents||[]).length:key.includes('device')?profiles.filter(x=>x.device_id).length:Number(attr?.activeClickSessions||0)
      const result={id:'fptest_'+randomUUID(),scenario:String(body.scenario),status:evidence>0?'evidence_available':'no_evidence',deterministicMatch:Number(attr?.matchedEvents||0)>0,evidenceCount:evidence,testedAt:new Date().toISOString()}
      await mutateState(s=>{s.fingerprintTests=s.fingerprintTests||[];s.fingerprintTests.unshift(result);s.fingerprintTests=s.fingerprintTests.slice(0,200);s.audit=s.audit||[];s.audit.unshift({id:randomUUID(),action:'fingerprinting.test',entityId:result.id,scenario:result.scenario,status:result.status,at:result.testedAt});s.audit=s.audit.slice(0,1000)})
      return send(req,res,200,result)
    }
    if (req.method === 'GET' && url.pathname === '/api/fingerprinting/matches') {
      const live=await attributionStats(workspaceId)
      return send(req,res,200,{items:(live?.recent||[]).filter(x=>x.status==='matched').slice(0,100),methods:live?.methods||[]})
    }
    if (req.method === 'GET' && url.pathname === '/api/sites') {
      const state=await getState()
      const settings=state.settings||{}
      const domainMap=new Map()
      const ensure=(domain,environment='production')=>{
        if(!domain)return null
        const clean=String(domain).replace(/^https?:\/\//,'').split('/')[0]
        if(!clean)return null
        const item=domainMap.get(clean)||{domain:clean,environment,events:0,lastEventAt:null}
        domainMap.set(clean,item)
        return item
      }
      ensure(settings.primaryDomain||state.launchpad?.primaryDomain||'')
      for(const event of trackedEvents){
        let domain=event.domain||event.host||''
        if(!domain&&event.url){try{domain=new URL(String(event.url)).host}catch{}}
        const item=ensure(domain,event.environment||'production')
        if(item){item.events++;const time=event.receivedAt||event.occurredAt||event.timestamp;if(time&&(!item.lastEventAt||Date.parse(time)>Date.parse(item.lastEventAt)))item.lastEventAt=time}
      }
      for(const cfg of state.sites||[]){const item=ensure(cfg.domain,cfg.environment||'production');if(item)Object.assign(item,cfg)}
      const totalTracked=Math.max(1,trackedEvents.length)
      const items=[...domainMap.values()].map(x=>({
        domain:x.domain,
        environment:x.environment||'production',
        pixel:x.events>0?'active':'needs_review',
        server:'connected',
        coverage:Number((x.events/totalTracked*100).toFixed(1)),
        events:x.events,
        lastEventAt:x.lastEventAt,
        consent:'workspace policy'
      }))
      return send(req,res,200,{items,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/sites') {
      const body=await readBody(req)
      const raw=String(body.domain||'').trim().toLowerCase()
      const domain=raw.replace(/^https?:\/\//,'').split('/')[0]
      if(!domain||!domain.includes('.')) return send(req,res,400,{error:'valid domain required'})
      const environment=['production','staging','development'].includes(String(body.environment||'').toLowerCase())?String(body.environment).toLowerCase():'production'
      const now=new Date().toISOString()
      let item=null
      await mutateState(s=>{
        s.sites=s.sites||[]
        const existing=s.sites.find(x=>String(x.domain).toLowerCase()===domain)
        if(existing){existing.environment=environment;existing.updatedAt=now;item={...existing};return}
        item={id:'site_'+randomUUID(),domain,environment,createdAt:now}
        s.sites.unshift(item)
        s.sites=s.sites.slice(0,200)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'site.created',entityId:item.id,domain,environment,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,item?.createdAt===now?201:200,{item})
    }
    if (req.method === 'POST' && url.pathname === '/api/sites/test') {
      const body=await readBody(req)
      if(!body.domain) return send(req,res,400,{error:'domain required'})
      const domain=String(body.domain)
      const matching=trackedEvents.filter(x=>{
        const raw=String(x.domain||x.host||x.url||'')
        return raw.includes(domain)
      })
      const state=await getState()
      const consentReady=Boolean((state.consentPreferences||state.settings?.consentMode||state.settings?.primaryDomain))
      const result={id:'sitetest_'+randomUUID(),domain,pixel:matching.length>0,server:true,consent:consentReady,crossDomain:matching.some(x=>x.customerId||x.visitorId||x.deviceId||x.device_id),eventsObserved:matching.length,testedAt:new Date().toISOString()}
      await mutateState(s=>{s.siteTests=s.siteTests||[];s.siteTests.unshift(result);s.siteTests=s.siteTests.slice(0,200)})
      return send(req,res,200,result)
    }
    if (req.method === 'GET' && url.pathname === '/api/sites/debug') {
      const domain=String(url.searchParams.get('domain')||'')
      const state=await getState()
      const source=[...trackedEvents].slice(-200).reverse()
      const persisted=(state.recentEvents||[]).slice(0,200)
      const items=[...source,...persisted].filter((x,index,arr)=>arr.findIndex(y=>String(y.id||y.eventId||'')===String(x.id||x.eventId||''))===index)
      return send(req,res,200,{domain,items:items.filter(x=>!domain||String(x.domain||x.host||x.url||'').includes(domain)).slice(0,100)})
    }
    if (req.method === 'GET' && url.pathname === '/api/match-quality') {
      const state=await getState()
      const events=(state.recentEvents||[]).slice(0,5000)
      const signalWeight={customerId:3,emailSha256:3,phoneSha256:3,deviceId:2,visitorId:2,gclid:2,gbraid:2,wbraid:2,fbclid:2,msclkid:2,oppref:2,obref:1,ipAddress:1,userAgent:1}
      const normalizedEvent=event=>({
        customerId:event.customerId||null,
        emailSha256:event.emailSha256||event.email_sha256||null,
        phoneSha256:event.phoneSha256||event.phone_sha256||null,
        deviceId:event.deviceId||event.device_id||null,
        visitorId:event.visitorId||null,
        gclid:event.gclid||null,gbraid:event.gbraid||null,wbraid:event.wbraid||null,
        fbclid:event.fbclid||null,msclkid:event.msclkid||null,
        oppref:event.oppref||event.openaiClickRef||null,obref:event.obref||event.openaiBrowserRef||null,
        ipAddress:event.ipAddress||null,userAgent:event.userAgent||null
      })
      const scoreOne=event=>{
        const ids=normalizedEvent(event)
        const present=Object.entries(ids).filter(([,value])=>Boolean(value)).map(([key])=>key)
        const points=present.reduce((n,key)=>n+(signalWeight[key]||0),0)
        const max=12
        const score=Math.min(100,Math.round(points/max*100))
        const missing=Object.keys(signalWeight).filter(key=>!ids[key])
        return {score,present,missing}
      }
      const rows=new Map()
      let totalScore=0, strong=0, weak=0
      const signalCounts=Object.fromEntries(Object.keys(signalWeight).map(k=>[k,0]))
      for(const event of events){
        const quality=scoreOne(event)
        totalScore+=quality.score
        if(quality.score>=70)strong++
        if(quality.score<40)weak++
        for(const key of quality.present)signalCounts[key]=(signalCounts[key]||0)+1
        const key=String(event.event||event.eventType||event.name||'unknown')
        const row=rows.get(key)||{event:key,count:0,totalScore:0,sourceCounts:{}}
        row.count++
        row.totalScore+=quality.score
        const source=String(event.source||event.channel||event.utm_source||'Unknown')
        row.sourceCounts[source]=(row.sourceCounts[source]||0)+1
        rows.set(key,row)
      }
      const items=[...rows.values()].map(row=>({
        event:row.event,
        count:row.count,
        averageScore:row.count?Math.round(row.totalScore/row.count):0,
        topSource:Object.entries(row.sourceCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'Unknown'
      })).sort((a,b)=>b.count-a.count)
      const coverage=Object.entries(signalCounts).map(([signal,count])=>({signal,count,rate:events.length?Number((count/events.length*100).toFixed(1)):0})).sort((a,b)=>b.rate-a.rate)
      const recommendations=[]
      const rate=s=>coverage.find(x=>x.signal===s)?.rate||0
      if(rate('emailSha256')<50)recommendations.push({key:'email_hash',title:'Increase hashed email coverage',detail:'Capture consented email earlier and hash it server-side before activation.',tab:'Data Hub'})
      if(rate('phoneSha256')<40)recommendations.push({key:'phone_hash',title:'Increase hashed phone coverage',detail:'Normalize and hash phone values server-side where users provide them.',tab:'Data Hub'})
      if(rate('customerId')<50)recommendations.push({key:'customer_id',title:'Persist a stable first-party customer ID',detail:'Use one durable customer/lead identifier across web, CRM and offline events.',tab:'Identity'})
      if(rate('gclid')+rate('gbraid')+rate('wbraid')<25)recommendations.push({key:'google_click_ids',title:'Improve Google click-ID capture',detail:'Preserve GCLID/GBRAID/WBRAID from landing session through conversion.',tab:'Sites'})
      if(rate('fbclid')<20)recommendations.push({key:'meta_click_id',title:'Improve Meta click-ID capture',detail:'Preserve Meta click/browser identifiers alongside first-party identity.',tab:'Sites'})
      if(rate('oppref')<10)recommendations.push({key:'oppref',title:'Preserve ChatGPT Ads oppref',detail:'Capture the OpenAI click reference from landing URLs and carry it into conversion events.',tab:'ChatGPT Ads'})
      if(rate('deviceId')<30)recommendations.push({key:'device_id',title:'Strengthen device identity',detail:'Persist deterministic first-party device IDs where available.',tab:'Fingerprinting'})
      const averageScore=events.length?Math.round(totalScore/events.length):0
      return send(req,res,200,{
        available:events.length>0,
        averageScore,
        totalEvents:events.length,
        strongEvents:strong,
        weakEvents:weak,
        strongRate:events.length?Number((strong/events.length*100).toFixed(1)):0,
        weakRate:events.length?Number((weak/events.length*100).toFixed(1)):0,
        coverage,
        items,
        recommendations,
        note:'AceMarketing internal identity-coverage score; not a provider-reported Meta, Google, or OpenAI match-quality score.',
        generatedAt:new Date().toISOString()
      })
    }
    if (req.method === 'GET' && url.pathname === '/api/fraud') {
      const [profiles,state]=await Promise.all([listLeadProfiles(workspaceId,500),getState()])
      const countDriver=key=>profiles.filter(x=>(x.score_drivers||[]).some(d=>d.key===key)).length
      const duplicates=countDriver('duplicate')
      const invalid=countDriver('invalid_contact')
      const fraudHigh=profiles.filter(x=>(x.score_drivers||[]).some(d=>d.key==='fraud'&&Number(d.points)<=-30)).length
      const lowQuality=profiles.filter(x=>x.grade==='D').length
      const recent=trackedEvents.filter(x=>Date.now()-Date.parse(x.receivedAt||x.occurredAt||0)<5*60*1000)
      const identityCounts=new Map()
      for(const event of recent){const id=event.customerId||event.visitorId||event.deviceId||event.device_id||event.emailSha256||event.phoneSha256;if(id)identityCounts.set(id,(identityCounts.get(id)||0)+1)}
      const burst=[...identityCounts.values()].filter(n=>n>=20).length
      const items=[
        {key:'duplicate_lead_burst',name:'Duplicate lead burst',severity:duplicates?'high':'info',affected:duplicates,source:'Lead profiles',description:'Profiles penalized by duplicate-identity scoring evidence.'},
        {key:'bot_form_activity',name:'High-velocity identity activity',severity:burst?'high':'info',affected:burst,source:'First-party events',description:'Identities generating unusually high event volume in a five-minute window.'},
        {key:'invalid_phone_pattern',name:'Invalid contact evidence',severity:invalid?'medium':'info',affected:invalid,source:'Lead profiles',description:'Profiles penalized by contact-validation evidence.'},
        {key:'high_fraud_score',name:'High fraud-risk profiles',severity:fraudHigh?'high':'info',affected:fraudHigh,source:'Lead scoring',description:'Profiles with the strongest fraud-risk penalty.'},
        {key:'low_quality_pool',name:'Low-quality lead pool',severity:lowQuality?'low':'info',affected:lowQuality,source:'Lead grades',description:'D-grade leads available for review or suppression policy.'}
      ].filter(x=>x.affected>0)
      return send(req,res,200,{items,blocked:state.fraudBlocks||[],reviews:(state.reviewQueue||[]).filter(x=>x.kind==='fraud'),generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/fraud/block') {
      const body=await readBody(req)
      if(!body.pattern) return send(req,res,400,{error:'pattern required'})
      const item={pattern:String(body.pattern),status:'blocked_from_optimization',ruleId:'fraud_'+randomUUID(),appliedAt:new Date().toISOString(),appliedBy:req.user?.email||req.user?.userId||null}
      await mutateState(s=>{s.fraudBlocks=s.fraudBlocks||[];if(!s.fraudBlocks.some(x=>x.pattern===item.pattern))s.fraudBlocks.unshift(item);s.fraudBlocks=s.fraudBlocks.slice(0,500);s.audit=s.audit||[];s.audit.unshift({id:randomUUID(),action:'fraud.blocked',entityId:item.ruleId,pattern:item.pattern,at:item.appliedAt});s.audit=s.audit.slice(0,1000)})
      return send(req,res,200,item)
    }
    if (req.method === 'POST' && url.pathname === '/api/fraud/review') {
      const body=await readBody(req)
      if(!body.pattern) return send(req,res,400,{error:'pattern required'})
      const now=new Date().toISOString()
      const item={id:'review_'+randomUUID(),kind:'fraud',pattern:String(body.pattern),status:'queued',createdAt:now,requestedBy:req.user?.email||req.user?.userId||null}
      await mutateState(s=>{
        s.reviewQueue=s.reviewQueue||[]
        s.reviewQueue.unshift(item)
        s.reviewQueue=s.reviewQueue.slice(0,1000)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'fraud.review_queued',entityId:item.id,pattern:item.pattern,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,202,item)
    }
    if (req.method === 'GET' && url.pathname === '/api/deep-links') {
      const state=await getState()
      const items=(state.deepLinks||[]).map(link=>{
        const events=(state.deepLinkEvents||[]).filter(x=>x.slug===link.slug)
        const clicks=events.filter(x=>x.kind==='click').length
        const appOpens=events.filter(x=>x.kind==='app_open').length
        const conversions=events.filter(x=>x.kind==='conversion').length
        return {...link,clicks,appOpens,conversions,conversionRate:clicks?Number((conversions/clicks*100).toFixed(1)):0}
      })
      return send(req,res,200,{items,stats:{active:items.filter(x=>x.status==='active').length,draft:items.filter(x=>x.status!=='active').length,clicks:items.reduce((n,x)=>n+x.clicks,0),appOpens:items.reduce((n,x)=>n+x.appOpens,0),conversions:items.reduce((n,x)=>n+x.conversions,0)},generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/deep-links') {
      const body=await readBody(req)
      if(!body.name||!body.slug||!body.target||!body.fallback) return send(req,res,400,{error:'name, slug, target and fallback required'})
      const slug=String(body.slug).trim().toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'')
      if(!slug)return send(req,res,400,{error:'valid slug required'})
      let created=null
      await mutateState(s=>{
        s.deepLinks=s.deepLinks||[]
        if(s.deepLinks.some(x=>x.slug===slug))return
        created={id:'dl_'+randomUUID(),name:String(body.name),slug,target:String(body.target),fallback:String(body.fallback),status:'draft',createdAt:new Date().toISOString()}
        s.deepLinks.unshift(created)
      })
      return created?send(req,res,201,created):send(req,res,409,{error:'slug already exists'})
    }
    if (req.method === 'POST' && url.pathname === '/api/deep-links/event') {
      const body=await readBody(req)
      if(!body.slug||!['click','app_open','conversion'].includes(String(body.kind))) return send(req,res,400,{error:'slug and valid kind required'})
      const event={id:'dle_'+randomUUID(),slug:String(body.slug),kind:String(body.kind),customerId:body.customerId||null,value:body.value??null,source:body.source||null,createdAt:new Date().toISOString()}
      await mutateState(s=>{s.deepLinkEvents=s.deepLinkEvents||[];s.deepLinkEvents.unshift(event);s.deepLinkEvents=s.deepLinkEvents.slice(0,10000)})
      return send(req,res,201,event)
    }
    if (req.method === 'POST' && url.pathname === '/api/deep-links/activate') {
      const body=await readBody(req)
      if(!body.slug) return send(req,res,400,{error:'slug required'})
      let updated=null
      await mutateState(s=>{const item=(s.deepLinks||[]).find(x=>x.slug===String(body.slug));if(item){item.status='active';item.activatedAt=new Date().toISOString();updated={...item}}})
      return updated?send(req,res,200,updated):send(req,res,404,{error:'deep link not found'})
    }
    if (req.method === 'GET' && url.pathname === '/api/reconciliation') {
      const [state,attr,eventStats]=await Promise.all([getState(),attributionStats(workspaceId),trackedEventStats(workspaceId)])
      const deliveries=state.signalDeliveries||[]
      const quarantined=state.quarantinedEvents||[]
      const adjustments=state.adjustments||[]
      const duplicateAudit=(state.audit||[]).filter(x=>String(x.action||'').includes('duplicate'))
      const grouped={}
      for(const item of deliveries){
        const key=String(item.destination||'Unknown')
        const row=grouped[key]||{destination:key,total:0,delivered:0,queued:0,failed:0}
        row.total++
        const status=String(item.status||'queued').toLowerCase()
        if(['delivered','succeeded'].includes(status))row.delivered++
        else if(['failed','dead_letter'].includes(status))row.failed++
        else row.queued++
        grouped[key]=row
      }
      const channels=Object.values(grouped).map(row=>({...row,successRate:row.total?Number((row.delivered/row.total*100).toFixed(1)):0,gap:Math.max(0,row.total-row.delivered)}))
      const matched=Number(attr?.matchedEvents||0),unmatched=Number(attr?.unmatchedEvents||0),assisted=Number(attr?.assistedEvents||0)
      const terminal=deliveries.filter(x=>['delivered','succeeded','failed','dead_letter'].includes(String(x.status||'').toLowerCase()))
      const failed=terminal.filter(x=>['failed','dead_letter'].includes(String(x.status||'').toLowerCase())).length
      const issues=[
        {key:'unmatched_attribution',label:'Unmatched attribution',count:unmatched,severity:unmatched?'warning':'healthy',detail:'Offline/assisted conversions without a deterministic or assisted match.',action:'reprocess'},
        {key:'failed_deliveries',label:'Failed deliveries',count:failed,severity:failed?'critical':'healthy',detail:'Provider signal deliveries that failed or reached dead-letter state.',action:'retry'},
        {key:'duplicate_evidence',label:'Duplicate evidence',count:duplicateAudit.length,severity:duplicateAudit.length?'warning':'healthy',detail:'Duplicate activity detected by idempotency/audit controls.',action:'review'},
        {key:'quarantined_events',label:'Quarantined events',count:quarantined.length,severity:quarantined.length?'warning':'healthy',detail:'Events isolated because schema or field validation requires review.',action:'review'}
      ]
      const score=Math.max(0,Math.min(100,100-Math.min(35,unmatched*2)-Math.min(30,failed*5)-Math.min(20,duplicateAudit.length*3)-Math.min(15,quarantined.length*2)))
      return send(req,res,200,{
        available:true,
        score,
        totals:{
          trackedEvents:Number(eventStats?.total??0),
          assistedEvents:assisted,
          matchedEvents:matched,
          unmatchedEvents:unmatched,
          deliveries:deliveries.length,
          failedDeliveries:failed,
          duplicates:duplicateAudit.length,
          quarantined:quarantined.length,
          pendingAdjustments:adjustments.filter(x=>String(x.status||'pending').toLowerCase()!=='applied').length
        },
        channels,
        issues,
        recentActions:(state.reconciliationActions||[]).slice(0,50),
        generatedAt:new Date().toISOString()
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/reconciliation/action') {
      const body=await readBody(req)
      const issue=String(body.issue||'').trim()
      if(!['unmatched_attribution','failed_deliveries','duplicate_evidence','quarantined_events'].includes(issue)) return send(req,res,400,{error:'valid reconciliation issue required'})
      let result={status:'queued',detail:'Review queued'}
      if(issue==='unmatched_attribution'){
        const r=await reconcileAttribution(workspaceId,Math.max(1,Math.min(500,Number(body.limit||250))))
        result={status:'completed',detail:'Attribution reconciliation completed',matched:Number(r?.matched||0),unmatched:Number(r?.unmatched||0)}
      }else if(issue==='failed_deliveries'){
        if(!queueAvailable()) return send(req,res,503,{error:'signal delivery queue unavailable',required:'DATABASE_URL'})
        const state=await getState()
        const failed=(state.signalDeliveries||[]).filter(x=>['failed','dead_letter'].includes(String(x.status||'').toLowerCase())).slice(0,Math.max(1,Math.min(250,Number(body.limit||100))))
        const now=new Date().toISOString()
        const jobs=[]
        for(const item of failed){
          await mutateState(s=>{
            const target=(s.signalDeliveries||[]).find(x=>x.id===item.id)
            if(target){target.status='queued';target.nextAttemptAt=now;target.updatedAt=now;target.lastError=null}
          })
          const replayPayload=item.replayPayload||buildSignalReplayPayload(item,item)
          const job=await handleSubmitJob({workspaceId,kind:'signal_delivery',idempotencyKey:'reconcile-retry:'+item.id+':'+Date.now(),payload:{...replayPayload,deliveryId:item.id,event:item.event,destination:item.destination,idempotencyKey:item.idempotencyKey}})
          jobs.push(job?.id||null)
        }
        result={status:'queued',detail:'Failed deliveries re-queued',replayed:failed.length,jobs:jobs.filter(Boolean)}
      }else{
        result={status:'review',detail:issue==='duplicate_evidence'?'Duplicate evidence queued for adjustment/review.':'Quarantined events queued for schema review.'}
      }
      const action={id:'recon_'+randomUUID(),issue,status:result.status,detail:result.detail,createdAt:new Date().toISOString(),createdBy:req.user?.email||req.user?.userId||'workspace',result}
      await mutateState(s=>{
        s.reconciliationActions=s.reconciliationActions||[]
        s.reconciliationActions.unshift(action)
        s.reconciliationActions=s.reconciliationActions.slice(0,500)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'reconciliation.action',entityId:action.id,issue,status:action.status,at:action.createdAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,action)
    }
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

