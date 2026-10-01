import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  operationRegistryReadiness,
  operationRegistrySnapshot,
  platformOperation,
  platformOperationRegistry,
  validateOperationRegistry
} from '../src/platform/operation-registry.mjs'
import {platformModuleRegistry} from '../src/platform/module-registry.mjs'

test('operation registry maps every module to owned contract and permission evidence',()=>{
  assert.equal(validateOperationRegistry(),true)
  const covered=new Set(platformOperationRegistry.map(item=>item.moduleId))
  for(const module of platformModuleRegistry)assert.equal(covered.has(module.id),true,'unmapped module: '+module.id)
})

test('operation implementation and test paths exist',()=>{
  const root=process.cwd()
  for(const item of platformOperationRegistry){
    assert.equal(fs.existsSync(path.join(root,item.handlerPath)),true,item.moduleId+':'+item.id+' handler missing: '+item.handlerPath)
    assert.equal(fs.existsSync(path.join(root,item.testPath)),true,item.moduleId+':'+item.id+' test missing: '+item.testPath)
  }
})

test('golden board move is canonical while remaining legacy mappings stay visible',()=>{
  const move=platformOperation('boards','move-card')
  assert.ok(move)
  assert.equal(move.status,'canonical')
  assert.equal(move.durability,'transactional-outbox')
  const readiness=operationRegistryReadiness()
  assert.ok(readiness.total>=platformModuleRegistry.length)
  assert.ok(readiness.canonical>=1)
  assert.ok(readiness.legacyMapped>=1)
  assert.equal(readiness.migrationComplete,false)
})

test('public operation snapshot omits implementation paths',()=>{
  const snapshot=operationRegistrySnapshot()
  assert.equal(snapshot.schemaVersion,'platform-operations.v1')
  assert.ok(snapshot.items.length>0)
  for(const item of snapshot.items){
    assert.equal('handlerPath' in item,false)
    assert.equal('testPath' in item,false)
    assert.ok(item.owner)
    assert.ok(item.permission)
    assert.ok(item.contract)
  }
})
