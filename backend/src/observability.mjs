import {randomUUID} from 'node:crypto'
import pg from 'pg'

const {Pool}=pg
const databaseUrl=process.env.DATABASE_URL||''
const evalIntervalMs=Number(process.env.MONITORING_EVAL_INTERVAL_MS||60000)
const retentionDays=Number(process.env.API_METRIC_RETENTION_DAYS||30)
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.OBSERVABILITY_DB_POOL_MAX||10),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

const lastEval=new Map()

const usageColumn=(method,path)=>{
  if(method==='POST'&&path==='/api/track') return 'tracked_events'
  if(method==='POST'&&path==='/api/assisted-events') return 'assisted_events'
  if(method==='POST'&&path==='/api/signal-deliveries/dispatch') return 'signal_dispatches'
  if(method==='POST'&&(path.startsWith('/api/qualification-calls')||path.startsWith('/api/meetings/remind')||path.startsWith('/api/feedback/request'))) return 'agent_actions'
  if(method==='POST'&&path==='/api/audiences/sync') return 'audience_syncs'
  if(method==='POST'&&path==='/api/custom-integrations/test') return 'custom_integration_tests'
  return null
}

const ensureRules=async workspaceId=>{
  if(!pool)return
  const defaults=[
    ['api_error_rate','gt',2,'critical',10],
    ['api_p95_latency_ms','gt',2000,'warning',10],
    ['dead_letter_jobs','gt',0,'critical',5],
    ['audience_sync_errors','gt',0,'warning',15]
  ]
  for(const [metric,operator,threshold,severity,windowMinutes] of defaults){
    await pool.query(
      `INSERT INTO ace_monitoring_rules (id,workspace_id,metric,operator,threshold,severity,window_minutes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (workspace_id,metric) DO NOTHING`,
      ['mr_'+workspaceId+'_'+metric,workspaceId,metric,operator,threshold,severity,windowMinutes]
    )
  }
}

const compare=(value,operator,threshold)=>{
  if(operator==='gt')return value>threshold
  if(operator==='gte')return value>=threshold
  if(operator==='lt')return value<threshold
  if(operator==='lte')return value<=threshold
  return false
}

