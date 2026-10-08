import {spawn} from 'node:child_process'
import {loadEnvFile} from '../load-env.mjs'
const env=await loadEnvFile('.env.live.local')
env.PYTHONIOENCODING='utf-8'
const python=env.ACE_FEED_PYTHON||env.PYTHON_BIN||(process.platform==='win32'?'python':'python3')
const args=process.argv.includes('--test')?['-m','unittest','discover','-s','scripts/live','-p','test_year_feed.py']:process.argv.includes('--verify-continuity')?['scripts/live/verify_year_continuity.py',...process.argv.slice(2).filter(arg=>arg!=='--verify-continuity')]:['scripts/live/year_feed.py',...process.argv.slice(2)]
const child=spawn(python,args,{env,stdio:'inherit'})
child.on('error',error=>{console.error('Daily feed could not start: '+error.message+'. Set ACE_FEED_PYTHON to a working Python 3.9+ interpreter.');process.exitCode=1})
child.on('exit',code=>{process.exitCode=code??1})
process.on('SIGINT',()=>child.kill('SIGINT'))
process.on('SIGTERM',()=>child.kill('SIGTERM'))
