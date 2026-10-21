import {McpServer} from '@modelcontextprotocol/server'
import {StdioServerTransport} from '@modelcontextprotocol/server/stdio'
import * as z from 'zod/v4'
import {randomUUID} from 'node:crypto'
import {approveMcpAction,authenticateMcpToken,getMcpCatalog,getMcpStatus,readMcpResource,prepareMcpAction,confirmMcpAction,sanitizeMcpValue,MCP_SERVER_VERSION} from '../src/mcp-service.mjs'
import {getJob} from '../src/queue.mjs'

const token=process.env.ACE_MCP_TOKEN||''
const workspaceId=process.env.ACE_MCP_WORKSPACE_ID||process.env.DEFAULT_WORKSPACE_ID||'ws_default'
const auth=await authenticateMcpToken({token,workspaceId})
const requestId=()=>randomUUID()

const fail=(error)=>({isError:true,content:[{type:'text',text:error instanceof Error?error.message:String(error)}]})
const result=(value)=>({content:[{type:'text',text:JSON.stringify(value)}],structuredContent:value})
const assertScope=scope=>{if(!auth.scopes.includes(scope))throw new Error('MCP scope required: '+scope)}
const assertRole=permission=>{
  const role=auth.role
  const map={
    'workspace.read':['owner','admin','analyst','operator'],
    'reports.read':['owner','admin','analyst','operator'],
    'attribution.read':['owner','admin','analyst','operator'],
    'monitoring.read':['owner','admin','analyst','operator'],
    'ai.analysis.run':['owner','admin','analyst','operator'],
    'followups.write':['owner','admin','operator'],
    'reports.write':['owner','admin'],
    'workspace.write':['owner','admin'],
    'mcp.admin':['owner','admin']
  }
  if(!map[permission]?.includes(role)&&role!=='owner')throw new Error('AceMarketing permission required: '+permission)
}

const server=new McpServer({name:'acemarket',version:MCP_SERVER_VERSION})

server.registerTool('ace_get_status',{title:'AceMarketing status',description:'Read workspace, storage, queue, and MCP status.',inputSchema:z.object({}),outputSchema:z.object({enabled:z.boolean(),serverVersion:z.string(),workspaceId:z.string()}).passthrough()},async()=>{
  try{assertScope('mcp.read');assertRole('workspace.read');return result(await getMcpStatus(workspaceId))}catch(error){return fail(error)}
})

server.registerTool('ace_search_leads',{title:'Search leads',description:'Search bounded lead data from the current workspace.',inputSchema:z.object({query:z.string().optional(),limit:z.number().int().min(1).max(50).default(20)}),outputSchema:z.object({workspaceId:z.string(),items:z.array(z.unknown())}).passthrough()},async({query='',limit=20})=>{
  try{assertScope('mcp.read');assertRole('workspace.read');const data=await readMcpResource({workspaceId,uri:'ace://leads/quality'});const needle=String(query).toLowerCase();const items=(data.leads||[]).filter(item=>!needle||JSON.stringify(item).toLowerCase().includes(needle)).slice(0,limit);return result({workspaceId,items})}catch(error){return fail(error)}
})

server.registerTool('ace_get_campaign_performance',{title:'Campaign performance',description:'Read bounded campaign performance evidence.',inputSchema:z.object({limit:z.number().int().min(1).max(100).default(50)}),outputSchema:z.object({workspaceId:z.string(),campaigns:z.array(z.unknown())}).passthrough()},async({limit=50})=>{
  try{assertScope('mcp.analyze');assertRole('reports.read');const data=await readMcpResource({workspaceId,uri:'ace://campaigns/performance'});return result({workspaceId,campaigns:(data.campaigns||[]).slice(0,limit)})}catch(error){return fail(error)}
})

