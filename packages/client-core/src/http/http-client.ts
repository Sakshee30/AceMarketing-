import {getSessionToken} from '../session-authority'
import {normalizeProblemDetails,type ProblemDetails} from './problem-details'

export class ClientHttpError extends Error{
  status:number
  problem:ProblemDetails
  requestId?:string
  constructor(problem:ProblemDetails){
    super(problem.detail||problem.title)
    this.name='ClientHttpError'
    this.status=problem.status
    this.problem=problem
    this.requestId=problem.requestId
  }
}

type HttpOptions={
  signal?:AbortSignal
  headers?:Record<string,string>
  timeoutMs?:number
  auth?:boolean
}

const withTimeout=(signal:AbortSignal|undefined,timeoutMs:number)=>{
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort('http_deadline_exceeded'),timeoutMs)
  const relay=()=>controller.abort(signal?.reason||'aborted')
  if(signal){
    if(signal.aborted)relay()
    else signal.addEventListener('abort',relay,{once:true})
  }
  return {
    signal:controller.signal,
    dispose:()=>{
      clearTimeout(timer)
      signal?.removeEventListener('abort',relay)
    }
  }
}

export const createHttpClient=(baseUrl='')=>{
  const request=async<T>(method:string,path:string,body?:unknown,options:HttpOptions={}):Promise<T>=>{
    const timeout=withTimeout(options.signal,Math.max(1000,options.timeoutMs||12_000))
    const token=options.auth===false?null:getSessionToken()
    const headers:Record<string,string>={
      Accept:'application/json',
      ...(body!==undefined?{'Content-Type':'application/json'}:{}),
      ...(token?{Authorization:'Bearer '+token}:{}),
      ...(options.headers||{})
    }
    try{
      const response=await fetch(baseUrl+path,{
        method,
        headers,
        body:body===undefined?undefined:JSON.stringify(body),
        signal:timeout.signal,
        credentials:'same-origin'
      })
      const requestId=response.headers.get('x-request-id')||undefined
      const contentType=response.headers.get('content-type')||''
      const payload=contentType.includes('application/json')?await response.json().catch(()=>null):await response.text().catch(()=>'')
      if(!response.ok){
        const problem=normalizeProblemDetails(
          payload&&typeof payload==='object'?{...payload,requestId:payload.requestId||requestId}:{title:String(payload||response.statusText),requestId},
          response.status
        )
        throw new ClientHttpError(problem)
      }
      return payload as T
    }catch(error:any){
      if(error instanceof ClientHttpError)throw error
      if(error?.name==='AbortError'||timeout.signal.aborted){
        throw new ClientHttpError(normalizeProblemDetails({title:'Request deadline exceeded',detail:'The request did not complete before its deadline.',code:'request_timeout'},0))
      }
      throw new ClientHttpError(normalizeProblemDetails({title:'Network request failed',detail:error?.message||'The network request could not be completed.',code:'network_error'},0))
    }finally{
      timeout.dispose()
    }
  }
  return {
    get:<T>(path:string,options?:HttpOptions)=>request<T>('GET',path,undefined,options),
    post:<T>(path:string,body?:unknown,options?:HttpOptions)=>request<T>('POST',path,body,options),
    put:<T>(path:string,body?:unknown,options?:HttpOptions)=>request<T>('PUT',path,body,options),
    patch:<T>(path:string,body?:unknown,options?:HttpOptions)=>request<T>('PATCH',path,body,options),
    delete:<T>(path:string,options?:HttpOptions)=>request<T>('DELETE',path,undefined,options)
  }
}
