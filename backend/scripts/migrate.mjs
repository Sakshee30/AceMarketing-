import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Pool }=pg
const databaseUrl=process.env.DATABASE_URL
if(!databaseUrl) throw new Error('DATABASE_URL is required to run migrations')

const here=dirname(fileURLToPath(import.meta.url))
const migrationsDir=join(here,'..','migrations')
const pool=new Pool({
  connectionString:databaseUrl,
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
})

try{
  await pool.query(`CREATE TABLE IF NOT EXISTS ace_schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`)
  const files=(await readdir(migrationsDir)).filter(x=>x.endsWith('.sql')).sort()
  for(const file of files){
    const exists=await pool.query('SELECT 1 FROM ace_schema_migrations WHERE name=$1',[file])
    if(exists.rowCount) continue
    const sql=await readFile(join(migrationsDir,file),'utf8')
    const client=await pool.connect()
    try{
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO ace_schema_migrations(name) VALUES($1)',[file])
      await client.query('COMMIT')
      console.log(`Applied ${file}`)
    }catch(error){
      await client.query('ROLLBACK')
      throw error
    }finally{
      client.release()
    }
  }
}finally{
  await pool.end()
}
