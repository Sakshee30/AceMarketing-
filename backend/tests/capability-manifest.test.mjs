import test from 'node:test'
import assert from 'node:assert/strict'
import {
  capabilityManifestSnapshot,
  capabilityStates,
  providerChangePreflight,
  validateCapabilityDependencyGraph,
  validateCapabilityManifest
} from '../src/platform/capability-manifest.mjs'

test('capability manifests declare complete provider semantics',()=>{
  const snapshot=capabilityManifestSnapshot()
  assert.ok(snapshot.items.length>=8)
  const ids=new Set()
  for(const item of snapshot.items){
    assert.equal(validateCapabilityManifest(item),true)
    assert.equal(ids.has(item.id),false)
    ids.add(item.id)
    assert.ok(item.healthChecks.length>0)
    assert.ok(item.telemetry.length>0)
    assert.ok(item.fallback.mode)
    assert.ok(item.configurationSchema)
    assert.ok(item.migrationClass)
  }
  assert.equal(validateCapabilityDependencyGraph(snapshot.items),true)
  for(const state of ['REQUIRED','OPTIONAL','DEGRADED','DISABLED'])assert.ok(capabilityStates().includes(state))
})

test('required capability cannot be migrated to disabled',()=>{
  const result=providerChangePreflight({
    capability:'persistence',
    fromProvider:'postgres',
    toProvider:'disabled',
    environment:'production',
    evidence:{}
  })
  assert.equal(result.allowed,false)
  assert.ok(result.reasons.some(reason=>reason.includes('cannot be disabled')))
})

test('production cache bypass requires capacity evidence',()=>{
  const denied=providerChangePreflight({
    capability:'cache',
    fromProvider:'redis',
    toProvider:'disabled',
    environment:'production',
    evidence:{}
  })
  assert.equal(denied.allowed,false)
  const allowed=providerChangePreflight({
    capability:'cache',
    fromProvider:'redis',
    toProvider:'disabled',
    environment:'production',
    evidence:{capacityValidated:true}
  })
  assert.equal(allowed.allowed,true)
})

test('production AI provider changes require data-policy evidence',()=>{
  const denied=providerChangePreflight({
    capability:'ai',
    fromProvider:'local',
    toProvider:'external',
    environment:'production',
    evidence:{}
  })
  assert.equal(denied.allowed,false)
  const allowed=providerChangePreflight({
    capability:'ai',
    fromProvider:'local',
    toProvider:'external',
    environment:'production',
    evidence:{dataPolicyValidated:true}
  })
  assert.equal(allowed.allowed,true)
})
