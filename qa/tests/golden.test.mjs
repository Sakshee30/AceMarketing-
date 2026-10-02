import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {calculateMetricSet,deriveMarketingMetrics} from '../../backend/src/metric-catalog.mjs'
const cases=JSON.parse(gunzipSync(readFileSync(new URL('../fixtures/golden.json.gz',import.meta.url))))
for(const name of ['baseline','duplicate_money','window_boundaries','empty','late_arrival']){
  test(`D3 ${name}: real metric calculator matches supplied independent oracle`,()=>{
    const f=cases[name], result=calculateMetricSet(f.input)
    for(const [key,expected] of Object.entries(f.expected)){
      if(expected===null) assert.equal(result.metrics[key],null,key)
      else assert.ok(Math.abs(result.metrics[key]-expected)<=1e-9,`${key}: expected ${expected}; actual ${result.metrics[key]}`)
    }
    assert.equal(result.lineage.estimatedRevenueIncluded,false)
    assert.equal(result.window.boundary,'[start,end)')
  })
}
test('D3 mixed currency cannot silently add INR and USD',()=>assert.throws(()=>calculateMetricSet(cases.mixed_currency.input),/mixed_currency/))
test('D3 whole-batch retry leaves every metric unchanged',()=>{
  const f=cases.baseline.input
  assert.deepEqual(calculateMetricSet({...f,events:[...f.events,...f.events]}).metrics,calculateMetricSet(f).metrics)
})
test('D3 reverse arrival order preserves all metrics',()=>{
  const f=cases.baseline.input
  assert.deepEqual(calculateMetricSet({...f,events:[...f.events].reverse()}).metrics,calculateMetricSet(f).metrics)
})
test('D3 reporting currency mismatch is explicit',()=>assert.throws(()=>calculateMetricSet({...cases.baseline.input,currency:'USD'}),/currency_mismatch/))
test('D3 invalid reporting windows are rejected',()=>{
  for(const [startAt,endAt] of [['invalid','2026-10-01'],['2026-10-01','2026-09-01'],['2026-10-01','2026-10-01']])
    assert.throws(()=>calculateMetricSet({events:[],startAt,endAt}),TypeError)
})
test('D3 Asia/Kolkata boundary includes exactly start and last instant',()=>{
  const f=cases.timezone_window
  const result=calculateMetricSet({events:f.events.map(e=>({eventId:e.id,eventType:'ad.click',occurredAt:e.at})),startAt:f.local_start_inclusive,endAt:f.local_end_exclusive,timezone:f.timezone})
  assert.equal(result.metrics.clicks,f.expected_included_ids.length)
  assert.equal(result.window.startAt,new Date(f.utc_start_inclusive).toISOString())
})
test('D3 gross and net revenue inputs are deliberately distinguished',()=>{
  assert.equal(deriveMarketingMetrics({spend:1000,revenue:3000}).roas,3)
  assert.equal(deriveMarketingMetrics({spend:1000,revenue:2700}).roas,2.7)
  assert.equal(calculateMetricSet(cases.baseline.input).metrics.roas,2.7)
})
