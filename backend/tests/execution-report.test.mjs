import test from 'node:test'
import assert from 'node:assert/strict'
import {architectureExecutionReport,validateArchitectureExecutionReport} from '../src/platform/execution-report.mjs'

test('architecture execution report separates implementation from verification',()=>{
  assert.equal(validateArchitectureExecutionReport(),true)
  const report=architectureExecutionReport()
  assert.equal(report.schemaVersion,'architecture-execution-report.v1')
  assert.equal(report.operationReadiness.migrationComplete,true)
  assert.equal(report.claims.productionQualified,false)
  assert.ok(report.featureCount>0)
  assert.equal(report.acceptanceTotal,66)
})

test('architecture execution report keeps all acceptance controls in explicit status buckets',()=>{
  const report=architectureExecutionReport()
  const all=[
    ...report.status.implemented,
    ...report.status.integrated,
    ...report.status.verified,
    ...report.status.productionQualified,
    ...report.status.blocked,
    ...report.status.deferred
  ]
  assert.equal(new Set(all).size,66)
  assert.equal(report.status.productionQualified.length,0)
})
