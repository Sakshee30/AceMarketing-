import {getWorkspacePlacement,upsertWorkspacePlacement} from '../../../../../../src/platform/cell-placement.mjs'

export const handleMoveTenant=async({
  workspaceId,
  homeCell,
  homeRegion,
  expectedRoutingEpoch=null,
  state='moving',
  dedicated=false,
  getPlacement=getWorkspacePlacement,
  upsert=upsertWorkspacePlacement
})=>{
  const scope=String(workspaceId||'').trim()
  const cell=String(homeCell||'').trim()
  const region=String(homeRegion||'').trim()
  if(!scope||!cell||!region)throw Object.assign(new Error('workspaceId, homeCell and homeRegion are required'),{status:400,code:'cell_placement_invalid'})
  const current=await getPlacement(scope,{fresh:true})
  if(expectedRoutingEpoch!=null&&current&&Number(current.routingEpoch)!==Number(expectedRoutingEpoch)){
    throw Object.assign(new Error('workspace routing epoch conflict'),{status:409,code:'cell_routing_epoch_conflict',currentRoutingEpoch:Number(current.routingEpoch)})
  }
  const nextEpoch=Math.max(1,Number(current?.routingEpoch||0)+1)
  return upsert({workspaceId:scope,homeCell:cell,homeRegion:region,routingEpoch:nextEpoch,state,dedicated})
}
