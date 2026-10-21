import {createHash,randomBytes,randomUUID} from 'node:crypto'
import {getState,mutateState,storageHealth,withWorkspace} from './store.mjs'
import {queueStats} from './queue.mjs'
import {appendAuditRecord} from './platform/audit-store.mjs'
import {hasPermission} from './security.mjs'
import {createFollowUp} from './agent-orchestrator.mjs'

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
  'messaging','integrations','ai_operations','exports','deletion','billing','workspace_administration'
])

export const MCP_DEFAULT_POLICY=Object.freeze({
  analytics:'allowed',reports:'preview',followups:'confirmation',crm_sync:'confirmation',
  audience_preparation:'preview',audience_activation:'human_approval',messaging:'human_approval',
  integrations:'human_approval',ai_operations:'confirmation',exports:'human_approval',
  deletion:'disabled',billing:'disabled',workspace_administration:'human_approval'
})

export const MCP_CATALOG=Object.freeze([
  {name:'ace_get_status',kind:'tool',category:'read',description:'Read MCP and workspace connection status.',requiredPermission:'mcp.read',requiredScope:'mcp.read',risk:'low',queued:false},
  {name:'ace_search_leads',kind:'tool',category:'read',description:'Search the workspace lead and customer context.',requiredPermission:'workspace.read',requiredScope:'mcp.read',risk:'low',queued:false},
  {name:'ace_get_campaign_performance',kind:'tool',category:'analyze',description:'Summarize campaign and delivery performance.',requiredPermission:'reports.read',requiredScope:'mcp.analyze',risk:'low',queued:false},
  {name:'ace_get_attribution_summary',kind:'tool',category:'analyze',description:'Read attribution and conversion evidence.',requiredPermission:'attribution.read',requiredScope:'mcp.analyze',risk:'low',queued:false},
  {name:'ace_get_integration_health',kind:'tool',category:'read',description:'Read connector health and delivery status.',requiredPermission:'monitoring.read',requiredScope:'mcp.read',risk:'low',queued:false},
  {name:'ace_explain_campaign_performance',kind:'tool',category:'analyze',description:'Explain performance changes using available evidence.',requiredPermission:'ai.analysis.run',requiredScope:'mcp.analyze',risk:'low',queued:false},
  {name:'ace_generate_executive_brief',kind:'tool',category:'analyze',description:'Generate an evidence-backed executive brief draft.',requiredPermission:'reports.read',requiredScope:'mcp.analyze',risk:'low',queued:false},
  {name:'ace_prepare_follow_up',kind:'tool',category:'draft',description:'Prepare a follow-up action without sending it.',requiredPermission:'followups.write',requiredScope:'mcp.draft',risk:'medium',queued:false},
  {name:'ace_prepare_campaign_report',kind:'tool',category:'draft',description:'Prepare a campaign report draft.',requiredPermission:'reports.write',requiredScope:'mcp.draft',risk:'medium',queued:false},
  {name:'ace_confirm_action',kind:'tool',category:'execute',description:'Confirm a previously previewed action.',requiredPermission:'workspace.write',requiredScope:'mcp.execute',risk:'high',queued:true},
  {name:'ace_get_job_status',kind:'tool',category:'read',description:'Read a queued operation status.',requiredPermission:'workspace.read',requiredScope:'mcp.read',risk:'low',queued:false},
  {name:'ace_get_workspace_overview',kind:'resource',category:'read',description:'Workspace overview resource.',requiredPermission:'workspace.read',requiredScope:'mcp.read',risk:'low',queued:false},
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

export const readMcpResource=async({workspaceId,uri})=>withWorkspace(safeWorkspace(workspaceId),async()=>{
  const state=await getState();const value={
    'ace://workspace/overview':{workspaceId,settings:state.workspaceSettings||{},connectors:(state.connectorConnections||[]).map(item=>({id:item.id,connector:item.connector,status:item.status}))},
    'ace://campaigns/performance':{workspaceId,generatedAt:now(),campaigns:(state.campaignDailyFacts||state.campaigns||[]).slice(0,100)},
    'ace://leads/quality':{workspaceId,generatedAt:now(),leads:(state.leadProfiles||state.leads||[]).slice(0,100)},
    'ace://attribution/summary':{workspaceId,generatedAt:now(),events:(state.recentEvents||state.trackedEvents||[]).slice(0,100)},
    'ace://integrations/health':{workspaceId,connectors:(state.connectorHealth||[]).slice(0,100),deliveries:(state.signalDeliveries||[]).slice(0,100)},
    'ace://monitoring/alerts':{workspaceId,alerts:(state.alerts||[]).slice(0,100)},
    'ace://ai/evaluations':{workspaceId,evaluations:(state.aiEvaluations||[]).slice(0,100)},
    'ace://audit/recent':{workspaceId,audit:(state.audit||[]).slice(0,100)},
  }[uri]
  if(!value)throw Object.assign(new Error('MCP resource not found'),{status:404,code:'mcp_resource_not_found'})
  return safeData(value)
})

export const prepareMcpAction=async({workspaceId,actorId,role,actionType,input,requiredPermission='workspace.write',requiredScope='mcp.draft',risk='medium',requestId=null,traceId=null})=>{
  if(!hasPermission(role,requiredPermission))throw Object.assign(new Error('permission denied'),{status:403,code:'permission_denied'})
  const sanitized=safeData(input||{})
  const fingerprint=createHash('sha256').update(JSON.stringify({actionType,sanitized})).digest('hex')
  const action={id:'mcp_act_'+randomUUID(),workspaceId,actorId,actionType,input:sanitized,inputFingerprint:fingerprint,requiredPermission,requiredScope,risk,status:'awaiting_confirmation',createdAt:now(),expiresAt:new Date(Date.now()+10*60*1000).toISOString(),confirmedAt:null,jobId:null}
  await withWorkspace(workspaceId,()=>mutateState(state=>{state.mcpActions=state.mcpActions||[];state.mcpActions.unshift(action);state.mcpActions=state.mcpActions.slice(0,500);state.mcpActivity=state.mcpActivity||[];state.mcpActivity.unshift({id:'mcp_evt_'+randomUUID(),action:'mcp.action.prepared',actorId,actionId:action.id,at:action.createdAt,outcome:'success',metadata:{actionType,risk}});state.mcpActivity=state.mcpActivity.slice(0,1000)}))
  await appendAuditRecord({workspaceId,actorId,action:'mcp.action.prepared',entityType:'mcp_action',entityId:action.id,requestId,traceId,metadata:{actionType,risk}}).catch(()=>{})
  return {actionId:action.id,actionType,risk,status:action.status,preview:sanitized,expiresAt:action.expiresAt,inputFingerprint:fingerprint,requiredPermission,requiredScope}
}

export const confirmMcpAction=async({workspaceId,actorId,role,actionId,idempotencyKey,requestId=null,traceId=null})=>{
  if(!idempotencyKey)throw Object.assign(new Error('idempotencyKey is required'),{status:400,code:'idempotency_key_required'})
  let action=await withWorkspace(workspaceId,async()=>{const state=await getState();return (state.mcpActions||[]).find(item=>item.id===actionId)})
  if(!action)throw Object.assign(new Error('MCP action not found'),{status:404,code:'mcp_action_not_found'})
  if(action.status==='succeeded')return {actionId,status:'succeeded',result:action.result,idempotencyKey:action.idempotencyKey||idempotencyKey}
  if(action.status!=='awaiting_confirmation')throw Object.assign(new Error('MCP action cannot be confirmed: '+action.status),{status:409,code:'mcp_action_not_confirmable'})
  if(Date.parse(action.expiresAt)<=Date.now())throw Object.assign(new Error('MCP action preview expired'),{status:409,code:'mcp_action_expired'})
  if(action.actorId!==actorId||!hasPermission(role,action.requiredPermission))throw Object.assign(new Error('MCP action permission denied'),{status:403,code:'permission_denied'})
  let claimed=false
  await withWorkspace(workspaceId,()=>mutateState(state=>{
    const current=(state.mcpActions||[]).find(item=>item.id===actionId)
    if(current&&current.status==='awaiting_confirmation'){current.status='executing';current.idempotencyKey=idempotencyKey;claimed=true;action=current}
  }))
  if(!claimed)throw Object.assign(new Error('MCP action is already executing or has been claimed'),{status:409,code:'mcp_action_claimed'})
  let executionResult={status:'confirmed',actionType:action.actionType}
  try{
    if(action.actionType==='follow_up.create'){
      const created=await createFollowUp(workspaceId,{leadRef:action.input.leadRef,title:action.input.title,dueAt:action.input.dueAt||now(),owner:action.input.owner||actorId,status:'open',notes:action.input.notes||'Created through governed MCP action'})
      if(!created)throw Object.assign(new Error('follow-up store unavailable'),{status:503,code:'mcp_action_store_unavailable'})
      executionResult={status:'succeeded',actionType:action.actionType,entityId:created.id,entityType:'follow_up'}
    }
  }catch(error){
    await withWorkspace(workspaceId,()=>mutateState(state=>{const current=(state.mcpActions||[]).find(item=>item.id===actionId);if(current){current.status='failed';current.error=error instanceof Error?error.message:String(error)}}))
    throw error
  }
  await withWorkspace(workspaceId,()=>mutateState(state=>{
    const current=(state.mcpActions||[]).find(item=>item.id===actionId)
    if(current&&current.status==='awaiting_confirmation'){current.status='succeeded';current.confirmedAt=now();current.idempotencyKey=idempotencyKey;current.result=executionResult;action=current}
  }))
  await appendAuditRecord({workspaceId,actorId,action:'mcp.action.confirmed',entityType:'mcp_action',entityId:actionId,requestId,traceId,metadata:{actionType:action.actionType,idempotencyKey,result:executionResult}}).catch(()=>{})
  return {actionId,status:'succeeded',result:executionResult,idempotencyKey}
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