server.registerTool('ace_analyze_lead_quality',{title:'Analyze lead quality',description:'Summarize bounded lead-quality evidence.',inputSchema:z.object({limit:z.number().int().min(1).max(100).default(50)}),outputSchema:z.object({workspaceId:z.string(),leads:z.array(z.unknown()),limitations:z.array(z.string())}).passthrough()},async({limit=50})=>{
  try{assertScope('mcp.analyze');assertRole('ai.analysis.run');const data=await readMcpResource({workspaceId,uri:'ace://leads/quality'});return result({workspaceId,leads:(data.leads||[]).slice(0,limit),limitations:['Lead-quality analysis is bounded to persisted workspace evidence.']})}catch(error){return fail(error)}
})

server.registerTool('ace_get_customer_journey',{title:'Customer journeys',description:'Read recent customer journey evidence.',inputSchema:z.object({limit:z.number().int().min(1).max(100).default(50)}),outputSchema:z.object({workspaceId:z.string(),journeys:z.array(z.unknown())}).passthrough()},async({limit=50})=>{
  try{assertScope('mcp.read');assertRole('workspace.read');const data=await readMcpResource({workspaceId,uri:'ace://journeys/recent'});return result({workspaceId,journeys:(data.journeys||[]).slice(0,limit)})}catch(error){return fail(error)}
})

server.registerTool('ace_get_monitoring_status',{title:'Monitoring status',description:'Read alert and integration monitoring evidence.',inputSchema:z.object({}),outputSchema:z.object({workspaceId:z.string(),alerts:z.array(z.unknown()),integrations:z.unknown()}).passthrough()},async()=>{
  try{assertScope('mcp.read');assertRole('monitoring.read');const [alerts,integrations]=await Promise.all([readMcpResource({workspaceId,uri:'ace://monitoring/alerts'}),readMcpResource({workspaceId,uri:'ace://integrations/health'})]);return result({workspaceId,alerts:alerts.alerts||[],integrations})}catch(error){return fail(error)}
})

server.registerTool('ace_find_conversion_leakage',{title:'Find conversion leakage',description:'Identify persisted evidence that may indicate conversion leakage.',inputSchema:z.object({}),outputSchema:z.object({workspaceId:z.string(),signals:z.array(z.unknown()),limitations:z.array(z.string())}).passthrough()},async()=>{
  try{assertScope('mcp.analyze');assertRole('ai.analysis.run');const data=await readMcpResource({workspaceId,uri:'ace://integrations/health'});const signals=(data.deliveries||[]).filter(item=>['failed','dead_letter','retrying'].includes(String(item.status||'').toLowerCase()));return result({workspaceId,signals,limitations:['Leakage signals are based on persisted delivery outcomes; provider-side attribution freshness may vary.']})}catch(error){return fail(error)}
})

server.registerTool('ace_get_attribution_summary',{title:'Attribution summary',description:'Read attribution evidence for the current workspace.',inputSchema:z.object({limit:z.number().int().min(1).max(100).default(50)}),outputSchema:z.object({workspaceId:z.string(),events:z.array(z.unknown())}).passthrough()},async({limit=50})=>{
  try{assertScope('mcp.analyze');assertRole('attribution.read');const data=await readMcpResource({workspaceId,uri:'ace://attribution/summary'});return result({workspaceId,events:(data.events||[]).slice(0,limit)})}catch(error){return fail(error)}
})

server.registerTool('ace_get_integration_health',{title:'Integration health',description:'Read connector health and delivery state.',inputSchema:z.object({}),outputSchema:z.object({workspaceId:z.string(),connectors:z.array(z.unknown()),deliveries:z.array(z.unknown())}).passthrough()},async()=>{
  try{assertScope('mcp.read');assertRole('monitoring.read');const data=await readMcpResource({workspaceId,uri:'ace://integrations/health'});return result(data)}catch(error){return fail(error)}
})

server.registerTool('ace_explain_campaign_performance',{title:'Explain campaign performance',description:'Produce a grounded explanation from available campaign evidence.',inputSchema:z.object({question:z.string().min(1).max(1000)}),outputSchema:z.object({question:z.string(),evidence:z.unknown(),limitations:z.array(z.string())}).passthrough()},async({question})=>{
  try{assertScope('mcp.analyze');assertRole('ai.analysis.run');const evidence=await readMcpResource({workspaceId,uri:'ace://campaigns/performance'});return result({question,evidence,limitations:['This first MCP slice uses persisted workspace evidence; live provider freshness depends on configured integrations.']})}catch(error){return fail(error)}
})

