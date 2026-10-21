import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { URL } from 'node:url'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from '../../store.mjs'
import { attributionStats, captureClickSession, closeAttributionStore, recordAssistedEvent, reconcileAttribution } from '../../attribution-store.mjs'
import { audienceOpsStats, closeLeadOps, createActivationRun, createAudience as createLeadAudience, getAudienceBundle, getLeadProfile, leadIdentityStats, leadOpsStats, listActivationRuns, listAudiences as listLeadAudiences, listLeadProfiles, materializeAudience, overrideLeadGrade as persistLeadGrade, previewAudience as previewLeadAudience, scoreLead, upsertLeadProfile, updateAudienceSyncState } from '../../lead-ops.mjs'
import { closeEventRules, createEventRule, evaluateEventRules, eventRuleStats, listEventRuleRuns, listEventRules, markEventRuleActivation, setEventRuleEnabled } from '../../event-rules.mjs'

export async function handleEventQualityRoutes({req,res,url,workspaceId,readBody,send:writeResponse,trackedEvents,buildSignalReplayPayload}) {
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

  return false
}
