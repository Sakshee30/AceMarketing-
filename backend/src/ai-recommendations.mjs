import {createHash,randomUUID} from 'node:crypto'
import {pool} from './database.mjs'

const canonical=value=>{
  if(Array.isArray(value))return value.map(canonical)
  if(value&&typeof value==='object'){
    return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]))
  }
  return value
}
const hash=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{}

export const createRecommendationProposal=async({
  workspaceId,
  proposalType='recommendation',
  recommendation,
  evidenceSnapshot,
  modelSnapshot,
  policyResult,
  expiresInSeconds=3600,
  actor
})=>{
  if(!pool)throw new Error('DATABASE_URL is required for recommendation proposals')
  const evidence=object(evidenceSnapshot)
  const model=object(modelSnapshot)
  const policy=object(policyResult)
  const payload=object(recommendation)
  if(!Object.keys(payload).length)throw new Error('recommendation object required')
  if(policy.allowed!==true&&policy.allowed!==false)throw new Error('policyResult.allowed boolean required')
  const ttl=Math.max(60,Math.min(Number(expiresInSeconds||3600),7*24*60*60))
  const snapshot={
    proposalType:String(proposalType||'recommendation').slice(0,120),
    evidenceSnapshot:evidence,
    modelSnapshot:model,
    policyResult:policy,
    payload
  }
  const proposalHash=hash(snapshot)
  const id='aiprop_'+randomUUID()
  const {rows}=await pool.query(
    `INSERT INTO ace_ai_activation_proposals
      (id,workspace_id,proposal_type,proposal_hash,evidence_snapshot,model_snapshot,policy_result,payload,status,expires_at,created_by,reviewer_status)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,'pending_review',now()+($9*interval '1 second'),$10,'not_requested')
     ON CONFLICT (workspace_id,proposal_hash)
     DO UPDATE SET proposal_hash=ace_ai_activation_proposals.proposal_hash
     RETURNING *`,
    [id,workspaceId,snapshot.proposalType,proposalHash,JSON.stringify(evidence),JSON.stringify(model),JSON.stringify(policy),JSON.stringify(payload),ttl,actor?.userId||actor?.email||null]
  )
  return rows[0]
}

export const attachRecommendationReviewJob=async({workspaceId,proposalId,jobId})=>{
  if(!pool)return null
  const {rows}=await pool.query(
    `UPDATE ace_ai_activation_proposals
     SET reviewer_job_id=$3,reviewer_status='queued',status='pending_review'
     WHERE workspace_id=$1 AND id=$2 AND reviewer_status IN ('not_requested','blocked','failed')
       AND expires_at>now()
     RETURNING *`,
    [workspaceId,proposalId,jobId]
  )
  return rows[0]||null
}

export const markRecommendationReviewBlocked=async({workspaceId,proposalId,reason})=>{
  if(!pool)return null
  const {rows}=await pool.query(
    `UPDATE ace_ai_activation_proposals
     SET reviewer_status='blocked',reviewer_summary=$3,status='review_blocked',reviewer_completed_at=now()
     WHERE workspace_id=$1 AND id=$2 AND expires_at>now()
     RETURNING *`,
    [workspaceId,proposalId,String(reason||'reviewer unavailable').slice(0,4000)]
  )
  return rows[0]||null
}

export const recordRecommendationReviewResult=async({workspaceId,jobId,resultId,summary})=>{
  if(!pool)return null
  const {rows}=await pool.query(
    `UPDATE ace_ai_activation_proposals
     SET reviewer_result_id=$3,reviewer_status='completed',reviewer_summary=$4,
         reviewer_completed_at=now(),status='pending_approval'
     WHERE workspace_id=$1 AND reviewer_job_id=$2 AND expires_at>now()
     RETURNING *`,
    [workspaceId,jobId,resultId||null,String(summary||'').slice(0,12000)]
  )
  return rows[0]||null
}

export const recordRecommendationReviewFailure=async({workspaceId,jobId,reason})=>{
  if(!pool)return null
  const {rows}=await pool.query(
    `UPDATE ace_ai_activation_proposals
     SET reviewer_status='failed',reviewer_summary=$3,reviewer_completed_at=now(),status='review_failed'
     WHERE workspace_id=$1 AND reviewer_job_id=$2 AND reviewer_status='queued'
     RETURNING *`,
    [workspaceId,jobId,String(reason||'review failed').slice(0,4000)]
  )
  return rows[0]||null
}

export const listRecommendationProposals=async({workspaceId,limit=100})=>{
  if(!pool)return []
  const safeLimit=Math.max(1,Math.min(Number(limit||100),500))
  const {rows}=await pool.query(
    `SELECT id,proposal_type,proposal_hash,evidence_snapshot,model_snapshot,policy_result,payload,status,expires_at,
            created_by,reviewer_job_id,reviewer_result_id,reviewer_status,reviewer_summary,reviewer_completed_at,
            approved_by,approved_at,approval_note,executed_at,provider_request_id,execution_receipt,created_at
     FROM ace_ai_activation_proposals WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [workspaceId,safeLimit]
  )
  return rows
}

export const approveRecommendationProposal=async({workspaceId,id,actor,note=null})=>{
  if(!pool)throw new Error('DATABASE_URL is required')
  const actorId=actor?.userId||actor?.email||null
  if(!actorId)throw new Error('authenticated approver required')
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const {rows}=await client.query(
      `SELECT * FROM ace_ai_activation_proposals WHERE workspace_id=$1 AND id=$2 FOR UPDATE`,
      [workspaceId,id]
    )
    const item=rows[0]
    if(!item)throw new Error('proposal not found')
    if(Date.parse(item.expires_at)<=Date.now())throw new Error('proposal expired')
    if(item.status!=='pending_approval'||item.reviewer_status!=='completed')throw new Error('completed reviewer evidence is required before approval')
    if(item.policy_result?.allowed!==true)throw new Error('deterministic policy did not allow this proposal')
    if(item.created_by&&item.created_by===actorId)throw new Error('separation of duties: proposal creator cannot approve the proposal')
    const updated=await client.query(
      `UPDATE ace_ai_activation_proposals
       SET status='approved',approved_by=$3,approved_at=now(),approval_note=$4
       WHERE workspace_id=$1 AND id=$2 AND status='pending_approval' AND expires_at>now()
       RETURNING *`,
      [workspaceId,id,actorId,note?String(note).slice(0,2000):null]
    )
    await client.query('COMMIT')
    return updated.rows[0]||null
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{client.release()}
}
