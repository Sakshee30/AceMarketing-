import {enqueueJob} from '../../../../../../src/queue.mjs'

export const handleSubmitJob=async({
  workspaceId,
  kind,
  payload={},
  idempotencyKey,
  maxAttempts=5,
  availableAt=null,
  deadlineAt=null,
  inputSnapshot=null,
  resultSchemaVersion=null,
  aiUsageReservation=null,
  outboxEvent=null,
  submit=enqueueJob
})=>{
  const scope=String(workspaceId||'').trim()
  const jobKind=String(kind||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(!jobKind)throw Object.assign(new Error('job kind required'),{status:400,code:'job_kind_required'})
  const attempts=Math.max(1,Math.min(25,Math.floor(Number(maxAttempts)||5)))
  return submit({
    workspaceId:scope,
    kind:jobKind,
    payload:payload&&typeof payload==='object'&&!Array.isArray(payload)?payload:{},
    idempotencyKey:idempotencyKey?String(idempotencyKey):undefined,
    maxAttempts:attempts,
    availableAt,
    deadlineAt,
    inputSnapshot,
    resultSchemaVersion,
    aiUsageReservation,
    outboxEvent
  })
}
