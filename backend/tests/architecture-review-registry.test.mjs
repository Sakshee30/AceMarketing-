import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {architectureReviewRegistry,validateArchitectureReviewRegistry} from '../src/platform/architecture-review-registry.mjs'
import {platformModuleRegistry} from '../src/platform/module-registry.mjs'

test('every backend module carries architecture review metadata',()=>{
  assert.equal(validateArchitectureReviewRegistry(),true)
  assert.equal(architectureReviewRegistry.length,platformModuleRegistry.length)
})

test('migration-backed modules point to an existing migration review',()=>{
  const root=process.cwd()
  for(const item of architectureReviewRegistry.filter(item=>item.migrations.length)){
    assert.ok(item.migrationReview,item.moduleId+' migration review missing')
    assert.equal(fs.existsSync(path.join(root,item.migrationReview)),true,item.moduleId+' migration review file missing')
  }
})

test('security-sensitive modules point to an existing threat model',()=>{
  const root=process.cwd()
  const sensitive=architectureReviewRegistry.filter(item=>item.trustBoundary)
  assert.ok(sensitive.length>0)
  for(const item of sensitive){
    assert.ok(item.threatModel,item.moduleId+' threat model missing')
    assert.equal(fs.existsSync(path.join(root,item.threatModel)),true,item.moduleId+' threat model file missing')
  }
})
