import {api} from '../../../lib/api'

export const executiveBriefsApi={
  cohorts:(months:number)=>api.cohorts(months),
  schedules:()=>api.reportSchedules(),
  saveSchedule:(payload:any)=>api.saveReportSchedule(payload),
  runNow:(scheduleId:string)=>api.runReportNow(scheduleId)
}
