import {useEffect,useState} from 'react'
import {beginLoading,useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {CheckCircle2,ChevronRight,CircleDollarSign,RadioTower,ShieldCheck,Sparkles,X} from 'lucide-react'
import {matchbackApi} from '../data/matchback.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {LoadingState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}</div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}
type Notice={kind:'ok'|'error'|'unknown'|'',text:string}
const unknownMutation=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))

const emptyDraft={name:'',source:'',eventType:'',destination:'',identityMethod:''}

export default function MatchbackPage(){
 const [selected,setSelected]=useState('')
 const [data,setData]=useState<any>({live:null,rules:[],templates:[]})
 const [unmatched,setUnmatched]=useState<any[]>([])
 const [unmatchedOpen,setUnmatchedOpen]=useState(false)
 const [builder,setBuilder]=useState(false)
 const [busy,setBusy]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<Notice>({kind:'',text:''})
 const [draft,setDraft]=useState<any>({...emptyDraft})

 useDirtyWork({key:'matchback-rule-draft',label:'Matchback rule draft',dirty:builder,scope:'feature'})

 const load=async()=>{
  beginLoading(setLoading)
  try{
   const r:any=await matchbackApi.load()
   setData(r)
   const rules=r.rules||[]
   setSelected((x:string)=>x&&rules.some((i:any)=>i.id===x)?x:(rules[0]?.id||''))
   setNotice(n=>n.kind==='error'?{kind:'',text:''}:n)
  }catch(e:any){
   setNotice({kind:'error',text:e?.message||'Matchback data could not be loaded. Existing reconciliation evidence was preserved.'})
  }finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[])
 useDevelopmentLiveRefresh(()=>load())

 const live=data.live||{}
 const current=(data.rules||[]).find((x:any)=>x.id===selected)||data.rules?.[0]

 const run=async()=>{
  if(!current)return
  setBusy('run');setNotice({kind:'',text:''})
  try{
   const r:any=await matchbackApi.reconcile(current.id)
   setNotice({kind:'ok',text:'Reconciliation completed after backend confirmation: '+Number(r?.matched||0)+' matched, '+Number(r?.unmatched||0)+' unmatched.'})
   await load()
  }catch(e:any){
   setNotice(unknownMutation(e)?{kind:'unknown',text:'The reconciliation outcome is unknown. Refresh authoritative matchback state before running it again.'}:{kind:'error',text:e?.message||'Reconciliation failed.'})
  }finally{setBusy('')}
 }

 const toggle=async()=>{
  if(!current)return
  setBusy('toggle');setNotice({kind:'',text:''})
  try{
   await matchbackApi.toggleRule(current.id,current.status==='paused')
   setNotice({kind:'ok',text:current.status==='paused'?'Matchback rule enabled after backend confirmation.':'Matchback rule paused after backend confirmation.'})
   await load()
  }catch(e:any){
   setNotice(unknownMutation(e)?{kind:'unknown',text:'The rule-status outcome is unknown. Refresh authoritative matchback state before repeating the change.'}:{kind:'error',text:e?.message||'Rule status could not be changed.'})
  }finally{setBusy('')}
 }

 const create=async(e:any)=>{
  e.preventDefault()
  setBusy('create');setNotice({kind:'',text:''})
  try{
   const r:any=await matchbackApi.createRule({...draft})
   setBuilder(false)
   setNotice({kind:'ok',text:'Matchback rule created after backend confirmation.'})
   await load()
   if(r?.item?.id)setSelected(r.item.id)
  }catch(err:any){
   setNotice(unknownMutation(err)?{kind:'unknown',text:'The matchback-rule creation outcome is unknown. Refresh authoritative state before creating the same rule again.'}:{kind:'error',text:err?.message||'Matchback rule could not be created.'})
  }finally{setBusy('')}
 }

 const reviewUnmatched=async()=>{
  setBusy('unmatched');setNotice({kind:'',text:''})
  try{
   const r:any=await matchbackApi.unmatched()
   setUnmatched((r.items||[]).slice(0,100))
   setUnmatchedOpen(true)
  }catch(e:any){
   setNotice({kind:'error',text:e?.message||'Unmatched attribution review could not be loaded.'})
  }finally{setBusy('')}
 }

 const applyTemplate=(x:any)=>{
  setDraft({name:x.name||'',source:x.source||'',eventType:x.eventType||'',destination:x.destination||'',identityMethod:x.identityMethod||''})
  setBuilder(true)
 }

 return <>
  <PageHead crumb="Measurement / Matchback" title="Closure matchback & revenue reconciliation" sub="Tie verified downstream outcomes back to acquisition evidence without inventing rule-level revenue or match rates." action="New matchback rule" onAction={()=>{setDraft({...emptyDraft});setBuilder(true)}}/>

  {loading&&!(data.rules||[]).length&&<LoadingState title="Loading matchback" description="Reading persisted rules, attribution outcomes and identity coverage."/>}
  {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':notice.kind==='unknown'?'warning':'ok')} role={notice.kind==='error'?'alert':'status'}>{notice.kind==='ok'?<CheckCircle2/>:<ShieldCheck/>}<span>{notice.text}</span>{notice.kind!=='ok'&&<button onClick={load}>Refresh authoritative state</button>}</div>}

  <div className="stats-grid">
   <Stat label="Matched value" value={live?.available?'₹'+Number(live.matchedValue||0).toLocaleString('en-IN'):'—'} sub="Workspace matched assisted-event value" Icon={CircleDollarSign}/>
   <Stat label="Matched outcomes" value={live?.available?String(live.matchedEvents||0):'—'} sub="Persisted deterministic matches" Icon={CheckCircle2}/>
   <Stat label="Match rate" value={live?.available?String(live.matchRate||0)+'%':'—'} sub="Workspace attribution store" Icon={ShieldCheck}/>
   <Stat label="Unmatched" value={live?.available?String(live.unmatchedEvents||0):'—'} sub="Held for reconciliation" Icon={RadioTower}/>
  </div>

  <div className="matchback-layout">
   <div className="app-panel matchback-list" aria-busy={loading?'true':undefined}>
    <div className="panel-head"><div><h3>Matchback rules</h3><p>Persisted revenue/event source → acquisition destination rules</p></div><span className="healthy">{(data.rules||[]).length} configured</span></div>
    {(data.rules||[]).length?(data.rules||[]).map((x:any)=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><CircleDollarSign/><div><b>{x.name}</b><small>{x.source} · {x.eventType} → {x.destination}</small></div><span className={x.status==='active'?'healthy':'status'}>{x.status}</span><ChevronRight/></button>):!loading&&<div className="empty-delivery-state"><CircleDollarSign/><div><b>No matchback rules yet</b><small>Create a rule or start from a suggested template. No fictional revenue outcomes are seeded.</small></div></div>}
   </div>

   <div className="app-panel matchback-detail">
    {current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.source} → {current.destination}</p></div><span className={current.status==='active'?'healthy':'status'}>{current.status}</span></div><div className="site-detail-grid">{[['Event type',current.eventType],['Identity method',current.identityMethod],['Last run',current.lastRunAt?new Date(current.lastRunAt).toLocaleString():'Never'],['Last status',current.lastRunStatus||'—'],['Last matched',String(current.lastRunMatched??'—')],['Last unmatched',String(current.lastRunUnmatched??'—')]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><div className="root-cause-box"><Sparkles/><div><b>Single revenue truth</b><p>Rule configuration determines which verified outcome should be reconciled; summary metrics remain sourced from persisted attribution evidence rather than per-rule estimates.</p></div></div><div className="approval-actions"><button disabled={busy==='unmatched'} onClick={reviewUnmatched}>{busy==='unmatched'?'Loading…':'View unmatched records'}</button><button disabled={busy==='toggle'} onClick={toggle}>{busy==='toggle'?'Saving…':current.status==='paused'?'Enable rule':'Pause rule'}</button><button className="approve" disabled={busy==='run'||current.status==='paused'} onClick={run}>{busy==='run'?'Reconciling…':<><CircleDollarSign/>Run reconciliation</>}</button></div></>:<div className="empty-delivery-state"><CircleDollarSign/><div><b>Select or create a matchback rule</b></div></div>}
   </div>
  </div>

  {(data.templates||[]).length>0&&<div className="app-panel"><div className="panel-head"><div><h3>Suggested rule templates</h3><p>Configuration examples only — no revenue or performance claims are attached.</p></div></div><div className="template-grid">{(data.templates||[]).map((x:any)=><button key={x.name} onClick={()=>applyTemplate(x)}><CircleDollarSign/><div><b>{x.name}</b><small>{x.source} · {x.eventType}</small></div><span>{x.destination}</span></button>)}</div></div>}

  {live?.available&&<div className="app-panel"><div className="panel-head"><div><h3>Live identity coverage</h3><p>Persisted first-party acquisition evidence</p></div><span className="healthy">{live.activeClickSessions||0} active sessions</span></div><div className="site-detail-grid">{[['GCLID sessions',live.clickIdCoverage?.gclid||0],['FBCLID sessions',live.clickIdCoverage?.fbclid||0],['GBRAID / WBRAID',live.clickIdCoverage?.braid||0],['TikTok TTCLID',live.clickIdCoverage?.tiktok||0],['X TWCLID',live.clickIdCoverage?.x||0],['Assisted events',live.assistedEvents||0],['Matched events',live.matchedEvents||0],['Unmatched events',live.unmatchedEvents||0]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div></div>}

  {builder&&<AccessibleDialog ariaLabel="New matchback rule" onClose={()=>setBuilder(false)}><form className="connector-card matchback-builder" onSubmit={create}><div className="connector-modal-head"><div><CircleDollarSign/><div><b>New matchback rule</b><small>Define how a verified downstream outcome should be reconciled.</small></div></div><button type="button" aria-label="Close matchback rule" onClick={()=>setBuilder(false)}><X/></button></div><label>Rule name<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} required placeholder="Closed-won revenue"/></label><label>Source<input value={draft.source} onChange={e=>setDraft({...draft,source:e.target.value})} required placeholder="crm_billing"/></label><label>Event type<input value={draft.eventType} onChange={e=>setDraft({...draft,eventType:e.target.value})} required placeholder="closed_won"/></label><label>Destination<input value={draft.destination} onChange={e=>setDraft({...draft,destination:e.target.value})} required placeholder="Google Ads"/></label><label>Identity method<input value={draft.identityMethod} onChange={e=>setDraft({...draft,identityMethod:e.target.value})} required placeholder="customer_id + click ID"/></label><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create matchback rule'}</button></form></AccessibleDialog>}

  {unmatchedOpen&&<AccessibleDialog ariaLabel="Unmatched attribution review" onClose={()=>setUnmatchedOpen(false)}><div className="connector-card"><div className="connector-modal-head"><div><RadioTower/><div><b>Unmatched attribution review</b><small>Recent persisted events that could not be reconciled</small></div></div><button aria-label="Close unmatched attribution review" onClick={()=>setUnmatchedOpen(false)}><X/></button></div>{unmatched.length?<div className="debug-event-list">{unmatched.map((x:any)=><div className="developer-event-row" key={x.id}><code>{x.id}</code><span>{x.event_type} · {x.source||'unknown source'}</span><strong>{x.occurred_at?new Date(x.occurred_at).toLocaleString():'—'}</strong></div>)}</div>:<div className="empty-delivery-state"><CheckCircle2/><div><b>No recent unmatched events</b><small>The attribution store currently has no unmatched records in its recent window.</small></div></div>}</div></AccessibleDialog>}
 </>
}
