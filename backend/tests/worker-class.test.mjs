import test from 'node:test'
import assert from 'node:assert/strict'
import {workerClassPolicy,workerClassNames} from '../src/platform/worker-class.mjs'

test('worker classes are explicit and bounded',()=>{
  assert.deepEqual(workerClassNames(),['all','general','webhook','ai-document'])
  assert.equal(workerClassPolicy('all').includeKinds,null)
})

test('general worker excludes isolated provider and document work',()=>{
  const policy=workerClassPolicy('general')
  assert.equal(policy.includeKinds,null)
  assert.ok(policy.excludeKinds.includes('webhook_delivery'))
  assert.ok(policy.excludeKinds.includes('ml_task'))
  assert.ok(policy.excludeKinds.includes('knowledge_embedding'))
})

test('webhook worker leases webhook deliveries only',()=>{
  assert.deepEqual(workerClassPolicy('webhook').includeKinds,['webhook_delivery'])
})

test('ai-document worker contains expensive or provider-bound job classes',()=>{
  const policy=workerClassPolicy('ai-document')
  assert.ok(policy.includeKinds.includes('ai_hosted_task'))
  assert.ok(policy.includeKinds.includes('ml_task'))
  assert.ok(policy.includeKinds.includes('knowledge_search'))
  assert.equal(policy.excludeKinds,null)
})

test('unknown worker class fails closed',()=>{
  assert.throws(()=>workerClassPolicy('mystery'),/unsupported WORKER_CLASS/)
})
