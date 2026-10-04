import {useEffect,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {
  Activity,AlertTriangle,ArrowRight,CheckCircle2,MessageCircle,ShieldCheck,Sparkles,X
} from 'lucide-react'
import {leakMonitorApi} from '../data/leak-monitor.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {ErrorState,LoadingState,StaleState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'

function PageHead({
  crumb,
  title,
  sub,
  action,
  onAction
}:{
  crumb:string
  title:string
  sub:string
  action?:string
  onAction?:()=>void
}){
  return <div className="page-head">
    <div>
      <span>{crumb}</span>
      <h1 tabIndex={-1}>{title}</h1>
      <p>{sub}</p>
    </div>
    {action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}
  </div>
}

function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){
  return <article className="stat">
    <div><span>{label}</span><Icon/></div>
    <strong>{value}</strong>
    <small>{sub}</small>
  </article>
}

type Notice={kind:'ok'|'error'|'unknown'|'',text:string}

const unknownMutation=(error:any)=>{
  const cause=String(error?.details?.cause||'')
  return cause==='timeout'||cause==='network'
}

export default function LeakMonitorPage(){
  const [data,setData]=useState<any>({items:[],stats:{},thresholds:{},recoveries:[]})
  const [busy,setBusy]=useState('')
  const [loading,setLoading]=useState(true)
  const [notice,setNotice]=useState<Notice>({kind:'',text:''})
  const [settingsOpen,setSettingsOpen]=useState(false)
  const [thresholdDraft,setThresholdDraft]=useState<any>({})

  useDirtyWork({
    key:'leak-monitor-threshold-draft',
    label:'Funnel leak thresholds',
    dirty:settingsOpen,
    scope:'feature'
  })

  const load=async()=>{
    setLoading(true)
    try{
      const result:any=await leakMonitorApi.load()
      setData(result)
      setThresholdDraft(result.thresholds||{})
      setNotice(current=>current.kind==='error'?{kind:'',text:''}:current)
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'Leak monitor could not be loaded. Existing leak evidence was preserved.'})
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{void load()},[])
 useDevelopmentLiveRefresh(()=>load())

  const recover=async(item:any,channel='call')=>{
    setBusy(item.leadRef)
    setNotice({kind:'',text:''})
    try{
      const result:any=await leakMonitorApi.recover({
        leadRef:item.leadRef,
        channel,
        reason:item.reason,
        priority:item.severity==='critical'?'high':'medium',
        delayMinutes:0
      })
      setNotice({
        kind:'ok',
        text:result.duplicate
          ?'An open leak-recovery follow-up already exists for '+item.name+'.'
          :'Recovery follow-up accepted for '+item.name+'.'
      })
      await load()
    }catch(error:any){
      setNotice(unknownMutation(error)
        ?{kind:'unknown',text:'The recovery request outcome is unknown because the acknowledgement was lost. Refresh leak state before queueing another recovery.'}
        :{kind:'error',text:error?.message||'Leak recovery could not be queued.'}
      )
    }finally{
      setBusy('')
    }
  }

  const saveSettings=async()=>{
    setBusy('settings')
    setNotice({kind:'',text:''})
    try{
      await leakMonitorApi.saveSettings(thresholdDraft)
      setNotice({kind:'ok',text:'Leak thresholds updated after backend confirmation.'})
      setSettingsOpen(false)
      await load()
    }catch(error:any){
      setNotice(unknownMutation(error)
        ?{kind:'unknown',text:'The threshold-save outcome is unknown. Refresh authoritative settings before saving again.'}
        :{kind:'error',text:error?.message||'Leak thresholds could not be saved.'}
      )
    }finally{
      setBusy('')
    }
  }

  const stats=data.stats||{}
  const formatAge=(minutes:number)=>minutes>=1440
    ?Math.floor(minutes/1440)+'d '+Math.floor((minutes%1440)/60)+'h'
    :minutes>=60
      ?Math.floor(minutes/60)+'h '+(minutes%60)+'m'
      :minutes+'m'
  const stageLabel=(stage:string)=>String(stage||'lead').replaceAll('_',' ')

  return <>
    <PageHead
      crumb="Tracking / Funnel"
      title="Funnel leak monitor"
      sub="Detect stalled handoffs across lead stages from persisted CRM, routing, follow-up and meeting evidence, then queue a recovery action before the lead goes cold."
      action="Configure thresholds"
      onAction={()=>setSettingsOpen(true)}
    />

    {loading&&!data.items?.length&&!Object.keys(data.thresholds||{}).length&&
      <LoadingState title="Loading funnel leak monitor" description="Reading persisted stage, routing, follow-up and meeting evidence."/>
    }
    {notice.text&&notice.kind==='error'&&
      <ErrorState title="Leak monitor action failed" description={notice.text} action={{label:'Refresh leak monitor',onClick:load}}/>
    }
    {notice.text&&notice.kind==='unknown'&&
      <StaleState title="Leak monitor action needs reconciliation" description={notice.text} action={{label:'Refresh authoritative state',onClick:load}}/>
    }
    {notice.text&&notice.kind==='ok'&&
      <div className="delivery-notice ok" role="status"><CheckCircle2/><span>{notice.text}</span></div>
    }

    <div className="stats-grid">
      <Stat label="Open leaks" value={String(stats.total||0)} sub="Stalled or missing-handoff leads" Icon={AlertTriangle}/>
      <Stat label="Critical" value={String(stats.critical||0)} sub="Severe leak evidence" Icon={ShieldCheck}/>
      <Stat label="High priority" value={String(stats.high||0)} sub="Past 2× stage threshold" Icon={Activity}/>
      <Stat label="Recovery queued" value={String(stats.recoveryQueued||0)} sub="Follow-up tasks created from leaks" Icon={MessageCircle}/>
    </div>

    <div className="leak-monitor-hero app-panel">
      <div><AlertTriangle/><div><span>STEP-BY-STEP FUNNEL MONITORING</span><h3>Stage evidence → stall detection → recovery action</h3><p>Leak detection uses each lead's current CRM stage, latest persisted activity, routing evidence, open follow-ups and future meetings. Converted/customer stages are excluded from the leak queue.</p></div></div>
      <div className="data-flow-steps">{['Lead enters','Stage advances','Handoff expected','Stall detected','Recovery queued'].map((item,index)=><span key={item}><b>{index+1}</b>{item}{index<4&&<ArrowRight/>}</span>)}</div>
    </div>

    <div className="leak-stage-grid">
      {Object.entries(stats.stageCounts||{}).length
        ?Object.entries(stats.stageCounts||{}).map(([stage,count]:any)=><article key={stage}><span>{stageLabel(stage)}</span><b>{String(count)}</b><small>open leak{Number(count)===1?'':'s'}</small></article>)
        :<article><span>No stalled stages</span><b>0</b><small>current evidence is within configured thresholds</small></article>
      }
    </div>

    <section className="app-panel" aria-busy={loading?'true':undefined}>
      <div className="panel-head">
        <div><h3>Leak queue</h3><p>Sorted by severity and time stalled</p></div>
        <button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh'}</button>
      </div>
      {(data.items||[]).length
        ?<div className="leak-list">
          {(data.items||[]).map((item:any)=>
            <article key={item.id} className={'leak-item '+item.severity}>
              <span className="leak-severity"><AlertTriangle/></span>
              <div className="leak-primary"><b>{item.name}</b><small>{item.crmStage} · {item.source}{item.campaign?' · '+item.campaign:''}</small><p>{item.reason}</p></div>
              <div className="leak-evidence"><span>Stalled</span><b>{formatAge(item.ageMinutes)}</b><small>threshold {formatAge(item.thresholdMinutes)}</small></div>
              <div className="leak-evidence"><span>Lead quality</span><b>{item.grade||'—'} · {item.score||0}</b><small>{item.evidence?.hasRoute?'Routed':'No route'} · {item.evidence?.openFollowUps||0} follow-up · {item.evidence?.futureMeetings||0} meeting</small></div>
              <span className={'leak-status '+(item.recoveryQueued?'recovered':item.severity)}>{item.recoveryQueued?'Recovery queued':item.severity}</span>
              <button disabled={busy===item.leadRef||item.recoveryQueued} onClick={()=>recover(item,'call')}>{busy===item.leadRef?'Queueing…':item.recoveryQueued?'Queued':'Queue recovery'}</button>
            </article>
          )}
        </div>
        :!loading&&<div className="empty-delivery-state"><CheckCircle2/><div><b>No current funnel leaks</b><small>All persisted active leads are within the configured stage thresholds or have the expected handoff evidence.</small></div></div>
      }
    </section>

    <div className="two-col">
      <section className="app-panel">
        <div className="panel-head"><div><h3>Leak thresholds</h3><p>Maximum inactivity before each stage is flagged</p></div></div>
        <div className="site-detail-grid">{Object.entries(data.thresholds||{}).map(([key,value]:any)=><div key={key}><span>{stageLabel(key)}</span><b>{formatAge(Number(value))}</b></div>)}</div>
      </section>
      <section className="app-panel">
        <div className="panel-head"><div><h3>Recent recoveries</h3><p>Persisted actions created from the leak queue</p></div></div>
        {(data.recoveries||[]).length
          ?(data.recoveries||[]).slice(0,8).map((item:any)=><div className="agent-run" key={item.id}><MessageCircle/><div><b>{item.leadRef}</b><small>{item.channel} · {item.reason}</small></div><span>{item.createdAt?new Date(item.createdAt).toLocaleString():'—'}</span><em className={item.status}>{item.status}</em></div>)
          :<div className="empty-delivery-state"><MessageCircle/><div><b>No recovery actions yet</b><small>Queue a recovery from an open leak to create a real follow-up task.</small></div></div>
        }
      </section>
    </div>

    {settingsOpen&&
      <AccessibleDialog ariaLabel="Configure leak thresholds" onClose={()=>setSettingsOpen(false)}>
        <div className="connector-card leak-settings-card">
          <div className="connector-modal-head">
            <div><AlertTriangle/><div><b>Configure leak thresholds</b><small>Minutes without meaningful stage activity before a lead becomes a leak.</small></div></div>
            <button aria-label="Close leak thresholds" onClick={()=>setSettingsOpen(false)}><X/></button>
          </div>
          <div className="leak-threshold-form">
            {['new','lead','qualified','routed','contacted','consultation'].map(key=>
              <label key={key}>
                <span>{stageLabel(key)}</span>
                <input type="number" min="5" max="43200" value={thresholdDraft[key]??''} onChange={event=>setThresholdDraft({...thresholdDraft,[key]:Number(event.target.value)})}/>
                <small>minutes</small>
              </label>
            )}
          </div>
          <div className="source-conflict-note"><ShieldCheck/><div><b>Detection only</b><p>Changing thresholds does not delete or modify lead records. Recovery actions remain explicit operator actions.</p></div></div>
          <button className="app-primary" disabled={busy==='settings'} onClick={saveSettings}>{busy==='settings'?'Saving…':'Save thresholds'}</button>
        </div>
      </AccessibleDialog>
    }
  </>
}
