import {api as sharedApi} from '../../../lib/api'
export const adjustmentsApi={
  adjustments:()=>sharedApi.adjustments(),
  createAdjustment:(payload:Record<string,unknown>)=>sharedApi.createAdjustment(payload),
  applyAdjustment:(id:string)=>sharedApi.applyAdjustment(id),
  previewAdjustment:(id:string)=>sharedApi.previewAdjustment(id)
}
