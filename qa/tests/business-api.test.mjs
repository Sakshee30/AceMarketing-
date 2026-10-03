import test,{before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import pg from 'pg'
if(process.env.QA_ISOLATED!=='1')throw new Error('Isolated harness required')
const actors=JSON.parse(readFileSync(process.env.QA_ACTORS_FILE,'utf8'))
const a=actors.find(x=>x.id.endsWith('000001')),b=actors.find(x=>x.id.endsWith('000009')),approver=actors.find(x=>x.id.endsWith('000003'))
const base=process.env.QA_API_URL,admin=new pg.Client({connectionString:process.env.QA_ADMIN_DATABASE_URL})
const tokens=new Map();let tokenA,tokenB,approverToken,createdWorkspace
const diagnostics=[]
async function req(path,{method='GET',body,token,workspace=a.workspaceId}={}){
 const r=await fetch(base+path,{method,headers:{'X-Workspace-ID':workspace,...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)})
 const text=await r.text();let data;try{data=JSON.parse(text)}catch{throw new Error(path+' did not return JSON')}
 return {status:r.status,data}
}
async function login(actor){const r=await req('/api/auth/login',{method:'POST',workspace:actor.workspaceId,body:{email:actor.email,password:actor.password}});assert.equal(r.status,200);return r.data.token}
before(async()=>{await admin.connect();tokenA=await login(a);tokenB=await login(b);approverToken=await login(approver)})
after(async()=>{writeFileSync(process.env.QA_REPORTS+'/business-observations.json',JSON.stringify(diagnostics,null,2));await admin.end()})
for(const path of JSON.parse(readFileSync(new URL('../feature-read-paths.json',import.meta.url)))){
 test('Authenticated feature-read smoke '+path,async()=>{
  const r=await req('/api'+path,{token:tokenA});diagnostics.push({path,status:r.status,scope:'read smoke, not full feature qualification'})
  assert.equal(r.status,200,JSON.stringify(r.data));assert.ok(r.data&&typeof r.data==='object')
  assert.ok(!JSON.stringify(r.data).includes(a.password),'test password must not leak')
 })
}
test('LEAD sample: all 100 supplied source rows upsert and replay in their original workspace',async()=>{
 const leads=JSON.parse(gunzipSync(readFileSync(new URL('../fixtures/leads.json.gz',import.meta.url))))
 assert.equal(leads.length,100)
 const ids=[]
 for(const lead of leads){
  const owner=actors.find(x=>x.workspaceId===lead.workspace_id&&x.role==='owner');assert.ok(owner,'explicit authorized fixture membership required for '+lead.workspace_id)
  if(!tokens.has(owner.workspaceId))tokens.set(owner.workspaceId,await login(owner))
  const input={externalLeadId:lead.lead_id,name:lead.display_name,email:lead.email,source:'synthetic_fixture',campaign:lead.campaign_id,crmStage:lead.stage,lastActivity:lead.updated_at,attributes:{fixtureVersion:lead.fixture_version,sourceRecordId:lead.source_record_id,sourceWorkspaceId:lead.workspace_id}}
  const r=await req('/api/enrich/upsert',{method:'POST',token:tokens.get(owner.workspaceId),workspace:owner.workspaceId,body:input});assert.equal(r.status,201,JSON.stringify(r.data));assert.equal(r.data.leadId,lead.lead_id)
  const replay=await req('/api/enrich/upsert',{method:'POST',token:tokens.get(owner.workspaceId),workspace:owner.workspaceId,body:input});assert.equal(replay.status,201);assert.equal(replay.data.id,r.data.id)
  ids.push(lead.lead_id)
 }
 const {rows}=await admin.query('SELECT external_lead_id,workspace_id,name,email_sha256 FROM ace_lead_profiles WHERE external_lead_id=ANY($1::text[])',[ids]);assert.equal(rows.length,100)
 for(const lead of leads){const r=rows.find(x=>x.external_lead_id===lead.lead_id);assert.equal(r.workspace_id,lead.workspace_id);assert.equal(r.name,lead.display_name);assert.match(r.email_sha256,/^[a-f0-9]{64}$/)}
 for(const [ws,token] of tokens){const r=await req('/api/enrich',{token,workspace:ws});assert.equal(r.status,200);for(const item of r.data.items.filter(x=>ids.includes(x.leadId)))assert.equal(leads.find(l=>l.lead_id===item.leadId).workspace_id,ws)}
 diagnostics.push({fixture:'leads.json.gz',imported:100,replayed:100,distinctPersisted:100,mappedFields:['lead_id','display_name','email','campaign_id','stage','updated_at'],qualification:'lead import/idempotency/scoping only; not score-band, provider ingestion or all 10,000 leads'})
})
test('FLOW: versioned approval lifecycle enforces separation of duties and tenant isolation',async()=>{
 const definition={trigger:'manual',nodes:[{id:'start',type:'start'},{id:'approval',type:'approval'},{id:'end',type:'end'}],edges:[{from:'start',to:'approval'},{from:'approval',to:'end'}]}
 let r=await req('/api/workflows',{method:'POST',token:tokenA,body:{name:'QA Approval Lifecycle',definition}});assert.equal(r.status,201,JSON.stringify(r.data));const id=r.data.id
 assert.equal((await req('/api/workflows/'+id,{token:tokenB,workspace:b.workspaceId})).status,404)
 r=await req('/api/workflows/'+id+'/publish',{method:'POST',token:tokenA,body:{}});assert.equal(r.status,200)
 r=await req('/api/workflows/'+id+'/executions',{method:'POST',token:tokenA,body:{}});assert.equal(r.status,202);const execution=r.data.id
 r=await req('/api/workflows/executions/'+execution+'/approvals',{method:'POST',token:tokenA,body:{nodeId:'approval'}});assert.equal(r.status,201,JSON.stringify(r.data));const approval=r.data.id
 r=await req('/api/workflows/approvals/'+approval+'/decision',{method:'POST',token:tokenA,body:{decision:'approved'}});assert.equal(r.status,403,JSON.stringify(r.data));assert.equal(r.data.code,'workflow_separation_of_duties')
 r=await req('/api/workflows/approvals/'+approval+'/decision',{method:'POST',token:tokenB,workspace:b.workspaceId,body:{decision:'approved'}});assert.equal(r.status,404)
 r=await req('/api/workflows/approvals/'+approval+'/decision',{method:'POST',token:approverToken,body:{decision:'approved'}});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.status,'approved')
 r=await req('/api/workflows/'+id+'/versions',{method:'POST',token:tokenA,body:{definition}});assert.equal(r.status,201)
 const {rows}=await admin.query('SELECT workflow_version FROM ace_workflow_executions WHERE id=$1',[execution]);assert.equal(Number(rows[0].workflow_version),1)
 r=await req('/api/workflows/executions/'+execution+'/cancel',{method:'POST',token:tokenA,body:{}});assert.equal(r.status,200);assert.equal(r.data.status,'cancelled')
})
test('TEN: workspace registry never lists another creator workspace',async()=>{
 const r=await req('/api/workspaces',{method:'POST',token:tokenA,body:{name:'QA_PRIVATE_A_WORKSPACE'}});assert.equal(r.status,201);const id=r.data.id;createdWorkspace=id
 const mine=await req('/api/workspaces',{token:tokenA});assert.equal(mine.status,200);assert.ok(mine.data.items.some(x=>x.id===id))
 const foreign=await req('/api/workspaces',{token:tokenB,workspace:b.workspaceId});assert.equal(foreign.status,200);assert.ok(!foreign.data.items.some(x=>x.id===id),'foreign metadata must not appear')
})
test('DATA: fresh production workspace has no fabricated delivery or customer activity',async()=>{
 assert.ok(createdWorkspace,'workspace creation prerequisite failed')
 const {rows}=await admin.query('SELECT state FROM ace_workspace_state WHERE workspace_id=$1',[createdWorkspace]);
 for(const key of ['signalDeliveries','connectorHealth','qualificationCalls','meetings','followUps','feedback','approvals'])assert.equal((rows[0].state[key]||[]).length,0,'new production workspace must not contain demo '+key)
 assert.ok(!rows[0].state.members.some(m=>m.id==='usr_owner'),'new foreign scope must not inherit the global bootstrap identity')
})
test('SEC: malformed tracking arrays and timestamps are client errors without persisted artifacts',async()=>{
 for(const body of [[],null,{id:'qa_reject_boolean_date',eventCategory:'essential',timestamp:true}]){
  const r=await req('/api/track',{method:'POST',body});assert.equal(r.status,400,JSON.stringify(r.data))
 }
 const {rows}=await admin.query('SELECT id FROM ace_events WHERE id=$1',['qa_reject_boolean_date']);assert.equal(rows.length,0)
})

test('MET reconciliation totals equal persisted tracked events in each tenant',async()=>{
 for(const [actor,token] of [[a,tokenA],[b,tokenB]]){
  const expected=Number((await admin.query('SELECT count(*)::int n FROM ace_events WHERE workspace_id=$1',[actor.workspaceId])).rows[0].n)
  const r=await req('/api/reconciliation',{token,workspace:actor.workspaceId})
  assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.totals.trackedEvents,expected)
 }
})
