import {api as sharedApi} from '../../../lib/api'

export const integrationsApi={
  integrations:()=>sharedApi.integrations(),
  customIntegrations:()=>sharedApi.customIntegrations(),
  whatsappMessages:()=>sharedApi.whatsappMessages(),
  connectIntegration:(name:string)=>sharedApi.connectIntegration(name),
  refreshIntegration:(name:string)=>sharedApi.refreshIntegration(name),
  connectServerSecretIntegration:(name:string,credentials:Record<string,string>)=>sharedApi.connectServerSecretIntegration(name,credentials),
  disconnectIntegration:(name:string)=>sharedApi.disconnectIntegration(name),
  testCustomIntegration:(payload:any)=>sharedApi.testCustomIntegration(payload),
  createCustomIntegration:(payload:any)=>sharedApi.createCustomIntegration(payload),
  sendWhatsAppMessage:(payload:any)=>sharedApi.sendWhatsAppMessage(payload),
  requestIntegration:(payload:any)=>sharedApi.requestIntegration(payload)
}
