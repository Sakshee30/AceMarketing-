import {execFileSync} from 'node:child_process'

const envBase=String(process.env.ARCHITECTURE_DIFF_BASE||'').trim()
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()

const resolveBase=()=>{
  if(envBase)return envBase
  try{return git('rev-parse','HEAD^')}
  catch{return ''}
}

const base=resolveBase()
if(!base){
  console.log('Architecture change-impact check skipped: no parent/base commit available.')
  process.exit(0)
}

const changed=git('diff','--name-only',base,'HEAD').split(/\r?\n/).map(x=>x.trim()).filter(Boolean)
const changedSet=new Set(changed)
const migrationChanged=changed.some(file=>file.startsWith('backend/migrations/'))
const migrationAcknowledged=changedSet.has('docs/architecture/MIGRATION_REVIEW.md')||changed.some(file=>file.startsWith('docs/architecture/migrations/'))

const trustPatterns=[
  /^backend\/src\/security\.mjs$/,
  /^backend\/src\/control-api\.mjs$/,
  /^backend\/src\/platform\/(access-policy|tenant-context|tenant-db|workspace-access|egress-policy|webhook-signing|provider-execution)\.mjs$/,
  /^backend\/modules\/(identity|authorization|memberships|organizations|webhooks|integrations|audit|ai|capabilities|cells)\//,
  /^infra\/terraform\/modules\/(security-baseline|network|edge|secrets)\//
]
const trustBoundaryChanged=changed.some(file=>trustPatterns.some(pattern=>pattern.test(file)))
const threatAcknowledged=changedSet.has('docs/threat-models/BACKEND_FOUNDATION.md')||changed.some(file=>file.startsWith('docs/threat-models/')&&file.endsWith('.md'))

const failures=[]
if(migrationChanged&&!migrationAcknowledged)failures.push('Persistence migration changed without updating docs/architecture/MIGRATION_REVIEW.md or a migration-specific review.')
if(trustBoundaryChanged&&!threatAcknowledged)failures.push('Security/trust-boundary code changed without updating or acknowledging the backend threat model.')

if(failures.length){
  console.error('Architecture change-impact check failed:\n- '+failures.join('\n- '))
  process.exit(1)
}
console.log('Architecture change-impact verified for '+changed.length+' changed file(s).')
