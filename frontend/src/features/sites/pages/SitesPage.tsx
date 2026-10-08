import {useEffect,useState} from 'react'
import {beginLoading,useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,CheckCircle2,ChevronRight,Globe2,MousePointer2,RadioTower,ShieldCheck,Sparkles,X} from 'lucide-react'
import {sitesApi} from '../data/sites.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {ErrorState,LoadingState,StaleState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}</div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}
type Notice={kind:'ok'|'error'|'unknown'|'',text:string}
const unknownMutation=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))

export default function SitesPage(){
 const [sites,setSites]=useState<any[]>([])
 const [selected,setSelected]=useState('')
 const [tests,setTests]=useState<Record<string,any>>({})
 const [debug,setDebug]=useState<any[]>([])
 const [debugOpen,setDebugOpen]=useState(false)
 const [builder,setBuilder]=useState(false)
 const [busy,setBusy]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<Notice>({kind:'',text:''})

 useDirtyWork({key:'sites-builder-draft',label:'Tracked site draft',dirty:builder,scope:'feature'})

 const normalize=(items:any[])=>(items||[]).map((item:any)=>({
  ...item,
  environment:String(item.environment||'').replace(/^./,(m:string)=>m.toUpperCase()),
  pixel:String(item.pixel||'').replaceAll('_',' ').replace(/^./,(m:string)=>m.toUpperCase()),
  server:String(item.server||'').replace(/^./,(m:string)=>m.toUpperCase()),
  consent:item.consent||'Configured'
 }))

 const load=async()=>{
  beginLoading(setLoading)
  try{
   const result:any=await sitesApi.load()
   const mapped=normalize(result.items||[])
   setSites(mapped)
   setSelected(current=>current&&mapped.some((item:any)=>item.domain===current)?current:(mapped[0]?.domain||''))
   setNotice(current=>current.kind==='error'?{kind:'',text:''}:current)
  }catch(error:any){
   setNotice({kind:'error',text:error?.message||'Tracked sites could not be loaded. Existing site evidence was preserved.'})
  }finally{setLoading(false)}
 }

 useEffect(()=>{void load()},[])
 useDevelopmentLiveRefresh(()=>load())

 const current=sites.find(item=>item.domain===selected)||sites[0]
 const result=current?tests[current.domain]:null

 const create=async(event:any)=>{
  event.preventDefault()
  const form=new FormData(event.currentTarget)
  setBusy('create');setNotice({kind:'',text:''})
  try{
   const response:any=await sitesApi.create({
    domain:String(form.get('domain')||''),
    environment:String(form.get('environment')||'production')
   })
   setBuilder(false)
   setNotice({kind:'ok',text:'Tracked property saved after backend confirmation. Install tracking and run the installation test when events begin arriving.'})
   await load()
   if(response?.item?.domain)setSelected(response.item.domain)
  }catch(error:any){
   setNotice(unknownMutation(error)?{kind:'unknown',text:'The site-save outcome is unknown. Refresh authoritative site inventory before submitting the same domain again.'}:{kind:'error',text:error?.message||'Site could not be saved.'})
  }finally{setBusy('')}
 }

 const test=async(domain:string)=>{
  setBusy('test');setNotice({kind:'',text:''})
  try{
   const response:any=await sitesApi.test(domain)
   setTests(currentTests=>({...currentTests,[domain]:response}))
   setNotice({kind:'ok',text:response.pixel?'Installation evidence found for '+domain+'.':'No browser events observed yet for '+domain+'. Server endpoint is reachable, but tracking still needs evidence.'})
  }catch(error:any){
   setNotice(unknownMutation(error)?{kind:'unknown',text:'The installation test result is unknown because the acknowledgement was lost. Refresh site state before repeating the test.'}:{kind:'error',text:error?.message||'Site test failed.'})
  }finally{setBusy('')}
 }

 const openDebugger=async()=>{
  if(!current)return
  setBusy('debug');setNotice({kind:'',text:''})
  try{
   const response:any=await sitesApi.debug(current.domain)
   setDebug(response.items||[])
   setDebugOpen(true)
  }catch(error:any){
   setNotice({kind:'error',text:error?.message||'Event debugger could not be loaded.'})
  }finally{setBusy('')}
 }

 return <>
  <PageHead crumb="Tracking / Sites" title="Site & pixel operations" sub="Manage first-party collection, cross-domain continuity, consent gating and server-side event delivery." action="Add site" onAction={()=>setBuilder(true)}/>

  {loading&&!sites.length&&<LoadingState title="Loading tracked sites" description="Reading persisted properties, browser evidence and consent readiness."/>}
  {notice.text&&notice.kind==='error'&&<ErrorState title="Site operations failed" description={notice.text} action={{label:'Refresh sites',onClick:load}}/>}
  {notice.text&&notice.kind==='unknown'&&<StaleState title="Site operation needs reconciliation" description={notice.text} action={{label:'Refresh authoritative state',onClick:load}}/>}
  {notice.text&&notice.kind==='ok'&&<div className="delivery-notice ok" role="status"><CheckCircle2/><span>{notice.text}</span></div>}

  <div className="stats-grid">
   <Stat label="Tracked domains" value={String(sites.length)} sub="Persisted site inventory" Icon={Globe2}/>
   <Stat label="Average coverage" value={sites.length?(sites.reduce((sum,item)=>sum+Number(item.coverage||0),0)/sites.length).toFixed(1)+'%':'—'} sub="Observed event coverage" Icon={MousePointer2}/>
   <Stat label="Browser evidence" value={String(sites.filter(item=>String(item.pixel).toLowerCase()==='active').length)} sub="Properties with observed events" Icon={RadioTower}/>
   <Stat label="Consent configured" value={String(sites.filter(item=>item.consent).length)} sub="Workspace consent policy" Icon={ShieldCheck}/>
  </div>

  <div className="site-ops-layout">
   <div className="app-panel site-list" aria-busy={loading?'true':undefined}>
    <div className="panel-head"><div><h3>Tracked properties</h3><p>Persisted domains and environments</p></div><button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh'}</button></div>
    {sites.length?sites.map(item=><button key={item.domain} className={selected===item.domain?'selected':''} onClick={()=>setSelected(item.domain)}><Globe2/><div><b>{item.domain}</b><small>{item.environment} · {item.pixel}</small></div><strong>{item.coverage}%</strong><ChevronRight/></button>):!loading&&<div className="empty-delivery-state"><Globe2/><div><b>No sites configured</b><small>Add the first tracked property to start site/pixel operations.</small></div></div>}
   </div>

   {current?<div className="app-panel site-detail">
    <div className="panel-head"><div><h3>{current.domain}</h3><p>{current.environment} property</p></div><span className={current.pixel==='Active'?'healthy':'status'}>{current.pixel}</span></div>
    <div className="site-detail-grid">{[['Browser pixel evidence',current.pixel],['Server endpoint',current.server],['Event coverage',current.coverage+'%'],['Consent mode',current.consent],['Events observed',String(current.events||0)],['Last event',current.lastEventAt?new Date(current.lastEventAt).toLocaleString():'—']].map(item=><div key={item[0]}><span>{item[0]}</span><b>{item[1]}</b></div>)}</div>
    {result&&<div className="diagnostic-evidence">{[['Pixel events observed',result.pixel?'Yes':'No'],['Server endpoint',result.server?'Reachable':'Unavailable'],['Consent readiness',result.consent?'Configured':'Needs setup'],['Cross-domain identity',result.crossDomain?'Observed':'No evidence yet'],['Events in test',String(result.eventsObserved||0)],['Tested at',new Date(result.testedAt).toLocaleString()]].map(item=><article key={item[0]}><span>{item[0]}</span><b>{item[1]}</b></article>)}</div>}
    <div className="approval-actions"><button disabled={busy==='debug'} onClick={openDebugger}>{busy==='debug'?'Loading debugger…':'Open event debugger'}</button><button className="approve" disabled={busy==='test'} onClick={()=>test(current.domain)}><Activity/>{busy==='test'?'Testing…':result?(result.pixel?'Evidence verified':'Retest installation'):'Test installation'}</button></div>
   </div>:<div className="app-panel site-detail"><div className="empty-delivery-state"><Globe2/><div><b>Add a tracked property</b><small>Site diagnostics become available after a domain is saved.</small></div></div></div>}
  </div>

  {builder&&<AccessibleDialog ariaLabel="Add tracked site" onClose={()=>setBuilder(false)}><form className="connector-card" onSubmit={create}><div className="connector-modal-head"><div><Globe2/><div><b>Add tracked site</b><small>Register a domain before verifying browser/server tracking.</small></div></div><button type="button" aria-label="Close tracked site builder" onClick={()=>setBuilder(false)}><X/></button></div><label>Domain<input name="domain" required placeholder="www.example.com"/></label><label>Environment<select name="environment"><option value="production">Production</option><option value="staging">Staging</option><option value="development">Development</option></select></label><button disabled={busy==='create'}>{busy==='create'?'Saving…':'Save tracked site'}</button></form></AccessibleDialog>}

  {debugOpen&&<AccessibleDialog ariaLabel="Event debugger" onClose={()=>setDebugOpen(false)}><div className="connector-card event-debugger"><div className="connector-modal-head"><div><Activity/><div><b>Event debugger</b><small>{current?.domain}</small></div></div><button aria-label="Close event debugger" onClick={()=>setDebugOpen(false)}><X/></button></div>{debug.length?<div className="debug-event-list">{debug.slice(0,30).map((item:any,index:number)=><div className="developer-event-row" key={item.id||item.eventId||index}><code>{item.event||item.name||item.eventType||'event'}</code><span>{item.source||item.domain||'first-party'}</span><strong>{item.createdAt||item.occurredAt||item.timestamp?new Date(item.createdAt||item.occurredAt||item.timestamp).toLocaleString():'—'}</strong></div>)}</div>:<div className="empty-delivery-state"><Activity/><div><b>No recent events for this domain</b><small>The debugger does not inject synthetic events when no tracked data exists.</small></div></div>}</div></AccessibleDialog>}
 </>
}
