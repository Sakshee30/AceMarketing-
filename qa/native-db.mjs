// Existing suites were designed with injected/embedded stores. Give each file
// its own real PostgreSQL database; this is NOT the restricted-role API lane.
import pg from 'pg'
import {createHash} from 'node:crypto'
import {mkdirSync} from 'node:fs'
import {join} from 'node:path'
const file=process.argv[1]||''
if(file.endsWith('.test.mjs')&&process.env.QA_NATIVE_ADMIN_URL){
 const id=createHash('sha256').update(file).digest('hex').slice(0,16)
 const name='qa_native_'+id
 const client=new pg.Client({connectionString:process.env.QA_NATIVE_ADMIN_URL})
 await client.connect()
 await client.query(`CREATE DATABASE "${name}" TEMPLATE qa_template`)
 await client.end()
 const url=new URL(process.env.QA_NATIVE_ADMIN_URL);url.pathname='/'+name
 process.env.DATABASE_URL=url.toString()
 process.env.NODE_ENV='test'
 const dir=join(process.env.QA_PRIVATE_ROOT,'native',id);mkdirSync(dir,{recursive:true})
 process.env.DATA_FILE=join(dir,'state.json')
}
