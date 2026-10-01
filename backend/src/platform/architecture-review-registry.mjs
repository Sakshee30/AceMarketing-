import {platformModuleRegistry} from './module-registry.mjs'

const threatModel='docs/threat-models/BACKEND_FOUNDATION.md'
const migrationReview='docs/architecture/MIGRATION_REVIEW.md'

const sensitiveModules=new Set([
  'identity','organizations','memberships','authorization','entitlements','integrations','webhooks',
  'billing','documents','audit','capabilities','cells','ai'
])

export const architectureReviewRegistry=Object.freeze(platformModuleRegistry.map(module=>Object.freeze({
  moduleId:module.id,
  owner:module.owner,
  migrations:Object.freeze([...module.migrations]),
  migrationReview:module.migrations.length?migrationReview:null,
  trustBoundary:sensitiveModules.has(module.id),
  threatModel:sensitiveModules.has(module.id)?threatModel:null
})))

export const validateArchitectureReviewRegistry=()=>{
  const known=new Set(platformModuleRegistry.map(item=>item.id))
  const seen=new Set()
  for(const item of architectureReviewRegistry){
    if(!known.has(item.moduleId))throw new Error('architecture review references unknown module: '+item.moduleId)
    if(seen.has(item.moduleId))throw new Error('duplicate architecture review module: '+item.moduleId)
    seen.add(item.moduleId)
    if(item.migrations.length&&!item.migrationReview)throw new Error('migration review missing: '+item.moduleId)
    if(item.trustBoundary&&!item.threatModel)throw new Error('threat model missing: '+item.moduleId)
  }
  for(const id of known)if(!seen.has(id))throw new Error('module missing architecture review metadata: '+id)
  return true
}
