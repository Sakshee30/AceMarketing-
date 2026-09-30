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
  const timer=setTimeout(()=>controller.abort('provider_deadline_exceeded'),Math.max(250,Number(timeoutMs)||8000))
  try{
    return await operation(controller.signal)
  }catch(error){
    if(controller.signal.aborted&&!signal?.aborted)throw new ProviderTimeoutError(provider,Math.max(250,Number(timeoutMs)||8000))
    throw error
  }finally{
    clearTimeout(timer)
    signal?.removeEventListener('abort',relay)
  }
}
