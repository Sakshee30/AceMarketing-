import {createHash,randomUUID} from 'node:crypto'
import {withTenantDbTransaction} from './tenant-db.mjs'

const fieldTypes=new Set(['string','number','integer','boolean','date','datetime','email','enum','reference'])
const keyPattern=/^[A-Za-z][A-Za-z0-9_]{0,63}$/
const objectKeyPattern=/^[a-z][a-z0-9_]{1,63}$/

const stable=value=>{
  if(Array.isArray(value))return value.map(stable)
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]))
  return value
}
export const customObjectSchemaHash=schema=>createHash('sha256').update(JSON.stringify(stable(schema))).digest('hex')

export const validateCustomObjectSchema=schema=>{
  if(!schema||typeof schema!=='object'||Array.isArray(schema))throw Object.assign(new Error('custom object schema must be an object'),{status:400,code:'invalid_custom_object_schema'})
  const fields=Array.isArray(schema.fields)?schema.fields:null
  if(!fields||fields.length<1||fields.length>200)throw Object.assign(new Error('custom object schema must contain 1-200 fields'),{status:400,code:'custom_object_field_limit'})
  const seen=new Set()
  const normalized=fields.map((field,index)=>{
    if(!field||typeof field!=='object'||Array.isArray(field))throw Object.assign(new Error('field '+index+' must be an object'),{status:400,code:'invalid_custom_object_field'})
    const key=String(field.key||'').trim()
    const type=String(field.type||'').trim().toLowerCase()
    const label=String(field.label||key).trim()
    if(!keyPattern.test(key))throw Object.assign(new Error('invalid custom object field key: '+key),{status:400,code:'invalid_custom_object_field_key'})
    if(seen.has(key))throw Object.assign(new Error('duplicate custom object field key: '+key),{status:400,code:'duplicate_custom_object_field'})
    if(!fieldTypes.has(type))throw Object.assign(new Error('unsupported custom object field type: '+type),{status:400,code:'unsupported_custom_object_field_type'})
    if(label.length<1||label.length>120)throw Object.assign(new Error('custom object field label must be 1-120 characters'),{status:400,code:'invalid_custom_object_field_label'})
    seen.add(key)
    const item={key,type,label,required:Boolean(field.required)}
    if(field.maxLength!==undefined)item.maxLength=Math.max(1,Math.min(100_000,Number(field.maxLength)||1))
    if(type==='enum'){
      if(!Array.isArray(field.options)||field.options.length<1||field.options.length>100)throw Object.assign(new Error('enum field '+key+' must provide 1-100 options'),{status:400,code:'invalid_custom_object_enum'})
      item.options=[...new Set(field.options.map(value=>String(value).slice(0,200)))]
    }
    if(type==='reference'){
      const targetObjectKey=String(field.targetObjectKey||'').trim().toLowerCase()
      if(!objectKeyPattern.test(targetObjectKey))throw Object.assign(new Error('reference field '+key+' requires a valid targetObjectKey'),{status:400,code:'invalid_custom_object_reference'})
      item.targetObjectKey=targetObjectKey
    }
    return item
  })
  return {version:1,fields:normalized}
}

