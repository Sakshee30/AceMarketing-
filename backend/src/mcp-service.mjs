import {createHash,randomBytes,randomUUID} from 'node:crypto'
import {getState,mutateState,storageHealth,withWorkspace} from './store.mjs'
import {queueStats,replayDeadLetterJob,requestJobCancellation} from './queue.mjs'
import {appendAuditRecord} from './platform/audit-store.mjs'
import {hasPermission} from './security.mjs'
import {createAgentRun,createFollowUp} from './agent-orchestrator.mjs'
import {createAudience,createActivationRun,getAudienceBundle,getLeadProfile,materializeAudience,previewAudience,updateAudienceSyncState} from './lead-ops.mjs'
import {handleSubmitJob} from '../modules/jobs/src/application/commands/submit-job/submit-job.handler.mjs'
import {queueReportNow} from './report-scheduler.mjs'
import {deleteSubject,exportSubject} from './privacy-ops.mjs'

export const MCP_SERVER_VERSION=process.env.ACE_MCP_SERVER_VERSION||'0.1.0'

export const MCP_SCOPES=Object.freeze([
  'mcp.read','mcp.analyze','mcp.draft','mcp.execute','mcp.integration_write',
  'mcp.messaging','mcp.admin','mcp.billing','mcp.data_export','mcp.destructive'
])

export const MCP_SCOPE_PRESETS=Object.freeze({
  analyst:['mcp.read','mcp.analyze','mcp.draft'],
  operator:['mcp.read','mcp.analyze','mcp.draft','mcp.execute','mcp.integration_write','mcp.messaging'],
  administrator:['mcp.read','mcp.analyze','mcp.draft','mcp.execute','mcp.integration_write','mcp.messaging','mcp.admin','mcp.data_export']
})

export const MCP_POLICY_GROUPS=Object.freeze([
  'analytics','reports','followups','crm_sync','audience_preparation','audience_activation',
  'messaging','integrations','exports','deletion','billing','workspace_administration'
])

export const MCP_DEFAULT_POLICY=Object.freeze({
  analytics:'allowed',reports:'preview',followups:'confirmation',crm_sync:'confirmation',
  audience_preparation:'preview',audience_activation:'human_approval',messaging:'human_approval',
  integrations:'human_approval',exports:'human_approval',
  deletion:'disabled',billing:'disabled',workspace_administration:'human_approval'
})

