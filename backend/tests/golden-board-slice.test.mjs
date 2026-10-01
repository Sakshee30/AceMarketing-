import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {goldenSlice,goldenSliceSnapshot,validateGoldenSlice} from '../src/platform/golden-slice-registry.mjs'

test('golden board move slice is fully traceable through frontend backend persistence realtime and evidence',()=>{
  assert.equal(validateGoldenSlice(),true)
  assert.equal(goldenSlice.id,'boards.move-card')
  assert.equal(goldenSlice.featureId,'boards')
  assert.equal(goldenSlice.status,'integrated')
})

test('golden board move includes recovery accessibility and load evidence',()=>{
  assert.match(goldenSlice.evidence.browserRecovery,/board-move-recovery/)
  assert.match(goldenSlice.evidence.load,/board-move/)
  assert.match(goldenSlice.evidence.runbook,/board-move-recovery/)
  assert.ok(goldenSlice.invariants.some(x=>x.includes('keyboard/non-drag')))
  assert.ok(goldenSlice.invariants.some(x=>x.includes('unknown-outcome')))
})

test('golden slice snapshot is read-only engineering metadata rather than a production qualification claim',()=>{
  const snapshot=goldenSliceSnapshot()
  assert.equal(snapshot.schemaVersion,'platform-golden-slice.v1')
  assert.equal(snapshot.item.status,'integrated')
  assert.notEqual(snapshot.item.status,'production-qualified')
  for(const file of Object.values(snapshot.item.evidence))assert.equal(fs.existsSync(file),true)
})
