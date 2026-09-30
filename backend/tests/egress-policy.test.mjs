import test from 'node:test'
import assert from 'node:assert/strict'
import {isBlockedOutboundIp,validateOutboundDestination} from '../src/platform/egress-policy.mjs'

test('egress policy blocks local and reserved addresses',async()=>{
  assert.equal(isBlockedOutboundIp('127.0.0.1'),true)
  assert.equal(isBlockedOutboundIp('10.0.0.1'),true)
  assert.equal(isBlockedOutboundIp('169.254.169.254'),true)
  assert.equal(isBlockedOutboundIp('::1'),true)
  await assert.rejects(
    ()=>validateOutboundDestination('https://127.0.0.1/hook'),
    error=>error?.code==='prohibited_outbound_address'
  )
})

test('egress policy rejects embedded credentials and unsafe schemes',async()=>{
  await assert.rejects(
    ()=>validateOutboundDestination('https://user:pass@example.com/hook'),
    error=>error?.code==='embedded_url_credentials'
  )
  await assert.rejects(
    ()=>validateOutboundDestination('ftp://example.com/file'),
    error=>error?.code==='unsupported_outbound_scheme'
  )
})
