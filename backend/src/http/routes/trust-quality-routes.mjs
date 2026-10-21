import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from '../../store.mjs'
import { getJob, queueAvailable, queueStats, requestJobCancellation } from '../../queue.mjs'
import { attributionStats, captureClickSession, closeAttributionStore, recordAssistedEvent, reconcileAttribution } from '../../attribution-store.mjs'
import { audienceOpsStats, closeLeadOps, createActivationRun, createAudience as createLeadAudience, getAudienceBundle, getLeadProfile, leadIdentityStats, leadOpsStats, listActivationRuns, listAudiences as listLeadAudiences, listLeadProfiles, materializeAudience, overrideLeadGrade as persistLeadGrade, previewAudience as previewLeadAudience, scoreLead, upsertLeadProfile, updateAudienceSyncState } from '../../lead-ops.mjs'
import {appendTrackedEvent,listTrackedEvents,trackedEventStats} from '../../tracked-events.mjs'
import {handleSubmitJob} from '../../../modules/jobs/src/application/commands/submit-job/submit-job.handler.mjs'

export async function handleTrustQualityRoutes({req,res,url,workspaceId,readBody,send:writeResponse,trackedEvents,buildSignalReplayPayload}) {
  const send=(...args)=>{writeResponse(...args);return true}
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

  return false
}
