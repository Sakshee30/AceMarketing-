export type QueryScope={
  sessionGeneration:number
  tenantId?:string|null
  workspaceId?:string|null
  workspaceGeneration?:number
}

const safe=(value:string|null|undefined)=>String(value||'none').trim()||'none'

export const scopeKey=(scope:QueryScope,...parts:readonly unknown[])=>[
  'scope',
  'session',Math.max(0,scope.sessionGeneration),
  'tenant',safe(scope.tenantId),
  'workspace',safe(scope.workspaceId),
  'workspace-generation',Math.max(0,scope.workspaceGeneration||0),
  ...parts
] as const

export const sameScope=(left:QueryScope,right:QueryScope)=>
  left.sessionGeneration===right.sessionGeneration&&
  safe(left.tenantId)===safe(right.tenantId)&&
  safe(left.workspaceId)===safe(right.workspaceId)&&
  (left.workspaceGeneration||0)===(right.workspaceGeneration||0)
