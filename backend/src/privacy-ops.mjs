import {createHash,randomUUID} from 'node:crypto'
import pg from 'pg'

const {Pool}=pg
const databaseUrl=process.env.DATABASE_URL||''
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.PRIVACY_DB_POOL_MAX||10),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

const sha=value=>createHash('sha256').update(String(value)).digest('hex')
const normalize=(type,value)=>{
  const raw=String(value||'').trim()
  if(!raw)throw new Error('selector required')
  if(type==='email')return raw.toLowerCase()
  if(type==='phone')return raw.replace(/\D+/g,'')
  return raw.slice(0,240)
}
const allowedTypes=new Set(['visitor','customer','email','phone','lead'])
const selectorData=(type,value)=>{
  if(!allowedTypes.has(type))throw new Error('unsupported selectorType')
  const normalized=normalize(type,value)
  return {type,normalized,hash:sha(type+':'+normalized),identityHash:(type==='email'||type==='phone')?sha(normalized):null}
}
const whereFor=(table,s)=>{
  if(table==='click'||table==='assisted'){
    if(s.type==='visitor')return ['visitor_id=$2',s.normalized]
    if(s.type==='customer')return ['customer_id=$2',s.normalized]
    if(s.type==='email')return ['email_sha256=$2',s.identityHash]
    if(s.type==='phone')return ['phone_sha256=$2',s.identityHash]
    return ['FALSE',s.normalized]
  }
  if(table==='lead'){
    if(s.type==='lead')return ['external_lead_id=$2',s.normalized]
    if(s.type==='email')return ['email_sha256=$2',s.identityHash]
    if(s.type==='phone')return ['phone_sha256=$2',s.identityHash]
    if(s.type==='customer')return ["attributes->>'customerId'=$2",s.normalized]
    if(s.type==='visitor')return ["attributes->>'visitorId'=$2",s.normalized]
  }
  if(table==='consent'){
    if(s.type==='visitor')return ["subject_type='visitor' AND subject_id=$2",s.normalized]
    if(s.type==='customer')return ["subject_type='customer' AND subject_id=$2",s.normalized]
    return ['FALSE',s.normalized]
  }
  return ['FALSE',s.normalized]
}

const recordRequest=async(client,workspaceId,{type,selectorType=null,selectorHash=null,status='completed',summary={},requestedBy=null,error=null})=>{
  const id='pr_'+randomUUID()
  await client.query(
    `INSERT INTO ace_privacy_requests
      (id,workspace_id,request_type,selector_type,selector_hash,status,result_summary,requested_by,error,completed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)`,
    [id,workspaceId,type,selectorType,selectorHash,status,JSON.stringify(summary),requestedBy,error,status==='completed'?new Date().toISOString():null]
  )
  return id
}

export const exportSubject=async(workspaceId,input={},requestedBy=null)=>{
  if(!pool)throw new Error('privacy store unavailable')
  const s=selectorData(String(input.selectorType||''),input.selector)
  const [cw,cv]=whereFor('click',s), [aw,av]=whereFor('assisted',s), [lw,lv]=whereFor('lead',s), [gw,gv]=whereFor('consent',s)
  const client=await pool.connect()
  try{
    const [clicks,assisted,leads,consent]=await Promise.all([
      client.query(`SELECT * FROM ace_click_sessions WHERE workspace_id=$1 AND ${cw} ORDER BY last_seen_at DESC LIMIT 5000`,[workspaceId,cv]),
      client.query(`SELECT * FROM ace_assisted_events WHERE workspace_id=$1 AND ${aw} ORDER BY occurred_at DESC LIMIT 5000`,[workspaceId,av]),
      client.query(`SELECT * FROM ace_lead_profiles WHERE workspace_id=$1 AND ${lw} ORDER BY updated_at DESC LIMIT 5000`,[workspaceId,lv]),
      client.query(`SELECT * FROM ace_consent_records WHERE workspace_id=$1 AND ${gw} ORDER BY updated_at DESC LIMIT 5000`,[workspaceId,gv])
    ])
    const leadIds=leads.rows.map(x=>x.id)
    let memberships=[]
    if(leadIds.length){
      const r=await client.query(`SELECT * FROM ace_audience_members WHERE workspace_id=$1 AND lead_profile_id = ANY($2::text[])`,[workspaceId,leadIds])
      memberships=r.rows
    }
    const data={selectorType:s.type,clickSessions:clicks.rows,assistedEvents:assisted.rows,leadProfiles:leads.rows,audienceMemberships:memberships,consentRecords:consent.rows}
    const counts=Object.fromEntries(Object.entries(data).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length]))
    const requestId=await recordRequest(client,workspaceId,{type:'export',selectorType:s.type,selectorHash:s.hash,summary:counts,requestedBy})
    return {requestId,generatedAt:new Date().toISOString(),counts,data}
  }finally{client.release()}
}

