import {useEffect,useState} from 'react'
import {
  Activity,ArrowRight,BarChart3,Bot,Cable,ChevronRight,DatabaseZap,Gauge,Network,PieChart,
  RadioTower,Sparkles,Target,UsersRound,Zap
} from 'lucide-react'
import {overviewApi} from '../data/overview.api'
import {ErrorState,LoadingState,StaleState} from '../../../components/system/FrontendStates'

const dashboardSections=[
  {id:'workspace',label:'Workspace',icon:Gauge,tabs:['Overview','Launchpad']},
  {id:'tracking',label:'Tracking & Data',icon:DatabaseZap,tabs:['AdSync','ChatGPT Ads','Funnel','Leak Monitor','Events','Adjustments','Diagnostics','Match Quality','Reconciliation','Fraud','Deep Links','Sites','Fingerprinting','Live Sync','Data Hub','Customer 360','Offline Attribution','Matchback','POS & Stores']},
  {id:'measurement',label:'Measurement & Intelligence',icon:PieChart,tabs:['Journeys','Identity','Models','Attribution','Planner','Reports','Grouped Performance','Executive Briefs']},
  {id:'conversion',label:'Lead & Conversion',icon:Target,tabs:['Enrich','Lead Grading','Behavior','Feed','Agents','Routing','Follow-ups','Calls','Meetings','Feedback','Approvals','Ask Ace']},
  {id:'activation',label:'Activation & Integrations',icon:RadioTower,tabs:['Integrations','Data Flows','Real-Time Activation','Personalization','Exclusions','Audiences','Delivery']},
  {id:'operations',label:'Operations & Developer',icon:Activity,tabs:['Monitoring','Alerts','Compliance','Developers','Settings']}
] as const

