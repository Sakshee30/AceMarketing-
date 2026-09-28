import {api as sharedApi} from '../../../lib/api'

export const dataFlowsApi={
  integrationFlows:()=>sharedApi.integrationFlows(),
  integrations:()=>sharedApi.integrations(),
  createIntegrationFlow:(payload:any)=>sharedApi.createIntegrationFlow(payload),
  testIntegrationFlow:(id:string)=>sharedApi.testIntegrationFlow(id),
  toggleIntegrationFlow:(id:string,active:boolean)=>sharedApi.toggleIntegrationFlow(id,active)
}
