import {submitHostedAiJob} from '../../../../../../src/ai-runtime.mjs'

export const handleRequestInference=async({
  workspaceId,
  task,
  input,
  sourceSnapshot,
  idempotencyKey,
  actor,
  executionMode='active',
  submit=submitHostedAiJob
})=>{
  const scope=String(workspaceId||'').trim()
  const taskName=String(task||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(!taskName)throw Object.assign(new Error('AI task required'),{status:400,code:'ai_task_required'})
  return submit({
    workspaceId:scope,
    task:taskName,
    input:input&&typeof input==='object'&&!Array.isArray(input)?input:{},
    sourceSnapshot:sourceSnapshot&&typeof sourceSnapshot==='object'&&!Array.isArray(sourceSnapshot)?sourceSnapshot:{},
    idempotencyKey:String(idempotencyKey||''),
    actor,
    executionMode
  })
}
