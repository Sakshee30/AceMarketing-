import {createHash,randomUUID} from 'node:crypto'
import pg from 'pg'

const {Pool}=pg
const databaseUrl=process.env.DATABASE_URL||''
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.LEAD_OPS_DB_POOL_MAX||10),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

const sha=v=>createHash('sha256').update(String(v)).digest('hex')
const normEmail=v=>String(v||'').trim().toLowerCase()
const normPhone=v=>String(v||'').replace(/\D/g,'')
const safeText=(v,max=512)=>v==null||v===''?null:String(v).slice(0,max)
const json=v=>JSON.stringify(v&&typeof v==='object'?v:{})

const gradeFor=score=>score>=85?'A':score>=70?'B':score>=50?'C':'D'
const add=(drivers,key,label,points,evidence)=>{
  if(!points)return
  drivers.push({key,label,points,evidence})
}

export const scoreLead=input=>{
  const drivers=[]
  let score=20
  const stage=String(input.crmStage||input.stage||'lead').toLowerCase()
  const journeyDepth=Math.max(0,Number(input.journeyDepth||input.pagesViewed||0))
  const pricingViews=Math.max(0,Number(input.pricingPageViews||0))
  const fraud=Math.max(0,Math.min(100,Number(input.fraudScore||0)))
  const propensity=Math.max(0,Math.min(100,Number(input.conversionPropensity||0)))

  if(journeyDepth>=6){score+=14;add(drivers,'journey_depth','Journey depth',14,journeyDepth+' meaningful interactions')}
  else if(journeyDepth>=3){score+=8;add(drivers,'journey_depth','Journey depth',8,journeyDepth+' meaningful interactions')}
  if(pricingViews>=2){score+=16;add(drivers,'pricing','Pricing intent',16,pricingViews+' pricing views')}
  else if(pricingViews===1){score+=9;add(drivers,'pricing','Pricing intent',9,'Pricing viewed')}
  if(input.whatsappEngaged===true||String(input.whatsappStatus||'').toLowerCase()==='replied'){score+=12;add(drivers,'whatsapp','WhatsApp engagement',12,'Two-way messaging')}
  if(['connected','qualified','positive'].includes(String(input.callOutcome||'').toLowerCase())){score+=14;add(drivers,'call','Call outcome',14,String(input.callOutcome))}
  if(['booked','scheduled','attended'].includes(String(input.meetingStatus||'').toLowerCase())){score+=14;add(drivers,'meeting','Meeting progression',14,String(input.meetingStatus))}
  if(['qualified','consultation','opportunity','converted','enrolled','closed_won'].includes(stage)){score+=12;add(drivers,'stage','CRM progression',12,stage)}
  else if(['connected','contacted'].includes(stage)){score+=7;add(drivers,'stage','CRM progression',7,stage)}
  if(propensity>=70){score+=8;add(drivers,'propensity','Conversion propensity',8,propensity+'%')}
  else if(propensity>=50){score+=4;add(drivers,'propensity','Conversion propensity',4,propensity+'%')}
  if(input.invalidContact===true){score-=22;add(drivers,'invalid_contact','Invalid contact',-22,'Contact validation failed')}
  if(input.duplicate===true){score-=14;add(drivers,'duplicate','Duplicate lead',-14,'Duplicate identity')}
  if(fraud>=70){score-=30;add(drivers,'fraud','Fraud risk',-30,fraud+'/100')}
  else if(fraud>=40){score-=14;add(drivers,'fraud','Fraud risk',-14,fraud+'/100')}
  score=Math.max(0,Math.min(100,Math.round(score)))
  return {score,grade:gradeFor(score),version:'v2.0',drivers}
}

