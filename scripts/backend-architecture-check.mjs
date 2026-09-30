import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const failures=[]
const required=[
  'backend/src/control-api.mjs',
  'backend/src/platform/capability-registry.mjs',
  'backend/src/platform/capability-manifest.mjs',
  'backend/src/platform/connector-registry.mjs',
  'backend/src/platform/control-change-store.mjs',
  'backend/src/platform/control-idempotency.mjs',
  'backend/src/platform/runtime-configuration.mjs',
  'backend/src/platform/runtime-config-runtime.mjs',
  'backend/src/platform/provider-migration-store.mjs',
  'backend/src/platform/resilience.mjs',
  'backend/src/platform/recovery-evidence.mjs',
  'backend/src/platform/process-health.mjs',
  'backend/src/platform/drain-controller.mjs',
  'backend/src/platform/capacity-budget.mjs',
  'backend/src/platform/custom-object-store.mjs',
  'deploy/Dockerfile.control-api',  'backend/src/platform/problem-details.mjs',
  'backend/src/platform/request-context.mjs',
  'backend/src/platform/admission-control.mjs',
  'backend/src/platform/idempotency.mjs',
  'backend/src/platform/reliability-store.mjs',
  'backend/src/platform/tenant-context.mjs',
  'backend/src/platform/tenant-db.mjs',
  'backend/src/platform/audit-store.mjs',
  'backend/src/platform/feature-catalog.mjs',
  'backend/src/platform/outbox-relay.mjs',
  'backend/src/platform/provider-execution.mjs',
  'backend/src/platform/access-policy.mjs',
  'backend/src/platform/workspace-access.mjs',
  'backend/src/platform/forms-store.mjs',
  'backend/src/platform/policy-engine.mjs',
  'backend/src/platform/workflow-store.mjs',
  'backend/src/platform/workflow-action-catalog.mjs',
  'backend/src/platform/usage-ledger.mjs',
  'backend/src/platform/billing-lifecycle.mjs',
  'backend/src/platform/object-lifecycle.mjs',
  'backend/src/platform/object-storage.mjs',
  'backend/src/platform/search-port.mjs',
  'backend/src/platform/document-processing.mjs',
  'backend/src/platform/egress-policy.mjs',
  'backend/src/platform/webhook-signing.mjs',
  'backend/src/platform/webhook-delivery-store.mjs',
  'backend/src/platform/webhook-delivery-worker.mjs',
  'backend/migrations/034_platform_reliability.sql',
  'backend/migrations/035_platform_audit_catalog.sql',
  'backend/migrations/036_platform_rls.sql',
  'backend/migrations/037_forms_custom_objects.sql',
  'backend/migrations/038_rules_workflows.sql',
  'backend/migrations/039_usage_ledger.sql',
  'backend/migrations/040_object_lifecycle.sql',
  'backend/migrations/041_platform_control_changes.sql',
  'backend/migrations/042_platform_change_versioning.sql',
  'backend/migrations/043_platform_control_idempotency.sql',
  'backend/migrations/044_runtime_configuration.sql',
  'backend/migrations/045_provider_migrations.sql',
  'backend/migrations/046_emergency_environment_scope.sql',
  'backend/migrations/047_recovery_evidence.sql',
  'backend/migrations/048_custom_objects.sql',
  'backend/migrations/049_workflow_durable_steps.sql',
  'backend/migrations/050_webhook_delivery.sql',
  'backend/migrations/051_billing_lifecycle.sql',
  'backend/migrations/052_object_processing_search.sql',
  'backend/migrations/053_provider_migration_evidence.sql',
  'backend/tests/platform-foundation.test.mjs',
  'backend/tests/platform-reliability.test.mjs',
  'backend/tests/tenant-context.test.mjs',
  'backend/tests/tenant-db.test.mjs',
  'backend/tests/platform-audit-catalog.test.mjs',
  'backend/tests/outbox-relay.test.mjs',
  'backend/tests/provider-execution.test.mjs',
  'backend/tests/access-policy.test.mjs',
  'backend/tests/workspace-access.test.mjs',
  'backend/tests/forms-store.test.mjs',
  'backend/tests/policy-workflow.test.mjs',
  'backend/tests/usage-ledger.test.mjs',
  'backend/tests/billing-lifecycle.test.mjs',
  'backend/tests/object-lifecycle.test.mjs',
  'backend/tests/search-port.test.mjs',
  'backend/tests/document-processing.test.mjs',
  'backend/tests/egress-policy.test.mjs',
  'backend/tests/webhook-signing.test.mjs',
  'backend/tests/webhook-delivery.test.mjs',
  'infra/terraform/modules/network/main.tf',
  'infra/terraform/modules/network/variables.tf',
  'infra/terraform/modules/network/outputs.tf',
  'infra/terraform/stacks/nonprod/staging/main.tf',
  'infra/terraform/stacks/nonprod/staging/variables.tf',
  'infra/terraform/stacks/nonprod/staging/versions.tf',
  'operations/capacity/quota-register.yaml',
  'backend/tests/control-capability.test.mjs',
  'backend/tests/capability-manifest.test.mjs',
  'backend/tests/connector-registry.test.mjs',
  'backend/tests/control-change-store.test.mjs',
  'backend/tests/control-idempotency.test.mjs',
  'backend/tests/runtime-configuration.test.mjs',
  'backend/tests/runtime-config-runtime.test.mjs',
  'backend/tests/provider-migration.test.mjs',
  'backend/tests/resilience.test.mjs',
  'backend/tests/recovery-evidence.test.mjs',
  'backend/tests/process-health.test.mjs',
  'backend/tests/drain-controller.test.mjs',
  'backend/tests/capacity-budget.test.mjs',
  'backend/tests/custom-object-store.test.mjs'
]
for(const item of required)if(!fs.existsSync(path.join(root,item)))failures.push('missing required backend architecture foundation: '+item)

