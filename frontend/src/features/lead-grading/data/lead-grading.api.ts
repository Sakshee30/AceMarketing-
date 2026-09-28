import {api} from '../../../lib/api'

export const leadGradingApi={
  load:()=>api.leadGrading(),
  override:(lead:string,grade:string)=>api.overrideLeadGrade(lead,grade),
  activate:(lead:string)=>api.activateLeadGrade(lead)
}
