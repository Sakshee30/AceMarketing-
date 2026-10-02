import pg from 'pg'
import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
if(process.env.QA_ISOLATED!=='1')throw new Error('Isolated harness required')
const source=new URL(process.env.QA_SOURCE_DATABASE_URL),restored=new URL(process.env.QA_RESTORED_DATABASE_URL)
for(const u of [source,restored])assert.equal(u.hostname,'127.0.0.1')
assert.equal(source.pathname,'/qa_http');assert.equal(restored.pathname,'/qa_restore')
const clients=[new pg.Client({connectionString:source.toString()}),new pg.Client({connectionString:restored.toString()})]
const quote=name=>'"'+String(name).replaceAll('"','""')+'"'
async function snapshot(client){
 const {rows}=await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
 const tables=[]
 for(const {tablename} of rows){
  const r=await client.query(`SELECT count(*)::int rows,md5(COALESCE(string_agg(md5(to_jsonb(t)::text),'' ORDER BY md5(to_jsonb(t)::text)),'')) digest FROM public.${quote(tablename)} t`)
  tables.push({table:tablename,...r.rows[0]})
 }
 const sequences=(await client.query("SELECT sequencename,last_value::text FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename")).rows
 return {tables,sequences}
}
try{
 await Promise.all(clients.map(c=>c.connect()))
 const a=await snapshot(clients[0]),b=await snapshot(clients[1]);assert.deepEqual(b,a)
 writeFileSync(process.env.QA_REPORTS+'/restore-reconciliation.json',JSON.stringify({scope:'quiesced restore into a separate database on the same disposable cluster; not fresh-host disaster recovery',candidate:process.env.QA_CANDIDATE||null,matched:true,...a},null,2))
 console.log('Restore matched '+a.tables.length+' table counts/content digests and '+a.sequences.length+' sequences')
}finally{await Promise.all(clients.map(c=>c.end()))}
