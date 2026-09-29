import {api as sharedApi} from '../../../lib/api'

export type ModelReadiness='disabled'|'unconfigured'|'unavailable'|'insufficient_data'|'untrained'|'evaluating'|'shadow'|'approved'|'active'|'degraded'|'retired'|'ready'

export type ModelGovernance={
  task?:string
  provider?:string
  requestedModel?:string
  resolvedModel?:string|null
  readiness?:ModelReadiness
  evaluationStatus?:string
  documentationVerified?:boolean
  accessVerified?:boolean
  warnings?:string[]
}

export type ModelCatalogItem={
  id?:string
  name:string
  version:string
  status:string
  type:string
  metric?:string
  value?:string|number|null
  description?:string
  builtIn?:boolean
  weights?:Record<string,number>
  lastRunAt?:string
  lastAverageScore?:number
  lastRowsScored?:number
  runnable?:boolean
  blockedReason?:string|null
  governance?:ModelGovernance
}

export type ModelRun={
  id:string
  kind?:string
  name:string
  modelId?:string|null
  status:string
  rowsScored?:number
  averageScore?:number
  scoreMin?:number
  scoreMax?:number
  startedAt?:string
  completedAt?:string
}

export type ModelsResponse={
  items:ModelCatalogItem[]
  runs:ModelRun[]
}

export type ModelValidation={
  name?:string|null
  runs:ModelRun[]
  leadPopulation:number
  averageLeadScore:number
  generatedAt?:string
  notice?:string
  evaluationStatus?:string
  evaluationReference?:string|null
  warnings?:string[]
}

export type AiRegistryEntry={
  task:string
  kind:string
  provider:string
  requestedModel:string
  resolvedModel?:string|null
  readiness?:ModelReadiness|string
  configurationStatus?:string
  implementationStatus?:string
  trainingStatus?:string
  evaluationStatus?:string
  approvalStatus?:string
  deploymentStatus?:string
  documentationVerified?:boolean
  accessVerified?:boolean
  artifactRevision?:string|null
  artifactHash?:string|null
  rollbackPredecessor?:string|null
  evaluationReference?:string|null
  promotedBy?:string|null
  promotedAt?:string|null
  warnings?:string[]
}

export type AiRegistryResponse={
  schemaVersion?:string
  generatedAt?:string
  liveProviderCallsEnabled?:boolean
  counts?:Record<string,number>
  items?:AiRegistryEntry[]
  tenantItems?:AiRegistryEntry[]
  persistence?:string
}

export type AiEvaluation={
  id:string
  task:string
  model_ref?:string
  dataset_ref?:string|null
  metrics?:Record<string,unknown>
  thresholds?:Record<string,unknown>
  sample_size?:number|null
  qualified?:boolean|null
  status:string
  warnings?:string[]
  policy_version?:string|null
  qualification_details?:Record<string,unknown>
  created_at?:string
  completed_at?:string|null
}

export type AiEvaluationPolicy={
  workspace_id?:string
  task:string
  version:string
  thresholds:Record<string,unknown>
  notes?:string|null
  active?:boolean
  created_by?:string|null
  created_at?:string
}

export const modelsApi={
  list:(options?:{signal?:AbortSignal})=>sharedApi.models(options) as Promise<ModelsResponse>,
  create:(payload:Record<string,unknown>)=>sharedApi.createModel(payload) as Promise<{item:ModelCatalogItem}>,
  validation:(name:string,options?:{signal?:AbortSignal})=>sharedApi.modelValidation(name,options) as Promise<ModelValidation>,
  run:(name:string)=>sharedApi.runModel(name) as Promise<ModelRun>,
  governance:(options?:{signal?:AbortSignal})=>sharedApi.aiRegistry(options) as Promise<AiRegistryResponse>,
  verifyAccess:(task:string)=>sharedApi.verifyAiProviderAccess(task) as Promise<{task:string;provider:string;requestedModel:string;resolvedModel?:string|null;accessVerified:boolean;note?:string}>,
  evaluations:(task?:string,options?:{signal?:AbortSignal})=>sharedApi.aiEvaluations(task,options) as Promise<{items:AiEvaluation[];task?:string|null;generatedAt?:string}>,
  policy:(task:string,options?:{signal?:AbortSignal})=>sharedApi.aiEvaluationPolicy(task,options) as Promise<{item:AiEvaluationPolicy|null;task:string}>,
  savePolicy:(payload:{task:string;version:string;thresholds:Record<string,unknown>;notes?:string})=>sharedApi.saveAiEvaluationPolicy(payload) as Promise<{item:AiEvaluationPolicy}>,
  qualify:(evaluationId:string)=>sharedApi.qualifyAiEvaluation(evaluationId) as Promise<{item:AiEvaluation}>,
  promote:(task:string,evaluationId:string)=>sharedApi.promoteAiModel(task,evaluationId) as Promise<{item:Record<string,unknown>}>,
  deploy:(task:string)=>sharedApi.deployAiModel(task) as Promise<{item:Record<string,unknown>}>,
  undeploy:(task:string)=>sharedApi.undeployAiModel(task) as Promise<{item:Record<string,unknown>}>,
  rollback:(task:string)=>sharedApi.rollbackAiModel(task) as Promise<{item:Record<string,unknown>}>
}
