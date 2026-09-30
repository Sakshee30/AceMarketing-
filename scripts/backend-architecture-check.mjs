import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const failures=[]
const required=[
  'backend/src/control-api.mjs',
  'backend/src/platform/capability-registry.mjs',
  'backend/src/platform/control-change-store.mjs',
  'backend/src/platform/control-idempotency.mjs',
  'backend/src/platform/runtime-configuration.mjs',
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
  'backend/src/platform/usage-ledger.mjs',
  'backend/src/platform/object-lifecycle.mjs',
  'backend/src/platform/object-storage.mjs',
  'backend/src/platform/egress-policy.mjs',
  'backend/src/platform/webhook-signing.mjs',
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
  'backend/tests/object-lifecycle.test.mjs',
  'backend/tests/egress-policy.test.mjs',
  'backend/tests/webhook-signing.test.mjs',
  'backend/tests/control-capability.test.mjs',
  'backend/tests/control-change-store.test.mjs',
  'backend/tests/control-idempotency.test.mjs',
  'backend/tests/runtime-configuration.test.mjs'
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
if(failures.length){
  console.error('Backend architecture check failed:\n- '+failures.join('\n- '))
  process.exit(1)
}
console.log('Backend architecture boundaries verified.')
