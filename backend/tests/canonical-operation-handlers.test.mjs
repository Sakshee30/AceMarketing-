import test from 'node:test'
import assert from 'node:assert/strict'
import {handleEvaluateAccess,evaluateAccessPermission} from '../modules/authorization/src/application/queries/evaluate-access/evaluate-access.handler.mjs'
import {handlePublishForm} from '../modules/forms/src/application/commands/publish-form/publish-form.handler.mjs'
import {handleSubmitForm} from '../modules/forms/src/application/commands/submit-form/submit-form.handler.mjs'
import {handleSimulateRule} from '../modules/rules/src/application/queries/simulate-rule/simulate-rule.handler.mjs'

test('canonical authorization query preserves centralized permission semantics',()=>{
  assert.equal(evaluateAccessPermission('GET','/api/boards/board_1'),'boards.read')
  assert.deepEqual(
    handleEvaluateAccess({role:'analyst',method:'POST',path:'/api/boards/board_1/moves',hasPermission:()=>true}),
    {permission:'boards.move',allowed:true,decision:'allow'}
  )
  assert.equal(
    handleEvaluateAccess({role:'viewer',method:'POST',path:'/api/boards/board_1/moves',hasPermission:()=>false}).decision,
    'deny'
  )
})

test('canonical publish-form handler validates scope and delegates unchanged contract',async()=>{
  const seen=[]
  const result=await handlePublishForm({
    workspaceId:' ws_1 ',
    id:' form_1 ',
    actorId:'u1',
    publish:async args=>{seen.push(args);return {id:args.id,status:'published'}}
  })
  assert.equal(result.status,'published')
  assert.deepEqual(seen[0],{workspaceId:'ws_1',id:'form_1',actorId:'u1'})
  await assert.rejects(()=>handlePublishForm({workspaceId:'',id:'form_1',publish:async()=>null}),error=>error?.code==='workspace_scope_required')
})

test('canonical submit-form handler preserves idempotency key and payload',async()=>{
  let captured=null
  const result=await handleSubmitForm({
    workspaceId:'ws_1',
    id:'form_1',
    data:{email:'user@example.com'},
    actorId:'u1',
    submissionId:'idem_1',
    submit:async args=>{captured=args;return {id:'idem_1'}}
  })
  assert.equal(result.id,'idem_1')
  assert.deepEqual(captured,{
    workspaceId:'ws_1',
    id:'form_1',
    data:{email:'user@example.com'},
    actorId:'u1',
    submissionId:'idem_1'
  })
})

test('canonical rule simulation remains bounded and deterministic',()=>{
  const result=handleSimulateRule({
    expression:{op:'eq',path:'actor.role',value:'admin'},
    input:{actor:{role:'admin'}}
  })
  assert.equal(result.decision,true)
  assert.equal(result.retainedInput,false)
})
