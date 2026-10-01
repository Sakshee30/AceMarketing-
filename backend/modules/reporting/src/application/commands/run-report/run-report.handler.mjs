import {queueReportNow} from '../../../../../../src/report-scheduler.mjs'

export const handleRunReport=async({
  workspaceId,
  scheduleId,
  queue=queueReportNow
})=>{
  const scope=String(workspaceId||'').trim()
  const id=String(scheduleId||'').trim()
  if(!scope)throw Object.assign(new Error('workspace scope required'),{status:400,code:'workspace_scope_required'})
  if(!id)throw Object.assign(new Error('report schedule id required'),{status:400,code:'report_schedule_id_required'})
  return queue(scope,id)
}
