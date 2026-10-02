import {readFileSync,writeFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {randomBytes} from 'node:crypto'
import {hashPassword} from '../backend/src/security.mjs'
import {getState,mutateState,withWorkspace,closeStore} from '../backend/src/store.mjs'
if(process.env.QA_ISOLATED!=='1'||process.env.NODE_ENV!=='production')throw new Error('Production-like isolated seed required')
const core=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/core.json.gz',import.meta.url))))
// Exact supported application roles only. No privilege-expanding guessed mapping.
const roles={owner:'owner',administrator:'admin',marketing_operator:'operator',analyst:'analyst'}
const actors=[],unmapped=[]
for(const ws of core.workspaces){
 const members=[]
 for(const u of core.users.filter(u=>u.home_workspace_id===ws.workspace_id)){
  const role=roles[u.logical_persona]
  if(!role){unmapped.push({fixtureUserId:u.user_id,persona:u.logical_persona,reason:'No exact supported role mapping approved'});continue}
  const password=randomBytes(24).toString('base64url')+'!Qa9'
  members.push({id:u.user_id,email:u.email,name:u.display_name,role,status:u.account_state,passwordHash:hashPassword(password),createdAt:'2026-10-02T00:00:00Z'})
  actors.push({id:u.user_id,email:u.email,password,role,workspaceId:ws.workspace_id,tenantId:ws.tenant_id})
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
writeFileSync(process.env.QA_ACTORS_FILE,JSON.stringify(actors),{mode:0o600})
writeFileSync(process.env.QA_REPORTS+'/fixture-mapping.json',JSON.stringify({seededWorkspaces:core.workspaces.length,seededUsers:actors.length,unmapped,qualification:'setup only; no onboarding or suspended-tenant claim'},null,2))
await closeStore()