function OverviewPageHead({
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

function FunnelPanel(){
  const [data,setData]=useState<any>(null)
  const [mode,setMode]=useState<'funnel'|'campaign'>('funnel')
  const [error,setError]=useState('')

  useEffect(()=>{
    let active=true
    overviewApi.funnel()
      .then((response:any)=>{if(active){setData(response);setError('')}})
      .catch((failure:any)=>{if(active)setError(failure?.message||'Funnel evidence is unavailable.')})
    return()=>{active=false}
  },[])

  const stages=data?.stages||{}
  const steps=[
    ['All Leads',Number(stages.leads||0),100],
    ['Qualified',Number(stages.qualified||0),stages.leads?Math.round(Number(stages.qualified||0)/Number(stages.leads)*100):0],
    ['Appointments',Number(stages.appointments||0),stages.leads?Math.round(Number(stages.appointments||0)/Number(stages.leads)*100):0],
    ['Consultations',Number(stages.consultations||0),stages.leads?Math.round(Number(stages.consultations||0)/Number(stages.leads)*100):0],
    ['Bookings',Number(stages.bookings||0),stages.leads?Math.round(Number(stages.bookings||0)/Number(stages.leads)*100):0]
  ]

  return <div className="app-panel">
    <div className="panel-head">
      <div><h3>{mode==='funnel'?'Complete funnel':'Campaign view'}</h3><p>Backend funnel endpoint · current workspace</p></div>
      <button onClick={()=>setMode(current=>current==='funnel'?'campaign':'funnel')}>{mode==='funnel'?'Campaign view':'Funnel view'}</button>
    </div>
    {error&&<StaleState title="Funnel data unavailable" description={error}/>}
    {!data&&!error&&<LoadingState compact title="Loading funnel" description="Reading current workspace funnel evidence."/>}
    {data&&mode==='funnel'&&steps.map((item:any,index:number)=>
      <div className="funnel-row" key={item[0]}>
        <div><span>{item[0]}</span><b>{item[1].toLocaleString()}</b></div>
        <div className="progress"><i style={{width:item[2]+'%'}}/></div>
        {index<steps.length-1&&item[1]>0&&<small>{Math.round((steps[index+1][1]/item[1])*100)}% progression</small>}
      </div>
    )}
    {data&&mode==='campaign'&&(data.campaigns||[]).map((item:any)=>
      <div className="developer-event-row" key={item.name}>
        <b>{item.name}</b>
        <span>{item.channel} · {Number(item.qualified||0).toLocaleString()} qualified</span>
        <strong>{Number(item.bookings||0).toLocaleString()} bookings</strong>
      </div>
    )}
  </div>
}

export default function OverviewPage(){
  const [summary,setSummary]=useState<any>(null)
  const [events,setEvents]=useState<any[]>([])
  const [expanded,setExpanded]=useState(false)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  const navigate=(tab:string)=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:tab}))

  const load=async()=>{
    setLoading(true)
    try{
      const [summaryResult,liveResult]:any=await Promise.all([
        overviewApi.summary(),
        overviewApi.liveSync().catch(()=>({recent:[]}))
      ])
      setSummary(summaryResult)
      setEvents(liveResult.recent||[])
      setError('')
    }catch(failure:any){
      setError(failure?.message||'Workspace overview could not be refreshed. Existing dashboard evidence was preserved.')
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{
    let disposed=false
    const refresh=()=>{if(!disposed)void load()}
    refresh()
    const id=window.setInterval(()=>{
      if(document.visibilityState==='visible')refresh()
    },30000)
    const onVisibility=()=>{if(document.visibilityState==='visible')refresh()}
    document.addEventListener('visibilitychange',onVisibility)
    return()=>{
      disposed=true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange',onVisibility)
    }
  },[])

  const totals=summary?.totals||{}
  const shown=expanded?events:events.slice(0,5)
  const quick=[
    ['Connect integrations','Integrations',Cable,'Connect CRM, ads, WhatsApp and calling'],
    ['Create conversion event','Events',Zap,'Turn business outcomes into activation signals'],
    ['Inspect customer journeys','Journeys',Network,'See stitched lead and revenue paths'],
    ['Build audience','Audiences',UsersRound,'Activate or suppress first-party segments'],
    ['Open delivery center','Delivery',RadioTower,'Inspect provider receipts, retry and DLQ'],
    ['Ask Ace','Ask Ace',Sparkles,'Query journey, funnel and attribution evidence']
  ]

  return <>
    <OverviewPageHead
      crumb="Workspace / Overview"
      title="Acquisition command center"
      sub="Navigate the full marketing data, conversion, activation and measurement stack from one live workspace."
      action={loading?'Refreshing…':'Refresh'}
      onAction={load}
    />

    {error&&
      <ErrorState
        title="Workspace overview refresh failed"
        description={error}
        action={{label:'Retry overview',onClick:load}}
      />
    }

    {!summary&&loading&&
      <LoadingState
        title="Loading acquisition command center"
        description="Reading workspace readiness, activation, measurement and operational evidence."
      />
    }

    <section className="dashboard-hero" aria-busy={loading?'true':undefined}>
      <div>
        <span>WORKSPACE READINESS</span>
        <strong>{summary?summary.readiness+'%':'—'}</strong>
        <p>{summary?.readiness===100?'Core operating areas have workspace evidence.':'Connect data and activate the incomplete areas below.'}</p>
      </div>
      <div className="dashboard-hero-metrics">
        <article><b>{summary?Number(totals.profiles||0).toLocaleString('en-IN'):'—'}</b><span>Known profiles</span></article>
        <article><b>{totals.deliveryRate==null?'—':totals.deliveryRate+'%'}</b><span>Delivery success</span></article>
        <article><b>{summary?Number(totals.connectedConnectors||0):'—'}</b><span>Connected systems</span></article>
        <article><b>{summary?Number(totals.matchedEvents||0).toLocaleString('en-IN'):'—'}</b><span>Matched attribution</span></article>
      </div>
    </section>

    <div className="dashboard-area-grid">
      {(summary?.areas||[]).map((item:any)=>{
        const section=dashboardSections.find(candidate=>candidate.tabs.includes(item.tab as never))
        const Icon=section?.icon||Activity
        return <button key={item.key} className={'dashboard-area-card '+(item.ready?'ready':'needs')} onClick={()=>navigate(item.tab)}>
          <div><span><Icon/></span><em>{item.ready?'Ready':'Needs setup'}</em></div>
          <h3>{item.title}</h3>
          <strong>{Number(item.primary||0).toLocaleString('en-IN')}</strong>
          <p>{item.detail}</p>
          <footer>Open {item.tab}<ArrowRight/></footer>
        </button>
      })}
    </div>

    <div className="dashboard-quick-grid">
      {quick.map(([title,tab,Icon,description]:any)=>
        <button key={title} onClick={()=>navigate(tab)}>
          <span><Icon/></span>
          <div><b>{title}</b><small>{description}</small></div>
          <ArrowRight/>
        </button>
      )}
    </div>

    <div className="two-col dashboard-overview-grid">
      <FunnelPanel/>
      <div className="app-panel">
        <div className="panel-head">
          <div><h3>Workspace health</h3><p>Current operational state from backend evidence</p></div>
          <button onClick={()=>navigate('Monitoring')}>Monitoring</button>
        </div>
        {[
          ['Event rules',totals.eventRules||0,'Events'],
          ['Active audiences',totals.activeAudiences||0,'Audiences'],
          ['Agent runs',totals.agentRuns||0,'Agents'],
          ['Meetings',totals.meetings||0,'Meetings'],
          ['Failed deliveries',totals.failedDeliveries||0,'Delivery'],
          ['Dead-letter jobs',totals.queueDeadLetter||0,'Delivery']
        ].map(([label,value,tab]:any)=>
          <button className="dashboard-health-row" key={label} onClick={()=>navigate(tab)}>
            <span>{label}</span><b>{Number(value).toLocaleString('en-IN')}</b><ChevronRight/>
          </button>
        )}
      </div>
    </div>

    <div className="app-panel">
      <div className="panel-head">
        <div><h3>Recent workspace activity</h3><p>First-party events, activation deliveries and agent runs</p></div>
        <div className="panel-actions">
          <button onClick={()=>setExpanded(current=>!current)}>{expanded?'Show less':'View more'}</button>
          <button onClick={()=>navigate('Live Sync')}>Live Sync</button>
        </div>
      </div>
      {(summary?.recent||shown||[]).length
        ?<div className="dashboard-activity-list">
          {(summary?.recent||shown).slice(0,expanded?12:6).map((item:any)=>
            <button key={item.id} onClick={()=>navigate(item.tab||'Live Sync')}>
              <span className={'activity-kind '+item.kind}>{item.kind==='delivery'?<RadioTower/>:item.kind==='agent'?<Bot/>:<Activity/>}</span>
              <div><b>{item.title}</b><small>{item.meta}</small></div>
              <time>{item.time?new Date(item.time).toLocaleString():'—'}</time>
              <ChevronRight/>
            </button>
          )}
        </div>
        :<div className="empty-delivery-state">
          <Activity/>
          <div><b>No workspace activity yet</b><small>Connect a source or send a first-party event to populate this command center.</small></div>
        </div>
      }
    </div>
  </>
}
