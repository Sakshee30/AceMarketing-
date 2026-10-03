import {readFileSync,writeFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {randomBytes} from 'node:crypto'
import {hashPassword} from '../backend/src/security.mjs'
import {getState,mutateState,withWorkspace,closeStore} from '../backend/src/store.mjs'
if(process.env.QA_ISOLATED!=='1'||process.env.NODE_ENV!=='production')throw new Error('Production-like isolated seed required')
const core=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/core.json.gz',import.meta.url))))
// Exact supported application roles only. No privilege-expanding guessed mapping.
const roles={owner:'owner',administrator:'admin',marketing_operator:'operator',analyst:'analyst'}
const actors=[],unmapped=[],addedMemberships=[]
for(const ws of core.workspaces){
 const members=[]
 for(const u of core.users.filter(u=>u.home_workspace_id===ws.workspace_id)){
  const role=roles[u.logical_persona]
  if(!role){unmapped.push({fixtureUserId:u.user_id,persona:u.logical_persona,reason:'No exact supported role mapping approved'});continue}
  const password=randomBytes(24).toString('base64url')+'!Qa9'
  members.push({id:u.user_id,email:u.email,name:u.display_name,role,status:u.account_state,passwordHash:hashPassword(password),createdAt:'2026-10-02T00:00:00Z'})
  actors.push({id:u.user_id,email:u.email,password,role,workspaceId:ws.workspace_id,tenantId:ws.tenant_id})
 }
 // Explicit same-tenant QA grants for the sample's original secondary workspaces.
 // This is setup, not evidence of the invitation workflow.
 if(!members.length&&['qa_ace_v1_workspace_000002','qa_ace_v1_workspace_000004'].includes(ws.workspace_id)){
  const u=core.users.find(u=>u.tenant_id===ws.tenant_id&&u.logical_persona==='owner')
  if(!u)throw new Error('Source tenant owner missing')
  const password=randomBytes(24).toString('base64url')+'!Qa9'
  members.push({id:u.user_id,email:u.email,name:u.display_name,role:'owner',status:'active',passwordHash:hashPassword(password),createdAt:'2026-10-02T00:00:00Z'})
  actors.push({id:u.user_id,email:u.email,password,role:'owner',workspaceId:ws.workspace_id,tenantId:ws.tenant_id})
  addedMemberships.push({fixtureUserId:u.user_id,workspaceId:ws.workspace_id,role:'owner',reason:'Additional same-tenant QA setup grant for sample import'})
 }
 await withWorkspace(ws.workspace_id,async()=>{
  await getState()
  await mutateState(state=>{
   // This is explicit test setup, not evidence of UI/API onboarding correctness.
   state.members=members;state.sessions=[];state.audit=[]
   for(const k of ['signalDeliveries','connectorHealth','approvals','qualificationCalls','meetings','followUps','feedback'])state[k]=[]
   state.workspaces=[{id:ws.workspace_id,name:ws.name,status:ws.fixture_state,tenantId:ws.tenant_id}]
   state.workspaceSettings={...state.workspaceSettings,timezone:ws.timezone,currency:ws.currency}
  })
 })
}
await withWorkspace('ws_default',()=>mutateState(state=>{
 state.members=[]
 state.workspaces=core.workspaces.map(ws=>({id:ws.workspace_id,name:ws.name,status:ws.fixture_state,tenantId:ws.tenant_id}))
}))
writeFileSync(process.env.QA_ACTORS_FILE,JSON.stringify(actors),{mode:0o600})
writeFileSync(process.env.QA_REPORTS+'/fixture-mapping.json',JSON.stringify({seededWorkspaces:core.workspaces.length,seededMemberships:actors.length,seededUsers:new Set(actors.map(a=>a.id)).size,addedMemberships,unmapped,qualification:'setup only; no onboarding or suspended-tenant claim'},null,2))
await closeStore()
