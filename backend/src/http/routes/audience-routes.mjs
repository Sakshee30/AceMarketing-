import { randomUUID } from 'node:crypto'
import { getState, mutateState } from '../../store.mjs'
import { audienceOpsStats, createActivationRun, createAudience as createLeadAudience, getAudienceBundle, listActivationRuns, listAudiences as listLeadAudiences, listLeadProfiles, materializeAudience, previewAudience as previewLeadAudience, updateAudienceSyncState } from '../../lead-ops.mjs'
import { listAudienceRefreshRuns, listAudienceSchedules, saveAudienceSchedule } from '../../audience-scheduler.mjs'
import { listAlerts as listLiveAlerts, resolveAlert as resolveLiveAlert } from '../../observability.mjs'
import { handleSubmitJob } from '../../../modules/jobs/src/application/commands/submit-job/submit-job.handler.mjs'

export async function handleAudienceRoutes({req,res,url,workspaceId,readBody,send:writeResponse,trackedEvents}) {
  const send=(...args)=>{writeResponse(...args);return true}
    if (req.method === 'GET' && url.pathname === '/api/behavior') {
      const state=await getState()
      const sourceEvents=(state.recentEvents||[]).length?(state.recentEvents||[]):trackedEvents
      const countBy=(selector)=>{
        const map=new Map()
        for(const event of sourceEvents){
          const key=String(selector(event)||'Unknown').trim()||'Unknown'
          map.set(key,(map.get(key)||0)+1)
        }
        return [...map.entries()].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count)
      }
      const eventCounts=new Map()
      let known=0,highIntent=0,deviceIdentified=0
      for(const event of sourceEvents){
        const name=String(event.event||event.eventType||event.name||'event')
        eventCounts.set(name,(eventCounts.get(name)||0)+1)
        if(event.customerId||event.visitorId||event.deviceId||event.device_id||event.emailSha256||event.email_sha256||event.phoneSha256||event.phone_sha256)known++
        if(event.deviceId||event.device_id)deviceIdentified++
        if(/pricing|checkout|book|consult|apply|purchase|revenue|qualified|enrol|closed_won/i.test(name))highIntent++
      }
      const events=[...eventCounts.entries()].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count)
      const sources=countBy(event=>event.utm_source||event.source||event.channel||'Direct / First-party')
      const campaigns=countBy(event=>event.utm_campaign||event.campaign||'Unattributed campaign')
      const devices=countBy(event=>event.devicePlatform||event.device_platform||event.platform||'Unknown device')
      const total=sourceEvents.length
      return send(req,res,200,{
        events,
        sources,
        campaigns,
        devices,
        stats:{
          events:total,
          knownIdentities:known,
          knownIdentityRate:total?Number((known/total*100).toFixed(1)):0,
          deviceIdentifiedEvents:deviceIdentified,
          deviceIdentityRate:total?Number((deviceIdentified/total*100).toFixed(1)):0,
          highIntentEvents:highIntent,
          highIntentRate:total?Number((highIntent/total*100).toFixed(1)):0
        },
        recent:sourceEvents.slice(0,100),
        persistence:(state.recentEvents||[]).length?'workspace_store':'process_window',
        generatedAt:new Date().toISOString()
      })
    }
    if (req.method === 'GET' && url.pathname === '/api/feed') {
      const [profiles,state]=await Promise.all([listLeadProfiles(workspaceId,200),getState()])
      const attrs=new Map()
      const add=(key,source,value)=>{if(!key)return;const entry=attrs.get(key)||{key,source,count:0,sample:null,status:'mapped'};entry.count++;if(entry.sample==null&&value!=null&&typeof value!=='object')entry.sample=String(value).slice(0,120);attrs.set(key,entry)}
      for(const p of profiles){
        add('lead_score','model',p.score);add('lead_grade','model',p.grade);add('lifecycle_stage','crm',p.crm_stage);add('device_platform','identity',p.device_platform);add('app_id','identity',p.app_id)
        for(const [k,v] of Object.entries(p.attributes||{}))add(k,'profile',v)
        for(const [k,v] of Object.entries(p.journey||{}))add(k,'journey',v)
      }
      for(const x of state.customFeedAttributes||[])attrs.set(x.key,{...x,status:'mapped'})
      const deliveries=state.signalDeliveries||[]
      const destinations=[...new Set(deliveries.map(x=>x.destination).filter(Boolean))].map(destination=>{const list=deliveries.filter(x=>x.destination===destination);const enriched=list.filter(x=>Object.keys(x.replayPayload?.data||{}).length>0).length;return {destination,total:list.length,enriched,enrichedRate:list.length?Number((enriched/list.length*100).toFixed(1)):0}})
      return send(req,res,200,{attributes:[...attrs.values()],mappings:(state.feedMappings||[]),stats:{activeAttributes:attrs.size,profiles:profiles.length,deliveries:deliveries.length,quarantined:Number((state.quarantinedEvents||[]).length)},destinations})
    }
    if (req.method === 'POST' && url.pathname === '/api/feed/attributes') {
      const body=await readBody(req)
      const key=String(body.key||'').trim()
      if(!/^[A-Za-z][A-Za-z0-9_]{1,63}$/.test(key))return send(req,res,400,{error:'attribute key must be 2-64 alphanumeric/underscore characters'})
      const item={key,source:String(body.source||'custom'),sample:body.sample==null?null:String(body.sample).slice(0,120),status:'mapped',createdAt:new Date().toISOString()}
      await mutateState(s=>{s.customFeedAttributes=s.customFeedAttributes||[];const i=s.customFeedAttributes.findIndex(x=>x.key===key);if(i>=0)s.customFeedAttributes[i]=item;else s.customFeedAttributes.unshift(item);s.customFeedAttributes=s.customFeedAttributes.slice(0,500)})
      return send(req,res,201,item)
    }
    if (req.method === 'POST' && url.pathname === '/api/feed/mappings') {
      const body=await readBody(req)
      const sourceKey=String(body.sourceKey||'').trim()
      const destination=String(body.destination||'').trim()
      const targetKey=String(body.targetKey||'').trim()
      if(!/^[A-Za-z][A-Za-z0-9_]{1,63}$/.test(sourceKey))return send(req,res,400,{error:'sourceKey must be 2-64 alphanumeric/underscore characters'})
      if(!destination||!targetKey)return send(req,res,400,{error:'destination and targetKey are required'})
      const now=new Date().toISOString()
      const item={id:'feedmap_'+randomUUID(),sourceKey,destination:destination.slice(0,120),targetKey:targetKey.slice(0,120),transform:String(body.transform||'copy').slice(0,60),enabled:true,createdAt:now}
      await mutateState(s=>{
        s.feedMappings=s.feedMappings||[]
        const i=s.feedMappings.findIndex(x=>x.sourceKey===sourceKey&&x.destination===item.destination&&x.targetKey===item.targetKey)
        if(i>=0)s.feedMappings[i]={...s.feedMappings[i],...item,id:s.feedMappings[i].id,createdAt:s.feedMappings[i].createdAt,updatedAt:now}
        else s.feedMappings.unshift(item)
        s.feedMappings=s.feedMappings.slice(0,500)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'feed.mapping_saved',entityId:item.id,sourceKey,destination:item.destination,targetKey:item.targetKey,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item})
    }
    if (req.method === 'POST' && url.pathname === '/api/feed/mappings/toggle') {
      const body=await readBody(req)
      if(!body.id||typeof body.enabled!=='boolean')return send(req,res,400,{error:'id and enabled required'})
      let updated=null
      await mutateState(s=>{
        const item=(s.feedMappings||[]).find(x=>x.id===body.id)
        if(item){item.enabled=body.enabled;item.updatedAt=new Date().toISOString();updated={...item}}
      })
      return updated?send(req,res,200,{item:updated}):send(req,res,404,{error:'feed mapping not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/feed/preview') {
      const body=await readBody(req)
      const state=await getState()
      const profiles=await listLeadProfiles(workspaceId,20)
      const destination=String(body.destination||'').trim()
      const mappings=(state.feedMappings||[]).filter(x=>x.enabled!==false&&(!destination||x.destination===destination))
      const profile=profiles[0]||null
      const lookup=(key)=>{
        if(!profile)return null
        if(key==='lead_score')return profile.score
        if(key==='lead_grade')return profile.grade
        if(key==='lifecycle_stage')return profile.crm_stage
        if(key==='device_platform')return profile.device_platform
        if(key==='app_id')return profile.app_id
        if(Object.prototype.hasOwnProperty.call(profile.attributes||{},key))return profile.attributes[key]
        if(Object.prototype.hasOwnProperty.call(profile.journey||{},key))return profile.journey[key]
        const custom=(state.customFeedAttributes||[]).find(x=>x.key===key)
        return custom?.sample??null
      }
      const payload={}
      for(const mapping of mappings){
        let value=lookup(mapping.sourceKey)
        if(mapping.transform==='string'&&value!=null)value=String(value)
        if(mapping.transform==='number'&&value!=null&&Number.isFinite(Number(value)))value=Number(value)
        payload[mapping.targetKey]=value
      }
      return send(req,res,200,{destination:destination||null,profileId:profile?.id||null,mappings:mappings.length,payload,generatedAt:new Date().toISOString(),notice:profile?'Preview generated from the latest persisted profile plus custom attribute samples.':'No persisted profile available; custom samples may still appear.'})
    }
    if (req.method === 'GET' && url.pathname === '/api/solutions') return send(req,res,200,{items:['Agency','Lead Generation','Enterprise','Mid Market Brand','Attribution Model','Alerts and Monitoring','Server to Server Integration']})
    if (req.method === 'GET' && url.pathname === '/api/exclusions') {
      const [audiences,stats]=await Promise.all([listLeadAudiences(workspaceId),audienceOpsStats(workspaceId)])
      const suppressions=audiences.filter(x=>String(x.mode||'').toLowerCase()==='suppress')
      const presets=[
        {key:'converted_customers',name:'Converted customers',description:'Exclude customers who already reached a converted/customer stage.',condition:'CRM stage',operator:'is one of',value:'converted,enrolled,closed_won,customer',identityMode:'auto'},
        {key:'low_quality_leads',name:'Low-quality leads',description:'Exclude Grade C/D leads from acquisition optimization or prospecting.',condition:'Lead grade',operator:'is one of',value:'C,D',identityMode:'auto'},
        {key:'device_ids',name:'Known device IDs',description:'Exclude known first-party device IDs to reduce repeat prospecting exposure.',condition:'Device ID present',operator:'is',value:'yes',identityMode:'device'}
      ]
      const previews=[]
      for(const preset of presets){
        const preview=await previewLeadAudience(workspaceId,{name:preset.name,condition:preset.condition,operator:preset.operator,value:preset.value,destination:'Meta Ads, Google Ads',mode:'Suppress',identityMode:preset.identityMode}).catch(()=>({available:false,estimatedSize:0,matchedPercent:0}))
        previews.push({...preset,preview})
      }
      return send(req,res,200,{
        items:suppressions.map(x=>({id:x.id,name:x.name,size:x.matched_size,estimatedSize:x.estimated_size,destination:x.destination,identityMode:x.identity_mode,status:x.status,definition:x.definition,providerState:x.provider_state,lastSyncedAt:x.last_synced_at,lastSyncError:x.last_sync_error})),
        presets:previews,
        stats:{
          total:suppressions.length,
          active:suppressions.filter(x=>['active','ready_for_sync','syncing'].includes(String(x.status||'').toLowerCase())).length,
          suppressedIdentities:Number(stats?.audiences?.suppressedIdentities||0),
          converted:Number(stats?.exclusions?.converted||0),
          lowQuality:Number(stats?.exclusions?.lowQuality||0),
          deviceIds:Number(stats?.exclusions?.deviceIds||0)
        }
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/exclusions/create') {
      const body=await readBody(req)
      const presets={
        converted_customers:{name:'Converted customers',condition:'CRM stage',operator:'is one of',value:'converted,enrolled,closed_won,customer',identityMode:'auto'},
        low_quality_leads:{name:'Low-quality leads',condition:'Lead grade',operator:'is one of',value:'C,D',identityMode:'auto'},
        device_ids:{name:'Known device IDs',condition:'Device ID present',operator:'is',value:'yes',identityMode:'device'}
      }
      const preset=presets[String(body.preset||'')]
      if(!preset) return send(req,res,400,{error:'valid exclusion preset required'})
      const destination=String(body.destination||'Meta Ads, Google Ads').trim()
      if(!destination) return send(req,res,400,{error:'destination required'})
      const existing=(await listLeadAudiences(workspaceId)).find(x=>String(x.mode||'').toLowerCase()==='suppress'&&String(x.name||'')===String(body.name||preset.name)&&String(x.destination||'')===destination)
      if(existing) return send(req,res,200,{duplicate:true,item:{id:existing.id,name:existing.name,status:existing.status,size:existing.matched_size,destination:existing.destination}})
      const item=await createLeadAudience(workspaceId,{name:String(body.name||preset.name),destination,mode:'Suppress',condition:preset.condition,operator:preset.operator,value:preset.value,identityMode:preset.identityMode})
      if(!item) return send(req,res,503,{error:'audience store unavailable'})
      const now=new Date().toISOString()
      await mutateState(s=>{
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'exclusion.created',entityId:item.id,preset:String(body.preset),destination,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{duplicate:false,item:{id:item.id,name:item.name,status:item.status,size:item.matched_size,estimatedSize:item.estimated_size,destination:item.destination,identityMode:item.identity_mode}})
    }
    if (req.method === 'POST' && url.pathname === '/api/audiences/preview') {
      const body=await readBody(req)
      if(!body.name || !body.condition) return send(req,res,400,{error:'name and condition required'})
      const preview=await previewLeadAudience(workspaceId,body)
      return send(req,res,200,preview)
    }
    if (req.method === 'POST' && url.pathname === '/api/audiences') {
      const body=await readBody(req)
      if(!body.name || !body.destination || !body.condition) return send(req,res,400,{error:'name, destination and condition required'})
      const item=await createLeadAudience(workspaceId,body)
      if(!item) return send(req,res,503,{error:'audience store unavailable'})
      await mutateState(s=>{s.audit.unshift({id:randomUUID(),action:'audience.materialized',entityId:item.id,at:new Date().toISOString()});s.audit=s.audit.slice(0,1000)})
      return send(req,res,201,{id:item.id,name:item.name,status:item.status,destination:item.destination,mode:item.mode,size:item.matched_size,estimatedSize:item.estimated_size,createdAt:item.created_at})
    }
    if (req.method === 'POST' && url.pathname === '/api/audiences/materialize') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      const result=await materializeAudience(workspaceId,String(body.id))
      return result?send(req,res,200,result):send(req,res,404,{error:'audience not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/audiences/sync') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      const bundle=await getAudienceBundle(workspaceId,String(body.id))
      if(!bundle) return send(req,res,404,{error:'audience not found'})
      const configured=String(body.provider||bundle.audience.destination||'').split(/·|,/).map(x=>x.trim()).filter(Boolean)
      const providers=configured.map(x=>x.toLowerCase().includes('meta')?'Meta Ads':x.toLowerCase().includes('google')?'Google Ads':null).filter(Boolean)
      if(!providers.length) return send(req,res,400,{error:'audience destination must include Meta Ads or Google Ads'})
      const queued=[]
      for(const provider of [...new Set(providers)]){
        const key=provider==='Meta Ads'?'meta':'google'
        await updateAudienceSyncState(workspaceId,bundle.audience.id,key,{status:'queued',error:null})
        const run=await createActivationRun(workspaceId,{kind:'audience_sync',entityId:bundle.audience.id,provider,requestSummary:{audience:bundle.audience.name,members:bundle.members.length,mode:bundle.audience.mode}})
        const job=await handleSubmitJob({workspaceId,kind:'audience_sync',idempotencyKey:'audience:'+bundle.audience.id+':'+key+':'+Date.now(),payload:{audienceId:bundle.audience.id,provider,activationRunId:run.id}})
        queued.push({provider,runId:run.id,jobId:job?.id||null})
      }
      return send(req,res,202,{id:bundle.audience.id,status:'syncing',queued})
    }
    if (req.method === 'GET' && url.pathname === '/api/audience-schedules') {
      return send(req,res,200,{items:await listAudienceSchedules(workspaceId),runs:await listAudienceRefreshRuns(workspaceId,null,50)})
    }
    if (req.method === 'POST' && url.pathname === '/api/audience-schedules') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      try{
        const item=await saveAudienceSchedule(workspaceId,String(body.id),body)
        return item?send(req,res,200,item):send(req,res,404,{error:'audience not found'})
      }catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'invalid audience schedule'})}
    }
    if (req.method === 'GET' && url.pathname === '/api/activation-runs') {
      return send(req,res,200,{items:await listActivationRuns(workspaceId,100)})
    }
    if (req.method === 'GET' && url.pathname === '/api/audiences') {
      const [items,schedules,stats]=await Promise.all([listLeadAudiences(workspaceId),listAudienceSchedules(workspaceId),audienceOpsStats(workspaceId)])
      const scheduleById=Object.fromEntries(schedules.map(x=>[x.audience_id,x]))
      return send(req,res,200,{items:items.map(x=>{const s=scheduleById[x.id];return {id:x.id,name:x.name,size:x.matched_size,estimatedSize:x.estimated_size,mode:x.mode,destination:x.destination,identityMode:x.identity_mode,status:x.status,cadence:s?.cadenceLabel||'Manual',schedule:s||null,definition:x.definition,providerState:x.provider_state,lastSyncError:x.last_sync_error,lastSyncedAt:x.last_synced_at,lastMaterializedAt:x.last_materialized_at}}),stats})
    }
    if (req.method === 'GET' && url.pathname === '/api/alerts') return send(req,res,200,{items:await listLiveAlerts(workspaceId)})
    if (req.method === 'POST' && url.pathname === '/api/alerts/resolve') {
      const body=await readBody(req)
      if(!body.id) return send(req,res,400,{error:'id required'})
      const item=await resolveLiveAlert(workspaceId,String(body.id))
      return item?send(req,res,200,item):send(req,res,404,{error:'alert not found'})
    }

  return false
}

