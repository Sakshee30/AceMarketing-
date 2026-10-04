import {execFileSync} from 'node:child_process'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {loadEnvFile} from '../load-env.mjs'
const root=resolve(import.meta.dirname,'../..')
process.chdir(root)
const env=await loadEnvFile('.env.live.local')
const pid=Number(await readFile('.tmp-tools/live/runtime.pid','utf8').catch(()=>0))
if(!Number.isSafeInteger(pid)||pid<=0)throw new Error('No live supervisor PID recorded.')
if(process.platform==='win32'){
  const command=execFileSync('powershell.exe',['-NoProfile','-Command',`(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}').CommandLine`],{encoding:'utf8'}).trim()
  if(!command.includes('scripts/live/run.mjs'))throw new Error('The recorded PID is not this live supervisor; no processes were stopped.')
  if(env.ACE_LIVE_WSL==='true'){
    const linuxRoot='/mnt/'+root[0].toLowerCase()+root.slice(2).replaceAll('\\','/')
    execFileSync('wsl.exe',['-d',env.ACE_LIVE_WSL_DISTRO||'Ubuntu','--',env.ACE_LIVE_WSL_PYTHON,linuxRoot+'/scripts/live/stop-ml.py'],{stdio:'inherit'})
  }
  execFileSync('taskkill',['/PID',String(pid),'/T','/F'],{stdio:'inherit'})
}else process.kill(pid,'SIGTERM')
console.log('[live] Local application, worker, ML service and feed stopped. Test database is retained.')
