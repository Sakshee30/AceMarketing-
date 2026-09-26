import { createHash, randomUUID } from 'node:crypto'
import pg from 'pg'

const {Pool}=pg
const databaseUrl=process.env.DATABASE_URL||''
const retentionDays=Number(process.env.CLICK_ID_RETENTION_DAYS||90)
const callWindowMinutes=Number(process.env.CALL_MATCH_WINDOW_MINUTES||30)
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.ATTRIBUTION_DB_POOL_MAX||10),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

const sha=value=>createHash('sha256').update(String(value)).digest('hex')
const cleanEmail=value=>String(value||'').trim().toLowerCase()
const cleanPhone=value=>String(value||'').replace(/\D/g,'')
const hashEmail=value=>value?sha(cleanEmail(value)):null
const hashPhone=value=>value?sha(cleanPhone(value)):null
const text=value=>value==null||value===''?null:String(value).slice(0,2048)
const safeJson=value=>JSON.stringify(value&&typeof value==='object'?value:{})

export const attributionStoreAvailable=()=>Boolean(pool)

const identifiers=body=>({
  visitorId:text(body.visitorId||body.visitor_id),
  customerId:text(body.customerId||body.customer_id),
  emailSha256:text(body.emailSha256||body.email_sha256)||hashEmail(body.email),
  phoneSha256:text(body.phoneSha256||body.phone_sha256)||hashPhone(body.phone),
  gclid:text(body.gclid),
  gbraid:text(body.gbraid),
  wbraid:text(body.wbraid),
  fbclid:text(body.fbclid),
  msclkid:text(body.msclkid),
  ttclid:text(body.ttclid||body.data?.ttclid)
})

export const captureClickSession=async(workspaceId,body={})=>{
  if(!pool) return null
  const ids=identifiers(body)
  const hasAttribution=Boolean(ids.gclid||ids.gbraid||ids.wbraid||ids.fbclid||ids.msclkid||ids.ttclid||body.utm_source||body.utm_campaign)
  if(!hasAttribution&&!ids.visitorId&&!ids.customerId&&!ids.emailSha256&&!ids.phoneSha256) return null
  const now=new Date(body.occurredAt||body.timestamp||Date.now())
  const expiresAt=new Date(now.getTime()+retentionDays*24*60*60*1000)
  const id='clk_'+randomUUID()
  const {rows}=await pool.query(
    `INSERT INTO ace_click_sessions
      (id,workspace_id,visitor_id,customer_id,email_sha256,phone_sha256,gclid,gbraid,wbraid,fbclid,msclkid,ttclid,
       utm_source,utm_medium,utm_campaign,utm_term,utm_content,landing_url,referrer,first_seen_at,last_seen_at,expires_at,metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$20,$21,$22::jsonb)
     RETURNING *`,
    [id,workspaceId,ids.visitorId,ids.customerId,ids.emailSha256,ids.phoneSha256,ids.gclid,ids.gbraid,ids.wbraid,ids.fbclid,ids.msclkid,ids.ttclid,
     text(body.utm_source),text(body.utm_medium),text(body.utm_campaign),text(body.utm_term),text(body.utm_content),
     text(body.landingUrl||body.url),text(body.referrer),now.toISOString(),expiresAt.toISOString(),
     safeJson({event:body.event||body.eventType||null,userAgent:text(body.userAgent),ipCountry:text(body.ipCountry)})]
  )
  return rows[0]
}

