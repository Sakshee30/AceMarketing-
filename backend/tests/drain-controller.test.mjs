import test from 'node:test'
import assert from 'node:assert/strict'
import {createDrainController} from '../src/platform/drain-controller.mjs'

test('drain controller refuses new tasks after drain begins',()=>{
  const controller=createDrainController()
  const finish=controller.beginTask()
  assert.equal(typeof finish,'function')
  controller.beginDrain()
  assert.equal(controller.beginTask(),null)
  finish()
  assert.equal(controller.snapshot().active,0)
})

test('drain controller waits for active tasks to finish',async()=>{
  const controller=createDrainController()
  const finish=controller.beginTask()
  controller.beginDrain()
  setTimeout(()=>finish(),10)
  assert.equal(await controller.waitForDrain(100),true)
  assert.equal(controller.snapshot().active,0)
})

test('drain controller times out without acknowledging unfinished work',async()=>{
  const controller=createDrainController()
  const finish=controller.beginTask()
  controller.beginDrain()
  assert.equal(await controller.waitForDrain(5),false)
  assert.equal(controller.snapshot().active,1)
  finish()
})
