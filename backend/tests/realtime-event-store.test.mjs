import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {embeddedDatabase,pool} from '../src/database.mjs'
import {appendRealtimeEvent,listRealtimeEventsAfter} from '../src/platform/realtime-event-store.mjs'

test('realtime event projection is durable ordered and tenant scoped',{skip:embeddedDatabase||!pool},async()=>{
  const token=randomUUID().replaceAll('-','')
  const left='ws_rt_left_'+token
  const right='ws_rt_right_'+token
  const first=await appendRealtimeEvent({
    id:'evt_rt_'+token,
    workspaceId:left,
    eventType:'board.item.moved',
    resourceType:'board-item',
    resourceId:'item_'+token,
    payload:{data:{boardId:'board_'+token}}
  })
  const replay=await appendRealtimeEvent({
    id:'evt_rt_'+token,
    workspaceId:left,
    eventType:'board.item.moved',
    resourceType:'board-item',
    resourceId:'item_'+token,
    payload:{data:{boardId:'board_'+token}}
  })
  assert.equal(Number(replay.sequence),Number(first.sequence))

  const visible=await listRealtimeEventsAfter({workspaceId:left,afterSequence:0,eventTypes:['board.item.moved']})
  const hidden=await listRealtimeEventsAfter({workspaceId:right,afterSequence:0,eventTypes:['board.item.moved']})
  assert.equal(visible.some(item=>item.id==='evt_rt_'+token),true)
  assert.equal(hidden.some(item=>item.id==='evt_rt_'+token),false)

  await pool.query('DELETE FROM ace_realtime_events WHERE id=$1',['evt_rt_'+token])
})
