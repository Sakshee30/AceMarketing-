import {moveBoardItem} from '../../../../../../src/platform/board-store.mjs'

export type MoveCardCommand={
  operationId:string
  boardId:string
  itemId:string
  expectedItemVersion:number
  expectedPolicyVersion:number
  destinationColumnId:string
  placement:{mode:'top'|'bottom'|'between';beforeItemId?:string|null;afterItemId?:string|null}
  reason?:string
}

export const handleMoveCard=async(input:{
  workspaceId:string
  actorId:string|null
  requestId?:string|null
  correlationId?:string|null
  command:MoveCardCommand
  authorize:(context:unknown)=>boolean|Promise<boolean>
})=>moveBoardItem(input)
