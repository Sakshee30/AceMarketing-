import {
  MCP_DEFAULT_POLICY,
  MCP_POLICY_GROUPS,
  MCP_SCOPES,
  MCP_SCOPE_PRESETS,
  MCP_SERVER_VERSION,
  createMcpToken,
  getMcpCatalog,
  getMcpPolicy,
  getMcpStatus,
  listMcpActivity,
  listMcpTokens,
  revokeMcpToken,
  rotateMcpToken,
  runMcpDiagnostics,
  saveMcpPolicy
} from '../../mcp-service.mjs'

const errorPayload=(error,fallback,code)=>({
  error:error instanceof Error?error.message:fallback,
  code:error?.code||code
})

/**
 * Handles workspace MCP management routes.
 * Returns true when the request belongs to this route group.
 */
export const handleMcpRoutes=async({req,res,url,workspaceId,readBody,send:writeResponse})=>{
  const send=(...args)=>{writeResponse(...args);return true}
  if(req.method==='GET'&&url.pathname==='/api/mcp/status'){
    return send(req,res,200,await getMcpStatus(workspaceId))
  }
  if(req.method==='GET'&&url.pathname==='/api/mcp/catalog'){
    const category=url.searchParams.get('category')||null
    const kind=url.searchParams.get('kind')||null
    return send(req,res,200,{serverVersion:MCP_SERVER_VERSION,scopes:MCP_SCOPES,presets:MCP_SCOPE_PRESETS,policyGroups:MCP_POLICY_GROUPS,items:getMcpCatalog({category,kind})})
  }
  if(req.method==='GET'&&url.pathname==='/api/mcp/tokens'){
    return send(req,res,200,{items:await listMcpTokens(workspaceId),presets:MCP_SCOPE_PRESETS,scopes:MCP_SCOPES})
  }
  if(req.method==='POST'&&url.pathname==='/api/mcp/tokens'){
    const body=await readBody(req)
    try{
      const created=await createMcpToken({workspaceId,actorId:req.user?.userId,role:req.user?.role,label:body.label,expiresIn:body.expiresIn||body.expiresAt||'1h',scopes:body.scopes,preset:body.preset||'analyst',requestId:req.requestId,traceId:req.context?.traceId})
      return send(req,res,201,created)
    }catch(error){return send(req,res,Number(error?.status||400),errorPayload(error,'MCP token creation failed','mcp_token_creation_failed'))}
  }
  const tokenAction=url.pathname.match(/^\/api\/mcp\/tokens\/([^/]+)\/(revoke|rotate)$/)
  if(req.method==='POST'&&tokenAction){
    try{
      const id=decodeURIComponent(tokenAction[1])
      if(tokenAction[2]==='revoke')return send(req,res,200,await revokeMcpToken({workspaceId,id,actorId:req.user?.userId,requestId:req.requestId,traceId:req.context?.traceId}))
      return send(req,res,201,await rotateMcpToken({workspaceId,id,actorId:req.user?.userId,role:req.user?.role,requestId:req.requestId,traceId:req.context?.traceId}))
    }catch(error){return send(req,res,Number(error?.status||400),errorPayload(error,'MCP token action failed','mcp_token_action_failed'))}
  }
  if(req.method==='GET'&&url.pathname==='/api/mcp/policy'){
    return send(req,res,200,{policy:await getMcpPolicy(workspaceId),groups:MCP_POLICY_GROUPS,defaults:MCP_DEFAULT_POLICY})
  }
  if(req.method==='PUT'&&url.pathname==='/api/mcp/policy'){
    const body=await readBody(req)
    try{
      const policy=await saveMcpPolicy({workspaceId,policy:body.policy||body,actorId:req.user?.userId,requestId:req.requestId,traceId:req.context?.traceId})
      return send(req,res,200,{policy})
    }catch(error){return send(req,res,Number(error?.status||400),errorPayload(error,'MCP policy update failed','mcp_policy_update_failed'))}
  }
  if(req.method==='GET'&&url.pathname==='/api/mcp/activity'){
    return send(req,res,200,{items:await listMcpActivity({workspaceId,limit:Number(url.searchParams.get('limit')||100)})})
  }
  if(req.method==='POST'&&url.pathname==='/api/mcp/diagnostics'){
    try{return send(req,res,200,await runMcpDiagnostics(workspaceId))}
    catch(error){return send(req,res,503,errorPayload(error,'MCP diagnostics unavailable','mcp_diagnostics_unavailable'))}
  }
  return false
}
