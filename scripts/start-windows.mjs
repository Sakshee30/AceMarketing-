import {spawn} from 'node:child_process'
import {createHash} from 'node:crypto'
import {existsSync,readFileSync,writeFileSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import net from 'node:net'
import {loadEnvFile} from './load-env.mjs'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
process.chdir(root)
const mode=process.argv[2]||'dev'
if(['help','--help','-h'].includes(mode)){
 console.log('start.bat [dev|production]\n  dev: localhost:5173, frontend hot reload and API restart on edits\n  production: built application using .env, PostgreSQL and preflight checks\nPress Ctrl+C to stop. This launcher does not deploy GitHub commits.')
 process.exit(0)
}
if(!['dev','production'].includes(mode)||process.argv.length>3){console.error('Use start.bat [dev|production]');process.exit(2)}
if(Number(process.versions.node.split('.')[0])<20){console.error('Node.js 20+ is required; use Node.js 24 LTS.');process.exit(1)}
const children=new Set()
let closing=false
function stop(code){
 if(closing)return
 closing=true
 for(const child of children)if(!child.killed){
  if(process.platform==='win32'&&child.pid)spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'})
  else child.kill('SIGTERM')
 }
 setTimeout(()=>process.exit(code),500).unref()
}
process.on('SIGINT',()=>stop(0))
process.on('SIGTERM',()=>stop(0))
const run=(args,env)=>new Promise((accept,reject)=>{
 // npm.cmd is a batch file on Windows, so launch it through cmd explicitly.
 // Only fixed internal npm arguments are accepted here.
 const command=process.platform==='win32'?(process.env.ComSpec||'cmd.exe'):'npm'
 const commandArgs=process.platform==='win32'?['/d','/s','/c','npm '+args.join(' ')]:args
 const child=spawn(command,commandArgs,{cwd:root,env,stdio:'inherit'})
 children.add(child)
 child.once('exit',()=>children.delete(child))
 child.once('error',reject)
 child.once('exit',code=>code===0?accept():reject(new Error('npm '+args.join(' ')+' failed ('+code+')')))
})
const start=(name,args,env)=>{
 const child=spawn(process.execPath,args,{cwd:root,env,stdio:'inherit'})
 children.add(child)
 child.once('exit',()=>children.delete(child))
 child.once('error',error=>{console.error(name+': '+error.message);stop(1)})
 child.once('exit',code=>{if(!closing){console.error(name+' exited ('+code+')');stop(code||1)}})
 return child
}
const portBusy=port=>new Promise(accept=>{
 const socket=net.createConnection({host:'127.0.0.1',port})
 const finish=value=>{socket.destroy();accept(value)}
 socket.setTimeout(500)
 socket.once('connect',()=>finish(true));socket.once('error',()=>finish(false));socket.once('timeout',()=>finish(false))
})
try{
 const env=await loadEnvFile('.env')
 if(mode==='production'&&!existsSync('.env'))throw new Error('Production mode requires .env. Use backend/.env.example as a template and configure your PostgreSQL database and secrets.')
 if(mode==='dev'){
  env.NODE_ENV='development'
  env.PORT='3001'
  env.ACE_DEPLOYMENT_MODE=env.ACE_DEPLOYMENT_MODE||'core'
  if(await portBusy(3001)||await portBusy(5173))throw new Error('Port 3001 or 5173 is already in use. Stop the existing application before starting this launcher.')
 }
 const fingerprint=createHash('sha256').update(readFileSync('package-lock.json')).update(process.versions.node).update(process.platform).digest('hex')
 const marker='node_modules/.ace-start-lock.sha256'
 if(!existsSync(marker)||readFileSync(marker,'utf8')!==fingerprint){
  console.log('[start] Installing dependencies from package-lock.json...')
  await run(['ci'],env)
  writeFileSync(marker,fingerprint)
 }
 if(mode==='production'){
  // Build in this wrapper to avoid spawning npm.cmd directly from run-local.
  await run(['run','build:frontend'],env)
  if((env.ACE_DEPLOYMENT_MODE||'core')!=='core')await run(['run','build:platform-admin'],env)
  start('production application',['scripts/run-local.mjs','--skip-build'],env)
 }else{
  console.log('[start] Local development: http://localhost:5173')
  console.log('[start] Frontend edits update automatically; backend edits restart the API. Ctrl+C stops both.')
  if(!env.DATABASE_URL)console.log('[start] No PostgreSQL configured: using the existing development embedded database. Durable data and queued integrations require PostgreSQL in .env.')
  if(env.DATABASE_URL){
   await new Promise((accept,reject)=>{
    const child=spawn(process.execPath,['backend/scripts/migrate.mjs'],{cwd:root,env,stdio:'inherit'})
    children.add(child);child.once('exit',()=>children.delete(child))
    child.once('error',reject);child.once('exit',code=>code===0?accept():reject(new Error('Database migrations failed ('+code+')')))
   })
   start('worker',['--watch','backend/src/worker.mjs'],env)
  }
  start('API',['--watch','backend/src/index.mjs'],env)
  start('frontend',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--strictPort'],env)
 }
}catch(error){console.error('[start] '+error.message);stop(1)}
