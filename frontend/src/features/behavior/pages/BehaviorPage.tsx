import {useEffect,useState} from 'react'
import {Activity,ChevronRight,MousePointer2,Smartphone,Target,UsersRound} from 'lucide-react'
import {behaviorApi} from '../data/behavior.api'
import {ErrorState,LoadingState} from '../../../components/system/FrontendStates'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}>{action}</button>}</div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}

export default function BehaviorPage(){
 const [data,setData]=useState<any>({events:[],sources:[],campaigns:[],devices:[],stats:{},recent:[]})
 const [view,setView]=useState<'events'|'sources'|'campaigns'|'devices'>('events')
 const [selected,setSelected]=useState('')
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')

 const load=async()=>{
  setLoading(true)
  setError('')
  try{
   const r:any=await behaviorApi.load()
   setData(r)
   const first=(r.events||[])[0]?.name||''
   setSelected((current:string)=>current&&[...(r.events||[]),...(r.sources||[]),...(r.campaigns||[]),...(r.devices||[])].some((x:any)=>x.name===current)?current:first)
  }catch(e:any){
   setError(e?.message||'Behavior evidence could not be loaded. Existing evidence was preserved.')
  }finally{setLoading(false)}
 }

 useEffect(()=>{void load()},[])

 const stats=data.stats||{}
 const rawList=view==='events'?data.events||[]:view==='sources'?data.sources||[]:view==='campaigns'?data.campaigns||[]:data.devices||[]
 const list=rawList.slice(0,150)
 const max=Math.max(1,...list.map((x:any)=>Number(x.count||0)))
 const current=list.find((x:any)=>x.name===selected)||list[0]
 const related=(data.recent||[]).filter((x:any)=>{
  if(!current)return false
  if(view==='events')return String(x.event||x.eventType||x.name||'event')===current.name
  if(view==='sources')return String(x.utm_source||x.source||x.channel||'Direct / First-party')===current.name
  if(view==='campaigns')return String(x.utm_campaign||x.campaign||'Unattributed campaign')===current.name
  return String(x.devicePlatform||x.device_platform||x.platform||'Unknown device')===current.name
 }).slice(0,20)

 const choose=(next:'events'|'sources'|'campaigns'|'devices')=>{
  setView(next)
  const source=next==='events'?data.events:next==='sources'?data.sources:next==='campaigns'?data.campaigns:data.devices
  setSelected(source?.[0]?.name||'')
 }

 return <>
  <PageHead crumb="Activation / Behavior" title="Website & app behavior" sub="Analyze first-party engagement by event, source, campaign and device using the persisted tracking stream." action={loading?'Refreshing…':'Refresh'} onAction={()=>{if(!loading)void load()}}/>

  {loading&&!data.events?.length&&!data.recent?.length&&<LoadingState title="Loading behavior evidence" description="Reading persisted first-party events, sources, campaigns and device signals."/>}
  {error&&<ErrorState title="Behavior refresh failed" description={error} action={{label:'Retry behavior',onClick:load}}/>}

  <div className="stats-grid">
   <Stat label="Tracked events" value={Number(stats.events||0).toLocaleString('en-IN')} sub={data.persistence==='workspace_store'?'Persisted workspace event window':'Current process event window'} Icon={MousePointer2}/>
   <Stat label="Known identity rate" value={stats.events?String(stats.knownIdentityRate||0)+'%':'—'} sub="Customer, visitor, device or hashed contact evidence" Icon={UsersRound}/>
   <Stat label="High-intent events" value={Number(stats.highIntentEvents||0).toLocaleString('en-IN')} sub={(stats.highIntentRate||0)+'% of tracked behavior'} Icon={Target}/>
   <Stat label="Device identity rate" value={stats.events?String(stats.deviceIdentityRate||0)+'%':'—'} sub="Events carrying first-party device identity" Icon={Smartphone}/>
  </div>

  <div className="behavior-tabs" aria-busy={loading?'true':undefined}>
   <button className={view==='events'?'active':''} onClick={()=>choose('events')}>Events</button>
   <button className={view==='sources'?'active':''} onClick={()=>choose('sources')}>Sources</button>
   <button className={view==='campaigns'?'active':''} onClick={()=>choose('campaigns')}>Campaigns</button>
   <button className={view==='devices'?'active':''} onClick={()=>choose('devices')}>Devices</button>
  </div>

  <div className="behavior-analysis-layout">
   <div className="app-panel">
    <div className="panel-head"><div><h3>{view==='events'?'Behavior events':view==='sources'?'Acquisition sources':view==='campaigns'?'Campaign behavior':'Device behavior'}</h3><p>Observed from persisted first-party tracking evidence{rawList.length>150?' · first 150 rendered':''}</p></div><span className="healthy">{rawList.length} observed</span></div>
    {list.length?list.map((x:any)=><button className={'behavior-analysis-row '+(current?.name===x.name?'selected':'')} key={x.name} onClick={()=>setSelected(x.name)}><div><b>{String(x.name).replaceAll('_',' ')}</b><small>{Number(x.count||0).toLocaleString('en-IN')} event{x.count===1?'':'s'}</small></div><div className="progress"><i style={{width:Math.max(2,Number(x.count||0)/max*100)+'%'}}/></div><strong>{stats.events?Math.round(Number(x.count||0)/Number(stats.events)*100):0}%</strong><ChevronRight/></button>):!loading&&<div className="empty-delivery-state"><MousePointer2/><div><b>No behavior evidence yet</b><small>Events appear after consented first-party activity is persisted.</small></div></div>}
   </div>

   <div className="app-panel behavior-detail">
    <div className="panel-head"><div><h3>{current?String(current.name).replaceAll('_',' '):'Behavior evidence'}</h3><p>{current?Number(current.count||0).toLocaleString('en-IN')+' matching events':'Select a behavior signal'}</p></div></div>
    {current?<><div className="site-detail-grid">{[['Share of behavior',stats.events?Math.round(Number(current.count||0)/Number(stats.events)*100)+'%':'—'],['Observed events',current.count||0],['View',view],['Evidence source',data.persistence==='workspace_store'?'Persisted workspace store':'Current process window']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><div className="agent-section"><h4>Recent matching activity</h4>{related.length?related.map((x:any,i:number)=><div className="behavior-evidence-row" key={x.id||i}><span>{String(x.event||x.eventType||x.name||'event').replaceAll('_',' ')}</span><div><b>{x.utm_source||x.source||x.channel||'First-party'}</b><small>{x.utm_campaign||x.campaign||'Unattributed campaign'} · {x.devicePlatform||x.device_platform||x.platform||'Unknown device'}</small></div><time>{x.receivedAt||x.occurredAt?new Date(x.receivedAt||x.occurredAt).toLocaleString():'—'}</time></div>):<div className="empty-delivery-state"><Activity/><div><b>No recent matching activity</b></div></div>}</div></>:<div className="empty-delivery-state"><Activity/><div><b>No behavior signal selected</b></div></div>}
   </div>
  </div>

  <div className="app-panel">
   <div className="panel-head"><div><h3>Latest first-party sequence</h3><p>Recent cross-source activity with identity-safe persisted context</p></div></div>
   {(data.recent||[]).length?<div className="behavior-timeline enriched">{(data.recent||[]).slice(0,20).reverse().map((x:any,i:number)=><div key={x.id||i}><span>{i+1}</span><div><b>{String(x.event||x.eventType||x.name||'event').replaceAll('_',' ')}</b><small>{x.utm_source||x.source||x.channel||'First-party'}{x.utm_campaign||x.campaign?' · '+(x.utm_campaign||x.campaign):''}{x.devicePlatform||x.device_platform?' · '+(x.devicePlatform||x.device_platform):''}</small></div><time>{x.receivedAt||x.occurredAt?new Date(x.receivedAt||x.occurredAt).toLocaleTimeString():'—'}</time></div>)}</div>:!loading&&<div className="empty-delivery-state"><Activity/><div><b>No recent sequence available</b></div></div>}
  </div>
 </>
}
