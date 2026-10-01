import test from 'node:test'
import assert from 'node:assert/strict'
import {handleStartLogin} from '../modules/identity/src/application/commands/start-login/start-login.handler.mjs'
import {handleRecoverAccount} from '../modules/identity/src/application/commands/recover-account/recover-account.handler.mjs'
import {handleApproveFile} from '../modules/documents/src/application/commands/approve-file/approve-file.handler.mjs'
import {handleRebuildSearchIndex} from '../modules/search/src/application/commands/rebuild-index/rebuild-index.handler.mjs'

test('login handler preserves active-member session creation and token contract',async()=>{
  const state={members:[{id:'u1',email:'user@example.com',name:'User',role:'admin',status:'active',passwordHash:'hash'}],sessions:[],audit:[]}
  const result=await handleStartLogin({
    workspaceId:'ws_1',email:'USER@example.com',password:'secret1',jwtSecret:'jwt',
    readState:async()=>state,mutate:async fn=>fn(state),verify:()=>true,
    sign:payload=>'token:'+payload.userId,now:()=>new Date('2026-10-01T00:00:00.000Z')
  })
  assert.equal(result.token,'token:u1')
  assert.equal(result.workspaceId,'ws_1')
  assert.equal(state.sessions[0].status,'active')
  assert.equal(state.audit[0].action,'auth.login')
})

test('account recovery request stays enumeration-safe and completion revokes sessions',async()=>{
  const state={members:[{id:'u1',email:'user@example.com',status:'active',passwordHash:'old'}],passwordResets:[],sessions:[{userId:'u1',status:'active'}],audit:[]}
  const request=await handleRecoverAccount({
    mode:'request',email:'user@example.com',isProd:false,
    readState:async()=>state,mutate:async fn=>fn(state),mailConfigured:()=>false,
    now:()=>new Date('2026-10-01T00:00:00.000Z')
  })
  assert.equal(request.accepted,true)
  assert.ok(request.developmentResetToken)
  const complete=await handleRecoverAccount({
    mode:'complete',token:request.developmentResetToken,password:'new-secret',
    readState:async()=>state,mutate:async fn=>fn(state),hash:()=> 'new-hash',
    now:()=>new Date('2026-10-01T00:05:00.000Z')
  })
  assert.deepEqual(complete,{ok:true})
  assert.equal(state.members[0].passwordHash,'new-hash')
  assert.equal(state.sessions[0].status,'revoked')
})

test('document approval validates scan outcome and delegates immutable lifecycle enforcement',async()=>{
  let captured=null
  const result=await handleApproveFile({
    workspaceId:'ws_1',objectId:'obj_1',result:'clean',evidence:{scanner:'test'},actorId:'worker',
    record:async args=>{captured=args;return {id:'obj_1',status:'approved'}}
  })
  assert.equal(result.status,'approved')
  assert.equal(captured.workspaceId,'ws_1')
  await assert.rejects(
    ()=>handleApproveFile({workspaceId:'ws_1',objectId:'obj_1',result:'maybe',record:async()=>null}),
    error=>error?.code==='object_scan_result_invalid'
  )
})

test('search rebuild requires extracted text and delegates approved-object indexing',async()=>{
  let captured=null
  const result=await handleRebuildSearchIndex({
    workspaceId:'ws_1',objectId:'obj_1',text:'approved document text',evidence:{parser:'test'},
    rebuild:async args=>{captured=args;return {id:'obj_1',indexing_status:'completed'}}
  })
  assert.equal(result.indexing_status,'completed')
  assert.equal(captured.objectId,'obj_1')
  await assert.rejects(
    ()=>handleRebuildSearchIndex({workspaceId:'ws_1',objectId:'obj_1',text:'',rebuild:async()=>null}),
    error=>error?.code==='search_rebuild_text_required'
  )
})
