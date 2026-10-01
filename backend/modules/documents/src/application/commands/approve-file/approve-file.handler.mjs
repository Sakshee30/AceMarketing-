import {recordObjectScan} from '../../../../../../src/platform/object-lifecycle.mjs'

export const handleApproveFile=async({
  workspaceId,
  objectId,
  result,
  evidence={},
  actorId=null,
  record=recordObjectScan
})=>{
  const scope=String(workspaceId||'').trim()
  const id=String(objectId||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(!id)throw Object.assign(new Error('object id required'),{status:400,code:'object_id_required'})
  if(!['clean','infected','error'].includes(String(result))){
    throw Object.assign(new Error('invalid scan result'),{status:400,code:'object_scan_result_invalid'})
  }
  return record({workspaceId:scope,objectId:id,result:String(result),evidence:evidence||{},actorId})
}
