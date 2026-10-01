import {createReadStream,mkdirSync} from 'node:fs'
import {writeFile} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'
import {createHash} from 'node:crypto'
import pg from 'pg'

const database=process.env.DATABASE_URL
if(!database)throw new Error('DATABASE_URL is required')
const dir=resolve(process.env.BACKUP_DIR||'backups')
mkdirSync(dir,{recursive:true})
const stamp=new Date().toISOString().replace(/[:.]/g,'-')
const file=resolve(dir,'acemarketing-'+stamp+'.dump')

const dump=spawnSync('pg_dump',['--format=custom','--no-owner','--no-acl','--file',file,database],{stdio:'inherit'})
if(dump.status!==0)process.exit(dump.status||1)

const verify=spawnSync('pg_restore',['--list',file],{stdio:['ignore','ignore','inherit']})
if(verify.status!==0)throw new Error('backup verification failed: pg_restore could not read the dump')

const sha256=await new Promise((resolveHash,reject)=>{
  const hash=createHash('sha256')
  const stream=createReadStream(file)
  stream.on('data',chunk=>hash.update(chunk))
  stream.on('end',()=>resolveHash(hash.digest('hex')))
  stream.on('error',reject)
})

let migrationHead=null
const pool=new pg.Pool({
  connectionString:database,
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
})
try{
  const exists=await pool.query("SELECT to_regclass('public.ace_schema_migrations') table_name")
  if(exists.rows[0]?.table_name){
    const {rows}=await pool.query('SELECT name FROM ace_schema_migrations ORDER BY name DESC LIMIT 1')
    migrationHead=rows[0]?.name||null
  }
}finally{await pool.end()}

const metadata={
  schemaVersion:'ace.backup.v1',
  createdAt:new Date().toISOString(),
  dump:file,
  sha256,
  migrationHead,
  releaseSha:process.env.ACE_RELEASE_SHA||process.env.GITHUB_SHA||null,
  configurationVersion:process.env.ACE_CONFIG_VERSION||null,
  databaseEngine:'postgresql',
  format:'pg_dump-custom',
  verifiedReadable:true
}
const metadataFile=file+'.meta.json'
await writeFile(metadataFile,JSON.stringify(metadata,null,2)+'\n',{mode:0o600})
console.log(JSON.stringify({ok:true,file,metadataFile,sha256,migrationHead,verifiedReadable:true}))
