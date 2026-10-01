import test from 'node:test'
import assert from 'node:assert/strict'
import {calculateMetricSet,metricCatalog,deriveMarketingMetrics} from '../src/metric-catalog.mjs'

test('metric catalog uses explicit mappings and excludes estimates',()=>{
  const events=[
    {id:'s1',eventType:'campaign.spend',occurredAt:'2026-09-01T00:00:00Z',amount:100,currency:'USD'},
    {id:'l1',eventType:'lead.created',occurredAt:'2026-09-01T01:00:00Z',entityId:'lead-1'},
    {id:'q1',eventType:'lead.qualified',occurredAt:'2026-09-01T02:00:00Z',entityId:'lead-1'},
    {id:'p1',eventType:'payment.succeeded',occurredAt:'2026-09-02T00:00:00Z',entityId:'customer-1',amount:300,currency:'USD'},
    {id:'r1',eventType:'payment.refunded',occurredAt:'2026-09-02T01:00:00Z',entityId:'customer-1',amount:50,currency:'USD'},
    {id:'e1',eventType:'deal.estimated_value',occurredAt:'2026-09-02T02:00:00Z',amount:9999,currency:'USD'},
    {id:'u1',eventType:'lead.unqualified',occurredAt:'2026-09-02T03:00:00Z',entityId:'lead-2'}
  ]
  const result=calculateMetricSet({
    events,
    startAt:'2026-09-01T00:00:00Z',
    endAt:'2026-10-01T00:00:00Z',
    timezone:'UTC'
  })
  assert.equal(result.metrics.qualified_leads,1)
  assert.equal(result.metrics.revenue,300)
  assert.equal(result.metrics.refunds,50)
  assert.equal(result.metrics.net_revenue,250)
  assert.equal(result.metrics.roas,2.5)
  assert.equal(result.lineage.estimatedRevenueIncluded,false)
  assert.equal(metricCatalog().boundaries,'start inclusive, end exclusive')
})

test('metric catalog rejects mixed currencies and reports zero denominators',()=>{
  assert.throws(()=>calculateMetricSet({
    events:[
      {id:'s1',eventType:'campaign.spend',occurredAt:'2026-09-01T00:00:00Z',amount:10,currency:'USD'},
      {id:'p1',eventType:'payment.succeeded',occurredAt:'2026-09-01T01:00:00Z',entityId:'c1',amount:20,currency:'EUR'}
    ],
    startAt:'2026-09-01T00:00:00Z',
    endAt:'2026-09-02T00:00:00Z'
  }),/mixed_currency/)

  const empty=calculateMetricSet({
    events:[],
    startAt:'2026-09-01T00:00:00Z',
    endAt:'2026-09-02T00:00:00Z'
  })
  assert.equal(empty.metrics.conversion_rate,null)
  assert.ok(empty.warnings.some(item=>item.includes('conversion_rate')))
})


test('derived marketing metrics use one shared formula with null zero denominators',()=>{
  const metrics=deriveMarketingMetrics({
    spend:100,
    impressions:10000,
    clicks:500,
    conversions:25,
    revenue:400
  })
  assert.equal(metrics.ctr,0.05)
  assert.equal(metrics.cpc,0.2)
  assert.equal(metrics.cpm,10)
  assert.equal(metrics.cpa,4)
  assert.equal(metrics.conversion_rate,0.05)
  assert.equal(metrics.roas,4)
  assert.equal(deriveMarketingMetrics({spend:0,clicks:0,impressions:0,conversions:0,revenue:0}).roas,null)
})
