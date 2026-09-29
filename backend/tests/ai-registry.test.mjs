import test from 'node:test'
import assert from 'node:assert/strict'
import {MODEL_ASSIGNMENTS,modelRegistrySnapshot} from '../src/ai-registry.mjs'

const byTask=new Map(MODEL_ASSIGNMENTS.map(item=>[item.task,item]))

test('exact hosted model assignments are preserved without silent substitution',()=>{
  assert.equal(byTask.get('analyst')?.requestedModel,'gpt-6-astra')
  assert.equal(byTask.get('recommendation_reviewer')?.requestedModel,'claude-fable-5-1')
  assert.equal(byTask.get('multimodal_extraction')?.requestedModel,'gemini-3.8-flash')
  assert.equal(byTask.get('embedding')?.requestedModel,'voyage-4-large')
  assert.equal(byTask.get('reranking')?.requestedModel,'rerank-2.5')
  assert.equal(byTask.get('call_transcription')?.requestedModel,'gemini-3.5-transcribe')
  assert.equal(byTask.get('live_voice')?.requestedModel,'gemini-3.8-live-extended-thinking')
  assert.equal(byTask.get('creative_image')?.requestedModel,'gemini-3-pro-image')
})

test('numerical assignments remain task-specific even when estimator classes repeat',()=>{
  assert.equal(byTask.get('lead_qualification')?.requestedModel,'catboost.CatBoostClassifier')
  assert.equal(byTask.get('paid_conversion')?.requestedModel,'catboost.CatBoostClassifier')
  assert.equal(byTask.get('customer_churn')?.requestedModel,'catboost.CatBoostClassifier')
  assert.notEqual(byTask.get('lead_qualification')?.task,byTask.get('paid_conversion')?.task)
  assert.equal(byTask.get('forecast_primary')?.requestedModel,'amazon/chronos-2')
  assert.equal(byTask.get('marketing_mix')?.requestedModel,'meridian.model.model.Meridian')
  assert.equal(byTask.get('incrementality')?.requestedModel,'econml.dml.CausalForestDML')
})

test('documented reviewer remains unresolved until tenant access and qualification exist',()=>{
  const reviewer=modelRegistrySnapshot().find(item=>item.task==='recommendation_reviewer')
  assert.equal(reviewer?.documentationVerified,true)
  assert.equal(reviewer?.resolvedModel,null)
  assert.equal(reviewer?.accessVerified,false)
  assert.ok(['unconfigured','disabled','evaluating'].includes(reviewer?.readiness))
})

test('deterministic forecast baseline remains explicitly labelled',()=>{
  const baseline=modelRegistrySnapshot().find(item=>item.task==='forecast_baseline')
  assert.equal(baseline?.kind,'deterministic_baseline')
  assert.equal(baseline?.resolvedModel,'seasonal_naive')
  assert.equal(baseline?.fallbackPolicy,'explicit_baseline_only')
})
