import {useEffect,useMemo,useRef,useState,type FormEvent} from 'react'
import {Activity,CheckCircle2,ChevronRight,ShieldCheck,Sparkles,Target,X} from 'lucide-react'
import {
  modelsApi,
  type AiEvaluation,
  type AiEvaluationPolicy,
  type AiRegistryEntry,
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
  const [registry,setRegistry]=useState<AiRegistryEntry[]>([])
  const [evaluations,setEvaluations]=useState<AiEvaluation[]>([])
  const [policy,setPolicy]=useState<AiEvaluationPolicy|null>(null)
  const [governanceLoading,setGovernanceLoading]=useState(false)
  const [governanceError,setGovernanceError]=useState('')
  const [governanceBusy,setGovernanceBusy]=useState('')
  const [policyOpen,setPolicyOpen]=useState(false)
  const [policyDraft,setPolicyDraft]=useState({version:'v1',thresholds:'{"meanNdcg":{"min":0.6}}',notes:''})
  const loadSequence=useRef(0)
  const loadAbort=useRef<AbortController|null>(null)
  const validationSequence=useRef(0)
  const validationAbort=useRef<AbortController|null>(null)
  const governanceSequence=useRef(0)
  const governanceAbort=useRef<AbortController|null>(null)

  useDirtyWork({key:'custom-model-draft',label:'Custom model draft',dirty:builder,scope:'feature'})

  const loadGovernance=async(task?:string)=>{
    const sequence=++governanceSequence.current
    governanceAbort.current?.abort('superseded_model_governance_read')
    const controller=new AbortController()
    governanceAbort.current=controller
    setGovernanceLoading(true)
    setGovernanceError('')
    try{
      const [registryResponse,evaluationResponse,policyResponse]=await Promise.all([
        modelsApi.governance({signal:controller.signal}),
        modelsApi.evaluations(task,{signal:controller.signal}),
        task?modelsApi.policy(task,{signal:controller.signal}):Promise.resolve({item:null,task:''})
      ])
      if(sequence!==governanceSequence.current)return
      setRegistry(Array.isArray(registryResponse.tenantItems)&&registryResponse.tenantItems.length
        ?registryResponse.tenantItems
        :Array.isArray(registryResponse.items)?registryResponse.items:[])
      setEvaluations(Array.isArray(evaluationResponse.items)?evaluationResponse.items:[])
      setPolicy(policyResponse.item||null)
      if(policyResponse.item){
        setPolicyDraft({
          version:policyResponse.item.version||'v1',
          thresholds:JSON.stringify(policyResponse.item.thresholds||{},null,2),
          notes:policyResponse.item.notes||''
        })
      }
    }catch(error:any){
      if(sequence!==governanceSequence.current||String(error?.details?.cause||'')==='aborted')return
      setGovernanceError(error?.message||'AI governance evidence could not be loaded.')
    }finally{
      if(sequence===governanceSequence.current)setGovernanceLoading(false)
    }
  }

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
    void loadGovernance()
    return ()=>{
      loadAbort.current?.abort('models_feature_unmounted')
      validationAbort.current?.abort('models_feature_unmounted')
      governanceAbort.current?.abort('models_feature_unmounted')
    }
  },[])

  const current=useMemo(
    ()=>data.items.find(item=>item.name===selected)||data.items[0]||null,
    [data.items,selected]
  )
  const currentTask=current?.governance?.task||null
  const tenantModel=useMemo(
    ()=>currentTask?registry.find(item=>item.task===currentTask)||null:null,
    [registry,currentTask]
  )
  const taskEvaluations=useMemo(
    ()=>currentTask?evaluations.filter(item=>item.task===currentTask):evaluations,
    [evaluations,currentTask]
  )
  const latestEvaluation=taskEvaluations[0]||null

  useEffect(()=>{
    if(currentTask)void loadGovernance(currentTask)
  },[currentTask])

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

  const verifyAccess=async()=>{
    if(!currentTask||governanceBusy)return
    setGovernanceBusy('verify')
    setNotice({kind:'',text:''})
    try{
      const response=await modelsApi.verifyAccess(currentTask)
      setNotice({
        kind:response.accessVerified?'ok':'error',
        text:response.accessVerified
          ?'Provider account/model access verified for this task. Evaluation, approval and deployment remain separate gates.'
          :'Provider access could not be verified.'
      })
      await loadGovernance(currentTask)
    }catch(error:any){
      setNotice({
        kind:'error',
        text:error?.message||'Provider access verification is unavailable. It is disabled by default and requires an authorized bounded test configuration.'
      })
    }finally{
      setGovernanceBusy('')
    }
  }

  const savePolicy=async()=>{
    if(!currentTask||governanceBusy)return
    let thresholds:Record<string,unknown>
    try{
      const parsed=JSON.parse(policyDraft.thresholds)
      if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('thresholds must be a JSON object')
      thresholds=parsed
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'Thresholds must be valid JSON.'})
      return
    }
    setGovernanceBusy('policy')
    setNotice({kind:'',text:''})
    try{
      await modelsApi.savePolicy({
        task:currentTask,
        version:policyDraft.version.trim()||'v1',
        thresholds,
        notes:policyDraft.notes.trim()||undefined
      })
      setPolicyOpen(false)
      setNotice({kind:'ok',text:'Evaluation policy saved. Existing evidence is not automatically qualified; run qualification explicitly.'})
      await loadGovernance(currentTask)
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'Evaluation policy could not be saved.'})
    }finally{
      setGovernanceBusy('')
    }
  }

  const qualifyLatest=async()=>{
    if(!currentTask||!latestEvaluation||governanceBusy)return
    setGovernanceBusy('qualify')
    setNotice({kind:'',text:''})
    try{
      const response=await modelsApi.qualify(latestEvaluation.id)
      setNotice({
        kind:response.item.qualified?'ok':'error',
        text:response.item.qualified
          ?'Evaluation passed the predeclared policy gate. Promotion still requires an explicit approval action.'
          :'Evaluation failed the predeclared policy gate. The current baseline remains preserved.'
      })
      await loadGovernance(currentTask)
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'Evaluation qualification could not be completed.'})
    }finally{
      setGovernanceBusy('')
    }
  }

  const promoteLatest=async()=>{
    if(!currentTask||!latestEvaluation||latestEvaluation.qualified!==true||governanceBusy)return
    setGovernanceBusy('promote')
    setNotice({kind:'',text:''})
    try{
      await modelsApi.promote(currentTask,latestEvaluation.id)
      setNotice({kind:'ok',text:'Model version approved from qualified evidence. Deployment remains a separate state and is not implied.'})
      await loadGovernance(currentTask)
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'Model promotion could not be completed.'})
    }finally{
      setGovernanceBusy('')
    }
  }

  const deployCurrent=async()=>{
    if(!currentTask||!tenantModel||governanceBusy)return
    setGovernanceBusy('deploy')
    setNotice({kind:'',text:''})
    try{
      await modelsApi.deploy(currentTask)
      setNotice({kind:'ok',text:'Model deployment state is active for this tenant. Runtime policy, permissions and provider/service health still apply to every execution.'})
      await loadGovernance(currentTask)
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'Model deployment gate could not be completed.'})
    }finally{
      setGovernanceBusy('')
    }
  }

  const undeployCurrent=async()=>{
    if(!currentTask||!tenantModel||governanceBusy)return
    setGovernanceBusy('undeploy')
    setNotice({kind:'',text:''})
    try{
      await modelsApi.undeploy(currentTask)
      setNotice({kind:'ok',text:'New model execution is disabled for this tenant without deleting prior results or evaluation history.'})
      await loadGovernance(currentTask)
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'Model could not be undeployed.'})
    }finally{
      setGovernanceBusy('')
    }
  }

  const rollbackCurrent=async()=>{
    if(!currentTask||!tenantModel?.rollbackPredecessor||governanceBusy)return
    setGovernanceBusy('rollback')
    setNotice({kind:'',text:''})
    try{
      await modelsApi.rollback(currentTask)
      setNotice({kind:'ok',text:'Registry rollback completed to the recorded predecessor. Deployment remains separate from approval.'})
      await loadGovernance(currentTask)
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'Model rollback could not be completed.'})
    }finally{
      setGovernanceBusy('')
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

            {current.runnable===false&&current.blockedReason&&
              <StaleState title="Specialist route is gated" description={current.blockedReason} compact/>
            }

            {!current.builtIn&&
              <div className="agent-section">
                <h4>Explainable feature weights</h4>
                <div className="site-detail-grid">{Object.entries(current.weights||{}).map(([key,value])=><div key={key}><span>{key.replaceAll('_',' ')}</span><b>{String(value)}</b></div>)}</div>
              </div>
            }
            <div className="approval-actions">
              <button onClick={viewValidation} disabled={validationLoading}>View validation</button>
              <button className="approve" disabled={busy==='run'||current.runnable===false} onClick={run}><Target/>{busy==='run'?'Running…':current.runnable===false?'Task-specific execution':'Run scoring snapshot'}</button>
            </div>
          </>
          :<EmptyState title="No model selected" description="Choose a model from the workspace catalog." compact/>
        }
      </div>
    </div>}

    <div className="app-panel">
      <div className="panel-head">
        <div><h3>AI administration center</h3><p>Tenant-scoped registry, evaluation gates, approvals and rollback evidence</p></div>
        <button onClick={()=>void loadGovernance(currentTask||undefined)} disabled={governanceLoading}>{governanceLoading?'Refreshing…':'Refresh governance'}</button>
      </div>
      {governanceError&&<ErrorState title="AI governance unavailable" description={governanceError} action={{label:'Retry',onClick:()=>void loadGovernance(currentTask||undefined)}} compact/>}
      {!governanceError&&currentTask&&tenantModel&&<>
        <div className="site-detail-grid">
          {[
            ['Task',tenantModel.task],
            ['Provider',tenantModel.provider],
            ['Requested model',tenantModel.requestedModel],
            ['Resolved model',tenantModel.resolvedModel||'Not access-verified'],
            ['Documentation',tenantModel.documentationVerified?'verified':'unverified'],
            ['Account access',tenantModel.accessVerified?'verified':'not verified'],
            ['Configuration',tenantModel.configurationStatus||tenantModel.readiness||'—'],
            ['Training',tenantModel.trainingStatus||'—'],
            ['Evaluation',tenantModel.evaluationStatus||'—'],
            ['Approval',tenantModel.approvalStatus||'—'],
            ['Deployment',tenantModel.deploymentStatus||'—']
          ].map(row=><div key={row[0]}><span>{row[0]}</span><b>{String(row[1]??'—')}</b></div>)}
        </div>
        <div className="approval-actions">
          <button onClick={()=>void verifyAccess()} disabled={governanceBusy==='verify'||tenantModel.documentationVerified!==true}>{governanceBusy==='verify'?'Verifying…':tenantModel.accessVerified?'Re-verify provider access':'Verify provider access'}</button>
          <button onClick={()=>setPolicyOpen(true)} disabled={governanceBusy==='policy'}>Define evaluation policy</button>
          <button onClick={()=>void qualifyLatest()} disabled={!latestEvaluation||governanceBusy==='qualify'}>{governanceBusy==='qualify'?'Qualifying…':'Qualify latest evidence'}</button>
          <button className="approve" onClick={()=>void promoteLatest()} disabled={!latestEvaluation||latestEvaluation.qualified!==true||governanceBusy==='promote'}>{governanceBusy==='promote'?'Promoting…':'Approve qualified model'}</button>
          {tenantModel.deploymentStatus==='deployed'
            ?<button onClick={()=>void undeployCurrent()} disabled={governanceBusy==='undeploy'}>{governanceBusy==='undeploy'?'Disabling…':'Disable new execution'}</button>
            :<button className="approve" onClick={()=>void deployCurrent()} disabled={tenantModel.evaluationStatus!=='qualified'||tenantModel.approvalStatus!=='approved'||governanceBusy==='deploy'}>{governanceBusy==='deploy'?'Deploying…':'Deploy approved model'}</button>
          }
          <button onClick={()=>void rollbackCurrent()} disabled={!tenantModel.rollbackPredecessor||governanceBusy==='rollback'}>{governanceBusy==='rollback'?'Rolling back…':'Rollback predecessor'}</button>
        </div>
        {!policy&&<StaleState title="No predeclared evaluation policy" description="Qualification is blocked until an owner or admin defines task-specific thresholds." compact/>}
        {policy&&<div className="source-conflict-note"><ShieldCheck/><div><b>Active policy · {policy.version}</b><p>{JSON.stringify(policy.thresholds)}{policy.notes?' · '+policy.notes:''}</p></div></div>}
        <div className="agent-section">
          <h4>Evaluation evidence</h4>
          {taskEvaluations.length
            ?taskEvaluations.slice(0,8).map(item=><div className="developer-event-row" key={item.id}><b>{item.status}</b><span>{item.model_ref||item.task} · qualified {item.qualified===true?'yes':item.qualified===false?'no':'not checked'} · sample {item.sample_size??'—'}</span><strong>{formatDate(item.completed_at||item.created_at)}</strong></div>)
            :<EmptyState title="No evaluation evidence" description="Run a supported specialist task to create evaluation evidence before qualification or promotion." compact/>
          }
        </div>
        <div className="source-conflict-note"><ShieldCheck/><div><b>Qualification boundary</b><p>Saving a policy does not qualify a model. Qualification checks recorded evidence against the predeclared policy; approval and deployment remain separate explicit states.</p></div></div>
      </>}
      {!governanceError&&!currentTask&&<EmptyState title="Select a registry model" description="Choose a specialist or hosted registry entry to inspect its tenant governance lifecycle." compact/>}
    </div>

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

    {policyOpen&&currentTask&&
      <AccessibleDialog ariaLabel="AI evaluation policy" onClose={()=>setPolicyOpen(false)}>
        <div className="connector-card">
          <div className="connector-modal-head">
            <div><ShieldCheck/><div><b>Evaluation policy</b><small>{currentTask}</small></div></div>
            <button onClick={()=>setPolicyOpen(false)}><X/></button>
          </div>
          <label>Policy version<input value={policyDraft.version} onChange={event=>setPolicyDraft({...policyDraft,version:event.target.value})} placeholder="v1"/></label>
          <label>Thresholds JSON<textarea rows={8} value={policyDraft.thresholds} onChange={event=>setPolicyDraft({...policyDraft,thresholds:event.target.value})}/></label>
          <label>Notes<textarea rows={3} value={policyDraft.notes} onChange={event=>setPolicyDraft({...policyDraft,notes:event.target.value})} placeholder="Predeclare business/evaluation requirements before qualification."/></label>
          <div className="source-conflict-note"><ShieldCheck/><div><b>Predeclared gate</b><p>Thresholds are compared with persisted evaluation metrics. Missing metrics fail the gate rather than being guessed or treated as success.</p></div></div>
          <div className="approval-actions">
            <button onClick={()=>setPolicyOpen(false)}>Cancel</button>
            <button className="approve" onClick={()=>void savePolicy()} disabled={governanceBusy==='policy'}>{governanceBusy==='policy'?'Saving…':'Save policy'}</button>
          </div>
        </div>
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
