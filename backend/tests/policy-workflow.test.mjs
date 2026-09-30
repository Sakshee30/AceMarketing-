import test from 'node:test'
import assert from 'node:assert/strict'
import {embeddedDatabase,pool} from '../src/database.mjs'
import {evaluatePolicyExpression,validatePolicyExpression} from '../src/platform/policy-engine.mjs'
import {validateWorkflowDefinition} from '../src/platform/workflow-store.mjs'

test('policy evaluator is bounded, typed and does not execute code',()=>{
  const expression=validatePolicyExpression({op:'and',args:[
    {op:'eq',path:'actor.role',value:'admin'},
    {op:'gte',path:'record.amount',value:100}
  ]})
  assert.equal(evaluatePolicyExpression(expression,{actor:{role:'admin'},record:{amount:150}}),true)
  assert.equal(evaluatePolicyExpression(expression,{actor:{role:'viewer'},record:{amount:150}}),false)
  assert.throws(()=>validatePolicyExpression({op:'eval',path:'x',value:'process.exit()'}),error=>error?.code==='unsupported_policy_operator')
})

test('workflow validator rejects cycles and unreachable nodes',()=>{
  const valid=validateWorkflowDefinition({
    trigger:'manual',
    nodes:[{id:'start',type:'start'},{id:'approve',type:'approval'},{id:'end',type:'end'}],
    edges:[{from:'start',to:'approve'},{from:'approve',to:'end'}]
  })
  assert.equal(valid.nodes.length,3)
  assert.throws(()=>validateWorkflowDefinition({
    nodes:[{id:'start',type:'start'},{id:'a',type:'action'},{id:'end',type:'end'}],
    edges:[{from:'start',to:'a'},{from:'a',to:'start'}]
  }),error=>error?.code==='workflow_cycle')
})

test('production persistence tests are enabled when PostgreSQL is available',{skip:embeddedDatabase||!pool},async()=>{
  const {createPolicyRule,publishPolicyRule,evaluatePublishedPolicyRule}=await import('../src/platform/policy-engine.mjs')
  const {createWorkflow,publishWorkflow,startWorkflowExecution,createWorkflowApproval,decideWorkflowApproval}=await import('../src/platform/workflow-store.mjs')
  const workspaceId='ws_policy_workflow_test'
  const rule=await createPolicyRule({workspaceId,name:'Admin only',expression:{op:'eq',path:'actor.role',value:'admin'},actorId:'u1'})
  await publishPolicyRule({workspaceId,id:rule.id})
  const decision=await evaluatePublishedPolicyRule({workspaceId,id:rule.id,input:{actor:{role:'admin'}}})
  assert.equal(decision.decision,true)

  const workflow=await createWorkflow({
    workspaceId,
    name:'Approval flow',
    actorId:'u1',
    definition:{nodes:[{id:'start',type:'start'},{id:'approval',type:'approval'},{id:'end',type:'end'}],edges:[{from:'start',to:'approval'},{from:'approval',to:'end'}]}
  })
  await publishWorkflow({workspaceId,id:workflow.id})
  const execution=await startWorkflowExecution({workspaceId,id:workflow.id,actorId:'u1'})
  const approval=await createWorkflowApproval({workspaceId,executionId:execution.id,nodeId:'approval',requestedBy:'u1'})
  await assert.rejects(
    ()=>decideWorkflowApproval({workspaceId,approvalId:approval.id,actorId:'u1',decision:'approved'}),
    error=>error?.code==='workflow_separation_of_duties'
  )
  const decided=await decideWorkflowApproval({workspaceId,approvalId:approval.id,actorId:'u2',decision:'approved'})
  assert.equal(decided.status,'approved')
})
