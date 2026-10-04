import {useEffect,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Check,CheckCircle2,ChevronRight,CircleDollarSign,ShieldCheck,UsersRound,X} from 'lucide-react'
import {fraudApi as api} from '../data/fraud.api'
import {StaleState} from '../../../components/system/FrontendStates'
import {initialMutationLifecycle,mutationLifecycle} from '../../../lib/mutation-lifecycle'
import {QualityPageHead as PageHead,QualityStat as Stat} from '../ui/FraudPrimitives'

export default function FraudPage(){
 const [data,setData]=useState<any>({items:[],blocked:[],reviews:[]})
 const [selected,setSelected]=useState('')
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState<{kind:'ok'|'error'|'unknown'|'',text:string}>({kind:'',text:''})
 const [actionState,setActionState]=useState(()=>initialMutationLifecycle<any>())
 const load=()=>api.load().then((r:any)=>{setData(r);if(r.items?.length)setSelected((x:string)=>x&&r.items.some((i:any)=>i.key===x)?x:r.items[0].key)}).catch((e:any)=>setNotice({kind:'error',text:e?.message||'Fraud and noise signals could not be loaded.'}))
 useEffect(()=>{void load()},[])
 useDevelopmentLiveRefresh(()=>load())
 const current=(data.items||[]).find((x:any)=>x.key===selected)||data.items?.[0]
 const runAction=async(kind:'block'|'review',name:string)=>{
  let lifecycle=mutationLifecycle.validating(actionState);setActionState(lifecycle)
  lifecycle=mutationLifecycle.submitting(lifecycle);setActionState(lifecycle)
  setBusy(kind);setNotice({kind:'',text:''})
  try{
   const result=kind==='block'?await api.block(name):await api.review(name)
   setActionState(mutationLifecycle.confirmed(lifecycle,result))
   setNotice({kind:'ok',text:kind==='block'?'Optimization block confirmed.':'Human-review request confirmed.'})
   await load()
  }catch(e:any){
   const cause=String(e?.details?.cause||'');const requestId=e?.requestId||null
   if(cause==='timeout'||cause==='network'){
    const message='The backend did not confirm whether this fraud/noise action was accepted. Refresh current control state before repeating it.'
    setActionState(mutationLifecycle.unknown(lifecycle,message,requestId));setNotice({kind:'unknown',text:message})
   }else if(Number(e?.status)===409){
    const message=e?.message||'Fraud/noise state changed before the action could be confirmed. Refresh and try again.'
    setActionState(mutationLifecycle.conflict(lifecycle,message,requestId));setNotice({kind:'error',text:message})
   }else{
    const message=e?.message||'Fraud/noise action could not be completed.'
    setActionState(mutationLifecycle.rejected(lifecycle,message,requestId));setNotice({kind:'error',text:message})
   }
  }finally{setBusy('')}
 }
 const blockedNames=new Set((data.blocked||[]).map((x:any)=>x.pattern))
 const reviewNames=new Set((data.reviews||[]).map((x:any)=>x.pattern))
 return <><PageHead crumb="Quality / Fraud" title="Fraud & noise detection" sub="Detect and explicitly control suspicious or low-quality first-party activity without fabricating traffic volumes."/>
 {notice.kind==='unknown'?<StaleState title="Fraud control action needs reconciliation" description={notice.text} action={{label:'Refresh fraud controls',onClick:load}}/>:notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}><ShieldCheck/><span>{notice.text}</span></div>}
 <div className="stats-grid"><Stat label="Detected patterns" value={String((data.items||[]).length)} sub="Current workspace evidence" Icon={ShieldCheck}/><Stat label="Blocked patterns" value={String((data.blocked||[]).length)} sub="Persisted optimization blocks" Icon={X}/><Stat label="Review queue" value={String((data.reviews||[]).length)} sub="Human-review requests" Icon={UsersRound}/><Stat label="Control mode" value="Human + rules" sub="No silent auto-blocking" Icon={CircleDollarSign}/></div>
 <div className="fraud-layout"><div className="app-panel fraud-list"><div className="panel-head"><div><h3>Detected patterns</h3><p>Derived from lead scoring and recent first-party events</p></div><button onClick={load}>Refresh</button></div>{(data.items||[]).length?(data.items||[]).map((x:any)=><button key={x.key} className={selected===x.key?'selected':''} onClick={()=>setSelected(x.key)}><ShieldCheck/><div><b>{x.name||x.key}</b><small>{x.source} · {Number(x.affected||0).toLocaleString('en-IN')} affected</small></div><span className={String(x.severity||'info').toLowerCase()}>{x.severity||'info'}</span><ChevronRight/></button>):<div className="empty-delivery-state"><CheckCircle2/><div><b>No active fraud/noise patterns</b><small>No persisted scoring or high-velocity evidence currently crosses the configured heuristics.</small></div></div>}</div>
 <div className="app-panel fraud-detail">{current?<><div className="panel-head"><div><h3>{current.name||current.key}</h3><p>{current.description}</p></div><span className={'diag-severity '+String(current.severity||'info').toLowerCase()}>{current.severity||'Info'}</span></div><div className="diagnostic-evidence">{[['Source',current.source||'—'],['Affected volume',String(current.affected||0)],['Detection method','Persisted evidence'],['Signal action','Explicit block or review only']].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div><div className="approval-actions"><button disabled={busy==='review'} onClick={()=>runAction('review',current.name||current.key)}>{reviewNames.has(current.name||current.key)?<><Check/>Review queued</>:<>Send to review</>}</button><button className="approve" disabled={busy==='block'} onClick={()=>runAction('block',current.name||current.key)}>{blockedNames.has(current.name||current.key)?<><Check/>Rule active</>:<><ShieldCheck/>Block from optimization</>}</button></div></>:<div className="empty-delivery-state"><ShieldCheck/><div><b>No pattern selected</b></div></div>}</div></div></>
}
