import {lstat,readFile,realpath,rename,symlink,unlink} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {resolve,dirname,join} from 'node:path'
import {spawnSync} from 'node:child_process'
import pg from 'pg'

const raw=process.argv.slice(2)
const action=raw.find(x=>!x.startsWith('--'))||'status'
const positional=raw.filter(x=>!x.startsWith('--')).slice(1)
const opts=new Map(raw.filter(x=>x.startsWith('--')).map(x=>{
  const [k,...v]=x.slice(2).split('=')
  return [k,v.length?v.join('='):'true']
}))
const root=resolve(opts.get('root')||process.env.ACE_RELEASE_ROOT||'/opt/acemarketing')
const current=join(root,'current')
const previous=join(root,'previous')

const migrationHeadFor=async releaseDir=>{
  const {readdir}=await import('node:fs/promises')
  const dir=join(releaseDir,'backend','migrations')
  const files=(await readdir(dir)).filter(x=>x.endsWith('.sql')).sort()
  return files.at(-1)||null
}

const databaseHead=async()=>{
  if(!process.env.DATABASE_URL)return null
  const pool=new pg.Pool({
    connectionString:process.env.DATABASE_URL,
    ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
  })
  try{
    const exists=await pool.query("SELECT to_regclass('public.ace_schema_migrations') table_name")
    if(!exists.rows[0]?.table_name)return null
    const {rows}=await pool.query('SELECT name FROM ace_schema_migrations ORDER BY name DESC LIMIT 1')
    return rows[0]?.name||null
  }finally{await pool.end()}
}

const linkTarget=async path=>{
  try{return await realpath(path)}catch{return null}
}

const verifyRelease=async releaseDir=>{
  const packagePath=join(releaseDir,'package.json')
  if(!existsSync(packagePath))throw new Error('release does not contain package.json: '+releaseDir)
  const pkg=JSON.parse(await readFile(packagePath,'utf8'))
  if(pkg.name!=='ace-marketing')throw new Error('target is not an AceMarketing release')
  for(const path of ['backend/src/index.mjs','backend/src/worker.mjs','scripts/static-server.mjs']){
    if(!existsSync(join(releaseDir,path)))throw new Error('release missing '+path)
  }
  const releaseHead=await migrationHeadFor(releaseDir)
  const dbHead=await databaseHead()
  if(dbHead&&releaseHead&&dbHead>releaseHead&&process.env.ROLLBACK_ALLOW_NEWER_SCHEMA!=='YES'){
    throw new Error('database schema '+dbHead+' is newer than target release '+releaseHead+
      '; confirm forward-schema compatibility and set ROLLBACK_ALLOW_NEWER_SCHEMA=YES to proceed')
  }
  return {releaseHead,dbHead}
}

const replaceLink=async(link,target)=>{
  const tmp=link+'.next-'+process.pid
  try{await unlink(tmp)}catch{}
  await symlink(target,tmp,'dir')
  await rename(tmp,link)
}

const restartTarget=()=>{
  if(opts.get('restart')!=='true')return
  const target=opts.get('target')||process.env.ACE_SYSTEMD_TARGET||'acemarketing-core.target'
  const result=spawnSync('systemctl',['restart',target],{stdio:'inherit'})
  if(result.status!==0)throw new Error('systemctl restart failed for '+target)
}

if(action==='status'){
  console.log(JSON.stringify({root,current:await linkTarget(current),previous:await linkTarget(previous)},null,2))
  process.exit(0)
}

if(action==='activate'){
  if(!positional[0])throw new Error('Usage: node scripts/local-release.mjs activate <release-dir> [--root=/opt/acemarketing] [--restart=true]')
  const target=resolve(positional[0])
  const compatibility=await verifyRelease(target)
  const old=await linkTarget(current)
  if(old&&old!==target)await replaceLink(previous,old)
  await replaceLink(current,target)
  restartTarget()
  console.log(JSON.stringify({ok:true,action,current:target,previous:old||null,...compatibility},null,2))
  process.exit(0)
}

if(action==='rollback'){
  const target=positional[0]?resolve(positional[0]):await linkTarget(previous)
  if(!target)throw new Error('no previous release is recorded; pass a release directory explicitly')
  const compatibility=await verifyRelease(target)
  const old=await linkTarget(current)
  await replaceLink(current,target)
  if(old&&old!==target)await replaceLink(previous,old)
  restartTarget()
  console.log(JSON.stringify({ok:true,action,current:target,previous:old||null,...compatibility},null,2))
  process.exit(0)
}

throw new Error('unsupported local release action: '+action)