export const upsertLeadProfile=async(workspaceId,input={})=>{
  if(!pool)return null
  const externalLeadId=safeText(input.externalLeadId||input.leadId||input.customerId||input.email||input.phone)
  if(!externalLeadId)throw new Error('externalLeadId, leadId, customerId, email or phone required')
  const scoring=scoreLead(input)
  const emailHash=input.emailSha256||input.email_sha256||(input.email?sha(normEmail(input.email)):null)
  const phoneHash=input.phoneSha256||input.phone_sha256||(input.phone?sha(normPhone(input.phone)):null)
  const id='lead_'+randomUUID()
  const {rows}=await pool.query(
    `INSERT INTO ace_lead_profiles
      (id,workspace_id,external_lead_id,name,email_sha256,phone_sha256,device_id,device_platform,app_id,source,campaign,crm_stage,intent,score,grade,score_version,score_drivers,attributes,journey,call_summary,whatsapp_summary)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb,$19::jsonb,$20,$21)
     ON CONFLICT (workspace_id,external_lead_id) DO UPDATE SET
      name=COALESCE(EXCLUDED.name,ace_lead_profiles.name),
      email_sha256=COALESCE(EXCLUDED.email_sha256,ace_lead_profiles.email_sha256),
      phone_sha256=COALESCE(EXCLUDED.phone_sha256,ace_lead_profiles.phone_sha256),
      device_id=COALESCE(EXCLUDED.device_id,ace_lead_profiles.device_id),
      device_platform=COALESCE(EXCLUDED.device_platform,ace_lead_profiles.device_platform),
      app_id=COALESCE(EXCLUDED.app_id,ace_lead_profiles.app_id),
      source=COALESCE(EXCLUDED.source,ace_lead_profiles.source),
      campaign=COALESCE(EXCLUDED.campaign,ace_lead_profiles.campaign),
      crm_stage=COALESCE(EXCLUDED.crm_stage,ace_lead_profiles.crm_stage),
      intent=COALESCE(EXCLUDED.intent,ace_lead_profiles.intent),
      score=EXCLUDED.score,grade=EXCLUDED.grade,score_version=EXCLUDED.score_version,score_drivers=EXCLUDED.score_drivers,
      attributes=ace_lead_profiles.attributes||EXCLUDED.attributes,
      journey=ace_lead_profiles.journey
        || CASE
          WHEN EXCLUDED.journey->>'lastActivity' IS NOT NULL
           AND ace_lead_profiles.journey->>'lastActivity' IS NOT NULL
           AND EXCLUDED.journey->>'lastActivity' IS DISTINCT FROM ace_lead_profiles.journey->>'lastActivity'
          THEN jsonb_build_object('previousLastActivity',ace_lead_profiles.journey->>'lastActivity')
          ELSE '{}'::jsonb
        END
        || EXCLUDED.journey,
      call_summary=COALESCE(EXCLUDED.call_summary,ace_lead_profiles.call_summary),
      whatsapp_summary=COALESCE(EXCLUDED.whatsapp_summary,ace_lead_profiles.whatsapp_summary),
      updated_at=now()
     RETURNING *`,
    [id,workspaceId,externalLeadId,safeText(input.name),emailHash,phoneHash,safeText(input.deviceId||input.device_id,512),safeText(input.devicePlatform||input.device_platform,32),safeText(input.appId||input.app_id,256),safeText(input.source),safeText(input.campaign),
     safeText(input.crmStage||input.stage),safeText(input.intent),scoring.score,scoring.grade,scoring.version,JSON.stringify(scoring.drivers),
     json(input.attributes),json({journeyDepth:Number(input.journeyDepth||input.pagesViewed||0),pricingPageViews:Number(input.pricingPageViews||0),lastActivity:input.lastActivity||null,conversionPropensity:Number(input.conversionPropensity||0),ltvTier:input.ltvTier||null,whatsappEngaged:Boolean(input.whatsappEngaged),callOutcome:input.callOutcome||null,meetingStatus:input.meetingStatus||null}),
     safeText(input.callSummary,4000),safeText(input.whatsappSummary,4000)]
  )
  return rows[0]
}

export const listLeadProfiles=async(workspaceId,limit=100)=>{
  if(!pool)return []
  const {rows}=await pool.query(`SELECT * FROM ace_lead_profiles WHERE workspace_id=$1 AND status='active' ORDER BY updated_at DESC LIMIT $2`,[workspaceId,Math.max(1,Math.min(500,Number(limit)||100))])
  return rows
}

export const leadOpsStats=async workspaceId=>{
  if(!pool)return {available:false}
  const {rows}=await pool.query(
    `SELECT COUNT(*)::int total,
      COUNT(*) FILTER(WHERE grade='A')::int a,
      COUNT(*) FILTER(WHERE grade IN ('A','B'))::int ab,
      COUNT(*) FILTER(WHERE grade='C')::int c,
      COUNT(*) FILTER(WHERE grade='D')::int d,
      ROUND(AVG(score),1)::numeric avg_score
     FROM ace_lead_profiles WHERE workspace_id=$1 AND status='active'`,[workspaceId])
  const r=rows[0]
  return {available:true,total:r.total,aGrade:r.a,abQuality:r.ab,cGrade:r.c,dGrade:r.d,averageScore:Number(r.avg_score||0)}
}