export const MCP_CATALOG=Object.freeze([
  {name:'ace_get_status',kind:'tool',category:'read',description:'Read MCP and workspace connection status.',requiredPermission:'mcp.read',requiredScope:'mcp.read',risk:'low',queued:false},
  {name:'ace_search_leads',kind:'tool',category:'read',description:'Search the workspace lead and customer context.',requiredPermission:'workspace.read',requiredScope:'mcp.read',risk:'low',queued:false},
  {name:'ace_get_campaign_performance',kind:'tool',category:'analyze',description:'Summarize campaign and delivery performance.',requiredPermission:'reports.read',requiredScope:'mcp.analyze',risk:'low',queued:false},
  {name:'ace_analyze_lead_quality',kind:'tool',category:'analyze',description:'Analyze bounded lead-quality evidence.',requiredPermission:'ai.analysis.run',requiredScope:'mcp.analyze',risk:'low',queued:false},
  {name:'ace_get_customer_journey',kind:'tool',category:'read',description:'Read recent customer journey evidence.',requiredPermission:'workspace.read',requiredScope:'mcp.read',risk:'low',queued:false},
  {name:'ace_get_attribution_summary',kind:'tool',category:'analyze',description:'Read attribution and conversion evidence.',requiredPermission:'attribution.read',requiredScope:'mcp.analyze',risk:'low',queued:false},
  {name:'ace_get_integration_health',kind:'tool',category:'read',description:'Read connector health and delivery status.',requiredPermission:'monitoring.read',requiredScope:'mcp.read',risk:'low',queued:false},
  {name:'ace_get_monitoring_status',kind:'tool',category:'read',description:'Read monitoring and alert status.',requiredPermission:'monitoring.read',requiredScope:'mcp.read',risk:'low',queued:false},
  {name:'ace_explain_campaign_performance',kind:'tool',category:'analyze',description:'Explain performance changes using available evidence.',requiredPermission:'ai.analysis.run',requiredScope:'mcp.analyze',risk:'low',queued:false},
  {name:'ace_find_conversion_leakage',kind:'tool',category:'analyze',description:'Find persisted conversion leakage signals.',requiredPermission:'ai.analysis.run',requiredScope:'mcp.analyze',risk:'low',queued:false},
  {name:'ace_generate_executive_brief',kind:'tool',category:'analyze',description:'Generate an evidence-backed executive brief draft.',requiredPermission:'reports.read',requiredScope:'mcp.analyze',risk:'low',queued:false},
  {name:'ace_prepare_follow_up',kind:'tool',category:'draft',description:'Prepare a follow-up action without sending it.',requiredPermission:'followups.write',requiredScope:'mcp.draft',risk:'medium',queued:false},
  {name:'ace_prepare_campaign_report',kind:'tool',category:'draft',description:'Prepare a campaign report draft.',requiredPermission:'reports.write',requiredScope:'mcp.draft',risk:'medium',queued:false},
  {name:'ace_prepare_audience',kind:'tool',category:'draft',description:'Preview and prepare a governed audience creation.',requiredPermission:'workspace.write',requiredScope:'mcp.draft',risk:'high',queued:false},
  {name:'ace_prepare_crm_sync',kind:'tool',category:'integration',description:'Prepare a queued CRM writeback after confirmation.',requiredPermission:'workspace.write',requiredScope:'mcp.draft',risk:'high',queued:true},
  {name:'ace_prepare_activation',kind:'tool',category:'integration',description:'Prepare a queued audience activation after human approval.',requiredPermission:'workspace.write',requiredScope:'mcp.draft',risk:'high',queued:true},
  {name:'ace_prepare_message',kind:'tool',category:'draft',description:'Prepare a message draft without sending it.',requiredPermission:'workspace.write',requiredScope:'mcp.draft',risk:'high',queued:false},
  {name:'ace_prepare_qualification_workflow',kind:'tool',category:'execute',description:'Prepare a queued qualification workflow after confirmation.',requiredPermission:'followups.write',requiredScope:'mcp.draft',risk:'high',queued:true},
  {name:'ace_prepare_privacy_export',kind:'tool',category:'admin',description:'Prepare a bounded privacy export request.',requiredPermission:'workspace.write',requiredScope:'mcp.draft',risk:'high',queued:false},
  {name:'ace_prepare_privacy_delete',kind:'tool',category:'admin',description:'Prepare a destructive privacy deletion request.',requiredPermission:'workspace.write',requiredScope:'mcp.draft',risk:'critical',queued:false},
  {name:'ace_confirm_action',kind:'tool',category:'execute',description:'Confirm a previously previewed action.',requiredPermission:'workspace.write',requiredScope:'mcp.execute',risk:'high',queued:true},
  {name:'ace_approve_action',kind:'tool',category:'admin',description:'Approve an action held for human approval.',requiredPermission:'mcp.admin',requiredScope:'mcp.admin',risk:'critical',queued:true},
  {name:'ace_get_job_status',kind:'tool',category:'read',description:'Read a queued operation status.',requiredPermission:'workspace.read',requiredScope:'mcp.read',risk:'low',queued:false},
  {name:'ace_cancel_job',kind:'tool',category:'execute',description:'Prepare cancellation of a queued job; confirm separately.',requiredPermission:'workspace.write',requiredScope:'mcp.draft',risk:'high',queued:false},
  {name:'ace_retry_job',kind:'tool',category:'execute',description:'Prepare replay of a dead-letter job; confirm separately.',requiredPermission:'workspace.write',requiredScope:'mcp.draft',risk:'high',queued:false},
  {name:'ace_get_workspace_overview',kind:'resource',category:'read',description:'Workspace overview resource.',requiredPermission:'workspace.read',requiredScope:'mcp.read',risk:'low',queued:false},
  {name:'ace_get_lead_quality',kind:'resource',category:'read',description:'Lead quality resource.',requiredPermission:'workspace.read',requiredScope:'mcp.read',risk:'low',queued:false},
  {name:'ace_get_recent_journeys',kind:'resource',category:'read',description:'Recent journeys resource.',requiredPermission:'workspace.read',requiredScope:'mcp.read',risk:'low',queued:false},
  {name:'ace_get_monitoring_alerts',kind:'resource',category:'read',description:'Monitoring alerts resource.',requiredPermission:'workspace.read',requiredScope:'mcp.read',risk:'low',queued:false},
  {name:'ace_get_recent_audit',kind:'resource',category:'read',description:'Recent workspace audit resource.',requiredPermission:'workspace.read',requiredScope:'mcp.read',risk:'low',queued:false},
  {name:'ace_campaign_review',kind:'prompt',category:'analyze',description:'Evidence-based campaign review prompt.',requiredPermission:'reports.read',requiredScope:'mcp.analyze',risk:'low',queued:false},
  {name:'ace_executive_brief',kind:'prompt',category:'analyze',description:'Executive brief prompt using workspace evidence.',requiredPermission:'reports.read',requiredScope:'mcp.analyze',risk:'low',queued:false}
])

