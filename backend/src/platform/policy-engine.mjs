import {createHash,randomUUID} from 'node:crypto'
import {withTenantDbTransaction} from './tenant-db.mjs'

export const POLICY_EVALUATOR_VERSION='ace-policy-v1'
const allowedOps=new Set(['eq','neq','gt','gte','lt','lte','in','contains','exists','and','or','not'])
const pathPattern=/^[A-Za-z][A-Za-z0-9_.-]{0,159}$/

const readPath=(input,path)=>{
  if(!pathPattern.test(String(path||'')))return undefined
  return String(path).split('.').reduce((value,key)=>value==null?undefined:value[key],input)
}

const stable=value=>Array.isArray(value)
  ?value.map(stable)
  :(value&&typeof value==='object'
    ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]))
    :value)

export const validatePolicyExpression=(node,{depth=0,nodes={count:0}}={})=>{
  nodes.count+=1
  if(nodes.count>100)throw Object.assign(new Error('policy expression exceeds 100 nodes'),{status:400,code:'policy_node_limit'})
  if(depth>12)throw Object.assign(new Error('policy expression exceeds maximum depth'),{status:400,code:'policy_depth_limit'})
  if(!node||typeof node!=='object'||Array.isArray(node))throw Object.assign(new Error('policy expression node must be an object'),{status:400,code:'invalid_policy_expression'})
  const op=String(node.op||'')
  if(!allowedOps.has(op))throw Object.assign(new Error('unsupported policy operator: '+op),{status:400,code:'unsupported_policy_operator'})
  if(['and','or'].includes(op)){
    if(!Array.isArray(node.args)||node.args.length<1||node.args.length>20)throw Object.assign(new Error(op+' requires 1-20 arguments'),{status:400,code:'invalid_policy_arguments'})
    return {op,args:node.args.map(arg=>validatePolicyExpression(arg,{depth:depth+1,nodes}))}
  }
  if(op==='not')return {op,arg:validatePolicyExpression(node.arg,{depth:depth+1,nodes})}
  const path=String(node.path||'')
  if(!pathPattern.test(path))throw Object.assign(new Error('invalid policy path'),{status:400,code:'invalid_policy_path'})
  if(op==='exists')return {op,path}
  const value=node.value
  if(value!==null&&!['string','number','boolean'].includes(typeof value)&&!Array.isArray(value))throw Object.assign(new Error('policy comparison value must be primitive or array'),{status:400,code:'invalid_policy_value'})
  if(Array.isArray(value)&&value.length>100)throw Object.assign(new Error('policy comparison array exceeds 100 values'),{status:400,code:'policy_value_limit'})
  return {op,path,value}
}

const compare=(op,actual,expected)=>{
  if(op==='exists')return actual!==undefined&&actual!==null
  if(op==='eq')return actual===expected
  if(op==='neq')return actual!==expected
  if(op==='contains')return Array.isArray(actual)?actual.includes(expected):String(actual??'').includes(String(expected??''))
  if(op==='in')return Array.isArray(expected)&&expected.includes(actual)
  const a=Number(actual),b=Number(expected)
  if(!Number.isFinite(a)||!Number.isFinite(b))return false
  if(op==='gt')return a>b
  if(op==='gte')return a>=b
  if(op==='lt')return a<b
  if(op==='lte')return a<=b
  return false
}

export const evaluatePolicyExpression=(node,input)=>{
  if(node.op==='and')return node.args.every(arg=>evaluatePolicyExpression(arg,input))
  if(node.op==='or')return node.args.some(arg=>evaluatePolicyExpression(arg,input))
  if(node.op==='not')return !evaluatePolicyExpression(node.arg,input)
  return compare(node.op,readPath(input,node.path),node.value)
}

export const policyExpressionHash=expression=>createHash('sha256').update(JSON.stringify(stable(expression))).digest('hex')

