import {createHash,randomUUID} from 'node:crypto'
import {pool} from './database.mjs'
import {getTenantRegistry} from './ai-registry-store.mjs'

const canonical=value=>{
  if(Array.isArray(value))return value.map(canonical)
  if(value&&typeof value==='object'){
    return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]))
  }
  return value
}
const hashProposal=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
const asObject=(value,name)=>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(name+' must be an object')
  return value
}
const safeType=value=>{
  const clean=String(value||'').trim()
  if(!/^[a-z][a-z0-9_.-]{1,80}$/.test(clean))throw new Error('invalid proposalType')
  return clean
}

export const buildActivationProposalInput=({task,proposalType,payload,evidenceSnapshot,modelSnapshot,expiresAt,createdBy})=>{
  const cleanTask=String(task||'').trim()
  if(!cleanTask)throw new Error('task required')
  const cleanType=safeType(proposalType)
  const cleanPayload=asObject(payload,'payload')
  const evidence=asObject(evidenceSnapshot,'evidenceSnapshot')
  const model=asObject(modelSnapshot,'modelSnapshot')
  const evidenceRefs=Array.isArray(evidence.evidenceRefs)?evidence.evidenceRefs.filter(Boolean):[]
  if(!evidenceRefs.length)throw new Error('at least one evidence reference is required')
  const providerAdapter=String(cleanPayload.providerAdapter||'').trim()
  if(!/^[a-z0-9_.-]{2,80}$/.test(providerAdapter))throw new Error('payload.providerAdapter required')
  const expiry=new Date(expiresAt)
  const now=Date.now()
  if(!Number.isFinite(expiry.getTime())||expiry.getTime()<=now)throw new Error('expiresAt must be in the future')
  if(expiry.getTime()-now>24*60*60*1000)throw new Error('activation proposal expiry cannot exceed 24 hours')
  const immutable={task:cleanTask,proposalType:cleanType,payload:cleanPayload,evidenceSnapshot:evidence,modelSnapshot:model,expiresAt:expiry.toISOString()}
  return {...immutable,proposalHash:hashProposal(immutable),createdBy:createdBy||null}
}

const currentRoute=async(workspaceId,task)=>{
  const items=await getTenantRegistry(workspaceId)
  return items.find(item=>item.task===task)||null
}

const assertModelReady=route=>{
  if(!route)throw new Error('task model registry entry not found')
  if(route.evaluationStatus!=='qualified')throw new Error('task evaluation is not qualified')
  if(route.approvalStatus!=='approved')throw new Error('task model is not approved')
  if(route.deploymentStatus!=='deployed')throw new Error('task model is not deployed')
}

export const createAiActivationProposal=async({workspaceId,input,actor})=>{
  if(!pool)throw new Error('DATABASE_URL is required')
  const route=await currentRoute(workspaceId,input?.task)
  assertModelReady(route)
  const modelSnapshot={
    task:route.task,
    provider:route.provider,
    requestedModel:route.requestedModel,
    resolvedModel:route.resolvedModel||null,
    artifactRevision:route.artifactRevision||null,
    artifactHash:route.artifactHash||null,
    evaluationReference:route.evaluationReference||null,
    evaluationStatus:route.evaluationStatus,
    approvalStatus:route.approvalStatus,
    deploymentStatus:route.deploymentStatus
  }
  const built=buildActivationProposalInput({
    ...input,
    modelSnapshot,
    createdBy:actor?.userId||actor?.email||null
  })
  const policyResult={
    version:'ai-activation.v1',
    allowed:true,
    checks:{
      modelQualified:true,
      modelApproved:true,
      modelDeployed:true,
      evidencePresent:true,
      providerAdapterDeclared:true,
      expiryBounded:true
    }
  }
  const id='aiprop_'+randomUUID()
  const {rows}=await pool.query(
    `INSERT INTO ace_ai_activation_proposals
      (id,workspace_id,proposal_type,proposal_hash,evidence_snapshot,model_snapshot,policy_result,payload,status,expires_at,task,created_by,policy_version)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,'pending_approval',$9::timestamptz,$10,$11,'ai-activation.v1')
     ON CONFLICT (workspace_id,proposal_hash) DO UPDATE SET proposal_hash=EXCLUDED.proposal_hash
     RETURNING *`,
    [id,workspaceId,built.proposalType,built.proposalHash,JSON.stringify(built.evidenceSnapshot),JSON.stringify(built.modelSnapshot),
     JSON.stringify(policyResult),JSON.stringify(built.payload),built.expiresAt,built.task,built.createdBy]
  )
  return rows[0]
}

