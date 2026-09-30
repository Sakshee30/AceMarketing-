import {moveBoardItem} from '../../../../../../src/platform/board-store.mjs'

export const handleMoveCard=async({
  workspaceId,
  actorId=null,
  requestId=null,
  correlationId=null,
  command,
  authorize
})=>moveBoardItem({
  workspaceId,
  actorId,
  requestId,
  correlationId,
  command,
  authorize
})
