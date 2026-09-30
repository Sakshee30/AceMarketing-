const workspacePattern=/^[A-Za-z0-9_-]{1,64}$/

export const normalizeWorkspaceId=value=>{
  const workspaceId=String(value||'').trim()
  if(!workspaceId||!workspacePattern.test(workspaceId)){
    const error=new Error('invalid workspace scope')
    error.status=400
    error.code='invalid_workspace_scope'
    throw error
  }
  return workspaceId
}

export const requestedWorkspaceId=(req,{defaultWorkspaceId='ws_default'}={})=>
  normalizeWorkspaceId(req?.headers?.['x-workspace-id']||defaultWorkspaceId)

export const assertActorWorkspace=(actor,workspaceId)=>{
  if(!actor)return true
  const actorWorkspace=normalizeWorkspaceId(actor.workspaceId)
  const requested=normalizeWorkspaceId(workspaceId)
  if(actorWorkspace!==requested){
    const error=new Error('authenticated workspace does not match requested scope')
    error.status=403
    error.code='workspace_scope_mismatch'
    throw error
  }
  return true
}

export const tenantExecutionScope=({actor,workspaceId})=>{
  const resolved=normalizeWorkspaceId(workspaceId)
  assertActorWorkspace(actor,resolved)
  return Object.freeze({
    tenantId:resolved,
    workspaceId:resolved,
    actorId:actor?.userId||actor?.sub||null,
    role:actor?.role||null,
    sessionId:actor?.jti||null
  })
}
