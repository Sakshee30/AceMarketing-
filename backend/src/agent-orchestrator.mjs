import {createHmac,randomUUID} from 'node:crypto'
import pg from 'pg'

const {Pool}=pg
const databaseUrl=process.env.DATABASE_URL||''
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.AGENT_DB_POOL_MAX||10),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

const safe=v=>v==null?'':String(v).slice(0,2000)
const now=()=>new Date().toISOString()

export const createAgentRun=async(workspaceId,{agentType,entityId=null,triggerKey,input={},scheduledFor=null})=>{
  if(!pool)return null
  const id='agr_'+randomUUID()
  const {rows}=await pool.query(
    `INSERT INTO ace_agent_runs (id,workspace_id,agent_type,entity_id,trigger_key,status,input,scheduled_for)
     VALUES ($1,$2,$3,$4,$5,'queued',$6::jsonb,$7) RETURNING *`,
    [id,workspaceId,agentType,entityId,triggerKey,JSON.stringify(input||{}),scheduledFor]
  )
  return rows[0]
}

export const updateAgentRun=async(workspaceId,id,patch={})=>{
  if(!pool)return null
  const {rows}=await pool.query(
    `UPDATE ace_agent_runs SET
       status=COALESCE($3,status),
       output=CASE WHEN $4::jsonb='{}'::jsonb THEN output ELSE $4::jsonb END,
       external_id=COALESCE($5,external_id),
       attempts=COALESCE($6,attempts),
       last_error=$7,
       started_at=CASE WHEN $3='running' AND started_at IS NULL THEN now() ELSE started_at END,
       completed_at=CASE WHEN $3 IN ('succeeded','failed','cancelled') THEN now() ELSE completed_at END,
       updated_at=now()
     WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [workspaceId,id,patch.status||null,JSON.stringify(patch.output||{}),patch.externalId||null,patch.attempts??null,patch.error||null]
  )
  return rows[0]||null
}

export const listAgentRuns=async(workspaceId,limit=100)=>{
  if(!pool)return []
  const {rows}=await pool.query(
    `SELECT * FROM ace_agent_runs WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [workspaceId,Math.max(1,Math.min(500,Number(limit)||100))]
  )
  return rows
}

const routingRules=[
  {name:'High-intent education lead',test:x=>Number(x.score||x.intent||0)>=85,destination:'Senior counsellor pool',reason:'intent >= 85',slaSeconds:60},
  {name:'Financing requested',test:x=>x.financingInterest===true||String(x.financingInterest).toLowerCase()==='yes',destination:'Finance-trained counsellor',reason:'financing interest present',slaSeconds:300},
  {name:'WhatsApp re-engagement',test:x=>String(x.source||'').toLowerCase()==='whatsapp',destination:'WhatsApp nurture',reason:'WhatsApp source',slaSeconds:180},
  {name:'Low confidence review',test:x=>Number(x.identityConfidence||1)<0.65,destination:'Manual review',reason:'identity confidence below threshold',slaSeconds:900}
]

export const routeLead=async(workspaceId,input={})=>{
  if(!pool)return null
  const rule=routingRules.find(r=>r.test(input))||{name:'Default routing',destination:'General admissions queue',reason:'fallback routing',slaSeconds:600}
  const id='route_'+randomUUID()
  const leadRef=safe(input.leadRef||input.leadId||input.customerId||input.name||'unknown')
  const {rows}=await pool.query(
    `INSERT INTO ace_routing_decisions (id,workspace_id,lead_ref,rule_name,destination,reason,sla_seconds,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'routed') RETURNING *`,
    [id,workspaceId,leadRef,rule.name,rule.destination,rule.reason,rule.slaSeconds]
  )
  return rows[0]
}

export const listRoutingDecisions=async(workspaceId,limit=100)=>{
  if(!pool)return []
  const {rows}=await pool.query(`SELECT * FROM ace_routing_decisions WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT $2`,[workspaceId,limit])
  return rows
}

export const createFollowUp=async(workspaceId,input={})=>{
  if(!pool)return null
  const id='fu_'+randomUUID()
  const due=input.dueAt?new Date(input.dueAt):new Date(Date.now()+Number(input.delayMinutes||15)*60000)
  const {rows}=await pool.query(
    `INSERT INTO ace_followup_tasks (id,workspace_id,lead_ref,reason,channel,priority,status,due_at,owner)
     VALUES ($1,$2,$3,$4,$5,$6,'open',$7,$8) RETURNING *`,
    [id,workspaceId,safe(input.leadRef||input.lead||'unknown'),safe(input.reason||'Follow-up required'),safe(input.channel||'voice'),safe(input.priority||'medium').toLowerCase(),due.toISOString(),safe(input.owner||'Assigned counsellor')]
  )
  return rows[0]
}

export const listFollowUps=async workspaceId=>{
  if(!pool)return []
  const {rows}=await pool.query(`SELECT * FROM ace_followup_tasks WHERE workspace_id=$1 ORDER BY CASE WHEN status='open' THEN 0 ELSE 1 END,due_at ASC,created_at DESC LIMIT 200`,[workspaceId])
  return rows
}

