import test from 'node:test'
import assert from 'node:assert/strict'
import {pool} from '../src/database.mjs'
import {
  createPlatformChange,
  decidePlatformChange,
  getPlatformChange,
  transitionPlatformChange,
  updatePlatformChangePlan
} from '../src/platform/control-change-store.mjs'

test('platform change plan becomes immutable after approval',{skip:!pool},async()=>{
  const change=await createPlatformChange({
    environment:'test',
    scopeType:'feature',
    scopeId:'sample-feature',
    requestedBy:'requester@example.test',
    requestedRole:'operator',
    reason:'exercise governed change',
    risk:'high',
    desiredState:{enabled:true},
    impactReport:{dependencies:['persistence']},
    healthGates:[{name:'api-health',required:true}],
    rollbackPlan:{action:'restore previous feature state'}
  })
  await transitionPlatformChange({id:change.id,toState:'validating',actor:'operator@example.test',actorRole:'operator'})
  await transitionPlatformChange({id:change.id,toState:'impact_analysis',actor:'operator@example.test',actorRole:'operator'})
  await updatePlatformChangePlan({
    id:change.id,
    actor:'operator@example.test',
    actorRole:'operator',
    impactReport:{dependencies:['persistence'],validated:true}
  })
  await transitionPlatformChange({id:change.id,toState:'waiting_approval',actor:'operator@example.test',actorRole:'operator'})
  await assert.rejects(
    ()=>decidePlatformChange({
      id:change.id,
      decision:'approved',
      approver:'requester@example.test',
      approverRole:'approver'
    }),
    /separate approver/
  )
  const approved=await decidePlatformChange({
    id:change.id,
    decision:'approved',
    approver:'approver@example.test',
    approverRole:'approver',
    comment:'validated for test'
  })
  assert.equal(approved.state,'approved')
  assert.ok(approved.approved_plan_digest)
  await assert.rejects(
    ()=>updatePlatformChangePlan({
      id:change.id,
      actor:'operator@example.test',
      actorRole:'operator',
      desiredState:{enabled:false}
    }),
    /immutable/
  )
  const full=await getPlatformChange(change.id)
  assert.equal(full?.approvals.length,1)
  assert.ok(full?.events.length>=5)
})

test('change state machine rejects fabricated completion',{skip:!pool},async()=>{
  const change=await createPlatformChange({
    environment:'test',
    scopeType:'provider',
    scopeId:'email',
    requestedBy:'operator@example.test',
    requestedRole:'operator',
    reason:'verify invalid transition rejection',
    desiredState:{provider:'smtp'}
  })
  await assert.rejects(
    ()=>transitionPlatformChange({
      id:change.id,
      toState:'completed',
      actor:'operator@example.test',
      actorRole:'operator'
    }),
    /invalid change transition/
  )
})
