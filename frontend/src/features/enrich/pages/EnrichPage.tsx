import {useEffect,useMemo,useState} from 'react'
import {beginLoading,useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,CheckCircle2,ChevronRight,DatabaseZap,RadioTower,Search,ShieldCheck,Target} from 'lucide-react'
import {enrichApi} from '../data/enrich.api'
import {ErrorState,LoadingState,StaleState} from '../../../components/system/FrontendStates'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}>{action}</button>}</div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}
type Notice={kind:'ok'|'error'|'unknown'|'',text:string}
const unknownMutation=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))

export default function EnrichPage(){
 const [live,setLive]=useState<any>({items:[],stats:null,writebacks:[]})
 const [selected,setSelected]=useState('')
 const [search,setSearch]=useState('')
 const [writeback,setWriteback]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<Notice>({kind:'',text:''})

 const load=async()=>{
  beginLoading(setLoading)
  try{
   const r:any=await enrichApi.load()
   setLive(r)
   if(r.items?.length)setSelected((v:string)=>v&&r.items.some((x:any)=>x.id===v)?v:r.items[0].id)
   else setSelected('')
   setNotice(n=>n.kind==='error'?{kind:'',text:''}:n)
  }catch(e:any){
   setNotice({kind:'error',text:e?.message||'CRM enrichment data could not be loaded. Existing lead evidence was preserved.'})
  }finally{setLoading(false)}
 }

 useEffect(()=>{void load()},[])
 useDevelopmentLiveRefresh(()=>load(),!writeback,true)

 const profiles=(live.items||[]).slice(0,300)
 const normalizedSearch=search.trim().toLowerCase()
 const visible=useMemo(()=>profiles.filter((x:any)=>!normalizedSearch||[x.name,x.leadId,x.source,x.campaign,x.stage,x.grade].some(v=>String(v||'').toLowerCase().includes(normalizedSearch))).slice(0,150),[profiles,normalizedSearch])
 const profile=profiles.find((x:any)=>x.id===selected)||profiles[0]
 const stats=live.stats||{}
 const runs=(live.writebacks||[]).filter((x:any)=>!profile||String(x.entity_id||x.entityId||'')===String(profile.id)).slice(0,25)

 const pushCrm=async(provider:string)=>{
  if(!profile)return
  setWriteback(provider)
  setNotice({kind:'',text:''})
  try{
   const r:any=await enrichApi.writeback(profile.id||profile.leadId,provider,{
    grade:profile.grade,score:profile.score,source:profile.source,campaign:profile.campaign,stage:profile.stage
   })
   setNotice({kind:'ok',text:'CRM writeback accepted after backend confirmation for '+provider+(r?.runId?' · '+String(r.runId).slice(0,18):'')+'.'})
   await load()
  }catch(e:any){
   setNotice(unknownMutation(e)
    ?{kind:'unknown',text:'The CRM writeback outcome is unknown. Refresh authoritative enrichment state before submitting the same writeback again.'}
    :{kind:'error',text:e?.message||'CRM writeback could not be queued.'}
   )
  }finally{setWriteback('')}
 }

 const total=Number(stats.total||0),ab=Number(stats.abQuality||0)
 const visibleGradeCounts={
  a:profiles.filter((x:any)=>String(x.grade||'').toUpperCase()==='A').length,
  b:profiles.filter((x:any)=>String(x.grade||'').toUpperCase()==='B').length,
  c:profiles.filter((x:any)=>String(x.grade||'').toUpperCase()==='C').length,
  d:profiles.filter((x:any)=>String(x.grade||'').toUpperCase()==='D').length
 }

 return <>
  <PageHead crumb="Conversion / Enrich" title="CRM enrichment" sub="Give sales acquisition, intent, journey, call and messaging context before the first conversation." action={loading?'Refreshing…':'Refresh'} onAction={()=>{if(!loading)void load()}}/>

  {loading&&!profiles.length&&<LoadingState title="Loading CRM enrichment" description="Reading persisted CRM, journey, score, call and messaging evidence."/>}
  {notice.text&&notice.kind==='error'&&<ErrorState title="CRM enrichment action failed" description={notice.text} action={{label:'Refresh enrichment',onClick:load}}/>}
  {notice.text&&notice.kind==='unknown'&&<StaleState title="CRM writeback needs reconciliation" description={notice.text} action={{label:'Refresh authoritative state',onClick:load}}/>}
  {notice.text&&notice.kind==='ok'&&<div className="delivery-notice ok" role="status"><CheckCircle2/><span>{notice.text}</span></div>}

  <div className="stats-grid">
   <Stat label="Leads enriched" value={stats.available?String(total):'—'} sub="Persisted CRM profiles" Icon={DatabaseZap}/>
   <Stat label="A-grade" value={stats.available?String(stats.aGrade||0):'—'} sub="Highest current intent" Icon={Target}/>
   <Stat label="A+B quality" value={stats.available&&total?Math.round(ab/total*100)+'%':'—'} sub="Qualified scoring pool" Icon={Activity}/>
   <Stat label="CRM writebacks" value={String((live.writebacks||[]).length)} sub="Persisted activation runs" Icon={RadioTower}/>
  </div>

  <div className="enrich-layout">
   <div className="app-panel enrich-leads" aria-busy={loading?'true':undefined}>
    <div className="panel-head"><div><h3>Enriched leads</h3><p>Choose the exact lead context sales should receive{profiles.length>150?' · first 150 matches rendered':''}</p></div><span className="healthy">{total} profiles</span></div>
    <div className="enrich-search"><Search/><input aria-label="Search enriched leads" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search lead, source, campaign, stage..."/></div>
    {visible.length?visible.map((x:any)=><button key={x.id} className={profile?.id===x.id?'selected':''} onClick={()=>setSelected(x.id)}><span className={'grade grade-'+String(x.grade||'D').toLowerCase()}>{x.grade||'D'}</span><div><b>{x.name||x.leadId}</b><small>{x.source||'Unknown source'} · {x.stage||'lead'}{x.campaign?' · '+x.campaign:''}</small></div><strong>{Number(x.score||0)}</strong><ChevronRight/></button>):!loading&&<div className="empty-delivery-state"><Search/><div><b>No enriched lead matches</b><small>Clear the search or ingest another CRM/first-party profile.</small></div></div>}
   </div>

   <div className="app-panel enrich-profile">
    {profile?<><div className="panel-head"><div><h3>{profile.name||profile.leadId}</h3><p>{profile.leadId} · updated {profile.updatedAt?new Date(profile.updatedAt).toLocaleString():'—'}</p></div><span className={'grade grade-'+String(profile.grade||'D').toLowerCase()}>{profile.grade||'D'} · {profile.score||0}</span></div>
    <div className="profile-fields enrich-fields">{[['First touch',profile.source||'—'],['Campaign',profile.campaign||'—'],['Journey depth',profile.journey?.journeyDepth??0],['Pricing-page views',profile.journey?.pricingPageViews??0],['Intent',profile.intent||'—'],['CRM stage',profile.stage||'—'],['WhatsApp',profile.journey?.whatsappEngaged?'Engaged':'No evidence'],['Call outcome',profile.journey?.callOutcome||'No evidence']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div>
    <div className="agent-section"><h4>Explainable score evidence</h4>{(profile.drivers||[]).length?(profile.drivers||[]).slice(0,8).map((x:any)=><div className="score-driver" key={x.key||x.label}><div><b>{x.label}</b><small>{x.evidence}</small></div><strong className={Number(x.points)<0?'negative':''}>{Number(x.points)>0?'+':''}{x.points}</strong></div>):<div className="empty-delivery-state"><Activity/><div><b>No score-driver evidence stored</b></div></div>}</div>
    <div className="enrich-context-grid"><div><h4>Call context</h4>{profile.callSummary?<p>{profile.callSummary}</p>:<small>No call evidence</small>}</div><div><h4>WhatsApp context</h4>{profile.whatsappSummary?<p>{profile.whatsappSummary}</p>:<small>No messaging evidence</small>}</div></div>
    <div className="approval-actions enrich-writeback-actions"><button disabled={!!writeback} onClick={()=>pushCrm('HubSpot')}>{writeback==='HubSpot'?'Queueing…':'Write to HubSpot'}</button><button disabled={!!writeback} onClick={()=>pushCrm('Zoho CRM')}>{writeback==='Zoho CRM'?'Queueing…':'Write to Zoho'}</button><button disabled={!!writeback} onClick={()=>pushCrm('Salesforce')}>{writeback==='Salesforce'?'Queueing…':'Write to Salesforce'}</button></div>
    </>:<div className="empty-delivery-state"><DatabaseZap/><div><b>No enriched profiles yet</b><small>CRM, first-party, call or WhatsApp ingestion will populate this surface.</small></div></div>}
   </div>
  </div>

  <div className="two-col">
   <div className="app-panel"><div className="panel-head"><div><h3>CRM writeback evidence</h3><p>Durable runs for the selected lead</p></div></div>{runs.length?runs.map((x:any)=><div className="enrich-writeback-row" key={x.id}><RadioTower/><div><b>{x.provider||'CRM'}</b><small>{x.created_at||x.createdAt?new Date(x.created_at||x.createdAt).toLocaleString():'—'}{x.last_error||x.lastError?' · '+(x.last_error||x.lastError):''}</small></div><span className={String(x.status||'queued').toLowerCase()}>{String(x.status||'queued').replaceAll('_',' ')}</span></div>):<div className="empty-delivery-state"><RadioTower/><div><b>No writebacks for this lead yet</b><small>Choose a CRM above to queue the first governed enrichment writeback.</small></div></div>}</div>
   <div className="app-panel"><div className="panel-head"><div><h3>Grade distribution</h3><p>Current persisted lead pool</p></div></div>{stats.available&&total?[['A · High intent',visibleGradeCounts.a],['B · Strong fit',visibleGradeCounts.b],['C · Nurture',visibleGradeCounts.c],['D · Low quality',visibleGradeCounts.d]].map((x:any)=><div className="health-line" key={x[0]}><span>{x[0]}</span><div className="progress"><i style={{width:(x[1]/Math.max(1,profiles.length)*100)+'%'}}/></div><b>{x[1]}</b></div>):<div className="empty-delivery-state"><Target/><div><b>No grading population yet</b></div></div>}</div>
  </div>

  <div className="source-conflict-note"><ShieldCheck/><div><b>Enrichment integrity</b><p>Only persisted first-party and CRM evidence is shown. CRM writeback success is displayed only after backend acknowledgement.</p></div></div>
 </>
}
