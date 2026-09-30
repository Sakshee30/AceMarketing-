const states=Object.freeze(['REQUIRED','OPTIONAL','DEGRADED','DISABLED'])

const manifests=Object.freeze([
  {
    id:'persistence',
    contractVersion:1,
    provider:'postgres',
    criticality:'locked',
    scope:'platform',
    dependencies:[],
    healthChecks:['connectivity','read-write-transaction','migration-compatibility'],
    fallback:{mode:'controlled-unavailability',allowed:false},
    capacity:{budget:'database-pool-and-throughput'},
    configurationSchema:'config/capabilities/persistence.schema.json',
    migrationClass:'data-authority',
    owner:'platform-data',
    telemetry:['connection-utilization','transaction-latency','errors'],
    state:'REQUIRED'
  },
  {
    id:'cache',
    contractVersion:1,
    provider:'redis',
    criticality:'optional-performance',
    scope:'platform',
    dependencies:['persistence'],
    healthChecks:['connectivity','read-write-roundtrip'],
    fallback:{mode:'bounded-bypass',allowed:true,requiresCapacityEvidence:true},
    capacity:{budget:'cache-bypass-database-headroom'},
    configurationSchema:'config/capabilities/cache.schema.json',
    migrationClass:'runtime-provider',
    owner:'platform-runtime',
    telemetry:['hit-rate','latency','circuit-state','fallback-admission'],
    state:'OPTIONAL'
  },
  {
    id:'idempotency',
    contractVersion:1,
    provider:'postgres',
    criticality:'locked',
    scope:'platform',
    dependencies:['persistence'],
    healthChecks:['durable-write','duplicate-replay'],
    fallback:{mode:'none',allowed:false},
    capacity:{budget:'durable-operation-ledger'},
    configurationSchema:'config/capabilities/idempotency.schema.json',
    migrationClass:'data-authority',
    owner:'platform-runtime',
    telemetry:['duplicate-rate','unknown-outcome-reconciliation'],
    state:'REQUIRED'
  },
  {
    id:'durable-jobs',
    contractVersion:1,
    provider:'application-job-state',
    criticality:'required-for-accepted-async-work',
    scope:'platform',
    dependencies:['persistence'],
    healthChecks:['durable-admission','lease-recovery','retry-dead-letter'],
    fallback:{mode:'pause-or-reject-admission',allowed:true},
    capacity:{budget:'queue-age-and-worker-concurrency'},
    configurationSchema:'config/capabilities/jobs.schema.json',
    migrationClass:'durable-work',
    owner:'platform-runtime',
    telemetry:['queue-age','admission-rejected','retry-rate','dead-letter-count'],
    state:'REQUIRED'
  },
  {
    id:'object-storage',
    contractVersion:1,
    provider:'s3',
    criticality:'required-when-files-enabled',
    scope:'workspace',
    dependencies:['persistence'],
    healthChecks:['private-write','versioned-read','delete-marker'],
    fallback:{mode:'reject-upload-safely',allowed:true},
    capacity:{budget:'storage-and-upload-admission'},
    configurationSchema:'config/capabilities/object-storage.schema.json',
    migrationClass:'stateful-provider',
    owner:'platform-files',
    telemetry:['upload-errors','download-errors','quarantine-age','storage-bytes'],
    state:'OPTIONAL'
  },
  {
    id:'search',
    contractVersion:1,
    provider:'postgres-full-text',
    criticality:'optional',
    scope:'workspace',
    dependencies:['persistence'],
    healthChecks:['authorized-query','index-freshness','deletion-propagation'],
    fallback:{mode:'postgres-limited',allowed:true,reducedSemantics:true,requiresCapacityEvidence:true},
    capacity:{budget:'search-query-admission'},
    configurationSchema:'config/capabilities/search.schema.json',
    migrationClass:'read-projection',
    owner:'platform-search',
    telemetry:['query-latency','index-lag','failed-indexing','fallback-state'],
    state:'OPTIONAL'
  },
  {
    id:'ai',
    contractVersion:1,
    provider:'approved-adapter',
    criticality:'optional',
    scope:'workspace',
    dependencies:['persistence'],
    healthChecks:['model-authorization','deadline','data-egress-policy'],
    fallback:{mode:'consented-alternate-or-disabled',allowed:true,requiresConsent:true},
    capacity:{budget:'tenant-token-and-concurrency'},
    configurationSchema:'config/capabilities/ai.schema.json',
    migrationClass:'external-provider',
    owner:'platform-ai',
    telemetry:['provider-latency','token-usage','denied-egress','fallback-state'],
    state:'OPTIONAL'
  },
  {
    id:'observability',
    contractVersion:1,
    provider:'otel-compatible',
    criticality:'locked-minimum-signals',
    scope:'platform',
    dependencies:[],
    healthChecks:['export-path','bounded-buffer','essential-signal-local-path'],
    fallback:{mode:'bounded-buffer-and-minimum-signals',allowed:true},
    capacity:{budget:'telemetry-buffer-and-ingestion'},
    configurationSchema:'config/capabilities/observability.schema.json',
    migrationClass:'runtime-provider',
    owner:'platform-sre',
    telemetry:['export-failures','buffer-usage','dropped-signals'],
    state:'REQUIRED'
  }
])

