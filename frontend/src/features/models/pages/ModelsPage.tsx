import {useEffect,useMemo,useRef,useState,type FormEvent} from 'react'
import {Activity,CheckCircle2,ChevronRight,ShieldCheck,Sparkles,Target,X} from 'lucide-react'
import {
  modelsApi,
  type ModelCatalogItem,
  type ModelRun,
  type ModelsResponse,
  type ModelValidation
} from '../data/models.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {EmptyState,ErrorState,LoadingState,StaleState} from '../../../components/system/FrontendStates'
import {initialMutationLifecycle,mutationLifecycle} from '../../../lib/mutation-lifecycle'
import {useDirtyWork} from '../../../lib/dirty-work'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string;title:string;sub:string;action?:string;onAction?:()=>void}){
  return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}</div>
}

const formatDate=(value?:string)=>value?new Date(value).toLocaleString():'—'

const runtimeLabel=(model:ModelCatalogItem)=>{
  const readiness=model.governance?.readiness
  if(readiness)return readiness.replaceAll('_',' ')
  if(model.status==='active')return 'runtime active'
  if(model.status==='ready')return 'runtime ready'
  return model.status||'unknown'
}

const validationBoundary=(model:ModelCatalogItem)=>{
  if(model.governance?.evaluationStatus)return model.governance.evaluationStatus
  return 'No statistical qualification evidence published'
}

