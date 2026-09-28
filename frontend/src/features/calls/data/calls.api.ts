import {api} from '../../../lib/api'

export const callsApi={
  qualification:()=>api.qualificationCalls(),
  events:()=>api.callEvents(),
  retry:(id:string)=>api.retryQualificationCall(id),
  createMeeting:(payload:Record<string,unknown>)=>api.createMeeting(payload),
  createQualification:(payload:Record<string,unknown>)=>api.createQualificationCall(payload)
}
