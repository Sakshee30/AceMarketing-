const liveCallsEnabled=()=>process.env.AI_LIVE_PROVIDER_CALLS==='true'

const credentialConfigured=provider=>{
  if(provider==='openai') return Boolean(process.env.OPENAI_API_KEY)
  if(provider==='anthropic') return Boolean(process.env.ANTHROPIC_API_KEY)
  if(provider==='google') return Boolean(process.env.GOOGLE_AI_API_KEY)
  if(provider==='voyage') return Boolean(process.env.VOYAGE_API_KEY)
  if(provider==='nvidia') return Boolean(process.env.NVIDIA_API_KEY)
  return true
}

// An operator may serve the grounded analyst from an OpenAI-compatible endpoint (NVIDIA NIM)
// by setting AI_ANALYST_PROVIDER=nvidia and NVIDIA_MODEL. It is an explicit choice, never a fallback.
const analystRoute=()=>process.env.AI_ANALYST_PROVIDER==='nvidia'&&String(process.env.NVIDIA_MODEL||'').trim()
  ?['nvidia',String(process.env.NVIDIA_MODEL).trim()]
  :['openai','gpt-6-astra']

const providerDocs={
  openai:{
    identifierVerified:true,
    capabilityVerified:true,
    verifiedAt:'2026-09-29',
    source:'https://developers.openai.com/api/docs/models/gpt-6-astra',
    note:'gpt-6-astra is listed in official OpenAI API material; Responses-based execution is implemented. Account access remains separately unverified.'
  },
  anthropic:{
    identifierVerified:false,
    capabilityVerified:false,
    verifiedAt:'2026-09-29',
    source:'https://docs.anthropic.com/en/docs/about-claude/model-deprecations',
    note:'Official Anthropic documentation currently lists claude-fable-5, but the exact requested claude-fable-5-1 identifier was not verified. Silent substitution is forbidden, so this route remains unavailable until the exact identifier and capability are documented.'
  },
  google:{
    identifierVerified:true,
    capabilityVerified:true,
    verifiedAt:'2026-09-29',
    source:'https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash',
    note:'Requested Gemini identifiers are present in official documentation. Transcription requires Files + Interactions; live voice requires Live API transport. Account access is verified separately.'
  },
  voyage:{
    identifierVerified:true,
    capabilityVerified:true,
    verifiedAt:'2026-09-29',
    source:'https://docs.voyageai.com/docs/embeddings; https://docs.voyageai.com/reference/reranker-api',
    note:'voyage-4-large and rerank-2.5 plus their REST endpoints are present in official Voyage documentation; live account access is verified separately.'
  },
  nvidia:{
    identifierVerified:true,
    capabilityVerified:true,
    verifiedAt:'2026-10-07',
    source:'https://docs.api.nvidia.com/nim/reference/llm-apis',
    note:'Operator-configured model served through the NVIDIA OpenAI-compatible chat-completions API. The access verification step confirms the exact identifier against the endpoint model list before the route can be used.'
  },
  local_ml:{
    identifierVerified:true,
    // Deployment of locally fitted models stays blocked unless an operator confirms the
    // installed ML service runs these estimators (set after its capabilities are verified).
    capabilityVerified:process.env.AI_LOCAL_ML_CAPABILITY_VERIFIED==='true',
    verifiedAt:'2026-09-28',
    source:'repository-requested assignment',
    note:'Estimator/checkpoint assignment is recorded. Training/evaluation artifacts must exist before serving.'
  },
  deterministic:{
    identifierVerified:true,
    capabilityVerified:true,
    verifiedAt:'2026-09-28',
    source:'AceMarketing repository',
    note:'Existing deterministic workspace analytics remain an explicitly labelled baseline.'
  }
}

