import test from 'node:test'
import assert from 'node:assert/strict'
import {createConcurrencyAdmission} from '../src/platform/admission-control.mjs'
import {problemDetails} from '../src/platform/problem-details.mjs'
import {createRequestContext,remainingRequestBudget} from '../src/platform/request-context.mjs'
import {normalizeIdempotencyKey,requestFingerprint} from '../src/platform/idempotency.mjs'

test('request context never trusts malformed request IDs',()=>{
  const context=createRequestContext({req:{headers:{'x-request-id':'bad id with spaces'}},deadlineMs:1000})
  assert.ok(context.requestId)
  assert.notEqual(context.requestId,'bad id with spaces')
  assert.ok(remainingRequestBudget(context)>0)
})

test('admission control is bounded and releases exactly once',()=>{
  const admission=createConcurrencyAdmission({limit:1})
  const release=admission.acquire()
  assert.equal(typeof release,'function')
  assert.equal(admission.acquire(),null)
  release()
  release()
  assert.equal(admission.snapshot().active,0)
  assert.equal(typeof admission.acquire(),'function')
})

test('problem details separates retryable server failures',()=>{
  assert.equal(problemDetails({status:503}).retryable,true)
  assert.equal(problemDetails({status:403}).retryable,false)
})

test('idempotency keys and request fingerprints are deterministic',()=>{
  assert.equal(normalizeIdempotencyKey('abc-123'),'abc-123')
  assert.throws(()=>normalizeIdempotencyKey('not valid key'))
  const left=requestFingerprint({method:'POST',path:'/x',workspaceId:'w1',body:{a:1}})
  const right=requestFingerprint({method:'POST',path:'/x',workspaceId:'w1',body:{a:1}})
  assert.equal(left,right)
})
