import { randomUUID } from 'node:crypto'
import pg from 'pg'

const { Pool }=pg
const databaseUrl=process.env.DATABASE_URL||''
const leaseMs=Number(process.env.WORKER_LEASE_MS||60000)
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.WORKER_DB_POOL_MAX||10),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

export const queueAvailable=()=>Boolean(pool)

export const enqueueJob=async({
  workspaceId,
  kind,
  payload,
  idempotencyKey,
  maxAttempts=5,
  availableAt=null,
  deadlineAt=null,
  inputSnapshot=null,
  resultSchemaVersion=null,
  aiUsageReservation=null,
  outboxEvent=null
})=>{
  if(!pool) return null
  const id='job_'+randomUUID()
  const key=String(idempotencyKey||id)
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const {rows}=await client.query(
      `INSERT INTO ace_jobs
        (id,workspace_id,kind,payload,status,attempts,max_attempts,available_at,idempotency_key,deadline_at,input_snapshot,result_schema_version)
       VALUES ($1,$2,$3,$4::jsonb,'pending',0,$5,COALESCE($6::timestamptz,now()),$7,$8::timestamptz,$9::jsonb,$10)
       ON CONFLICT (workspace_id,idempotency_key)
       DO UPDATE SET updated_at=ace_jobs.updated_at
       RETURNING *`,
      [
        id,
        workspaceId,
        kind,
        JSON.stringify(payload||{}),
        maxAttempts,
        availableAt,
        key,
        deadlineAt,
        inputSnapshot===null?null:JSON.stringify(inputSnapshot),
        resultSchemaVersion
      ]
    )
    const job=rows[0]
    if(aiUsageReservation){
      const reservationId='aiur_'+randomUUID()
      await client.query(
        `INSERT INTO ace_ai_usage_reservations
          (id,workspace_id,job_id,task,provider,requested_model,reserved_units,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'reserved')
         ON CONFLICT (workspace_id,job_id) DO NOTHING`,
        [
          reservationId,
          workspaceId,
          job.id,
          String(aiUsageReservation.task||kind).slice(0,160),
          aiUsageReservation.provider?String(aiUsageReservation.provider).slice(0,120):null,
          aiUsageReservation.requestedModel?String(aiUsageReservation.requestedModel).slice(0,256):null,
          Math.max(0,Number(aiUsageReservation.reservedUnits||1))
        ]
      )
    }
    if(outboxEvent){
      await client.query(
        `INSERT INTO ace_ai_outbox_events
          (id,workspace_id,job_id,event_type,schema_version,payload,status)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,'pending')
         ON CONFLICT (workspace_id,job_id,event_type) DO NOTHING`,
        [
          'aiob_'+randomUUID(),
          workspaceId,
          job.id,
          String(outboxEvent.eventType||'ai.job.accepted').slice(0,160),
          String(outboxEvent.schemaVersion||'ai-outbox.v1').slice(0,120),
          JSON.stringify(outboxEvent.payload||{jobId:job.id,kind})
        ]
      )
    }
    await client.query('COMMIT')
    return job
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
}

export const reconcileAiUsageReservation=async({workspaceId,jobId,actualUnits=null,status='committed'})=>{
  if(!pool)return null
  const safeStatus=['committed','released','unknown'].includes(status)?status:'unknown'
  const {rows}=await pool.query(
    `UPDATE ace_ai_usage_reservations
     SET actual_units=$3,status=$4,reconciled_at=now()
     WHERE workspace_id=$1 AND job_id=$2 AND status='reserved'
     RETURNING *`,
    [workspaceId,jobId,actualUnits==null?null:Math.max(0,Number(actualUnits)),safeStatus]
  )
  return rows[0]||null
}

export const markAiOutboxPublished=async({workspaceId,jobId,eventType})=>{
  if(!pool)return null
  const {rows}=await pool.query(
    `UPDATE ace_ai_outbox_events
     SET status='published',published_at=now(),attempts=attempts+1,last_error=NULL
     WHERE workspace_id=$1 AND job_id=$2 AND event_type=$3 AND status='pending'
     RETURNING *`,
    [workspaceId,jobId,eventType]
  )
  return rows[0]||null
}

