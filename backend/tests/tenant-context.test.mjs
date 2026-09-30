import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assertActorWorkspace,
  normalizeWorkspaceId,
  requestedWorkspaceId,
  tenantExecutionScope
} from '../src/platform/tenant-context.mjs'

test('workspace IDs are normalized and bounded',()=>{
  assert.equal(normalizeWorkspaceId(' ws_default '),'ws_default')
  assert.throws(()=>normalizeWorkspaceId('bad workspace'))
  assert.throws(()=>normalizeWorkspaceId(''))
})

test('caller workspace scope is parsed but actor authority remains decisive',()=>{
  const req={headers:{'x-workspace-id':'ws_a'}}
  assert.equal(requestedWorkspaceId(req),'ws_a')
  assert.equal(assertActorWorkspace({workspaceId:'ws_a'},'ws_a'),true)
  assert.throws(()=>assertActorWorkspace({workspaceId:'ws_b'},'ws_a'),error=>error?.code==='workspace_scope_mismatch')
})

test('tenant execution scope binds verified actor and workspace',()=>{
  const scope=tenantExecutionScope({actor:{workspaceId:'ws_a',userId:'u1',role:'admin',jti:'s1'},workspaceId:'ws_a'})
  assert.deepEqual(scope,{tenantId:'ws_a',workspaceId:'ws_a',actorId:'u1',role:'admin',sessionId:'s1'})
})
