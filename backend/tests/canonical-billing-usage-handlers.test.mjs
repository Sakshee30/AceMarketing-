import test from 'node:test'
import assert from 'node:assert/strict'
import {handleRecordUsage} from '../modules/usage/src/application/commands/record-usage/record-usage.handler.mjs'
import {handleReserveQuota} from '../modules/usage/src/application/commands/reserve-quota/reserve-quota.handler.mjs'
import {handleChangeSubscription} from '../modules/billing/src/application/commands/change-subscription/change-subscription.handler.mjs'
import {handleReconcilePayment} from '../modules/billing/src/application/commands/reconcile-payment/reconcile-payment.handler.mjs'

test('usage recording validates tenant/event/metric and preserves reservation linkage',async()=>{
  let captured=null
  const result=await handleRecordUsage({
    workspaceId:' ws_1 ',
    eventId:' evt_1 ',
    metric:'tracked_events',
    quantity:2,
    requestId:'req_1',
    reservationId:'ur_1',
    metadata:{path:'/api/track'},
    record:async args=>{captured=args;return {recorded:true}}
  })
  assert.equal(result.recorded,true)
  assert.equal(captured.workspaceId,'ws_1')
  assert.equal(captured.eventId,'evt_1')
  assert.equal(captured.quantity,2)
  assert.equal(captured.reservationId,'ur_1')
})

test('quota reservation preserves request id and bounded quantity',async()=>{
  let captured=null
  const result=await handleReserveQuota({
    workspaceId:'ws_1',
    metric:'tracked_events',
    quantity:3,
    requestId:'req_1',
    reserve:async (...args)=>{captured=args;return {allowed:true,reservationId:'ur_1'}}
  })
  assert.equal(result.allowed,true)
  assert.deepEqual(captured,['ws_1','tracked_events',3,'req_1'])
})

test('billing subscription change delegates existing entitlement validation contract',async()=>{
  let captured=null
  const result=await handleChangeSubscription({
    workspaceId:'ws_1',
    input:{planCode:'growth',status:'active',entitlements:{tracked_events:200}},
    change:async (workspaceId,input)=>{captured={workspaceId,input};return {workspace_id:workspaceId,plan_code:input.planCode}}
  })
  assert.equal(result.plan_code,'growth')
  assert.equal(captured.workspaceId,'ws_1')
  assert.equal(captured.input.entitlements.tracked_events,200)
})

test('billing reconciliation requires provider event identity before delegation',async()=>{
  await assert.rejects(
    ()=>handleReconcilePayment({event:{type:'invoice.paid'},reconcile:async()=>({})}),
    error=>error?.code==='billing_event_invalid'
  )
  const result=await handleReconcilePayment({
    event:{id:'evt_1',type:'invoice.paid',data:{object:{}}},
    reconcile:async event=>({processed:true,eventType:event.type})
  })
  assert.deepEqual(result,{processed:true,eventType:'invoice.paid'})
})
