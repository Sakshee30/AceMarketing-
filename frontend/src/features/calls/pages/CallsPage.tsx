import {useEffect,useState} from 'react'
import {Activity,CalendarDays,CheckCircle2,ChevronRight,PhoneCall,PhoneIncoming,ShieldCheck,Target,X} from 'lucide-react'
import {callsApi} from '../data/calls.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {LoadingState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'

type Notice={kind:'ok'|'error'|'unknown'|'',text:string}
const unknownOutcome=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))

function PageHead({crumb,title,sub,action,onAction,disabled=false}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void,disabled?:boolean}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" disabled={disabled} onClick={onAction}>{action}</button>}</div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}

export default function CallsPage(){
 const [calls,setCalls]=useState<any[]>([])
 const [tracked,setTracked]=useState<any[]>([])
 const [selected,setSelected]=useState('')
 const [scheduleAt,setScheduleAt]=useState('')
 const [busy,setBusy]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<Notice>({kind:'',text:''})
 const [builder,setBuilder]=useState(false)

 useDirtyWork({key:'qualification-call-draft',label:'Voice qualification draft',dirty:builder,scope:'feature'})

 const load=async()=>{
  setLoading(true)
  try{
   const [runs,events]:any=await Promise.all([callsApi.qualification(),callsApi.events()])
   const mapped=(runs.items||[]).map((item:any)=>({id:item.id,kind:'agent',lead:item.lead,source:item.source,agent:item.agent,status:String(item.status).replace('_',' '),duration:item.duration,intent:item.intent||0,next:item.next,attempts:item.attempts,lastError:item.lastError,createdAt:item.createdAt}))
   const trackedRows=(events.items||[]).map((item:any)=>({id:item.id,kind:'tracked',lead:item.customerId||item.from||'Caller',source:item.source||item.provider||'Telephony',agent:'Call Tracking Events',status:String(item.status||'completed').replace('_',' '),duration:item.durationSeconds?item.durationSeconds+'s':'—',intent:0,next:item.disposition||'Attribution captured',provider:item.provider,startedAt:item.startedAt,from:item.from,to:item.to,campaign:item.campaign,keyword:item.keyword,creative:item.creative,adGroup:item.adGroup,gclid:item.gclid,fbclid:item.fbclid,msclkid:item.msclkid}))
   setCalls(mapped);setTracked(trackedRows)
   const first=mapped[0]?.id||trackedRows[0]?.id||''
   setSelected(current=>current&&[...mapped,...trackedRows].some((item:any)=>item.id===current)?current:first)
   setNotice(current=>current.kind==='error'?{kind:'',text:''}:current)
  }catch(error:any){setNotice({kind:'error',text:error?.message||'Call operations could not be refreshed. Existing call state was preserved.'})}
  finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[])

 const rows=[...calls,...tracked]
 const visibleRows=rows.slice(0,200)
 const current=rows.find(item=>item.id===selected)||rows[0]
 const retry=async(id:string)=>{
  setBusy('retry:'+id);setNotice({kind:'',text:''})
  try{await callsApi.retry(id);setNotice({kind:'ok',text:'Qualification call re-queued after backend confirmation.'});await load()}
  catch(error:any){setNotice(unknownOutcome(error)?{kind:'unknown',text:'Call retry outcome is unknown. Refresh authoritative call state before retrying again.'}:{kind:'error',text:error?.message||'Call retry failed.'})}
  finally{setBusy('')}
 }
 const schedule=async()=>{
  if(!current||!scheduleAt)return
  setBusy('schedule');setNotice({kind:'',text:''})
  try{await callsApi.createMeeting({leadRef:current.lead,startsAt:new Date(scheduleAt).toISOString(),owner:'Unassigned',reminderPlan:['voice'],attendeePhone:current.from||'',syncCalendar:true});setNotice({kind:'ok',text:'Consultation created after backend confirmation. It is now available in Meetings.'});setScheduleAt('')}
  catch(error:any){setNotice(unknownOutcome(error)?{kind:'unknown',text:'Meeting creation outcome is unknown. Refresh Meetings before scheduling the same consultation again.'}:{kind:'error',text:error?.message||'Meeting could not be created.'})}
  finally{setBusy('')}
 }
 const createQualification=async(event:any)=>{
  event.preventDefault();const form=new FormData(event.currentTarget);setBusy('create');setNotice({kind:'',text:''})
  try{
   const result:any=await callsApi.createQualification({lead:String(form.get('lead')||''),leadRef:String(form.get('lead')||''),phone:String(form.get('phone')||''),source:String(form.get('source')||'Workspace'),intent:Number(form.get('intent')||0),trigger:String(form.get('trigger')||'manual_qualification')})
   setBuilder(false);setNotice({kind:'ok',text:'Qualification call accepted by the durable voice-agent worker'+(result?.id?' · '+String(result.id).slice(0,18):'')+'.'});await load();if(result?.id)setSelected(result.id)
  }catch(error:any){setNotice(unknownOutcome(error)?{kind:'unknown',text:'Qualification-call admission outcome is unknown. Refresh authoritative call state before submitting the same run again.'}:{kind:'error',text:error?.message||'Qualification call could not be queued.'})}
  finally{setBusy('')}
 }
 const connected=tracked.filter(item=>['answered','completed','connected','qualified'].includes(String(item.status).toLowerCase())).length
 const qualified=calls.filter(item=>String(item.status).toLowerCase().includes('succeed')||String(item.status).toLowerCase().includes('qualified')).length
 const coverage=(field:string)=>tracked.length?Math.round(tracked.filter((item:any)=>Boolean(item[field])).length/tracked.length*100):0
 const clickCoverage=tracked.length?Math.round(tracked.filter((item:any)=>item.gclid||item.fbclid||item.msclkid).length/tracked.length*100):0

 return <><PageHead crumb="Conversion / Calls" title="Voice qualification & call tracking" sub="Run qualification agents and ingest signed telephony events into lead context and offline attribution." action={loading?'Refreshing…':'Refresh calls'} onAction={()=>void load()} disabled={loading}/>
 {loading&&!rows.length&&<LoadingState title="Loading call operations" description="Reading voice-agent runs and signed telephony events."/>}
 {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':notice.kind==='unknown'?'warning':'ok')} role={notice.kind==='error'?'alert':'status'}>{notice.kind==='ok'?<CheckCircle2/>:<ShieldCheck/>}<span>{notice.text}</span>{notice.kind==='unknown'&&<button onClick={()=>void load()}>Refresh authoritative state</button>}</div>}
 <div className="stats-grid"><Stat label="Qualification runs" value={String(calls.length)} sub="Persisted agent executions" Icon={PhoneIncoming}/><Stat label="Tracked call events" value={String(tracked.length)} sub="Signed telephony webhook events" Icon={PhoneCall}/><Stat label="Connected tracked calls" value={String(connected)} sub="Answered / completed outcomes" Icon={Activity}/><Stat label="Qualified runs" value={String(qualified)} sub="Successful qualification outcomes" Icon={Target}/></div>
 <div className="call-attribution-strip"><article><span>Campaign coverage</span><b>{coverage('campaign')}%</b><small>Tracked calls with campaign context</small></article><article><span>Keyword coverage</span><b>{coverage('keyword')}%</b><small>Search/call keyword captured</small></article><article><span>Creative coverage</span><b>{coverage('creative')}%</b><small>Ad creative/name available</small></article><article><span>Click-ID coverage</span><b>{clickCoverage}%</b><small>GCLID / FBCLID / MSCLKID present</small></article></div>
 <div className="call-ops-layout"><div className="app-panel call-list"><div className="panel-head"><div><h3>Recent call activity</h3><p>Agent runs plus provider call-tracking events{rows.length>200?' · first 200 rendered':''}</p></div><div className="panel-actions"><button disabled={loading} onClick={()=>void load()}>{loading?'Refreshing…':'Refresh'}</button><button onClick={()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Agents'}))}>Configure agent</button></div></div>{visibleRows.length?visibleRows.map((item:any)=><button key={item.kind+':'+item.id} className={selected===item.id?'selected':''} onClick={()=>setSelected(item.id)}><PhoneIncoming/><div><b>{item.lead}</b><small>{item.source} · {item.duration}</small></div><span>{item.status}</span><ChevronRight/></button>):!loading&&<div className="empty-delivery-state"><PhoneIncoming/><div><b>No calls recorded yet</b><small>Qualification runs and signed telephony events will appear here.</small></div></div>}</div>
 {current?<div className="app-panel call-detail"><div className="panel-head"><div><h3>{current.lead}</h3><p>{current.agent}</p></div><span className="score">{current.kind==='agent'?current.intent+' intent':'Tracked call'}</span></div><div className="call-detail-grid">{[['Call ID',current.id],['Source',current.source],['Outcome',current.status],['Campaign',current.campaign||'—'],['Keyword',current.keyword||'—'],['Creative',current.creative||'—'],['Ad group / ad set',current.adGroup||'—'],['Next action',current.next||'Review journey']].map(item=><div key={item[0]}><span>{item[0]}</span><b>{item[1]}</b></div>)}</div>
 <div className="source-conflict-note"><PhoneCall/><div><b>{current.kind==='tracked'?'Provider event captured':'Qualification execution'}</b><p>{current.kind==='tracked'?('Provider: '+(current.provider||'telephony')+(current.campaign?' · Campaign: '+current.campaign:'')+(current.keyword?' · Keyword: '+current.keyword:'')+(current.creative?' · Creative: '+current.creative:'')):(current.lastError?'Last error: '+current.lastError:'Execution state comes from the durable agent worker; no synthetic transcript is shown.')}</p></div></div>
 <div className="call-schedule-box"><label>Consultation time<input type="datetime-local" value={scheduleAt} onChange={event=>setScheduleAt(event.target.value)}/></label><button className="approve" disabled={!scheduleAt||busy==='schedule'} onClick={()=>void schedule()}><CalendarDays/>{busy==='schedule'?'Scheduling…':'Schedule consultation'}</button></div>
 <div className="approval-actions">{current.kind==='agent'&&<button disabled={busy==='retry:'+current.id} onClick={()=>void retry(current.id)}>{busy==='retry:'+current.id?'Queuing…':'Retry / follow up'}</button>}</div></div>:<div className="app-panel call-detail"><div className="empty-delivery-state"><PhoneCall/><div><b>Select a call</b><small>Live call detail will appear after an agent run or telephony event is recorded.</small></div></div></div>}</div>
 <button className="app-primary" onClick={()=>setBuilder(true)}><PhoneIncoming/>Start voice qualification</button>
 {builder&&<AccessibleDialog ariaLabel="Start voice qualification" onClose={()=>setBuilder(false)}><form className="connector-card qualification-builder" onSubmit={createQualification}><div className="connector-modal-head"><div><PhoneIncoming/><div><b>Start voice qualification</b><small>Create a persisted agent run and queue provider-backed execution.</small></div></div><button type="button" aria-label="Close voice qualification" onClick={()=>setBuilder(false)}><X/></button></div><label>Lead reference<input name="lead" required placeholder="lead_123 or customer name"/></label><label>Phone number<input name="phone" required placeholder="+91..."/></label><div className="two-col"><label>Source<input name="source" defaultValue="Website lead"/></label><label>Initial intent score<input name="intent" type="number" min="0" max="100" defaultValue="50"/></label></div><label>Trigger<select name="trigger"><option value="manual_qualification">Manual qualification</option><option value="lead_created">Lead created</option><option value="high_intent">High-intent lead</option><option value="follow_up">Follow-up retry</option></select></label><div className="source-conflict-note"><ShieldCheck/><div><b>Execution boundary</b><p>The run is persisted immediately. A configured voice qualification transport is required for the worker to complete the external call; otherwise retry/failure evidence remains visible in this workspace.</p></div></div><div className="audience-builder-actions"><button type="button" onClick={()=>setBuilder(false)}>Cancel</button><button className="app-primary" disabled={busy==='create'} type="submit">{busy==='create'?'Queuing…':'Queue qualification call'}</button></div></form></AccessibleDialog>}
 </>
}
