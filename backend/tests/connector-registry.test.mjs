import test from 'node:test'
import assert from 'node:assert/strict'
import {
  connectorCatalogSnapshot,
  connectorLifecycleStates,
  normalizeConnectorFailure,
  validateConnectorManifest
} from '../src/platform/connector-registry.mjs'

test('connector catalog publishes bounded manifests without credential values',()=>{
  const snapshot=connectorCatalogSnapshot()
  assert.equal(snapshot.schemaVersion,'connector-catalog.v1')
  assert.ok(snapshot.items.length>=6)
  const ids=new Set()
  for(const item of snapshot.items){
    assert.equal(validateConnectorManifest(item),true)
    assert.equal(ids.has(item.id),false)
    ids.add(item.id)
    assert.equal(item.credentialStorage,item.auth.type==='oauth2'?'encrypted-oauth-token':'server-secret-reference-only')
    assert.equal(item.connectionScope,'tenant-workspace')
    assert.ok(item.operations.length>0)
    assert.equal(JSON.stringify(item).includes('access_token'),false)
    assert.equal(JSON.stringify(item).includes('client_secret'),false)
  }
})

test('connector lifecycle contains explicit degraded and revoked states',()=>{
  const states=connectorLifecycleStates()
  for(const state of ['draft','authorizing','verifying','active','degraded','suspended','revoked','deleted']){
    assert.ok(states.includes(state))
  }
})

test('connector failure mapping distinguishes authorization rate limit transient and unknown outcome',()=>{
  assert.equal(normalizeConnectorFailure({status:401,message:'expired'}).kind,'unauthorized')
  assert.equal(normalizeConnectorFailure({status:429,message:'slow down'}).kind,'rate_limited')
  assert.equal(normalizeConnectorFailure({status:503,message:'down'}).kind,'transient')
  const unknown=normalizeConnectorFailure({code:'ETIMEDOUT',message:'timed out'},{requestMayHaveReachedProvider:true})
  assert.equal(unknown.kind,'unknown_outcome')
  assert.equal(unknown.retryable,false)
  assert.equal(normalizeConnectorFailure({status:422,message:'bad mapping'}).kind,'permanent')
})