const clean=(value,max=240)=>String(value??'').trim().slice(0,max)
const tokenHash=value=>createHash('sha256').update(String(value)).digest('hex')
const safeWorkspace=value=>{const id=clean(value,64);if(!/^[A-Za-z0-9_-]{1,64}$/.test(id))throw new Error('invalid workspace id');return id}
const now=()=>new Date().toISOString()

const ttlSeconds=value=>{
  if(Number.isFinite(Number(value)))return Math.max(60,Math.min(30*24*60*60,Number(value)))
  const match=String(value||'').trim().match(/^(\d+)\s*(m|h|d)$/i)
  if(!match)return 3600
  const multiplier={m:60,h:3600,d:86400}[match[2].toLowerCase()]
  return Math.max(60,Math.min(30*24*60*60,Number(match[1])*multiplier))
}

export const normalizeMcpScopes=(scopes,preset='analyst')=>{
  const values=(Array.isArray(scopes)?scopes:(typeof scopes==='string'?scopes.split(','):[])).map(value=>String(value).trim()).filter(Boolean)
  const fallback=MCP_SCOPE_PRESETS[String(preset||'analyst').toLowerCase()]||MCP_SCOPE_PRESETS.analyst
  const normalized=[...new Set((values.length?values:fallback).map(value=>String(value).trim()).filter(value=>MCP_SCOPES.includes(value)))]
  if(!normalized.length)throw new Error('at least one valid MCP scope is required')
  return normalized
}

export const createMcpToken=async({workspaceId,actorId,role='analyst',label='local-mcp',expiresIn='1h',scopes,preset='analyst',requestId=null,traceId=null,source='api'})=>{
  const workspace=safeWorkspace(workspaceId)
  if(!['owner','admin'].includes(role))throw Object.assign(new Error('owner or admin role required'),{status:403,code:'mcp_token_management_forbidden'})
  const selected=normalizeMcpScopes(scopes,preset)
  if(selected.some(scope=>['mcp.billing','mcp.destructive'].includes(scope))&&role!=='owner')throw Object.assign(new Error('owner role required for billing or destructive MCP scopes'),{status:403,code:'mcp_privileged_scope_forbidden'})
  const secret='ace_mcp_'+randomBytes(32).toString('base64url')
  const id='mcp_tok_'+randomUUID()
  const createdAt=now()
  const expiresAt=new Date(Date.now()+ttlSeconds(expiresIn)*1000).toISOString()
  const record={id,workspaceId:workspace,actorId:clean(actorId,160),label:clean(label,80)||'local-mcp',prefix:secret.slice(0,18),tokenHash:tokenHash(secret),roleSnapshot:role,scopes:selected,status:'active',createdAt,expiresAt,lastUsedAt:null,revokedAt:null,source}
  await withWorkspace(workspace,()=>mutateState(state=>{
    state.mcpTokens=state.mcpTokens||[]
    state.mcpTokens.unshift(record)
    state.mcpTokens=state.mcpTokens.slice(0,200)
    state.mcpActivity=state.mcpActivity||[]
    state.mcpActivity.unshift({id:'mcp_evt_'+randomUUID(),action:'mcp.token.created',actorId:record.actorId,tokenId:id,at:createdAt,outcome:'success',metadata:{label:record.label,scopes:selected}})
    state.mcpActivity=state.mcpActivity.slice(0,1000)
  }))
  await appendAuditRecord({workspaceId:workspace,actorId:record.actorId,action:'mcp.token.created',entityType:'mcp_token',entityId:id,requestId,traceId,metadata:{label:record.label,scopes:selected,expiresAt:record.expiresAt}}).catch(()=>{})
  return {id,label:record.label,prefix:record.prefix,key:secret,scopes:selected,createdAt,expiresAt,notice:'Store this MCP token now; the full value will not be shown again.'}
}

const publicToken=record=>({id:record.id,label:record.label,prefix:record.prefix,scopes:record.scopes,status:record.status,roleSnapshot:record.roleSnapshot,createdAt:record.createdAt,expiresAt:record.expiresAt,lastUsedAt:record.lastUsedAt,revokedAt:record.revokedAt,actorId:record.actorId})

export const listMcpTokens=async workspaceId=>withWorkspace(safeWorkspace(workspaceId),async()=>{
  const state=await getState()
  const at=Date.now()
  return (state.mcpTokens||[]).map(record=>record.status==='active'&&Date.parse(record.expiresAt||0)<=at?{...record,status:'expired'}:record).map(publicToken).sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0))
})

