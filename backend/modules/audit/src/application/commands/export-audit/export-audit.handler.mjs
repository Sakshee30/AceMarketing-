import {handleSubmitJob} from '../../../../../jobs/src/application/commands/submit-job/submit-job.handler.mjs'

export const handleExportAudit=async({
  workspaceId,
  limit=500,
  before=null,
  actorId=null,
  requestId=null,
  submit=handleSubmitJob
})=>{
  const scope=String(workspaceId||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  const bounded=Math.max(1,Math.min(500,Number(limit)||500))
  return submit({
    workspaceId:scope,
    kind:'audit_export',
    payload:{limit:bounded,before:before||null,requestedBy:actorId||null},
    idempotencyKey:'audit-export:'+scope+':'+String(requestId||before||bounded),
    maxAttempts:3,
    resultSchemaVersion:'audit-export.v1'
  })
}
