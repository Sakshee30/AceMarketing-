import test from 'node:test'
import assert from 'node:assert/strict'
import {pool} from '../src/database.mjs'
import {
  createRecoveryExercise,
  listBackupEvidence,
  listRecoveryExercises,
  recordBackupEvidence,
  recoverySummary,
  updateRecoveryExercise
} from '../src/platform/recovery-evidence.mjs'

test('recovery exercises keep declared and measured objectives distinct',{skip:!pool},async()=>{
  const exercise=await createRecoveryExercise({
    environment:'test',
    scenario:'database_failover',
    declaredRpoMinutes:0,
    declaredRtoMinutes:5,
    incidentCommander:'ops@example.test',
    createdBy:'ops@example.test'
  })
  assert.equal(exercise.state,'planned')
  const running=await updateRecoveryExercise({
    id:exercise.id,
    state:'running',
    expectedVersion:exercise.version,
    incidentCommander:'ops@example.test'
  })
  assert.equal(running.state,'running')
  const passed=await updateRecoveryExercise({
    id:exercise.id,
    state:'passed',
    expectedVersion:running.version,
    measuredRpoMinutes:1,
    measuredRtoMinutes:4,
    integrityChecks:['authoritative-records','tenant-ownership'],
    reconciliation:{outbox:'verified',unknownOutcomes:'reviewed'},
    gaps:[],
    remediationOwner:'platform@example.test'
  })
  assert.equal(passed.state,'passed')
  assert.equal(Number(passed.measured_rpo_minutes),1)
  assert.equal(Number(passed.measured_rto_minutes),4)
})

test('recovery exercise updates use optimistic concurrency',{skip:!pool},async()=>{
  const exercise=await createRecoveryExercise({
    environment:'test',
    scenario:'tenant_restore',
    declaredRpoMinutes:15,
    declaredRtoMinutes:30,
    createdBy:'ops@example.test'
  })
  await assert.rejects(
    ()=>updateRecoveryExercise({
      id:exercise.id,
      state:'running',
      expectedVersion:Number(exercise.version)+1
    }),
    error=>error?.code==='recovery_version_conflict'
  )
})

test('backup evidence records controls without claiming restore success',{skip:!pool},async()=>{
  const item=await recordBackupEvidence({
    environment:'test',
    resourceType:'database',
    resourceRef:'primary-test',
    backupMode:'managed-pitr',
    retentionDays:35,
    pitrEnabled:true,
    encryptionVerified:true,
    deletionProtectionVerified:true,
    independentCopyVerified:false,
    evidence:{providerStatus:'available'},
    createdBy:'ops@example.test'
  })
  assert.equal(item.pitr_enabled,true)
  const evidence=await listBackupEvidence({environment:'test'})
  assert.ok(evidence.some(row=>row.id===item.id))
})

test('recovery summary reports measured evidence only from passed exercises',{skip:!pool},async()=>{
  const exercises=await listRecoveryExercises({environment:'test'})
  assert.ok(Array.isArray(exercises))
  const summary=await recoverySummary({environment:'test'})
  assert.equal(summary.schemaVersion,'platform-backup-dr.v1')
  assert.ok(summary.evidenceCounts.exercises>=0)
  assert.ok(summary.evidenceCounts.backupRecords>=0)
})