export const overrideLeadGrade=async(workspaceId,externalLeadId,grade)=>{
  if(!pool)return null
  const score={A:90,B:75,C:55,D:35}[grade]
  const {rows}=await pool.query(
    `UPDATE ace_lead_profiles SET grade=$3,score=$4,score_drivers=score_drivers||$5::jsonb,updated_at=now()
     WHERE workspace_id=$1 AND (external_lead_id=$2 OR name=$2) RETURNING *`,
    [workspaceId,externalLeadId,grade,score,JSON.stringify([{key:'manual_override',label:'Manual override',points:0,evidence:'Workspace operator set grade '+grade}])]
  )
  return rows[0]||null
}

const fieldMap={
  'Lead grade':{expr:'grade',type:'text'},
  'CRM stage':{expr:'crm_stage',type:'text'},
  'Conversion propensity':{expr:"COALESCE((journey->>'conversionPropensity')::numeric,0)",type:'number'},
  'Pricing-page views':{expr:"COALESCE((journey->>'pricingPageViews')::numeric,0)",type:'number'},
  'LTV tier':{expr:"COALESCE(journey->>'ltvTier','')",type:'text'},
  'Last activity':{expr:"COALESCE(journey->>'lastActivity','')",type:'text'},
  'Device ID present':{expr:"CASE WHEN COALESCE(device_id,'')<>'' THEN 'yes' ELSE 'no' END",type:'text'},
  'Device platform':{expr:"COALESCE(device_platform,'')",type:'text'},
  'App ID':{expr:"COALESCE(app_id,'')",type:'text'}
}

const audienceWhere=(condition,operator,value)=>{
  const field=fieldMap[condition]
  if(!field)throw new Error('unsupported audience condition')
  const op=String(operator||'is')
  if(field.type==='number'){
    const n=Number(value)
    if(!Number.isFinite(n))throw new Error('numeric audience value required')
    if(op==='is greater than')return {sql:`${field.expr}>$2::numeric`,value:n}
    if(op==='is less than')return {sql:`${field.expr}<$2::numeric`,value:n}
    return {sql:`${field.expr}=$2::numeric`,value:n}
  }
  if(op==='contains')return {sql:`LOWER(${field.expr}) LIKE LOWER($2)`,value:'%'+String(value)+'%'}
  if(op==='is one of'){
    const values=String(value||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).slice(0,25)
    if(!values.length)throw new Error('multi-value audience rule requires at least one value')
    return {sql:`LOWER(${field.expr})=ANY($2::text[])`,value:values}
  }
  return {sql:`LOWER(${field.expr})=LOWER($2)`,value:String(value)}
}

export const previewAudience=async(workspaceId,definition)=>{
  if(!pool)return {available:false,estimatedSize:0,matchedPercent:0}
  const where=audienceWhere(definition.condition,definition.operator,definition.value)
  const [matched,total]=await Promise.all([
    pool.query(`SELECT COUNT(*)::int count FROM ace_lead_profiles WHERE workspace_id=$1 AND status='active' AND ${where.sql}`,[workspaceId,where.value]),
    pool.query(`SELECT COUNT(*)::int count FROM ace_lead_profiles WHERE workspace_id=$1 AND status='active'`,[workspaceId])
  ])
  const size=matched.rows[0].count,totalCount=total.rows[0].count
  return {available:true,estimatedSize:size,matchedPercent:totalCount?Number(((size/totalCount)*100).toFixed(1)):0,freshness:'real_time'}
}

export const createAudience=async(workspaceId,input)=>{
  if(!pool)return null
  const preview=await previewAudience(workspaceId,input)
  const id='aud_'+randomUUID()
  const {rows}=await pool.query(
    `INSERT INTO ace_audiences (id,workspace_id,name,mode,destination,definition,identity_mode,status,estimated_size,matched_size,last_materialized_at)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,'materialized',$8,$8,now()) RETURNING *`,
    [id,workspaceId,String(input.name),String(input.mode||'Activate'),String(input.destination),JSON.stringify({condition:input.condition,operator:input.operator,value:input.value}),String(input.identityMode||'auto').toLowerCase(),preview.estimatedSize]
  )
  await materializeAudience(workspaceId,id)
  return rows[0]
}

