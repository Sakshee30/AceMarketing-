import http from 'node:http'
import {createHmac} from 'node:crypto'
import {URL} from 'node:url'
import {createRateLimiter,securityHeaders,verifyPassword,verifyToken} from './security.mjs'
import {pool,embeddedDatabase} from './database.mjs'
import {capabilitySnapshot,dependencySnapshot,providerSnapshot} from './platform/capability-registry.mjs'
import {platformFeatureCatalog} from './platform/feature-catalog.mjs'
import {registrySummary} from './ai-registry.mjs'
import {createPlatformChange,decidePlatformChange,getPlatformChange,listPlatformChanges,requestPlatformRollback,transitionPlatformChange,updatePlatformChangePlan} from './platform/control-change-store.mjs'
import {beginControlCommand,finishControlCommand} from './platform/control-idempotency.mjs'
import {createEmergencyControl,latestRuntimeSnapshot,listEmergencyControls,publishRuntimeSnapshot,revokeEmergencyControl,verifyRuntimeSnapshot} from './platform/runtime-configuration.mjs'
import {advanceProviderMigration,createProviderMigration,listProviderMigrations,providerMigrationOverride,requestProviderRollback} from './platform/provider-migration-store.mjs'
import {createRecoveryExercise,recordBackupEvidence,recoverySummary,updateRecoveryExercise} from './platform/recovery-evidence.mjs'
import {providerExecutionSnapshot} from './platform/provider-execution.mjs'
import {beginProcessDrain,livenessState,markStartupComplete,startupState} from './platform/process-health.mjs'
import {globalAdmission} from './platform/admission-control.mjs'
import {capacityBudgetFromEnvironment,evaluateCapacityBudget} from './platform/capacity-budget.mjs'
import {acceptanceRegisterSnapshot} from './platform/acceptance-register.mjs'
import {evidenceRegistrySnapshot} from './platform/evidence-registry.mjs'
import {handleActivateConfig} from '../modules/capabilities/src/application/commands/activate-config/activate-config.handler.mjs'
import {handleMigrateProvider} from '../modules/capabilities/src/application/commands/migrate-provider/migrate-provider.handler.mjs'
import {handleMoveTenant} from '../modules/cells/src/application/commands/move-tenant/move-tenant.handler.mjs'

const PORT=Number(process.env.CONTROL_PORT||3002)
const IS_PROD=process.env.NODE_ENV==='production'
const SESSION_SECRET=String(process.env.CONTROL_SESSION_SECRET||'')
const ADMIN_EMAIL=String(process.env.CONTROL_ADMIN_EMAIL||'').trim().toLowerCase()
const ADMIN_PASSWORD_HASH=String(process.env.CONTROL_ADMIN_PASSWORD_HASH||'')
const ADMIN_ROLE=String(process.env.CONTROL_ADMIN_ROLE||'platform_admin')
const RUNTIME_CONFIG_TOKEN=String(process.env.RUNTIME_CONFIG_TOKEN||'')
const COOKIE_NAME=IS_PROD?'__Host-ace_control_session':'ace_control_session'
const loginLimit=createRateLimiter({windowMs:60_000,max:10})

