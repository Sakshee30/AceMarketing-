import {querySearch} from '../../../../../../src/platform/search-port.mjs'

export const handleQuerySearch=async({
  workspaceId,
  query,
  role='viewer',
  limit=20,
  sourceType=null,
  search=querySearch
})=>{
  const scope=String(workspaceId||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  const boundedLimit=Math.max(1,Math.min(100,Number(limit)||20))
  return search({
    workspaceId:scope,
    query:String(query||''),
    role:String(role||'viewer'),
    limit:boundedLimit,
    sourceType:sourceType==null?null:String(sourceType)
  })
}
