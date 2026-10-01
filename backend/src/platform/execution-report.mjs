import {acceptanceControlRegistry} from './acceptance-register.mjs'
import {platformFeatureTraceability} from './feature-traceability.mjs'
import {operationRegistryReadiness} from './operation-registry.mjs'

const commitRef=()=>String(process.env.GITHUB_SHA||process.env.ACE_RELEASE_SHA||'unverified-local')

const statusBuckets=()=>({
  implemented:acceptanceControlRegistry.filter(item=>item.status==='implemented').map(item=>item.id),
  integrated:acceptanceControlRegistry.filter(item=>item.status==='integrated').map(item=>item.id),
  verified:acceptanceControlRegistry.filter(item=>item.status==='verified').map(item=>item.id),
  productionQualified:acceptanceControlRegistry.filter(item=>item.status==='production-qualified').map(item=>item.id),
  blocked:acceptanceControlRegistry.filter(item=>item.status==='not-started').map(item=>item.id),
  deferred:acceptanceControlRegistry.filter(item=>item.status==='designed').map(item=>item.id)
})

export const architectureExecutionReport=()=>({
  schemaVersion:'architecture-execution-report.v1',
  testedCommit:commitRef(),
  generatedAt:new Date().toISOString(),
  operationReadiness:operationRegistryReadiness(),
  featureCount:platformFeatureTraceability.length,
  acceptanceTotal:acceptanceControlRegistry.length,
  status:statusBuckets(),
  claims:{
    repositoryImplementationComplete:operationRegistryReadiness().migrationComplete,
    productionQualified:false,
    note:'Repository architecture evidence is distinct from environment-specific load, security, failover, restore and production qualification evidence.'
  },
  recovery:{
    rollback:'Use immutable release rollback or forward repair according to docs/PRODUCTION_RUNBOOK.md and the owning migration/runbook.',
    unknownOutcome:'Do not convert unknown outcomes into success; reconcile against authoritative durable state.'
  }
})

export const validateArchitectureExecutionReport=()=>{
  const report=architectureExecutionReport()
  if(report.acceptanceTotal!==66)throw new Error('execution report acceptance total must be 66')
  if(report.featureCount<1)throw new Error('execution report feature catalogue is empty')
  if(!report.operationReadiness.migrationComplete)throw new Error('execution report requires canonical operation migration completion')
  const represented=new Set([
    ...report.status.implemented,
    ...report.status.integrated,
    ...report.status.verified,
    ...report.status.productionQualified,
    ...report.status.blocked,
    ...report.status.deferred
  ])
  if(represented.size!==report.acceptanceTotal)throw new Error('execution report status coverage mismatch')
  if(report.claims.productionQualified!==false)throw new Error('execution report must not self-certify production qualification')
  if(!report.testedCommit)throw new Error('execution report tested commit missing')
  return true
}
