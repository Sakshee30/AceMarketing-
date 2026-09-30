import test from 'node:test'
import assert from 'node:assert/strict'
import {activeWorkspaceMembership,assertWorkspaceMembership,seedWorkspaceCreator} from '../src/platform/workspace-access.mjs'

test('workspace membership matches active user identity, not caller scope text',()=>{
  const state={members:[
    {id:'u1',email:'one@example.com',role:'admin',status:'active'},
    {id:'u2',email:'two@example.com',role:'analyst',status:'inactive'}
  ]}
  assert.equal(activeWorkspaceMembership(state,{userId:'u1',email:'other@example.com'})?.role,'admin')
  assert.equal(activeWorkspaceMembership(state,{userId:'missing',email:'one@example.com'})?.id,'u1')
  assert.equal(activeWorkspaceMembership(state,{userId:'u2',email:'two@example.com'}),null)
  assert.throws(()=>assertWorkspaceMembership(state,{userId:'u3',email:'three@example.com'}),error=>error?.code==='workspace_membership_required')
})

test('workspace creator seeding is additive and idempotent',()=>{
  const state={members:[]}
  const actor={userId:'creator_1',email:'creator@example.com',role:'admin'}
  const first=seedWorkspaceCreator(state,actor)
  const second=seedWorkspaceCreator(state,actor)
  assert.equal(first.id,'creator_1')
  assert.equal(second.id,'creator_1')
  assert.equal(state.members.length,1)
})
