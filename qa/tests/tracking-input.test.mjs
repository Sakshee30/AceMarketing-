import test from 'node:test'
import assert from 'node:assert/strict'
import {trackingInputError} from '../../backend/src/tracking-input.mjs'
for(const field of ['occurredAt','timestamp','receivedAt']){
 test('TRACK validation rejects malformed '+field,()=>{for(const value of ['bad-date','',{},[],true,Infinity])assert.ok(trackingInputError({visitorId:'qa', [field]:value}))})
 test('TRACK validation accepts valid '+field,()=>assert.equal(trackingInputError({visitorId:'qa',[field]:'2026-09-20T12:00:00Z'}),null))
}
for(const body of [null,[],true,'event'])test('TRACK rejects non-object body '+JSON.stringify(body),()=>assert.ok(trackingInputError(body)))
test('TRACK invalid client id and consent category are rejected',()=>{
 for(const body of [{id:''},{id:4},{id:'a'.repeat(257)},{visitorId:{}},{eventCategory:'missing'}])assert.ok(trackingInputError(body))
})
