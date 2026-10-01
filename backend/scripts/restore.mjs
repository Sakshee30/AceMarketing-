import {createReadStream} from 'node:fs'
import {existsSync} from 'node:fs'
import {readFile} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'
import {createHash} from 'node:crypto'

const database=process.env.DATABASE_URL
const input=process.argv[2]||process.env.RESTORE_FILE
if(!database)throw new Error('DATABASE_URL is required')
if(!input)throw new Error('restore file path is required: npm run restore -- backups/file.dump')
const file=resolve(input)
if(!existsSync(file))throw new Error('restore file does not exist: '+file)
if(process.env.RESTORE_CONFIRM!=='YES')throw new Error('set RESTORE_CONFIRM=YES to acknowledge destructive restore')

const readable=spawnSync('pg_restore',['--list',file],{stdio:['ignore','ignore','inherit']})
if(readable.status!==0)throw new Error('restore input is not a readable PostgreSQL custom-format dump')

const metadataFile=file+'.meta.json'
if(existsSync(metadataFile)){
  const metadata=JSON.parse(await readFile(metadataFile,'utf8'))
  if(metadata.schemaVersion!=='ace.backup.v1')throw new Error('unsupported backup metadata schema')
  const actualSha=await new Promise((resolveHash,reject)=>{
    const hash=createHash('sha256')
    const stream=createReadStream(file)
    stream.on('data',chunk=>hash.update(chunk))
    stream.on('end',()=>resolveHash(hash.digest('hex')))
    stream.on('error',reject)
  })
  if(String(actualSha)!==String(metadata.sha256||''))throw new Error('backup checksum mismatch; restore aborted')
  console.log(JSON.stringify({backupVerified:true,sha256:actualSha,migrationHead:metadata.migrationHead||null,releaseSha:metadata.releaseSha||null}))
}else if(process.env.RESTORE_ALLOW_UNVERIFIED!=='YES'){
  throw new Error('backup metadata is missing; set RESTORE_ALLOW_UNVERIFIED=YES only after independently verifying the dump')
}

const result=spawnSync('pg_restore',['--clean','--if-exists','--no-owner','--no-acl','--dbname',database,file],{stdio:'inherit'})
if(result.status!==0)process.exit(result.status||1)
console.log(JSON.stringify({ok:true,file,metadataVerified:existsSync(metadataFile)}))
