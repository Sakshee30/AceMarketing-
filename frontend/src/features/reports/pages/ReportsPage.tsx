import {useEffect,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {
  Activity,BarChart3,CheckCircle2,ChevronRight,CircleDollarSign,Plus,ShieldCheck,Sparkles,Target,UsersRound
} from 'lucide-react'
import {reportsApi} from '../data/reports.api'
import {StaleState} from '../../../components/system/FrontendStates'
import {initialMutationLifecycle,mutationLifecycle} from '../../../lib/mutation-lifecycle'

function ReportsPageHead({
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

function ReportsStat({
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

export default function ReportsPage(){
  const [selected,setSelected]=useState('live')
  const [cohorts,setCohorts]=useState<any>({cohorts:[],sources:[],totals:null,eventDefinitions:null})
  const [delivery,setDelivery]=useState<any>({items:[],deliveries:[],configured:false})
  const [reportBusy,setReportBusy]=useState('')
  const [reportLoading,setReportLoading]=useState(true)
  const [reportNotice,setReportNotice]=useState<{kind:'ok'|'error'|'unknown'|'',text:string}>({kind:'',text:''})
  const [runState,setRunState]=useState(()=>initialMutationLifecycle<any>())

  const loadReports=async()=>{
    setReportLoading(true)
    try{
      const [cohortData,deliveryData]:any=await Promise.all([
        reportsApi.cohorts(6),
        reportsApi.schedules()
      ])
      setCohorts(cohortData)
      setDelivery(deliveryData)
    }catch(error:any){
      setReportNotice({
        kind:'error',
        text:error?.message||'Reports could not be loaded. Existing report data was preserved.'
      })
    }finally{
      setReportLoading(false)
    }
  }

  const loadDelivery=async()=>{
    try{
      const response:any=await reportsApi.schedules()
      setDelivery(response)
    }catch(error:any){
      setReportNotice({kind:'error',text:error?.message||'Report schedules could not be refreshed.'})
    }
  }

  useEffect(()=>{void loadReports()},[])
  useDevelopmentLiveRefresh(()=>loadReports())

  const rows=cohorts.cohorts||[]
  const latest=rows[rows.length-1]||{}
  const money=(value:any)=>'₹'+Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:0})
  const reportRows=[
    {id:'live',name:'Cohort Performance',cadence:'Live',audience:'Workspace',status:'active',live:true},
    ...(delivery.items||[]).map((item:any)=>({
      id:item.id,
      name:item.name,
      cadence:item.cadence,
      audience:(item.recipients||[]).join(', '),
      status:item.last_status||'scheduled',
      live:false,
      raw:item
    }))
  ]
  const currentReport=reportRows.find((item:any)=>item.id===selected)||reportRows[0]

  const createSchedule=async(event:any)=>{
    event.preventDefault()
    const form=new FormData(event.currentTarget)
    setReportBusy('save')
    setReportNotice({kind:'',text:''})
    try{
      const saved:any=await reportsApi.saveSchedule({
        name:String(form.get('name')||'Cohort Performance'),
        recipients:String(form.get('recipients')||''),
        cadence:String(form.get('cadence')||'weekly'),
        lookbackMonths:Number(form.get('lookbackMonths')||6)
      })
      setReportNotice({kind:'ok',text:'Report schedule created and persisted.'})
      await loadDelivery()
      if(saved?.id)setSelected(saved.id)
    }catch(error:any){
      const cause=String(error?.details?.cause||'')
      if(cause==='timeout'||cause==='network'){
        setReportNotice({
          kind:'unknown',
          text:'The backend did not confirm whether this report schedule was created. Refresh schedules before submitting the same schedule again.'
        })
      }else{
        setReportNotice({kind:'error',text:error?.message||'Report schedule could not be created.'})
      }
    }finally{
      setReportBusy('')
    }
  }

  const runNow=async(id:string)=>{
    let lifecycle=mutationLifecycle.validating(runState)
    setRunState(lifecycle)
    lifecycle=mutationLifecycle.submitting(lifecycle)
    setRunState(lifecycle)
    setReportBusy(id)
    setReportNotice({kind:'',text:''})

    try{
      const result:any=await reportsApi.runNow(id)
      setRunState(mutationLifecycle.confirmed(lifecycle,result))
      setReportNotice({kind:'ok',text:'Report delivery accepted by the backend for durable processing.'})
      await loadDelivery()
    }catch(error:any){
      const requestId=error?.requestId||null
      const cause=String(error?.details?.cause||'')
      if(cause==='timeout'||cause==='network'){
        const message='The backend did not confirm whether this report delivery was accepted. Refresh delivery history before sending it again.'
        setRunState(mutationLifecycle.unknown(lifecycle,message,requestId))
        setReportNotice({kind:'unknown',text:message})
      }else if(Number(error?.status)===409){
        const message=error?.message||'The report schedule changed before delivery could be confirmed. Refresh and try again.'
        setRunState(mutationLifecycle.conflict(lifecycle,message,requestId))
        setReportNotice({kind:'error',text:message})
      }else{
        const message=error?.message||'Report delivery could not be accepted.'
        setRunState(mutationLifecycle.rejected(lifecycle,message,requestId))
        setReportNotice({kind:'error',text:message})
      }
    }finally{
      setReportBusy('')
    }
  }

  return <>
    <ReportsPageHead
      crumb="Measurement / Reports"
      title="Cohort & automated reports"
      sub="Turn stitched journey and attribution data into recurring decision-ready reports."
      action={reportLoading?'Refreshing…':'Refresh reports'}
      onAction={loadReports}
    />

    {reportNotice.text&&reportNotice.kind==='unknown'&&
      <StaleState
        title="Report action needs reconciliation"
        description={reportNotice.text}
        action={{label:'Refresh reports',onClick:loadReports}}
      />
    }

    {reportNotice.text&&reportNotice.kind!=='unknown'&&
      <div className={'delivery-notice '+(reportNotice.kind==='error'?'error':'ok')} role={reportNotice.kind==='error'?'alert':'status'}>
        {reportNotice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}
        <span>{reportNotice.text}</span>
      </div>
    }

    <div className="stats-grid">
      <ReportsStat label="Acquired" value={reportLoading&&!cohorts.totals?'—':Number(cohorts.totals?.acquired||0).toLocaleString('en-IN')} sub="Across cohort lookback" Icon={UsersRound}/>
      <ReportsStat label="Conversions" value={reportLoading&&!cohorts.totals?'—':Number(cohorts.totals?.conversions||0).toLocaleString('en-IN')} sub={(cohorts.totals?.conversionRate||0)+'% conversion rate'} Icon={Target}/>
      <ReportsStat label="Attributed revenue" value={reportLoading&&!cohorts.totals?'—':money(cohorts.totals?.revenue)} sub="Matched conversion events" Icon={CircleDollarSign}/>
      <ReportsStat label="Revenue / acquired" value={reportLoading&&!cohorts.totals?'—':money(cohorts.totals?.revenuePerAcquired)} sub="Quality-adjusted cohort value" Icon={Activity}/>
    </div>

    <div className="reports-layout">
      <div className="app-panel report-list">
        <div className="panel-head">
          <div><h3>Reports</h3><p>Only live analytics and persisted schedules are shown</p></div>
          <button onClick={()=>document.getElementById('report-schedule-form')?.scrollIntoView({behavior:'smooth',block:'center'})}><Plus/>New report</button>
        </div>
        {reportRows.map((report:any)=>
          <button key={report.id} className={selected===report.id?'selected':''} onClick={()=>setSelected(report.id)}>
            <BarChart3/>
            <div><b>{report.name}</b><small>{report.cadence} · {report.audience||'Workspace'}</small></div>
            <span className={String(report.status||'scheduled').toLowerCase()}>{report.status}</span>
            <ChevronRight/>
          </button>
        )}
      </div>

      <div className="app-panel report-preview">
        {currentReport?.live
          ?<>
            <div className="panel-head">
              <div><h3>{currentReport.name}</h3><p>{cohorts.available?'Persisted click + matched offline event cohorts':'Waiting for cohort data'}</p></div>
              <span className="status">{cohorts.lookbackMonths||6} months</span>
            </div>
            <div className="report-summary-grid">
              {[
                ['Latest cohort size',latest.acquired||0],
                ['Qualified rate',(latest.qualifiedRate||0)+'%'],
                ['Consultation rate',(latest.consultationRate||0)+'%'],
                ['Conversion rate',(latest.conversionRate||0)+'%'],
                ['Revenue / acquired',money(latest.revenuePerAcquired)],
                ['Attributed revenue',money(latest.revenue)]
              ].map(row=><div key={row[0]}><span>{row[0]}</span><b>{String(row[1])}</b></div>)}
            </div>
            <div className="report-insight">
              <Sparkles/>
              <div>
                <b>Measurement definition</b>
                <p>Conversion stages are configured from deployment event definitions, not inferred from marketing copy. Current conversion events: {(cohorts.eventDefinitions?.conversion||[]).join(', ')||'not loaded'}.</p>
              </div>
            </div>
          </>
          :<>
            <div className="panel-head">
              <div><h3>{currentReport?.name||'Scheduled report'}</h3><p>Persisted automated cohort-report schedule</p></div>
              <span className="status">{currentReport?.status||'scheduled'}</span>
            </div>
            <div className="report-summary-grid">
              {[
                ['Cadence',currentReport?.raw?.cadence||'—'],
                ['Recipients',(currentReport?.raw?.recipients||[]).join(', ')||'—'],
                ['Lookback',String(currentReport?.raw?.lookback_months||6)+' months'],
                ['Next run',currentReport?.raw?.next_run_at?new Date(currentReport.raw.next_run_at).toLocaleString():'—'],
                ['Last run',currentReport?.raw?.last_run_at?new Date(currentReport.raw.last_run_at).toLocaleString():'Never'],
                ['Last status',currentReport?.raw?.last_status||'scheduled']
              ].map(row=><div key={row[0]}><span>{row[0]}</span><b>{String(row[1])}</b></div>)}
            </div>
            <div className="approval-actions">
              <button className="approve" disabled={!currentReport?.id||reportBusy===currentReport.id} onClick={()=>currentReport?.id&&runNow(currentReport.id)}>
                <BarChart3/>{reportBusy===currentReport?.id?'Queueing…':'Send report now'}
              </button>
            </div>
          </>
        }
      </div>
    </div>

    <div className="app-panel">
      <div className="panel-head">
        <div><h3>Cohort performance</h3><p>First-acquisition month → qualified, consultation, conversion and attributed revenue</p></div>
        <span className="healthy">Live data</span>
      </div>
      <table>
        <thead><tr><th>Cohort</th><th>Acquired</th><th>Qualified</th><th>Consultation</th><th>Conversion</th><th>Revenue</th><th>Revenue / acquired</th></tr></thead>
        <tbody>
          {rows.length
            ?rows.map((row:any)=><tr key={String(row.month)}>
              <td>{new Date(row.month).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</td>
              <td>{Number(row.acquired).toLocaleString('en-IN')}</td>
              <td>{row.qualifiedRate}%</td>
              <td>{row.consultationRate}%</td>
              <td>{row.conversionRate}%</td>
              <td>{money(row.revenue)}</td>
              <td>{money(row.revenuePerAcquired)}</td>
            </tr>)
            :<tr><td colSpan={7}>No matched cohort data yet. Tracking sessions and assisted conversion events will populate this view.</td></tr>
          }
        </tbody>
      </table>
    </div>

    <div className="two-col">
      <div className="app-panel">
        <div className="panel-head">
          <div><h3>Automated email reports</h3><p>Persisted schedules delivered through the durable worker</p></div>
          <span className={delivery.configured?'healthy':'warning'}>{delivery.configured?'SMTP ready':'SMTP not configured'}</span>
        </div>

        <form id="report-schedule-form" className="setup-form-grid" onSubmit={createSchedule}>
          <label><span>Report name</span><input name="name" defaultValue="Weekly Cohort Performance"/></label>
          <label><span>Recipients</span><input name="recipients" placeholder="growth@company.com, leadership@company.com" required/></label>
          <label><span>Cadence</span><select name="cadence" defaultValue="weekly"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
          <label><span>Lookback months</span><input name="lookbackMonths" type="number" min="1" max="36" defaultValue="6"/></label>
          <button className="app-primary" disabled={!!reportBusy} type="submit">{reportBusy==='save'?'Saving…':'Create schedule'}</button>
        </form>

        {(delivery.items||[]).map((item:any)=>
          <div className="setting-line" key={item.id}>
            <div><b>{item.name}</b><small>{(item.recipients||[]).join(', ')}</small></div>
            <span>{item.cadence}</span>
            <b>{item.last_status}</b>
            <button disabled={reportBusy===item.id} onClick={()=>runNow(item.id)}>{reportBusy===item.id?'Queueing…':'Send now'}</button>
          </div>
        )}

        <h4>Recent deliveries</h4>
        {(delivery.deliveries||[]).slice(0,6).map((item:any)=>
          <div className="audit-row" key={item.id}>
            <BarChart3/>
            <div><b>{item.subject||'Cohort report'}</b><small>{item.status} · {(item.recipients||[]).length} recipient(s)</small></div>
            <span>{new Date(item.queued_at).toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="app-panel">
        <div className="panel-head"><div><h3>Source quality</h3><p>Acquisition source ranked by downstream value</p></div></div>
        {(cohorts.sources||[]).slice(0,8).map((item:any)=>
          <div className="planning-row" key={item.source}>
            <span>{item.source}</span>
            <b>{item.conversionRate}% conversion</b>
            <small>{Number(item.acquired).toLocaleString('en-IN')} acquired</small>
            <strong>{money(item.revenue)}</strong>
          </div>
        )}
      </div>

      <div className="app-panel">
        <div className="panel-head"><div><h3>Data contract</h3><p>Events that define each cohort stage</p></div></div>
        {[
          ['Qualified',cohorts.eventDefinitions?.qualified],
          ['Consultation',cohorts.eventDefinitions?.consultation],
          ['Conversion',cohorts.eventDefinitions?.conversion]
        ].map(row=><div className="setting-line" key={row[0]}><span>{row[0]}</span><b>{(row[1]||[]).join(', ')||'Not configured'}</b></div>)}
      </div>
    </div>
  </>
}
