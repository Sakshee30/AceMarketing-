import {useEffect,useRef,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,ChevronRight,DatabaseZap,RadioTower,Search,ShieldCheck,Target,UsersRound} from 'lucide-react'
import {customer360Api} from '../data/customer-360.api'
import {LoadingState} from '../../../components/system/FrontendStates'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" disabled={action==='Refreshing…'} onClick={onAction}>{action}</button>}</div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}

export default function Customer360Page(){
 const [data,setData]=useState<any>({items:[],customer:null,total:0})
 const [selected,setSelected]=useState('')
 const [query,setQuery]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState('')
 const requestSequence=useRef(0)
 const load=async(id?:string)=>{
  const requestId=++requestSequence.current
  setLoading(true);setNotice('')
  try{
   const r:any=await customer360Api.load(id)
   if(requestId!==requestSequence.current)return
   setData(r)
   if(r.customer?.id)setSelected(r.customer.id)
  }catch(e:any){
   if(requestId===requestSequence.current)setNotice(e?.message||'Customer 360 could not be loaded. Existing customer evidence was preserved.')
  }finally{
   if(requestId===requestSequence.current)setLoading(false)
  }
 }
 useEffect(()=>{void load();return()=>{requestSequence.current++}},[])
 useDevelopmentLiveRefresh(()=>load())
 const choose=(id:string)=>{setSelected(id);void load(id)}
 const filteredItems=(data.items||[]).filter((x:any)=>{
  const q=query.trim().toLowerCase()
  return !q||[x.name,x.externalLeadId,x.source,x.campaign,x.stage,x.grade].some(v=>String(v||'').toLowerCase().includes(q))
 })
 const items=filteredItems.slice(0,200)
 const customer=data.customer
 const identity=customer?.identity||{}
 const ops=customer?.operations||{}
 const timeline=(customer?.timeline||[]).slice(0,150)
 const attrs=Object.entries(customer?.attributes||{}).slice(0,12)
 const journey=Object.entries(customer?.journey||{}).filter(([,v])=>v!==null&&v!==''&&typeof v!=='object').slice(0,12)
 return <><PageHead crumb="Data / Customer 360" title="Customer 360" sub="One operator view for identity, acquisition, lifecycle, audiences, interactions and agent activity across the stitched customer journey." action={loading?'Refreshing…':'Refresh'} onAction={()=>load(selected||undefined)}/>
 {loading&&!(data.items||[]).length&&<LoadingState title="Loading Customer 360" description="Reading canonical customer profiles and stitched workspace evidence."/>}\n {notice&&<div className="delivery-notice error" role="alert"><ShieldCheck/><span>{notice}</span></div>}
 <div className="stats-grid">
  <Stat label="Known customers" value={String(data.total||0)} sub="Persisted active profiles" Icon={UsersRound}/>
  <Stat label="Customer score" value={customer?String(customer.score||0):'—'} sub={customer?.grade?'Grade '+customer.grade:'No selected customer'} Icon={Target}/>
  <Stat label="Tracked activity" value={customer?String(ops.trackedEvents||0):'—'} sub="First-party events linked to profile" Icon={Activity}/>
  <Stat label="Active audiences" value={customer?String((customer.audiences||[]).length):'—'} sub="Materialized audience memberships" Icon={RadioTower}/>
 </div>
 <div className="customer360-layout">
  <div className="app-panel customer360-list" aria-busy={loading?'true':undefined}>
   <div className="panel-head"><div><h3>Customer directory</h3><p>Search canonical profiles and open the stitched record</p></div><span className="healthy">{filteredItems.length}</span></div>
   <div className="customer360-search"><Search/><input aria-label="Search customer 360 profiles" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, lead ID, source, campaign..."/></div>
   <div className="customer360-list-scroll">{filteredItems.length>200&&<div className="frontend-list-limit" role="status">Showing the first 200 matching profiles. Refine search to narrow the directory.</div>}{items.length?items.map((x:any)=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>choose(x.id)}>
    <span className="customer360-avatar">{String(x.name||'C').slice(0,1).toUpperCase()}</span>
    <div><b>{x.name}</b><small>{x.source}{x.campaign?' · '+x.campaign:''}</small><em>{x.stage} · Grade {x.grade||'—'} · score {x.score||0}</em></div>
    <strong>{x.activityCount||0}<small>activities</small></strong><ChevronRight/>
   </button>):<div className="empty-delivery-state"><UsersRound/><div><b>No matching customer profiles</b><small>Connected CRM, tracking and enrichment records will appear here.</small></div></div>}</div>
  </div>
  <div className="customer360-main">
   {customer?<>
    <section className="app-panel customer360-hero">
     <div className="customer360-person"><span>{String(customer.name||'C').slice(0,1).toUpperCase()}</span><div><small>CUSTOMER PROFILE</small><h2>{customer.name}</h2><p>{customer.externalLeadId} · {customer.source}{customer.campaign?' · '+customer.campaign:''}</p></div></div>
     <div className="customer360-score"><span>Lifecycle</span><b>{customer.stage}</b><em>Grade {customer.grade||'—'} · {customer.score||0}/100</em></div>
    </section>
    <div className="customer360-cards">
     <section className="app-panel"><div className="panel-head"><div><h3>Identity graph</h3><p>Persisted deterministic identifiers</p></div><UsersRound/></div><div className="site-detail-grid">{[
      ['Device ID',identity.deviceId||'—'],['Platform',identity.platform||'—'],['App ID',identity.appId||'—'],['Email hash',identity.hasEmailHash?'Present':'Not available'],['Phone hash',identity.hasPhoneHash?'Present':'Not available'],['Last updated',customer.updatedAt?new Date(customer.updatedAt).toLocaleString():'—']
     ].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div></section>
     <section className="app-panel"><div className="panel-head"><div><h3>Operational footprint</h3><p>Actions linked to this customer</p></div><Activity/></div><div className="customer360-op-grid">{[
      ['Tracked events',ops.trackedEvents||0],['Agent runs',ops.agentRuns||0],['Routes',ops.routes||0],['Follow-ups',ops.followUps||0],['Meetings',ops.meetings||0],['Feedback',ops.feedback||0]
     ].map(x=><div key={x[0]}><b>{String(x[1])}</b><span>{x[0]}</span></div>)}</div></section>
    </div>
    <div className="customer360-cards">
     <section className="app-panel"><div className="panel-head"><div><h3>Customer attributes</h3><p>Normalized profile and journey evidence</p></div><DatabaseZap/></div>{attrs.length||journey.length?<div className="customer360-attributes">{[...attrs,...journey].slice(0,16).map(([k,v]:any)=><div key={String(k)}><span>{String(k).replaceAll('_',' ')}</span><b>{String(v)}</b></div>)}</div>:<div className="empty-delivery-state"><DatabaseZap/><div><b>No additional attributes</b><small>Enrichment and journey attributes will appear when captured.</small></div></div>}</section>
     <section className="app-panel"><div className="panel-head"><div><h3>Audience membership</h3><p>Materialized activation and suppression groups</p></div><RadioTower/></div>{(customer.audiences||[]).length?<div className="customer360-audiences">{customer.audiences.map((x:any)=><div key={x.id}><span className={x.mode==='suppress'?'warning':'healthy'}>{x.mode}</span><div><b>{x.name}</b><small>{x.destination} · {x.status}</small></div></div>)}</div>:<div className="empty-delivery-state"><UsersRound/><div><b>No materialized audience membership</b><small>Build or materialize an audience to see activation context here.</small></div></div>}</section>
    </div>
    <section className="app-panel customer360-timeline"><div className="panel-head"><div><h3>Unified activity timeline</h3><p>Newest first · tracking, routing, follow-up, meetings, feedback and agent actions</p></div><button onClick={()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Journeys'}))}>Open journey view</button></div>{timeline.length?<div className="customer360-timeline-list">{timeline.map((x:any)=><article key={x.id}><span className={'customer360-dot '+x.type}><Activity/></span><div><small>{x.source}</small><b>{x.title}</b><p>{x.detail}</p></div><time>{x.at?new Date(x.at).toLocaleString():'—'}</time></article>)}</div>:<div className="empty-delivery-state"><Activity/><div><b>No linked activity yet</b><small>This profile exists, but no persisted interaction events are currently linked.</small></div></div>}</section>
   </>:<div className="app-panel empty-delivery-state customer360-empty"><UsersRound/><div><b>{loading?'Loading Customer 360…':'No customer selected'}</b><small>Select a profile to inspect its stitched operational record.</small></div></div>}
  </div>
 </div></>
}
