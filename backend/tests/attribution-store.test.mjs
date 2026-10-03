import test from 'node:test'
import assert from 'node:assert/strict'
import {captureClickSession,recordAssistedEvent,attributionStats} from '../src/attribution-store.mjs'

test('attribution identity matching is isolated per workspace',async()=>{
  const sharedVisitor='visitor_shared_identity'
  await captureClickSession('ws_attr_a',{
    visitorId:sharedVisitor,
    occurredAt:'2026-10-03T08:00:00.000Z',
    utm_source:'meta',
    utm_campaign:'tenant-a-campaign'
  })
  await captureClickSession('ws_attr_b',{
    visitorId:sharedVisitor,
    occurredAt:'2026-10-03T08:00:00.000Z',
    utm_source:'google',
    utm_campaign:'tenant-b-campaign'
  })

  const a=await recordAssistedEvent('ws_attr_a',{
    eventId:'conversion-a',
    eventType:'purchase',
    source:'offline',
    occurredAt:'2026-10-03T08:05:00.000Z',
    visitorId:sharedVisitor,
    value:100,
    currency:'INR'
  })
  const b=await recordAssistedEvent('ws_attr_b',{
    eventId:'conversion-b',
    eventType:'purchase',
    source:'offline',
    occurredAt:'2026-10-03T08:05:00.000Z',
    visitorId:sharedVisitor,
    value:200,
    currency:'INR'
  })

  assert.equal(a.status,'matched')
  assert.equal(b.status,'matched')
  assert.notEqual(a.matched_session_id,b.matched_session_id)

  const statsA=await attributionStats('ws_attr_a')
  const statsB=await attributionStats('ws_attr_b')
  assert.equal(statsA.matchedEvents,1)
  assert.equal(statsB.matchedEvents,1)
  assert.equal(statsA.matchedValue,100)
  assert.equal(statsB.matchedValue,200)
  assert.equal(statsA.campaigns[0].campaign,'tenant-a-campaign')
  assert.equal(statsB.campaigns[0].campaign,'tenant-b-campaign')
})

test('assisted event idempotency is workspace scoped',async()=>{
  const key='same-provider-event-key'
  const base={
    idempotencyKey:key,
    eventType:'qualified_lead',
    source:'crm',
    occurredAt:'2026-10-03T09:00:00.000Z',
    customerId:'cust-shared',
    value:50,
    currency:'INR'
  }
  const a=await recordAssistedEvent('ws_attr_idem_a',base)
  const b=await recordAssistedEvent('ws_attr_idem_b',{...base,value:75})
  assert.notEqual(a.id,b.id)
  const aReplay=await recordAssistedEvent('ws_attr_idem_a',{...base,value:999})
  assert.equal(aReplay.id,a.id)
  assert.equal(Number(aReplay.value),50,'same-workspace replay must not overwrite canonical value')
  const statsA=await attributionStats('ws_attr_idem_a')
  const statsB=await attributionStats('ws_attr_idem_b')
  assert.equal(statsA.assistedEvents,1)
  assert.equal(statsB.assistedEvents,1)
})
