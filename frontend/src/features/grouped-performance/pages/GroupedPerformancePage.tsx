import {useEffect,useMemo,useRef,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,ArrowRight,CheckCircle2,CircleDollarSign,ShieldCheck,Table2,Target} from 'lucide-react'
import {groupedPerformanceApi} from '../data/grouped-performance.api'
import {ErrorState,LoadingState,StaleState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}>{action}</button>}</div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}
type Notice={kind:'ok'|'error'|'unknown'|'',text:string}
const unknownMutation=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))

export default function GroupedPerformancePage(){
 const [dimension,setDimension]=useState('category')
 const [data,setData]=useState<any>({available:false,items:[],totals:{},conversionEvents:[]})
 const [busy,setBusy]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<Notice>({kind:'',text:''})
 const [costDrafts,setCostDrafts]=useState<Record<string,string>>({})
 const [savedDrafts,setSavedDrafts]=useState<Record<string,string>>({})
 const requestSequence=useRef(0)

 const dirty=useMemo(()=>Object.keys(costDrafts).some(key=>(costDrafts[key]??'')!==(savedDrafts[key]??'')),[costDrafts,savedDrafts])
 useDirtyWork({key:'grouped-performance-cost-drafts',label:'Grouped performance cost basis',dirty,scope:'feature'})

 const load=async(next=dimension)=>{
  const requestId=++requestSequence.current
  setLoading(true)
  setNotice(current=>current.kind==='error'?{kind:'',text:''}:current)
  try{
   const r:any=await groupedPerformanceApi.load(next,6)
   if(requestId!==requestSequence.current)return
   setData(r)
   const drafts=Object.fromEntries((r.items||[]).map((x:any)=>[x.key,x.cost==null?'':String(x.cost)]))
   setCostDrafts(drafts)
   setSavedDrafts(drafts)
  }catch(e:any){
   if(requestId===requestSequence.current)setNotice({kind:'error',text:e?.message||'Grouped performance could not be loaded. Existing grouped evidence was preserved.'})
  }finally{
   if(requestId===requestSequence.current)setLoading(false)
  }
 }

 useEffect(()=>{void load(dimension);return()=>{requestSequence.current++}},[dimension])
 useDevelopmentLiveRefresh(()=>load(dimension))

 const money=(n:any)=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})

 const saveCost=async(key:string)=>{
  const raw=(costDrafts[key]??'').trim()
  const parsed=raw===''?null:Number(raw)
  if(parsed!==null&&(!Number.isFinite(parsed)||parsed<0)){
   setNotice({kind:'error',text:'Cost basis must be empty or a valid non-negative number.'})
   return
  }
  setBusy(key)
  setNotice({kind:'',text:''})
  try{
   await groupedPerformanceApi.saveCost(dimension,key,parsed)
   setNotice({kind:'ok',text:raw===''?'Cost basis cleared for '+key+' after backend confirmation.':'Cost basis saved for '+key+' after backend confirmation.'})
   await load(dimension)
  }catch(e:any){
   setNotice(unknownMutation(e)
    ?{kind:'unknown',text:'The cost-save outcome is unknown. Refresh authoritative grouped-performance state before saving the same cost again.'}
    :{kind:'error',text:e?.message||'Cost basis could not be saved.'}
   )
  }finally{setBusy('')}
 }

 const dims=[['category','Category'],['productCategory','Product category'],['product','Product / SKU'],['brand','Brand'],['source','Acquisition source'],['campaign','Campaign']]
 const t=data.totals||{}
 const rows=(data.items||[]).slice(0,150)

 return <>
  <PageHead crumb="Measurement / Grouped Performance" title="Grouped performance" sub="Group first-party conversion evidence by product, category, brand, source or campaign, and add optional cost inputs to calculate contribution without inventing margin." action={loading?'Refreshing…':'Refresh'} onAction={()=>{if(!loading)void load(dimension)}}/>

  {loading&&!data.available&&!rows.length&&<LoadingState title="Loading grouped performance" description="Reading grouped conversion, revenue and cost-basis evidence."/>}
  {notice.text&&notice.kind==='error'&&<ErrorState title="Grouped performance action failed" description={notice.text} action={{label:'Refresh grouped performance',onClick:()=>load(dimension)}}/>}
  {notice.text&&notice.kind==='unknown'&&<StaleState title="Cost basis needs reconciliation" description={notice.text} action={{label:'Refresh authoritative state',onClick:()=>load(dimension)}}/>}
  {notice.text&&notice.kind==='ok'&&<div className="delivery-notice ok" role="status"><CheckCircle2/><span>{notice.text}</span></div>}

  <div className="stats-grid">
   <Stat label="Groups" value={String((data.items||[]).length)} sub={dims.find(x=>x[0]===dimension)?.[1]||dimension} Icon={Table2}/>
   <Stat label="Conversions" value={String(t.conversions||0)} sub={(t.conversionRate||0)+'% conversion rate'} Icon={Target}/>
   <Stat label="Attributed revenue" value={money(t.revenue)} sub="Configured conversion-event value only" Icon={CircleDollarSign}/>
   <Stat label="Contribution" value={t.contribution==null?'—':money(t.contribution)} sub={t.costedGroups?String(t.costedGroups)+' groups with explicit cost basis':'Enter costs to calculate contribution'} Icon={Activity}/>
  </div>

  <div className="grouped-performance-hero app-panel">
   <div><Table2/><div><span>EVIDENCE-BASED GROUPING</span><h3>First-party events → grouped conversion evidence → optional contribution view</h3><p>Revenue is counted only from configured conversion events. Contribution and margin appear only for groups where an operator explicitly supplies cost.</p></div></div>
   <div className="grouped-dimension-picker">{dims.map(([key,label])=><button key={key} disabled={loading} className={dimension===key?'selected':''} onClick={()=>setDimension(key)}>{label}</button>)}</div>
  </div>

  <div className="app-panel" aria-busy={loading?'true':undefined}>
   <div className="panel-head"><div><h3>Grouped performance table</h3><p>{data.available?'Built from persisted first-party events':'Waiting for persisted event evidence'}{(data.items||[]).length>150?' · newest 150 groups rendered':''}</p></div><span className="status">{(data.conversionEvents||[]).length} configured conversion events</span></div>
   <div className="grouped-performance-table"><table><thead><tr><th>Group</th><th>Subjects</th><th>Events</th><th>Conversions</th><th>Conv. rate</th><th>Revenue</th><th>Cost basis</th><th>Contribution</th><th>Margin</th></tr></thead><tbody>{rows.length?rows.map((x:any)=><tr key={x.key}><td><b>{x.key}</b></td><td>{Number(x.subjects||0).toLocaleString('en-IN')}</td><td>{Number(x.events||0).toLocaleString('en-IN')}</td><td>{Number(x.conversions||0).toLocaleString('en-IN')}</td><td>{x.conversionRate||0}%</td><td>{money(x.revenue)}</td><td><div className="grouped-cost-editor"><input aria-label={'Cost basis for '+x.key} type="number" min="0" step="0.01" value={costDrafts[x.key]??''} onChange={e=>setCostDrafts({...costDrafts,[x.key]:e.target.value})} placeholder="Optional"/><button disabled={busy===x.key} onClick={()=>saveCost(x.key)}>{busy===x.key?'Saving…':'Save'}</button></div></td><td>{x.contribution==null?'—':money(x.contribution)}</td><td>{x.marginRate==null?'—':x.marginRate+'%'}</td></tr>):<tr><td colSpan={9}>No grouped evidence yet. Track events with category, product, brand, source or campaign fields to populate this view.</td></tr>}</tbody></table></div>
  </div>

  <div className="two-col">
   <div className="app-panel"><div className="panel-head"><div><h3>Conversion event contract</h3><p>Only these events count as conversions and attributed revenue</p></div></div><div className="context-chips">{(data.conversionEvents||[]).length?(data.conversionEvents||[]).slice(0,100).map((x:string)=><span key={x}>{x}</span>):<span>No conversion event contract available</span>}</div></div>
   <div className="app-panel"><div className="panel-head"><div><h3>Cost & margin boundary</h3><p>What this workspace will and will not calculate</p></div></div>{[['Revenue','Observed value on configured conversion events'],['Cost','Only operator-entered cost basis'],['Contribution','Revenue minus explicit cost'],['Margin %','Only when revenue and cost are both available'],['Missing P&L data','Shown as —, never inferred']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div>
  </div>

  {dirty&&<div className="source-conflict-note"><ShieldCheck/><div><b>Unsaved cost basis changes</b><p>Save each changed cost before leaving this feature. Navigation protection is active while local drafts differ from authoritative values.</p></div></div>}
 </>
}
