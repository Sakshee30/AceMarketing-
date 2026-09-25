import {existsSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'

const database=process.env.DATABASE_URL
const input=process.argv[2]||process.env.RESTORE_FILE
if(!database)throw new Error('DATABASE_URL is required')
if(!input)throw new Error('restore file path is required: npm run restore -- backups/file.dump')
const file=resolve(input)
if(!existsSync(file))throw new Error('restore file does not exist: '+file)
if(process.env.RESTORE_CONFIRM!=='YES')throw new Error('set RESTORE_CONFIRM=YES to acknowledge destructive restore')
const result=spawnSync('pg_restore',['--clean','--if-exists','--no-owner','--no-acl','--dbname',database,file],{stdio:'inherit'})
if(result.status!==0)process.exit(result.status||1)
console.log(JSON.stringify({ok:true,file}))