const metricSnapshot=async(workspaceId,windowMinutes=10)=>{
  const [api,jobs,audiences]=await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int requests,
         COUNT(*) FILTER (WHERE status_code>=500)::int errors,
         COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY latency_ms),0)::int p95
       FROM ace_api_metrics
       WHERE workspace_id=$1 AND created_at>=now()-($2*interval '1 minute')`,
      [workspaceId,windowMinutes]
    ),
    pool.query(`SELECT COUNT(*)::int count FROM ace_jobs WHERE workspace_id=$1 AND status='dead_letter'`,[workspaceId]).catch(()=>({rows:[{count:0}]})),
    pool.query(`SELECT COUNT(*)::int count FROM ace_audiences WHERE workspace_id=$1 AND status='error'`,[workspaceId]).catch(()=>({rows:[{count:0}]}))
  ])
  const a=api.rows[0]
  return {
    api_error_rate:a.requests?Number(((a.errors/a.requests)*100).toFixed(3)):0,
    api_p95_latency_ms:Number(a.p95||0),
    dead_letter_jobs:Number(jobs.rows[0]?.count||0),
    audience_sync_errors:Number(audiences.rows[0]?.count||0)
  }
}

const titleFor=metric=>({
  api_error_rate:'API error rate above threshold',
  api_p95_latency_ms:'API p95 latency elevated',
  dead_letter_jobs:'Dead-letter jobs require review',
  audience_sync_errors:'Audience provider sync errors detected'
}[metric]||metric)

const detailFor=(metric,value,threshold)=>({
  api_error_rate:`5xx error rate is ${value}% against a ${threshold}% threshold.`,
  api_p95_latency_ms:`API p95 latency is ${value}ms against a ${threshold}ms threshold.`,
  dead_letter_jobs:`${value} job(s) are in dead-letter state.`,
  audience_sync_errors:`${value} audience(s) are currently in provider error state.`
}[metric]||`${metric} is ${value}; threshold is ${threshold}.`)

export const evaluateMonitoring=async workspaceId=>{
  if(!pool)return []
  await ensureRules(workspaceId)
  const {rows:rules}=await pool.query(`SELECT * FROM ace_monitoring_rules WHERE workspace_id=$1 AND enabled=true`,[workspaceId])
  const maxWindow=Math.max(1,...rules.map(x=>Number(x.window_minutes||10)))
  const values=await metricSnapshot(workspaceId,maxWindow)
  const opened=[]
  for(const rule of rules){
    const value=Number(values[rule.metric]??0)
    const threshold=Number(rule.threshold)
    const breached=compare(value,rule.operator,threshold)
    const existing=await pool.query(
      `SELECT * FROM ace_alert_incidents WHERE workspace_id=$1 AND rule_id=$2 AND status='open' ORDER BY detected_at DESC LIMIT 1`,
      [workspaceId,rule.id]
    )
    if(breached&&!existing.rowCount){
      const id='al_'+randomUUID()
      const {rows}=await pool.query(
        `INSERT INTO ace_alert_incidents
         (id,workspace_id,rule_id,metric,severity,title,source,detail,metric_value,threshold,status)
         VALUES ($1,$2,$3,$4,$5,$6,'Platform monitoring',$7,$8,$9,'open') RETURNING *`,
        [id,workspaceId,rule.id,rule.metric,rule.severity,titleFor(rule.metric),detailFor(rule.metric,value,threshold),value,threshold]
      )
      opened.push(rows[0])
    }
    if(!breached&&existing.rowCount){
      await pool.query(
        `UPDATE ace_alert_incidents SET status='resolved',resolved_at=now(),updated_at=now() WHERE id=$1`,
        [existing.rows[0].id]
      )
    }
  }
  return opened
}

export const recordApiTelemetry=async(workspaceId,{requestId,method,path,statusCode,latencyMs})=>{
  if(!pool||!workspaceId||!path.startsWith('/api/'))return
  await pool.query(
    `INSERT INTO ace_api_metrics (workspace_id,request_id,method,path,status_code,latency_ms)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [workspaceId,String(requestId),String(method),String(path),Number(statusCode),Math.max(0,Math.round(Number(latencyMs)||0))]
  )
  const usage=usageColumn(String(method),String(path))
  const columns=['api_requests',...(statusCode<400&&usage?[usage]:[])].filter(Boolean)
  const updates=columns.map(x=>`${x}=ace_usage_daily.${x}+1`).join(',')
  await pool.query(
    `INSERT INTO ace_usage_daily (workspace_id,usage_date,${columns.join(',')})
     VALUES ($1,CURRENT_DATE,${columns.map(()=>1).join(',')})
     ON CONFLICT (workspace_id,usage_date) DO UPDATE SET ${updates}`,
    [workspaceId]
  )
  const previous=lastEval.get(workspaceId)||0
  if(Date.now()-previous>=evalIntervalMs){
    lastEval.set(workspaceId,Date.now())
    await evaluateMonitoring(workspaceId).catch(()=>{})
  }
}

