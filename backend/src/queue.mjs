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

export const enqueueJob=async({workspaceId,kind,payload,idempotencyKey,maxAttempts=5,availableAt=null})=>{
  if(!pool) return null
  const id='job_'+randomUUID()
  const key=String(idempotencyKey||id)
  const {rows}=await pool.query(
    `INSERT INTO ace_jobs
      (id,workspace_id,kind,payload,status,attempts,max_attempts,available_at,idempotency_key)
     VALUES ($1,$2,$3,$4::jsonb,'pending',0,$5,COALESCE($6::timestamptz,now()),$7)
     ON CONFLICT (workspace_id,idempotency_key)
     DO UPDATE SET updated_at=ace_jobs.updated_at
     RETURNING *`,
    [id,workspaceId,kind,JSON.stringify(payload||{}),maxAttempts,availableAt,key]
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
           AND (leased_until IS NULL OR leased_until<now())
         ORDER BY available_at ASC, created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $1
       )
       UPDATE ace_jobs j
       SET status='leased',
           lease_owner=$2,
           leased_until=now()+($3*interval '1 millisecond'),
           attempts=j.attempts+1,
           updated_at=now()
       FROM picked
       WHERE j.id=picked.id
       RETURNING j.*`,
      [limit,workerId,leaseMs]
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

export const completeJob=async(id,result={})=>{
  if(!pool) return null
  const {rows}=await pool.query(
    `UPDATE ace_jobs
     SET status='succeeded',result=$2::jsonb,lease_owner=NULL,leased_until=NULL,updated_at=now(),completed_at=now()
     WHERE id=$1
     RETURNING *`,
    [id,JSON.stringify(result||{})]
  )
  return rows[0]||null
}

export const failJob=async(id,errorMessage)=>{
  if(!pool) return null
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
         updated_at=now()
     WHERE id=$1
     RETURNING *`,
    [id,String(errorMessage||'job failed').slice(0,4000)]
  )
  return rows[0]||null
}

export const queueStats=async(workspaceId)=>{
  if(!pool) return {backend:'disabled',pending:0,leased:0,retry:0,succeeded:0,deadLetter:0}
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
    deadLetter:counts.dead_letter||0
  }
}

export const closeQueue=async()=>{if(pool) await pool.end()}