server.registerTool('ace_generate_executive_brief',{title:'Generate executive brief',description:'Generate an evidence-backed executive brief draft without sending it.',inputSchema:z.object({period:z.string().max(80).default('current period')}),outputSchema:z.object({period:z.string(),workspaceId:z.string(),brief:z.object({summary:z.string(),evidence:z.unknown(),nextSteps:z.array(z.string())})}).passthrough()},async({period='current period'})=>{
  try{assertScope('mcp.analyze');assertRole('reports.read');const [campaigns,integrations]=await Promise.all([readMcpResource({workspaceId,uri:'ace://campaigns/performance'}),readMcpResource({workspaceId,uri:'ace://integrations/health'})]);return result({period,workspaceId,brief:{summary:'Executive brief draft grounded in persisted campaign and integration evidence.',evidence:{campaigns,integrations},nextSteps:['Validate provider freshness','Review conversion and attribution evidence','Approve any operational follow-up separately']}})}catch(error){return fail(error)}
})

server.registerTool('ace_prepare_follow_up',{title:'Prepare follow-up',description:'Prepare a follow-up action for explicit confirmation; this does not contact a customer.',inputSchema:z.object({leadRef:z.string().min(1).max(160),title:z.string().min(1).max(200),dueAt:z.string().optional(),owner:z.string().max(160).optional(),notes:z.string().max(2000).optional()}),outputSchema:z.object({actionId:z.string(),status:z.string(),preview:z.unknown(),expiresAt:z.string()}).passthrough()},async(input)=>{
  try{assertScope('mcp.draft');assertRole('followups.write');return result(await prepareMcpAction({workspaceId,actorId:auth.actorId,role:auth.role,actionType:'follow_up.create',input,requiredPermission:'followups.write',requiredScope:'mcp.execute',risk:'medium',requestId:requestId()}))}catch(error){return fail(error)}
})

server.registerTool('ace_prepare_campaign_report',{title:'Prepare campaign report',description:'Prepare a report draft. If scheduleId is supplied, confirmation queues the existing report schedule.',inputSchema:z.object({scheduleId:z.string().max(160).optional(),period:z.string().max(80).default('current period'),name:z.string().max(160).optional(),reportType:z.string().max(40).optional(),recipients:z.array(z.string()).max(25).optional()}),outputSchema:z.object({actionId:z.string(),status:z.string(),preview:z.unknown(),expiresAt:z.string()}).passthrough()},async(input)=>{
  try{assertScope('mcp.draft');assertRole('reports.write');return result(await prepareMcpAction({workspaceId,actorId:auth.actorId,role:auth.role,actionType:input.scheduleId?'report.queue':'report.prepare',input,requiredPermission:'reports.write',requiredScope:'mcp.execute',risk:input.scheduleId?'high':'medium',requestId:requestId()}))}catch(error){return fail(error)}
})

server.registerTool('ace_prepare_audience',{title:'Prepare audience',description:'Preview and prepare audience creation; confirmation materializes it in the current workspace.',inputSchema:z.object({name:z.string().min(1).max(160),destination:z.string().min(1).max(160),condition:z.string().min(1).max(80),operator:z.string().max(40).optional(),value:z.unknown(),mode:z.string().max(40).optional(),identityMode:z.string().max(40).optional()}),outputSchema:z.object({actionId:z.string(),status:z.string(),preview:z.unknown(),expiresAt:z.string()}).passthrough()},async(input)=>{
  try{assertScope('mcp.draft');assertRole('workspace.write');const preview=await previewAudience(workspaceId,input);return result({...await prepareMcpAction({workspaceId,actorId:auth.actorId,role:auth.role,actionType:'audience.create',input:{...input,preview},requiredPermission:'workspace.write',requiredScope:'mcp.execute',risk:'high',requestId:requestId()}),audiencePreview:preview})}catch(error){return fail(error)}
})

