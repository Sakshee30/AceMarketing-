export type ProblemDetails={
  type?:string
  title:string
  status:number
  detail?:string
  instance?:string
  code?:string
  requestId?:string
  retryable:boolean
  fieldErrors?:Record<string,string[]>
}

const retryableStatus=(status:number)=>status===0||status===408||status===425||status===429||status>=500

export const normalizeProblemDetails=(input:any,statusHint=0):ProblemDetails=>{
  const status=Number(input?.status??statusHint??0)
  const title=String(input?.title||input?.error||input?.message||'Request failed')
  const detail=input?.detail?String(input.detail):undefined
  const requestId=input?.requestId||input?.request_id||input?.correlationId||undefined
  const code=input?.code?String(input.code):undefined
  return {
    ...(input?.type?{type:String(input.type)}:{}),
    title,
    status,
    ...(detail?{detail}:{}),
    ...(input?.instance?{instance:String(input.instance)}:{}),
    ...(code?{code}:{}),
    ...(requestId?{requestId:String(requestId)}:{}),
    retryable:input?.retryable===true||retryableStatus(status),
    ...(input?.fieldErrors&&typeof input.fieldErrors==='object'?{fieldErrors:input.fieldErrors}:{})
  }
}
