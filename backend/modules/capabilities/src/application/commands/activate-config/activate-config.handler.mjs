import {publishRuntimeSnapshot} from '../../../../../../src/platform/runtime-configuration.mjs'

export const handleActivateConfig=async({
  environment,
  features={},
  providerOverrides={},
  admission={},
  sourceChangeId=null,
  actorId,
  publish=publishRuntimeSnapshot
})=>{
  const env=String(environment||process.env.NODE_ENV||'development').trim()
  const actor=String(actorId||'').trim()
  if(!env)throw Object.assign(new Error('runtime environment required'),{status:400,code:'runtime_environment_required'})
  if(!actor)throw Object.assign(new Error('runtime configuration actor required'),{status:400,code:'runtime_actor_required'})
  return publish({
    environment:env,
    features:features&&typeof features==='object'&&!Array.isArray(features)?features:{},
    providerOverrides:providerOverrides&&typeof providerOverrides==='object'&&!Array.isArray(providerOverrides)?providerOverrides:{},
    admission:admission&&typeof admission==='object'&&!Array.isArray(admission)?admission:{},
    sourceChangeId:sourceChangeId||null,
    createdBy:actor
  })
}