const backendRoot=path.join(root,'backend','src')
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const full=path.join(dir,entry.name)
  return entry.isDirectory()?walk(full):[/\.mjs$/.test(entry.name)?full:null].filter(Boolean)
})
for(const file of walk(backendRoot)){
  const content=fs.readFileSync(file,'utf8')
  const relative=path.relative(root,file)
  if(/from\s+['"][^'"]*frontend\//.test(content))failures.push(relative+': backend must not import frontend implementation')
  if(/BEGIN PRIVATE KEY|AWS_SECRET_ACCESS_KEY\s*=|sk-[A-Za-z0-9]{20,}/.test(content))failures.push(relative+': probable plaintext credential detected')
}

const objectLifecyclePath=path.join(root,'backend','src','platform','object-lifecycle.mjs')
if(fs.existsSync(objectLifecyclePath)){
  const source=fs.readFileSync(objectLifecyclePath,'utf8')
  if(!source.includes('approved_storage_version'))failures.push('Approved objects must record the immutable storage version.')
  if(!source.includes('approved_sha256'))failures.push('Approved objects must record the scanned immutable digest.')
}
const objectStoragePath=path.join(root,'backend','src','platform','object-storage.mjs')
if(fs.existsSync(objectStoragePath)){
  const source=fs.readFileSync(objectStoragePath,'utf8')
  if(!source.includes('versionId'))failures.push('Approved downloads must pin immutable storage versions.')
}
const searchPortPath=path.join(root,'backend','src','platform','search-port.mjs')
if(fs.existsSync(searchPortPath)){
  const source=fs.readFileSync(searchPortPath,'utf8')
  if(!source.includes('tenant-and-resource-policy-before-result'))failures.push('Search must enforce tenant/resource authorization before returning results.')
}


const capabilityManifestPath=path.join(root,'backend','src','platform','capability-manifest.mjs')
if(fs.existsSync(capabilityManifestPath)){
  const source=fs.readFileSync(capabilityManifestPath,'utf8')
  for(const requiredToken of ['REQUIRED','OPTIONAL','DEGRADED','DISABLED']){
    if(!source.includes(requiredToken))failures.push('Capability manifest must model '+requiredToken+' state.')
  }
  if(!source.includes('requiresCapacityEvidence'))failures.push('Capability fallbacks must carry capacity-evidence semantics where required.')
}
const providerMigrationPath=path.join(root,'backend','src','platform','provider-migration-store.mjs')
if(fs.existsSync(providerMigrationPath)){
  const source=fs.readFileSync(providerMigrationPath,'utf8')
  if(!source.includes('point_of_no_return_at'))failures.push('Provider migration store must preserve point-of-no-return semantics.')
  if(!source.includes('verification_evidence'))failures.push('Provider migration store must preserve verification evidence.')
}


const terraformRoot=path.join(root,'infra','terraform')
if(fs.existsSync(terraformRoot)){
  const terraformFiles=walk(terraformRoot).filter(file=>file.endsWith('.tf'))
  for(const file of terraformFiles){
    const source=fs.readFileSync(file,'utf8')
    const relative=path.relative(root,file)
    if(/aws_access_key_id\s*=|aws_secret_access_key\s*=|BEGIN PRIVATE KEY/.test(source)){
      failures.push(relative+': Terraform must not contain plaintext AWS credentials.')
    }
  }
  const networkSource=fs.readFileSync(path.join(terraformRoot,'modules','network','main.tf'),'utf8')
  if(!networkSource.includes('map_public_ip_on_launch = false'))failures.push('Public subnets must not automatically assign public IPs.')
  if(!networkSource.includes('aws_subnet" "data')&&!networkSource.includes('resource "aws_subnet" "data"'))failures.push('Network baseline must include isolated data subnets.')
  const stagingVersions=fs.readFileSync(path.join(terraformRoot,'stacks','nonprod','staging','versions.tf'),'utf8')
  if(!stagingVersions.includes('backend "s3"'))failures.push('Staging Terraform must use a remote S3 state backend contract.')
}

if(failures.length){
  console.error('Backend architecture check failed:\n- '+failures.join('\n- '))
  process.exit(1)
}
console.log('Backend architecture boundaries verified.')
