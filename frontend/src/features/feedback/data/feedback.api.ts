import {api} from '../../../lib/api'

export const feedbackApi={
  load:()=>api.feedback(),
  journeys:()=>api.journeys(),
  record:(payload:Record<string,unknown>)=>api.recordFeedback(payload),
  request:(payload:Record<string,unknown>)=>api.requestFeedback(payload),
  route:(id:string)=>api.routeFeedback(id)
}
