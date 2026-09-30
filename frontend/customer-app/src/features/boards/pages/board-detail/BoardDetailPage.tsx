import {useEffect,useMemo,useState} from 'react'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {createHttpClient} from '../../../../../../../packages/client-core/src/http/http-client'
import {createRealtimeClient} from '../../../../../../../packages/client-core/src/realtime/realtime-client'
import {customerSessionLifecycle} from '../../../../app/session/session-lifecycle'
import {BoardViewport,CardShell,Column,DragHandle,InteractionStatus,MoveMenu} from '../../../../../../../packages/kanban-ui/src'
import {createMoveCardOperationId} from '../../model/move-card.intent'
import {BoardMoveUnknownOutcomeError,useMoveCard} from '../../data/mutations/useMoveCard'

type BoardColumn={id:string;stateKey:string;name:string;position:number;wipLimit:number|null;version:number}
type BoardItem={
  id:string
  resourceType:string
  resourceId:string
  columnId:string
  rank:string
  itemVersion:number
  policyVersion:number
  metadata:Record<string,unknown>
}
type BoardSnapshot={
  id:string
  name:string
  status:string
  policyVersion:number
  orderingRevision:number
  version:number
  columns:BoardColumn[]
  items:BoardItem[]
}

const http=createHttpClient('')

export default function BoardDetailPage({workspaceId,boardId}:{workspaceId:string;boardId:string}){
  const [movingItemId,setMovingItemId]=useState<string|null>(null)
  const [announcement,setAnnouncement]=useState('Board ready.')
  const queryClient=useQueryClient()
  const boardQuery=useQuery({
    queryKey:['board',workspaceId,boardId],
    queryFn:()=>http.get<BoardSnapshot>(
      '/api/boards/'+encodeURIComponent(boardId),
      {headers:{'X-Workspace-ID':workspaceId}}
    )
  })
  const moveMutation=useMoveCard(workspaceId)
  useEffect(()=>{
    const token=customerSessionLifecycle.token()
    if(!token)return
    const configured=String(import.meta.env.VITE_REALTIME_URL||'').trim()
    const fallback=window.location.hostname==='localhost'
      ?'ws://localhost:3003/api/realtime/ws'
      :(window.location.protocol==='https:'?'wss://':'ws://')+window.location.host+'/api/realtime/ws'
    const realtimeUrl=new URL(configured||fallback,window.location.href)
    realtimeUrl.searchParams.set('workspace_id',workspaceId)
    realtimeUrl.searchParams.set('topics','board.item.moved')
    const client=createRealtimeClient({
      url:realtimeUrl.toString(),
      token,
      tokenTransport:'subprotocol',
      onEvent:event=>{
        if(event.type!=='board.item.moved')return
        const payload=event.payload as {data?:{boardId?:string},boardId?:string}
        const changedBoardId=payload?.data?.boardId||payload?.boardId
        if(changedBoardId&&changedBoardId!==boardId)return
        void queryClient.invalidateQueries({queryKey:['board',workspaceId,boardId]})
        setAnnouncement('Board updated from a confirmed realtime event.')
      }
    })
    client.connect()
    return()=>client.close()
  },[workspaceId,boardId,queryClient])
  const board=boardQuery.data
  const itemsByColumn=useMemo(()=>{
    const grouped=new Map<string,BoardItem[]>()
    for(const item of board?.items||[]){
      const list=grouped.get(item.columnId)||[]
      list.push(item)
      grouped.set(item.columnId,list)
    }
    return grouped
  },[board?.items])

  if(boardQuery.isLoading)return <section aria-busy="true"><h1>Loading board</h1><p>Loading the canonical workspace board.</p></section>
  if(boardQuery.isError||!board)return <section role="alert"><h1>Board unavailable</h1><p>The board could not be loaded. Existing workspace data has not been changed.</p></section>

  const movingItem=board.items.find(item=>item.id===movingItemId)||null
  const destinations=board.columns.map(column=>({
    id:column.id,
    label:column.name,
    disabled:movingItem?.columnId===column.id,
    reason:movingItem?.columnId===column.id?'Already in this column':undefined
  }))

  const move=async(destinationColumnId:string)=>{
    if(!movingItem)return
    const destination=board.columns.find(column=>column.id===destinationColumnId)
    if(!destination)return
    const operationId=createMoveCardOperationId()
    setAnnouncement('Moving '+movingItem.resourceId+' to '+destination.name+'.')
    try{
      await moveMutation.mutateAsync({
        operationId,
        boardId:board.id,
        itemId:movingItem.id,
        expectedItemVersion:movingItem.itemVersion,
        expectedPolicyVersion:board.policyVersion,
        destinationColumnId,
        placement:{mode:'bottom'},
        reason:'Customer-requested board move'
      })
      setAnnouncement('Move confirmed by the server.')
      setMovingItemId(null)
    }catch(error){
      if(error instanceof BoardMoveUnknownOutcomeError){
        setAnnouncement('Move outcome is unknown. Reconcile this operation before repeating it.')
      }else{
        setAnnouncement(error instanceof Error?error.message:'Move failed.')
      }
    }
  }

  return <section aria-labelledby="board-detail-title">
    <header>
      <h1 id="board-detail-title">{board.name}</h1>
      <p>Ordering revision {board.orderingRevision}. Moves are confirmed only after durable server commit.</p>
    </header>
    <InteractionStatus message={announcement}/>
    <BoardViewport label={board.name}>
      {board.columns.map(column=>{
        const items=itemsByColumn.get(column.id)||[]
        return <Column key={column.id} id={column.id} label={column.name} count={items.length}>
          {items.map(item=><CardShell key={item.id} id={item.id} label={String(item.metadata?.title||item.resourceId)} pending={moveMutation.isPending&&movingItemId===item.id}>
            <strong>{String(item.metadata?.title||item.resourceId)}</strong>
            <DragHandle label={'Move '+String(item.metadata?.title||item.resourceId)} onActivate={()=>setMovingItemId(item.id)} disabled={moveMutation.isPending}/>
          </CardShell>)}
          {!items.length&&<p role="status">No items in this column.</p>}
        </Column>
      })}
    </BoardViewport>
    {movingItem&&<MoveMenu
      label={'Move '+String(movingItem.metadata?.title||movingItem.resourceId)+' to'}
      destinations={destinations}
      onMove={move}
      onCancel={()=>{setMovingItemId(null);setAnnouncement('Move cancelled.')}}
    />}
    {moveMutation.isError&&<p role="alert">{announcement}</p>}
  </section>
}
