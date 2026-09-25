import pg from 'pg'

const {Pool}=pg
const databaseUrl=process.env.DATABASE_URL||''
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.COHORT_DB_POOL_MAX||5),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

const eventList=(name,fallback)=>String(process.env[name]||fallback).split(',').map(x=>x.trim()).filter(Boolean)
const qualifiedEvents=()=>eventList('COHORT_QUALIFIED_EVENTS','lead.qualified,qualified_lead,mql,sql')
const consultationEvents=()=>eventList('COHORT_CONSULTATION_EVENTS','consultation,consultation_booked,appointment,meeting_booked')
const conversionEvents=()=>eventList('COHORT_CONVERSION_EVENTS','purchase,enrolment,enrollment,booking,revenue.closed,closed_won,sale')

const monthsValue=value=>Math.max(1,Math.min(36,Number(value)||6))

const cohortQuery=async(workspaceId,months)=>{
  const q=qualifiedEvents(),c=consultationEvents(),v=conversionEvents()
  const {rows}=await pool.query(
    `WITH sessions AS (
       SELECT id,
         date_trunc('month',first_seen_at)::date cohort_month,
         COALESCE(NULLIF(utm_source,''),'Direct / Unknown') source,
         COALESCE(NULLIF(utm_campaign,''),'Unassigned') campaign,
         COALESCE(customer_id,visitor_id,email_sha256,phone_sha256,id) subject_key
       FROM ace_click_sessions
       WHERE workspace_id=$1
         AND first_seen_at>=date_trunc('month',now())-(($2::int-1)*interval '1 month')
     ),
     joined AS (
       SELECT s.*,e.event_type,e.value,
         COALESCE(e.customer_id,e.visitor_id,e.email_sha256,e.phone_sha256,e.id) event_subject
       FROM sessions s
       LEFT JOIN ace_assisted_events e
         ON e.workspace_id=$1 AND e.matched_session_id=s.id
     )
     SELECT cohort_month,
       COUNT(DISTINCT subject_key)::int acquired,
       COUNT(DISTINCT event_subject) FILTER (WHERE event_type=ANY($3::text[]))::int qualified,
       COUNT(DISTINCT event_subject) FILTER (WHERE event_type=ANY($4::text[]))::int consultations,
       COUNT(DISTINCT event_subject) FILTER (WHERE event_type=ANY($5::text[]))::int conversions,
       COALESCE(SUM(value) FILTER (WHERE event_type=ANY($5::text[])),0)::numeric revenue
     FROM joined
     GROUP BY cohort_month
     ORDER BY cohort_month ASC`,
    [workspaceId,months,q,c,v]
  )
  return rows
}

const sourceQuery=async(workspaceId,months)=>{
  const v=conversionEvents()
  const {rows}=await pool.query(
    `WITH sessions AS (
       SELECT id,
         COALESCE(NULLIF(utm_source,''),'Direct / Unknown') source,
         COALESCE(NULLIF(utm_campaign,''),'Unassigned') campaign,
         COALESCE(customer_id,visitor_id,email_sha256,phone_sha256,id) subject_key
       FROM ace_click_sessions
       WHERE workspace_id=$1
         AND first_seen_at>=date_trunc('month',now())-(($2::int-1)*interval '1 month')
     )
     SELECT s.source,
       COUNT(DISTINCT s.subject_key)::int acquired,
       COUNT(DISTINCT COALESCE(e.customer_id,e.visitor_id,e.email_sha256,e.phone_sha256,e.id))
         FILTER (WHERE e.event_type=ANY($3::text[]))::int conversions,
       COALESCE(SUM(e.value) FILTER (WHERE e.event_type=ANY($3::text[])),0)::numeric revenue
     FROM sessions s
     LEFT JOIN ace_assisted_events e ON e.workspace_id=$1 AND e.matched_session_id=s.id
     GROUP BY s.source
     ORDER BY revenue DESC, acquired DESC
     LIMIT 25`,
    [workspaceId,months,v]
  )
  return rows
}

export const cohortAnalytics=async(workspaceId,{months=6}={})=>{
  if(!pool)return {available:false,cohorts:[],sources:[]}
  const lookback=monthsValue(months)
  const [rows,sources]=await Promise.all([cohortQuery(workspaceId,lookback),sourceQuery(workspaceId,lookback)])
  const cohorts=rows.map(r=>{
    const acquired=Number(r.acquired||0),qualified=Number(r.qualified||0),consultations=Number(r.consultations||0),conversions=Number(r.conversions||0),revenue=Number(r.revenue||0)
    return {
      month:r.cohort_month,
      acquired,qualified,consultations,conversions,revenue,
      qualifiedRate:acquired?Number(((qualified/acquired)*100).toFixed(1)):0,
      consultationRate:acquired?Number(((consultations/acquired)*100).toFixed(1)):0,
      conversionRate:acquired?Number(((conversions/acquired)*100).toFixed(1)):0,
      revenuePerAcquired:acquired?Number((revenue/acquired).toFixed(2)):0,
      revenuePerConversion:conversions?Number((revenue/conversions).toFixed(2)):0
    }
  })
  const sourceBreakdown=sources.map(r=>{
    const acquired=Number(r.acquired||0),conversions=Number(r.conversions||0),revenue=Number(r.revenue||0)
    return {source:r.source,acquired,conversions,revenue,conversionRate:acquired?Number(((conversions/acquired)*100).toFixed(1)):0,revenuePerAcquired:acquired?Number((revenue/acquired).toFixed(2)):0}
  })
  const totals=cohorts.reduce((a,x)=>({acquired:a.acquired+x.acquired,qualified:a.qualified+x.qualified,consultations:a.consultations+x.consultations,conversions:a.conversions+x.conversions,revenue:a.revenue+x.revenue}),{acquired:0,qualified:0,consultations:0,conversions:0,revenue:0})
  return {
    available:true,
    lookbackMonths:lookback,
    eventDefinitions:{qualified:qualifiedEvents(),consultation:consultationEvents(),conversion:conversionEvents()},
    totals:{...totals,conversionRate:totals.acquired?Number(((totals.conversions/totals.acquired)*100).toFixed(1)):0,revenuePerAcquired:totals.acquired?Number((totals.revenue/totals.acquired).toFixed(2)):0},
    cohorts,
    sources:sourceBreakdown,
    generatedAt:new Date().toISOString()
  }
}

export const closeCohortAnalytics=async()=>{if(pool)await pool.end()}
