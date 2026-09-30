import test from 'node:test'
import assert from 'node:assert/strict'
import {embeddedDatabase,pool} from '../src/database.mjs'
import {
  applyBillingSubscriptionChange,
  billingAccessPolicy,
  billingReconciliationHistory,
  billingSubscriptionStates,
  validateBillingStatus
} from '../src/platform/billing-lifecycle.mjs'

test('billing lifecycle exposes explicit trial grace suspension cancellation and expiry states',()=>{
  const states=billingSubscriptionStates()
  for(const value of ['trial','active','grace','past_due','suspended','cancelled','expired']){
    assert.ok(states.includes(value))
    assert.equal(validateBillingStatus(value),value)
  }
  assert.equal(billingAccessPolicy('active').writeAllowed,true)
  assert.equal(billingAccessPolicy('grace').writeAllowed,true)
  assert.equal(billingAccessPolicy('suspended').writeAllowed,false)
  assert.equal(billingAccessPolicy('expired').mode,'retained-read-only')
})

test('entitlement changes are versioned and provider events create reconciliation evidence',{skip:embeddedDatabase||!pool},async()=>{
  const workspaceId='ws_bill_'+Date.now()
  const first=await applyBillingSubscriptionChange(workspaceId,{
    planCode:'starter',
    status:'active',
    entitlements:{tracked_events:100}
  },{source:'test'})
  const second=await applyBillingSubscriptionChange(workspaceId,{
    planCode:'growth',
    entitlements:{tracked_events:200}
  },{source:'stripe-webhook',provider:'stripe',providerEventId:'evt_'+Date.now(),reason:'subscription.updated'})
  assert.equal(second.entitlementChanged,true)
  assert.ok(second.entitlementsVersion>first.entitlementsVersion)
  const history=await billingReconciliationHistory(workspaceId)
  assert.ok(history.length>=1)
  assert.equal(history[0].provider,'stripe')
  assert.equal(history[0].next_plan_code,'growth')
})

test('status-only billing changes do not rewrite entitlement history version',{skip:embeddedDatabase||!pool},async()=>{
  const workspaceId='ws_bill_state_'+Date.now()
  const first=await applyBillingSubscriptionChange(workspaceId,{
    planCode:'usage',
    status:'active',
    entitlements:{tracked_events:10}
  },{source:'test'})
  const next=await applyBillingSubscriptionChange(workspaceId,{
    status:'past_due',
    reason:'payment_failed'
  },{source:'stripe-webhook',provider:'stripe',providerEventId:'evt_state_'+Date.now()})
  assert.equal(next.entitlementsVersion,first.entitlementsVersion)
  assert.equal(next.item.status,'past_due')
})
