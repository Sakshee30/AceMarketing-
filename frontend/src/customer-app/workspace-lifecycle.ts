export type WorkspaceLifecycle={
  generation:number
  workspaceId:string|null
}

export const nextWorkspaceLifecycle=(current:WorkspaceLifecycle,workspaceId:string|null):WorkspaceLifecycle=>({
  generation:current.generation+1,
  workspaceId
})

export const createWorkspaceRequestGuard=(lifecycle:WorkspaceLifecycle)=>{
  const expectedGeneration=lifecycle.generation
  const expectedWorkspace=lifecycle.workspaceId
  return (current:WorkspaceLifecycle)=>
    current.generation===expectedGeneration&&current.workspaceId===expectedWorkspace
}

export const abortableWorkspaceRequest=(reason='workspace_scope_changed')=>{
  const controller=new AbortController()
  return {
    signal:controller.signal,
    abort:()=>controller.abort(reason)
  }
}
