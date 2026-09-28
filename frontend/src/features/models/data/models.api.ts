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

export const modelsApi={
  list:(options?:{signal?:AbortSignal})=>sharedApi.models(options) as Promise<ModelsResponse>,
  create:(payload:Record<string,unknown>)=>sharedApi.createModel(payload) as Promise<{item:ModelCatalogItem}>,
  validation:(name:string,options?:{signal?:AbortSignal})=>sharedApi.modelValidation(name,options) as Promise<ModelValidation>,
  run:(name:string)=>sharedApi.runModel(name) as Promise<ModelRun>
}
