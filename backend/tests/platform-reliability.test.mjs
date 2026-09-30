import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash,randomUUID} from 'node:crypto'
import {embeddedDatabase} from '../src/database.mjs'
import {
  reserveIdempotency,completeIdempotency,appendOutboxEvent,claimOutboxEvents,
  markOutboxPublished,recordInboxEvent,markInboxProcessed
} from '../src/platform/reliability-store.mjs'

const workspaceId='ws_test_reliability'

test('idempotency preserves the first request fingerprint and completed response',{skip:embeddedDatabase},async()=>{
  const operationId='test.operation.'+randomUUID()
  const key='key-'+randomUUID()
  const hash=createHash('sha256').update('same-request').digest('hex')
  const first=await reserveIdempotency({workspaceId,operationId,key,requestHash:hash})
  assert.equal(first.status,'pending')
  const completed=await completeIdempotency({workspaceId,operationId,key,responseStatus:201,responseBody:{ok:true}})
  assert.equal(completed.status,'completed')
  const replay=await reserveIdempotency({workspaceId,operationId,key,requestHash:hash})
  assert.equal(replay.status,'completed')
  await assert.rejects(
    ()=>reserveIdempotency({workspaceId,operationId,key,requestHash:'different-hash'}),
    error=>error?.code==='idempotency_key_reused'
  )
})

test('outbox leasing fences publication to the lease owner',{skip:embeddedDatabase},async()=>{
  const id='outbox_'+randomUUID()
  await appendOutboxEvent({id,workspaceId,eventType:'test.created',payload:{id}})
  const worker='worker_'+randomUUID()
  const leased=await claimOutboxEvents({workerId:worker,limit:50})
  const event=leased.find(item=>item.id===id)
  assert.ok(event)
  assert.equal(await markOutboxPublished({id,workerId:'wrong-worker'}),null)
  const published=await markOutboxPublished({id,workerId:worker})
  assert.equal(published.status,'published')
})

test('inbox deduplicates provider events and detects payload conflicts',{skip:embeddedDatabase},async()=>{
  const source='test-provider'
  const eventId='evt_'+randomUUID()
  const payloadHash=createHash('sha256').update('payload').digest('hex')
  const first=await recordInboxEvent({source,eventId,workspaceId,payloadHash})
  const duplicate=await recordInboxEvent({source,eventId,workspaceId,payloadHash})
  assert.equal(first.event_id,duplicate.event_id)
  await assert.rejects(
    ()=>recordInboxEvent({source,eventId,workspaceId,payloadHash:'different'}),
    error=>error?.code==='inbox_event_conflict'
  )
  const processed=await markInboxProcessed({source,eventId,result:{ok:true}})
  assert.ok(processed.processed_at)
})
