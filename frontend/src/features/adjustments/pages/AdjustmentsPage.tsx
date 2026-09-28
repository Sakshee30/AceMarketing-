import {useEffect,useState} from 'react'
import {Activity,ArrowRight,Check,CheckCircle2,ChevronRight,CircleDollarSign,ShieldCheck,X} from 'lucide-react'
import {adjustmentsApi as api} from '../data/adjustments.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {StaleState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'
import {TrackingPageHead as PageHead,TrackingStat as Stat} from '../ui/AdjustmentPrimitives'

export default function AdjustmentsPage(){
 const [items,setItems]=useState<any[]>([])
 const [selected,setSelected]=useState('')
 const [preview,setPreview]=useState<any>(null)
 const [busy,setBusy]=useState('')
 const [builder,setBuilder]=useState(false)
 const [notice,setNotice]=useState('')
 const [uncertain,setUncertain]=useState(false)
 useDirtyWork({key:'adjustment-draft',label:'Conversion adjustment draft',dirty:builder,scope:'feature'})
 const load=()=>api.adjustments().then((r:any)=>{const mapped=(r.items||[]).map((x:any)=>({...x,event:String(x.event||'').replaceAll('_',' ').replace(/\b\w/g,(m:string)=>m.toUpperCase()),source:String(x.source||'').replaceAll('_',' / '),destination:String(x.destination||'').replaceAll('_',' '),from:x.fromValue??'—',to:x.toValue??'—',status:String(x.status||'pending').replace(/^./,(m:string)=>m.toUpperCase())}));setItems(mapped);setSelected(x=>x&&mapped.some((y:any)=>y.id===x)?x:(mapped[0]?.id||''))}).catch((e:any)=>{setItems([]);setNotice(e?.message||'Adjustments could not be loaded.')})
 useEffect(()=>{load()},[])
 const current=items.find(x=>x.id===selected)||items[0]
 const apply=async(id:string)=>{setBusy('apply');setNotice('');setUncertain(false);try{await api.applyAdjustment(id);setNotice('Adjustment applied and audit state updated.');await load();setPreview(null)}catch(e:any){const cause=String(e?.details?.cause||'');if(cause==='timeout'||cause==='network'){setUncertain(true);setNotice('The backend did not confirm whether this adjustment was applied. Refresh adjustment state before applying it again.')}else setNotice(e?.message||'Adjustment could not be applied.')}finally{setBusy('')}}
 const showPreview=async(id:string)=>{setBusy('preview');setNotice('');try{const r:any=await api.previewAdjustment(id);setPreview(r)}catch(e:any){setNotice(e?.message||'Preview could not be generated.')}finally{setBusy('')}}
 const create=async(e:any)=>{
  e.preventDefault();const fd=new FormData(e.currentTarget);setBusy('create');setNotice('');setUncertain(false)
  try{
   const r:any=await api.createAdjustment({
    event:String(fd.get('event')||''),
    source:String(fd.get('source')||''),
    destination:String(fd.get('destination')||''),
    fromValue:String(fd.get('fromValue')||''),
    toValue:String(fd.get('toValue')||''),
    currency:String(fd.get('currency')||'INR'),
    reason:String(fd.get('reason')||'')
   })
   setBuilder(false);setNotice('Adjustment created in pending state.');await load();if(r?.item?.id)setSelected(r.item.id)
  }catch(err:any){const cause=String(err?.details?.cause||'');if(cause==='timeout'||cause==='network'){setUncertain(true);setNotice('The backend did not confirm whether this adjustment was created. Refresh the queue before submitting the same correction again.')}else setNotice(err?.message||'Adjustment could not be created.')}finally{setBusy('')}
 }
 const money=(v:any,currency='INR')=>typeof v==='number'?new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:0}).format(v):String(v)
 return <><PageHead crumb="AdSync / Adjustments" title="Conversion adjustments" sub="Correct partial, returned, duplicate or low-quality outcomes before ad platforms learn from them." action="New adjustment" onAction={()=>setBuilder(true)}/>
 {uncertain&&notice?<StaleState title="Adjustment action needs reconciliation" description={notice} action={{label:'Refresh adjustments',onClick:load}}/>:notice&&<div className={'delivery-notice '+(notice.toLowerCase().includes('could not')?'error':'ok')} role={notice.toLowerCase().includes('could not')?'alert':'status'}>{notice.toLowerCase().includes('could not')?<ShieldCheck/>:<CheckCircle2/>}<span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Adjustment records" value={String(items.length)} sub="Persisted workspace corrections" Icon={CircleDollarSign}/><Stat label="Pending" value={String(items.filter(x=>x.status==='Pending').length)} sub="Awaiting application" Icon={Activity}/><Stat label="Applied" value={String(items.filter(x=>x.status==='Applied').length)} sub="Audited corrections" Icon={CheckCircle2}/><Stat label="Preview safety" value="Enabled" sub="Inspect payload before apply" Icon={ShieldCheck}/></div>
 <div className="adjustments-layout"><div className="app-panel adjustment-list"><div className="panel-head"><div><h3>Conversion adjustments</h3><p>Persisted reclassification and value-correction queue</p></div><button onClick={load}>Refresh</button></div>{items.length?items.map(x=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>{setSelected(x.id);setPreview(null)}}><CircleDollarSign/><div><b>{x.event}</b><small>{x.source} → {x.destination}</small></div><span className={x.status.toLowerCase()}>{x.status}</span><ChevronRight/></button>):<div className="empty-delivery-state"><CircleDollarSign/><div><b>No adjustments yet</b><small>Create a correction only when a real business outcome changes. AceMarketing no longer seeds example adjustments into an empty workspace.</small></div></div>}</div>
 {current&&<div className="app-panel adjustment-detail"><div className="panel-head"><div><h3>{current.event}</h3><p>{current.reason||'Business outcome correction'}</p></div><span className={current.status==='Applied'?'healthy':'status'}>{current.status}</span></div><div className="adjustment-value-flow"><div><span>Original outcome</span><b>{money(current.from,current.currency)}</b></div><ArrowRight/><div><span>Adjusted outcome</span><b>{money(current.to,current.currency)}</b></div></div><div className="diagnostic-evidence">{[['Adjustment ID',current.id],['Source',current.source],['Destination',current.destination],['Created',current.createdAt?new Date(current.createdAt).toLocaleString():'—']].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div>{preview&&<div className="code-block adjustment-preview"><code>{JSON.stringify(preview.payload,null,2)}</code></div>}{current.status!=='Applied'?<div className="approval-actions"><button disabled={busy==='preview'} onClick={()=>showPreview(current.id)}>{busy==='preview'?'Generating…':'Preview payload'}</button><button className="approve" disabled={busy==='apply'} onClick={()=>apply(current.id)}><Check/>{busy==='apply'?'Applying…':'Apply adjustment'}</button></div>:<div className="approval-final approved"><Check/><b>Adjustment applied</b></div>}</div>}</div>
 {builder&&<AccessibleDialog ariaLabel="Create conversion adjustment" onClose={()=>setBuilder(false)}><form className="connector-card" onSubmit={create}><div className="connector-modal-head"><div><CircleDollarSign/><div><b>New conversion adjustment</b><small>Create a real pending correction from a changed business outcome.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Event<input name="event" required placeholder="partial_payment"/></label><label>Source<input name="source" required placeholder="crm_billing"/></label><label>Destination<select name="destination"><option value="google_ads">Google Ads</option><option value="meta_ads">Meta Ads</option><option value="webhook">Webhook</option></select></label><div className="two-col"><label>Original value<input name="fromValue" placeholder="15000 or lead"/></label><label>Adjusted value<input name="toValue" placeholder="84000 or excluded"/></label></div><label>Currency<input name="currency" defaultValue="INR"/></label><label>Reason<textarea name="reason" required placeholder="Final payment received, return processed, duplicate identified..."/></label><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create adjustment'}</button></form></AccessibleDialog>}</>
}