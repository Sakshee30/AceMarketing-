import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {acceptanceControlRegistry,acceptanceRegisterSnapshot,validateAcceptanceRegister} from '../src/platform/acceptance-register.mjs'

test('acceptance register contains every G-01 through G-66 control exactly once',()=>{
  assert.equal(validateAcceptanceRegister(),true)
  assert.equal(acceptanceControlRegistry.length,66)
  assert.equal(new Set(acceptanceControlRegistry.map(item=>item.id)).size,66)
  assert.equal(acceptanceControlRegistry[0].id,'G-01')
  assert.equal(acceptanceControlRegistry.at(-1).id,'G-66')
})

test('implemented controls reference repository evidence without claiming verification',()=>{
  const root=process.cwd()
  for(const item of acceptanceControlRegistry.filter(item=>item.status==='implemented')){
    assert.ok(item.evidence.length>0,item.id+' implemented without evidence path')
    for(const evidence of item.evidence){
      assert.equal(fs.existsSync(path.join(root,evidence)),true,item.id+' evidence missing: '+evidence)
    }
  }
  assert.equal(acceptanceControlRegistry.some(item=>item.status==='verified'),false)
  assert.equal(acceptanceControlRegistry.some(item=>item.status==='production-qualified'),false)
})

test('nonwaivable controls are explicitly marked',()=>{
  const ids=acceptanceControlRegistry.filter(item=>item.nonwaivable).map(item=>item.id).sort()
  assert.deepEqual(ids,['G-09','G-10','G-11','G-18','G-22','G-31','G-35'])
})

test('public snapshot reports status counts honestly',()=>{
  const snapshot=acceptanceRegisterSnapshot()
  assert.equal(snapshot.schemaVersion,'platform-acceptance-register.v1')
  assert.equal(Object.values(snapshot.summary).reduce((sum,n)=>sum+n,0),66)
  assert.equal(snapshot.summary.verified,0)
  assert.equal(snapshot.summary['production-qualified'],0)
})
