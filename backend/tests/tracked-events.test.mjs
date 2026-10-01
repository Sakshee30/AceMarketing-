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
