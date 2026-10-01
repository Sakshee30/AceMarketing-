import test from 'node:test'
import assert from 'node:assert/strict'
import {handleSubmitJob} from '../modules/jobs/src/application/commands/submit-job/submit-job.handler.mjs'
import {handleEvaluateDueSchedule} from '../modules/scheduling/src/application/commands/evaluate-due-schedule/evaluate-due-schedule.handler.mjs'
import {handleSendNotification} from '../modules/notifications/src/application/commands/send-notification/send-notification.handler.mjs'
import {handleRunReport} from '../modules/reporting/src/application/commands/run-report/run-report.handler.mjs'

test('job submission preserves idempotency and bounds attempts',async()=>{
  let captured=null
  const result=await handleSubmitJob({
    workspaceId:' ws_1 ',
    kind:'report_delivery',
    payload:{deliveryId:'rd_1'},
    idempotencyKey:'report:rd_1',
    maxAttempts:100,
    submit:async args=>{captured=args;return {id:'job_1',status:'pending'}}
  })
  assert.equal(result.id,'job_1')
  assert.equal(captured.workspaceId,'ws_1')
  assert.equal(captured.idempotencyKey,'report:rd_1')
  assert.equal(captured.maxAttempts,25)
})

test('scheduler evaluation bounds batches and returns both schedule classes',async()=>{
  let audienceLimit=null
  let reportLimit=null
  const result=await handleEvaluateDueSchedule({
    audienceLimit:1000,
    reportLimit:0,
    runAudience:async limit=>{audienceLimit=limit;return [{id:'a1'}]},
    runReports:async limit=>{reportLimit=limit;return [{id:'r1'}]}
  })
  assert.equal(audienceLimit,100)
  assert.equal(reportLimit,10)
  assert.equal(result.audiences.length,1)
  assert.equal(result.reports.length,1)
})

test('notification handler exposes only implemented notification kinds',async()=>{
  let captured=null
  const result=await handleSendNotification({
    kind:'password_reset',
    recipient:' USER@EXAMPLE.COM ',
    token:'secret',
    sendReset:async args=>{captured=args;return {sent:true}}
  })
  assert.equal(result.sent,true)
  assert.deepEqual(captured,{email:'user@example.com',token:'secret'})
  await assert.rejects(
    ()=>handleSendNotification({kind:'arbitrary',recipient:'user@example.com',sendReset:async()=>({})}),
    error=>error?.code==='notification_kind_unsupported'
  )
})

test('report execution requires tenant and schedule identity before durable queueing',async()=>{
  let captured=null
  const result=await handleRunReport({
    workspaceId:'ws_1',
    scheduleId:'rep_1',
    queue:async (workspaceId,scheduleId)=>{captured={workspaceId,scheduleId};return {status:'queued'}}
  })
  assert.equal(result.status,'queued')
  assert.deepEqual(captured,{workspaceId:'ws_1',scheduleId:'rep_1'})
})
