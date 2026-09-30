import test from 'node:test'
import assert from 'node:assert/strict'
import {ProviderTimeoutError,withProviderDeadline} from '../src/platform/provider-execution.mjs'

test('provider deadline aborts bounded work and marks outcome uncertainty',async()=>{
  await assert.rejects(
    ()=>withProviderDeadline('example',signal=>new Promise((resolve,reject)=>{
      signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})),{once:true})
      setTimeout(resolve,1000)
    }),{timeoutMs:20}),
    error=>error instanceof ProviderTimeoutError&&error.unknownOutcome===true
  )
})
