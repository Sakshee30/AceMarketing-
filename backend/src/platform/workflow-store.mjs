import {createHash,randomUUID} from 'node:crypto'
import {withTenantDbTransaction} from './tenant-db.mjs'

const nodeTypes=new Set(['start','condition','action','approval','wait','end'])
const triggerTypes=new Set(['event','schedule','api','manual'])

const stable=value=>Array.isArray(value)
  ?value.map(stable)
  :(value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value)

export const workflowDefinitionHash=definition=>createHash('sha256').update(JSON.stringify(stable(definition))).digest('hex')

export const validateWorkflowDefinition=definition=>{
  if(!definition||typeof definition!=='object'||Array.isArray(definition))throw Object.assign(new Error('workflow definition must be an object'),{status:400,code:'invalid_workflow'})
  const nodes=Array.isArray(definition.nodes)?definition.nodes:[]
  const edges=Array.isArray(definition.edges)?definition.edges:[]
  if(nodes.length<2||nodes.length>200)throw Object.assign(new Error('workflow must contain 2-200 nodes'),{status:400,code:'workflow_node_limit'})
  if(edges.length<1||edges.length>400)throw Object.assign(new Error('workflow must contain 1-400 edges'),{status:400,code:'workflow_edge_limit'})
  const ids=new Set()
  for(const node of nodes){
    const id=String(node?.id||'')
    const type=String(node?.type||'')
    if(!/^[A-Za-z0-9_-]{1,80}$/.test(id)||ids.has(id))throw Object.assign(new Error('workflow node ids must be unique and bounded'),{status:400,code:'invalid_workflow_node_id'})
    if(!nodeTypes.has(type))throw Object.assign(new Error('unsupported workflow node type: '+type),{status:400,code:'unsupported_workflow_node_type'})
    ids.add(id)
  }
  const starts=nodes.filter(node=>node.type==='start')
  const ends=nodes.filter(node=>node.type==='end')
  if(starts.length!==1||ends.length<1)throw Object.assign(new Error('workflow requires exactly one start and at least one end'),{status:400,code:'invalid_workflow_terminals'})
  const outgoing=new Map(nodes.map(node=>[node.id,[]]))
  for(const edge of edges){
    const from=String(edge?.from||''),to=String(edge?.to||'')
    if(!ids.has(from)||!ids.has(to))throw Object.assign(new Error('workflow edge references unknown node'),{status:400,code:'invalid_workflow_edge'})
    outgoing.get(from).push(to)
  }
  const seen=new Set()
  const visiting=new Set()
  const visit=id=>{
    if(visiting.has(id))throw Object.assign(new Error('workflow cycles are not allowed in v1 execution model'),{status:400,code:'workflow_cycle'})
    if(seen.has(id))return
    visiting.add(id)
    for(const next of outgoing.get(id)||[])visit(next)
    visiting.delete(id)
    seen.add(id)
  }
  visit(starts[0].id)
  if(seen.size!==nodes.length)throw Object.assign(new Error('workflow contains unreachable nodes'),{status:400,code:'workflow_unreachable_node'})
  for(const node of nodes.filter(node=>node.type!=='end')){
    if((outgoing.get(node.id)||[]).length===0)throw Object.assign(new Error('workflow node has no terminal path: '+node.id),{status:400,code:'workflow_missing_path'})
  }
  return {
    trigger:triggerTypes.has(String(definition.trigger))?String(definition.trigger):'manual',
    nodes:nodes.map(node=>({id:String(node.id),type:String(node.type),config:node.config&&typeof node.config==='object'?node.config:{}})),
    edges:edges.map(edge=>({id:String(edge.id||('edge_'+edge.from+'_'+edge.to)),from:String(edge.from),to:String(edge.to),label:edge.label?String(edge.label).slice(0,120):undefined})),
    layout:definition.layout&&typeof definition.layout==='object'?definition.layout:{}
  }
}

export const createWorkflow=async({workspaceId,name,definition,actorId=null})=>{
  const cleanName=String(name||'').trim()
  if(cleanName.length<2||cleanName.length>160)throw Object.assign(new Error('workflow name must be 2-160 characters'),{status:400,code:'invalid_workflow_name'})
  const normalized=validateWorkflowDefinition(definition)
  const id='workflow_'+randomUUID()
  return withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query(
      `INSERT INTO ace_workflows(id,workspace_id,name,status,latest_version,created_by)
       VALUES($1,$2,$3,'draft',1,$4) RETURNING *`,
      [id,workspaceId,cleanName,actorId]
    )
    await client.query(
      `INSERT INTO ace_workflow_versions(workflow_id,workspace_id,version,definition,definition_hash,status,created_by)
       VALUES($1,$2,1,$3::jsonb,$4,'draft',$5)`,
      [id,workspaceId,JSON.stringify(normalized),workflowDefinitionHash(normalized),actorId]
    )
    return {...rows[0],definition:normalized}
  })
}