server.registerTool('ace_prepare_crm_sync',{title:'Prepare CRM sync',description:'Prepare a CRM writeback that will be queued only after confirmation and policy approval.',inputSchema:z.object({lead:z.string().min(1).max(160),provider:z.string().min(1).max(80),fields:z.record(z.string(),z.unknown()).optional()}),outputSchema:z.object({actionId:z.string(),status:z.string(),preview:z.unknown(),expiresAt:z.string()}).passthrough()},async(input)=>{
  try{assertScope('mcp.draft');assertRole('workspace.write');return result(await prepareMcpAction({workspaceId,actorId:auth.actorId,role:auth.role,actionType:'crm.sync',input,requiredPermission:'workspace.write',requiredScope:'mcp.execute',risk:'high',requestId:requestId()}))}catch(error){return fail(error)}
})

server.registerTool('ace_prepare_activation',{title:'Prepare audience activation',description:'Prepare an audience activation. Default policy holds this for a separate human approval.',inputSchema:z.object({audienceId:z.string().min(1).max(160),provider:z.string().max(80).optional()}),outputSchema:z.object({actionId:z.string(),status:z.string(),preview:z.unknown(),expiresAt:z.string()}).passthrough()},async(input)=>{
  try{assertScope('mcp.draft');assertRole('workspace.write');return result(await prepareMcpAction({workspaceId,actorId:auth.actorId,role:auth.role,actionType:'audience.sync',input,requiredPermission:'workspace.write',requiredScope:'mcp.execute',risk:'critical',requestId:requestId()}))}catch(error){return fail(error)}
})

server.registerTool('ace_prepare_message',{title:'Prepare message',description:'Prepare a message draft without storing the full body or sending anything.',inputSchema:z.object({to:z.string().min(1).max(80),text:z.string().max(4096).optional(),templateName:z.string().max(160).optional(),languageCode:z.string().max(40).optional()}),outputSchema:z.object({actionId:z.string(),status:z.string(),preview:z.unknown(),expiresAt:z.string()}).passthrough()},async(input)=>{
  try{assertScope('mcp.draft');assertRole('workspace.write');return result(await prepareMcpAction({workspaceId,actorId:auth.actorId,role:auth.role,actionType:'message.prepare',input,requiredPermission:'workspace.write',requiredScope:'mcp.execute',risk:'high',requestId:requestId()}))}catch(error){return fail(error)}
})

server.registerTool('ace_prepare_qualification_workflow',{title:'Prepare qualification workflow',description:'Prepare a provider-backed qualification workflow for explicit confirmation.',inputSchema:z.object({lead:z.string().min(1).max(160),leadRef:z.string().max(160).optional(),source:z.string().max(120).optional(),intent:z.number().optional(),trigger:z.string().max(120).optional()}),outputSchema:z.object({actionId:z.string(),status:z.string(),preview:z.unknown(),expiresAt:z.string()}).passthrough()},async(input)=>{
  try{assertScope('mcp.draft');assertRole('followups.write');return result(await prepareMcpAction({workspaceId,actorId:auth.actorId,role:auth.role,actionType:'qualification.workflow',input,requiredPermission:'followups.write',requiredScope:'mcp.execute',risk:'high',requestId:requestId()}))}catch(error){return fail(error)}
})

server.registerTool('ace_prepare_ai_activation',{title:'Prepare AI activation',description:'Create a bounded AI activation proposal for the existing model review workflow; it does not activate a provider.',inputSchema:z.object({task:z.string().min(1).max(120),proposalType:z.string().min(1).max(80),payload:z.record(z.string(),z.unknown()),evidenceSnapshot:z.record(z.string(),z.unknown()),expiresAt:z.string()}),outputSchema:z.object({actionId:z.string(),status:z.string(),preview:z.unknown(),expiresAt:z.string()}).passthrough()},async(input)=>{
  try{assertScope('mcp.draft');assertRole('workspace.write');return result(await prepareMcpAction({workspaceId,actorId:auth.actorId,role:auth.role,actionType:'ai.activation.proposal',input,requiredPermission:'workspace.write',requiredScope:'mcp.execute',risk:'critical',requestId:requestId()}))}catch(error){return fail(error)}
})

