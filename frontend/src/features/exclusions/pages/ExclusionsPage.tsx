import {useEffect,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {ArrowRight,CheckCircle2,ShieldCheck,Smartphone,UsersRound,X} from 'lucide-react'
import {exclusionsApi as api} from '../data/exclusions.api'
import {StaleState} from '../../../components/system/FrontendStates'
import {ActivationPageHead as PageHead,ActivationStat as Stat} from '../ui/ExclusionsPrimitives'

export default function ExclusionsPage(){
 const [data,setData]=useState<any>({items:[],presets:[],stats:{}})
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const load=async()=>{try{setData(await api.exclusions())}catch(e:any){setNotice(e?.message||'Exclusion audiences could not be loaded.')}}
 useEffect(()=>{load()},[])
 useDevelopmentLiveRefresh(()=>load())
 const createPreset=async(preset:any,destination:string)=>{
  setBusy('create:'+preset.key+':'+destination);setNotice('')
  try{
   const r:any=await api.createExclusion(preset.key,destination)
   setNotice(r.duplicate?'Matching exclusion audience already exists.':'Exclusion audience created and materialized.')
   await load()
  }catch(e:any){const cause=String(e?.details?.cause||'');setNotice(cause==='timeout'||cause==='network'?'OUTCOME_UNKNOWN: The backend did not confirm whether this exclusion audience was created. Refresh exclusions before creating the same suppression again.':e?.message||'Exclusion audience could not be created.')}
  finally{setBusy('')}
 }
 const sync=async(item:any)=>{
  setBusy('sync:'+item.id);setNotice('')
  try{await api.syncAudience(item.id);setNotice('Exclusion audience sync queued for '+item.destination+'.');await load()}
  catch(e:any){const cause=String(e?.details?.cause||'');setNotice(cause==='timeout'||cause==='network'?'OUTCOME_UNKNOWN: The backend did not confirm whether this exclusion sync was accepted. Refresh sync state before retrying.':e?.message||'Exclusion audience sync failed.')}
  finally{setBusy('')}
 }
 const stats=data.stats||{}
 return <><PageHead crumb="Activation / Exclusions" title="Audience suppression & exclusions" sub="Stop wasting impressions on converted customers, low-quality leads and known devices by materializing first-party suppression audiences and syncing them to ad platforms." action="Refresh" onAction={load}/>
 {notice.startsWith('OUTCOME_UNKNOWN:')?<StaleState title="Exclusion action needs reconciliation" description={notice.replace('OUTCOME_UNKNOWN: ','')} action={{label:'Refresh exclusions',onClick:load}}/>:notice&&<div className={'delivery-notice '+(notice.toLowerCase().includes('failed')||notice.toLowerCase().includes('could not')?'error':'ok')}><ShieldCheck/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Suppression audiences" value={String(stats.total||0)} sub="Persisted exclusion segments" Icon={ShieldCheck}/><Stat label="Suppressed identities" value={String(stats.suppressedIdentities||0)} sub="Materialized first-party identities" Icon={UsersRound}/><Stat label="Converted profiles" value={String(stats.converted||0)} sub="Eligible for customer suppression" Icon={CheckCircle2}/><Stat label="Known devices" value={String(stats.deviceIds||0)} sub="Eligible device-ID exclusions" Icon={Smartphone}/></div>
 <div className="exclusion-hero app-panel"><div><ShieldCheck/><div><span>ACQUISITION WASTE CONTROL</span><h3>First-party state → suppression segment → ad-platform exclusion</h3><p>Use deterministic customer and device evidence to keep existing customers or irrelevant leads out of prospecting audiences. Sync uses the same governed audience queue as the main Audience Builder.</p></div></div><div className="data-flow-steps">{['Identify','Materialize','Review size','Sync audience','Exclude from ads'].map((x,i)=><span key={x}><b>{i+1}</b>{x}{i<4&&<ArrowRight/>}</span>)}</div></div>
 <div className="exclusion-preset-grid">{(data.presets||[]).map((p:any)=><article className="app-panel exclusion-preset" key={p.key}><div className="exclusion-preset-head"><span><ShieldCheck/></span><div><b>{p.name}</b><p>{p.description}</p></div></div><div className="exclusion-preview"><strong>{Number(p.preview?.estimatedSize||0).toLocaleString('en-IN')}</strong><span>estimated matches</span><small>{Number(p.preview?.matchedPercent||0)}% of active profiles</small></div><div className="context-chips"><span>{p.condition}</span><span>{String(p.operator).replaceAll('_',' ')}</span><span>{p.identityMode==='device'?'Device identity':'Auto identity'}</span></div><div className="approval-actions"><button disabled={busy.startsWith('create:'+p.key)} onClick={()=>createPreset(p,'Meta Ads')}>{busy==='create:'+p.key+':Meta Ads'?'Creating…':'Create Meta exclusion'}</button><button className="approve" disabled={busy.startsWith('create:'+p.key)} onClick={()=>createPreset(p,'Google Ads')}>{busy==='create:'+p.key+':Google Ads'?'Creating…':'Create Google exclusion'}</button></div></article>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Materialized exclusions</h3><p>Persisted suppression audiences and provider sync state</p></div><span className={(data.items||[]).length?'healthy':'status'}>{(data.items||[]).length} configured</span></div>{(data.items||[]).length?<div className="exclusion-table">{(data.items||[]).map((x:any)=><article key={x.id}><div className="exclusion-icon"><X/></div><div><b>{x.name}</b><small>{x.destination} · {x.identityMode||'auto'} identity</small></div><strong>{Number(x.size||0).toLocaleString('en-IN')}<small> identities</small></strong><span className={x.status==='active'||x.status==='ready_for_sync'?'healthy':'status'}>{x.status}</span><button disabled={busy==='sync:'+x.id} onClick={()=>sync(x)}>{busy==='sync:'+x.id?'Queueing…':'Sync exclusion'}</button></article>)}</div>:<div className="empty-delivery-state"><ShieldCheck/><div><b>No suppression audiences yet</b><small>Create one of the recommended exclusions above. No example audience is inserted into an empty workspace.</small></div></div>}</div>
 </> 
}
