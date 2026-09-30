import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {assertWorkspaceCell,clearCellPlacementCache,getWorkspacePlacement,upsertWorkspacePlacement} from '../src/platform/cell-placement.mjs'

test('tenant placement resolves one home cell and rejects stale routes',async()=>{
  const workspaceId='ws_cell_'+randomUUID().replaceAll('-','')
  const first=await upsertWorkspacePlacement({
    workspaceId,
    homeCell:'cell-a',
    homeRegion:'ap-south-1',
    routingEpoch:3
  })
  assert.equal(first.homeCell,'cell-a')
  assert.equal(first.routingEpoch,3)
  clearCellPlacementCache(workspaceId)
  const loaded=await getWorkspacePlacement(workspaceId)
  assert.equal(loaded.homeRegion,'ap-south-1')
  await assert.rejects(
    ()=>assertWorkspaceCell({workspaceId,expectedCell:'cell-b'}),
    error=>error?.code==='cell_route_mismatch'
  )
  await assert.rejects(
    ()=>assertWorkspaceCell({workspaceId,expectedCell:'cell-a',routingEpoch:2}),
    error=>error?.code==='cell_routing_epoch_stale'
  )
  const valid=await assertWorkspaceCell({workspaceId,expectedCell:'cell-a',routingEpoch:3})
  assert.equal(valid.workspaceId,workspaceId)
})

test('moving placement fails closed until ownership cutover completes',async()=>{
  const workspaceId='ws_cell_move_'+randomUUID().replaceAll('-','')
  await upsertWorkspacePlacement({
    workspaceId,
    homeCell:'cell-a',
    homeRegion:'ap-south-1',
    routingEpoch:7,
    state:'moving'
  })
  await assert.rejects(
    ()=>assertWorkspaceCell({workspaceId,expectedCell:'cell-a',routingEpoch:7}),
    error=>error?.code==='cell_placement_moving'
  )
})
