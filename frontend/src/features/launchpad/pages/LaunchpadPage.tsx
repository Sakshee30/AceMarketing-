import {useEffect,useState} from 'react'
import {ArrowRight,Check,CheckCircle2,ChevronRight,Sparkles,WandSparkles,Zap} from 'lucide-react'
import {launchpadApi} from '../data/launchpad.api'
import {ErrorState,LoadingState} from '../../../components/system/FrontendStates'

function LaunchpadPageHead({
  crumb,
  title,
  sub,
  action,
  onAction
}:{
  crumb:string
  title:string
  sub:string
  action?:string
  onAction?:()=>void
}){
  return <div className="page-head">
    <div>
      <span>{crumb}</span>
      <h1 tabIndex={-1}>{title}</h1>
      <p>{sub}</p>
    </div>
    {action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}
  </div>
}

export default function LaunchpadPage(){
  const [data,setData]=useState<any>({steps:[],readiness:0,evidence:{}})
  const [active,setActive]=useState(0)
  const [busy,setBusy]=useState('')
  const [loading,setLoading]=useState(true)
  const [notice,setNotice]=useState<{kind:'ok'|'error'|'',text:string}>({kind:'',text:''})

  const load=async()=>{
    setLoading(true)
    try{
      const response:any=await launchpadApi.load()
      setData(response)
      setNotice(current=>current.kind==='error'?{kind:'',text:''}:current)
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'Launchpad could not be loaded. Existing readiness evidence was preserved.'})
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{void load()},[])

  const steps=(data.steps||[]) as any[]
  const safeActive=Math.min(active,Math.max(steps.length-1,0))
  const current=steps[safeActive]||steps[0]
  const navigate=(tab:string)=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:tab}))
  const runReadiness=()=>{
    const next=steps.findIndex((item:any)=>!item.ready)
    setActive(next>=0?next:0)
  }

  const sendTest=async()=>{
    setBusy('test')
    setNotice({kind:'',text:''})
    try{
      const result:any=await launchpadApi.sendTest()
      setNotice({kind:'ok',text:'Test event accepted: '+(result.eventId||'ok')})
      await load()
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'Test event failed. No successful delivery is being claimed.'})
    }finally{
      setBusy('')
    }
  }

  const evidence=data.evidence||{}

  return <>
    <LaunchpadPageHead
      crumb="Workspace / Launchpad"
      title="Launchpad"
      sub="Configure the data, funnel, tracking and automation foundation using live workspace evidence."
      action="Run readiness check"
      onAction={runReadiness}
    />

    {loading&&!steps.length&&
      <LoadingState
        title="Loading workspace readiness"
        description="Reading backend-confirmed launchpad evidence for the active workspace."
      />
    }

    {notice.text&&notice.kind==='error'&&
      <ErrorState
        title="Launchpad evidence unavailable"
        description={notice.text}
        action={{label:'Retry launchpad',onClick:load}}
      />
    }

    {notice.text&&notice.kind==='ok'&&
      <div className="delivery-notice ok" role="status">
        <CheckCircle2/><span>{notice.text}</span>
      </div>
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
                <button className="app-primary" disabled={busy==='test'} onClick={sendTest}>
                  {busy==='test'?'Sending…':'Send test event'}<Zap/>
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
