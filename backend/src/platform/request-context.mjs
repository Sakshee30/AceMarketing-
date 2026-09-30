import {randomUUID} from 'node:crypto'

const safeId=(value,max=160)=>{
  const text=String(value||'').trim()
  if(!text||text.length>max||!/^[A-Za-z0-9._:@/-]+$/.test(text))return null
  return text
}

export const requestDeadlineMs=()=>Math.max(250,Math.min(30_000,Number(process.env.REQUEST_DEADLINE_MS||2000)))

export const createRequestContext=({req,actor=null,workspaceId=null,tenantId=null,deadlineMs=requestDeadlineMs()}={})=>{
  const incoming=safeId(req?.headers?.['x-request-id'])
  const requestId=incoming||randomUUID()
  const traceId=safeId(req?.headers?.['x-trace-id'])||requestId
  const startedAt=Date.now()
  const deadlineAt=startedAt+deadlineMs
  const releaseVersion=safeId(process.env.ACE_RELEASE_SHA||process.env.GITHUB_SHA||'unknown')||'unknown'
  const configurationVersion=safeId(process.env.ACE_CONFIG_VERSION||'unversioned')||'unversioned'
  const service=safeId(process.env.ACE_SERVICE_NAME||'api')||'api'
  const environment=safeId(process.env.ACE_RUNTIME_ENVIRONMENT||process.env.NODE_ENV||'development')||'development'
  const region=safeId(process.env.AWS_REGION||process.env.ACE_REGION||'local')||'local'
  const cell=safeId(process.env.ACE_CELL_ID||'default')||'default'
  return Object.freeze({
    requestId,
    traceId,
    releaseVersion,
    configurationVersion,
    service,
    environment,
    region,
    cell,
    startedAt,
    deadlineAt,
    deadlineMs,
    actorId:actor?.userId||actor?.sub||null,
    actorType:actor?.service?'service':'user',
    sessionId:actor?.jti||null,
    role:actor?.role||null,
    workspaceId:workspaceId||actor?.workspaceId||null,
    tenantId:tenantId||workspaceId||actor?.workspaceId||null
  })
}

export const remainingRequestBudget=context=>Math.max(0,Number(context?.deadlineAt||0)-Date.now())

export const assertRequestBudget=(context,minimumMs=1)=>{
  const remaining=remainingRequestBudget(context)
  if(remaining<minimumMs){
    const error=new Error('request deadline exhausted')
    error.code='request_deadline_exhausted'
    error.status=503
    throw error
  }
  return remaining
}

export const bindActorToRequestContext=(context,{actor=null,workspaceId=null,tenantId=null}={})=>Object.freeze({
  ...context,
  actorId:actor?.userId||actor?.sub||context?.actorId||null,
  actorType:actor?.service?'service':(actor?'user':context?.actorType||'user'),
  sessionId:actor?.jti||context?.sessionId||null,
  role:actor?.role||context?.role||null,
  workspaceId:workspaceId||actor?.workspaceId||context?.workspaceId||null,
  tenantId:tenantId||workspaceId||actor?.workspaceId||context?.tenantId||null
})
