import {api} from '../../../lib/api'

export const leadGradingApi={
  load:()=>api.leadGrading(),
  ingest:(payload:Record<string,unknown>)=>api.upsertEnrichmentLead(payload),
  override:(lead:string,grade:string)=>api.overrideLeadGrade(lead,grade),
  activate:(lead:string)=>api.activateLeadGrade(lead)
}
