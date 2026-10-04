import {useEffect,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,ArrowRight,Bell,Check,CheckCircle2,MessageCircle,ShieldCheck,Sparkles} from 'lucide-react'
import {alertsApi} from '../data/alerts.api'
import {StaleState} from '../../../components/system/FrontendStates'
import {initialMutationLifecycle,mutationLifecycle} from '../../../lib/mutation-lifecycle'

function AlertsPageHead({
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

function AlertStat({
  label,
  value,
  sub,
  Icon
}:{
  label:string
  value:string
  sub:string
  Icon:any
}){
  return <article className="stat">
    <div><span>{label}</span><Icon/></div>
    <strong>{value}</strong>
    <small>{sub}</small>
  </article>
}

const mapItems=(response:any)=>(response.items||[]).map((item:any)=>({
  ...item,
  severity:String(item.severity||'info').replace(/^./,(match:string)=>match.toUpperCase()),
  source:item.source||'Platform monitoring',
  age:new Date(item.detected_at||Date.now()).toLocaleString(),
  detail:item.detail||'',
  status:item.status||'open'
}))

export default function AlertsPage(){
  const [items,setItems]=useState<any[]>([])
  const [selected,setSelected]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState('')
  const [notice,setNotice]=useState<{kind:'ok'|'error'|'unknown'|'',text:string}>({kind:'',text:''})
  const [resolveState,setResolveState]=useState(()=>initialMutationLifecycle<any>())

  const load=async()=>{
    setLoading(true)
    try{
      const response:any=await alertsApi.list()
      const mapped=mapItems(response)
      setItems(mapped)
      setSelected((current:string)=>current&&mapped.some((item:any)=>item.id===current)?current:(mapped[0]?.id||''))
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'Alert Center could not be loaded.'})
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{void load()},[])
 useDevelopmentLiveRefresh(()=>load())

  const current=items.find(item=>item.id===selected)||items[0]

  const resolve=async(id:string)=>{
    let lifecycle=mutationLifecycle.validating(resolveState)
    setResolveState(lifecycle)
    lifecycle=mutationLifecycle.submitting(lifecycle)
    setResolveState(lifecycle)
    setBusy(id)
    setNotice({kind:'',text:''})

    try{
      const resolved:any=await alertsApi.resolve(id)
      if(String(resolved?.status||'').toLowerCase()!=='resolved'){
        throw new Error('Backend did not confirm alert resolution.')
      }

      setItems(currentItems=>currentItems.map(item=>
        item.id===id
          ?{
            ...item,
            ...resolved,
            severity:String(resolved.severity||item.severity||'info').replace(/^./,(match:string)=>match.toUpperCase()),
            status:'resolved'
          }
          :item
      ))
      setResolveState(mutationLifecycle.confirmed(lifecycle,resolved))
      setNotice({kind:'ok',text:'Alert resolved and confirmed by the backend.'})
    }catch(error:any){
      const requestId=error?.requestId||null
      const cause=String(error?.details?.cause||'')
      if(cause==='timeout'||cause==='network'){
        const message='The backend did not confirm whether this alert was resolved. Refresh the Alert Center before repeating the action.'
        setResolveState(mutationLifecycle.unknown(lifecycle,message,requestId))
        setNotice({kind:'unknown',text:message})
      }else if(Number(error?.status)===409){
        const message=error?.message||'This alert changed while you were reviewing it. Refresh before resolving it again.'
        setResolveState(mutationLifecycle.conflict(lifecycle,message,requestId))
        setNotice({kind:'error',text:message})
      }else{
        const message=error?.message||'Alert could not be resolved. Its open status has been preserved.'
        setResolveState(mutationLifecycle.rejected(lifecycle,message,requestId))
        setNotice({kind:'error',text:message})
      }
    }finally{
      setBusy('')
    }
  }

  return <>
    <AlertsPageHead
      crumb="Operations / Alerts"
      title="Alert Center"
      sub="Triage incidents generated from real workspace telemetry and operational thresholds."
      action="Manage rules"
      onAction={()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Monitoring'}))}
    />

    {notice.text&&notice.kind==='unknown'&&
      <StaleState
        title="Alert resolution needs reconciliation"
        description={notice.text}
        action={{label:'Refresh before retrying',onClick:load}}
      />
    }

    {notice.text&&notice.kind!=='unknown'&&
      <div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}>
        {notice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}
        <span>{notice.text}</span>
      </div>
    }

    <div className="stats-grid">
      <AlertStat label="Open alerts" value={loading?'—':String(items.filter(item=>item.status==='open').length)} sub="Live operational incidents" Icon={Bell}/>
      <AlertStat label="Critical" value={loading?'—':String(items.filter(item=>item.status==='open'&&String(item.severity).toLowerCase()==='critical').length)} sub="Needs immediate review" Icon={Activity}/>
      <AlertStat label="Warnings" value={loading?'—':String(items.filter(item=>item.status==='open'&&String(item.severity).toLowerCase()==='warning').length)} sub="Threshold breaches" Icon={Check}/>
      <AlertStat label="Resolved" value={loading?'—':String(items.filter(item=>item.status==='resolved').length)} sub="Incident history" Icon={MessageCircle}/>
    </div>

    <div className="alert-center-layout">
      <div className="app-panel alert-center-list">
        <div className="panel-head">
          <div><h3>Operational incidents</h3><p>Newest telemetry-generated incidents first</p></div>
          <button disabled={loading} onClick={load}>{loading?'Loading…':'Refresh'}</button>
        </div>

        {loading
          ?<div className="empty-state"><Activity/><b>Loading incidents</b><small>Reading persisted monitoring alerts.</small></div>
          :items.length
            ?items.map(item=>
              <button key={item.id} className={selected===item.id?'selected':''} onClick={()=>setSelected(item.id)}>
                <Bell/>
                <div><b>{item.title}</b><small>{item.source} · {item.age}</small></div>
                <span className={String(item.severity).toLowerCase()}>{item.severity}</span>
                <em className={item.status}>{item.status}</em>
              </button>
            )
            :<div className="empty-state"><Check/><b>No incidents</b><small>Monitoring rules have not detected a breach.</small></div>
        }
      </div>

      {current&&
        <div className="app-panel alert-center-detail">
          <div className="panel-head">
            <div><h3>{current.title}</h3><p>{current.source}</p></div>
            <span className={'diag-severity '+String(current.severity).toLowerCase()}>{current.severity}</span>
          </div>
          <p className="alert-detail-copy">{current.detail}</p>

          <div className="diagnostic-evidence">
            {[
              ['Alert ID',current.id],
              ['Detected',current.age],
              ['Affected period',current.affectedPeriod||'—'],
              ['Owner',current.owner||'Workspace operations'],
              ['Metric',current.metric||'—'],
              ['Threshold',current.threshold??'—'],
              ['Observed',current.metric_value??'—'],
              ['Status',current.status]
            ].map(row=><article key={row[0]}><span>{row[0]}</span><b>{String(row[1])}</b></article>)}
          </div>

          <div className="alert-runbook">
            <ShieldCheck/>
            <div>
              <b>Recommended investigation</b>
              <p>{current.recommendation||'Inspect the source evidence and recent changes before resolving the incident.'}</p>
            </div>
          </div>

          {current.status==='open'
            ?<div className="approval-actions">
              <button className="approve" disabled={busy===current.id} onClick={()=>resolve(current.id)}>
                <Check/>{busy===current.id?'Resolving…':'Mark resolved'}
              </button>
              <button
                disabled={Boolean(busy)}
                onClick={()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{
                  detail:current.metric==='dead_letter_jobs'||current.metric==='signal_delivery_backlog_minutes'
                    ?'Delivery'
                    :current.metric==='audience_sync_errors'
                      ?'Audiences'
                      :'Diagnostics'
                }))}
              >
                <ArrowRight/>Open investigation workspace
              </button>
            </div>
            :<div className="approval-final approved"><Check/><b>Resolved</b></div>
          }
        </div>
      }
    </div>
  </>
}
