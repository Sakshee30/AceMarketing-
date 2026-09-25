import {randomUUID} from 'node:crypto'
import nodemailer from 'nodemailer'
import pg from 'pg'
import {enqueueJob} from './queue.mjs'
import {cohortAnalytics} from './cohort-analytics.mjs'

const {Pool}=pg
const databaseUrl=process.env.DATABASE_URL||''
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.REPORT_DB_POOL_MAX||5),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

const cleanRecipients=value=>{
  const items=Array.isArray(value)?value:String(value||'').split(',')
  const unique=[...new Set(items.map(x=>String(x).trim().toLowerCase()).filter(x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)))]
  if(!unique.length)throw new Error('at least one valid recipient is required')
  if(unique.length>25)throw new Error('maximum 25 recipients')
  return unique
}
const nextFrom=(cadence,from=new Date())=>{
  const d=new Date(from)
  if(cadence==='daily')d.setUTCDate(d.getUTCDate()+1)
  else if(cadence==='monthly')d.setUTCMonth(d.getUTCMonth()+1)
  else d.setUTCDate(d.getUTCDate()+7)
  return d
}
const htmlEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})

export const reportMailConfigured=()=>Boolean(process.env.SMTP_HOST&&process.env.SMTP_FROM)

const transport=()=>nodemailer.createTransport({
  host:process.env.SMTP_HOST,
  port:Number(process.env.SMTP_PORT||587),
  secure:String(process.env.SMTP_SECURE||'false').toLowerCase()==='true',
  ...(process.env.SMTP_USER?{auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS||''}}:{})
})

export const listReportSchedules=async workspaceId=>{
  if(!pool)return []
  const {rows}=await pool.query(`SELECT * FROM ace_report_schedules WHERE workspace_id=$1 ORDER BY created_at DESC`,[workspaceId])
  return rows
}

export const saveReportSchedule=async(workspaceId,input={},createdBy=null)=>{
  if(!pool)throw new Error('report scheduler unavailable')
  const id=String(input.id||'rep_'+randomUUID())
  const name=String(input.name||'Cohort Performance').trim().slice(0,160)
  const cadence=['daily','weekly','monthly'].includes(String(input.cadence))?String(input.cadence):'weekly'
  const recipients=cleanRecipients(input.recipients)
  const enabled=input.enabled!==false
  const lookback=Math.max(1,Math.min(36,Number(input.lookbackMonths)||6))
  const {rows}=await pool.query(
    `INSERT INTO ace_report_schedules
      (id,workspace_id,name,report_type,recipients,cadence,enabled,lookback_months,next_run_at,last_status,created_by)
     VALUES ($1,$2,$3,'cohort',$4::text[],$5,$6,$7,now(),$8,$9)
     ON CONFLICT (id) DO UPDATE SET
       name=EXCLUDED.name,recipients=EXCLUDED.recipients,cadence=EXCLUDED.cadence,
       enabled=EXCLUDED.enabled,lookback_months=EXCLUDED.lookback_months,
       next_run_at=CASE WHEN EXCLUDED.enabled THEN LEAST(ace_report_schedules.next_run_at,now()) ELSE ace_report_schedules.next_run_at END,
       last_status=CASE WHEN EXCLUDED.enabled THEN 'scheduled' ELSE 'paused' END,
       last_error=NULL,updated_at=now()
     WHERE ace_report_schedules.workspace_id=$2
     RETURNING *`,
    [id,workspaceId,name,recipients,cadence,enabled,lookback,enabled?'scheduled':'paused',createdBy]
  )
  if(!rows[0])throw new Error('report schedule not found')
  return rows[0]
}

const createDelivery=async(workspaceId,schedule)=>{
  const id='rd_'+randomUUID()
  const subject=`${schedule.name} · AceMarketing`
  await pool.query(
    `INSERT INTO ace_report_deliveries (id,workspace_id,schedule_id,status,recipients,subject)
     VALUES ($1,$2,$3,'queued',$4::text[],$5)`,
    [id,workspaceId,schedule.id,schedule.recipients,subject]
  )
  return {id,subject}
}

export const queueReportNow=async(workspaceId,scheduleId)=>{
  if(!pool)throw new Error('report scheduler unavailable')
  const {rows}=await pool.query(`SELECT * FROM ace_report_schedules WHERE workspace_id=$1 AND id=$2`,[workspaceId,scheduleId])
  const schedule=rows[0]
  if(!schedule)throw new Error('report schedule not found')
  const delivery=await createDelivery(workspaceId,schedule)
  const job=await enqueueJob({
    workspaceId,
    kind:'report_delivery',
    idempotencyKey:'report:'+delivery.id,
    payload:{scheduleId:schedule.id,deliveryId:delivery.id}
  })
  return {deliveryId:delivery.id,jobId:job?.id||null,status:'queued'}
}

const claimDue=async(limit=5)=>{
  if(!pool)return []
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const {rows}=await client.query(
      `WITH due AS (
        SELECT id FROM ace_report_schedules
        WHERE enabled=true AND next_run_at<=now()
        ORDER BY next_run_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT $1
      )
      UPDATE ace_report_schedules s
      SET last_run_at=now(),next_run_at=CASE s.cadence
          WHEN 'daily' THEN s.next_run_at+interval '1 day'
          WHEN 'monthly' THEN s.next_run_at+interval '1 month'
          ELSE s.next_run_at+interval '7 days' END,
          last_status='queued',updated_at=now()
      FROM due WHERE s.id=due.id
      RETURNING s.*`,
      [Math.max(1,Math.min(25,Number(limit)||5))]
    )
    await client.query('COMMIT')
    return rows
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
  finally{client.release()}
}

