import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {aiTaskWorkerExecutionDecision} from '../src/ai-governance-store.mjs'

const base={
  task:'analyst',
  requestedModel:'gpt-6-astra',
  policy:{enabled:true,approvedRequestedModel:null},
  platform:{enabled:true,allowedRequestedModel:'gpt-6-astra'},
  deploymentControl:{mode:'active',canaryPercent:100},
  deploymentDecision:{bucket:5,shadow:false}
}

test('worker execution fails closed when tenant or platform disables a task',()=>{
  assert.equal(aiTaskWorkerExecutionDecision({...base,policy:{...base.policy,enabled:false}}).allowed,false)
  assert.equal(aiTaskWorkerExecutionDecision({...base,platform:{...base.platform,enabled:false}}).allowed,false)
})

test('worker execution respects live shadow and canary changes after a job was queued',()=>{
  const shadow=aiTaskWorkerExecutionDecision({...base,deploymentControl:{mode:'shadow',canaryPercent:0}})
  assert.equal(shadow.allowed,false)
  assert.match(shadow.reasons.join(' '),/shadow-only/)

  const explicitShadow=aiTaskWorkerExecutionDecision({
    ...base,
    deploymentControl:{mode:'shadow',canaryPercent:0},
    deploymentDecision:{bucket:5,shadow:true}
  })
  assert.equal(explicitShadow.allowed,true)

  const narrowed=aiTaskWorkerExecutionDecision({
    ...base,
    deploymentControl:{mode:'canary',canaryPercent:5},
    deploymentDecision:{bucket:7,shadow:false}
  })
  assert.equal(narrowed.allowed,false)

  const retained=aiTaskWorkerExecutionDecision({
    ...base,
    deploymentControl:{mode:'canary',canaryPercent:10},
    deploymentDecision:{bucket:7,shadow:false}
  })
  assert.equal(retained.allowed,true)
})

test('worker execution rejects requested model substitution at execution time',()=>{
  const decision=aiTaskWorkerExecutionDecision({
    ...base,
    requestedModel:'unexpected-model'
  })
  assert.equal(decision.allowed,false)
  assert.ok(decision.reasons.some(reason=>reason.includes('requested model')))
})

test('durable AI job state does not depend on Redis and worker provider execution is outside a transaction callback',async()=>{
  const queue=await readFile(new URL('../src/queue.mjs',import.meta.url),'utf8')
  const worker=await readFile(new URL('../src/worker.mjs',import.meta.url),'utf8')
  const runtime=await readFile(new URL('../src/ai-runtime.mjs',import.meta.url),'utf8')

  assert.equal(/from ['"][^'"]*redis/i.test(queue),false)
  assert.equal(/from ['"][^'"]*redis/i.test(worker),false)
  assert.match(queue,/BEGIN/)
  assert.match(queue,/COMMIT/)
  assert.match(worker,/executeHostedAiJob\(job\)/)
  assert.match(worker,/executeMlJob\(job\)/)
  assert.equal(/BEGIN[\s\S]{0,5000}executeHostedAiJob/.test(worker),false)
  assert.equal(/BEGIN[\s\S]{0,5000}executeMlJob/.test(worker),false)
  assert.match(runtime,/enqueueJob\(/)
})
