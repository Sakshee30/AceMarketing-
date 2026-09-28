import {useEffect,useState} from 'react'
import {Activity,ArrowRight,CheckCircle2,ChevronRight,ShieldCheck,Sparkles,Target,X} from 'lucide-react'
import {personalizationApi as api} from '../data/personalization.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {StaleState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'
import {ActivationPageHead as PageHead,ActivationStat as Stat} from '../ui/PersonalizationPrimitives'

export default function PersonalizationPage(){
 const [data,setData]=useState<any>({items:[],performance:[],recentDecisions:[],stats:{}})
 const [builder,setBuilder]=useState(false)
 const [selected,setSelected]=useState('')
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const [decision,setDecision]=useState<any>(null)
 const [testCustomer,setTestCustomer]=useState('')
 useDirtyWork({key:'personalization-rule-draft',label:'Personalization rule draft',dirty:builder,scope:'feature'})
 const load=async()=>{
  try{
   const r:any=await api.personalizationRules()
   setData(r)
   if(r.items?.length)setSelected((x:string)=>x&&r.items.some((i:any)=>i.id===x)?x:r.items[0].id)
  }catch(e:any){setNotice(e?.message||'Personalization rules could not be loaded.')}
 }
 useEffect(()=>{load()},[])
 const current=(data.items||[]).find((x:any)=>x.id===selected)||data.items?.[0]
 const perf=(data.performance||[]).find((x:any)=>x.ruleId===current?.id)||{}
 const create=async(e:any)=>{
  e.preventDefault();setBusy('create');setNotice('')
  const fd=new FormData(e.currentTarget)
  const field=String(fd.get('conditionField')||'').trim()
  const payload:any={
   name:String(fd.get('name')||''),
   surface:String(fd.get('surface')||'website'),
   variant:String(fd.get('variant')||''),
   message:String(fd.get('message')||''),
   cta:String(fd.get('cta')||''),
   destination:String(fd.get('destination')||''),
   priority:Number(fd.get('priority')||100),
   requiresPersonalizationConsent:true,
   conditions:field?[{field,operator:String(fd.get('operator')||'equals'),value:String(fd.get('conditionValue')||'')}]:[]
  }
  try{const r:any=await api.createPersonalizationRule(payload);setBuilder(false);setNotice('Personalization rule created and enabled.');await load();if(r?.item?.id)setSelected(r.item.id)}
  catch(e:any){const cause=String(e?.details?.cause||'');setNotice(cause==='timeout'||cause==='network'?'OUTCOME_UNKNOWN: The backend did not confirm whether this personalization rule was created. Refresh rules before submitting the same definition again.':e?.message||'Personalization rule could not be created.')}
  finally{setBusy('')}
 }
 const toggle=async()=>{
  if(!current)return
  setBusy('toggle');setNotice('')
  try{await api.togglePersonalizationRule(current.id,current.status!=='active');setNotice(current.status==='active'?'Personalization rule paused.':'Personalization rule enabled.');await load()}
  catch(e:any){const cause=String(e?.details?.cause||'');setNotice(cause==='timeout'||cause==='network'?'OUTCOME_UNKNOWN: The backend did not confirm the personalization status change. Refresh rule state before toggling again.':e?.message||'Personalization rule status could not be changed.')}
  finally{setBusy('')}
 }
 const test=async()=>{
  if(!testCustomer.trim()){setNotice('Enter a customer, lead, visitor, or device ID to test.');return}
  setBusy('test');setNotice('');setDecision(null)
  try{
   const r:any=await api.decidePersonalization({customerId:testCustomer.trim(),surface:current?.surface||'website'})
   setDecision(r)
   setNotice(r.decision?.status==='decided'?'Personalized variant selected.':r.decision?.status==='consent_blocked'?'Decision blocked because personalization consent is unavailable.':'No personalization rule matched this customer.')
  }catch(e:any){setNotice(e?.message||'Personalization decision failed.')}
  finally{setBusy('')}
 }
 const recordFeedback=async(kind:string)=>{
  if(!decision?.decision?.id)return
  setBusy('feedback:'+kind)
  try{await api.personalizationFeedback({decisionId:decision.decision.id,kind});setNotice(kind+' recorded for this personalization decision.');await load()}
  catch(e:any){const cause=String(e?.details?.cause||'');setNotice(cause==='timeout'||cause==='network'?'OUTCOME_UNKNOWN: The backend did not confirm whether personalization feedback was recorded. Refresh performance history before sending the same feedback again.':e?.message||'Personalization feedback could not be recorded.')}
  finally{setBusy('')}
 }
 const openDestination=()=>{
  const destination=String(current?.destination||'').trim()
  if(!destination){setNotice('Add a destination before using this personalization CTA.');return}
  if(/^javascript:|^data:/i.test(destination)){setNotice('This personalization destination is blocked for safety.');return}
  if(destination.startsWith('#')){window.location.hash=destination.slice(1);return}
  if(destination.startsWith('/')){window.location.assign(destination);return}
  try{
   const target=new URL(destination)
   if(!['http:','https:'].includes(target.protocol)){setNotice('Only HTTP(S), relative paths, and app hash destinations are supported.');return}
   window.location.assign(target.toString())
  }catch{setNotice('Configure a valid personalization destination before using this CTA.')}
 }
 const stats=data.stats||{}
 return <><PageHead crumb="Activation / Personalization" title="Personalization studio" sub="Use first-party customer context to select consent-aware content, offers and experiences, then measure impressions, clicks and conversions." action="Create personalization rule" onAction={()=>setBuilder(true)}/>
 {notice.startsWith('OUTCOME_UNKNOWN:')?<StaleState title="Personalization action needs reconciliation" description={notice.replace('OUTCOME_UNKNOWN: ','')} action={{label:'Refresh personalization state',onClick:load}}/>:notice&&<div className={'delivery-notice '+(notice.toLowerCase().includes('failed')||notice.toLowerCase().includes('could not')?'error':'ok')}><Sparkles/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Rules" value={String(stats.total||0)} sub="Persisted experience policies" Icon={Sparkles}/><Stat label="Active" value={String(stats.active||0)} sub="Eligible for decisions" Icon={Activity}/><Stat label="Decisions" value={String(stats.decisions||0)} sub="Persisted personalization results" Icon={Target}/><Stat label="Conversions" value={String(stats.conversions||0)} sub="Measured personalization conversions" Icon={CheckCircle2}/></div>
 <div className="personalization-hero app-panel"><div><Sparkles/><div><span>CONSENT-AWARE DECISIONING</span><h3>Customer context → rule match → experience variant</h3><p>Rules use persisted Customer 360 attributes and journey context. No personalized variant is returned when the matching rule requires personalization consent and that consent is unavailable.</p></div></div><div className="data-flow-steps">{['Resolve customer','Load profile','Match rule','Check consent','Return variant'].map((x,i)=><span key={x}><b>{i+1}</b>{x}{i<4&&<ArrowRight/>}</span>)}</div></div>
 <div className="personalization-layout"><div className="app-panel personalization-list"><div className="panel-head"><div><h3>Experience rules</h3><p>Priority-ordered personalization policies</p></div><button onClick={load}>Refresh</button></div>{(data.items||[]).length?(data.items||[]).map((x:any)=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>{setSelected(x.id);setDecision(null)}}><Sparkles/><div><b>{x.name}</b><small>{x.surface} · {x.variant}</small></div><span className={x.status==='active'?'healthy':'status'}>{x.status}</span><ChevronRight/></button>):<div className="empty-delivery-state"><Sparkles/><div><b>No personalization rules yet</b><small>Create a first-party experience rule for a website, app, CRM or messaging surface.</small></div></div>}</div>
 <div className="app-panel personalization-detail">{current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.surface} · priority {current.priority}</p></div><span className={current.status==='active'?'healthy':'status'}>{current.status}</span></div><div className="personalization-preview"><span>VARIANT</span><h2>{current.variant}</h2><p>{current.message||'No message copy configured.'}</p>{current.cta&&<button onClick={openDestination} aria-label={'Open personalization destination: '+current.cta}>{current.cta}</button>}<small>{current.destination||'No destination configured'}</small></div><div className="site-detail-grid">{[['Surface',current.surface],['Priority',current.priority],['Consent','Personalization consent required'],['Decisions',perf.decisions||0],['CTR',(perf.ctr||0)+'%'],['Conversion rate',(perf.conversionRate||0)+'%']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><div className="agent-section"><h4>Audience/context condition</h4><div className="context-chips">{(current.conditions||[]).length?current.conditions.map((x:any,i:number)=><span key={i}>{x.field} {String(x.operator).replaceAll('_',' ')} {String(x.value)}</span>):<span>All customers with consent</span>}</div></div><div className="approval-actions"><button disabled={busy==='toggle'} onClick={toggle}>{busy==='toggle'?'Saving…':current.status==='active'?'Pause rule':'Enable rule'}</button></div>
 <div className="personalization-test"><div className="panel-head"><div><h3>Test decision</h3><p>Resolve a real customer/profile ID through the backend decision endpoint.</p></div></div><div className="personalization-test-controls"><input aria-label="Personalization test customer" value={testCustomer} onChange={e=>setTestCustomer(e.target.value)} placeholder="customer_123 / lead ID / device ID"/><button className="approve" disabled={busy==='test'} onClick={test}>{busy==='test'?'Deciding…':'Run decision'}</button></div>{decision?.decision&&<div className={'personalization-decision '+decision.decision.status}><div><span>{decision.decision.status}</span><b>{decision.decision.variant||'No variant returned'}</b><p>{decision.decision.message||decision.consent?.reason||'No matching rule.'}</p></div>{decision.decision.status==='decided'&&<div className="personalization-feedback"><button disabled={busy==='feedback:impression'} onClick={()=>recordFeedback('impression')}>Record impression</button><button disabled={busy==='feedback:click'} onClick={()=>recordFeedback('click')}>Record click</button><button disabled={busy==='feedback:conversion'} onClick={()=>recordFeedback('conversion')}>Record conversion</button></div>}</div>}</div>
 </>:<div className="empty-delivery-state"><Sparkles/><div><b>Select a personalization rule</b></div></div>}</div></div>
 {builder&&<AccessibleDialog ariaLabel="Create personalization rule" onClose={()=>setBuilder(false)}><form className="connector-card personalization-builder" onSubmit={create}><div className="connector-modal-head"><div><Sparkles/><div><b>Create personalization rule</b><small>Define the audience/context condition and experience variant.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Rule name<input name="name" required placeholder="High-value returning customer offer"/></label><div className="two-col"><label>Surface<select name="surface"><option value="website">Website</option><option value="app">App</option><option value="crm">CRM</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></label><label>Priority<input name="priority" type="number" min="0" max="1000" defaultValue="100"/></label></div><label>Variant name<input name="variant" required placeholder="VIP loyalty offer"/></label><label>Message<textarea name="message" rows={3} placeholder="Welcome back — unlock a loyalty benefit selected for you."/></label><div className="two-col"><label>CTA<input name="cta" placeholder="View your offer"/></label><label>Destination<input name="destination" placeholder="/offers/vip"/></label></div><div className="two-col"><label>Condition field<input name="conditionField" placeholder="grade / stage / ltvTier / score"/></label><label>Operator<select name="operator"><option value="equals">Equals</option><option value="contains">Contains</option><option value="greater_than">Greater than</option><option value="less_than">Less than</option><option value="one_of">One of</option><option value="exists">Exists</option></select></label></div><label>Condition value<input name="conditionValue" placeholder="A / customer / premium / 80"/></label><div className="source-conflict-note"><ShieldCheck/><div><b>Personalization consent required</b><p>The decision service resolves the customer, evaluates rules, then blocks the personalized variant when consent is not available.</p></div></div><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create & enable rule'}</button></form></AccessibleDialog>}
 </> 
}
