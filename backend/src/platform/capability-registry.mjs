import {platformFeatureCatalog,validateFeatureCatalog} from './feature-catalog.mjs'
import {modelRegistrySnapshot} from '../ai-registry.mjs'
import {connectorCatalogSnapshot} from './connector-registry.mjs'
import {capabilityManifestSnapshot} from './capability-manifest.mjs'
import {moduleRegistrySnapshot} from './module-registry.mjs'
import {deploymentModeSnapshot} from './deployment-mode.mjs'

const state=(desired,actual,reason=null)=>({desired,actual,reason})

const providerContracts=Object.freeze([
  {
    id:'postgres',
    capability:'authoritative-data',
    criticality:'locked',
    productionBaseline:'PostgreSQL',
    durability:'durable',
    consistency:'transactional',
    fallback:'controlled-unavailability',
    configured:()=>Boolean(process.env.DATABASE_URL)
  },
  {
    id:'object-storage',
    capability:'object-storage',
    criticality:'required-when-files-enabled',
    productionBaseline:'S3-compatible durable object storage',
    durability:'durable',
    consistency:'read-after-write-provider-contract',
    fallback:'reject-production-file-admission',
    configured:()=>Boolean(
      process.env.OBJECT_S3_BUCKET&&
      (process.env.OBJECT_S3_REGION||process.env.AWS_REGION)&&
      (process.env.OBJECT_S3_ACCESS_KEY_ID||process.env.AWS_ACCESS_KEY_ID)&&
      (process.env.OBJECT_S3_SECRET_ACCESS_KEY||process.env.AWS_SECRET_ACCESS_KEY)
    )
  },
  {
    id:'queue',
    capability:'durable-jobs',
    criticality:'locked-for-accepted-async-work',
    productionBaseline:'application job state plus durable queue adapter',
    durability:'durable',
    consistency:'at-least-once',
    fallback:'pause-or-reject-admission',
    configured:()=>Boolean(process.env.DATABASE_URL)
  },
  {
    id:'email',
    capability:'email-delivery',
    criticality:'optional',
    productionBaseline:'approved SMTP/provider adapter',
    durability:'queued-when-required',
    consistency:'provider-dependent',
    fallback:'explicit-delayed-or-unavailable',
    configured:()=>Boolean(process.env.SMTP_HOST&&process.env.SMTP_USER)
  }
])

export const validateDependencyGraph=()=>{
  validateFeatureCatalog()
  const features=platformFeatureCatalog.map(item=>item.id)
  const nodes=new Set([...features,'persistence','audit','secrets'])
  const visiting=new Set()
  const visited=new Set()
  const visit=id=>{
    if(visited.has(id))return
    if(visiting.has(id))throw new Error('capability dependency cycle: '+id)
    visiting.add(id)
    const item=platformFeatureCatalog.find(feature=>feature.id===id)
    for(const dependency of item?.dependsOn||[]){
      if(!nodes.has(dependency))throw new Error('unknown capability dependency '+dependency+' for '+id)
      if(features.includes(dependency))visit(dependency)
    }
    visiting.delete(id)
    visited.add(id)
  }
  for(const id of features)visit(id)
  return true
}

const featureActual=item=>{
  if(item.locked)return 'enabled'
  const envKey='ACE_FEATURE_'+item.id.toUpperCase().replace(/[^A-Z0-9]+/g,'_')
  const configured=process.env[envKey]
  if(configured==='false')return 'disabled'
  if(configured==='true')return 'enabled'
  const mode=deploymentModeSnapshot()
  if(item.id==='ai'&&!mode.features.ai)return 'disabled'
  if(item.id==='billing'&&!mode.features.billing)return 'disabled'
  if(['files','documents'].includes(item.id)&&!mode.features.files)return 'disabled'
  return 'enabled'
}

export const capabilitySnapshot=()=>{
  validateDependencyGraph()
  const providerItems=providerContracts.map(contract=>({
    ...contract,
    configured:contract.configured(),
    health:contract.configured()?'configured':'unconfigured'
  }))
  const ai=modelRegistrySnapshot()
  const features=platformFeatureCatalog.map(item=>{
    const actual=featureActual(item)
    const desired=item.locked?'enabled':actual
    return {
      ...item,
      ...state(desired,actual),
      criticality:item.locked?'locked':'product',
      fallback:item.locked?'fail-closed':'explicit-off-behaviour-required'
    }
  })
  return {
    schemaVersion:'platform-capabilities.v1',
    generatedAt:new Date().toISOString(),
    configurationVersion:process.env.ACE_CONFIG_VERSION||'unversioned',
    deploymentMode:deploymentModeSnapshot(),
    releaseVersion:process.env.ACE_RELEASE_SHA||process.env.GITHUB_SHA||'unknown',
    features,
    providers:providerItems,
    connectors:connectorCatalogSnapshot().items,
    capabilityContracts:capabilityManifestSnapshot().items,
    modules:moduleRegistrySnapshot().items,
    aiProviders:ai.map(item=>({
      id:'ai:'+item.task,
      provider:item.provider,
      requestedModel:item.requestedModel,
      capability:item.capability,
      readiness:item.readiness,
      fallbackPolicy:item.fallbackPolicy,
      documentationVerified:item.documentationVerified,
      credentialConfigured:item.credentialConfigured
    }))
  }
}

export const dependencySnapshot=()=>{
  validateDependencyGraph()
  const edges=[]
  for(const item of platformFeatureCatalog){
    for(const dependency of item.dependsOn||[])edges.push({from:item.id,to:dependency,required:true})
  }
  return {
    schemaVersion:'platform-dependencies.v1',
    generatedAt:new Date().toISOString(),
    nodes:[
      ...platformFeatureCatalog.map(item=>({id:item.id,type:'feature',owner:item.owner,locked:item.locked})),
      {id:'persistence',type:'platform',locked:true},
      {id:'audit',type:'platform',locked:true},
      {id:'secrets',type:'platform',locked:true}
    ],
    edges,
    valid:true
  }
}

export const providerSnapshot=()=>{
  const snapshot=capabilitySnapshot()
  return {
    schemaVersion:'platform-providers.v1',
    generatedAt:snapshot.generatedAt,
    providers:[
      ...snapshot.providers,
      ...snapshot.connectors.map(item=>({...item,capability:'connector',configured:false,health:'unconfigured',configurationScope:'tenant-workspace'})),
      ...snapshot.aiProviders
    ],
    capabilityContracts:snapshot.capabilityContracts
  }
}
