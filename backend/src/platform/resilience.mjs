const now=()=>Date.now()

export class CircuitOpenError extends Error{
  constructor(name,retryAfterMs){
    super(name+' circuit is open')
    this.name='CircuitOpenError'
    this.code='circuit_open'
    this.retryable=true
    this.unknownOutcome=false
    this.retryAfterMs=Math.max(0,Number(retryAfterMs)||0)
  }
}

export class BulkheadRejectedError extends Error{
  constructor(name,limit){
    super(name+' concurrency bulkhead is full')
    this.name='BulkheadRejectedError'
    this.code='bulkhead_full'
    this.retryable=true
    this.unknownOutcome=false
    this.limit=limit
  }
}

export const createCircuitBreaker=({
  name='dependency',
  failureThreshold=5,
  resetAfterMs=30_000,
  halfOpenSuccesses=2
}={})=>{
  const threshold=Math.max(1,Number(failureThreshold)||5)
  const resetMs=Math.max(250,Number(resetAfterMs)||30_000)
  const requiredSuccesses=Math.max(1,Number(halfOpenSuccesses)||2)
  let state='closed'
  let failures=0
  let openedAt=0
  let halfOpenSuccessCount=0
  let probeInFlight=false

  const transitionForTime=()=>{
    if(state==='open'&&now()-openedAt>=resetMs){
      state='half_open'
      probeInFlight=false
      halfOpenSuccessCount=0
    }
  }

  const before=()=>{
    transitionForTime()
    if(state==='open')throw new CircuitOpenError(name,resetMs-(now()-openedAt))
    if(state==='half_open'){
      if(probeInFlight)throw new CircuitOpenError(name,resetMs)
      probeInFlight=true
    }
  }

  const success=()=>{
    if(state==='half_open'){
      probeInFlight=false
      halfOpenSuccessCount+=1
      if(halfOpenSuccessCount>=requiredSuccesses){
        state='closed'
        failures=0
        openedAt=0
        halfOpenSuccessCount=0
      }
      return
    }
    failures=0
  }

  const failure=()=>{
    if(state==='half_open'){
      probeInFlight=false
      state='open'
      openedAt=now()
      failures=threshold
      halfOpenSuccessCount=0
      return
    }
    failures+=1
    if(failures>=threshold){
      state='open'
      openedAt=now()
    }
  }

  return {
    before,
    success,
    failure,
    snapshot:()=>{
      transitionForTime()
      return {
        name,
        state,
        failures,
        failureThreshold:threshold,
        resetAfterMs:resetMs,
        retryAfterMs:state==='open'?Math.max(0,resetMs-(now()-openedAt)):0,
        halfOpenSuccessCount
      }
    }
  }
}

export const createBulkhead=({name='dependency',limit=25}={})=>{
  const max=Math.max(1,Number(limit)||25)
  let active=0
  const acquire=()=>{
    if(active>=max)throw new BulkheadRejectedError(name,max)
    active+=1
    let released=false
    return ()=>{
      if(released)return
      released=true
      active=Math.max(0,active-1)
    }
  }
  return {acquire,snapshot:()=>({name,active,limit:max,available:Math.max(0,max-active)})}
}

const transientStatus=status=>[408,425,429,500,502,503,504].includes(Number(status))

export const isRetryableFailure=error=>{
  if(!error)return false
  if(error.unknownOutcome===true)return false
  if(error.retryable===true)return true
  if(transientStatus(error.status))return true
  return ['ECONNRESET','ECONNREFUSED','EAI_AGAIN','ETIMEDOUT'].includes(String(error.code||''))
}

export const withRetryBudget=async(operation,{
  attempts=1,
  baseDelayMs=100,
  maxDelayMs=1_000,
  signal,
  shouldRetry=isRetryableFailure
}={})=>{
  const maxAttempts=Math.max(1,Math.min(5,Number(attempts)||1))
  let lastError
  for(let attempt=1;attempt<=maxAttempts;attempt+=1){
    if(signal?.aborted)throw signal.reason instanceof Error?signal.reason:Object.assign(new Error('operation aborted'),{name:'AbortError'})
    try{return await operation({attempt,signal})}
    catch(error){
      lastError=error
      if(attempt>=maxAttempts||!shouldRetry(error))throw error
      const exponential=Math.min(Number(maxDelayMs)||1000,(Number(baseDelayMs)||100)*2**(attempt-1))
      const jitter=Math.floor(Math.random()*Math.max(1,Math.floor(exponential*0.2)))
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(resolve,exponential+jitter)
        const abort=()=>{
          clearTimeout(timer)
          reject(signal?.reason instanceof Error?signal.reason:Object.assign(new Error('operation aborted'),{name:'AbortError'}))
        }
        if(signal)signal.addEventListener('abort',abort,{once:true})
      })
    }
  }
  throw lastError
}

export const createDependencyGuard=({
  name,
  concurrency=25,
  failureThreshold=5,
  resetAfterMs=30_000,
  halfOpenSuccesses=2
}={})=>{
  const circuit=createCircuitBreaker({name,failureThreshold,resetAfterMs,halfOpenSuccesses})
  const bulkhead=createBulkhead({name,limit:concurrency})

  const execute=async operation=>{
    circuit.before()
    let release
    try{
      release=bulkhead.acquire()
      const result=await operation()
      circuit.success()
      return result
    }catch(error){
      if(!(error instanceof BulkheadRejectedError)&&!(error instanceof CircuitOpenError))circuit.failure()
      throw error
    }finally{
      release?.()
    }
  }

  return {
    execute,
    snapshot:()=>({circuit:circuit.snapshot(),bulkhead:bulkhead.snapshot()})
  }
}
