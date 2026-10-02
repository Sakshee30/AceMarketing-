"""Reviewed one-time QA-only extension; removed after branch materialization."""
from pathlib import Path
import ast,hashlib,json
expected={'qa/run.py':'8f25bf666ecc4fe4ce7d9cd8d14c17ccfb89036da96ec9004c9683b403e0ecbd','qa/seed.mjs':'c197ce586574e923f80628d4e176384036529f116637c033bd6ae2210daf740a'}
for name,digest in expected.items():assert hashlib.sha256(Path(name).read_bytes()).hexdigest()==digest,(name,'source drift')
p=Path('qa/run.py');s=p.read_text();old="'qa/tests/api.test.mjs'],app_env,timeout=300)";assert s.count(old)==1;s=s.replace(old,"'qa/tests/api.test.mjs','qa/tests/business-api.test.mjs'],app_env,timeout=300)")
s=s.replace('timeout=450)','timeout=900)');p.write_text(s)
p=Path('qa/seed.mjs');s=p.read_text().replace('const actors=[],unmapped=[]','const actors=[],unmapped=[],addedMemberships=[]')
old=' await withWorkspace(ws.workspace_id,async()=>{'
new=""" // Explicit same-tenant QA grants for the sample's original secondary workspaces.
 // This is setup, not evidence of the invitation workflow.
 if(!members.length&&['qa_ace_v1_workspace_000002','qa_ace_v1_workspace_000004'].includes(ws.workspace_id)){
  const u=core.users.find(u=>u.tenant_id===ws.tenant_id&&u.logical_persona==='owner')
  if(!u)throw new Error('Source tenant owner missing')
  const password=randomBytes(24).toString('base64url')+'!Qa9'
  members.push({id:u.user_id,email:u.email,name:u.display_name,role:'owner',status:'active',passwordHash:hashPassword(password),createdAt:'2026-10-02T00:00:00Z'})
  actors.push({id:u.user_id,email:u.email,password,role:'owner',workspaceId:ws.workspace_id,tenantId:ws.tenant_id})
  addedMemberships.push({fixtureUserId:u.user_id,workspaceId:ws.workspace_id,role:'owner',reason:'Additional same-tenant QA setup grant for sample import'})
 }
 await withWorkspace(ws.workspace_id,async()=>{"""
assert s.count(old)==1;s=s.replace(old,new);s=s.replace('seededUsers:actors.length,unmapped,','seededMemberships:actors.length,seededUsers:new Set(actors.map(a=>a.id)).size,addedMemberships,unmapped,');p.write_text(s)
s=Path('backend/scripts/local-feature-smoke.mjs').read_text();a=s.index('const endpoints=[')+len('const endpoints=');b=s.index('\nconst failures',a)
paths=ast.literal_eval(s[a:b]);assert len(paths)==85 and all(p.startswith('/') for p in paths)
Path('qa/feature-read-paths.json').write_text(json.dumps(paths,indent=2)+'\n')