export const deleteSubject=async(workspaceId,input={},requestedBy=null)=>{
  if(!pool)throw new Error('privacy store unavailable')
  if(input.confirm!=='DELETE')throw new Error('confirm must equal DELETE')
  const s=selectorData(String(input.selectorType||''),input.selector)
  const [cw,cv]=whereFor('click',s), [aw,av]=whereFor('assisted',s), [lw,lv]=whereFor('lead',s), [gw,gv]=whereFor('consent',s)
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const leadRows=await client.query(`SELECT id FROM ace_lead_profiles WHERE workspace_id=$1 AND ${lw}`,[workspaceId,lv])
    const leadIds=leadRows.rows.map(x=>x.id)
    let audienceMembers=0
    if(leadIds.length){
      const r=await client.query(`DELETE FROM ace_audience_members WHERE workspace_id=$1 AND lead_profile_id = ANY($2::text[]) RETURNING lead_profile_id`,[workspaceId,leadIds])
      audienceMembers=r.rowCount
    }
    const assisted=await client.query(`DELETE FROM ace_assisted_events WHERE workspace_id=$1 AND ${aw} RETURNING id`,[workspaceId,av])
    const clicks=await client.query(`DELETE FROM ace_click_sessions WHERE workspace_id=$1 AND ${cw} RETURNING id`,[workspaceId,cv])
    const leads=await client.query(`DELETE FROM ace_lead_profiles WHERE workspace_id=$1 AND ${lw} RETURNING id`,[workspaceId,lv])
    const consent=await client.query(`DELETE FROM ace_consent_records WHERE workspace_id=$1 AND ${gw} RETURNING id`,[workspaceId,gv])
    const summary={clickSessions:clicks.rowCount,assistedEvents:assisted.rowCount,leadProfiles:leads.rowCount,audienceMemberships:audienceMembers,consentRecords:consent.rowCount}
    const requestId=await recordRequest(client,workspaceId,{type:'delete',selectorType:s.type,selectorHash:s.hash,summary,requestedBy})
    await client.query('COMMIT')
    return {requestId,deletedAt:new Date().toISOString(),summary}
  }catch(error){
    await client.query('ROLLBACK')
    throw error
  }finally{client.release()}
}

const days=value=>{const n=Number(value||0);return Number.isFinite(n)&&n>0?Math.floor(n):0}
export const retentionPolicy=()=>({
  clickSessions:days(process.env.PRIVACY_RETENTION_CLICK_DAYS),
  assistedEvents:days(process.env.PRIVACY_RETENTION_ASSISTED_DAYS),
  leadProfiles:days(process.env.PRIVACY_RETENTION_LEAD_DAYS),
  consentRecords:days(process.env.PRIVACY_RETENTION_CONSENT_DAYS)
})

export const purgeRetention=async(workspaceId,{dryRun=false,requestedBy=null}={})=>{
  if(!pool)throw new Error('privacy store unavailable')
  const policy=retentionPolicy()
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const summary={expiredClickSessions:0,clickSessions:0,assistedEvents:0,leadProfiles:0,consentRecords:0}
    const exec=async(sql,args=[])=>{const r=await client.query(sql,args);return Number(r.rows?.[0]?.count||0)}
    summary.expiredClickSessions=await exec(`SELECT COUNT(*)::int count FROM ace_click_sessions WHERE workspace_id=$1 AND expires_at<now()`,[workspaceId])
    if(!dryRun)await client.query(`DELETE FROM ace_click_sessions WHERE workspace_id=$1 AND expires_at<now()`,[workspaceId])
    const configs=[
      ['clickSessions','ace_click_sessions','last_seen_at',policy.clickSessions],
      ['assistedEvents','ace_assisted_events','occurred_at',policy.assistedEvents],
      ['leadProfiles','ace_lead_profiles','updated_at',policy.leadProfiles],
      ['consentRecords','ace_consent_records','updated_at',policy.consentRecords]
    ]
    for(const [key,table,column,keepDays] of configs){
      if(!keepDays)continue
      summary[key]=await exec(`SELECT COUNT(*)::int count FROM ${table} WHERE workspace_id=$1 AND ${column}<now()-($2::int*interval '1 day')`,[workspaceId,keepDays])
      if(!dryRun)await client.query(`DELETE FROM ${table} WHERE workspace_id=$1 AND ${column}<now()-($2::int*interval '1 day')`,[workspaceId,keepDays])
    }
    const requestId=await recordRequest(client,workspaceId,{type:'retention_purge',summary:{dryRun,policy,...summary},requestedBy})
    await client.query('COMMIT')
    return {requestId,dryRun,policy,summary,completedAt:new Date().toISOString()}
  }catch(error){await client.query('ROLLBACK');throw error}
  finally{client.release()}
}

export const listPrivacyRequests=async(workspaceId,limit=100)=>{
  if(!pool)return []
  const {rows}=await pool.query(
    `SELECT id,request_type,selector_type,selector_hash,status,result_summary,requested_by,error,created_at,completed_at
     FROM ace_privacy_requests WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [workspaceId,Math.max(1,Math.min(500,Number(limit)||100))]
  )
  return rows
}

export const closePrivacyOps=async()=>{if(pool)await pool.end()}
