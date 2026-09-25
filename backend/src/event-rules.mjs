import {randomUUID} from 'node:crypto'
import pg from 'pg'
import {recordAssistedEvent} from './attribution-store.mjs'

const {Pool}=pg
const databaseUrl=process.env.DATABASE_URL||''
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.EVENT_RULE_DB_POOL_MAX||5),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

const OPERATORS=new Set(['equals','not_equals','gt','gte','lt','lte','contains','exists','in'])
const DESTINATIONS=new Set(['Google Ads','Meta Ads'])
const cleanName=value=>String(value||'').trim().slice(0,160)
const pathOk=value=>/^[A-Za-z0-9_.-]{1,120}$/.test(String(value||''))
const getPath=(input,path)=>{
  if(!pathOk(path))return undefined
  return String(path).split('.').reduce((acc,key)=>acc==null?undefined:acc[key],input)
}
const primitive=value=>typeof value==='string'||typeof value==='number'||typeof value==='boolean'||value==null
const compare=(actual,operator,expected)=>{
  if(operator==='exists')return actual!==undefined&&actual!==null&&actual!==''
  if(operator==='equals')return String(actual??'')===String(expected??'')
  if(operator==='not_equals')return String(actual??'')!==String(expected??'')
  if(operator==='contains'){
    if(Array.isArray(actual))return actual.map(String).includes(String(expected))
    return String(actual??'').toLowerCase().includes(String(expected??'').toLowerCase())
  }
  if(operator==='in'){
    const list=Array.isArray(expected)?expected:String(expected??'').split(',').map(x=>x.trim())
    return list.map(String).includes(String(actual??''))
  }
  const a=Number(actual),b=Number(expected)
  if(!Number.isFinite(a)||!Number.isFinite(b))return false
  if(operator==='gt')return a>b
  if(operator==='gte')return a>=b
  if(operator==='lt')return a<b
  if(operator==='lte')return a<=b
  return false
}
const normalizeConditions=input=>{
  const conditions=Array.isArray(input)?input:[]
  if(conditions.length>10)throw new Error('maximum 10 conditions per rule')
  return conditions.map(condition=>{
    const field=String(condition?.field||'')
    const operator=String(condition?.operator||'equals')
    if(!pathOk(field))throw new Error('invalid condition field')
    if(!OPERATORS.has(operator))throw new Error('unsupported condition operator')
    if(!primitive(condition?.value)&&!Array.isArray(condition?.value))throw new Error('condition value must be primitive or array')
    return {field,operator,value:condition?.value??null}
  })
}
const normalizeDestinations=value=>{
  const input=Array.isArray(value)?value:String(value||'').split(/,|·/).map(x=>x.trim()).filter(Boolean)
  return [...new Set(input.filter(x=>DESTINATIONS.has(String(x))))].slice(0,4)
}

export const createEventRule=async(workspaceId,input={},createdBy=null)=>{
  if(!pool)throw new Error('event rule store unavailable')
  const name=cleanName(input.name),sourceEvent=cleanName(input.sourceEvent),outputEvent=cleanName(input.outputEvent)
  if(!name||!sourceEvent||!outputEvent)throw new Error('name, sourceEvent and outputEvent required')
  const conditions=normalizeConditions(input.conditions)
  const destinations=normalizeDestinations(input.destinations)
  const valueMode=['copy','fixed','field'].includes(String(input.valueMode))?String(input.valueMode):'copy'
  const valueField=valueMode==='field'?String(input.valueField||''):null
  if(valueMode==='field'&&!pathOk(valueField))throw new Error('valueField required for field mode')
  const fixedValue=valueMode==='fixed'?Number(input.fixedValue):null
  if(valueMode==='fixed'&&!Number.isFinite(fixedValue))throw new Error('fixedValue must be numeric')
  const id='evt_rule_'+randomUUID()
  const {rows}=await pool.query(
    `INSERT INTO ace_event_rules
      (id,workspace_id,name,source_event,output_event,conditions,destinations,value_mode,value_field,fixed_value,currency,enabled,created_by)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [id,workspaceId,name,sourceEvent,outputEvent,JSON.stringify(conditions),JSON.stringify(destinations),valueMode,valueField,fixedValue,cleanName(input.currency)||null,input.enabled!==false,createdBy]
  )
  return rows[0]
}

export const setEventRuleEnabled=async(workspaceId,id,enabled)=>{
  if(!pool)return null
  const {rows}=await pool.query(
    `UPDATE ace_event_rules SET enabled=$3,updated_at=now() WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [workspaceId,id,enabled===true]
  )
  return rows[0]||null
}

