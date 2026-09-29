import {pool} from './database.mjs'
import {enqueueJob} from './queue.mjs'
import {assertAiActivationExecutable} from './ai-activation-proposals.mjs'
import {changeGoogleAdsCampaignBudget,syncAudienceProvider,writebackLead} from './activation-adapters.mjs'
import {ProviderExecutionError} from './ai-providers.mjs'

const enabled=()=>process.env.AI_ACTIVATION_EXECUTION_ENABLED==='true'

export const activationExecutionEnabled=enabled
export const activationQueueStatusProcessable=status=>['pending','retry','leased'].includes(String(status||''))

export const validateActivationAdapterInput=({proposalType,payload})=>{
  const type=String(proposalType||'').trim()
  const body=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload:{}
  const adapter=String(body.providerAdapter||'').trim().toLowerCase()
  if(!adapter)throw new Error('provider-specific execution adapter missing')

  if(type==='audience_sync'){
    if(!['meta_audience','google_audience'].includes(adapter)){
      throw new Error('unsupported audience execution adapter: '+adapter)
    }
    const audienceId=String(body.audienceId||'').trim()
    if(!audienceId)throw new Error('audience_sync requires payload.audienceId')
    return {kind:'audience_sync',adapter,audienceId}
  }

  if(type==='crm_writeback'){
    if(!['hubspot_crm','zoho_crm','salesforce_crm'].includes(adapter)){
      throw new Error('unsupported CRM execution adapter: '+adapter)
    }
    const leadRef=String(body.leadRef||'').trim()
    if(!leadRef)throw new Error('crm_writeback requires payload.leadRef')
    const fields=body.fields&&typeof body.fields==='object'&&!Array.isArray(body.fields)?body.fields:{}
    return {kind:'crm_writeback',adapter,leadRef,fields}
  }

  if(type==='budget_change'){
    if(!['google_ads_budget','google_ads'].includes(adapter)){
      throw new Error('unsupported budget execution adapter: '+adapter)
    }
    const campaignBudgetResourceName=String(body.campaignBudgetResourceName||'').trim()
    if(!/^customers\/\d+\/campaignBudgets\/\d+$/.test(campaignBudgetResourceName)){
      throw new Error('budget_change requires a valid payload.campaignBudgetResourceName')
    }
    const expectedCurrentAmountMicros=Number(body.expectedCurrentAmountMicros)
    const newAmountMicros=Number(body.newAmountMicros)
    if(!Number.isSafeInteger(expectedCurrentAmountMicros)||expectedCurrentAmountMicros<=0){
      throw new Error('budget_change requires positive integer payload.expectedCurrentAmountMicros')
    }
    if(!Number.isSafeInteger(newAmountMicros)||newAmountMicros<=0){
      throw new Error('budget_change requires positive integer payload.newAmountMicros')
    }
    return {
      kind:'budget_change',
      adapter:'google_ads_budget',
      campaignBudgetResourceName,
      expectedCurrentAmountMicros,
      newAmountMicros,
      sharedBudgetAcknowledged:body.sharedBudgetAcknowledged===true
    }
  }

  throw new Error('unsupported activation proposal type: '+type)
}

const updateExecution=async({workspaceId,id,status,jobId=null,actor=null,error=null,receipt=null,providerRequestId=null})=>{
  if(!pool)return null
  const {rows}=await pool.query(
    `UPDATE ace_ai_activation_proposals
     SET execution_status=$3,
         execution_job_id=COALESCE($4,execution_job_id),
         execution_requested_by=COALESCE($5,execution_requested_by),
         execution_requested_at=CASE WHEN $3='queued' THEN COALESCE(execution_requested_at,now()) ELSE execution_requested_at END,
         execution_error=$6,
         execution_receipt=COALESCE($7::jsonb,execution_receipt),
         provider_request_id=COALESCE($8,provider_request_id),
         executed_at=CASE WHEN $3='succeeded' THEN now() ELSE executed_at END
     WHERE workspace_id=$1 AND id=$2
     RETURNING *`,
    [workspaceId,id,status,jobId,actor,error?String(error).slice(0,4000):null,receipt?JSON.stringify(receipt):null,providerRequestId]
  )
  return rows[0]||null
}

