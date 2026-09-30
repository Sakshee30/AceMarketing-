export type BoardMovePlacement=
  |{mode:'top';beforeItemId?:never;afterItemId?:never}
  |{mode:'bottom';beforeItemId?:never;afterItemId?:never}
  |{mode:'between';beforeItemId?:string|null;afterItemId?:string|null}

export type MoveCardIntent={
  operationId:string
  boardId:string
  itemId:string
  expectedItemVersion:number
  expectedPolicyVersion:number
  destinationColumnId:string
  placement:BoardMovePlacement
  reason?:string
}

export const createMoveCardOperationId=()=>(
  globalThis.crypto?.randomUUID?.()||
  'op_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)
)