export const listEventRules=async(workspaceId)=>{
  if(!pool)return []
  const {rows}=await pool.query(
    `SELECT id,name,source_event,output_event,conditions,destinations,value_mode,value_field,fixed_value,currency,enabled,created_by,created_at,updated_at
     FROM ace_event_rules WHERE workspace_id=$1 ORDER BY updated_at DESC`,[workspaceId]
  )
  return rows
}

export const listEventRuleRuns=async(workspaceId,limit=100)=>{
  if(!pool)return []
  const {rows}=await pool.query(
    `SELECT id,rule_id,source_event_id,source_event,output_event,assisted_event_id,destinations,activation_queued,evaluation,created_at
     FROM ace_event_rule_runs WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [workspaceId,Math.max(1,Math.min(500,Number(limit)||100))]
  )
  return rows
}

const valueFor=(rule,event)=>{
  if(rule.value_mode==='fixed')return rule.fixed_value==null?null:Number(rule.fixed_value)
  if(rule.value_mode==='field'){
    const value=getPath(event,rule.value_field)
    const number=Number(value)
    return Number.isFinite(number)?number:null
  }
  const number=Number(event.value)
  return Number.isFinite(number)?number:null
}

export const evaluateEventRules=async(workspaceId,event={},context={})=>{
  if(!pool)return []
  const sourceEvent=String(event.event||event.eventType||'').trim()
  if(!sourceEvent)return []
  const {rows}=await pool.query(
    `SELECT * FROM ace_event_rules WHERE workspace_id=$1 AND enabled=true AND (source_event=$2 OR source_event='*') ORDER BY created_at ASC`,
    [workspaceId,sourceEvent]
  )
  const matches=[]
  for(const rule of rows){
    const conditions=Array.isArray(rule.conditions)?rule.conditions:[]
    const evaluation=conditions.map(c=>({field:c.field,operator:c.operator,expected:c.value,actual:getPath(event,c.field),passed:compare(getPath(event,c.field),c.operator,c.value)}))
    if(evaluation.some(x=>!x.passed))continue
    const runId='evt_run_'+randomUUID()
    const derivedId='derived:'+runId
    const assisted=await recordAssistedEvent(workspaceId,{
      ...event,
      event:rule.output_event,
      eventType:rule.output_event,
      eventId:derivedId,
      idempotencyKey:derivedId,
      source:'event_rule',
      value:valueFor(rule,event),
      currency:rule.currency||event.currency||null,
      payload:{ruleId:rule.id,ruleName:rule.name,sourceEvent,original:event.payload||event.properties||event.data||{}}
    })
    const destinations=normalizeDestinations(rule.destinations)
    await pool.query(
      `INSERT INTO ace_event_rule_runs
        (id,workspace_id,rule_id,source_event_id,source_event,output_event,assisted_event_id,destinations,evaluation)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb)`,
      [runId,workspaceId,rule.id,String(context.sourceEventId||event.eventId||''),sourceEvent,rule.output_event,assisted?.id||null,JSON.stringify(destinations),JSON.stringify(evaluation)]
    )
    matches.push({runId,ruleId:rule.id,ruleName:rule.name,outputEvent:rule.output_event,destinations,assistedEvent:assisted,evaluation})
  }
  return matches
}

export const markEventRuleActivation=async(workspaceId,runId,count)=>{
  if(!pool)return
  await pool.query(
    `UPDATE ace_event_rule_runs SET activation_queued=$3 WHERE workspace_id=$1 AND id=$2`,
    [workspaceId,runId,Math.max(0,Number(count)||0)]
  )
}

export const eventRuleStats=async(workspaceId)=>{
  if(!pool)return {rules:0,enabled:0,runs24h:0,activations24h:0}
  const [rules,runs]=await Promise.all([
    pool.query(`SELECT COUNT(*)::int rules,COUNT(*) FILTER (WHERE enabled=true)::int enabled FROM ace_event_rules WHERE workspace_id=$1`,[workspaceId]),
    pool.query(`SELECT COUNT(*)::int runs,COALESCE(SUM(activation_queued),0)::int activations FROM ace_event_rule_runs WHERE workspace_id=$1 AND created_at>=now()-interval '24 hours'`,[workspaceId])
  ])
  return {rules:rules.rows[0].rules,enabled:rules.rows[0].enabled,runs24h:runs.rows[0].runs,activations24h:runs.rows[0].activations}
}

export const closeEventRules=async()=>{if(pool)await pool.end()}
