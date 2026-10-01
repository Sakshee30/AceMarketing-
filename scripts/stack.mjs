import {spawn} from 'node:child_process'
import {loadEnvFile} from './load-env.mjs'

const rawArgs=process.argv.slice(2)
const options=new Map(rawArgs.filter(x=>x.startsWith('--')).map(arg=>{
  const [key,...rest]=arg.slice(2).split('=')
  return [key,rest.length?rest.join('='):'true']
}))
const action=rawArgs.find(x=>!x.startsWith('--'))||'up'
const env=await loadEnvFile('.env')
if(options.get('mode'))env.ACE_DEPLOYMENT_MODE=options.get('mode')
env.ACE_DEPLOYMENT_MODE=env.ACE_DEPLOYMENT_MODE||'core'
Object.assign(process.env,env)
const {deploymentMode}=await import('../backend/src/platform/deployment-mode.mjs')
const mode=deploymentMode()

const profiles=[]
if(mode.features.controlPlane)profiles.push('control')
if(mode.features.ai)profiles.push('ai')
if(mode.features.aiForecasting)profiles.push('ai-forecasting')
if(mode.features.aiCausal)profiles.push('ai-causal')
if(mode.features.aiMmm)profiles.push('ai-mmm')

if(mode.features.ai){
  env.ML_SERVICE_URL=env.ML_SERVICE_URL||'http://ml-service:8000'
  if(mode.features.aiForecasting)env.ML_FORECAST_SERVICE_URL=env.ML_FORECAST_SERVICE_URL||'http://ml-forecasting:8000'
  if(mode.features.aiCausal)env.ML_CAUSAL_SERVICE_URL=env.ML_CAUSAL_SERVICE_URL||'http://ml-causal:8000'
  if(mode.features.aiMmm)env.ML_MMM_SERVICE_URL=env.ML_MMM_SERVICE_URL||'http://ml-mmm:8000'
}

const args=['compose']
for(const profile of profiles)args.push('--profile',profile)

if(action==='up'){
  args.push('up','-d')
  if(options.get('no-build')!=='true')args.push('--build')
}else if(action==='down')args.push('down')
else if(action==='pull')args.push('pull')
else if(action==='ps')args.push('ps')
else if(action==='logs')args.push('logs','-f')
else if(action==='restart')args.push('restart')
else throw new Error('unsupported stack action: '+action)

console.log('[stack] mode='+mode.name+' profiles='+(profiles.join(',')||'core-only'))
const child=spawn(process.platform==='win32'?'docker.exe':'docker',args,{stdio:'inherit',env,cwd:process.cwd()})
child.once('exit',code=>process.exit(code??1))
child.once('error',error=>{console.error('[stack] failed to start Docker:',error.message);process.exit(1)})