export const capabilityStates=()=>[...states]

export const validateCapabilityManifest=manifest=>{
  if(!manifest||typeof manifest!=='object')throw new Error('capability manifest must be an object')
  for(const key of ['id','contractVersion','provider','criticality','scope','dependencies','healthChecks','fallback','capacity','configurationSchema','migrationClass','owner','telemetry','state']){
    if(manifest[key]===undefined||manifest[key]===null)throw new Error('capability manifest missing '+key)
  }
  if(!/^[a-z0-9][a-z0-9-]{1,79}$/.test(manifest.id))throw new Error('invalid capability id '+manifest.id)
  if(!states.includes(manifest.state))throw new Error('invalid capability state '+manifest.state)
  if(!Array.isArray(manifest.dependencies)||!Array.isArray(manifest.healthChecks)||!Array.isArray(manifest.telemetry))throw new Error('invalid capability arrays for '+manifest.id)
  if(typeof manifest.fallback!=='object'||!manifest.fallback.mode)throw new Error('fallback semantics required for '+manifest.id)
  return true
}

export const validateCapabilityDependencyGraph=(items=manifests)=>{
  const ids=new Set(items.map(item=>item.id))
  const visiting=new Set()
  const visited=new Set()
  const visit=id=>{
    if(visited.has(id))return
    if(visiting.has(id))throw new Error('capability dependency cycle: '+id)
    visiting.add(id)
    const item=items.find(entry=>entry.id===id)
    if(!item)throw new Error('unknown capability '+id)
    for(const dependency of item.dependencies){
      if(!ids.has(dependency))throw new Error('unknown capability dependency '+dependency+' for '+id)
      visit(dependency)
    }
    visiting.delete(id)
    visited.add(id)
  }
  for(const item of items)visit(item.id)
  return true
}

export const capabilityManifestSnapshot=()=>{
  for(const item of manifests)validateCapabilityManifest(item)
  validateCapabilityDependencyGraph(manifests)
  return {
    schemaVersion:'capability-manifests.v1',
    generatedAt:new Date().toISOString(),
    items:manifests.map(item=>structuredClone(item))
  }
}

export const capabilityManifestById=id=>capabilityManifestSnapshot().items.find(item=>item.id===String(id))||null

export const providerChangePreflight=({capability,fromProvider,toProvider,environment,evidence={}})=>{
  const manifest=capabilityManifestById(capability)
  if(!manifest)return {allowed:false,reasons:['unknown capability'],manifest:null}
  const reasons=[]
  if(!fromProvider||!toProvider||String(fromProvider)===String(toProvider))reasons.push('source and target providers must differ')
  if(manifest.state==='REQUIRED'&&String(toProvider).toLowerCase()==='disabled')reasons.push('required capability cannot be disabled')
  if(environment==='production'&&manifest.fallback?.requiresCapacityEvidence&&evidence.capacityValidated!==true){
    reasons.push('production change requires fallback capacity evidence')
  }
  if(environment==='production'&&manifest.fallback?.requiresConsent&&evidence.dataPolicyValidated!==true){
    reasons.push('production change requires data destination/consent evidence')
  }
  return {allowed:reasons.length===0,reasons,manifest}
}
