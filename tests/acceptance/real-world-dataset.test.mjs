import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const data=JSON.parse(fs.readFileSync('test-data/generated/marketing-real-world.json','utf8'))

test('fixture metadata is deterministic and covers 30 days',()=>{
  assert.equal(data.meta.deterministic,true)
  assert.equal(data.meta.period.from,'2026-09-01')
  assert.equal(data.meta.period.to,'2026-09-30')
  assert.equal(data.dailyMarketingMetrics.length,120)
})

test('paid media metrics are internally valid',()=>{
  for(const row of data.dailyMarketingMetrics){
    assert.ok(row.spend>0)
    assert.ok(row.impressions>=row.clicks)
    assert.ok(row.clicks>=row.conversions)
    assert.ok(row.revenue>=0)
    assert.ok(['google_ads','meta_ads'].includes(row.platform))
  }
})

test('every lead resolves to a generated campaign and contains only synthetic contact data',()=>{
  const campaigns=new Set(data.dailyMarketingMetrics.map(x=>x.campaign))
  for(const lead of data.leads){
    assert.ok(campaigns.has(lead.campaign))
    assert.match(lead.email,/^qa\+lead_\d+@example\.test$/)
    assert.match(lead.phone,/^\+910000\d{6}$/)
    assert.ok(['lead','qualified','customer'].includes(lead.lifecycleStage))
  }
})

test('attribution revenue and customer values are non-negative',()=>{
  const mediaRevenue=data.dailyMarketingMetrics.reduce((sum,x)=>sum+x.revenue,0)
  const customerValue=data.leads.reduce((sum,x)=>sum+x.value,0)
  assert.ok(mediaRevenue>0)
  assert.ok(customerValue>0)
})

test('call and whatsapp events refer to known leads',()=>{
  const leadIds=new Set(data.leads.map(x=>x.id))
  for(const call of data.calls) assert.ok(leadIds.has(call.leadId))
  for(const message of data.whatsapp) assert.ok(leadIds.has(message.leadId))
})

test('GA4-like rows use the same campaign names as paid media',()=>{
  const campaigns=new Set(data.dailyMarketingMetrics.map(x=>x.campaign))
  for(const row of data.ga4) assert.ok(campaigns.has(row.campaign))
})
