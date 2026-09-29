import test from 'node:test'
import assert from 'node:assert/strict'
import {validateAiResultEnvelope} from '../src/ai-result-contracts.mjs'

const base={runId:'run_1',workspaceId:'ws_default',task:'lead_qualification',status:'completed'}
test('calibrated probability is bounded and horizon-specific',()=>{
  assert.doesNotThrow(()=>validateAiResultEnvelope({...base,resultType:'calibrated_probability',probability:0.73,horizon:'30d',calibrationReference:'cal_v1'}))
  assert.throws(()=>validateAiResultEnvelope({...base,resultType:'calibrated_probability',probability:1.4,horizon:'30d',calibrationReference:'cal_v1'}),/probability/)
})
test('forecast distribution requires forecast values',()=>{
  assert.doesNotThrow(()=>validateAiResultEnvelope({...base,task:'forecast_primary',resultType:'forecast_distribution',horizon:'7d',pointForecast:[1,2,3]}))
  assert.throws(()=>validateAiResultEnvelope({...base,task:'forecast_primary',resultType:'forecast_distribution',horizon:'7d'}),/forecast/)
})
test('causal result cannot omit support state',()=>{
  assert.throws(()=>validateAiResultEnvelope({...base,task:'incrementality',resultType:'causal_estimate',estimand:'ATE'}),/supported/)
})
test('generated approved assets require an explicit reviewer',()=>{
  assert.throws(()=>validateAiResultEnvelope({...base,task:'creative_image',resultType:'generated_asset',reviewStatus:'approved'}),/reviewer/)
})


test('marketing mix results remain distinct from causal estimates',()=>{
  assert.doesNotThrow(()=>validateAiResultEnvelope({...base,task:'marketing_mix',resultType:'marketing_mix_analysis',healthStatus:'PASS',supported:true}))
  assert.throws(()=>validateAiResultEnvelope({...base,task:'marketing_mix',resultType:'marketing_mix_analysis',healthStatus:'PASS'}),/supported/)
})
test('model evaluation requires metrics instead of generic confidence',()=>{
  assert.doesNotThrow(()=>validateAiResultEnvelope({...base,resultType:'model_evaluation',metrics:{prAuc:0.7}}))
  assert.throws(()=>validateAiResultEnvelope({...base,resultType:'model_evaluation'}),/metrics/)
})
