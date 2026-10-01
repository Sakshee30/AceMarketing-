import {spawn} from 'node:child_process'
import {existsSync} from 'node:fs'
import {loadEnvFile} from './load-env.mjs'

const args=new Map(process.argv.slice(2).map(arg=>{
  const raw=arg.replace(/^--/,'')
  const [key,...rest]=raw.split('=')
  return [key,rest.length?rest.join('='):'true']
}))
const env=await loadEnvFile('.env')
if(args.get('mode'))env.ACE_DEPLOYMENT_MODE=args.get('mode')
env.ACE_DEPLOYMENT_MODE=env.ACE_DEPLOYMENT_MODE||'core'
env.NODE_ENV=env.NODE_ENV||'production'
Object.assign(process.env,env)
const {deploymentMode}=await import('../backend/src/platform/deployment-mode.mjs')
const mode=deploymentMode()

const children=[]
let stopping=false
const runOnce=(name,command,commandArgs,options={})=>new Promise((resolve,reject)=>{
  const child=spawn(command,commandArgs,{stdio:'inherit',env,cwd:process.cwd(),...options})
  child.once('exit',code=>code===0?resolve():reject(new Error(name+' failed with exit code '+String(code))))
  child.once('error',reject)
})
const start=(name,command,commandArgs,childEnv=env)=>{
  const child=spawn(command,commandArgs,{stdio:'inherit',env:childEnv,cwd:process.cwd()})
  children.push({name,child})
  child.once('exit',code=>{
    if(!stopping){
      console.error('[run-local] '+name+' exited unexpectedly ('+String(code)+')')
      shutdown(code||1)
    }
  })
  return child
}
const shutdown=code=>{
  if(stopping)return
  stopping=true
  for(const {child} of children)if(!child.killed)child.kill('SIGTERM')
  setTimeout(()=>process.exit(code),300).unref()
}

console.log('[run-local] deployment mode:',mode.name,mode.features)
if(mode.features.ai){
  env.ML_SERVICE_URL=env.ML_SERVICE_URL||'http://127.0.0.1:8000'
  if(mode.features.aiForecasting)env.ML_FORECAST_SERVICE_URL=env.ML_FORECAST_SERVICE_URL||env.ML_SERVICE_URL
  if(mode.features.aiCausal)env.ML_CAUSAL_SERVICE_URL=env.ML_CAUSAL_SERVICE_URL||env.ML_SERVICE_URL
  if(mode.features.aiMmm)env.ML_MMM_SERVICE_URL=env.ML_MMM_SERVICE_URL||env.ML_SERVICE_URL
  Object.assign(process.env,env)
}
if(args.get('skip-migrate')!=='true')await runOnce('migrations',process.execPath,['backend/scripts/migrate.mjs'])
if(args.get('skip-preflight')!=='true')await runOnce('preflight',process.execPath,['backend/scripts/preflight.mjs'])

const skipBuild=args.get('skip-build')==='true'||env.ACE_SKIP_BUILD==='true'
if(!skipBuild){
  await runOnce('frontend build',process.platform==='win32'?'npm.cmd':'npm',['run','build:frontend'])
  if(mode.features.controlPlane)await runOnce('platform admin build',process.platform==='win32'?'npm.cmd':'npm',['run','build:platform-admin'])
}

if(!existsSync('dist/frontend/index.html'))throw new Error('dist/frontend/index.html missing; run npm run build:frontend or remove --skip-build')

const runtimeEnv={...env}

start('api',process.execPath,['backend/src/index.mjs'],runtimeEnv)
start('worker',process.execPath,['backend/src/worker.mjs'],runtimeEnv)
start('web',process.execPath,['scripts/static-server.mjs','--dir=dist/frontend','--port='+(runtimeEnv.ACE_HTTP_PORT||'8080'),'--api-target=http://127.0.0.1:'+(runtimeEnv.PORT||'3001')],runtimeEnv)

if(mode.features.controlPlane){
  if(!existsSync('dist/platform-admin/index.html'))throw new Error('dist/platform-admin/index.html missing; run npm run build:platform-admin')
  start('control-api',process.execPath,['backend/src/control-api.mjs'],runtimeEnv)
  start('platform-admin',process.execPath,['scripts/static-server.mjs','--dir=dist/platform-admin','--port='+(runtimeEnv.ACE_CONTROL_HTTP_PORT||'8081'),'--api-target=http://127.0.0.1:'+(runtimeEnv.CONTROL_PORT||'3002')],runtimeEnv)
}

if(mode.features.ai&&args.get('external-ml')!=='true'&&runtimeEnv.ACE_EXTERNAL_ML!=='true'){
  const python=runtimeEnv.PYTHON_BIN|| (process.platform==='win32'?'python':'python3')
  start('ml-service',python,['-m','uvicorn','acemarketing_ml.app:app','--app-dir','ml-service/src','--host','127.0.0.1','--port','8000'],runtimeEnv)
}

console.log('[run-local] AceMarketing started without Docker')
console.log('[run-local] web: http://127.0.0.1:'+(runtimeEnv.ACE_HTTP_PORT||'8080'))
console.log('[run-local] api: http://127.0.0.1:'+(runtimeEnv.PORT||'3001'))
if(mode.features.controlPlane)console.log('[run-local] control: http://127.0.0.1:'+(runtimeEnv.ACE_CONTROL_HTTP_PORT||'8081'))
process.on('SIGINT',()=>shutdown(0))
process.on('SIGTERM',()=>shutdown(0))
