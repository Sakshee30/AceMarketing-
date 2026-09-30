import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const failures=[]
const required=[
  'frontend/customer-app/src/features/boards/README.md',
  'backend/tests/board-realtime.test.mjs',
  'backend/modules/boards/src/application/commands/move-card/move-card.handler.mjs',
  'backend/tests/realtime-event-store.test.mjs',
  'backend/src/platform/board-realtime.mjs',
  'backend/src/platform/realtime-event-store.mjs',
  'backend/migrations/056_realtime_events.sql',
  'tests/architecture/dependency-boundaries.test.ts',
  'operations/runbooks/board-move-recovery.md',
  'tests/load/board-move.js',
  'backend/adapters/redis/cache.redis.ts',
  'backend/adapters/sqs/job-queue.sqs.ts',
  'backend/adapters/s3/object-storage.s3.ts',
  'backend/adapters/postgres/connection-pool.ts',
  'backend/platform/health/capability-health.ts',
  'backend/platform/policy/production-policy.ts',
  'backend/platform/capabilities/dependency-engine.ts',
  'backend/platform/capabilities/provider-registry.ts',
  'backend/platform/configuration/config-validator.ts',
  'backend/platform/context/tenant-context.ts',
  'backend/apps/realtime-gateway/src/bootstrap.ts',
  'backend/apps/control-api/src/bootstrap.ts',
  'backend/apps/domain-api/src/bootstrap.ts',
  'backend/apps/customer-bff/src/bootstrap.ts',
  'backend/modules/boards/src/application/commands/move-card/move-card.handler.ts',
  'backend/modules/search/module.manifest.mjs',
  'backend/modules/usage/module.manifest.mjs',
  'tests/security/tenant-isolation.spec.ts',
  'tests/e2e/board-move-recovery.spec.ts',
  'backend/tests/board-store.test.mjs',
  'backend/migrations/055_boards.sql',
  'backend/src/platform/board-store.mjs',
  'backend/modules/boards/module.manifest.mjs',
  'tooling/generators/backend-module.ts',
  'tests/security/tenant-isolation.test.mjs',
  'tests/security/cross-tenant-platform-isolation.test.mjs',
  'packages/contracts/http/platform.openapi.yaml',
  'packages/contracts/events/platform-event.schema.json',
  'packages/contracts/capabilities/capability.schema.json',
  'scripts/contracts-check.mjs',
  'tests/chaos/cache-outage.yaml',
  'tests/load/core-traffic.js',
  'operations/runbooks/realtime-reconnect-storm.md',
  'config/schemas/platform.schema.json',
  'config/profiles/production-standard.yaml',
  'config/profiles/production-high-scale.yaml',
  'config/limits/operation-budgets.yaml',
  'tests/architecture/dependency-boundaries.test.mjs',
  'backend/apps/customer-bff/src/bootstrap.mjs',
  'backend/apps/domain-api/src/bootstrap.mjs',
  'backend/apps/control-api/src/bootstrap.mjs',
  'backend/apps/integration-ingress/src/bootstrap.mjs',
  'backend/apps/realtime-gateway/src/bootstrap.mjs',
  'backend/apps/workers/general/src/bootstrap.mjs',
  'backend/apps/workers/workflow/src/bootstrap.mjs',
  'backend/apps/workers/webhook-delivery/src/bootstrap.mjs',
  'backend/apps/workers/documents/src/bootstrap.mjs',
  'backend/apps/scheduler/src/bootstrap.mjs',
  'backend/src/platform/module-registry.mjs',
  'backend/tests/module-registry.test.mjs',
  'backend/migrations/054_cell_placement.sql',
  'backend/modules/identity/module.manifest.mjs',
  'backend/modules/organizations/module.manifest.mjs',
  'backend/modules/memberships/module.manifest.mjs',
  'backend/modules/entitlements/module.manifest.mjs',
  'backend/modules/approvals/module.manifest.mjs',
  'backend/modules/notifications/module.manifest.mjs',
  'backend/modules/reporting/module.manifest.mjs',
  'backend/modules/scheduling/module.manifest.mjs',
  'backend/modules/workspaces/module.manifest.mjs',
  'backend/modules/authorization/module.manifest.mjs',
  'backend/modules/forms/module.manifest.mjs',
  'backend/modules/custom-objects/module.manifest.mjs',
  'backend/modules/rules/module.manifest.mjs',
  'backend/modules/workflows/module.manifest.mjs',
  'backend/modules/integrations/module.manifest.mjs',
  'backend/modules/webhooks/module.manifest.mjs',
  'backend/modules/jobs/module.manifest.mjs',
  'backend/modules/billing/module.manifest.mjs',
  'backend/modules/documents/module.manifest.mjs',
  'backend/modules/audit/module.manifest.mjs',
  'backend/modules/capabilities/module.manifest.mjs',
  'backend/modules/cells/module.manifest.mjs',
  'backend/modules/ai/module.manifest.mjs',
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
  'backend/src/platform/worker-class.mjs',
  'backend/src/platform/runtime-role.mjs',
  'backend/src/platform/cell-placement.mjs',
  'backend/src/scheduler.mjs',
  'backend/src/realtime.mjs',
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
  'infra/terraform/modules/database/main.tf',
  'infra/terraform/modules/object-storage/main.tf',
  'infra/terraform/modules/secrets/main.tf',
  'infra/terraform/modules/observability/main.tf',
  'infra/terraform/modules/backup/main.tf',
  'infra/terraform/modules/compute/main.tf',
  'infra/terraform/modules/queue/main.tf',
  'deploy/Dockerfile.worker',
  'operations/slo/core-api.yaml',
  'operations/disaster-recovery/recovery-profile.yaml',
  'operations/runbooks/database-failover.md',
  'operations/runbooks/queue-backlog.md',
  'operations/runbooks/bad-rollout.md',
  '.github/workflows/restore-exercise.yml',
  '.github/workflows/security-review.yml',
  '.github/workflows/qualification.yml',
  'docs/evidence/release-report-template.md',
  'infra/terraform/modules/edge/main.tf',
  'infra/terraform/modules/ecs-service/main.tf',
  'infra/terraform/modules/vpc-endpoints/main.tf',
  'infra/terraform/modules/security-baseline/main.tf',
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
  'backend/tests/custom-object-store.test.mjs',
  'backend/tests/worker-class.test.mjs',
  'backend/tests/runtime-role.test.mjs',
  'backend/tests/worker-leasing.test.mjs',
  'backend/tests/cell-placement.test.mjs',
  'backend/migrations/053_cell_placement.sql'
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
  const walkTerraform=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name)
    return entry.isDirectory()?walkTerraform(full):(entry.name.endsWith('.tf')?[full]:[])
  })
  const terraformFiles=walkTerraform(terraformRoot)
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



