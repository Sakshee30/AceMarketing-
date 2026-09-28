export type MutationPhase='IDLE'|'VALIDATING'|'SUBMITTING'|'CONFIRMED_SUCCESS'|'CONFIRMED_REJECTION'|'CONFLICT'|'OUTCOME_UNKNOWN'

export type MutationLifecycle<T=unknown>={
  phase:MutationPhase
  operationId:string|null
  result:T|null
  message:string
  correlationId:string|null
}

export type MutationClassification={phase:MutationPhase;message:string;requestId?:string}

export const createOperationId=()=>globalThis.crypto?.randomUUID?.()||('op_'+Date.now()+'_'+Math.random().toString(36).slice(2))

export const initialMutationLifecycle=<T=unknown>():MutationLifecycle<T>=>({
  phase:'IDLE',
  operationId:null,
  result:null,
  message:'',
  correlationId:null
})

export const classifyMutationFailure=(error:any,fallback='The operation could not be completed.'):MutationClassification=>{
  const status=Number(error?.status||0)
  const cause=String(error?.details?.cause||'')
  const requestId=error?.requestId
  if(status===409)return {phase:'CONFLICT',message:error?.message||'The resource changed before this operation could be confirmed.',requestId}
  if(status===0&&(cause==='timeout'||cause==='network'))return {phase:'OUTCOME_UNKNOWN',message:'The operation outcome is unknown because confirmation was interrupted. Do not repeat the action until authoritative state is checked.',requestId}
  return {phase:'CONFIRMED_REJECTION',message:error?.message||fallback,requestId}
}

export const mutationLifecycle={
  validating:<T>(current:MutationLifecycle<T>):MutationLifecycle<T>=>({...current,phase:'VALIDATING',message:''}),
  submitting:<T>(current:MutationLifecycle<T>,operationId=current.operationId||createOperationId()):MutationLifecycle<T>=>({...current,phase:'SUBMITTING',operationId,message:''}),
  confirmed:<T>(current:MutationLifecycle<T>,result:T,correlationId:string|null=null):MutationLifecycle<T>=>({...current,phase:'CONFIRMED_SUCCESS',result,correlationId,message:''}),
  rejected:<T>(current:MutationLifecycle<T>,message:string,correlationId:string|null=null):MutationLifecycle<T>=>({...current,phase:'CONFIRMED_REJECTION',correlationId,message}),
  conflict:<T>(current:MutationLifecycle<T>,message:string,correlationId:string|null=null):MutationLifecycle<T>=>({...current,phase:'CONFLICT',correlationId,message}),
  unknown:<T>(current:MutationLifecycle<T>,message:string,correlationId:string|null=null):MutationLifecycle<T>=>({...current,phase:'OUTCOME_UNKNOWN',correlationId,message}),
  reset:<T>():MutationLifecycle<T>=>initialMutationLifecycle<T>()
}
