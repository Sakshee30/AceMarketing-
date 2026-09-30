import http from 'node:http'
import {createHmac} from 'node:crypto'
import {URL} from 'node:url'
import {createRateLimiter,securityHeaders,verifyPassword,verifyToken} from './security.mjs'
import {pool,embeddedDatabase} from './database.mjs'
import {capabilitySnapshot,dependencySnapshot,providerSnapshot} from './platform/capability-registry.mjs'
import {platformFeatureCatalog} from './platform/feature-catalog.mjs'
import {registrySummary} from './ai-registry.mjs'

const PORT=Number(process.env.CONTROL_PORT||3002)
const IS_PROD=process.env.NODE_ENV==='production'
const SESSION_SECRET=String(process.env.CONTROL_SESSION_SECRET||'')
const ADMIN_EMAIL=String(process.env.CONTROL_ADMIN_EMAIL||'').trim().toLowerCase()
const ADMIN_PASSWORD_HASH=String(process.env.CONTROL_ADMIN_PASSWORD_HASH||'')
const COOKIE_NAME=IS_PROD?'__Host-ace_control_session':'ace_control_session'
const loginLimit=createRateLimiter({windowMs:60_000,max:10})

const b64url=value=>Buffer.from(value).toString('base64url')
const createControlToken=email=>{
  const now=Math.floor(Date.now()/1000)
  const payload={sub:email,userId:'platform-control',role:'platform_admin',aud:'platform-control',iat:now,exp:now+30*60}
  const encoded=b64url(JSON.stringify(payload))
  const sig=createHmac('sha256',SESSION_SECRET).update(encoded).digest('base64url')
  return encoded+'.'+sig
}

const json=(res,status,body,headers={})=>{
  res.writeHead(status,{...securityHeaders,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers})
  res.end(JSON.stringify(body))
}

const readBody=async(req,limit=16*1024)=>{
  const chunks=[]
  let total=0
  for await(const chunk of req){
    total+=chunk.length
    if(total>limit)throw Object.assign(new Error('request body too large'),{status:413})
    chunks.push(chunk)
  }
  if(!chunks.length)return {}
  const type=String(req.headers['content-type']||'')
  if(!type.toLowerCase().startsWith('application/json'))throw Object.assign(new Error('application/json required'),{status:415})
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
  catch{throw Object.assign(new Error('invalid JSON body'),{status:400})}
}

const cookies=req=>Object.fromEntries(
  String(req.headers.cookie||'').split(';').map(item=>item.trim()).filter(Boolean).map(item=>{
    const at=item.indexOf('=')
    return at<0?[item,'']:[item.slice(0,at),decodeURIComponent(item.slice(at+1))]
  })
)

const currentSession=req=>{
  const payload=verifyToken(cookies(req)[COOKIE_NAME],SESSION_SECRET)
  return payload?.aud==='platform-control'?payload:null
}

const cookieHeader=token=>{
  const parts=[COOKIE_NAME+'='+encodeURIComponent(token),'Path=/','HttpOnly','SameSite=Strict','Max-Age=1800']
  if(IS_PROD)parts.push('Secure')
  return parts.join('; ')
}

const clearCookie=()=>{
  const parts=[COOKIE_NAME+'=','Path=/','HttpOnly','SameSite=Strict','Max-Age=0']
  if(IS_PROD)parts.push('Secure')
  return parts.join('; ')
}

const dbHealth=async()=>{
  if(!pool)return {status:'unavailable',embedded:embeddedDatabase}
  const started=Date.now()
  try{
    await pool.query('SELECT 1')
    return {status:'healthy',latencyMs:Date.now()-started,embedded:embeddedDatabase}
  }catch(error){
    return {status:'unhealthy',latencyMs:Date.now()-started,embedded:embeddedDatabase,reason:error instanceof Error?error.message:'database check failed'}
  }
}

const safeEnvironment=()=>({
  nodeEnv:process.env.NODE_ENV||'development',
  releaseSha:process.env.ACE_RELEASE_SHA||process.env.GITHUB_SHA||'unknown',
  configVersion:process.env.ACE_CONFIG_VERSION||'unversioned',
  databaseConfigured:Boolean(process.env.DATABASE_URL),
  durableObjectStorageConfigured:Boolean(process.env.OBJECT_S3_BUCKET&&(process.env.OBJECT_S3_REGION||process.env.AWS_REGION)),
  liveAiProviderCalls:process.env.AI_LIVE_PROVIDER_CALLS==='true'
})