export const monitoringSnapshot=async workspaceId=>{
  if(!pool)return {available:false}
  await ensureRules(workspaceId)
  await evaluateMonitoring(workspaceId)
  const [recent,day,usage,rules,alerts]=await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int requests,
       COUNT(*) FILTER (WHERE status_code>=500)::int errors,
       COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY latency_ms),0)::int p95
       FROM ace_api_metrics WHERE workspace_id=$1 AND created_at>=now()-interval '15 minutes'`,
      [workspaceId]
    ),
    pool.query(
      `SELECT COUNT(*)::int requests,
       COUNT(*) FILTER (WHERE status_code>=500)::int errors,
       COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY latency_ms),0)::int p95
       FROM ace_api_metrics WHERE workspace_id=$1 AND created_at>=now()-interval '24 hours'`,
      [workspaceId]
    ),
    pool.query(
      `SELECT
       COALESCE(SUM(api_requests),0)::bigint api_requests,
       COALESCE(SUM(tracked_events),0)::bigint tracked_events,
       COALESCE(SUM(assisted_events),0)::bigint assisted_events,
       COALESCE(SUM(signal_dispatches),0)::bigint signal_dispatches,
       COALESCE(SUM(agent_actions),0)::bigint agent_actions,
       COALESCE(SUM(audience_syncs),0)::bigint audience_syncs,
       COALESCE(SUM(custom_integration_tests),0)::bigint custom_integration_tests
       FROM ace_usage_daily
       WHERE workspace_id=$1 AND usage_date>=date_trunc('month',CURRENT_DATE)::date`,
      [workspaceId]
    ),
    pool.query(`SELECT * FROM ace_monitoring_rules WHERE workspace_id=$1 ORDER BY severity,metric`,[workspaceId]),
    pool.query(`SELECT * FROM ace_alert_incidents WHERE workspace_id=$1 ORDER BY detected_at DESC LIMIT 50`,[workspaceId])
  ])
  const r=recent.rows[0],d=day.rows[0],u=usage.rows[0]
  return {
    available:true,
    status:Number(r.errors||0)===0?'healthy':'degraded',
    requests15m:Number(r.requests||0),
    eventsPerMinute:Number((Number(r.requests||0)/15).toFixed(1)),
    failedEventRate:Number(r.requests?((r.errors/r.requests)*100).toFixed(3):0),
    p95LatencyMs:Number(r.p95||0),
    last24h:{
      requests:Number(d.requests||0),
      errorRate:Number(d.requests?((d.errors/d.requests)*100).toFixed(3):0),
      p95LatencyMs:Number(d.p95||0)
    },
    usage:Object.fromEntries(Object.entries(u).map(([k,v])=>[k,Number(v||0)])),
    rules:rules.rows,
    recentAlerts:alerts.rows
  }
}

export const listAlerts=async workspaceId=>{
  if(!pool)return []
  await evaluateMonitoring(workspaceId)
  const {rows}=await pool.query(`SELECT * FROM ace_alert_incidents WHERE workspace_id=$1 ORDER BY CASE WHEN status='open' THEN 0 ELSE 1 END,detected_at DESC LIMIT 200`,[workspaceId])
  return rows
}

export const resolveAlert=async(workspaceId,id)=>{
  if(!pool)return null
  const {rows}=await pool.query(
    `UPDATE ace_alert_incidents SET status='resolved',resolved_at=now(),updated_at=now()
     WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [workspaceId,id]
  )
  return rows[0]||null
}

export const listMonitoringRules=async workspaceId=>{
  if(!pool)return []
  await ensureRules(workspaceId)
  const {rows}=await pool.query(`SELECT * FROM ace_monitoring_rules WHERE workspace_id=$1 ORDER BY severity,metric`,[workspaceId])
  return rows
}

export const saveMonitoringRule=async(workspaceId,input={})=>{
  if(!pool)return null
  const allowedMetrics=['api_error_rate','api_p95_latency_ms','dead_letter_jobs','audience_sync_errors']
  const metric=String(input.metric||'')
  const operator=String(input.operator||'gt')
  const threshold=Number(input.threshold)
  const severity=String(input.severity||'warning')
  if(!allowedMetrics.includes(metric))throw new Error('unsupported monitoring metric')
  if(!['gt','gte','lt','lte'].includes(operator))throw new Error('invalid monitoring operator')
  if(!Number.isFinite(threshold))throw new Error('valid threshold required')
  if(!['info','warning','critical'].includes(severity))throw new Error('invalid severity')
  const id='mr_'+workspaceId+'_'+metric
  const {rows}=await pool.query(
    `INSERT INTO ace_monitoring_rules (id,workspace_id,metric,operator,threshold,severity,window_minutes,enabled)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (workspace_id,metric) DO UPDATE SET
       operator=EXCLUDED.operator,threshold=EXCLUDED.threshold,severity=EXCLUDED.severity,window_minutes=EXCLUDED.window_minutes,enabled=EXCLUDED.enabled,updated_at=now()
     RETURNING *`,
    [id,workspaceId,metric,operator,threshold,severity,Math.max(1,Math.min(1440,Number(input.windowMinutes||10))),input.enabled!==false]
  )
  return rows[0]
}

export const purgeOldMetrics=async()=>{
  if(!pool)return 0
  const result=await pool.query(`DELETE FROM ace_api_metrics WHERE created_at<now()-($1*interval '1 day')`,[retentionDays])
  return result.rowCount||0
}

export const closeObservability=async()=>{if(pool)await pool.end()}