export const materializeAudience=async(workspaceId,audienceId)=>{
  if(!pool)return null
  const {rows}=await pool.query(`SELECT * FROM ace_audiences WHERE workspace_id=$1 AND id=$2`,[workspaceId,audienceId])
  const audience=rows[0]
  if(!audience)return null
  const def=audience.definition||{}
  const where=audienceWhere(def.condition,def.operator,def.value)
  const leads=await pool.query(
    `SELECT id,external_lead_id,email_sha256,phone_sha256,device_id,device_platform,app_id,grade,score,crm_stage FROM ace_lead_profiles
     WHERE workspace_id=$1 AND status='active' AND ${where.sql}`,[workspaceId,where.value])
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    await client.query('DELETE FROM ace_audience_members WHERE workspace_id=$1 AND audience_id=$2',[workspaceId,audienceId])
    for(const lead of leads.rows){
      const identityMode=String(audience.identity_mode||'auto').toLowerCase()
      const identity=identityMode==='device'?(lead.device_id||sha(lead.external_lead_id)):(lead.email_sha256||lead.phone_sha256||lead.device_id||sha(lead.external_lead_id))
      await client.query(
        `INSERT INTO ace_audience_members (audience_id,workspace_id,lead_profile_id,identity_key,action,attributes)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT DO NOTHING`,
        [audienceId,workspaceId,lead.id,identity,String(audience.mode).toLowerCase(),JSON.stringify({grade:lead.grade,score:lead.score,stage:lead.crm_stage,deviceId:lead.device_id||null,devicePlatform:lead.device_platform||null,appId:lead.app_id||null})]
      )
    }
    await client.query(`UPDATE ace_audiences SET matched_size=$3,status='ready_for_sync',last_materialized_at=now(),updated_at=now() WHERE workspace_id=$1 AND id=$2`,[workspaceId,audienceId,leads.rowCount])
    await client.query('COMMIT')
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{client.release()}
  return {audienceId,matchedSize:leads.rowCount,status:'ready_for_sync'}
}

export const getLeadProfile=async(workspaceId,leadRef)=>{
  if(!pool)return null
  const {rows}=await pool.query(
    `SELECT * FROM ace_lead_profiles WHERE workspace_id=$1 AND (id=$2 OR external_lead_id=$2 OR name=$2) LIMIT 1`,
    [workspaceId,String(leadRef)]
  )
  return rows[0]||null
}

export const getAudienceBundle=async(workspaceId,audienceId)=>{
  if(!pool)return null
  const {rows}=await pool.query(`SELECT * FROM ace_audiences WHERE workspace_id=$1 AND id=$2`,[workspaceId,audienceId])
  const audience=rows[0]
  if(!audience)return null
  const members=await pool.query(
    `SELECT m.identity_key,m.action,m.attributes,p.email_sha256,p.phone_sha256,p.device_id,p.device_platform,p.app_id,p.external_lead_id,p.attributes AS profile_attributes
     FROM ace_audience_members m
     JOIN ace_lead_profiles p ON p.id=m.lead_profile_id
     WHERE m.workspace_id=$1 AND m.audience_id=$2 ORDER BY m.created_at ASC`,
    [workspaceId,audienceId]
  )
  return {audience,members:members.rows}
}

export const updateAudienceSyncState=async(workspaceId,audienceId,provider,patch={})=>{
  if(!pool)return null
  const current=await pool.query(`SELECT provider_state FROM ace_audiences WHERE workspace_id=$1 AND id=$2`,[workspaceId,audienceId])
  if(!current.rowCount)return null
  const state={...(current.rows[0].provider_state||{}),[provider]:{...(current.rows[0].provider_state?.[provider]||{}),...patch,updatedAt:new Date().toISOString()}}
  const statuses=Object.values(state).map(x=>x?.status).filter(Boolean)
  const overall=statuses.length&&statuses.every(x=>x==='succeeded')?'active':statuses.some(x=>x==='failed')?'error':'syncing'
  const {rows}=await pool.query(
    `UPDATE ace_audiences SET provider_state=$3::jsonb,status=$4,last_sync_error=$5,last_synced_at=CASE WHEN $4='active' THEN now() ELSE last_synced_at END,updated_at=now()
     WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [workspaceId,audienceId,JSON.stringify(state),overall,patch.error||null]
  )
  return rows[0]
}

export const createActivationRun=async(workspaceId,{kind,entityId,provider,requestSummary={}})=>{
  if(!pool)return null
  const id='act_'+randomUUID()
  const {rows}=await pool.query(
    `INSERT INTO ace_activation_runs (id,workspace_id,kind,entity_id,provider,status,request_summary)
     VALUES ($1,$2,$3,$4,$5,'queued',$6::jsonb) RETURNING *`,
    [id,workspaceId,kind,entityId,provider,JSON.stringify(requestSummary)]
  )
  return rows[0]
}

export const updateActivationRun=async(workspaceId,id,patch={})=>{
  if(!pool)return null
  const {rows}=await pool.query(
    `UPDATE ace_activation_runs SET
      status=COALESCE($3,status),
      response_summary=CASE WHEN $4::jsonb='{}'::jsonb THEN response_summary ELSE $4::jsonb END,
      external_id=COALESCE($5,external_id),
      last_error=$6,
      attempts=COALESCE($7,attempts),
      completed_at=CASE WHEN $3 IN ('succeeded','failed') THEN now() ELSE completed_at END,
      updated_at=now()
     WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [workspaceId,id,patch.status||null,JSON.stringify(patch.responseSummary||{}),patch.externalId||null,patch.error||null,patch.attempts??null]
  )
  return rows[0]||null
}

