import test from 'node:test'
import assert from 'node:assert/strict'
import {getAiTaskPolicy,normalizeAiTaskPolicyInput} from '../src/ai-governance-store.mjs'
import {pool} from '../src/database.mjs'

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

test('task policy usage aggregation works with the embedded database',async()=>{
  const workspaceId='ws_ai_usage_aggregation_test'
  await pool.query(
    `INSERT INTO ace_ai_usage_reservations
      (id,workspace_id,job_id,task,provider,requested_model,reserved_units,actual_units,status)
     VALUES
      ($1,$2,$3,'analyst','google','gemini-2.5-pro',10,7,'committed'),
      ($4,$2,$5,'analyst','google','gemini-2.5-pro',3,NULL,'reserved')`,
    ['aiur_usage_1',workspaceId,'job_usage_1','aiur_usage_2','job_usage_2']
  )
  try{
    const policy=await getAiTaskPolicy(workspaceId,'analyst')
    assert.equal(policy.usage.monthUnits,10)
  }finally{
    await pool.query('DELETE FROM ace_ai_usage_reservations WHERE workspace_id=$1',[workspaceId])
  }
})

test('embedded database supports the PostgreSQL float8 alias',async()=>{
  const {rows}=await pool.query('SELECT 3.5::float8 AS value')
  assert.equal(Number(rows[0].value),3.5)
})
