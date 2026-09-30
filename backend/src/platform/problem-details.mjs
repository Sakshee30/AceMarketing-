const defaultType='about:blank'

export const problemDetails=({
  status=500,
  title='Request failed',
  detail='',
  code='request_failed',
  requestId=null,
  instance=null,
  retryable=null,
  fieldErrors=null,
  type=defaultType
}={})=>({
  type,
  title:String(title),
  status:Number(status),
  ...(detail?{detail:String(detail)}:{}),
  ...(code?{code:String(code)}:{}),
  ...(requestId?{requestId:String(requestId)}:{}),
  ...(instance?{instance:String(instance)}:{}),
  retryable:retryable??([408,425,429].includes(Number(status))||Number(status)>=500),
  ...(fieldErrors&&typeof fieldErrors==='object'?{fieldErrors}:{})
})

export const writeProblem=(res,problem)=>{
  const body=problemDetails(problem)
  res.statusCode=body.status
  res.setHeader('Content-Type','application/problem+json; charset=utf-8')
  if(body.requestId)res.setHeader('X-Request-Id',body.requestId)
  res.end(JSON.stringify(body))
}
