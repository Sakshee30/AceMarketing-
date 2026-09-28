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
  if(/function\s+Alerts\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Alerts implementation after feature extraction.')
  }
  if(/function\s+Reports\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Reports implementation after feature extraction.')
  }
  if(/function\s+ExecutiveBriefs\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy ExecutiveBriefs implementation after feature extraction.')
  }
  if(/function\s+Integrations\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Integrations implementation after feature extraction.')
  }
  if(/function\s+DataFlows\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy DataFlows implementation after feature extraction.')
  }
  if(/function\s+Audiences\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Audiences implementation after feature extraction.')
  }
  if(/function\s+Planner\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Planner implementation after feature extraction.')
  }
  if(/function\s+Models\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Models implementation after feature extraction.')
  }
  if(/function\s+Compliance\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Compliance implementation after feature extraction.')
  }
  if(/function\s+Developers\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy Developers implementation after feature extraction.')
  }
  if(/function\s+DeliveryCenter\s*\(/.test(source)){
    failures.push('frontend/src/AcePlatform.tsx still contains the legacy DeliveryCenter implementation after feature extraction.')
  }
  for(const legacyName of ['Settings','UsersRolesSettings','GovernanceSettings','BillingUsageSettings']){
    if(new RegExp('function\\s+'+legacyName+'\\s*\\(').test(source)){
      failures.push('frontend/src/AcePlatform.tsx still contains the legacy '+legacyName+' implementation after Settings feature extraction.')
    }
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
  'frontend/src/features/delivery/data/delivery.api.ts',
  'frontend/src/features/delivery/pages/DeliveryCenterPage.tsx',
  'frontend/src/features/delivery/public.ts',
  'frontend/src/features/delivery/feature.manifest.ts',
  'frontend/src/features/developers/data/developers.api.ts',
  'frontend/src/features/developers/pages/DevelopersPage.tsx',
  'frontend/src/features/developers/public.ts',
  'frontend/src/features/developers/feature.manifest.ts',
  'frontend/src/features/compliance/data/compliance.api.ts',
  'frontend/src/features/compliance/pages/CompliancePage.tsx',
  'frontend/src/features/compliance/public.ts',
  'frontend/src/features/compliance/feature.manifest.ts',
  'frontend/src/features/settings/components/BillingUsageSettings.tsx',
  'frontend/src/features/settings/components/GovernanceSettings.tsx',
  'frontend/src/features/settings/components/UsersRolesSettings.tsx',
  'frontend/src/features/settings/ui/SettingsPrimitives.tsx',
  'frontend/src/features/settings/data/settings.api.ts',
  'frontend/src/features/settings/pages/SettingsPage.tsx',
  'frontend/src/features/settings/public.ts',
  'frontend/src/features/settings/feature.manifest.ts',
  'frontend/src/features/models/data/models.api.ts',
  'frontend/src/features/models/pages/ModelsPage.tsx',
  'frontend/src/features/models/public.ts',
  'frontend/src/features/models/feature.manifest.ts',
  'frontend/src/features/planner/data/planner.api.ts',
  'frontend/src/features/planner/pages/PlannerPage.tsx',
  'frontend/src/features/planner/public.ts',
  'frontend/src/features/planner/feature.manifest.ts',
  'frontend/src/features/audiences/data/audiences.api.ts',
  'frontend/src/features/audiences/pages/AudiencesPage.tsx',
  'frontend/src/features/audiences/public.ts',
  'frontend/src/features/audiences/feature.manifest.ts',
  'frontend/src/features/data-flows/data/data-flows.api.ts',
  'frontend/src/features/data-flows/pages/DataFlowsPage.tsx',
  'frontend/src/features/data-flows/public.ts',
  'frontend/src/features/data-flows/feature.manifest.ts',
  'frontend/src/features/integrations/data/integrations.api.ts',
  'frontend/src/features/integrations/pages/IntegrationsPage.tsx',
  'frontend/src/features/integrations/public.ts',
  'frontend/src/features/integrations/feature.manifest.ts',
  'frontend/src/features/executive-briefs/data/executive-briefs.api.ts',
  'frontend/src/features/executive-briefs/pages/ExecutiveBriefsPage.tsx',
  'frontend/src/features/executive-briefs/public.ts',
  'frontend/src/features/executive-briefs/feature.manifest.ts',
  'frontend/src/features/reports/data/reports.api.ts',
  'frontend/src/features/reports/pages/ReportsPage.tsx',
  'frontend/src/features/reports/public.ts',
  'frontend/src/features/reports/feature.manifest.ts',
  'frontend/src/features/alerts/data/alerts.api.ts',
  'frontend/src/features/alerts/pages/AlertsPage.tsx',
  'frontend/src/features/alerts/public.ts',
  'frontend/src/features/alerts/feature.manifest.ts',
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