export const leaseJobs=async({workerId,limit=10})=>{
  if(!pool) return []
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    await client.query(
      `UPDATE ace_jobs
       SET status=CASE
             WHEN cancel_requested_at IS NOT NULL THEN 'cancelled'
             WHEN attempts>=max_attempts THEN 'dead_letter'
             ELSE 'retry'
           END,
           last_error=CASE
             WHEN cancel_requested_at IS NOT NULL THEN last_error
             WHEN attempts>=max_attempts THEN COALESCE(last_error,'lease expired after final attempt')
             ELSE COALESCE(last_error,'worker lease expired before finalization')
           END,
           available_at=CASE
             WHEN cancel_requested_at IS NULL AND attempts<max_attempts
               THEN now()+((LEAST(3600,POWER(2,GREATEST(0,attempts-1))*15)+random()*5)*interval '1 second')
             ELSE available_at
           END,
           lease_owner=NULL,
           leased_until=NULL,
           heartbeat_at=COALESCE(heartbeat_at,now()),
           completed_at=CASE
             WHEN cancel_requested_at IS NOT NULL OR attempts>=max_attempts THEN COALESCE(completed_at,now())
             ELSE completed_at
           END,
           updated_at=now()
       WHERE status='leased' AND leased_until IS NOT NULL AND leased_until<now()`
    )
    const {rows}=await client.query(
      `WITH picked AS (
         SELECT id FROM ace_jobs
         WHERE status IN ('pending','retry')
           AND available_at<=now()
           AND cancel_requested_at IS NULL
           AND (deadline_at IS NULL OR deadline_at>now())
           AND (leased_until IS NULL OR leased_until<now())
         ORDER BY available_at ASC, created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $1
       )
       UPDATE ace_jobs j
       SET status='leased',
           lease_owner=$2,
           leased_until=now()+($3*interval '1 millisecond'),
           heartbeat_at=now(),
           fencing_token=j.fencing_token+1,
           attempts=j.attempts+1,
           updated_at=now()
       FROM picked
       WHERE j.id=picked.id
       RETURNING j.*`,
      [limit,workerId,leaseMs]
    )
    await client.query(
      `UPDATE ace_jobs
       SET status='cancelled',completed_at=COALESCE(completed_at,now()),updated_at=now()
       WHERE status IN ('pending','retry') AND cancel_requested_at IS NOT NULL`
    )
    await client.query(
      `UPDATE ace_jobs
       SET status='dead_letter',
           last_error=COALESCE(last_error,'job deadline exceeded before execution'),
           completed_at=COALESCE(completed_at,now()),
           updated_at=now()
       WHERE status IN ('pending','retry') AND deadline_at IS NOT NULL AND deadline_at<=now()`
    )
    await client.query('COMMIT')
    return rows
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
}

export const heartbeatJob=async({id,workerId,fencingToken,extendMs=leaseMs})=>{
  if(!pool) return null
  const {rows}=await pool.query(
    `UPDATE ace_jobs
     SET heartbeat_at=now(),
         leased_until=now()+($4*interval '1 millisecond'),
         updated_at=now()
     WHERE id=$1
       AND status='leased'
       AND lease_owner=$2
       AND fencing_token=$3
       AND cancel_requested_at IS NULL
     RETURNING *`,
    [id,workerId,Number(fencingToken),Math.max(1000,Number(extendMs||leaseMs))]
  )
  return rows[0]||null
}

const guardedWhere=guard=>guard?.workerId&&Number.isFinite(Number(guard?.fencingToken))
  ?' AND lease_owner=$3 AND fencing_token=$4'
  :''

