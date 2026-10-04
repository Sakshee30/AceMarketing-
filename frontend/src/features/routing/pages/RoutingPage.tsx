import {useEffect,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,ArrowRight,Check,CheckCircle2,ChevronRight,Network,Plus,ShieldCheck,UsersRound,X} from 'lucide-react'
import {routingApi} from '../data/routing.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {ErrorState,LoadingState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'

type Notice={kind:'ok'|'error'|'unknown'|'',text:string}

function PageHead({crumb,title,sub,action,onAction,disabled=false}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void,disabled?:boolean}){
  return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" disabled={disabled} onClick={onAction}>{action}</button>}</div>
}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){
  return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>
}
const unknownOutcome=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))

export default function RoutingPage(){
  const [data,setData]=useState<any>({rules:[],recent:[],stats:{},destinationLoad:[]})
  const [selected,setSelected]=useState('')
  const [busy,setBusy]=useState('')
  const [recentOpen,setRecentOpen]=useState(false)
  const [builder,setBuilder]=useState(false)
  const [loading,setLoading]=useState(true)
  const [loadError,setLoadError]=useState('')
  const [notice,setNotice]=useState<Notice>({kind:'',text:''})

  useDirtyWork({key:'routing-rule-draft',label:'Routing rule draft',dirty:builder,scope:'feature'})

  const load=async()=>{
    setLoading(true)
    setLoadError('')
    try{
      const response:any=await routingApi.load()
      setData(response)
      if(response.rules?.length){
        setSelected((current:string)=>current&&response.rules.some((item:any)=>item.id===current)?current:response.rules[0].id)
      }else{
        setSelected('')
      }
    }catch(error:any){
      setLoadError(error?.message||'Routing rules could not be refreshed. Existing routing state was preserved.')
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{void load()},[])
 useDevelopmentLiveRefresh(()=>load())

  const rules:any[]=data.rules||[]
  const recent:any[]=data.recent||[]
  const destinationLoad:any[]=data.destinationLoad||[]
  const current=rules.find((item:any)=>item.id===selected)||rules[0]

  const runTest=async()=>{
    if(!current||busy)return
    setBusy('test')
    setNotice({kind:'',text:''})
    try{
      const result:any=await routingApi.test(current.id)
      setNotice({kind:'ok',text:'Test routed to '+result.destination+' using '+result.rule+' after backend confirmation.'})
      await load()
    }catch(error:any){
      setNotice(unknownOutcome(error)
        ?{kind:'unknown',text:'The routing-test outcome is unknown. Refresh authoritative routing history before repeating the same test.'}
        :{kind:'error',text:error?.message||'Routing test failed.'})
    }finally{
      setBusy('')
    }
  }

  const create=async(event:any)=>{
    event.preventDefault()
    const form=new FormData(event.currentTarget)
    setBusy('create')
    setNotice({kind:'',text:''})
    try{
      const result:any=await routingApi.create({
        name:String(form.get('name')||''),
        when:String(form.get('when')||''),
        destination:String(form.get('destination')||''),
        slaSeconds:Number(form.get('slaSeconds')||600),
        priority:String(form.get('priority')||'Custom')
      })
      setBuilder(false)
      setNotice({kind:'ok',text:'Routing rule created after backend confirmation.'})
      await load()
      if(result?.item?.id)setSelected(result.item.id)
    }catch(error:any){
      setNotice(unknownOutcome(error)
        ?{kind:'unknown',text:'The routing-rule creation outcome is unknown. Refresh authoritative routing state before creating the same rule again.'}
        :{kind:'error',text:error?.message||'Routing rule could not be created.'})
    }finally{
      setBusy('')
    }
  }

  const toggle=async()=>{
    if(!current||current.builtIn||busy)return
    setBusy('toggle')
    setNotice({kind:'',text:''})
    try{
      await routingApi.toggle(current.id,current.status==='paused')
      setNotice({kind:'ok',text:current.status==='paused'?'Routing rule enabled after backend confirmation.':'Routing rule paused after backend confirmation.'})
      await load()
    }catch(error:any){
      setNotice(unknownOutcome(error)
        ?{kind:'unknown',text:'The routing-rule status outcome is unknown. Refresh authoritative routing state before repeating the change.'}
        :{kind:'error',text:error?.message||'Routing rule status could not be changed.'})
    }finally{
      setBusy('')
    }
  }

  const stats=data.stats||{}
  const maxLoad=Math.max(1,...destinationLoad.map((item:any)=>Number(item.count||0)))

  return <>
    <PageHead crumb="Conversion / Routing" title="Lead routing" sub="Route each lead to the right sales queue using persisted workspace rules and stitched customer context." action={loading?'Refreshing…':'Refresh routing'} disabled={loading} onAction={()=>void load()}/>

    {loading&&!rules.length&&<LoadingState title="Loading routing rules" description="Reading persisted routing rules, destination load and recent decisions."/>}
    {loadError&&<ErrorState title="Routing refresh failed" description={loadError} action={{label:'Retry routing',onClick:()=>void load()}}/>}
    {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':notice.kind==='unknown'?'warning':'ok')} role={notice.kind==='error'?'alert':'status'}>
      {notice.kind==='ok'?<CheckCircle2/>:<ShieldCheck/>}<span>{notice.text}</span>{notice.kind==='unknown'&&<button type="button" onClick={()=>void load()}>Refresh authoritative state</button>}
    </div>}

    <div className="stats-grid">
      <Stat label="Routed today" value={String(stats.routedToday||0)} sub="Persisted routing decisions" Icon={Network}/>
      <Stat label="Decision history" value={String(stats.totalDecisions||0)} sub="Recent persisted decisions" Icon={Activity}/>
      <Stat label="Destinations used" value={String(stats.destinations||0)} sub="Observed routing queues" Icon={CheckCircle2}/>
      <Stat label="Rules matched" value={String(stats.matchedRules||0)} sub="Observed rule names" Icon={UsersRound}/>
    </div>

    <div className="routing-layout">
      <div className="app-panel routing-list">
        <div className="panel-head"><div><h3>Routing rules</h3><p>Built-in templates plus persisted workspace rules</p></div><button onClick={()=>setBuilder(true)}><Plus/>Add rule</button></div>
        {rules.length?rules.map((item:any)=><button key={item.id} className={selected===item.id?'selected':''} onClick={()=>setSelected(item.id)}><Network/><div><b>{item.name}</b><small>{item.when}</small></div><span>{item.priority}</span><em className={item.status}>{item.status}</em><ChevronRight/></button>):!loading&&<div className="empty-delivery-state"><Network/><div><b>No routing rules available</b><small>Create a workspace rule to begin routing governed lead decisions.</small></div></div>}
      </div>

      <div className="app-panel routing-detail">
        {current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.when}</p></div><span className={current.status==='active'?'healthy':'status'}>{current.status}</span></div>
          <div className="routing-flow"><div><span>1</span><b>Lead arrives</b></div><ArrowRight/><div><span>2</span><b>Rule evaluated</b></div><ArrowRight/><div><span>3</span><b>{current.destination}</b></div><ArrowRight/><div><span>4</span><b>SLA {Math.round(Number(current.slaSeconds||0)/60)||'<1'} min</b></div></div>
          <div className="diagnostic-evidence">{[['Condition',current.when],['Destination',current.destination],['Target SLA',current.slaSeconds+'s'],['Rule type',current.builtIn?'Built-in template':'Workspace rule'],['Status',current.status]].map(item=><article key={item[0]}><span>{item[0]}</span><b>{String(item[1])}</b></article>)}</div>
          <div className="approval-actions"><button onClick={()=>setRecentOpen(true)}>View recent matches</button>{!current.builtIn&&<button disabled={busy==='toggle'} onClick={()=>void toggle()}>{busy==='toggle'?'Saving…':current.status==='paused'?'Enable rule':'Pause rule'}</button>}<button className="approve" disabled={busy==='test'||current.status==='paused'} onClick={()=>void runTest()}><Network/>{busy==='test'?'Testing…':'Test selected rule'}</button></div>
        </>:<div className="empty-delivery-state"><Network/><div><b>No routing rule selected</b></div></div>}
      </div>
    </div>

    <div className="two-col">
      <div className="app-panel"><div className="panel-head"><div><h3>Observed destination load</h3><p>Derived from persisted routing decisions</p></div></div>
        {destinationLoad.length?destinationLoad.map((item:any)=><div className="health-line" key={item.name}><span>{item.name}</span><div className="progress"><i style={{width:(Number(item.count||0)/maxLoad*100)+'%'}}/></div><b>{item.count}</b></div>):<div className="empty-delivery-state"><Network/><div><b>No routing load yet</b><small>Test or route a lead to populate destination activity.</small></div></div>}
      </div>
      <div className="app-panel"><div className="panel-head"><div><h3>Routing safeguards</h3><p>Built-in fallback behavior remains available</p></div></div>
        {[['No rule matched','Default routing'],['Low identity confidence','Manual review'],['WhatsApp source','WhatsApp nurture'],['Financing requested','Finance-trained counsellor'],['High intent','Senior counsellor pool']].map(item=><div className="setting-line" key={item[0]}><span>{item[0]}</span><b>{item[1]}</b><Check/></div>)}
      </div>
    </div>

    {builder&&<AccessibleDialog ariaLabel="New routing rule" onClose={()=>setBuilder(false)}><form className="connector-card" onSubmit={create}><div className="connector-modal-head"><div><Network/><div><b>New routing rule</b><small>Create a persisted workspace rule.</small></div></div><button type="button" aria-label="Close routing rule builder" onClick={()=>setBuilder(false)}><X/></button></div><label>Rule name<input name="name" required placeholder="Enterprise lead routing"/></label><label>Condition<input name="when" required placeholder="score >= 90 and source = google"/></label><label>Destination<input name="destination" required placeholder="Enterprise sales queue"/></label><div className="two-col"><label>SLA seconds<input name="slaSeconds" type="number" min="0" defaultValue="300"/></label><label>Priority<select name="priority"><option>Priority</option><option>Automated</option><option>Review</option><option>Custom</option></select></label></div><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create routing rule'}</button></form></AccessibleDialog>}

    {recentOpen&&<AccessibleDialog ariaLabel="Recent routing matches" onClose={()=>setRecentOpen(false)}><div className="connector-card"><div className="connector-modal-head"><div><Network/><div><b>Recent routing matches</b><small>Persisted routing decisions</small></div></div><button aria-label="Close recent routing matches" onClick={()=>setRecentOpen(false)}><X/></button></div>{recent.length?<div className="debug-event-list">{recent.slice(0,100).map((item:any)=><div className="developer-event-row" key={item.id}><code>{item.lead_ref||item.id}</code><span>{item.rule_name||'rule'} → {item.destination}</span><strong>{item.created_at?new Date(item.created_at).toLocaleString():'—'}</strong></div>)}</div>:<div className="empty-delivery-state"><Network/><div><b>No recent routing decisions</b></div></div>}</div></AccessibleDialog>}
  </>
}
