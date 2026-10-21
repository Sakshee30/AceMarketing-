import { randomUUID } from 'node:crypto'
import { URL } from 'node:url'
import { connectorVaultReady, encryptSecret } from '../../vault.mjs'
import { getState, mutateState } from '../../store.mjs'
import { resourceCountAllowed } from '../../entitlements.mjs'
import { connectorDataSummary, connectorReadCatalog, listConnectorSyncRuns, listConnectorSyncSchedules, saveConnectorSyncSchedule } from '../../connector-ingestion.mjs'
import { listCustomIntegrations } from '../../custom-integrations.mjs'
import { createWebhookSubscription, createWebhookTestDelivery, listWebhookDeliveries, listWebhookDeliveryAttempts, listWebhookSubscriptions, replayWebhookDelivery, setWebhookSubscriptionStatus } from '../../platform/webhook-delivery-store.mjs'
import { handleConnectProvider } from '../../../modules/integrations/src/application/commands/connect-provider/connect-provider.handler.mjs'
import { handleReconcileIntegration } from '../../../modules/integrations/src/application/commands/reconcile-sync/reconcile-sync.handler.mjs'
import { handleReplayWebhookDelivery } from '../../../modules/webhooks/src/application/commands/replay-delivery/replay-delivery.handler.mjs'
import { handleSubmitJob } from '../../../modules/jobs/src/application/commands/submit-job/submit-job.handler.mjs'

