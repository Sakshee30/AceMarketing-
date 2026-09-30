export type RealtimeEnvelope<T=unknown>={
  type:string
  version:number
  workspaceId?:string
  sequence?:number
  occurredAt?:string
  payload:T
}

type RealtimeOptions={
  url:string
  token?:string|null
  tokenTransport?:'query'|'subprotocol'
  onEvent:(event:RealtimeEnvelope)=>void
  onState?:(state:'connecting'|'open'|'closed'|'error')=>void
  reconnect?:boolean
  maxBackoffMs?:number
}

export const createRealtimeClient=(options:RealtimeOptions)=>{
  let socket:WebSocket|null=null
  let stopped=false
  let attempt=0
  let timer:number|undefined
  let lastSequence=0

  const scheduleReconnect=()=>{
    if(stopped||options.reconnect===false)return
    const max=Math.max(1000,options.maxBackoffMs||30_000)
    const delay=Math.min(max,500*Math.pow(2,Math.min(6,attempt++)))+Math.floor(Math.random()*250)
    timer=window.setTimeout(connect,delay)
  }

  const connect=()=>{
    if(stopped)return
    options.onState?.('connecting')
    const url=new URL(options.url,window.location.href)
    if(options.token&&options.tokenTransport!=='subprotocol')url.searchParams.set('access_token',options.token)
    const protocols=options.token&&options.tokenTransport==='subprotocol'?['ace-realtime-v1',options.token]:undefined
    socket=new WebSocket(url,protocols)
    socket.onopen=()=>{
      attempt=0
      options.onState?.('open')
    }
    socket.onmessage=message=>{
      try{
        const event=JSON.parse(String(message.data)) as RealtimeEnvelope
        if(typeof event?.type!=='string'||!event.type)return
        if(Number.isFinite(event.sequence)){
          if(Number(event.sequence)<=lastSequence)return
          lastSequence=Number(event.sequence)
        }
        options.onEvent(event)
      }catch{}
    }
    socket.onerror=()=>options.onState?.('error')
    socket.onclose=()=>{
      options.onState?.('closed')
      socket=null
      scheduleReconnect()
    }
  }

  const close=()=>{
    stopped=true
    if(timer!==undefined)window.clearTimeout(timer)
    timer=undefined
    socket?.close(1000,'client_shutdown')
    socket=null
  }

  return {connect,close,getLastSequence:()=>lastSequence}
}