export const listActivationRuns=async(workspaceId,limit=100)=>{
  if(!pool)return []
  const {rows}=await pool.query(
    `SELECT * FROM ace_activation_runs WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [workspaceId,Math.max(1,Math.min(500,Number(limit)||100))]
  )
  return rows
}

export const listAudiences=async workspaceId=>{
  if(!pool)return []
  const {rows}=await pool.query(`SELECT id,name,mode,destination,identity_mode,status,estimated_size,matched_size,last_materialized_at,definition,provider_state,last_sync_error,last_synced_at,created_at,updated_at FROM ace_audiences WHERE workspace_id=$1 ORDER BY updated_at DESC`,[workspaceId])
  return rows
}


export const audienceOpsStats=async workspaceId=>{
  if(!pool)return {available:false}
  const [audiences,profiles]=await Promise.all([
    pool.query(`SELECT
      COUNT(*)::int total,
      COALESCE(SUM(matched_size) FILTER (WHERE LOWER(mode)<>'suppress'),0)::int activated,
      COALESCE(SUM(matched_size) FILTER (WHERE LOWER(mode)='suppress'),0)::int suppressed,
      COUNT(*) FILTER (WHERE status='active')::int active,
      COUNT(*) FILTER (WHERE status='error')::int errors,
      COUNT(*) FILTER (WHERE identity_mode='device')::int device_audiences,
      AVG(EXTRACT(EPOCH FROM (COALESCE(last_synced_at,updated_at)-created_at))) FILTER (WHERE last_synced_at IS NOT NULL) avg_sync_seconds
     FROM ace_audiences WHERE workspace_id=$1`,[workspaceId]),
    pool.query(`SELECT
      COUNT(*)::int total,
      COUNT(*) FILTER (WHERE COALESCE(device_id,'')<>'')::int device_ids,
      COUNT(*) FILTER (WHERE LOWER(COALESCE(crm_stage,'')) IN ('converted','enrolled','closed_won','customer'))::int converted,
      COUNT(*) FILTER (WHERE grade IN ('C','D'))::int low_quality,
      COUNT(*) FILTER (WHERE grade IN ('A','B'))::int high_quality,
      COUNT(*) FILTER (WHERE LOWER(COALESCE(crm_stage,'')) IN ('consultation','opportunity','qualified'))::int decision,
      COUNT(*) FILTER (WHERE LOWER(COALESCE(crm_stage,'')) IN ('lead','new','contacted','connected'))::int nurture
     FROM ace_lead_profiles WHERE workspace_id=$1 AND status='active'`,[workspaceId])
  ])
  const a=audiences.rows[0],p=profiles.rows[0]
  return {
    available:true,
    audiences:{total:a.total,active:a.active,activatedIdentities:a.activated,suppressedIdentities:a.suppressed,errors:a.errors,deviceAudiences:a.device_audiences,medianSyncLatencySeconds:a.avg_sync_seconds?Math.round(Number(a.avg_sync_seconds)):null},
    lifecycle:{acquisition:Math.max(0,Number(p.total||0)-Number(p.converted||0)-Number(p.decision||0)),nurture:p.nurture,decision:p.decision,postPurchase:p.converted},
    exclusions:{converted:p.converted,deviceIds:p.device_ids,lowQuality:p.low_quality},
    profiles:{total:p.total,highQuality:p.high_quality}
  }
}

export const closeLeadOps=async()=>{if(pool)await pool.end()}
