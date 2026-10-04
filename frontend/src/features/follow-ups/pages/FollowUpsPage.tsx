import {useEffect,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,ArrowRight,Check,CheckCircle2,ChevronRight,MessageCircle,Network,RefreshCw,ShieldCheck,Target,X} from 'lucide-react'
import {followUpsApi} from '../data/follow-ups.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {LoadingState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'

type Notice={kind:'ok'|'error'|'unknown'|'',text:string}
const unknownOutcome=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))

function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}>{action}</button>}</div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}
const normalize=(rows:any[])=>Array.isArray(rows)?rows.map((item:any)=>({id:String(item?.id||''),lead:String(item?.lead_ref||item?.lead||'Unknown lead'),reason:String(item?.reason||'Follow-up required'),channel:String(item?.channel||'—'),due:item?.due_at?new Date(item.due_at).toLocaleString():'—',priority:String(item?.priority||'medium').replace(/^./,(m:string)=>m.toUpperCase()),status:item?.status==='completed'?'Completed':'Open',owner:String(item?.owner||'—'),createdAt:item?.created_at||null,completedAt:item?.completed_at||null})).filter((item:any)=>item.id):[]

export default function FollowUpsPage(){
 const [items,setItems]=useState<any[]>([])
 const [stats,setStats]=useState<any>({})
 const [selected,setSelected]=useState('')
 const [builder,setBuilder]=useState(false)
 const [busy,setBusy]=useState('')
 const [journeyOpen,setJourneyOpen]=useState(false)
 const [journeyRecord,setJourneyRecord]=useState<any>(null)
 const [reactivation,setReactivation]=useState<any>({items:[],stats:{}})
 const [dormantDays,setDormantDays]=useState(30)
 const [recentDays,setRecentDays]=useState(7)
 const [notice,setNotice]=useState<Notice>({kind:'',text:''})
 const [queueError,setQueueError]=useState('')
 const [reactivationError,setReactivationError]=useState('')
 const [loading,setLoading]=useState(true)

 useDirtyWork({key:'follow-up-draft',label:'Follow-up draft',dirty:builder,scope:'feature'})

 const loadQueue=async()=>{
  try{
   const response:any=await followUpsApi.load()
   const mapped=normalize(response?.items||[])
   setItems(mapped);setStats(response?.stats||{})
   setSelected(current=>mapped.some((item:any)=>item.id===current)?current:(mapped[0]?.id||''))
   setQueueError('')
  }catch(error:any){setQueueError(error?.message||'Follow-up queue could not be loaded. Existing queue evidence was preserved.')}
 }
 const loadReactivation=async(days=dormantDays,recent=recentDays)=>{
  try{
   const response:any=await followUpsApi.reactivation(days,recent)
   setReactivation({items:Array.isArray(response?.items)?response.items:[],stats:response?.stats||{}})
   setReactivationError('')
  }catch(error:any){setReactivationError(error?.message||'Lead reactivation candidates could not be loaded. Existing candidate evidence was preserved.')}
 }
 useEffect(()=>{Promise.all([loadQueue(),loadReactivation(30,7)]).finally(()=>setLoading(false))},[])
 useDevelopmentLiveRefresh(()=>Promise.all([loadQueue(),loadReactivation(dormantDays,recentDays)]))
 useEffect(()=>{if(!loading)void loadReactivation(dormantDays,recentDays)},[dormantDays,recentDays])

 const current=items.find(item=>item.id===selected)||null
 const complete=async(id:string)=>{
  setBusy('complete');setNotice({kind:'',text:''})
  try{await followUpsApi.complete(id);setNotice({kind:'ok',text:'Follow-up marked completed after backend confirmation.'});await loadQueue()}
  catch(error:any){setNotice(unknownOutcome(error)?{kind:'unknown',text:'Completion outcome is unknown. Refresh the authoritative queue before repeating the action.'}:{kind:'error',text:error?.message||'Follow-up could not be completed.'})}
  finally{setBusy('')}
 }
 const create=async(event:any)=>{
  event.preventDefault();const form=new FormData(event.currentTarget);setBusy('create');setNotice({kind:'',text:''})
  try{await followUpsApi.create({leadRef:String(form.get('leadRef')||''),reason:String(form.get('reason')||''),channel:String(form.get('channel')||'WhatsApp'),priority:String(form.get('priority')||'medium'),delayMinutes:Number(form.get('delayMinutes')||15),owner:String(form.get('owner')||'Assigned counsellor')});setBuilder(false);setNotice({kind:'ok',text:'Follow-up created after backend confirmation.'});await loadQueue()}
  catch(error:any){setNotice(unknownOutcome(error)?{kind:'unknown',text:'Follow-up creation outcome is unknown. Refresh the authoritative queue before creating the same task again.'}:{kind:'error',text:error?.message||'Follow-up could not be created.'})}
  finally{setBusy('')}
 }
 const openJourney=async()=>{
  if(!current)return
  try{const response:any=await followUpsApi.journeys();const list=Array.isArray(response?.items)?response.items:[];setJourneyRecord(list.find((item:any)=>String(item?.lead||'').toLowerCase()===String(current.lead||'').toLowerCase())||null)}
  catch{setJourneyRecord(null)}
  setJourneyOpen(true)
 }
 const reactivate=async(candidate:any)=>{
  const leadRef=String(candidate?.leadRef||'');if(!leadRef)return
  setBusy('reactivate:'+leadRef);setNotice({kind:'',text:''})
  try{await followUpsApi.reactivate({leadRef,dormantDays,recentDays,channel:'WhatsApp',priority:'high',delayMinutes:5,owner:'Reactivation queue'});setNotice({kind:'ok',text:'Reactivation follow-up created from renewed intent evidence after backend confirmation.'});await Promise.all([loadQueue(),loadReactivation()])}
  catch(error:any){setNotice(unknownOutcome(error)?{kind:'unknown',text:'Reactivation outcome is unknown. Refresh queue and reactivation state before repeating the action.'}:{kind:'error',text:error?.message||'Lead reactivation could not be created.'})}
  finally{setBusy('')}
 }

 const candidates=Array.isArray(reactivation?.items)?reactivation.items:[]
 const visibleItems=items.slice(0,200)
 const visibleCandidates=candidates.slice(0,100)
 return <><PageHead crumb="Conversion / Follow-ups" title="Follow-up operations" sub="Keep qualified leads from going cold by turning stalled journey states and renewed intent into prioritized next actions." action="Create follow-up" onAction={()=>setBuilder(true)}/>
 {loading&&!items.length&&!candidates.length&&<LoadingState title="Loading follow-up operations" description="Reading persisted tasks and renewed-intent candidates."/>}
 {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':notice.kind==='unknown'?'warning':'ok')} role={notice.kind==='error'?'alert':'status'}>{notice.kind==='ok'?<CheckCircle2/>:<ShieldCheck/>}<span>{notice.text}</span>{notice.kind==='unknown'&&<button onClick={()=>void loadQueue()}>Refresh authoritative state</button>}</div>}
 {(queueError||reactivationError)&&<div className="delivery-notice error" role="alert"><Activity/><span>{[queueError,reactivationError].filter(Boolean).join(' · ')}</span></div>}
 <div className="stats-grid"><Stat label="Open follow-ups" value={String(Number(stats?.open||0))} sub="Current persisted queue" Icon={MessageCircle}/><Stat label="Completed today" value={String(Number(stats?.completedToday||0))} sub="Persisted completions" Icon={CheckCircle2}/><Stat label="Completed total" value={String(Number(stats?.completedTotal||0))} sub="Current retained history" Icon={Target}/><Stat label="Overdue" value={String(Number(stats?.overdue||0))} sub="Open tasks past due" Icon={Activity}/></div>
 <div className="followup-layout"><div className="app-panel followup-list"><div className="panel-head"><div><h3>Follow-up queue</h3><p>Persisted tasks ordered by due time{items.length>200?' · first 200 rendered':''}</p></div><button onClick={()=>void loadQueue()}>Refresh</button></div>{visibleItems.length?visibleItems.map((item:any)=><button key={item.id} className={selected===item.id?'selected':''} onClick={()=>setSelected(item.id)}><MessageCircle/><div><b>{item.lead}</b><small>{item.reason}</small></div><span className={String(item.priority||'medium').toLowerCase()}>{item.priority}</span><em>{item.due}</em><ChevronRight/></button>):!loading&&<div className="empty-delivery-state"><MessageCircle/><div><b>No follow-ups yet</b><small>Create a follow-up or let an agent create one from journey state.</small></div></div>}</div>
 <div className="app-panel followup-detail">{current?<><div className="panel-head"><div><h3>{current.lead}</h3><p>{current.reason}</p></div><span className={current.status==='Completed'?'healthy':'status'}>{current.status}</span></div><div className="site-detail-grid">{[['Recommended channel',current.channel],['Due',current.due],['Priority',current.priority],['Owner',current.owner],['Created',current.createdAt?new Date(current.createdAt).toLocaleString():'—'],['Completed',current.completedAt?new Date(current.completedAt).toLocaleString():'—']].map(item=><div key={item[0]}><span>{item[0]}</span><b>{String(item[1]||'—')}</b></div>)}</div>{current.status!=='Completed'?<div className="approval-actions"><button onClick={()=>void openJourney()}>Open journey</button><button className="approve" disabled={busy==='complete'} onClick={()=>void complete(current.id)}><Check/>{busy==='complete'?'Completing…':'Mark completed'}</button></div>:<div className="approval-final approved"><Check/><b>Follow-up completed</b></div>}</>:<div className="empty-delivery-state"><MessageCircle/><div><b>Select or create a follow-up</b></div></div>}</div></div>
 <div className="app-panel reactivation-panel"><div className="panel-head"><div><h3>Lead Reactivation agent</h3><p>Detect dormant leads that recently returned with high-intent first-party behavior.</p></div><div className="reactivation-controls"><label><span>Dormant</span><select aria-label="Reactivation dormant window" value={dormantDays} onChange={event=>setDormantDays(Number(event.target.value))}><option value={14}>14+ days</option><option value={30}>30+ days</option><option value={60}>60+ days</option><option value={90}>90+ days</option></select></label><label><span>Renewed intent</span><select aria-label="Reactivation recent window" value={recentDays} onChange={event=>setRecentDays(Number(event.target.value))}><option value={1}>Last 24h</option><option value={3}>Last 3 days</option><option value={7}>Last 7 days</option><option value={14}>Last 14 days</option></select></label><button onClick={()=>void loadReactivation()}>Refresh</button></div></div>
 <div className="reactivation-summary"><div><b>{Number(reactivation?.stats?.candidates||candidates.length)}</b><span>eligible leads</span></div><p>A lead must have an older persisted last activity and then produce a recent pricing, checkout, booking, consultation, purchase, demo or sales-intent event tied to the same customer or device. Existing open reactivation tasks are excluded.</p></div>
 <div className="reactivation-grid">{visibleCandidates.length?visibleCandidates.map((item:any,index:number)=><article key={String(item?.leadRef||item?.name||index)}><div className="reactivation-card-head"><RefreshCw/><div><b>{String(item?.name||item?.leadRef||'Lead')}</b><small>{String(item?.source||'Unknown source')}{item?.campaign?' · '+String(item.campaign):''}</small></div><span>{Number(item?.dormantDays||0)}d dormant</span></div><div className="reactivation-signal"><span>Renewed signal</span><b>{String(item?.renewedEvent||'').replaceAll('_',' ')}</b><small>{item?.renewedAt?new Date(item.renewedAt).toLocaleString():'—'} · {String(item?.renewedSource||'First-party')}</small></div><div className="reactivation-card-actions"><div><span>Grade {String(item?.grade||'—')}</span><span>Score {Number(item?.score||0)}</span></div><button className="approve" disabled={busy==='reactivate:'+String(item?.leadRef||'')} onClick={()=>void reactivate(item)}>{busy==='reactivate:'+String(item?.leadRef||'')?'Creating…':'Create reactivation follow-up'}<ArrowRight/></button></div></article>):!loading&&<div className="empty-delivery-state"><RefreshCw/><div><b>No renewed dormant leads right now</b><small>The agent only surfaces evidence-backed reactivation candidates.</small></div></div>}</div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Follow-up policy examples</h3><p>Use custom agents or workflows to create these tasks</p></div></div>{[['Qualified, no booking','15 min'],['Meeting no-show','15 min'],['Pricing objection','Immediate'],['High-intent revisit','5 min'],['Call no-answer','2 hours'],['CRM stage stale','24 hours']].map(item=><div className="setting-line" key={item[0]}><span>{item[0]}</span><b>{item[1]}</b></div>)}</div><div className="app-panel"><div className="panel-head"><div><h3>Queue state</h3><p>Current persisted task outcomes</p></div></div>{[['Open',stats?.open||0],['Completed today',stats?.completedToday||0],['Completed total',stats?.completedTotal||0],['Overdue',stats?.overdue||0]].map(item=><div className="developer-event-row" key={item[0]}><b>{item[0]}</b><span>Follow-up tasks</span><strong>{String(item[1])}</strong></div>)}</div></div>
 {builder&&<AccessibleDialog ariaLabel="Create follow-up" onClose={()=>setBuilder(false)}><form className="connector-card" onSubmit={create}><div className="connector-modal-head"><div><MessageCircle/><div><b>Create follow-up</b><small>Persist a manual next action.</small></div></div><button type="button" aria-label="Close follow-up builder" onClick={()=>setBuilder(false)}><X/></button></div><label>Lead reference<input name="leadRef" required placeholder="customer_123"/></label><label>Reason<input name="reason" required placeholder="Qualified but consultation not booked"/></label><label>Channel<select name="channel"><option>WhatsApp</option><option>Voice</option><option>Email</option><option>Counsellor call</option></select></label><label>Priority<select name="priority"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><label>Delay minutes<input name="delayMinutes" type="number" min="0" defaultValue="15"/></label><label>Owner<input name="owner" defaultValue="Assigned counsellor"/></label><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create follow-up'}</button></form></AccessibleDialog>}
 {journeyOpen&&<AccessibleDialog ariaLabel="Follow-up journey context" onClose={()=>setJourneyOpen(false)}><div className="connector-card"><div className="connector-modal-head"><div><Network/><div><b>Journey context</b><small>{current?.lead||'Lead'}</small></div></div><button aria-label="Close follow-up journey context" onClick={()=>setJourneyOpen(false)}><X/></button></div>{journeyRecord?<div className="site-detail-grid">{[['Lead',journeyRecord.lead],['Source',journeyRecord.source],['Stage',journeyRecord.stage],['Touchpoints',journeyRecord.touchpoints],['Duration',journeyRecord.duration]].map(item=><div key={item[0]}><span>{item[0]}</span><b>{String(item[1]??'—')}</b></div>)}</div>:<div className="empty-delivery-state"><Network/><div><b>No persisted journey found</b><small>This follow-up remains valid, but the journey endpoint has no matching lead record.</small></div></div>}</div></AccessibleDialog>}
 </>
}
