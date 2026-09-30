import test from 'node:test'
import assert from 'node:assert/strict'
import {integrationIngressRoutes,runtimeRoleAllows,runtimeRolePolicy} from '../src/platform/runtime-role.mjs'

test('default API role remains unrestricted for compatibility',()=>{
  assert.equal(runtimeRolePolicy('api').restricted,false)
  assert.equal(runtimeRoleAllows({role:'api',method:'GET',path:'/api/dashboard-summary'}),true)
})

test('integration ingress exposes only verified provider ingress routes',()=>{
  const routes=integrationIngressRoutes()
  assert.ok(routes.some(route=>route.method==='POST'&&route.path==='/api/billing/webhook'))
  assert.ok(routes.some(route=>route.method==='POST'&&route.path==='/api/webhooks/whatsapp'))
  assert.equal(runtimeRoleAllows({role:'integration-ingress',method:'POST',path:'/api/webhooks/calls'}),true)
  assert.equal(runtimeRoleAllows({role:'integration-ingress',method:'GET',path:'/api/dashboard-summary'}),false)
  assert.equal(runtimeRoleAllows({role:'integration-ingress',method:'POST',path:'/api/whatsapp/messages'}),false)
})

test('unknown runtime roles fail closed',()=>{
  assert.throws(()=>runtimeRolePolicy('admin-everything'),/unsupported ACE_RUNTIME_ROLE/)
  assert.equal(runtimeRoleAllows({role:'unknown',method:'GET',path:'/'}),false)
})
