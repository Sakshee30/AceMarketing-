import test from 'node:test'
import assert from 'node:assert/strict'
import {activationProposalHash,assertActivationApprovalActor,assertActivationProposalFresh,buildActivationProposalInput,validateActivationProposalPolicy} from '../src/ai-activation-proposals.mjs'

const route={
  task:'forecast_primary',
  requestedModel:'amazon/chronos-2',
  artifactRevision:'rev_1',
  evaluationReference:'eval_1',
  evaluationStatus:'qualified',
  approvalStatus:'approved',
  deploymentStatus:'deployed'
}

test('activation proposal requires immutable evidence and provider adapter',()=>{
  assert.throws(()=>buildActivationProposalInput({
    task:'forecast_primary',proposalType:'budget_change',payload:{providerAdapter:'google_ads'},evidenceSnapshot:{evidenceRefs:[]},
    modelSnapshot:route,expiresAt:new Date(Date.now()+60_000).toISOString(),createdBy:'u1'
  }),/evidence reference/)
  assert.throws(()=>buildActivationProposalInput({
    task:'forecast_primary',proposalType:'budget_change',payload:{},evidenceSnapshot:{evidenceRefs:['e1']},
    modelSnapshot:route,expiresAt:new Date(Date.now()+60_000).toISOString(),createdBy:'u1'
  }),/providerAdapter/)
})

test('activation proposal expiry is bounded',()=>{
  assert.throws(()=>buildActivationProposalInput({
    task:'forecast_primary',proposalType:'budget_change',payload:{providerAdapter:'google_ads'},evidenceSnapshot:{evidenceRefs:['e1']},
    modelSnapshot:route,expiresAt:new Date(Date.now()+25*60*60*1000).toISOString(),createdBy:'u1'
  }),/24 hours/)
})

test('creator cannot approve own activation proposal',()=>{
  assert.throws(()=>assertActivationApprovalActor('u1','u1'),/separation of duties/)
  assert.doesNotThrow(()=>assertActivationApprovalActor('u1','u2'))
})

test('stale or tampered proposals are rejected',()=>{
  const expiresAt=new Date(Date.now()+60_000).toISOString()
  const immutable={task:'forecast_primary',proposalType:'budget_change',payload:{providerAdapter:'google_ads',budget:100},evidenceSnapshot:{evidenceRefs:['e1']},modelSnapshot:route,expiresAt}
  const row={...immutable,proposalHash:activationProposalHash(immutable)}
  assert.doesNotThrow(()=>assertActivationProposalFresh({row,route}))
  assert.throws(()=>assertActivationProposalFresh({row:{...row,payload:{...row.payload,budget:200}},route}),/integrity/)
  assert.throws(()=>assertActivationProposalFresh({row,route:{...route,evaluationReference:'eval_2'}}),/stale: evaluation/)
})


test('budget activation proposal is rejected before review when deterministic change limits fail',()=>{
  const valid={
    proposalType:'budget_change',
    payload:{
      providerAdapter:'google_ads_budget',
      campaignBudgetResourceName:'customers/123/campaignBudgets/456',
      expectedCurrentAmountMicros:100000000,
      newAmountMicros:110000000
    }
  }
  const checked=validateActivationProposalPolicy(valid)
  assert.equal(checked.bounded,true)
  assert.equal(checked.changePct,10)

  assert.throws(
    ()=>validateActivationProposalPolicy({
      ...valid,
      payload:{...valid.payload,newAmountMicros:150000000}
    }),
    /percentage limit/
  )
})


test('invalid budget percentage configuration fails closed',()=>{
  const previous=process.env.AI_ACTIVATION_MAX_BUDGET_CHANGE_PCT
  process.env.AI_ACTIVATION_MAX_BUDGET_CHANGE_PCT='not-a-number'
  try{
    assert.throws(
      ()=>validateActivationProposalPolicy({
        proposalType:'budget_change',
        payload:{
          providerAdapter:'google_ads_budget',
          campaignBudgetResourceName:'customers/123/campaignBudgets/456',
          expectedCurrentAmountMicros:100000000,
          newAmountMicros:101000000
        }
      }),
      /AI_ACTIVATION_MAX_BUDGET_CHANGE_PCT/
    )
  }finally{
    if(previous==null)delete process.env.AI_ACTIVATION_MAX_BUDGET_CHANGE_PCT
    else process.env.AI_ACTIVATION_MAX_BUDGET_CHANGE_PCT=previous
  }
})
