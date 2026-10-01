import {queueAiActivationExecution} from '../../../../../../src/ai-activation-execution.mjs'

export const handleActivateModelResult=async({
  workspaceId,
  proposalId,
  actor,
  queue=queueAiActivationExecution
})=>{
  const scope=String(workspaceId||'').trim()
  const id=String(proposalId||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(!id)throw Object.assign(new Error('activation proposal id required'),{status:400,code:'ai_activation_id_required'})
  return queue({workspaceId:scope,id,actor})
}