const stagingMainPath=path.join(terraformRoot,'stacks','nonprod','staging','main.tf')
if(fs.existsSync(stagingMainPath)){
  const stagingMain=fs.readFileSync(stagingMainPath,'utf8')
  if(!stagingMain.includes('module "edge"')||!stagingMain.includes('module "api_service"')||!stagingMain.includes('module "control_api_service"')||!stagingMain.includes('module "worker_service"')){
    failures.push('Staging must compose separated edge, API, control API and worker services.')
  }
  if(!stagingMain.includes('module "vpc_endpoints"')){
    failures.push('Staging must use private AWS service endpoints for approved dependencies.')
  }
  if(!stagingMain.includes('module "security_baseline"')){
    failures.push('Staging must enable the AWS security evidence baseline.')
  }
  if(!stagingMain.includes('module "integration_ingress_service"')){
    failures.push('Staging must deploy provider integration ingress independently from the tenant API.')
  }
  if(!stagingMain.includes('module "realtime_service"')){
    failures.push('Staging must deploy the realtime WebSocket runtime independently from the tenant API.')
  }
  if(!stagingMain.includes('ACE_RUNTIME_ROLE = "integration-ingress"')){
    failures.push('The integration ingress service must use the restricted runtime role.')
  }
  for(const role of ['module "worker_service"','module "workflow_worker_service"','module "webhook_worker_service"','module "ai_document_worker_service"','module "scheduler_service"']){
    if(!stagingMain.includes(role))failures.push('Staging must separate general, webhook, AI/document worker pools and scheduler: missing '+role)
  }
  if(!stagingMain.includes('WORKER_CLASS = "general"')||!stagingMain.includes('WORKER_CLASS = "workflow"')||!stagingMain.includes('WORKER_CLASS = "webhook"')||!stagingMain.includes('WORKER_CLASS = "ai-document"')){
    failures.push('Staging worker services must declare bounded worker classes.')
  }
}
const edgeSourcePath=path.join(terraformRoot,'modules','edge','main.tf')
if(fs.existsSync(edgeSourcePath)){
  const edgeSource=fs.readFileSync(edgeSourcePath,'utf8')
  if(!edgeSource.includes('internal           = true')||!edgeSource.includes('aws_wafv2_web_acl')){
    failures.push('Staging must keep the platform control plane on a separate internal ALB and protect public API ingress with WAF.')
  }
  if(!edgeSource.includes('aws_lb_listener_rule" "integration_ingress')||!edgeSource.includes('aws_lb_target_group" "integration')){
    failures.push('Provider webhook ingress must route to an isolated target group.')
  }
  if(!edgeSource.includes('aws_lb_listener_rule" "realtime')||!edgeSource.includes('aws_lb_target_group" "realtime')){
    failures.push('Live WebSocket traffic must route to the isolated realtime target group.')
  }
}

