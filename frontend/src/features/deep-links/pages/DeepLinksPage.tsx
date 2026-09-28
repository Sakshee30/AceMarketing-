import {useEffect,useState} from 'react'
import {Activity,Check,CheckCircle2,ChevronRight,Globe2,MousePointer2,Network,Sparkles,X} from 'lucide-react'
import {deepLinksApi} from '../data/deep-links.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {ErrorState,LoadingState,StaleState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}</div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}
type Notice={kind:'ok'|'error'|'unknown'|'',text:string}
const unknownMutation=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))

export default function DeepLinksPage(){
 const [links,setLinks]=useState<any[]>([])
 const [stats,setStats]=useState<any>({})
 const [selected,setSelected]=useState('')
 const [builder,setBuilder]=useState(false)
 const [copied,setCopied]=useState('')
 const [busy,setBusy]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<Notice>({kind:'',text:''})

 useDirtyWork({key:'deep-link-draft',label:'Deep link draft',dirty:builder,scope:'feature'})

 const load=async()=>{
  setLoading(true)
  try{
   const r:any=await deepLinksApi.load()
   setLinks(r.items||[])
   setStats(r.stats||{})
   setSelected((current:string)=>current&&r.items?.some((item:any)=>item.slug===current)?current:(r.items?.[0]?.slug||''))
   setNotice(n=>n.kind==='error'?{kind:'',text:''}:n)
  }catch(error:any){
   setNotice({kind:'error',text:error?.message||'Deep links could not be loaded. Existing routing evidence was preserved.'})
  }finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[])

 const current=links.find(item=>item.slug===selected)||links[0]

 const activate=async(slug:string)=>{
  setBusy('activate');setNotice({kind:'',text:''})
  try{
   await deepLinksApi.activate(slug)
   setNotice({kind:'ok',text:'Deep link activated after backend confirmation.'})
   await load()
  }catch(error:any){
   setNotice(unknownMutation(error)?{kind:'unknown',text:'The activation outcome is unknown. Refresh authoritative link state before repeating the activation.'}:{kind:'error',text:error?.message||'Deep link could not be activated.'})
  }finally{setBusy('')}
 }

 const create=async(event:any)=>{
  event.preventDefault()
  const form=new FormData(event.currentTarget)
  setBusy('create');setNotice({kind:'',text:''})
  try{
   const result:any=await deepLinksApi.create({
    name:String(form.get('name')||''),
    slug:String(form.get('slug')||''),
    target:String(form.get('target')||''),
    fallback:String(form.get('fallback')||'')
   })
   setBuilder(false)
   setNotice({kind:'ok',text:'Deep-link draft created after backend confirmation.'})
   await load()
   if(result?.slug)setSelected(result.slug)
  }catch(error:any){
   setNotice(unknownMutation(error)?{kind:'unknown',text:'The deep-link creation outcome is unknown. Refresh authoritative link state before creating the same route again.'}:{kind:'error',text:error?.message||'Deep link could not be created.'})
  }finally{setBusy('')}
 }

 const copyTestUrl=async()=>{
  if(!current)return
  const url=location.origin+'/#/deep/'+current.slug+'?utm_source=test&utm_medium=debug'
  try{
   await navigator.clipboard.writeText(url)
   setCopied(current.slug)
   setNotice({kind:'ok',text:'Test URL copied to clipboard.'})
  }catch{
   setCopied('error')
   setNotice({kind:'error',text:'The browser could not copy the test URL. You can still open or copy it manually from the current route.'})
  }
 }

 const totalClicks=Number(stats.clicks||0)
 const totalAppOpens=Number(stats.appOpens||0)
 const totalConversions=Number(stats.conversions||0)

 return <>
  <PageHead crumb="Activation / Deep Links" title="Deep linking" sub="Persist app/web routes and measure their own click, app-open and conversion events." action="Create deep link" onAction={()=>setBuilder(true)}/>
  {loading&&!links.length&&<LoadingState title="Loading deep links" description="Reading persisted routes and performance evidence."/>}
  {notice.text&&notice.kind==='error'&&<ErrorState title="Deep-link action failed" description={notice.text} action={{label:'Refresh deep links',onClick:load}}/>}
  {notice.text&&notice.kind==='unknown'&&<StaleState title="Deep-link action needs reconciliation" description={notice.text} action={{label:'Refresh authoritative state',onClick:load}}/>}
  {notice.text&&notice.kind==='ok'&&<div className="delivery-notice ok" role="status"><CheckCircle2/><span>{notice.text}</span></div>}

  <div className="stats-grid">
   <Stat label="Active links" value={String(stats.active||0)} sub={(stats.draft||0)+' draft'} Icon={Network}/>
   <Stat label="Clicks" value={totalClicks.toLocaleString('en-IN')} sub="Persisted deep-link click events" Icon={MousePointer2}/>
   <Stat label="App opens" value={totalClicks?Math.round(totalAppOpens/totalClicks*100)+'%':'—'} sub="Of recorded clicks" Icon={Globe2}/>
   <Stat label="Conversion rate" value={totalClicks?(totalConversions/totalClicks*100).toFixed(1)+'%':'—'} sub="Recorded deep-link conversions" Icon={CheckCircle2}/>
  </div>

  <div className="deep-link-layout">
   <div className="app-panel deep-link-list" aria-busy={loading?'true':undefined}>
    <div className="panel-head"><div><h3>Deep links</h3><p>Persisted app-first routes with web fallbacks</p></div><button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh'}</button></div>
    {links.length?links.map(item=><button key={item.slug} className={selected===item.slug?'selected':''} onClick={()=>setSelected(item.slug)}><Network/><div><b>{item.name}</b><small>{item.slug} · {Number(item.clicks||0).toLocaleString('en-IN')} clicks</small></div><span className={String(item.status||'draft').toLowerCase()}>{item.status}</span><ChevronRight/></button>):!loading&&<div className="empty-delivery-state"><Network/><div><b>No deep links yet</b><small>Create a route to begin measuring app/web handoff performance.</small></div></div>}
   </div>

   <div className="app-panel deep-link-detail">
    {current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.slug}</p></div><span className={current.status==='active'?'healthy':'status'}>{current.status}</span></div><div className="site-detail-grid">{[['Primary destination',current.target],['Web fallback',current.fallback],['Recorded clicks',current.clicks||0],['App opens',current.appOpens||0],['Conversions',current.conversions||0],['Conversion rate',(current.conversionRate||0)+'%']].map(item=><div key={item[0]}><span>{item[0]}</span><b>{String(item[1]??'—')}</b></div>)}</div><div className="approval-actions"><button onClick={copyTestUrl}>{copied===current.slug?'Copied':'Copy test URL'}</button>{current.status!=='active'&&<button className="approve" disabled={busy==='activate'} onClick={()=>activate(current.slug)}><Check/>{busy==='activate'?'Activating…':'Activate link'}</button>}</div></>:<div className="empty-delivery-state"><Network/><div><b>Create a deep link to configure routing.</b></div></div>}
   </div>
  </div>

  <div className="app-panel"><div className="panel-head"><div><h3>Link performance</h3><p>Click → app open → conversion</p></div></div>{links.length?links.map(item=><div className="developer-event-row" key={item.slug}><b>{item.name}</b><span>{Number(item.clicks||0).toLocaleString('en-IN')} clicks · {Number(item.appOpens||0).toLocaleString('en-IN')} app opens</span><strong>{Number(item.conversionRate||0).toFixed(1)}% conversion</strong></div>):<div className="empty-delivery-state"><Activity/><div><b>No performance data yet</b></div></div>}</div>

  {builder&&<AccessibleDialog ariaLabel="Create deep link" onClose={()=>setBuilder(false)}><form className="connector-card" onSubmit={create}><div className="connector-modal-head"><div><Network/><div><b>Create deep link</b><small>Persist route and fallback.</small></div></div><button type="button" aria-label="Close deep-link builder" onClick={()=>setBuilder(false)}><X/></button></div><label>Name<input name="name" required placeholder="Consultation booking"/></label><label>Slug<input name="slug" required placeholder="book-consultation"/></label><label>App / primary destination<input name="target" required placeholder="myapp://consultation/book"/></label><label>Web fallback<input name="fallback" required type="url" placeholder="https://example.com/book"/></label><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create draft'}</button></form></AccessibleDialog>}
 </>
}
