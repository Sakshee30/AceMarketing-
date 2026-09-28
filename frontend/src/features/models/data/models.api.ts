import {api as sharedApi} from '../../../lib/api'

export const modelsApi={
  list:()=>sharedApi.models(),
  create:(payload:Record<string,unknown>)=>sharedApi.createModel(payload),
  validation:(name:string)=>sharedApi.modelValidation(name),
  run:(name:string)=>sharedApi.runModel(name)
}
