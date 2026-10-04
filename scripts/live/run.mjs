import {spawn,execFileSync} from 'node:child_process'
import {resolve} from 'node:path'
import {writeFile,mkdir} from 'node:fs/promises'
import {loadEnvFile} from '../load-env.mjs'
const root=resolve(import.meta.dirname,'../..')
process.chdir(root)
const env=await loadEnvFile('.env.live.local')
if(!env.DATABASE_URL||!env.ML_SERVICE_AUTH_TOKEN)throw new Error('Run npm run live:setup first, or configure .env.live.local as documented.')
if(env.NODE_ENV==='production')throw new Error('Live synthetic data mode requires NODE_ENV=development.')
await mkdir('.tmp-tools/live',{recursive:true})
const linuxRoot=process.platform==='win32'?'/mnt/'+root[0].toLowerCase()+root.slice(2).replaceAll('\\','/'):root
if(env.ACE_LIVE_WSL==='true'){
  const distro=env.ACE_LIVE_WSL_DISTRO||'Ubuntu'
  const host=execFileSync('wsl.exe',['-d',distro,'--','hostname','-I'],{encoding:'utf8'}).trim().split(/\s+/)[0]
  const database=new URL(env.DATABASE_URL);database.hostname=host;env.DATABASE_URL=database.toString()
  env.ML_SERVICE_URL='http://'+host+':8000'
  execFileSync('wsl.exe',['-d',distro,'-u','root','--','bash',linuxRoot+'/.tmp-tools/live/setup-db.sh'],{stdio:'inherit'})
}
const children=[]
let closing=false
function stop(code=0){
  if(closing)return
  closing=true
  if(env.ACE_LIVE_WSL==='true')spawn('wsl.exe',['-d',env.ACE_LIVE_WSL_DISTRO||'Ubuntu','--',env.ACE_LIVE_WSL_PYTHON,linuxRoot+'/scripts/live/stop-ml.py'],{stdio:'ignore'})
  for(const child of children){
    if(process.platform==='win32'&&child.pid)spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'})
    else if(child.pid){try{process.kill(-child.pid,'SIGTERM')}catch{child.kill('SIGTERM')}}
  }
  setTimeout(()=>process.exit(code),500).unref()
}
process.on('SIGINT',()=>stop())
process.on('SIGTERM',()=>stop())
const start=(name,command,args)=>{
  const child=spawn(command,args,{cwd:root,env,stdio:'inherit',detached:process.platform!=='win32'})
  children.push(child)
  child.once('error',error=>{console.error(`[live] ${name}: ${error.message}`);stop(1)})
  child.once('exit',code=>{if(!closing){console.error(`[live] ${name} exited (${code})`);stop(code||1)}})
  return child
}
const wait=async(url,timeout=120000)=>{
  const deadline=Date.now()+timeout
  while(!closing&&Date.now()<deadline){
    try{if((await fetch(url,{signal:AbortSignal.timeout(2000)})).ok)return}catch{}
    await new Promise(accept=>setTimeout(accept,500))
  }
  throw new Error(`${url} did not become healthy`)
}
// Do not attach a generator to an arbitrary API already occupying these ports.
for(const port of [3001,5173,5174,8000]){
  const net=await import('node:net')
  const busy=await new Promise(accept=>{
    const socket=net.createConnection({host:'127.0.0.1',port})
    socket.setTimeout(500)
    socket.once('connect',()=>{socket.destroy();accept(true)})
    socket.once('error',()=>accept(false))
    socket.once('timeout',()=>{socket.destroy();accept(false)})
  })
  if(busy)throw new Error(`Port ${port} is occupied. Stop the existing local development process first.`)
}
await writeFile('.tmp-tools/live/runtime.pid',String(process.pid))
const migration=spawn(process.execPath,['backend/scripts/migrate.mjs'],{cwd:root,env,stdio:'inherit'})
await new Promise((accept,reject)=>{migration.once('error',reject);migration.once('exit',code=>code===0?accept():reject(new Error('Migrations failed')))})
const watch=entry=>process.platform==='linux'?['--watch',entry]:['--watch','--watch-path=backend/src','--watch-path=backend/modules','--watch-path=backend/migrations',entry]
try{
  if(env.ACE_LIVE_WSL==='true'){
    start('ML','wsl.exe',['-d',env.ACE_LIVE_WSL_DISTRO||'Ubuntu','--',env.ACE_LIVE_WSL_PYTHON,linuxRoot+'/scripts/live/ml-server.py'])
  }else start('ML',env.PYTHON_BIN||'python',['scripts/live/ml-server.py'])
  start('API',process.execPath,watch('backend/src/index.mjs'))
  start('worker',process.execPath,watch('backend/src/worker.mjs'))
  start('frontend',process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--strictPort'])
  await Promise.all([wait('http://127.0.0.1:3001/api/health'),wait('http://127.0.0.1:5173'),wait(env.ML_SERVICE_URL+'/health')])
  if(!process.argv.includes('--no-feed'))start('generator',process.execPath,process.platform==='linux'?['--watch','scripts/live/generator.mjs']:['--watch','--watch-path=scripts/live','scripts/live/generator.mjs'])
  console.log('[live] Application http://localhost:5173 | Live feed and coverage http://localhost:5174')
}catch(error){console.error(error.message);stop(1)}
