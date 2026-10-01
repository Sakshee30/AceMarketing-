import {indexExtractedObject} from '../../../../../../src/platform/document-processing.mjs'

export const handleRebuildSearchIndex=async({
  workspaceId,
  objectId,
  text,
  evidence={},
  rebuild=indexExtractedObject
})=>{
  const scope=String(workspaceId||'').trim()
  const id=String(objectId||'').trim()
  const extracted=String(text||'')
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(!id)throw Object.assign(new Error('object id required'),{status:400,code:'object_id_required'})
  if(!extracted.trim())throw Object.assign(new Error('extracted text required'),{status:400,code:'search_rebuild_text_required'})
  return rebuild({workspaceId:scope,objectId:id,text:extracted,evidence:evidence||{}})
}
