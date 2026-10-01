import {advanceProviderMigration,createProviderMigration,providerMigrationOverride,requestProviderRollback} from '../../../../../../src/platform/provider-migration-store.mjs'
import {latestRuntimeSnapshot,publishRuntimeSnapshot} from '../../../../../../src/platform/runtime-configuration.mjs'

export const handleMigrateProvider=async({
  mode,
  input,
  actorId,
  create=createProviderMigration,
  advance=advanceProviderMigration,
  rollback=requestProviderRollback,
  latest=latestRuntimeSnapshot,
  publish=publishRuntimeSnapshot,
  migrationOverride=providerMigrationOverride
})=>{
  const action=String(mode||'create').trim()
  const body=input&&typeof input==='object'&&!Array.isArray(input)?input:{}
  const actor=String(actorId||'').trim()
  if(!actor)throw Object.assign(new Error('provider migration actor required'),{status:400,code:'provider_migration_actor_required'})
  if(action==='create'){
    return create({
      capability:body.capability,
      environment:body.environment||process.env.NODE_ENV||'development',
      fromProvider:body.fromProvider,
      toProvider:body.toProvider,
      strategy:body.strategy||'shadow',
      compatibilityReport:body.compatibilityReport||{},
      cutoverBoundary:body.cutoverBoundary||{},
      rollbackPlan:body.rollbackPlan||{},
      requestedBy:actor,
      sourceChangeId:body.sourceChangeId||null,
      dependencyInventory:body.dependencyInventory||{},
      capacityEvidence:body.capacityEvidence||{},
      verificationEvidence:body.verificationEvidence||{},
      irreversibleSteps:Array.isArray(body.irreversibleSteps)?body.irreversibleSteps:[]
    })
  }
  const id=String(body.id||'').trim()
  if(!id)throw Object.assign(new Error('provider migration id required'),{status:400,code:'provider_migration_id_required'})
  let migration
  if(action==='transition'){
    migration=await advance({
      id,
      toState:String(body.toState||''),
      trafficPercent:body.trafficPercent,
      compatibilityReport:body.compatibilityReport,
      cutoverBoundary:body.cutoverBoundary,
      actor,
      expectedVersion:body.expectedVersion,
      failureReason:body.failureReason||null,
      dependencyInventory:body.dependencyInventory,
      capacityEvidence:body.capacityEvidence,
      verificationEvidence:body.verificationEvidence,
      irreversibleSteps:body.irreversibleSteps,
      pointOfNoReturn:body.pointOfNoReturn===true
    })
  }else if(action==='rollback'){
    migration=await rollback({id,actor,expectedVersion:body.expectedVersion,reason:body.reason||null})
  }else{
    throw Object.assign(new Error('unsupported provider migration mode'),{status:400,code:'provider_migration_mode_invalid'})
  }
  const current=await latest(migration.environment)
  const providerOverrides={
    ...(current?.payload?.providerOverrides||{}),
    [migration.capability]:migrationOverride(migration)
  }
  const snapshot=await publish({environment:migration.environment,providerOverrides,createdBy:actor})
  return {migration,snapshotVersion:snapshot.version,snapshotLeaseExpiresAt:snapshot.leaseExpiresAt}
}
