import {
  archiveWorkflow,
  cancelWorkflowExecution,
  createWorkflow,
  createWorkflowApproval,
  createWorkflowVersion,
  getWorkflow,
  listWorkflowApprovals,
  listWorkflowExecutionSteps,
  listWorkflowExecutions,
  listWorkflows,
  simulateWorkflowDefinition,
  startWorkflowExecution
} from '../../platform/workflow-store.mjs'
import {workflowActionCatalog} from '../../platform/workflow-action-catalog.mjs'
import {handleDecideApproval} from '../../../modules/approvals/src/application/commands/decide-approval/decide-approval.handler.mjs'
import {handlePublishWorkflow} from '../../../modules/workflows/src/application/commands/publish-workflow/publish-workflow.handler.mjs'
import {handleRetryWorkflowExecution} from '../../../modules/workflows/src/application/commands/retry-step/retry-step.handler.mjs'
import {appendAuditRecord} from '../../platform/audit-store.mjs'

const errorPayload=(error,fallback,code)=>({
  error:error instanceof Error?error.message:fallback,
  code:error?.code||code
})

/** Handles workflow catalog, authoring, execution and approval routes. */
export const handleWorkflowRoutes=async({req,res,url,workspaceId,readBody,send:writeResponse})=>{
  const send=(...args)=>{writeResponse(...args);return true}
  if(req.method==='GET'&&url.pathname==='/api/workflows/actions')return send(req,res,200,{version:1,items:workflowActionCatalog()})
  if(req.method==='POST'&&url.pathname==='/api/workflows/simulate'){
    const body=await readBody(req)
    try{return send(req,res,200,simulateWorkflowDefinition(body.definition))}
    catch(error){return send(req,res,Number(error?.status||400),errorPayload(error,'workflow simulation failed','workflow_simulation_failed'))}
  }
  if(req.method==='GET'&&url.pathname==='/api/workflows')return send(req,res,200,{items:await listWorkflows({workspaceId,limit:Number(url.searchParams.get('limit')||100)})})
  if(req.method==='POST'&&url.pathname==='/api/workflows'){
    const body=await readBody(req)
    try{
      const workflow=await createWorkflow({workspaceId,name:body.name,definition:body.definition,actorId:req.user?.userId||null})
      await appendAuditRecord({workspaceId,actorId:req.user?.userId,action:'workflow.created',entityType:'workflow',entityId:workflow.id,requestId:req.requestId,traceId:req.context?.traceId}).catch(()=>{})
      return send(req,res,201,workflow)
    }catch(error){return send(req,res,Number(error?.status||400),errorPayload(error,'workflow creation failed','workflow_create_failed'))}
  }
  if(req.method==='GET'&&url.pathname==='/api/workflows/executions')return send(req,res,200,{items:await listWorkflowExecutions({workspaceId,workflowId:url.searchParams.get('workflowId')||null,limit:Number(url.searchParams.get('limit')||100)})})
  if(req.method==='GET'&&url.pathname==='/api/workflows/approvals')return send(req,res,200,{items:await listWorkflowApprovals({workspaceId,status:url.searchParams.get('status')||null,limit:Number(url.searchParams.get('limit')||100)})})

  const workflowExecutionStepsMatch=url.pathname.match(/^\/api\/workflows\/executions\/([^/]+)\/steps$/)
  if(req.method==='GET'&&workflowExecutionStepsMatch)return send(req,res,200,{items:await listWorkflowExecutionSteps({workspaceId,executionId:decodeURIComponent(workflowExecutionStepsMatch[1])})})

  const workflowExecutionCancelMatch=url.pathname.match(/^\/api\/workflows\/executions\/([^/]+)\/cancel$/)
  if(req.method==='POST'&&workflowExecutionCancelMatch){
    const execution=await cancelWorkflowExecution({workspaceId,executionId:decodeURIComponent(workflowExecutionCancelMatch[1]),actorId:req.user?.userId||null})
    if(!execution)return send(req,res,404,{error:'workflow execution not found'})
    await appendAuditRecord({workspaceId,actorId:req.user?.userId,action:'workflow.execution_cancelled',entityType:'workflow_execution',entityId:execution.id,requestId:req.requestId,traceId:req.context?.traceId}).catch(()=>{})
    return send(req,res,200,execution)
  }

  const workflowExecutionRetryMatch=url.pathname.match(/^\/api\/workflows\/executions\/([^/]+)\/retry$/)
  if(req.method==='POST'&&workflowExecutionRetryMatch){
    try{
      const execution=await handleRetryWorkflowExecution({workspaceId,executionId:decodeURIComponent(workflowExecutionRetryMatch[1]),actorId:req.user?.userId||null})
      if(!execution)return send(req,res,404,{error:'workflow execution not found'})
      await appendAuditRecord({workspaceId,actorId:req.user?.userId,action:'workflow.execution_retried',entityType:'workflow_execution',entityId:execution.id,requestId:req.requestId,traceId:req.context?.traceId,metadata:{attempts:Number(execution.attempts||0)}}).catch(()=>{})
      return send(req,res,200,execution)
    }catch(error){return send(req,res,Number(error?.status||409),errorPayload(error,'workflow retry failed','workflow_retry_failed'))}
  }

  const workflowMatch=url.pathname.match(/^\/api\/workflows\/([^/]+)$/)
  if(req.method==='GET'&&workflowMatch){
    const workflow=await getWorkflow({workspaceId,id:decodeURIComponent(workflowMatch[1])})
    return workflow?send(req,res,200,workflow):send(req,res,404,{error:'workflow not found'})
  }

  const workflowVersionMatch=url.pathname.match(/^\/api\/workflows\/([^/]+)\/versions$/)
  if(req.method==='POST'&&workflowVersionMatch){
    const body=await readBody(req)
    try{
      const workflow=await createWorkflowVersion({workspaceId,id:decodeURIComponent(workflowVersionMatch[1]),definition:body.definition,actorId:req.user?.userId||null})
      if(!workflow)return send(req,res,404,{error:'workflow not found'})
      await appendAuditRecord({workspaceId,actorId:req.user?.userId,action:'workflow.version_created',entityType:'workflow',entityId:workflow.id,requestId:req.requestId,traceId:req.context?.traceId,metadata:{version:Number(workflow.version||workflow.latest_version||0)}}).catch(()=>{})
      return send(req,res,201,workflow)
    }catch(error){return send(req,res,Number(error?.status||400),errorPayload(error,'workflow version failed','workflow_version_failed'))}
  }

  const workflowArchiveMatch=url.pathname.match(/^\/api\/workflows\/([^/]+)\/archive$/)
  if(req.method==='POST'&&workflowArchiveMatch){
    try{
      const workflow=await archiveWorkflow({workspaceId,id:decodeURIComponent(workflowArchiveMatch[1]),actorId:req.user?.userId||null})
      if(!workflow)return send(req,res,404,{error:'workflow not found'})
      await appendAuditRecord({workspaceId,actorId:req.user?.userId,action:'workflow.archived',entityType:'workflow',entityId:workflow.id,requestId:req.requestId,traceId:req.context?.traceId}).catch(()=>{})
      return send(req,res,200,workflow)
    }catch(error){return send(req,res,Number(error?.status||409),errorPayload(error,'workflow archive failed','workflow_archive_failed'))}
  }

  const workflowPublishMatch=url.pathname.match(/^\/api\/workflows\/([^/]+)\/publish$/)
  if(req.method==='POST'&&workflowPublishMatch){
    const workflow=await handlePublishWorkflow({workspaceId,id:decodeURIComponent(workflowPublishMatch[1])})
    if(!workflow)return send(req,res,404,{error:'workflow not found'})
    await appendAuditRecord({workspaceId,actorId:req.user?.userId,action:'workflow.published',entityType:'workflow',entityId:workflow.id,requestId:req.requestId,traceId:req.context?.traceId,metadata:{version:Number(workflow.published_version||0)}}).catch(()=>{})
    return send(req,res,200,workflow)
  }

  const workflowStartMatch=url.pathname.match(/^\/api\/workflows\/([^/]+)\/executions$/)
  if(req.method==='POST'&&workflowStartMatch){
    const body=await readBody(req)
    const execution=await startWorkflowExecution({workspaceId,id:decodeURIComponent(workflowStartMatch[1]),actorId:req.user?.userId||null,triggerType:body.triggerType||'manual',triggerRef:body.triggerRef||null,correlationId:req.context?.requestId||null,causationId:body.causationId||null,deadlineAt:body.deadlineAt||null})
    return execution?send(req,res,202,execution):send(req,res,404,{error:'published workflow not found'})
  }

  const approvalCreateMatch=url.pathname.match(/^\/api\/workflows\/executions\/([^/]+)\/approvals$/)
  if(req.method==='POST'&&approvalCreateMatch){
    const body=await readBody(req)
    const approval=await createWorkflowApproval({workspaceId,executionId:decodeURIComponent(approvalCreateMatch[1]),nodeId:String(body.nodeId||''),requestedBy:req.user?.userId||null,approverScope:body.approverScope||null,policyVersion:body.policyVersion||null})
    return approval?send(req,res,201,approval):send(req,res,404,{error:'workflow execution not found'})
  }

  const approvalDecisionMatch=url.pathname.match(/^\/api\/workflows\/approvals\/([^/]+)\/decision$/)
  if(req.method==='POST'&&approvalDecisionMatch){
    const body=await readBody(req)
    try{
      const approval=await handleDecideApproval({workspaceId,approvalId:decodeURIComponent(approvalDecisionMatch[1]),actorId:req.user?.userId||null,decision:body.decision,comment:body.comment||''})
      if(!approval)return send(req,res,404,{error:'workflow approval not found'})
      await appendAuditRecord({workspaceId,actorId:req.user?.userId,action:'workflow.approval_decided',entityType:'workflow_approval',entityId:approval.id,requestId:req.requestId,traceId:req.context?.traceId,metadata:{decision:approval.status}}).catch(()=>{})
      return send(req,res,200,approval)
    }catch(error){return send(req,res,Number(error?.status||400),errorPayload(error,'workflow approval failed','workflow_approval_failed'))}
  }

  return false
}
