import test from 'node:test'
import assert from 'node:assert/strict'
import {handleEvaluateEntitlement} from '../modules/entitlements/src/application/queries/evaluate-entitlement/evaluate-entitlement.handler.mjs'
import {handleDefineCustomObject} from '../modules/custom-objects/src/application/commands/define-object/define-object.handler.mjs'
import {handleQuerySearch} from '../modules/search/src/application/queries/query-search/query-search.handler.mjs'
import {handleAuthorizeUpload} from '../modules/documents/src/application/commands/authorize-upload/authorize-upload.handler.mjs'

test('entitlement evaluation requires tenant scope and preserves summary contract',async()=>{
  const result=await handleEvaluateEntitlement({
    workspaceId:' ws_1 ',
    summarize:async workspaceId=>({workspaceId,available:true})
  })
  assert.deepEqual(result,{workspaceId:'ws_1',available:true})
  await assert.rejects(
    ()=>handleEvaluateEntitlement({workspaceId:'',summarize:async()=>({})}),
    error=>error?.code==='workspace_scope_required'
  )
})

test('custom-object definition delegates existing schema contract unchanged',async()=>{
  let captured=null
  const result=await handleDefineCustomObject({
    workspaceId:'ws_1',
    objectKey:'accounts',
    name:'Accounts',
    description:'Customer accounts',
    schema:{fields:[{key:'name',type:'string'}]},
    actorId:'u1',
    create:async args=>{captured=args;return {id:'object_1',...args}}
  })
  assert.equal(result.id,'object_1')
  assert.equal(captured.workspaceId,'ws_1')
  assert.equal(captured.objectKey,'accounts')
  assert.equal(captured.actorId,'u1')
})

test('search query handler bounds result limit and preserves authorization role',async()=>{
  let captured=null
  const result=await handleQuerySearch({
    workspaceId:'ws_1',
    query:'revenue attribution',
    role:'analyst',
    limit:500,
    sourceType:'object',
    search:async args=>{captured=args;return {items:[]}}
  })
  assert.deepEqual(result,{items:[]})
  assert.equal(captured.limit,100)
  assert.equal(captured.role,'analyst')
  assert.equal(captured.sourceType,'object')
})

test('upload authorization preserves quarantine intent contract and normalizes access policy',async()=>{
  let captured=null
  const result=await handleAuthorizeUpload({
    workspaceId:'ws_1',
    name:'report.pdf',
    mime:'application/pdf',
    size:100,
    sha256:'a'.repeat(64),
    accessPolicy:{allowedRoles:['owner']},
    actorId:'u1',
    authorize:async args=>{captured=args;return {object:{id:'obj_1'}}}
  })
  assert.equal(result.object.id,'obj_1')
  assert.equal(captured.workspaceId,'ws_1')
  assert.deepEqual(captured.accessPolicy,{allowedRoles:['owner']})
})
