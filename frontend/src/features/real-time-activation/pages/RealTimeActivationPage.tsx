import {useEffect,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,ArrowRight,CheckCircle2,ChevronRight,RadioTower,ShieldCheck,X,Zap} from 'lucide-react'
import {realTimeActivationApi as api} from '../data/real-time-activation.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {StaleState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'
import {ActivationPageHead as PageHead,ActivationStat as Stat} from '../ui/ActivationPrimitives'

export default function RealTimeActivationPage(){
 const [data,setData]=useState<any>({items:[],runs:[],stats:{}})
 const [builder,setBuilder]=useState(false)
 const [selected,setSelected]=useState('')
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const [testResult,setTestResult]=useState<any>(null)
 useDirtyWork({key:'activation-rule-draft',label:'Real-time activation rule draft',dirty:builder,scope:'feature'})
 const load=async()=>{
  try{
   const r:any=await api.activationRules()
   setData(r)
   if(r.items?.length)setSelected((x:string)=>x&&r.items.some((i:any)=>i.id===x)?x:r.items[0].id)
  }catch(e:any){setNotice(e?.message||'Real-time activation rules could not be loaded.')}
 }
 useEffect(()=>{load()},[])
 useDevelopmentLiveRefresh(()=>load())
 const current=(data.items||[]).find((x:any)=>x.id===selected)||data.items?.[0]
 const create=async(e:any)=>{
  e.preventDefault();setBusy('create');setNotice('')
  const fd=new FormData(e.currentTarget)
  const conditionField=String(fd.get('conditionField')||'').trim()
  const payload:any={
   name:String(fd.get('name')||''),
   triggerEvent:String(fd.get('triggerEvent')||''),
   actionType:String(fd.get('actionType')||'signal'),
   destination:String(fd.get('destination')||''),
   outputEvent:String(fd.get('outputEvent')||''),
   channel:String(fd.get('channel')||'whatsapp'),
   owner:String(fd.get('owner')||'Marketing automation'),
   priority:String(fd.get('priority')||'medium'),
   delayMinutes:Number(fd.get('delayMinutes')||0),
   reason:String(fd.get('reason')||''),
   requiresMarketingConsent:true,
   conditions:conditionField?[{field:conditionField,operator:String(fd.get('operator')||'equals'),value:String(fd.get('conditionValue')||'')}]:[]
  }
  try{
   const r:any=await api.createActivationRule(payload)
   setBuilder(false);setNotice('Activation rule created and enabled.');await load();if(r?.item?.id)setSelected(r.item.id)
  }catch(e:any){const cause=String(e?.details?.cause||'');setNotice(cause==='timeout'||cause==='network'?'OUTCOME_UNKNOWN: The backend did not confirm whether this activation rule was created. Refresh rules before submitting the same definition again.':e?.message||'Activation rule could not be created.')}
  finally{setBusy('')}
 }
 const toggle=async()=>{
  if(!current)return
  setBusy('toggle');setNotice('')
  try{await api.toggleActivationRule(current.id,current.status!=='active');setNotice(current.status==='active'?'Activation rule paused.':'Activation rule enabled.');await load()}
  catch(e:any){const cause=String(e?.details?.cause||'');setNotice(cause==='timeout'||cause==='network'?'OUTCOME_UNKNOWN: The backend did not confirm the activation status change. Refresh rule state before toggling again.':e?.message||'Activation rule status could not be changed.')}
  finally{setBusy('')}
 }
 const test=async()=>{
  if(!current)return
  setBusy('test');setNotice('');setTestResult(null)
  try{
   const sample:any={event:current.triggerEvent,customerId:'activation_test_customer',value:5000,source:'workspace_test'}
   for(const condition of current.conditions||[]){
    sample[condition.field]=condition.operator==='greater_than'?Number(condition.value||0)+1:condition.value||'test'
   }
   const r:any=await api.testActivationRule(current.id,sample)
   setTestResult(r);setNotice(r.matched?'Test event matches this rule.':'Test event does not match this rule.')
  }catch(e:any){setNotice(e?.message||'Activation rule test failed.')}
  finally{setBusy('')}
 }
 const stats=data.stats||{}
 const runs=(data.runs||[]).filter((x:any)=>!current||x.ruleId===current.id)
 const actionLabel=(x:any)=>x.actionType==='signal'?('Send '+(x.outputEvent||x.triggerEvent)+' → '+(x.destination||'destination')):x.actionType==='route'?('Route → '+(x.destination||'queue')):('Create '+(x.channel||'follow-up')+' follow-up')
 return <><PageHead crumb="Activation / Real-Time Activation" title="Real-time activation" sub="Turn fresh first-party behavior into governed signals, routing, and follow-up actions as soon as events arrive." action="Create activation rule" onAction={()=>setBuilder(true)}/>
 {notice.startsWith('OUTCOME_UNKNOWN:')?<StaleState title="Activation action needs reconciliation" description={notice.replace('OUTCOME_UNKNOWN: ','')} action={{label:'Refresh activation rules',onClick:load}}/>:notice&&<div className={'delivery-notice '+(notice.toLowerCase().includes('could not')||notice.toLowerCase().includes('failed')?'error':'ok')}>{notice.toLowerCase().includes('could not')||notice.toLowerCase().includes('failed')?<ShieldCheck/>:<CheckCircle2/>}<span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Rules" value={String(stats.total||0)} sub="Persisted activation policies" Icon={Zap}/><Stat label="Active" value={String(stats.active||0)} sub="Evaluated on event ingestion" Icon={Activity}/><Stat label="Recent runs" value={String(stats.runs||0)} sub="Persisted rule executions" Icon={RadioTower}/><Stat label="Succeeded" value={String(stats.succeeded||0)} sub="Actions completed or queued" Icon={CheckCircle2}/></div>
 <div className="activation-rule-explainer app-panel"><div><Zap/><div><span>EVENT-DRIVEN AUTOMATION</span><h3>Event → condition → consent → action</h3><p>Every incoming first-party event is evaluated against active rules. Marketing actions are skipped when marketing consent is unavailable.</p></div></div><div className="data-flow-steps">{['Receive event','Evaluate conditions','Check consent','Run action','Persist result'].map((x,i)=><span key={x}><b>{i+1}</b>{x}{i<4&&<ArrowRight/>}</span>)}</div></div>
 <div className="activation-rule-layout"><div className="app-panel activation-rule-list"><div className="panel-head"><div><h3>Activation rules</h3><p>Active and paused real-time automations</p></div><button onClick={load}>Refresh</button></div>{(data.items||[]).length?(data.items||[]).map((x:any)=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>{setSelected(x.id);setTestResult(null)}}><Zap/><div><b>{x.name}</b><small>{x.triggerEvent} · {x.actionType.replace('_',' ')}</small></div><span className={x.status==='active'?'healthy':'status'}>{x.status}</span><ChevronRight/></button>):<div className="empty-delivery-state"><Zap/><div><b>No activation rules yet</b><small>Create a rule to react to tracked customer behavior in real time.</small></div></div>}</div>
 <div className="app-panel activation-rule-detail">{current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{actionLabel(current)}</p></div><span className={current.status==='active'?'healthy':'status'}>{current.status}</span></div><div className="site-detail-grid">{[['Trigger event',current.triggerEvent],['Action',current.actionType],['Destination',current.destination||current.channel||'—'],['Consent','Marketing consent required'],['Priority',current.priority||'medium'],['Delay',Number(current.delayMinutes||0)+' min']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div>
 <div className="agent-section"><h4>Conditions</h4>{(current.conditions||[]).length?<div className="context-chips">{current.conditions.map((x:any,i:number)=><span key={i}>{x.field} {String(x.operator).replaceAll('_',' ')} {String(x.value)}</span>)}</div>:<div className="context-chips"><span>Any {current.triggerEvent} event</span></div>}</div>
 <div className="approval-actions"><button disabled={busy==='test'} onClick={test}><Activity/>{busy==='test'?'Testing…':'Test rule'}</button><button className={current.status==='active'?'':'approve'} disabled={busy==='toggle'} onClick={toggle}>{busy==='toggle'?'Saving…':current.status==='active'?'Pause rule':'Enable rule'}</button></div>
 {testResult&&<div className={'activation-test-result '+(testResult.matched?'matched':'not-matched')}><ShieldCheck/><div><b>{testResult.matched?'Rule matched':'Rule did not match'}</b><small>Dry-run only · no external action was executed</small></div></div>}
 <div className="agent-section"><h4>Recent executions</h4>{runs.length?runs.slice(0,10).map((x:any)=><div className="agent-run" key={x.id}><Activity/><div><b>{x.eventId||'Tracked event'}</b><small>{x.detail||x.actionType}</small></div><span>{x.createdAt?new Date(x.createdAt).toLocaleString():'—'}</span><em className={x.status}>{x.status}</em></div>):<div className="empty-delivery-state"><Activity/><div><b>No executions for this rule</b><small>Matching live events will appear here after ingestion.</small></div></div>}</div></>:<div className="empty-delivery-state"><Zap/><div><b>Select an activation rule</b></div></div>}</div></div>
 {builder&&<AccessibleDialog ariaLabel="Create real-time activation rule" onClose={()=>setBuilder(false)}><form className="connector-card activation-rule-builder" onSubmit={create}><div className="connector-modal-head"><div><Zap/><div><b>Create real-time activation rule</b><small>Persist a governed event-to-action policy.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Rule name<input name="name" required placeholder="High-value checkout → Meta signal"/></label><label>Trigger event<input name="triggerEvent" required defaultValue="checkout_initiated" placeholder="checkout_initiated"/></label><div className="two-col"><label>Condition field<input name="conditionField" placeholder="value"/></label><label>Operator<select name="operator"><option value="equals">Equals</option><option value="contains">Contains</option><option value="greater_than">Greater than</option><option value="less_than">Less than</option><option value="one_of">One of</option><option value="exists">Exists</option></select></label></div><label>Condition value<input name="conditionValue" placeholder="4000"/></label><label>Action type<select name="actionType" defaultValue="signal"><option value="signal">Send conversion signal</option><option value="follow_up">Create follow-up</option><option value="route">Route lead</option></select></label><label>Destination / queue<input name="destination" defaultValue="Meta Ads" placeholder="Meta Ads or Priority sales queue"/></label><label>Output event<input name="outputEvent" defaultValue="high_value_checkout" placeholder="high_value_checkout"/></label><div className="two-col"><label>Follow-up channel<select name="channel"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">Call</option></select></label><label>Delay minutes<input name="delayMinutes" type="number" min="0" defaultValue="0"/></label></div><div className="two-col"><label>Owner<input name="owner" defaultValue="Marketing automation"/></label><label>Priority<select name="priority"><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></label></div><label>Reason<textarea name="reason" rows={3} defaultValue="Triggered by real-time first-party behavior."/></label><div className="source-conflict-note"><ShieldCheck/><div><b>Consent-aware execution</b><p>Marketing actions are evaluated only after the incoming event passes consent checks, and rules requiring marketing consent are skipped when that consent is unavailable.</p></div></div><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create & enable rule'}</button></form></AccessibleDialog>}
 </> 
}
