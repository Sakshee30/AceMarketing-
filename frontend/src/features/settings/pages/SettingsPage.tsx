import {useEffect,useState} from 'react'
import {Activity,CheckCircle2,ChevronRight} from 'lucide-react'
import {settingsApi as api} from '../data/settings.api'
import {useDirtyWork} from '../../../lib/dirty-work'
import {SettingsPageHead as PageHead} from '../ui/SettingsPrimitives'
import {UsersRolesSettings} from '../components/UsersRolesSettings'
import {GovernanceSettings} from '../components/GovernanceSettings'
import {BillingUsageSettings} from '../components/BillingUsageSettings'

export default function SettingsPage(){
 const sections=['Workspace','Users & roles','Tracking','Governance','API & webhooks','Agent approvals','Notifications','Billing & usage']
 const settingsDefaults:any={
  organization:'Ace EdTech',timezone:'Asia/Kolkata',currency:'INR',reportingWeek:'Monday',defaultAttribution:'Full path',environment:'Production',
  primaryDomain:'www.example.com',crossDomainTracking:'Enabled',gclidPersistenceDays:90,fbclidPersistenceDays:90,
  notifyDeliveryFailures:true,notifyTokenExpiry:true,notifyAudienceStale:true,notifyDailySummary:true,notificationEmail:'',notificationSlack:false,
  approvalSignalReturn:'Auto-run',approvalCrmEnrichment:'Auto-run',approvalLeadQualification:'Human approval',approvalAudienceSuppression:'Human approval',approvalCustomIntegration:'Human approval'
 }
 const [section,setSection]=useState('Workspace')
 const [apiKey,setApiKey]=useState('')
 const [notice,setNotice]=useState('')
 const [busy,setBusy]=useState('')
 const [settings,setSettings]=useState<any>(settingsDefaults)
 const [savedSettings,setSavedSettings]=useState<any>(settingsDefaults)
 const dirtyKeys=Object.keys(settings).filter(key=>JSON.stringify(settings[key])!==JSON.stringify(savedSettings[key]))
 useDirtyWork({key:'workspace-settings',label:'Workspace settings',dirty:dirtyKeys.length>0,scope:'workspace'})

 const load=async()=>{
  try{
   const r:any=await api.settings()
   const next={...settingsDefaults,...r}
   setSettings(next)
   setSavedSettings(next)
  }catch{}
 }
 useEffect(()=>{load()},[])
 const save=async(keys?:string[])=>{
  setBusy('save');setNotice('')
  try{
   const payload:any={}
   for(const [key,value] of Object.entries(settings))if(!keys||keys.includes(key))payload[key]=value
   const r:any=await api.saveSettings(payload)
   const next={...settings,...r}
   setSettings(next)
   setSavedSettings((previous:any)=>{
    const confirmed={...previous}
    const confirmedKeys=new Set([...Object.keys(payload),...Object.keys(r||{})])
    for(const key of confirmedKeys)confirmed[key]=next[key]
    return confirmed
   })
   setNotice('Workspace settings saved.')
  }catch(e:any){const cause=String(e?.details?.cause||'');setNotice(cause==='timeout'||cause==='network'?'The backend did not confirm whether these settings were saved. Your local edits remain unsaved; refresh authoritative settings before submitting the same change again.':e?.message||'Settings could not be saved.')}
  finally{setBusy('')}
 }
 const makeKey=async()=>{try{const r:any=await api.createApiKey({name:'workspace'});setApiKey(r.key);setNotice('API key created. Copy it now; only its fingerprint is stored.')}catch(e:any){const cause=String(e?.details?.cause||'');setNotice(cause==='timeout'||cause==='network'?'API key creation outcome is unknown because the backend did not confirm the result. Do not repeatedly create keys; reconcile through the Developer console before retrying.':e?.message||'API key could not be created.')}}
 const workspaceFields=[['organization','Organization'],['timezone','Timezone'],['currency','Currency'],['reportingWeek','Reporting week'],['defaultAttribution','Default attribution'],['environment','Environment']]
 const content:any={
  'Workspace':<div className="settings-detail"><h3>Workspace profile</h3><p>These values are persisted for this workspace and used by reporting and operational views.</p><div className="setup-form-grid">{workspaceFields.map(([key,label])=><label key={key}><span>{label}</span><input value={String(settings[key]??'')} onChange={e=>setSettings({...settings,[key]:e.target.value})}/></label>)}</div><button className="app-primary" disabled={busy==='save'} onClick={()=>save(workspaceFields.map(x=>x[0]))}>{busy==='save'?'Saving…':'Save workspace'}</button></div>,
  'Users & roles':<UsersRolesSettings/>,
  'Tracking':<div className="settings-detail"><h3>Tracking configuration</h3><p>Update first-party collection defaults without editing code.</p><div className="setup-form-grid"><label><span>Primary domain</span><input value={settings.primaryDomain||''} onChange={e=>setSettings({...settings,primaryDomain:e.target.value})}/></label><label><span>Cross-domain tracking</span><select value={settings.crossDomainTracking||'Enabled'} onChange={e=>setSettings({...settings,crossDomainTracking:e.target.value})}><option>Enabled</option><option>Disabled</option></select></label><label><span>GCLID persistence days</span><input type="number" min="1" max="365" value={settings.gclidPersistenceDays||90} onChange={e=>setSettings({...settings,gclidPersistenceDays:Number(e.target.value)})}/></label><label><span>FBCLID persistence days</span><input type="number" min="1" max="365" value={settings.fbclidPersistenceDays||90} onChange={e=>setSettings({...settings,fbclidPersistenceDays:Number(e.target.value)})}/></label></div><div className="setting-line"><span>Server event endpoint</span><b>/api/track</b><span className="healthy">Active</span></div><button className="app-primary" disabled={busy==='save'} onClick={()=>save(['primaryDomain','crossDomainTracking','gclidPersistenceDays','fbclidPersistenceDays'])}>{busy==='save'?'Saving…':'Save tracking settings'}</button></div>,
  'Governance':<GovernanceSettings/>,
  'API & webhooks':<div className="settings-detail"><h3>API keys & webhooks</h3><div className="api-key-box"><div><span>Workspace API key</span><code>{apiKey||'Hidden until created or rotated'}</code></div><button onClick={makeKey}>{apiKey?'Rotate key':'Create key'}</button></div><p>Outbound webhook subscriptions are managed in the Developer console, where endpoints and delivery history are persisted.</p></div>,
  'Agent approvals':<div className="settings-detail"><h3>Agent approval boundaries</h3><p>Persist the workspace policy that determines which automated actions require human approval.</p>{[
    ['approvalSignalReturn','Signal return','Low risk'],
    ['approvalCrmEnrichment','CRM enrichment','Low risk'],
    ['approvalLeadQualification','Lead qualification call','Customer contact'],
    ['approvalAudienceSuppression','Audience suppression','Spend impact'],
    ['approvalCustomIntegration','Custom integration write','External mutation']
  ].map(([key,label,risk])=><div className="setting-line" key={key}><span>{label}</span><select value={settings[key]||'Human approval'} onChange={e=>setSettings({...settings,[key]:e.target.value})}><option>Auto-run</option><option>Human approval</option><option>Disabled</option></select><em>{risk}</em></div>)}<button className="app-primary" disabled={busy==='save'} onClick={()=>save(['approvalSignalReturn','approvalCrmEnrichment','approvalLeadQualification','approvalAudienceSuppression','approvalCustomIntegration'])}>{busy==='save'?'Saving…':'Save approval policy'}</button></div>,
  'Notifications':<div className="settings-detail"><h3>Notifications</h3><p>Choose which workspace events should generate operator notifications.</p><div className="setup-form-grid"><label><span>Notification email</span><input type="email" value={settings.notificationEmail||''} onChange={e=>setSettings({...settings,notificationEmail:e.target.value})} placeholder="ops@company.com"/></label><label><span>Slack notifications</span><select value={settings.notificationSlack?'Enabled':'Disabled'} onChange={e=>setSettings({...settings,notificationSlack:e.target.value==='Enabled'})}><option>Disabled</option><option>Enabled</option></select></label></div>{[
    ['notifyDeliveryFailures','Critical delivery failures','Delivery / DLQ'],
    ['notifyTokenExpiry','Connector token expiry','Integrations'],
    ['notifyAudienceStale','Audience stale > 60m','Audiences'],
    ['notifyDailySummary','Daily performance summary','Reporting']
  ].map(([key,label,scope])=><div className="setting-line" key={key}><span>{label}</span><b>{scope}</b><label className="setting-toggle"><input type="checkbox" checked={Boolean(settings[key])} onChange={e=>setSettings({...settings,[key]:e.target.checked})}/><span>{settings[key]?'Enabled':'Disabled'}</span></label></div>)}<button className="app-primary" disabled={busy==='save'} onClick={()=>save(['notifyDeliveryFailures','notifyTokenExpiry','notifyAudienceStale','notifyDailySummary','notificationEmail','notificationSlack'])}>{busy==='save'?'Saving…':'Save notifications'}</button></div>,
  'Billing & usage':<BillingUsageSettings/>
 }
 return <><PageHead crumb="Workspace / Settings" title="Workspace settings" sub="Configure organization, access, tracking, governance, developer access and automation boundaries."/>
 {dirtyKeys.length>0&&<div className="delivery-notice"><Activity/><span>{dirtyKeys.length} unsaved setting{dirtyKeys.length===1?'':'s'} · save or explicitly leave this page to discard them.</span></div>}
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="settings-shell"><aside className="settings-nav">{sections.map(x=><button key={x} className={section===x?'active':''} onClick={()=>setSection(x)}>{x}<ChevronRight/></button>)}</aside><div className="app-panel">{content[section]}</div></div></>
}
