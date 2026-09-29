import {randomUUID} from 'node:crypto'
import {pool} from './database.mjs'

export const persistDomainResult=async(client,{workspaceId,resultId,task,operation,payload})=>{
  if(task==='anomaly_detection'&&Array.isArray(payload?.items)){
    for(const item of payload.items.slice(0,250000)){
      await client.query(
        `INSERT INTO ace_ai_anomaly_items (workspace_id,result_id,entity_id,anomaly,score)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (workspace_id,result_id,entity_id) DO NOTHING`,
        [workspaceId,resultId,String(item.entityId||'').slice(0,256),Boolean(item.anomaly),Number(item.score)]
      )
    }
  }
  if(task==='behavioral_segments'&&Array.isArray(payload?.items)){
    const snapshotId='aiseg_'+randomUUID()
    const noiseCount=payload.items.filter(item=>Boolean(item.noise)).length
    await client.query(
      `INSERT INTO ace_ai_segment_snapshots
        (id,workspace_id,result_id,snapshot_version,cluster_count,noise_count,warning)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (workspace_id,result_id) DO NOTHING`,
      [snapshotId,workspaceId,resultId,resultId,Number(payload.clusters||0),noiseCount,payload.warning?String(payload.warning).slice(0,2000):null]
    )
    const existing=await client.query(
      `SELECT id FROM ace_ai_segment_snapshots WHERE workspace_id=$1 AND result_id=$2`,
      [workspaceId,resultId]
    )
    const id=existing.rows[0]?.id||snapshotId
    for(const item of payload.items.slice(0,250000)){
      await client.query(
        `INSERT INTO ace_ai_segment_memberships
          (workspace_id,snapshot_id,entity_id,cluster_id,noise)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (workspace_id,snapshot_id,entity_id) DO NOTHING`,
        [workspaceId,id,String(item.entityId||'').slice(0,256),Number(item.cluster),Boolean(item.noise)]
      )
    }
  }
  if(task==='offer_ranking'&&operation==='offer_ranking_score'&&Array.isArray(payload?.groups)){
    const cutoff=payload.predictionCutoff||null
    const artifactId=payload?.artifact?.artifactId||null
    for(const group of payload.groups.slice(0,10000)){
      for(const item of (group.items||[]).slice(0,10000)){
        await client.query(
          `INSERT INTO ace_ai_ranking_items
            (workspace_id,result_id,group_id,candidate_id,rank,score,eligible,prediction_cutoff,artifact_id)
           VALUES ($1,$2,$3,$4,$5,$6,true,$7::timestamptz,$8)
           ON CONFLICT (workspace_id,result_id,group_id,candidate_id) DO NOTHING`,
          [workspaceId,resultId,String(group.groupId||'').slice(0,256),String(item.candidateId||'').slice(0,256),Number(item.rank),Number(item.score),cutoff,artifactId]
        )
      }
    }
  }
}

export const listAnomalyItems=async({workspaceId,status=null,limit=200})=>{
  if(!pool)return []
  const safeLimit=Math.max(1,Math.min(Number(limit||200),1000))
  const params=[workspaceId]
  let where='workspace_id=$1 AND anomaly=true'
  if(status){params.push(status);where+=' AND triage_status=$2'}
  params.push(safeLimit)
  const {rows}=await pool.query(
    `SELECT * FROM ace_ai_anomaly_items WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  )
  return rows
}

export const reviewAnomalyItem=async({workspaceId,resultId,entityId,status,feedback=null,suppressedUntil=null,actor})=>{
  if(!pool)throw new Error('DATABASE_URL is required')
  const allowed=new Set(['open','investigating','suppressed','resolved','false_positive'])
  if(!allowed.has(status))throw new Error('invalid anomaly triage status')
  if(status==='suppressed'&&!suppressedUntil)throw new Error('suppressedUntil required for suppression')
  const {rows}=await pool.query(
    `UPDATE ace_ai_anomaly_items
     SET triage_status=$4,feedback=$5,suppressed_until=$6::timestamptz,reviewed_by=$7,reviewed_at=now()
     WHERE workspace_id=$1 AND result_id=$2 AND entity_id=$3
     RETURNING *`,
    [workspaceId,resultId,entityId,status,feedback?String(feedback).slice(0,2000):null,suppressedUntil,actor?.userId||actor?.email||null]
  )
  return rows[0]||null
}

export const listSegmentSnapshots=async({workspaceId,limit=50})=>{
  if(!pool)return []
  const safeLimit=Math.max(1,Math.min(Number(limit||50),200))
  const {rows}=await pool.query(
    `SELECT s.*,
       (SELECT count(*)::int FROM ace_ai_segment_memberships m WHERE m.workspace_id=s.workspace_id AND m.snapshot_id=s.id) AS member_count
     FROM ace_ai_segment_snapshots s WHERE s.workspace_id=$1 ORDER BY s.created_at DESC LIMIT $2`,
    [workspaceId,safeLimit]
  )
  return rows
}

export const getSegmentMemberships=async({workspaceId,snapshotId,limit=1000})=>{
  if(!pool)return []
  const safeLimit=Math.max(1,Math.min(Number(limit||1000),5000))
  const {rows}=await pool.query(
    `SELECT entity_id,cluster_id,noise,created_at FROM ace_ai_segment_memberships
     WHERE workspace_id=$1 AND snapshot_id=$2 ORDER BY cluster_id,entity_id LIMIT $3`,
    [workspaceId,snapshotId,safeLimit]
  )
  return rows
}

export const listRankingItems=async({workspaceId,resultId=null,limit=500})=>{
  if(!pool)return []
  const safeLimit=Math.max(1,Math.min(Number(limit||500),5000))
  const params=[workspaceId]
  let where='workspace_id=$1'
  if(resultId){params.push(resultId);where+=' AND result_id=$2'}
  params.push(safeLimit)
  const {rows}=await pool.query(
    `SELECT * FROM ace_ai_ranking_items WHERE ${where} ORDER BY created_at DESC,group_id,rank LIMIT $${params.length}`,
    params
  )
  return rows
}