export const revokeMcpToken=async({workspaceId,id,actorId=null,requestId=null,traceId=null})=>{
  const workspace=safeWorkspace(workspaceId);let result=null
  await withWorkspace(workspace,()=>mutateState(state=>{
    const record=(state.mcpTokens||[]).find(item=>item.id===id)
    if(!record)return
    const revokedAt=now();record.status='revoked';record.revokedAt=revokedAt;result=publicToken(record)
    state.mcpActivity=state.mcpActivity||[];state.mcpActivity.unshift({id:'mcp_evt_'+randomUUID(),action:'mcp.token.revoked',actorId,tokenId:id,at:revokedAt,outcome:'success'});state.mcpActivity=state.mcpActivity.slice(0,1000)
  }))
  if(!result)throw Object.assign(new Error('MCP token not found'),{status:404,code:'mcp_token_not_found'})
  await appendAuditRecord({workspaceId:workspace,actorId,action:'mcp.token.revoked',entityType:'mcp_token',entityId:id,requestId,traceId}).catch(()=>{})
  return result
}

export const rotateMcpToken=async({workspaceId,id,actorId,role,requestId,traceId})=>{
  const workspace=safeWorkspace(workspaceId);const list=await withWorkspace(workspace,async()=>{const state=await getState();return (state.mcpTokens||[]).find(item=>item.id===id)})
  if(!list)throw Object.assign(new Error('MCP token not found'),{status:404,code:'mcp_token_not_found'})
  const created=await createMcpToken({workspaceId:workspace,actorId,role,label:list.label,expiresIn:Math.max(60,Date.parse(list.expiresAt||0)-Date.now())/1000,scopes:list.scopes,requestId,traceId,source:'rotation'})
  await revokeMcpToken({workspaceId:workspace,id,actorId,requestId,traceId})
  return created
}

export const authenticateMcpToken=async({token,workspaceId})=>{
  const workspace=safeWorkspace(workspaceId)
  if(!token)throw Object.assign(new Error('ACE_MCP_TOKEN is required'),{status:401,code:'mcp_token_required'})
  let actor=null
  await withWorkspace(workspace,()=>mutateState(state=>{
    const record=(state.mcpTokens||[]).find(item=>item.tokenHash===tokenHash(token))
    if(!record||record.status!=='active'||Date.parse(record.expiresAt||0)<=Date.now())return
    record.lastUsedAt=now()
    actor={tokenId:record.id,workspaceId:workspace,actorId:record.actorId,role:record.roleSnapshot,scopes:record.scopes}
  }))
  if(!actor)throw Object.assign(new Error('MCP token is invalid, expired, or revoked'),{status:401,code:'mcp_token_invalid'})
  return actor
}

export const getMcpPolicy=async workspaceId=>withWorkspace(safeWorkspace(workspaceId),async()=>{
  const state=await getState();return {...MCP_DEFAULT_POLICY,...(state.mcpPolicy||{})}
})

export const saveMcpPolicy=async({workspaceId,policy,actorId=null,requestId=null,traceId=null})=>{
  const workspace=safeWorkspace(workspaceId);const next={...MCP_DEFAULT_POLICY}
  for(const group of MCP_POLICY_GROUPS)if(['allowed','preview','confirmation','human_approval','disabled'].includes(String(policy?.[group])))next[group]=String(policy[group])
  await withWorkspace(workspace,()=>mutateState(state=>{
    state.mcpPolicy=next
    state.mcpActivity=state.mcpActivity||[];state.mcpActivity.unshift({id:'mcp_evt_'+randomUUID(),action:'mcp.policy.updated',actorId,at:now(),outcome:'success',metadata:{policy:next}});state.mcpActivity=state.mcpActivity.slice(0,1000)
  }))
  await appendAuditRecord({workspaceId:workspace,actorId,action:'mcp.policy.updated',entityType:'mcp_policy',entityId:workspace,requestId,traceId,metadata:next}).catch(()=>{})
  return next
}

export const listMcpActivity=async({workspaceId,limit=100})=>withWorkspace(safeWorkspace(workspaceId),async()=>{
  const state=await getState();return (state.mcpActivity||[]).slice(0,Math.max(1,Math.min(500,Number(limit)||100)))
})

export const getMcpStatus=async workspaceId=>{
  const workspace=safeWorkspace(workspaceId);const [tokens,activity,health,queue]=await Promise.all([listMcpTokens(workspace),listMcpActivity({workspaceId:workspace,limit:1}),withWorkspace(workspace,()=>storageHealth()),queueStats(workspace).catch(()=>({backend:'unavailable'}))])
  return {enabled:true,serverVersion:MCP_SERVER_VERSION,workspaceId:workspace,activeTokens:tokens.filter(item=>item.status==='active').length,lastActivityAt:activity[0]?.at||null,storage:health,queue,policy:await getMcpPolicy(workspace)}
}

