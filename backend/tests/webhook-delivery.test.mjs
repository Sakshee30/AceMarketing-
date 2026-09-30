import test from 'node:test'
import assert from 'node:assert/strict'

process.env.CONNECTOR_ENCRYPTION_KEY=process.env.CONNECTOR_ENCRYPTION_KEY||'webhook-test-encryption-key'

const {
  createWebhookSubscription,
  createWebhookTestDelivery,
  enqueueWebhookDelivery,
  listWebhookDeliveries,
  listWebhookDeliveryAttempts,
  listWebhookSubscriptions,
  replayWebhookDelivery,
  setWebhookSubscriptionStatus
}=await import('../src/platform/webhook-delivery-store.mjs')
const {dispatchWebhookDelivery}=await import('../src/platform/webhook-delivery-worker.mjs')

test('webhook subscriptions return signing secret once and metadata views redact it',async()=>{
  const workspaceId='ws_webhook_subscription_test'
  const created=await createWebhookSubscription({
    workspaceId,
    name:'Orders webhook',
    destinationUrl:'https://93.184.216.34/hook',
    eventTypes:['orders.created','test.delivery'],
    actorId:'u1'
  })
  assert.ok(created.signingSecret.length>=24)
  assert.equal(created.subscription.status,'active')
  const items=await listWebhookSubscriptions({workspaceId})
  assert.equal(items.length,1)
  assert.equal(Object.hasOwn(items[0],'signingSecret'),false)
  assert.ok(items[0].signingKeyId)
})

test('webhook delivery deduplicates event identity and supports pause resume and replay',async()=>{
  const workspaceId='ws_webhook_lifecycle_test'
  const created=await createWebhookSubscription({
    workspaceId,
    name:'Lifecycle webhook',
    destinationUrl:'https://93.184.216.34/hook',
    eventTypes:['orders.created','test.delivery'],
    actorId:'u1'
  })
  const first=await enqueueWebhookDelivery({
    workspaceId,
    subscriptionId:created.subscription.id,
    eventId:'event-1',
    eventType:'orders.created',
    payload:{orderId:'o1'},
    correlationId:'corr-1'
  })
  const duplicate=await enqueueWebhookDelivery({
    workspaceId,
    subscriptionId:created.subscription.id,
    eventId:'event-1',
    eventType:'orders.created',
    payload:{orderId:'o1'}
  })
  assert.equal(duplicate.id,first.id)

  await setWebhookSubscriptionStatus({workspaceId,id:created.subscription.id,status:'paused'})
  const paused=await createWebhookTestDelivery({workspaceId,subscriptionId:created.subscription.id,actorId:'u1'})
  assert.equal(paused.status,'paused')
  await setWebhookSubscriptionStatus({workspaceId,id:created.subscription.id,status:'active'})

  const replay=await replayWebhookDelivery({workspaceId,deliveryId:first.id,actorId:'u2'})
  assert.equal(replay.replayOf,first.id)
  assert.notEqual(replay.eventId,first.eventId)
})

test('webhook dispatcher signs and records successful delivery without exposing secrets',async()=>{
  const workspaceId='ws_webhook_dispatch_test'
  const created=await createWebhookSubscription({
    workspaceId,
    name:'Dispatch webhook',
    destinationUrl:'https://93.184.216.34/hook',
    eventTypes:['orders.created'],
    signingSecret:'01234567890123456789012345678901',
    signingKeyId:'key-1',
    actorId:'u1'
  })
  const delivery=await enqueueWebhookDelivery({
    workspaceId,
    subscriptionId:created.subscription.id,
    eventId:'dispatch-1',
    eventType:'orders.created',
    payload:{orderId:'o9'}
  })

  const originalFetch=globalThis.fetch
  let observedHeaders=null
  globalThis.fetch=async(_url,options)=>{
    observedHeaders=options.headers
    return new Response('{"received":true}',{status:200,headers:{'content-type':'application/json'}})
  }
  try{
    const result=await dispatchWebhookDelivery({workspaceId,deliveryId:delivery.id})
    assert.equal(result.delivered,true)
    assert.equal(observedHeaders['X-Ace-Key-ID'],'key-1')
    assert.match(observedHeaders['X-Ace-Signature'],/^sha256=/)
  }finally{
    globalThis.fetch=originalFetch
  }

  const attempts=await listWebhookDeliveryAttempts({workspaceId,deliveryId:delivery.id})
  assert.equal(attempts[0].status,'delivered')
  assert.equal(Object.hasOwn(attempts[0],'secret'),false)
  const listed=await listWebhookDeliveries({workspaceId,subscriptionId:created.subscription.id})
  assert.equal(listed.find(item=>item.id===delivery.id)?.status,'delivered')
})

test('permanent receiver failures dead-letter instead of blind retry',async()=>{
  const workspaceId='ws_webhook_permanent_test'
  const created=await createWebhookSubscription({
    workspaceId,
    name:'Permanent webhook',
    destinationUrl:'https://93.184.216.34/hook',
    eventTypes:['orders.created'],
    actorId:'u1'
  })
  const delivery=await enqueueWebhookDelivery({
    workspaceId,
    subscriptionId:created.subscription.id,
    eventId:'permanent-1',
    eventType:'orders.created',
    payload:{orderId:'o10'}
  })
  const originalFetch=globalThis.fetch
  globalThis.fetch=async()=>new Response('invalid request',{status:400})
  try{
    const result=await dispatchWebhookDelivery({workspaceId,deliveryId:delivery.id})
    assert.equal(result.terminal,true)
  }finally{
    globalThis.fetch=originalFetch
  }
  const listed=await listWebhookDeliveries({workspaceId,subscriptionId:created.subscription.id})
  assert.equal(listed.find(item=>item.id===delivery.id)?.status,'dead_letter')
})
