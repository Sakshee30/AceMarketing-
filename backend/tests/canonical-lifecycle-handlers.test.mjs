import test from 'node:test'
import assert from 'node:assert/strict'
import {handleUpdateWorkspace,normalizeWorkspaceSettingsPatch} from '../modules/workspaces/src/application/commands/update-workspace/update-workspace.handler.mjs'
import {handleRemoveMember} from '../modules/memberships/src/application/commands/remove-member/remove-member.handler.mjs'
import {handlePublishRule} from '../modules/rules/src/application/commands/publish-rule/publish-rule.handler.mjs'
import {handlePublishWorkflow} from '../modules/workflows/src/application/commands/publish-workflow/publish-workflow.handler.mjs'
import {handleRetryWorkflowExecution} from '../modules/workflows/src/application/commands/retry-step/retry-step.handler.mjs'
import {handleDecideApproval} from '../modules/approvals/src/application/commands/decide-approval/decide-approval.handler.mjs'

test('workspace update accepts only the existing supported settings contract',async()=>{
  assert.deepEqual(normalizeWorkspaceSettingsPatch({currency:'INR',unsupported:'x'}),{currency:'INR'})
  assert.throws(()=>normalizeWorkspaceSettingsPatch({unsupported:true}),error=>error?.code==='workspace_settings_empty')
  const state={workspaceSettings:{timezone:'UTC'},audit:[]}
  const result=await handleUpdateWorkspace({
    workspaceId:'ws_1',
    actorId:'u1',
    patch:{currency:'INR',unsupported:'x'},
    now:()=> '2026-10-01T00:00:00.000Z',
    mutate:async fn=>fn(state)
  })
  assert.equal(result.currency,'INR')
  assert.equal(result.timezone,'UTC')
  assert.equal(state.audit[0].action,'workspace.settings_updated')
})

test('membership removal deactivates target and revokes all target sessions',async()=>{
  const state={
    members:[{id:'u1',status:'active',passwordHash:'secret'},{id:'u2',status:'active',passwordHash:'secret'}],
    sessions:[{jti:'s1',userId:'u2',status:'active'},{jti:'s2',userId:'u1',status:'active'}],
    audit:[]
  }
  const updated=await handleRemoveMember({
    workspaceId:'ws_1',
    memberId:'u2',
    actorId:'u1',
    now:()=> '2026-10-01T00:00:00.000Z',
    mutate:async fn=>fn(state)
  })
  assert.equal(updated.status,'inactive')
  assert.equal('passwordHash' in updated,false)
  assert.equal(state.sessions.find(x=>x.userId==='u2').status,'revoked')
  assert.equal(state.sessions.find(x=>x.userId==='u1').status,'active')
  await assert.rejects(
    ()=>handleRemoveMember({workspaceId:'ws_1',memberId:'u1',actorId:'u1',mutate:async()=>{}}),
    error=>error?.code==='self_deactivation_denied'
  )
})

test('policy and workflow publication handlers preserve scope/id contracts',async()=>{
  const policy=await handlePublishRule({
    workspaceId:' ws_1 ',id:' rule_1 ',
    publish:async args=>({kind:'rule',...args})
  })
  assert.deepEqual(policy,{kind:'rule',workspaceId:'ws_1',id:'rule_1'})
  const workflow=await handlePublishWorkflow({
    workspaceId:'ws_1',id:'wf_1',
    publish:async args=>({kind:'workflow',...args})
  })
  assert.deepEqual(workflow,{kind:'workflow',workspaceId:'ws_1',id:'wf_1'})
})

test('workflow retry preserves actor identity',async()=>{
  let captured=null
  const value=await handleRetryWorkflowExecution({
    workspaceId:'ws_1',
    executionId:'exec_1',
    actorId:'u1',
    retry:async args=>{captured=args;return {id:args.executionId,status:'running'}}
  })
  assert.equal(value.status,'running')
  assert.deepEqual(captured,{workspaceId:'ws_1',executionId:'exec_1',actorId:'u1'})
})

test('approval decision validates allowed outcomes and delegates separation-of-duties store',async()=>{
  let captured=null
  const value=await handleDecideApproval({
    workspaceId:'ws_1',
    approvalId:'ap_1',
    actorId:'u2',
    decision:'APPROVED',
    comment:'ok',
    decide:async args=>{captured=args;return {id:args.approvalId,status:args.decision}}
  })
  assert.equal(value.status,'approved')
  assert.deepEqual(captured,{
    workspaceId:'ws_1',
    approvalId:'ap_1',
    actorId:'u2',
    decision:'approved',
    comment:'ok'
  })
  await assert.rejects(
    ()=>handleDecideApproval({workspaceId:'ws_1',approvalId:'ap_1',decision:'maybe',decide:async()=>null}),
    error=>error?.code==='workflow_approval_decision_invalid'
  )
})
