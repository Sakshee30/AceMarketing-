import {useEffect,useState} from 'react'
import {Activity,CheckCircle2,ShieldCheck} from 'lucide-react'
import {settingsApi as api} from '../data/settings.api'
import {SettingsStat as Stat} from '../ui/SettingsPrimitives'

export function GovernanceSettings(){
 const [data,setData]=useState<any>(null)
 const [privacy,setPrivacy]=useState<any>(null)
 const [selectorType,setSelectorType]=useState('visitor')
 const [selector,setSelector]=useState('')
 const [result,setResult]=useState<any>(null)
 const [busy,setBusy]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<{kind:'ok'|'error'|'',text:string}>({kind:'',text:''})
 const refresh=async()=>{
  setLoading(true)
  try{
   const [consent,requests]:any=await Promise.all([api.consentStats(),api.privacyRequests()])
   setData(consent);setPrivacy(requests)
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Governance data could not be loaded.'})}
  finally{setLoading(false)}
 }
 useEffect(()=>{refresh()},[])
 const runExport=async()=>{
  if(!selector.trim()){setNotice({kind:'error',text:'Enter a subject identifier before exporting data.'});return}
  setBusy('export');setNotice({kind:'',text:''})
  try{setResult(await api.privacyExport(selectorType,selector.trim()));setNotice({kind:'ok',text:'Privacy export completed and audited.'});await refresh()}
  catch(e:any){setNotice({kind:'error',text:e?.message||'Privacy export failed.'})}
  finally{setBusy('')}
 }
 const runDelete=async()=>{
  if(!selector.trim()){setNotice({kind:'error',text:'Enter a subject identifier before deleting data.'});return}
  setBusy('delete');setNotice({kind:'',text:''})
  try{setResult(await api.privacyDelete(selectorType,selector.trim()));setNotice({kind:'ok',text:'Privacy deletion completed and audited.'});await refresh()}
  catch(e:any){setNotice({kind:'error',text:e?.message||'Privacy deletion failed.'})}
  finally{setBusy('')}
 }
 const runPurge=async()=>{
  setBusy('purge');setNotice({kind:'',text:''})
  try{setResult(await api.privacyRetentionPurge(true));setNotice({kind:'ok',text:'Retention dry run completed. No records were deleted.'});await refresh()}
  catch(e:any){setNotice({kind:'error',text:e?.message||'Retention preview failed.'})}
  finally{setBusy('')}
 }
 const s=data?.stats||{}
 return <div className="settings-detail"><div className="panel-head"><div><h3>Data governance & consent</h3><p>Consent decisions are enforced server-side before analytics tracking and marketing activation.</p></div><button disabled={loading} onClick={refresh}>{loading?'Refreshing…':'Refresh governance'}</button></div>
 {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}>{notice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}<span>{notice.text}</span></div>}
 <div className="stats-grid compact"><Stat label="Consent records" value={loading&&!data?'—':String(s.total||0)} sub="Auditable subjects" Icon={ShieldCheck}/><Stat label="Analytics allowed" value={loading&&!data?'—':String(s.analytics||0)} sub="Measurement consent" Icon={Activity}/><Stat label="Marketing allowed" value={loading&&!data?'—':String(s.marketing||0)} sub="Activation consent" Icon={Target}/><Stat label="Revoked" value={loading&&!data?'—':String(s.revoked||0)} sub="Activation blocked" Icon={X}/></div>
 {['Essential storage','Analytics tracking','Marketing activation','Personalization'].map((x,i)=><div className="setting-line" key={x}><span>{x}</span><b>{i===0?'Always enabled':'Consent required'}</b><span className={i===0?'healthy':'status'}>{i===0?'Essential':'Default off'}</span></div>)}
 <h4>Data subject operations</h4><div className="privacy-ops"><select value={selectorType} onChange={e=>setSelectorType(e.target.value)}><option value="visitor">Visitor ID</option><option value="customer">Customer ID</option><option value="email">Email</option><option value="phone">Phone</option><option value="lead">Lead ID</option></select><input value={selector} onChange={e=>setSelector(e.target.value)} placeholder="Subject identifier"/><button onClick={runExport} disabled={!!busy||!selector.trim()}>{busy==='export'?'Exporting…':'Export data'}</button><button onClick={runDelete} disabled={!!busy||!selector.trim()}>{busy==='delete'?'Deleting…':'Delete data'}</button><button onClick={runPurge} disabled={!!busy}>{busy==='purge'?'Checking…':'Preview retention purge'}</button></div>
 {result&&<pre className="privacy-result">{JSON.stringify(result,null,2)}</pre>}
 <h4>Retention policy</h4><div className="setting-line"><span>Click sessions</span><b>{privacy?.policy?.clickSessions?privacy.policy.clickSessions+' days':'Explicit policy not set'}</b><span className="status">Expired sessions still purged</span></div><div className="setting-line"><span>Assisted events</span><b>{privacy?.policy?.assistedEvents?privacy.policy.assistedEvents+' days':'Explicit policy not set'}</b><span className="status">Opt-in</span></div><div className="setting-line"><span>Lead profiles</span><b>{privacy?.policy?.leadProfiles?privacy.policy.leadProfiles+' days':'Explicit policy not set'}</b><span className="status">Opt-in</span></div><div className="setting-line"><span>Consent records</span><b>{privacy?.policy?.consentRecords?privacy.policy.consentRecords+' days':'Explicit policy not set'}</b><span className="status">Opt-in</span></div>
 <h4>Recent privacy requests</h4>{loading&&!privacy?<div className="empty-state"><Activity/><b>Loading privacy history</b></div>:(privacy?.items||[]).length?(privacy.items||[]).slice(0,8).map((x:any)=><div className="audit-row" key={x.id}><ShieldCheck/><div><b>{x.request_type}</b><small>{x.selector_type||'workspace'} · {x.status}</small></div><span>{new Date(x.created_at).toLocaleString()}</span></div>):<div className="empty-state"><ShieldCheck/><b>No privacy requests yet</b><small>Exports, deletions, and retention previews will appear here.</small></div>}
 <h4>Recent consent audit</h4>{loading&&!data?<div className="empty-state"><Activity/><b>Loading consent audit</b></div>:(data?.audit||[]).length?(data.audit||[]).slice(0,8).map((x:any)=><div className="audit-row" key={x.id}><ShieldCheck/><div><b>{x.action}</b><small>{x.subject_type} · {x.subject_id}</small></div><span>{new Date(x.created_at).toLocaleString()}</span></div>):<div className="empty-state"><ShieldCheck/><b>No consent audit entries yet</b><small>Consent updates and revocations will appear here.</small></div>}
 </div>
}
