import test from 'node:test'
import assert from 'node:assert/strict'
import {aiPlatformPolicySnapshot,enforceTenantPolicyWithinPlatform,platformTaskPolicy} from '../src/ai-platform-policy.mjs'

const withPolicy=(value,fn)=>{
  const previous=process.env.AI_PLATFORM_POLICY_JSON
  process.env.AI_PLATFORM_POLICY_JSON=JSON.stringify(value)
  try{return fn()}
  finally{
    if(previous===undefined)delete process.env.AI_PLATFORM_POLICY_JSON
    else process.env.AI_PLATFORM_POLICY_JSON=previous
  }
}

test('platform policy preserves exact registry model identity',()=>withPolicy({
  version:'test.v1',
  tasks:{analyst:{allowedRequestedModel:'gpt-6-astra',maxConcurrentJobs:2}}
},()=>{
  const policy=platformTaskPolicy('analyst')
  assert.equal(policy.allowedRequestedModel,'gpt-6-astra')
  assert.equal(policy.maxConcurrentJobs,2)
  assert.throws(()=>enforceTenantPolicyWithinPlatform({task:'analyst',enabled:true,approvedRequestedModel:'other-model',maxConcurrentJobs:1,monthlyUnitBudget:null}),/not allowed/)
}))

test('platform policy blocks tenant values above platform ceilings',()=>withPolicy({
  defaults:{maxConcurrentJobs:5,monthlyUnitBudget:100},
  tasks:{creative_image:{enabled:false}}
},()=>{
  assert.throws(()=>enforceTenantPolicyWithinPlatform({task:'analyst',enabled:true,approvedRequestedModel:'gpt-6-astra',maxConcurrentJobs:6,monthlyUnitBudget:10}),/concurrency/)
  assert.throws(()=>enforceTenantPolicyWithinPlatform({task:'analyst',enabled:true,approvedRequestedModel:'gpt-6-astra',maxConcurrentJobs:5,monthlyUnitBudget:101}),/budget/)
  assert.throws(()=>enforceTenantPolicyWithinPlatform({task:'creative_image',enabled:true,approvedRequestedModel:'gemini-3-pro-image',maxConcurrentJobs:1,monthlyUnitBudget:1}),/disabled/)
}))

test('platform policy snapshot is configuration-only and contains no secret values',()=>withPolicy({version:'test.v2'},()=>{
  const snapshot=aiPlatformPolicySnapshot()
  assert.equal(snapshot.version,'test.v2')
  assert.ok(snapshot.tasks.analyst)
  assert.equal('apiKey' in snapshot.tasks.analyst,false)
}))
