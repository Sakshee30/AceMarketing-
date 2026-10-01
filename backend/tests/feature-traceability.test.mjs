import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {platformModuleRegistry} from '../src/platform/module-registry.mjs'
import {operationRegistryReadiness} from '../src/platform/operation-registry.mjs'
import {featureTraceabilitySnapshot,platformFeatureTraceability,validateFeatureTraceability} from '../src/platform/feature-traceability.mjs'

test('every backend module has canonical feature traceability',()=>{
  assert.equal(validateFeatureTraceability(),true)
  assert.equal(platformFeatureTraceability.length,platformModuleRegistry.length)
  const ids=new Set(platformFeatureTraceability.map(item=>item.id))
  for(const module of platformModuleRegistry)assert.equal(ids.has(module.id),true,'missing feature traceability: '+module.id)
})

test('traceability maps each operation to existing implementation and test evidence',()=>{
  const root=process.cwd()
  for(const feature of platformFeatureTraceability){
    assert.ok(feature.operations.length>0,feature.id+' has no operations')
    assert.ok(feature.description,feature.id+' description missing')
    assert.ok(feature.configuration.length>0,feature.id+' configuration missing')
    assert.ok(feature.endpoints.length>0,feature.id+' endpoint traceability missing')
    assert.ok(feature.eventContracts.length>=0)
    assert.ok(feature.dashboard,feature.id+' dashboard missing')
    assert.ok(feature.featureReadme,feature.id+' feature README missing')
    for(const operation of feature.operations){
      assert.ok(operation.operationId,feature.id+' operationId missing')
      assert.ok(operation.requestSchemaId,feature.id+' request schema id missing')
      assert.ok(operation.permission,feature.id+' permission missing')
    }
    for(const file of [...feature.handlers,...feature.tests,feature.featureReadme,feature.runbook]){
      assert.equal(fs.existsSync(path.join(root,file)),true,feature.id+' evidence path missing: '+file)
    }
    assert.equal(fs.existsSync(path.join(root,feature.runbook)),true,feature.id+' runbook missing')
  }
})

test('operation migration is fully canonical without hiding readiness state',()=>{
  const readiness=operationRegistryReadiness()
  assert.ok(readiness.total>=platformModuleRegistry.length)
  assert.equal(readiness.canonical,readiness.total)
  assert.equal(readiness.legacyMapped,0)
  assert.equal(readiness.migrationComplete,true)
})

test('public traceability snapshot omits private implementation paths from operation metadata',()=>{
  const snapshot=featureTraceabilitySnapshot()
  assert.equal(snapshot.schemaVersion,'platform-feature-traceability.v1')
  assert.equal(snapshot.items.length,platformModuleRegistry.length)
  for(const item of snapshot.items){
    assert.ok(item.owner)
    assert.ok(item.permissions.length)
    assert.ok(item.operations.length)
    assert.ok(item.description)
    assert.ok(item.configuration.length)
    assert.ok(item.endpoints.length)
    assert.ok(item.dashboard)
    for(const operation of item.operations){
      assert.equal('handlerPath' in operation,false)
      assert.equal('testPath' in operation,false)
      assert.ok(operation.operationId)
      assert.ok(operation.requestSchemaId)
    }
  }
})


test('migration-backed features expose concrete persistence tables where their migrations create tables',()=>{
  for(const feature of platformFeatureTraceability){
    if(feature.migrations.length===0)continue
    const createsTables=feature.migrations.some(name=>name!=='053_provider_migration_evidence.sql')
    if(createsTables)assert.ok(feature.tables.length>0,feature.id+' table traceability missing')
  }
})