server.registerTool('ace_prepare_privacy_export',{title:'Prepare privacy export',description:'Prepare a bounded privacy export. Confirmation returns counts and a request id, not unbounded customer data.',inputSchema:z.object({selectorType:z.enum(['visitor','customer','email','phone','lead']),selector:z.string().min(1).max(240)}),outputSchema:z.object({actionId:z.string(),status:z.string(),preview:z.unknown(),expiresAt:z.string()}).passthrough()},async(input)=>{
  try{assertScope('mcp.draft');assertRole('workspace.write');return result(await prepareMcpAction({workspaceId,actorId:auth.actorId,role:auth.role,actionType:'privacy.export',input,requiredPermission:'workspace.write',requiredScope:'mcp.data_export',risk:'critical',requestId:requestId()}))}catch(error){return fail(error)}
})

server.registerTool('ace_prepare_privacy_delete',{title:'Prepare privacy deletion',description:'Prepare a destructive privacy deletion. Disabled by default and always requires human approval.',inputSchema:z.object({selectorType:z.enum(['visitor','customer','email','phone','lead']),selector:z.string().min(1).max(240),confirm:z.literal('DELETE')}),outputSchema:z.object({actionId:z.string(),status:z.string(),preview:z.unknown(),expiresAt:z.string()}).passthrough()},async(input)=>{
  try{assertScope('mcp.draft');assertRole('workspace.write');return result(await prepareMcpAction({workspaceId,actorId:auth.actorId,role:auth.role,actionType:'privacy.delete',input,requiredPermission:'workspace.write',requiredScope:'mcp.destructive',risk:'critical',requestId:requestId()}))}catch(error){return fail(error)}
})

server.registerTool('ace_confirm_action',{title:'Confirm action',description:'Confirm a previously prepared action after reviewing its preview.',inputSchema:z.object({actionId:z.string().min(1),idempotencyKey:z.string().min(8).max(160)}),outputSchema:z.object({actionId:z.string(),status:z.string()}).passthrough()},async({actionId,idempotencyKey})=>{
  try{assertScope('mcp.execute');return result(await confirmMcpAction({workspaceId,actorId:auth.actorId,role:auth.role,actionId,idempotencyKey,requestId:requestId()}))}catch(error){return fail(error)}
})

server.registerTool('ace_approve_action',{title:'Approve action',description:'Approve an action held for human approval. Use a different owner/admin token from the token that prepared it.',inputSchema:z.object({actionId:z.string().min(1),idempotencyKey:z.string().min(8).max(160).optional()}),outputSchema:z.object({actionId:z.string(),status:z.string()}).passthrough()},async({actionId,idempotencyKey})=>{
  try{assertScope('mcp.admin');assertRole('mcp.admin');return result(await approveMcpAction({workspaceId,actorId:auth.actorId,role:auth.role,actionId,idempotencyKey,requestId:requestId()}))}catch(error){return fail(error)}
})

server.registerTool('ace_get_job_status',{title:'Get job status',description:'Read a bounded job result from the current workspace.',inputSchema:z.object({jobId:z.string().min(1).max(160)}),outputSchema:z.object({jobId:z.string(),status:z.string()}).passthrough()},async({jobId})=>{
  try{assertScope('mcp.read');assertRole('workspace.read');const job=await getJob({workspaceId,id:jobId});return job?result({jobId,status:job.status,job:sanitizeMcpValue(job)}):fail(new Error('job not found'))}catch(error){return fail(error)}
})

server.registerTool('ace_cancel_job',{title:'Cancel job',description:'Prepare cancellation of a queued job; call ace_confirm_action with the returned action id.',inputSchema:z.object({jobId:z.string().min(1).max(160)}),outputSchema:z.object({actionId:z.string(),status:z.string(),preview:z.unknown(),expiresAt:z.string()}).passthrough()},async({jobId})=>{
  try{assertScope('mcp.draft');assertRole('workspace.write');return result(await prepareMcpAction({workspaceId,actorId:auth.actorId,role:auth.role,actionType:'job.cancel',input:{jobId},requiredPermission:'workspace.write',requiredScope:'mcp.execute',risk:'high',requestId:requestId()}))}catch(error){return fail(error)}
})

