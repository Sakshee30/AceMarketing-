import {useEffect,useState} from 'react'
import {beginLoading,useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,ArrowRight,Check,CheckCircle2,ChevronRight,DatabaseZap,ShieldCheck,Sparkles,UsersRound} from 'lucide-react'
import {dataHubApi} from '../data/data-hub.api'
import {ErrorState,LoadingState,StaleState} from '../../../components/system/FrontendStates'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}</div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}
type Notice={kind:'ok'|'error'|'unknown'|'',text:string}
const unknownMutation=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))

export default function DataHubPage(){
 const [hub,setHub]=useState<any>(null)
 const [selected,setSelected]=useState('')
 const [rebuilding,setRebuilding]=useState(false)
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<Notice>({kind:'',text:''})

 const load=async()=>{
  beginLoading(setLoading)
  try{
   const result:any=await dataHubApi.load()
   setHub(result)
   if(result.sources?.length){
    setSelected((current:string)=>current&&result.sources.some((source:any)=>source.name===current)?current:result.sources[0].name)
   }else{
    setSelected('')
   }
   setNotice(current=>current.kind==='error'?{kind:'',text:''}:current)
  }catch(error:any){
   setNotice({kind:'error',text:error?.message||'Data Hub could not be loaded. Existing source evidence was preserved.'})
  }finally{setLoading(false)}
 }

 useEffect(()=>{void load()},[])
 useDevelopmentLiveRefresh(()=>load())

 const sources=hub?.sources||[]
 const current=sources.find((item:any)=>item.name===selected)||sources[0]

 const rebuild=async()=>{
  setRebuilding(true)
  setNotice({kind:'',text:''})
  try{
   const result:any=await dataHubApi.rebuild()
   setNotice({kind:'ok',text:'Canonical snapshot rebuilt after backend confirmation: '+String(result.id||'complete')})
   await load()
  }catch(error:any){
   setNotice(unknownMutation(error)
    ?{kind:'unknown',text:'The canonical rebuild outcome is unknown because the acknowledgement was lost. Refresh authoritative Data Hub state before starting another rebuild.'}
    :{kind:'error',text:error?.message||'Canonical snapshot rebuild failed.'}
   )
  }finally{setRebuilding(false)}
 }

 const freshness=(seconds:any)=>seconds==null?'—':seconds<60?seconds+'s':seconds<3600?Math.round(seconds/60)+'m':Math.round(seconds/3600)+'h'
 const addSource=()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Integrations'}))
 const recent=(hub?.recent||[]).slice(0,100)

 return <>
  <PageHead crumb="Data / Data Hub" title="Unified customer data hub" sub="Normalize connected first-party sources into one governed customer, journey and revenue truth for attribution, activation and agents." action="Add data source" onAction={addSource}/>

  {loading&&!hub&&<LoadingState title="Loading Data Hub" description="Reading source registry, identity, attribution and schema-health evidence."/>}
  {notice.text&&notice.kind==='error'&&<ErrorState title="Data Hub action failed" description={notice.text} action={{label:'Refresh Data Hub',onClick:load}}/>}
  {notice.text&&notice.kind==='unknown'&&<StaleState title="Canonical rebuild needs reconciliation" description={notice.text} action={{label:'Refresh authoritative state',onClick:load}}/>}
  {notice.text&&notice.kind==='ok'&&<div className="delivery-notice ok" role="status"><CheckCircle2/><span>{notice.text}</span></div>}

  <div className="stats-grid">
   <Stat label="Unified records" value={hub?.available?Number(hub.records||0).toLocaleString('en-IN'):'—'} sub="Observed across current source registry" Icon={DatabaseZap}/>
   <Stat label="Known identities" value={hub?.available?Number(hub.knownIdentities||0).toLocaleString('en-IN'):'—'} sub="Persisted lead / customer profiles" Icon={UsersRound}/>
   <Stat label="Matched attribution events" value={hub?.available?Number(hub.matchedEvents||0).toLocaleString('en-IN'):'—'} sub="Persisted deterministic/assisted matches" Icon={Activity}/>
   <Stat label="Schema health" value={hub?.available?Number(hub.schemaHealth||0).toFixed(2)+'%':'—'} sub={String(hub?.quarantined||0)+' quarantined events'} Icon={ShieldCheck}/>
  </div>

  <div className="datahub-layout">
   <div className="app-panel datahub-source-list" aria-busy={loading?'true':undefined}>
    <div className="panel-head"><div><h3>Source registry</h3><p>Observed freshness, volume and source health</p></div><span className={sources.length?'healthy':'status'}>{sources.length} sources</span></div>
    {sources.length?sources.map((item:any)=><button key={item.name} className={selected===item.name?'selected':''} onClick={()=>setSelected(item.name)}><DatabaseZap/><div><b>{item.name}</b><small>{String(item.type||'source').replaceAll('_',' ')} · {Number(item.records||0).toLocaleString('en-IN')} records</small></div><span>{freshness(item.freshnessSeconds)}</span><em className={item.status==='healthy'?'healthy':'status'}>{item.status}</em><ChevronRight/></button>):!loading&&<div className="empty-delivery-state"><DatabaseZap/><div><b>No source activity yet</b><small>Connect or ingest a source and it will appear here.</small></div></div>}
   </div>

   <div className="app-panel datahub-detail">
    {current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{String(current.type||'source').replaceAll('_',' ')} · last event {freshness(current.freshnessSeconds)} ago</p></div><span className={current.status==='healthy'?'healthy':'status'}>{current.status}</span></div>
    <div className="site-detail-grid">{[['Records',Number(current.records||0).toLocaleString('en-IN')],['Freshness',freshness(current.freshnessSeconds)],['Last event',current.lastEventAt?new Date(current.lastEventAt).toLocaleString():'—'],['Status',current.status],['Identity coverage','Source dependent'],['Lineage','Retained in workspace audit/state']].map(item=><div key={item[0]}><span>{item[0]}</span><b>{item[1]}</b></div>)}</div>
    <div className="agent-section"><h4>Observed fields</h4><div className="context-chips">{(current.fields||[]).length?(current.fields||[]).map((field:string)=><span key={field}>{field}</span>):<span>No field sample yet</span>}</div></div>
    <div className="data-lineage"><h4>Lineage</h4>{[['Source record',current.name],['Normalize','Workspace canonical schema'],['Identity','Customer/device/session graph'],['Journey','Chronological event stream'],['Revenue truth','CRM / billing / POS authority'],['Consumers','Attribution · Agents · Audiences · Reports']].map((item,index)=><div key={item[0]}><span>{index+1}</span><div><b>{item[0]}</b><small>{item[1]}</small></div>{index<5&&<ArrowRight/>}</div>)}</div>
    </>:<div className="empty-delivery-state"><DatabaseZap/><div><b>Select a source</b><small>Live source details appear after ingestion begins.</small></div></div>}
   </div>
  </div>

  <div className="two-col">
   <div className="app-panel"><div className="panel-head"><div><h3>Canonical data model</h3><p>One shared language across systems</p></div></div>{[['Customer','customer_id · email_hash · phone_hash · device_id'],['Acquisition','source · campaign · adset · creative'],['Click identity','gclid · fbclid · device/session'],['Lifecycle','lead_stage · disposition · owner'],['Interaction','web · app · call · WhatsApp · meeting'],['Revenue','order_id · value · currency · refund']].map(item=><div className="mapping-rule" key={item[0]}><span>{item[0]}</span><ArrowRight/><b>{item[1]}</b></div>)}</div>
   <div className="app-panel"><div className="panel-head"><div><h3>Data quality controls</h3><p>Before records become shared truth</p></div><button onClick={rebuild} disabled={rebuilding}>{rebuilding?'Rebuilding…':'Rebuild canonical view'}</button></div>{[['Schema validation','Required'],['Duplicate resolution','Deterministic event / identity keys'],['Unknown fields','Quarantine + mapping review'],['Late data','Reprocess attribution window'],['PII activation','Hash before destination'],['Audience activation','Marketing consent re-check'],['Auditability','Source + transform lineage retained']].map(item=><div className="setting-line" key={item[0]}><span>{item[0]}</span><b>{item[1]}</b><Check/></div>)}</div>
  </div>

  <div className="app-panel" aria-busy={loading?'true':undefined}>
   <div className="panel-head"><div><h3>Recent source activity</h3><p>Observed changes across the unified data layer</p></div><button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh'}</button></div>
   {recent.length?recent.map((item:any)=><div className="sync-history-row" key={item.id}><time>{item.time?new Date(item.time).toLocaleTimeString():'—'}</time><b>{item.source}</b><span>{item.kind}</span><span>{item.operation}</span><em className={item.status==='healthy'?'healthy':'status'}>{item.status}</em></div>):!loading&&<div className="empty-delivery-state"><Activity/><div><b>No recent source activity</b><small>The Data Hub does not fabricate sync history when nothing has been ingested.</small></div></div>}
  </div>
 </>
}
