import {useEffect,useState} from 'react'
import {Bot,Cable,CheckCircle2,DatabaseZap,RadioTower,ShieldCheck,UsersRound,Zap} from 'lucide-react'
import {settingsApi as api} from '../data/settings.api'
import {SettingsStat as Stat} from '../ui/SettingsPrimitives'

export function BillingUsageSettings(){
 const [data,setData]=useState<any>(null)
 const [subscription,setSubscription]=useState<any>(null)
 const [billingBusy,setBillingBusy]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<{kind:'ok'|'error'|'',text:string}>({kind:'',text:''})
 const load=async()=>{
  setLoading(true);setNotice({kind:'',text:''})
  try{
   const [usage,sub]:any=await Promise.all([api.billingUsage(),api.subscription()])
   setData(usage);setSubscription(sub)
  }catch(e:any){
   setNotice({kind:'error',text:e?.message||'Billing and usage data could not be loaded. Existing values were preserved.'})
  }finally{setLoading(false)}
 }
 useEffect(()=>{load()},[])
 const openPortal=async()=>{
  setBillingBusy('portal');setNotice({kind:'',text:''})
  try{
   const r:any=await api.createBillingPortal()
   if(!r?.url)throw new Error('Billing provider did not return a portal URL.')
   window.location.href=r.url
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Billing portal could not be opened.'})}
  finally{setBillingBusy('')}
 }
 const startCheckout=async()=>{
  const plan=subscription?.planCode||data?.planCode
  if(!plan){setNotice({kind:'error',text:'No configured plan is available for checkout.'});return}
  setBillingBusy('checkout');setNotice({kind:'',text:''})
  try{
   const r:any=await api.createBillingCheckout(plan)
   if(!r?.url)throw new Error('Billing provider did not return a checkout URL.')
   window.location.href=r.url
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Checkout could not be started.'})}
  finally{setBillingBusy('')}
 }
 const rows=[
  ['Tracked events','tracked_events',Zap],
  ['Assisted events','assisted_events',DatabaseZap],
  ['Signal dispatches','signal_dispatches',RadioTower],
  ['Agent actions','agent_actions',Bot],
  ['Audience syncs','audience_syncs',UsersRound],
  ['Custom integration tests','custom_integration_tests',Cable]
 ]
 return <div className="settings-detail"><div className="panel-head"><div><h3>Billing & usage</h3><p>Usage is measured from successful workspace operations. Limits are enforced before expensive actions are accepted.</p></div><button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh usage'}</button></div>
 {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}>{notice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}<span>{notice.text}</span></div>}
 <div className="billing-plan-summary"><div><span>Plan</span><b>{loading&&!data?'Loading…':data?.planCode||'usage'}</b></div><div><span>Status</span><b>{loading&&!data?'Loading…':data?.status||'Unavailable'}</b></div><div><span>Current period</span><b>{data?.periodStart&&data?.periodEnd?new Date(data.periodStart).toLocaleDateString()+' – '+new Date(data.periodEnd).toLocaleDateString():'—'}</b></div><div><span>Payments</span><b>{loading&&!subscription?'Loading…':subscription?.providerConfigured?(subscription?.paymentConfigured?'Provider connected':'Provider configured'):'Credentials deferred'}</b></div></div>
 {subscription?.providerConfigured&&<div className="approval-actions">{subscription?.paymentConfigured?<button onClick={openPortal} disabled={!!billingBusy}>{billingBusy==='portal'?'Opening…':'Manage billing'}</button>:<button onClick={startCheckout} disabled={!!billingBusy}>{billingBusy==='checkout'?'Opening…':'Start checkout for configured plan'}</button>}</div>}
 <div className="stats-grid compact">{rows.map(([label,key,Icon]:any)=>{const x=data?.usage?.[key];return <Stat key={key} label={label} value={x?Number(x.used||0).toLocaleString('en-IN'):'—'} sub={x?(x.limit===0?'Unlimited':String(x.percent||0)+'% of '+Number(x.limit||0).toLocaleString('en-IN')):(loading?'Loading usage':'Usage unavailable')} Icon={Icon}/>})}</div>
 <h4>Entitlement details</h4>{rows.map(([label,key]:any)=>{const x=data?.usage?.[key];const pct=Math.max(0,Math.min(100,Number(x?.percent||0)));return <div className="setting-line" key={key}><span>{label}</span><b>{x?x.limit===0?'Unlimited':Number(x.limit||0).toLocaleString('en-IN'):'—'}</b><div className="progress"><i style={{width:pct+'%'}}/></div><em>{x?Number(x.remaining||0).toLocaleString('en-IN')+' remaining':'—'}</em></div>})}
 <div className="source-conflict-note"><ShieldCheck/><div><b>Billing boundary</b><p>Usage metering and entitlement enforcement are fully operational without payment credentials. Checkout, card charging and invoice/portal actions activate only after a real billing provider is configured.</p></div></div>
 </div>
}
function Compliance(){
 const [data,setData]=useState<any>({consent:{},policy:{},privacy:{recent:[]},guards:{},checks:[],consentAudit:[]})
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const [selectorType,setSelectorType]=useState('customer')
 const [selector,setSelector]=useState('')
 const [deleteConfirm,setDeleteConfirm]=useState('')
 const [exportResult,setExportResult]=useState<any>(null)
 const [retentionPreview,setRetentionPreview]=useState<any>(null)
 const load=async()=>{try{setData(await api.complianceCenter())}catch(e:any){setNotice(e?.message||'Compliance center could not be loaded.')}}
 useEffect(()=>{load()},[])
 const exportSubject=async()=>{
  if(!selector.trim()){setNotice('Enter a subject selector first.');return}
  setBusy('export');setNotice('');setExportResult(null)
  try{const r:any=await api.privacyExport(selectorType,selector.trim());setExportResult(r);setNotice('Subject export generated and request audited.');await load()}
  catch(e:any){setNotice(e?.message||'Privacy export failed.')}finally{setBusy('')}
 }
 const deleteSubject=async()=>{
  if(!selector.trim()||deleteConfirm!=='DELETE'){setNotice('Enter a subject selector and type DELETE to confirm.');return}
  setBusy('delete');setNotice('')
  try{const r:any=await api.privacyDelete(selectorType,selector.trim());setNotice('Subject deletion completed: '+Object.values(r.summary||{}).reduce((n:any,x:any)=>n+Number(x||0),0)+' records affected.');setDeleteConfirm('');setExportResult(null);await load()}
  catch(e:any){setNotice(e?.message||'Privacy deletion failed.')}finally{setBusy('')}
 }
 const previewRetention=async()=>{
  setBusy('retention-preview');setNotice('')
  try{const r:any=await api.privacyRetentionPurge(true);setRetentionPreview(r);setNotice('Retention dry run completed. No records were deleted.');await load()}
  catch(e:any){setNotice(e?.message||'Retention preview failed.')}finally{setBusy('')}
 }
 const applyRetention=async()=>{
  if(!retentionPreview)return
  setBusy('retention-apply');setNotice('')
  try{const r:any=await api.privacyRetentionPurge(false);setRetentionPreview(null);setNotice('Retention purge completed. Request '+r.requestId+' was audited.');await load()}
  catch(e:any){setNotice(e?.message||'Retention purge failed.')}finally{setBusy('')}
 }
 const consent=data.consent||{},privacy=data.privacy||{},guards=data.guards||{},policy=data.policy||{}
 const policyRows=[['Click sessions',policy.clickSessions],['Assisted events',policy.assistedEvents],['Lead profiles',policy.leadProfiles],['Consent records',policy.consentRecords]]
 return <><PageHead crumb="Operations / Compliance" title="Privacy, consent & compliance center" sub="Operate consent, subject rights, retention and activation safeguards from one governed workspace." action="Refresh" onAction={load}/>
 {notice&&<div className={'delivery-notice '+(notice.toLowerCase().includes('failed')||notice.toLowerCase().includes('could not')?'error':'ok')}><ShieldCheck/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Compliance readiness" value={String(data.readiness??'—')+(data.readiness!=null?'%':'')} sub="Operational checks, not legal certification" Icon={ShieldCheck}/><Stat label="Consent subjects" value={String(consent.total||0)} sub={String(consent.marketingRate||0)+'% marketing consent'} Icon={UsersRound}/><Stat label="Revoked" value={String(consent.revoked||0)} sub="Persisted consent revocations" Icon={X}/><Stat label="Privacy requests" value={String(privacy.totalRequests||0)} sub={String(privacy.deletions||0)+' deletes · '+String(privacy.exports||0)+' exports'} Icon={DatabaseZap}/></div>
 <div className="compliance-layout"><section className="app-panel"><div className="panel-head"><div><h3>Consent coverage</h3><p>Persisted first-party consent state used by tracking, activation and personalization</p></div><span className={consent.total?'healthy':'status'}>{consent.total||0} subjects</span></div><div className="compliance-consent-bars">{[['Analytics',consent.analyticsRate||0,consent.analytics||0],['Marketing',consent.marketingRate||0,consent.marketing||0],['Personalization',consent.personalizationRate||0,consent.personalization||0]].map(x=><div key={x[0]}><div><span>{x[0]}</span><b>{x[1]}% · {x[2]} subjects</b></div><div className="progress"><i style={{width:Math.min(100,Number(x[1]||0))+'%'}}/></div></div>)}</div><div className="compliance-guard-grid"><div><ShieldCheck/><span>Activation consent skips</span><b>{guards.skippedActivation||0}</b></div><div><Sparkles/><span>Personalization blocks</span><b>{guards.blockedPersonalization||0}</b></div><div><RadioTower/><span>Signal records guarded</span><b>{guards.signalDeliveries||0}</b></div></div></section>
 <section className="app-panel"><div className="panel-head"><div><h3>Operational readiness checks</h3><p>Controls that support privacy operations; this is not a legal-compliance certification.</p></div><strong>{data.readiness||0}%</strong></div><div className="compliance-checks">{(data.checks||[]).map((x:any)=><article key={x.key}><span className={x.ready?'ready':'attention'}>{x.ready?<Check/>:<AlertTriangle/>}</span><div><b>{x.label}</b><small>{x.detail}</small></div></article>)}</div></section></div>
 <div className="compliance-layout"><section className="app-panel"><div className="panel-head"><div><h3>Subject rights operations</h3><p>Owner/admin workflows for data access and deletion by deterministic selector.</p></div></div><div className="two-col"><label>Selector type<select value={selectorType} onChange={e=>setSelectorType(e.target.value)}><option value="customer">Customer ID</option><option value="visitor">Visitor ID</option><option value="lead">Lead ID</option><option value="email">Email</option><option value="phone">Phone</option></select></label><label>Subject selector<input aria-label="Privacy subject selector" value={selector} onChange={e=>setSelector(e.target.value)} placeholder="customer_123 / lead@example.com"/></label></div><div className="approval-actions"><button disabled={busy==='export'} onClick={exportSubject}>{busy==='export'?'Exporting…':'Generate data export'}</button></div>{exportResult&&<div className="compliance-export-result"><CheckCircle2/><div><b>Export {exportResult.requestId}</b><small>{Object.entries(exportResult.counts||{}).map(([k,v])=>k+': '+v).join(' · ')||'No records matched'}</small></div></div>}<div className="compliance-danger"><ShieldCheck/><div><b>Delete subject data</b><p>Deletion removes matched privacy-store records and audience memberships. Type DELETE to enable the destructive action.</p></div><input aria-label="Privacy delete confirmation" value={deleteConfirm} onChange={e=>setDeleteConfirm(e.target.value)} placeholder="Type DELETE"/><button disabled={busy==='delete'||deleteConfirm!=='DELETE'} onClick={deleteSubject}>{busy==='delete'?'Deleting…':'Delete subject data'}</button></div></section>
 <section className="app-panel"><div className="panel-head"><div><h3>Retention policy</h3><p>Environment-configured data retention windows and auditable purge workflow.</p></div></div><div className="compliance-policy-grid">{policyRows.map(([label,value])=><div key={String(label)}><span>{label}</span><b>{Number(value||0)>0?String(value)+' days':'Not configured'}</b></div>)}</div><div className="source-conflict-note"><ShieldCheck/><div><b>Production configuration</b><p>Retention windows are controlled by PRIVACY_RETENTION_*_DAYS environment variables so deployment policy remains explicit and reviewable.</p></div></div><div className="approval-actions"><button disabled={busy==='retention-preview'} onClick={previewRetention}>{busy==='retention-preview'?'Scanning…':'Preview retention purge'}</button>{retentionPreview&&<button className="approve" disabled={busy==='retention-apply'} onClick={applyRetention}>{busy==='retention-apply'?'Purging…':'Apply retention purge'}</button>}</div>{retentionPreview&&<div className="compliance-retention-preview"><b>Dry run · no deletion performed</b><small>{Object.entries(retentionPreview.summary||{}).map(([k,v])=>k+': '+v).join(' · ')}</small></div>}</section></div>
 <div className="compliance-layout"><section className="app-panel"><div className="panel-head"><div><h3>Recent consent audit</h3><p>Latest consent updates and revocations</p></div></div>{(data.consentAudit||[]).length?(data.consentAudit||[]).slice(0,12).map((x:any)=><div className="agent-run" key={x.id}><ShieldCheck/><div><b>{x.action}</b><small>{x.subject_type} · {x.subject_id}</small></div><span>{x.created_at?new Date(x.created_at).toLocaleString():'—'}</span></div>):<div className="empty-delivery-state"><ShieldCheck/><div><b>No consent audit entries yet</b><small>Consent changes will appear here after subjects make privacy choices.</small></div></div>}</section>
 <section className="app-panel"><div className="panel-head"><div><h3>Privacy request history</h3><p>Export, deletion and retention operations</p></div></div>{(privacy.recent||[]).length?(privacy.recent||[]).slice(0,12).map((x:any)=><div className="agent-run" key={x.id}><DatabaseZap/><div><b>{String(x.request_type||'request').replaceAll('_',' ')}</b><small>{x.selector_type||'workspace'} · {x.status}</small></div><span>{x.created_at?new Date(x.created_at).toLocaleString():'—'}</span><em className={x.status}>{x.status}</em></div>):<div className="empty-delivery-state"><DatabaseZap/><div><b>No privacy requests yet</b><small>Subject exports, deletions and retention runs create an audit record here.</small></div></div>}</section></div>
 </> 
}

