import {useEffect,useMemo,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,ArrowRight,CheckCircle2,ChevronRight,Plus,RadioTower,ShieldCheck,Sparkles,X,Zap} from 'lucide-react'
import {eventsApi} from '../data/events.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {ErrorState,LoadingState,StaleState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}</div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}
type Notice={kind:'ok'|'error'|'unknown'|'',text:string}
const unknownMutation=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))

const emptyDraft={name:'High-value Purchase',sourceEvent:'purchase',outputEvent:'high_value_purchase',field:'value',operator:'gte',value:'4000',destinations:['Google Ads','Meta Ads'],valueMode:'copy',fixedValue:'',currency:'INR'}

export default function EventsPage(){
 const [data,setData]=useState<any>({items:[],runs:[],stats:{},templates:[]})
 const [active,setActive]=useState('')
 const [builder,setBuilder]=useState(false)
 const [busy,setBusy]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<Notice>({kind:'',text:''})
 const [templateFilter,setTemplateFilter]=useState('All')
 const [draft,setDraft]=useState<any>({...emptyDraft})
 useDirtyWork({key:'events-rule-draft',label:'Conversion event rule',dirty:builder,scope:'feature'})

 const load=async()=>{
  setLoading(true)
  try{
   const r:any=await eventsApi.load()
   setData(r)
   setActive((current:string)=>current&&r.items?.some((x:any)=>x.id===current)?current:(r.items?.[0]?.id||''))
   setNotice(n=>n.kind==='error'?{kind:'',text:''}:n)
  }catch(e:any){
   setNotice({kind:'error',text:e?.message||'Event rules could not be loaded. Existing event evidence was preserved.'})
  }finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[])
 useDevelopmentLiveRefresh(()=>load())

 const current=(data.items||[]).find((x:any)=>x.id===active)||data.items?.[0]
 const categories=['All',...Array.from(new Set((data.templates||[]).map((x:any)=>x.category||'Other')))] as string[]
 const visibleTemplates=(data.templates||[]).filter((x:any)=>templateFilter==='All'||(x.category||'Other')===templateFilter)
 const stats=data.stats||{}

 const openBuilder=(template?:any)=>{
  setDraft(template?{
   name:template.name||'Business event',
   sourceEvent:template.sourceEvent||'',
   outputEvent:template.outputEvent||'',
   field:template.condition?.field||'',
   operator:template.condition?.operator||'equals',
   value:String(template.condition?.value??''),
   destinations:Array.isArray(template.destinations)?template.destinations:[],
   valueMode:template.valueMode||'copy',
   fixedValue:template.fixedValue==null?'':String(template.fixedValue),
   currency:template.currency||'INR'
  }:{...emptyDraft})
  setBuilder(true)
 }

 const create=async(e:any)=>{
  e.preventDefault();setBusy('create');setNotice({kind:'',text:''})
  try{
   const result:any=await eventsApi.createRule({
    name:draft.name,
    sourceEvent:draft.sourceEvent,
    outputEvent:draft.outputEvent,
    conditions:draft.field?[{field:draft.field,operator:draft.operator||'equals',value:draft.value}]:[],
    destinations:draft.destinations||[],
    valueMode:draft.valueMode||'copy',
    fixedValue:draft.valueMode==='fixed'&&draft.fixedValue!==''?Number(draft.fixedValue):undefined,
    currency:draft.currency||'INR'
   })
   setBuilder(false)
   setNotice({kind:'ok',text:'Event rule created and enabled after backend confirmation.'})
   await load()
   if(result?.item?.id)setActive(result.item.id)
  }catch(err:any){
   setNotice(unknownMutation(err)?{kind:'unknown',text:'The event-rule creation outcome is unknown. Refresh authoritative state before creating the same rule again.'}:{kind:'error',text:err?.message||'Event rule could not be created.'})
  }finally{setBusy('')}
 }

 const toggle=async(item:any)=>{
  setBusy(item.id);setNotice({kind:'',text:''})
  try{
   await eventsApi.toggleRule(item.id,!item.enabled)
   setNotice({kind:'ok',text:(item.enabled?'Paused ':'Enabled ')+item.name+' after backend confirmation.'})
   await load()
  }catch(err:any){
   setNotice(unknownMutation(err)?{kind:'unknown',text:'The rule status outcome is unknown. Refresh authoritative state before repeating the change.'}:{kind:'error',text:err?.message||'Rule status could not be changed.'})
  }finally{setBusy('')}
 }

 const toggleDestination=(name:string)=>setDraft((x:any)=>({...x,destinations:(x.destinations||[]).includes(name)?(x.destinations||[]).filter((d:string)=>d!==name):[...(x.destinations||[]),name]}))
 const preview=useMemo(()=>({source:draft.sourceEvent||'source_event',field:draft.field||'field',operator:draft.operator,value:String(draft.value||'value'),output:draft.outputEvent||'derived_event'}),[draft])

 return <>
  <PageHead crumb="Activation / Events" title="Conversion event manager" sub="Define business logic that transforms raw behavior and CRM outcomes into measurable, activatable events." action="New event" onAction={()=>openBuilder()}/>
  {loading&&!data.items?.length&&!data.templates?.length&&<LoadingState title="Loading conversion events" description="Reading rules, templates and recent rule-run evidence."/>}
  {notice.text&&notice.kind==='error'&&<ErrorState title="Event manager action failed" description={notice.text} action={{label:'Refresh events',onClick:load}}/>}
  {notice.text&&notice.kind==='unknown'&&<StaleState title="Event manager action needs reconciliation" description={notice.text} action={{label:'Refresh authoritative state',onClick:load}}/>}
  {notice.text&&notice.kind==='ok'&&<div className="delivery-notice ok" role="status"><CheckCircle2/><span>{notice.text}</span></div>}

  <div className="stats-grid"><Stat label="Rules" value={String(stats.rules||0)} sub={(stats.enabled||0)+' enabled'} Icon={Zap}/><Stat label="Matches · 24h" value={String(stats.runs24h||0)} sub="Derived business events" Icon={Activity}/><Stat label="Activations · 24h" value={String(stats.activations24h||0)} sub="Queued provider signals" Icon={RadioTower}/><Stat label="Rule engine" value="Safe" sub="Whitelisted operators · no eval" Icon={ShieldCheck}/></div>

  <div className="event-layout">
   <div className="app-panel event-list">
    <div className="panel-head"><div><h3>Configured events</h3><p>Persisted business logic → normalized output → destinations</p></div><button className="app-primary" onClick={()=>openBuilder()}><Plus/>New rule</button></div>
    {(data.items||[]).length?(data.items||[]).map((x:any)=><button className={(current?.id===x.id?'selected ':'')} key={x.id} onClick={()=>setActive(x.id)}><span><Zap/></span><div><b>{x.name}</b><small>{x.source_event} → {x.output_event}</small></div><i>{x.enabled?'Active':'Paused'}</i><ChevronRight/></button>):!loading&&<div className="empty-state"><Zap/><b>No event rules yet</b><small>Create a business rule or use one of the templates below.</small></div>}
   </div>
   <div className="app-panel event-editor">
    {current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.source_event} → {current.output_event}</p></div><button disabled={busy===current.id} onClick={()=>toggle(current)}>{busy===current.id?'Updating…':current.enabled?'Pause':'Enable'}</button></div>
    <div className="event-step"><span>1</span><div><b>Source event</b><p>Evaluate when <strong>{current.source_event}</strong> arrives through the first-party ingestion API.</p></div></div>
    <div className="event-step"><span>2</span><div><b>Business conditions</b><p>{(current.conditions||[]).length?(current.conditions||[]).map((c:any)=>c.field+' '+c.operator+' '+String(c.value)).join(' AND '):'No conditions — every matching source event qualifies.'}</p></div></div>
    <div className="event-step"><span>3</span><div><b>Normalize & persist</b><p>Create <strong>{current.output_event}</strong> in the assisted-event store with deterministic rule-run idempotency.</p></div></div>
    <div className="event-step"><span>4</span><div><b>Activate</b><p>{(current.destinations||[]).length?'Queue to '+current.destinations.join(' + ')+' only when marketing consent is present.':'Measurement only — no ad-platform activation.'}</p></div></div></>:<div className="empty-state"><Zap/><b>Select or create an event rule</b></div>}
   </div>
  </div>

  <div className="event-tooling-grid">
   <div className="app-panel"><div className="panel-head"><div><h3>Business-event templates</h3><p>Choose a pattern, review its logic, then persist it as a real workspace rule.</p></div><span className="healthy">{(data.templates||[]).length} templates</span></div><div className="event-template-filters">{categories.map(x=><button key={x} className={templateFilter===x?'active':''} onClick={()=>setTemplateFilter(x)}>{x}</button>)}</div><div className="event-template-list">{visibleTemplates.map((x:any)=><article className="template-row template-card" key={x.id||x.name}><Zap/><div><div className="template-card-title"><b>{x.name}</b><em>{x.category||'Business event'}</em></div><small>{x.description||x.sourceEvent+' → '+x.outputEvent}</small><p>{x.useCase||'Create a governed derived event from first-party data.'}</p></div><div className="template-card-actions"><span>{x.condition?.field} {x.condition?.operator} {String(x.condition?.value)}</span><button onClick={()=>openBuilder(x)}>Use template<ArrowRight/></button></div></article>)}</div></div>
   <div className="app-panel"><div className="panel-head"><div><h3>Recent rule matches</h3><p>Auditable transformations and activation counts</p></div><button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh'}</button></div>{(data.runs||[]).length?(data.runs||[]).slice(0,8).map((x:any)=><button className="adjustment-row event-run-row" key={x.id} onClick={()=>{const match=(data.items||[]).find((rule:any)=>rule.id===x.rule_id);if(match)setActive(match.id)}}><span>{x.source_event}</span><ArrowRight/><b>{x.output_event}</b><em>{x.activation_queued||0} queued</em></button>):<div className="empty-delivery-state"><Activity/><div><b>No rule matches yet</b><small>Send a source event that meets a configured rule to create an auditable match.</small></div></div>}</div>
  </div>

  {builder&&<AccessibleDialog ariaLabel="Business event rule" onClose={()=>setBuilder(false)}><form className="connector-card audience-builder" onSubmit={create}><div className="connector-modal-head"><div><Zap/><div><b>Business event rule</b><small>Review the template or define your own rule before it becomes active.</small></div></div><button type="button" aria-label="Close business event rule" onClick={()=>setBuilder(false)}><X/></button></div>
   <label>Rule name<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} required/></label><div className="audience-rule-grid"><label>Source event<input value={draft.sourceEvent} onChange={e=>setDraft({...draft,sourceEvent:e.target.value})} required/></label><label>Output event<input value={draft.outputEvent} onChange={e=>setDraft({...draft,outputEvent:e.target.value})} required/></label><label>Condition field<input value={draft.field} onChange={e=>setDraft({...draft,field:e.target.value})} required/></label></div>
   <div className="audience-rule-grid"><label>Operator<select value={draft.operator} onChange={e=>setDraft({...draft,operator:e.target.value})}><option value="equals">equals</option><option value="not_equals">not equals</option><option value="gt">greater than</option><option value="gte">greater/equal</option><option value="lt">less than</option><option value="lte">less/equal</option><option value="contains">contains</option><option value="exists">exists</option><option value="in">in</option></select></label><label>Condition value<input value={draft.value} onChange={e=>setDraft({...draft,value:e.target.value})}/></label><label>Value mode<select value={draft.valueMode} onChange={e=>setDraft({...draft,valueMode:e.target.value})}><option value="copy">Copy source value</option><option value="fixed">Fixed value</option></select></label></div>
   {draft.valueMode==='fixed'&&<label>Fixed value<input value={draft.fixedValue} onChange={e=>setDraft({...draft,fixedValue:e.target.value})} type="number" step="0.01" required/></label>}<label>Currency<input value={draft.currency} onChange={e=>setDraft({...draft,currency:e.target.value})}/></label>
   <div className="template-destination-picker"><span>Activation destinations</span><div className="context-chips"><label><input type="checkbox" checked={(draft.destinations||[]).includes('Google Ads')} onChange={()=>toggleDestination('Google Ads')}/> Google Ads</label><label><input type="checkbox" checked={(draft.destinations||[]).includes('Meta Ads')} onChange={()=>toggleDestination('Meta Ads')}/> Meta Ads</label><small>Leave both off for measurement-only attribution events.</small></div></div>
   <div className="event-rule-preview"><b>Rule preview</b><span>When <code>{preview.source}</code> arrives and <code>{preview.field} {preview.operator} {preview.value}</code>, create <code>{preview.output}</code>{(draft.destinations||[]).length?' and queue '+draft.destinations.join(' + '):' for measurement only'}.</span></div>
   <div className="audience-builder-actions"><button type="button" onClick={()=>setBuilder(false)}>Cancel</button><button className="app-primary" disabled={busy==='create'} type="submit">{busy==='create'?'Creating…':'Create & enable rule'}</button></div>
  </form></AccessibleDialog>}
 </>
}
