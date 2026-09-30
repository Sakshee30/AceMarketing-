import {WebSocketServer,WebSocket} from 'ws'
import {hasPermission,verifyToken} from '../security.mjs'
import {listRealtimeEventsAfter} from './realtime-event-store.mjs'

const clientsByWorkspace=new Map()
const workspaceCursor=new Map()
let pollTimer=null

const parseProtocols=header=>String(header||'').split(',').map(value=>value.trim()).filter(Boolean)

const topicsFor=url=>{
  const raw=String(url.searchParams.get('topics')||'board.item.moved')
  return new Set(raw.split(',').map(x=>x.trim()).filter(Boolean).slice(0,20))
}

export const authorizeBoardRealtimeUpgrade=req=>{
  const url=new URL(req.url||'/','http://localhost')
  if(url.pathname!=='/api/realtime/ws')return null
  const secret=process.env.JWT_SECRET||(process.env.NODE_ENV==='production'?'':'dev-only-change-me')
  const protocols=parseProtocols(req.headers['sec-websocket-protocol'])
  const token=protocols.includes('ace-realtime-v1')
    ?String(protocols.find(value=>value!=='ace-realtime-v1')||'')
    :String(url.searchParams.get('access_token')||'')
  const actor=verifyToken(token,secret)
  if(!actor)return {error:'invalid or expired access token'}
  const requestedWorkspace=String(url.searchParams.get('workspace_id')||actor.workspaceId||'')
  if(!requestedWorkspace||requestedWorkspace!==String(actor.workspaceId||''))return {error:'workspace scope mismatch'}
  if(!hasPermission(actor.role,'boards.read'))return {error:'boards.read permission required'}
  return {
    workspaceId:requestedWorkspace,
    actor,
    topics:topicsFor(url),
    since:Math.max(0,Number(url.searchParams.get('since')||0)||0)
  }
}

const removeClient=record=>{
  const set=clientsByWorkspace.get(record.workspaceId)
  if(!set)return
  set.delete(record)
  if(!set.size){
    clientsByWorkspace.delete(record.workspaceId)
    workspaceCursor.delete(record.workspaceId)
  }
}

const pollWorkspace=async(workspaceId,set)=>{
  if(!set?.size)return
  const minCursor=Math.min(...[...set].map(client=>client.lastSequence))
  const events=await listRealtimeEventsAfter({workspaceId,afterSequence:minCursor,limit:250})
  if(!events.length)return
  for(const event of events){
    for(const client of set){
      if(event.sequence<=client.lastSequence)continue
      if(!client.topics.has(event.type))continue
      if(client.socket.readyState!==WebSocket.OPEN)continue
      client.socket.send(JSON.stringify({
        type:event.type,
        version:1,
        workspaceId,
        sequence:event.sequence,
        occurredAt:event.occurredAt,
        payload:event.payload
      }))
      client.lastSequence=event.sequence
    }
    workspaceCursor.set(workspaceId,event.sequence)
  }
}

const pollAll=async()=>{
  for(const [workspaceId,set] of clientsByWorkspace){
    await pollWorkspace(workspaceId,set).catch(()=>{})
  }
}

const ensurePoller=()=>{
  if(pollTimer)return
  const pollMs=Math.max(100,Math.min(5000,Number(process.env.REALTIME_DB_POLL_MS||500)))
  pollTimer=setInterval(()=>{void pollAll()},pollMs)
  pollTimer.unref?.()
}

export const installBoardRealtimeWebSocket=server=>{
  const wss=new WebSocketServer({noServer:true,maxPayload:64*1024,handleProtocols:protocols=>protocols.has('ace-realtime-v1')?'ace-realtime-v1':false})
  server.on('upgrade',(req,socket,head)=>{
    const auth=authorizeBoardRealtimeUpgrade(req)
    if(!auth)return
    if(auth.error){
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
      socket.destroy()
      return
    }
    const total=[...clientsByWorkspace.values()].reduce((sum,set)=>sum+set.size,0)
    const maxConnections=Math.max(1,Number(process.env.REALTIME_MAX_CONNECTIONS||10_000))
    if(total>=maxConnections){
      socket.write('HTTP/1.1 503 Service Unavailable\r\nRetry-After: 5\r\nConnection: close\r\n\r\n')
      socket.destroy()
      return
    }
    wss.handleUpgrade(req,socket,head,client=>{
      const record={socket:client,workspaceId:auth.workspaceId,topics:auth.topics,lastSequence:auth.since}
      let set=clientsByWorkspace.get(auth.workspaceId)
      if(!set){set=new Set();clientsByWorkspace.set(auth.workspaceId,set)}
      set.add(record)
      client.send(JSON.stringify({type:'realtime.ready',version:1,workspaceId:auth.workspaceId,sequence:record.lastSequence,payload:{topics:[...auth.topics]}}))
      client.on('close',()=>removeClient(record))
      client.on('error',()=>removeClient(record))
      ensurePoller()
      void pollWorkspace(auth.workspaceId,set)
    })
  })
  return wss
}

export const closeBoardRealtime=async()=>{
  if(pollTimer)clearInterval(pollTimer)
  pollTimer=null
  for(const set of clientsByWorkspace.values()){
    for(const record of set){
      try{record.socket.close(1001,'server shutdown')}catch{}
    }
  }
  clientsByWorkspace.clear()
  workspaceCursor.clear()
}