export const completeJob=async(id,result={},guard=null)=>{
  if(!pool) return null
  const extra=guardedWhere(guard)
  const values=[
    id,
    JSON.stringify(result||{}),
    guard?.workerId||null,
    Number(guard?.fencingToken||0),
    guard?.externalRequestId||null,
    guard?.resultSchemaVersion||null
  ]
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const {rows}=await client.query(
      `UPDATE ace_jobs
       SET status='succeeded',
           result=$2::jsonb,
           external_request_id=COALESCE($5,external_request_id),
           result_schema_version=COALESCE($6,result_schema_version),
           lease_owner=NULL,
           leased_until=NULL,
           heartbeat_at=now(),
           updated_at=now(),
           completed_at=now()
       WHERE id=$1 AND cancel_requested_at IS NULL${extra}
       RETURNING *`,
      values
    )
    const job=rows[0]||null
    if(job&&['ai_hosted_task','ml_task'].includes(job.kind)){
      const actualUnits=guard?.actualUnits==null?null:Math.max(0,Number(guard.actualUnits))
      await client.query(
        `UPDATE ace_ai_usage_reservations
         SET actual_units=$2,status='committed',reconciled_at=now()
         WHERE workspace_id=$1 AND job_id=$3 AND status='reserved'`,
        [job.workspace_id,actualUnits,job.id]
      )
      await client.query(
        `INSERT INTO ace_ai_outbox_events
          (id,workspace_id,job_id,event_type,schema_version,payload,status)
         VALUES ($1,$2,$3,'ai.job.completed','ai-job-event.v1',$4::jsonb,'pending')
         ON CONFLICT (workspace_id,job_id,event_type) DO NOTHING`,
        [
          'aiob_'+randomUUID(),job.workspace_id,job.id,
          JSON.stringify({jobId:job.id,kind:job.kind,status:'succeeded',resultSchemaVersion:job.result_schema_version||null})
        ]
      )
    }
    await client.query('COMMIT')
    return job
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
}
export const failJob=async(id,errorMessage,guard=null)=>{
  if(!pool) return null
  const extra=guardedWhere(guard)
  const {rows}=await pool.query(
    `UPDATE ace_jobs
     SET status=CASE
           WHEN cancel_requested_at IS NOT NULL THEN 'cancelled'
           WHEN attempts>=max_attempts THEN 'dead_letter'
           ELSE 'retry'
         END,
         last_error=$2,
         available_at=CASE
           WHEN cancel_requested_at IS NOT NULL OR attempts>=max_attempts THEN available_at
           ELSE now()+((LEAST(3600,POWER(2,GREATEST(0,attempts-1))*15)+random()*5)*interval '1 second')
         END,
         lease_owner=NULL,
         leased_until=NULL,
         heartbeat_at=now(),
         updated_at=now(),
         completed_at=CASE WHEN cancel_requested_at IS NOT NULL OR attempts>=max_attempts THEN now() ELSE completed_at END
     WHERE id=$1${extra}
     RETURNING *`,
    [id,String(errorMessage||'job failed').slice(0,4000),guard?.workerId||null,Number(guard?.fencingToken||0)]
  )
  return rows[0]||null
}

export const markUnknownOutcome=async({
  id,
  workerId,
  fencingToken,
  externalRequestId=null,
  errorMessage='provider outcome is unknown'
})=>{
  if(!pool) return null
  const {rows}=await pool.query(
    `UPDATE ace_jobs
     SET status='unknown_outcome',
         unknown_outcome_at=now(),
         external_request_id=COALESCE($4,external_request_id),
         last_error=$5,
         lease_owner=NULL,
         leased_until=NULL,
         heartbeat_at=now(),
         updated_at=now()
     WHERE id=$1 AND lease_owner=$2 AND fencing_token=$3
     RETURNING *`,
    [id,workerId,Number(fencingToken),externalRequestId,String(errorMessage).slice(0,4000)]
  )
  return rows[0]||null
}

export const requestJobCancellation=async({workspaceId,id})=>{
  if(!pool) return null
  const {rows}=await pool.query(
    `UPDATE ace_jobs
     SET cancel_requested_at=COALESCE(cancel_requested_at,now()),
         status=CASE WHEN status IN ('pending','retry') THEN 'cancelled' ELSE status END,
         completed_at=CASE WHEN status IN ('pending','retry') THEN COALESCE(completed_at,now()) ELSE completed_at END,
         updated_at=now()
     WHERE id=$1 AND workspace_id=$2
       AND status NOT IN ('succeeded','dead_letter','cancelled')
     RETURNING *`,
    [id,workspaceId]
  )
  return rows[0]||null
}

export const getJob=async({workspaceId,id})=>{
  if(!pool) return null
  const {rows}=await pool.query(
    `SELECT id,workspace_id,kind,status,attempts,max_attempts,available_at,leased_until,lease_owner,
            fencing_token,heartbeat_at,cancel_requested_at,deadline_at,unknown_outcome_at,
            external_request_id,result_schema_version,last_error,result,created_at,updated_at,completed_at
     FROM ace_jobs
     WHERE id=$1 AND workspace_id=$2`,
    [id,workspaceId]
  )
  return rows[0]||null
}

export const queueStats=async(workspaceId)=>{
  if(!pool) return {backend:'disabled',pending:0,leased:0,retry:0,succeeded:0,deadLetter:0,cancelled:0,unknownOutcome:0}
  const {rows}=await pool.query(
    `SELECT status,COUNT(*)::int count
     FROM ace_jobs WHERE workspace_id=$1 GROUP BY status`,
    [workspaceId]
  )
  const counts=Object.fromEntries(rows.map(x=>[x.status,Number(x.count)]))
  return {
    backend:'postgres',
    pending:counts.pending||0,
    leased:counts.leased||0,
    retry:counts.retry||0,
    succeeded:counts.succeeded||0,
    deadLetter:counts.dead_letter||0,
    cancelled:counts.cancelled||0,
    unknownOutcome:counts.unknown_outcome||0
  }
}

export const closeQueue=async()=>{if(pool) await pool.end()}