const candidateFor=async(workspaceId,event)=>{
  const ids=identifiers(event)
  const occurredAt=new Date(event.occurredAt||event.timestamp||Date.now()).toISOString()
  const values=[
    workspaceId,occurredAt,
    ids.customerId,ids.gclid,ids.gbraid,ids.wbraid,ids.fbclid,ids.msclkid,ids.ttclid,
    ids.phoneSha256,ids.emailSha256,ids.visitorId,callWindowMinutes
  ]
  const {rows}=await pool.query(
    `SELECT *,
      CASE
        WHEN $3::text IS NOT NULL AND customer_id=$3 THEN 100
        WHEN $4::text IS NOT NULL AND gclid=$4 THEN 99
        WHEN $5::text IS NOT NULL AND gbraid=$5 THEN 99
        WHEN $6::text IS NOT NULL AND wbraid=$6 THEN 99
        WHEN $7::text IS NOT NULL AND fbclid=$7 THEN 98
        WHEN $8::text IS NOT NULL AND msclkid=$8 THEN 98
        WHEN $9::text IS NOT NULL AND ttclid=$9 THEN 98
        WHEN $10::text IS NOT NULL AND phone_sha256=$10 THEN 96
        WHEN $11::text IS NOT NULL AND email_sha256=$11 THEN 95
        WHEN $12::text IS NOT NULL AND visitor_id=$12 THEN 92
        WHEN source_hint IS NULL THEN 0
        ELSE 0
      END AS score
     FROM (
       SELECT s.*,
         CASE WHEN s.last_seen_at BETWEEN ($2::timestamptz-($13*interval '1 minute')) AND ($2::timestamptz+interval '5 minute')
              THEN 'time_window' ELSE NULL END source_hint
       FROM ace_click_sessions s
       WHERE workspace_id=$1
         AND first_seen_at <= $2::timestamptz
         AND expires_at >= $2::timestamptz
     ) q
     WHERE
       ($3::text IS NOT NULL AND customer_id=$3) OR
       ($4::text IS NOT NULL AND gclid=$4) OR
       ($5::text IS NOT NULL AND gbraid=$5) OR
       ($6::text IS NOT NULL AND wbraid=$6) OR
       ($7::text IS NOT NULL AND fbclid=$7) OR
       ($8::text IS NOT NULL AND msclkid=$8) OR
       ($9::text IS NOT NULL AND ttclid=$9) OR
       ($10::text IS NOT NULL AND phone_sha256=$10) OR
       ($11::text IS NOT NULL AND email_sha256=$11) OR
       ($12::text IS NOT NULL AND visitor_id=$12)
     ORDER BY score DESC,last_seen_at DESC
     LIMIT 1`,
    values
  )
  return rows[0]||null
}

const methodFor=(candidate,event)=>{
  const ids=identifiers(event)
  if(!candidate) return {method:null,confidence:null}
  if(ids.customerId&&candidate.customer_id===ids.customerId) return {method:'customer_id',confidence:100}
  if(ids.gclid&&candidate.gclid===ids.gclid) return {method:'gclid',confidence:99}
  if(ids.gbraid&&candidate.gbraid===ids.gbraid) return {method:'gbraid',confidence:99}
  if(ids.wbraid&&candidate.wbraid===ids.wbraid) return {method:'wbraid',confidence:99}
  if(ids.fbclid&&candidate.fbclid===ids.fbclid) return {method:'fbclid',confidence:98}
  if(ids.msclkid&&candidate.msclkid===ids.msclkid) return {method:'msclkid',confidence:98}
  if(ids.ttclid&&candidate.ttclid===ids.ttclid) return {method:'ttclid',confidence:98}
  if(ids.phoneSha256&&candidate.phone_sha256===ids.phoneSha256) return {method:'hashed_phone',confidence:96}
  if(ids.emailSha256&&candidate.email_sha256===ids.emailSha256) return {method:'hashed_email',confidence:95}
  if(ids.visitorId&&candidate.visitor_id===ids.visitorId) return {method:'visitor_id',confidence:92}
  return {method:null,confidence:null}
}

export const recordAssistedEvent=async(workspaceId,body={})=>{
  if(!pool) return null
  const ids=identifiers(body)
  const occurredAt=new Date(body.occurredAt||body.timestamp||Date.now())
  if(Number.isNaN(occurredAt.getTime())) throw new Error('invalid occurredAt')
  const source=text(body.source)||'unknown'
  const eventType=text(body.eventType||body.event)||'offline_conversion'
  const key=text(body.idempotencyKey||body.eventId)||sha(JSON.stringify([workspaceId,eventType,source,occurredAt.toISOString(),ids.customerId,ids.phoneSha256,body.value]))
  const candidate=await candidateFor(workspaceId,{...body,occurredAt:occurredAt.toISOString()})
  const match=methodFor(candidate,body)
  const id='ast_'+randomUUID()
  const {rows}=await pool.query(
    `INSERT INTO ace_assisted_events
      (id,workspace_id,idempotency_key,event_type,source,occurred_at,customer_id,visitor_id,email_sha256,phone_sha256,
       gclid,gbraid,wbraid,fbclid,msclkid,ttclid,value,currency,payload,matched_session_id,match_method,match_confidence,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20,$21,$22,$23)
     ON CONFLICT (workspace_id,idempotency_key)
     DO UPDATE SET updated_at=ace_assisted_events.updated_at
     RETURNING *`,
    [id,workspaceId,key,eventType,source,occurredAt.toISOString(),ids.customerId,ids.visitorId,ids.emailSha256,ids.phoneSha256,
     ids.gclid,ids.gbraid,ids.wbraid,ids.fbclid,ids.msclkid,ids.ttclid,
     body.value==null?null:Number(body.value),text(body.currency),safeJson(body.data||body.payload||{}),
     candidate?.id||null,match.method,match.confidence,candidate?'matched':'unmatched']
  )
  return rows[0]
}