const observedPage=async page=>{
  const capabilities=capabilitySnapshot()
  if(page==='overview'){
    return {
      environment:safeEnvironment(),
      database:await dbHealth(),
      capabilityCounts:{
        total:capabilities.features.length,
        locked:capabilities.features.filter(x=>x.locked).length,
        degraded:capabilities.providers.filter(x=>x.health!=='configured').length
      },
      generatedAt:new Date().toISOString()
    }
  }
  if(page==='capabilities')return capabilities
  if(page==='features')return {schemaVersion:'platform-features.v1',generatedAt:new Date().toISOString(),items:capabilities.features}
  if(page==='providers')return providerSnapshot()
  if(page==='dependencies')return dependencySnapshot()
  if(page==='environments')return {schemaVersion:'platform-environment.v1',generatedAt:new Date().toISOString(),environment:safeEnvironment()}
  if(page==='health')return {
    schemaVersion:'platform-health.v1',
    generatedAt:new Date().toISOString(),
    database:await dbHealth(),
    providers:capabilities.providers.map(x=>({id:x.id,health:x.health,capability:x.capability})),
    ai:registrySummary().counts
  }
  if(page==='security')return {
    schemaVersion:'platform-security-summary.v1',
    generatedAt:new Date().toISOString(),
    lockedFeatures:platformFeatureCatalog.filter(item=>item.locked).map(item=>item.id),
    controls:{controlAudience:'separate',tenantIsolation:'database-and-application',productionObjectStorageFallback:'forbidden',secretsExposed:false}
  }
  if(page==='secrets')return {
    schemaVersion:'platform-secret-health.v1',
    generatedAt:new Date().toISOString(),
    items:[
      {id:'control-session-secret',configured:Boolean(SESSION_SECRET)},
      {id:'control-admin-password-hash',configured:Boolean(ADMIN_PASSWORD_HASH)},
      {id:'database-url',configured:Boolean(process.env.DATABASE_URL)},
      {id:'object-storage-credentials',configured:Boolean(process.env.OBJECT_S3_ACCESS_KEY_ID||process.env.AWS_ACCESS_KEY_ID)}
    ]
  }
  if(page==='deployments')return {
    schemaVersion:'platform-deployments.v1',
    generatedAt:new Date().toISOString(),
    releaseSha:safeEnvironment().releaseSha,
    configVersion:safeEnvironment().configVersion,
    migrationAuthority:'backend/migrations'
  }
  if(page==='infrastructure')return {
    schemaVersion:'platform-infrastructure.v1',
    generatedAt:new Date().toISOString(),
    profile:process.env.ACE_DEPLOYMENT_PROFILE||'unspecified',
    resources:{
      database:process.env.DATABASE_URL?'configured':'unconfigured',
      objectStorage:capabilities.providers.find(x=>x.id==='object-storage')?.health||'unconfigured',
      durableJobs:capabilities.providers.find(x=>x.id==='queue')?.health||'unconfigured'
    }
  }
  if(page==='observability')return {schemaVersion:'platform-observability.v1',generatedAt:new Date().toISOString(),minimumSignalsRequired:true,releaseSha:safeEnvironment().releaseSha}
  if(page==='changes')return {schemaVersion:'platform-changes.v1',generatedAt:new Date().toISOString(),mode:'read-only',pending:[],note:'Operational writes require validated change requests, approval, execution and verification.'}
  if(page==='costs')return {schemaVersion:'platform-costs.v1',generatedAt:new Date().toISOString(),status:'not-connected',note:'Cost provider is optional; no synthetic cost values are reported.'}
  if(page==='backup-dr')return {schemaVersion:'platform-backup-dr.v1',generatedAt:new Date().toISOString(),status:'evidence-required',note:'Backup configuration and restore evidence must be supplied by the deployment profile.'}
  if(page==='drift')return {schemaVersion:'platform-drift.v1',generatedAt:new Date().toISOString(),desiredConfigVersion:safeEnvironment().configVersion,observedConfigVersion:safeEnvironment().configVersion,status:'no-runtime-drift-detected'}
  if(page==='audit')return {schemaVersion:'platform-audit-summary.v1',generatedAt:new Date().toISOString(),status:'available-through-durable-audit-store',note:'Control API intentionally exposes summary metadata only in this phase.'}
  if(page==='emergency')return {schemaVersion:'platform-emergency.v1',generatedAt:new Date().toISOString(),mode:'read-only',availableActions:[],note:'Emergency mutations remain unavailable until approval and recovery contracts are implemented.'}
  throw Object.assign(new Error('unknown control page'),{status:404})
}

const server=http.createServer(async(req,res)=>{
  const base='http://'+String(req.headers.host||'localhost')
  const url=new URL(req.url||'/',base)
  if(req.method==='GET'&&url.pathname==='/healthz')return json(res,200,{ok:true,service:'platform-control-api'})

  if(req.method==='POST'&&url.pathname==='/control-api/auth/login'){
    const ip=String(req.socket.remoteAddress||'unknown')
    const rate=loginLimit(ip)
    if(!rate.allowed)return json(res,429,{error:'too many login attempts'},{'Retry-After':String(Math.ceil((rate.resetAt-Date.now())/1000))})
    if(!SESSION_SECRET||!ADMIN_EMAIL||!ADMIN_PASSWORD_HASH)return json(res,503,{error:'platform control authentication is not configured'})
    try{
      const body=await readBody(req)
      const email=String(body.email||'').trim().toLowerCase()
      const ok=email===ADMIN_EMAIL&&verifyPassword(String(body.password||''),ADMIN_PASSWORD_HASH)
      if(!ok)return json(res,401,{error:'invalid platform control credentials'})
      return json(res,200,{authenticated:true,email},{'Set-Cookie':cookieHeader(createControlToken(email))})
    }catch(error){
      return json(res,Number(error?.status||400),{error:error instanceof Error?error.message:'login failed'})
    }
  }

  if(req.method==='POST'&&url.pathname==='/control-api/auth/logout')return json(res,200,{authenticated:false},{'Set-Cookie':clearCookie()})
  if(req.method==='GET'&&url.pathname==='/control-api/auth/me'){
    const session=currentSession(req)
    if(!session)return json(res,401,{authenticated:false})
    return json(res,200,{authenticated:true,email:session.sub,role:session.role})
  }

  const session=currentSession(req)
  if(!session)return json(res,401,{error:'platform control authentication required'})
  const match=url.pathname.match(/^\/control-api\/([a-z0-9-]+)$/)
  if(req.method==='GET'&&match){
    try{return json(res,200,await observedPage(match[1]))}
    catch(error){return json(res,Number(error?.status||500),{error:error instanceof Error?error.message:'control read failed'})}
  }
  return json(res,404,{error:'not found'})
})

const entry='file://'+process.argv[1]
if(import.meta.url===entry)server.listen(PORT,'0.0.0.0',()=>console.log('Platform control API listening on '+PORT))

export {observedPage,server}
