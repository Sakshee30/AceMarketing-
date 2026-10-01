import {randomUUID} from 'node:crypto'
import {mutateState} from '../../../../../../src/store.mjs'

export const handleRemoveMember=async({
  workspaceId,
  memberId,
  actorId,
  mutate=mutateState,
  now=()=>new Date().toISOString()
})=>{
  const scope=String(workspaceId||'').trim()
  const target=String(memberId||'').trim()
  const actor=String(actorId||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(!target)throw Object.assign(new Error('memberId required'),{status:400,code:'member_id_required'})
  if(target===actor)throw Object.assign(new Error('cannot deactivate your own active session'),{status:409,code:'self_deactivation_denied'})
  const at=now()
  let updated=null
  await mutate(state=>{
    const member=(state.members||[]).find(item=>String(item.id)===target)
    if(member){
      member.status='inactive'
      member.updatedAt=at
      updated={...member}
      delete updated.passwordHash
    }
    state.sessions=(state.sessions||[]).map(session=>
      String(session.userId)===target?{...session,status:'revoked',revokedAt:at}:session
    )
    state.audit=state.audit||[]
    state.audit.unshift({id:randomUUID(),action:'member.deactivated',entityId:target,actorId:actor||null,at})
    state.audit=state.audit.slice(0,1000)
  })
  return updated
}
