import {readdir} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import pg from 'pg'
import {loadEnvFile} from './load-env.mjs'

const args=new Set(process.argv.slice(2))
const env=await loadEnvFile('.env')
Object.assign(process.env,env)
const {deploymentMode}=await import('../backend/src/platform/deployment-mode.mjs')
const mode=deploymentMode()
const checks=[]
const add=(name,ok,detail,severity='required')=>checks.push({name,ok:Boolean(ok),detail,severity})

const nodeMajor=Number(process.versions.node.split('.')[0])
add('node-version',nodeMajor>=20,'Node '+process.versions.node+'; requires >=20')
add('deployment-mode',true,mode.name+' · '+mode.description)

const requiredBase=['DATABASE_URL','JWT_SECRET','ADMIN_EMAIL','ADMIN_PASSWORD_HASH','CORS_ALLOWED_ORIGINS','CONNECTOR_ENCRYPTION_KEY','CONNECTOR_OAUTH_STATE_SECRET']
for(const key of requiredBase)add('env:'+key,Boolean(String(process.env[key]||'').trim()),String(process.env[key]||'').trim()?'configured':'missing')

const migrationFiles=(await readdir(new URL('../backend/migrations/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort()
const repoMigrationHead=migrationFiles.at(-1)||null
let dbHead=null
if(process.env.DATABASE_URL){
  const {Pool}=pg
  const pool=new Pool({
    connectionString:process.env.DATABASE_URL,
    connectionTimeoutMillis:5000,
    ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
  })
  try{
    const ping=await pool.query('SELECT current_database() database, version() version')
    add('database-connectivity',true,'connected to '+String(ping.rows[0]?.database||'database'))
    const table=await pool.query("SELECT to_regclass('public.ace_schema_migrations') table_name")
    if(table.rows[0]?.table_name){
      const {rows}=await pool.query('SELECT name FROM ace_schema_migrations ORDER BY name DESC LIMIT 1')
      dbHead=rows[0]?.name||null
      add('database-migration-head',dbHead===repoMigrationHead,'database='+String(dbHead||'none')+' repo='+String(repoMigrationHead||'none'))
    }else add('database-migration-head',false,'ace_schema_migrations not found')
  }catch(error){
    add('database-connectivity',false,error instanceof Error?error.message:String(error))
  }finally{await pool.end().catch(()=>{})}
}else add('database-connectivity',false,'DATABASE_URL missing')

const featureChecks=[
  ['control-plane',mode.features.controlPlane,['CONTROL_ADMIN_EMAIL','CONTROL_ADMIN_PASSWORD_HASH','CONTROL_SESSION_SECRET']],
  ['billing',mode.features.billing,['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET']],
  ['files',mode.features.files,['OBJECT_S3_BUCKET','OBJECT_S3_REGION','OBJECT_S3_ACCESS_KEY_ID','OBJECT_S3_SECRET_ACCESS_KEY']],
  ['whatsapp',mode.features.whatsapp,['WHATSAPP_WEBHOOK_VERIFY_TOKEN','WHATSAPP_PHONE_NUMBER_ID']],
  ['call-tracking',mode.features.callTracking,['CALL_WEBHOOK_SECRET']],
  ['ai',mode.features.ai,['ML_SERVICE_AUTH_TOKEN']]
]
for(const [name,enabled,keys] of featureChecks){
  if(!enabled){add('feature:'+name,true,'disabled by deployment mode','optional');continue}
  const missing=keys.filter(key=>!String(process.env[key]||'').trim())
  add('feature:'+name,missing.length===0,missing.length?'missing '+missing.join(', '):'enabled and configured')
}

if(args.has('--docker')){
  const docker=spawnSync(process.platform==='win32'?'docker.exe':'docker',['version','--format','{{.Server.Version}}'],{encoding:'utf8'})
  add('docker-engine',docker.status===0,docker.status===0?'Docker '+docker.stdout.trim():(docker.stderr||'docker unavailable').trim())
  if(docker.status===0){
    const compose=spawnSync(process.platform==='win32'?'docker.exe':'docker',['compose','config','--quiet'],{encoding:'utf8',env:{...process.env,...env}})
    add('docker-compose-config',compose.status===0,compose.status===0?'compose configuration valid':(compose.stderr||compose.stdout||'compose validation failed').trim())
  }
}

const versionCheck=spawnSync(process.execPath,['scripts/provider-version-check.mjs'],{encoding:'utf8',env:{...process.env,...env}})
add('provider-api-version-review',versionCheck.status===0,versionCheck.status===0?'provider version review current':(versionCheck.stdout||versionCheck.stderr||'version check failed').trim())

const failed=checks.filter(x=>x.severity!=='optional'&&!x.ok)
console.log(JSON.stringify({
  ok:failed.length===0,
  deploymentMode:mode.name,
  repositoryMigrationHead:repoMigrationHead,
  databaseMigrationHead:dbHead,
  checks,
  failed:failed.map(x=>x.name)
},null,2))
if(failed.length)process.exit(1)
