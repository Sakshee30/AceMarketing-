import test from 'node:test'
import assert from 'node:assert/strict'
import {assertRequestPermission,permissionForRequest} from '../src/platform/access-policy.mjs'

test('access policy keeps read and write permissions explicit',()=>{
  assert.equal(permissionForRequest('GET','/api/members'),'members.read')
  assert.equal(permissionForRequest('POST','/api/members/invite'),'members.write')
  assert.equal(permissionForRequest('POST','/api/api-keys'),'developer.write')
  assert.equal(permissionForRequest('GET','/api/dashboard-summary'),'workspace.read')
  assert.equal(permissionForRequest('POST','/api/unknown-write'),'workspace.write')
})

test('AI sensitive operations keep separate permissions',()=>{
  assert.equal(permissionForRequest('POST','/api/ai/activation-proposals/x/approve'),'ai.activation.approve')
  assert.equal(permissionForRequest('POST','/api/ai/activation-proposals/x/execute'),'ai.activation.execute')
  assert.equal(permissionForRequest('POST','/api/ai/datasets'),'ai.training.run')
})

test('permission assertion exposes denied permission without changing policy semantics',()=>{
  assert.throws(
    ()=>assertRequestPermission({role:'analyst',method:'POST',path:'/api/api-keys',hasPermission:()=>false}),
    error=>error?.code==='permission_denied'&&error?.permission==='developer.write'
  )
})
