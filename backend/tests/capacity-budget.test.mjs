import test from 'node:test'
import assert from 'node:assert/strict'
import {assertCapacityBudget,capacityBudgetFromEnvironment,evaluateCapacityBudget} from '../src/platform/capacity-budget.mjs'

test('capacity budget accounts for API surge workers control and reserve',()=>{
  const result=evaluateCapacityBudget({
    profile:'test',
    targetRps:4000,
    apiMaxTasks:10,
    apiDeploymentSurgeTasks:2,
    apiPoolPerTask:5,
    workerMaxTasks:4,
    workerPoolPerTask:5,
    controlMaxTasks:2,
    controlPoolPerTask:5,
    operationsConnections:10,
    databaseConnectionCeiling:120,
    reservedConnections:20,
    admissionLimit:250
  })
  assert.equal(result.database.api,50)
  assert.equal(result.database.deploymentSurge,10)
  assert.equal(result.database.workers,20)
  assert.equal(result.database.control,10)
  assert.equal(result.database.operations,10)
  assert.equal(result.database.usable,100)
  assert.equal(result.database.remaining,0)
  assert.equal(result.valid,true)
})

test('capacity budget rejects oversubscribed database pools',()=>{
  assert.throws(()=>assertCapacityBudget({
    profile:'test',
    targetRps:4000,
    apiMaxTasks:20,
    apiDeploymentSurgeTasks:4,
    apiPoolPerTask:10,
    workerMaxTasks:10,
    workerPoolPerTask:10,
    controlMaxTasks:2,
    controlPoolPerTask:5,
    operationsConnections:10,
    databaseConnectionCeiling:250,
    reservedConnections:50,
    admissionLimit:250
  }),error=>error?.code==='capacity_budget_invalid')
})

test('capacity budget environment parsing is bounded',()=>{
  const result=capacityBudgetFromEnvironment({
    CAPACITY_TARGET_RPS:'4000',
    API_MAX_TASKS:'12',
    DB_POOL_MAX:'5',
    DB_CONNECTION_CEILING:'600',
    DB_CONNECTION_RESERVE:'40'
  })
  assert.equal(result.targetRps,4000)
  assert.equal(result.apiMaxTasks,12)
  assert.equal(result.apiPoolPerTask,5)
  assert.equal(result.databaseConnectionCeiling,600)
})
