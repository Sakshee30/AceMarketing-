import test from 'node:test'
import assert from 'node:assert/strict'
import {capabilitySnapshot,dependencySnapshot,providerSnapshot,validateDependencyGraph} from '../src/platform/capability-registry.mjs'
import {observedPage} from '../src/control-api.mjs'

test('capability dependency graph is acyclic and bounded',()=>{
  assert.equal(validateDependencyGraph(),true)
  const snapshot=dependencySnapshot()
  assert.equal(snapshot.valid,true)
  assert.ok(snapshot.nodes.some(node=>node.id==='identity'))
  assert.ok(snapshot.edges.some(edge=>edge.from==='access'&&edge.to==='memberships'))
})

test('provider catalog reports explicit configured or unconfigured health',()=>{
  const snapshot=providerSnapshot()
  assert.equal(snapshot.schemaVersion,'platform-providers.v1')
  assert.ok(snapshot.providers.length>0)
  for(const provider of snapshot.providers){
    if('health' in provider)assert.ok(['configured','unconfigured'].includes(provider.health))
  }
})

test('control API read model exposes safe operational state without secret values',async()=>{
  const overview=await observedPage('overview')
  assert.ok(overview.generatedAt)
  assert.ok(overview.environment)
  const secrets=await observedPage('secrets')
  assert.ok(Array.isArray(secrets.items))
  assert.equal(JSON.stringify(secrets).includes(String(process.env.DATABASE_URL||'__not_configured__')),false)
})

test('locked platform features cannot be represented as disabled by runtime feature flags',()=>{
  const snapshot=capabilitySnapshot()
  for(const item of snapshot.features.filter(feature=>feature.locked)){
    assert.equal(item.desired,'enabled')
    assert.equal(item.actual,'enabled')
  }
})
