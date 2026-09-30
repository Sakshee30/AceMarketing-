const isolatedKinds=Object.freeze([
  'webhook_delivery',
  'workflow_step',
  'workflow_execution',
  'workflow_approval',
  'ai_activation_execution',
  'knowledge_embedding',
  'knowledge_search',
  'ml_task',
  'ai_hosted_task'
])

const workflowKinds=Object.freeze([
  'workflow_step',
  'workflow_execution',
  'workflow_approval'
])

const aiDocumentKinds=Object.freeze([
  'ai_activation_execution',
  'knowledge_embedding',
  'knowledge_search',
  'ml_task',
  'ai_hosted_task'
])

export const workerClassPolicy=(value=process.env.WORKER_CLASS||'all')=>{
  const workerClass=String(value||'all').trim().toLowerCase()
  if(workerClass==='all')return {workerClass:'all',includeKinds:null,excludeKinds:null}
  if(workerClass==='general')return {workerClass:'general',includeKinds:null,excludeKinds:[...isolatedKinds]}
  if(workerClass==='webhook')return {workerClass:'webhook',includeKinds:['webhook_delivery'],excludeKinds:null}
  if(workerClass==='workflow')return {workerClass:'workflow',includeKinds:[...workflowKinds],excludeKinds:null}
  if(workerClass==='ai-document')return {workerClass:'ai-document',includeKinds:[...aiDocumentKinds],excludeKinds:null}
  throw Object.assign(new Error('unsupported WORKER_CLASS: '+workerClass),{
    code:'unsupported_worker_class',
    supported:['all','general','workflow','webhook','ai-document']
  })
}

export const workerClassNames=()=>['all','general','workflow','webhook','ai-document']
