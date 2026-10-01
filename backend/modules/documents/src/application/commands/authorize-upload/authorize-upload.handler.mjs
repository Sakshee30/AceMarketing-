import {createUploadIntent} from '../../../../../../src/platform/object-lifecycle.mjs'

export const handleAuthorizeUpload=async({
  workspaceId,
  name,
  mime,
  size,
  sha256,
  accessPolicy={},
  actorId=null,
  authorize=createUploadIntent
})=>{
  const scope=String(workspaceId||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  return authorize({
    workspaceId:scope,
    name,
    mime,
    size,
    sha256,
    accessPolicy:accessPolicy&&typeof accessPolicy==='object'&&!Array.isArray(accessPolicy)?accessPolicy:{},
    actorId
  })
}
