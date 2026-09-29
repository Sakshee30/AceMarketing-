import test from 'node:test'
import assert from 'node:assert/strict'
import {analystToolNames,projectExperimentEvidence,validateAnalystToolRequest} from '../src/ai-analyst-tools.mjs'

test('analyst tools expose only the documented read-only allowlist',()=>{
  assert.deepEqual(new Set(analystToolNames()),new Set([
    'campaign_performance',
    'funnel_comparison',
    'customer_aggregates',
    'attribution_summary',
    'forecasts',
    'prediction_explanations',
    'anomalies',
    'experiment_results',
    'knowledge_retrieval'
  ]))
  assert.throws(()=>validateAnalystToolRequest('sql_query',{}),/unsupported analyst tool/)
})

test('knowledge analyst tool requires a bounded explicit query',()=>{
  assert.throws(()=>validateAnalystToolRequest('knowledge_retrieval',{}),/requires query/)
  const request=validateAnalystToolRequest('knowledge_retrieval',{query:' approved revenue policy ',limit:5000})
  assert.equal(request.args.query,'approved revenue policy')
  assert.equal(request.args.limit,100)
})

test('prediction analyst tool accepts only registered prediction tasks',()=>{
  assert.equal(validateAnalystToolRequest('prediction_explanations',{task:'customer_churn'}).args.task,'customer_churn')
  assert.throws(
    ()=>validateAnalystToolRequest('prediction_explanations',{task:'arbitrary_model'}),
    /unsupported prediction task/
  )
})


test('experiment analyst evidence strips arbitrary persisted fields',()=>{
  const projected=projectExperimentEvidence({
    id:'exp_1',
    name:'Pricing test',
    status:'completed',
    primaryMetric:'conversion_rate',
    sampleSize:1200,
    effect:0.08,
    secretToken:'must-not-leak',
    rawParticipants:[{email:'person@example.test'}]
  })
  assert.equal(projected.id,'exp_1')
  assert.equal(projected.primaryMetric,'conversion_rate')
  assert.equal(projected.sampleSize,1200)
  assert.equal(Object.hasOwn(projected,'secretToken'),false)
  assert.equal(Object.hasOwn(projected,'rawParticipants'),false)
})