export const getMcpCatalog=({category=null,kind=null}={})=>MCP_CATALOG.filter(item=>(!category||item.category===category)&&(!kind||item.kind===kind))

const safeData=value=>{
  if(Array.isArray(value))return value.slice(0,100).map(safeData)
  if(!value||typeof value!=='object')return value
  const output={}
  for(const [key,item] of Object.entries(value))if(!/token|secret|password|authorization|cookie|credential/i.test(key))output[key]=safeData(item)
  return output
}

export const sanitizeMcpValue=value=>safeData(value)

export const readMcpResource=async({workspaceId,uri})=>withWorkspace(safeWorkspace(workspaceId),async()=>{
  const state=await getState();const value={
    'ace://workspace/overview':{workspaceId,settings:state.workspaceSettings||{},connectors:(state.connectorConnections||[]).map(item=>({id:item.id,connector:item.connector,status:item.status}))},
    'ace://campaigns/performance':{workspaceId,generatedAt:now(),campaigns:(state.campaignDailyFacts||state.campaigns||[]).slice(0,100)},
    'ace://leads/quality':{workspaceId,generatedAt:now(),leads:(state.leadProfiles||state.leads||[]).slice(0,100)},
    'ace://journeys/recent':{workspaceId,generatedAt:now(),journeys:(state.journeys||state.customerJourneys||[]).slice(0,100)},
    'ace://attribution/summary':{workspaceId,generatedAt:now(),events:(state.recentEvents||state.trackedEvents||[]).slice(0,100)},
    'ace://integrations/health':{workspaceId,connectors:(state.connectorHealth||[]).slice(0,100),deliveries:(state.signalDeliveries||[]).slice(0,100)},
    'ace://monitoring/alerts':{workspaceId,alerts:(state.alerts||[]).slice(0,100)},
    'ace://ai/evaluations':{workspaceId,evaluations:(state.aiEvaluations||[]).slice(0,100)},
    'ace://audit/recent':{workspaceId,audit:(state.audit||[]).slice(0,100)},
  }[uri]
  if(!value)throw Object.assign(new Error('MCP resource not found'),{status:404,code:'mcp_resource_not_found'})
  return safeData(value)
})

const actionPolicyGroup=actionType=>({
  'follow_up.create':'followups',
  'report.prepare':'reports',
  'report.queue':'reports',
  'audience.create':'audience_preparation',
  'audience.materialize':'audience_preparation',
  'audience.sync':'audience_activation',
  'crm.sync':'crm_sync',
  'message.prepare':'messaging',
  'qualification.workflow':'ai_operations',
  'ai.activation.proposal':'ai_operations',
  'privacy.export':'exports',
  'privacy.delete':'deletion',
  'job.cancel':'workspace_administration',
  'job.retry':'workspace_administration'
}[actionType]||'workspace_administration')

const sanitizeActionInput=(actionType,input={})=>{
  const safe=safeData(input)
  if(actionType!=='message.prepare')return safe
  const text=String(input.text||'')
  return {...safe,text:undefined,bodyFingerprint:createHash('sha256').update(text).digest('hex'),hasText:Boolean(text),textLength:text.length}
}

const policyForAction=async(workspaceId,actionType)=>{
  const policy=await getMcpPolicy(workspaceId)
  return {group:actionPolicyGroup(actionType),mode:policy[actionPolicyGroup(actionType)]||'disabled'}
}

export const prepareMcpAction=async({workspaceId,actorId,role,actionType,input,requiredPermission='workspace.write',requiredScope='mcp.draft',risk='medium',requestId=null,traceId=null})=>{
  if(!hasPermission(role,requiredPermission))throw Object.assign(new Error('permission denied'),{status:403,code:'permission_denied'})
  const policy=await policyForAction(workspaceId,actionType)
  if(policy.mode==='disabled')throw Object.assign(new Error('MCP policy disables '+policy.group+' actions'),{status:403,code:'mcp_policy_disabled'})
  const sanitized=sanitizeActionInput(actionType,input||{})
  const fingerprint=createHash('sha256').update(JSON.stringify({actionType,sanitized})).digest('hex')
  const action={id:'mcp_act_'+randomUUID(),workspaceId,actorId,actionType,input:sanitized,inputFingerprint:fingerprint,requiredPermission,requiredScope,risk,policyGroup:policy.group,policyMode:policy.mode,status:'awaiting_confirmation',createdAt:now(),expiresAt:new Date(Date.now()+10*60*1000).toISOString(),confirmedAt:null,jobId:null}
  await withWorkspace(workspaceId,()=>mutateState(state=>{state.mcpActions=state.mcpActions||[];state.mcpActions.unshift(action);state.mcpActions=state.mcpActions.slice(0,500);state.mcpActivity=state.mcpActivity||[];state.mcpActivity.unshift({id:'mcp_evt_'+randomUUID(),action:'mcp.action.prepared',actorId,actionId:action.id,at:action.createdAt,outcome:'success',metadata:{actionType,risk,policyGroup:policy.group,policyMode:policy.mode}});state.mcpActivity=state.mcpActivity.slice(0,1000)}))
  await appendAuditRecord({workspaceId,actorId,action:'mcp.action.prepared',entityType:'mcp_action',entityId:action.id,requestId,traceId,metadata:{actionType,risk,policyGroup:policy.group,policyMode:policy.mode}}).catch(()=>{})
  return {actionId:action.id,actionType,risk,status:action.status,policyGroup:policy.group,policyMode:policy.mode,preview:sanitized,expiresAt:action.expiresAt,inputFingerprint:fingerprint,requiredPermission,requiredScope}
}

