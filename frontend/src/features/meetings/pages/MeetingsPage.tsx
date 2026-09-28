import {useEffect,useState} from 'react'
import {Activity,CalendarDays,CheckCircle2,ChevronRight,MessageCircle,PhoneOutgoing,ShieldCheck,X} from 'lucide-react'
import {meetingsApi} from '../data/meetings.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {LoadingState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'

type Notice={kind:'ok'|'error'|'unknown'|'',text:string}
const unknownOutcome=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))

function PageHead({crumb,title,sub,action,onAction,disabled=false}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void,disabled?:boolean}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" disabled={disabled} onClick={onAction}>{action}</button>}</div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}

export default function MeetingsPage(){
 const [meetings,setMeetings]=useState<any[]>([])
 const [selected,setSelected]=useState('')
 const [busy,setBusy]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<Notice>({kind:'',text:''})
 const [newTime,setNewTime]=useState('')
 const [builder,setBuilder]=useState(false)
 const [voiceSchedulerOpen,setVoiceSchedulerOpen]=useState(false)
 const [schedulerRuns,setSchedulerRuns]=useState<any[]>([])

 useDirtyWork({key:'meeting-draft',label:'Meeting draft',dirty:builder,scope:'feature'})
 useDirtyWork({key:'voice-scheduler-draft',label:'Voice Scheduler draft',dirty:voiceSchedulerOpen,scope:'feature'})

 const load=async()=>{
  setLoading(true)
  try{
   const [response,scheduler]:any=await Promise.all([meetingsApi.load(),meetingsApi.scheduler()])
   const mapped=(response.items||[]).map((item:any)=>({id:item.id,lead:item.lead_ref,time:new Date(item.starts_at).toLocaleString(),startsAt:item.starts_at,owner:item.owner,status:String(item.status||'confirmed').replace(/^./,(m:string)=>m.toUpperCase()),reminder:(item.reminder_plan||[]).join(' + ')||'Voice',risk:String(item.no_show_risk||'low').replace(/^./,(m:string)=>m.toUpperCase()),remindersSent:Number(item.reminders_sent||0),lastReminderAt:item.last_reminder_at,calendarId:item.external_calendar_id||'',meetingLink:item.meeting_link||'',calendarHtmlLink:item.calendar_html_link||'',attendeeEmail:item.attendee_email||'',attendeePhone:item.attendee_phone||''}))
   setMeetings(mapped);setSchedulerRuns(scheduler.items||[])
   setSelected(current=>current&&mapped.some((item:any)=>item.id===current)?current:(mapped[0]?.id||''))
   setNotice(current=>current.kind==='error'?{kind:'',text:''}:current)
  }catch(error:any){setNotice({kind:'error',text:error?.message||'Meeting operations could not be refreshed. Existing meeting state was preserved.'})}
  finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[])
 const current=meetings.find(item=>item.id===selected)||meetings[0]

 const create=async(event:any)=>{
  event.preventDefault();const form=new FormData(event.currentTarget);setBusy('create');setNotice({kind:'',text:''})
  try{
   const startsAt=new Date(String(form.get('startsAt')||'')).toISOString()
   const result:any=await meetingsApi.create({leadRef:String(form.get('leadRef')||''),startsAt,owner:String(form.get('owner')||'Counsellor'),attendeeEmail:String(form.get('attendeeEmail')||''),attendeePhone:String(form.get('attendeePhone')||''),risk:String(form.get('risk')||'low'),syncCalendar:String(form.get('syncCalendar')||'yes')==='yes'})
   setBuilder(false);setNotice({kind:'ok',text:result?.calendar?.externalId?'Meeting scheduled and synced to Google Calendar after backend confirmation.':'Meeting scheduled and persisted after backend confirmation.'});await load();if(result?.id)setSelected(result.id)
  }catch(error:any){setNotice(unknownOutcome(error)?{kind:'unknown',text:'Meeting scheduling outcome is unknown. Refresh authoritative meeting state before scheduling the same consultation again.'}:{kind:'error',text:error?.message||'Meeting could not be scheduled.'})}
  finally{setBusy('')}
 }
 const createVoiceSchedule=async(event:any)=>{
  event.preventDefault();const form=new FormData(event.currentTarget);setBusy('voice_scheduler');setNotice({kind:'',text:''})
  try{
   const proposed=String(form.get('proposedStartsAt')||'')
   const result:any=await meetingsApi.createVoiceScheduler({leadRef:String(form.get('leadRef')||''),phone:String(form.get('phone')||''),attendeeEmail:String(form.get('attendeeEmail')||''),preferredWindow:String(form.get('preferredWindow')||''),proposedStartsAt:proposed?new Date(proposed).toISOString():null,durationMinutes:Number(form.get('durationMinutes')||45),owner:String(form.get('owner')||'Voice Scheduler'),syncCalendar:String(form.get('syncCalendar')||'yes')==='yes'})
   setVoiceSchedulerOpen(false);setNotice({kind:'ok',text:'Voice Scheduler accepted for '+String(form.get('leadRef')||'lead')+(result?.id?' · '+String(result.id).slice(0,18):'')+'. A meeting is persisted only after the provider confirms a time.'});await load()
  }catch(error:any){setNotice(unknownOutcome(error)?{kind:'unknown',text:'Voice Scheduler admission outcome is unknown. Refresh scheduler history before queuing the same call again.'}:{kind:'error',text:error?.message||'Voice Scheduler could not be queued.'})}
  finally{setBusy('')}
 }
 const remind=async(id:string)=>{
  setBusy('remind');setNotice({kind:'',text:''})
  try{await meetingsApi.remind(id);setNotice({kind:'ok',text:'Reminder accepted by the configured reminder workflow after backend confirmation.'});await load()}
  catch(error:any){setNotice(unknownOutcome(error)?{kind:'unknown',text:'Reminder outcome is unknown. Refresh meeting state before sending the same reminder again.'}:{kind:'error',text:error?.message||'Reminder could not be queued.'})}
  finally{setBusy('')}
 }
 const connectCalendar=async()=>{
  setBusy('calendar');setNotice({kind:'',text:''})
  try{const result:any=await meetingsApi.connectCalendar();if(result.status==='authorization_required'&&result.authorizationUrl){window.location.assign(result.authorizationUrl);return}if(result.status==='connected')setNotice({kind:'ok',text:'Google Calendar is connected.'});else setNotice({kind:'error',text:'Google Calendar OAuth credentials are deferred and not configured on the backend yet.'})}
  catch(error:any){setNotice({kind:'error',text:error?.message||'Google Calendar connection could not be started.'})}
  finally{setBusy('')}
 }
 const reschedule=async()=>{
  if(!current||!newTime)return
  setBusy('reschedule');setNotice({kind:'',text:''})
  try{await meetingsApi.reschedule(current.id,new Date(newTime).toISOString());setNotice({kind:'ok',text:'Meeting rescheduled after backend confirmation; connected calendar attendees were updated when available.'});setNewTime('');await load()}
  catch(error:any){setNotice(unknownOutcome(error)?{kind:'unknown',text:'Meeting reschedule outcome is unknown. Refresh authoritative meeting state before repeating the change.'}:{kind:'error',text:error?.message||'Meeting could not be rescheduled.'})}
  finally{setBusy('')}
 }

 const visibleMeetings=meetings.slice(0,200)
 const visibleSchedulerRuns=schedulerRuns.slice(0,50)
 const upcoming=meetings.filter(item=>Date.parse(item.startsAt)>=Date.now()).length
 const withCalendar=meetings.filter(item=>item.calendarId).length
 const reminders=meetings.reduce((total,item)=>total+Number(item.remindersSent||0),0)

 return <><PageHead crumb="Conversion / Meetings" title="Scheduler & meeting reminders" sub="Book qualified leads, synchronize Google Calendar in real time and reduce no-shows with provider-backed reminders." action={loading?'Refreshing…':'Refresh meetings'} onAction={()=>void load()} disabled={loading}/>
 {loading&&!meetings.length&&!schedulerRuns.length&&<LoadingState title="Loading meeting operations" description="Reading persisted consultations, scheduler runs, reminders and calendar state."/>}
 {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':notice.kind==='unknown'?'warning':'ok')} role={notice.kind==='error'?'alert':'status'}>{notice.kind==='ok'?<CheckCircle2/>:<ShieldCheck/>}<span>{notice.text}</span>{notice.kind==='unknown'&&<button onClick={()=>void load()}>Refresh authoritative state</button>}</div>}
 <div className="stats-grid"><Stat label="Upcoming meetings" value={String(upcoming)} sub="Persisted scheduled consultations" Icon={CalendarDays}/><Stat label="Voice scheduler runs" value={String(schedulerRuns.length)} sub="Provider-backed booking attempts" Icon={PhoneOutgoing}/><Stat label="Calendar synced" value={String(withCalendar)} sub="Meetings with external event IDs" Icon={CheckCircle2}/><Stat label="Reminders sent" value={String(reminders)} sub="Persisted reminder executions" Icon={MessageCircle}/></div>
 <div className="app-panel voice-scheduler-panel"><div className="panel-head"><div><h3>Voice Scheduler</h3><p>Call qualified leads to confirm a consultation slot. A meeting is created only when the provider returns a confirmed time.</p></div><button className="app-primary" onClick={()=>setVoiceSchedulerOpen(true)}><PhoneOutgoing/>Start voice scheduler</button></div>{visibleSchedulerRuns.length?<div className="voice-scheduler-runs">{visibleSchedulerRuns.map((item:any)=><div className="voice-scheduler-run" key={item.id}><PhoneOutgoing/><div><b>{item.lead}</b><small>{item.phone||'No phone'} · {item.preferredWindow||(item.proposedStartsAt?new Date(item.proposedStartsAt).toLocaleString():'No preferred window')}</small></div><span className={String(item.status||'queued').toLowerCase()}>{String(item.status||'queued').replaceAll('_',' ')}</span><em>{item.meetingId?'Meeting '+item.meetingId.slice(0,10):item.schedulerStatus||'Awaiting provider outcome'}</em></div>)}</div>:!loading&&<div className="empty-delivery-state"><PhoneOutgoing/><div><b>No Voice Scheduler runs yet</b><small>Queue a booking call for a qualified lead to create the first scheduler run.</small></div></div>}</div>
 <div className="meeting-layout"><div className="app-panel meeting-list"><div className="panel-head"><div><h3>Upcoming consultations</h3><p>Persisted calendar + reminder state{meetings.length>200?' · first 200 rendered':''}</p></div><div className="panel-actions"><button disabled={loading} onClick={()=>void load()}>{loading?'Refreshing…':'Refresh'}</button><button onClick={()=>void connectCalendar()} disabled={busy==='calendar'}>{busy==='calendar'?'Connecting…':'Connect Calendar'}</button><button onClick={()=>setBuilder(true)}>Schedule meeting</button></div></div>{visibleMeetings.length?visibleMeetings.map((item:any)=><button key={item.id} className={selected===item.id?'selected':''} onClick={()=>setSelected(item.id)}><CalendarDays/><div><b>{item.lead}</b><small>{item.time} · {item.owner}</small></div><span className={item.risk.toLowerCase()}>{item.risk} risk</span><ChevronRight/></button>):!loading&&<div className="empty-delivery-state"><CalendarDays/><div><b>No meetings scheduled yet</b><small>Schedule one from Calls or connect Google Calendar and create a consultation.</small></div></div>}</div>
 {current?<div className="app-panel meeting-detail"><div className="panel-head"><div><h3>{current.lead}</h3><p>{current.time}</p></div><span className="status">{current.status}</span></div><div className="meeting-info-grid">{[['Owner',current.owner],['Reminder plan',current.reminder],['No-show risk',current.risk],['Calendar',current.calendarId?'Google Calendar synced':'Not synced'],['Attendee',current.attendeeEmail||current.attendeePhone||'Not provided'],['Meeting link',current.meetingLink?'Available':'—'],['Reminders sent',String(current.remindersSent||0)],['Last reminder',current.lastReminderAt?new Date(current.lastReminderAt).toLocaleString():'—']].map(item=><div key={item[0]}><span>{item[0]}</span><b>{item[1]}</b></div>)}</div>
 <div className="meeting-reminder-flow">{[['T−24h','Primary reminder'],['T−3h','Follow-up reminder'],['T−30m','Final confirmation'],['T+15m','No-show recovery if needed']].map((item,index)=><div key={item[0]}><span>{index+1}</span><div><b>{item[0]}</b><small>{item[1]}</small></div></div>)}</div>
 <div className="call-schedule-box"><label>New meeting time<input type="datetime-local" value={newTime} onChange={event=>setNewTime(event.target.value)}/></label><button disabled={!newTime||busy==='reschedule'} onClick={()=>void reschedule()}>{busy==='reschedule'?'Updating…':'Reschedule'}</button></div>
 <div className="approval-actions"><button className="approve" disabled={busy==='remind'} onClick={()=>void remind(current.id)}><MessageCircle/>{busy==='remind'?'Queuing…':'Send reminder now'}</button></div></div>:<div className="app-panel meeting-detail"><div className="empty-delivery-state"><CalendarDays/><div><b>Select a meeting</b><small>Calendar and reminder operations appear here.</small></div></div></div>}</div>
 {voiceSchedulerOpen&&<AccessibleDialog ariaLabel="Start Voice Scheduler" onClose={()=>setVoiceSchedulerOpen(false)}><form className="connector-card voice-scheduler-builder" onSubmit={createVoiceSchedule}><div className="connector-modal-head"><div><PhoneOutgoing/><div><b>Start Voice Scheduler</b><small>Queue a provider-backed scheduling call. No meeting is created until a confirmed time is returned.</small></div></div><button type="button" aria-label="Close Voice Scheduler" onClick={()=>setVoiceSchedulerOpen(false)}><X/></button></div><label>Lead reference<input name="leadRef" required placeholder="lead_123 or customer email"/></label><label>Phone number<input name="phone" required placeholder="+91..."/></label><label>Attendee email<input name="attendeeEmail" type="email" placeholder="lead@example.com"/></label><label>Preferred window<input name="preferredWindow" placeholder="Tomorrow afternoon / weekday mornings"/></label><label>Proposed slot<input name="proposedStartsAt" type="datetime-local"/></label><div className="two-col"><label>Duration<select name="durationMinutes"><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select></label><label>Calendar sync<select name="syncCalendar"><option value="yes">Sync when confirmed</option><option value="no">Persist meeting only</option></select></label></div><label>Owner<input name="owner" defaultValue="Voice Scheduler"/></label><div className="source-conflict-note"><ShieldCheck/><div><b>No synthetic booking</b><p>The worker creates the meeting only when the configured voice provider returns a confirmed start time. Calendar failures do not fabricate a confirmation.</p></div></div><button disabled={busy==='voice_scheduler'}>{busy==='voice_scheduler'?'Queuing…':'Queue scheduling call'}</button></form></AccessibleDialog>}
 {builder&&<AccessibleDialog ariaLabel="Schedule meeting" onClose={()=>setBuilder(false)}><form className="connector-card" onSubmit={create}><div className="connector-modal-head"><div><CalendarDays/><div><b>Schedule meeting</b><small>Create a persisted consultation and optionally sync it to Google Calendar.</small></div></div><button type="button" aria-label="Close meeting scheduler" onClick={()=>setBuilder(false)}><X/></button></div><label>Lead reference<input name="leadRef" required placeholder="lead_123 or customer email"/></label><label>Start time<input name="startsAt" type="datetime-local" required/></label><label>Owner<input name="owner" defaultValue="Counsellor"/></label><div className="two-col"><label>Attendee email<input name="attendeeEmail" type="email" placeholder="lead@example.com"/></label><label>Attendee phone<input name="attendeePhone" placeholder="+91..."/></label></div><div className="two-col"><label>No-show risk<select name="risk"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Calendar sync<select name="syncCalendar"><option value="yes">Sync if connected</option><option value="no">Do not sync</option></select></label></div><button disabled={busy==='create'}>{busy==='create'?'Scheduling…':'Schedule meeting'}</button></form></AccessibleDialog>}
 </>
}
