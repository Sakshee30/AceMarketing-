import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {embeddedDatabase,pool} from '../src/database.mjs'
import {withTenantDbTransaction} from '../src/platform/tenant-db.mjs'
import {moveBoardItem,validateBoardMoveCommand} from '../src/platform/board-store.mjs'

const token=()=>randomUUID().replaceAll('-','')

test('board move command rejects ambiguous placement input',()=>{
  assert.throws(
    ()=>validateBoardMoveCommand({
      operationId:'op_1',boardId:'board_1',itemId:'item_1',
      expectedItemVersion:1,expectedPolicyVersion:1,destinationColumnId:'column_2',
      placement:{mode:'between'}
    }),
    error=>error?.code==='BOARD_MOVE_INVALID_NEIGHBORS'
  )
})

test('board move is durable idempotent tenant-scoped and version checked',{skip:embeddedDatabase||!pool},async()=>{
  const suffix=token()
  const workspaceId='ws_board_'+suffix
  const otherWorkspaceId='ws_other_'+suffix
  const boardId='board_'+suffix
  const source='column_source_'+suffix
  const destination='column_destination_'+suffix
  const itemId='item_'+suffix

  await withTenantDbTransaction(workspaceId,async client=>{
    await client.query(
      `INSERT INTO ace_boards(id,workspace_id,name) VALUES($1,$2,'Board test')`,
      [boardId,workspaceId]
    )
    await client.query(
      `INSERT INTO ace_board_columns(id,workspace_id,board_id,state_key,name,position,wip_limit)
       VALUES($1,$2,$3,'source','Source',1,NULL),($4,$2,$3,'destination','Destination',2,10)`,
      [source,workspaceId,boardId,destination]
    )
    await client.query(
      `INSERT INTO ace_board_items(workspace_id,board_id,item_id,resource_type,resource_id,column_id,rank,item_version,policy_version)
       VALUES($1,$2,$3,'lead',$3,$4,1000000,1,1)`,
      [workspaceId,boardId,itemId,source]
    )
  })

  const command={
    operationId:'op_'+suffix,
    boardId,
    itemId,
    expectedItemVersion:1,
    expectedPolicyVersion:1,
    destinationColumnId:destination,
    placement:{mode:'bottom'},
    reason:'test move'
  }
  const first=await moveBoardItem({
    workspaceId,
    actorId:'user_test',
    requestId:'req_'+suffix,
    command,
    authorize:()=>true
  })
  assert.equal(first.status,'confirmed')
  assert.equal(first.itemVersion,2)
  assert.equal(first.destinationColumnId,destination)

  const replay=await moveBoardItem({
    workspaceId,
    actorId:'user_test',
    requestId:'req_replay_'+suffix,
    command,
    authorize:()=>true
  })
  assert.deepEqual(replay,first)

  await assert.rejects(
    ()=>moveBoardItem({
      workspaceId,
      actorId:'user_test',
      command:{...command,operationId:'op_stale_'+suffix,expectedItemVersion:1},
      authorize:()=>true
    }),
    error=>error?.code==='BOARD_ITEM_VERSION_CONFLICT'&&error?.currentVersion===2
  )

  await assert.rejects(
    ()=>moveBoardItem({
      workspaceId:otherWorkspaceId,
      actorId:'user_test',
      command:{...command,operationId:'op_other_'+suffix,expectedItemVersion:2},
      authorize:()=>true
    }),
    error=>error?.code==='BOARD_NOT_FOUND'
  )

  const evidence=await withTenantDbTransaction(workspaceId,async client=>{
    const item=(await client.query(
      'SELECT column_id,item_version FROM ace_board_items WHERE workspace_id=$1 AND board_id=$2 AND item_id=$3',
      [workspaceId,boardId,itemId]
    )).rows[0]
    const audit=(await client.query(
      `SELECT count(*)::int count FROM ace_platform_audit
       WHERE workspace_id=$1 AND action='board.item.move' AND entity_id=$2`,
      [workspaceId,itemId]
    )).rows[0]
    const outbox=(await client.query(
      `SELECT count(*)::int count FROM ace_outbox_events
       WHERE workspace_id=$1 AND event_type='board.item.moved' AND aggregate_id=$2`,
      [workspaceId,itemId]
    )).rows[0]
    return {item,audit:Number(audit.count),outbox:Number(outbox.count)}
  })
  assert.equal(evidence.item.column_id,destination)
  assert.equal(Number(evidence.item.item_version),2)
  assert.equal(evidence.audit,1)
  assert.equal(evidence.outbox,1)

  await withTenantDbTransaction(workspaceId,async client=>{
    await client.query('DELETE FROM ace_outbox_events WHERE workspace_id=$1 AND aggregate_id=$2',[workspaceId,itemId])
    await client.query('DELETE FROM ace_platform_audit WHERE workspace_id=$1 AND entity_id=$2',[workspaceId,itemId])
    await client.query('DELETE FROM ace_board_operations WHERE workspace_id=$1 AND board_id=$2',[workspaceId,boardId])
    await client.query('DELETE FROM ace_board_items WHERE workspace_id=$1 AND board_id=$2',[workspaceId,boardId])
    await client.query('DELETE FROM ace_board_columns WHERE workspace_id=$1 AND board_id=$2',[workspaceId,boardId])
    await client.query('DELETE FROM ace_boards WHERE workspace_id=$1 AND id=$2',[workspaceId,boardId])
  })
})
