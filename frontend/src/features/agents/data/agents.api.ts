import {api} from '../../../lib/api'

export const agentsApi={
  load:()=>api.agents(),
  create:(payload:Record<string,unknown>)=>api.createAgent(payload),
  test:(payload:Record<string,unknown>)=>api.testCustomAgent(payload)
}
