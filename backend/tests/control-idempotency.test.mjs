import test from 'node:test'
import assert from 'node:assert/strict'
import {pool} from '../src/database.mjs'
import {beginControlCommand,finishControlCommand} from '../src/platform/control-idempotency.mjs'

test('control idempotency replays a completed command',{skip:!pool},async()=>{
  const actor='operator@example.test'
  const key='idem-test-'+Date.now()+'-123456'
  const first=await beginControlCommand({
    actor,
    key,
    operation:'change.transition:test',
    requestBody:{toState:'validating',expectedVersion:1}
  })
  assert.equal(first.execute,true)
  await finishControlCommand({
    id:first.command.id,
    responseStatus:200,
    responseBody:{ok:true,version:2}
  })
  const replay=await beginControlCommand({
    actor,
    key,
    operation:'change.transition:test',
    requestBody:{toState:'validating',expectedVersion:1}
  })
  assert.equal(replay.execute,false)
  assert.equal(replay.replay,true)
  assert.equal(replay.responseStatus,200)
  assert.equal(replay.responseBody.version,2)
})

test('control idempotency rejects key reuse with a different request',{skip:!pool},async()=>{
  const actor='operator@example.test'
  const key='idem-reuse-'+Date.now()+'-123456'
  const first=await beginControlCommand({
    actor,
    key,
    operation:'change.create',
    requestBody:{environment:'test',reason:'a'}
  })
  await finishControlCommand({id:first.command.id,responseStatus:201,responseBody:{id:'one'}})
  await assert.rejects(
    ()=>beginControlCommand({
      actor,
      key,
      operation:'change.create',
      requestBody:{environment:'production',reason:'b'}
    }),
    /already used/
  )
})
