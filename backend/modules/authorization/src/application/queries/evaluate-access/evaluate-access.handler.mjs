import {permissionForRequest as resolvePermission} from '../../../../../../src/platform/access-policy.mjs'

export const handleEvaluateAccess=({
  role,
  method='GET',
  path='/',
  hasPermission,
  permissionResolver=resolvePermission
})=>{
  if(typeof hasPermission!=='function'){
    throw Object.assign(new Error('permission evaluator is required'),{status:500,code:'permission_evaluator_required'})
  }
  const permission=permissionResolver(method,path)
  const allowed=Boolean(hasPermission(role,permission))
  return Object.freeze({
    permission,
    allowed,
    decision:allowed?'allow':'deny'
  })
}

export const evaluateAccessPermission=(method,path)=>resolvePermission(method,path)
