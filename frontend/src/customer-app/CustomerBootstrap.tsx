import {useCallback,useEffect,useRef,useState} from 'react'
import {AlertTriangle,LogIn,RefreshCw,ShieldCheck} from 'lucide-react'
import CustomerWorkspace from './CustomerWorkspace'
import {api,AceApiError} from '../lib/api'
import {LoadingState} from '../components/system/FrontendStates'
import {clearSessionToken} from '../../../packages/client-core/src/session-authority'

type BootstrapState=
  |{kind:'session-resolving'}
  |{kind:'signed-out';message:string}
  |{kind:'access-ready';user:any}
  |{kind:'recoverable-error';message:string;requestId?:string}

const signedOutMessage='Your session is not currently authorized for this customer workspace.'

export default function CustomerBootstrap({back}:{back:()=>void}){
  const [state,setState]=useState<BootstrapState>({kind:'session-resolving'})
  const generation=useRef(0)

  const resolveSession=useCallback(async()=>{
    const current=++generation.current
    const controller=new AbortController()
    const timer=window.setTimeout(()=>controller.abort('bootstrap_session_deadline'),12_000)
    setState({kind:'session-resolving'})
    try{
      const user:any=await api.me({signal:controller.signal})
      if(current!==generation.current)return
      setState({kind:'access-ready',user})
    }catch(error:any){
      if(current!==generation.current)return
      const status=Number(error?.status||0)
      if(status===401){
        clearSessionToken()
        setState({kind:'signed-out',message:signedOutMessage})
      }else{
        setState({
          kind:'recoverable-error',
          message:error?.message||'The session could not be verified. Your sign-in state has not been changed.',
          requestId:error instanceof AceApiError?error.requestId:undefined
        })
      }
    }finally{
      window.clearTimeout(timer)
    }
    return()=>controller.abort('bootstrap_replaced')
  },[])

  useEffect(()=>{
    void resolveSession()
    const onPageShow=(event:PageTransitionEvent)=>{if(event.persisted)void resolveSession()}
    const onSession=(event:any)=>{
      if(event?.detail?.state==='anonymous')setState({kind:'signed-out',message:signedOutMessage})
      if(event?.detail?.state==='authenticated')void resolveSession()
    }
    window.addEventListener('pageshow',onPageShow)
    window.addEventListener('ace-session-state',onSession as EventListener)
    return()=>{
      generation.current+=1
      window.removeEventListener('pageshow',onPageShow)
      window.removeEventListener('ace-session-state',onSession as EventListener)
    }
  },[resolveSession])

  if(state.kind==='session-resolving'){
    return <LoadingState title="Verifying workspace access" description="Resolving the current session before private customer data is mounted."/>
  }
  if(state.kind==='signed-out'){
    return <main className="login-shell" id="customer-bootstrap-state">
      <section className="login-card" role="status">
        <ShieldCheck/>
        <h1>Sign in required</h1>
        <p>{state.message}</p>
        <div className="approval-actions">
          <button type="button" onClick={back}>Back to website</button>
          <button type="button" className="approve" onClick={()=>{window.location.hash='#/login'}}><LogIn/>Go to login</button>
        </div>
      </section>
    </main>
  }
  if(state.kind==='recoverable-error'){
    return <main className="login-shell" id="customer-bootstrap-state">
      <section className="login-card" role="alert">
        <AlertTriangle/>
        <h1>Workspace access could not be verified</h1>
        <p>{state.message}</p>
        {state.requestId&&<small>Request ID: {state.requestId}</small>}
        <p>Your existing session has not been treated as signed out because the backend did not confirm that state.</p>
        <div className="approval-actions">
          <button type="button" onClick={back}>Back to website</button>
          <button type="button" className="approve" onClick={()=>void resolveSession()}><RefreshCw/>Retry verification</button>
        </div>
      </section>
    </main>
  }
  return <CustomerWorkspace back={back}/>
}