const hosted=(task,provider,requestedModel,capability,extra={})=>({
  task,
  kind:'hosted_model',
  provider,
  requestedModel,
  resolvedModel:null,
  capability,
  schemaVersion:'ai-registry.v1',
  implementationStatus:'implemented',
  trainingStatus:'not_applicable',
  evaluationStatus:'not_evaluated',
  approvalStatus:'not_approved',
  deploymentStatus:'not_deployed',
  dataClassifications:extra.dataClassifications||['workspace_analytics'],
  permittedRegions:extra.permittedRegions||[],
  fallbackPolicy:'none',
  ...extra
})

const fitted=(task,requestedModel,capability,extra={})=>({
  task,
  kind:extra.kind||'fitted_estimator',
  provider:'local_ml',
  requestedModel,
  resolvedModel:null,
  capability,
  schemaVersion:'ai-registry.v1',
  implementationStatus:'contract_implemented',
  trainingStatus:'untrained',
  evaluationStatus:'not_evaluated',
  approvalStatus:'not_approved',
  deploymentStatus:'not_deployed',
  dataClassifications:extra.dataClassifications||['workspace_features'],
  permittedRegions:extra.permittedRegions||[],
  fallbackPolicy:'none',
  ...extra
})

export const MODEL_ASSIGNMENTS=[
  hosted('analyst',...analystRoute(),'grounded_analysis'),
  hosted('recommendation_reviewer','anthropic','claude-fable-5-1','recommendation_review'),
  hosted('multimodal_extraction','google','gemini-3.8-flash','multimodal_extraction'),
  hosted('embedding','voyage','voyage-4-large','embedding'),
  hosted('reranking','voyage','rerank-2.5','reranking'),
  hosted('call_transcription','google','gemini-3.5-transcribe','transcription',{dataClassifications:['call_audio','transcript']}),
  hosted('live_voice','google','gemini-3.8-live-extended-thinking','live_voice',{dataClassifications:['live_audio','workspace_analytics']}),
  hosted('creative_image','google','gemini-3-pro-image','image_generation',{dataClassifications:['brand_assets','creative_prompt']}),
  fitted('lead_qualification','catboost.CatBoostClassifier','classification',{target:'qualification'}),
  fitted('paid_conversion','catboost.CatBoostClassifier','classification',{target:'paid_conversion'}),
  fitted('customer_churn','catboost.CatBoostClassifier','classification',{target:'customer_churn'}),
  fitted('future_customer_value','catboost.CatBoostRegressor','regression',{target:'future_customer_value'}),
  fitted('forecast_primary','amazon/chronos-2','forecasting',{kind:'pretrained_checkpoint',library:'chronos-forecasting'}),
  fitted('forecast_challenger','catboost.CatBoostRegressor','forecasting',{target:'lagged_forecast'}),
  {
    task:'forecast_baseline',
    kind:'deterministic_baseline',
    provider:'deterministic',
    requestedModel:'seasonal_naive',
    resolvedModel:'seasonal_naive',
    capability:'forecasting',
    schemaVersion:'ai-registry.v1',
    implementationStatus:'implemented',
    trainingStatus:'not_applicable',
    evaluationStatus:'baseline_pending_dataset',
    approvalStatus:'baseline',
    deploymentStatus:'available',
    dataClassifications:['workspace_metrics'],
    permittedRegions:[],
    fallbackPolicy:'explicit_baseline_only'
  },
  fitted('marketing_mix','meridian.model.model.Meridian','marketing_mix'),
  fitted('incrementality','econml.dml.CausalForestDML','causal_estimation'),
  fitted('anomaly_detection','sklearn.ensemble.IsolationForest','anomaly_detection'),
  fitted('behavioral_segments','sklearn.cluster.HDBSCAN','segmentation'),
  fitted('offer_ranking','lightgbm.LGBMRanker','ranking'),
  fitted('probability_calibration','sklearn.calibration.CalibratedClassifierCV','calibration',{kind:'calibration_component'})
]

