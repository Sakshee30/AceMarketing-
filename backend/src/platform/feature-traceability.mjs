import {platformFeatureCatalog,featureCatalogItem,validateFeatureCatalog} from './feature-catalog.mjs'
import {platformModuleRegistry,validateModuleRegistry} from './module-registry.mjs'
import {platformOperationRegistry,validateOperationRegistry} from './operation-registry.mjs'
import {tablesForMigrations,validatePersistenceCatalog} from './persistence-catalog.mjs'

const genericRunbook='docs/PRODUCTION_RUNBOOK.md'
const telemetry=Object.freeze(['request_count','error_count','duration_ms'])
const genericConfiguration=Object.freeze(['config/project-profile.json'])
const catalogDashboard='/control-api/catalog'

export const platformFeatureTraceability=Object.freeze(platformModuleRegistry.map(module=>{
  const feature=featureCatalogItem(module.id)
  if(!feature)throw new Error('canonical feature catalog entry missing for module: '+module.id)
  const operations=platformOperationRegistry.filter(item=>item.moduleId===module.id)
  const tables=tablesForMigrations(module.migrations)
  return Object.freeze({
    id:module.id,
    version:1,
    description:module.capabilities.join(', '),
    criticality:feature.locked===true?'platform-critical':'product-feature',
    owner:module.owner,
    permissions:Object.freeze([...module.permissions]),
    dependencies:Object.freeze([...(feature.dependsOn||[])]),
    configuration:genericConfiguration,
    contracts:Object.freeze([...module.contracts]),
    migrations:Object.freeze([...module.migrations]),
    tables,
    events:Object.freeze([...module.events]),
    eventContracts:Object.freeze([...module.events]),
    handlers:Object.freeze(operations.map(item=>item.handlerPath)),
    tests:Object.freeze([...new Set(operations.map(item=>item.testPath))]),
    endpoints:Object.freeze(operations.map(item=>Object.freeze({
      operationId:item.operationId,
      requestSchemaId:item.requestSchemaId,
      permission:item.permission
    }))),
    operations:Object.freeze(operations.map(item=>Object.freeze({
      id:item.id,
      operationId:item.operationId,
      requestSchemaId:item.requestSchemaId,
      permission:item.permission,
      contract:item.contract,
      durability:item.durability,
      audit:item.audit,
      profiles:Object.freeze([...item.profiles])
    }))),
    telemetry,
    runbook:genericRunbook,
    dashboard:catalogDashboard,
    supportedProfiles:Object.freeze([...module.supportedProfiles]),
    offBehaviour:Object.freeze({...feature.offBehaviour}),
    dataClassification:feature.dataClassification,
    locked:feature.locked===true
  })
}))

export const featureTraceabilitySnapshot=()=>({
  schemaVersion:'platform-feature-traceability.v1',
  generatedAt:new Date().toISOString(),
  items:platformFeatureTraceability.map(item=>({
    ...item,
    permissions:[...item.permissions],
    dependencies:[...item.dependencies],
    configuration:[...item.configuration],
    contracts:[...item.contracts],
    migrations:[...item.migrations],
    tables:[...item.tables],
    events:[...item.events],
    eventContracts:[...item.eventContracts],
    endpoints:item.endpoints.map(endpoint=>({...endpoint})),
    handlers:[...item.handlers],
    tests:[...item.tests],
    telemetry:[...item.telemetry],
    supportedProfiles:[...item.supportedProfiles],
    operations:item.operations.map(operation=>({...operation,profiles:[...operation.profiles]})),
    offBehaviour:{...item.offBehaviour}
  }))
})

export const validateFeatureTraceability=()=>{
  validateFeatureCatalog()
  validateModuleRegistry()
  validateOperationRegistry()
  validatePersistenceCatalog(platformModuleRegistry.flatMap(item=>item.migrations))
  const moduleIds=new Set(platformModuleRegistry.map(item=>item.id))
  const traceIds=new Set()
  for(const item of platformFeatureTraceability){
    if(traceIds.has(item.id))throw new Error('duplicate traceability feature: '+item.id)
    traceIds.add(item.id)
    if(!item.description)throw new Error('traceability description missing: '+item.id)
    if(!item.owner)throw new Error('traceability owner missing: '+item.id)
    if(!item.permissions.length)throw new Error('traceability permissions missing: '+item.id)
    if(!item.contracts.length)throw new Error('traceability contracts missing: '+item.id)
    if(!item.operations.length)throw new Error('traceability operations missing: '+item.id)
    if(!item.endpoints.length)throw new Error('traceability endpoints missing: '+item.id)
    if(!item.handlers.length||!item.tests.length)throw new Error('traceability evidence missing: '+item.id)
    if(!item.telemetry.length)throw new Error('traceability telemetry missing: '+item.id)
    if(!item.configuration.length)throw new Error('traceability configuration missing: '+item.id)
    if(!item.runbook||!item.dashboard)throw new Error('traceability operational link missing: '+item.id)
    if(!item.supportedProfiles.length)throw new Error('traceability supported profiles missing: '+item.id)
    if(!item.offBehaviour?.newWork)throw new Error('traceability off behaviour missing: '+item.id)
  }
  for(const id of moduleIds)if(!traceIds.has(id))throw new Error('module missing traceability feature: '+id)
  return true
}
