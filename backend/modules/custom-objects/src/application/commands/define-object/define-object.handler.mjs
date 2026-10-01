import {createCustomObject} from '../../../../../../src/platform/custom-object-store.mjs'

export const handleDefineCustomObject=async({
  workspaceId,
  objectKey,
  name,
  description='',
  schema,
  actorId=null,
  create=createCustomObject
})=>{
  const scope=String(workspaceId||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  return create({
    workspaceId:scope,
    objectKey,
    name,
    description,
    schema,
    actorId
  })
}