export const publishWorkflow=async({workspaceId,id})=>withTenantDbTransaction(workspaceId,async client=>{
  const workflow=(await client.query('SELECT * FROM ace_workflows WHERE workspace_id=$1 AND id=$2 FOR UPDATE',[workspaceId,id])).rows[0]
  if(!workflow)return null
  const version=Number(workflow.latest_version)
  const {rows}=await client.query(
    `UPDATE ace_workflow_versions SET status='published',published_at=COALESCE(published_at,now())
     WHERE workspace_id=$1 AND workflow_id=$2 AND version=$3 RETURNING *`,
    [workspaceId,id,version]
  )
  if(!rows[0])throw new Error('latest workflow version missing')
  const updated=(await client.query(
    `UPDATE ace_workflows SET status='published',published_version=$3,updated_at=now()
     WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [workspaceId,id,version]
  )).rows[0]
  return updated
})

export const startWorkflowExecution=async({workspaceId,id,actorId=null,triggerType='manual',triggerRef=null,correlationId=null,causationId=null,deadlineAt=null})=>withTenantDbTransaction(workspaceId,async client=>{
  const workflow=(await client.query('SELECT * FROM ace_workflows WHERE workspace_id=$1 AND id=$2 AND status=\'published\'',[workspaceId,id])).rows[0]
  if(!workflow)return null
  const version=Number(workflow.published_version)
  const versionRow=(await client.query(
    `SELECT definition FROM ace_workflow_versions WHERE workspace_id=$1 AND workflow_id=$2 AND version=$3 AND status='published'`,
    [workspaceId,id,version]
  )).rows[0]
  if(!versionRow)throw new Error('published workflow version missing')
  const definition=validateWorkflowDefinition(versionRow.definition)
  const startNode=definition.nodes.find(node=>node.type==='start')
  const executionId='workflow_exec_'+randomUUID()
  const {rows}=await client.query(
    `INSERT INTO ace_workflow_executions
      (id,workspace_id,workflow_id,workflow_version,status,current_node_id,trigger_type,trigger_ref,correlation_id,causation_id,started_by,state,deadline_at)
     VALUES($1,$2,$3,$4,'running',$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
     RETURNING *`,
    [executionId,workspaceId,id,version,startNode.id,triggerTypes.has(triggerType)?triggerType:'manual',triggerRef,correlationId,causationId,actorId,JSON.stringify({definitionHash:workflowDefinitionHash(definition)}),deadlineAt]
  )
  return rows[0]
})

export const createWorkflowApproval=async({workspaceId,executionId,nodeId,requestedBy=null,approverScope=null,policyVersion=null})=>withTenantDbTransaction(workspaceId,async client=>{
  const execution=(await client.query(
    `SELECT * FROM ace_workflow_executions WHERE workspace_id=$1 AND id=$2 FOR UPDATE`,
    [workspaceId,executionId]
  )).rows[0]
  if(!execution)return null
  const id='workflow_approval_'+randomUUID()
  const {rows}=await client.query(
    `INSERT INTO ace_workflow_approvals(id,workspace_id,execution_id,node_id,requested_by,approver_scope,policy_version)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [id,workspaceId,executionId,nodeId,requestedBy,approverScope,policyVersion]
  )
  await client.query(
    `UPDATE ace_workflow_executions SET status='waiting',current_node_id=$3,updated_at=now()
     WHERE workspace_id=$1 AND id=$2`,
    [workspaceId,executionId,nodeId]
  )
  return rows[0]
})

export const decideWorkflowApproval=async({workspaceId,approvalId,actorId,decision,comment=''})=>withTenantDbTransaction(workspaceId,async client=>{
  const approval=(await client.query(
    `SELECT * FROM ace_workflow_approvals WHERE workspace_id=$1 AND id=$2 FOR UPDATE`,
    [workspaceId,approvalId]
  )).rows[0]
  if(!approval)return null
  if(approval.status!=='pending')return approval
  if(String(approval.requested_by||'')&&String(approval.requested_by)===String(actorId||'')){
    const error=new Error('requester cannot approve their own workflow action')
    error.status=403
    error.code='workflow_separation_of_duties'
    throw error
  }
  const normalized=decision==='approved'?'approved':'rejected'
  const updated=(await client.query(
    `UPDATE ace_workflow_approvals
     SET status=$3,decided_by=$4,decision_comment=$5,decided_at=now()
     WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [workspaceId,approvalId,normalized,actorId,String(comment||'').slice(0,2000)]
  )).rows[0]
  await client.query(
    `UPDATE ace_workflow_executions
     SET status=$3,updated_at=now(),completed_at=CASE WHEN $3='failed' THEN now() ELSE completed_at END
     WHERE workspace_id=$1 AND id=$2`,
    [workspaceId,approval.execution_id,normalized==='approved'?'running':'failed']
  )
  return updated
})
