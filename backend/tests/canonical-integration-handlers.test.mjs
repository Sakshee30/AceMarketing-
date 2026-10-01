import test from 'node:test'
import assert from 'node:assert/strict'
import {handleConnectProvider} from '../modules/integrations/src/application/commands/connect-provider/connect-provider.handler.mjs'
import {handleReconcileIntegration} from '../modules/integrations/src/application/commands/reconcile-sync/reconcile-sync.handler.mjs'
import {handleDeliverWebhook} from '../modules/webhooks/src/application/commands/deliver-webhook/deliver-webhook.handler.mjs'
import {handleReplayWebhookDelivery} from '../modules/webhooks/src/application/commands/replay-delivery/replay-delivery.handler.mjs'

test('integration connect handler preserves existing custom integration payload',async()=>{
  let captured=null
  const result=await handleConnectProvider({
    workspaceId:' ws_1 ',
    input:{name:'CRM',baseUrl:'https://example.com',identity:'email'},
    create:async (workspaceId,input)=>{captured={workspaceId,input};return {id:'ci_1'}}
  })
  assert.deepEqual(result,{id:'ci_1'})
  assert.equal(captured.workspaceId,'ws_1')
  assert.equal(captured.input.name,'CRM')
})

test('integration reconcile handler requires a target and delegates verification',async()=>{
  await assert.rejects(
    ()=>handleReconcileIntegration({workspaceId:'ws_1',input:{},test:async()=>({})}),
    error=>error?.code==='integration_target_required'
  )
  const result=await handleReconcileIntegration({
    workspaceId:'ws_1',
    input:{id:'ci_1'},
    test:async (workspaceId,input)=>({workspaceId,id:input.id,ok:true})
  })
  assert.equal(result.ok,true)
  assert.equal(result.id,'ci_1')
})

test('webhook delivery handler preserves durable worker dispatch contract',async()=>{
  let captured=null
  const result=await handleDeliverWebhook({
    workspaceId:'ws_1',
    deliveryId:'whd_1',
    dispatch:async args=>{captured=args;return {delivered:true}}
  })
  assert.equal(result.delivered,true)
  assert.deepEqual(captured,{workspaceId:'ws_1',deliveryId:'whd_1'})
})

test('webhook replay handler preserves actor and source delivery identity',async()=>{
  let captured=null
  const result=await handleReplayWebhookDelivery({
    workspaceId:'ws_1',
    deliveryId:'whd_1',
    actorId:'u1',
    replay:async args=>{captured=args;return {id:'whd_2',replayOf:args.deliveryId}}
  })
  assert.equal(result.replayOf,'whd_1')
  assert.deepEqual(captured,{workspaceId:'ws_1',deliveryId:'whd_1',actorId:'u1'})
})
