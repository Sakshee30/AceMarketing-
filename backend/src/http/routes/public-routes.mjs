import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from '../../store.mjs'
import { closeConsentStore, consentAllows, consentStats, getConsent, listConsentAudit, saveConsent } from '../../consent.mjs'
import { publicNavigation, publicIndustries, publicAgents, publicIntegrations, publicChallenges, publicCaseStudies, publicResources, publicResourceCenter } from '../../public-content.mjs'
import { parseWhatsAppWebhook, resolveWhatsAppWorkspace, sendWhatsAppMessage, verifyWhatsAppWebhookChallenge, verifyWhatsAppWebhookSignature } from '../../whatsapp-cloud.mjs'

export async function handlePublicRoutes({req,res,url,workspaceId,readBody,send:writeResponse}) {
    const send=(...args)=>{writeResponse(...args);return true}
    if (req.method === 'GET' && url.pathname === '/api/public/navigation') return send(req,res,200,publicNavigation)
    if (req.method === 'GET' && url.pathname === '/api/public/industries') return send(req,res,200,{items:publicIndustries})
    if (req.method === 'GET' && url.pathname === '/api/public/agents') return send(req,res,200,{items:publicAgents})
    if (req.method === 'GET' && url.pathname === '/api/public/integrations') return send(req,res,200,{groups:publicIntegrations})
    if (req.method === 'POST' && url.pathname === '/api/public/connector-requests') {
      const body=await readBody(req)
      const connector=String(body.connector||'').trim()
      const email=String(body.email||'').trim().toLowerCase()
      const company=String(body.company||'').trim()
      const businessNeed=String(body.businessNeed||body.message||'').trim()
      if(connector.length<2||connector.length>120) return send(req,res,400,{error:'connector must be 2-120 characters'})
      if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)||email.length>254) return send(req,res,400,{error:'valid business email required'})
      if(company.length>160) return send(req,res,400,{error:'company must be 160 characters or fewer'})
      if(businessNeed.length>1200) return send(req,res,400,{error:'businessNeed must be 1200 characters or fewer'})
      const item={
        id:'pub_ireq_'+randomUUID(),connector,email,company:company||null,businessNeed:businessNeed||null,
        status:'captured',source:'public_integrations',createdAt:new Date().toISOString()
      }
      await mutateState(s=>{
        s.publicConnectorRequests=s.publicConnectorRequests||[]
        s.publicConnectorRequests.unshift(item)
        s.publicConnectorRequests=s.publicConnectorRequests.slice(0,5000)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'public.integration_requested',entityId:item.id,connector:item.connector,at:item.createdAt})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{id:item.id,status:item.status,connector:item.connector})
    }
    if (req.method === 'GET' && url.pathname === '/api/public/challenges') return send(req,res,200,{items:publicChallenges})
    if (req.method === 'GET' && url.pathname === '/api/public/case-studies') return send(req,res,200,{items:publicCaseStudies})
    if (req.method === 'GET' && url.pathname === '/api/public/resources') return send(req,res,200,{items:publicResources})
    if (req.method === 'GET' && url.pathname === '/api/public/resource-center') return send(req,res,200,publicResourceCenter)
    if (req.method === 'GET' && url.pathname === '/api/ctwa-attribution') {
      const state=await getState()
      const whatsapp=(state.whatsappEvents||[]).filter(x=>x.kind==='message'&&x.referral?.ctwaClid)
      const tracked=(state.recentEvents||[]).filter(x=>x?.data?.ctwaClid||x?.ctwaClid)
      const combined=[...whatsapp.map(x=>({
        id:x.id,phone:x.from||'',at:x.timestamp||x.receivedAt||null,ctwaClid:x.referral?.ctwaClid||'',
        sourceId:x.referral?.sourceId||'',sourceUrl:x.referral?.sourceUrl||'',headline:x.referral?.headline||'',
        event:'whatsapp.message_received',value:0,currency:null
      })),...tracked.map(x=>({
        id:x.id||x.eventId||randomUUID(),phone:x.phone||'',at:x.occurredAt||x.receivedAt||x.timestamp||null,
        ctwaClid:x.data?.ctwaClid||x.ctwaClid||'',sourceId:x.data?.sourceId||'',sourceUrl:x.data?.sourceUrl||'',
        headline:x.data?.headline||'',event:x.event||x.eventType||x.name||'event',value:Number(x.value||x.data?.value||0),currency:x.currency||x.data?.currency||null
      }))].filter(x=>x.ctwaClid)
      const byClick=new Map()
      for(const item of combined){
        const row=byClick.get(item.ctwaClid)||{ctwaClid:item.ctwaClid,sourceId:item.sourceId||'',sourceUrl:item.sourceUrl||'',headline:item.headline||'',messages:0,events:0,conversionValue:0,contacts:new Set(),lastActivity:null}
        if(item.event==='whatsapp.message_received')row.messages+=1
        else row.events+=1
        if(item.phone)row.contacts.add(String(item.phone))
        if(Number.isFinite(item.value)&&item.value>0)row.conversionValue+=Number(item.value)
        if(!row.sourceId&&item.sourceId)row.sourceId=item.sourceId
        if(!row.sourceUrl&&item.sourceUrl)row.sourceUrl=item.sourceUrl
        if(!row.headline&&item.headline)row.headline=item.headline
        if(item.at&&(!row.lastActivity||Date.parse(item.at)>Date.parse(row.lastActivity)))row.lastActivity=item.at
        byClick.set(item.ctwaClid,row)
      }
      const items=[...byClick.values()].map(x=>({...x,contacts:x.contacts.size})).sort((a,b)=>Date.parse(b.lastActivity||0)-Date.parse(a.lastActivity||0))
      return send(req,res,200,{
        available:true,
        stats:{
          referredMessages:whatsapp.length,
          attributedClicks:items.length,
          uniqueContacts:new Set(whatsapp.map(x=>x.from).filter(Boolean)).size,
          conversionValue:items.reduce((sum,x)=>sum+Number(x.conversionValue||0),0)
        },
        items:items.slice(0,200)
      })
    }
    if (req.method === 'GET' && url.pathname === '/api/call-events') {
      const state=await getState()
      return send(req,res,200,{items:(state.callEvents||[]).slice(0,200)})
    }
    if (req.method === 'GET' && url.pathname === '/api/whatsapp/messages') {
      const state=await getState()
      return send(req,res,200,{items:(state.whatsappEvents||[]).slice(0,200)})
    }
    if (req.method === 'POST' && url.pathname === '/api/whatsapp/messages') {
      const body=await readBody(req)
      const to=String(body.to||'').replace(/\D/g,'')
      if(!to) return send(req,res,400,{error:'recipient phone is required'})
      const purpose=String(body.purpose||'transactional').toLowerCase()
      if(purpose==='marketing'){
        const subjectId=String(body.customerId||to)
        const consent=await consentAllows(workspaceId,{subjectType:body.customerId?'customer':'visitor',subjectId,category:'marketing'})
        if(!consent.allowed) return send(req,res,403,{error:'marketing consent required',reason:consent.reason})
      }
      try{
        const result=await sendWhatsAppMessage(workspaceId,body)
        const now=new Date().toISOString()
        await mutateState(s=>{
          s.whatsappEvents=s.whatsappEvents||[]
          s.whatsappEvents.unshift({
            kind:'outbound',
            id:result.externalId||('wa_out_'+randomUUID()),
            phoneNumberId:String(body.phoneNumberId||process.env.WHATSAPP_PHONE_NUMBER_ID||''),
            recipientId:to,
            messageType:body.templateName?'template':'text',
            text:body.text?String(body.text).slice(0,4000):'',
            templateName:body.templateName||null,
            status:'accepted',
            timestamp:now,
            provider:'whatsapp_cloud',
            latencyMs:result.latencyMs,
            receivedAt:now
          })
          s.whatsappEvents=s.whatsappEvents.slice(0,10000)
          s.audit=s.audit||[]
          s.audit.unshift({id:randomUUID(),action:'whatsapp.message.sent',entityId:result.externalId||null,recipient:to,at:now})
          s.audit=s.audit.slice(0,1000)
        })
        return send(req,res,202,{accepted:true,provider:result.provider,externalId:result.externalId,latencyMs:result.latencyMs})
      }catch(error){
        return send(req,res,400,{error:error instanceof Error?error.message:'WhatsApp message failed'})
      }
    }
    if (req.method === 'POST' && url.pathname === '/api/pricing/recommend') {
      const body=await readBody(req)
      const challenges=Array.isArray(body.challenges)?body.challenges:[]
      const names=[]
      if(challenges.includes('Lead quality')) names.push('Meta Advanced CAPI','Google ECL / OCI','Call Tracking Events','Custom Integration')
      if(challenges.includes('Conversion leakage')) names.push('Lead Grading','CRM Enrichment','Voice Lead Qualification','Voice Scheduler','Meeting Reminder','Feedback Agent','Lead Reactivation')
      if(challenges.includes('Attribution')) names.push('Ask Ace')
      return send(req,res,200,{recommended:[...new Set(names)],generatedAt:new Date().toISOString()})
    }
    if (req.method === 'POST' && url.pathname === '/api/pricing/quote') {
      const body=await readBody(req)
      const leads=Number(body.leads||0)
      const channels=Array.isArray(body.channels)?body.channels:[]
      const agents=Array.isArray(body.agents)?body.agents:[]
      if(!Number.isFinite(leads)||leads<1) return send(req,res,400,{error:'valid lead volume required'})
      if(channels.length===0) return send(req,res,400,{error:'at least one channel required'})
      if(agents.length===0) return send(req,res,400,{error:'at least one agent required'})
      const item={id:'quote_'+randomUUID(),status:'captured',leads,channels,agents,dataHomes:Array.isArray(body.dataHomes)?body.dataHomes:[],challenges:Array.isArray(body.challenges)?body.challenges:[],createdAt:new Date().toISOString()}
      await mutateState(s=>{s.quoteRequests.unshift(item);s.quoteRequests=s.quoteRequests.slice(0,5000);s.audit.unshift({id:randomUUID(),action:'pricing.quote_requested',entityId:item.id,at:item.createdAt})})
      return send(req,res,201,item)
    }

    return false
}