for(const dockerfile of ['deploy/Dockerfile.api','deploy/Dockerfile.control-api','deploy/Dockerfile.worker']){
  const source=fs.readFileSync(path.join(root,dockerfile),'utf8')
  if(!source.includes('AS dependencies')||!source.includes('AS runtime')){
    failures.push(dockerfile+': backend runtime image must use a multi-stage build.')
  }
  if(!source.includes('USER node')){
    failures.push(dockerfile+': backend runtime image must run as non-root node user.')
  }
  if(!source.includes('npm ci --omit=dev')){
    failures.push(dockerfile+': backend runtime dependencies must be installed from the lockfile.')
  }
}
const releaseWorkflowPath=path.join(root,'.github','workflows','release.yml')
if(fs.existsSync(releaseWorkflowPath)){
  const source=fs.readFileSync(releaseWorkflowPath,'utf8')
  if(!source.includes('--sbom=true')||!source.includes('--provenance=mode=max')){
    failures.push('Release workflow must produce SBOM/provenance metadata for immutable images.')
  }
  if(!source.includes('release-manifest.json')||!source.includes('containerimage.digest')){
    failures.push('Release workflow must record immutable image digests in release evidence.')
  }
}

const sqsAdapterPath=path.join(root,'backend','adapters','sqs','job-queue.sqs.ts')
if(fs.existsSync(sqsAdapterPath)){
  const source=fs.readFileSync(sqsAdapterPath,'utf8')
  if(!source.includes('synchronousProductionFallback:false')){
    failures.push('SQS canonical adapter must reject synchronous production fallback.')
  }
  if(!source.includes('durableIntentAuthority')){
    failures.push('SQS canonical adapter must declare the durable intent authority.')
  }
}
const redisAdapterPath=path.join(root,'backend','adapters','redis','cache.redis.ts')
if(fs.existsSync(redisAdapterPath)){
  const source=fs.readFileSync(redisAdapterPath,'utf8')
  if(!source.includes('authoritative:false')){
    failures.push('Redis cache adapter must remain non-authoritative.')
  }
  if(!source.includes("fallback:'bounded-bypass'")){
    failures.push('Redis cache adapter must expose bounded-bypass semantics.')
  }
}


if(failures.length){
  console.error('Backend architecture check failed:\n- '+failures.join('\n- '))
  process.exit(1)
}
console.log('Backend architecture boundaries verified.')
