import {spawn,execFileSync} from 'node:child_process'
import {mkdir,writeFile} from 'node:fs/promises'
import {randomBytes} from 'node:crypto'
import {resolve} from 'node:path'
import {loadEnvFile} from '../load-env.mjs'

// This setup is deliberately separate from normal development and production.
const root=resolve(import.meta.dirname,'../..')
process.chdir(root)
if(process.argv.includes('--native')){
  const {setupNative}=await import('./setup-native.mjs')
  await setupNative()
  process.exit(0)
}
const run=(command,args,input)=>new Promise((accept,reject)=>{
  const child=spawn(command,args,{cwd:root,stdio:[input?'pipe':'ignore','inherit','inherit']})
  if(input)child.stdin.end(input)
  child.once('error',reject)
  child.once('exit',code=>code===0?accept():reject(new Error(`${command} exited ${code}`)))
})
if(process.platform!=='win32')throw new Error('This automatic setup targets Windows + Ubuntu WSL. On other platforms configure .env.live.local with native PostgreSQL and PYTHON_BIN; see LOCAL_LIVE_TESTING.md.')
await mkdir('.tmp-tools/live',{recursive:true})
const env=await loadEnvFile('.env.live.local',{})
const secret=()=>randomBytes(32).toString('hex')
const password=env.ACE_LIVE_DB_PASSWORD||secret()
if(!/^[a-f0-9]{64}$/.test(password))throw new Error('ACE_LIVE_DB_PASSWORD must be the generated 64-character hex password.')
const wslHost=execFileSync('wsl.exe',['-d','Ubuntu','--','hostname','-I'],{encoding:'utf8'}).trim().split(/\s+/)[0]
if(!/^\d+\.\d+\.\d+\.\d+$/.test(wslHost))throw new Error('Could not determine the Ubuntu WSL IPv4 address')
const config={
  NODE_ENV:'development',PORT:'3001',DEFAULT_WORKSPACE_ID:'ws_default',
  DATABASE_URL:`postgresql://ace_live:${password}@127.0.0.1:5432/ace_live`,
  ACE_LIVE_DB_PASSWORD:password,ADMIN_EMAIL:'owner@example.com',ADMIN_PASSWORD:'demo123',ACE_LOCAL_PASSWORD:'demo123',
  JWT_SECRET:secret(),ML_SERVICE_URL:'http://127.0.0.1:8000',ML_SERVICE_AUTH_TOKEN:secret(),
  CALL_WEBHOOK_SECRET:secret(),WHATSAPP_APP_SECRET:secret(),WHATSAPP_WEBHOOK_VERIFY_TOKEN:secret(),
  ACE_ENABLE_AI:'true',ACE_ENABLE_CALL_TRACKING:'true',ACE_ENABLE_WHATSAPP:'true',
  AI_LIVE_PROVIDER_CALLS:'false',WORKER_RUN_SCHEDULERS:'false',WORKER_POLL_MS:'1000',
  ACE_LIVE_INTERVAL_MS:'3000',ACE_LIVE_AI_INTERVAL_MS:'60000',ACE_LIVE_STATUS_PORT:'5174',
  ACE_LIVE_WSL:'true',ACE_LIVE_WSL_DISTRO:'Ubuntu',
  ACE_LIVE_WSL_PYTHON:'/home/aceqa/.venvs/ace-live/bin/python',
  ...env,
  DATABASE_URL:`postgresql://ace_live:${password}@${wslHost}:5435/ace_live`,
  ML_SERVICE_URL:`http://${wslHost}:8000`
}
await writeFile('.env.live.local',Object.entries(config).map(([k,v])=>`${k}=${v}`).join('\n')+'\n')
// Names and credentials are fixed or hex-only; SQL is passed on stdin, never interpolated into a shell command.
const sql=`SELECT 'CREATE ROLE ace_live LOGIN PASSWORD ''${password}''' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname='ace_live')\n\\gexec\nSELECT 'CREATE DATABASE ace_live OWNER ace_live' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='ace_live')\n\\gexec\n`
const linuxRoot='/mnt/'+root[0].toLowerCase()+root.slice(2).replaceAll('\\','/')
const dbSetup=`#!/bin/bash\nset -euo pipefail\nif [ ! -d /etc/postgresql/18/ace-live ]; then\n pg_createcluster 18 ace-live --port 5435 -- --auth-local=peer --auth-host=scram-sha-256\n printf "\\nlisten_addresses = '*'\\n" >> /etc/postgresql/18/ace-live/postgresql.conf\n printf "\\nhost ace_live ace_live 0.0.0.0/0 scram-sha-256\\n" >> /etc/postgresql/18/ace-live/pg_hba.conf\nfi\npg_ctlcluster --skip-systemctl 18 ace-live start || pg_ctlcluster 18 ace-live status\n`
await writeFile('.tmp-tools/live/setup-db.sh',dbSetup)
await run('wsl.exe',['-d','Ubuntu','-u','root','--','bash',linuxRoot+'/.tmp-tools/live/setup-db.sh'])
await run('wsl.exe',['-d','Ubuntu','-u','root','--','runuser','-u','postgres','--','psql','-p','5435','-v','ON_ERROR_STOP=1'],sql)
const setup=`#!/bin/bash\nset -euo pipefail\n/opt/ace-qa-python-runtime/bin/python3 -m venv /home/aceqa/.venvs/ace-live\nln -sfn /opt/ace-qa-python-runtime/bin/python3.13 /home/aceqa/.venvs/ace-live/bin/python\n/home/aceqa/.venvs/ace-live/bin/python -m pip install -e '${linuxRoot}/ml-service'\nchown -R aceqa:aceqa /home/aceqa/.venvs/ace-live\n`
await writeFile('.tmp-tools/live/setup-ml.sh',setup)
await run('wsl.exe',['-d','Ubuntu','-u','root','--','bash',linuxRoot+'/.tmp-tools/live/setup-ml.sh'])
console.log('[live setup] Native test database and ML environment ready. Run npm run dev:live. Local secrets are in ignored .env.live.local.')
