import test from 'node:test'
import assert from 'node:assert/strict'
import {upsertLeadProfile,getLeadProfile} from '../src/lead-ops.mjs'

test('lead upsert rejects stale source updates without overwriting canonical profile',async()=>{
  const workspaceId='ws_lead_stale_guard'
  const externalLeadId='lead_stale_guard'
  const current=await upsertLeadProfile(workspaceId,{
    externalLeadId,
    name:'Current Name',
    crmStage:'qualified',
    campaign:'campaign-current',
    lastActivity:'2026-10-02T12:00:00.000Z',
    journeyDepth:8,
    pricingPageViews:2
  })
  assert.equal(current.name,'Current Name')
  assert.equal(current.crm_stage,'qualified')

  const stale=await upsertLeadProfile(workspaceId,{
    externalLeadId,
    name:'Stale Name',
    crmStage:'lead',
    campaign:'campaign-stale',
    lastActivity:'2026-09-01T12:00:00.000Z',
    journeyDepth:1,
    pricingPageViews:0
  })
  assert.equal(stale.name,'Current Name')
  assert.equal(stale.crm_stage,'qualified')
  assert.equal(stale.campaign,'campaign-current')
  assert.equal(stale.journey.lastActivity,'2026-10-02T12:00:00.000Z')

  const stored=await getLeadProfile(workspaceId,externalLeadId)
  assert.equal(stored.name,'Current Name')
  assert.equal(stored.crm_stage,'qualified')
  assert.equal(stored.campaign,'campaign-current')
})

test('lead upsert accepts a newer source update',async()=>{
  const workspaceId='ws_lead_stale_guard'
  const externalLeadId='lead_stale_guard'
  const newer=await upsertLeadProfile(workspaceId,{
    externalLeadId,
    name:'Newer Name',
    crmStage:'converted',
    campaign:'campaign-newer',
    lastActivity:'2026-10-03T12:00:00.000Z',
    journeyDepth:10,
    pricingPageViews:4
  })
  assert.equal(newer.name,'Newer Name')
  assert.equal(newer.crm_stage,'converted')
  assert.equal(newer.campaign,'campaign-newer')
  assert.equal(newer.journey.lastActivity,'2026-10-03T12:00:00.000Z')
  assert.equal(newer.journey.previousLastActivity,'2026-10-02T12:00:00.000Z')
})