const executeMcpAction=async({workspaceId,actorId,action})=>{
  const input=action.input||{}
  if(action.actionType==='follow_up.create'){
    const created=await createFollowUp(workspaceId,{leadRef:input.leadRef,reason:input.title||input.reason||'Follow-up required',channel:input.channel||'voice',priority:input.priority||'medium',dueAt:input.dueAt,owner:input.owner||actorId})
    if(!created)throw Object.assign(new Error('follow-up store unavailable'),{status:503,code:'mcp_action_store_unavailable'})
    return {status:'succeeded',actionType:action.actionType,entityId:created.id,entityType:'follow_up'}
  }
  if(action.actionType==='report.prepare'||action.actionType==='message.prepare')return {status:'prepared',actionType:action.actionType,preview:action.input,sideEffect:false}
  if(action.actionType==='report.queue'){
    const queued=await queueReportNow(workspaceId,String(input.scheduleId))
    return {status:'queued',actionType:action.actionType,...queued}
  }
  if(action.actionType==='audience.create'){
    const created=await createAudience(workspaceId,input)
    if(!created)throw Object.assign(new Error('audience store unavailable'),{status:503,code:'mcp_action_store_unavailable'})
    return {status:'succeeded',actionType:action.actionType,entityId:created.id,entityType:'audience',matchedSize:created.matched_size}
  }
  if(action.actionType==='audience.materialize'){
    const materialized=await materializeAudience(workspaceId,String(input.audienceId||input.id))
    if(!materialized)throw Object.assign(new Error('audience not found'),{status:404,code:'audience_not_found'})
    return {status:'succeeded',actionType:action.actionType,...materialized}
  }
  if(action.actionType==='audience.sync'){
    const bundle=await getAudienceBundle(workspaceId,String(input.audienceId||input.id))
    if(!bundle)throw Object.assign(new Error('audience not found'),{status:404,code:'audience_not_found'})
    const names=String(input.provider||bundle.audience.destination||'').split(/·|,/).map(x=>x.trim()).filter(Boolean)
    const providers=names.map(x=>x.toLowerCase().includes('meta')?'Meta Ads':x.toLowerCase().includes('google')?'Google Ads':null).filter(Boolean)
    if(!providers.length)throw Object.assign(new Error('audience destination must include Meta Ads or Google Ads'),{status:400,code:'audience_provider_required'})
    const queued=[]
    for(const provider of [...new Set(providers)]){
      const key=provider==='Meta Ads'?'meta':'google'
      await updateAudienceSyncState(workspaceId,bundle.audience.id,key,{status:'queued',error:null})
      const run=await createActivationRun(workspaceId,{kind:'audience_sync',entityId:bundle.audience.id,provider,requestSummary:{audience:bundle.audience.name,members:bundle.members.length,mode:bundle.audience.mode}})
      if(!run)throw Object.assign(new Error('activation store unavailable'),{status:503,code:'mcp_action_store_unavailable'})
      const job=await handleSubmitJob({workspaceId,kind:'audience_sync',idempotencyKey:'audience:'+bundle.audience.id+':'+key+':'+action.id,payload:{audienceId:bundle.audience.id,provider,activationRunId:run.id}})
      if(!job)throw Object.assign(new Error('durable audience queue unavailable'),{status:503,code:'mcp_queue_unavailable'})
      queued.push({provider,runId:run.id,jobId:job.id})
    }
    return {status:'queued',actionType:action.actionType,audienceId:bundle.audience.id,queued}
  }
  if(action.actionType==='crm.sync'){
    const lead=await getLeadProfile(workspaceId,String(input.lead||input.leadRef||''))
    if(!lead)throw Object.assign(new Error('lead not found'),{status:404,code:'lead_not_found'})
    const run=await createActivationRun(workspaceId,{kind:'crm_writeback',entityId:lead.id,provider:String(input.provider),requestSummary:{lead:lead.external_lead_id,grade:lead.grade,score:lead.score}})
    if(!run)throw Object.assign(new Error('activation store unavailable'),{status:503,code:'mcp_action_store_unavailable'})
    const job=await handleSubmitJob({workspaceId,kind:'crm_writeback',idempotencyKey:'crm:'+run.id,payload:{leadRef:lead.id,provider:String(input.provider),fields:input.fields||{},activationRunId:run.id}})
    if(!job)throw Object.assign(new Error('durable CRM queue unavailable'),{status:503,code:'mcp_queue_unavailable'})
    return {status:'queued',actionType:action.actionType,runId:run.id,jobId:job.id,provider:input.provider}
  }
  if(action.actionType==='qualification.workflow'){
    const run=await createAgentRun(workspaceId,{agentType:'voice_qualification',entityId:String(input.leadRef||input.lead||''),triggerKey:String(input.trigger||'mcp_qualification'),input})
    if(!run)throw Object.assign(new Error('agent store unavailable'),{status:503,code:'mcp_action_store_unavailable'})
    const job=await handleSubmitJob({workspaceId,kind:'agent_action',idempotencyKey:'agent:'+run.id,payload:{agentRunId:run.id,actionType:'voice_qualification',payload:{...input,runId:run.id}}})
    if(!job)throw Object.assign(new Error('durable qualification queue unavailable'),{status:503,code:'mcp_queue_unavailable'})
    return {status:'queued',actionType:action.actionType,runId:run.id,jobId:job.id}
  }
  if(action.actionType==='privacy.export'){
    const exported=await exportSubject(workspaceId,input,actorId)
    return {status:'succeeded',actionType:action.actionType,requestId:exported.requestId,generatedAt:exported.generatedAt,counts:exported.counts}
  }
  if(action.actionType==='privacy.delete'){
    const deleted=await deleteSubject(workspaceId,input,actorId)
    return {status:'succeeded',actionType:action.actionType,requestId:deleted.requestId,deletedAt:deleted.deletedAt,summary:deleted.summary}
  }
  if(action.actionType==='job.cancel'){
    const job=await requestJobCancellation({workspaceId,id:String(input.jobId)})
    if(!job)throw Object.assign(new Error('job not found or cannot be cancelled'),{status:404,code:'job_not_cancellable'})
    return {status:'succeeded',actionType:action.actionType,jobId:job.id,jobStatus:job.status}
  }
  if(action.actionType==='job.retry'){
    const job=await replayDeadLetterJob({workspaceId,id:String(input.jobId)})
    if(!job)throw Object.assign(new Error('dead-letter job not found'),{status:404,code:'job_not_retryable'})
    return {status:'queued',actionType:action.actionType,jobId:job.id,jobStatus:job.status}
  }
  throw Object.assign(new Error('MCP action handler is not implemented: '+action.actionType),{status:501,code:'mcp_action_not_implemented'})
}

