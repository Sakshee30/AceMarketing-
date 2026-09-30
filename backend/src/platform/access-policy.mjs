const readMappings=[
  [/^\/api\/members(?:\/|$)/,'members.read'],
  [/^\/api\/(reports|attribution|journeys)(?:\/|$)/,'reports.read'],
  [/^\/api\/(monitoring|alerts|connector-health)(?:\/|$)/,'monitoring.read']
]

const writeMappings=[
  [/^\/api\/(members|invitations)(?:\/|$)/,'members.write'],
  [/^\/api\/(integrations|custom-integrations)(?:\/|$)/,'integrations.write'],
  [/^\/api\/(agents|models\/run)(?:\/|$)/,'agents.write'],
  [/^\/api\/audiences(?:\/|$)/,'audiences.write'],
  [/^\/api\/approvals(?:\/|$)/,'approvals.write'],
  [/^\/api\/follow-ups(?:\/|$)/,'followups.write'],
  [/^\/api\/qualification-calls(?:\/|$)/,'calls.write'],
  [/^\/api\/meetings(?:\/|$)/,'meetings.write'],
  [/^\/api\/signal-deliveries(?:\/|$)/,'delivery.write'],
  [/^\/api\/(api-keys|webhooks)(?:\/|$)/,'developer.write']
]

const aiPermission=(method,path)=>{
  if(path.startsWith('/api/ai/analyst/tools'))return 'ai.analysis.run'
  if(path==='/api/ai/knowledge/search')return 'ai.analysis.run'
  if(path.startsWith('/api/ai/knowledge'))return method==='GET'?'workspace.read':'ai.knowledge.write'
  if(path==='/api/ai/analysis')return 'ai.analysis.run'
  if(path.startsWith('/api/ai/tasks/')&&path.endsWith('/shadow'))return 'ai.evaluation.write'
  if(path.startsWith('/api/ai/tasks/'))return 'ai.analysis.run'
  if(path.startsWith('/api/ai/deployment-controls'))return method==='GET'?'workspace.read':'ai.providers.manage'
  if(path.startsWith('/api/ai/task-policies'))return method==='GET'?'workspace.read':'ai.providers.manage'
  if(path.startsWith('/api/ai/activation-proposals')){
    if(method==='GET')return 'workspace.read'
    if(path.endsWith('/execute'))return 'ai.activation.execute'
    if(path.endsWith('/approve')||path.endsWith('/reject'))return 'ai.activation.approve'
    return 'ai.activation.propose'
  }
  if(path.startsWith('/api/ai/creative-assets')&&method!=='GET')return 'approvals.write'
  if(path.startsWith('/api/ai/anomalies')&&method!=='GET')return 'ai.evaluation.write'
  if(path.startsWith('/api/ai/datasets')&&method!=='GET')return 'ai.training.run'
  if(path.startsWith('/api/ai/ml/train/')||path==='/api/ai/ml/rank')return 'ai.training.run'
  if(path.startsWith('/api/ai/live-voice'))return 'calls.write'
  if(
    path==='/api/ai/ml/score'||
    path==='/api/ai/ml/rank/score'||
    path==='/api/ai/ml/forecast/seasonal-naive'||
    path==='/api/ai/ml/forecast/chronos-2'||
    path==='/api/ai/ml/forecast/catboost-challenger'||
    path==='/api/ai/ml/forecast/qualify'||
    path==='/api/ai/ml/incrementality'||
    path==='/api/ai/ml/marketing-mix'||
    path==='/api/ai/ml/anomalies'||
    path==='/api/ai/ml/segments'||
    path.includes('/api/ai/jobs/')
  )return 'ai.analysis.run'
  return null
}

export const permissionForRequest=(method,path)=>{
  const normalizedMethod=String(method||'GET').toUpperCase()
  const normalizedPath=String(path||'/')
  if(normalizedPath==='/api/auth/logout'||normalizedPath==='/api/auth/me')return 'workspace.read'

  const ai=aiPermission(normalizedMethod,normalizedPath)
  if(ai)return ai

  if(normalizedMethod==='GET'){
    for(const [pattern,permission] of readMappings)if(pattern.test(normalizedPath))return permission
    return 'workspace.read'
  }

  for(const [pattern,permission] of writeMappings)if(pattern.test(normalizedPath))return permission
  return 'workspace.write'
}

export const assertRequestPermission=({role,method,path,hasPermission})=>{
  const permission=permissionForRequest(method,path)
  const allowed=Boolean(hasPermission(role,permission))
  if(!allowed){
    const error=new Error('permission denied')
    error.status=403
    error.code='permission_denied'
    error.permission=permission
    throw error
  }
  return permission
}
