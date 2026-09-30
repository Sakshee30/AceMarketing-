import {boundedRetryDelay,shouldRetryBoundedRead} from './query-policy'
import {scopeKey} from './scope-key'

export const customerQueryKeys={
  session:(sessionGeneration:number)=>scopeKey({sessionGeneration},'customer-session'),
  workspaces:(sessionGeneration:number)=>scopeKey({sessionGeneration},'workspaces'),
  dashboard:(sessionGeneration:number,workspaceId:string,workspaceGeneration:number)=>
    scopeKey({sessionGeneration,workspaceId,workspaceGeneration},'dashboard-summary')
}

export const currentWorkspaceScopeId=()=>{
  if(typeof window==='undefined')return 'server'
  return window.localStorage.getItem('ace_workspace_id')||'ws_default'
}

export const shouldRetryCustomerRead=(failureCount:number,error:any)=>shouldRetryBoundedRead(failureCount,error)

export const customerRetryDelay=(attempt:number)=>boundedRetryDelay(attempt)
