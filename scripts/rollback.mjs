import {readFile} from 'node:fs/promises'
import {spawn} from 'node:child_process'
import pg from 'pg'

const manifestPath=process.argv[2]
if(!manifestPath){
  console.error('Usage: node scripts/rollback.mjs <release-manifest.json> [core|standard|full]')
  process.exit(2)
}
const mode=process.argv[3]||process.env.ACE_DEPLOYMENT_MODE||'core'
const manifest=JSON.parse(await readFile(manifestPath,'utf8'))
if(manifest.schemaVersion!=='ace.release.v1')throw new Error('unsupported release manifest schema')
const artifacts=manifest.artifacts||{}
for(const required of ['api','worker','web']){
  if(!artifacts[required])throw new Error('release manifest missing artifact: '+required)
}

const verifySchemaCompatibility=async()=>{
  const databaseUrl=process.env.DATABASE_URL
  const releaseHead=String(manifest.databaseMigrationHead||'').trim()
  if(!databaseUrl||!releaseHead){
    console.warn('[rollback] schema compatibility could not be verified because DATABASE_URL or databaseMigrationHead is missing')
    return
  }
  const {Pool}=pg
  const pool=new Pool({
    connectionString:databaseUrl,
    ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
  })
  try{
    const exists=await pool.query("SELECT to_regclass('public.ace_schema_migrations') AS table_name")
    if(!exists.rows[0]?.table_name)return
    const {rows}=await pool.query('SELECT name FROM ace_schema_migrations ORDER BY name DESC LIMIT 1')
    const currentHead=String(rows[0]?.name||'')
    if(currentHead&&currentHead>releaseHead&&process.env.ROLLBACK_ALLOW_NEWER_SCHEMA!=='YES'){
      throw new Error(
        'database schema '+currentHead+' is newer than rollback release '+releaseHead+
        '; verify forward-schema compatibility and set ROLLBACK_ALLOW_NEWER_SCHEMA=YES to proceed'
      )
    }
    console.log('[rollback] schema check:',{currentHead,releaseHead})
  }finally{await pool.end()}
}
await verifySchemaCompatibility()

const env={
  ...process.env,
  ACE_DEPLOYMENT_MODE:mode,
  ACE_API_IMAGE:String(artifacts.api),
  ACE_WORKER_IMAGE:String(artifacts.worker),
  ACE_WEB_IMAGE:String(artifacts.web)
}
if(artifacts.controlApi)env.ACE_CONTROL_API_IMAGE=String(artifacts.controlApi)
if(artifacts.platformAdmin)env.ACE_PLATFORM_ADMIN_IMAGE=String(artifacts.platformAdmin)
if(artifacts.ml)env.ACE_ML_IMAGE=String(artifacts.ml)
if(artifacts.mlForecast)env.ACE_ML_FORECAST_IMAGE=String(artifacts.mlForecast)
if(artifacts.mlCausal)env.ACE_ML_CAUSAL_IMAGE=String(artifacts.mlCausal)
if(artifacts.mlMmm)env.ACE_ML_MMM_IMAGE=String(artifacts.mlMmm)

console.log('[rollback] application rollback target:',manifest.commit||manifest.ref||manifestPath)
console.log('[rollback] database migrations are NOT reversed automatically.')
console.log('[rollback] ensure the selected application release is compatible with the current forward schema.')
const child=spawn(process.execPath,['scripts/stack.mjs','up','--mode='+mode,'--no-build'],{
  stdio:'inherit',env,cwd:process.cwd()
})
child.once('exit',code=>process.exit(code??1))
child.once('error',error=>{console.error(error.message);process.exit(1)})