export const validateCustomObjectRecord=(schema,data)=>{
  if(!data||typeof data!=='object'||Array.isArray(data))throw Object.assign(new Error('custom object record must be an object'),{status:400,code:'invalid_custom_object_record'})
  const allowed=new Set(schema.fields.map(field=>field.key))
  for(const key of Object.keys(data))if(!allowed.has(key))throw Object.assign(new Error('unknown custom object field: '+key),{status:400,code:'unknown_custom_object_field'})
  const output={}
  for(const field of schema.fields){
    const value=data[field.key]
    const missing=value===undefined||value===null||value===''
    if(missing){
      if(field.required)throw Object.assign(new Error('required custom object field missing: '+field.key),{status:400,code:'required_custom_object_field'})
      continue
    }
    if(['string','email','date','datetime','enum','reference'].includes(field.type)){
      const text=String(value)
      if(field.maxLength!==undefined&&text.length>field.maxLength)throw Object.assign(new Error(field.key+' is longer than allowed'),{status:400,code:'custom_object_value_too_long'})
      if(field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))throw Object.assign(new Error('invalid email for '+field.key),{status:400,code:'invalid_custom_object_email'})
      if(field.type==='enum'&&!field.options.includes(text))throw Object.assign(new Error('invalid option for '+field.key),{status:400,code:'invalid_custom_object_enum_option'})
      if(field.type==='reference'&&text.length>200)throw Object.assign(new Error('reference value too long for '+field.key),{status:400,code:'invalid_custom_object_reference_value'})
      output[field.key]=text
    }else if(field.type==='number'||field.type==='integer'){
      const number=Number(value)
      if(!Number.isFinite(number)||(field.type==='integer'&&!Number.isInteger(number)))throw Object.assign(new Error('invalid number for '+field.key),{status:400,code:'invalid_custom_object_number'})
      output[field.key]=number
    }else if(field.type==='boolean'){
      if(typeof value!=='boolean')throw Object.assign(new Error('invalid boolean for '+field.key),{status:400,code:'invalid_custom_object_boolean'})
      output[field.key]=value
    }
  }
  if(Buffer.byteLength(JSON.stringify(output))>512*1024)throw Object.assign(new Error('custom object record exceeds 512 KiB'),{status:413,code:'custom_object_record_too_large'})
  return output
}

export const createCustomObject=async({workspaceId,objectKey,name,description='',schema,actorId=null})=>{
  const cleanKey=String(objectKey||'').trim().toLowerCase()
  const cleanName=String(name||'').trim()
  if(!objectKeyPattern.test(cleanKey))throw Object.assign(new Error('invalid custom object key'),{status:400,code:'invalid_custom_object_key'})
  if(cleanName.length<2||cleanName.length>120)throw Object.assign(new Error('custom object name must be 2-120 characters'),{status:400,code:'invalid_custom_object_name'})
  const normalized=validateCustomObjectSchema(schema)
  const id='object_'+randomUUID()
  return withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query(
      `INSERT INTO ace_custom_objects (id,workspace_id,object_key,name,description,status,latest_version,created_by)
       VALUES ($1,$2,$3,$4,$5,'draft',1,$6) RETURNING *`,
      [id,workspaceId,cleanKey,cleanName,String(description||'').slice(0,2000),actorId]
    )
    await client.query(
      `INSERT INTO ace_custom_object_versions (object_id,workspace_id,version,schema_json,schema_hash,status,created_by)
       VALUES ($1,$2,1,$3::jsonb,$4,'draft',$5)`,
      [id,workspaceId,JSON.stringify(normalized),customObjectSchemaHash(normalized),actorId]
    )
    return {...rows[0],schema:normalized}
  })
}

export const createCustomObjectVersion=async({workspaceId,id,schema,actorId=null})=>{
  const normalized=validateCustomObjectSchema(schema)
  return withTenantDbTransaction(workspaceId,async client=>{
    const object=(await client.query(`SELECT * FROM ace_custom_objects WHERE workspace_id=$1 AND id=$2 FOR UPDATE`,[workspaceId,id])).rows[0]
    if(!object)return null
    const version=Number(object.latest_version)+1
    await client.query(
      `INSERT INTO ace_custom_object_versions (object_id,workspace_id,version,schema_json,schema_hash,status,created_by)
       VALUES ($1,$2,$3,$4::jsonb,$5,'draft',$6)`,
      [id,workspaceId,version,JSON.stringify(normalized),customObjectSchemaHash(normalized),actorId]
    )
    const updated=(await client.query(
      `UPDATE ace_custom_objects SET latest_version=$3,status=CASE WHEN published_version IS NULL THEN 'draft' ELSE status END,updated_at=now()
       WHERE workspace_id=$1 AND id=$2 RETURNING *`,
      [workspaceId,id,version]
    )).rows[0]
    return {...updated,version,schema:normalized}
  })
}

