import {cancelWorkspaceRequests} from '../../../../src/lib/api'
import {confirmDiscardDirtyWork} from '../../../../src/lib/dirty-work'

let workspaceGeneration=0
export const getWorkspaceGeneration=()=>workspaceGeneration

export const beginWorkspaceTransition=(label:string)=>{
  if(!confirmDiscardDirtyWork(label))return null
  cancelWorkspaceRequests('workspace_scope_changed')
  workspaceGeneration+=1
  return {generation:workspaceGeneration,startedAt:Date.now()}
}

export const isCurrentWorkspaceGeneration=(generation:number)=>generation===workspaceGeneration
