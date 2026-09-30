import test from 'node:test'
import assert from 'node:assert/strict'
import {pool} from '../src/database.mjs'
import {
  createEmergencyControl,
  evaluateRuntimeControl,
  latestRuntimeSnapshot,
  publishRuntimeSnapshot,
  revokeEmergencyControl,
  verifyRuntimeSnapshot
} from '../src/platform/runtime-configuration.mjs'

test('signed runtime snapshot verifies and locks safety features',{skip:!pool},async()=>{
  process.env.RUNTIME_CONFIG_SIGNING_SECRET='runtime-config-test-secret'
  const snapshot=await publishRuntimeSnapshot({
    environment:'test',
    features:{ai:'enabled',billing:'read_only'},
    createdBy:'platform-admin@example.test'
  })
  const verified=verifyRuntimeSnapshot(snapshot)
  assert.equal(verified.valid,true)
  assert.equal(snapshot.payload.features.identity,'enabled')
  assert.equal(snapshot.payload.features.billing,'read_only')

  await assert.rejects(
    ()=>publishRuntimeSnapshot({
      environment:'test',
      features:{identity:'disabled'},
      createdBy:'platform-admin@example.test'
    }),
    /locked safety feature/
  )
})

test('emergency AI control is time bounded and reflected in signed snapshot',{skip:!pool},async()=>{
  process.env.RUNTIME_CONFIG_SIGNING_SECRET='runtime-config-test-secret'
  const emergency=await createEmergencyControl({
    scopeType:'platform',
    controlType:'suspend_ai',
    reason:'test incident containment',
    durationMinutes:15,
    createdBy:'security@example.test'
  })
  const snapshot=await publishRuntimeSnapshot({
    environment:'test',
    createdBy:'security@example.test'
  })
  const decision=evaluateRuntimeControl({
    snapshot,
    featureId:'ai',
    scopeType:'platform',
    operation:'admit'
  })
  assert.equal(decision.allowed,false)
  assert.equal(decision.code,'ai_admission_suspended')

  const revoked=await revokeEmergencyControl({
    id:emergency.id,
    revokedBy:'security@example.test',
    expectedVersion:emergency.version
  })
  assert.equal(revoked.state,'revoked')
  const next=await publishRuntimeSnapshot({
    environment:'test',
    createdBy:'security@example.test'
  })
  const allowed=evaluateRuntimeControl({
    snapshot:next,
    featureId:'ai',
    scopeType:'platform',
    operation:'admit'
  })
  assert.equal(allowed.allowed,true)
})

test('tampered runtime snapshots fail closed',{skip:!pool},async()=>{
  process.env.RUNTIME_CONFIG_SIGNING_SECRET='runtime-config-test-secret'
  const snapshot=await publishRuntimeSnapshot({
    environment:'test',
    createdBy:'platform-admin@example.test'
  })
  const tampered={
    ...snapshot,
    payload:{...snapshot.payload,features:{...snapshot.payload.features,ai:'disabled'}}
  }
  const verified=verifyRuntimeSnapshot(tampered)
  assert.equal(verified.valid,false)
  const decision=evaluateRuntimeControl({
    snapshot:tampered,
    featureId:'ai',
    scopeType:'platform',
    operation:'admit'
  })
  assert.equal(decision.allowed,false)
  assert.equal(decision.code,'runtime_config_invalid')
})

test('latest runtime snapshot exposes one active version per environment',{skip:!pool},async()=>{
  process.env.RUNTIME_CONFIG_SIGNING_SECRET='runtime-config-test-secret'
  const first=await publishRuntimeSnapshot({environment:'test',createdBy:'one@example.test'})
  const second=await publishRuntimeSnapshot({environment:'test',createdBy:'two@example.test'})
  assert.ok(second.version>first.version)
  const latest=await latestRuntimeSnapshot('test')
  assert.equal(latest?.version,second.version)
})
