import {createHash,randomUUID} from 'node:crypto'
import {withTenantDbTransaction} from './tenant-db.mjs'

const supportedTypes=new Set(['string','number','integer','boolean','date','datetime','email','enum'])
const keyPattern=/^[A-Za-z][A-Za-z0-9_]{0,63}$/
const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/

const stable=value=>{
  if(Array.isArray(value))return value.map(stable)
  if(value&&typeof value==='object'){
    return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]))
  }
  return value
}

export const schemaHash=schema=>createHash('sha256').update(JSON.stringify(stable(schema))).digest('hex')

export const validateFormSchema=schema=>{
  if(!schema||typeof schema!=='object'||Array.isArray(schema))throw Object.assign(new Error('form schema must be an object'),{status:400,code:'invalid_form_schema'})
  const fields=Array.isArray(schema.fields)?schema.fields:null
  if(!fields)throw Object.assign(new Error('form schema fields must be an array'),{status:400,code:'invalid_form_schema'})
  if(fields.length<1||fields.length>100)throw Object.assign(new Error('form schema must contain 1-100 fields'),{status:400,code:'form_field_limit'})
  const seen=new Set()
  const normalized=fields.map((field,index)=>{
    if(!field||typeof field!=='object'||Array.isArray(field))throw Object.assign(new Error('field '+index+' must be an object'),{status:400,code:'invalid_form_field'})
    const key=String(field.key||'').trim()
    const type=String(field.type||'').trim().toLowerCase()
    const label=String(field.label||key).trim()
    if(!keyPattern.test(key))throw Object.assign(new Error('invalid field key: '+key),{status:400,code:'invalid_form_field_key'})
    if(seen.has(key))throw Object.assign(new Error('duplicate field key: '+key),{status:400,code:'duplicate_form_field'})
    seen.add(key)
    if(!supportedTypes.has(type))throw Object.assign(new Error('unsupported field type: '+type),{status:400,code:'unsupported_form_field_type'})
    if(label.length<1||label.length>120)throw Object.assign(new Error('field label must be 1-120 characters'),{status:400,code:'invalid_form_field_label'})
    const item={key,type,label,required:Boolean(field.required)}
    if(field.minLength!==undefined)item.minLength=Math.max(0,Math.min(10_000,Number(field.minLength)||0))
    if(field.maxLength!==undefined)item.maxLength=Math.max(1,Math.min(100_000,Number(field.maxLength)||1))
    if(item.minLength!==undefined&&item.maxLength!==undefined&&item.minLength>item.maxLength)throw Object.assign(new Error('minLength cannot exceed maxLength for '+key),{status:400,code:'invalid_form_length_bounds'})
    if(type==='enum'){
      if(!Array.isArray(field.options)||field.options.length<1||field.options.length>100)throw Object.assign(new Error('enum field '+key+' must provide 1-100 options'),{status:400,code:'invalid_form_enum'})
      item.options=[...new Set(field.options.map(value=>String(value).slice(0,200)))]
    }
    return item
  })
  return {version:1,fields:normalized}
}

export const validateSubmission=(schema,data)=>{
  if(!data||typeof data!=='object'||Array.isArray(data))throw Object.assign(new Error('submission data must be an object'),{status:400,code:'invalid_submission'})
  const allowed=new Set(schema.fields.map(field=>field.key))
  for(const key of Object.keys(data))if(!allowed.has(key))throw Object.assign(new Error('unknown submission field: '+key),{status:400,code:'unknown_submission_field'})
  const output={}
  for(const field of schema.fields){
    const value=data[field.key]
    const missing=value===undefined||value===null||value===''
    if(missing){
      if(field.required)throw Object.assign(new Error('required field missing: '+field.key),{status:400,code:'required_form_field'})
      continue
    }
    if(field.type==='string'||field.type==='email'||field.type==='date'||field.type==='datetime'||field.type==='enum'){
      const text=String(value)
      if(field.minLength!==undefined&&text.length<field.minLength)throw Object.assign(new Error(field.key+' is shorter than allowed'),{status:400,code:'submission_too_short'})
      if(field.maxLength!==undefined&&text.length>field.maxLength)throw Object.assign(new Error(field.key+' is longer than allowed'),{status:400,code:'submission_too_long'})
      if(field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))throw Object.assign(new Error('invalid email for '+field.key),{status:400,code:'invalid_email'})
      if(field.type==='enum'&&!field.options.includes(text))throw Object.assign(new Error('invalid option for '+field.key),{status:400,code:'invalid_enum_option'})
      output[field.key]=text
    }else if(field.type==='number'||field.type==='integer'){
      const number=Number(value)
      if(!Number.isFinite(number)||(field.type==='integer'&&!Number.isInteger(number)))throw Object.assign(new Error('invalid number for '+field.key),{status:400,code:'invalid_number'})
      output[field.key]=number
    }else if(field.type==='boolean'){
      if(typeof value!=='boolean')throw Object.assign(new Error('invalid boolean for '+field.key),{status:400,code:'invalid_boolean'})
      output[field.key]=value
    }
  }
  const bytes=Buffer.byteLength(JSON.stringify(output))
  if(bytes>256*1024)throw Object.assign(new Error('submission exceeds 256 KiB'),{status:413,code:'submission_too_large'})
  return output
}

