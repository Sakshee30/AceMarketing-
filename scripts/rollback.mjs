import {readFile} from 'node:fs/promises'
import {spawn} from 'node:child_process'

const manifestPath=process.argv[2]
if(!manifestPath){
  console.error('Usage: node scripts/rollback.mjs <release-manifest.json> [core|standard|full]')
  process.exit(2)
}
const mode=process.argv[3]||process.env.ACE_DEPLOYMENT_MODE||'core'
const manifest=JSON.parse(await readFile(manifestPath,'utf8'))
if(manifest.schemaVersion!=='ace.release.v1')throw new Error('unsupported release manifest schema')
const artifacts=manifest.artifacts||{}
for(const required of ['api','worker','web']){
  if(!artifacts[required])throw new Error('release manifest missing artifact: '+required)
}

const env={
  ...process.env,
  ACE_DEPLOYMENT_MODE:mode,
  ACE_API_IMAGE:String(artifacts.api),
  ACE_WORKER_IMAGE:String(artifacts.worker),
  ACE_WEB_IMAGE:String(artifacts.web)
}
if(artifacts.controlApi)env.ACE_CONTROL_API_IMAGE=String(artifacts.controlApi)
if(artifacts.platformAdmin)env.ACE_PLATFORM_ADMIN_IMAGE=String(artifacts.platformAdmin)

console.log('[rollback] application rollback target:',manifest.commit||manifest.ref||manifestPath)
console.log('[rollback] database migrations are NOT reversed automatically.')
console.log('[rollback] ensure the selected application release is compatible with the current forward schema.')
const child=spawn(process.execPath,['scripts/stack.mjs','up','--mode='+mode,'--no-build'],{
  stdio:'inherit',env,cwd:process.cwd()
})
child.once('exit',code=>process.exit(code??1))
child.once('error',error=>{console.error(error.message);process.exit(1)})
