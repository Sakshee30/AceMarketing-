import {useEffect,useRef,useState} from 'react'
import {CalendarDays,ChevronDown,ChevronRight,MessageCircle,MessageSquareText,MousePointer2,Network,PhoneCall,Search,Target} from 'lucide-react'
import {journeysApi} from '../data/journeys.api'
import {ErrorState,LoadingState} from '../../../components/system/FrontendStates'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}>{action}</button>}</div>}

export default function JourneysPage(){
 const [data,setData]=useState<any[]>([])
 const [selected,setSelected]=useState('')
 const [source,setSource]=useState('All sources')
 const [stage,setStage]=useState('All stages')
 const [query,setQuery]=useState('')
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const requestSequence=useRef(0)

 const load=async()=>{
  const requestId=++requestSequence.current
  setLoading(true)
  setError('')
  try{
   const r:any=await journeysApi.load()
   if(requestId!==requestSequence.current)return
   const items=r.items||[]
   setData(items)
   if(items[0])setSelected((x:string)=>x&&items.some((i:any)=>i.id===x)?x:items[0].id)
   else setSelected('')
  }catch(e:any){
   if(requestId===requestSequence.current)setError(e?.message||'Customer journeys could not be loaded. Existing journey evidence was preserved.')
  }finally{
   if(requestId===requestSequence.current)setLoading(false)
  }
 }

 useEffect(()=>{void load();return()=>{requestSequence.current++}},[])

 const sources=['All sources',...Array.from(new Set(data.map(x=>x.source).filter(Boolean)))]
 const stages=['All stages',...Array.from(new Set(data.map(x=>x.stage).filter(Boolean)))]
 const normalizedQuery=query.trim().toLowerCase()
 const filtered=data.filter(x=>(source==='All sources'||x.source===source)&&(stage==='All stages'||x.stage===stage)&&(!normalizedQuery||[x.lead,x.source,x.stage,x.campaign].join(' ').toLowerCase().includes(normalizedQuery)))
 const current=filtered.find(x=>x.id===selected)||filtered[0]||data[0]
 const cycle=(items:any[],value:string)=>items[(Math.max(0,items.indexOf(value))+1)%items.length]
 const iconFor=(type:string)=>type==='meeting'?CalendarDays:type==='routing'?Network:type==='feedback'?MessageSquareText:type==='follow_up'||type==='follow_up_completed'?MessageCircle:type==='call'?PhoneCall:type==='whatsapp'?MessageCircle:type==='stage'?Target:MousePointer2
 const timeline=(current?.timeline||[]).slice(0,150)

 return <>
  <PageHead crumb="Measurement / Journeys" title="Customer journey explorer" sub="Inspect the complete chronology for every lead across tracking, CRM, routing, follow-up, calls, WhatsApp, meetings and feedback." action={loading?'Refreshing…':'Refresh'} onAction={()=>{if(!loading)void load()}}/>

  {loading&&!data.length&&<LoadingState title="Loading customer journeys" description="Reading stitched lead, tracking, CRM and operational evidence."/>}
  {error&&<ErrorState title="Journey refresh failed" description={error} action={{label:'Retry journeys',onClick:load}}/>}

  <div className="filters" aria-busy={loading?'true':undefined}>
   <button disabled={loading} onClick={()=>setSource(cycle(sources,source))}>{source} <ChevronDown/></button>
   <button disabled={loading} onClick={()=>setStage(cycle(stages,stage))}>{stage} <ChevronDown/></button>
   <div className="journey-search"><Search/><input aria-label="Search journeys" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search lead, source, stage, campaign..."/></div>
  </div>

  <div className="journey-layout">
   <div className="journey-list">
    {filtered.length?filtered.map((x:any)=><article className={selected===x.id?'selected':''} key={x.id} onClick={()=>setSelected(x.id)}><div className="lead-avatar">{String(x.lead||'?').split(' ').map((s:string)=>s[0]).join('').slice(0,2)}</div><div><b>{x.lead}</b><small>{x.source} · {x.touchpoints||0} touchpoints{x.campaign?' · '+x.campaign:''}</small></div><span className="stage">{x.stage}</span><div className="mini-path"><i/><i/><i/><i className={(x.touchpoints||0)>3?'done':''}/><i className={(x.touchpoints||0)>5?'done':''}/></div><time>{x.duration||'—'}</time><ChevronRight/></article>):!loading&&<div className="empty-delivery-state"><Search/><div><b>No matching journeys</b><small>Change the source/stage filter or search query.</small></div></div>}
   </div>

   <div className="app-panel journey-detail">
    {current?<><div className="panel-head"><div><h3>{current.lead}</h3><p>{current.source} · {current.stage}{current.campaign?' · '+current.campaign:''}</p></div><span className="status">{current.touchpoints||0} persisted touchpoints</span></div><div className="journey-detail-meta">{[['Lead',current.lead],['Source',current.source],['Campaign',current.campaign||'—'],['Stage',current.stage],['Score',current.score??'—'],['Grade',current.grade||'—'],['Duration',current.duration||'—'],['Last activity',current.lastActivity?new Date(current.lastActivity).toLocaleString():'—']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div>
    <div className="journey-chronology"><div className="panel-head"><div><h3>Stitched chronology</h3><p>Only records linked to this lead are shown{(current.timeline||[]).length>150?' · newest 150 rendered':''}</p></div></div>{timeline.length?timeline.map((x:any,i:number)=>{const I=iconFor(x.type);return <div className="journey-event" key={x.id||i}><span className="journey-event-icon"><I/></span><div><b>{x.title}</b><small>{x.source} · {x.at?new Date(x.at).toLocaleString():'—'}</small><p>{x.detail||'Persisted activity'}</p>{x.destination&&<em>Destination: {x.destination}</em>}{x.startsAt&&<em>Meeting: {new Date(x.startsAt).toLocaleString()}</em>}</div></div>}):<div className="empty-delivery-state"><Network/><div><b>No linked chronology yet</b><small>The lead profile exists, but no additional tracked or operational records can be deterministically linked yet.</small></div></div>}</div></>:<div className="empty-delivery-state"><Network/><div><b>No journey selected</b></div></div>}
   </div>
  </div>
 </>
}
