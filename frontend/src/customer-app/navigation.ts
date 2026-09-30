import {
  buildWorkspaceHash,
  parseWorkspaceIdFromHash,
  parseWorkspaceTabFromHash
} from '../features/workspace/manifest'

export type CustomerRoute=
  |{kind:'login'}
  |{kind:'workspace';workspaceId:string|null;tab:string|null}
  |{kind:'unknown'}

export const parseCustomerRoute=(hash:string):CustomerRoute=>{
  const value=hash||'#/workspace'
  if(value.startsWith('#/login'))return {kind:'login'}
  if(value.startsWith('#/workspace')){
    return {
      kind:'workspace',
      workspaceId:parseWorkspaceIdFromHash(value),
      tab:parseWorkspaceTabFromHash(value)
    }
  }
  return {kind:'unknown'}
}

export const customerWorkspaceHash=(tab:string,workspaceId?:string|null)=>buildWorkspaceHash(tab,workspaceId)

export const normalizeCustomerHash=(hash:string)=>{
  const route=parseCustomerRoute(hash)
  return route.kind==='unknown'?'#/workspace':hash||'#/workspace'
}
