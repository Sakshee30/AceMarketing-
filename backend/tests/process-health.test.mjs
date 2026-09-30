import test from 'node:test'
import assert from 'node:assert/strict'
import {
  beginProcessDrain,
  livenessState,
  markStartupComplete,
  readinessState,
  startupState
} from '../src/platform/process-health.mjs'

test('liveness remains independent from dependency health',()=>{
  const state=livenessState()
  assert.equal(state.ok,true)
  assert.ok(['live','draining'].includes(state.state))
})

test('startup and readiness become healthy after startup completes',async()=>{
  markStartupComplete()
  assert.equal(startupState().ok,true)
  const ready=await readinessState({storageHealth:async()=>({ok:true,backend:'test'})})
  assert.equal(ready.ok,true)
  assert.equal(ready.state,'ready')
  assert.equal(ready.persistence.backend,'test')
})

test('readiness reports dependency failure without changing liveness',async()=>{
  markStartupComplete()
  const ready=await readinessState({storageHealth:async()=>({ok:false,reason:'database unavailable'})})
  assert.equal(ready.ok,false)
  assert.equal(ready.state,'dependency_unavailable')
  assert.equal(livenessState().ok,true)
})

test('drain mode rejects readiness while keeping process live',async()=>{
  beginProcessDrain()
  assert.equal(startupState().ok,false)
  const ready=await readinessState({storageHealth:async()=>({ok:true})})
  assert.equal(ready.ok,false)
  assert.equal(ready.state,'draining')
  assert.equal(livenessState().ok,true)
  assert.equal(livenessState().state,'draining')
})
