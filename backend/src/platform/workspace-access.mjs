const normalizeEmail=value=>String(value||'').trim().toLowerCase()

export const activeWorkspaceMembership=(state,actor)=>{
  const members=Array.isArray(state?.members)?state.members:[]
  const actorId=String(actor?.userId||actor?.sub||'').trim()
  const actorEmail=normalizeEmail(actor?.email||actor?.sub)
  return members.find(member=>{
    if(String(member?.status||'active')!=='active')return false
    if(actorId&&String(member?.id||'')===actorId)return true
    if(actorEmail&&normalizeEmail(member?.email)===actorEmail)return true
    return false
  })||null
}

export const assertWorkspaceMembership=(state,actor)=>{
  const member=activeWorkspaceMembership(state,actor)
  if(member)return member
  const error=new Error('workspace membership required')
  error.status=403
  error.code='workspace_membership_required'
  throw error
}

export const seedWorkspaceCreator=(state,actor)=>{
  state.members=Array.isArray(state.members)?state.members:[]
  const existing=activeWorkspaceMembership(state,actor)
  if(existing)return existing

  const email=normalizeEmail(actor?.email||actor?.sub)
  const userId=String(actor?.userId||actor?.sub||'').trim()
  if(!email||!userId)throw new Error('authenticated creator identity is required')

  const member={
    id:userId,
    email,
    name:String(actor?.name||email.split('@')[0]||'Workspace member'),
    role:String(actor?.role||'admin'),
    status:'active',
    createdAt:new Date().toISOString()
  }
  state.members.push(member)
  return member
}
