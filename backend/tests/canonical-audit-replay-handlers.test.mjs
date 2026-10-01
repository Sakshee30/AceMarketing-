import test from 'node:test'
import assert from 'node:assert/strict'
import {handleReplayDeadLetter} from '../modules/jobs/src/application/commands/replay-dead-letter/replay-dead-letter.handler.mjs'
import {handleSearchAudit} from '../modules/audit/src/application/queries/search-audit/search-audit.handler.mjs'
import {handleExportAudit} from '../modules/audit/src/application/commands/export-audit/export-audit.handler.mjs'

test('dead-letter replay requires tenant and job identity',async()=>{
  let captured=null
  const result=await handleReplayDeadLetter({
    workspaceId:'ws_1',jobId:'job_1',
    replay:async args=>{captured=args;return {id:args.id,status:'retry'}}
  })
  assert.equal(result.status,'retry')
  assert.deepEqual(captured,{workspaceId:'ws_1',id:'job_1'})
})

test('audit search bounds page size and preserves cursor',async()=>{
  let captured=null
  const items=await handleSearchAudit({
    workspaceId:'ws_1',limit:900,before:'2026-10-01T00:00:00Z',
    search:async args=>{captured=args;return [{id:'audit_1'}]}
  })
  assert.equal(items.length,1)
  assert.equal(captured.limit,500)
  assert.equal(captured.before,'2026-10-01T00:00:00Z')
})

test('audit export is admitted as durable idempotent job',async()=>{
  let captured=null
  const job=await handleExportAudit({
    workspaceId:'ws_1',limit:500,actorId:'u1',requestId:'req_1',
    submit:async args=>{captured=args;return {id:'job_1',status:'pending'}}
  })
  assert.equal(job.id,'job_1')
  assert.equal(captured.kind,'audit_export')
  assert.equal(captured.idempotencyKey,'audit-export:ws_1:req_1')
  assert.equal(captured.resultSchemaVersion,'audit-export.v1')
})
