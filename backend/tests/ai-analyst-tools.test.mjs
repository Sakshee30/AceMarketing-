import test from 'node:test'
import assert from 'node:assert/strict'
import {analystToolNames,validateAnalystToolRequest} from '../src/ai-analyst-tools.mjs'

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
