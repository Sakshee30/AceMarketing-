import {useEffect,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,AlertTriangle,ArrowRight,CheckCircle2,Gauge,ShieldCheck} from 'lucide-react'
import {matchQualityApi as api} from '../data/match-quality.api'
import {QualityPageHead as PageHead,QualityStat as Stat} from '../ui/QualityPrimitives'

export default function MatchQualityPage(){
 const [data,setData]=useState<any>({coverage:[],items:[],recommendations:[]})
 const [notice,setNotice]=useState('')
 const load=async()=>{try{setData(await api.load());setNotice('')}catch(e:any){setNotice(e?.message||'Match quality could not be loaded.')}}
 useEffect(()=>{void load()},[])
 useDevelopmentLiveRefresh(()=>load())
 const signalLabel=(key:string)=>({
  customerId:'Customer ID',emailSha256:'Email hash',phoneSha256:'Phone hash',deviceId:'Device ID',visitorId:'Visitor ID',
  gclid:'GCLID',gbraid:'GBRAID',wbraid:'WBRAID',fbclid:'FBCLID',msclkid:'MSCLKID',oppref:'oppref',obref:'obref',
  ipAddress:'IP address',userAgent:'User agent'
 } as any)[key]||key
 const scoreTone=(score:number)=>score>=70?'healthy':score>=40?'warning':'critical'
 return <><PageHead crumb="Tracking / Match Quality" title="Event match quality" sub="Measure first-party identity coverage across persisted events so activation systems receive stronger, more deterministic matching signals." action="Refresh" onAction={load}/>
 {notice&&<div className="delivery-notice error" role="alert"><ShieldCheck/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Identity coverage score" value={String(data.averageScore??0)+'/100'} sub="AceMarketing internal score, not provider-reported EMQ" Icon={Gauge}/><Stat label="Strong events" value={String(data.strongRate??0)+'%'} sub={String(data.strongEvents||0)+' events scored 70+'} Icon={CheckCircle2}/><Stat label="Weak events" value={String(data.weakRate??0)+'%'} sub={String(data.weakEvents||0)+' events below 40'} Icon={AlertTriangle}/><Stat label="Events scored" value={String(data.totalEvents||0)} sub="Persisted first-party event sample" Icon={Activity}/></div>
 <div className="match-quality-hero app-panel"><div><Gauge/><div><span>IDENTITY COVERAGE</span><h3>Stronger identifiers improve downstream matching</h3><p>AceMarketing scores whether events contain deterministic customer identity, hashed contact data, click IDs, device IDs and browser/server context. This is an internal coverage score and is deliberately not labeled as Meta EMQ, Google match rate or OpenAI provider score.</p></div></div><div className="data-flow-steps">{['Capture identity','Persist click IDs','Hash contacts','Attach device context','Activate server-side'].map((x,i)=><span key={x}><b>{i+1}</b>{x}{i<4&&<ArrowRight/>}</span>)}</div></div>
 <div className="match-quality-layout"><section className="app-panel"><div className="panel-head"><div><h3>Identifier coverage</h3><p>How often each matching signal is present across recent persisted events</p></div></div><div className="match-signal-list">{(data.coverage||[]).map((x:any)=><article key={x.signal}><div><b>{signalLabel(x.signal)}</b><small>{x.count} of {data.totalEvents||0} events</small></div><strong>{x.rate}%</strong><div className="progress"><i style={{width:Math.min(100,Number(x.rate||0))+'%'}}/></div></article>)}</div></section>
 <section className="app-panel"><div className="panel-head"><div><h3>Recommended fixes</h3><p>Concrete actions based on the weakest observed identifiers</p></div><span className={(data.recommendations||[]).length?'warning':'healthy'}>{(data.recommendations||[]).length} gaps</span></div>{(data.recommendations||[]).length?<div className="match-recommendations">{(data.recommendations||[]).map((x:any)=><article key={x.key}><ShieldCheck/><div><b>{x.title}</b><p>{x.detail}</p></div><button onClick={()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:x.tab}))}>Open {x.tab}</button></article>)}</div>:<div className="empty-delivery-state"><CheckCircle2/><div><b>No major identity-coverage gaps detected</b><small>Continue monitoring new traffic sources and conversion events.</small></div></div>}</section></div>
 <section className="app-panel"><div className="panel-head"><div><h3>Event-type quality</h3><p>Average internal identity-coverage score by tracked event type</p></div><span className={data.available?'healthy':'status'}>{(data.items||[]).length} event types</span></div>{(data.items||[]).length?<div className="match-event-table"><table><thead><tr><th>Event</th><th>Volume</th><th>Top source</th><th>Coverage score</th><th>Status</th></tr></thead><tbody>{(data.items||[]).map((x:any)=><tr key={x.event}><td><b>{String(x.event).replaceAll('_',' ')}</b></td><td>{x.count}</td><td>{x.topSource}</td><td>{x.averageScore}/100</td><td><span className={scoreTone(Number(x.averageScore||0))}>{x.averageScore>=70?'Strong':x.averageScore>=40?'Improve':'Weak'}</span></td></tr>)}</tbody></table></div>:<div className="empty-delivery-state"><Activity/><div><b>No events available to score</b><small>Persist first-party events to build match-quality evidence.</small></div></div>}</section>
 <div className="source-conflict-note match-quality-note"><ShieldCheck/><div><b>Provider-score boundary</b><p>{data.note||'AceMarketing reports its own identity coverage only. Provider-reported match quality must come from the provider integration itself.'}</p></div></div>
 </> 
}
