import test from 'node:test'
import assert from 'node:assert/strict'
import {appendTrackedEvent,listTrackedEvents,trackedEventStats} from '../src/tracked-events.mjs'

test('tracked events persist durably and are tenant scoped',async()=>{
  const workspaceId='ws_event_test'
  await appendTrackedEvent(workspaceId,{
    id:'evt_durable_1',
    event:'page.viewed',
    eventCategory:'analytics',
    receivedAt:new Date().toISOString(),
    source:'test',
    visitorId:'visitor_1',
    campaign:'campaign_1',
    email:'must-not-persist@example.test',
    emailSha256:'hash_email'
  })
  const events=await listTrackedEvents(workspaceId,{limit:10})
  assert.equal(events.length,1)
  assert.equal(events[0].id,'evt_durable_1')
  assert.equal(events[0].visitorId,'visitor_1')
  assert.equal(events[0].email,undefined)
  assert.equal(events[0].emailSha256,'hash_email')
  const other=await listTrackedEvents('ws_event_other',{limit:10})
  assert.deepEqual(other,[])
  const stats=await trackedEventStats(workspaceId)
  assert.equal(stats.available,true)
  assert.equal(stats.total,1)
})


test('tracked event idempotency is workspace-scoped',async()=>{
  const sharedId='evt_shared_across_workspaces'
  await appendTrackedEvent('ws_event_scope_a',{
    id:sharedId,
    event:'page.viewed',
    receivedAt:'2026-10-03T00:00:00.000Z',
    visitorId:'visitor_a'
  })
  await appendTrackedEvent('ws_event_scope_b',{
    id:sharedId,
    event:'page.viewed',
    receivedAt:'2026-10-03T00:00:01.000Z',
    visitorId:'visitor_b'
  })
  const a=await listTrackedEvents('ws_event_scope_a',{limit:10})
  const b=await listTrackedEvents('ws_event_scope_b',{limit:10})
  assert.equal(a.length,1)
  assert.equal(b.length,1)
  assert.equal(a[0].id,sharedId)
  assert.equal(b[0].id,sharedId)
  assert.equal(a[0].visitorId,'visitor_a')
  assert.equal(b[0].visitorId,'visitor_b')
  await appendTrackedEvent('ws_event_scope_a',{
    id:sharedId,
    event:'page.viewed',
    receivedAt:'2026-10-03T00:00:02.000Z',
    visitorId:'visitor_a_replay'
  })
  const replayed=await listTrackedEvents('ws_event_scope_a',{limit:10})
  assert.equal(replayed.length,1,'same workspace replay must remain idempotent')
  assert.equal(replayed[0].visitorId,'visitor_a','replay must not overwrite canonical event content')
})
