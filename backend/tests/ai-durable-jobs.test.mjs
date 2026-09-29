import test from 'node:test'
import assert from 'node:assert/strict'
import {enqueueJob,getJob,requestJobCancellation} from '../src/queue.mjs'

test('AI job idempotency is stable inside a tenant and isolated across tenants',async()=>{
  const idempotencyKey='ai-test-'+Date.now()+'-stable'
  const first=await enqueueJob({
    workspaceId:'ws_ai_jobs_a',
    kind:'ai_hosted_task',
    payload:{task:'analyst'},
    idempotencyKey,
    inputSnapshot:{schemaVersion:'ai-input.v1',question:'first'}
  })
  const duplicate=await enqueueJob({
    workspaceId:'ws_ai_jobs_a',
    kind:'ai_hosted_task',
    payload:{task:'analyst'},
    idempotencyKey,
    inputSnapshot:{schemaVersion:'ai-input.v1',question:'duplicate delivery'}
  })
  const otherTenant=await enqueueJob({
    workspaceId:'ws_ai_jobs_b',
    kind:'ai_hosted_task',
    payload:{task:'analyst'},
    idempotencyKey,
    inputSnapshot:{schemaVersion:'ai-input.v1',question:'other tenant'}
  })

  assert.ok(first?.id)
  assert.equal(duplicate?.id,first.id)
  assert.notEqual(otherTenant?.id,first.id)
  assert.equal((await getJob({workspaceId:'ws_ai_jobs_b',id:first.id})),null)
  assert.equal((await getJob({workspaceId:'ws_ai_jobs_a',id:first.id}))?.id,first.id)
})

test('cancellation cannot cross tenant scope',async()=>{
  const job=await enqueueJob({
    workspaceId:'ws_cancel_owner',
    kind:'ml_task',
    payload:{task:'forecast_baseline',operation:'forecast_baseline'},
    idempotencyKey:'cancel-'+Date.now(),
    inputSnapshot:{schemaVersion:'ml-input.v1'}
  })
  assert.ok(job?.id)

  const foreign=await requestJobCancellation({workspaceId:'ws_cancel_foreign',id:job.id})
  assert.equal(foreign,null)
  assert.equal((await getJob({workspaceId:'ws_cancel_owner',id:job.id}))?.status,'pending')

  const own=await requestJobCancellation({workspaceId:'ws_cancel_owner',id:job.id})
  assert.equal(own?.status,'cancelled')
  assert.ok(own?.cancel_requested_at)
  assert.equal((await getJob({workspaceId:'ws_cancel_owner',id:job.id}))?.status,'cancelled')
})
