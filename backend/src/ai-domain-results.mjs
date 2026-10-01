import {randomUUID} from 'node:crypto'
import {pool} from './database.mjs'

export const persistDomainResult=async(client,{workspaceId,resultId,task,operation,payload})=>{
  if(task.startsWith('forecast_')){
    const warningList=[].concat(Array.isArray(payload?.warnings)?payload.warnings:[],payload?.warning||[]).filter(Boolean)
    const pointForecast=payload?.pointForecast??payload?.forecasts??null
    const quantiles=payload?.quantiles??(payload?.quantileLevels?{levels:payload.quantileLevels,records:payload?.forecasts||null}:null)
    await client.query(
      `INSERT INTO ace_ai_forecast_records
        (workspace_id,result_id,task,series_id,horizon,frequency,model_revision,point_forecast,quantiles,intervals,metrics,
         baseline_comparison,interval_method,nominal_coverage,measured_coverage,data_cutoff,warnings)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13,$14,$15,$16::timestamptz,$17::jsonb)
       ON CONFLICT (workspace_id,result_id) DO NOTHING`,
      [
        workspaceId,resultId,task,payload?.seriesId||null,Number(payload?.horizon)||null,payload?.frequency||null,
        payload?.revision||payload?.artifact?.artifactId||null,JSON.stringify(pointForecast),JSON.stringify(quantiles),
        JSON.stringify(payload?.intervals??null),JSON.stringify(payload?.metrics??{}),JSON.stringify(payload?.baselineComparison??null),
        payload?.intervalMethod||null,payload?.nominalCoverage??null,payload?.measuredCoverage??null,payload?.dataCutoff||null,
        JSON.stringify(warningList)
      ]
    )
  }
  if(task==='incrementality'){
    const interval=payload?.approximateInterval95||payload?.interval||null
    const estimate=payload?.averageTreatmentEffect??payload?.estimate??null
    const supported=!String(payload?.status||'').includes('unsupported')&&!String(payload?.status||'').includes('insufficient')
    await client.query(
      `INSERT INTO ace_ai_causal_records
        (workspace_id,result_id,task,estimand,treatment_name,outcome_name,supported,estimate,interval,overlap,diagnostics,assumptions,sample_size)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13)
       ON CONFLICT (workspace_id,result_id) DO NOTHING`,
      [
        workspaceId,resultId,task,payload?.estimand||null,payload?.treatment||null,payload?.outcome||null,supported,
        estimate,JSON.stringify(interval),JSON.stringify(payload?.overlap||{}),JSON.stringify(payload?.diagnostics||{}),
        JSON.stringify([payload?.warning].filter(Boolean)),Number(payload?.sampleSize)||null
      ]
    )
  }
  if(task==='marketing_mix'){
    const healthStatus=String(payload?.healthStatus||'unknown')
    const supported=!String(payload?.status||'').includes('blocked')&&!healthStatus.toUpperCase().includes('FAIL')
    await client.query(
      `INSERT INTO ace_ai_marketing_mix_records
        (workspace_id,result_id,task,supported,health_status,artifact_id,artifact_hash,media_channels,sampling,diagnostics,assumptions)
       VALUES ($1,$2,'marketing_mix',$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb)
       ON CONFLICT (workspace_id,result_id) DO NOTHING`,
      [
        workspaceId,resultId,supported,healthStatus,payload?.artifact?.artifactId||null,payload?.artifact?.sha256||null,
        JSON.stringify(payload?.artifact?.metadata?.mediaChannels||[]),JSON.stringify(payload?.sampling||{}),
        JSON.stringify({healthStatus,edaOutcomes:payload?.edaOutcomes||[],promotion:payload?.promotion||null}),
        JSON.stringify([payload?.warning].filter(Boolean))
      ]
    )
  }
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
  const [snapshots,membershipCounts]=await Promise.all([
    pool.query(
      `SELECT * FROM ace_ai_segment_snapshots
       WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT $2`,
      [workspaceId,safeLimit]
    ),
    pool.query(
      `SELECT snapshot_id,count(*)::int AS member_count
       FROM ace_ai_segment_memberships
       WHERE workspace_id=$1
       GROUP BY snapshot_id`,
      [workspaceId]
    )
  ])
  const countsBySnapshot=new Map(membershipCounts.rows.map(row=>[row.snapshot_id,Number(row.member_count||0)]))
  return snapshots.rows.map(row=>({...row,member_count:countsBySnapshot.get(row.id)||0}))
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


export const listForecastRecords=async({workspaceId,task=null,limit=100})=>{
  if(!pool)return []
  const safeLimit=Math.max(1,Math.min(Number(limit||100),500))
  const params=[workspaceId]
  let where='workspace_id=$1'
  if(task){params.push(task);where+=' AND task=$2'}
  params.push(safeLimit)
  const {rows}=await pool.query(
    `SELECT * FROM ace_ai_forecast_records WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  )
  return rows
}

export const listCausalRecords=async({workspaceId,limit=100})=>{
  if(!pool)return []
  const safeLimit=Math.max(1,Math.min(Number(limit||100),500))
  const {rows}=await pool.query(
    'SELECT * FROM ace_ai_causal_records WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT $2',
    [workspaceId,safeLimit]
  )
  return rows
}

export const listMarketingMixRecords=async({workspaceId,limit=100})=>{
  if(!pool)return []
  const safeLimit=Math.max(1,Math.min(Number(limit||100),500))
  const {rows}=await pool.query(
    'SELECT * FROM ace_ai_marketing_mix_records WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT $2',
    [workspaceId,safeLimit]
  )
  return rows
}
