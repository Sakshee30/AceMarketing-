import {latestRuntimeSnapshot,evaluateRuntimeControl,verifyRuntimeSnapshot} from './runtime-configuration.mjs'

const cache=new Map()
const CACHE_MS=Math.max(500,Math.min(30_000,Number(process.env.RUNTIME_CONFIG_CACHE_MS||5_000)))
const environment=()=>String(process.env.ACE_RUNTIME_ENVIRONMENT||process.env.NODE_ENV||'development')

const loadSnapshot=async()=>{
  const env=environment()
  const existing=cache.get(env)
  if(existing&&Date.now()-existing.loadedAt<CACHE_MS)return existing.snapshot
  const snapshot=await latestRuntimeSnapshot(env)
  cache.set(env,{loadedAt:Date.now(),snapshot})
  return snapshot
}

export const invalidateRuntimeConfigurationCache=()=>cache.clear()

export const runtimeControlDecision=async({featureId,scopeType='workspace',scopeId=null,operation='execute'})=>{
  const snapshot=await loadSnapshot()
  if(!snapshot){
    return {
      allowed:true,
      state:'enabled',
      code:null,
      reason:null,
      configurationVersion:null,
      source:'baseline'
    }
  }
  const verified=verifyRuntimeSnapshot(snapshot)
  if(!verified.valid){
    return {
      allowed:false,
      state:'degraded',
      code:'runtime_config_invalid',
      reason:verified.reason,
      configurationVersion:snapshot.version,
      source:'snapshot'
    }
  }
  const decision=evaluateRuntimeControl({snapshot,featureId,scopeType,scopeId,operation})
  return {...decision,configurationVersion:snapshot.version,source:'snapshot'}
}

export const runtimeGuardForRequest=async({method,path,workspaceId})=>{
  const verb=String(method||'GET').toUpperCase()
  const mutating=['POST','PUT','PATCH','DELETE'].includes(verb)
  if(!mutating)return {allowed:true,state:'enabled',code:null,reason:null,configurationVersion:null,source:'read'}

  let featureId='workspaces'
  let operation='write'
  if(path.startsWith('/api/ai/')){
    featureId='ai'
    operation='admit'
  }else if(path.startsWith('/api/files/')){
    featureId='files'
    operation=path==='/api/files/upload-intents'?'admit':'write'
  }else if(
    path.includes('/integrations')||
    path.includes('/connectors')||
    path.includes('/signal-deliveries')||
    path.includes('/audiences/sync')||
    path.includes('/whatsapp/messages')
  ){
    featureId='integrations'
    operation='admit'
  }

  return runtimeControlDecision({
    featureId,
    scopeType:'workspace',
    scopeId:workspaceId,
    operation
  })
}