export async function handleIntegrationRoutes({req,res,url,workspaceId,readBody,send:writeResponse,integrations,CONNECTOR_PROVIDERS,SERVER_SECRET_CONNECTORS,CONNECTOR_REDIRECT_URI,CONNECTOR_SUCCESS_URL,connectorTokenHealth,refreshConnectorCredential,createOAuthState,hashOAuthState,createPkce}) {
    const send=(...args)=>{writeResponse(...args);return true}
    if (req.method === 'GET' && url.pathname === '/api/integrations') {
      const state=await getState()
      const tokenHealth=await connectorTokenHealth(workspaceId).catch(()=>[])
      const connections=state.connectorConnections||[]
      return send(req,res,200,{items:integrations.map(name=>{
        if(name==='Ace Data Hub'){
          return {name,status:'connected',provider:'ace',authType:'internal',capability:'canonical_destination',configured:true,readSupported:false,backfillSupported:false,incrementalSyncSupported:false,writeSupported:true,updatedAt:null,tokenHealth:null}
        }
        if(name==='ChatGPT Ads'){
          const configured=Boolean(process.env.OPENAI_CONVERSIONS_API_KEY&&process.env.OPENAI_ADS_PIXEL_ID)
          return {name,status:configured?'connected':'needs_configuration',provider:'openai',authType:'server_secret',capability:'native_server_capi',configured,updatedAt:null,tokenHealth:null}
        }
        const saved=connections.find(x=>x.connector===name)
        const provider=CONNECTOR_PROVIDERS[name]
        const secretProvider=SERVER_SECRET_CONNECTORS[name]
        const health=tokenHealth.find(x=>x.connector===name)||null
        return {
          name,
          status:saved?.status||(provider?'available':secretProvider?'available':'manual'),
          provider:provider?.provider||secretProvider?.provider||'custom',
          authType:provider?.authType||secretProvider?.authType||'manual',
          capability:provider?'native_oauth':secretProvider?.capability||'configurable_adapter',
          readSupported:connectorReadCatalog().includes(name),
          backfillSupported:connectorReadCatalog().includes(name),
          incrementalSyncSupported:connectorReadCatalog().includes(name),
          configured:provider?Boolean(provider.clientId&&provider.clientSecret&&CONNECTOR_REDIRECT_URI):secretProvider?connectorVaultReady():false,
          credentialFields:secretProvider?.fields||[],
          updatedAt:saved?.updatedAt||null,
          tokenHealth:health
        }
      }),requests:(state.integrationRequests||[]).slice(0,100)})
    }
    if (req.method === 'GET' && url.pathname === '/api/integrations/sync-schedules') {
      const items=await listConnectorSyncSchedules({workspaceId})
      return send(req,res,200,{items,readConnectors:connectorReadCatalog()})
    }
    if (req.method === 'POST' && url.pathname === '/api/integrations/sync-schedules') {
      const body=await readBody(req)
      const connector=String(body.connector||'').trim()
      if(!connectorReadCatalog().includes(connector))return send(req,res,400,{error:'connector does not support read synchronization',supported:connectorReadCatalog()})
      try{
        const item=await saveConnectorSyncSchedule({
          workspaceId,
          connector,
          enabled:body.enabled!==false,
          intervalMinutes:Number(body.intervalMinutes||60),
          options:body.options&&typeof body.options==='object'?body.options:{}
        })
        return send(req,res,200,{item})
      }catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'invalid connector schedule'})}
    }
    if (req.method === 'GET' && url.pathname === '/api/integrations/sync-runs') {
      const connector=String(url.searchParams.get('connector')||'').trim()||null
      const limit=Math.max(1,Math.min(Number(url.searchParams.get('limit')||50),200))
      const items=await listConnectorSyncRuns({workspaceId,connector,limit})
      return send(req,res,200,{items,readConnectors:connectorReadCatalog()})
    }
    if (req.method === 'GET' && url.pathname === '/api/integrations/data-summary') {
      return send(req,res,200,await connectorDataSummary(workspaceId))
    }
    if (req.method === 'POST' && url.pathname === '/api/integrations/sync') {
      const body=await readBody(req)
      const connector=String(body.connector||'').trim()
      const mode=String(body.mode||'incremental').trim().toLowerCase()
      if(!connectorReadCatalog().includes(connector))return send(req,res,400,{error:'connector does not support read synchronization',connector,supported:connectorReadCatalog()})
      if(!['backfill','incremental','manual'].includes(mode))return send(req,res,400,{error:'mode must be backfill, incremental, or manual'})
      const parseDate=value=>{
        if(value==null||value==='')return null
        const date=new Date(value)
        if(Number.isNaN(date.getTime()))throw new Error('invalid sync date')
        return date.toISOString()
      }
      let start=null,end=null
      try{start=parseDate(body.start);end=parseDate(body.end)}catch(error){return send(req,res,400,{error:error.message})}
      if(start&&end&&Date.parse(start)>Date.parse(end))return send(req,res,400,{error:'sync start must be before end'})
      const operationKey=String(req.headers['idempotency-key']||req.requestId||randomUUID())
      const job=await handleSubmitJob({
        workspaceId,
        kind:'connector_sync',
        payload:{connector,mode,start,end,options:body.options&&typeof body.options==='object'?body.options:{}},
        idempotencyKey:'connector-sync:'+connector+':'+operationKey,
        maxAttempts:Number(process.env.CONNECTOR_SYNC_MAX_ATTEMPTS||3),
        deadlineAt:new Date(Date.now()+Number(process.env.CONNECTOR_SYNC_JOB_DEADLINE_MS||30*60*1000)).toISOString(),
        inputSnapshot:{schemaVersion:'connector-sync.v1',connector,mode,start,end,capturedAt:new Date().toISOString()},
        resultSchemaVersion:'connector-sync-result.v1'
      })
      if(!job)return send(req,res,503,{error:'durable connector sync requires DATABASE_URL'})
      return send(req,res,202,{jobId:job.id,status:job.status,connector,mode})
    }
    if (req.method === 'GET' && url.pathname === '/api/integration-flows') {
      const state=await getState()
      const items=(state.integrationFlows||[]).slice().sort((a,b)=>Date.parse(b.updatedAt||b.createdAt||0)-Date.parse(a.updatedAt||a.createdAt||0))
      const active=items.filter(x=>x.status==='active').length
      const healthy=items.filter(x=>x.lastTestStatus==='passed').length
      return send(req,res,200,{items,stats:{total:items.length,active,healthy,needsAttention:Math.max(0,items.length-healthy)}})
    }
    if (req.method === 'POST' && url.pathname === '/api/integration-flows') {
      const body=await readBody(req)
      const name=String(body.name||'').trim()
      const source=String(body.source||'').trim()
      const destination=String(body.destination||'').trim()
      if(name.length<2||name.length>120) return send(req,res,400,{error:'name must be 2-120 characters'})
      if(!source||!destination) return send(req,res,400,{error:'source and destination are required'})
      if(source===destination) return send(req,res,400,{error:'source and destination must be different'})
      const now=new Date().toISOString()
      const item={
        id:'flow_'+randomUUID(),
        name,
        source,
        destination,
        object:String(body.object||'Lead / customer event').slice(0,120),
        trigger:String(body.trigger||'On record change').slice(0,120),
        identityField:String(body.identityField||'email / phone / click id').slice(0,120),
        mode:['Real-time','Every 15 minutes','Hourly','Daily'].includes(body.mode)?body.mode:'Real-time',
        status:'paused',
        executionSupported:false,
        executionMode:null,
        lastTestAt:null,
        lastTestStatus:'not_tested',
        lastTestDetail:'Run a readiness test before activation.',
        createdAt:now,
        updatedAt:now
      }
      await mutateState(s=>{
        s.integrationFlows=s.integrationFlows||[]
        s.integrationFlows.unshift(item)
        s.integrationFlows=s.integrationFlows.slice(0,500)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'integration_flow.created',entityId:item.id,source,destination,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item})
    }
    if (req.method === 'POST' && url.pathname === '/api/integration-flows/test') {
      const body=await readBody(req)
      const id=String(body.id||'')
      const state=await getState()
      const item=(state.integrationFlows||[]).find(x=>x.id===id)
      if(!item) return send(req,res,404,{error:'integration flow not found'})
      const connections=state.connectorConnections||[]
      const custom=await listCustomIntegrations(workspaceId).catch(()=>[])
      const readiness=name=>{
        const native=connections.find(x=>x.connector===name)
        const customMatch=custom.find(x=>String(x.name||'').toLowerCase()===String(name).toLowerCase())
        if(native) return ['connected','healthy','active'].includes(String(native.status||'').toLowerCase())
        if(customMatch) return ['healthy','connected','active'].includes(String(customMatch.status||'').toLowerCase())
        return false
      }
      const sourceReady=readiness(item.source)
      const destinationReady=item.destination==='Ace Data Hub'?true:readiness(item.destination)
      const executionSupported=connectorReadCatalog().includes(item.source)&&item.destination==='Ace Data Hub'
      const passed=sourceReady&&destinationReady&&executionSupported
      const now=new Date().toISOString()
      const detail=!sourceReady
        ?'Connect '+item.source+' before activation.'
        :!destinationReady
          ?'Connect '+item.destination+' before activation.'
          :!executionSupported
            ?'This generic flow pair is not executable. Use Ace Data Hub as the destination for ingestion, or use Event Rules / Audiences / CRM writeback for governed cross-provider activation.'
            :'Source is readable and Ace Data Hub is available. This flow will execute through durable connector sync jobs.'
      await mutateState(s=>{
        const flow=(s.integrationFlows||[]).find(x=>x.id===id)
        if(flow){flow.executionSupported=executionSupported;flow.executionMode=executionSupported?'connector_sync':null;flow.lastTestAt=now;flow.lastTestStatus=passed?'passed':'needs_attention';flow.lastTestDetail=detail;flow.updatedAt=now}
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'integration_flow.tested',entityId:id,status:passed?'passed':'needs_attention',at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,{id,passed,sourceReady,destinationReady,detail,testedAt:now})
    }
    if (req.method === 'POST' && url.pathname === '/api/integration-flows/toggle') {
      const body=await readBody(req)
      const id=String(body.id||'')
      const enabled=Boolean(body.enabled)
      const snapshot=await getState()
      const existing=(snapshot.integrationFlows||[]).find(x=>x.id===id)
      if(!existing) return send(req,res,404,{error:'integration flow not found'})
      if(enabled&&existing.lastTestStatus!=='passed') return send(req,res,409,{error:'flow must pass its readiness test before activation'})
      if(enabled&&existing.executionSupported!==true) return send(req,res,409,{error:'flow pair does not have an executable runtime adapter'})
      const cadenceMinutes={'Real-time':5,'Every 15 minutes':15,'Hourly':60,'Daily':1440}[existing.mode]||60
      let schedule=null
      if(existing.executionSupported===true){
        schedule=await saveConnectorSyncSchedule({
          workspaceId,
          connector:existing.source,
          enabled,
          intervalMinutes:cadenceMinutes,
          options:{integrationFlowId:id,destination:existing.destination,object:existing.object,trigger:existing.trigger}
        })
      }
      const now=new Date().toISOString()
      await mutateState(s=>{
        const flow=(s.integrationFlows||[]).find(x=>x.id===id)
        if(flow){flow.status=enabled?'active':'paused';flow.scheduleId=schedule?.id||flow.scheduleId||null;flow.updatedAt=now}
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:enabled?'integration_flow.activated':'integration_flow.paused',entityId:id,scheduleId:schedule?.id||null,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,200,{id,status:enabled?'active':'paused',schedule,updatedAt:now})
    }
    if (req.method === 'POST' && url.pathname === '/api/integration-requests') {
      const body=await readBody(req)
      const connector=String(body.connector||'').trim()
      const businessNeed=String(body.businessNeed||'').trim()
      if(connector.length<2||connector.length>120) return send(req,res,400,{error:'connector must be 2-120 characters'})
      if(businessNeed.length<5||businessNeed.length>1000) return send(req,res,400,{error:'businessNeed must be 5-1000 characters'})
      const now=new Date().toISOString()
      const item={
        id:'ireq_'+randomUUID(),
        connector,
        businessNeed,
        direction:['Inbound','Outbound','Bidirectional'].includes(body.direction)?body.direction:'Bidirectional',
        priority:['Normal','High','Critical'].includes(body.priority)?body.priority:'Normal',
        status:'requested',
        requestedBy:req.user?.email||req.user?.userId||'workspace',
        createdAt:now
      }
      await mutateState(s=>{
        s.integrationRequests=s.integrationRequests||[]
        s.integrationRequests.unshift(item)
        s.integrationRequests=s.integrationRequests.slice(0,500)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'integration.requested',entityId:item.id,connector:item.connector,priority:item.priority,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{item})
    }
    if (req.method === 'GET' && url.pathname === '/api/webhook-subscriptions'){
      return send(req,res,200,{items:await listWebhookSubscriptions({workspaceId})})
    }
    if (req.method === 'POST' && url.pathname === '/api/webhook-subscriptions'){
      const body=await readBody(req)
      try{
        const created=await createWebhookSubscription({
          workspaceId,
          name:body.name,
          destinationUrl:body.destinationUrl,
          eventTypes:body.eventTypes,
          signingSecret:body.signingSecret||null,
          signingKeyId:body.signingKeyId||null,
          maxAttempts:body.maxAttempts,
          retryWindowSeconds:body.retryWindowSeconds,
          actorId:req.user?.userId||null
        })
        await appendAuditRecord({
          workspaceId,actorId:req.user?.userId,action:'webhook.subscription_created',
          entityType:'webhook_subscription',entityId:created.subscription.id,
          requestId:req.requestId,traceId:req.context?.traceId,
          metadata:{destination:new URL(created.subscription.destinationUrl).hostname,eventTypes:created.subscription.eventTypes}
        }).catch(()=>{})
        return send(req,res,201,created)
      }catch(error){
        return send(req,res,Number(error?.status||400),{error:error instanceof Error?error.message:'webhook subscription creation failed',code:error?.code||'webhook_subscription_create_failed'})
      }
    }
    const webhookSubscriptionStatusMatch=url.pathname.match(/^\/api\/webhook-subscriptions\/([^/]+)\/status$/)
    if(req.method==='POST'&&webhookSubscriptionStatusMatch){
      const body=await readBody(req)
      try{
        const subscription=await setWebhookSubscriptionStatus({
          workspaceId,id:decodeURIComponent(webhookSubscriptionStatusMatch[1]),status:body.status
        })
        if(!subscription)return send(req,res,404,{error:'webhook subscription not found'})
        await appendAuditRecord({
          workspaceId,actorId:req.user?.userId,action:'webhook.subscription_status_changed',
          entityType:'webhook_subscription',entityId:subscription.id,
          requestId:req.requestId,traceId:req.context?.traceId,metadata:{status:subscription.status}
        }).catch(()=>{})
        return send(req,res,200,subscription)
      }catch(error){
        return send(req,res,Number(error?.status||400),{error:error instanceof Error?error.message:'webhook status change failed',code:error?.code||'webhook_status_change_failed'})
      }
    }
    const webhookSubscriptionTestMatch=url.pathname.match(/^\/api\/webhook-subscriptions\/([^/]+)\/test$/)
    if(req.method==='POST'&&webhookSubscriptionTestMatch){
      try{
        const delivery=await createWebhookTestDelivery({
          workspaceId,subscriptionId:decodeURIComponent(webhookSubscriptionTestMatch[1]),actorId:req.user?.userId||null
        })
        if(!delivery)return send(req,res,404,{error:'webhook subscription not found'})
        await appendAuditRecord({
          workspaceId,actorId:req.user?.userId,action:'webhook.test_queued',
          entityType:'webhook_delivery',entityId:delivery.id,
          requestId:req.requestId,traceId:req.context?.traceId
        }).catch(()=>{})
        return send(req,res,202,delivery)
      }catch(error){
        return send(req,res,Number(error?.status||400),{error:error instanceof Error?error.message:'webhook test delivery failed',code:error?.code||'webhook_test_failed'})
      }
    }
    if(req.method==='GET'&&url.pathname==='/api/webhook-deliveries'){
      return send(req,res,200,{items:await listWebhookDeliveries({
        workspaceId,
        subscriptionId:url.searchParams.get('subscriptionId')||null,
        status:url.searchParams.get('status')||null,
        limit:Number(url.searchParams.get('limit')||100)
      })})
    }
    const webhookAttemptsMatch=url.pathname.match(/^\/api\/webhook-deliveries\/([^/]+)\/attempts$/)
    if(req.method==='GET'&&webhookAttemptsMatch){
      return send(req,res,200,{items:await listWebhookDeliveryAttempts({workspaceId,deliveryId:decodeURIComponent(webhookAttemptsMatch[1])})})
    }
    const webhookReplayMatch=url.pathname.match(/^\/api\/webhook-deliveries\/([^/]+)\/replay$/)
    if(req.method==='POST'&&webhookReplayMatch){
      try{
        const delivery=await handleReplayWebhookDelivery({workspaceId,deliveryId:decodeURIComponent(webhookReplayMatch[1]),actorId:req.user?.userId||null})
        if(!delivery)return send(req,res,404,{error:'webhook delivery not found'})
        await appendAuditRecord({
          workspaceId,actorId:req.user?.userId,action:'webhook.delivery_replayed',
          entityType:'webhook_delivery',entityId:delivery.id,
          requestId:req.requestId,traceId:req.context?.traceId,metadata:{replayOf:delivery.replayOf}
        }).catch(()=>{})
        return send(req,res,202,delivery)
      }catch(error){
        return send(req,res,Number(error?.status||400),{error:error instanceof Error?error.message:'webhook replay failed',code:error?.code||'webhook_replay_failed'})
      }
    }
    if (req.method === 'GET' && url.pathname === '/api/custom-integrations') return send(req,res,200,{items:await listCustomIntegrations(workspaceId)})
    if (req.method === 'POST' && url.pathname === '/api/custom-integrations/test') {
      const body=await readBody(req)
      if(!body.baseUrl&&!body.id) return send(req,res,400,{error:'baseUrl or id required'})
      try{
        const result=await handleReconcileIntegration({workspaceId,input:body})
        return send(req,res,result.ok?200:422,{...result,testedAt:new Date().toISOString()})
      }catch(error){
        return send(req,res,422,{ok:false,error:error instanceof Error?error.message:'connection test failed',testedAt:new Date().toISOString()})
      }
    }
    if (req.method === 'POST' && url.pathname === '/api/custom-integrations') {
      const integrationCapacity=await resourceCountAllowed(workspaceId,'custom_integrations')
      if(!integrationCapacity.allowed) return send(req,res,429,{error:'custom integration limit reached',usage:integrationCapacity})
      const body=await readBody(req)
      if(!body.name || !body.baseUrl || !body.identity) return send(req,res,400,{error:'name, baseUrl and identity required'})
      const item=await handleConnectProvider({workspaceId,input:body})
      await mutateState(s=>{s.audit.unshift({id:randomUUID(),action:'custom_integration.created',entityId:item.id,at:new Date().toISOString()});s.audit=s.audit.slice(0,1000)})
      return send(req,res,201,item)
    }
    if (req.method === 'POST' && url.pathname === '/api/integrations/connect-secret') {
      const body=await readBody(req)
      const connector=String(body.connector||'')
      const definition=SERVER_SECRET_CONNECTORS[connector]
      if(!definition) return send(req,res,400,{error:'connector does not support server-secret configuration'})
      if(!connectorVaultReady()) return send(req,res,503,{error:'connector credential vault is not configured',required:['CONNECTOR_ENCRYPTION_KEY']})
      const values={}
      for(const field of definition.fields){
        const value=String(body.credentials?.[field.key]||'').trim()
        if(!value) return send(req,res,400,{error:field.label+' is required',field:field.key})
        if(value.length>4096) return send(req,res,400,{error:field.label+' is too long',field:field.key})
        values[field.key]=value
      }
      const now=new Date().toISOString()
      const encrypted=encryptSecret(values)
      await mutateState(s=>{
        s.connectorCredentials=s.connectorCredentials||[]
        const existingCredential=s.connectorCredentials.find(x=>x.connector===connector)
        const credential={id:existingCredential?.id||'cred_'+randomUUID(),connector,provider:definition.provider,encrypted,expiresAt:null,updatedAt:now,createdAt:existingCredential?.createdAt||now}
        if(existingCredential)Object.assign(existingCredential,credential);else s.connectorCredentials.unshift(credential)
        s.connectorConnections=s.connectorConnections||[]
        const existingConnection=s.connectorConnections.find(x=>x.connector===connector)
        const connection={id:existingConnection?.id||'conn_'+randomUUID(),connector,provider:definition.provider,status:'connected',authType:'server_secret',createdAt:existingConnection?.createdAt||now,updatedAt:now,expiresAt:null}
        if(existingConnection)Object.assign(existingConnection,connection);else s.connectorConnections.unshift(connection)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'connector.server_secret_connected',entityId:connector,provider:definition.provider,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      return send(req,res,201,{connector,status:'connected',authType:'server_secret',provider:definition.provider,updatedAt:now})
    }
    if (req.method === 'POST' && url.pathname === '/api/integrations/connect') {
      const body=await readBody(req)
      const connector=String(body.connector||'')
      if(!connector) return send(req,res,400,{error:'connector required'})
      const provider=CONNECTOR_PROVIDERS[connector]
      if(!provider) return send(req,res,200,{connector,status:'manual_configuration_required',authType:'manual'})
      if(!CONNECTOR_REDIRECT_URI || !provider.clientId || !provider.clientSecret) {
        const now=new Date().toISOString()
        await mutateState(s=>{
          s.connectorConnections=s.connectorConnections||[]
          const existing=s.connectorConnections.find(x=>x.connector===connector)
          const record={id:existing?.id||'conn_'+randomUUID(),connector,provider:provider.provider,status:'needs_configuration',authType:provider.authType,createdAt:existing?.createdAt||now,updatedAt:now}
          if(existing) Object.assign(existing,record); else s.connectorConnections.unshift(record)
        })
        return send(req,res,409,{connector,status:'needs_configuration',required:['CONNECTOR_OAUTH_REDIRECT_URI',provider.provider.toUpperCase()+'_OAUTH_CLIENT_ID',provider.provider.toUpperCase()+'_OAUTH_CLIENT_SECRET']})
      }
      const stateToken=createOAuthState(workspaceId)
      const pkce=createPkce()
      const createdAt=new Date().toISOString()
      const expiresAt=new Date(Date.now()+10*60*1000).toISOString()
      await mutateState(s=>{
        s.oauthStates=s.oauthStates||[]
        s.oauthStates=s.oauthStates.filter(x=>Date.parse(x.expiresAt)>Date.now())
        s.oauthStates.unshift({stateHash:hashOAuthState(stateToken),workspaceId,connector,provider:provider.provider,verifier:pkce.verifier,createdAt,expiresAt})
        s.audit.unshift({id:randomUUID(),action:'connector.oauth_started',entityId:connector,at:createdAt})
      })
      const auth=new URL(provider.authorizeUrl)
      auth.searchParams.set('client_id',provider.clientId)
      auth.searchParams.set('redirect_uri',CONNECTOR_REDIRECT_URI)
      auth.searchParams.set('response_type','code')
      auth.searchParams.set('state',stateToken)
      auth.searchParams.set('scope',provider.scopes.join(' '))
      auth.searchParams.set('code_challenge',pkce.challenge)
      auth.searchParams.set('code_challenge_method','S256')
      if(provider.provider==='google') auth.searchParams.set('access_type','offline')
      if(provider.provider==='google') auth.searchParams.set('prompt','consent')
      if(connector==='Zoho CRM'){auth.searchParams.set('access_type','offline');auth.searchParams.set('prompt','consent')}
      return send(req,res,200,{connector,status:'authorization_required',authorizationUrl:auth.toString(),expiresAt})
    }
    if (req.method === 'GET' && url.pathname === '/api/integrations/oauth/callback') {
      const stateToken=String(url.searchParams.get('state')||'')
      const code=String(url.searchParams.get('code')||'')
      const providerError=String(url.searchParams.get('error')||'')
      if(providerError) return send(req,res,400,{error:'provider authorization failed',providerError})
      if(!stateToken||!code) return send(req,res,400,{error:'state and code required'})
      const snapshot=await getState()
      const pending=(snapshot.oauthStates||[]).find(x=>x.stateHash===hashOAuthState(stateToken)&&x.workspaceId===workspaceId)
      if(!pending || Date.parse(pending.expiresAt)<=Date.now()) return send(req,res,400,{error:'invalid or expired oauth state'})
      const provider=CONNECTOR_PROVIDERS[pending.connector]
      if(!provider) return send(req,res,400,{error:'unsupported connector provider'})
      const tokenBody=new URLSearchParams({
        client_id:provider.clientId,
        client_secret:provider.clientSecret,
        redirect_uri:CONNECTOR_REDIRECT_URI,
        code,
        grant_type:'authorization_code',
        code_verifier:pending.verifier
      })
      if(Array.isArray(provider.tokenScopes)&&provider.tokenScopes.length)tokenBody.set('scope',provider.tokenScopes.join(' '))
      const tokenResponse=await fetch(provider.tokenUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:tokenBody})
      const tokenPayload=await tokenResponse.json().catch(()=>({}))
      if(!tokenResponse.ok) return send(req,res,502,{error:'oauth token exchange failed',provider:provider.provider,status:tokenResponse.status})
      if(!connectorVaultReady()) return send(req,res,503,{error:'connector credential vault is not configured'})
      const encrypted=encryptSecret(tokenPayload)
      const now=new Date().toISOString()
      const expiresAt=tokenPayload.expires_in?new Date(Date.now()+Number(tokenPayload.expires_in)*1000).toISOString():null
      await mutateState(s=>{
        s.oauthStates=(s.oauthStates||[]).filter(x=>x.stateHash!==hashOAuthState(stateToken))
        s.connectorCredentials=s.connectorCredentials||[]
        const old=s.connectorCredentials.find(x=>x.connector===pending.connector)
        const credential={id:old?.id||'cred_'+randomUUID(),connector:pending.connector,provider:provider.provider,encrypted,expiresAt,updatedAt:now,createdAt:old?.createdAt||now}
        if(old) Object.assign(old,credential); else s.connectorCredentials.unshift(credential)
        s.connectorConnections=s.connectorConnections||[]
        const connection=s.connectorConnections.find(x=>x.connector===pending.connector)
        const record={id:connection?.id||'conn_'+randomUUID(),connector:pending.connector,provider:provider.provider,status:'connected',authType:'oauth2',createdAt:connection?.createdAt||now,updatedAt:now,expiresAt}
        if(connection) Object.assign(connection,record); else s.connectorConnections.unshift(record)
        s.audit.unshift({id:randomUUID(),action:'connector.connected',entityId:pending.connector,provider:provider.provider,at:now})
      })
      if(CONNECTOR_SUCCESS_URL){
        const success=new URL(CONNECTOR_SUCCESS_URL)
        success.searchParams.set('connector',pending.connector)
        success.searchParams.set('status','connected')
        res.writeHead(302,{Location:success.toString(),'Cache-Control':'no-store'})
        return res.end()
      }
      return send(req,res,200,{connector:pending.connector,status:'connected',expiresAt})
    }
    if (req.method === 'POST' && url.pathname === '/api/integrations/oauth/callback') {
      const body=await readBody(req)
      const stateToken=String(body.state||'')
      const code=String(body.code||'')
      if(!stateToken||!code) return send(req,res,400,{error:'state and code required'})
      const snapshot=await getState()
      const pending=(snapshot.oauthStates||[]).find(x=>x.stateHash===hashOAuthState(stateToken)&&x.workspaceId===workspaceId)
      if(!pending || Date.parse(pending.expiresAt)<=Date.now()) return send(req,res,400,{error:'invalid or expired oauth state'})
      const provider=CONNECTOR_PROVIDERS[pending.connector]
      if(!provider) return send(req,res,400,{error:'unsupported connector provider'})
      const tokenBody=new URLSearchParams({
        client_id:provider.clientId,
        client_secret:provider.clientSecret,
        redirect_uri:CONNECTOR_REDIRECT_URI,
        code,
        grant_type:'authorization_code',
        code_verifier:pending.verifier
      })
      if(Array.isArray(provider.tokenScopes)&&provider.tokenScopes.length)tokenBody.set('scope',provider.tokenScopes.join(' '))
      const tokenResponse=await fetch(provider.tokenUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:tokenBody})
      const tokenPayload=await tokenResponse.json().catch(()=>({}))
      if(!tokenResponse.ok) return send(req,res,502,{error:'oauth token exchange failed',provider:provider.provider,status:tokenResponse.status})
      if(!connectorVaultReady()) return send(req,res,503,{error:'connector credential vault is not configured'})
      const encrypted=encryptSecret(tokenPayload)
      const now=new Date().toISOString()
      const expiresAt=tokenPayload.expires_in?new Date(Date.now()+Number(tokenPayload.expires_in)*1000).toISOString():null
      await mutateState(s=>{
        s.oauthStates=(s.oauthStates||[]).filter(x=>x.stateHash!==hashOAuthState(stateToken))
        s.connectorCredentials=s.connectorCredentials||[]
        const old=s.connectorCredentials.find(x=>x.connector===pending.connector)
        const credential={id:old?.id||'cred_'+randomUUID(),connector:pending.connector,provider:provider.provider,encrypted,expiresAt,updatedAt:now,createdAt:old?.createdAt||now}
        if(old) Object.assign(old,credential); else s.connectorCredentials.unshift(credential)
        s.connectorConnections=s.connectorConnections||[]
        const connection=s.connectorConnections.find(x=>x.connector===pending.connector)
        const record={id:connection?.id||'conn_'+randomUUID(),connector:pending.connector,provider:provider.provider,status:'connected',authType:'oauth2',createdAt:connection?.createdAt||now,updatedAt:now,expiresAt}
        if(connection) Object.assign(connection,record); else s.connectorConnections.unshift(record)
        s.audit.unshift({id:randomUUID(),action:'connector.connected',entityId:pending.connector,provider:provider.provider,at:now})
      })
      return send(req,res,200,{connector:pending.connector,status:'connected',expiresAt})
    }
    if (req.method === 'POST' && url.pathname === '/api/integrations/refresh') {
      const body=await readBody(req)
      const connector=String(body.connector||'')
      if(!connector)return send(req,res,400,{error:'connector required'})
      try{
        const result=await refreshConnectorCredential(workspaceId,connector)
        return send(req,res,200,{connector,status:'connected',refreshed:result.refreshed,expiresAt:result.expiresAt})
      }catch(error){return send(req,res,400,{error:error instanceof Error?error.message:'connector refresh failed',connector})}
    }
    if (req.method === 'POST' && url.pathname === '/api/integrations/disconnect') {
      const body=await readBody(req)
      const connector=String(body.connector||'')
      if(!connector) return send(req,res,400,{error:'connector required'})
      const now=new Date().toISOString()
      await mutateState(s=>{
        s.connectorCredentials=(s.connectorCredentials||[]).filter(x=>x.connector!==connector)
        s.connectorConnections=s.connectorConnections||[]
        const connection=s.connectorConnections.find(x=>x.connector===connector)
        if(connection){connection.status='disconnected';connection.updatedAt=now}
        s.audit.unshift({id:randomUUID(),action:'connector.disconnected',entityId:connector,at:now})
      })
      return send(req,res,200,{connector,status:'disconnected'})
    }

    return false
}