export const reconcileAttribution=async(workspaceId,limit=250)=>{
  if(!pool) return {available:false,processed:0,matched:0,unmatched:0}
  const {rows}=await pool.query(
    `SELECT * FROM ace_assisted_events
     WHERE workspace_id=$1 AND status='unmatched'
     ORDER BY occurred_at ASC LIMIT $2`,
    [workspaceId,Math.max(1,Math.min(1000,Number(limit)||250))]
  )
  let matched=0
  for(const event of rows){
    const candidate=await candidateFor(workspaceId,event)
    const match=methodFor(candidate,event)
    if(candidate){
      await pool.query(
        `UPDATE ace_assisted_events
         SET matched_session_id=$2,match_method=$3,match_confidence=$4,status='matched',updated_at=now()
         WHERE id=$1`,
        [event.id,candidate.id,match.method,match.confidence]
      )
      matched++
    }
  }
  return {available:true,processed:rows.length,matched,unmatched:rows.length-matched}
}

export const attributionStats=async(workspaceId,{periodDays=null}={})=>{
  if(!pool) return {available:false}
  const days=[7,30,90].includes(Number(periodDays))?Number(periodDays):null
  const [sessions,events,methods,recent,channels,campaigns,eventTypes,touchSummary]=await Promise.all([
    pool.query(`SELECT COUNT(*)::int total,
      COUNT(*) FILTER (WHERE gclid IS NOT NULL)::int gclid,
      COUNT(*) FILTER (WHERE fbclid IS NOT NULL)::int fbclid,
      COUNT(*) FILTER (WHERE gbraid IS NOT NULL OR wbraid IS NOT NULL)::int braid,
      COUNT(*) FILTER (WHERE ttclid IS NOT NULL)::int tiktok
      FROM ace_click_sessions
      WHERE workspace_id=$1 AND expires_at>=now()
        AND ($2::int IS NULL OR first_seen_at>=now()-($2*interval '1 day'))`,[workspaceId,days]),
    pool.query(`SELECT COUNT(*)::int total,
      COUNT(*) FILTER (WHERE status='matched')::int matched,
      COUNT(*) FILTER (WHERE status='unmatched')::int unmatched,
      COALESCE(SUM(value) FILTER (WHERE status='matched'),0)::numeric matched_value,
      COALESCE(AVG(match_confidence) FILTER (WHERE status='matched' AND match_confidence IS NOT NULL),0)::numeric avg_confidence
      FROM ace_assisted_events
      WHERE workspace_id=$1
        AND ($2::int IS NULL OR occurred_at>=now()-($2*interval '1 day'))`,[workspaceId,days]),
    pool.query(`SELECT COALESCE(match_method,'unmatched') method,COUNT(*)::int count
      FROM ace_assisted_events
      WHERE workspace_id=$1
        AND ($2::int IS NULL OR occurred_at>=now()-($2*interval '1 day'))
      GROUP BY COALESCE(match_method,'unmatched') ORDER BY count DESC`,[workspaceId,days]),
    pool.query(`SELECT e.id,e.event_type,e.source,e.occurred_at,e.status,e.match_method,e.match_confidence,e.value,e.currency,
        s.utm_source,s.utm_medium,s.utm_campaign,s.utm_term,s.utm_content,s.landing_url,s.referrer,s.first_seen_at,s.last_seen_at
      FROM ace_assisted_events e
      LEFT JOIN ace_click_sessions s ON s.id=e.matched_session_id AND s.workspace_id=e.workspace_id
      WHERE e.workspace_id=$1
        AND ($2::int IS NULL OR e.occurred_at>=now()-($2*interval '1 day'))
      ORDER BY e.occurred_at DESC LIMIT 30`,[workspaceId,days]),
    pool.query(`SELECT COALESCE(NULLIF(s.utm_source,''),NULLIF(e.source,''),'Direct / Unknown') channel,
        COUNT(*)::int events,
        COUNT(*) FILTER (WHERE e.status='matched')::int matched,
        COALESCE(SUM(e.value) FILTER (WHERE e.status='matched'),0)::numeric value,
        COALESCE(AVG(e.match_confidence) FILTER (WHERE e.status='matched' AND e.match_confidence IS NOT NULL),0)::numeric avg_confidence
      FROM ace_assisted_events e
      LEFT JOIN ace_click_sessions s ON s.id=e.matched_session_id AND s.workspace_id=e.workspace_id
      WHERE e.workspace_id=$1
        AND ($2::int IS NULL OR e.occurred_at>=now()-($2*interval '1 day'))
      GROUP BY COALESCE(NULLIF(s.utm_source,''),NULLIF(e.source,''),'Direct / Unknown')
      ORDER BY value DESC,matched DESC,events DESC
      LIMIT 25`,[workspaceId,days]),
    pool.query(`SELECT COALESCE(NULLIF(s.utm_campaign,''),'Unattributed campaign') campaign,
        COALESCE(NULLIF(s.utm_source,''),NULLIF(e.source,''),'Direct / Unknown') channel,
        COUNT(*)::int events,
        COUNT(*) FILTER (WHERE e.status='matched')::int matched,
        COALESCE(SUM(e.value) FILTER (WHERE e.status='matched'),0)::numeric value,
        COALESCE(AVG(e.match_confidence) FILTER (WHERE e.status='matched' AND e.match_confidence IS NOT NULL),0)::numeric avg_confidence
      FROM ace_assisted_events e
      LEFT JOIN ace_click_sessions s ON s.id=e.matched_session_id AND s.workspace_id=e.workspace_id
      WHERE e.workspace_id=$1
        AND ($2::int IS NULL OR e.occurred_at>=now()-($2*interval '1 day'))
      GROUP BY COALESCE(NULLIF(s.utm_campaign,''),'Unattributed campaign'),COALESCE(NULLIF(s.utm_source,''),NULLIF(e.source,''),'Direct / Unknown')
      ORDER BY value DESC,matched DESC,events DESC
      LIMIT 30`,[workspaceId,days]),
    pool.query(`SELECT event_type,
        COUNT(*)::int events,
        COUNT(*) FILTER (WHERE status='matched')::int matched,
        COALESCE(SUM(value) FILTER (WHERE status='matched'),0)::numeric value
      FROM ace_assisted_events
      WHERE workspace_id=$1
        AND ($2::int IS NULL OR occurred_at>=now()-($2*interval '1 day'))
      GROUP BY event_type
      ORDER BY value DESC,matched DESC,events DESC
      LIMIT 20`,[workspaceId,days]),
    pool.query(`SELECT
        COUNT(*) FILTER (WHERE s.id IS NOT NULL)::int matched_sessions,
        COUNT(DISTINCT s.utm_source) FILTER (WHERE s.utm_source IS NOT NULL AND s.utm_source<>'')::int source_count,
        COUNT(DISTINCT s.utm_campaign) FILTER (WHERE s.utm_campaign IS NOT NULL AND s.utm_campaign<>'')::int campaign_count,
        COUNT(*) FILTER (WHERE s.referrer IS NOT NULL AND s.referrer<>'')::int referrer_evidence,
        COUNT(*) FILTER (WHERE s.landing_url IS NOT NULL AND s.landing_url<>'')::int landing_evidence
      FROM ace_assisted_events e
      LEFT JOIN ace_click_sessions s ON s.id=e.matched_session_id AND s.workspace_id=e.workspace_id
      WHERE e.workspace_id=$1
        AND ($2::int IS NULL OR e.occurred_at>=now()-($2*interval '1 day'))`,[workspaceId,days])
  ])
  const e=events.rows[0],s=sessions.rows[0]
  const rate=e.total?Number(((e.matched/e.total)*100).toFixed(2)):0
  const totalMatchedValue=Number(e.matched_value||0)
  const normalizeShare=row=>({
    ...row,
    events:Number(row.events||0),
    matched:Number(row.matched||0),
    value:Number(row.value||0),
    avgConfidence:Number(Number(row.avg_confidence||0).toFixed(1)),
    share:totalMatchedValue>0?Number((Number(row.value||0)/totalMatchedValue*100).toFixed(1)):0
  })
  return {
    available:true,
    activeClickSessions:s.total,
    clickIdCoverage:{gclid:s.gclid,fbclid:s.fbclid,braid:s.braid,tiktok:s.tiktok},
    assistedEvents:e.total,
    matchedEvents:e.matched,
    unmatchedEvents:e.unmatched,
    matchRate:rate,
    matchedValue:totalMatchedValue,
    averageMatchConfidence:Number(Number(e.avg_confidence||0).toFixed(1)),
    methods:methods.rows,
    channels:channels.rows.map(normalizeShare),
    campaigns:campaigns.rows.map(normalizeShare),
    eventTypes:eventTypes.rows.map(row=>({...row,events:Number(row.events||0),matched:Number(row.matched||0),value:Number(row.value||0)})),
    touchSummary:touchSummary.rows[0]||{},
    recent:recent.rows,
    periodDays:days
  }
}

export const closeAttributionStore=async()=>{if(pool) await pool.end()}
