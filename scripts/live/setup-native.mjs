import {spawn} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import {mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {loadEnvFile} from '../load-env.mjs'

export async function setupNative(){
  const root=resolve(import.meta.dirname,'../..')
  const env=await loadEnvFile('.env.live.local',{})
  if(!env.DATABASE_URL||env.DATABASE_URL.includes('CHANGE_ME'))throw new Error('Copy .env.live.example to .env.live.local and set DATABASE_URL to a dedicated local PostgreSQL database first.')
  const database=new URL(env.DATABASE_URL)
  if(!['localhost','127.0.0.1','[::1]'].includes(database.hostname))throw new Error('Native demo setup requires a local database host. It must not target a shared or production database.')
  const run=(command,args)=>new Promise((accept,reject)=>{
    const child=spawn(command,args,{cwd:root,stdio:'inherit'})
    child.once('error',reject)
    child.once('exit',code=>code===0?accept():reject(new Error(`${command} exited ${code}`)))
  })
  const python=env.PYTHON_BIN||(process.platform==='win32'?'python':'python3')
  await run(python,['-c','import sys; assert (3,11) <= sys.version_info[:2] < (3,14), "Python 3.11-3.13 required"'])
  await mkdir('.tmp-tools/live',{recursive:true})
  await run(python,['-m','venv','.venv-live'])
  const venvPython=resolve(root,'.venv-live',process.platform==='win32'?'Scripts/python.exe':'bin/python')
  await run(venvPython,['-m','pip','install','-e',resolve(root,'ml-service')])
  const config={NODE_ENV:'development',PORT:'3001',DEFAULT_WORKSPACE_ID:'ws_default',ADMIN_EMAIL:'owner@example.com',ADMIN_PASSWORD:'demo123',ACE_LOCAL_PASSWORD:'demo123',ML_SERVICE_URL:'http://127.0.0.1:8000',ACE_ENABLE_AI:'true',ACE_ENABLE_CALL_TRACKING:'true',ACE_ENABLE_WHATSAPP:'true',WORKER_POLL_MS:'1000',ACE_LIVE_INTERVAL_MS:'3000',ACE_LIVE_AI_INTERVAL_MS:'60000',ACE_LIVE_STATUS_PORT:'5174',...env,ACE_LIVE_WSL:'false',PYTHON_BIN:venvPython,ML_ARTIFACT_DIR:resolve(root,'.tmp-tools/live/ml-artifacts'),AI_LIVE_PROVIDER_CALLS:'false',WORKER_RUN_SCHEDULERS:'false'}
  for(const key of ['JWT_SECRET','ML_SERVICE_AUTH_TOKEN','CALL_WEBHOOK_SECRET','WHATSAPP_APP_SECRET','WHATSAPP_WEBHOOK_VERIFY_TOKEN'])config[key]||=randomBytes(32).toString('hex')
  await writeFile('.env.live.local',Object.entries(config).map(([key,value])=>`${key}=${value}`).join('\n')+'\n',{mode:0o600})
  console.log('[live setup] Native Python ready. PostgreSQL must be running; npm run dev:live applies migrations and starts all services.')
}
