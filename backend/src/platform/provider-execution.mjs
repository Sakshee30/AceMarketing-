import {createDependencyGuard} from './resilience.mjs'

const guards=new Map()

const guardFor=provider=>{
  const key=String(provider||'provider')
  if(!guards.has(key)){
    guards.set(key,createDependencyGuard({
      name:key,
      concurrency:Number(process.env.PROVIDER_MAX_CONCURRENCY||25),
      failureThreshold:Number(process.env.PROVIDER_CIRCUIT_FAILURE_THRESHOLD||5),
      resetAfterMs:Number(process.env.PROVIDER_CIRCUIT_RESET_MS||30_000),
      halfOpenSuccesses:Number(process.env.PROVIDER_CIRCUIT_HALF_OPEN_SUCCESSES||2)
    }))
  }
  return guards.get(key)
}

export class ProviderTimeoutError extends Error{
  constructor(provider,timeoutMs){
    super(provider+' request exceeded '+timeoutMs+'ms')
    this.name='ProviderTimeoutError'
    this.code='provider_timeout'
    this.provider=provider
    this.timeoutMs=timeoutMs
    this.retryable=true
    this.unknownOutcome=true
  }
}

export const withProviderDeadline=async(provider,operation,{timeoutMs=8000,signal}={})=>{
  const controller=new AbortController()
  const relay=()=>controller.abort(signal?.reason||'upstream_cancelled')
  if(signal){
    if(signal.aborted)relay()
    else signal.addEventListener('abort',relay,{once:true})
  }
  const boundedTimeout=Math.max(250,Number(timeoutMs)||8000)
  const timer=setTimeout(()=>controller.abort('provider_deadline_exceeded'),boundedTimeout)
  try{
    return await guardFor(provider).execute(()=>operation(controller.signal))
  }catch(error){
    if(controller.signal.aborted&&!signal?.aborted)throw new ProviderTimeoutError(provider,boundedTimeout)
    throw error
  }finally{
    clearTimeout(timer)
    signal?.removeEventListener('abort',relay)
  }
}

export const providerExecutionSnapshot=()=>Array.from(guards.entries()).map(([provider,guard])=>({
  provider,
  ...guard.snapshot()
}))

export const resetProviderExecutionGuards=()=>guards.clear()