export const completeFollowUp=async(workspaceId,id)=>{
  if(!pool)return null
  const {rows}=await pool.query(
    `UPDATE ace_followup_tasks SET status='completed',completed_at=now(),updated_at=now() WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [workspaceId,id]
  )
  return rows[0]||null
}

export const createMeeting=async(workspaceId,input={})=>{
  if(!pool)return null
  const id='mtg_'+randomUUID()
  const starts=new Date(input.startsAt||Date.now()+24*60*60*1000)
  if(Number.isNaN(starts.getTime()))throw new Error('invalid startsAt')
  const plan=Array.isArray(input.reminderPlan)?input.reminderPlan:['24h','3h','30m']
  const {rows}=await pool.query(
    `INSERT INTO ace_meeting_records (id,workspace_id,lead_ref,starts_at,owner,status,reminder_plan,no_show_risk,external_calendar_id,attendee_email,attendee_phone,meeting_link,calendar_html_link)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [id,workspaceId,safe(input.leadRef||input.lead||'unknown'),starts.toISOString(),safe(input.owner||'Counsellor'),safe(input.status||'confirmed').toLowerCase(),JSON.stringify(plan),safe(input.risk||'low').toLowerCase(),safe(input.externalCalendarId||''),safe(input.attendeeEmail||''),safe(input.attendeePhone||''),safe(input.meetingLink||''),safe(input.calendarHtmlLink||'')]
  )
  return rows[0]
}

export const listMeetings=async workspaceId=>{
  if(!pool)return []
  const {rows}=await pool.query(`SELECT * FROM ace_meeting_records WHERE workspace_id=$1 ORDER BY starts_at ASC LIMIT 200`,[workspaceId])
  return rows
}

export const getMeeting=async(workspaceId,id)=>{
  if(!pool)return null
  const {rows}=await pool.query(`SELECT * FROM ace_meeting_records WHERE workspace_id=$1 AND id=$2 LIMIT 1`,[workspaceId,id])
  return rows[0]||null
}

export const rescheduleMeeting=async(workspaceId,id,{startsAt,externalCalendarId=null,meetingLink=null,calendarHtmlLink=null}={})=>{
  if(!pool)return null
  const starts=new Date(startsAt)
  if(Number.isNaN(starts.getTime()))throw new Error('invalid startsAt')
  const {rows}=await pool.query(
    `UPDATE ace_meeting_records SET starts_at=$3,external_calendar_id=COALESCE($4,external_calendar_id),meeting_link=COALESCE($5,meeting_link),calendar_html_link=COALESCE($6,calendar_html_link),status='confirmed',updated_at=now() WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [workspaceId,id,starts.toISOString(),externalCalendarId,meetingLink,calendarHtmlLink]
  )
  return rows[0]||null
}

export const markMeetingReminder=async(workspaceId,id)=>{
  if(!pool)return null
  const {rows}=await pool.query(
    `UPDATE ace_meeting_records SET reminders_sent=reminders_sent+1,last_reminder_at=now(),updated_at=now() WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [workspaceId,id]
  )
  return rows[0]||null
}

export const recordFeedback=async(workspaceId,input={})=>{
  if(!pool)return null
  const id='fb_'+randomUUID()
  const {rows}=await pool.query(
    `INSERT INTO ace_feedback_responses (id,workspace_id,lead_ref,channel,score,theme,response,source_agent_run_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [id,workspaceId,safe(input.leadRef||input.lead||'unknown'),safe(input.channel||'post-call'),input.score==null?null:Number(input.score),safe(input.theme),safe(input.response||input.quote,4000),safe(input.agentRunId||'')]
  )
  return rows[0]
}

export const listFeedback=async workspaceId=>{
  if(!pool)return {average:0,items:[]}
  const {rows}=await pool.query(`SELECT * FROM ace_feedback_responses WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 200`,[workspaceId])
  const scored=rows.filter(x=>x.score!=null)
  const average=scored.length?Number((scored.reduce((n,x)=>n+Number(x.score),0)/scored.length).toFixed(2)):0
  return {average,items:rows}
}

const signedHeaders=(body,secret)=>{
  const timestamp=String(Math.floor(Date.now()/1000))
  return {'Content-Type':'application/json','X-Ace-Timestamp':timestamp,...(secret?{'X-Ace-Signature':'sha256='+createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex')}:{})}
}

export const dispatchAgentTransport=async(kind,payload={})=>{
  const routes={
    voice_qualification:process.env.VOICE_QUALIFICATION_WEBHOOK_URL||process.env.VOICE_AGENT_WEBHOOK_URL||'',
    meeting_reminder:process.env.MEETING_REMINDER_WEBHOOK_URL||'',
    feedback:process.env.FEEDBACK_WEBHOOK_URL||''
  }
  const url=routes[kind]||''
  if(!url){
    if(process.env.AGENT_TRANSPORT_ALLOW_INTERNAL==='true'&&process.env.NODE_ENV!=='production') return {provider:'internal',status:202,externalId:null,accepted:true,simulated:true}
    throw new Error('agent transport not configured for '+kind)
  }
  const target=new URL(url)
  if(target.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&target.protocol==='http:')) throw new Error('agent transport URL must use HTTPS')
  const body=JSON.stringify({kind,...payload})
  const response=await fetch(target,{method:'POST',headers:signedHeaders(body,process.env.AGENT_WEBHOOK_SECRET||''),body})
  const raw=await response.text()
  let parsed={}
  try{parsed=raw?JSON.parse(raw):{}}catch{parsed={raw:raw.slice(0,1000)}}
  if(!response.ok){
    const error=new Error('agent transport failed: '+response.status)
    error.status=response.status
    error.providerBody=parsed
    throw error
  }
  return {provider:'webhook',status:response.status,externalId:parsed.id||parsed.callId||parsed.jobId||null,accepted:true,response:parsed}
}

export const closeAgentOrchestrator=async()=>{if(pool)await pool.end()}
