import {useEffect,useState} from 'react'
import {Activity,BarChart3,Check,CheckCircle2,Gauge,ShieldCheck,Sparkles,Zap} from 'lucide-react'
import {monitoringApi} from '../data/monitoring.api'

function MonitoringPageHead({
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

function MonitoringStat({
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

export default function MonitoringPage(){
  const [live,setLive]=useState<any>(null)
  const [rules,setRules]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [notice,setNotice]=useState<{kind:'ok'|'error'|'',text:string}>({kind:'',text:''})

  const load=async()=>{
    setLoading(true)
    setNotice({kind:'',text:''})
    try{
      const [telemetry,ruleData]:any=await Promise.all([
        monitoringApi.summary(),
        monitoringApi.rules()
      ])
      setLive(telemetry)
      setRules(ruleData.items||[])
    }catch(error:any){
      setNotice({
        kind:'error',
        text:error?.message||'Monitoring data could not be loaded. Existing values were preserved; retry when the service is available.'
      })
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{void load()},[])

  const alerts=live?.recentAlerts||[]
  const usage=live?.usage||{}

  return <>
    <MonitoringPageHead
      crumb="Operations / Monitoring"
      title="Platform monitoring"
      sub="Observe real API health, usage, delivery failures and operational thresholds."
      action={loading?'Refreshing…':'Refresh monitoring'}
      onAction={load}
    />

    {notice.text&&
      <div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}>
        {notice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}
        <span>{notice.text}</span>
      </div>
    }

    <div className="stats-grid">
      <MonitoringStat
        label="Platform status"
        value={loading&&!live?'Loading':live?.status?String(live.status).replace(/^./,(match:string)=>match.toUpperCase()):'Unavailable'}
        sub="Measured from recent API traffic"
        Icon={Activity}
      />
      <MonitoringStat
        label="Requests / min"
        value={live?.available?String(live.eventsPerMinute||0):'—'}
        sub="15-minute request rate"
        Icon={Zap}
      />
      <MonitoringStat
        label="5xx error rate"
        value={live?.available?String(live.failedEventRate||0)+'%':'—'}
        sub="Recent API responses"
        Icon={BarChart3}
      />
      <MonitoringStat
        label="P95 latency"
        value={live?.available?String(live.p95LatencyMs||0)+'ms':'—'}
        sub="15-minute API latency"
        Icon={Gauge}
      />
    </div>

    <div className="two-col">
      <div className="app-panel">
        <div className="panel-head">
          <div><h3>24-hour API health</h3><p>Measured from persisted request telemetry</p></div>
          <span className={live?.last24h?.errorRate>2?'warning':'healthy'}>
            {loading&&!live?'Loading…':(live?.last24h?.requests||0)+' requests'}
          </span>
        </div>
        {[
          ['Requests',live?.last24h?.requests??'—'],
          ['Error rate',live?.last24h?String(live.last24h.errorRate||0)+'%':'—'],
          ['P95 latency',live?.last24h?String(live.last24h.p95LatencyMs||0)+'ms':'—'],
          ['Current open alerts',live?alerts.filter((item:any)=>item.status==='open').length:'—']
        ].map(row=>
          <div className="monitor-row" key={row[0]}>
            <span>{row[0]}</span>
            <div className="progress"><i style={{width:live?'100%':'0%'}}/></div>
            <b>{String(row[1])}</b>
          </div>
        )}
      </div>

      <div className="app-panel">
        <div className="panel-head">
          <div><h3>Recent alerts</h3><p>Automatically evaluated operational incidents</p></div>
          <button onClick={()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Alerts'}))}>Open Alert Center</button>
        </div>
        {loading&&!live
          ?<div className="empty-state"><Activity/><b>Loading incidents</b><small>Reading current monitoring evidence.</small></div>
          :alerts.length
            ?alerts.slice(0,6).map((item:any)=>
              <div className="alert-row" key={item.id}>
                <span className={item.severity}>{item.status}</span>
                <div><b>{item.title}</b><small>{item.detail}</small></div>
              </div>
            )
            :<div className="empty-state"><Check/><b>No recent incidents</b><small>{live?'Rules are being evaluated from live telemetry.':'Monitoring evidence is unavailable until the API can be reached.'}</small></div>
        }
      </div>
    </div>

    <div className="app-panel">
      <div className="panel-head"><div><h3>Current-month usage</h3><p>Workspace consumption meters for usage-based packaging</p></div></div>
      <div className="site-detail-grid">
        {[
          ['API requests',usage.api_requests],
          ['Tracked events',usage.tracked_events],
          ['Assisted events',usage.assisted_events],
          ['Signal dispatches',usage.signal_dispatches],
          ['Agent actions',usage.agent_actions],
          ['Audience syncs',usage.audience_syncs],
          ['Custom integration tests',usage.custom_integration_tests]
        ].map(row=>
          <div key={row[0]}>
            <span>{row[0]}</span>
            <b>{row[1]==null?'—':Number(row[1]).toLocaleString('en-IN')}</b>
          </div>
        )}
      </div>
    </div>

    <div className="app-panel">
      <div className="panel-head">
        <div><h3>Automated monitoring rules</h3><p>Persisted thresholds evaluated against live workspace telemetry</p></div>
        <span className={rules.length?'healthy':'status'}>{rules.length} rule(s)</span>
      </div>
      {loading&&!rules.length
        ?<div className="empty-state"><Activity/><b>Loading monitoring rules</b></div>
        :rules.length
          ?<div className="monitor-rule-grid">
            {rules.map((item:any)=>
              <article key={item.id||item.metric}>
                <Activity/>
                <div>
                  <b>{String(item.metric).replaceAll('_',' ')}</b>
                  <small>{item.operator} {String(item.threshold)} · {item.window_minutes||10} min window</small>
                </div>
                <span className={String(item.severity).toLowerCase()}>{item.severity}</span>
              </article>
            )}
          </div>
          :<div className="empty-delivery-state">
            <Activity/>
            <div><b>No monitoring rules available</b><small>Create or restore persisted thresholds before relying on automated incident detection.</small></div>
          </div>
      }
    </div>
  </>
}