export const runDueReportSchedules=async(limit=5)=>{
  const schedules=await claimDue(limit)
  const results=[]
  for(const schedule of schedules){
    try{results.push({scheduleId:schedule.id,...await queueReportNow(schedule.workspace_id,schedule.id)})}
    catch(error){
      const message=error instanceof Error?error.message:String(error)
      await pool.query(`UPDATE ace_report_schedules SET last_status='error',last_error=$3,updated_at=now() WHERE workspace_id=$1 AND id=$2`,[schedule.workspace_id,schedule.id,message.slice(0,2000)]).catch(()=>{})
      results.push({scheduleId:schedule.id,error:message})
    }
  }
  return results
}

const buildCsv=data=>{
  const rows=[['Cohort','Acquired','Qualified %','Consultation %','Conversion %','Revenue','Revenue per acquired']]
  for(const x of data.cohorts||[])rows.push([String(x.month),x.acquired,x.qualifiedRate,x.consultationRate,x.conversionRate,x.revenue,x.revenuePerAcquired])
  return rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n')
}

const buildHtml=(schedule,data)=>{
  const totals=data.totals||{}
  const rows=(data.cohorts||[]).map(x=>`<tr><td>${htmlEscape(new Date(x.month).toLocaleDateString('en-IN',{month:'short',year:'numeric'}))}</td><td>${x.acquired}</td><td>${x.qualifiedRate}%</td><td>${x.consultationRate}%</td><td>${x.conversionRate}%</td><td>${money(x.revenue)}</td></tr>`).join('')
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111827"><h2>${htmlEscape(schedule.name)}</h2><p>Automated AceMarketing cohort report · ${new Date().toISOString()}</p><table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse"><tr><th>Acquired</th><th>Conversions</th><th>Conversion rate</th><th>Attributed revenue</th><th>Revenue/acquired</th></tr><tr><td>${totals.acquired||0}</td><td>${totals.conversions||0}</td><td>${totals.conversionRate||0}%</td><td>${money(totals.revenue)}</td><td>${money(totals.revenuePerAcquired)}</td></tr></table><h3>Cohorts</h3><table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse"><tr><th>Month</th><th>Acquired</th><th>Qualified</th><th>Consultation</th><th>Conversion</th><th>Revenue</th></tr>${rows||'<tr><td colspan="6">No matched cohort data yet.</td></tr>'}</table><p style="color:#6b7280">Generated from persisted first-party acquisition and matched downstream events.</p></body></html>`
}

export const deliverReport=async(workspaceId,{scheduleId,deliveryId,attempts=1}={})=>{
  if(!pool)throw new Error('report scheduler unavailable')
  const {rows}=await pool.query(`SELECT * FROM ace_report_schedules WHERE workspace_id=$1 AND id=$2`,[workspaceId,scheduleId])
  const schedule=rows[0]
  if(!schedule)throw new Error('report schedule not found')
  if(!reportMailConfigured())throw new Error('SMTP_HOST and SMTP_FROM are required for report delivery')
  await pool.query(`UPDATE ace_report_deliveries SET status='sending',attempts=$3,updated_at=now() WHERE workspace_id=$1 AND id=$2`,[workspaceId,deliveryId,attempts])
  const snapshot=await cohortAnalytics(workspaceId,{months:schedule.lookback_months})
  const csv=buildCsv(snapshot)
  const info=await transport().sendMail({
    from:process.env.SMTP_FROM,
    to:schedule.recipients.join(','),
    subject:`${schedule.name} · AceMarketing`,
    html:buildHtml(schedule,snapshot),
    attachments:[{filename:'cohort-report.csv',content:csv,contentType:'text/csv'}]
  })
  await pool.query(
    `UPDATE ace_report_deliveries SET status='sent',snapshot=$3::jsonb,provider_message_id=$4,attempts=$5,last_error=NULL,sent_at=now(),updated_at=now()
     WHERE workspace_id=$1 AND id=$2`,
    [workspaceId,deliveryId,JSON.stringify({totals:snapshot.totals,lookbackMonths:snapshot.lookbackMonths,generatedAt:snapshot.generatedAt}),String(info.messageId||''),attempts]
  )
  await pool.query(`UPDATE ace_report_schedules SET last_status='sent',last_error=NULL,updated_at=now() WHERE workspace_id=$1 AND id=$2`,[workspaceId,scheduleId])
  return {messageId:info.messageId||null,recipients:schedule.recipients,count:schedule.recipients.length}
}

export const markReportDeliveryFailure=async(workspaceId,deliveryId,scheduleId,status,error,attempts)=>{
  if(!pool)return
  await pool.query(`UPDATE ace_report_deliveries SET status=$3,last_error=$4,attempts=$5,updated_at=now() WHERE workspace_id=$1 AND id=$2`,[workspaceId,deliveryId,status,String(error||'').slice(0,2000),attempts])
  await pool.query(`UPDATE ace_report_schedules SET last_status=$3,last_error=$4,updated_at=now() WHERE workspace_id=$1 AND id=$2`,[workspaceId,scheduleId,status,String(error||'').slice(0,2000)])
}

export const listReportDeliveries=async(workspaceId,limit=100)=>{
  if(!pool)return []
  const {rows}=await pool.query(`SELECT * FROM ace_report_deliveries WHERE workspace_id=$1 ORDER BY queued_at DESC LIMIT $2`,[workspaceId,Math.max(1,Math.min(500,Number(limit)||100))])
  return rows
}

export const closeReportScheduler=async()=>{if(pool)await pool.end()}
