import test from 'node:test'
import assert from 'node:assert/strict'
import {createWebhookSignature,verifyWebhookSignature} from '../src/platform/webhook-signing.mjs'

test('webhook signatures bind timestamp, delivery id and exact body',()=>{
  const secret='test-secret'
  const timestamp=1_800_000_000
  const body='{"ok":true}'
  const signature=createWebhookSignature({secret,timestamp,deliveryId:'delivery_1',body})
  assert.equal(
    verifyWebhookSignature({secret,timestamp,deliveryId:'delivery_1',body,signature,nowMs:timestamp*1000}),
    true
  )
  assert.equal(
    verifyWebhookSignature({secret,timestamp,deliveryId:'delivery_2',body,signature,nowMs:timestamp*1000}),
    false
  )
  assert.equal(
    verifyWebhookSignature({secret,timestamp,deliveryId:'delivery_1',body:'{"ok":false}',signature,nowMs:timestamp*1000}),
    false
  )
})