const lifecycleFor=entry=>{
  const docs=providerDocs[entry.provider]||providerDocs.local_ml
  if(entry.kind==='deterministic_baseline') return 'active'
  if(entry.provider==='local_ml'){
    if(entry.trainingStatus!=='trained') return 'untrained'
    if(entry.evaluationStatus!=='qualified') return 'evaluating'
    if(entry.approvalStatus!=='approved') return 'shadow'
    return entry.deploymentStatus==='deployed'?'active':'approved'
  }
  if(!docs.identifierVerified||!docs.capabilityVerified) return 'unavailable'
  if(!credentialConfigured(entry.provider)) return 'unconfigured'
  if(!liveCallsEnabled()) return 'disabled'
  if(entry.evaluationStatus!=='qualified') return 'evaluating'
  if(entry.approvalStatus!=='approved') return 'shadow'
  return entry.deploymentStatus==='deployed'?'active':'approved'
}

export const modelRegistrySnapshot=()=>MODEL_ASSIGNMENTS.map(entry=>{
  const docs=providerDocs[entry.provider]||providerDocs.local_ml
  const credentialsConfigured=credentialConfigured(entry.provider)
  const readiness=lifecycleFor(entry)
  const warnings=[]
  if(!docs.identifierVerified) warnings.push('Requested model identifier is not verified in official provider documentation.')
  if(docs.identifierVerified&&!docs.capabilityVerified) warnings.push('Exact endpoint/capability verification is incomplete; activation remains blocked.')
  if(entry.kind==='hosted_model'&&!credentialsConfigured) warnings.push('Provider credential is not configured.')
  if(entry.kind==='hosted_model'&&!liveCallsEnabled()) warnings.push('Live provider execution is disabled by AI_LIVE_PROVIDER_CALLS.')
  if(entry.provider==='local_ml'&&entry.trainingStatus!=='trained') warnings.push('No trained tenant-scoped artifact is registered.')
  return {
    ...entry,
    readiness,
    documentationVerified:Boolean(docs.identifierVerified&&docs.capabilityVerified),
    identifierVerified:Boolean(docs.identifierVerified),
    capabilityVerified:Boolean(docs.capabilityVerified),
    documentationSource:docs.source,
    documentationVerifiedAt:docs.verifiedAt,
    documentationNote:docs.note,
    credentialConfigured:entry.provider==='local_ml'||entry.provider==='deterministic'?null:credentialsConfigured,
    accessVerified:false,
    liveExecutionEnabled:entry.kind==='hosted_model'?liveCallsEnabled():false,
    warnings
  }
})

export const modelRegistryItem=task=>modelRegistrySnapshot().find(entry=>entry.task===task)||null

export const modelCatalogItems=()=>modelRegistrySnapshot().map(entry=>({
  id:'registry_'+entry.task,
  name:entry.task.replaceAll('_',' '),
  version:entry.resolvedModel||entry.requestedModel,
  status:entry.readiness,
  type:entry.kind==='hosted_model'?'Hosted AI':entry.kind==='deterministic_baseline'?'Deterministic baseline':'Specialist model',
  metric:entry.capability,
  value:null,
  description:'Requested '+entry.task+' route. Serving readiness is separated from implementation, evaluation, approval and deployment evidence.',
  builtIn:true,
  runnable:false,
  blockedReason:entry.readiness==='active'?'Use the task-specific execution endpoint; generic scoring is intentionally disabled.':(entry.warnings[0]||'Route is not active.'),
  governance:{
    task:entry.task,
    provider:entry.provider,
    requestedModel:entry.requestedModel,
    resolvedModel:entry.resolvedModel,
    readiness:entry.readiness,
    evaluationStatus:entry.evaluationStatus,
    documentationVerified:entry.documentationVerified,
    accessVerified:entry.accessVerified,
    warnings:entry.warnings
  }
}))

export const registrySummary=()=>{
  const items=modelRegistrySnapshot()
  const counts={}
  for(const item of items) counts[item.readiness]=(counts[item.readiness]||0)+1
  return {
    schemaVersion:'ai-registry.v1',
    generatedAt:new Date().toISOString(),
    liveProviderCallsEnabled:liveCallsEnabled(),
    counts,
    items
  }
}