export const publishCustomObject=async({workspaceId,id,actorId=null})=>withTenantDbTransaction(workspaceId,async client=>{
  const object=(await client.query(`SELECT * FROM ace_custom_objects WHERE workspace_id=$1 AND id=$2 FOR UPDATE`,[workspaceId,id])).rows[0]
  if(!object)return null
  const version=Number(object.latest_version)
  const current=(await client.query(
    `SELECT * FROM ace_custom_object_versions WHERE workspace_id=$1 AND object_id=$2 AND version=$3`,
    [workspaceId,id,version]
  )).rows[0]
  if(!current)throw new Error('latest custom object version missing')
  await client.query(
    `UPDATE ace_custom_object_versions SET status='published',published_at=COALESCE(published_at,now())
     WHERE workspace_id=$1 AND object_id=$2 AND version=$3`,
    [workspaceId,id,version]
  )
  const {rows}=await client.query(
    `UPDATE ace_custom_objects SET status='published',published_version=$3,updated_at=now()
     WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [workspaceId,id,version]
  )
  return {...rows[0],publishedBy:actorId}
})

export const listCustomObjects=async({workspaceId,limit=100})=>withTenantDbTransaction(workspaceId,async client=>{
  const {rows}=await client.query(
    `SELECT id,object_key,name,description,status,latest_version,published_version,created_by,created_at,updated_at
     FROM ace_custom_objects WHERE workspace_id=$1 ORDER BY updated_at DESC LIMIT $2`,
    [workspaceId,Math.max(1,Math.min(250,Number(limit)||100))]
  )
  return rows
})

export const getCustomObject=async({workspaceId,id})=>withTenantDbTransaction(workspaceId,async client=>{
  const object=(await client.query(`SELECT * FROM ace_custom_objects WHERE workspace_id=$1 AND id=$2`,[workspaceId,id])).rows[0]
  if(!object)return null
  const versions=(await client.query(
    `SELECT version,schema_json,schema_hash,status,created_by,created_at,published_at
     FROM ace_custom_object_versions WHERE workspace_id=$1 AND object_id=$2 ORDER BY version DESC`,
    [workspaceId,id]
  )).rows
  return {...object,versions}
})

export const createCustomObjectRecord=async({workspaceId,id,data,actorId=null,recordId=null})=>withTenantDbTransaction(workspaceId,async client=>{
  const object=(await client.query(
    `SELECT * FROM ace_custom_objects WHERE workspace_id=$1 AND id=$2 AND status='published'`,
    [workspaceId,id]
  )).rows[0]
  if(!object)return null
  const version=Number(object.published_version)
  const versionRow=(await client.query(
    `SELECT schema_json FROM ace_custom_object_versions WHERE workspace_id=$1 AND object_id=$2 AND version=$3 AND status='published'`,
    [workspaceId,id,version]
  )).rows[0]
  if(!versionRow)throw new Error('published custom object version missing')
  const normalized=validateCustomObjectRecord(versionRow.schema_json,data)
  const key=String(recordId||('record_'+randomUUID()))
  const {rows}=await client.query(
    `INSERT INTO ace_custom_object_records (id,workspace_id,object_id,object_version,data_json,created_by)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6)
     ON CONFLICT (workspace_id,object_id,id) DO UPDATE SET id=ace_custom_object_records.id
     RETURNING *`,
    [key,workspaceId,id,version,JSON.stringify(normalized),actorId]
  )
  return rows[0]
})

export const listCustomObjectRecords=async({workspaceId,id,limit=100})=>withTenantDbTransaction(workspaceId,async client=>{
  const {rows}=await client.query(
    `SELECT id,object_id,object_version,data_json,created_by,created_at,updated_at
     FROM ace_custom_object_records WHERE workspace_id=$1 AND object_id=$2
     ORDER BY created_at DESC LIMIT $3`,
    [workspaceId,id,Math.max(1,Math.min(250,Number(limit)||100))]
  )
  return rows
})
