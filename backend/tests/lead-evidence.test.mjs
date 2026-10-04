import test from 'node:test'
import assert from 'node:assert/strict'
import {mergeLeadEvidence} from '../src/lead-evidence.mjs'
import {scoreLead} from '../src/lead-ops.mjs'

test('partial channel updates retain journey evidence and advance through all grades',()=>{
  let stored
  const apply=patch=>{
    const merged=mergeLeadEvidence(stored,patch)
    stored={journey:merged,crm_stage:merged.crmStage,attributes:merged.attributes}
    return scoreLead(merged)
  }
  assert.equal(apply({journeyDepth:1}).grade,'D')
  assert.equal(apply({journeyDepth:6,pricingPageViews:2}).grade,'C')
  assert.equal(apply({whatsappEngaged:true,crmStage:'qualified'}).grade,'B')
  assert.equal(apply({callOutcome:'qualified'}).grade,'A')
  assert.equal(stored.journey.pricingPageViews,2)
  assert.equal(apply({name:'Renamed contact'}).score,88)
  assert.equal(apply({journeyDepth:undefined,pricingPageViews:undefined,crmStage:undefined}).score,88)
})

test('risk survives unrelated updates; explicit false and zero clear evidence',()=>{
  const stored={journey:{journeyDepth:6,pricingPageViews:2,whatsappEngaged:true,callOutcome:'qualified'},crm_stage:'qualified',attributes:{fraudScore:90,invalidContact:true}}
  assert.equal(scoreLead(mergeLeadEvidence(stored,{name:'Updated'})).score,36)
  const cleared=mergeLeadEvidence(stored,{fraudScore:0,invalidContact:false,whatsappEngaged:false,pricingPageViews:0})
  assert.equal(scoreLead(cleared).score,60)
  assert.equal(cleared.attributes.invalidContact,false)
})

test('stage and page aliases replace stored values',()=>{
  const merged=mergeLeadEvidence({crm_stage:'qualified',journey:{journeyDepth:6}},{stage:'lead',pagesViewed:1})
  assert.equal(scoreLead(merged).score,20)
})
