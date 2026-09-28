import {useEffect,useState} from 'react'
import {Activity,ArrowRight,Cable,CheckCircle2,RadioTower,ShieldCheck,Sparkles} from 'lucide-react'
import {deliveryApi as api} from '../data/delivery.api'
import {StaleState} from '../../../components/system/FrontendStates'
import {FeaturePageHead as PageHead,FeatureStat as Stat} from '../ui/DeliveryPrimitives'

export default function DeliveryCenterPage(){
 const [items,setItems]=useState<any[]>([])
 const [health,setHealth]=useState<any[]>([])
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState<{kind:'ok'|'error'|'unknown'|'',text:string}>({kind:'',text:''})
 const load=async()=>{
  try{
   const [deliveryResult,healthResult]:any=await Promise.all([api.signalDeliveries(),api.connectorHealth()])
   setItems(deliveryResult?.items||[])
   setHealth(healthResult?.items||[])
   setNotice(x=>x.kind==='error'?x:{kind:'',text:''})
  }catch(error:any){
   setNotice({kind:'error',text:error?.message||'Unable to load delivery operations.'})
  }
 }
 useEffect(()=>{load()},[])
 const retry=async(id:string)=>{
  setBusy(id);setNotice({kind:'',text:''})
  try{await api.retrySignalDelivery(id);setNotice({kind:'ok',text:'Delivery re-queued with its persisted identifiers and conversion payload.'});await load()}
  catch(error:any){const cause=String(error?.details?.cause||'');setNotice({kind:cause==='timeout'||cause==='network'?'unknown':'error',text:cause==='timeout'||cause==='network'?'Retry acceptance was not confirmed. Refresh delivery state before retrying the same delivery again.':error?.message||'Retry could not be queued.'})}
  finally{setBusy('')}
 }
 const replay=async()=>{
  setBusy('dlq');setNotice({kind:'',text:''})
  try{const result:any=await api.replaySignalDlq();setNotice({kind:'ok',text:`${result?.replayed||0} dead-letter deliver${result?.replayed===1?'y':'ies'} re-queued for the worker.`});await load()}
  catch(error:any){const cause=String(error?.details?.cause||'');setNotice({kind:cause==='timeout'||cause==='network'?'unknown':'error',text:cause==='timeout'||cause==='network'?'Dead-letter replay acceptance was not confirmed. Refresh delivery state before replaying again.':error?.message||'Dead-letter replay failed.'})}
  finally{setBusy('')}
 }
 const queueTest=async()=>{
  setBusy('test');setNotice({kind:'',text:''})
  try{
   const result:any=await api.dispatchSignal({event:'lead.qualified',destination:'Meta Ads',externalId:'ace_test_'+Date.now(),occurredAt:new Date().toISOString(),data:{source:'delivery_center_test'}})
   setNotice({kind:'ok',text:result?.duplicate?'Matching test signal already exists.':'Test signal accepted by the durable delivery queue.'})
   await load()
  }catch(error:any){const cause=String(error?.details?.cause||'');setNotice({kind:cause==='timeout'||cause==='network'?'unknown':'error',text:cause==='timeout'||cause==='network'?'Test-signal queue acceptance was not confirmed. Refresh the delivery queue before sending another test signal.':error?.message||'Test signal could not be queued. Check backend persistence and connector configuration.'})}
  finally{setBusy('')}
 }
 const delivered=items.filter(x=>x.status==='delivered').length
 const retrying=items.filter(x=>x.status==='retrying'||x.status==='queued').length
 const dead=items.filter(x=>x.status==='dead_letter').length
 const deliveryRate=items.length?((delivered/items.length)*100).toFixed(1):'—'
 return <><PageHead crumb="Activation / Delivery" title="Signal delivery center" sub="Track every outbound conversion, audience and webhook signal with idempotency, retry state and dead-letter visibility."/>
 {notice.text&&notice.kind==='unknown'?<StaleState title="Delivery action needs reconciliation" description={notice.text} action={{label:'Refresh delivery state',onClick:load}}/>:notice.text&&<div className={'delivery-notice '+notice.kind}>{notice.kind==='ok'?<CheckCircle2/>:<ShieldCheck/>}<span>{notice.text}</span></div>}
 <div className="stats-grid"><Stat label="Delivery rate" value={deliveryRate==='—'?'—':deliveryRate+'%'} sub="Current persisted queue" Icon={RadioTower}/><Stat label="Queued / retrying" value={String(retrying)} sub="Automatic or manual retry" Icon={Activity}/><Stat label="Dead letter" value={String(dead)} sub="Needs replay or investigation" Icon={ShieldCheck}/><Stat label="Connectors" value={String(health.length)} sub="Health continuously observable" Icon={Cable}/></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Outbound delivery queue</h3><p>One idempotent record per external signal</p></div><div className="panel-actions"><button disabled={busy==='dlq'||dead===0} onClick={replay}>{busy==='dlq'?'Replaying…':'Replay dead letter'}</button><button className="app-primary" disabled={busy==='test'} onClick={queueTest}>{busy==='test'?'Queuing…':'Queue test signal'}</button></div></div>
 {items.length?<table><thead><tr><th>Delivery</th><th>Event</th><th>Destination</th><th>Status</th><th>Attempts</th><th>HTTP</th><th>Latency</th><th></th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td><code>{String(x.id).slice(0,18)}</code></td><td>{x.event}</td><td>{x.destination}</td><td><span className={String(x.status).replace('_','-')}>{x.status}</span></td><td>{x.attempts??0}</td><td>{x.httpStatus??'—'}</td><td>{x.latencyMs?x.latencyMs+'ms':'—'}</td><td>{x.status!=='delivered'&&<button disabled={busy===x.id} onClick={()=>retry(x.id)}>{busy===x.id?'Queuing…':'Retry'}</button>}</td></tr>)}</tbody></table>:<div className="empty-delivery-state"><RadioTower/><div><b>No persisted deliveries yet</b><small>Queue a test signal or allow an event rule to create the first outbound conversion.</small></div></div>}</div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Connector health</h3><p>Destination reliability and latency</p></div></div>{health.length?health.map(x=><div className="monitor-row" key={x.name}><span>{x.name}</span><div className="progress"><i style={{width:Math.max(0,Math.min(100,Number(x.successRate||0)))+'%'}}/></div><b>{x.successRate}%</b><small>{x.p95LatencyMs}ms p95</small><em className={x.status}>{x.status}</em></div>):<div className="empty-delivery-state"><Cable/><div><b>No delivery telemetry yet</b><small>Connector health becomes measurable after persisted worker deliveries are processed.</small></div></div>}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Delivery guarantees</h3><p>Controls used before a signal leaves the platform</p></div></div>{[['Idempotency','SHA-256 delivery key prevents duplicate external writes'],['Retry policy','Failed deliveries use exponential backoff and retain the replay payload'],['Dead-letter queue','Exhausted failures stay visible and are actually re-enqueued on replay'],['Audit trail','Dispatch, retry and replay actions create immutable-style audit entries'],['PII boundary','Retry payloads retain hashed email/phone identifiers rather than raw PII']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div></div></>
}
