import {runDueAudienceSchedules} from '../../../../../../src/audience-scheduler.mjs'
import {runDueReportSchedules} from '../../../../../../src/report-scheduler.mjs'

export const handleEvaluateDueSchedule=async({
  audienceLimit=10,
  reportLimit=10,
  runAudience=runDueAudienceSchedules,
  runReports=runDueReportSchedules
}={})=>{
  const safeAudienceLimit=Math.max(1,Math.min(100,Math.floor(Number(audienceLimit)||10)))
  const safeReportLimit=Math.max(1,Math.min(100,Math.floor(Number(reportLimit)||10)))
  const [audiences,reports]=await Promise.all([
    runAudience(safeAudienceLimit),
    runReports(safeReportLimit)
  ])
  return {audiences,reports}
}
