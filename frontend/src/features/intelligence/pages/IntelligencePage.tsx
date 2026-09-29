import {useEffect,useMemo,useState} from 'react'
import {Activity,BarChart3,BookOpen,BrainCircuit,CheckCircle2,Database,FileSearch,RefreshCw,ShieldCheck,Sparkles,Target,Trash2} from 'lucide-react'
import {EmptyState,ErrorState,LoadingState} from '../../../components/system/FrontendStates'
import {intelligenceApi} from '../data/intelligence.api'
import './intelligence.css'

type Notice={kind:'ok'|'error'|'warning'|'',text:string}
type Section='Analyst'|'Predictions'|'Forecasts'|'Specialists'|'Media'|'Creatives'|'Knowledge'|'Datasets'|'Results'|'Administration'

const json=(value:any)=>JSON.stringify(value,null,2)
const short=(value:any)=>typeof value==='string'?value:json(value)
const opId=(prefix:string)=>prefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,8)

function PageHead(){return <div className="page-head"><div><span>Measurement & Intelligence / AI Intelligence</span><h1 tabIndex={-1}>AI intelligence workspace</h1><p>Run governed analysis, specialist forecasting, point-in-time datasets and source-linked knowledge without bypassing tenant policy.</p></div></div>}

export default function IntelligencePage(){
 const [section,setSection]=useState<Section>('Analyst')
 const [registry,setRegistry]=useState<any[]>([])
 const [capabilities,setCapabilities]=useState<any[]>([])
 const [metrics,setMetrics]=useState<any>(null)
 const [datasets,setDatasets]=useState<any[]>([])
 const [knowledge,setKnowledge]=useState<any[]>([])
 const [results,setResults]=useState<any[]>([])
 const [policies,setPolicies]=useState<any[]>([])
 const [transcripts,setTranscripts]=useState<any[]>([])
 const [creatives,setCreatives]=useState<any[]>([])
 const [anomalyItems,setAnomalyItems]=useState<any[]>([])
 const [segmentSnapshots,setSegmentSnapshots]=useState<any[]>([])
 const [rankingItems,setRankingItems]=useState<any[]>([])
 const [activationProposals,setActivationProposals]=useState<any[]>([])
 const [policyDrafts,setPolicyDrafts]=useState<Record<string,{enabled:boolean;maxConcurrentJobs:number;monthlyUnitBudget:string}>>({})
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState<Notice>({kind:'',text:''})
 const [busy,setBusy]=useState('')
 const [question,setQuestion]=useState('')
 const [activeJob,setActiveJob]=useState<any>(null)
 const [forecastDraft,setForecastDraft]=useState({seriesId:'revenue',frequency:'D',horizon:7,seasonLength:7,history:'[]'})
 const [knowledgeDraft,setKnowledgeDraft]=useState({name:'',text:'',sourceLocation:'manual://workspace'})
 const [knowledgeQuery,setKnowledgeQuery]=useState('')
 const [datasetDraft,setDatasetDraft]=useState({task:'lead_qualification',rows:'[]',labelObservationCutoff:new Date().toISOString().slice(0,10)})
 const [specialistDraft,setSpecialistDraft]=useState({task:'marketing_mix',payload:'{}'})
 const [creativePrompt,setCreativePrompt]=useState('')
 const [predictionPayload,setPredictionPayload]=useState('{"task":"lead_qualification","artifactId":"","rows":[]}')
 const [mediaDraft,setMediaDraft]=useState({task:'multimodal_extraction',payload:'{"prompt":"Extract structured evidence.","inlineData":{"mimeType":"image/png","data":""}}'})
 const [activationDraft,setActivationDraft]=useState({task:'forecast_primary',proposalType:'budget_change',providerAdapter:'google_ads',payload:'{"budget":1000}',evidenceRefs:'["result_or_report_id"]',expiresMinutes:30})

 const load=async()=>{
  setLoading(true);setError('')
  try{
   const [r,p,t,cr,an,sg,rk,ap,caps,m,d,k,res]:any=await Promise.all([
    intelligenceApi.registry(),
    intelligenceApi.policies(),
    intelligenceApi.transcripts(),
    intelligenceApi.creatives(),
    intelligenceApi.anomalyItems(),
    intelligenceApi.listSegments(),
    intelligenceApi.rankings(),
    intelligenceApi.activationProposals(),
    intelligenceApi.capabilities().catch(()=>({items:[],configured:false})),
    intelligenceApi.metrics(),
    intelligenceApi.datasets(),
    intelligenceApi.knowledge(),
    intelligenceApi.results(undefined,100)
   ])
   setRegistry(Array.isArray(r.tenantItems)&&r.tenantItems.length?r.tenantItems:(r.items||[]))
   setPolicies(p.items||[])
   setTranscripts(t.items||[])
   setCreatives(cr.items||[])
   setAnomalyItems(an.items||[])
   setSegmentSnapshots(sg.items||[])
   setRankingItems(rk.items||[])
   setActivationProposals(ap.items||[])
   setPolicyDrafts(Object.fromEntries((p.items||[]).map((item:any)=>[item.task,{enabled:item.enabled!==false,maxConcurrentJobs:Number(item.maxConcurrentJobs||4),monthlyUnitBudget:item.monthlyUnitBudget==null?'':String(item.monthlyUnitBudget)}])))
   setCapabilities(caps.items||[])
   setMetrics(m)
   setDatasets(d.items||[])
   setKnowledge(k.items||[])
   setResults(res.items||[])
  }catch(e:any){setError(e?.message||'AI intelligence state could not be loaded.')}
  finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[])
 useEffect(()=>{
  const id=activeJob?.jobId
  if(!id)return
  const controller=new AbortController()
  void intelligenceApi.streamJob(id,event=>{
   if(event.event==='status'){
    setActiveJob((current:any)=>current?.jobId===id?{...current,job:{...(current.job||{}),...event.data}}:current)
   }
   if(event.event==='complete'){
    setActiveJob((current:any)=>current?.jobId===id?{...current,job:{...(current.job||{}),status:event.data?.status||'completed'}}:current)
    void load()
   }
  },controller.signal).catch((error:any)=>{
   if(controller.signal.aborted)return
   setNotice({kind:'warning',text:error?.message||'Live job status stream disconnected. Manual refresh remains available.'})
  })
  return()=>controller.abort('job_changed')
 },[activeJob?.jobId])

 const summary=useMemo(()=>({
  active:registry.filter(x=>x.evaluationStatus==='qualified'&&x.approvalStatus==='approved'&&x.deploymentStatus==='deployed').length,
  blocked:registry.filter(x=>!(x.evaluationStatus==='qualified'&&x.approvalStatus==='approved'&&x.deploymentStatus==='deployed')).length,
  evaluated:registry.filter(x=>x.evaluationStatus==='qualified').length,
  datasets:datasets.length
 }),[registry,datasets])

 const saveTaskPolicy=async(task:string)=>{
  const draft=policyDrafts[task]
  if(!draft)return
  setBusy('policy:'+task);setNotice({kind:'',text:''})
  try{
   await intelligenceApi.savePolicy(task,{
    enabled:draft.enabled,
    maxConcurrentJobs:Number(draft.maxConcurrentJobs),
    monthlyUnitBudget:draft.monthlyUnitBudget===''?null:Number(draft.monthlyUnitBudget),
    approvedRequestedModel:registry.find((item:any)=>item.task===task)?.requestedModel||null,
    policyVersion:'v1'
   })
   setNotice({kind:'ok',text:'Task policy saved. New work will obey the updated enablement, concurrency and monthly usage limits.'})
   await load()
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Task policy could not be saved.'})}
  finally{setBusy('')}
 }

 const reviewCreative=async(id:string,status:'in_review'|'approved'|'rejected')=>{
  setBusy('creative-review:'+id);setNotice({kind:'',text:''})
  try{
   await intelligenceApi.reviewCreative(id,status,status==='rejected'?'Rejected during workspace review.':undefined)
   setNotice({kind:'ok',text:'Creative review state updated. Approval changes review state only; it does not activate advertising.'})
   await load()
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Creative review state could not be updated.'})}
  finally{setBusy('')}
 }

 const reviewAnomaly=async(item:any,status:'investigating'|'resolved'|'false_positive')=>{
  setBusy('anomaly:'+item.result_id+':'+item.entity_id);setNotice({kind:'',text:''})
  try{
   await intelligenceApi.reviewAnomaly(item.result_id,item.entity_id,{status,feedback:status==='false_positive'?'Marked false positive during investigation.':undefined})
   setNotice({kind:'ok',text:'Anomaly triage state updated. The anomaly score remains an investigation signal, not a fraud probability.'})
   await load()
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Anomaly triage could not be updated.'})}
  finally{setBusy('')}
 }

 const createActivationProposal=async()=>{
  setBusy('activation-create');setNotice({kind:'',text:''})
  try{
   const payload=JSON.parse(activationDraft.payload)
   const evidenceRefs=JSON.parse(activationDraft.evidenceRefs)
   if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Activation payload must be a JSON object.')
   if(!Array.isArray(evidenceRefs)||!evidenceRefs.length)throw new Error('Evidence references must be a non-empty JSON array.')
   const expiresAt=new Date(Date.now()+Math.max(1,Math.min(Number(activationDraft.expiresMinutes||30),1440))*60_000).toISOString()
   await intelligenceApi.createActivationProposal({
    task:activationDraft.task,
    proposalType:activationDraft.proposalType,
    payload:{...payload,providerAdapter:activationDraft.providerAdapter},
    evidenceSnapshot:{evidenceRefs},
    expiresAt
   })
   setNotice({kind:'ok',text:'Activation proposal created for separate approval. No provider side effect has been executed.'})
   await load()
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Activation proposal could not be created.'})}
  finally{setBusy('')}
 }

 const decideActivationProposal=async(id:string,decision:'approve'|'reject')=>{
  setBusy('activation:'+decision+':'+id);setNotice({kind:'',text:''})
  try{
   if(decision==='approve')await intelligenceApi.approveActivationProposal(id)
   else await intelligenceApi.rejectActivationProposal(id,'Rejected in AI administration.')
   setNotice({kind:'ok',text:decision==='approve'?'Proposal approved after freshness and separation-of-duties checks. Approval alone does not execute the provider action.':'Proposal rejected; no provider side effect was executed.'})
   await load()
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Activation proposal decision failed.'})}
  finally{setBusy('')}
 }

 const submitAnalysis=async()=>{
  if(!question.trim())return
  setBusy('analysis');setNotice({kind:'',text:''})
  try{
   const response:any=await intelligenceApi.analysis(question.trim(),opId('analysis'))
   setActiveJob(response)
   setNotice({kind:'ok',text:'Analysis accepted as a durable job. Completion is separate from queue receipt.'})
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Analysis could not be submitted.'})}
  finally{setBusy('')}
 }

 const refreshJob=async()=>{
  if(!activeJob?.jobId)return
  setBusy('job')
  try{
   const response:any=await intelligenceApi.job(activeJob.jobId)
   setActiveJob({...activeJob,...response,job:response.job})
   if(['completed','succeeded'].includes(String(response?.job?.status||'')))await load()
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Job state could not be refreshed.'})}
  finally{setBusy('')}
 }

 const cancelJob=async()=>{
  if(!activeJob?.jobId)return
  setBusy('cancel')
  try{
   const response:any=await intelligenceApi.cancelJob(activeJob.jobId)
   setActiveJob({...activeJob,job:response.job})
   setNotice({kind:'ok',text:'Cancellation request recorded. Worker reconciliation remains authoritative.'})
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Cancellation could not be requested.'})}
  finally{setBusy('')}
 }

 const submitForecast=async(kind:'baseline'|'chronos'|'challenger')=>{
  setBusy('forecast');setNotice({kind:'',text:''})
  try{
   const history=JSON.parse(forecastDraft.history)
   if(!Array.isArray(history))throw new Error('History must be a JSON array.')
   const payload={seriesId:forecastDraft.seriesId,series_id:forecastDraft.seriesId,frequency:forecastDraft.frequency,horizon:Number(forecastDraft.horizon),seasonLength:Number(forecastDraft.seasonLength),season_length:Number(forecastDraft.seasonLength),timezone:'UTC',history}
   const response:any=kind==='baseline'
    ?await intelligenceApi.forecastBaseline(payload,opId('forecast-baseline'))
    :kind==='chronos'
      ?await intelligenceApi.forecastChronos(payload,opId('forecast-chronos'))
      :await intelligenceApi.forecastChallenger(payload,opId('forecast-challenger'))
   setActiveJob(response)
   setNotice({kind:'ok',text:'Forecast job accepted. Results remain explicitly baseline/modelled/insufficient-data depending on worker output.'})
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Forecast could not be submitted.'})}
  finally{setBusy('')}
 }

 const submitPrediction=async()=>{
  setBusy('prediction');setNotice({kind:'',text:''})
  try{
   const payload=JSON.parse(predictionPayload)
   if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Prediction request must be a JSON object.')
   const response:any=await intelligenceApi.score(payload,opId('score'))
   setActiveJob(response)
   setNotice({kind:'ok',text:'Scoring job accepted. Historical heuristic scores remain distinct from calibrated model probabilities.'})
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Scoring job could not be submitted.'})}
  finally{setBusy('')}
 }

 const submitMedia=async()=>{
  setBusy('media');setNotice({kind:'',text:''})
  try{
   const payload=JSON.parse(mediaDraft.payload)
   if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Media task payload must be a JSON object.')
   const response:any=await intelligenceApi.hostedTask(mediaDraft.task,payload,opId('media-'+mediaDraft.task))
   setActiveJob(response)
   setNotice({kind:'ok',text:'Media task accepted through the governed hosted-model lifecycle. Provider capability and deployment gates remain authoritative.'})
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Media task could not be submitted.'})}
  finally{setBusy('')}
 }

 const submitSpecialist=async()=>{
  setBusy('specialist');setNotice({kind:'',text:''})
  try{
   const payload=JSON.parse(specialistDraft.payload)
   if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Specialist payload must be a JSON object.')
   const operation=opId('specialist-'+specialistDraft.task)
   const response:any=specialistDraft.task==='marketing_mix'
    ?await intelligenceApi.marketingMix(payload,operation)
    :specialistDraft.task==='incrementality'
      ?await intelligenceApi.incrementality(payload,operation)
      :specialistDraft.task==='anomaly_detection'
        ?await intelligenceApi.anomalies(payload,operation)
        :specialistDraft.task==='behavioral_segments'
          ?await intelligenceApi.segments(payload,operation)
          :await intelligenceApi.rank(payload,operation)
   setActiveJob(response)
   setNotice({kind:'ok',text:'Specialist model job accepted. Numerical and causal outputs remain subject to task-specific validation and evaluation.'})
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Specialist model job could not be submitted.'})}
  finally{setBusy('')}
 }

 const submitCreative=async()=>{
  if(!creativePrompt.trim())return
  setBusy('creative');setNotice({kind:'',text:''})
  try{
   const response:any=await intelligenceApi.hostedTask('creative_image',{prompt:creativePrompt.trim()},opId('creative'))
   setActiveJob(response)
   setNotice({kind:'ok',text:'Creative generation accepted as a governed draft job. Generated assets are not approved or performance-qualified automatically.'})
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Creative generation could not be submitted.'})}
  finally{setBusy('')}
 }

 const ingestKnowledge=async()=>{
  if(!knowledgeDraft.name.trim()||!knowledgeDraft.text.trim())return
  setBusy('knowledge');setNotice({kind:'',text:''})
  try{
   await intelligenceApi.ingestKnowledge({name:knowledgeDraft.name.trim(),text:knowledgeDraft.text,sourceLocation:knowledgeDraft.sourceLocation,documentVersion:'v1',accessPolicy:{}})
   setKnowledgeDraft({name:'',text:'',sourceLocation:'manual://workspace'})
   setNotice({kind:'ok',text:'Knowledge source stored and queued for governed embedding/indexing.'})
   await load()
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Knowledge source could not be ingested.'})}
  finally{setBusy('')}
 }

 const searchKnowledge=async()=>{
  if(!knowledgeQuery.trim())return
  setBusy('search');setNotice({kind:'',text:''})
  try{
   const response:any=await intelligenceApi.searchKnowledge({query:knowledgeQuery.trim(),limit:10},opId('knowledge-search'))
   setActiveJob(response)
   setNotice({kind:'ok',text:'Authorized knowledge search queued. Access filtering is enforced before retrieval/reranking.'})
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Knowledge search could not be submitted.'})}
  finally{setBusy('')}
 }

 const createDataset=async()=>{
  setBusy('dataset');setNotice({kind:'',text:''})
  try{
   const rows=JSON.parse(datasetDraft.rows)
   if(!Array.isArray(rows))throw new Error('Rows must be a JSON array.')
   await intelligenceApi.createDataset({
    task:datasetDraft.task,
    rows,
    schemaVersion:'point-in-time.v1',
    featureDefinitionVersion:'features.v1',
    labelDefinitionVersion:'labels.v1',
    labelObservationCutoff:new Date(datasetDraft.labelObservationCutoff+'T23:59:59.999Z').toISOString(),
    sourceSnapshot:{source:'ui_upload',synthetic:false}
   })
   setNotice({kind:'ok',text:'Immutable point-in-time dataset snapshot created. Training remains a separate explicit action.'})
   await load()
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Dataset could not be created.'})}
  finally{setBusy('')}
 }

 const trainDataset=async(item:any)=>{
  setBusy('train:'+item.id);setNotice({kind:'',text:''})
  try{
   const payload=item.task==='future_customer_value'?{horizon:'90d',randomSeed:42,categoricalFeatures:[]}:{randomSeed:42,calibrationMethod:'sigmoid',categoricalFeatures:[]}
   const response:any=await intelligenceApi.trainDataset(item.id,payload,opId('dataset-train'))
   setActiveJob(response)
   setNotice({kind:'ok',text:'Training submitted to the bounded ML worker. Evaluation/promotion are not implied.'})
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Training could not be submitted.'})}
  finally{setBusy('')}
 }

 const retireDataset=async(id:string)=>{
  setBusy('retire:'+id)
  try{await intelligenceApi.retireDataset(id);await load();setNotice({kind:'ok',text:'Dataset retired without deleting model lineage.'})}
  catch(e:any){setNotice({kind:'error',text:e?.message||'Dataset could not be retired.'})}
  finally{setBusy('')}
 }

 const revokeKnowledge=async(id:string)=>{
  setBusy('revoke:'+id)
  try{await intelligenceApi.revokeKnowledge(id);await load();setNotice({kind:'ok',text:'Knowledge source revoked. Derived retrieval state will no longer be eligible for new answers.'})}
  catch(e:any){setNotice({kind:'error',text:e?.message||'Knowledge source could not be revoked.'})}
  finally{setBusy('')}
 }

 return <><PageHead/>
  {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':notice.kind==='warning'?'warning':'ok')} role={notice.kind==='error'?'alert':'status'}>{notice.kind==='ok'?<CheckCircle2/>:<ShieldCheck/>}<span>{notice.text}</span></div>}
  {loading&&<LoadingState title="Loading AI intelligence" description="Reading registry, datasets, knowledge, metrics and persisted model results."/>}
  {error&&<ErrorState title="AI intelligence unavailable" description={error} action={{label:'Retry',onClick:()=>void load()}}/>}
  {!loading&&!error&&<>
   <div className="stats-grid">
    <article className="stat"><div><span>Active routes</span><BrainCircuit/></div><strong>{summary.active}</strong><small>Qualified, approved and deployed</small></article>
    <article className="stat"><div><span>Blocked / pending</span><ShieldCheck/></div><strong>{summary.blocked}</strong><small>Not silently substituted</small></article>
    <article className="stat"><div><span>Qualified evaluations</span><Target/></div><strong>{summary.evaluated}</strong><small>Registry evidence</small></article>
    <article className="stat"><div><span>Datasets</span><Database/></div><strong>{summary.datasets}</strong><small>Point-in-time snapshots</small></article>
   </div>

   <nav className="intel-tabs" aria-label="AI intelligence sections">{(['Analyst','Predictions','Forecasts','Specialists','Media','Creatives','Knowledge','Datasets','Results','Administration'] as Section[]).map(item=><button key={item} className={section===item?'active':''} onClick={()=>setSection(item)}>{item}</button>)}</nav>

   {activeJob?.jobId&&<div className="app-panel intel-job"><div><b>Active job</b><span>{activeJob.task||activeJob.operation||'AI task'} · {activeJob.job?.status||activeJob.status||'queued'}</span><small>{activeJob.jobId}</small></div><div><button onClick={()=>void refreshJob()} disabled={busy==='job'}><RefreshCw/>{busy==='job'?'Refreshing…':'Refresh'}</button><button onClick={()=>void cancelJob()} disabled={busy==='cancel'}>Cancel</button></div></div>}

   {section==='Analyst'&&<div className="intel-grid two"><section className="app-panel"><div className="panel-head"><div><h3>Grounded analyst</h3><p>Uses only authorized workspace evidence and preserves evidence IDs.</p></div><Sparkles/></div><label className="intel-field">Question<textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Why did qualified lead conversion change this month?"/></label><button className="app-primary" disabled={!question.trim()||busy==='analysis'} onClick={()=>void submitAnalysis()}>{busy==='analysis'?'Submitting…':'Run governed analysis'}</button></section><section className="app-panel"><div className="panel-head"><div><h3>Metric contract</h3><p>Backend-defined metrics; no free-form arithmetic in model prose.</p></div><BarChart3/></div><pre className="intel-json">{short(metrics)}</pre></section></div>}

   {section==='Predictions'&&<div className="intel-grid two"><section className="app-panel"><div className="panel-head"><div><h3>Customer prediction scoring</h3><p>Score only with a registered specialist artifact. The backend rejects unsupported or unqualified routes.</p></div><Target/></div><label className="intel-field">Scoring request JSON<textarea value={predictionPayload} onChange={e=>setPredictionPayload(e.target.value)} placeholder='{"task":"lead_qualification","artifactId":"...","rows":[]}'/></label><button className="app-primary" disabled={busy==='prediction'} onClick={()=>void submitPrediction()}>{busy==='prediction'?'Submitting…':'Run governed scoring'}</button></section><section className="app-panel"><div className="panel-head"><div><h3>Prediction semantics</h3><p>Probability, horizon, artifact identity and calibration evidence remain explicit.</p></div><ShieldCheck/></div><div className="intel-callout"><ShieldCheck/><div><b>No score reinterpretation</b><p>Legacy heuristic scores remain heuristic scores. A calibrated probability is shown only when produced by the fitted/calibrated model pipeline with its calibration reference.</p></div></div></section></div>}

   {section==='Forecasts'&&<div className="intel-grid two"><section className="app-panel"><div className="panel-head"><div><h3>Forecast request</h3><p>Submit baseline, Chronos-2 or CatBoost challenger through bounded ML workers.</p></div><Activity/></div><div className="intel-row"><label>Series ID<input value={forecastDraft.seriesId} onChange={e=>setForecastDraft(x=>({...x,seriesId:e.target.value}))}/></label><label>Frequency<input value={forecastDraft.frequency} onChange={e=>setForecastDraft(x=>({...x,frequency:e.target.value}))}/></label><label>Horizon<input type="number" min="1" value={forecastDraft.horizon} onChange={e=>setForecastDraft(x=>({...x,horizon:Number(e.target.value)}))}/></label><label>Season length<input type="number" min="1" value={forecastDraft.seasonLength} onChange={e=>setForecastDraft(x=>({...x,seasonLength:Number(e.target.value)}))}/></label></div><label className="intel-field">History JSON<textarea value={forecastDraft.history} onChange={e=>setForecastDraft(x=>({...x,history:e.target.value}))} placeholder='[{"timestamp":"2026-09-01T00:00:00Z","value":120}]'/></label><div className="intel-actions"><button onClick={()=>void submitForecast('baseline')} disabled={busy==='forecast'}>Seasonal-naive baseline</button><button onClick={()=>void submitForecast('challenger')} disabled={busy==='forecast'}>CatBoost challenger</button><button className="app-primary" onClick={()=>void submitForecast('chronos')} disabled={busy==='forecast'}>Chronos-2</button></div></section><section className="app-panel"><div className="panel-head"><div><h3>ML capability state</h3><p>Dependency availability is distinct from training and qualification.</p></div><ShieldCheck/></div><div className="intel-list">{capabilities.length?capabilities.map((item:any)=><article key={item.task}><div><b>{item.task}</b><small>{item.implementation}</small></div><span>{item.dependencyAvailable===false?'dependency missing':item.trained?'trained':'not trained'}</span></article>):<EmptyState title="No ML capability response" description="Configure the ML service to inspect runtime dependency state."/>}</div></section></div>}

   {section==='Specialists'&&<div className="intel-grid two"><section className="app-panel"><div className="panel-head"><div><h3>Specialist numerical models</h3><p>Run task-specific ML paths. These models do not share an LLM fallback.</p></div><Target/></div><label>Task<select value={specialistDraft.task} onChange={e=>setSpecialistDraft(x=>({...x,task:e.target.value}))}><option value="marketing_mix">Marketing mix · Meridian</option><option value="incrementality">Incrementality · CausalForestDML</option><option value="anomaly_detection">Anomalies · IsolationForest</option><option value="behavioral_segments">Segments · HDBSCAN</option><option value="offer_ranking">Offer ranking · LGBMRanker</option></select></label><label className="intel-field">Validated request JSON<textarea value={specialistDraft.payload} onChange={e=>setSpecialistDraft(x=>({...x,payload:e.target.value}))} placeholder='{"rows":[]}'/></label><button className="app-primary" disabled={busy==='specialist'} onClick={()=>void submitSpecialist()}>{busy==='specialist'?'Submitting…':'Run specialist model'}</button><div className="panel-head"><div><h3>Anomaly triage</h3><p>Persisted flagged entities with investigator feedback.</p></div></div><div className="intel-list">{anomalyItems.length?anomalyItems.slice(0,25).map((item:any)=><article key={item.result_id+':'+item.entity_id}><div><b>{item.entity_id}</b><small>score {Number(item.score).toFixed(4)} · {item.triage_status}</small></div><div className="intel-actions"><button disabled={busy==='anomaly:'+item.result_id+':'+item.entity_id} onClick={()=>void reviewAnomaly(item,'investigating')}>Investigate</button><button disabled={busy==='anomaly:'+item.result_id+':'+item.entity_id} onClick={()=>void reviewAnomaly(item,'resolved')}>Resolve</button><button disabled={busy==='anomaly:'+item.result_id+':'+item.entity_id} onClick={()=>void reviewAnomaly(item,'false_positive')}>False positive</button></div></article>):<EmptyState title="No anomaly items" description="IsolationForest results flagged for investigation will appear here."/>}</div></section><section className="app-panel"><div className="panel-head"><div><h3>Versioned specialist evidence</h3><p>Clusters and rankings are stored separately from generic model output.</p></div><ShieldCheck/></div><div className="intel-callout"><ShieldCheck/><div><b>Task-specific evidence</b><p>Marketing mix requires support and diagnostics. Incrementality requires a documented estimand and overlap. Anomalies are investigation signals, clusters are version-specific, and offline ranking scores do not prove incremental lift.</p></div></div><div className="panel-head"><div><h3>Segment snapshots</h3><p>Cluster IDs are scoped to each snapshot version.</p></div></div><div className="intel-list">{segmentSnapshots.length?segmentSnapshots.slice(0,20).map((item:any)=><article key={item.id}><div><b>{item.snapshot_version}</b><small>{item.cluster_count} clusters · {item.noise_count} noise · {item.member_count} members</small></div></article>):<EmptyState title="No segment snapshots" description="Completed HDBSCAN runs will create versioned membership snapshots."/>}</div><div className="panel-head"><div><h3>Eligible ranked offers</h3><p>Only eligible candidates returned from verified ranking artifacts are persisted.</p></div></div><div className="intel-list">{rankingItems.length?rankingItems.slice(0,30).map((item:any)=><article key={item.result_id+':'+item.group_id+':'+item.candidate_id}><div><b>{item.group_id} · #{item.rank}</b><small>{item.candidate_id} · score {Number(item.score).toFixed(4)}</small></div></article>):<EmptyState title="No ranking results" description="Verified ranker scoring results will appear here."/>}</div></section></div>}

   {section==='Media'&&<div className="intel-grid two"><section className="app-panel"><div className="panel-head"><div><h3>Multimodal & transcription</h3><p>Submit native provider tasks without exposing provider credentials to the browser.</p></div><FileSearch/></div><label>Task<select value={mediaDraft.task} onChange={e=>setMediaDraft(x=>({...x,task:e.target.value}))}><option value="multimodal_extraction">Multimodal extraction · Gemini</option><option value="call_transcription">Call transcription · Gemini</option><option value="embedding">Embedding · Voyage</option><option value="reranking">Reranking · Voyage</option></select></label><label className="intel-field">Validated request JSON<textarea value={mediaDraft.payload} onChange={e=>setMediaDraft(x=>({...x,payload:e.target.value}))}/></label><button className="app-primary" disabled={busy==='media'} onClick={()=>void submitMedia()}>{busy==='media'?'Submitting…':'Submit media task'}</button><div className="panel-head"><div><h3>Persisted transcripts</h3><p>Completed transcription jobs are linked to their authorized provider asset reference.</p></div></div><div className="intel-list">{transcripts.length?transcripts.map((item:any)=><article key={item.id}><div><b>{item.id}</b><small>{item.language_metadata?.languageCodes?.join(', ')||'language unreported'} · {item.review_status||'unreviewed'} · {item.asset_ref||'asset unavailable'}</small><p>{String(item.transcript_text||'').slice(0,300)||'No transcript text persisted.'}</p></div></article>):<EmptyState title="No persisted transcripts" description="Completed authorized call transcription jobs will appear here."/>}</div></section><section className="app-panel"><div className="panel-head"><div><h3>Provider-specific constraints</h3><p>Each task uses its native adapter and schema rather than a universal chat-completion payload.</p></div><ShieldCheck/></div><div className="intel-callout"><ShieldCheck/><div><b>Untrusted inputs stay data</b><p>Multimodal content, transcripts and retrieved text cannot override authorization or tool policy. Transcription requires an authorized provider file URI and validated audio MIME type.</p></div></div></section></div>}

   {section==='Creatives'&&<div className="intel-grid two"><section className="app-panel"><div className="panel-head"><div><h3>Creative draft generation</h3><p>Submit a governed image-generation job. Provider credentials stay server-side.</p></div><Sparkles/></div><label className="intel-field">Creative brief<textarea value={creativePrompt} onChange={e=>setCreativePrompt(e.target.value)} placeholder="Describe the approved brand-safe draft to generate."/></label><button className="app-primary" disabled={!creativePrompt.trim()||busy==='creative'} onClick={()=>void submitCreative()}>{busy==='creative'?'Submitting…':'Generate draft'}</button><div className="intel-list">{creatives.length?creatives.map((item:any)=><article key={item.id}><div><b>{item.id}</b><small>{item.review_status||item.reviewStatus||'draft'} · {item.requested_model||item.requestedModel||'—'} · v{item.version||1}</small></div><div className="intel-actions">{(item.review_status||item.reviewStatus)==='draft'&&<button disabled={busy==='creative-review:'+item.id} onClick={()=>void reviewCreative(item.id,'in_review')}>Send to review</button>}{(item.review_status||item.reviewStatus)==='in_review'&&<><button disabled={busy==='creative-review:'+item.id} onClick={()=>void reviewCreative(item.id,'approved')}>Approve</button><button disabled={busy==='creative-review:'+item.id} onClick={()=>void reviewCreative(item.id,'rejected')}>Reject</button></>}</div></article>):<EmptyState title="No generated creative records" description="Completed creative jobs with image output will be persisted as draft assets."/>}</div></section><section className="app-panel"><div className="panel-head"><div><h3>Review required</h3><p>Generation is not approval and is never treated as evidence of future advertising performance.</p></div><ShieldCheck/></div><div className="intel-callout"><ShieldCheck/><div><b>Draft-only lifecycle</b><p>Keep generated assets in draft/review state until an authorized reviewer approves them. Campaign activation remains outside the image model.</p></div></div></section></div>}

   {section==='Knowledge'&&<div className="intel-grid two"><section className="app-panel"><div className="panel-head"><div><h3>Knowledge ingestion</h3><p>Store versioned, tenant-scoped source text for governed retrieval.</p></div><BookOpen/></div><label>Name<input value={knowledgeDraft.name} onChange={e=>setKnowledgeDraft(x=>({...x,name:e.target.value}))}/></label><label>Source location<input value={knowledgeDraft.sourceLocation} onChange={e=>setKnowledgeDraft(x=>({...x,sourceLocation:e.target.value}))}/></label><label className="intel-field">Text<textarea value={knowledgeDraft.text} onChange={e=>setKnowledgeDraft(x=>({...x,text:e.target.value}))}/></label><button className="app-primary" disabled={busy==='knowledge'||!knowledgeDraft.name.trim()||!knowledgeDraft.text.trim()} onClick={()=>void ingestKnowledge()}>Ingest source</button><div className="intel-search"><input value={knowledgeQuery} onChange={e=>setKnowledgeQuery(e.target.value)} placeholder="Search authorized knowledge"/><button disabled={busy==='search'||!knowledgeQuery.trim()} onClick={()=>void searchKnowledge()}><FileSearch/>Search</button></div></section><section className="app-panel"><div className="panel-head"><div><h3>Sources</h3><p>Revocations remain visible for lineage and audit.</p></div></div><div className="intel-list">{knowledge.length?knowledge.map((item:any)=><article key={item.id}><div><b>{item.name||item.id}</b><small>{item.document_version||item.documentVersion||'v1'} · {item.status||'stored'}</small></div><button onClick={()=>void revokeKnowledge(item.id)} disabled={busy==='revoke:'+item.id}><Trash2/>Revoke</button></article>):<EmptyState title="No knowledge sources" description="Ingest a source to begin governed retrieval."/>}</div></section></div>}

   {section==='Datasets'&&<div className="intel-grid two"><section className="app-panel"><div className="panel-head"><div><h3>Create point-in-time dataset</h3><p>Rows must preserve feature availability and label-observation cutoffs.</p></div><Database/></div><label>Task<select value={datasetDraft.task} onChange={e=>setDatasetDraft(x=>({...x,task:e.target.value}))}><option>lead_qualification</option><option>paid_conversion</option><option>customer_churn</option><option>future_customer_value</option></select></label><label>Label observation cutoff<input type="date" value={datasetDraft.labelObservationCutoff} onChange={e=>setDatasetDraft(x=>({...x,labelObservationCutoff:e.target.value}))}/></label><label className="intel-field">Rows JSON<textarea value={datasetDraft.rows} onChange={e=>setDatasetDraft(x=>({...x,rows:e.target.value}))} placeholder='[{"entityId":"lead_1","predictionCutoff":"...","labelAvailableAt":"...","label":1,"features":{"source":"google"}}]'/></label><button className="app-primary" onClick={()=>void createDataset()} disabled={busy==='dataset'}>Create immutable dataset</button></section><section className="app-panel"><div className="panel-head"><div><h3>Dataset inventory</h3><p>Training and retirement are explicit lifecycle actions.</p></div></div><div className="intel-list">{datasets.length?datasets.map((item:any)=><article key={item.id}><div><b>{item.task}</b><small>{item.id} · {item.maturity_status||item.maturityStatus||'unknown'} · {item.row_count||item.rowCount||0} rows</small></div><div><button onClick={()=>void trainDataset(item)} disabled={busy==='train:'+item.id}>Train</button><button onClick={()=>void retireDataset(item.id)} disabled={busy==='retire:'+item.id}>Retire</button></div></article>):<EmptyState title="No datasets" description="Create a point-in-time snapshot before tenant-specific supervised training."/>}</div></section></div>}

   {section==='Results'&&<section className="app-panel"><div className="panel-head"><div><h3>Persisted AI results</h3><p>Observed metrics, predictions, forecasts and provider outputs remain typed and versioned.</p></div><button onClick={()=>void load()}><RefreshCw/>Refresh</button></div><div className="intel-results">{results.length?results.map((item:any)=><article key={item.id}><div><b>{item.task}</b><span>{item.result_type||item.resultType||'result'} · {item.status}</span><small>{item.requested_model||item.requestedModel||'—'} → {item.resolved_model||item.resolvedModel||'—'}</small></div><pre>{short(item.payload)}</pre></article>):<EmptyState title="No persisted AI results" description="Completed governed jobs will appear here; queued work is not treated as a completed result."/>}</div></section>}

   {section==='Administration'&&<><div className="intel-grid two"><section className="app-panel"><div className="panel-head"><div><h3>Task registry & policy</h3><p>Configuration, provider access, evaluation, approval, deployment and tenant execution policy remain separate.</p></div><ShieldCheck/></div><div className="intel-list registry">{registry.map((item:any)=>{const draft=policyDrafts[item.task]||{enabled:true,maxConcurrentJobs:4,monthlyUnitBudget:''};return <article key={item.task}><div><b>{item.task}</b><small>{item.provider} · {item.requestedModel} · {item.readiness||'unknown'}</small><div className="intel-policy-row"><label><input type="checkbox" checked={draft.enabled} onChange={e=>setPolicyDrafts(x=>({...x,[item.task]:{...draft,enabled:e.target.checked}}))}/> Enabled</label><label>Concurrency<input type="number" min="1" max="1000" value={draft.maxConcurrentJobs} onChange={e=>setPolicyDrafts(x=>({...x,[item.task]:{...draft,maxConcurrentJobs:Number(e.target.value)}}))}/></label><label>Monthly units<input type="number" min="0" placeholder="No explicit cap" value={draft.monthlyUnitBudget} onChange={e=>setPolicyDrafts(x=>({...x,[item.task]:{...draft,monthlyUnitBudget:e.target.value}}))}/></label><button disabled={busy==='policy:'+item.task} onClick={()=>void saveTaskPolicy(item.task)}>{busy==='policy:'+item.task?'Saving…':'Save policy'}</button></div></div></article>})}</div></section><section className="app-panel"><div className="panel-head"><div><h3>Governance boundary</h3><p>Use Models for verification, qualification, promotion, deployment and rollback.</p></div><BrainCircuit/></div><div className="intel-callout"><ShieldCheck/><div><b>No implicit activation</b><p>Missing numerical models never fall back to LLM-generated numbers. Reviewer output never authorizes a side effect. Policy enablement does not qualify a model.</p></div></div><button onClick={()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Models'}))}>Open Models administration</button></section></div>
   <div className="intel-grid two"><section className="app-panel"><div className="panel-head"><div><h3>Activation proposal</h3><p>Create an immutable proposal for separate approval. This screen never executes an advertising/provider side effect.</p></div><ShieldCheck/></div><div className="intel-row"><label>Task<select value={activationDraft.task} onChange={e=>setActivationDraft(x=>({...x,task:e.target.value}))}>{registry.map((item:any)=><option key={item.task} value={item.task}>{item.task}</option>)}</select></label><label>Proposal type<input value={activationDraft.proposalType} onChange={e=>setActivationDraft(x=>({...x,proposalType:e.target.value}))}/></label><label>Provider adapter<input value={activationDraft.providerAdapter} onChange={e=>setActivationDraft(x=>({...x,providerAdapter:e.target.value}))}/></label><label>Expiry minutes<input type="number" min="1" max="1440" value={activationDraft.expiresMinutes} onChange={e=>setActivationDraft(x=>({...x,expiresMinutes:Number(e.target.value)}))}/></label></div><label className="intel-field">Payload JSON<textarea value={activationDraft.payload} onChange={e=>setActivationDraft(x=>({...x,payload:e.target.value}))}/></label><label className="intel-field">Evidence refs JSON<textarea value={activationDraft.evidenceRefs} onChange={e=>setActivationDraft(x=>({...x,evidenceRefs:e.target.value}))}/></label><button className="app-primary" disabled={busy==='activation-create'} onClick={()=>void createActivationProposal()}>{busy==='activation-create'?'Creating…':'Create governed activation proposal'}</button></section><section className="app-panel"><div className="panel-head"><div><h3>Pending activation approvals</h3><p>Creator/approver separation, proposal hash integrity, expiry and model freshness are checked server-side.</p></div><ShieldCheck/></div><div className="intel-list">{activationProposals.length?activationProposals.map((item:any)=><article key={item.id}><div><b>{item.proposal_type||item.proposalType} · {item.task||'task'}</b><small>{item.status} · expires {new Date(item.expires_at||item.expiresAt).toLocaleString()}</small></div>{item.status==='pending_approval'&&<div className="intel-actions"><button disabled={busy==='activation:approve:'+item.id} onClick={()=>void decideActivationProposal(item.id,'approve')}>Approve</button><button disabled={busy==='activation:reject:'+item.id} onClick={()=>void decideActivationProposal(item.id,'reject')}>Reject</button></div>}</article>):<EmptyState title="No activation proposals" description="High-risk AI recommendations remain non-executable until an immutable proposal is separately approved."/>}</div></section></div></>}
  </>}
 </>
}
