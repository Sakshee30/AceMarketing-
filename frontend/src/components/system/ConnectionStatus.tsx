import {useEffect,useState} from 'react'

type TransportState='healthy'|'degraded'|'offline'

type TransportEventDetail={
  state:TransportState
  cause?:string
  requestId?:string
  at?:number
}

const TRANSPORT_EVENT='ace-transport-state'

const initialState=():TransportEventDetail=>{
  if(typeof navigator!=='undefined'&&navigator.onLine===false){
    return {state:'offline',cause:'browser_offline',at:Date.now()}
  }
  return {state:'healthy',at:Date.now()}
}

export function ConnectionStatus(){
  const [status,setStatus]=useState<TransportEventDetail>(initialState)

  useEffect(()=>{
    const updateFromBrowser=()=>{
      if(navigator.onLine===false){
        setStatus({state:'offline',cause:'browser_offline',at:Date.now()})
      }else{
        setStatus(current=>current.state==='offline'?{state:'degraded',cause:'browser_reconnected_waiting_for_request',at:Date.now()}:current)
      }
    }
    const updateFromTransport=(event:Event)=>{
      const detail=(event as CustomEvent<TransportEventDetail>).detail
      if(detail?.state)setStatus(detail)
    }
    window.addEventListener('online',updateFromBrowser)
    window.addEventListener('offline',updateFromBrowser)
    window.addEventListener(TRANSPORT_EVENT,updateFromTransport as EventListener)
    return()=>{
      window.removeEventListener('online',updateFromBrowser)
      window.removeEventListener('offline',updateFromBrowser)
      window.removeEventListener(TRANSPORT_EVENT,updateFromTransport as EventListener)
    }
  },[])

  if(status.state==='healthy')return null

  const offline=status.state==='offline'
  return <div
    className={'ace-connection-status '+status.state}
    role="status"
    aria-live="polite"
    data-testid="connection-status"
  >
    <span aria-hidden="true"/>
    <div>
      <strong>{offline?'You appear to be offline':'Connection is degraded'}</strong>
      <p>{offline
        ?'AceMarketing will keep your current page visible. Actions that require the server may not complete until connectivity returns.'
        :'The browser has not recently confirmed a successful AceMarketing request. Existing data stays visible, but verify server-confirmed state before repeating sensitive actions.'}</p>
    </div>
  </div>
}

export const transportStateEventName=TRANSPORT_EVENT
