import {useEffect,useState} from 'react'
import {Activity,CheckCircle2,ChevronRight,ShieldCheck,Sparkles,Target,X} from 'lucide-react'
import {modelsApi} from '../data/models.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {StaleState} from '../../../components/system/FrontendStates'
import {initialMutationLifecycle,mutationLifecycle} from '../../../lib/mutation-lifecycle'
import {useDirtyWork} from '../../../lib/dirty-work'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string;title:string;sub:string;action?:string;onAction?:()=>void}){
  return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}</div>
}

export default function ModelsPage(){
  const [data,setData]=useState<any>({items:[],runs:[]})
  const [selected,setSelected]=useState('')
  const [busy,setBusy]=useState('')
  const [validation,setValidation]=useState<any>(null)
  const [validationOpen,setValidationOpen]=useState(false)
  const [builder,setBuilder]=useState(false)
  const [notice,setNotice]=useState<{kind:'ok'|'error'|'unknown'|'',text:string}>({kind:'',text:''})
  const [runState,setRunState]=useState(()=>initialMutationLifecycle<any>())
  const [createState,setCreateState]=useState(()=>initialMutationLifecycle<any>())

  useDirtyWork({key:'custom-model-draft',label:'Custom model draft',dirty:builder,scope:'feature'})

  const load=async()=>{
    try{
      const response:any=await modelsApi.list()
      setData(response)
      if(response.items?.length){
        setSelected((current:string)=>current&&response.items.some((model:any)=>model.name===current)?current:response.items[0].name)
      }
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'Model services could not be loaded.'})
    }
  }

  useEffect(()=>{void load()},[])

  const current=(data.items||[]).find((item:any)=>item.name===selected)||data.items?.[0]

  const run=async()=>{
    if(!current)return
    let lifecycle=mutationLifecycle.validating(runState)
    setRunState(lifecycle)
    lifecycle=mutationLifecycle.submitting(lifecycle)
    setRunState(lifecycle)
    setBusy('run')
    setNotice({kind:'',text:''})
    try{
      const response:any=await modelsApi.run(current.name)
      setRunState(mutationLifecycle.confirmed(lifecycle,response))
      setNotice({kind:'ok',text:'Model run completed for '+response.rowsScored+' profile(s), average score '+response.averageScore+'.'})
      await load()
    }catch(error:any){
      const cause=String(error?.details?.cause||'')
      const requestId=error?.requestId||null
      if(cause==='timeout'||cause==='network'){
        const message='The backend did not confirm whether this scoring run completed. Refresh recent model runs before starting another run.'
        setRunState(mutationLifecycle.unknown(lifecycle,message,requestId))
        setNotice({kind:'unknown',text:message})
      }else if(Number(error?.status)===409){
        const message=error?.message||'The selected model changed before the run could be confirmed. Refresh before running again.'
        setRunState(mutationLifecycle.conflict(lifecycle,message,requestId))
        setNotice({kind:'error',text:message})
      }else{
        const message=error?.message||'Model run failed.'
        setRunState(mutationLifecycle.rejected(lifecycle,message,requestId))
        setNotice({kind:'error',text:message})
      }
    }finally{
      setBusy('')
    }
  }

  const viewValidation=async()=>{
    if(!current)return
    const response:any=await modelsApi.validation(current.name).catch(()=>null)
    setValidation(response)
    setValidationOpen(true)
  }

  const create=async(event:any)=>{
    event.preventDefault()
    const form=new FormData(event.currentTarget)
    let lifecycle=mutationLifecycle.validating(createState)
    setCreateState(lifecycle)
    lifecycle=mutationLifecycle.submitting(lifecycle)
    setCreateState(lifecycle)
    setBusy('create')
    setNotice({kind:'',text:''})

    try{
      const response:any=await modelsApi.create({
        name:String(form.get('name')||''),
        description:String(form.get('description')||''),
        weights:{
          lead_score:Number(form.get('lead_score')||0),
          journey_depth:Number(form.get('journey_depth')||0),
          pricing_views:Number(form.get('pricing_views')||0),
          whatsapp_engaged:Number(form.get('whatsapp_engaged')||0),
          meeting_present:Number(form.get('meeting_present')||0)
        }
      })
      setCreateState(mutationLifecycle.confirmed(lifecycle,response))
      setBuilder(false)
      setNotice({kind:'ok',text:'Custom model created and confirmed.'})
      await load()
      if(response?.item?.name)setSelected(response.item.name)
    }catch(error:any){
      const cause=String(error?.details?.cause||'')
      const requestId=error?.requestId||null
      if(cause==='timeout'||cause==='network'){
        const message='The backend did not confirm whether this model was created. Refresh the model catalog before submitting the same definition again.'
        setCreateState(mutationLifecycle.unknown(lifecycle,message,requestId))
        setNotice({kind:'unknown',text:message})
      }else if(Number(error?.status)===409){
        const message=error?.message||'A conflicting model definition exists. Refresh the catalog before creating again.'
        setCreateState(mutationLifecycle.conflict(lifecycle,message,requestId))
        setNotice({kind:'error',text:message})
      }else{
        const message=error?.message||'Custom model could not be created.'
        setCreateState(mutationLifecycle.rejected(lifecycle,message,requestId))
        setNotice({kind:'error',text:message})
      }
    }finally{
      setBusy('')
    }
  }

  return <>
    <PageHead crumb="Data / Models" title="Custom models" sub="Use transparent workspace scoring services backed by persisted customer and journey evidence." action="Create custom model" onAction={()=>setBuilder(true)}/>

    {notice.text&&notice.kind==='unknown'&&
      <StaleState title="Model action needs reconciliation" description={notice.text} action={{label:'Refresh model state',onClick:load}}/>
    }
    {notice.text&&notice.kind!=='unknown'&&
      <div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}>
        {notice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}
        <span>{notice.text}</span>
      </div>
    }

    <div className="model-ops-layout">
      <div className="app-panel model-list">
        <div className="panel-head"><div><h3>Model catalog</h3><p>Built-in runtime models plus persisted workspace-defined scoring models</p></div></div>
        {(data.items||[]).length
          ?(data.items||[]).map((item:any)=>
            <button key={item.id||item.name} className={selected===item.name?'selected':''} onClick={()=>setSelected(item.name)}>
              <Target/><div><b>{item.name}</b><small>{item.type} · {item.version}</small></div><span className={String(item.status||'ready').toLowerCase()}>{item.status}</span><ChevronRight/>
            </button>
          )
          :<div className="empty-delivery-state"><Target/><div><b>No model services available</b></div></div>
        }
      </div>

      <div className="app-panel model-detail">
        {current
          ?<>
            <div className="panel-head"><div><h3>{current.name}</h3><p>{current.description}</p></div><span className={current.status==='active'?'healthy':'status'}>{current.status}</span></div>
            <div className="model-metrics">
              {[
                ['Version',current.version],
                ['Primary metric',current.metric],
                ['Current value',current.value],
                ['Serving','Workspace scoring runtime']
              ].map(row=><div key={row[0]}><span>{row[0]}</span><b>{String(row[1]??'—')}</b></div>)}
            </div>
            {!current.builtIn&&
              <div className="agent-section">
                <h4>Explainable feature weights</h4>
                <div className="site-detail-grid">{Object.entries(current.weights||{}).map(([key,value])=><div key={key}><span>{key.replaceAll('_',' ')}</span><b>{String(value)}</b></div>)}</div>
              </div>
            }
            <div className="approval-actions">
              <button onClick={viewValidation}>View validation</button>
              <button className="approve" disabled={busy==='run'} onClick={run}><Target/>{busy==='run'?'Running…':'Run scoring snapshot'}</button>
            </div>
          </>
          :<div className="empty-delivery-state"><Target/><div><b>No model selected</b></div></div>
        }
      </div>
    </div>

    <div className="app-panel">
      <div className="panel-head"><div><h3>Recent model runs</h3><p>Persisted scoring snapshots</p></div></div>
      {(data.runs||[]).length
        ?(data.runs||[]).slice(0,10).map((item:any)=><div className="developer-event-row" key={item.id}><b>{item.name}</b><span>{item.status} · {Number(item.rowsScored||0).toLocaleString('en-IN')} rows · avg {item.averageScore??'—'}</span><strong>{item.completedAt?new Date(item.completedAt).toLocaleString():'—'}</strong></div>)
        :<div className="empty-delivery-state"><Activity/><div><b>No model runs yet</b></div></div>
      }
    </div>

    {builder&&
      <AccessibleDialog ariaLabel="Create custom scoring model" onClose={()=>setBuilder(false)}>
        <form className="connector-card" onSubmit={create}>
          <div className="connector-modal-head">
            <div><Target/><div><b>Create custom scoring model</b><small>Define transparent feature weights over persisted first-party evidence.</small></div></div>
            <button type="button" onClick={()=>setBuilder(false)}><X/></button>
          </div>
          <label>Model name<input name="name" required placeholder="High-intent propensity"/></label>
          <label>Description<textarea name="description" placeholder="Scores high-intent leads using journey and interaction evidence."/></label>
          <div className="two-col">
            <label>Lead score weight<input name="lead_score" type="number" min="-100" max="100" defaultValue="40"/></label>
            <label>Journey depth weight<input name="journey_depth" type="number" min="-100" max="100" defaultValue="20"/></label>
            <label>Pricing views weight<input name="pricing_views" type="number" min="-100" max="100" defaultValue="20"/></label>
            <label>WhatsApp engaged weight<input name="whatsapp_engaged" type="number" min="-100" max="100" defaultValue="10"/></label>
            <label>Meeting present weight<input name="meeting_present" type="number" min="-100" max="100" defaultValue="10"/></label>
          </div>
          <div className="source-conflict-note"><ShieldCheck/><div><b>Explainability boundary</b><p>Scores use only the visible feature weights above. AceMarketing does not claim predictive accuracy until you validate the model against your own labelled outcomes.</p></div></div>
          <button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create custom model'}</button>
        </form>
      </AccessibleDialog>
    }

    {validationOpen&&
      <AccessibleDialog ariaLabel="Model validation evidence" onClose={()=>setValidationOpen(false)}>
        <div className="connector-card">
          <div className="connector-modal-head">
            <div><Target/><div><b>Model validation evidence</b><small>{selected}</small></div></div>
            <button onClick={()=>setValidationOpen(false)}><X/></button>
          </div>
          {validation
            ?<>
              <div className="site-detail-grid">
                {[
                  ['Lead population',validation.leadPopulation??0],
                  ['Average lead score',validation.averageLeadScore??0],
                  ['Persisted model runs',validation.runs?.length||0],
                  ['Generated',validation.generatedAt?new Date(validation.generatedAt).toLocaleString():'—']
                ].map(row=><div key={row[0]}><span>{row[0]}</span><b>{String(row[1])}</b></div>)}
              </div>
              <div className="source-conflict-note"><ShieldCheck/><div><b>Validation boundary</b><p>{validation.notice}</p></div></div>
            </>
            :<div className="empty-delivery-state"><Target/><div><b>No validation evidence available</b></div></div>
          }
        </div>
      </AccessibleDialog>
    }
  </>
}
