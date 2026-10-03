import test from 'node:test'
import assert from 'node:assert/strict'
import {listActorWorkspaces} from '../backend/src/platform/workspace-access.mjs'
const actor={userId:'a',email:'a@example.test'}
const own={members:[{id:'a',role:'analyst',status:'active'}],workspaces:[{id:'ws_a',name:'A',role:'owner'}]}
const foreign={members:[{id:'b',role:'owner',status:'active'}]}
test('TEN registry hides foreign metadata and uses actual membership role',async()=>{
 const items=await listActorWorkspaces({registry:{workspaces:[{id:'ws_b',name:'B_SECRET'}]},currentState:own,currentWorkspaceId:'ws_a',actor,loadWorkspace:async()=>foreign})
 assert.deepEqual(items,[{id:'ws_a',name:'A',role:'analyst'}])
})
test('TEN revoked membership cannot list registry entry',async()=>{
 const state={members:[{id:'a',role:'owner',status:'inactive'}]}
 assert.deepEqual(await listActorWorkspaces({registry:{workspaces:[{id:'ws_revoked'}]},currentState:{},currentWorkspaceId:'ws_other',actor,loadWorkspace:async()=>state}),[])
})
test('TEN registry accepts an explicitly granted secondary workspace',async()=>{
 const items=await listActorWorkspaces({registry:{workspaces:[{id:'ws_secondary'}]},currentState:own,currentWorkspaceId:'ws_a',actor,loadWorkspace:async()=>own})
 assert.deepEqual(items.map(x=>x.id),['ws_secondary','ws_a'])
})