export const queueAiActivationExecution=async({workspaceId,id,actor})=>{
  if(!enabled())throw new Error('AI activation execution is disabled by AI_ACTIVATION_EXECUTION_ENABLED')
  const proposal=await assertAiActivationExecutable({workspaceId,id})
  const validated=validateActivationAdapterInput({
    proposalType:proposal.proposal_type,
    payload:proposal.payload
  })
  if(proposal.executed_at||proposal.execution_status==='succeeded')throw new Error('activation proposal has already been executed')
  if(['queued','running'].includes(String(proposal.execution_status||''))){
    if(proposal.execution_job_id)return {proposal,job:{id:proposal.execution_job_id,status:proposal.execution_status}}
    throw new Error('activation proposal execution is already in progress')
  }
  const actorId=actor?.userId||actor?.email||null
  if(!actorId)throw new Error('authenticated execution actor required')
  const deadlineAt=new Date(Date.now()+Number(process.env.AI_ACTIVATION_EXECUTION_DEADLINE_MS||120000)).toISOString()
  const job=await enqueueJob({
    workspaceId,
    kind:'ai_activation_execution',
    payload:{
      proposalId:proposal.id,
      proposalHash:proposal.proposal_hash,
      adapter:validated.adapter,
      executionKind:validated.kind
    },
    idempotencyKey:'ai-activation:'+proposal.proposal_hash,
    maxAttempts:Math.max(1,Math.min(Number(process.env.AI_ACTIVATION_EXECUTION_MAX_ATTEMPTS||1),2)),
    deadlineAt,
    inputSnapshot:{
      schemaVersion:'ai-activation-execution.v1',
      proposalId:proposal.id,
      proposalHash:proposal.proposal_hash,
      evidenceSnapshot:proposal.evidence_snapshot,
      modelSnapshot:proposal.model_snapshot,
      adapter:validated.adapter,
      requestedBy:actorId
    },
    resultSchemaVersion:'ai-activation-execution-result.v1',
    outboxEvent:{
      eventType:'ai.activation.execution.queued',
      schemaVersion:'ai-activation-event.v1',
      payload:{proposalId:proposal.id,proposalHash:proposal.proposal_hash,adapter:validated.adapter}
    }
  })
  if(!job)throw new Error('durable queue is unavailable')
  const queueStatus=String(job.status||'')
  if(!activationQueueStatusProcessable(queueStatus)){
    throw new Error('activation execution job is not processable: '+(queueStatus||'unknown'))
  }
  const updated=await updateExecution({
    workspaceId,id,status:'queued',jobId:job.id,actor:actorId
  })
  return {proposal:updated||proposal,job}
}

const executeAdapter=async(workspaceId,proposal)=>{
  const validated=validateActivationAdapterInput({
    proposalType:proposal.proposal_type,
    payload:proposal.payload
  })
  if(validated.kind==='audience_sync'){
    const provider=validated.adapter==='meta_audience'?'meta':'google'
    return syncAudienceProvider(workspaceId,validated.audienceId,provider)
  }
  if(validated.kind==='crm_writeback'){
    const provider=validated.adapter==='hubspot_crm'?'hubspot':validated.adapter==='zoho_crm'?'zoho':'salesforce'
    return writebackLead(workspaceId,validated.leadRef,provider,validated.fields)
  }
  if(validated.kind==='budget_change'){
    return changeGoogleAdsCampaignBudget(workspaceId,validated)
  }
  throw new Error('unsupported activation execution kind')
}

export const executeAiActivationJob=async job=>{
  const workspaceId=job.workspace_id
  const proposalId=String(job.payload?.proposalId||'')
  if(!enabled()){
    await updateExecution({
      workspaceId,id:proposalId,status:'blocked',jobId:job.id,
      error:'AI activation execution was disabled before worker execution'
    }).catch(()=>{})
    throw new Error('AI activation execution was disabled before worker execution')
  }
  const expectedHash=String(job.payload?.proposalHash||'')
  const proposal=await assertAiActivationExecutable({workspaceId,id:proposalId})
  if(String(proposal.proposal_hash)!==expectedHash)throw new Error('activation proposal hash changed before execution')
  if(proposal.executed_at||proposal.execution_status==='succeeded'){
    return {proposalId,status:'already_succeeded',receipt:proposal.execution_receipt||null}
  }
  if(proposal.execution_status==='running'&&String(proposal.execution_job_id||'')===String(job.id)){
    await updateExecution({
      workspaceId,id:proposalId,status:'blocked',jobId:job.id,
      error:'Previous execution attempt may have reached the provider; reconciliation is required before retry.'
    }).catch(()=>{})
    throw new ProviderExecutionError(
      'activation execution outcome is unknown; automatic retry is blocked pending reconciliation',
      {provider:'activation',task:proposal.task||'activation',unknownOutcome:true,cause:'reconciliation_required'}
    )
  }
  if(proposal.execution_status==='running'){
    throw new Error('activation proposal is already running under a different job')
  }
  await updateExecution({workspaceId,id:proposalId,status:'running',jobId:job.id})
  try{
    const result=await executeAdapter(workspaceId,proposal)
    const providerRequestId=String(result?.providerRequestId||result?.job||result?.externalId||'').slice(0,500)||null
    const receipt={
      schemaVersion:'ai-activation-execution-result.v1',
      provider:result?.provider||null,
      externalId:result?.externalId||null,
      providerJob:result?.job||null,
      received:result?.received??null,
      httpStatus:result?.status??null,
      previousAmountMicros:result?.previousAmountMicros??null,
      newAmountMicros:result?.newAmountMicros??null,
      referenceCount:result?.referenceCount??null,
      changePct:result?.changePct??null,
      completedAt:new Date().toISOString()
    }
    await updateExecution({
      workspaceId,id:proposalId,status:'succeeded',jobId:job.id,receipt,providerRequestId
    })
    return {proposalId,status:'succeeded',receipt}
  }catch(error){
    const unknownOutcome=Boolean(error?.unknownOutcome)
    await updateExecution({
      workspaceId,id:proposalId,status:unknownOutcome?'blocked':'failed',jobId:job.id,
      error:error instanceof Error?error.message:String(error),
      providerRequestId:error?.providerRequestId||null
    }).catch(()=>{})
    throw error
  }
}

export const closeAiActivationExecution=async()=>{}
