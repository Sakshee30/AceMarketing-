import {connectorCredential} from './connector-auth.mjs'

const calendarBase='https://www.googleapis.com/calendar/v3'
const parseJson=async response=>{
  const raw=await response.text()
  let body={}
  try{body=raw?JSON.parse(raw):{}}catch{body={raw:raw.slice(0,2000)}}
  if(!response.ok){
    const error=new Error('Google Calendar request failed: '+response.status)
    error.status=response.status
    error.providerBody=body
    throw error
  }
  return body
}
const authHeader=async workspaceId=>{
  const result=await connectorCredential(workspaceId,'Google Calendar')
  const accessToken=result?.token?.access_token
  if(!accessToken)throw new Error('Google Calendar is not connected')
  return {'Content-Type':'application/json','Authorization':'Bearer '+accessToken}
}
const iso=value=>{
  const d=new Date(value)
  if(Number.isNaN(d.getTime()))throw new Error('invalid calendar time')
  return d.toISOString()
}

export const createCalendarEvent=async(workspaceId,input={})=>{
  const headers=await authHeader(workspaceId)
  const calendarId=encodeURIComponent(String(input.calendarId||process.env.GOOGLE_CALENDAR_ID||'primary'))
  const start=iso(input.startsAt)
  const end=iso(input.endsAt||new Date(new Date(start).getTime()+Number(input.durationMinutes||45)*60000))
  const payload={
    summary:String(input.title||('AceMarketing consultation · '+(input.leadRef||input.lead||'Lead'))).slice(0,500),
    description:String(input.description||'Scheduled by AceMarketing Voice Scheduler').slice(0,8000),
    start:{dateTime:start},
    end:{dateTime:end},
    attendees:Array.isArray(input.attendees)?input.attendees.filter(Boolean).map(email=>({email:String(email)})):[],
    conferenceData:input.createMeetLink===false?undefined:{createRequest:{requestId:'ace-'+Date.now()+'-'+Math.random().toString(36).slice(2),conferenceSolutionKey:{type:'hangoutsMeet'}}}
  }
  if(!payload.attendees.length)delete payload.attendees
  const response=await fetch(`${calendarBase}/calendars/${calendarId}/events?conferenceDataVersion=1&sendUpdates=all`,{method:'POST',headers,body:JSON.stringify(payload)})
  const body=await parseJson(response)
  return {provider:'google_calendar',externalId:body.id||null,htmlLink:body.htmlLink||null,meetingLink:body.hangoutLink||null,status:body.status||'confirmed',start:body.start?.dateTime||start,end:body.end?.dateTime||end}
}

export const updateCalendarEvent=async(workspaceId,eventId,input={})=>{
  if(!eventId)throw new Error('calendar event id required')
  const headers=await authHeader(workspaceId)
  const calendarId=encodeURIComponent(String(input.calendarId||process.env.GOOGLE_CALENDAR_ID||'primary'))
  const currentResponse=await fetch(`${calendarBase}/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`,{headers})
  const current=await parseJson(currentResponse)
  const start=iso(input.startsAt||current.start?.dateTime)
  const end=iso(input.endsAt||new Date(new Date(start).getTime()+Number(input.durationMinutes||45)*60000))
  const payload={...current,start:{...current.start,dateTime:start},end:{...current.end,dateTime:end}}
  const response=await fetch(`${calendarBase}/calendars/${calendarId}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,{method:'PUT',headers,body:JSON.stringify(payload)})
  const body=await parseJson(response)
  return {provider:'google_calendar',externalId:body.id||eventId,htmlLink:body.htmlLink||null,meetingLink:body.hangoutLink||null,status:body.status||'confirmed',start:body.start?.dateTime||start,end:body.end?.dateTime||end}
}
