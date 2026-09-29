import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeAiTaskPolicyInput} from '../src/ai-governance-store.mjs'

test('task policy preserves exact registry model identity',()=>{
  const policy=normalizeAiTaskPolicyInput('lead_qualification',{
    enabled:true,
    approvedRequestedModel:'catboost.CatBoostClassifier',
    maxConcurrentJobs:3,
    monthlyUnitBudget:100,
    featureFlags:{shadowAllowed:true},
    policyVersion:'v2'
  })
  assert.equal(policy.approvedRequestedModel,'catboost.CatBoostClassifier')
  assert.equal(policy.maxConcurrentJobs,3)
  assert.equal(policy.monthlyUnitBudget,100)
})

test('task policy rejects silent model substitution',()=>{
  assert.throws(
    ()=>normalizeAiTaskPolicyInput('lead_qualification',{approvedRequestedModel:'some-other-model'}),
    /silent substitution/
  )
})

test('task policy rejects invalid concurrency and budgets',()=>{
  assert.throws(()=>normalizeAiTaskPolicyInput('analyst',{maxConcurrentJobs:0}),/maxConcurrentJobs/)
  assert.throws(()=>normalizeAiTaskPolicyInput('analyst',{maxConcurrentJobs:1.5}),/maxConcurrentJobs/)
  assert.throws(()=>normalizeAiTaskPolicyInput('analyst',{monthlyUnitBudget:-1}),/monthlyUnitBudget/)
})

test('task policy rejects unknown tasks and malformed feature flags',()=>{
  assert.throws(()=>normalizeAiTaskPolicyInput('not-a-task',{}),/unknown AI task/)
  assert.throws(()=>normalizeAiTaskPolicyInput('analyst',{featureFlags:[]}),/featureFlags/)
})
