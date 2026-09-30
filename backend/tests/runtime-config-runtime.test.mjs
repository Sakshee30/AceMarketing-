import test from 'node:test'
import assert from 'node:assert/strict'
import {pool} from '../src/database.mjs'
import {publishRuntimeSnapshot,createEmergencyControl,revokeEmergencyControl} from '../src/platform/runtime-configuration.mjs'
import {invalidateRuntimeConfigurationCache,runtimeGuardForRequest} from '../src/platform/runtime-config-runtime.mjs'

test('data-plane runtime guard allows baseline when no snapshot exists',{skip:!pool},async()=>{
  process.env.ACE_RUNTIME_ENVIRONMENT='guard-baseline-'+Date.now()
  invalidateRuntimeConfigurationCache()
  const decision=await runtimeGuardForRequest({
    method:'POST',
    path:'/api/files/upload-intents',
    workspaceId:'ws_test'
  })
  assert.equal(decision.allowed,true)
  assert.equal(decision.source,'baseline')
})

test('data-plane runtime guard blocks suspended AI admission',{skip:!pool},async()=>{
  process.env.RUNTIME_CONFIG_SIGNING_SECRET='runtime-config-test-secret'
  process.env.ACE_RUNTIME_ENVIRONMENT='guard-ai-'+Date.now()
  const emergency=await createEmergencyControl({
    environment:process.env.ACE_RUNTIME_ENVIRONMENT,
    scopeType:'workspace',
    scopeId:'ws_runtime_ai',
    controlType:'suspend_ai',
    reason:'test runtime admission control',
    durationMinutes:15,
    createdBy:'security@example.test'
  })
  await publishRuntimeSnapshot({
    environment:process.env.ACE_RUNTIME_ENVIRONMENT,
    createdBy:'security@example.test'
  })
  invalidateRuntimeConfigurationCache()
  const decision=await runtimeGuardForRequest({
    method:'POST',
    path:'/api/ai/tasks/analyst/submit',
    workspaceId:'ws_runtime_ai'
  })
  assert.equal(decision.allowed,false)
  assert.equal(decision.code,'ai_admission_suspended')
  await revokeEmergencyControl({
    id:emergency.id,
    revokedBy:'security@example.test',
    expectedVersion:emergency.version
  })
})

test('data-plane read-only emergency blocks workspace writes but not reads',{skip:!pool},async()=>{
  process.env.RUNTIME_CONFIG_SIGNING_SECRET='runtime-config-test-secret'
  process.env.ACE_RUNTIME_ENVIRONMENT='guard-read-only-'+Date.now()
  const emergency=await createEmergencyControl({
    environment:process.env.ACE_RUNTIME_ENVIRONMENT,
    scopeType:'workspace',
    scopeId:'ws_read_only',
    controlType:'read_only',
    reason:'test scoped read-only containment',
    durationMinutes:15,
    createdBy:'security@example.test'
  })
  await publishRuntimeSnapshot({
    environment:process.env.ACE_RUNTIME_ENVIRONMENT,
    createdBy:'security@example.test'
  })
  invalidateRuntimeConfigurationCache()
  const write=await runtimeGuardForRequest({
    method:'POST',
    path:'/api/forms',
    workspaceId:'ws_read_only'
  })
  const read=await runtimeGuardForRequest({
    method:'GET',
    path:'/api/forms',
    workspaceId:'ws_read_only'
  })
  assert.equal(write.allowed,false)
  assert.equal(write.code,'scope_read_only')
  assert.equal(read.allowed,true)
  await revokeEmergencyControl({
    id:emergency.id,
    revokedBy:'security@example.test',
    expectedVersion:emergency.version
  })
})

test('feature disabled state blocks matching data-plane mutation',{skip:!pool},async()=>{
  process.env.RUNTIME_CONFIG_SIGNING_SECRET='runtime-config-test-secret'
  process.env.ACE_RUNTIME_ENVIRONMENT='guard-files-'+Date.now()
  await publishRuntimeSnapshot({
    environment:process.env.ACE_RUNTIME_ENVIRONMENT,
    features:{files:'disabled'},
    createdBy:'platform-admin@example.test'
  })
  invalidateRuntimeConfigurationCache()
  const decision=await runtimeGuardForRequest({
    method:'POST',
    path:'/api/files/upload-intents',
    workspaceId:'ws_files'
  })
  assert.equal(decision.allowed,false)
  assert.equal(decision.code,'feature_disabled')
})