export default function ModelsPage(){
  const [data,setData]=useState<ModelsResponse>({items:[],runs:[]})
  const [selected,setSelected]=useState('')
  const [busy,setBusy]=useState('')
  const [loading,setLoading]=useState(true)
  const [loadError,setLoadError]=useState('')
  const [validation,setValidation]=useState<ModelValidation|null>(null)
  const [validationLoading,setValidationLoading]=useState(false)
  const [validationError,setValidationError]=useState('')
  const [validationOpen,setValidationOpen]=useState(false)
  const [builder,setBuilder]=useState(false)
  const [notice,setNotice]=useState<{kind:'ok'|'error'|'unknown'|'',text:string}>({kind:'',text:''})
  const [runState,setRunState]=useState(()=>initialMutationLifecycle<ModelRun>())
  const [createState,setCreateState]=useState(()=>initialMutationLifecycle<{item:ModelCatalogItem}>())
  const loadSequence=useRef(0)
  const loadAbort=useRef<AbortController|null>(null)
  const validationSequence=useRef(0)
  const validationAbort=useRef<AbortController|null>(null)

  useDirtyWork({key:'custom-model-draft',label:'Custom model draft',dirty:builder,scope:'feature'})

  const load=async()=>{
    const sequence=++loadSequence.current
    loadAbort.current?.abort('superseded_model_catalog_read')
    const controller=new AbortController()
    loadAbort.current=controller
    setLoading(true)
    setLoadError('')
    try{
      const response=await modelsApi.list({signal:controller.signal})
      if(sequence!==loadSequence.current)return
      const next:ModelsResponse={
        items:Array.isArray(response?.items)?response.items:[],
        runs:Array.isArray(response?.runs)?response.runs:[]
      }
      setData(next)
      setSelected(current=>current&&next.items.some(model=>model.name===current)?current:(next.items[0]?.name||''))
    }catch(error:any){
      if(sequence!==loadSequence.current||String(error?.details?.cause||'')==='aborted')return
      setLoadError(error?.message||'Model services could not be loaded.')
    }finally{
      if(sequence===loadSequence.current)setLoading(false)
    }
  }

  useEffect(()=>{
    void load()
    return ()=>{
      loadAbort.current?.abort('models_feature_unmounted')
      validationAbort.current?.abort('models_feature_unmounted')
    }
  },[])

  const current=useMemo(
    ()=>data.items.find(item=>item.name===selected)||data.items[0]||null,
    [data.items,selected]
  )

  const run=async()=>{
    if(!current)return
    let lifecycle=mutationLifecycle.validating(runState)
    setRunState(lifecycle)
    lifecycle=mutationLifecycle.submitting(lifecycle)
    setRunState(lifecycle)
    setBusy('run')
    setNotice({kind:'',text:''})
    try{
      const response=await modelsApi.run(current.name)
      setRunState(mutationLifecycle.confirmed(lifecycle,response))
      if(response.status==='no_data'){
        setNotice({kind:'error',text:'The backend confirmed the run, but no eligible profiles were available. No predictive quality claim can be made from this run.'})
      }else{
        setNotice({kind:'ok',text:'Model run completed for '+Number(response.rowsScored||0).toLocaleString('en-IN')+' profile(s), average score '+String(response.averageScore??'—')+'.'})
      }
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
    const modelName=current.name
    const sequence=++validationSequence.current
    validationAbort.current?.abort('superseded_model_validation_read')
    const controller=new AbortController()
    validationAbort.current=controller
    setValidation(null)
    setValidationError('')
    setValidationLoading(true)
    setValidationOpen(true)
    try{
      const response=await modelsApi.validation(modelName,{signal:controller.signal})
      if(sequence!==validationSequence.current)return
      setValidation(response)
    }catch(error:any){
      if(sequence!==validationSequence.current||String(error?.details?.cause||'')==='aborted')return
      setValidationError(error?.message||'Validation evidence could not be loaded.')
    }finally{
      if(sequence===validationSequence.current)setValidationLoading(false)
    }
  }

  const create=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault()
    const form=new FormData(event.currentTarget)
    let lifecycle=mutationLifecycle.validating(createState)
    setCreateState(lifecycle)
    lifecycle=mutationLifecycle.submitting(lifecycle)
    setCreateState(lifecycle)
    setBusy('create')
    setNotice({kind:'',text:''})

    try{
      const response=await modelsApi.create({
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
      setNotice({kind:'ok',text:'Custom scoring definition created. Statistical qualification still requires labelled evaluation evidence.'})
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

    {loading&&!data.items.length&&
      <LoadingState title="Loading model catalog" description="Reading workspace-scoped model definitions and recent scoring evidence."/>
    }
    {loadError&&
      <ErrorState title="Model catalog unavailable" description={loadError} action={{label:'Retry',onClick:load}}/>
    }
    {!loading&&!loadError&&!data.items.length&&
      <EmptyState title="No model services available" description="No model definitions were returned for this workspace." action={{label:'Refresh',onClick:load}}/>
    }

    {!!data.items.length&&<div className="model-ops-layout">
      <div className="app-panel model-list">
        <div className="panel-head"><div><h3>Model catalog</h3><p>Built-in runtime models plus persisted workspace-defined scoring models</p></div></div>
        {data.items.map(item=>
          <button key={item.id||item.name} className={selected===item.name?'selected':''} onClick={()=>setSelected(item.name)}>
            <Target/><div><b>{item.name}</b><small>{item.type} · {item.version}</small></div><span className={String(item.status||'ready').toLowerCase()}>{item.status}</span><ChevronRight/>
          </button>
        )}
      </div>

      <div className="app-panel model-detail">
        {current
          ?<>
            <div className="panel-head"><div><h3>{current.name}</h3><p>{current.description}</p></div><span className={current.status==='active'?'healthy':'status'}>{current.status}</span></div>
            <div className="model-metrics">
              {[
                ['Version',current.version],
                ['Primary metric',current.metric||'—'],
                ['Current value',current.value??'—'],
                ['Serving',runtimeLabel(current)],
                ['Evaluation',validationBoundary(current)]
              ].map(row=><div key={row[0]}><span>{row[0]}</span><b>{String(row[1])}</b></div>)}
            </div>

            {current.governance&&
              <div className="agent-section">
                <h4>Model governance</h4>
                <div className="site-detail-grid">
                  <div><span>Task</span><b>{current.governance.task||'—'}</b></div>
                  <div><span>Provider</span><b>{current.governance.provider||'—'}</b></div>
                  <div><span>Requested model</span><b>{current.governance.requestedModel||'—'}</b></div>
                  <div><span>Resolved model</span><b>{current.governance.resolvedModel||'Not resolved'}</b></div>
                </div>
                {!!current.governance.warnings?.length&&
                  <div className="source-conflict-note"><ShieldCheck/><div><b>Readiness warnings</b><p>{current.governance.warnings.join(' ')}</p></div></div>
                }
              </div>
            }

            {!current.builtIn&&
              <div className="agent-section">
                <h4>Explainable feature weights</h4>
                <div className="site-detail-grid">{Object.entries(current.weights||{}).map(([key,value])=><div key={key}><span>{key.replaceAll('_',' ')}</span><b>{String(value)}</b></div>)}</div>
              </div>
            }
            <div className="approval-actions">
              <button onClick={viewValidation} disabled={validationLoading}>View validation</button>
              <button className="approve" disabled={busy==='run'} onClick={run}><Target/>{busy==='run'?'Running…':'Run scoring snapshot'}</button>
            </div>
          </>
          :<EmptyState title="No model selected" description="Choose a model from the workspace catalog." compact/>
        }
      </div>
    </div>}

    <div className="app-panel">
      <div className="panel-head"><div><h3>Recent model runs</h3><p>Persisted scoring snapshots</p></div></div>
      {data.runs.length
        ?data.runs.slice(0,10).map(item=><div className="developer-event-row" key={item.id}><b>{item.name}</b><span>{item.status} · {Number(item.rowsScored||0).toLocaleString('en-IN')} rows · avg {item.averageScore??'—'}</span><strong>{formatDate(item.completedAt)}</strong></div>)
        :<EmptyState title="No model runs yet" description="Run a scoring snapshot to create persisted execution evidence." compact/>
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
          <div className="source-conflict-note"><ShieldCheck/><div><b>Explainability boundary</b><p>Scores use only the visible feature weights above. AceMarketing does not claim predictive accuracy until the model has labelled holdout evaluation evidence.</p></div></div>
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
          {validationLoading&&<LoadingState title="Loading validation evidence" description="Reading the latest workspace-scoped validation record." compact/>}
          {!validationLoading&&validationError&&<ErrorState title="Validation evidence unavailable" description={validationError} action={{label:'Retry',onClick:viewValidation}} compact/>}
          {!validationLoading&&!validationError&&validation
            ?<>
              <div className="site-detail-grid">
                {[
                  ['Lead population',validation.leadPopulation??0],
                  ['Average lead score',validation.averageLeadScore??0],
                  ['Persisted model runs',validation.runs?.length||0],
                  ['Evaluation status',validation.evaluationStatus||'Not statistically qualified'],
                  ['Generated',formatDate(validation.generatedAt)]
                ].map(row=><div key={row[0]}><span>{row[0]}</span><b>{String(row[1])}</b></div>)}
              </div>
              <div className="source-conflict-note"><ShieldCheck/><div><b>Validation boundary</b><p>{validation.notice||'Runtime scoring evidence is available, but offline statistical qualification has not been published.'}</p></div></div>
              {!!validation.warnings?.length&&<StaleState title="Validation warnings" description={validation.warnings.join(' ')} compact/>}
            </>
            :!validationLoading&&!validationError&&<EmptyState title="No validation evidence available" description="No validation record was returned for this model." compact/>
          }
        </div>
      </AccessibleDialog>
    }
  </>
}
