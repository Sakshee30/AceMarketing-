import {decideWorkflowApproval} from '../../../../../../src/platform/workflow-store.mjs'

const decisions=new Set(['approved','rejected'])

export const handleDecideApproval=async({
  workspaceId,
  approvalId,
  actorId=null,
  decision,
  comment='',
  decide=decideWorkflowApproval
})=>{
  const scope=String(workspaceId||'').trim()
  const id=String(approvalId||'').trim()
  const normalized=String(decision||'').trim().toLowerCase()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(!id)throw Object.assign(new Error('workflow approval id required'),{status:400,code:'workflow_approval_id_required'})
  if(!decisions.has(normalized))throw Object.assign(new Error('approval decision must be approved or rejected'),{status:400,code:'workflow_approval_decision_invalid'})
  return decide({
    workspaceId:scope,
    approvalId:id,
    actorId,
    decision:normalized,
    comment:String(comment||'')
  })
}
