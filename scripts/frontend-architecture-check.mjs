import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const frontend=path.join(root,'frontend','src')
const forbiddenImportPatterns=[
  /from\s+['"][^'"]*backend\//,
  /from\s+['"](?:node:)?(?:fs|child_process|cluster|net|tls|worker_threads)['"]/,
  /from\s+['"]pg['"]/,
  /from\s+['"]@aws-sdk\//
]
const forbiddenCredentialPatterns=[
  /AWS_SECRET_ACCESS_KEY/,
  /DATABASE_URL/,
  /CONNECTOR_ENCRYPTION_KEY/,
  /BEGIN PRIVATE KEY/
]

const walk=(dir)=>{
  const out=[]
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name)
    if(entry.isDirectory())out.push(...walk(full))
    else if(/\.(ts|tsx|js|jsx)$/.test(entry.name))out.push(full)
  }
  return out
}

const failures=[]
for(const file of walk(frontend)){
  const content=fs.readFileSync(file,'utf8')
  for(const pattern of forbiddenImportPatterns){
    if(pattern.test(content))failures.push(path.relative(root,file)+': forbidden server/backend import '+pattern)
  }
  for(const pattern of forbiddenCredentialPatterns){
    if(pattern.test(content))failures.push(path.relative(root,file)+': credential/server secret pattern found '+pattern)
  }
}

const acePlatform=path.join(frontend,'AcePlatform.tsx')
if(fs.existsSync(acePlatform)){
  const source=fs.readFileSync(acePlatform,'utf8')
  if(/function\s+Approvals\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Approvals implementation after feature extraction.')
  }
  if(/function\s+Monitoring\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Monitoring implementation after feature extraction.')
  }
  const bytes=fs.statSync(acePlatform).size
  if(bytes>600_000){
    failures.push('frontend/src/AcePlatform.tsx exceeds the temporary 600 KB migration ceiling. Extract features before adding more monolithic code.')
  }else if(bytes>500_000){
    console.warn('[frontend-architecture] AcePlatform.tsx remains above 500 KB; feature extraction is still required before frontend completion.')
  }
}

const required=[
  'frontend/src/features/workspace/manifest.ts',
  'frontend/src/features/monitoring/data/monitoring.api.ts',
  'frontend/src/features/monitoring/pages/MonitoringPage.tsx',
  'frontend/src/features/monitoring/public.ts',
  'frontend/src/features/monitoring/feature.manifest.ts',
  'frontend/src/features/approvals/data/approvals.api.ts',
  'frontend/src/features/approvals/pages/ApprovalPage.tsx',
  'frontend/src/features/approvals/public.ts',
  'frontend/src/features/approvals/feature.manifest.ts',
  'frontend/src/lib/runtime-config.ts',
  'frontend/src/lib/mutation-lifecycle.ts',
  'frontend/src/lib/dirty-work.ts',
  'frontend/src/components/system/FrontendFoundation.tsx',
  'frontend/src/components/system/FrontendStates.tsx',
  'frontend/src/components/system/ConnectionStatus.tsx',
  'frontend/src/components/system/ChunkRecoveryNotice.tsx'
]
for(const relative of required){
  if(!fs.existsSync(path.join(root,relative)))failures.push(relative+': required frontend architecture file missing')
}

if(failures.length){
  console.error('[frontend-architecture] FAILED')
  for(const failure of failures)console.error(' - '+failure)
  process.exit(1)
}
console.log('[frontend-architecture] PASS: frontend/server boundaries and migration ceiling verified.')
