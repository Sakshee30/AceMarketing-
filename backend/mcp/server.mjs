import {McpServer} from '@modelcontextprotocol/server'
import {StdioServerTransport} from '@modelcontextprotocol/server/stdio'
import * as z from 'zod/v4'
import {randomUUID} from 'node:crypto'
import {authenticateMcpToken,getMcpCatalog,getMcpStatus,readMcpResource,prepareMcpAction,confirmMcpAction,MCP_SERVER_VERSION} from '../src/mcp-service.mjs'

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
    'workspace.write':['owner','admin']
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

server.registerTool('ace_confirm_action',{title:'Confirm action',description:'Confirm a previously prepared action after reviewing its preview.',inputSchema:z.object({actionId:z.string().min(1),idempotencyKey:z.string().min(8).max(160)}),outputSchema:z.object({actionId:z.string(),status:z.string()}).passthrough()},async({actionId,idempotencyKey})=>{
  try{assertScope('mcp.execute');return result(await confirmMcpAction({workspaceId,actorId:auth.actorId,role:auth.role,actionId,idempotencyKey,requestId:requestId()}))}catch(error){return fail(error)}
})

server.registerTool('ace_get_job_status',{title:'Get job status',description:'Read a bounded job result from the current workspace.',inputSchema:z.object({jobId:z.string().min(1).max(160)}),outputSchema:z.object({jobId:z.string(),status:z.string()})},async({jobId})=>{
  try{assertScope('mcp.read');assertRole('workspace.read');return result({jobId,status:'Use the AceMarketing job and audit APIs for the current durable job state.',workspaceId})}catch(error){return fail(error)}
})

server.registerResource('ace-workspace-overview','ace://workspace/overview',{title:'Workspace overview',description:'Workspace overview and connector state.',mimeType:'application/json'},async uri=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(await readMcpResource({workspaceId,uri:uri.href}))}]}))
server.registerResource('ace-campaign-performance','ace://campaigns/performance',{title:'Campaign performance',description:'Persisted campaign performance evidence.',mimeType:'application/json'},async uri=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(await readMcpResource({workspaceId,uri:uri.href}))}]}))
server.registerResource('ace-integration-health','ace://integrations/health',{title:'Integration health',description:'Connector health and delivery evidence.',mimeType:'application/json'},async uri=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(await readMcpResource({workspaceId,uri:uri.href}))}]}))

server.registerPrompt('ace_campaign_review',{title:'Campaign review',description:'Review campaign performance using evidence from the current workspace.',argsSchema:z.object({question:z.string().optional()} )},({question=''})=>({messages:[{role:'user',content:{type:'text',text:`Review current campaign performance for this workspace. ${question}\nUse evidence, distinguish facts from inferences, identify limitations, and recommend only governed next steps.`}}]}))
server.registerPrompt('ace_executive_brief',{title:'Executive brief',description:'Prepare an executive marketing brief from workspace evidence.',argsSchema:z.object({period:z.string().optional()} )},({period='current period'})=>({messages:[{role:'user',content:{type:'text',text:`Prepare an executive brief for ${period}. Use AceMarketing evidence, report uncertainty, and separate recommendations from confirmed facts.`}}]}))

const transport=new StdioServerTransport()
await server.connect(transport)
console.error(`[acemarket-mcp] ready workspace=${workspaceId} tools=${getMcpCatalog({kind:'tool'}).length}`)
