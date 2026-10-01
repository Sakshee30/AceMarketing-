import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {architectureEvidenceRecords,evidenceRegistrySnapshot,validateEvidenceRegistry} from '../src/platform/evidence-registry.mjs'
import {acceptanceControlRegistry} from '../src/platform/acceptance-register.mjs'

test('every implemented acceptance control has requirement/feature/commit evidence metadata',()=>{
  assert.equal(validateEvidenceRegistry(),true)
  const implemented=acceptanceControlRegistry.filter(item=>item.status==='implemented')
  assert.equal(architectureEvidenceRecords.length,implemented.length)
  assert.deepEqual(
    architectureEvidenceRecords.map(item=>item.requirementId).sort(),
    implemented.map(item=>item.id).sort()
  )
})

test('repository evidence paths exist and remain implemented rather than overclaimed',()=>{
  const root=process.cwd()
  for(const record of architectureEvidenceRecords){
    assert.match(record.requirementId,/^G-\d{2}$/)
    assert.ok(record.featureId)
    assert.ok(record.testedCommit)
    assert.equal(record.verificationState,'implemented')
    for(const evidence of record.evidencePaths){
      assert.equal(
        fs.existsSync(path.join(root,evidence)),
        true,
        record.requirementId+' evidence missing: '+evidence
      )
    }
  }
})

test('evidence snapshot carries tested commit and does not claim production qualification',()=>{
  const snapshot=evidenceRegistrySnapshot()
  assert.equal(snapshot.schemaVersion,'platform-evidence-registry.v1')
  assert.ok(snapshot.testedCommit)
  assert.ok(snapshot.items.length>0)
  assert.equal(snapshot.items.some(item=>item.verificationState==='production-qualified'),false)
  assert.equal(snapshot.items.some(item=>item.verificationState==='verified'),false)
})