server.registerTool('ace_retry_job',{title:'Retry job',description:'Prepare replay of a dead-letter job; call ace_confirm_action with the returned action id.',inputSchema:z.object({jobId:z.string().min(1).max(160)}),outputSchema:z.object({actionId:z.string(),status:z.string(),preview:z.unknown(),expiresAt:z.string()}).passthrough()},async({jobId})=>{
  try{assertScope('mcp.draft');assertRole('workspace.write');return result(await prepareMcpAction({workspaceId,actorId:auth.actorId,role:auth.role,actionType:'job.retry',input:{jobId},requiredPermission:'workspace.write',requiredScope:'mcp.execute',risk:'high',requestId:requestId()}))}catch(error){return fail(error)}
})

server.registerResource('ace-workspace-overview','ace://workspace/overview',{title:'Workspace overview',description:'Workspace overview and connector state.',mimeType:'application/json'},async uri=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(await readMcpResource({workspaceId,uri:uri.href}))}]}))
server.registerResource('ace-campaign-performance','ace://campaigns/performance',{title:'Campaign performance',description:'Persisted campaign performance evidence.',mimeType:'application/json'},async uri=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(await readMcpResource({workspaceId,uri:uri.href}))}]}))
server.registerResource('ace-integration-health','ace://integrations/health',{title:'Integration health',description:'Connector health and delivery evidence.',mimeType:'application/json'},async uri=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(await readMcpResource({workspaceId,uri:uri.href}))}]}))
server.registerResource('ace-lead-quality','ace://leads/quality',{title:'Lead quality',description:'Persisted lead quality evidence.',mimeType:'application/json'},async uri=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(await readMcpResource({workspaceId,uri:uri.href}))}]}))
server.registerResource('ace-journeys-recent','ace://journeys/recent',{title:'Recent journeys',description:'Recent customer journey evidence.',mimeType:'application/json'},async uri=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(await readMcpResource({workspaceId,uri:uri.href}))}]}))
server.registerResource('ace-monitoring-alerts','ace://monitoring/alerts',{title:'Monitoring alerts',description:'Persisted monitoring alerts.',mimeType:'application/json'},async uri=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(await readMcpResource({workspaceId,uri:uri.href}))}]}))
server.registerResource('ace-ai-evaluations','ace://ai/evaluations',{title:'AI evaluations',description:'Persisted AI evaluation evidence.',mimeType:'application/json'},async uri=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(await readMcpResource({workspaceId,uri:uri.href}))}]}))
server.registerResource('ace-audit-recent','ace://audit/recent',{title:'Recent audit',description:'Recent workspace audit events.',mimeType:'application/json'},async uri=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(await readMcpResource({workspaceId,uri:uri.href}))}]}))

server.registerPrompt('ace_campaign_review',{title:'Campaign review',description:'Review campaign performance using evidence from the current workspace.',argsSchema:z.object({question:z.string().optional()} )},({question=''})=>({messages:[{role:'user',content:{type:'text',text:`Review current campaign performance for this workspace. ${question}\nUse evidence, distinguish facts from inferences, identify limitations, and recommend only governed next steps.`}}]}))
server.registerPrompt('ace_executive_brief',{title:'Executive brief',description:'Prepare an executive marketing brief from workspace evidence.',argsSchema:z.object({period:z.string().optional()} )},({period='current period'})=>({messages:[{role:'user',content:{type:'text',text:`Prepare an executive brief for ${period}. Use AceMarketing evidence, report uncertainty, and separate recommendations from confirmed facts.`}}]}))

const transport=new StdioServerTransport()
await server.connect(transport)
console.error(`[acemarket-mcp] ready workspace=${workspaceId} tools=${getMcpCatalog({kind:'tool'}).length}`)