const claimAction=async(workspaceId,actionId,status,idempotencyKey)=>{
  let claimed=false;let action=null
  await withWorkspace(workspaceId,()=>mutateState(state=>{
    const current=(state.mcpActions||[]).find(item=>item.id===actionId)
    if(current&&current.status===status){current.status='executing';current.idempotencyKey=idempotencyKey;claimed=true;action=current}
  }))
  if(!claimed)throw Object.assign(new Error('MCP action is already executing or has been claimed'),{status:409,code:'mcp_action_claimed'})
  return action
}

const finishAction=async({workspaceId,actorId,action,result,idempotencyKey,requestId,traceId})=>{
  await withWorkspace(workspaceId,()=>mutateState(state=>{
    const current=(state.mcpActions||[]).find(item=>item.id===action.id)
    if(current){current.status='succeeded';current.confirmedAt=now();current.idempotencyKey=idempotencyKey;current.result=result;current.jobId=result.jobId||null}
  }))
  await appendAuditRecord({workspaceId,actorId,action:'mcp.action.confirmed',entityType:'mcp_action',entityId:action.id,requestId,traceId,metadata:{actionType:action.actionType,idempotencyKey,result}}).catch(()=>{})
  return {actionId:action.id,status:'succeeded',result,idempotencyKey}
}

const runClaimedAction=async({workspaceId,actorId,action,idempotencyKey,requestId,traceId})=>{
  try{return await finishAction({workspaceId,actorId,action,result:await executeMcpAction({workspaceId,actorId,action}),idempotencyKey,requestId,traceId})}
  catch(error){await withWorkspace(workspaceId,()=>mutateState(state=>{const current=(state.mcpActions||[]).find(item=>item.id===action.id);if(current){current.status='failed';current.error=error instanceof Error?error.message:String(error)}}));throw error}
}

