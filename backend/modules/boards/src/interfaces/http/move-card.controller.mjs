import {handleMoveCard} from '../../application/commands/move-card/move-card.handler.mjs'

export const moveCardController=async({
  workspaceId,
  actorId=null,
  requestId=null,
  correlationId=null,
  boardId,
  body,
  canMove=false
})=>{
  if(!workspaceId)throw Object.assign(new Error('workspace scope required'),{status:400,code:'WORKSPACE_SCOPE_REQUIRED'})
  if(!boardId)throw Object.assign(new Error('board id required'),{status:400,code:'BOARD_ID_REQUIRED'})
  return handleMoveCard({
    workspaceId,
    actorId,
    requestId,
    correlationId,
    command:{...(body||{}),boardId:String(boardId)},
    authorize:()=>Boolean(canMove)
  })
}
