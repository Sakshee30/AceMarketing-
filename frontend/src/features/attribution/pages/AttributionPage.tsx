import {useEffect,useRef,useState} from 'react'
import {beginLoading,useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,ArrowRight,BarChart3,ChevronDown,ChevronRight,CircleDollarSign,PieChart,ShieldCheck,Target} from 'lucide-react'
import {attributionApi} from '../data/attribution.api'
import {ErrorState,LoadingState} from '../../../components/system/FrontendStates'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}>{action}</button>}</div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}

export default function AttributionPage(){
 const [period,setPeriod]=useState('Last 30 days')
 const periods=['Last 7 days','Last 30 days','Last 90 days']
 const [live,setLive]=useState<any>(null)
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [view,setView]=useState<'channels'|'campaigns'|'outcomes'|'matches'>('channels')
 const [selected,setSelected]=useState('')
 const requestSequence=useRef(0)
 const periodDays=period==='Last 7 days'?7:period==='Last 90 days'?90:30

 const load=async()=>{
  const requestId=++requestSequence.current
  beginLoading(setLoading)
  setError('')
  try{
   const r:any=await attributionApi.load(periodDays)
   if(requestId!==requestSequence.current)return
   setLive(r)
   const first=r?.channels?.[0]?.channel||r?.campaigns?.[0]?.campaign||''
   setSelected((current:string)=>current||first)
  }catch(e:any){
   if(requestId===requestSequence.current)setError(e?.message||'Attribution evidence could not be loaded. Existing attribution evidence was preserved.')
  }finally{
   if(requestId===requestSequence.current)setLoading(false)
  }
 }

 useEffect(()=>{void load();return()=>{requestSequence.current++}},[periodDays])
 useDevelopmentLiveRefresh(()=>load())

 const cycle=()=>setPeriod(periods[(periods.indexOf(period)+1)%periods.length])
 const channels=(live?.channels||[]).slice(0,100)
 const campaigns=(live?.campaigns||[]).slice(0,150)
 const outcomes=(live?.eventTypes||[]).slice(0,100)
 const recent=(live?.recent||[]).slice(0,100)
 const fmt=(value:any)=>Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:2})
 const selectedChannel=channels.find((x:any)=>x.channel===selected)||channels[0]
 const selectedCampaign=campaigns.find((x:any)=>x.campaign===selected)||campaigns[0]
 const ranked=view==='channels'?channels:view==='campaigns'?campaigns:outcomes
 const topValue=Math.max(1,...ranked.map((x:any)=>Number(x.value||x.matched||x.events||0)))
 const jump=(next:string)=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:next}))

 return <>
  <PageHead crumb="Measurement / Attribution" title="Full-path attribution" sub="Connect assisted outcomes and attributed value back to the channels, campaigns and touchpoints that influenced them." action={loading?'Refreshing…':'Refresh'} onAction={()=>{if(!loading)void load()}}/>

  {loading&&!live&&<LoadingState title="Loading attribution" description="Reading persisted click-session, assisted-outcome and identity-match evidence."/>}
  {error&&<ErrorState title="Attribution refresh failed" description={error} action={{label:'Retry attribution',onClick:load}}/>}

  <div className="stats-grid">
   <Stat label="Matched events" value={live?.available?String(live.matchedEvents||0):'—'} sub={period+' assisted outcomes'} Icon={CircleDollarSign}/>
   <Stat label="Matched value" value={live?.available?fmt(live.matchedValue):'—'} sub="Persisted event value" Icon={BarChart3}/>
   <Stat label="Match rate" value={live?.available?String(live.matchRate||0)+'%':'—'} sub={periodDays+' day window'} Icon={PieChart}/>
   <Stat label="Avg confidence" value={live?.available?String(live.averageMatchConfidence||0)+'%':'—'} sub="Deterministic match evidence" Icon={ShieldCheck}/>
  </div>

  <section className="attribution-hero">
   <div><span>ATTRIBUTION EVIDENCE</span><h3>{live?.available?fmt(live.matchedEvents||0):'—'} matched outcomes across {Number(live?.touchSummary?.source_count||0)} source{Number(live?.touchSummary?.source_count||0)===1?'':'s'}</h3><p>Only persisted click sessions and assisted outcomes are included. Unmatched conversions remain visible instead of being forced into a channel.</p></div>
   <div className="attribution-hero-metrics"><article><span>Campaigns</span><b>{Number(live?.touchSummary?.campaign_count||0)}</b></article><article><span>Landing evidence</span><b>{Number(live?.touchSummary?.landing_evidence||0)}</b></article><article><span>Referrer evidence</span><b>{Number(live?.touchSummary?.referrer_evidence||0)}</b></article><article><span>Unmatched</span><b>{Number(live?.unmatchedEvents||0)}</b></article></div>
  </section>

  <div className="attribution-tabs" aria-busy={loading?'true':undefined}>
   <button className={view==='channels'?'active':''} onClick={()=>{setView('channels');setSelected(channels[0]?.channel||'')}}>Channels</button>
   <button className={view==='campaigns'?'active':''} onClick={()=>{setView('campaigns');setSelected(campaigns[0]?.campaign||'')}}>Campaigns</button>
   <button className={view==='outcomes'?'active':''} onClick={()=>setView('outcomes')}>Outcomes</button>
   <button className={view==='matches'?'active':''} onClick={()=>setView('matches')}>Match evidence</button>
   <button disabled={loading} onClick={cycle}>{period}<ChevronDown/></button>
  </div>

  {view==='channels'&&<div className="attribution-layout"><div className="app-panel attribution-ranking"><div className="panel-head"><div><h3>Channel contribution</h3><p>Source-level matched outcomes and attributed value</p></div><span className="healthy">{channels.length} sources</span></div>{channels.length?channels.map((x:any)=><button key={x.channel} className={selected===x.channel?'selected':''} onClick={()=>setSelected(x.channel)}><div><b>{x.channel}</b><small>{x.matched} matched · {x.events} total events</small></div><div className="attribution-bar"><i style={{width:Math.max(2,Number(x.value||x.matched||0)/topValue*100)+'%'}}/></div><strong>{x.share?x.share+'%':fmt(x.value)}</strong><ChevronRight/></button>):<div className="empty-delivery-state"><PieChart/><div><b>No channel attribution evidence</b><small>Ingest click sessions and downstream outcomes to populate source contribution.</small></div></div>}</div>
  <div className="app-panel attribution-detail">{selectedChannel?<><div className="panel-head"><div><h3>{selectedChannel.channel}</h3><p>Observed contribution in {period.toLowerCase()}</p></div><span className="healthy">{selectedChannel.avgConfidence||0}% confidence</span></div><div className="site-detail-grid">{[['Total assisted events',selectedChannel.events],['Matched outcomes',selectedChannel.matched],['Attributed value',fmt(selectedChannel.value)],['Value share',selectedChannel.share+'%']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><div className="agent-section"><h4>Campaigns under this source</h4>{campaigns.filter((x:any)=>x.channel===selectedChannel.channel).slice(0,8).map((x:any)=><button className="attribution-subrow" key={x.campaign} onClick={()=>{setView('campaigns');setSelected(x.campaign)}}><div><b>{x.campaign}</b><small>{x.matched} matched · {fmt(x.value)} value</small></div><strong>{x.share||0}%</strong><ChevronRight/></button>)}</div></>:<div className="empty-delivery-state"><PieChart/><div><b>No source selected</b></div></div>}</div></div>}

  {view==='campaigns'&&<div className="attribution-layout"><div className="app-panel attribution-ranking"><div className="panel-head"><div><h3>Campaign contribution</h3><p>Campaign-level matched outcomes and value</p></div><span className="healthy">{campaigns.length} campaigns</span></div>{campaigns.length?campaigns.map((x:any)=><button key={x.channel+':'+x.campaign} className={selected===x.campaign?'selected':''} onClick={()=>setSelected(x.campaign)}><div><b>{x.campaign}</b><small>{x.channel} · {x.matched} matched</small></div><div className="attribution-bar"><i style={{width:Math.max(2,Number(x.value||x.matched||0)/topValue*100)+'%'}}/></div><strong>{x.share?x.share+'%':fmt(x.value)}</strong><ChevronRight/></button>):<div className="empty-delivery-state"><Target/><div><b>No campaign attribution evidence</b></div></div>}</div>
  <div className="app-panel attribution-detail">{selectedCampaign?<><div className="panel-head"><div><h3>{selectedCampaign.campaign}</h3><p>{selectedCampaign.channel}</p></div><span className="healthy">{selectedCampaign.avgConfidence||0}% confidence</span></div><div className="site-detail-grid">{[['Assisted events',selectedCampaign.events],['Matched outcomes',selectedCampaign.matched],['Attributed value',fmt(selectedCampaign.value)],['Value share',selectedCampaign.share+'%']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><button className="app-primary" onClick={()=>jump('Journeys')}>Inspect customer journeys <ArrowRight/></button></>:<div className="empty-delivery-state"><Target/><div><b>No campaign selected</b></div></div>}</div></div>}

  {view==='outcomes'&&<div className="app-panel"><div className="panel-head"><div><h3>Attributed business outcomes</h3><p>Downstream event types ranked by matched value and volume</p></div></div>{outcomes.length?outcomes.map((x:any)=><div className="attribution-outcome-row" key={x.event_type}><div><b>{String(x.event_type||'outcome').replaceAll('_',' ')}</b><small>{x.matched} matched of {x.events} events</small></div><div className="progress"><i style={{width:Math.max(2,Number(x.value||x.matched||0)/topValue*100)+'%'}}/></div><strong>{fmt(x.value)}</strong></div>):<div className="empty-delivery-state"><CircleDollarSign/><div><b>No attributed outcomes in this period</b></div></div>}</div>}

  {view==='matches'&&<div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Match methods</h3><p>Deterministic identifiers used to connect outcomes</p></div></div>{live?.methods?.length?live.methods.slice(0,50).map((x:any)=><div className="channel-line" key={x.method}><b>{String(x.method||'unmatched').replaceAll('_',' ')}</b><div className="progress"><i style={{width:(live.assistedEvents?Math.min(100,Number(x.count||0)/Number(live.assistedEvents)*100):0)+'%'}}/></div><span>{x.count} events</span><strong>{live.assistedEvents?Math.round(Number(x.count||0)/Number(live.assistedEvents)*100):0}%</strong></div>):<div className="empty-delivery-state"><ShieldCheck/><div><b>No match evidence in this window</b></div></div>}</div>
  <div className="app-panel"><div className="panel-head"><div><h3>Recent attributed outcomes</h3><p>Outcome → source/campaign evidence</p></div><button onClick={()=>jump('Matchback')}>Open Matchback</button></div>{recent.length?recent.slice(0,25).map((x:any)=><div className="attribution-recent-row" key={x.id}><span className={x.status==='matched'?'healthy':'status'}>{x.status}</span><div><b>{String(x.event_type||'outcome').replaceAll('_',' ')}</b><small>{x.utm_source||x.source||'Unknown source'}{x.utm_campaign?' · '+x.utm_campaign:''} · {x.match_method?String(x.match_method).replaceAll('_',' '):'unmatched'}</small></div><strong>{x.value==null?'—':fmt(x.value)+(x.currency?' '+x.currency:'')}</strong></div>):<div className="empty-delivery-state"><Activity/><div><b>No recent attribution events</b></div></div>}</div></div>}

  <div className="source-conflict-note"><ShieldCheck/><div><b>Attribution boundary</b><p>AceMarketing reports deterministic matches from persisted customer, click-ID, hashed contact and visitor evidence. It does not invent campaign credit for unmatched outcomes.</p></div></div>
 </>
}
