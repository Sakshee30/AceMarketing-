import {useEffect,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {AlertTriangle,Check,CheckCircle2,DatabaseZap,RadioTower,ShieldCheck,Sparkles,UsersRound,X} from 'lucide-react'
import {complianceApi as api} from '../data/compliance.api'
import {StaleState} from '../../../components/system/FrontendStates'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string;title:string;sub:string;action?:string;onAction?:()=>void}){
  return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}</div>
}

function Stat({label,value,sub,Icon}:{label:string;value:string;sub:string;Icon:any}){
  return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>
}

export default function CompliancePage(){
 const [data,setData]=useState<any>({consent:{},policy:{},privacy:{recent:[]},guards:{},checks:[],consentAudit:[]})
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const [selectorType,setSelectorType]=useState('customer')
 const [selector,setSelector]=useState('')
 const [deleteConfirm,setDeleteConfirm]=useState('')
 const [exportResult,setExportResult]=useState<any>(null)
 const [retentionPreview,setRetentionPreview]=useState<any>(null)
 const [uncertain,setUncertain]=useState(false)
 const load=async()=>{try{setData(await api.center());setUncertain(false)}catch(e:any){setNotice(e?.message||'Compliance center could not be loaded.')}}
 useEffect(()=>{load()},[])
 useDevelopmentLiveRefresh(()=>load())
 const exportSubject=async()=>{
  if(!selector.trim()){setNotice('Enter a subject selector first.');return}
  setBusy('export');setNotice('');setExportResult(null)
  try{const r:any=await api.privacyExport(selectorType,selector.trim());setExportResult(r);setNotice('Subject export generated and request audited.');await load()}
  catch(e:any){setNotice(e?.message||'Privacy export failed.')}finally{setBusy('')}
 }
 const deleteSubject=async()=>{
  if(!selector.trim()||deleteConfirm!=='DELETE'){setNotice('Enter a subject selector and type DELETE to confirm.');return}
  setBusy('delete');setNotice('');setUncertain(false)
  try{const r:any=await api.privacyDelete(selectorType,selector.trim());setNotice('Subject deletion completed: '+Object.values(r.summary||{}).reduce((n:any,x:any)=>n+Number(x||0),0)+' records affected.');setDeleteConfirm('');setExportResult(null);await load()}
  catch(e:any){const cause=String(e?.details?.cause||'');if(cause==='timeout'||cause==='network'){setUncertain(true);setNotice('The backend did not confirm whether subject deletion completed. Refresh authoritative privacy history before attempting the deletion again.')}else setNotice(e?.message||'Privacy deletion failed.')}finally{setBusy('')}
 }
 const previewRetention=async()=>{
  setBusy('retention-preview');setNotice('')
  try{const r:any=await api.privacyRetentionPurge(true);setRetentionPreview(r);setNotice('Retention dry run completed. No records were deleted.');await load()}
  catch(e:any){setNotice(e?.message||'Retention preview failed.')}finally{setBusy('')}
 }
 const applyRetention=async()=>{
  if(!retentionPreview)return
  setBusy('retention-apply');setNotice('');setUncertain(false)
  try{const r:any=await api.privacyRetentionPurge(false);setRetentionPreview(null);setNotice('Retention purge completed. Request '+r.requestId+' was audited.');await load()}
  catch(e:any){const cause=String(e?.details?.cause||'');if(cause==='timeout'||cause==='network'){setUncertain(true);setNotice('The backend did not confirm whether retention purge completed. Refresh compliance history before applying retention again.')}else setNotice(e?.message||'Retention purge failed.')}finally{setBusy('')}
 }
 const consent=data.consent||{},privacy=data.privacy||{},guards=data.guards||{},policy=data.policy||{}
 const policyRows=[['Click sessions',policy.clickSessions],['Assisted events',policy.assistedEvents],['Lead profiles',policy.leadProfiles],['Consent records',policy.consentRecords]]
 return <><PageHead crumb="Operations / Compliance" title="Privacy, consent & compliance center" sub="Operate consent, subject rights, retention and activation safeguards from one governed workspace." action="Refresh" onAction={load}/>
 {uncertain&&notice?<StaleState title="Compliance action needs reconciliation" description={notice} action={{label:'Refresh compliance state',onClick:load}}/>:notice&&<div className={'delivery-notice '+(notice.toLowerCase().includes('failed')||notice.toLowerCase().includes('could not')?'error':'ok')}><ShieldCheck/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Compliance readiness" value={String(data.readiness??'—')+(data.readiness!=null?'%':'')} sub="Operational checks, not legal certification" Icon={ShieldCheck}/><Stat label="Consent subjects" value={String(consent.total||0)} sub={String(consent.marketingRate||0)+'% marketing consent'} Icon={UsersRound}/><Stat label="Revoked" value={String(consent.revoked||0)} sub="Persisted consent revocations" Icon={X}/><Stat label="Privacy requests" value={String(privacy.totalRequests||0)} sub={String(privacy.deletions||0)+' deletes · '+String(privacy.exports||0)+' exports'} Icon={DatabaseZap}/></div>
 <div className="compliance-layout"><section className="app-panel"><div className="panel-head"><div><h3>Consent coverage</h3><p>Persisted first-party consent state used by tracking, activation and personalization</p></div><span className={consent.total?'healthy':'status'}>{consent.total||0} subjects</span></div><div className="compliance-consent-bars">{[['Analytics',consent.analyticsRate||0,consent.analytics||0],['Marketing',consent.marketingRate||0,consent.marketing||0],['Personalization',consent.personalizationRate||0,consent.personalization||0]].map(x=><div key={x[0]}><div><span>{x[0]}</span><b>{x[1]}% · {x[2]} subjects</b></div><div className="progress"><i style={{width:Math.min(100,Number(x[1]||0))+'%'}}/></div></div>)}</div><div className="compliance-guard-grid"><div><ShieldCheck/><span>Activation consent skips</span><b>{guards.skippedActivation||0}</b></div><div><Sparkles/><span>Personalization blocks</span><b>{guards.blockedPersonalization||0}</b></div><div><RadioTower/><span>Signal records guarded</span><b>{guards.signalDeliveries||0}</b></div></div></section>
 <section className="app-panel"><div className="panel-head"><div><h3>Operational readiness checks</h3><p>Controls that support privacy operations; this is not a legal-compliance certification.</p></div><strong>{data.readiness||0}%</strong></div><div className="compliance-checks">{(data.checks||[]).map((x:any)=><article key={x.key}><span className={x.ready?'ready':'attention'}>{x.ready?<Check/>:<AlertTriangle/>}</span><div><b>{x.label}</b><small>{x.detail}</small></div></article>)}</div></section></div>
 <div className="compliance-layout"><section className="app-panel"><div className="panel-head"><div><h3>Subject rights operations</h3><p>Owner/admin workflows for data access and deletion by deterministic selector.</p></div></div><div className="two-col"><label>Selector type<select value={selectorType} onChange={e=>setSelectorType(e.target.value)}><option value="customer">Customer ID</option><option value="visitor">Visitor ID</option><option value="lead">Lead ID</option><option value="email">Email</option><option value="phone">Phone</option></select></label><label>Subject selector<input aria-label="Privacy subject selector" value={selector} onChange={e=>setSelector(e.target.value)} placeholder="customer_123 / lead@example.com"/></label></div><div className="approval-actions"><button disabled={busy==='export'} onClick={exportSubject}>{busy==='export'?'Exporting…':'Generate data export'}</button></div>{exportResult&&<div className="compliance-export-result"><CheckCircle2/><div><b>Export {exportResult.requestId}</b><small>{Object.entries(exportResult.counts||{}).map(([k,v])=>k+': '+v).join(' · ')||'No records matched'}</small></div></div>}<div className="compliance-danger"><ShieldCheck/><div><b>Delete subject data</b><p>Deletion removes matched privacy-store records and audience memberships. Type DELETE to enable the destructive action.</p></div><input aria-label="Privacy delete confirmation" value={deleteConfirm} onChange={e=>setDeleteConfirm(e.target.value)} placeholder="Type DELETE"/><button disabled={busy==='delete'||deleteConfirm!=='DELETE'} onClick={deleteSubject}>{busy==='delete'?'Deleting…':'Delete subject data'}</button></div></section>
 <section className="app-panel"><div className="panel-head"><div><h3>Retention policy</h3><p>Environment-configured data retention windows and auditable purge workflow.</p></div></div><div className="compliance-policy-grid">{policyRows.map(([label,value])=><div key={String(label)}><span>{label}</span><b>{Number(value||0)>0?String(value)+' days':'Not configured'}</b></div>)}</div><div className="source-conflict-note"><ShieldCheck/><div><b>Production configuration</b><p>Retention windows are controlled by PRIVACY_RETENTION_*_DAYS environment variables so deployment policy remains explicit and reviewable.</p></div></div><div className="approval-actions"><button disabled={busy==='retention-preview'} onClick={previewRetention}>{busy==='retention-preview'?'Scanning…':'Preview retention purge'}</button>{retentionPreview&&<button className="approve" disabled={busy==='retention-apply'} onClick={applyRetention}>{busy==='retention-apply'?'Purging…':'Apply retention purge'}</button>}</div>{retentionPreview&&<div className="compliance-retention-preview"><b>Dry run · no deletion performed</b><small>{Object.entries(retentionPreview.summary||{}).map(([k,v])=>k+': '+v).join(' · ')}</small></div>}</section></div>
 <div className="compliance-layout"><section className="app-panel"><div className="panel-head"><div><h3>Recent consent audit</h3><p>Latest consent updates and revocations</p></div></div>{(data.consentAudit||[]).length?(data.consentAudit||[]).slice(0,12).map((x:any)=><div className="agent-run" key={x.id}><ShieldCheck/><div><b>{x.action}</b><small>{x.subject_type} · {x.subject_id}</small></div><span>{x.created_at?new Date(x.created_at).toLocaleString():'—'}</span></div>):<div className="empty-delivery-state"><ShieldCheck/><div><b>No consent audit entries yet</b><small>Consent changes will appear here after subjects make privacy choices.</small></div></div>}</section>
 <section className="app-panel"><div className="panel-head"><div><h3>Privacy request history</h3><p>Export, deletion and retention operations</p></div></div>{(privacy.recent||[]).length?(privacy.recent||[]).slice(0,12).map((x:any)=><div className="agent-run" key={x.id}><DatabaseZap/><div><b>{String(x.request_type||'request').replaceAll('_',' ')}</b><small>{x.selector_type||'workspace'} · {x.status}</small></div><span>{x.created_at?new Date(x.created_at).toLocaleString():'—'}</span><em className={x.status}>{x.status}</em></div>):<div className="empty-delivery-state"><DatabaseZap/><div><b>No privacy requests yet</b><small>Subject exports, deletions and retention runs create an audit record here.</small></div></div>}</section></div>
 </> 
}

