import test,{before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import pg from 'pg'
import {enqueueJob,getJob} from '../../backend/src/queue.mjs'
import {pool} from '../../backend/src/database.mjs'
import {withTenantDbTransaction} from '../../backend/src/platform/tenant-db.mjs'
if(process.env.QA_ISOLATED!=='1')throw new Error('Isolated harness required')
const actors=JSON.parse(readFileSync(process.env.QA_ACTORS_FILE,'utf8'))
const a=actors.find(x=>x.id.endsWith('000001')),b=actors.find(x=>x.id.endsWith('000009'))
const analyst=actors.find(x=>x.id.endsWith('000004'))
const base=process.env.QA_API_URL
const admin=new pg.Client({connectionString:process.env.QA_ADMIN_DATABASE_URL})
let tokenA,tokenB,analystToken
async function request(path,{method='GET',body,token,workspace=a.workspaceId,headers={}}={}){
 const r=await fetch(base+path,{method,headers:{'X-Workspace-ID':workspace,...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)})
 const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={invalidJson:true}}
 return {status:r.status,data,headers:r.headers}
}
async function login(actor){const r=await request('/api/auth/login',{method:'POST',workspace:actor.workspaceId,body:{email:actor.email,password:actor.password}});assert.equal(r.status,200,'real seeded login succeeds');assert.equal(typeof r.data.token,'string');return r.data.token}
before(async()=>{await admin.connect();tokenA=await login(a);tokenB=await login(b);analystToken=await login(analyst)})
after(async()=>{await admin.end();await pool.end()})
test('AUTH-001 support: production authenticated identity is scoped to actual member',async()=>{const r=await request('/api/auth/me',{token:tokenA});assert.equal(r.status,200);assert.equal(r.data.user.email,a.email);assert.equal(r.data.workspaceId,a.workspaceId)})
test('AUTH-002 support: incorrect password denied in production',async()=>{assert.equal((await request('/api/auth/login',{method:'POST',body:{email:a.email,password:'Wrong-Not-A-Credential-123'}})).status,401)})
test('AUTH-006 support: missing credentials denied',async()=>{assert.equal((await request('/api/members')).status,401)})
test('AUTH token-integrity support: tampered token rejected',async()=>{assert.equal((await request('/api/auth/me',{token:tokenA+'.extra'})).status,401)})
test('TEN-002 support: foreign workspace header denied',async()=>{assert.equal((await request('/api/auth/me',{token:tokenA,workspace:b.workspaceId})).status,403)})
test('TEN-005 support: analyst cannot create a form',async()=>{assert.equal((await request('/api/forms',{method:'POST',token:analystToken,body:{name:'Forbidden',slug:'forbidden',schema:{fields:[{key:'email',type:'email'}]}}})).status,403)})
test('SEC support: credential fields are absent from member response',async()=>{const r=await request('/api/members',{token:tokenA});assert.equal(r.status,200);assert.ok(!JSON.stringify(r.data).includes('passwordHash'));assert.ok(!JSON.stringify(r.data).includes(a.password))})
test('SEC support: unapproved web origin rejected',async()=>{assert.equal((await request('/api/auth/me',{token:tokenA,headers:{Origin:'https://foreign.example.test'}})).status,403)})
test('TEN support: invalid scope identifier rejected',async()=>{assert.equal((await request('/api/auth/me',{token:tokenA,workspace:'../foreign'})).status,400)})
test('AUTH-003 support: actual logout revokes persisted session',async()=>{const token=await login(a);assert.equal((await request('/api/auth/logout',{method:'POST',token,body:{}})).status,200);assert.equal((await request('/api/auth/me',{token})).status,401)})
test('TEN-003 support: runtime database role does not bypass RLS',async()=>{const {rows}=await pool.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user');assert.equal(rows[0].rolsuper,false);assert.equal(rows[0].rolbypassrls,false)})
test('FORM lifecycle support: create, publish, submit, replay and observe persisted rows',async()=>{
 let r=await request('/api/forms',{method:'POST',token:tokenA,body:{name:'QA Lead Intake',slug:'qa-lead-intake',schema:{fields:[{key:'email',type:'email',required:true,maxLength:200},{key:'score',type:'integer'}]}}});assert.equal(r.status,201,JSON.stringify(r.data));const id=r.data.id;assert.ok(id)
 r=await request(`/api/forms/${id}/publish`,{method:'POST',token:tokenA,body:{}});assert.equal(r.status,200);assert.equal(r.data.status,'published')
 const input={data:{email:'synthetic@example.test',score:80},submissionId:'qa_submission_idempotent'}
 const one=await request(`/api/forms/${id}/submissions`,{method:'POST',token:tokenA,body:input});assert.equal(one.status,201,JSON.stringify(one.data))
 const two=await request(`/api/forms/${id}/submissions`,{method:'POST',token:tokenA,body:input});assert.equal(two.status,201);assert.equal(one.data.id,two.data.id)
 const list=await request(`/api/forms/${id}/submissions`,{token:tokenA});assert.equal(list.status,200);assert.equal(list.data.items.filter(x=>x.id===one.data.id).length,1)
 for(const data of [{email:'bad'},{email:'ok@example.test',unknown:'denied'},{score:80},{email:'ok@example.test',score:'abc'}])assert.equal((await request(`/api/forms/${id}/submissions`,{method:'POST',token:tokenA,body:{data}})).status,400)
 assert.equal((await request(`/api/forms/${id}`,{token:tokenB,workspace:b.workspaceId})).status,404)
 const other=await request(`/api/forms/${id}/submissions`,{token:tokenB,workspace:b.workspaceId});assert.ok(other.status===404||(other.status===200&&other.data.items.length===0))
})
test('BOARD support: real create, retrieve and foreign resource denial',async()=>{const r=await request('/api/boards',{method:'POST',token:tokenA,body:{name:'QA Synthetic Board'}});assert.equal(r.status,201,JSON.stringify(r.data));const id=r.data.item.id;assert.equal((await request('/api/boards/'+id,{token:tokenA})).status,200);assert.equal((await request('/api/boards/'+id,{token:tokenB,workspace:b.workspaceId})).status,404)})
test('TRACK-004 support: missing consent denies analytics tracking',async()=>{const r=await request('/api/track',{method:'POST',body:{id:'qa_denied',visitorId:'qa_no_consent',event:'page_view',eventCategory:'analytics'}});assert.equal(r.status,403);assert.equal(r.data.accepted,false)})
test('TRACK support: consent, tracking, deduplication, redaction and revoke',async()=>{
 const subject='qa_consented_visitor';const c={subjectId:subject,subjectType:'visitor',analytics:true,marketing:false,personalization:false}
 assert.equal((await request('/api/consent',{method:'POST',body:c})).status,200)
 const body={id:'qa_exact_event',visitorId:subject,event:'page_view',eventCategory:'analytics',email:'synthetic@example.test',value:0,occurredAt:'2026-09-10T00:00:00Z'}
 for(let i=0;i<2;i++){const r=await request('/api/track',{method:'POST',body});assert.equal(r.status,202,JSON.stringify(r.data));assert.equal(r.data.eventId,body.id)}
 const rows=await withTenantDbTransaction(a.workspaceId,async db=>(await db.query('SELECT id,payload,email_sha256 FROM ace_events WHERE id=$1',[body.id])).rows)
 assert.equal(rows.length,1);assert.equal(rows[0].payload.email,undefined);assert.match(rows[0].email_sha256,/^[a-f0-9]{64}$/)
 assert.equal((await pool.query('SELECT id FROM ace_events')).rowCount,0,'no tenant context reveals no RLS rows')
 const foreign=await withTenantDbTransaction(b.workspaceId,async db=>(await db.query('SELECT id FROM ace_events WHERE id=$1',[body.id])).rows);assert.equal(foreign.length,0)
 assert.equal((await request('/api/consent',{method:'POST',body:{...c,analytics:false}})).status,200)
 assert.equal((await request('/api/track',{method:'POST',body:{...body,id:'qa_after_revoke'}})).status,403)
})
test('TRACK-005 support: malformed timestamp rejected without durable partial effect',async()=>{
 const body={id:'qa_bad_timestamp',visitorId:'qa_bad_time',event:'page_view',eventCategory:'essential',occurredAt:'not-a-date'}
 const r=await request('/api/track',{method:'POST',body});assert.equal(r.status,400,'invalid timestamp is a client validation error')
 const {rows}=await admin.query('SELECT state FROM ace_workspace_state WHERE workspace_id=$1',[a.workspaceId]);assert.ok(!(rows[0]?.state?.recentEvents||[]).some(x=>x.id===body.id),'reject must not enter recent events')
})
test('JOBS support: independent worker finishes one logical audit export after duplicate enqueue',async()=>{
 const input={workspaceId:a.workspaceId,kind:'audit_export',payload:{limit:20},idempotencyKey:'qa_audit_export_once'}
 const one=await enqueueJob(input),two=await enqueueJob(input);assert.equal(one.id,two.id)
 const until=Date.now()+25000;let job
 do{job=await getJob({workspaceId:a.workspaceId,id:one.id});if(['succeeded','dead_letter'].includes(job?.status))break;await new Promise(r=>setTimeout(r,200))}while(Date.now()<until)
 assert.equal(job?.status,'succeeded',job?.last_error||'worker failed to complete');assert.equal(job.result.schemaVersion,'audit-export.v1');assert.equal(job.result.workspaceId,a.workspaceId)
 assert.equal(await getJob({workspaceId:b.workspaceId,id:one.id}),null)
})
