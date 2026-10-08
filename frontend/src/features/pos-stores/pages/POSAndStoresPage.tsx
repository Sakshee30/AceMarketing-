import {useEffect,useState} from 'react'
import {beginLoading,useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Building2,CheckCircle2,ChevronRight,CircleDollarSign,RadioTower,ShieldCheck,Sparkles,Target,X} from 'lucide-react'
import {posStoresApi} from '../data/pos-stores.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {LoadingState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}</div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}
type Notice={kind:'ok'|'error'|'unknown'|'',text:string}
const unknownMutation=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))

export default function POSAndStoresPage(){
 const [data,setData]=useState<any>({locations:[],totals:{},recent:[]})
 const [selected,setSelected]=useState('')
 const [builder,setBuilder]=useState(false)
 const [busy,setBusy]=useState(false)
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<Notice>({kind:'',text:''})

 useDirtyWork({key:'pos-import-draft',label:'POS transaction import',dirty:builder,scope:'feature'})

 const load=async()=>{
  beginLoading(setLoading)
  try{
   const r:any=await posStoresApi.load()
   setData(r)
   if(r.locations?.length)setSelected((x:string)=>x&&r.locations.some((i:any)=>i.id===x)?x:r.locations[0].id)
   else setSelected('')
   setNotice(n=>n.kind==='error'?{kind:'',text:''}:n)
  }catch(e:any){
   setNotice({kind:'error',text:e?.message||'POS & Stores could not be loaded. Existing offline evidence was preserved.'})
  }finally{setLoading(false)}
 }

 useEffect(()=>{void load()},[])
 useDevelopmentLiveRefresh(()=>load())

 const current=(data.locations||[]).find((x:any)=>x.id===selected)||data.locations?.[0]

 const parseCsvLine=(line:string)=>{
  const out:string[]=[]
  let value='',quoted=false
  for(let i=0;i<line.length;i++){
   const ch=line[i]
   if(ch==='"'){
    if(quoted&&line[i+1]==='"'){value+='"';i++}
    else quoted=!quoted
   }else if(ch===','&&!quoted){out.push(value.trim());value=''}
   else value+=ch
  }
  out.push(value.trim())
  return out
 }

 const parseCsv=(raw:string)=>{
  const csvLines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)
  if(csvLines.length<2)throw new Error('Paste a CSV header and at least one transaction row.')
  const headers=parseCsvLine(csvLines[0])
  const required=['transaction_id','net_revenue','occurred_at']
  for(const key of required)if(!headers.includes(key))throw new Error('CSV must include '+required.join(', '))
  return csvLines.slice(1).map((line,index)=>{
   const values=parseCsvLine(line)
   const row:any={}
   headers.forEach((h,i)=>row[h]=values[i]??'')
   if(!row.transaction_id)row.transaction_id='row_'+(index+1)
   const revenue=Number(row.net_revenue||0)
   if(!Number.isFinite(revenue)||revenue<0)throw new Error('Row '+(index+2)+' has an invalid net_revenue value.')
   if(Number.isNaN(Date.parse(row.occurred_at)))throw new Error('Row '+(index+2)+' has an invalid occurred_at timestamp.')
   return {
    transactionId:row.transaction_id,
    customerId:row.customer_id||'',
    email:row.email||'',
    phone:row.phone||'',
    netRevenue:revenue,
    currency:row.currency||'INR',
    occurredAt:row.occurred_at,
    gclid:row.gclid||'',
    fbclid:row.fbclid||'',
    msclkid:row.msclkid||'',
    ttclid:row.ttclid||'',
    twclid:row.twclid||''
   }
  })
 }

 const upload=async(e:any)=>{
  e.preventDefault()
  const f=new FormData(e.currentTarget)
  setBusy(true)
  setNotice({kind:'',text:''})
  try{
   const transactions=parseCsv(String(f.get('csv')||''))
   const r:any=await posStoresApi.importBatch({
    location:String(f.get('location')||''),
    locationName:String(f.get('locationName')||''),
    transactions,
    currency:'INR'
   })
   setBuilder(false)
   setNotice({kind:'ok',text:'POS batch processed after backend confirmation: '+r.matched+' matched, '+r.unmatched+' unmatched from '+r.records+' transaction(s).'})
   await load()
  }catch(err:any){
   setNotice(unknownMutation(err)
    ?{kind:'unknown',text:'The POS import outcome is unknown because the acknowledgement was lost. Refresh authoritative POS state before importing the same batch again.'}
    :{kind:'error',text:err?.message||'POS import failed.'}
   )
  }finally{setBusy(false)}
 }

 const downloadTemplate=()=>{
  const csv='transaction_id,customer_id,email,phone,net_revenue,currency,occurred_at,gclid,fbclid,msclkid,ttclid,twclid\nTXN-001,cust_001,,,84000,INR,2026-09-25T10:00:00Z,,,,,\n'
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
  const a=document.createElement('a')
  a.href=url
  a.download='ace-pos-import-template.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
 }

 const totals=data.totals||{}
 const matchRate=Number(totals.transactions||0)?Number(totals.matched||0)/Number(totals.transactions||0)*100:null
 const recent=(data.recent||[]).slice(0,100)

 return <>
  <PageHead crumb="Offline / POS & Stores" title="POS, walk-in & store-sale attribution" sub="Import transaction-level offline sales and compute match coverage from actual first-party identity reconciliation." action="Import POS batch" onAction={()=>setBuilder(true)}/>

  {loading&&!data.locations?.length&&!data.recent?.length&&<LoadingState title="Loading POS & Stores" description="Reading offline transaction, location and match evidence."/>}
  {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':notice.kind==='unknown'?'warning':'ok')} role={notice.kind==='error'?'alert':'status'}>{notice.kind==='ok'?<CheckCircle2/>:<ShieldCheck/>}<span>{notice.text}</span>{notice.kind!=='ok'&&<button onClick={load}>Refresh authoritative state</button>}</div>}

  <div className="stats-grid">
   <Stat label="Store transactions" value={Number(totals.transactions||0).toLocaleString('en-IN')} sub="Persisted imported transaction rows" Icon={Building2}/>
   <Stat label="Offline revenue" value={'₹'+Number(totals.revenue||0).toLocaleString('en-IN')} sub="Summed transaction revenue" Icon={CircleDollarSign}/>
   <Stat label="Identity match rate" value={matchRate==null?'—':matchRate.toFixed(1)+'%'} sub="Computed by attribution reconciliation" Icon={Target}/>
   <Stat label="Import batches" value={String(totals.imports||0)} sub="Persisted offline batches" Icon={RadioTower}/>
  </div>

  <div className="pos-layout">
   <div className="app-panel pos-list" aria-busy={loading?'true':undefined}>
    <div className="panel-head"><div><h3>Store / offline sources</h3><p>Location-level import state</p></div><button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh'}</button></div>
    {(data.locations||[]).length?(data.locations||[]).map((x:any)=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><Building2/><div><b>{x.name}</b><small>{x.id} · {Number(x.transactions||0).toLocaleString('en-IN')} transactions</small></div><strong>{Number(x.matchRate||0).toFixed(1)}%</strong><span className={x.status==='healthy'?'healthy':'status'}>{x.status}</span><ChevronRight/></button>):!loading&&<div className="empty-delivery-state"><Building2/><div><b>No POS imports yet</b><small>Import a transaction-level batch to populate offline attribution.</small></div></div>}
   </div>
   <div className="app-panel pos-detail">
    {current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.id} · {Number(current.transactions||0).toLocaleString('en-IN')} transactions · ₹{Number(current.revenue||0).toLocaleString('en-IN')}</p></div><span className="status">{Number(current.matchRate||0).toFixed(1)}% matched</span></div><div className="site-detail-grid">{[['Imports',current.imports||0],['Matched records',current.matched||0],['Unmatched records',Math.max(0,Number(current.transactions||0)-Number(current.matched||0))],['Last import',current.lastImportAt?new Date(current.lastImportAt).toLocaleString():'—'],['Matching keys','Customer ID · email · phone · GCLID · FBCLID'],['Import method','Transaction CSV → assisted attribution']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><div className="approval-actions"><button onClick={downloadTemplate}>Download import template</button><button className="approve" onClick={()=>setBuilder(true)}><Building2/>Import POS batch</button></div></>:<div className="empty-delivery-state"><Building2/><div><b>No store selected</b></div></div>}
   </div>
  </div>

  <div className="app-panel"><div className="panel-head"><div><h3>Recent import batches</h3><p>Persisted offline ingestion history with computed match outcomes</p></div></div>{recent.length?recent.map((x:any)=><div className="pos-transaction-row" key={x.batchId}><code>{x.batchId}</code><strong>{Number(x.records||0).toLocaleString('en-IN')} records</strong><span>{x.location}</span><span>₹{Number(x.revenue||0).toLocaleString('en-IN')}</span><em className={Number(x.unmatched||0)>0?'status':'matched'}>{Number(x.matched||0)} matched · {Number(x.unmatched||0)} unmatched</em></div>):!loading&&<div className="empty-delivery-state"><Building2/><div><b>No import history yet</b></div></div>}</div>

  {builder&&<AccessibleDialog ariaLabel="Import POS transactions" onClose={()=>setBuilder(false)}><form className="connector-card" onSubmit={upload}><div className="connector-modal-head"><div><Building2/><div><b>Import POS transactions</b><small>Each row is reconciled against first-party identity evidence; match count is computed by the backend.</small></div></div><button type="button" aria-label="Close POS import" onClick={()=>setBuilder(false)}><X/></button></div><label>Store ID<input name="location" required defaultValue={current?.id||''} placeholder="STORE-01"/></label><label>Store name<input name="locationName" required defaultValue={current?.name||''} placeholder="MG Road Store"/></label><label>CSV transactions<textarea name="csv" required rows={9} defaultValue={'transaction_id,customer_id,email,phone,net_revenue,currency,occurred_at,gclid,fbclid\nTXN-001,cust_001,,,84000,INR,2026-09-25T10:00:00Z,,'}/><small>Required columns: transaction_id, net_revenue, occurred_at. Add customer/contact/click identifiers when available.</small></label><button type="button" onClick={downloadTemplate}>Download template</button><button disabled={busy}>{busy?'Importing & matching…':'Process transaction batch'}</button></form></AccessibleDialog>}
 </>
}
