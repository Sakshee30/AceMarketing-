import {api as sharedApi} from '../../../lib/api'

export const plannerApi={
  load:()=>sharedApi.planner(),
  saveScenario:(payload:Record<string,unknown>)=>sharedApi.savePlannerScenario(payload)
}
