import {randomUUID} from 'node:crypto'
import {lookup} from 'node:dns/promises'
import {isIP} from 'node:net'
import pg from 'pg'
import {connectorVaultReady,decryptSecret,encryptSecret} from './vault.mjs'

const {Pool}=pg
const databaseUrl=process.env.DATABASE_URL||''
const allowHttp=process.env.CUSTOM_INTEGRATION_ALLOW_HTTP==='true'
const timeoutMs=Number(process.env.CUSTOM_INTEGRATION_TIMEOUT_MS||5000)
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.CUSTOM_INTEGRATION_DB_POOL_MAX||10),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

const privateV4=ip=>{
  const p=ip.split('.').map(Number)
  if(p.length!==4||p.some(x=>!Number.isInteger(x)||x<0||x>255)) return true
  const [a,b]=p
  return a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127
}
const privateV6=ip=>{
  const x=String(ip).toLowerCase()
  return x==='::'||x==='::1'||x.startsWith('fe8')||x.startsWith('fe9')||x.startsWith('fea')||x.startsWith('feb')||x.startsWith('fc')||x.startsWith('fd')||x.startsWith('::ffff:127.')||x.startsWith('::ffff:10.')||x.startsWith('::ffff:192.168.')||x.startsWith('::ffff:169.254.')
}
const blockedIp=ip=>isIP(ip)===4?privateV4(ip):isIP(ip)===6?privateV6(ip):true

export const validateOutboundUrl=async raw=>{
  let url
  try{url=new URL(String(raw))}catch{throw new Error('invalid integration URL')}
  if(url.username||url.password) throw new Error('credentials must not be embedded in the URL')
  if(url.protocol!=='https:'&&!(allowHttp&&url.protocol==='http:')) throw new Error('custom integration URL must use HTTPS')
  const host=url.hostname.toLowerCase()
  if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')) throw new Error('local network hosts are not allowed')
  const resolved=isIP(host)?[{address:host,family:isIP(host)}]:await lookup(host,{all:true,verbatim:true})
  if(!resolved.length) throw new Error('integration host did not resolve')
  for(const item of resolved) if(blockedIp(item.address)) throw new Error('private, loopback, link-local, carrier-grade NAT and reserved IP ranges are blocked')
  return {url,resolvedIps:[...new Set(resolved.map(x=>x.address))]}
}

const authHeaders=credential=>{
  if(!credential)return {}
  const type=String(credential.authType||'').toLowerCase()
  if(type.includes('bearer')&&credential.secret) return {Authorization:'Bearer '+credential.secret}
  if(type.includes('api key')&&credential.secret) return {[credential.headerName||'X-API-Key']:credential.secret}
  if(type.includes('basic')&&credential.username!=null&&credential.secret!=null) return {Authorization:'Basic '+Buffer.from(String(credential.username)+':'+String(credential.secret)).toString('base64')}
  return {}
}

const requestSafe=async(rawUrl,credential=null)=>{
  let current=await validateOutboundUrl(rawUrl)
  const origin=current.url.origin
  const started=Date.now()
  for(let hop=0;hop<3;hop++){
    const controller=new AbortController()
    const timer=setTimeout(()=>controller.abort(),timeoutMs)
    let response
    try{
      response=await fetch(current.url,{
        method:'GET',
        headers:{Accept:'application/json, text/plain;q=0.8, */*;q=0.5',...authHeaders(credential)},
        redirect:'manual',
        signal:controller.signal
      })
    }finally{clearTimeout(timer)}
    if(response.status>=300&&response.status<400&&response.headers.get('location')){
      const next=new URL(response.headers.get('location'),current.url)
      if(next.origin!==origin) throw new Error('cross-origin redirects are blocked for custom integration tests')
      current=await validateOutboundUrl(next.toString())
      continue
    }
    const contentType=String(response.headers.get('content-type')||'')
    let sampleRecords=0
    if(contentType.includes('application/json')){
      const body=await response.json().catch(()=>null)
      if(Array.isArray(body)) sampleRecords=Math.min(body.length,100)
      else if(Array.isArray(body?.data)) sampleRecords=Math.min(body.data.length,100)
      else if(body&&typeof body==='object') sampleRecords=1
    }
    return {ok:response.ok,statusCode:response.status,latencyMs:Date.now()-started,sampleRecords,resolvedIps:current.resolvedIps}
  }
  throw new Error('too many redirects')
}

const sanitize=row=>({
  id:row.id,name:row.name,type:row.connector_type,direction:row.direction,baseUrl:row.base_url,auth:row.auth_type,
  identity:row.identity_field,stage:row.stage_field,revenue:row.revenue_field,status:row.status,
  lastStatusCode:row.last_status_code,lastLatencyMs:row.last_latency_ms,lastError:row.last_error,lastTestedAt:row.last_tested_at,
  createdAt:row.created_at,updatedAt:row.updated_at,hasCredential:Boolean(row.encrypted_auth)
})

