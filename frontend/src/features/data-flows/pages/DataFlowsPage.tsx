import {useEffect,useState} from 'react'
import {beginLoading,useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,ArrowRight,CheckCircle2,Network,Plus,ShieldCheck,Sparkles,X} from 'lucide-react'
import {dataFlowsApi as api} from '../data/data-flows.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {useDirtyWork} from '../../../lib/dirty-work'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string;title:string;sub:string;action?:string;onAction?:()=>void}){
  return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}</div>
}
function Stat({label,value,sub,Icon}:{label:string;value:string;sub:string;Icon:any}){
  return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>
}

export default function DataFlowsPage(){
 const [data,setData]=useState<any>({items:[],stats:{}})
 const [integrations,setIntegrations]=useState<any[]>([])
 const [builder,setBuilder]=useState(false)
 const [busy,setBusy]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<{kind:'ok'|'error'|'',text:string}>({kind:'',text:''})
 const [draft,setDraft]=useState<any>({name:'CRM records → Ace Data Hub',source:'Zoho CRM',destination:'Ace Data Hub',object:'CRM records',trigger:'Incremental provider changes',identityField:'provider record ID + modified timestamp',mode:'Every 15 minutes'})
 useDirtyWork({key:'data-flow-builder',label:'Data flow draft',dirty:builder,scope:'feature'})
 const load=async()=>{
  beginLoading(setLoading)
  try{
   const [flows,connectors]:any=await Promise.all([api.integrationFlows(),api.integrations()])
   setData(flows);setIntegrations(connectors.items||[])
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Data flows could not be loaded. Existing flow state was preserved.'})}
  finally{setLoading(false)}
 }
 useEffect(()=>{load()},[])
 useDevelopmentLiveRefresh(()=>load())
 const connectorNames=integrations.map((x:any)=>x.name)
 const create=async(e:any)=>{
  e.preventDefault();setBusy('create');setNotice({kind:'',text:''})
  try{await api.createIntegrationFlow(draft);setBuilder(false);setNotice({kind:'ok',text:'Data flow created and persisted. Run the readiness test before activation.'});await load()}
  catch(e:any){setNotice({kind:'error',text:e?.message||'Data flow could not be created.'})}
  finally{setBusy('')}
 }
 const testFlow=async(id:string)=>{
  setBusy('test:'+id);setNotice({kind:'',text:''})
  try{const r:any=await api.testIntegrationFlow(id);setNotice({kind:r?.ok===false||r?.status==='needs_attention'?'error':'ok',text:r.detail||'Readiness test completed.'});await load()}
  catch(e:any){setNotice({kind:'error',text:e?.message||'Readiness test failed.'})}
  finally{setBusy('')}
 }
 const toggle=async(item:any)=>{
  setBusy('toggle:'+item.id);setNotice({kind:'',text:''})
  try{const r:any=await api.toggleIntegrationFlow(item.id,item.status!=='active');setNotice({kind:'ok',text:item.status==='active'?'Flow paused and persisted.':'Flow activated after backend readiness validation.'});await load()}
  catch(e:any){setNotice({kind:'error',text:e?.message||'Flow status could not be changed.'})}
  finally{setBusy('')}
 }
 const stats=data.stats||{}
 return <><PageHead crumb="Activation / Data Flows" title="Data flows" sub="Define governed source-to-destination sync recipes, verify connector readiness, and activate only flows that pass their checks." action={loading?'Refreshing…':'Refresh flows'} onAction={load}/>
 <div className="stats-grid"><Stat label="Configured flows" value={String(stats.total||0)} sub="Persisted workspace recipes" Icon={Network}/><Stat label="Active" value={String(stats.active||0)} sub="Enabled synchronization paths" Icon={Activity}/><Stat label="Healthy" value={String(stats.healthy||0)} sub="Last readiness test passed" Icon={CheckCircle2}/><Stat label="Needs attention" value={String(stats.needsAttention||0)} sub="Connection or test work required" Icon={ShieldCheck}/></div>
 {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}>{notice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}<span>{notice.text}</span></div>}
 <div className="app-panel data-flow-explainer"><div><Network/><div><span>HOW IT WORKS</span><h3>Source → map → verify → activate</h3><p>Flows do not pretend an unsupported connector is live. Provider→Ace Data Hub flows execute through the durable connector runtime. Cross-provider activation uses the dedicated Event Rules, Audiences, or CRM writeback paths so consent and event semantics remain explicit.</p></div></div><div className="data-flow-steps">{['Choose source','Choose destination','Map business signal','Test readiness','Activate flow'].map((x,i)=><span key={x}><b>{i+1}</b>{x}{i<4&&<ArrowRight/>}</span>)}</div></div>
 <div className="data-flow-grid">{loading&&!(data.items||[]).length?<div className="app-panel empty-delivery-state"><Activity/><div><b>Loading data flows</b><small>Reading persisted flow recipes, connector state and readiness evidence.</small></div></div>:(data.items||[]).length?(data.items||[]).map((x:any)=><article className={'data-flow-card '+(x.status==='active'?'active':'')} key={x.id}><div className="data-flow-card-head"><div><span className="integration-logo c0">{String(x.source||'S').slice(0,2).toUpperCase()}</span><ArrowRight/><span className="integration-logo c4">{String(x.destination||'D').slice(0,2).toUpperCase()}</span></div><span className={x.status==='active'?'healthy':'status'}>{x.status}</span></div><h3>{x.name}</h3><p>{x.source} → {x.destination}</p><div className="data-flow-meta"><span><b>Object</b>{x.object}</span><span><b>Trigger</b>{x.trigger}</span><span><b>Identity</b>{x.identityField}</span><span><b>Cadence</b>{x.mode}</span></div><div className={'data-flow-test '+String(x.lastTestStatus||'not_tested')}><ShieldCheck/><div><b>{x.lastTestStatus==='passed'?'Readiness passed':x.lastTestStatus==='needs_attention'?'Needs attention':'Not tested'}</b><small>{x.lastTestDetail||'Run a readiness test before activation.'}</small></div></div><footer><button disabled={busy==='test:'+x.id} onClick={()=>testFlow(x.id)}>{busy==='test:'+x.id?'Testing…':'Test readiness'}</button><button className={x.status==='active'?'':'app-primary'} disabled={busy==='toggle:'+x.id} onClick={()=>toggle(x)}>{busy==='toggle:'+x.id?'Updating…':x.status==='active'?'Pause':'Activate'}</button></footer></article>):<div className="app-panel empty-delivery-state"><Network/><div><b>No data flows configured</b><small>Create a source-to-destination recipe after connecting the systems you want to synchronize.</small></div><button className="app-primary" onClick={()=>setBuilder(true)}><Plus/>Create first flow</button></div>}</div>
 {builder&&<AccessibleDialog ariaLabel="Create data flow" onClose={()=>setBuilder(false)}><form className="connector-card data-flow-builder" onSubmit={create}><div className="connector-modal-head"><div><Network/><div><b>Create data flow</b><small>Configure a governed provider-to-canonical-data synchronization recipe.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Flow name<input required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><div className="two-col"><label>Source<select value={draft.source} onChange={e=>setDraft({...draft,source:e.target.value})}>{connectorNames.map((x:string)=><option key={x}>{x}</option>)}</select></label><label>Destination<select value={draft.destination} onChange={e=>setDraft({...draft,destination:e.target.value})}>{connectorNames.map((x:string)=><option key={x}>{x}</option>)}</select></label></div><label>Business object / event<input required value={draft.object} onChange={e=>setDraft({...draft,object:e.target.value})}/></label><label>Trigger<input required value={draft.trigger} onChange={e=>setDraft({...draft,trigger:e.target.value})}/></label><div className="two-col"><label>Identity mapping<input required value={draft.identityField} onChange={e=>setDraft({...draft,identityField:e.target.value})}/></label><label>Cadence<select value={draft.mode} onChange={e=>setDraft({...draft,mode:e.target.value})}><option>Real-time</option><option>Every 15 minutes</option><option>Hourly</option><option>Daily</option></select></label></div><div className="ai-note"><ShieldCheck/><div><b>Activation guardrail</b><p>The backend requires a passed readiness test before a flow can be activated.</p></div></div><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create flow'}</button></form></AccessibleDialog>}
 </>
}
