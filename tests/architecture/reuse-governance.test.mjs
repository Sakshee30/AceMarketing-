import test from 'node:test'
import assert from 'node:assert/strict'
import {foundationReuseSnapshot,validateFoundationReuseGovernance} from '../../backend/src/platform/reuse-governance.mjs'

test('foundation compatibility policy is complete and repository-backed',()=>{
  assert.equal(validateFoundationReuseGovernance(),true)
  const snapshot=foundationReuseSnapshot()
  assert.match(snapshot.foundationVersion,/^\d+\.\d+\.\d+$/)
  assert.ok(snapshot.supportedProfiles.includes('high-scale'))
  assert.ok(snapshot.supportedProfiles.includes('ai-enabled'))
})

test('breaking removals require notice, migration guidance and compatibility evidence',()=>{
  const policy=foundationReuseSnapshot().deprecationPolicy
  assert.ok(policy.minimumNoticeDays>=1)
  assert.equal(policy.removalRequiresMigrationGuide,true)
  assert.equal(policy.removalRequiresCompatibilityTest,true)
})

test('reference product status does not self-certify production qualification',()=>{
  const reference=foundationReuseSnapshot().referenceProduct
  assert.equal(reference.repository,'Sakshee30/AceMarketing-')
  assert.equal(reference.verificationState,'repository-tested')
  assert.notEqual(reference.verificationState,'production-qualified')
})
