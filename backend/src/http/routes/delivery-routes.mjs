import { createHash, randomUUID } from 'node:crypto'
import { getState, mutateState } from '../../store.mjs'
import { queueAvailable, queueStats } from '../../queue.mjs'
import { consentAllows } from '../../consent.mjs'
import { handleSubmitJob } from '../../../modules/jobs/src/application/commands/submit-job/submit-job.handler.mjs'
import { validateOutboundDestination } from '../../platform/egress-policy.mjs'

export async function handleDeliveryRoutes({req,res,url,workspaceId,readBody,send:writeResponse,buildSignalReplayPayload,validateSignalDispatch,validateOutboundDestination:validateDestination,consentAllows:allowConsent,queueAvailable:isQueueAvailable,queueStats:getQueueStats,IS_PROD}) {
  const send=(...args)=>{writeResponse(...args);return true}
    if (req.method === 'GET' && url.pathname === '/api/chatgpt-ads') {
      const state=await getState()
      const deliveries=(state.signalDeliveries||[]).filter(x=>/chatgpt|openai/i.test(String(x.destination||'')))
      const recent=(state.recentEvents||[]).slice(0,500)
      const withOppref=recent.filter(x=>Boolean(x.oppref||x.openaiClickRef)).length
      const terminal=deliveries.filter(x=>['delivered','succeeded','failed','dead_letter'].includes(String(x.status||'').toLowerCase()))
      const delivered=terminal.filter(x=>['delivered','succeeded'].includes(String(x.status||'').toLowerCase())).length
      return send(req,res,200,{
        configured:Boolean(process.env.OPENAI_CONVERSIONS_API_KEY&&process.env.OPENAI_ADS_PIXEL_ID),
        pixelConfigured:Boolean(process.env.OPENAI_ADS_PIXEL_ID),
        conversionsKeyConfigured:Boolean(process.env.OPENAI_CONVERSIONS_API_KEY),
        supportedEventTypes:['appointment_scheduled','checkout_started','contents_viewed','custom','items_added','lead_created','order_created','page_viewed','registration_completed','subscription_created','trial_started','app_installed','app_opened'],
        deliveries:{total:deliveries.length,delivered,failed:terminal.length-delivered,queued:deliveries.filter(x=>['queued','retrying'].includes(String(x.status||'').toLowerCase())).length,deliveryRate:terminal.length?Number((delivered/terminal.length*100).toFixed(1)):null,recent:deliveries.slice(0,25)},
        matching:{recentEvents:recent.length,opprefEvents:withOppref,opprefCoverage:recent.length?Number((withOppref/recent.length*100).toFixed(1)):0},
        requiredEnvironment:['OPENAI_CONVERSIONS_API_KEY','OPENAI_ADS_PIXEL_ID'],
        generatedAt:new Date().toISOString()
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/chatgpt-ads/validate') {
      const body=await readBody(req)
      const candidate={...body,destination:'ChatGPT Ads',event:String(body.event||'lead_created'),actionSource:body.actionSource||'web'}
      const error=validateSignalDispatch(candidate)
      if(error) return send(req,res,400,{valid:false,error})
      const allowedTypes=new Set(['appointment_scheduled','checkout_started','contents_viewed','custom','items_added','lead_created','order_created','page_viewed','registration_completed','subscription_created','trial_started','app_installed','app_opened'])
      if(body.openaiEventType&&!allowedTypes.has(String(body.openaiEventType))) return send(req,res,400,{valid:false,error:'unsupported ChatGPT Ads event type'})
      return send(req,res,200,{valid:true,configured:Boolean(process.env.OPENAI_CONVERSIONS_API_KEY&&process.env.OPENAI_ADS_PIXEL_ID),payload:buildSignalReplayPayload(candidate,{id:'validation_only',idempotencyKey:'validation_only'}),notice:'Local payload validation only; no provider request was sent.'})
    }
    if (req.method === 'POST' && url.pathname === '/api/chatgpt-ads/send') {
      const body=await readBody(req)
      if(!queueAvailable()) return send(req,res,503,{error:'signal delivery queue unavailable',required:'DATABASE_URL'})
      const candidate={...body,destination:'ChatGPT Ads'}
      const validationError=validateSignalDispatch(candidate)
      if(validationError) return send(req,res,400,{error:validationError})
      if(body.customerId||body.visitorId){
        const consent=await consentAllows(workspaceId,{subjectType:body.customerId?'customer':'visitor',subjectId:body.customerId||body.visitorId,category:'marketing'})
        if(!consent.allowed) return send(req,res,403,{error:'marketing consent required',reason:consent.reason})
      }
      const rawKey=String(body.idempotencyKey||JSON.stringify([body.event,body.customerId||'',body.externalEventId||'',body.occurredAt||'',body.oppref||'']))
      const idempotencyKey=createHash('sha256').update('chatgpt-ads:'+rawKey).digest('hex')
      const state=await getState()
      const existing=(state.signalDeliveries||[]).find(x=>x.idempotencyKey===idempotencyKey)
      if(existing) return send(req,res,200,{duplicate:true,item:existing})
      const now=new Date().toISOString()
      const item={id:'sig_'+randomUUID(),event:String(body.event),destination:'ChatGPT Ads',customerId:body.customerId?String(body.customerId):null,externalEventId:body.externalEventId?String(body.externalEventId):null,status:'queued',attempts:0,idempotencyKey,createdAt:now,updatedAt:now,nextAttemptAt:now}
      item.replayPayload=buildSignalReplayPayload(candidate,{...item,idempotencyKey})
      await mutateState(s=>{
        s.signalDeliveries=s.signalDeliveries||[]
        s.signalDeliveries.unshift(item)
        s.signalDeliveries=s.signalDeliveries.slice(0,10000)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'chatgpt_ads.signal_queued',entityId:item.id,event:item.event,oppref:Boolean(body.oppref),at:now})
        s.audit=s.audit.slice(0,1000)
      })
      const job=await handleSubmitJob({workspaceId,kind:'signal_delivery',idempotencyKey:'chatgpt-ads:'+idempotencyKey,payload:item.replayPayload})
      return send(req,res,202,{duplicate:false,item,job:job?{id:job.id,status:job.status}:null})
    }
    if (req.method === 'GET' && url.pathname === '/api/signal-deliveries') {
      const state=await getState()
      const items=(state.signalDeliveries||[]).slice().sort((a,b)=>String(b.updatedAt||b.createdAt).localeCompare(String(a.updatedAt||a.createdAt)))
      const summary={
        total:items.length,
        delivered:items.filter(x=>x.status==='delivered').length,
        retrying:items.filter(x=>x.status==='retrying'||x.status==='queued').length,
        deadLetter:items.filter(x=>x.status==='dead_letter').length
      }
      return send(req,res,200,{summary,items})
    }
    if (req.method === 'POST' && url.pathname === '/api/signal-deliveries/dispatch') {
      const body=await readBody(req)
      const validationError=validateSignalDispatch(body)
      if(validationError) return send(req,res,400,{error:validationError})
      if(String(body.destination||'').toLowerCase().includes('webhook')&&body.webhookUrl){
        try{
          const validatedWebhook=await validateOutboundDestination(body.webhookUrl,{
            allowHttp:!IS_PROD&&process.env.CUSTOM_INTEGRATION_ALLOW_HTTP==='true',
            purpose:'webhook destination'
          })
          body.webhookUrl=validatedWebhook.url.toString()
        }catch(error){
          return send(req,res,400,{error:error instanceof Error?error.message:'invalid webhook URL',code:error?.code||'invalid_webhook_destination'})
        }
      }
      if(!queueAvailable()) return send(req,res,503,{error:'signal delivery queue unavailable',required:'DATABASE_URL'})
      if(body.customerId||body.visitorId){
        const consent=await consentAllows(workspaceId,{subjectType:body.customerId?'customer':'visitor',subjectId:body.customerId||body.visitorId,category:'marketing'})
        if(!consent.allowed) return send(req,res,403,{error:'marketing consent required',reason:consent.reason})
      }
      const rawKey=String(body.idempotencyKey||JSON.stringify([body.event,body.destination,body.customerId||'',body.externalEventId||'',body.occurredAt||'']))
      const idempotencyKey=createHash('sha256').update(rawKey).digest('hex')
      const state=await getState()
      const existing=(state.signalDeliveries||[]).find(x=>x.idempotencyKey===idempotencyKey)
      if(existing) return send(req,res,200,{duplicate:true,item:existing})
      const now=new Date().toISOString()
      const item={
        id:'sig_'+randomUUID(),
        event:String(body.event),
        destination:String(body.destination),
        customerId:body.customerId?String(body.customerId):null,
        externalEventId:body.externalEventId?String(body.externalEventId):null,
        status:'queued',
        attempts:0,
        idempotencyKey,
        createdAt:now,
        updatedAt:now,
        nextAttemptAt:now
      }
      item.replayPayload=buildSignalReplayPayload(body,{...item,idempotencyKey})
      await mutateState(s=>{
        s.signalDeliveries=s.signalDeliveries||[]
        s.signalDeliveries.unshift(item)
        s.signalDeliveries=s.signalDeliveries.slice(0,10000)
        s.audit.unshift({id:randomUUID(),action:'signal.queued',entityId:item.id,destination:item.destination,event:item.event,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      const job=await handleSubmitJob({
        workspaceId,
        kind:'signal_delivery',
        idempotencyKey:'signal:'+idempotencyKey,
        payload:item.replayPayload
      })
      return send(req,res,202,{duplicate:false,item,job:job?{id:job.id,status:job.status}:null})
    }
    if (req.method === 'POST' && url.pathname === '/api/signal-deliveries/retry') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      if(!queueAvailable()) return send(req,res,503,{error:'signal delivery queue unavailable',required:'DATABASE_URL'})
      let updated=null
      const now=new Date().toISOString()
      await mutateState(s=>{
        const item=(s.signalDeliveries||[]).find(x=>x.id===body.id)
        if(item){
          item.status='queued'
          item.nextAttemptAt=now
          item.updatedAt=now
          item.lastError=null
          updated={...item}
        }
        s.audit.unshift({id:randomUUID(),action:'signal.retry_queued',entityId:String(body.id),at:now})
        s.audit=s.audit.slice(0,1000)
      })
      if(updated){
        const replayPayload=updated.replayPayload||buildSignalReplayPayload(updated,updated)
        await handleSubmitJob({
          workspaceId,
          kind:'signal_delivery',
          idempotencyKey:'retry:'+updated.id+':'+Date.now(),
          payload:{...replayPayload,deliveryId:updated.id,event:updated.event,destination:updated.destination,idempotencyKey:updated.idempotencyKey}
        })
        return send(req,res,202,updated)
      }
      return send(req,res,404,{error:'delivery not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/signal-deliveries/replay-dlq') {
      if(!queueAvailable()) return send(req,res,503,{error:'signal delivery queue unavailable',required:'DATABASE_URL'})
      const now=new Date().toISOString()
      const replayItems=[]
      await mutateState(s=>{
        for(const item of (s.signalDeliveries||[])){
          if(item.status==='dead_letter'){
            item.status='queued'
            item.nextAttemptAt=now
            item.updatedAt=now
            item.lastError=null
            replayItems.push({...item})
          }
        }
        s.audit.unshift({id:randomUUID(),action:'signal.dlq_replayed',count:replayItems.length,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      const jobs=[]
      for(const item of replayItems){
        const replayPayload=item.replayPayload||buildSignalReplayPayload(item,item)
        const job=await handleSubmitJob({
          workspaceId,
          kind:'signal_delivery',
          idempotencyKey:'dlq-replay:'+item.id+':'+Date.now(),
          payload:{...replayPayload,deliveryId:item.id,event:item.event,destination:item.destination,idempotencyKey:item.idempotencyKey}
        })
        jobs.push(job?.id||null)
      }
      return send(req,res,202,{replayed:replayItems.length,jobs:jobs.filter(Boolean),queuedAt:now})
    }
    if (req.method === 'GET' && url.pathname === '/api/connector-health') {
      const state=await getState()
      const jobs=await queueStats(workspaceId)
      return send(req,res,200,{items:state.connectorHealth||[],jobs,checkedAt:new Date().toISOString()})
    }
    if (req.method === 'GET' && url.pathname === '/api/webhooks/deliveries') {
      const state=await getState()
      return send(req,res,200,{items:(state.webhookDeliveries||[]).slice(0,250),endpoints:(state.webhookEndpoints||[]).slice(0,100)})
    }
    if (req.method === 'GET' && url.pathname === '/api/webhooks/endpoints') {
      const state=await getState()
      return send(req,res,200,{items:(state.webhookEndpoints||[]).slice(0,100)})
    }
    if (req.method === 'POST' && url.pathname === '/api/webhooks/endpoints') {
      const body=await readBody(req)
      const event=String(body.event||'').trim()
      const target=String(body.url||'').trim()
      if(!event||!target) return send(req,res,400,{error:'event and url required'})
      let validatedTarget
      try{
        validatedTarget=await validateOutboundDestination(target,{
          allowHttp:!IS_PROD&&process.env.CUSTOM_INTEGRATION_ALLOW_HTTP==='true',
          purpose:'webhook destination'
        })
      }catch(error){
        return send(req,res,400,{error:error instanceof Error?error.message:'invalid webhook URL',code:error?.code||'invalid_webhook_destination'})
      }
      const now=new Date().toISOString()
      const item={id:'wh_'+randomUUID(),event,url:validatedTarget.url.toString(),status:'active',createdAt:now,updatedAt:now}
      await mutateState(s=>{
        s.webhookEndpoints=s.webhookEndpoints||[]
        s.webhookEndpoints.unshift(item)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'webhook.endpoint_created',entityId:item.id,event:item.event,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,item)
    }
    if (req.method === 'POST' && url.pathname === '/api/webhooks/retry') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      let item=null
      const now=new Date().toISOString()
      await mutateState(s=>{
        const delivery=(s.webhookDeliveries||[]).find(x=>x.id===body.id)
        if(delivery){
          delivery.status='queued'
          delivery.updatedAt=now
          delivery.attempts=Number(delivery.attempts||0)+1
          delivery.lastError=null
          item={...delivery}
        }
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'webhook.retry_queued',entityId:String(body.id),at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return item?send(req,res,202,item):send(req,res,404,{error:'webhook delivery not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/webhooks/secret/rotate') {
      const secret='whsec_'+randomUUID().replaceAll('-','')+randomBytes(8).toString('hex')
      const fingerprint=createHash('sha256').update(secret).digest('hex')
      const createdAt=new Date().toISOString()
      await mutateState(s=>{
        s.webhookSigningSecret={fingerprint,createdAt}
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'webhook.secret_rotated',entityId:fingerprint.slice(0,12),at:createdAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{secret,createdAt,notice:'Store this secret now; only its SHA-256 fingerprint is persisted.'})
    }

  return false
}

