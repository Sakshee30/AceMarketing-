export type QueryFailureLike={status?:number;details?:{cause?:string}}

export type QueryPolicy={
  staleTime:number
  gcTime:number
  retry:(failureCount:number,error:QueryFailureLike)=>boolean
  retryDelay:(attempt:number)=>number
}

const noRetryStatuses=new Set([400,401,403,404,409,410,422])

export const shouldRetryBoundedRead=(failureCount:number,error:QueryFailureLike)=>{
  if(failureCount>=2)return false
  const status=Number(error?.status||0)
  if(noRetryStatuses.has(status))return false
  return status===0||status===408||status===425||status===429||status>=500
}

export const boundedRetryDelay=(attempt:number)=>{
  const base=Math.min(2000,250*Math.pow(2,Math.max(0,attempt)))
  const jitter=Math.floor(Math.random()*100)
  return base+jitter
}

export const queryPolicies={
  session:{
    staleTime:15_000,
    gcTime:5*60_000,
    retry:(failureCount:number,error:QueryFailureLike)=>failureCount<1&&shouldRetryBoundedRead(failureCount,error),
    retryDelay:boundedRetryDelay
  } satisfies QueryPolicy,
  workspace:{
    staleTime:20_000,
    gcTime:10*60_000,
    retry:shouldRetryBoundedRead,
    retryDelay:boundedRetryDelay
  } satisfies QueryPolicy,
  reference:{
    staleTime:5*60_000,
    gcTime:30*60_000,
    retry:shouldRetryBoundedRead,
    retryDelay:boundedRetryDelay
  } satisfies QueryPolicy
}

export const queryPolicyFor=(dataClass:'session'|'workspace'|'reference')=>queryPolicies[dataClass]
