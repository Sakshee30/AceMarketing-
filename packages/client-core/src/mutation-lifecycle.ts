export type MutationLifecycle='IDLE'|'VALIDATING'|'SUBMITTING'|'CONFIRMED_SUCCESS'|'CONFIRMED_REJECTION'|'CONFLICT'|'OUTCOME_UNKNOWN'

export type MutationClassification={phase:MutationLifecycle;message:string;requestId?:string}

export const classifyMutationFailure=(error:any,fallback='The operation could not be completed.'):MutationClassification=>{
  const status=Number(error?.status||0)
  const cause=String(error?.details?.cause||'')
  const requestId=error?.requestId
  if(status===409)return {phase:'CONFLICT',message:error?.message||'The resource changed before this operation could be confirmed.',requestId}
  if(status===0&&(cause==='timeout'||cause==='network'))return {phase:'OUTCOME_UNKNOWN',message:'The operation outcome is unknown because confirmation was interrupted. Do not repeat the action until authoritative state is checked.',requestId}
  return {phase:'CONFIRMED_REJECTION',message:error?.message||fallback,requestId}
}
