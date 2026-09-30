import pg from 'pg'
import {newDb,DataType} from 'pg-mem'
import {readdir,readFile} from 'node:fs/promises'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'

const {Pool:PostgresPool}=pg
export const databaseUrl=process.env.DATABASE_URL||''
export const embeddedDatabase=!databaseUrl&&process.env.NODE_ENV!=='production'

const createEmbeddedPool=async()=>{
  const db=newDb({autoCreateForeignKeyIndices:true})
  db.public.registerFunction({
    name:'date_trunc',
    args:[DataType.text,DataType.timestamptz],
    returns:DataType.timestamptz,
    implementation:(part,value)=>{
      const date=new Date(value)
      if(part==='month')return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1))
      if(part==='day')return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()))
      return date
    }
  })
  db.public.registerFunction({
    name:'nullif',
    args:[DataType.text,DataType.text],
    returns:DataType.text,
    implementation:(left,right)=>left===right?null:left
  })
  db.public.registerFunction({name:'least',args:[DataType.timestamptz,DataType.timestamptz],returns:DataType.timestamptz,implementation:(left,right)=>new Date(left)<=new Date(right)?left:right})
  db.public.registerFunction({name:'greatest',args:[DataType.timestamptz,DataType.timestamptz],returns:DataType.timestamptz,implementation:(left,right)=>new Date(left)>=new Date(right)?left:right})
  const migrationsDir=join(dirname(fileURLToPath(import.meta.url)),'..','migrations')
  const files=(await readdir(migrationsDir)).filter(file=>file.endsWith('.sql')).sort()
  for(const file of files){
    let sql=await readFile(join(migrationsDir,file),'utf8')
    // pg-mem does not implement PostgreSQL's regex CHECK operator; runtime validation remains active.
    if(file==='001_workspace_state.sql')sql=sql.replace(/,\s*CHECK \(workspace_id ~ '[^']+'\)/,'')
    // pg-mem gives the original inline job-status CHECK an generated name, so
    // migration 022 cannot drop it by PostgreSQL's production constraint name.
    // Expand the embedded copy up front to the final migrated state.
    if(file==='002_job_queue.sql'){
      sql=sql.replace(
        "CHECK (status IN ('pending','leased','retry','succeeded','dead_letter'))",
        "CHECK (status IN ('pending','leased','retry','succeeded','dead_letter','cancelled','unknown_outcome'))"
      )
    }
    if(file==='009_entitlements.sql'){
      sql=sql.replace(
        "CHECK (status IN ('reserved','committed','released'))",
        "CHECK (status IN ('reserved','committed','accounted','released'))"
      )
    }
    // Preserve the production PostgreSQL GIN/FTS index, but omit it only from
    // the embedded pg-mem schema because pg-mem does not implement tsvector/GIN.
    if(file==='023_ai_knowledge.sql'){
      sql=sql.replace(
        /CREATE INDEX IF NOT EXISTS ace_ai_knowledge_chunks_fts_idx[\s\S]*?WHERE revoked_at IS NULL;\s*/m,
        ''
      )
    }
    // pg-mem does not implement PostgreSQL row-level security. Production applies
    // the RLS migration; embedded tests exercise the application tenant context.
    if(file==='036_platform_rls.sql')continue
    if(file==='037_forms_custom_objects.sql')sql=sql.replace(/ALTER TABLE ace_forms ENABLE ROW LEVEL SECURITY;[\s\S]*$/m,'')
    if(file==='038_rules_workflows.sql')sql=sql.replace(/ALTER TABLE ace_policy_rules ENABLE ROW LEVEL SECURITY;[\s\S]*$/m,'')
    if(file==='039_usage_ledger.sql')sql=sql.replace(/ALTER TABLE ace_usage_ledger ENABLE ROW LEVEL SECURITY;[\s\S]*$/m,'')
    // pg-mem's parser rejects comment-only compatibility marker files.
    // Production migration tooling may retain those markers, but embedded setup
    // should simply skip files with no executable SQL.
    const executableSql=sql.replace(/--.*$/gm,'').trim()
    if(!executableSql)continue
    try{
      db.public.none(sql)
    }catch(error){
      const message=error instanceof Error?error.message:String(error)
      throw new Error('embedded migration '+file+' failed: '+message,{cause:error})
    }
  }
  const adapter=db.adapters.createPg()
  return new adapter.Pool()
}

export const pool=databaseUrl?new PostgresPool({
  connectionString:databaseUrl,
  max:Number(process.env.DB_POOL_MAX||20),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):embeddedDatabase?await createEmbeddedPool():null
