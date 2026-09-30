import test from 'node:test'
import assert from 'node:assert/strict'
import {pool} from '../src/database.mjs'
import {
  advanceProviderMigration,
  createProviderMigration,
  listProviderMigrations,
  requestProviderRollback
} from '../src/platform/provider-migration-store.mjs'

test('provider migration requires compatibility evidence before canary',{skip:!pool},async()=>{
  const migration=await createProviderMigration({
    capability:'email-delivery',
    environment:'test',
    fromProvider:'smtp-a',
    toProvider:'smtp-b',
    requestedBy:'operator@example.test',
    rollbackPlan:{mode:'restore-source'}
  })
  const validating=await advanceProviderMigration({
    id:migration.id,
    toState:'validating',
    actor:'operator@example.test',
    expectedVersion:migration.version
  })
  const shadow=await advanceProviderMigration({
    id:migration.id,
    toState:'shadowing',
    actor:'operator@example.test',
    expectedVersion:validating.version
  })
  await assert.rejects(
    ()=>advanceProviderMigration({
      id:migration.id,
      toState:'canary',
      trafficPercent:10,
      actor:'operator@example.test',
      expectedVersion:shadow.version
    }),
    /validated compatibility report/
  )
})

test('provider migration supports gradual canary and controlled rollback',{skip:!pool},async()=>{
  const migration=await createProviderMigration({
    capability:'search',
    environment:'test',
    fromProvider:'postgres',
    toProvider:'opensearch',
    requestedBy:'operator@example.test',
    rollbackPlan:{mode:'return-to-postgres'}
  })
  const validating=await advanceProviderMigration({id:migration.id,toState:'validating',actor:'operator@example.test',expectedVersion:migration.version})
  const shadow=await advanceProviderMigration({id:migration.id,toState:'shadowing',actor:'operator@example.test',expectedVersion:validating.version})
  const canary=await advanceProviderMigration({
    id:migration.id,
    toState:'canary',
    trafficPercent:10,
    compatibilityReport:{validated:true,semanticDiffRate:0},
    actor:'operator@example.test',
    expectedVersion:shadow.version
  })
  assert.equal(canary.traffic_percent,10)
  const canary50=await advanceProviderMigration({
    id:migration.id,
    toState:'canary',
    trafficPercent:50,
    compatibilityReport:{validated:true,semanticDiffRate:0},
    actor:'operator@example.test',
    expectedVersion:canary.version
  })
  await assert.rejects(
    ()=>advanceProviderMigration({
      id:migration.id,
      toState:'canary',
      trafficPercent:25,
      compatibilityReport:{validated:true},
      actor:'operator@example.test',
      expectedVersion:canary50.version
    }),
    /cannot decrease/
  )
  const rollback=await requestProviderRollback({
    id:migration.id,
    actor:'operator@example.test',
    expectedVersion:canary50.version,
    reason:'test rollback'
  })
  assert.equal(rollback.state,'rollback_requested')
  const rolling=await advanceProviderMigration({
    id:migration.id,
    toState:'rolling_back',
    actor:'operator@example.test',
    expectedVersion:rollback.version
  })
  assert.equal(rolling.traffic_percent,0)
})

test('provider cutover requires explicit boundary and moves to 100 percent',{skip:!pool},async()=>{
  const migration=await createProviderMigration({
    capability:'object-storage',
    environment:'test',
    fromProvider:'s3-a',
    toProvider:'s3-b',
    requestedBy:'operator@example.test'
  })
  const validating=await advanceProviderMigration({id:migration.id,toState:'validating',actor:'operator@example.test',expectedVersion:migration.version})
  const shadow=await advanceProviderMigration({id:migration.id,toState:'shadowing',actor:'operator@example.test',expectedVersion:validating.version})
  const canary=await advanceProviderMigration({
    id:migration.id,toState:'canary',trafficPercent:20,
    compatibilityReport:{validated:true},
    actor:'operator@example.test',expectedVersion:shadow.version
  })
  await assert.rejects(
    ()=>advanceProviderMigration({
      id:migration.id,toState:'cutover',
      compatibilityReport:{validated:true},
      actor:'operator@example.test',expectedVersion:canary.version
    }),
    /cutover boundary/
  )
  const cutover=await advanceProviderMigration({
    id:migration.id,toState:'cutover',
    compatibilityReport:{validated:true},
    cutoverBoundary:{checkpoint:'object-version-123'},
    actor:'operator@example.test',expectedVersion:canary.version
  })
  assert.equal(cutover.traffic_percent,100)
  const items=await listProviderMigrations({environment:'test'})
  assert.ok(items.some(item=>item.id===migration.id))
})
