import {handleUpdateWorkspace} from '../../../../../workspaces/src/application/commands/update-workspace/update-workspace.handler.mjs'

export const handleUpdateOrganization=async({
  workspaceId,
  organization,
  actorId=null,
  update=handleUpdateWorkspace
})=>{
  const scope=String(workspaceId||'').trim()
  const name=String(organization||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(name.length<2||name.length>160)throw Object.assign(new Error('organization name must be 2-160 characters'),{status:400,code:'organization_name_invalid'})
  return update({workspaceId:scope,patch:{organization:name},actorId})
}
