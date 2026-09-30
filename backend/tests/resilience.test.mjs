import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BulkheadRejectedError,
  CircuitOpenError,
  createBulkhead,
  createCircuitBreaker,
  createDependencyGuard,
  isRetryableFailure,
  withRetryBudget
} from '../src/platform/resilience.mjs'

test('circuit breaker opens after configured failures and rejects until reset',()=>{
  const circuit=createCircuitBreaker({name:'test',failureThreshold:2,resetAfterMs:10_000})
  circuit.before()
  circuit.failure()
  assert.equal(circuit.snapshot().state,'closed')
  circuit.before()
  circuit.failure()
  assert.equal(circuit.snapshot().state,'open')
  assert.throws(()=>circuit.before(),error=>error instanceof CircuitOpenError&&error.code==='circuit_open')
})

test('bulkhead rejects work beyond its concurrency budget',()=>{
  const bulkhead=createBulkhead({name:'test',limit:1})
  const release=bulkhead.acquire()
  assert.throws(()=>bulkhead.acquire(),error=>error instanceof BulkheadRejectedError&&error.code==='bulkhead_full')
  release()
  const releaseAgain=bulkhead.acquire()
  releaseAgain()
  assert.equal(bulkhead.snapshot().active,0)
})

test('retry budget retries transient known-safe failures only',async()=>{
  let attempts=0
  const result=await withRetryBudget(async()=>{
    attempts+=1
    if(attempts<3)throw Object.assign(new Error('temporary'),{status:503})
    return 'ok'
  },{attempts:3,baseDelayMs:1,maxDelayMs:2})
  assert.equal(result,'ok')
  assert.equal(attempts,3)

  assert.equal(isRetryableFailure(Object.assign(new Error('unknown'),{status:503,unknownOutcome:true})),false)
})

test('dependency guard combines circuit and bulkhead accounting',async()=>{
  const guard=createDependencyGuard({name:'guard',concurrency:1,failureThreshold:1,resetAfterMs:10_000})
  await assert.rejects(()=>guard.execute(async()=>{throw new Error('boom')}),/boom/)
  assert.equal(guard.snapshot().circuit.state,'open')
  await assert.rejects(()=>guard.execute(async()=>true),error=>error instanceof CircuitOpenError)
})
