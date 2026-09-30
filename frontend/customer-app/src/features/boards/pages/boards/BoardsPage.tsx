import {useEffect,useState} from 'react'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {createHttpClient} from '../../../../../../../packages/client-core/src/http/http-client'
import {createRealtimeClient} from '../../../../../../../packages/client-core/src/realtime/realtime-client'
import {customerSessionLifecycle} from '../../../../app/session/session-lifecycle'
import BoardDetailPage from '../board-detail/BoardDetailPage'

type BoardSummary={
  id:string
  name:string
  status:string
  policyVersion:number
  orderingRevision:number
  version:number
}

const http=createHttpClient('')

export default function BoardsPage({workspaceId}:{workspaceId:string}){
  const queryClient=useQueryClient()
  const [selectedBoardId,setSelectedBoardId]=useState<string|null>(null)
  const [name,setName]=useState('')
  const boardsQuery=useQuery({
    queryKey:['boards',workspaceId],
    queryFn:()=>http.get<{items:BoardSummary[]}>('/api/boards',{headers:{'X-Workspace-ID':workspaceId}})
  })
  useEffect(()=>{
    const token=customerSessionLifecycle.token()
    if(!token)return
    const configured=String(import.meta.env.VITE_REALTIME_URL||'').trim()
    const fallback=window.location.hostname==='localhost'
      ?'ws://localhost:3003/api/realtime/ws'
      :(window.location.protocol==='https:'?'wss://':'ws://')+window.location.host+'/api/realtime/ws'
    const realtimeUrl=new URL(configured||fallback,window.location.href)
    realtimeUrl.searchParams.set('workspace_id',workspaceId)
    realtimeUrl.searchParams.set('topics','board.created')
    const client=createRealtimeClient({
      url:realtimeUrl.toString(),
      token,
      tokenTransport:'subprotocol',
      onEvent:event=>{
        if(event.type==='board.created'){
          void queryClient.invalidateQueries({queryKey:['boards',workspaceId]})
        }
      }
    })
    client.connect()
    return()=>client.close()
  },[workspaceId,queryClient])

  const createMutation=useMutation({
    mutationFn:(boardName:string)=>http.post<{item:BoardSummary}>(
      '/api/boards',
      {name:boardName},
      {headers:{'X-Workspace-ID':workspaceId}}
    ),
    onSuccess:async response=>{
      setName('')
      setSelectedBoardId(response.item.id)
      await queryClient.invalidateQueries({queryKey:['boards',workspaceId]})
    }
  })

  const boards=boardsQuery.data?.items||[]
  useEffect(()=>{
    if(selectedBoardId&&boards.some(board=>board.id===selectedBoardId))return
    setSelectedBoardId(boards[0]?.id||null)
  },[boards,selectedBoardId])

  if(boardsQuery.isLoading)return <section aria-busy="true"><h1>Boards</h1><p>Loading workspace boards.</p></section>
  if(boardsQuery.isError)return <section role="alert"><h1>Boards unavailable</h1><p>The board collection could not be loaded. Existing work was not changed.</p></section>

  return <section aria-labelledby="boards-page-title">
    <header>
      <h1 id="boards-page-title">Boards</h1>
      <p>Move work only after server authorization, version checks and durable confirmation.</p>
    </header>

    <form onSubmit={event=>{
      event.preventDefault()
      const next=name.trim()
      if(next.length>=2)createMutation.mutate(next)
    }}>
      <label htmlFor="new-board-name">New board</label>
      <input id="new-board-name" value={name} onChange={event=>setName(event.target.value)} minLength={2} maxLength={120} placeholder="Campaign operations"/>
      <button type="submit" disabled={createMutation.isPending||name.trim().length<2}>
        {createMutation.isPending?'Creating…':'Create board'}
      </button>
      {createMutation.isError&&<p role="alert">{createMutation.error instanceof Error?createMutation.error.message:'Board could not be created.'}</p>}
    </form>

    {boards.length>0&&<nav aria-label="Workspace boards">
      {boards.map(board=><button
        key={board.id}
        type="button"
        aria-current={selectedBoardId===board.id?'page':undefined}
        onClick={()=>setSelectedBoardId(board.id)}
      >{board.name}</button>)}
    </nav>}

    {!boards.length&&<p role="status">No boards yet. Create the first board to start a governed workflow.</p>}
    {selectedBoardId&&<BoardDetailPage workspaceId={workspaceId} boardId={selectedBoardId}/>}
  </section>
}