export const listAiActivationProposals=async({workspaceId,status=null,limit=100})=>{
  if(!pool)return []
  const safeLimit=Math.max(1,Math.min(Number(limit||100),500))
  const params=[workspaceId]
  let where='workspace_id=$1'
  if(status){params.push(status);where+=' AND status=$2'}
  params.push(safeLimit)
  const {rows}=await pool.query(
    `SELECT * FROM ace_ai_activation_proposals WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  )
  return rows
}

const immutableFromRow=row=>({
  task:row.task,
  proposalType:row.proposal_type,
  payload:row.payload,
  evidenceSnapshot:row.evidence_snapshot,
  modelSnapshot:row.model_snapshot,
  expiresAt:new Date(row.expires_at).toISOString()
})

const assertFresh=async(workspaceId,row)=>{
  if(new Date(row.expires_at).getTime()<=Date.now())throw new Error('activation proposal expired')
  const expected=hashProposal(immutableFromRow(row))
  if(expected!==row.proposal_hash)throw new Error('activation proposal integrity check failed')
  const route=await currentRoute(workspaceId,row.task)
  assertModelReady(route)
  const snapshot=row.model_snapshot||{}
  if(String(snapshot.evaluationReference||'')!==String(route.evaluationReference||''))throw new Error('activation proposal is stale: evaluation changed')
  if(String(snapshot.artifactRevision||'')!==String(route.artifactRevision||''))throw new Error('activation proposal is stale: artifact changed')
  if(String(snapshot.requestedModel||'')!==String(route.requestedModel||''))throw new Error('activation proposal is stale: model changed')
}

export const approveAiActivationProposal=async({workspaceId,id,actor})=>{
  if(!pool)throw new Error('DATABASE_URL is required')
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const {rows}=await client.query(
      'SELECT * FROM ace_ai_activation_proposals WHERE id=$1 AND workspace_id=$2 FOR UPDATE',
      [id,workspaceId]
    )
    const row=rows[0]
    if(!row)throw new Error('activation proposal not found')
    if(row.status!=='pending_approval')throw new Error('activation proposal is not pending approval')
    const approver=actor?.userId||actor?.email||null
    if(!approver)throw new Error('authenticated approver required')
    if(row.created_by&&row.created_by===approver)throw new Error('separation of duties: proposal creator cannot approve the same proposal')
    await assertFresh(workspaceId,row)
    const updated=await client.query(
      `UPDATE ace_ai_activation_proposals
       SET status='approved',approved_by=$3,approved_at=now()
       WHERE id=$1 AND workspace_id=$2 AND status='pending_approval'
       RETURNING *`,
      [id,workspaceId,approver]
    )
    await client.query('COMMIT')
    return updated.rows[0]
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{client.release()}
}

export const rejectAiActivationProposal=async({workspaceId,id,actor,reason})=>{
  if(!pool)throw new Error('DATABASE_URL is required')
  const reviewer=actor?.userId||actor?.email||null
  if(!reviewer)throw new Error('authenticated reviewer required')
  const {rows}=await pool.query(
    `UPDATE ace_ai_activation_proposals
     SET status='rejected',rejected_by=$3,rejected_at=now(),rejection_reason=$4
     WHERE id=$1 AND workspace_id=$2 AND status='pending_approval'
     RETURNING *`,
    [id,workspaceId,reviewer,String(reason||'Rejected by reviewer').slice(0,2000)]
  )
  return rows[0]||null
}

export const assertAiActivationExecutable=async({workspaceId,id})=>{
  if(!pool)throw new Error('DATABASE_URL is required')
  const {rows}=await pool.query('SELECT * FROM ace_ai_activation_proposals WHERE id=$1 AND workspace_id=$2',[id,workspaceId])
  const row=rows[0]
  if(!row)throw new Error('activation proposal not found')
  if(row.status!=='approved')throw new Error('activation proposal is not approved')
  await assertFresh(workspaceId,row)
  if(!row.payload?.providerAdapter)throw new Error('provider-specific execution adapter missing')
  return row
}

export const activationProposalHash=hashProposal
