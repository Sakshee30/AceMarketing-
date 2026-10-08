import {useEffect,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,ArrowRight,CheckCircle2,ChevronRight,Plus,ShieldCheck,Sparkles,Target,UsersRound,X,Zap} from 'lucide-react'
import {audiencesApi as api} from '../data/audiences.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {useDirtyWork} from '../../../lib/dirty-work'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string;title:string;sub:string;action?:string;onAction?:()=>void}){
  return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}</div>
}
function Stat({label,value,sub,Icon}:{label:string;value:string;sub:string;Icon:any}){
  return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>
}

export default function AudiencesPage(){
 const [segments,setSegments]=useState<any[]>([])
 const [stats,setStats]=useState<any>(null)
 const [builder,setBuilder]=useState(false)
 const [preset,setPreset]=useState<any>(null)
 const [preview,setPreview]=useState<any>(null)
 const [saving,setSaving]=useState(false)
 const [syncing,setSyncing]=useState('')
 const [scheduling,setScheduling]=useState('')
 const [notice,setNotice]=useState('')
 useDirtyWork({key:'audience-builder',label:'Audience builder draft',dirty:builder,scope:'feature'})
 const normalize=(r:any)=>{
  setSegments((r.items||[]).map((x:any)=>({...x,size:String(x.size??x.matchedSize??0),cadence:x.cadence||'Manual'})))
  setStats(r.stats||null)
 }
 const reloadAudiences=async()=>{const r:any=await api.audiences();normalize(r)}
 useEffect(()=>{reloadAudiences().catch((e:any)=>setNotice(e?.message||'Audiences could not be loaded.'))},[])
 useDevelopmentLiveRefresh(()=>reloadAudiences().catch((e:any)=>setNotice(e?.message||'Audiences could not be loaded.')))
 const previewAudience=async(e:any)=>{
  e.preventDefault();setNotice('')
  const f=new FormData(e.currentTarget)
  const payload={
    name:String(f.get('name')||''),
    condition:String(f.get('condition')||''),
    operator:String(f.get('operator')||''),
    value:String(f.get('value')||''),
    destination:String(f.get('destination')||''),
    mode:String(f.get('mode')||'Activate'),
    identityMode:String(f.get('identityMode')||'auto')
  }
  try{const r:any=await api.previewAudience(payload);setPreview({...payload,...r});setPreset(payload)}
  catch(e:any){setPreview(null);setNotice(e?.message||'Audience preview failed.')}
 }
 const openPreset=async(payload:any)=>{
  setNotice('');setPreset(payload);setPreview(null);setBuilder(true)
  try{const r:any=await api.previewAudience(payload);setPreview({...payload,...r})}
  catch(e:any){setNotice(e?.message||'Audience preview failed.')}
 }
 const openCustom=()=>{setPreset(null);setPreview(null);setBuilder(true)}
 const syncAudience=async(id:string)=>{setSyncing(id);setNotice('');try{await api.syncAudience(id);setNotice('Audience sync queued.');await reloadAudiences()}catch(e:any){setNotice(e?.message||'Audience sync failed.')}finally{setSyncing('')}}
 const setCadence=async(id:string,cadence:string)=>{setScheduling(id);setNotice('');try{await api.saveAudienceSchedule(id,cadence,cadence!=='Manual');await reloadAudiences()}catch(e:any){setNotice(e?.message||'Schedule could not be updated.')}finally{setScheduling('')}}
 const saveAudience=async()=>{if(!preview)return;setSaving(true);setNotice('');try{await api.createAudience(preview);await reloadAudiences();setBuilder(false);setPreset(null);setPreview(null);setNotice('Audience created and materialized.')}catch(e:any){setNotice(e?.message||'Audience could not be created.')}finally{setSaving(false)}}
 const exportAudiences=()=>{const rows=[['name','destination','identity_mode','size','cadence','mode','status'],...segments.map((x:any)=>[x.name,x.destination,x.identityMode||'auto',x.size,x.cadence,x.mode,x.status||''])];const csv=rows.map(r=>r.map((v:any)=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ace-audiences.csv';a.click();URL.revokeObjectURL(a.href)}
 const a=stats?.audiences||{}
 const lifecycle=stats?.lifecycle||{}
 const exclusions=stats?.exclusions||{}
 const latency=a.medianSyncLatencySeconds==null?'—':a.medianSyncLatencySeconds<60?a.medianSyncLatencySeconds+'s':Math.round(a.medianSyncLatencySeconds/60)+'m'
 const lifecycleRows=[
  {label:'Acquisition',detail:'New / active prospects',count:lifecycle.acquisition||0,preset:{name:'Acquisition prospects',condition:'CRM stage',operator:'is one of',value:'lead,new,active',destination:'Google Ads · Meta Ads',mode:'Retarget',identityMode:'auto'}},
  {label:'Nurture',detail:'Lead / contacted / connected',count:lifecycle.nurture||0,preset:{name:'Nurture-stage prospects',condition:'CRM stage',operator:'is one of',value:'lead,new,contacted,connected',destination:'Google Ads · Meta Ads',mode:'Retarget',identityMode:'auto'}},
  {label:'Decision',detail:'Qualified / consultation / opportunity',count:lifecycle.decision||0,preset:{name:'Decision-stage prospects',condition:'CRM stage',operator:'is one of',value:'qualified,consultation,opportunity',destination:'Google Ads · Meta Ads',mode:'Lookalike seed',identityMode:'auto'}},
  {label:'Post-purchase',detail:'Converted / enrolled / closed won',count:lifecycle.postPurchase||0,preset:{name:'Converted customer suppression',condition:'CRM stage',operator:'is one of',value:'converted,enrolled,closed_won,customer',destination:'Google Ads · Meta Ads',mode:'Suppress',identityMode:'auto'}}
 ]
 const exclusionRows=[
  {label:'Converted customers',detail:'Customer ID + hashed PII',count:exclusions.converted||0,preset:{name:'Converted customer suppression',condition:'CRM stage',operator:'is one of',value:'converted,enrolled,closed_won,customer',destination:'Google Ads · Meta Ads',mode:'Suppress',identityMode:'contact'}},
  {label:'Device-ID identities',detail:'First-party mobile advertising IDs',count:exclusions.deviceIds||0,preset:{name:'Device identity retargeting',condition:'Device ID present',operator:'is',value:'yes',destination:'Meta Ads',mode:'Retarget',identityMode:'device'}},
  {label:'Low-quality leads',detail:'Lead grade C / D',count:exclusions.lowQuality||0,preset:{name:'Low-quality lead suppression',condition:'Lead grade',operator:'is one of',value:'C,D',destination:'Google Ads · Meta Ads',mode:'Suppress',identityMode:'auto'}}
 ]
 return <><PageHead crumb="Activation / Audiences" title="Audience management" sub="Activate high-intent first-party segments and suppress converted, low-quality or device-identified users."/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Audience records" value={stats?.available?String(a.total||0):'—'} sub={(a.active||0)+' provider-active'} Icon={UsersRound}/><Stat label="Activated identities" value={stats?.available?Number(a.activatedIdentities||0).toLocaleString('en-IN'):'—'} sub="Materialized non-suppression members" Icon={Target}/><Stat label="Suppressed identities" value={stats?.available?Number(a.suppressedIdentities||0).toLocaleString('en-IN'):'—'} sub="Materialized suppression members" Icon={ShieldCheck}/><Stat label="Observed sync latency" value={latency} sub="From persisted successful sync timestamps" Icon={Activity}/></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Active segments</h3><p>Materialized from persisted lead/device profiles; provider sync state is explicit</p></div><div className="panel-actions"><button onClick={exportAudiences}>Export</button><button className="app-primary" onClick={openCustom}><Plus/>New audience</button></div></div>{segments.length?segments.map((x:any)=><div className="audience-row" key={x.id||x.name}><UsersRound/><div><b>{x.name}</b><small>{x.destination} · {x.identityMode||'auto'} identity{x.lastSyncError?' · '+x.lastSyncError:''}{x.schedule?.last_added||x.schedule?.last_removed?` · Δ +${x.schedule?.last_added||0}/-${x.schedule?.last_removed||0}`:''}</small></div><strong>{x.size}</strong>{x.id?<select aria-label={'Cadence for '+x.name} disabled={scheduling===x.id} value={x.cadence||'Manual'} onChange={e=>setCadence(x.id,e.target.value)}><option>Manual</option><option>Real time</option><option>Every 5 min</option><option>Every 15 min</option><option>Hourly</option><option>Every 6 hours</option><option>Daily</option></select>:<span>{x.cadence}</span>}<em className={String(x.mode).toLowerCase()}>{x.mode}</em>{x.status&&<small>{String(x.status).replaceAll('_',' ')}</small>}{x.id&&['ready_for_sync','error','materialized'].includes(x.status)&&<button disabled={syncing===x.id} onClick={()=>syncAudience(x.id)}>{syncing===x.id?'Queueing…':'Sync now'}</button>}<ChevronRight/></div>):<div className="empty-delivery-state"><UsersRound/><div><b>No audiences yet</b><small>Create a first-party audience from persisted lead, journey or device identity.</small></div></div>}</div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Lifecycle audiences</h3><p>Derived from persisted CRM/lead stages · click a row to preview the real segment</p></div></div>{lifecycleRows.map((x:any)=><button className="lifecycle-row audience-preset-row" key={x.label} onClick={()=>openPreset(x.preset)}><span>{x.label}</span><div><b>{x.detail}</b><small>{Number(x.count).toLocaleString('en-IN')} identities</small></div><em>{x.preset.mode}</em><ChevronRight/></button>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Waste-control identity pool</h3><p>Turn observed waste pools into persisted suppression/retargeting audiences</p></div></div>{exclusionRows.map((x:any)=><button className="exclusion-row audience-preset-row" key={x.label} onClick={()=>openPreset(x.preset)}><ShieldCheck/><div><b>{x.label}</b><small>{x.detail}</small></div><strong>{Number(x.count).toLocaleString('en-IN')}</strong><span>{x.preset.mode}</span></button>)}</div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Audience signals</h3><p>First-party attributes available to the builder</p></div></div><div className="context-chips">{['Lead grade','CRM stage','Conversion propensity','Pricing-page views','LTV tier','Last activity','Device ID present','Device platform','App ID'].map(x=><span key={x}>{x}</span>)}</div></div><div className="app-panel"><div className="panel-head"><div><h3>Activation guardrails</h3><p>Provider sync checks consent again before data leaves AceMarketing</p></div></div>{[['Marketing consent','Required for every member'],['Device audience','Mobile advertising ID + app context'],['Converted customer','Suppress acquisition'],['Low quality / invalid','Suppress optimization'],['High-value prospect','Seed / optimize']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div></div>
 {builder&&<AccessibleDialog ariaLabel={preset?'Audience preset':'Audience Builder'} onClose={()=>{setBuilder(false);setPreset(null);setPreview(null)}}><form key={preset?.name||'custom-audience'} className="connector-card audience-builder" onSubmit={previewAudience}><div className="connector-modal-head"><div><UsersRound/><div><b>{preset?'Audience preset':'Audience Builder'}</b><small>{preset?'Review the persisted rule before materializing this audience.':'Create a first-party segment from journey, CRM or device evidence'}</small></div></div><button type="button" aria-label="Close audience builder" onClick={()=>{setBuilder(false);setPreset(null);setPreview(null)}}><X/></button></div>
 {preset&&<div className="audience-preset-banner"><Zap/><div><b>{preset.name}</b><span>{preset.condition} {preset.operator} {preset.value} → {preset.mode}</span></div></div>}
 <label>Audience name<input name="name" required defaultValue={preset?.name||'High-intent prospects'}/></label>
 <div className="audience-rule-grid"><label>Condition<select name="condition" defaultValue={preset?.condition||'Lead grade'}><option>Lead grade</option><option>Conversion propensity</option><option>CRM stage</option><option>Pricing-page views</option><option>LTV tier</option><option>Last activity</option><option>Device ID present</option><option>Device platform</option><option>App ID</option></select></label><label>Operator<select name="operator" defaultValue={preset?.operator||'is'}><option>is</option><option>is one of</option><option>is greater than</option><option>is less than</option><option>contains</option></select></label><label>Value<input name="value" defaultValue={preset?.value||'A'}/></label></div>
 <label>Identity key<select name="identityMode" defaultValue={preset?.identityMode||'auto'}><option value="auto">Auto · contact first, device fallback</option><option value="contact">Contact info · hashed email / phone</option><option value="device">Mobile advertising ID</option></select></label>
 <label>Destination<select name="destination" defaultValue={preset?.destination||'Google Ads · Meta Ads'}><option>Google Ads · Meta Ads</option><option>Google Ads</option><option>Meta Ads</option></select></label>
 <label>Mode<select name="mode" defaultValue={preset?.mode||'Activate'}><option>Activate</option><option>Suppress</option><option>Retarget</option><option>Lookalike seed</option></select></label>
 {preview&&<div className="audience-preview"><div><span>Estimated audience</span><strong>{Number(preview.estimatedSize||0).toLocaleString()}</strong></div><div><span>Workspace coverage</span><strong>{preview.matchedPercent||0}%</strong></div><p>{preview.condition} {preview.operator} {preview.value} → {preview.destination} · {preview.identityMode} identity</p></div>}
 <div className="audience-builder-actions"><button type="button" onClick={()=>{setBuilder(false);setPreset(null);setPreview(null)}}>Cancel</button>{preview?<button type="button" className="app-primary" disabled={saving} onClick={saveAudience}>{saving?'Saving…':'Create & materialize audience'}</button>:<button type="submit" className="app-primary">Preview audience</button>}</div></form></AccessibleDialog>}</>
}