export const listCustomIntegrations=async workspaceId=>{
  if(!pool)return []
  const {rows}=await pool.query(`SELECT * FROM ace_custom_integrations WHERE workspace_id=$1 ORDER BY updated_at DESC`,[workspaceId])
  return rows.map(sanitize)
}

export const createCustomIntegration=async(workspaceId,input={})=>{
  if(!pool)return null
  const {url}=await validateOutboundUrl(input.baseUrl)
  const id='ci_'+randomUUID()
  const authType=String(input.auth||'None')
  let encrypted=null
  if(input.secret||input.username){
    if(!connectorVaultReady()) throw new Error('connector credential vault is not configured')
    encrypted=encryptSecret({authType,secret:String(input.secret||''),username:String(input.username||''),headerName:String(input.headerName||'X-API-Key')})
  }
  const {rows}=await pool.query(
    `INSERT INTO ace_custom_integrations
      (id,workspace_id,name,connector_type,direction,base_url,auth_type,encrypted_auth,identity_field,stage_field,revenue_field,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,'draft')
     ON CONFLICT (workspace_id,name) DO UPDATE SET
       connector_type=EXCLUDED.connector_type,direction=EXCLUDED.direction,base_url=EXCLUDED.base_url,auth_type=EXCLUDED.auth_type,
       encrypted_auth=COALESCE(EXCLUDED.encrypted_auth,ace_custom_integrations.encrypted_auth),
       identity_field=EXCLUDED.identity_field,stage_field=EXCLUDED.stage_field,revenue_field=EXCLUDED.revenue_field,updated_at=now()
     RETURNING *`,
    [id,workspaceId,String(input.name),String(input.type||'REST API'),String(input.direction||'Bidirectional'),url.toString(),authType,encrypted?JSON.stringify(encrypted):null,String(input.identity||''),String(input.stage||''),String(input.revenue||'')]
  )
  return sanitize(rows[0])
}

const integrationCredential=async row=>{
  if(!row.encrypted_auth)return null
  return decryptSecret(row.encrypted_auth)
}

export const testCustomIntegration=async(workspaceId,input={})=>{
  if(!pool)throw new Error('custom integration store unavailable')
  let row=null
  if(input.id){
    const found=await pool.query(`SELECT * FROM ace_custom_integrations WHERE workspace_id=$1 AND id=$2`,[workspaceId,String(input.id)])
    row=found.rows[0]||null
  }
  const target=row?.base_url||String(input.baseUrl||'')
  if(!target) throw new Error('baseUrl required')
  let credential=row?await integrationCredential(row):null
  if(!credential&&(input.secret||input.username)) credential={authType:String(input.auth||''),secret:String(input.secret||''),username:String(input.username||''),headerName:String(input.headerName||'X-API-Key')}
  const testId='cit_'+randomUUID()
  const started=Date.now()
  try{
    const result=await requestSafe(target,credential)
    if(row){
      await pool.query(`UPDATE ace_custom_integrations SET status=$3,last_status_code=$4,last_latency_ms=$5,last_error=NULL,last_tested_at=now(),updated_at=now() WHERE workspace_id=$1 AND id=$2`,
        [workspaceId,row.id,result.ok?'healthy':'degraded',result.statusCode,result.latencyMs])
    }
    await pool.query(`INSERT INTO ace_custom_integration_tests (id,workspace_id,integration_id,target_url,status_code,latency_ms,ok,error,resolved_ips) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,$8::jsonb)`,
      [testId,workspaceId,row?.id||null,target,result.statusCode,result.latencyMs,result.ok,JSON.stringify(result.resolvedIps)])
    return {...result,testId,authValid:result.statusCode!==401&&result.statusCode!==403,schemaValid:result.sampleRecords>=0}
  }catch(error){
    const message=error instanceof Error?error.message:String(error)
    if(row) await pool.query(`UPDATE ace_custom_integrations SET status='error',last_error=$3,last_tested_at=now(),updated_at=now() WHERE workspace_id=$1 AND id=$2`,[workspaceId,row.id,message])
    await pool.query(`INSERT INTO ace_custom_integration_tests (id,workspace_id,integration_id,target_url,ok,error,resolved_ips,latency_ms) VALUES ($1,$2,$3,$4,false,$5,'[]'::jsonb,$6)`,
      [testId,workspaceId,row?.id||null,target,message,Date.now()-started]).catch(()=>{})
    throw error
  }
}

export const closeCustomIntegrations=async()=>{if(pool)await pool.end()}
