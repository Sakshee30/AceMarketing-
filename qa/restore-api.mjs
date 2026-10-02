import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
if(process.env.QA_ISOLATED!=='1'||process.env.QA_API_URL!=='http://127.0.0.1:3002')throw new Error('Disposable restored API required')
const actor=JSON.parse(readFileSync(process.env.QA_ACTORS_FILE,'utf8')).find(a=>a.id.endsWith('000001'))
const headers={'Content-Type':'application/json','X-Workspace-ID':actor.workspaceId}
const r=await fetch(process.env.QA_API_URL+'/api/auth/login',{method:'POST',headers,body:JSON.stringify({email:actor.email,password:actor.password})})
assert.equal(r.status,200);const {token}=await r.json()
const me=await fetch(process.env.QA_API_URL+'/api/auth/me',{headers:{...headers,Authorization:'Bearer '+token}});assert.equal(me.status,200);assert.equal((await me.json()).user.email,actor.email)
const leads=await fetch(process.env.QA_API_URL+'/api/enrich',{headers:{...headers,Authorization:'Bearer '+token}});assert.equal(leads.status,200)
const data=await leads.json();const fixtureRows=data.items.filter(x=>String(x.leadId).startsWith('qa_ace_v1_lead_'))
assert.equal(fixtureRows.length,25)
writeFileSync(process.env.QA_REPORTS+'/restored-api.json',JSON.stringify({login:'PASS',authMe:'PASS',fixtureLeadRead:'PASS',primaryWorkspaceFixtureLeads:fixtureRows.length,scope:'restored database and same candidate/API runtime; not host or object-store recovery'},null,2))