export const createForm=async({workspaceId,name,slug,description='',schema,actorId=null})=>{
  const cleanName=String(name||'').trim()
  const cleanSlug=String(slug||'').trim().toLowerCase()
  if(cleanName.length<2||cleanName.length>120)throw Object.assign(new Error('form name must be 2-120 characters'),{status:400,code:'invalid_form_name'})
  if(!slugPattern.test(cleanSlug)||cleanSlug.length>80)throw Object.assign(new Error('invalid form slug'),{status:400,code:'invalid_form_slug'})
  const normalizedSchema=validateFormSchema(schema)
  const id='form_'+randomUUID()
  return withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query(
      `INSERT INTO ace_forms (id,workspace_id,slug,name,description,status,latest_version,created_by)
       VALUES ($1,$2,$3,$4,$5,'draft',1,$6)
       RETURNING *`,
      [id,workspaceId,cleanSlug,cleanName,String(description||'').slice(0,2000),actorId]
    )
    await client.query(
      `INSERT INTO ace_form_versions (form_id,workspace_id,version,schema_json,schema_hash,status,created_by)
       VALUES ($1,$2,1,$3::jsonb,$4,'draft',$5)`,
      [id,workspaceId,JSON.stringify(normalizedSchema),schemaHash(normalizedSchema),actorId]
    )
    return {...rows[0],schema:normalizedSchema}
  })
}

export const listForms=async({workspaceId,limit=100})=>withTenantDbTransaction(workspaceId,async client=>{
  const {rows}=await client.query(
    `SELECT id,slug,name,description,status,latest_version,published_version,created_by,created_at,updated_at
     FROM ace_forms WHERE workspace_id=$1 ORDER BY updated_at DESC LIMIT $2`,
    [workspaceId,Math.max(1,Math.min(250,Number(limit)||100))]
  )
  return rows
})

export const getForm=async({workspaceId,id})=>withTenantDbTransaction(workspaceId,async client=>{
  const form=(await client.query(`SELECT * FROM ace_forms WHERE workspace_id=$1 AND id=$2`,[workspaceId,id])).rows[0]
  if(!form)return null
  const versions=(await client.query(
    `SELECT version,schema_json,schema_hash,status,created_by,created_at,published_at
     FROM ace_form_versions WHERE workspace_id=$1 AND form_id=$2 ORDER BY version DESC`,
    [workspaceId,id]
  )).rows
  return {...form,versions}
})

export const publishForm=async({workspaceId,id,actorId=null})=>withTenantDbTransaction(workspaceId,async client=>{
  const form=(await client.query(`SELECT * FROM ace_forms WHERE workspace_id=$1 AND id=$2 FOR UPDATE`,[workspaceId,id])).rows[0]
  if(!form)return null
  const version=Number(form.latest_version)
  const current=(await client.query(
    `SELECT * FROM ace_form_versions WHERE workspace_id=$1 AND form_id=$2 AND version=$3`,
    [workspaceId,id,version]
  )).rows[0]
  if(!current)throw new Error('latest form version missing')
  await client.query(
    `UPDATE ace_form_versions SET status='published',published_at=COALESCE(published_at,now())
     WHERE workspace_id=$1 AND form_id=$2 AND version=$3`,
    [workspaceId,id,version]
  )
  const {rows}=await client.query(
    `UPDATE ace_forms SET status='published',published_version=$3,updated_at=now()
     WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [workspaceId,id,version]
  )
  return {...rows[0],publishedBy:actorId}
})

export const submitForm=async({workspaceId,id,data,actorId=null,submissionId=null})=>withTenantDbTransaction(workspaceId,async client=>{
  const form=(await client.query(
    `SELECT * FROM ace_forms WHERE workspace_id=$1 AND id=$2 AND status='published'`,
    [workspaceId,id]
  )).rows[0]
  if(!form)return null
  const version=Number(form.published_version)
  const versionRow=(await client.query(
    `SELECT schema_json FROM ace_form_versions WHERE workspace_id=$1 AND form_id=$2 AND version=$3 AND status='published'`,
    [workspaceId,id,version]
  )).rows[0]
  if(!versionRow)throw new Error('published form version missing')
  const normalized=validateSubmission(versionRow.schema_json,data)
  const submissionKey=String(submissionId||('submission_'+randomUUID()))
  const {rows}=await client.query(
    `INSERT INTO ace_form_submissions (id,workspace_id,form_id,form_version,submitted_by,data_json)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb)
     ON CONFLICT (workspace_id,form_id,id) DO UPDATE SET id=ace_form_submissions.id
     RETURNING *`,
    [submissionKey,workspaceId,id,version,actorId,JSON.stringify(normalized)]
  )
  return rows[0]
})

export const listFormSubmissions=async({workspaceId,id,limit=100})=>withTenantDbTransaction(workspaceId,async client=>{
  const {rows}=await client.query(
    `SELECT id,form_id,form_version,submitted_by,data_json,created_at
     FROM ace_form_submissions WHERE workspace_id=$1 AND form_id=$2
     ORDER BY created_at DESC LIMIT $3`,
    [workspaceId,id,Math.max(1,Math.min(250,Number(limit)||100))]
  )
  return rows
})
