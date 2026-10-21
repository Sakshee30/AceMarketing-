import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from '../../store.mjs'
import { attributionStats, captureClickSession, closeAttributionStore, recordAssistedEvent, reconcileAttribution } from '../../attribution-store.mjs'
import { audienceOpsStats, closeLeadOps, createActivationRun, createAudience as createLeadAudience, getAudienceBundle, getLeadProfile, leadIdentityStats, leadOpsStats, listActivationRuns, listAudiences as listLeadAudiences, listLeadProfiles, materializeAudience, overrideLeadGrade as persistLeadGrade, previewAudience as previewLeadAudience, scoreLead, upsertLeadProfile, updateAudienceSyncState } from '../../lead-ops.mjs'
import {connectorReadCatalog,listConnectorSyncRuns,connectorDataSummary,listConnectorSyncSchedules,saveConnectorSyncSchedule,upsertCampaignDailyFact} from '../../connector-ingestion.mjs'
import {appendTrackedEvent,listTrackedEvents,trackedEventStats} from '../../tracked-events.mjs'

export async function handleDataOperationsRoutes({req,res,url,workspaceId,readBody,send:writeResponse,trackedEvents}) {
    const send=(...args)=>{writeResponse(...args);return true}
    if (req.method === 'GET' && url.pathname === '/api/data-hub') {
      const [state,leadStats,attr,providerData]=await Promise.all([getState(),leadOpsStats(workspaceId),attributionStats(workspaceId),connectorDataSummary(workspaceId).catch(()=>({available:false,raw:[],campaigns:[],crm:[]}))])
      const now=Date.now()
      const sourceMap=new Map()
      const touch=(name,type,eventTime,count=1,status='healthy',fields=[])=>{
        const key=String(name||'Unknown')
        const current=sourceMap.get(key)||{name:key,type,records:0,lastEventAt:null,status,fields:new Set()}
        current.records+=Number(count||0)
        if(eventTime&&(!current.lastEventAt||Date.parse(eventTime)>Date.parse(current.lastEventAt)))current.lastEventAt=eventTime
        if(status!=='healthy')current.status=status
        for(const field of fields)current.fields.add(field)
        sourceMap.set(key,current)
      }
      for(const event of trackedEvents){
        const source=event.source||event.channel||event.utm_source||'First-party web/app'
        touch(source,'first_party',event.receivedAt||event.occurredAt||event.timestamp,1,'healthy',Object.keys(event).filter(k=>!['id','receivedAt'].includes(k)).slice(0,12))
      }
      const waEvents=(state.whatsappEvents||[])
      const waLatest=waEvents.map(x=>x.timestamp||x.receivedAt).filter(Boolean).sort().at(-1)||null
      if(waEvents.length)touch('WhatsApp','messaging',waLatest,waEvents.length,'healthy',['phone','message','status','timestamp'])
      const callEvents=(state.callEvents||[])
      const callLatest=callEvents.map(x=>x.endedAt||x.startedAt||x.receivedAt).filter(Boolean).sort().at(-1)||null
      if(callEvents.length)touch('Telephony','calling',callLatest,callEvents.length,'healthy',['phone','duration','status','campaign'])
      if(leadStats?.available)touch('Lead profiles','crm_identity',new Date().toISOString(),Number(leadStats.total||0),'healthy',['customer_id','email_hash','phone_hash','stage','grade','device_id'])
      if(attr?.available)touch('Attribution store','measurement',new Date().toISOString(),Number(attr.assistedEvents||0)+Number(attr.activeClickSessions||0),'healthy',['click_id','session','event','match_method','value'])
      const deliveries=(state.signalDeliveries||[])
      if(deliveries.length)touch('Activation deliveries','activation',deliveries[0]?.updatedAt||deliveries[0]?.createdAt||null,deliveries.length,deliveries.some(x=>['failed','dead_letter'].includes(String(x.status||'').toLowerCase()))?'review':'healthy',['event','destination','status','attempts'])
      for(const item of providerData.raw||[]){
        touch(item.connector,'provider_sync',item.last_ingested_at,Number(item.rows||0),'healthy',[item.stream,'raw_record'])
      }
      for(const item of providerData.campaigns||[]){
        if(!sourceMap.has(item.connector))touch(item.connector,'provider_campaigns',item.max_day,Number(item.rows||0),'healthy',['campaign','spend','impressions','clicks','conversions','conversion_value'])
      }
      for(const health of state.connectorHealth||[]){
        if(!sourceMap.has(health.name))touch(health.name,'connector',health.checkedAt||health.updatedAt||null,0,['healthy','connected','active'].includes(String(health.status||'').toLowerCase())?'healthy':'review',['connection_state'])
      }
      const sources=[...sourceMap.values()].map(x=>({
        name:x.name,
        type:x.type,
        records:x.records,
        lastEventAt:x.lastEventAt,
        freshnessSeconds:x.lastEventAt?Math.max(0,Math.floor((now-Date.parse(x.lastEventAt))/1000)):null,
        status:x.status,
        fields:[...x.fields]
      })).sort((a,b)=>b.records-a.records)
      const records=sources.reduce((sum,x)=>sum+x.records,0)
      const quarantined=Number((state.quarantinedEvents||[]).length)
      const schemaHealth=records?Number((Math.max(0,records-quarantined)/records*100).toFixed(2)):100
      const recent=[
        ...trackedEvents.slice(-40).map(x=>({id:x.id||randomUUID(),time:x.receivedAt||x.occurredAt||x.timestamp,source:x.source||x.channel||x.utm_source||'First-party',kind:'event',operation:'append',status:'healthy'})),
        ...waEvents.slice(0,20).map(x=>({id:'wa:'+x.id,time:x.timestamp||x.receivedAt,source:'WhatsApp',kind:x.kind||'message',operation:'append',status:x.error?'review':'healthy'})),
        ...callEvents.slice(0,20).map(x=>({id:'call:'+x.id,time:x.endedAt||x.startedAt||x.receivedAt,source:'Telephony',kind:'call',operation:'append',status:'healthy'})),
        ...deliveries.slice(0,20).map(x=>({id:'delivery:'+x.id,time:x.updatedAt||x.createdAt,source:x.destination||'Activation',kind:x.event||'signal',operation:'deliver',status:['failed','dead_letter'].includes(String(x.status||'').toLowerCase())?'review':'healthy'}))
      ].filter(x=>x.time).sort((a,b)=>Date.parse(b.time)-Date.parse(a.time)).slice(0,50)
      return send(req,res,200,{available:true,records,knownIdentities:Number(leadStats?.total||0),schemaHealth,quarantined,matchedEvents:Number(attr?.matchedEvents||0),sources,recent,providerData,generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/data-hub/rebuild') {
      const [state,leadStats,attr,eventStats]=await Promise.all([getState(),leadOpsStats(workspaceId),attributionStats(workspaceId),trackedEventStats(workspaceId).catch(()=>({total:trackedEvents.length}))])
      const snapshot={
        id:'dh_'+randomUUID(),
        scope:'canonical_view',
        status:'completed',
        trackedEvents:trackedEvents.length,
        leadProfiles:Number(leadStats?.total||0),
        assistedEvents:Number(attr?.assistedEvents||0),
        clickSessions:Number(attr?.activeClickSessions||0),
        whatsappEvents:Number((state.whatsappEvents||[]).length),
        callEvents:Number((state.callEvents||[]).length),
        signalDeliveries:Number((state.signalDeliveries||[]).length),
        quarantinedEvents:Number((state.quarantinedEvents||[]).length),
        completedAt:new Date().toISOString()
      }
      await mutateState(s=>{
        s.dataHubRebuilds=s.dataHubRebuilds||[]
        s.dataHubRebuilds.unshift(snapshot)
        s.dataHubRebuilds=s.dataHubRebuilds.slice(0,100)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'data_hub.canonical_snapshot_rebuilt',entityId:snapshot.id,at:snapshot.completedAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,snapshot)
    }
    if (req.method === 'GET' && url.pathname === '/api/live-sync') {
      const state=await getState()
      const [recentTracked,eventStats]=await Promise.all([
        listTrackedEvents(workspaceId,{limit:250}).catch(()=>trackedEvents.slice(-250).reverse()),
        trackedEventStats(workspaceId).catch(()=>({lastMinute:0}))
      ])
      const lastMinuteCount=Number(eventStats?.lastMinute||0)
      const deliveries=(state.signalDeliveries||[]).slice(0,1000)
      const delivered=deliveries.filter(x=>x.status==='delivered')
      const successful=deliveries.filter(x=>['delivered','succeeded'].includes(String(x.status||'').toLowerCase())).length
      const terminal=deliveries.filter(x=>['delivered','succeeded','dead_letter','failed'].includes(String(x.status||'').toLowerCase())).length
      const latencies=delivered.map(x=>Number(x.latencyMs||x.providerResponse?.latencyMs||0)).filter(x=>Number.isFinite(x)&&x>=0).sort((a,b)=>a-b)
      const medianLatencyMs=latencies.length?latencies[Math.floor(latencies.length/2)]:null
      const byDestination={}
      for(const item of deliveries){
        const key=String(item.destination||'Unknown')
        byDestination[key]=byDestination[key]||{destination:key,total:0,delivered:0,failed:0}
        byDestination[key].total++
        if(['delivered','succeeded'].includes(String(item.status||'').toLowerCase()))byDestination[key].delivered++
        if(['dead_letter','failed'].includes(String(item.status||'').toLowerCase()))byDestination[key].failed++
      }
      const destinationThroughput=Object.values(byDestination).map(x=>({...x,deliveryRate:x.total?Number((x.delivered/x.total*100).toFixed(2)):0}))
      const recent=[
        ...recentTracked.slice(0,50).map(x=>({
          id:x.id||x.eventId||randomUUID(),
          time:x.receivedAt||x.occurredAt||x.timestamp||null,
          source:x.source||x.channel||'First-party',
          event:x.event||x.eventType||x.name||'event',
          destination:'Ingestion',
          status:'accepted',
          matchKey:x.customerId?'customer_id':x.deviceId||x.device_id?'device_id':x.gclid?'gclid':x.fbclid?'fbclid':x.visitorId?'visitor_id':'event_id'
        })),
        ...deliveries.slice(0,50).map(x=>({
          id:x.id,
          time:x.updatedAt||x.createdAt||null,
          source:'Activation queue',
          event:x.event||'signal',
          destination:x.destination||'Unknown',
          status:x.status||'queued',
          matchKey:x.customerId?'customer_id':x.replayPayload?.gclid?'gclid':x.replayPayload?.emailSha256?'email_sha256':x.replayPayload?.phoneSha256?'phone_sha256':'event_id'
        }))
      ].sort((a,b)=>Date.parse(b.time||0)-Date.parse(a.time||0)).slice(0,50)
      return send(req,res,200,{
        available:true,
        status:recentTracked.length||deliveries.length?'active':'idle',
        medianLatencyMs,
        deliveryRate:terminal?Number((successful/terminal*100).toFixed(2)):null,
        eventsPerMinute:lastMinuteCount,
        recent,
        destinations:destinationThroughput,
        generatedAt:new Date().toISOString()
      })
    }
    if (req.method === 'GET' && url.pathname === '/api/matchback') {
      const [live,state]=await Promise.all([attributionStats(workspaceId),getState()])
      return send(req,res,200,{
        live,
        rules:state.matchbackRules||[],
        unmatched:live.available?Number(live.unmatchedEvents||0):0,
        templates:[
          {name:'Closed-won revenue',source:'crm_billing',eventType:'closed_won',destination:'Google Ads',identityMethod:'customer_id + click ID'},
          {name:'Enrolment conversion',source:'crm',eventType:'enrolment',destination:'Meta Ads',identityMethod:'customer_id + hashed contact'},
          {name:'WhatsApp consultation sale',source:'crm_whatsapp',eventType:'closed_won',destination:'Google Ads + Meta Ads',identityMethod:'phone + click history'},
          {name:'Offline store sale',source:'pos_crm',eventType:'store_sale',destination:'Google Ads + Meta Ads',identityMethod:'customer_id / hashed contact / click ID'}
        ]
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/matchback/rules') {
      const body=await readBody(req)
      const name=String(body.name||'').trim()
      const source=String(body.source||'').trim()
      const eventType=String(body.eventType||'').trim()
      const destination=String(body.destination||'').trim()
      const identityMethod=String(body.identityMethod||'').trim()
      if(!name||!source||!eventType||!destination||!identityMethod) return send(req,res,400,{error:'name, source, eventType, destination and identityMethod are required'})
      const now=new Date().toISOString()
      const item={id:'mb_'+randomUUID(),name:name.slice(0,160),source:source.slice(0,120),eventType:eventType.slice(0,120),destination:destination.slice(0,160),identityMethod:identityMethod.slice(0,240),status:'active',createdAt:now}
      await mutateState(s=>{
        s.matchbackRules=s.matchbackRules||[]
        s.matchbackRules.unshift(item)
        s.matchbackRules=s.matchbackRules.slice(0,200)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'matchback.rule_created',entityId:item.id,name:item.name,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item})
    }
    if (req.method === 'POST' && url.pathname === '/api/matchback/rules/toggle') {
      const body=await readBody(req)
      if(!body.id||typeof body.enabled!=='boolean') return send(req,res,400,{error:'id and enabled are required'})
      let updated=null
      await mutateState(s=>{
        const item=(s.matchbackRules||[]).find(x=>x.id===body.id)
        if(item){item.status=body.enabled?'active':'paused';item.updatedAt=new Date().toISOString();updated={...item}}
      })
      return updated?send(req,res,200,{item:updated}):send(req,res,404,{error:'matchback rule not found'})
    }
    if (req.method === 'GET' && url.pathname === '/api/matchback/unmatched') {
      const live=await attributionStats(workspaceId)
      return send(req,res,200,{items:(live?.recent||[]).filter(x=>x.status==='unmatched'),total:Number(live?.unmatchedEvents||0)})
    }
    if (req.method === 'POST' && url.pathname === '/api/matchback/reconcile') {
      const body=await readBody(req)
      if(!body.ruleId) return send(req,res,400,{error:'ruleId required'})
      const state=await getState()
      const rule=(state.matchbackRules||[]).find(x=>x.id===body.ruleId)
      if(!rule) return send(req,res,404,{error:'matchback rule not found'})
      if(rule.status==='paused') return send(req,res,409,{error:'matchback rule is paused'})
      const result=await reconcileAttribution(workspaceId,body.limit||250)
      const completedAt=new Date().toISOString()
      await mutateState(s=>{
        const item=(s.matchbackRules||[]).find(x=>x.id===body.ruleId)
        if(item){item.lastRunAt=completedAt;item.lastRunStatus='reconciled';item.lastRunMatched=Number(result?.matched||0);item.lastRunUnmatched=Number(result?.unmatched||0)}
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'matchback.reconciled',entityId:body.ruleId,name:rule.name,matched:Number(result?.matched||0),unmatched:Number(result?.unmatched||0),at:completedAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,{ruleId:body.ruleId,rule:rule.name,status:'reconciled',...result,completedAt})
    }
    if (req.method === 'GET' && url.pathname === '/api/pos-stores') {
      const state=await getState()
      const batches=state.posBatches||[]
      const locations=new Map()
      for(const batch of batches){
        const key=String(batch.location)
        const row=locations.get(key)||{name:batch.locationName||key,id:key,transactions:0,revenue:0,matched:0,imports:0,lastImportAt:null}
        row.transactions+=Number(batch.records||0);row.revenue+=Number(batch.revenue||0);row.matched+=Number(batch.matched||0);row.imports++;row.lastImportAt=batch.createdAt
        locations.set(key,row)
      }
      const items=[...locations.values()].map(x=>({...x,matchRate:x.transactions?Number((x.matched/x.transactions*100).toFixed(1)):0,status:x.transactions&&x.matched<x.transactions?'review':'healthy'}))
      return send(req,res,200,{locations:items,totals:{transactions:items.reduce((n,x)=>n+x.transactions,0),revenue:items.reduce((n,x)=>n+x.revenue,0),matched:items.reduce((n,x)=>n+x.matched,0),imports:batches.length},recent:batches.slice(0,50),generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/pos-stores/import') {
      const body=await readBody(req)
      const location=String(body.location||'').trim()
      const rows=Array.isArray(body.transactions)?body.transactions.slice(0,500):[]
      if(!location||!rows.length) return send(req,res,400,{error:'location and at least one transaction row are required'})
      const createdAt=new Date().toISOString()
      const normalized=[]
      let matched=0
      let revenue=0
      for(let index=0;index<rows.length;index++){
        const row=rows[index]||{}
        const transactionId=String(row.transactionId||row.transaction_id||'').trim()||('row_'+(index+1))
        const value=Math.max(0,Number(row.netRevenue??row.net_revenue??row.value??0)||0)
        const occurredAt=row.occurredAt||row.occurred_at||createdAt
        const currency=String(row.currency||body.currency||'INR').slice(0,12)
        const event=await recordAssistedEvent(workspaceId,{
          event:'store_sale',
          eventType:'store_sale',
          eventId:'pos_'+location+'_'+transactionId,
          customerId:row.customerId||row.customer_id||null,
          email:row.email||null,
          phone:row.phone||null,
          gclid:row.gclid||null,
          fbclid:row.fbclid||null,
          msclkid:row.msclkid||null,
          ttclid:row.ttclid||null,
          twclid:row.twclid||null,
          source:'pos',
          occurredAt,
          value,
          currency,
          data:{location,transactionId,batchImport:true}
        }).catch(()=>null)
        if(event?.status==='matched')matched++
        revenue+=value
        normalized.push({
          transactionId,
          status:event?.status||'unavailable',
          matchMethod:event?.match_method||null,
          value,
          currency,
          occurredAt
        })
      }
      const records=normalized.length
      const batch={
        batchId:'pos_'+randomUUID(),
        location,
        locationName:String(body.locationName||location),
        records,
        revenue:Number(revenue.toFixed(2)),
        matched,
        unmatched:records-matched,
        matchRate:records?Number((matched/records*100).toFixed(1)):0,
        status:'processed',
        createdAt,
        sample:normalized.slice(0,25)
      }
      await mutateState(s=>{
        s.posBatches=s.posBatches||[]
        s.posBatches.unshift(batch)
        s.posBatches=s.posBatches.slice(0,2000)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'pos.import_processed',entityId:batch.batchId,location:batch.location,records,matched,revenue:batch.revenue,at:batch.createdAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,batch)
    }
    if (req.method === 'GET' && url.pathname === '/api/offline-attribution') {
      const [state,stats]=await Promise.all([getState(),attributionStats(workspaceId)])
      const calls=(state.callEvents||[])
      const whatsapp=(state.whatsappEvents||[]).filter(x=>x.kind==='message')
      const connectedCalls=calls.filter(x=>['answered','completed','connected','qualified'].includes(String(x.status||'').toLowerCase()))
      const waWithIdentity=whatsapp.filter(x=>x.from)
      return send(req,res,200,{
        generatedAt:new Date().toISOString(),
        callAttribution:{
          events:calls.length,
          connected:connectedCalls.length,
          providers:[...new Set(calls.map(x=>x.provider).filter(Boolean))],
          method:'first-party identity + click/session reconciliation'
        },
        whatsapp:{
          messages:whatsapp.length,
          identifiable:waWithIdentity.length,
          identifiers:['phone','gclid','fbclid','customer_id']
        },
        attribution:{
          available:Boolean(stats?.available),
          matchedEvents:Number(stats?.matchedEvents||0),
          unmatchedEvents:Number(stats?.unmatchedEvents||0),
          matchRate:Number(stats?.matchRate||0),
          matchedValue:Number(stats?.matchedValue||0)
        },
        rules:state.offlineAttributionRules||[],
        templates:[
          {conversion:'Inbound Call',source:'Telephony',match:'first-party identity + session/click reconciliation',identifier:'Phone / click ID',destination:['Google Ads','Meta Ads']},
          {conversion:'WhatsApp Enquiry',source:'WhatsApp',match:'persisted click/customer identity + phone',identifier:'Phone / GCLID / FBCLID',destination:['Google Ads','Meta Ads']},
          {conversion:'Partial Payment',source:'Custom Backend',match:'customer_id + order mapping',identifier:'Customer ID / order ID',destination:['Google Ads']},
          {conversion:'Walk-in / Offline Sale',source:'CRM / POS',match:'hashed phone/email + click history',identifier:'Hashed contact / click ID',destination:['Google Ads','Meta Ads']}
        ]
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/offline-attribution/rules') {
      const body=await readBody(req)
      const conversion=String(body.conversion||'').trim()
      const source=String(body.source||'').trim()
      const match=String(body.match||'').trim()
      const identifier=String(body.identifier||'').trim()
      const destination=Array.isArray(body.destination)?body.destination.map(String).filter(Boolean):[String(body.destination||'').trim()].filter(Boolean)
      if(!conversion||!source||!match||!identifier||!destination.length) return send(req,res,400,{error:'conversion, source, match, identifier and destination are required'})
      const now=new Date().toISOString()
      const item={id:'off_'+randomUUID(),conversion:conversion.slice(0,160),source:source.slice(0,160),match:match.slice(0,300),identifier:identifier.slice(0,200),destination:destination.slice(0,5),status:'active',createdAt:now}
      await mutateState(s=>{
        s.offlineAttributionRules=s.offlineAttributionRules||[]
        s.offlineAttributionRules.unshift(item)
        s.offlineAttributionRules=s.offlineAttributionRules.slice(0,200)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'offline_attribution.rule_created',entityId:item.id,conversion:item.conversion,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item})
    }
    if (req.method === 'POST' && url.pathname === '/api/offline-attribution/rules/toggle') {
      const body=await readBody(req)
      if(!body.id||typeof body.enabled!=='boolean') return send(req,res,400,{error:'id and enabled are required'})
      let updated=null
      await mutateState(s=>{
        const item=(s.offlineAttributionRules||[]).find(x=>x.id===body.id)
        if(item){item.status=body.enabled?'active':'paused';item.updatedAt=new Date().toISOString();updated={...item}}
      })
      return updated?send(req,res,200,{item:updated}):send(req,res,404,{error:'offline attribution rule not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/offline-attribution/test') {
      const body=await readBody(req)
      const state=await getState()
      const rule=(state.offlineAttributionRules||[]).find(x=>x.id===body.ruleId)
      if(!rule) return send(req,res,404,{error:'offline attribution rule not found'})
      if(rule.status==='paused') return send(req,res,409,{error:'offline attribution rule is paused'})
      const eventId='offtest_'+randomUUID()
      const item=await recordAssistedEvent(workspaceId,{
        event:body.event||rule.conversion.toLowerCase().replace(/[^a-z0-9]+/g,'_'),
        eventType:body.eventType||rule.conversion.toLowerCase().replace(/[^a-z0-9]+/g,'_'),
        eventId,
        customerId:body.customerId||null,
        email:body.email||null,
        phone:body.phone||null,
        gclid:body.gclid||null,
        fbclid:body.fbclid||null,
        source:rule.source,
        occurredAt:new Date().toISOString(),
        value:Number(body.value||0),
        currency:String(body.currency||'INR'),
        data:{offlineRuleId:rule.id,test:true}
      })
      if(!item) return send(req,res,503,{error:'attribution store unavailable'})
      const now=new Date().toISOString()
      await mutateState(s=>{
        const saved=(s.offlineAttributionRules||[]).find(x=>x.id===rule.id)
        if(saved){saved.lastTestAt=now;saved.lastTestStatus=item.status;saved.lastTestMethod=item.match_method||null}
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'offline_attribution.rule_tested',entityId:rule.id,eventId,status:item.status,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{id:item.id,status:item.status,matchMethod:item.match_method,matchConfidence:item.match_confidence,matchedSessionId:item.matched_session_id})
    }

    return false
}
