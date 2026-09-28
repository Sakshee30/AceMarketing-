export type MutationPhase =
  | 'IDLE'
  | 'VALIDATING'
  | 'SUBMITTING'
  | 'CONFIRMED_SUCCESS'
  | 'CONFIRMED_REJECTION'
  | 'CONFLICT'
  | 'OUTCOME_UNKNOWN'

export type MutationLifecycle<T=unknown> = {
  phase:MutationPhase
  operationId:string|null
  result:T|null
  message:string
  correlationId:string|null
}

export const initialMutationLifecycle=<T=unknown>():MutationLifecycle<T>=>({
  phase:'IDLE',
  operationId:null,
  result:null,
  message:'',
  correlationId:null
})

export const createOperationId=()=>globalThis.crypto?.randomUUID?.()||(
  'op_'+Date.now()+'_'+Math.random().toString(36).slice(2)
)

export const mutationLifecycle={
  validating:<T>(current:MutationLifecycle<T>):MutationLifecycle<T>=>({
    ...current,
    phase:'VALIDATING',
    message:''
  }),
  submitting:<T>(current:MutationLifecycle<T>,operationId=current.operationId||createOperationId()):MutationLifecycle<T>=>({
    ...current,
    phase:'SUBMITTING',
    operationId,
    message:''
  }),
  confirmed:<T>(current:MutationLifecycle<T>,result:T,correlationId:string|null=null):MutationLifecycle<T>=>({
    ...current,
    phase:'CONFIRMED_SUCCESS',
    result,
    correlationId,
    message:''
  }),
  rejected:<T>(current:MutationLifecycle<T>,message:string,correlationId:string|null=null):MutationLifecycle<T>=>({
    ...current,
    phase:'CONFIRMED_REJECTION',
    correlationId,
    message
  }),
  conflict:<T>(current:MutationLifecycle<T>,message:string,correlationId:string|null=null):MutationLifecycle<T>=>({
    ...current,
    phase:'CONFLICT',
    correlationId,
    message
  }),
  unknown:<T>(current:MutationLifecycle<T>,message:string,correlationId:string|null=null):MutationLifecycle<T>=>({
    ...current,
    phase:'OUTCOME_UNKNOWN',
    correlationId,
    message
  }),
  reset:<T>():MutationLifecycle<T>=>initialMutationLifecycle<T>()
}
