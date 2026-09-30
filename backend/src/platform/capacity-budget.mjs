const number=(value,fallback,{min=0,max=Number.MAX_SAFE_INTEGER}={})=>{
  const parsed=Number(value)
  if(!Number.isFinite(parsed))return fallback
  return Math.max(min,Math.min(max,Math.trunc(parsed)))
}

export const capacityBudgetFromEnvironment=(env=process.env)=>({
  profile:String(env.CAPACITY_PROFILE||'local'),
  targetRps:number(env.CAPACITY_TARGET_RPS,4000,{min:1,max:1_000_000}),
  apiMaxTasks:number(env.API_MAX_TASKS,12,{min:1,max:10_000}),
  apiDeploymentSurgeTasks:number(env.API_DEPLOYMENT_SURGE_TASKS,2,{min:0,max:10_000}),
  apiPoolPerTask:number(env.DB_POOL_MAX,20,{min:1,max:1000}),
  workerMaxTasks:number(env.WORKER_MAX_TASKS,4,{min:0,max:10_000}),
  workerPoolPerTask:number(env.WORKER_DB_POOL_MAX,5,{min:0,max:1000}),
  controlMaxTasks:number(env.CONTROL_MAX_TASKS,2,{min:0,max:10_000}),
  controlPoolPerTask:number(env.CONTROL_DB_POOL_MAX,5,{min:0,max:1000}),
  operationsConnections:number(env.OPERATIONS_DB_CONNECTIONS,10,{min:0,max:10_000}),
  databaseConnectionCeiling:number(env.DB_CONNECTION_CEILING,600,{min:1,max:1_000_000}),
  reservedConnections:number(env.DB_CONNECTION_RESERVE,40,{min:0,max:1_000_000}),
  admissionLimit:number(env.MAX_INFLIGHT_REQUESTS,250,{min:1,max:1_000_000})
})

export const evaluateCapacityBudget=(input=capacityBudgetFromEnvironment())=>{
  const api=input.apiMaxTasks*input.apiPoolPerTask
  const surge=input.apiDeploymentSurgeTasks*input.apiPoolPerTask
  const workers=input.workerMaxTasks*input.workerPoolPerTask
  const control=input.controlMaxTasks*input.controlPoolPerTask
  const operations=input.operationsConnections
  const committed=api+surge+workers+control+operations
  const usable=Math.max(0,input.databaseConnectionCeiling-input.reservedConnections)
  const remaining=usable-committed
  const violations=[]
  if(input.reservedConnections>=input.databaseConnectionCeiling){
    violations.push('database connection reserve must be lower than the ceiling')
  }
  if(committed>usable){
    violations.push('configured process pools exceed the usable database connection budget')
  }
  if(input.admissionLimit<input.apiPoolPerTask){
    violations.push('API admission limit is lower than one task database pool; verify this is intentional')
  }
  return {
    ...input,
    database:{
      api,
      deploymentSurge:surge,
      workers,
      control,
      operations,
      reserve:input.reservedConnections,
      ceiling:input.databaseConnectionCeiling,
      usable,
      committed,
      remaining,
      utilizationPercent:usable?Number((committed/usable*100).toFixed(2)):100
    },
    valid:violations.length===0,
    violations
  }
}

export const assertCapacityBudget=(input=capacityBudgetFromEnvironment())=>{
  const result=evaluateCapacityBudget(input)
  if(!result.valid){
    const error=new Error('capacity budget invalid: '+result.violations.join('; '))
    error.code='capacity_budget_invalid'
    error.details=result
    throw error
  }
  return result
}
