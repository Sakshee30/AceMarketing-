import {createHash,randomUUID} from 'node:crypto'
import pg from 'pg'
import {enqueueJob} from './queue.mjs'
import {createActivationRun,getAudienceBundle,materializeAudience,updateAudienceSyncState} from './lead-ops.mjs'

const {Pool}=pg
const databaseUrl=process.env.DATABASE_URL||''
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.AUDIENCE_SCHEDULER_DB_POOL_MAX||5),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

const cadenceMap={
  realtime:60,
  'real time':60,
  'every 5 min':300,
  '5m':300,
  '15m':900,
  hourly:3600,
  '6h':21600,
  daily:86400
}
export const normalizeAudienceCadence=value=>{
  if(typeof value==='number'&&Number.isFinite(value))return Math.max(60,Math.min(604800,Math.round(value)))
  const raw=String(value||'').trim().toLowerCase()
  if(cadenceMap[raw])return cadenceMap[raw]
  const numeric=Number(raw)
  if(Number.isFinite(numeric)&&numeric>0)return Math.max(60,Math.min(604800,Math.round(numeric)))
  return 300
}
const labelFor=seconds=>seconds<=60?'Real time':seconds===300?'Every 5 min':seconds===900?'Every 15 min':seconds===3600?'Hourly':seconds===21600?'Every 6 hours':seconds===86400?'Daily':seconds+' sec'
const hashMembers=members=>createHash('sha256').update([...members].sort().join('|')).digest('hex')
const providerNames=destination=>[...new Set(String(destination||'').split(/·|,/).map(x=>x.trim()).filter(Boolean).map(x=>{
  const low=x.toLowerCase()
  if(low.includes('meta'))return 'Meta Ads'
  if(low.includes('google'))return 'Google Ads'
  return null
}).filter(Boolean))]

export const saveAudienceSchedule=async(workspaceId,audienceId,input={})=>{
  if(!pool)throw new Error('audience scheduler unavailable')
  const cadence=normalizeAudienceCadence(input.cadenceSeconds??input.cadence)
  const maxStaleness=Math.max(300,Math.min(2592000,Number(input.maxStalenessSeconds||Math.max(cadence*3,3600))))
  const enabled=input.enabled!==false
  const audience=await pool.query(`SELECT id FROM ace_audiences WHERE workspace_id=$1 AND id=$2`,[workspaceId,audienceId])
  if(!audience.rowCount)return null
  const {rows}=await pool.query(
    `INSERT INTO ace_audience_schedules
      (audience_id,workspace_id,cadence_seconds,max_staleness_seconds,enabled,next_run_at,last_status)
     VALUES ($1,$2,$3,$4,$5,now(),$6)
     ON CONFLICT (audience_id) DO UPDATE SET
       cadence_seconds=EXCLUDED.cadence_seconds,
       max_staleness_seconds=EXCLUDED.max_staleness_seconds,
       enabled=EXCLUDED.enabled,
       next_run_at=CASE WHEN EXCLUDED.enabled THEN LEAST(ace_audience_schedules.next_run_at,now()) ELSE ace_audience_schedules.next_run_at END,
       last_status=CASE WHEN EXCLUDED.enabled THEN 'scheduled' ELSE 'paused' END,
       last_error=NULL,
       updated_at=now()
     RETURNING *`,
    [audienceId,workspaceId,cadence,maxStaleness,enabled,enabled?'scheduled':'paused']
  )
  await pool.query(`UPDATE ace_audiences SET cadence_seconds=$3,max_staleness_seconds=$4,updated_at=now() WHERE workspace_id=$1 AND id=$2`,[workspaceId,audienceId,cadence,maxStaleness])
  return {...rows[0],cadenceLabel:labelFor(cadence)}
}

export const listAudienceSchedules=async workspaceId=>{
  if(!pool)return []
  const {rows}=await pool.query(
    `SELECT s.*,a.name,a.destination,a.mode,a.status AS audience_status,a.last_synced_at
     FROM ace_audience_schedules s JOIN ace_audiences a ON a.id=s.audience_id
     WHERE s.workspace_id=$1 ORDER BY a.name`,[workspaceId]
  )
  return rows.map(x=>({...x,cadenceLabel:labelFor(Number(x.cadence_seconds))}))
}

const claimDue=async(limit=5)=>{
  if(!pool)return []
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const {rows}=await client.query(
      `WITH due AS (
        SELECT audience_id FROM ace_audience_schedules
        WHERE enabled=true AND next_run_at<=now()
        ORDER BY next_run_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT $1
      )
      UPDATE ace_audience_schedules s
      SET last_status='running',
          last_run_at=now(),
          next_run_at=now()+(s.cadence_seconds*interval '1 second'),
          updated_at=now()
      FROM due WHERE s.audience_id=due.audience_id
      RETURNING s.*`,[Math.max(1,Math.min(50,Number(limit)||5))]
    )
    await client.query('COMMIT')
    return rows
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
  finally{client.release()}
}

