import {useEffect,useState} from 'react'
import {
  Activity,BarChart3,Check,MessageSquareText,Plus,RadioTower,ShieldCheck,Sparkles
} from 'lucide-react'
import {executiveBriefsApi} from '../data/executive-briefs.api'
import {StaleState} from '../../../components/system/FrontendStates'
import {initialMutationLifecycle,mutationLifecycle} from '../../../lib/mutation-lifecycle'
import {useDirtyWork} from '../../../lib/dirty-work'

function ExecutiveBriefsPageHead({
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

function ExecutiveBriefStat({
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

export default function ExecutiveBriefsPage(){
  const [cohorts,setCohorts]=useState<any>({cohorts:[],sources:[],totals:{}})
  const [delivery,setDelivery]=useState<any>({items:[],deliveries:[],configured:false})
  const [busy,setBusy]=useState('')
  const [notice,setNotice]=useState<{kind:'ok'|'error'|'unknown'|'',text:string}>({kind:'',text:''})
  const [selectedMetrics,setSelectedMetrics]=useState<string[]>(['acquired','conversionRate','revenue','revenuePerAcquired','topSource'])
  const [formDirty,setFormDirty]=useState(false)
  const [deliveryState,setDeliveryState]=useState(()=>initialMutationLifecycle<any>())

  useDirtyWork({
    key:'executive-brief-draft',
    label:'Executive brief schedule draft',
    dirty:formDirty,
    scope:'feature'
  })

  const metricOptions=[
    ['acquired','Acquired customers / leads'],
    ['qualifiedRate','Qualified rate'],
    ['consultationRate','Consultation rate'],
    ['conversionRate','Conversion rate'],
    ['revenue','Attributed revenue'],
    ['revenuePerAcquired','Revenue per acquired'],
    ['topSource','Top acquisition source'],
    ['topSourceConversionRate','Top-source conversion rate']
  ]

  const load=async()=>{
    try{
      const [cohortData,reportData]:any=await Promise.all([
        executiveBriefsApi.cohorts(6),
        executiveBriefsApi.schedules()
      ])
      setCohorts(cohortData)
      setDelivery(reportData)
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'Executive briefs could not be loaded.'})
    }
  }

  useEffect(()=>{void load()},[])

  const briefs=(delivery.items||[]).filter((item:any)=>item.report_type==='executive_brief')
  const deliveries=(delivery.deliveries||[]).filter((item:any)=>briefs.some((brief:any)=>brief.id===item.schedule_id))
  const totals=cohorts.totals||{}
  const top=(cohorts.sources||[])
    .slice()
    .sort((a:any,b:any)=>Number(b.revenue||0)-Number(a.revenue||0)||Number(b.conversionRate||0)-Number(a.conversionRate||0))[0]||{}

  const metricValue=(key:string)=>{
    const money=(value:any)=>'₹'+Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:0})
    const map:any={
      acquired:Number(totals.acquired||0).toLocaleString('en-IN'),
      qualifiedRate:String(totals.qualifiedRate||0)+'%',
      consultationRate:String(totals.consultationRate||0)+'%',
      conversionRate:String(totals.conversionRate||0)+'%',
      revenue:money(totals.revenue),
      revenuePerAcquired:money(totals.revenuePerAcquired),
      topSource:top.source||'No evidence yet',
      topSourceConversionRate:top.source?String(top.conversionRate||0)+'%':'—'
    }
    return map[key]??'—'
  }

  const toggleMetric=(key:string)=>{
    setFormDirty(true)
    setSelectedMetrics(current=>
      current.includes(key)
        ?(current.length>1?current.filter(item=>item!==key):current)
        :[...current,key].slice(0,8)
    )
  }

  const create=async(event:any)=>{
    event.preventDefault()
    const form=new FormData(event.currentTarget)
    setBusy('create')
    setNotice({kind:'',text:''})

    try{
      const saved:any=await executiveBriefsApi.saveSchedule({
        reportType:'executive_brief',
        name:String(form.get('name')||'Executive Growth Brief'),
        title:String(form.get('title')||'Executive Growth Brief'),
        note:String(form.get('note')||''),
        recipients:String(form.get('recipients')||''),
        cadence:String(form.get('cadence')||'weekly'),
        lookbackMonths:Number(form.get('lookbackMonths')||6),
        metrics:selectedMetrics
      })
      setFormDirty(false)
      setNotice({kind:'ok',text:'Executive brief schedule created and confirmed.'})
      await load()
      if(saved?.id){
        setTimeout(()=>document.getElementById('executive-brief-history')?.scrollIntoView({behavior:'smooth',block:'center'}),50)
      }
    }catch(error:any){
      const cause=String(error?.details?.cause||'')
      if(cause==='timeout'||cause==='network'){
        setNotice({
          kind:'unknown',
          text:'The backend did not confirm whether this executive brief schedule was created. Refresh schedules before submitting the same draft again.'
        })
      }else{
        setNotice({kind:'error',text:error?.message||'Executive brief could not be scheduled.'})
      }
    }finally{
      setBusy('')
    }
  }

  const sendNow=async(id:string)=>{
    let lifecycle=mutationLifecycle.validating(deliveryState)
    setDeliveryState(lifecycle)
    lifecycle=mutationLifecycle.submitting(lifecycle)
    setDeliveryState(lifecycle)
    setBusy(id)
    setNotice({kind:'',text:''})

    try{
      const result:any=await executiveBriefsApi.runNow(id)
      setDeliveryState(mutationLifecycle.confirmed(lifecycle,result))
      setNotice({kind:'ok',text:'Executive brief delivery accepted by the backend for durable processing.'})
      await load()
    }catch(error:any){
      const requestId=error?.requestId||null
      const cause=String(error?.details?.cause||'')
      if(cause==='timeout'||cause==='network'){
        const message='The backend did not confirm whether this executive brief delivery was accepted. Refresh delivery history before sending it again.'
        setDeliveryState(mutationLifecycle.unknown(lifecycle,message,requestId))
        setNotice({kind:'unknown',text:message})
      }else if(Number(error?.status)===409){
        const message=error?.message||'This executive brief schedule changed before delivery could be confirmed. Refresh and try again.'
        setDeliveryState(mutationLifecycle.conflict(lifecycle,message,requestId))
        setNotice({kind:'error',text:message})
      }else{
        const message=error?.message||'Executive brief could not be accepted for delivery.'
        setDeliveryState(mutationLifecycle.rejected(lifecycle,message,requestId))
        setNotice({kind:'error',text:message})
      }
    }finally{
      setBusy('')
    }
  }

  return <>
    <ExecutiveBriefsPageHead
      crumb="Measurement / Executive Briefs"
      title="Executive data snippets"
      sub="Schedule compact decision-ready metric snapshots for leadership without sending a full analytics report."
      action="Refresh"
      onAction={load}
    />

    {notice.text&&notice.kind==='unknown'&&
      <StaleState
        title="Executive brief action needs reconciliation"
        description={notice.text}
        action={{label:'Refresh briefs',onClick:load}}
      />
    }

    {notice.text&&notice.kind!=='unknown'&&
      <div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}>
        <MessageSquareText/>
        <span>{notice.text}</span>
      </div>
    }

    {formDirty&&
      <div className="delivery-notice" role="status">
        <Activity/>
        <span>Executive brief draft has unsaved changes. Leaving this feature will ask for confirmation.</span>
      </div>
    }

    <div className="stats-grid">
      <ExecutiveBriefStat label="Scheduled briefs" value={String(briefs.length)} sub="Persisted executive schedules" Icon={MessageSquareText}/>
      <ExecutiveBriefStat label="SMTP" value={delivery.configured?'Ready':'Needs setup'} sub="Uses existing report-delivery transport" Icon={RadioTower}/>
      <ExecutiveBriefStat label="Recent deliveries" value={String(deliveries.length)} sub="Queued / sent executive snippets" Icon={Activity}/>
      <ExecutiveBriefStat label="Selected metrics" value={String(selectedMetrics.length)} sub="Current brief definition" Icon={BarChart3}/>
    </div>

    <div className="executive-brief-layout">
      <section className="app-panel">
        <div className="panel-head">
          <div><h3>Live brief preview</h3><p>Built only from currently persisted cohort and attribution evidence</p></div>
          <span className="healthy">Live data</span>
        </div>

        <div className="executive-metric-grid">
          {selectedMetrics.map(key=>{
            const label=metricOptions.find(item=>item[0]===key)?.[1]||key
            return <article key={key}><span>{label}</span><b>{metricValue(key)}</b></article>
          })}
        </div>

        <div className="executive-source-preview">
          <div><b>Top acquisition sources</b><small>Ranked by observed attributed revenue, then conversion rate.</small></div>
          {(cohorts.sources||[])
            .slice()
            .sort((a:any,b:any)=>Number(b.revenue||0)-Number(a.revenue||0))
            .slice(0,5)
            .map((item:any)=>
              <div key={item.source}>
                <span>{item.source}</span>
                <b>{item.conversionRate}%</b>
                <strong>₹{Number(item.revenue||0).toLocaleString('en-IN',{maximumFractionDigits:0})}</strong>
              </div>
            )}
        </div>

        <div className="source-conflict-note">
          <ShieldCheck/>
          <div>
            <b>Evidence boundary</b>
            <p>The executive brief does not infer missing spend, CAC or ROAS. It only includes metrics backed by persisted acquisition and matched downstream events.</p>
          </div>
        </div>
      </section>

      <section className="app-panel">
        <div className="panel-head">
          <div><h3>Schedule executive brief</h3><p>Choose recipients, cadence and exactly which metrics leadership receives.</p></div>
          <span className={delivery.configured?'healthy':'warning'}>{delivery.configured?'Email transport ready':'SMTP not configured'}</span>
        </div>

        <form
          className="executive-brief-form"
          onSubmit={create}
          onChange={()=>setFormDirty(true)}
        >
          <label><span>Schedule name</span><input name="name" defaultValue="Weekly Executive Growth Brief" required/></label>
          <label><span>Email title</span><input name="title" defaultValue="Executive Growth Brief"/></label>
          <label><span>Recipients</span><input name="recipients" placeholder="cmo@company.com, founders@company.com" required/></label>

          <div className="two-col">
            <label><span>Cadence</span><select name="cadence" defaultValue="weekly"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
            <label><span>Lookback months</span><input name="lookbackMonths" type="number" min="1" max="36" defaultValue="6"/></label>
          </div>

          <label><span>Leadership note</span><textarea name="note" rows={3} placeholder="Focus on conversion quality and source contribution."/></label>

          <div className="executive-metric-picker">
            {metricOptions.map(([key,label])=>
              <button type="button" key={key} className={selectedMetrics.includes(key)?'selected':''} onClick={()=>toggleMetric(key)}>
                {selectedMetrics.includes(key)?<Check/>:<Plus/>}
                <span>{label}</span>
              </button>
            )}
          </div>

          <button className="app-primary" disabled={busy==='create'} type="submit">
            {busy==='create'?'Scheduling…':'Schedule executive brief'}
          </button>
        </form>
      </section>
    </div>

    <section className="app-panel" id="executive-brief-history">
      <div className="panel-head">
        <div><h3>Brief schedules</h3><p>Persistent schedules and one-click send-now controls</p></div>
        <span className={briefs.length?'healthy':'status'}>{briefs.length} configured</span>
      </div>

      {briefs.length
        ?<div className="executive-schedule-list">
          {briefs.map((item:any)=>
            <article key={item.id}>
              <MessageSquareText/>
              <div><b>{item.name}</b><small>{(item.recipients||[]).join(', ')}</small></div>
              <span>{item.cadence}</span>
              <strong>{item.last_status||'scheduled'}</strong>
              <button disabled={busy===item.id} onClick={()=>sendNow(item.id)}>{busy===item.id?'Queueing…':'Send now'}</button>
            </article>
          )}
        </div>
        :<div className="empty-delivery-state">
          <MessageSquareText/>
          <div><b>No executive briefs yet</b><small>Create a schedule above. AceMarketing will not insert a fake leadership report into an empty workspace.</small></div>
        </div>
      }
    </section>

    <section className="app-panel">
      <div className="panel-head"><div><h3>Recent executive deliveries</h3><p>Delivery history from the durable report worker</p></div></div>
      {deliveries.length
        ?deliveries.slice(0,10).map((item:any)=>
          <div className="audit-row" key={item.id}>
            <MessageSquareText/>
            <div><b>{item.subject||'Executive brief'}</b><small>{item.status} · {(item.recipients||[]).length} recipient(s)</small></div>
            <span>{item.queued_at?new Date(item.queued_at).toLocaleString():'—'}</span>
          </div>
        )
        :<div className="empty-delivery-state">
          <Activity/>
          <div><b>No executive brief deliveries yet</b><small>Scheduled or send-now deliveries will appear here.</small></div>
        </div>
      }
    </section>
  </>
}
