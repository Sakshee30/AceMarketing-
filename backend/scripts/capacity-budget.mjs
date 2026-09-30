import {assertCapacityBudget} from '../src/platform/capacity-budget.mjs'

const result=assertCapacityBudget()
console.log(JSON.stringify({
  ok:true,
  profile:result.profile,
  targetRps:result.targetRps,
  admissionLimit:result.admissionLimit,
  database:result.database
}))