const memberKeys=async(workspaceId,audienceId)=>{
  const {rows}=await pool.query(`SELECT identity_key FROM ace_audience_members WHERE workspace_id=$1 AND audience_id=$2`,[workspaceId,audienceId])
  return rows.map(x=>String(x.identity_key))
}

const refreshOne=async schedule=>{
  const workspaceId=schedule.workspace_id,audienceId=schedule.audience_id
  const before=await memberKeys(workspaceId,audienceId)
  const previous=new Set(before)
  await materializeAudience(workspaceId,audienceId)
  const bundle=await getAudienceBundle(workspaceId,audienceId)
  if(!bundle)throw new Error('audience not found after materialization')
  const after=bundle.members.map(x=>String(x.identity_key))
  const current=new Set(after)
  const added=after.filter(x=>!previous.has(x)).length
  const removed=before.filter(x=>!current.has(x)).length
  const membershipHash=hashMembers(after)
  const changed=membershipHash!==String(schedule.last_membership_hash||'')
  const lastSynced=bundle.audience.last_synced_at?Date.parse(bundle.audience.last_synced_at):0
  const stale=!lastSynced||Date.now()-lastSynced>=Number(schedule.max_staleness_seconds||86400)*1000
  const providers=providerNames(bundle.audience.destination)
  let queued=false
  if((changed||stale)&&providers.length){
    for(const provider of providers){
      const key=provider==='Meta Ads'?'meta':'google'
      await updateAudienceSyncState(workspaceId,audienceId,key,{status:'queued',error:null})
      const run=await createActivationRun(workspaceId,{kind:'audience_sync',entityId:audienceId,provider,requestSummary:{audience:bundle.audience.name,members:after.length,mode:bundle.audience.mode,automatic:true,added,removed,reason:changed?'membership_changed':'stale_refresh'}})
      await enqueueJob({
        workspaceId,
        kind:'audience_sync',
        idempotencyKey:'audience:auto:'+audienceId+':'+key+':'+membershipHash+':'+String(schedule.last_run_at||Date.now()),
        payload:{audienceId,provider,activationRunId:run.id,automatic:true,added,removed}
      })
    }
    queued=true
  }else if(!changed&&!stale){
    await pool.query(`UPDATE ace_audiences SET status=CASE WHEN last_synced_at IS NULL THEN 'ready_for_sync' ELSE 'active' END,updated_at=now() WHERE workspace_id=$1 AND id=$2`,[workspaceId,audienceId])
  }
  const reason=changed?'membership_changed':stale?'stale_refresh':'unchanged'
  await pool.query(
    `UPDATE ace_audience_schedules SET
      last_membership_hash=$3,last_member_count=$4,last_added=$5,last_removed=$6,
      last_change_at=CASE WHEN $7 THEN now() ELSE last_change_at END,
      last_status=$8,last_error=NULL,updated_at=now()
     WHERE workspace_id=$1 AND audience_id=$2`,
    [workspaceId,audienceId,membershipHash,after.length,added,removed,changed,queued?'queued':'unchanged']
  )
  await pool.query(`UPDATE ace_audiences SET membership_hash=$3 WHERE workspace_id=$1 AND id=$2`,[workspaceId,audienceId,membershipHash])
  await pool.query(
    `INSERT INTO ace_audience_refresh_runs
      (id,workspace_id,audience_id,previous_count,current_count,added_count,removed_count,membership_changed,sync_queued,reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    ['ar_'+randomUUID(),workspaceId,audienceId,before.length,after.length,added,removed,changed,queued,reason]
  )
  return {audienceId,previousCount:before.length,currentCount:after.length,added,removed,changed,queued,reason}
}

export const runDueAudienceSchedules=async(limit=5)=>{
  const schedules=await claimDue(limit)
  const results=[]
  for(const schedule of schedules){
    try{results.push(await refreshOne(schedule))}
    catch(error){
      const message=error instanceof Error?error.message:String(error)
      await pool.query(`UPDATE ace_audience_schedules SET last_status='error',last_error=$3,updated_at=now() WHERE workspace_id=$1 AND audience_id=$2`,[schedule.workspace_id,schedule.audience_id,message.slice(0,2000)]).catch(()=>{})
      results.push({audienceId:schedule.audience_id,error:message})
    }
  }
  return results
}

export const listAudienceRefreshRuns=async(workspaceId,audienceId=null,limit=100)=>{
  if(!pool)return []
  const {rows}=await pool.query(
    `SELECT * FROM ace_audience_refresh_runs WHERE workspace_id=$1 AND ($2::text IS NULL OR audience_id=$2) ORDER BY created_at DESC LIMIT $3`,
    [workspaceId,audienceId,Math.max(1,Math.min(500,Number(limit)||100))]
  )
  return rows
}

export const closeAudienceScheduler=async()=>{if(pool)await pool.end()}