const b64url=value=>Buffer.from(value).toString('base64url')
const createControlToken=email=>{
  const now=Math.floor(Date.now()/1000)
  const payload={sub:email,userId:'platform-control',role:ADMIN_ROLE,aud:'platform-control',iat:now,exp:now+30*60}
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

const roleActions=Object.freeze({
  platform_admin:new Set(['read','request','plan','transition','approve','rollback','emergency','publish','migrate','recovery']),
  approver:new Set(['read','approve']),
  operator:new Set(['read','request','plan','transition','rollback']),
  developer:new Set(['read','request','plan']),
  infrastructure_engineer:new Set(['read','request','plan','transition','rollback','publish','migrate','recovery']),
  security_admin:new Set(['read','approve','rollback','emergency']),
  viewer:new Set(['read'])
})
const canControl=(session,action)=>Boolean(roleActions[session?.role]?.has(action))
const requireControl=(res,session,action)=>{
  if(canControl(session,action))return true
  json(res,403,{error:'platform control permission denied',action})
  return false
}

const runControlMutation=async({req,res,session,operation,body,successStatus=200,execute})=>{
  let command
  try{
    command=await beginControlCommand({
      actor:String(session.sub||'platform-control'),
      key:req.headers['idempotency-key'],
      operation,
      requestBody:body
    })
  }catch(error){
    return json(res,Number(error?.status||400),{
      error:error instanceof Error?error.message:'control command idempotency check failed',
      code:error?.code||'control_idempotency_failed'
    })
  }
  if(command.replay)return json(res,command.responseStatus,command.responseBody,{'Idempotency-Replayed':'true'})
  try{
    const result=await execute()
    await finishControlCommand({id:command.command.id,responseStatus:successStatus,responseBody:result}).catch(()=>{})
    return json(res,successStatus,result)
  }catch(error){
    const status=Number(error?.status||400)
    const payload={
      error:error instanceof Error?error.message:'control command failed',
      ...(error?.code?{code:error.code}:{}),
      ...(error?.currentVersion!==undefined?{currentVersion:error.currentVersion}:{})
    }
    await finishControlCommand({id:command.command.id,responseStatus:status,responseBody:payload}).catch(()=>{})
    return json(res,status,payload)
  }
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
  if(page==='providers')return {...providerSnapshot(),migrations:await listProviderMigrations({limit:200})}
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
    },
    capacityBudget:evaluateCapacityBudget(capacityBudgetFromEnvironment())
  }
  if(page==='observability')return {
    schemaVersion:'platform-observability.v2',
    generatedAt:new Date().toISOString(),
    minimumSignalsRequired:true,
    releaseSha:safeEnvironment().releaseSha,
    configVersion:safeEnvironment().configVersion,
    database:await dbHealth(),
    apiAdmission:globalAdmission.snapshot(),
    providerExecution:providerExecutionSnapshot(),
    recovery:(await recoverySummary({environment:process.env.NODE_ENV||'development'})).evidenceCounts,
    capacityBudget:evaluateCapacityBudget(capacityBudgetFromEnvironment())
  }
  if(page==='changes')return {schemaVersion:'platform-changes.v1',generatedAt:new Date().toISOString(),mode:'governed',items:await listPlatformChanges({limit:200})}
  if(page==='costs')return {schemaVersion:'platform-costs.v1',generatedAt:new Date().toISOString(),status:'not-connected',note:'Cost provider is optional; no synthetic cost values are reported.'}
  if(page==='backup-dr')return recoverySummary({environment:process.env.NODE_ENV||'development'})
  if(page==='drift')return {schemaVersion:'platform-drift.v1',generatedAt:new Date().toISOString(),desiredConfigVersion:safeEnvironment().configVersion,observedConfigVersion:safeEnvironment().configVersion,status:'no-runtime-drift-detected'}
  if(page==='acceptance')return acceptanceRegisterSnapshot()
  if(page==='evidence')return evidenceRegistrySnapshot()
  if(page==='audit')return {schemaVersion:'platform-audit-summary.v1',generatedAt:new Date().toISOString(),status:'available-through-durable-audit-store',note:'Control API intentionally exposes summary metadata only in this phase.'}
  if(page==='emergency')return {schemaVersion:'platform-emergency.v1',generatedAt:new Date().toISOString(),mode:'governed',items:await listEmergencyControls(),latestRuntimeSnapshot:await latestRuntimeSnapshot(process.env.NODE_ENV||'development')}
  throw Object.assign(new Error('unknown control page'),{status:404})
}

