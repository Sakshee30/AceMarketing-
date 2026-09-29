import test from 'node:test'
import assert from 'node:assert/strict'
import {activationExecutionEnabled,activationQueueStatusProcessable,reconcileStaleActivationDispatches,validateActivationAdapterInput} from '../src/ai-activation-execution.mjs'
import {hasPermission} from '../src/security.mjs'
import {activationProviderForUrl,activationRequestJson,googleAdsReferenceCount} from '../src/activation-adapters.mjs'
import {assertNoActiveActivationDispatch} from '../src/ai-registry-store.mjs'
import {pool} from '../src/database.mjs'

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


test('credentialed activation requests reject redirects instead of forwarding secrets',async()=>{
  const previousFetch=globalThis.fetch
  let optionsSeen=null
  globalThis.fetch=async(_url,options)=>{
    optionsSeen=options
    return new Response('',{status:302,headers:{location:'https://example.invalid/redirect'}})
  }
  try{
    await assert.rejects(
      ()=>activationRequestJson('https://googleads.googleapis.com/v25/test',{
        method:'POST',
        headers:{Authorization:'Bearer test-only','developer-token':'test-only'},
        body:'{}'
      }),
      error=>{
        assert.equal(error.status,302)
        assert.equal(error.unknownOutcome,false)
        return true
      }
    )
    assert.equal(optionsSeen.redirect,'manual')
  }finally{
    globalThis.fetch=previousFetch
  }
})

test('Google Ads shared-budget reference count rejects malformed provider values',()=>{
  assert.equal(googleAdsReferenceCount(0),0)
  assert.equal(googleAdsReferenceCount('2'),2)
  assert.throws(()=>googleAdsReferenceCount('not-a-number'),/invalid campaign budget referenceCount/)
  assert.throws(()=>googleAdsReferenceCount(-1),/invalid campaign budget referenceCount/)
  assert.throws(()=>googleAdsReferenceCount(1.5),/invalid campaign budget referenceCount/)
})


test('expired activation dispatch is recorded as unknown and continues to block lifecycle changes',async()=>{
  const id='aiprop_stale_'+Date.now()
  const workspaceId='ws_stale_'+Date.now()
  await pool.query(
    `INSERT INTO ace_ai_activation_proposals
      (id,workspace_id,proposal_type,proposal_hash,evidence_snapshot,model_snapshot,policy_result,payload,status,expires_at,task,
       execution_status,execution_fence_token,execution_lease_until)
     VALUES ($1,$2,'budget_change',$3,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,$4::jsonb,'approved',now()+interval '1 hour','forecast_primary',
             'running','old-fence',now()-interval '1 minute')`,
    [id,workspaceId,'hash_'+id,JSON.stringify({providerAdapter:'google_ads_budget'})]
  )
  try{
    const reconciled=await reconcileStaleActivationDispatches({limit:10})
    const item=reconciled.find(row=>row.id===id)
    assert.ok(item)
    assert.equal(item.execution_status,'blocked')
    assert.equal(item.execution_outcome_state,'unknown')
    assert.equal(item.execution_fence_token,null)
    const client=await pool.connect()
    try{
      await assert.rejects(
        ()=>assertNoActiveActivationDispatch(client,{workspaceId,task:'forecast_primary'}),
        /lifecycle change is blocked/
      )
    }finally{
      client.release()
    }
  }finally{
    await pool.query('DELETE FROM ace_ai_activation_proposals WHERE id=$1 AND workspace_id=$2',[id,workspaceId])
  }
})
