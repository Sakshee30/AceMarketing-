// One command for the feature-wise end-to-end test of the running local stack:
// Python API journeys and checks, browser sweep of every page, then the merged report.
//   npm run live:verify:features [-- --out=artifacts/testing-YYYYMMDD --cycles=2]
import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'
import {loadEnvFile} from '../load-env.mjs'

process.chdir(resolve(import.meta.dirname,'../..'))
const env=await loadEnvFile('.env.live.local')
const options=Object.fromEntries(process.argv.slice(2).map(arg=>{const [key,...rest]=arg.replace(/^--/,'').split('=');return [key,rest.join('=')||'true']}))
const out=options.out||'.tmp-tools/live/verification'
const python=env.ACE_FEED_PYTHON||(env.ACE_LIVE_WSL==='true'?'':env.PYTHON_BIN)||'python'
const run=(command,args)=>spawnSync(command,args,{stdio:'inherit',env:{...process.env,PYTHONIOENCODING:'utf-8'}}).status
const api=run(python,['scripts/live/ace_feed.py','--verify','--cycles='+(options.cycles||1),'--report-dir='+out])
const ui=run(process.execPath,['scripts/live/ui-sweep.mjs','--out='+out])
run(python,['scripts/live/ace_feed.py','--verify','--report-only','--report-dir='+out])
console.log(`[live verify] API checks ${api===0?'passed':'FAILED'} · browser sweep ${ui===0?'passed':'FAILED'} · report ${out}/feature-report.html`)
process.exitCode=api||ui?1:0
