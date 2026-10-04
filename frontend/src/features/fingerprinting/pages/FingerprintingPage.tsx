import {useEffect,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,ArrowRight,ChevronRight,MousePointer2,Network,ShieldCheck,X} from 'lucide-react'
import {fingerprintingApi} from '../data/fingerprinting.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {ErrorState,LoadingState,StaleState} from '../../../components/system/FrontendStates'

function PageHead({crumb,title,sub}:{crumb:string,title:string,sub:string}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div></div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}
type Notice={kind:'error'|'unknown'|'',text:string}
const unknownMutation=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))

const labels:any={
 third_party_checkout:['Third-party checkout','www → checkout → confirmation'],
 whatsapp_handoff:['WhatsApp handoff','website → WhatsApp → CRM'],
 call_handoff:['Call handoff','website → call center → CRM'],
 returning_device:['Returning device','anonymous visit → known lead']
}

export default function FingerprintingPage(){
 const [data,setData]=useState<any>({scenarios:[]})
 const [selected,setSelected]=useState('')
 const [test,setTest]=useState<any>(null)
 const [matches,setMatches]=useState<any[]>([])
 const [matchOpen,setMatchOpen]=useState(false)
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState<Notice>({kind:'',text:''})

 const load=async()=>{
  setLoading(true)
  try{
   const result:any=await fingerprintingApi.load()
   setData(result)
   setSelected((current:string)=>current&&result.scenarios?.some((scenario:any)=>scenario.name===current)?current:(result.scenarios?.[0]?.name||''))
   setNotice(current=>current.kind==='error'?{kind:'',text:''}:current)
  }catch(error:any){
   setNotice({kind:'error',text:error?.message||'Continuity evidence could not be loaded. Existing evidence was preserved.'})
  }finally{setLoading(false)}
 }

 useEffect(()=>{void load()},[])
 useDevelopmentLiveRefresh(()=>load())
 const current=(data.scenarios||[]).find((item:any)=>item.name===selected)||data.scenarios?.[0]

 const run=async()=>{
  if(!current)return
  setBusy('test');setNotice({kind:'',text:''})
  try{
   const result:any=await fingerprintingApi.test(current.name)
   setTest(result)
   await load()
  }catch(error:any){
   setNotice(unknownMutation(error)
    ?{kind:'unknown',text:'The continuity-test outcome is unknown because the acknowledgement was lost. Refresh authoritative evidence before repeating the test.'}
    :{kind:'error',text:error?.message||'Continuity test failed.'}
   )
  }finally{setBusy('')}
 }

 const viewMatches=async()=>{
  setBusy('matches');setNotice({kind:'',text:''})
  try{
   const result:any=await fingerprintingApi.matches()
   setMatches(result.items||[])
   setMatchOpen(true)
  }catch(error:any){
   setNotice({kind:'error',text:error?.message||'Match log could not be loaded.'})
  }finally{setBusy('')}
 }

 return <>
  <PageHead crumb="Tracking / Fingerprinting" title="Cross-domain journey continuity" sub="Measure first-party continuity using actual click/session, assisted-event and device identity evidence."/>

  {loading&&!data.scenarios?.length&&<LoadingState title="Loading journey continuity" description="Reading deterministic continuity scenarios and first-party match evidence."/>}
  {notice.text&&notice.kind==='error'&&<ErrorState title="Fingerprinting action failed" description={notice.text} action={{label:'Refresh continuity evidence',onClick:load}}/>}
  {notice.text&&notice.kind==='unknown'&&<StaleState title="Continuity test needs reconciliation" description={notice.text} action={{label:'Refresh authoritative evidence',onClick:load}}/>}

  <div className="stats-grid">
   <Stat label="Continuity rate" value={data.continuityRate==null?'—':data.continuityRate+'%'} sub="Matched assisted events" Icon={Network}/>
   <Stat label="Ambiguous / unmatched" value={data.ambiguousRate==null?'—':data.ambiguousRate+'%'} sub="Persisted unmatched evidence" Icon={Activity}/>
   <Stat label="Scenarios with evidence" value={String((data.scenarios||[]).filter((item:any)=>Number(item.evidence||0)>0).length)} sub="No fabricated test coverage" Icon={ShieldCheck}/>
   <Stat label="Identity modes" value="Session + device" sub="First-party keys only" Icon={MousePointer2}/>
  </div>

  <div className="fingerprint-layout">
   <div className="app-panel fingerprint-list" aria-busy={loading?'true':undefined}>
    <div className="panel-head"><div><h3>Continuity scenarios</h3><p>Evidence currently available in the workspace</p></div><button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh'}</button></div>
    {(data.scenarios||[]).length?(data.scenarios||[]).map((item:any)=><button key={item.name} className={selected===item.name?'selected':''} onClick={()=>{setSelected(item.name);setTest(null)}}><MousePointer2/><div><b>{labels[item.name]?.[0]||item.name}</b><small>{labels[item.name]?.[1]||'first-party handoff'}</small></div><strong>{item.matchRate==null?'—':item.matchRate+'%'}</strong><ChevronRight/></button>):!loading&&<div className="empty-delivery-state"><Network/><div><b>No continuity scenarios available</b><small>Scenario cards appear only when supported first-party handoff evidence is available.</small></div></div>}
   </div>

   <div className="app-panel fingerprint-detail">
    {current?<><div className="panel-head"><div><h3>{labels[current.name]?.[0]||current.name}</h3><p>{Number(current.evidence||0).toLocaleString('en-IN')} evidence record(s) available.</p></div><span className={current.evidence?'healthy':'status'}>{current.evidence?'Evidence available':'No evidence yet'}</span></div>
    <div className="fingerprint-flow">{(labels[current.name]?.[1]||'identity → match').split(' → ').map((item:string,index:number,items:string[])=><div key={item}><span>{index+1}</span><b>{item}</b>{index<items.length-1&&<ArrowRight/>}</div>)}</div>
    <div className="approval-actions"><button disabled={busy==='matches'} onClick={viewMatches}>{busy==='matches'?'Loading matches…':'View match log'}</button><button className="approve" disabled={busy==='test'} onClick={run}><Activity/>{busy==='test'?'Testing…':test?.scenario===current.name?(test.status==='evidence_available'?'Evidence verified':'No evidence found'):'Run continuity test'}</button></div>
    </>:<div className="empty-delivery-state"><Network/><div><b>No continuity scenarios available</b></div></div>}
   </div>
  </div>

  {matchOpen&&<AccessibleDialog ariaLabel="Recent deterministic matches" onClose={()=>setMatchOpen(false)}><div className="connector-card"><div className="connector-modal-head"><div><Network/><div><b>Recent deterministic matches</b><small>Persisted attribution matches</small></div></div><button aria-label="Close deterministic matches" onClick={()=>setMatchOpen(false)}><X/></button></div>{matches.length?<div className="debug-event-list">{matches.map((item:any)=><div className="developer-event-row" key={item.id}><code>{item.id}</code><span>{item.event_type} · {item.match_method||'matched'}</span><strong>{item.match_confidence??'—'}</strong></div>)}</div>:<div className="empty-delivery-state"><Network/><div><b>No recent matched attribution events</b></div></div>}</div></AccessibleDialog>}
 </>
}
