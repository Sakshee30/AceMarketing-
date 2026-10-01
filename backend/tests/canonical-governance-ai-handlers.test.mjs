import test from 'node:test'
import assert from 'node:assert/strict'
import {handleUpdateOrganization} from '../modules/organizations/src/application/commands/update-organization/update-organization.handler.mjs'
import {handlePublishPolicy} from '../modules/authorization/src/application/commands/publish-policy/publish-policy.handler.mjs'
import {handleRequestInference} from '../modules/ai/src/application/commands/request-inference/request-inference.handler.mjs'
import {handleActivateModelResult} from '../modules/ai/src/application/commands/activate-model-result/activate-model-result.handler.mjs'

test('organization update narrows mutation to organization field',async()=>{
  let captured=null
  const result=await handleUpdateOrganization({
    workspaceId:'ws_1',organization:' Acme Corp ',actorId:'u1',
    update:async args=>{captured=args;return {organization:args.patch.organization}}
  })
  assert.equal(result.organization,'Acme Corp')
  assert.deepEqual(captured.patch,{organization:'Acme Corp'})
})

test('authorization publish policy validates tenant and policy identity',async()=>{
  let captured=null
  const result=await handlePublishPolicy({
    workspaceId:'ws_1',id:'policy_1',
    publish:async args=>{captured=args;return {id:args.id,status:'published'}}
  })
  assert.equal(result.status,'published')
  assert.deepEqual(captured,{workspaceId:'ws_1',id:'policy_1'})
})

test('AI inference command preserves immutable source snapshot and execution mode',async()=>{
  let captured=null
  const result=await handleRequestInference({
    workspaceId:'ws_1',task:'analyst',input:{question:'why'},sourceSnapshot:{schemaVersion:'v1'},
    idempotencyKey:'req_1',actor:{userId:'u1'},executionMode:'shadow',
    submit:async args=>{captured=args;return {accepted:true,job:{id:'job_1'}}}
  })
  assert.equal(result.accepted,true)
  assert.equal(captured.executionMode,'shadow')
  assert.equal(captured.idempotencyKey,'req_1')
})

test('AI activation execution requires explicit proposal identity',async()=>{
  let captured=null
  const result=await handleActivateModelResult({
    workspaceId:'ws_1',proposalId:'ap_1',actor:{userId:'u1'},
    queue:async args=>{captured=args;return {accepted:true,jobId:'job_2'}}
  })
  assert.equal(result.accepted,true)
  assert.equal(captured.proposalId,'ap_1')
  await assert.rejects(
    ()=>handleActivateModelResult({workspaceId:'ws_1',proposalId:'',queue:async()=>({})}),
    error=>error?.code==='ai_activation_id_required'
  )
})
