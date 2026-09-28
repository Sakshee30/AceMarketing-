import {useEffect,useState} from 'react'
import {
  Activity,ArrowRight,Bot,Cable,CheckCircle2,ChevronRight,Gauge,MousePointer2,Network,
  PhoneCall,RadioTower,ShieldCheck,Sparkles,Target,Video,X,Zap
} from 'lucide-react'
import {adsyncApi} from '../data/adsync.api'
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

export default function AdSyncPage(){
  const [builder,setBuilder]=useState(false)
  const [busy,setBusy]=useState('')
  const [loading,setLoading]=useState(true)
  const [notice,setNotice]=useState<Notice>({kind:'',text:''})
  const [data,setData]=useState<any>({items:[],runs:[],stats:{}})
  const [deliveries,setDeliveries]=useState<any[]>([])
  const [selected,setSelected]=useState('')

  useDirtyWork({
    key:'adsync-pipeline-draft',
    label:'AdSync conversion pipeline',
    dirty:builder,
    scope:'feature'
  })

  const quickAgents=[
    {id:'meta_capi',name:'Meta Advanced CAPI',detail:'Qualified leads → server-side Meta conversion',sourceEvent:'lead.qualified',outputEvent:'qualified_lead',destination:'Meta Ads',Icon:RadioTower},
    {id:'google_ecl',name:'Google ECL / OCI',detail:'Qualified leads → enhanced/offline Google conversion',sourceEvent:'lead.qualified',outputEvent:'qualified_lead',destination:'Google Ads',Icon:Target},
    {id:'linkedin_capi',name:'LinkedIn Conversions API',detail:'Qualified leads → server-side LinkedIn conversion event',sourceEvent:'lead.qualified',outputEvent:'qualified_lead',destination:'LinkedIn Ads',Icon:Network},
    {id:'microsoft_capi',name:'Microsoft Ads Conversions API',detail:'Qualified leads → server-side Microsoft/Bing conversion event',sourceEvent:'lead.qualified',outputEvent:'qualified_lead',destination:'Microsoft Ads / Bing Ads',Icon:Gauge},
    {id:'pinterest_capi',name:'Pinterest Conversions API',detail:'Qualified leads → server-side Pinterest conversion event',sourceEvent:'lead.qualified',outputEvent:'lead',destination:'Pinterest',Icon:MousePointer2},
    {id:'tiktok_events',name:'TikTok Events API',detail:'Qualified leads → server-side TikTok web/CRM conversion event',sourceEvent:'lead.qualified',outputEvent:'SubmitForm',destination:'TikTok Ads',Icon:Video},
    {id:'x_capi',name:'X Ads Conversion API',detail:'Qualified leads → server-side X conversion with TWCLID and first-party matching',sourceEvent:'lead.qualified',outputEvent:'qualified_lead',destination:'X',Icon:RadioTower},
    {id:'chatgpt_ads',name:'ChatGPT Ads CAPI',detail:'Qualified leads → ChatGPT Ads server-side conversion with oppref matching',sourceEvent:'lead.qualified',outputEvent:'lead_created',destination:'ChatGPT Ads',Icon:Bot},
    {id:'call_tracking',name:'Call Tracking Events',detail:'Ingest signed telephony events and attribute calls',tab:'Calls',Icon:PhoneCall},
    {id:'custom_integration',name:'Custom Integration',detail:'Build a governed connector for any unsupported system',tab:'Integrations',Icon:Cable}
  ]

  const load=async()=>{
    setLoading(true)
    try{
      const [events,delivery]:any=await Promise.all([adsyncApi.events(),adsyncApi.signalDeliveries()])
      const pipelines=(events.items||[]).filter((item:any)=>
        (item.destinations||[]).some((destination:string)=>
          ['Google Ads','Meta Ads','LinkedIn Ads','Microsoft Ads / Bing Ads','Pinterest','TikTok Ads','X','ChatGPT Ads'].includes(destination)
        )
      )
      setData({...events,items:pipelines})
      setDeliveries(delivery.items||[])
      if(pipelines.length){
        setSelected((current:string)=>current&&pipelines.some((pipeline:any)=>pipeline.id===current)?current:pipelines[0].id)
      }
      setNotice(current=>current.kind==='error'?{kind:'',text:''}:current)
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'Signal pipelines could not be loaded. Existing AdSync evidence was preserved.'})
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{void load()},[])

  const current=(data.items||[]).find((item:any)=>item.id===selected)||data.items?.[0]

  const createPipeline=async(event:any)=>{
    event.preventDefault()
    const form=new FormData(event.currentTarget)
    setBusy('create')
    setNotice({kind:'',text:''})
    try{
      await adsyncApi.createEventRule({
        name:String(form.get('name')||''),
        sourceEvent:String(form.get('sourceEvent')||''),
        outputEvent:String(form.get('outputEvent')||''),
        conditions:[],
        destinations:[String(form.get('destination')||'Google Ads')],
        valueMode:'copy',
        currency:'INR'
      })
      setNotice({kind:'ok',text:'Conversion pipeline rule created and confirmed by the backend.'})
      setBuilder(false)
      await load()
    }catch(error:any){
      setNotice(unknownMutation(error)
        ?{kind:'unknown',text:'The backend did not confirm whether the pipeline was created. Refresh AdSync before submitting the same pipeline again.'}
        :{kind:'error',text:error?.message||'Pipeline could not be created.'}
      )
    }finally{
      setBusy('')
    }
  }

  const toggle=async(item:any)=>{
    setBusy(item.id)
    setNotice({kind:'',text:''})
    try{
      await adsyncApi.toggleEventRule(item.id,!item.enabled)
      setNotice({kind:'ok',text:(item.enabled?'Paused ':'Enabled ')+item.name+' after backend confirmation.'})
      await load()
    }catch(error:any){
      setNotice(unknownMutation(error)
        ?{kind:'unknown',text:'The pipeline state change has an unknown outcome. Refresh AdSync before repeating the action.'}
        :{kind:'error',text:error?.message||'Pipeline status could not be changed.'}
      )
    }finally{
      setBusy('')
    }
  }

  const test=async()=>{
    if(!current)return
    setBusy('test')
    setNotice({kind:'',text:''})
    try{
      const result:any=await adsyncApi.track({
        event:current.source_event,
        source:'adsync_pipeline_test',
        visitorId:'adsync_'+Date.now(),
        data:{pipelineId:current.id,test:true}
      })
      setNotice({kind:'ok',text:'Test source event accepted: '+(result.eventId||'ok')+'. Check Delivery for derived provider signals.'})
      await load()
    }catch(error:any){
      setNotice(unknownMutation(error)
        ?{kind:'unknown',text:'The test event outcome is unknown because the acknowledgement was lost. Check Delivery before sending another test.'}
        :{kind:'error',text:error?.message||'Pipeline test event failed.'}
      )
    }finally{
      setBusy('')
    }
  }

  const installQuickAgent=async(preset:any)=>{
    if(preset.tab){
      window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:preset.tab}))
      return
    }
    const existing=(data.items||[]).find((item:any)=>
      item.source_event===preset.sourceEvent&&
      item.output_event===preset.outputEvent&&
      (item.destinations||[]).includes(preset.destination)
    )
    if(existing){
      setSelected(existing.id)
      setNotice({kind:'ok',text:preset.name+' pipeline already exists.'})
      return
    }

    setBusy('quick:'+preset.id)
    setNotice({kind:'',text:''})
    try{
      const created:any=await adsyncApi.createEventRule({
        name:preset.name+' · Qualified Lead',
        sourceEvent:preset.sourceEvent,
        outputEvent:preset.outputEvent,
        conditions:[],
        destinations:[preset.destination],
        valueMode:'copy',
        currency:'INR'
      })
      setNotice({kind:'ok',text:preset.name+' pipeline created. Connect provider credentials before expecting external delivery.'})
      await load()
      if(created?.item?.id)setSelected(created.item.id)
    }catch(error:any){
      setNotice(unknownMutation(error)
        ?{kind:'unknown',text:'The backend did not confirm whether '+preset.name+' was installed. Refresh AdSync before repeating the action.'}
        :{kind:'error',text:error?.message||preset.name+' pipeline could not be created.'}
      )
    }finally{
      setBusy('')
    }
  }

  const allPipelineDeliveries=deliveries.filter((item:any)=>
    (data.items||[]).some((pipeline:any)=>
      (pipeline.destinations||[]).includes(item.destination)&&pipeline.output_event===item.event
    )
  )
  const pipelineDeliveries=current
    ?deliveries.filter((item:any)=>(current.destinations||[]).includes(item.destination)&&item.event===current.output_event)
    :[]
  const delivered=pipelineDeliveries.filter((item:any)=>item.status==='delivered').length
  const failing=pipelineDeliveries.filter((item:any)=>['failed','dead_letter'].includes(String(item.status))).length
  const openTab=(tab:string)=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:tab}))

  return <>
    <PageHead
      crumb="Module / AdSync"
      title="Server-side signal activation"
      sub="Create and operate persisted conversion pipelines that return qualified and closed outcomes to advertising platforms."
      action="Add pipeline"
      onAction={()=>setBuilder(true)}
    />

    {loading&&!data.items?.length&&
      <LoadingState title="Loading AdSync pipelines" description="Reading event rules and persisted delivery evidence for this workspace."/>
    }
    {notice.text&&notice.kind==='error'&&
      <ErrorState title="AdSync action failed" description={notice.text} action={{label:'Refresh AdSync',onClick:load}}/>
    }
    {notice.text&&notice.kind==='unknown'&&
      <StaleState title="AdSync action needs reconciliation" description={notice.text} action={{label:'Refresh authoritative state',onClick:load}}/>
    }
    {notice.text&&notice.kind==='ok'&&
      <div className="delivery-notice ok" role="status"><CheckCircle2/><span>{notice.text}</span></div>
    }

    <div className="signal-agent-quickstarts">
      {quickAgents.map((agent:any)=>{
        const Icon=agent.Icon
        const installed=!agent.tab&&(data.items||[]).some((item:any)=>
          item.source_event===agent.sourceEvent&&item.output_event===agent.outputEvent&&(item.destinations||[]).includes(agent.destination)
        )
        return <article key={agent.id} className={installed?'installed':''}>
          <div className="signal-agent-icon"><Icon/></div>
          <div><b>{agent.name}</b><p>{agent.detail}</p></div>
          <button disabled={busy==='quick:'+agent.id} onClick={()=>installQuickAgent(agent)}>
            {busy==='quick:'+agent.id?'Creating…':agent.tab?'Open module':installed?'Open pipeline':'Install pipeline'}<ArrowRight/>
          </button>
        </article>
      })}
    </div>

    <div className="stats-grid">
      <Stat label="Signal pipelines" value={String((data.items||[]).length)} sub="Google / Meta event rules" Icon={RadioTower}/>
      <Stat label="Enabled" value={String((data.items||[]).filter((item:any)=>item.enabled).length)} sub="Currently evaluating source events" Icon={CheckCircle2}/>
      <Stat label="Pipeline deliveries" value={String(allPipelineDeliveries.length)} sub="Persisted outbound signals" Icon={Activity}/>
      <Stat label="Dead / failed" value={String(allPipelineDeliveries.filter((item:any)=>['failed','dead_letter'].includes(String(item.status))).length)} sub="Review in Delivery" Icon={ShieldCheck}/>
    </div>

    <div className="agent-ops-layout">
      <div className="app-panel agent-selector">
        <div className="panel-head">
          <div><h3>Conversion pipelines</h3><p>Persisted business event → ad-platform signal rules</p></div>
          <button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh'}</button>
        </div>
        {(data.items||[]).length
          ?(data.items||[]).map((item:any)=>
            <button key={item.id} className={selected===item.id?'selected':''} onClick={()=>setSelected(item.id)}>
              <RadioTower/>
              <div><b>{item.name}</b><small>{item.source_event} → {item.output_event}</small></div>
              <span className={item.enabled?'active-agent':''}>{item.enabled?'enabled':'paused'}</span>
              <ChevronRight/>
            </button>
          )
          :!loading&&<div className="empty-delivery-state"><RadioTower/><div><b>No signal pipeline yet</b><small>Create one to turn a business event into a durable outbound conversion signal.</small></div></div>
        }
      </div>

      <div className="app-panel agent-config">
        {current
          ?<>
            <div className="panel-head">
              <div><h3>{current.name}</h3><p>{current.source_event} → {current.output_event}</p></div>
              <span className={current.enabled?'healthy':'status'}>{current.enabled?'Enabled':'Paused'}</span>
            </div>
            <div className="agent-config-grid">
              <div><span>Source event</span><b>{current.source_event}</b></div>
              <div><span>Output event</span><b>{current.output_event}</b></div>
              <div><span>Destination</span><b>{(current.destinations||[]).join(', ')||'Measurement only'}</b></div>
              <div><span>Rule runs</span><b>{String((data.runs||[]).filter((run:any)=>run.rule_id===current.id||run.ruleId===current.id).length)}</b></div>
            </div>
            <div className="site-detail-grid">
              {[
                ['Persisted deliveries',pipelineDeliveries.length],
                ['Delivered',delivered],
                ['Failed / dead letter',failing],
                ['Value mode',current.value_mode||'copy']
              ].map(item=><div key={item[0]}><span>{item[0]}</span><b>{String(item[1])}</b></div>)}
            </div>
            <div className="approval-actions">
              <button disabled={busy===current.id} onClick={()=>toggle(current)}>{busy===current.id?'Saving…':current.enabled?'Pause pipeline':'Enable pipeline'}</button>
              <button disabled={busy==='test'||!current.enabled} onClick={test}><Zap/>{busy==='test'?'Sending…':'Send test source event'}</button>
              <button className="approve" onClick={()=>openTab('Delivery')}><RadioTower/>Open delivery center</button>
            </div>
          </>
          :<div className="empty-delivery-state"><RadioTower/><div><b>Select or create a conversion pipeline</b></div></div>
        }
      </div>
    </div>

    <div className="app-panel">
      <div className="panel-head">
        <div><h3>Signal operating path</h3><p>The same persisted rule and delivery infrastructure is used across AdSync, Events and Delivery.</p></div>
        <div className="panel-actions">
          <button onClick={()=>openTab('Events')}>Open event rules</button>
          <button onClick={()=>openTab('Delivery')}>Open delivery queue</button>
        </div>
      </div>
      <div className="mapping-rule">
        <span>Business event</span><ArrowRight/><b>Event rule</b><ArrowRight/><b>Durable queue</b><ArrowRight/><b>Ad platform</b><ArrowRight/><b>Receipt / retry / DLQ</b>
      </div>
    </div>

    {builder&&
      <AccessibleDialog ariaLabel="New conversion pipeline" onClose={()=>setBuilder(false)}>
        <form className="connector-card" onSubmit={createPipeline}>
          <div className="connector-modal-head">
            <div><RadioTower/><div><b>New conversion pipeline</b><small>Create a persisted event rule for signal activation.</small></div></div>
            <button type="button" aria-label="Close new conversion pipeline" onClick={()=>setBuilder(false)}><X/></button>
          </div>
          <label>Pipeline name<input name="name" required defaultValue="Qualified Lead to Google"/></label>
          <label>Source event<input name="sourceEvent" required defaultValue="lead.qualified"/></label>
          <label>Output event<input name="outputEvent" required defaultValue="qualified_lead"/></label>
          <label>Destination<select name="destination"><option>Google Ads</option><option>Meta Ads</option></select></label>
          <button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create pipeline'}</button>
        </form>
      </AccessibleDialog>
    }
  </>
}
