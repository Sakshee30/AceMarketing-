import {useState} from 'react'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {ArrowRight,Check,CheckCircle2,ChevronRight,Sparkles,WandSparkles,Zap} from 'lucide-react'
import {launchpadApi} from '../data/launchpad.api'
import {launchpadKeys} from '../data/launchpad.keys'
import {classifyMutationFailure,type MutationLifecycle} from '../../../../../packages/client-core/src/mutation-lifecycle'
import {ErrorState,LoadingState} from '../../../components/system/FrontendStates'

function LaunchpadPageHead({
  crumb,title,sub,action,onAction
}:{crumb:string;title:string;sub:string;action?:string;onAction?:()=>void}){
  return <div className="page-head">
    <div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>
    {action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}
  </div>
}

export default function LaunchpadPage(){
  const queryClient=useQueryClient()
  const [active,setActive]=useState(0)
  const [mutationState,setMutationState]=useState<{phase:MutationLifecycle;text:string;requestId?:string}>({phase:'IDLE',text:''})

  const readinessQuery=useQuery({
    queryKey:launchpadKeys.readiness(),
    queryFn:({signal})=>launchpadApi.load(signal),
    staleTime:30_000,
    refetchOnWindowFocus:true
  })

  const testMutation=useMutation({
    mutationFn:({operationId}:{operationId:string})=>launchpadApi.sendTest(operationId),
    onSuccess:async(result:any)=>{
      setMutationState({phase:'CONFIRMED_SUCCESS',text:'Test event accepted: '+(result?.eventId||'ok')})
      await queryClient.invalidateQueries({queryKey:launchpadKeys.root()})
    },
    onError:(error:any)=>{
      const classified=classifyMutationFailure(error,'Test event failed. No successful delivery is being claimed.')
      if(classified.phase==='OUTCOME_UNKNOWN'){
        setMutationState({phase:'OUTCOME_UNKNOWN',text:classified.message,requestId:classified.requestId})
      }else{
        setMutationState({phase:classified.phase,text:classified.message,requestId:classified.requestId})
      }
    }
  })

  const data:any=readinessQuery.data||{steps:[],readiness:0,evidence:{}}
  const steps=(data.steps||[]) as any[]
  const safeActive=Math.min(active,Math.max(steps.length-1,0))
  const current=steps[safeActive]||steps[0]
  const navigate=(tab:string)=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:tab}))
  const runReadiness=()=>{
    const next=steps.findIndex((item:any)=>!item.ready)
    setActive(next>=0?next:0)
  }

  const sendTest=()=>{
    const operationId=globalThis.crypto?.randomUUID?.()||('launchpad_'+Date.now()+'_'+Math.random().toString(36).slice(2))
    setMutationState({phase:'VALIDATING',text:'Validating test event…'})
    setMutationState({phase:'SUBMITTING',text:'Submitting test event…'})
    testMutation.mutate({operationId})
  }

  const reconcileUnknown=async()=>{
    await readinessQuery.refetch()
    setMutationState(currentState=>currentState.phase==='OUTCOME_UNKNOWN'
      ?{phase:'IDLE',text:'Readiness evidence refreshed. Resend only if the authoritative state confirms the original test did not complete.'}
      :currentState)
  }

  const evidence=data.evidence||{}
  const loading=readinessQuery.isPending||readinessQuery.isFetching

  return <>
    <LaunchpadPageHead
      crumb="Workspace / Launchpad"
      title="Launchpad"
      sub="Configure the data, funnel, tracking and automation foundation using live workspace evidence."
      action="Run readiness check"
      onAction={runReadiness}
    />

    {loading&&!steps.length&&<LoadingState title="Loading workspace readiness" description="Reading backend-confirmed launchpad evidence for the active workspace."/>}

    {readinessQuery.isError&&
      <ErrorState
        title={readinessQuery.data?'Launchpad is showing last confirmed evidence':'Launchpad evidence unavailable'}
        description={(readinessQuery.error as any)?.message||'Launchpad could not be loaded. Existing readiness evidence was preserved.'}
        action={{label:'Retry launchpad',onClick:()=>void readinessQuery.refetch()}}
      />
    }

    {mutationState.text&&mutationState.phase==='CONFIRMED_SUCCESS'&&
      <div className="delivery-notice ok" role="status"><CheckCircle2/><span>{mutationState.text}</span></div>
    }

    {mutationState.text&&mutationState.phase==='OUTCOME_UNKNOWN'&&
      <div className="delivery-notice status" role="status">
        <Sparkles/>
        <span>{mutationState.text}{mutationState.requestId&&<> Request ID: {mutationState.requestId}</>}</span>
        <button type="button" onClick={()=>void reconcileUnknown()}>Refresh authoritative evidence</button>
      </div>
    }

    {mutationState.text&&(mutationState.phase==='CONFIRMED_REJECTION'||mutationState.phase==='CONFLICT')&&
      <ErrorState
        title={mutationState.phase==='CONFLICT'?'Launchpad test conflicted':'Launchpad test was rejected'}
        description={mutationState.text}
      />
    }

    <div className="launchpad-progress">
      <div><span>Workspace readiness</span><strong>{loading&&!steps.length?'—':Number(data.readiness||0)+'%'}</strong></div>
      <div className="progress"><i style={{width:Number(data.readiness||0)+'%'}}/></div>
      <small>{steps.filter((item:any)=>item.ready).length} of {steps.length||6} operating areas ready</small>
    </div>

    <div className="launchpad-layout">
      <div className="app-panel launchpad-steps">
        {steps.length
          ?steps.map((step:any,index:number)=>
            <button key={step.key} className={safeActive===index?'selected':''} onClick={()=>setActive(index)}>
              <span className={step.ready?'done':''}>{step.ready?<Check/>:index+1}</span>
              <div><b>{step.title}</b><small>{step.detail}</small></div>
              <ChevronRight/>
            </button>
          )
          :!loading&&<div className="empty-delivery-state"><WandSparkles/><div><b>Readiness evidence unavailable</b><small>Retry after the backend is reachable.</small></div></div>
        }
      </div>

      <div className="app-panel launchpad-detail">
        {current
          ?<>
            <div className="panel-head">
              <div><h3>{current.title}</h3><p>{current.detail}</p></div>
              <span className={current.ready?'healthy':'status'}>{current.ready?'Ready':'Needs attention'}</span>
            </div>
            <div className="site-detail-grid">
              {[
                ['Connected systems',evidence.connectedConnectors||0],
                ['Tracked events',evidence.trackedEvents||0],
                ['Known profiles',evidence.profiles||0],
                ['Matched attribution',evidence.matchedEvents||0],
                ['Audiences',evidence.audiences||0],
                ['Signal deliveries',evidence.deliveries||0]
              ].map(item=><div key={item[0]}><span>{item[0]}</span><b>{String(item[1])}</b></div>)}
            </div>
            <div className="launchpad-actions">
              <button onClick={()=>navigate(current.tab)}>Open {current.tab}<ArrowRight/></button>
              {current.key==='signal'&&
                <button className="app-primary" disabled={testMutation.isPending||mutationState.phase==='OUTCOME_UNKNOWN'} onClick={sendTest}>
                  {testMutation.isPending?'Sending…':mutationState.phase==='OUTCOME_UNKNOWN'?'Awaiting reconciliation':'Send test event'}<Zap/>
                </button>
              }
            </div>
          </>
          :<div className="empty-delivery-state"><WandSparkles/><div><b>No launchpad step selected</b></div></div>
        }
      </div>
    </div>
  </>
}
