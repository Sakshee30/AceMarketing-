import {useEffect,useMemo,useState} from 'react'
import {beginLoading,useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,ArrowRight,CheckCircle2,ChevronRight,MessageSquareText,Network,PhoneOutgoing,Plus,ShieldCheck,Target,X} from 'lucide-react'
import {feedbackApi} from '../data/feedback.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {ErrorState,LoadingState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'

type Notice={kind:'ok'|'error'|'unknown'|'',text:string}
const unknownOutcome=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))

function PageHead({crumb,title,sub,action,onAction,disabled=false}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void,disabled?:boolean}){
  return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" disabled={disabled} onClick={onAction}>{action}</button>}</div>
}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){
  return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>
}

export default function FeedbackPage(){
  const [filter,setFilter]=useState('All')
  const [data,setData]=useState<any>({items:[],stats:{},themes:[]})
  const [journeyOpen,setJourneyOpen]=useState(false)
  const [journeyRecord,setJourneyRecord]=useState<any>(null)
  const [builder,setBuilder]=useState(false)
  const [requestOpen,setRequestOpen]=useState(false)
  const [busy,setBusy]=useState('')
  const [loading,setLoading]=useState(true)
  const [loadError,setLoadError]=useState('')
  const [notice,setNotice]=useState<Notice>({kind:'',text:''})
  const [routed,setRouted]=useState<any>(null)

  useDirtyWork({key:'feedback-record-draft',label:'Feedback response draft',dirty:builder,scope:'feature'})
  useDirtyWork({key:'feedback-request-draft',label:'Feedback request draft',dirty:requestOpen,scope:'feature'})

  const load=async()=>{
    beginLoading(setLoading)
    setLoadError('')
    try{
      const response:any=await feedbackApi.load()
      setData(response)
    }catch(error:any){
      setLoadError(error?.message||'Feedback data could not be refreshed. Existing feedback state was preserved.')
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{void load()},[])
 useDevelopmentLiveRefresh(()=>load())

  const items=useMemo(()=>((data.items||[]) as any[]).map(item=>({
    id:item.id,
    lead:item.lead_ref,
    score:Number(item.score||0),
    channel:item.channel,
    theme:item.theme||'Uncategorized',
    quote:item.response||'',
    createdAt:item.created_at
  })),[data.items])

  const themes=['All',...((data.themes||[]) as any[]).map(item=>String(item.theme))]
  const shown=(filter==='All'?items:items.filter(item=>item.theme===filter)).slice(0,100)
  const stats=data.stats||{}

  const openJourney=async(lead:string)=>{
    setNotice({kind:'',text:''})
    try{
      const response:any=await feedbackApi.journeys()
      const hit=(response.items||[]).find((item:any)=>String(item.lead||'').toLowerCase()===String(lead||'').toLowerCase())||null
      setJourneyRecord(hit)
      setJourneyOpen(true)
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'Journey context could not be loaded for this feedback record.'})
    }
  }

  const record=async(event:any)=>{
    event.preventDefault()
    const form=new FormData(event.currentTarget)
    setBusy('record')
    setNotice({kind:'',text:''})
    try{
      await feedbackApi.record({
        lead:String(form.get('lead')||''),
        score:Number(form.get('score')||0),
        channel:String(form.get('channel')||'Post-call'),
        theme:String(form.get('theme')||''),
        response:String(form.get('response')||'')
      })
      setBuilder(false)
      setNotice({kind:'ok',text:'Feedback saved after backend confirmation.'})
      await load()
    }catch(error:any){
      setNotice(unknownOutcome(error)
        ?{kind:'unknown',text:'The feedback-save outcome is unknown. Refresh authoritative feedback state before submitting the same response again.'}
        :{kind:'error',text:error?.message||'Feedback could not be saved.'})
    }finally{
      setBusy('')
    }
  }

  const requestFeedback=async(event:any)=>{
    event.preventDefault()
    const form=new FormData(event.currentTarget)
    setBusy('request')
    setNotice({kind:'',text:''})
    try{
      const result:any=await feedbackApi.request({
        lead:String(form.get('lead')||''),
        leadRef:String(form.get('lead')||''),
        phone:String(form.get('phone')||''),
        email:String(form.get('email')||''),
        channel:String(form.get('channel')||'voice'),
        prompt:String(form.get('prompt')||'Please share feedback about your recent interaction.')
      })
      setRequestOpen(false)
      setNotice({kind:'ok',text:'Feedback request accepted by the agent worker'+(result?.runId?' · '+String(result.runId).slice(0,18):'')+'.'})
    }catch(error:any){
      setNotice(unknownOutcome(error)
        ?{kind:'unknown',text:'The feedback-request outcome is unknown. Refresh agent/run state before submitting the same outreach again.'}
        :{kind:'error',text:error?.message||'Feedback request could not be queued.'})
    }finally{
      setBusy('')
    }
  }

  const route=async(id:string)=>{
    if(busy)return
    setBusy('route:'+id)
    setNotice({kind:'',text:''})
    try{
      const result:any=await feedbackApi.route(id)
      setRouted(result)
      setNotice({kind:'ok',text:'Feedback routed into a persisted follow-up task after backend confirmation.'})
    }catch(error:any){
      setNotice(unknownOutcome(error)
        ?{kind:'unknown',text:'The feedback-routing outcome is unknown. Refresh Follow-ups before routing the same insight again.'}
        :{kind:'error',text:error?.message||'Feedback could not be routed.'})
    }finally{
      setBusy('')
    }
  }

  const openFollowUp=()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Follow-ups'}))

  return <>
    <PageHead crumb="Conversion / Feedback" title="Feedback agent" sub="Collect post-interaction feedback, detect objections and route insights into real recovery, sales and marketing workflows." action={loading?'Refreshing…':'Refresh feedback'} onAction={()=>void load()} disabled={loading}/>

    {loading&&!items.length&&<LoadingState title="Loading feedback" description="Reading persisted responses, themes and routing evidence."/>}
    {loadError&&<ErrorState title="Feedback refresh failed" description={loadError} action={{label:'Retry feedback',onClick:()=>void load()}}/>}
    {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':notice.kind==='unknown'?'warning':'ok')} role={notice.kind==='error'?'alert':'status'}>
      {notice.kind==='ok'?<CheckCircle2/>:<ShieldCheck/>}<span>{notice.text}</span>{notice.kind==='unknown'&&<button type="button" onClick={()=>void load()}>Refresh authoritative state</button>}
    </div>}

    <div className="stats-grid">
      <Stat label="Responses" value={String(stats.responses||0)} sub="Persisted feedback records" Icon={MessageSquareText}/>
      <Stat label="Average satisfaction" value={stats.responses?Number(stats.average||0).toFixed(1)+'/5':'—'} sub="Scored responses only" Icon={Activity}/>
      <Stat label="Low satisfaction" value={String(stats.lowSatisfaction||0)} sub="Scores 1–2" Icon={CheckCircle2}/>
      <Stat label="Themes observed" value={String(stats.themes||0)} sub="Persisted theme groups" Icon={Target}/>
    </div>

    <div className="feedback-command-bar">
      <div><button className="app-primary" onClick={()=>setRequestOpen(true)}><PhoneOutgoing/>Request feedback</button><button onClick={()=>setBuilder(true)}><Plus/>Record response</button></div>
      <span>Request → collect → understand → route → follow up</span>
    </div>

    {routed&&<div className="feedback-route-result"><CheckCircle2/><div><b>{routed.task?.reason||'Feedback follow-up created'}</b><p>{routed.task?.owner||'Owner'} · {routed.task?.priority||'priority'} · {routed.task?.channel||'channel'}</p></div><button onClick={openFollowUp}>Open Follow-ups <ArrowRight/></button></div>}

    <div className="feedback-toolbar" aria-label="Feedback theme filter">
      {themes.slice(0,50).map(item=><button key={item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item}</button>)}
    </div>

    <div className="feedback-grid">
      {shown.length?shown.map((item:any)=><article key={item.id||item.lead+item.theme}>
        <div className="feedback-head"><div><span className="lead-avatar">{String(item.lead||'?').split(' ').map((part:string)=>part[0]).join('').slice(0,2)}</span><div><b>{item.lead}</b><small>{item.channel}{item.createdAt?' · '+new Date(item.createdAt).toLocaleString():''}</small></div></div><strong>{'★'.repeat(Math.max(0,Math.min(5,item.score)))}{'☆'.repeat(Math.max(0,5-Math.max(0,Math.min(5,item.score))))}</strong></div>
        <p>{item.quote?'“'+item.quote+'”':'No written response'}</p>
        <footer><span>{item.theme}</span><div><button onClick={()=>void openJourney(item.lead)}>Open journey <ChevronRight/></button><button disabled={busy==='route:'+item.id} onClick={()=>void route(item.id)}>{busy==='route:'+item.id?'Routing…':'Route insight'} <ArrowRight/></button></div></footer>
      </article>):!loading&&<div className="empty-delivery-state"><MessageSquareText/><div><b>No feedback yet</b><small>Record a response or request feedback through the configured feedback agent.</small></div></div>}
    </div>

    <div className="two-col">
      <div className="app-panel"><div className="panel-head"><div><h3>Top themes</h3><p>Grouped from persisted feedback</p></div></div>{(data.themes||[]).length?(data.themes||[]).slice(0,50).map((item:any)=><div className="health-line" key={item.theme}><span>{item.theme}</span><div className="progress"><i style={{width:(stats.responses?Math.min(100,Number(item.count||0)/Number(stats.responses)*100):0)+'%'}}/></div><b>{item.count}</b></div>):<div className="empty-delivery-state"><MessageSquareText/><div><b>No themes yet</b></div></div>}</div>
      <div className="app-panel"><div className="panel-head"><div><h3>Feedback routing policy</h3><p>Rules executed by Route insight</p></div></div>{[['Score 1–2','Customer recovery · call · high priority'],['Pricing / fee objection','Sales manager · call · high priority'],['Program / product mismatch','Sales operations · disposition review'],['Score 4–5','Marketing · promoter/testimonial review']].map(item=><div className="mapping-rule" key={item[0]}><span>{item[0]}</span><ArrowRight/><b>{item[1]}</b></div>)}</div>
    </div>

    {builder&&<AccessibleDialog ariaLabel="Record feedback" onClose={()=>setBuilder(false)}><form className="connector-card" onSubmit={record}><div className="connector-modal-head"><div><MessageSquareText/><div><b>Record feedback</b><small>Persist a real response.</small></div></div><button type="button" aria-label="Close feedback response form" onClick={()=>setBuilder(false)}><X/></button></div><label>Lead<input name="lead" required placeholder="customer_123"/></label><label>Score<input name="score" type="number" min="1" max="5" required defaultValue="5"/></label><label>Channel<select name="channel"><option>Post-call</option><option>Post-meeting</option><option>WhatsApp</option><option>Email</option></select></label><label>Theme<input name="theme" required placeholder="Pricing objection"/></label><label>Response<textarea name="response" rows={4} placeholder="Customer feedback"/></label><button disabled={busy==='record'}>{busy==='record'?'Saving…':'Save feedback'}</button></form></AccessibleDialog>}

    {requestOpen&&<AccessibleDialog ariaLabel="Request feedback" onClose={()=>setRequestOpen(false)}><form className="connector-card" onSubmit={requestFeedback}><div className="connector-modal-head"><div><PhoneOutgoing/><div><b>Request feedback</b><small>Queue provider-backed outreach through the agent worker.</small></div></div><button type="button" aria-label="Close feedback request form" onClick={()=>setRequestOpen(false)}><X/></button></div><label>Lead reference<input name="lead" required placeholder="lead_123"/></label><div className="two-col"><label>Phone<input name="phone" placeholder="+91..."/></label><label>Email<input name="email" type="email" placeholder="lead@example.com"/></label></div><label>Channel<select name="channel"><option value="voice">Voice</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></label><label>Prompt<textarea name="prompt" rows={3} defaultValue="Please share feedback about your recent interaction."/></label><div className="source-conflict-note"><ShieldCheck/><div><b>Provider-backed execution</b><p>The request is queued as an agent action. Delivery only succeeds when the configured feedback transport/provider is available.</p></div></div><button disabled={busy==='request'}>{busy==='request'?'Queuing…':'Queue feedback request'}</button></form></AccessibleDialog>}

    {journeyOpen&&<AccessibleDialog ariaLabel="Feedback journey context" onClose={()=>setJourneyOpen(false)}><div className="connector-card"><div className="connector-modal-head"><div><Network/><div><b>Journey context</b><small>{journeyRecord?.lead||'Feedback respondent'}</small></div></div><button aria-label="Close feedback journey context" onClick={()=>setJourneyOpen(false)}><X/></button></div>{journeyRecord?<div className="site-detail-grid">{[['Lead',journeyRecord.lead],['Source',journeyRecord.source],['Stage',journeyRecord.stage],['Touchpoints',journeyRecord.touchpoints],['Duration',journeyRecord.duration]].map(item=><div key={item[0]}><span>{item[0]}</span><b>{String(item[1]??'—')}</b></div>)}</div>:<div className="empty-delivery-state"><Network/><div><b>No persisted journey found</b><small>The feedback record exists, but the journey endpoint has no matching lead row.</small></div></div>}</div></AccessibleDialog>}
  </>
}