export const confirmMcpAction=async({workspaceId,actorId,role,actionId,idempotencyKey,requestId=null,traceId=null})=>{
  if(!idempotencyKey)throw Object.assign(new Error('idempotencyKey is required'),{status:400,code:'idempotency_key_required'})
  const action=await withWorkspace(workspaceId,async()=>{const state=await getState();return (state.mcpActions||[]).find(item=>item.id===actionId)})
  if(!action)throw Object.assign(new Error('MCP action not found'),{status:404,code:'mcp_action_not_found'})
  if(action.status==='succeeded')return {actionId,status:'succeeded',result:action.result,idempotencyKey:action.idempotencyKey||idempotencyKey}
  if(action.status==='previewed')return {actionId,status:'preview_only',result:action.result,idempotencyKey:action.idempotencyKey||idempotencyKey}
  if(action.status==='awaiting_human_approval')return {actionId,status:'awaiting_human_approval',policyGroup:action.policyGroup,approvalRequired:true,idempotencyKey:action.idempotencyKey||idempotencyKey}
  if(action.status!=='awaiting_confirmation')throw Object.assign(new Error('MCP action cannot be confirmed: '+action.status),{status:409,code:'mcp_action_not_confirmable'})
  if(Date.parse(action.expiresAt)<=Date.now())throw Object.assign(new Error('MCP action preview expired'),{status:409,code:'mcp_action_expired'})
  if(action.actorId!==actorId||!hasPermission(role,action.requiredPermission))throw Object.assign(new Error('MCP action permission denied'),{status:403,code:'permission_denied'})
  if(action.policyMode==='human_approval'){
    await withWorkspace(workspaceId,()=>mutateState(state=>{const current=(state.mcpActions||[]).find(item=>item.id===actionId);if(current){current.status='awaiting_human_approval';current.idempotencyKey=idempotencyKey}}))
    return {actionId,status:'awaiting_human_approval',policyGroup:action.policyGroup,approvalRequired:true,idempotencyKey}
  }
  if(action.policyMode==='preview'){
    const previewResult={status:'preview_only',actionType:action.actionType,policyGroup:action.policyGroup,sideEffect:false}
    await withWorkspace(workspaceId,()=>mutateState(state=>{const current=(state.mcpActions||[]).find(item=>item.id===actionId);if(current){current.status='previewed';current.confirmedAt=now();current.idempotencyKey=idempotencyKey;current.result=previewResult}}))
    return {actionId,status:'preview_only',result:previewResult,idempotencyKey}
  }
  return runClaimedAction({workspaceId,actorId,action:await claimAction(workspaceId,actionId,'awaiting_confirmation',idempotencyKey),idempotencyKey,requestId,traceId})
}

export const approveMcpAction=async({workspaceId,actorId,role,actionId,idempotencyKey,requestId=null,traceId=null})=>{
  if(!['owner','admin'].includes(role)||!hasPermission(role,'workspace.write'))throw Object.assign(new Error('owner or admin approval required'),{status:403,code:'mcp_approval_forbidden'})
  const action=await withWorkspace(workspaceId,async()=>{const state=await getState();return (state.mcpActions||[]).find(item=>item.id===actionId)})
  if(!action)throw Object.assign(new Error('MCP action not found'),{status:404,code:'mcp_action_not_found'})
  if(action.actorId===actorId)throw Object.assign(new Error('separation of duties requires a different approver'),{status:403,code:'mcp_separation_of_duties'})
  if(action.status!=='awaiting_human_approval')throw Object.assign(new Error('MCP action is not awaiting human approval'),{status:409,code:'mcp_action_not_awaiting_approval'})
  if(Date.parse(action.expiresAt)<=Date.now())throw Object.assign(new Error('MCP action preview expired'),{status:409,code:'mcp_action_expired'})
  const key=idempotencyKey||'approval:'+randomUUID()
  return runClaimedAction({workspaceId,actorId,action:await claimAction(workspaceId,actionId,'awaiting_human_approval',key),idempotencyKey:key,requestId,traceId})
}

export const runMcpDiagnostics=async workspaceId=>{
  const status=await getMcpStatus(workspaceId)
  return {checks:[
    {name:'workspace',status:'pass',detail:workspaceId},
    {name:'storage',status:status.storage?.ok?'pass':'fail',detail:status.storage?.backend||'unavailable'},
    {name:'queue',status:status.queue?.backend==='disabled'?'warn':'pass',detail:status.queue?.backend||'unavailable'},
    {name:'catalog',status:getMcpCatalog().length?'pass':'fail',detail:getMcpCatalog().length+' capabilities'},
    {name:'policy',status:'pass',detail:'MCP policy loaded'},
  ],status}
}
