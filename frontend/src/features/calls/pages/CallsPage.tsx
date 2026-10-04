import {useEffect,useRef,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,CalendarDays,CheckCircle2,ChevronRight,PhoneCall,PhoneIncoming,ShieldCheck,Target,X} from 'lucide-react'
import {callsApi} from '../data/calls.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {LoadingState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'

type Notice={kind:'ok'|'error'|'unknown'|'',text:string}

const downsamplePcm16=(input:Float32Array,inputRate:number,targetRate=16000)=>{
 if(inputRate<=0||targetRate<=0)return new Int16Array()
 const ratio=inputRate/targetRate
 const length=Math.max(1,Math.floor(input.length/ratio))
 const output=new Int16Array(length)
 for(let index=0;index<length;index++){
  const start=Math.floor(index*ratio)
  const end=Math.max(start+1,Math.min(input.length,Math.floor((index+1)*ratio)))
  let sum=0
  for(let cursor=start;cursor<end;cursor++)sum+=input[cursor]||0
  const sample=Math.max(-1,Math.min(1,sum/Math.max(1,end-start)))
  output[index]=sample<0?Math.round(sample*32768):Math.round(sample*32767)
 }
 return output
}
const pcmToBase64=(pcm:Int16Array)=>{
 const bytes=new Uint8Array(pcm.buffer,pcm.byteOffset,pcm.byteLength)
 let binary=''
 for(let index=0;index<bytes.length;index++)binary+=String.fromCharCode(bytes[index])
 return btoa(binary)
}
const base64ToPcm=(value:string)=>{
 const binary=atob(value)
 const buffer=new ArrayBuffer(binary.length)
 const bytes=new Uint8Array(buffer)
 for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index)
 return new Int16Array(buffer)
}
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
 const [liveStatus,setLiveStatus]=useState<'idle'|'connecting'|'active'|'ending'|'error'>('idle')
 const liveStatusRef=useRef<'idle'|'connecting'|'active'|'ending'|'error'>('idle')
 const [liveSessionId,setLiveSessionId]=useState('')
 const liveSessionIdRef=useRef('')
 const liveSocket=useRef<WebSocket|null>(null)
 const liveStream=useRef<MediaStream|null>(null)
 const liveContext=useRef<AudioContext|null>(null)
 const liveProcessor=useRef<ScriptProcessorNode|null>(null)
 const livePlaybackAt=useRef(0)
 const livePlaybackSources=useRef<AudioBufferSourceNode[]>([])
 const liveMicStarted=useRef(false)

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
 useDevelopmentLiveRefresh(()=>load())
 useEffect(()=>{liveStatusRef.current=liveStatus},[liveStatus])
 useEffect(()=>()=>{void stopLiveVoice(false)},[])

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
 const stopLocalLiveVoice=()=>{
  liveMicStarted.current=false
  livePlaybackSources.current.forEach(source=>{try{source.stop()}catch{}})
  livePlaybackSources.current=[]
  if(liveProcessor.current){
   try{liveProcessor.current.disconnect()}catch{}
   liveProcessor.current.onaudioprocess=null
   liveProcessor.current=null
  }
  liveStream.current?.getTracks().forEach(track=>track.stop())
  liveStream.current=null
  if(liveSocket.current){
   try{liveSocket.current.close(1000,'client ended session')}catch{}
   liveSocket.current=null
  }
  if(liveContext.current){
   void liveContext.current.close().catch(()=>{})
   liveContext.current=null
  }
  livePlaybackAt.current=0
 }
 const stopLiveVoice=async(updateUi=true)=>{
  const id=liveSessionIdRef.current
  if(updateUi){liveStatusRef.current='ending';setLiveStatus('ending')}
  stopLocalLiveVoice()
  if(id)await callsApi.terminateLiveVoice(id).catch(()=>null)
  liveSessionIdRef.current=''
  if(updateUi){setLiveSessionId('');liveStatusRef.current='idle';setLiveStatus('idle')}
 }
 const playLiveAudio=(data:string,mimeType:string)=>{
  const context=liveContext.current
  if(!context||!data)return
  const pcm=base64ToPcm(data)
  if(!pcm.length)return
  const rate=Number(/rate=(\d+)/i.exec(mimeType||'')?.[1]||24000)
  const audioBuffer=context.createBuffer(1,pcm.length,rate)
  const channel=audioBuffer.getChannelData(0)
  for(let index=0;index<pcm.length;index++)channel[index]=pcm[index]/32768
  const source=context.createBufferSource()
  source.buffer=audioBuffer
  source.connect(context.destination)
  const startAt=Math.max(context.currentTime+0.02,livePlaybackAt.current||0)
  livePlaybackAt.current=startAt+audioBuffer.duration
  livePlaybackSources.current.push(source)
  source.onended=()=>{livePlaybackSources.current=livePlaybackSources.current.filter(item=>item!==source)}
  source.start(startAt)
 }
 const startMicrophone=async()=>{
  if(liveMicStarted.current)return
  liveMicStarted.current=true
  const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false})
  if(!liveSessionIdRef.current||liveSocket.current?.readyState!==WebSocket.OPEN){
   stream.getTracks().forEach(track=>track.stop())
   liveMicStarted.current=false
   return
  }
  const context=new AudioContext()
  await context.resume()
  if(!liveSessionIdRef.current||liveSocket.current?.readyState!==WebSocket.OPEN){
   stream.getTracks().forEach(track=>track.stop())
   await context.close().catch(()=>{})
   liveMicStarted.current=false
   return
  }
  const source=context.createMediaStreamSource(stream)
  const processor=context.createScriptProcessor(4096,1,1)
  const silent=context.createGain()
  silent.gain.value=0
  source.connect(processor)
  processor.connect(silent)
  silent.connect(context.destination)
  liveStream.current=stream
  liveContext.current=context
  liveProcessor.current=processor
  processor.onaudioprocess=event=>{
   const socket=liveSocket.current
   if(!socket||socket.readyState!==WebSocket.OPEN)return
   const pcm=downsamplePcm16(event.inputBuffer.getChannelData(0),context.sampleRate,16000)
   if(!pcm.length)return
   socket.send(JSON.stringify({realtimeInput:{audio:{data:pcmToBase64(pcm),mimeType:'audio/pcm;rate=16000'}}}))
  }
 }
 const startLiveVoice=async()=>{
  if(liveStatus!=='idle'&&liveStatus!=='error')return
  liveStatusRef.current='connecting';setLiveStatus('connecting');setNotice({kind:'',text:''})
  try{
   const session:any=await callsApi.createLiveVoice()
   const sessionId=String(session?.item?.id||'')
   const token=String(session?.sessionToken||'')
   const path=String(session?.websocketPath||'')
   if(!sessionId||!token||!path)throw new Error('Live voice session admission did not return a complete relay configuration.')
   liveSessionIdRef.current=sessionId
   setLiveSessionId(sessionId)
   const scheme=window.location.protocol==='https:'?'wss:':'ws:'
   const socket=new WebSocket(scheme+'//'+window.location.host+path,['ace-live-v1',token])
   liveSocket.current=socket
   socket.onmessage=event=>{
    try{
     const message=JSON.parse(String(event.data||'{}'))
     if(message.error){setNotice({kind:'error',text:String(message.error)});return}
     if(message.setupComplete){
      liveStatusRef.current='active';setLiveStatus('active')
      void startMicrophone().catch(error=>{
       setNotice({kind:'error',text:error?.message||'Microphone access failed.'})
       void stopLiveVoice()
      })
     }
     if(message.serverContent?.interrupted){
      livePlaybackSources.current.forEach(source=>{try{source.stop()}catch{}})
      livePlaybackSources.current=[]
      livePlaybackAt.current=liveContext.current?.currentTime||0
     }
     const parts=message.serverContent?.modelTurn?.parts||[]
     for(const part of parts){
      const media=part.inlineData||part.inline_data
      if(media?.data&&String(media?.mimeType||media?.mime_type||'').toLowerCase().startsWith('audio/pcm')){
       playLiveAudio(String(media.data),String(media.mimeType||media.mime_type||'audio/pcm;rate=24000'))
      }
     }
    }catch{}
   }
   socket.onerror=()=>setNotice({kind:'error',text:'The live voice relay encountered a network error.'})
   socket.onclose=()=>{
    if(liveStatusRef.current==='ending'){
     stopLocalLiveVoice()
     liveStatusRef.current='idle'
     setLiveStatus('idle')
     return
    }
    void stopLiveVoice(false).finally(()=>{
     liveStatusRef.current='error'
     setLiveStatus('error')
    })
   }
  }catch(error:any){
   stopLocalLiveVoice()
   liveStatusRef.current='error';setLiveStatus('error')
   setNotice({kind:'error',text:error?.message||'Live AI voice is unavailable. Check model qualification, deployment and provider access in Models.'})
  }
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
 <div className="app-panel">
  <div className="panel-head"><div><h3>Live AI voice</h3><p>Bidirectional PCM voice through the tenant-governed Gemini Live route. No provider key is exposed to the browser.</p></div><span className={liveStatus==='active'?'healthy':'status'}>{liveStatus}</span></div>
  <div className="source-conflict-note"><ShieldCheck/><div><b>Governed session boundary</b><p>Live voice starts only after the exact model route is provider-verified, evaluated, approved and deployed. Sessions are bounded, reconnect-limited and never place autonomous outbound calls.</p></div></div>
  <div className="approval-actions">
   {liveStatus==='idle'||liveStatus==='error'
    ?<button className="approve" onClick={()=>void startLiveVoice()}><PhoneCall/>Start live AI voice</button>
    :<button onClick={()=>void stopLiveVoice()} disabled={liveStatus==='ending'}>{liveStatus==='ending'?'Ending…':'End live voice'}</button>}
   {liveSessionId&&<span>Session {liveSessionId.slice(0,18)}</span>}
  </div>
 </div>
 <button className="app-primary" onClick={()=>setBuilder(true)}><PhoneIncoming/>Start voice qualification</button>
 {builder&&<AccessibleDialog ariaLabel="Start voice qualification" onClose={()=>setBuilder(false)}><form className="connector-card qualification-builder" onSubmit={createQualification}><div className="connector-modal-head"><div><PhoneIncoming/><div><b>Start voice qualification</b><small>Create a persisted agent run and queue provider-backed execution.</small></div></div><button type="button" aria-label="Close voice qualification" onClick={()=>setBuilder(false)}><X/></button></div><label>Lead reference<input name="lead" required placeholder="lead_123 or customer name"/></label><label>Phone number<input name="phone" required placeholder="+91..."/></label><div className="two-col"><label>Source<input name="source" defaultValue="Website lead"/></label><label>Initial intent score<input name="intent" type="number" min="0" max="100" defaultValue="50"/></label></div><label>Trigger<select name="trigger"><option value="manual_qualification">Manual qualification</option><option value="lead_created">Lead created</option><option value="high_intent">High-intent lead</option><option value="follow_up">Follow-up retry</option></select></label><div className="source-conflict-note"><ShieldCheck/><div><b>Execution boundary</b><p>The run is persisted immediately. A configured voice qualification transport is required for the worker to complete the external call; otherwise retry/failure evidence remains visible in this workspace.</p></div></div><div className="audience-builder-actions"><button type="button" onClick={()=>setBuilder(false)}>Cancel</button><button className="app-primary" disabled={busy==='create'} type="submit">{busy==='create'?'Queuing…':'Queue qualification call'}</button></div></form></AccessibleDialog>}
 </>
}
