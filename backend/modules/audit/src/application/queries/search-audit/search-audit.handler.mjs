import {listAuditRecords} from '../../../../../../src/platform/audit-store.mjs'

export const handleSearchAudit=async({
  workspaceId,
  limit=250,
  before=null,
  search=listAuditRecords
})=>{
  const scope=String(workspaceId||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  return search({workspaceId:scope,limit:Math.max(1,Math.min(500,Number(limit)||250)),before:before||null})
}
