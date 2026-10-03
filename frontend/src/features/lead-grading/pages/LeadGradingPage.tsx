import {useEffect,useState} from 'react'
import {Activity,ArrowRight,Check,CheckCircle2,ChevronRight,DatabaseZap,RadioTower,ShieldCheck,Target} from 'lucide-react'
import {leadGradingApi} from '../data/lead-grading.api'
import {ErrorState,LoadingState,StaleState} from '../../../components/system/FrontendStates'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}>{action}</button>}</div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}
type Notice={kind:'ok'|'error'|'unknown'|'',text:string}
const unknownMutation=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))
const catalogueFixture={
 leadId:'qa_ace_v1_lead_000001',name:'Synthetic Lead 0000001',email:'qa_ace_v1.lead0000001@example.test',
 stage:'contacted',marketingConsent:'granted',campaignId:'qa_ace_v1_campaign_000001',campaign:'QA Campaign 0001',source:'META'
}

export default function LeadGradingPage(){
 const [selected,setSelected]=useState('')
 const [leads,setLeads]=useState<any[]>([])
 const [stats,setStats]=useState<any>(null)
 const [activated,setActivated]=useState<any>(null)
 const [busy,setBusy]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<Notice>({kind:'',text:''})
 const [fixture,setFixture]=useState(catalogueFixture)
 const [fixtureResult,setFixtureResult]=useState<any>(null)

 const load=async()=>{
  setLoading(true)
  try{
   const r:any=await leadGradingApi.load()
   const mapped=(r.items||[]).map((x:any)=>({
    name:String(x.lead||x.leadId||'Unknown lead'),
    leadId:x.leadId,
    source:x.source||'Unknown',
    score:Number(x.score||0),
    grade:['A','B','C','D'].includes(String(x.grade||'').toUpperCase())?String(x.grade).toUpperCase():'D',
    stage:x.stage||'Lead',
    reason:x.reason||'Scored from persisted journey evidence',
    drivers:Array.isArray(x.drivers)?x.drivers:[]
   }))
   setLeads(mapped)
   setStats(r.stats||null)
   if(mapped.length)setSelected((v:string)=>v&&mapped.some((x:any)=>x.name===v)?v:mapped[0].name)
   else setSelected('')
   setNotice(n=>n.kind==='error'?{kind:'',text:''}:n)
  }catch(e:any){
   setNotice({kind:'error',text:e?.message||'Lead grading could not be loaded. Existing lead evidence was preserved.'})
  }finally{setLoading(false)}
 }

 useEffect(()=>{void load()},[])

 const current=leads.find(x=>x.name===selected)||leads[0]
 const visibleLeads=leads.slice(0,150)

 const override=async(grade:string)=>{
  if(!current||busy)return
  setBusy('override:'+grade)
  setNotice({kind:'',text:''})
  try{
   await leadGradingApi.override(current.leadId||current.name,grade)
   setNotice({kind:'ok',text:'Manual grade '+grade+' saved after backend confirmation.'})
   setActivated(null)
   await load()
  }catch(e:any){
   setNotice(unknownMutation(e)
    ?{kind:'unknown',text:'The grade-override outcome is unknown. Refresh authoritative grading state before repeating the same override.'}
    :{kind:'error',text:e?.message||'Manual grade override failed.'}
   )
  }finally{setBusy('')}
 }

 const activate=async()=>{
  if(!current||busy)return
  setBusy('activate')
  setNotice({kind:'',text:''})
  try{
   const r:any=await leadGradingApi.activate(current.leadId||current.name)
   setActivated(r)
   setNotice({kind:'ok',text:'Grade '+current.grade+' activation was created after backend confirmation.'})
  }catch(e:any){
   setNotice(unknownMutation(e)
    ?{kind:'unknown',text:'The grade-activation outcome is unknown. Refresh authoritative grading state before attempting activation again.'}
    :{kind:'error',text:e?.message||'Grade activation failed.'}
   )
  }finally{setBusy('')}
 }

 const ingestFixture=async(event:any)=>{
  event.preventDefault()
  if(busy)return
  setBusy('fixture');setNotice({kind:'',text:''});setFixtureResult(null)
  const payload={
   externalLeadId:fixture.leadId,name:fixture.name,email:fixture.email,source:fixture.source,campaign:fixture.campaign,
   crmStage:fixture.stage,lastActivity:new Date().toISOString(),
   attributes:{synthetic:true,fixtureVersion:'ace.dummy.v1',marketingConsent:fixture.marketingConsent,campaignId:fixture.campaignId,
    provenance:{workbook:'AceMarketing_Dummy_Data_Catalogue.xlsx',leadSheet:'Lead Preview',leadRow:7,campaignSheet:'Campaigns',campaignRow:7}}
  }
  try{
   const result:any=await leadGradingApi.ingest(payload)
   setFixtureResult({request:payload,response:result})
   setNotice({kind:'ok',text:'Synthetic catalogue lead persisted and scored by the backend.'})
   await load()
   setSelected(fixture.name)
  }catch(e:any){
   setNotice(unknownMutation(e)?{kind:'unknown',text:'The fixture-ingestion outcome is unknown. Refresh grading before submitting it again.'}:{kind:'error',text:e?.message||'Catalogue fixture could not be ingested.'})
  }finally{setBusy('')}
 }

 const openActivation=()=>{if(activated?.nextTab)window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:activated.nextTab}))}
 const total=Number(stats?.total||0)
 const dist=[['A · High intent',Number(stats?.aGrade||0)],['B · Strong fit',Math.max(0,Number(stats?.abQuality||0)-Number(stats?.aGrade||0))],['C · Nurture',Number(stats?.cGrade||0)],['D · Low quality',Number(stats?.dGrade||0)]]

 return <>
  <PageHead crumb="Conversion / Lead Grading" title="Lead grading" sub="Score and grade each persisted lead using CRM, journey, behavioral and interaction evidence." action={loading?'Refreshing…':'Refresh'} onAction={()=>{if(!loading)void load()}}/>

  {loading&&!leads.length&&<LoadingState title="Loading lead grading" description="Reading persisted scores, grades, stages and score-driver evidence."/>}
  {notice.text&&notice.kind==='error'&&<ErrorState title="Lead grading action failed" description={notice.text} action={{label:'Refresh grading',onClick:load}}/>}
  {notice.text&&notice.kind==='unknown'&&<StaleState title="Lead grading needs reconciliation" description={notice.text} action={{label:'Refresh authoritative state',onClick:load}}/>}
  {notice.text&&notice.kind==='ok'&&<div className="delivery-notice ok" role="status"><CheckCircle2/><span>{notice.text}</span></div>}

  <section className="app-panel fixture-proof">
   <div className="panel-head"><div><h3>Catalogue fixture → persisted grade</h3><p>One auditable input/output path using the supplied workbook. Values remain editable before submission.</p></div><span className="healthy">Synthetic only</span></div>
   <form onSubmit={ingestFixture}>
    <div className="fixture-fields">
     <label>Lead ID <small>Lead Preview!A7</small><input aria-label="Catalogue lead ID" required value={fixture.leadId} onChange={e=>setFixture(x=>({...x,leadId:e.target.value}))}/></label>
     <label>Display name <small>Lead Preview!E7</small><input aria-label="Catalogue display name" required value={fixture.name} onChange={e=>setFixture(x=>({...x,name:e.target.value}))}/></label>
     <label>Email <small>Lead Preview!F7</small><input aria-label="Catalogue email" required type="email" value={fixture.email} onChange={e=>setFixture(x=>({...x,email:e.target.value}))}/></label>
     <label>CRM stage <small>Lead Preview!G7</small><select aria-label="Catalogue CRM stage" value={fixture.stage} onChange={e=>setFixture(x=>({...x,stage:e.target.value}))}>{['new','contacted','qualified','customer','lost'].map(x=><option key={x}>{x}</option>)}</select></label>
     <label>Marketing consent <small>Lead Preview!H7</small><select aria-label="Catalogue marketing consent" value={fixture.marketingConsent} onChange={e=>setFixture(x=>({...x,marketingConsent:e.target.value}))}>{['granted','denied','revoked'].map(x=><option key={x}>{x}</option>)}</select></label>
     <label>Campaign ID <small>Lead Preview!D7</small><input aria-label="Catalogue campaign ID" required value={fixture.campaignId} onChange={e=>setFixture(x=>({...x,campaignId:e.target.value}))}/></label>
     <label>Campaign name <small>Campaigns!D7</small><input aria-label="Catalogue campaign name" required value={fixture.campaign} onChange={e=>setFixture(x=>({...x,campaign:e.target.value}))}/></label>
     <label>Provider/source <small>Campaigns!E7</small><input aria-label="Catalogue provider source" required value={fixture.source} onChange={e=>setFixture(x=>({...x,source:e.target.value}))}/></label>
    </div>
    <div className="fixture-flow"><span><DatabaseZap/>Workbook cells</span><ArrowRight/><span>POST /api/enrich/upsert</span><ArrowRight/><span>scoreLead v2.0</span><ArrowRight/><span>Persisted lead grade</span></div>
    <button className="app-primary" disabled={!!busy} type="submit">{busy==='fixture'?'Persisting & scoring…':'Use fixture and calculate grade'}</button>
   </form>
   {fixtureResult&&<div className="fixture-result" role="status"><CheckCircle2/><div><b>Backend output: Grade {fixtureResult.response?.grade} · {fixtureResult.response?.score}/100</b><small>Lead {fixtureResult.response?.leadId} · record {fixtureResult.response?.id}</small><small>Request provenance was stored in attributes; the list below was refreshed from GET /api/lead-grading.</small></div></div>}
   <div className="source-conflict-note"><ShieldCheck/><div><b>Mapping boundary</b><p>The workbook explicitly says its schema is neutral. This adapter maps only the labelled cells above to the existing application contract; it does not bulk-import or infer unresolved roles, IDs, or provider contracts.</p></div></div>
  </section>

  <div className="stats-grid">
   <Stat label="A-grade leads" value={stats?.available?String(stats.aGrade||0):'—'} sub="Highest-intent pool" Icon={Target}/>
   <Stat label="A+B quality" value={stats?.available&&total?Math.round(Number(stats.abQuality||0)/total*100)+'%':'—'} sub="Persisted graded leads" Icon={CheckCircle2}/>
   <Stat label="Average score" value={stats?.available?String(stats.averageScore||0):'—'} sub="Explainable v2.0 scoring" Icon={Activity}/>
   <Stat label="Profiles scored" value={stats?.available?String(total):'—'} sub="CRM + journey evidence" Icon={RadioTower}/>
  </div>

  <div className="grading-layout">
   <div className="app-panel grading-list" aria-busy={loading?'true':undefined}>
    <div className="panel-head"><div><h3>Recent graded leads</h3><p>Score, grade and current stage{leads.length>150?' · first 150 rendered':''}</p></div><button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh'}</button></div>
    {visibleLeads.length?visibleLeads.map(x=><button key={x.name} className={selected===x.name?'selected':''} onClick={()=>{setSelected(x.name);setActivated(null);setNotice({kind:'',text:''})}}><span className={'grade grade-'+String(x.grade).toLowerCase()}>{x.grade}</span><div><b>{x.name}</b><small>{x.source} · {x.stage}</small></div><strong>{x.score}/100</strong><ChevronRight/></button>):!loading&&<div className="empty-delivery-state"><Target/><div><b>No graded leads yet</b><small>Lead profiles appear after CRM or first-party identity ingestion.</small></div></div>}
   </div>

   <div className="app-panel grading-detail">
    {current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.reason}</p></div><span className={'grade grade-'+String(current.grade).toLowerCase()}>{current.grade}</span></div>
    <div className="grade-score-card"><Target/><div><span>Quality score</span><strong>{current.score}</strong><small>Grade {current.grade}</small></div><div className="progress"><i style={{width:Math.max(0,Math.min(100,current.score))+'%'}}/></div></div>
    <div className="diagnostic-evidence">{[['Acquisition source',current.source],['CRM stage',current.stage],['Score drivers',String(current.drivers.length)],['Scoring version','v2.0']].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div>
    <div className="agent-section"><h4>Score drivers</h4>{current.drivers.length?current.drivers.slice(0,20).map((x:any)=><div className="score-driver" key={x.key||x.label}><div><b>{x.label}</b><small>{x.evidence}</small></div><strong className={Number(x.points)<0?'negative':''}>{Number(x.points)>0?'+':''}{x.points}</strong></div>):<div className="empty-delivery-state"><Activity/><div><b>No score-driver evidence stored</b></div></div>}</div>
    <div className="grade-actions"><div><span>Manual grade override</span>{['A','B','C','D'].map(g=><button key={g} disabled={!!busy} className={current.grade===g?'active':''} onClick={()=>override(g)}>{busy==='override:'+g?'Saving…':g}</button>)}</div><button className="app-primary" disabled={!!busy} onClick={activate}>{busy==='activate'?<>Activating…</>:activated?<><Check/>Activation created</>:<><RadioTower/>Use grade in activation</>}</button></div>
    {activated&&<div className="grade-activation-result"><CheckCircle2/><div><b>{String(activated.action||'operation').replaceAll('_',' ')}</b><p>{activated.operation?.destination||'Governed downstream action created'} · {activated.operation?.status||activated.status}</p></div><button onClick={openActivation}>Open {activated.nextTab||'operation'} <ArrowRight/></button></div>}
    </>:<div className="empty-delivery-state"><Target/><div><b>Select a graded lead</b></div></div>}
   </div>
  </div>

  <div className="two-col">
   <div className="app-panel"><div className="panel-head"><div><h3>Grade distribution</h3><p>Current persisted lead pool</p></div></div>{total?dist.map((x:any)=><div className="health-line" key={x[0]}><span>{x[0]}</span><div className="progress"><i style={{width:(x[1]/total*100)+'%'}}/></div><b>{Math.round(x[1]/total*100)}%</b></div>):<div className="empty-delivery-state"><Target/><div><b>No distribution available</b></div></div>}</div>
   <div className="app-panel"><div className="panel-head"><div><h3>Grade actions</h3><p>Downstream activation policy</p></div></div>{[['A','Priority sales routing · 2 minute SLA'],['B','Standard sales routing · 5 minute SLA'],['C','Create nurture follow-up task'],['D','Create suppression-review task · continue in Audiences']].map(x=><div className="mapping-rule" key={x[0]}><span>Grade {x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div>
  </div>

  <div className="source-conflict-note"><ShieldCheck/><div><b>Grading integrity</b><p>Scores and grades are displayed from persisted evidence. Overrides and activations are shown as successful only after authoritative backend acknowledgement.</p></div></div>
 </>
}
