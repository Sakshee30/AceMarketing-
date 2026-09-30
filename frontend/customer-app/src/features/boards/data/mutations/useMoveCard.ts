import {useMutation,useQueryClient} from '@tanstack/react-query'
import {ClientHttpError,createHttpClient} from '../../../../../../../packages/client-core/src/http/http-client'
import type {MoveCardIntent} from '../../model/move-card.intent'

export type BoardMoveResult={
  operationId:string
  boardId:string
  itemId:string
  destinationColumnId:string
  rank:string
  itemVersion:number
  policyVersion:number
  orderingRevision:number
  eventId:string
  correlationId:string
  status:'confirmed'
}

type BoardOperation={
  operationId:string
  status:'pending'|'completed'|'failed'
  result:BoardMoveResult|null
  errorCode:string|null
}

export class BoardMoveUnknownOutcomeError extends Error{
  operationId:string
  constructor(operationId:string){
    super('The move may have completed. Reconcile the operation before repeating it.')
    this.name='BoardMoveUnknownOutcomeError'
    this.operationId=operationId
  }
}

const http=createHttpClient('')
const workspaceHeaders=(workspaceId:string)=>({'X-Workspace-ID':workspaceId})

export function useMoveCard(workspaceId:string){
  const queryClient=useQueryClient()
  return useMutation({
    mutationFn:async(intent:MoveCardIntent)=>{
      const path='/api/boards/'+encodeURIComponent(intent.boardId)+'/moves'
      try{
        return await http.post<BoardMoveResult>(path,intent,{headers:workspaceHeaders(workspaceId)})
      }catch(error){
        const problem=error instanceof ClientHttpError?error.problem:null
        const uncertain=problem?.code==='network_error'||problem?.code==='request_timeout'||problem?.status===0
        if(!uncertain)throw error
        try{
          const operation=await http.get<BoardOperation>(
            '/api/boards/'+encodeURIComponent(intent.boardId)+'/operations/'+encodeURIComponent(intent.operationId),
            {headers:workspaceHeaders(workspaceId)}
          )
          if(operation.status==='completed'&&operation.result)return operation.result
          if(operation.status==='failed')throw new ClientHttpError({
            type:'about:blank',
            title:'Move failed',
            status:409,
            code:operation.errorCode||'BOARD_OPERATION_FAILED',
            retryable:false
          })
        }catch(reconcileError){
          if(reconcileError instanceof ClientHttpError&&reconcileError.status!==404)throw reconcileError
        }
        throw new BoardMoveUnknownOutcomeError(intent.operationId)
      }
    },
    onSuccess:async result=>{
      await queryClient.invalidateQueries({queryKey:['board',workspaceId,result.boardId]})
    }
  })
}
