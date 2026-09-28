import {useEffect,useState} from 'react'
import {Activity,BarChart3,Bell,CheckCircle2,RadioTower,ShieldCheck,Sparkles,Target,X,Zap} from 'lucide-react'
import {liveSyncApi} from '../data/live-sync.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {ErrorState,LoadingState,StaleState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}</div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}
type Notice={kind:'ok'|'error'|'unknown'|'',text:string}
const unknownMutation=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))

export default function LiveSyncPage(){
 const [live,setLive]=useState<any>(null)
 const [alertOpen,setAlertOpen]=useState(false)
 const [notice,setNotice]=useState<Notice>({kind:'',text:''})
 const [saving,setSaving]=useState(false)
 const [loading,setLoading]=useState(true)

 useDirtyWork({key:'live-sync-alert-draft',label:'Monitoring alert draft',dirty:alertOpen,scope:'feature'})

 const load=async()=>{
  setLoading(true)
  try{
   const result:any=await liveSyncApi.load()
   setLive(result)
   setNotice(current=>current.kind==='error'?{kind:'',text:''}:current)
  }catch(error:any){
   setNotice({kind:'error',text:error?.message||'Live sync could not be loaded. Existing activity remains visible.'})
  }finally{setLoading(false)}
 }

 useEffect(()=>{
  let disposed=false
  const refresh=()=>{if(!disposed&&document.visibilityState==='visible')void load()}
  refresh()
  const interval=window.setInterval(refresh,15000)
  const onVisibility=()=>{if(document.visibilityState==='visible')refresh()}
  document.addEventListener('visibilitychange',onVisibility)
  return()=>{
   disposed=true
   window.clearInterval(interval)
   document.removeEventListener('visibilitychange',onVisibility)
  }
 },[])

 const saveAlert=async(event:any)=>{
  event.preventDefault()
  const form=new FormData(event.currentTarget)
  setSaving(true)
  setNotice({kind:'',text:''})
  try{
   await liveSyncApi.saveAlert({
    metric:String(form.get('metric')),
    operator:'gt',
    threshold:Number(form.get('threshold')),
    severity:String(form.get('severity')||'warning'),
    windowMinutes:Number(form.get('windowMinutes')||10),
    enabled:true
   })
   setAlertOpen(false)
   setNotice({kind:'ok',text:'Monitoring alert saved after backend confirmation.'})
  }catch(error:any){
   setNotice(unknownMutation(error)
    ?{kind:'unknown',text:'The alert-save outcome is unknown. Refresh monitoring state before creating the same alert again.'}
    :{kind:'error',text:error?.message||'Alert could not be saved.'}
   )
  }finally{setSaving(false)}
 }

 const rows=(live?.recent||[]).slice(0,100)
 const destinations=live?.destinations||[]
 const latency=live?.medianLatencyMs==null?'—':live.medianLatencyMs<1000?Math.round(live.medianLatencyMs)+'ms':(live.medianLatencyMs/1000).toFixed(1)+'s'
 const statusLabel=live?.status==='active'?'Active':live?.status==='idle'?'Idle':loading?'Loading':'Delayed'

 return <>
  <PageHead crumb="AdSync / Live Sync" title="24×7 event transfer" sub="Continuous movement of first-party, CRM, calling, chat and revenue signals to configured destinations." action="Create alert" onAction={()=>setAlertOpen(true)}/>

  {loading&&!live&&<LoadingState title="Loading live sync" description="Reading current ingestion, delivery and destination evidence."/>}
  {notice.text&&notice.kind==='error'&&<ErrorState title="Live sync refresh failed" description={notice.text} action={{label:'Retry live sync',onClick:load}}/>}
  {notice.text&&notice.kind==='unknown'&&<StaleState title="Monitoring alert needs reconciliation" description={notice.text} action={{label:'Refresh authoritative state',onClick:load}}/>}
  {notice.text&&notice.kind==='ok'&&<div className="delivery-notice ok" role="status"><CheckCircle2/><span>{notice.text}</span></div>}

  <div className="stats-grid">
   <Stat label="Sync status" value={statusLabel} sub="Measured from current ingestion/delivery state" Icon={Activity}/>
   <Stat label="Median delivery latency" value={latency} sub="Persisted provider receipts" Icon={Zap}/>
   <Stat label="Events / min" value={live?.available?String(live.eventsPerMinute||0):'—'} sub="Accepted first-party events in last minute" Icon={BarChart3}/>
   <Stat label="Delivery rate" value={live?.deliveryRate==null?'—':String(live.deliveryRate)+'%'} sub="Terminal provider deliveries" Icon={Target}/>
  </div>

  <div className="app-panel" aria-busy={loading?'true':undefined}>
   <div className="panel-head"><div><h3>Recent activity</h3><p>{document.visibilityState==='visible'?'Visibility-aware refresh every 15 seconds':'Live refresh paused while this tab is hidden'}</p></div><button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh'}</button></div>
   {rows.length?<table><thead><tr><th>Time</th><th>Source</th><th>Event</th><th>Destination</th><th>Status</th><th>Match key</th></tr></thead><tbody>{rows.map((row:any)=><tr key={row.id}><td>{row.time?new Date(row.time).toLocaleTimeString():'—'}</td><td>{row.source}</td><td>{row.event}</td><td>{row.destination}</td><td><span className="status">{String(row.status).replaceAll('_',' ')}</span></td><td>{row.matchKey}</td></tr>)}</tbody></table>:!loading&&<div className="empty-delivery-state"><Activity/><div><b>No live activity yet</b><small>Tracked events and provider deliveries will appear here as they happen.</small></div></div>}
  </div>

  <div className="two-col">
   <div className="app-panel"><div className="panel-head"><div><h3>Destination throughput</h3><p>Persisted provider delivery outcomes</p></div></div>{destinations.length?destinations.map((item:any)=><div className="health-line" key={item.destination}><span>{item.destination}</span><div className="progress"><i style={{width:Math.max(0,Math.min(100,Number(item.deliveryRate||0)))+'%'}}/></div><b>{Number(item.deliveryRate||0).toFixed(1)}%</b></div>):<div className="empty-delivery-state"><RadioTower/><div><b>No destination history yet</b><small>Provider throughput is calculated only from persisted delivery attempts.</small></div></div>}</div>
   <div className="app-panel"><div className="panel-head"><div><h3>Freshness policy</h3><p>No fabricated next-day or live-volume claims</p></div></div><div className="freshness-card"><Zap/><div><b>Real-time first</b><p>Critical intent and revenue outcomes are queued immediately; retries use idempotent event IDs and backoff.</p></div></div><div className="freshness-card"><ShieldCheck/><div><b>Safe retries</b><p>Failed deliveries remain visible in Delivery and Monitoring until replayed or resolved.</p></div></div></div>
  </div>

  {alertOpen&&<AccessibleDialog ariaLabel="Create monitoring alert" onClose={()=>setAlertOpen(false)}><form className="connector-card" onSubmit={saveAlert}><div className="connector-modal-head"><div><Bell/><div><b>Create monitoring alert</b><small>Persist a real observability threshold.</small></div></div><button type="button" aria-label="Close monitoring alert" onClick={()=>setAlertOpen(false)}><X/></button></div><label>Metric<select name="metric" defaultValue="api_error_rate"><option value="api_error_rate">API 5xx error rate (%)</option><option value="api_p95_latency_ms">API p95 latency (ms)</option><option value="dead_letter_jobs">Dead-letter jobs</option><option value="audience_sync_errors">Audience sync errors</option></select></label><label>Threshold<input name="threshold" type="number" min="0" required defaultValue="5"/></label><label>Window (minutes)<input name="windowMinutes" type="number" min="1" max="1440" defaultValue="10"/></label><label>Severity<select name="severity"><option>warning</option><option>critical</option><option>info</option></select></label><button disabled={saving}>{saving?'Saving…':'Save alert'}</button></form></AccessibleDialog>}
 </>
}