export const createPolicyRule=async({workspaceId,name,expression,inputSchemaVersion=1,actorId=null})=>{
  const cleanName=String(name||'').trim()
  if(cleanName.length<2||cleanName.length>160)throw Object.assign(new Error('policy rule name must be 2-160 characters'),{status:400,code:'invalid_policy_name'})
  const normalized=validatePolicyExpression(expression)
  const id='policy_'+randomUUID()
  return withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query(
      `INSERT INTO ace_policy_rules(id,workspace_id,name,status,latest_version,created_by)
       VALUES($1,$2,$3,'draft',1,$4) RETURNING *`,
      [id,workspaceId,cleanName,actorId]
    )
    await client.query(
      `INSERT INTO ace_policy_rule_versions(rule_id,workspace_id,version,input_schema_version,expression,expression_hash,evaluator_version,status,created_by)
       VALUES($1,$2,1,$3,$4::jsonb,$5,$6,'draft',$7)`,
      [id,workspaceId,Number(inputSchemaVersion)||1,JSON.stringify(normalized),policyExpressionHash(normalized),POLICY_EVALUATOR_VERSION,actorId]
    )
    return {...rows[0],expression:normalized}
  })
}

export const publishPolicyRule=async({workspaceId,id})=>withTenantDbTransaction(workspaceId,async client=>{
  const rule=(await client.query('SELECT * FROM ace_policy_rules WHERE workspace_id=$1 AND id=$2 FOR UPDATE',[workspaceId,id])).rows[0]
  if(!rule)return null
  const version=Number(rule.latest_version)
  await client.query(
    `UPDATE ace_policy_rule_versions SET status='published',published_at=COALESCE(published_at,now())
     WHERE workspace_id=$1 AND rule_id=$2 AND version=$3`,
    [workspaceId,id,version]
  )
  const {rows}=await client.query(
    `UPDATE ace_policy_rules SET status='published',published_version=$3,updated_at=now()
     WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [workspaceId,id,version]
  )
  return rows[0]
})

export const evaluatePublishedPolicyRule=async({workspaceId,id,input={},reasonCodeTrue='policy_allow',reasonCodeFalse='policy_deny'})=>withTenantDbTransaction(workspaceId,async client=>{
  const rule=(await client.query('SELECT * FROM ace_policy_rules WHERE workspace_id=$1 AND id=$2 AND status=\'published\'',[workspaceId,id])).rows[0]
  if(!rule)return null
  const version=Number(rule.published_version)
  const row=(await client.query(
    `SELECT expression,input_schema_version,evaluator_version FROM ace_policy_rule_versions
     WHERE workspace_id=$1 AND rule_id=$2 AND version=$3 AND status='published'`,
    [workspaceId,id,version]
  )).rows[0]
  if(!row)throw new Error('published policy version missing')
  const expression=validatePolicyExpression(row.expression)
  let decision=false
  let reasonCode=reasonCodeFalse
  try{
    decision=evaluatePolicyExpression(expression,input)
    reasonCode=decision?reasonCodeTrue:reasonCodeFalse
  }catch{
    decision=false
    reasonCode='policy_evaluation_failed'
  }
  await client.query(
    `INSERT INTO ace_policy_rule_decisions(id,workspace_id,rule_id,rule_version,decision,reason_code,evaluator_version,input_schema_version)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    ['decision_'+randomUUID(),workspaceId,id,version,decision,reasonCode,row.evaluator_version,Number(row.input_schema_version)]
  )
  return {ruleId:id,ruleVersion:version,decision,reasonCode,evaluatorVersion:row.evaluator_version,inputSchemaVersion:Number(row.input_schema_version)}
})

export const listPolicyRules=async({workspaceId,limit=100})=>withTenantDbTransaction(workspaceId,async client=>{
  const {rows}=await client.query(
    `SELECT id,name,status,latest_version,published_version,created_by,created_at,updated_at
     FROM ace_policy_rules WHERE workspace_id=$1 ORDER BY updated_at DESC LIMIT $2`,
    [workspaceId,Math.max(1,Math.min(250,Number(limit)||100))]
  )
  return rows
})

export const getPolicyRule=async({workspaceId,id})=>withTenantDbTransaction(workspaceId,async client=>{
  const rule=(await client.query('SELECT * FROM ace_policy_rules WHERE workspace_id=$1 AND id=$2',[workspaceId,id])).rows[0]
  if(!rule)return null
  const versions=(await client.query(
    `SELECT version,input_schema_version,expression,expression_hash,evaluator_version,status,created_by,created_at,published_at
     FROM ace_policy_rule_versions WHERE workspace_id=$1 AND rule_id=$2 ORDER BY version DESC`,
    [workspaceId,id]
  )).rows
  return {...rule,versions}
})
