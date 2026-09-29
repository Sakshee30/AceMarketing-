import test from 'node:test'
import assert from 'node:assert/strict'
import {
  deploymentTrafficBucket,
  deploymentTrafficDecision,
  normalizeDeploymentControlInput
} from '../src/ai-deployment-controls.mjs'

test('deployment controls validate explicit modes and bounded canary traffic',()=>{
  assert.equal(normalizeDeploymentControlInput('analyst',{mode:'active'}).canaryPercent,100)
  assert.equal(normalizeDeploymentControlInput('analyst',{mode:'shadow'}).canaryPercent,0)
  assert.equal(normalizeDeploymentControlInput('analyst',{mode:'canary',canaryPercent:15}).canaryPercent,15)
  assert.throws(()=>normalizeDeploymentControlInput('analyst',{mode:'canary',canaryPercent:0}),/greater than 0/)
  assert.throws(()=>normalizeDeploymentControlInput('analyst',{mode:'canary',canaryPercent:100}),/less than 100/)
  assert.throws(()=>normalizeDeploymentControlInput('unknown_task',{mode:'active'}),/unknown AI task/)
})

test('canary assignment is deterministic and never exceeds configured eligibility semantics',()=>{
  const control={mode:'canary',canaryPercent:10}
  const a=deploymentTrafficDecision({workspaceId:'ws_1',task:'analyst',key:'request_42',control})
  const b=deploymentTrafficDecision({workspaceId:'ws_1',task:'analyst',key:'request_42',control})
  assert.deepEqual(a,b)
  assert.equal(a.allowed,a.bucket<10)
  assert.equal(deploymentTrafficBucket({workspaceId:'ws_1',task:'analyst',key:'request_42'}),a.bucket)
})

test('shadow and off modes do not silently serve normal user traffic',()=>{
  const shadow=deploymentTrafficDecision({workspaceId:'ws_1',task:'analyst',key:'x',control:{mode:'shadow',canaryPercent:0}})
  assert.equal(shadow.allowed,false)
  assert.equal(shadow.shadow,true)
  const explicitShadow=deploymentTrafficDecision({workspaceId:'ws_1',task:'analyst',key:'x',control:{mode:'shadow',canaryPercent:0},allowShadow:true})
  assert.equal(explicitShadow.allowed,true)
  assert.equal(explicitShadow.shadow,true)
  const off=deploymentTrafficDecision({workspaceId:'ws_1',task:'analyst',key:'x',control:{mode:'off',canaryPercent:0}})
  assert.equal(off.allowed,false)
})
