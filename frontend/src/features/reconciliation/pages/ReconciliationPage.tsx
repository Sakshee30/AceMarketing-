import {useEffect,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,CheckCircle2,DatabaseZap,RadioTower,ShieldCheck,Target} from 'lucide-react'
import {reconciliationApi as api} from '../data/reconciliation.api'
import {StaleState} from '../../../components/system/FrontendStates'
import {initialMutationLifecycle,mutationLifecycle} from '../../../lib/mutation-lifecycle'
import {QualityPageHead as PageHead,QualityStat as Stat} from '../ui/ReconciliationPrimitives'

export default function ReconciliationPage(){
 const [data,setData]=useState<any>({totals:{},channels:[],issues:[],recentActions:[]})
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState<{kind:'ok'|'error'|'unknown'|'',text:string}>({kind:'',text:''})
 const [actionState,setActionState]=useState(()=>initialMutationLifecycle<any>())
 const load=async()=>{try{setData(await api.load())}catch(e:any){setNotice({kind:'error',text:e?.message||'Reconciliation data could not be loaded.'})}}
 useEffect(()=>{void load()},[])
 useDevelopmentLiveRefresh(()=>load())
 const run=async(issue:string)=>{
  let lifecycle=mutationLifecycle.validating(actionState);setActionState(lifecycle)
  lifecycle=mutationLifecycle.submitting(lifecycle);setActionState(lifecycle)
  setBusy(issue);setNotice({kind:'',text:''})
  try{
   const r:any=await api.run(issue,250)
   setActionState(mutationLifecycle.confirmed(lifecycle,r))
   setNotice({kind:'ok',text:r.detail||'Reconciliation action completed.'})
   await load()
  }catch(e:any){
   const cause=String(e?.details?.cause||'');const requestId=e?.requestId||null
   if(cause==='timeout'||cause==='network'){
    const message='The backend did not confirm whether this reconciliation action was accepted. Refresh reconciliation history before repeating it.'
    setActionState(mutationLifecycle.unknown(lifecycle,message,requestId));setNotice({kind:'unknown',text:message})
   }else if(Number(e?.status)===409){
    const message=e?.message||'Reconciliation state changed before the action could be confirmed. Refresh and try again.'
    setActionState(mutationLifecycle.conflict(lifecycle,message,requestId));setNotice({kind:'error',text:message})
   }else{
    const message=e?.message||'Reconciliation action failed.'
    setActionState(mutationLifecycle.rejected(lifecycle,message,requestId));setNotice({kind:'error',text:message})
   }
  }finally{setBusy('')}
 }
 const t=data.totals||{}
 return <><PageHead crumb="Tracking / Reconciliation" title="Conversion reconciliation center" sub="Explain gaps between tracked events, matched conversions and downstream delivery, then run safe repair actions from one place." action="Refresh" onAction={load}/>
 {notice.kind==='unknown'?<StaleState title="Reconciliation action needs confirmation" description={notice.text} action={{label:'Refresh reconciliation state',onClick:load}}/>:notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}><CheckCircle2/><span>{notice.text}</span></div>}
 <div className="stats-grid"><Stat label="Quality score" value={String(data.score??'—')+(data.score!=null?'/100':'')} sub="Derived from unmatched, failed, duplicate and quarantined evidence" Icon={ShieldCheck}/><Stat label="Unmatched" value={String(t.unmatchedEvents||0)} sub="Attribution events still needing identity resolution" Icon={Target}/><Stat label="Failed delivery" value={String(t.failedDeliveries||0)} sub="Provider signals eligible for retry" Icon={RadioTower}/><Stat label="Quarantined" value={String(t.quarantined||0)} sub="Schema/field validation review queue" Icon={DatabaseZap}/></div>
 <div className="reconciliation-grid"><div className="app-panel"><div className="panel-head"><div><h3>Issue reconciliation</h3><p>Live gaps derived from current workspace state</p></div></div>{(data.issues||[]).map((x:any)=><article className="recon-issue" key={x.key}><span className={'recon-severity '+x.severity}>{x.count}</span><div><b>{x.label}</b><p>{x.detail}</p></div><button disabled={busy===x.key||x.count===0} onClick={()=>run(x.key)}>{busy===x.key?'Working…':x.action==='reprocess'?'Reconcile':x.action==='retry'?'Retry failed':'Queue review'}</button></article>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Destination delivery comparison</h3><p>AceMarketing-sent records only; not provider-reported conversion totals</p></div></div>{(data.channels||[]).length?(data.channels||[]).map((x:any)=><div className="recon-channel" key={x.destination}><div><b>{x.destination}</b><small>{x.total} total · {x.queued} queued · {x.failed} failed</small></div><strong>{x.successRate}%</strong><div className="progress"><i style={{width:Math.min(100,Number(x.successRate||0))+'%'}}/></div></div>):<div className="empty-delivery-state"><RadioTower/><div><b>No provider delivery evidence yet</b><small>Signal delivery comparisons appear after activation begins.</small></div></div>}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Reconciliation evidence</h3><p>Counts used to explain why totals can differ across the funnel</p></div></div><div className="recon-evidence-grid">{[['Tracked events',t.trackedEvents||0],['Assisted events',t.assistedEvents||0],['Matched attribution',t.matchedEvents||0],['Signal deliveries',t.deliveries||0],['Duplicate evidence',t.duplicates||0],['Pending adjustments',t.pendingAdjustments||0]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recent reconciliation actions</h3><p>Persisted repair/review history</p></div></div>{(data.recentActions||[]).length?(data.recentActions||[]).map((x:any)=><div className="agent-run" key={x.id}><Activity/><div><b>{String(x.issue).replaceAll('_',' ')}</b><small>{x.detail}</small></div><span>{x.createdAt?new Date(x.createdAt).toLocaleString():'—'}</span><em className={x.status}>{x.status}</em></div>):<div className="empty-delivery-state"><Activity/><div><b>No reconciliation actions yet</b><small>Run a repair or queue a review to create an audit trail.</small></div></div>}</div>
 </> 
}
