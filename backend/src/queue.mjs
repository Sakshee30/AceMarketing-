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
  resultSchemaVersion=null
})=>{
  if(!pool) return null
  const id='job_'+randomUUID()
  const key=String(idempotencyKey||id)
  const {rows}=await pool.query(
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
  return rows[0]
}

export const leaseJobs=async({workerId,limit=10})=>{
  if(!pool) return []
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
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
  const {rows}=await pool.query(
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
     WHERE id=$1${extra}
     RETURNING *`,
    values
  )
  return rows[0]||null
}

export const failJob=async(id,errorMessage,guard=null)=>{
  if(!pool) return null
  const extra=guardedWhere(guard)
  const {rows}=await pool.query(
    `UPDATE ace_jobs
     SET status=CASE WHEN attempts>=max_attempts THEN 'dead_letter' ELSE 'retry' END,
         last_error=$2,
         available_at=CASE
           WHEN attempts>=max_attempts THEN available_at
           ELSE now()+(LEAST(3600,POWER(2,GREATEST(0,attempts-1))*15)*interval '1 second')
         END,
         lease_owner=NULL,
         leased_until=NULL,
         heartbeat_at=now(),
         updated_at=now(),
         completed_at=CASE WHEN attempts>=max_attempts THEN now() ELSE completed_at END
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
