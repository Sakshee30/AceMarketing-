import {createHash,randomUUID} from 'node:crypto'
import {pool} from '../database.mjs'

const canonical=value=>{
  if(value===null||typeof value!=='object')return value
  if(Array.isArray(value))return value.map(canonical)
  return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]))
}
const hashRequest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')

export const beginControlCommand=async({actor,key,operation,requestBody})=>{
  if(!pool)throw Object.assign(new Error('control idempotency store unavailable'),{status:503})
  const normalizedKey=String(key||'').trim()
  if(!/^[A-Za-z0-9._:-]{16,160}$/.test(normalizedKey)){
    throw Object.assign(new Error('valid Idempotency-Key header is required'),{status:400,code:'idempotency_key_required'})
  }
  const requestHash=hashRequest(requestBody||{})
  const id='pcc_'+randomUUID()
  const inserted=await pool.query(
    `INSERT INTO ace_platform_control_commands
      (id,idempotency_key,actor,operation,request_hash)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (actor,idempotency_key) DO NOTHING
     RETURNING *`,
    [id,normalizedKey,actor,operation,requestHash]
  )
  if(inserted.rows[0])return {execute:true,command:inserted.rows[0]}

  const existing=(await pool.query(
    `SELECT * FROM ace_platform_control_commands
     WHERE actor=$1 AND idempotency_key=$2`,
    [actor,normalizedKey]
  )).rows[0]
  if(!existing)throw Object.assign(new Error('idempotency record unavailable'),{status:503})
  if(existing.operation!==operation||existing.request_hash!==requestHash){
    throw Object.assign(new Error('Idempotency-Key was already used for a different control command'),{
      status:409,
      code:'idempotency_key_reuse'
    })
  }
  if(existing.status==='completed'||existing.status==='failed'){
    return {
      execute:false,
      replay:true,
      responseStatus:Number(existing.response_status||500),
      responseBody:existing.response_body||{}
    }
  }
  if(new Date(existing.expires_at).getTime()>Date.now()){
    throw Object.assign(new Error('matching control command is still in progress'),{
      status:409,
      code:'control_command_in_progress'
    })
  }
  const reclaimed=await pool.query(
    `UPDATE ace_platform_control_commands SET
       id=$3,status='processing',response_status=NULL,response_body=NULL,
       request_hash=$4,operation=$5,updated_at=now(),expires_at=now()+interval '10 minutes'
     WHERE actor=$1 AND idempotency_key=$2 AND expires_at<=now()
     RETURNING *`,
    [actor,normalizedKey,id,requestHash,operation]
  )
  if(!reclaimed.rows[0]){
    throw Object.assign(new Error('matching control command is still in progress'),{
      status:409,
      code:'control_command_in_progress'
    })
  }
  return {execute:true,command:reclaimed.rows[0]}
}

export const finishControlCommand=async({id,responseStatus,responseBody})=>{
  if(!pool||!id)return
  await pool.query(
    `UPDATE ace_platform_control_commands SET
       status=$2,response_status=$3,response_body=$4::jsonb,updated_at=now()
     WHERE id=$1`,
    [
      id,
      Number(responseStatus)>=200&&Number(responseStatus)<400?'completed':'failed',
      Number(responseStatus),
      JSON.stringify(responseBody||{})
    ]
  )
}
