import {mkdirSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'

const database=process.env.DATABASE_URL
if(!database)throw new Error('DATABASE_URL is required')
const dir=resolve(process.env.BACKUP_DIR||'backups')
mkdirSync(dir,{recursive:true})
const stamp=new Date().toISOString().replace(/[:.]/g,'-')
const file=resolve(dir,'acemarketing-'+stamp+'.dump')
const result=spawnSync('pg_dump',['--format=custom','--no-owner','--no-acl','--file',file,database],{stdio:'inherit'})
if(result.status!==0)process.exit(result.status||1)
console.log(JSON.stringify({ok:true,file}))
