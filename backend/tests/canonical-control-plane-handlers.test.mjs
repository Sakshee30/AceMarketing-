import test from 'node:test'
import assert from 'node:assert/strict'
import {handleActivateConfig} from '../modules/capabilities/src/application/commands/activate-config/activate-config.handler.mjs'
import {handleMigrateProvider} from '../modules/capabilities/src/application/commands/migrate-provider/migrate-provider.handler.mjs'
import {handleMoveTenant} from '../modules/cells/src/application/commands/move-tenant/move-tenant.handler.mjs'

test('runtime configuration activation requires actor and preserves desired-state payload',async()=>{
  let captured=null
  const result=await handleActivateConfig({
    environment:'production',features:{ai:'draining'},providerOverrides:{ai:{provider:'nim'}},
    admission:{maxConcurrent:10},sourceChangeId:'chg_1',actorId:'admin',
    publish:async args=>{captured=args;return {version:9,...args}}
  })
  assert.equal(result.version,9)
  assert.equal(captured.createdBy,'admin')
  assert.equal(captured.features.ai,'draining')
})

test('provider migration transition publishes resulting provider override snapshot',async()=>{
  let published=null
  const result=await handleMigrateProvider({
    mode:'transition',actorId:'admin',
    input:{id:'pvm_1',toState:'canary',trafficPercent:10,expectedVersion:2},
    advance:async()=>({id:'pvm_1',environment:'production',capability:'search',from_provider:'pg',to_provider:'os',state:'canary',traffic_percent:10,version:3}),
    latest:async()=>({payload:{providerOverrides:{cache:{provider:'redis'}}}}),
    migrationOverride:row=>({provider:row.to_provider,mode:row.state,trafficPercent:row.traffic_percent}),
    publish:async args=>{published=args;return {version:7,leaseExpiresAt:'later'}}
  })
  assert.equal(result.snapshotVersion,7)
  assert.equal(published.providerOverrides.search.provider,'os')
})

test('tenant cell move rejects stale routing epoch and increments authoritative epoch',async()=>{
  await assert.rejects(
    ()=>handleMoveTenant({workspaceId:'ws_1',homeCell:'cell-b',homeRegion:'ap-south-1',expectedRoutingEpoch:2,getPlacement:async()=>({routingEpoch:3}),upsert:async()=>({})}),
    error=>error?.code==='cell_routing_epoch_conflict'
  )
  let captured=null
  const result=await handleMoveTenant({
    workspaceId:'ws_1',homeCell:'cell-b',homeRegion:'ap-south-1',expectedRoutingEpoch:3,state:'moving',
    getPlacement:async()=>({routingEpoch:3}),
    upsert:async args=>{captured=args;return {...args}}
  })
  assert.equal(result.routingEpoch,4)
  assert.equal(captured.state,'moving')
})
