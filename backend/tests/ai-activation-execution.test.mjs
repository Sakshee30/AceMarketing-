import test from 'node:test'
import assert from 'node:assert/strict'
import {activationExecutionEnabled,activationQueueStatusProcessable,validateActivationAdapterInput} from '../src/ai-activation-execution.mjs'
import {hasPermission} from '../src/security.mjs'
import {activationProviderForUrl} from '../src/activation-adapters.mjs'

const withEnv=(key,value,fn)=>{
  const previous=process.env[key]
  if(value==null)delete process.env[key]
  else process.env[key]=String(value)
  try{return fn()}
  finally{
    if(previous==null)delete process.env[key]
    else process.env[key]=previous
  }
}

test('AI provider-side activation execution is disabled by default',()=>{
  withEnv('AI_ACTIVATION_EXECUTION_ENABLED',null,()=>{
    assert.equal(activationExecutionEnabled(),false)
  })
  withEnv('AI_ACTIVATION_EXECUTION_ENABLED','true',()=>{
    assert.equal(activationExecutionEnabled(),true)
  })
})

test('audience execution accepts only explicit existing consent-aware adapters',()=>{
  assert.deepEqual(
    validateActivationAdapterInput({
      proposalType:'audience_sync',
      payload:{providerAdapter:'meta_audience',audienceId:'aud_123'}
    }),
    {kind:'audience_sync',adapter:'meta_audience',audienceId:'aud_123'}
  )
  assert.throws(
    ()=>validateActivationAdapterInput({
      proposalType:'audience_sync',
      payload:{providerAdapter:'unknown',audienceId:'aud_123'}
    }),
    /unsupported audience execution adapter/
  )
  assert.throws(
    ()=>validateActivationAdapterInput({
      proposalType:'audience_sync',
      payload:{providerAdapter:'google_audience'}
    }),
    /audienceId/
  )
})

test('CRM execution validates provider and lead reference before queueing',()=>{
  assert.deepEqual(
    validateActivationAdapterInput({
      proposalType:'crm_writeback',
      payload:{providerAdapter:'hubspot_crm',leadRef:'lead_123',fields:{recordId:'contact_1'}}
    }),
    {kind:'crm_writeback',adapter:'hubspot_crm',leadRef:'lead_123',fields:{recordId:'contact_1'}}
  )
  assert.throws(
    ()=>validateActivationAdapterInput({
      proposalType:'crm_writeback',
      payload:{providerAdapter:'salesforce_crm'}
    }),
    /leadRef/
  )
})

test('Google Ads budget execution requires immutable current/new micros and a scoped resource',()=>{
  assert.deepEqual(
    validateActivationAdapterInput({
      proposalType:'budget_change',
      payload:{
        providerAdapter:'google_ads_budget',
        campaignBudgetResourceName:'customers/123/campaignBudgets/456',
        expectedCurrentAmountMicros:100000000,
        newAmountMicros:110000000,
        sharedBudgetAcknowledged:false
      }
    }),
    {
      kind:'budget_change',
      adapter:'google_ads_budget',
      campaignBudgetResourceName:'customers/123/campaignBudgets/456',
      expectedCurrentAmountMicros:100000000,
      newAmountMicros:110000000,
      sharedBudgetAcknowledged:false
    }
  )
  assert.throws(
    ()=>validateActivationAdapterInput({
      proposalType:'budget_change',
      payload:{providerAdapter:'google_ads_budget',campaignBudgetResourceName:'customers/123/campaignBudgets/456',newAmountMicros:110000000}
    }),
    /expectedCurrentAmountMicros/
  )
  assert.throws(
    ()=>validateActivationAdapterInput({
      proposalType:'budget_change',
      payload:{providerAdapter:'unknown_budget',campaignBudgetResourceName:'customers/123/campaignBudgets/456',expectedCurrentAmountMicros:100000000,newAmountMicros:110000000}
    }),
    /unsupported budget execution adapter/
  )
})

test('execution permission is separated from propose and approve permissions',()=>{
  assert.equal(hasPermission('admin','ai.activation.execute'),true)
  assert.equal(hasPermission('operator','ai.activation.execute'),false)
  assert.equal(hasPermission('analyst','ai.activation.execute'),false)
})


test('terminal durable job states cannot be relabelled as queued activation execution',()=>{
  for(const status of ['failed','dead_letter','cancelled','succeeded','unknown','']){
    assert.equal(activationQueueStatusProcessable(status),false,status)
  }
  for(const status of ['pending','retry','leased']){
    assert.equal(activationQueueStatusProcessable(status),true,status)
  }
})


test('activation egress rejects plaintext and unapproved provider hosts',()=>{
  assert.equal(activationProviderForUrl('https://googleads.googleapis.com/v25/customers/123/campaignBudgets:mutate'),'google')
  assert.equal(activationProviderForUrl('https://graph.facebook.com/v26.0/act_123/customaudiences'),'meta')
  assert.equal(activationProviderForUrl('https://tenant.my.salesforce.com/services/data/v65.0/sobjects/Lead/1'),'salesforce')
  assert.throws(()=>activationProviderForUrl('http://googleads.googleapis.com/v25/test'),/HTTPS/)
  assert.throws(()=>activationProviderForUrl('https://googleads.googleapis.com.evil.example/test'),/not allowlisted/)
  assert.throws(()=>activationProviderForUrl('https://evilzoho.example/test'),/not allowlisted/)
})
