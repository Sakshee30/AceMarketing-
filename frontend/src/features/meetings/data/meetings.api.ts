import {api} from '../../../lib/api'

export const meetingsApi={
  load:()=>api.meetings(),
  scheduler:()=>api.voiceScheduler(),
  create:(payload:Record<string,unknown>)=>api.createMeeting(payload),
  createVoiceScheduler:(payload:Record<string,unknown>)=>api.createVoiceScheduler(payload),
  remind:(id:string)=>api.sendMeetingReminder(id),
  connectCalendar:()=>api.connectIntegration('Google Calendar'),
  reschedule:(id:string,startsAt:string)=>api.rescheduleMeeting(id,startsAt)
}
