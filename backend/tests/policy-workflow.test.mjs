import test from 'node:test'
import assert from 'node:assert/strict'
import {embeddedDatabase,pool} from '../src/database.mjs'
import {evaluatePolicyExpression,simulatePolicyExpression,validatePolicyExpression} from '../src/platform/policy-engine.mjs'
import {simulateWorkflowDefinition,validateWorkflowDefinition} from '../src/platform/workflow-store.mjs'
import {validateWorkflowActionConfig,workflowActionCatalog} from '../src/platform/workflow-action-catalog.mjs'

test('policy evaluator is bounded, typed and does not execute code',()=>{
  const expression=validatePolicyExpression({op:'and',args:[
    {op:'eq',path:'actor.role',value:'admin'},
    {op:'gte',path:'record.amount',value:100}
  ]})
  assert.equal(evaluatePolicyExpression(expression,{actor:{role:'admin'},record:{amount:150}}),true)
  assert.equal(evaluatePolicyExpression(expression,{actor:{role:'viewer'},record:{amount:150}}),false)
  assert.throws(()=>validatePolicyExpression({op:'eval',path:'x',value:'process.exit()'}),error=>error?.code==='unsupported_policy_operator')
})

test('workflow action catalogue rejects arbitrary execution and exposes bounded contracts',()=>{
  const ids=workflowActionCatalog().map(item=>item.id)
  assert.ok(ids.includes('create-record'))
  assert.ok(ids.includes('request-approval'))
  assert.equal(ids.includes('run-sql'),false)
  assert.throws(
    ()=>validateWorkflowActionConfig({actionId:'call-any-url',input:{url:'https://example.com'}}),
    error=>error?.code==='unsupported_workflow_action'
  )
  const simulation=simulateWorkflowDefinition({
    trigger:'manual',
    nodes:[
      {id:'start',type:'start'},
      {id:'create',type:'action',config:{actionId:'create-record',input:{objectKey:'accounts',data:{name:'Acme'}}}},
      {id:'end',type:'end'}
    ],
    edges:[{from:'start',to:'create'},{from:'create',to:'end'}]
  })
  assert.equal(simulation.actions[0].action.actionId,'create-record')
  assert.ok(simulation.estimatedWorkUnits>=3)
})

test('policy simulation is deterministic and does not retain input values',()=>{
  const result=simulatePolicyExpression({
    expression:{op:'eq',path:'actor.role',value:'admin'},
    input:{actor:{role:'admin'},secret:'do-not-retain'}
  })
  assert.equal(result.decision,true)
  assert.equal(result.retainedInput,false)
  assert.equal(Object.hasOwn(result,'input'),false)
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
  const {createPolicyRule,createPolicyRuleVersion,publishPolicyRule,evaluatePublishedPolicyRule}=await import('../src/platform/policy-engine.mjs')
  const {cancelWorkflowExecution,createWorkflow,createWorkflowVersion,publishWorkflow,startWorkflowExecution,createWorkflowApproval,decideWorkflowApproval,listWorkflowExecutionSteps,retryWorkflowExecution}=await import('../src/platform/workflow-store.mjs')
  const workspaceId='ws_policy_workflow_test'
  const rule=await createPolicyRule({workspaceId,name:'Admin only',expression:{op:'eq',path:'actor.role',value:'admin'},actorId:'u1'})
  await publishPolicyRule({workspaceId,id:rule.id})
  const decision=await evaluatePublishedPolicyRule({workspaceId,id:rule.id,input:{actor:{role:'admin'}}})
  assert.equal(decision.decision,true)
  const ruleV2=await createPolicyRuleVersion({
    workspaceId,id:rule.id,actorId:'u1',
    expression:{op:'in',path:'actor.role',value:['admin','owner']}
  })
  assert.equal(Number(ruleV2.latest_version),2)
  await publishPolicyRule({workspaceId,id:rule.id})
  const decisionV2=await evaluatePublishedPolicyRule({workspaceId,id:rule.id,input:{actor:{role:'owner'}}})
  assert.equal(decisionV2.decision,true)
  assert.equal(Number(decisionV2.ruleVersion),2)

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

  const actionWorkflow=await createWorkflow({
    workspaceId,
    name:'Durable action flow',
    actorId:'u1',
    definition:{
      nodes:[
        {id:'start',type:'start'},
        {id:'create',type:'action',config:{actionId:'create-record',input:{objectKey:'accounts',data:{name:'Acme'}}}},
        {id:'end',type:'end'}
      ],
      edges:[{from:'start',to:'create'},{from:'create',to:'end'}]
    }
  })
  const actionV2=await createWorkflowVersion({
    workspaceId,id:actionWorkflow.id,actorId:'u1',
    definition:{
      nodes:[
        {id:'start',type:'start'},
        {id:'create',type:'action',config:{actionId:'create-record',input:{objectKey:'accounts',data:{name:'Acme'}}}},
        {id:'approval',type:'approval'},
        {id:'end',type:'end'}
      ],
      edges:[{from:'start',to:'create'},{from:'create',to:'approval'},{from:'approval',to:'end'}]
    }
  })
  assert.equal(Number(actionV2.latest_version),2)
  await publishWorkflow({workspaceId,id:actionWorkflow.id})
  const actionExecution=await startWorkflowExecution({workspaceId,id:actionWorkflow.id,actorId:'u1'})
  assert.equal(Number(actionExecution.workflow_version),2)
  const steps=await listWorkflowExecutionSteps({workspaceId,executionId:actionExecution.id})
  assert.equal(steps.length,4)
  assert.equal(steps.find(step=>step.node_id==='start')?.status,'succeeded')
  assert.equal(steps.find(step=>step.node_id==='create')?.action_id,'create-record')

  const cancelled=await cancelWorkflowExecution({workspaceId,executionId:actionExecution.id,actorId:'u1'})
  assert.equal(cancelled.status,'cancelled')
  const retried=await retryWorkflowExecution({workspaceId,executionId:actionExecution.id,actorId:'u2'})
  assert.equal(retried.status,'running')
  assert.equal(Number(retried.attempts),1)
})
