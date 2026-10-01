import test from 'node:test'
import assert from 'node:assert/strict'
import {readProjectProfile,validateProjectProfile} from '../../scripts/project-profile-check.mjs'
import {platformModuleRegistry} from '../src/platform/module-registry.mjs'

test('project profile declares every canonical backend module and keeps qualification claims unverified',()=>{
  assert.equal(validateProjectProfile(),true)
  const profile=readProjectProfile()
  assert.equal(new Set(profile.enabledModules).size,platformModuleRegistry.length)
  assert.equal(profile.contractedLoad.qualificationStatus,'unverified')
  assert.equal(profile.availabilityObjectives.qualificationStatus,'unverified')
  assert.equal(profile.residency.productionApproved,false)
  assert.equal(profile.retention.productionApproved,false)
})

test('project profile publishes the mandatory adoption fields',()=>{
  const profile=readProjectProfile()
  for(const key of ['dataClassification','enabledModules','residency','contractedLoad','availabilityObjectives','externalDependencies','retention','approvedExceptions']){
    assert.notEqual(profile[key],undefined,key+' missing')
  }
})
