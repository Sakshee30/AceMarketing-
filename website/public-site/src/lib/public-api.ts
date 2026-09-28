import {getPublicRuntimeConfig} from '../../../../packages/client-core/src/runtime-config'

export class PublicApiError extends Error{
  status:number
  requestId:string
  details:any
  constructor(message:string,status:number,requestId:string,details:any){
    super(message)
    this.name='PublicApiError'
    this.status=status
    this.requestId=requestId
    this.details=details
  }
}

type PublicRequestInit=RequestInit&{timeoutMs?:number}

const maxPublicWriteBodyBytes=16*1024
const activePublicWrites=new Set<string>()

const request=async<T>(path:string,init?:PublicRequestInit):Promise<T>=>{
  const runtime=getPublicRuntimeConfig()
  const method=(init?.method||'GET').toUpperCase()
  const controller=new AbortController()
  const timeoutMs=Math.max(1000,Number(init?.timeoutMs||(method==='GET'?runtime.requestTimeouts.readMs:runtime.requestTimeouts.writeMs)))
  const requestId=globalThis.crypto?.randomUUID?.()||('ace_public_'+Date.now()+'_'+Math.random().toString(36).slice(2))
  const isWrite=method!=='GET'&&method!=='HEAD'
  const bodyBytes=typeof init?.body==='string'?new TextEncoder().encode(init.body).byteLength:0
  if(isWrite&&bodyBytes>maxPublicWriteBodyBytes){
    throw new PublicApiError('Please shorten the form before submitting.',400,requestId,{cause:'client_payload_limit'})
  }
  if(isWrite&&activePublicWrites.has(path)){
    throw new PublicApiError('This form is already being submitted. Please wait for confirmation.',409,requestId,{cause:'duplicate_in_flight'})
  }
  if(isWrite)activePublicWrites.add(path)
  const timer=window.setTimeout(()=>controller.abort('request_deadline_exceeded'),timeoutMs)
  try{
    const {timeoutMs:_timeoutMs,...fetchInit}=init||{}
    const response=await fetch(runtime.apiBasePath+path,{
      ...fetchInit,
      signal:controller.signal,
      credentials:'same-origin',
      headers:{
        'Content-Type':'application/json',
        'X-Ace-Client-Request-ID':requestId,
        ...(init?.headers||{})
      }
    })
    const responseId=response.headers.get('x-request-id')||requestId
    if(response.status===204)return undefined as T
    const raw=await response.text()
    let payload:any=null
    if(raw){try{payload=JSON.parse(raw)}catch{payload={message:'The public service returned an unreadable response.'}}}
    if(!response.ok){
      const safeMessage=response.status===429
        ?'Too many requests. Please wait a moment and try again.'
        :response.status>=500
          ?'The service is temporarily unavailable. Please try again.'
          :(payload?.error||payload?.message||'The request could not be completed.')
      throw new PublicApiError(safeMessage,response.status,responseId,{status:response.status})
    }
    return payload as T
  }catch(error:any){
    if(error instanceof PublicApiError)throw error
    const timedOut=controller.signal.aborted
    throw new PublicApiError(
      timedOut?'The request timed out before the service confirmed an outcome.':'The service could not be reached. Please check your connection and try again.',
      0,
      requestId,
      {cause:timedOut?'timeout':'network'}
    )
  }finally{
    window.clearTimeout(timer)
    if(isWrite)activePublicWrites.delete(path)
  }
}

export const publicApi={
  publicNavigation:()=>request<any>('/public/navigation'),
  publicIndustries:()=>request<any>('/public/industries'),
  publicAgents:()=>request<any>('/public/agents'),
  publicIntegrations:()=>request<any>('/public/integrations'),
  publicChallenges:()=>request<any>('/public/challenges'),
  publicCaseStudies:()=>request<any>('/public/case-studies'),
  publicResources:()=>request<any>('/public/resources'),
  publicResourceCenter:()=>request<any>('/public/resource-center'),
  pricingRecommendation:(payload:Record<string,unknown>)=>request<{recommended:string[]}>('/pricing/recommend',{method:'POST',body:JSON.stringify(payload)}),
  submitQuote:(payload:Record<string,unknown>)=>request<{id:string;status:string}>('/pricing/quote',{method:'POST',body:JSON.stringify(payload)}),
  submitDemo:(payload:Record<string,unknown>)=>request<{id:string;status:string}>('/demo-requests',{method:'POST',body:JSON.stringify(payload)}),
  confirmDemoBooking:(payload:{demoRequestId:string;startsAt:string})=>request<{id:string;status:string;startsAt:string;durationMinutes:number}>('/demo-bookings',{method:'POST',body:JSON.stringify(payload)}),
  submitPublicConnectorRequest:(payload:Record<string,unknown>)=>request<{id:string;status:string;connector:string}>('/public/connector-requests',{method:'POST',body:JSON.stringify(payload)}),
  saveConsent:(prefs:Record<string,boolean>)=>request<{saved?:boolean}>('/consent-preferences',{method:'POST',body:JSON.stringify(prefs)})
}
