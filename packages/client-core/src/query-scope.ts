export const customerQueryKeys={
  session:(sessionGeneration:number)=>['customer-session',sessionGeneration] as const,
  workspaces:(sessionGeneration:number)=>['customer-session',sessionGeneration,'workspaces'] as const,
  dashboard:(sessionGeneration:number,workspaceId:string,workspaceGeneration:number)=>[
    'customer-session',sessionGeneration,'workspace',workspaceId,'generation',workspaceGeneration,'dashboard-summary'
  ] as const
}

export const currentWorkspaceScopeId=()=>{
  if(typeof window==='undefined')return 'server'
  return window.localStorage.getItem('ace_workspace_id')||'ws_default'
}

export const shouldRetryCustomerRead=(failureCount:number,error:any)=>{
  if(failureCount>=2)return false
  const status=Number(error?.status||0)
  if(status===401||status===403||status===404||status===409||status===422)return false
  if(status===429||status>=500||status===0)return true
  return false
}

export const customerRetryDelay=(attempt:number)=>{
  const base=Math.min(2000,250*Math.pow(2,attempt))
  const jitter=Math.floor(Math.random()*100)
  return base+jitter
}