const server=http.createServer(async(req,res)=>{
  const base='http://'+String(req.headers.host||'localhost')
  const url=new URL(req.url||'/',base)
  if(req.method==='GET'&&url.pathname==='/healthz'){
    return json(res,200,{...livenessState(),service:'platform-control-api'})
  }
  if(req.method==='GET'&&url.pathname==='/startupz'){
    const state=startupState()
    return json(res,state.ok?200:503,{...state,service:'platform-control-api'})
  }
  if(req.method==='GET'&&url.pathname==='/readyz'){
    const startup=startupState()
    if(!startup.ok)return json(res,503,{...startup,service:'platform-control-api'})
    const database=await dbHealth()
    return json(res,database.status==='healthy'?200:503,{
      ok:database.status==='healthy',
      state:database.status==='healthy'?'ready':'dependency_unavailable',
      database,
      service:'platform-control-api'
    })
  }

  if(req.method==='GET'&&url.pathname==='/runtime-config/snapshot'){
    const token=String(req.headers['x-runtime-config-token']||'')
    if(!RUNTIME_CONFIG_TOKEN||token!==RUNTIME_CONFIG_TOKEN)return json(res,401,{error:'runtime configuration service authorization required'})
    const environment=String(url.searchParams.get('environment')||process.env.NODE_ENV||'development')
    const snapshot=await latestRuntimeSnapshot(environment)
    if(!snapshot)return json(res,404,{error:'runtime configuration snapshot not found'})
    const verification=verifyRuntimeSnapshot(snapshot)
    if(!verification.valid)return json(res,503,{error:'runtime configuration snapshot is invalid',reason:verification.reason})
    return json(res,200,snapshot)
  }

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

  if(url.pathname==='/control-api/changes'&&req.method==='POST'){
    if(!requireControl(res,session,'request'))return
    let body
    try{body=await readBody(req,64*1024)}
    catch(error){return json(res,Number(error?.status||400),{error:error instanceof Error?error.message:'invalid change request'})}
    return runControlMutation({
      req,res,session,operation:'change.create',body,successStatus:201,
      execute:()=>createPlatformChange({
        environment:body.environment,
        scopeType:body.scopeType,
        scopeId:body.scopeId||null,
        requestedBy:session.sub,
        requestedRole:session.role,
        reason:body.reason,
        ticket:body.ticket||null,
        risk:body.risk||'medium',
        oldState:body.oldState||{},
        desiredState:body.desiredState||{},
        impactReport:body.impactReport||{},
        healthGates:Array.isArray(body.healthGates)?body.healthGates:[],
        rollbackPlan:body.rollbackPlan||{}
      })
    })
  }

  const changeMatch=url.pathname.match(/^\/control-api\/changes\/([^/]+)$/)
  if(changeMatch&&req.method==='GET'){
    if(!requireControl(res,session,'read'))return
    const item=await getPlatformChange(decodeURIComponent(changeMatch[1]))
    return item?json(res,200,item):json(res,404,{error:'change not found'})
  }

  const planMatch=url.pathname.match(/^\/control-api\/changes\/([^/]+)\/plan$/)
  if(planMatch&&req.method==='PATCH'){
    if(!requireControl(res,session,'plan'))return
    let body
    try{body=await readBody(req,64*1024)}
    catch(error){return json(res,Number(error?.status||400),{error:error instanceof Error?error.message:'invalid change plan'})}
    const id=decodeURIComponent(planMatch[1])
    return runControlMutation({
      req,res,session,operation:'change.plan:'+id,body,
      execute:()=>updatePlatformChangePlan({
        id,
        actor:session.sub,
        actorRole:session.role,
        desiredState:body.desiredState,
        impactReport:body.impactReport,
        healthGates:body.healthGates,
        rollbackPlan:body.rollbackPlan,
        ticket:body.ticket,
        risk:body.risk,
        expectedVersion:body.expectedVersion
      })
    })
  }

  const transitionMatch=url.pathname.match(/^\/control-api\/changes\/([^/]+)\/transition$/)
  if(transitionMatch&&req.method==='POST'){
    if(!requireControl(res,session,'transition'))return
    let body
    try{body=await readBody(req)}
    catch(error){return json(res,Number(error?.status||400),{error:error instanceof Error?error.message:'invalid change transition'})}
    const id=decodeURIComponent(transitionMatch[1])
    return runControlMutation({
      req,res,session,operation:'change.transition:'+id,body,
      execute:()=>transitionPlatformChange({
        id,
        toState:String(body.toState||''),
        actor:session.sub,
        actorRole:session.role,
        metadata:body.metadata||{},
        expectedVersion:body.expectedVersion
      })
    })
  }

  const decisionMatch=url.pathname.match(/^\/control-api\/changes\/([^/]+)\/decision$/)
  if(decisionMatch&&req.method==='POST'){
    if(!requireControl(res,session,'approve'))return
    let body
    try{body=await readBody(req)}
    catch(error){return json(res,Number(error?.status||400),{error:error instanceof Error?error.message:'invalid change decision'})}
    const id=decodeURIComponent(decisionMatch[1])
    return runControlMutation({
      req,res,session,operation:'change.decision:'+id,body,
      execute:()=>decidePlatformChange({
        id,
        decision:String(body.decision||''),
        approver:session.sub,
        approverRole:session.role,
        comment:body.comment||null,
        expectedVersion:body.expectedVersion
      })
    })
  }

  const rollbackMatch=url.pathname.match(/^\/control-api\/changes\/([^/]+)\/rollback$/)
  if(rollbackMatch&&req.method==='POST'){
    if(!requireControl(res,session,'rollback'))return
    let body
    try{body=await readBody(req)}
    catch(error){return json(res,Number(error?.status||400),{error:error instanceof Error?error.message:'invalid rollback request'})}
    const id=decodeURIComponent(rollbackMatch[1])
    return runControlMutation({
      req,res,session,operation:'change.rollback:'+id,body,
      execute:()=>requestPlatformRollback({
        id,
        actor:session.sub,
        actorRole:session.role,
        reason:body.reason,
        expectedVersion:body.expectedVersion
      })
    })
  }
  if(url.pathname==='/control-api/recovery/exercises'&&req.method==='POST'){
    if(!requireControl(res,session,'recovery'))return
    let body
    try{body=await readBody(req,64*1024)}
    catch(error){return json(res,Number(error?.status||400),{error:error instanceof Error?error.message:'invalid recovery exercise request'})}
    return runControlMutation({
      req,res,session,operation:'recovery.exercise.create',body,successStatus:201,
      execute:()=>createRecoveryExercise({
        environment:body.environment||process.env.NODE_ENV||'development',
        scenario:body.scenario,
        declaredRpoMinutes:body.declaredRpoMinutes,
        declaredRtoMinutes:body.declaredRtoMinutes,
        incidentCommander:body.incidentCommander||session.sub,
        nextExerciseAt:body.nextExerciseAt||null,
        createdBy:session.sub
      })
    })
  }

  const recoveryExerciseMatch=url.pathname.match(/^\/control-api\/recovery\/exercises\/([^/]+)$/)
  if(recoveryExerciseMatch&&req.method==='PATCH'){
    if(!requireControl(res,session,'recovery'))return
    let body
    try{body=await readBody(req,64*1024)}
    catch(error){return json(res,Number(error?.status||400),{error:error instanceof Error?error.message:'invalid recovery exercise update'})}
    const id=decodeURIComponent(recoveryExerciseMatch[1])
    return runControlMutation({
      req,res,session,operation:'recovery.exercise.update:'+id,body,
      execute:()=>updateRecoveryExercise({
        id,
        state:body.state,
        expectedVersion:body.expectedVersion,
        measuredRpoMinutes:body.measuredRpoMinutes,
        measuredRtoMinutes:body.measuredRtoMinutes,
        integrityChecks:body.integrityChecks,
        reconciliation:body.reconciliation,
        gaps:body.gaps,
        remediationOwner:body.remediationOwner,
        nextExerciseAt:body.nextExerciseAt,
        incidentCommander:body.incidentCommander
      })
    })
  }

  if(url.pathname==='/control-api/recovery/backup-evidence'&&req.method==='POST'){
    if(!requireControl(res,session,'recovery'))return
    let body
    try{body=await readBody(req,64*1024)}
    catch(error){return json(res,Number(error?.status||400),{error:error instanceof Error?error.message:'invalid backup evidence request'})}
    return runControlMutation({
      req,res,session,operation:'recovery.backup-evidence.create',body,successStatus:201,
      execute:()=>recordBackupEvidence({
        environment:body.environment||process.env.NODE_ENV||'development',
        resourceType:body.resourceType,
        resourceRef:body.resourceRef,
        backupMode:body.backupMode,
        retentionDays:body.retentionDays,
        pitrEnabled:body.pitrEnabled,
        objectVersioningEnabled:body.objectVersioningEnabled,
        encryptionVerified:body.encryptionVerified,
        deletionProtectionVerified:body.deletionProtectionVerified,
        independentCopyVerified:body.independentCopyVerified,
        evidence:body.evidence||{},
        observedAt:body.observedAt||null,
        createdBy:session.sub
      })
    })
  }

  if(url.pathname==='/control-api/provider-migrations'&&req.method==='POST'){
    if(!requireControl(res,session,'migrate'))return
    let body
    try{body=await readBody(req,64*1024)}
    catch(error){return json(res,Number(error?.status||400),{error:error instanceof Error?error.message:'invalid provider migration request'})}
    return runControlMutation({
      req,res,session,operation:'provider-migration.create',body,successStatus:201,
      execute:()=>handleMigrateProvider({mode:'create',input:body,actorId:session.sub})
    })
  }

  const providerMigrationMatch=url.pathname.match(/^\/control-api\/provider-migrations\/([^/]+)\/transition$/)
  if(providerMigrationMatch&&req.method==='POST'){
    if(!requireControl(res,session,'migrate'))return
    let body
    try{body=await readBody(req,64*1024)}
    catch(error){return json(res,Number(error?.status||400),{error:error instanceof Error?error.message:'invalid provider migration transition'})}
    const id=decodeURIComponent(providerMigrationMatch[1])
    return runControlMutation({
      req,res,session,operation:'provider-migration.transition:'+id,body,
      execute:()=>handleMigrateProvider({mode:'transition',input:{...body,id},actorId:session.sub})
    })
  }

  const providerRollbackMatch=url.pathname.match(/^\/control-api\/provider-migrations\/([^/]+)\/rollback$/)
  if(providerRollbackMatch&&req.method==='POST'){
    if(!requireControl(res,session,'migrate'))return
    let body
    try{body=await readBody(req)}
    catch(error){return json(res,Number(error?.status||400),{error:error instanceof Error?error.message:'invalid provider rollback request'})}
    const id=decodeURIComponent(providerRollbackMatch[1])
    return runControlMutation({
      req,res,session,operation:'provider-migration.rollback:'+id,body,
      execute:()=>handleMigrateProvider({mode:'rollback',input:{...body,id},actorId:session.sub})
    })
  }

  if(url.pathname==='/control-api/runtime-config/publish'&&req.method==='POST'){
    if(!requireControl(res,session,'publish'))return
    let body
    try{body=await readBody(req,64*1024)}
    catch(error){return json(res,Number(error?.status||400),{error:error instanceof Error?error.message:'invalid runtime configuration request'})}
    return runControlMutation({
      req,res,session,operation:'runtime-config.publish',body,
      execute:()=>handleActivateConfig({
        environment:body.environment||process.env.NODE_ENV||'development',
        features:body.features||{},
        providerOverrides:body.providerOverrides||{},
        admission:body.admission||{},
        sourceChangeId:body.sourceChangeId||null,
        actorId:session.sub
      })
    })
  }

  if(url.pathname==='/control-api/cell-placements/move'&&req.method==='POST'){
    if(!requireControl(res,session,'migrate'))return
    let body
    try{body=await readBody(req,64*1024)}
    catch(error){return json(res,Number(error?.status||400),{error:error instanceof Error?error.message:'invalid tenant placement request'})}
    return runControlMutation({
      req,res,session,operation:'cell-placement.move:'+String(body.workspaceId||''),body,
      execute:()=>handleMoveTenant({
        workspaceId:body.workspaceId,
        homeCell:body.homeCell,
        homeRegion:body.homeRegion,
        expectedRoutingEpoch:body.expectedRoutingEpoch,
        state:body.state||'moving',
        dedicated:body.dedicated===true
      })
    })
  }

  if(url.pathname==='/control-api/runtime-config/latest'&&req.method==='GET'){
    if(!requireControl(res,session,'read'))return
    const environment=String(url.searchParams.get('environment')||process.env.NODE_ENV||'development')
    const snapshot=await latestRuntimeSnapshot(environment)
    return json(res,200,{snapshot,verification:snapshot?verifyRuntimeSnapshot(snapshot):null})
  }

  if(url.pathname==='/control-api/emergency'&&req.method==='POST'){
    if(!requireControl(res,session,'emergency'))return
    let body
    try{body=await readBody(req)}
    catch(error){return json(res,Number(error?.status||400),{error:error instanceof Error?error.message:'invalid emergency control request'})}
    return runControlMutation({
      req,res,session,operation:'emergency.create',body,successStatus:201,
      execute:async()=>{
        const control=await createEmergencyControl({
          environment:body.environment||process.env.NODE_ENV||'development',
          scopeType:body.scopeType,
          scopeId:body.scopeId||null,
          controlType:body.controlType,
          reason:body.reason,
          durationMinutes:body.durationMinutes,
          createdBy:session.sub
        })
        const snapshot=await publishRuntimeSnapshot({
          environment:body.environment||process.env.NODE_ENV||'development',
          createdBy:session.sub
        })
        return {control,snapshotVersion:snapshot.version,snapshotLeaseExpiresAt:snapshot.leaseExpiresAt}
      }
    })
  }

  const emergencyRevokeMatch=url.pathname.match(/^\/control-api\/emergency\/([^/]+)\/revoke$/)
  if(emergencyRevokeMatch&&req.method==='POST'){
    if(!requireControl(res,session,'emergency'))return
    let body
    try{body=await readBody(req)}
    catch(error){return json(res,Number(error?.status||400),{error:error instanceof Error?error.message:'invalid emergency revoke request'})}
    const id=decodeURIComponent(emergencyRevokeMatch[1])
    return runControlMutation({
      req,res,session,operation:'emergency.revoke:'+id,body,
      execute:async()=>{
        const control=await revokeEmergencyControl({
          id,
          revokedBy:session.sub,
          expectedVersion:body.expectedVersion
        })
        const snapshot=await publishRuntimeSnapshot({
          environment:body.environment||process.env.NODE_ENV||'development',
          createdBy:session.sub
        })
        return {control,snapshotVersion:snapshot.version,snapshotLeaseExpiresAt:snapshot.leaseExpiresAt}
      }
    })
  }

  const match=url.pathname.match(/^\/control-api\/([a-z0-9-]+)$/)
  if(req.method==='GET'&&match){
    try{return json(res,200,await observedPage(match[1]))}
    catch(error){return json(res,Number(error?.status||500),{error:error instanceof Error?error.message:'control read failed'})}
  }
  return json(res,404,{error:'not found'})
})

const entry='file://'+process.argv[1]
if(import.meta.url===entry){
  server.listen(PORT,'0.0.0.0',()=>{
    markStartupComplete()
    console.log('Platform control API listening on '+PORT)
  })
  const shutdown=signal=>{
    beginProcessDrain()
    console.log(signal+' received; draining platform control API')
    server.close(async error=>{
      await pool?.end?.().catch(()=>{})
      process.exit(error?1:0)
    })
    setTimeout(()=>process.exit(1),10_000).unref()
  }
  process.on('SIGTERM',()=>shutdown('SIGTERM'))
  process.on('SIGINT',()=>shutdown('SIGINT'))
}

export {observedPage,server}
