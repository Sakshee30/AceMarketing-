import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const failures=[]
const required=[
  'backend/src/platform/problem-details.mjs',
  'backend/src/platform/request-context.mjs',
  'backend/src/platform/admission-control.mjs',
  'backend/src/platform/idempotency.mjs',
  'backend/src/platform/reliability-store.mjs',
  'backend/src/platform/tenant-context.mjs',
  'backend/src/platform/audit-store.mjs',
  'backend/src/platform/feature-catalog.mjs',
  'backend/src/platform/outbox-relay.mjs',
  'backend/src/platform/provider-execution.mjs',
  'backend/src/platform/access-policy.mjs',
  'backend/migrations/034_platform_reliability.sql',
  'backend/migrations/035_platform_audit_catalog.sql',
  'backend/tests/platform-foundation.test.mjs',
  'backend/tests/platform-reliability.test.mjs',
  'backend/tests/tenant-context.test.mjs',
  'backend/tests/platform-audit-catalog.test.mjs',
  'backend/tests/outbox-relay.test.mjs',
  'backend/tests/provider-execution.test.mjs',
  'backend/tests/access-policy.test.mjs'
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
