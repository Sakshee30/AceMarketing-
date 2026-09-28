import {api as sharedApi} from '../../../lib/api'
export const exclusionsApi={
  exclusions:()=>sharedApi.exclusions(),
  createExclusion:(preset:string,destination:string,name?:string)=>sharedApi.createExclusion(preset,destination,name),
  syncAudience:(id:string)=>sharedApi.syncAudience(id)
}
