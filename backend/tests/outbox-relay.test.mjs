import test from 'node:test'
import assert from 'node:assert/strict'
import {embeddedDatabase} from '../src/database.mjs'
import {appendOutboxEvent} from '../src/platform/reliability-store.mjs'
import {registerOutboxHandler,runOutboxRelayBatch} from '../src/platform/outbox-relay.mjs'

test('outbox relay publishes only after a registered handler succeeds',{skip:embeddedDatabase},async()=>{
  const eventType='test.outbox.relay'
  const seen=[]
  const unregister=registerOutboxHandler(eventType,async event=>seen.push(event.id))
  try{
    const event=await appendOutboxEvent({workspaceId:'ws_relay',eventType,payload:{ok:true}})
    const results=await runOutboxRelayBatch({workerId:'relay_test',limit:100})
    assert.ok(seen.includes(event.id))
    assert.ok(results.some(item=>item.id===event.id&&item.status==='published'))
  }finally{
    unregister()
  }
})
