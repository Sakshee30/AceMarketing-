import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  moduleRegistrySnapshot,
  platformModule,
  platformModuleRegistry,
  validateModuleRegistry
} from '../src/platform/module-registry.mjs'

test('backend module registry is unique owned and navigable',()=>{
  assert.equal(validateModuleRegistry(),true)
  const ids=platformModuleRegistry.map(item=>item.id)
  assert.equal(new Set(ids).size,ids.length)
  assert.ok(platformModule('organizations'))
  assert.ok(platformModule('memberships'))
  assert.ok(platformModule('entitlements'))
  assert.ok(platformModule('approvals'))
  assert.ok(platformModule('notifications'))
  assert.ok(platformModule('reporting'))
  assert.ok(platformModule('scheduling'))
  assert.ok(platformModule('workflows'))
  assert.ok(platformModule('documents'))
  assert.ok(platformModule('cells'))
})

test('registered module implementation paths and migrations exist',()=>{
  const root=process.cwd()
  for(const item of platformModuleRegistry){
    for(const relative of item.implementationFiles){
      assert.equal(fs.existsSync(path.join(root,relative)),true,item.id+' implementation missing: '+relative)
    }
    for(const migration of item.migrations){
      assert.equal(fs.existsSync(path.join(root,'backend','migrations',migration)),true,item.id+' migration missing: '+migration)
    }
  }
})

test('module snapshot is safe engineering metadata and does not expose implementation paths',()=>{
  const snapshot=moduleRegistrySnapshot()
  assert.equal(snapshot.schemaVersion,'platform-modules.v1')
  assert.ok(snapshot.items.length>=10)
  for(const item of snapshot.items){
    assert.equal('implementationFiles' in item,false)
    assert.ok(item.owner)
    assert.ok(item.permissions.length>0)
  }
})
