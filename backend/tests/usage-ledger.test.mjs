import test from 'node:test'
import assert from 'node:assert/strict'
import {embeddedDatabase,pool} from '../src/database.mjs'
import {
  effectiveUsageForMetric,
  finalizeUsageReservation,
  recordUsageLedgerEvent,
  reserveUsageCapacity
} from '../src/platform/usage-ledger.mjs'

test('embedded profile keeps usage-ledger APIs safe without pretending RLS support',async()=>{
  if(!embeddedDatabase)return
  const result=await recordUsageLedgerEvent({workspaceId:'ws_embedded',eventId:'e1',metric:'tracked_events'})
  assert.equal(result.recorded,false)
})

test('quota reservations remain atomic and ledger-backed on PostgreSQL',{skip:embeddedDatabase||!pool},async()=>{
  const workspaceId='ws_usage_'+Date.now()
  await pool.query(
    `INSERT INTO ace_workspace_subscriptions(workspace_id,plan_code,status,entitlements)
     VALUES($1,'test','active',$2::jsonb)
     ON CONFLICT (workspace_id) DO UPDATE SET status='active',entitlements=$2::jsonb`,
    [workspaceId,JSON.stringify({tracked_events:2})]
  )
  const [a,b,c]=await Promise.all([
    reserveUsageCapacity({workspaceId,metric:'tracked_events',quantity:1,requestId:'req-a',limit:2}),
    reserveUsageCapacity({workspaceId,metric:'tracked_events',quantity:1,requestId:'req-b',limit:2}),
    reserveUsageCapacity({workspaceId,metric:'tracked_events',quantity:1,requestId:'req-c',limit:2})
  ])
  assert.equal([a,b,c].filter(x=>x.allowed).length,2)
  const accepted=[a,b,c].find(x=>x.allowed)
  await finalizeUsageReservation({workspaceId,id:accepted.reservationId,success:true})
  await recordUsageLedgerEvent({
    workspaceId,
    eventId:'api:'+accepted.reservationId,
    metric:'tracked_events',
    requestId:accepted===a?'req-a':accepted===b?'req-b':'req-c',
    reservationId:accepted.reservationId
  })
  const usage=await effectiveUsageForMetric({workspaceId,metric:'tracked_events'})
  assert.ok(usage.used>=1)
})
