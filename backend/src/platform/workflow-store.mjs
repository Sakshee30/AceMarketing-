import {createHash,randomUUID} from 'node:crypto'
import {withTenantDbTransaction} from './tenant-db.mjs'
import {validateWorkflowActionConfig,workflowActionCatalog} from './workflow-action-catalog.mjs'

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
    if(type==='action')validateWorkflowActionConfig(node.config||{})
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

export const simulateWorkflowDefinition=definition=>{
  const normalized=validateWorkflowDefinition(definition)
  const actions=normalized.nodes.filter(node=>node.type==='action').map(node=>({
    nodeId:node.id,
    action:validateWorkflowActionConfig(node.config)
  }))
  return {
    valid:true,
    trigger:normalized.trigger,
    nodes:normalized.nodes.length,
    edges:normalized.edges.length,
    approvals:normalized.nodes.filter(node=>node.type==='approval').length,
    waits:normalized.nodes.filter(node=>node.type==='wait').length,
    actions,
    actionCatalogueVersion:1,
    allowedActions:workflowActionCatalog().map(item=>item.id),
    estimatedWorkUnits:normalized.nodes.length+actions.reduce((sum,item)=>sum+(item.action.timeoutMs>=5000?3:1),0),
    definitionHash:workflowDefinitionHash(normalized)
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

export const createWorkflowVersion=async({workspaceId,id,definition,actorId=null})=>{
  const normalized=validateWorkflowDefinition(definition)
  return withTenantDbTransaction(workspaceId,async client=>{
    const workflow=(await client.query('SELECT * FROM ace_workflows WHERE workspace_id=$1 AND id=$2 FOR UPDATE',[workspaceId,id])).rows[0]
    if(!workflow)return null
    const version=Number(workflow.latest_version)+1
    await client.query(
      `INSERT INTO ace_workflow_versions(workflow_id,workspace_id,version,definition,definition_hash,status,created_by)
       VALUES($1,$2,$3,$4::jsonb,$5,'draft',$6)`,
      [id,workspaceId,version,JSON.stringify(normalized),workflowDefinitionHash(normalized),actorId]
    )
    const updated=(await client.query(
      `UPDATE ace_workflows SET latest_version=$3,updated_at=now()
       WHERE workspace_id=$1 AND id=$2 RETURNING *`,
      [workspaceId,id,version]
    )).rows[0]
    return {...updated,version,definition:normalized}
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
  const execution=rows[0]
  for(const node of definition.nodes){
    const action=node.type==='action'?validateWorkflowActionConfig(node.config||{}):null
    await client.query(
      `INSERT INTO ace_workflow_execution_steps
        (id,workspace_id,execution_id,workflow_id,workflow_version,node_id,node_type,action_id,status,attempt,idempotency_key,input_json,started_at,completed_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11::jsonb,$12,$13)
       ON CONFLICT (workspace_id,execution_id,node_id) DO NOTHING`,
      [
        'workflow_step_'+randomUUID(),workspaceId,executionId,id,version,node.id,node.type,action?.actionId||null,
        node.type==='start'?'succeeded':'pending',
        action?'workflow:'+executionId+':'+node.id:null,
        JSON.stringify(action?.input||{}),
        node.type==='start'?new Date().toISOString():null,
        node.type==='start'?new Date().toISOString():null
      ]
    )
  }
  return execution
})

export const listWorkflowExecutionSteps=async({workspaceId,executionId})=>withTenantDbTransaction(workspaceId,async client=>{
  const {rows}=await client.query(
    `SELECT id,execution_id,workflow_id,workflow_version,node_id,node_type,action_id,status,attempt,idempotency_key,
            input_json,output_json,error_code,error_message,lease_owner,lease_expires_at,started_at,completed_at,created_at,updated_at
     FROM ace_workflow_execution_steps
     WHERE workspace_id=$1 AND execution_id=$2
     ORDER BY created_at ASC`,
    [workspaceId,executionId]
  )
  return rows
})

export const cancelWorkflowExecution=async({workspaceId,executionId,actorId=null})=>withTenantDbTransaction(workspaceId,async client=>{
  const execution=(await client.query(
    `SELECT * FROM ace_workflow_executions WHERE workspace_id=$1 AND id=$2 FOR UPDATE`,
    [workspaceId,executionId]
  )).rows[0]
  if(!execution)return null
  if(['completed','cancelled'].includes(execution.status))return execution
  const updated=(await client.query(
    `UPDATE ace_workflow_executions
     SET status='cancelled',updated_at=now(),completed_at=now()
     WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [workspaceId,executionId]
  )).rows[0]
  await client.query(
    `UPDATE ace_workflow_execution_steps
     SET status='cancelled',updated_at=now(),completed_at=now(),lease_owner=NULL,lease_expires_at=NULL
     WHERE workspace_id=$1 AND execution_id=$2 AND status IN ('pending','leased','waiting','failed')`,
    [workspaceId,executionId]
  )
  return updated
})

export const retryWorkflowExecution=async({workspaceId,executionId,actorId=null,maxAttempts=5})=>withTenantDbTransaction(workspaceId,async client=>{
  const execution=(await client.query(
    `SELECT * FROM ace_workflow_executions WHERE workspace_id=$1 AND id=$2 FOR UPDATE`,
    [workspaceId,executionId]
  )).rows[0]
  if(!execution)return null
  if(!['failed','cancelled'].includes(execution.status)){
    throw Object.assign(new Error('only failed or cancelled workflow executions can be retried'),{status:409,code:'workflow_retry_invalid_state'})
  }
  const attempts=Number(execution.attempts||0)
  if(attempts>=Math.max(1,Number(maxAttempts)||5)){
    throw Object.assign(new Error('workflow retry limit reached'),{status:409,code:'workflow_retry_limit'})
  }
  await client.query(
    `UPDATE ace_workflow_execution_steps
     SET status='pending',attempt=attempt+1,error_code=NULL,error_message=NULL,lease_owner=NULL,lease_expires_at=NULL,
         started_at=NULL,completed_at=NULL,updated_at=now()
     WHERE workspace_id=$1 AND execution_id=$2 AND status IN ('failed','cancelled')`,
    [workspaceId,executionId]
  )
  const {rows}=await client.query(
    `UPDATE ace_workflow_executions
     SET status='running',attempts=attempts+1,completed_at=NULL,updated_at=now()
     WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [workspaceId,executionId]
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

export const archiveWorkflow=async({workspaceId,id,actorId=null})=>withTenantDbTransaction(workspaceId,async client=>{
  const workflow=(await client.query(
    `SELECT * FROM ace_workflows WHERE workspace_id=$1 AND id=$2 FOR UPDATE`,
    [workspaceId,id]
  )).rows[0]
  if(!workflow)return null
  const active=(await client.query(
    `SELECT count(*)::int AS count FROM ace_workflow_executions
     WHERE workspace_id=$1 AND workflow_id=$2 AND status IN ('running','waiting','compensating')`,
    [workspaceId,id]
  )).rows[0]
  if(Number(active?.count||0)>0){
    throw Object.assign(new Error('workflow has active executions and cannot be archived'),{status:409,code:'workflow_active_executions'})
  }
  await client.query(
    `UPDATE ace_workflow_versions SET status='retired'
     WHERE workspace_id=$1 AND workflow_id=$2 AND status='published'`,
    [workspaceId,id]
  )
  const {rows}=await client.query(
    `UPDATE ace_workflows SET status='archived',updated_at=now()
     WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [workspaceId,id]
  )
  return {...rows[0],archivedBy:actorId}
})

export const listWorkflows=async({workspaceId,limit=100})=>withTenantDbTransaction(workspaceId,async client=>{
  const {rows}=await client.query(
    `SELECT id,name,status,latest_version,published_version,created_by,created_at,updated_at
     FROM ace_workflows WHERE workspace_id=$1 ORDER BY updated_at DESC LIMIT $2`,
    [workspaceId,Math.max(1,Math.min(250,Number(limit)||100))]
  )
  return rows
})

export const getWorkflow=async({workspaceId,id})=>withTenantDbTransaction(workspaceId,async client=>{
  const workflow=(await client.query('SELECT * FROM ace_workflows WHERE workspace_id=$1 AND id=$2',[workspaceId,id])).rows[0]
  if(!workflow)return null
  const versions=(await client.query(
    `SELECT version,definition,definition_hash,status,created_by,created_at,published_at
     FROM ace_workflow_versions WHERE workspace_id=$1 AND workflow_id=$2 ORDER BY version DESC`,
    [workspaceId,id]
  )).rows
  return {...workflow,versions}
})

export const listWorkflowExecutions=async({workspaceId,workflowId=null,limit=100})=>withTenantDbTransaction(workspaceId,async client=>{
  const params=[workspaceId,Math.max(1,Math.min(250,Number(limit)||100))]
  const clause=workflowId?' AND workflow_id=$3':''
  if(workflowId)params.push(workflowId)
  const {rows}=await client.query(
    `SELECT id,workflow_id,workflow_version,status,current_node_id,trigger_type,trigger_ref,correlation_id,causation_id,started_by,attempts,deadline_at,created_at,updated_at,completed_at
     FROM ace_workflow_executions WHERE workspace_id=$1${clause} ORDER BY updated_at DESC LIMIT $2`,
    params
  )
  return rows
})

export const listWorkflowApprovals=async({workspaceId,status=null,limit=100})=>withTenantDbTransaction(workspaceId,async client=>{
  const params=[workspaceId,Math.max(1,Math.min(250,Number(limit)||100))]
  const clause=status?' AND status=$3':''
  if(status)params.push(status)
  const {rows}=await client.query(
    `SELECT id,execution_id,node_id,requested_by,approver_scope,status,decided_by,decision_comment,policy_version,requested_at,decided_at
     FROM ace_workflow_approvals WHERE workspace_id=$1${clause} ORDER BY requested_at DESC LIMIT $2`,
    params
  )
  return rows
})
