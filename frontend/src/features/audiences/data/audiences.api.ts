import {api as sharedApi} from '../../../lib/api'

export const audiencesApi={
  audiences:()=>sharedApi.audiences(),
  previewAudience:(payload:any)=>sharedApi.previewAudience(payload),
  syncAudience:(id:string)=>sharedApi.syncAudience(id),
  saveAudienceSchedule:(id:string,cadence:string,enabled:boolean)=>sharedApi.saveAudienceSchedule(id,cadence,enabled),
  createAudience:(payload:any)=>sharedApi.createAudience(payload)
}
