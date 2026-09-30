import {api as sharedApi} from '../../../lib/api'

export const integrationsApi={
  workspace:async(signal?:AbortSignal)=>{
    const [integrations,custom,whatsapp,webhookSubscriptions,webhookDeliveries]=await Promise.all([
      sharedApi.integrations({signal}),
      sharedApi.customIntegrations({signal}),
      sharedApi.whatsappMessages({signal}),
      sharedApi.webhookSubscriptions({signal}),
      sharedApi.webhookDeliveries({signal})
    ])
    return {integrations,custom,whatsapp,webhookSubscriptions,webhookDeliveries}
  },
  integrations:(signal?:AbortSignal)=>sharedApi.integrations({signal}),
  customIntegrations:(signal?:AbortSignal)=>sharedApi.customIntegrations({signal}),
  whatsappMessages:(signal?:AbortSignal)=>sharedApi.whatsappMessages({signal}),
  connectIntegration:(name:string,operationId:string,signal?:AbortSignal)=>sharedApi.connectIntegration(name,{operationId,signal}),
  refreshIntegration:(name:string,operationId:string,signal?:AbortSignal)=>sharedApi.refreshIntegration(name,{operationId,signal}),
  connectServerSecretIntegration:(name:string,credentials:Record<string,string>,operationId:string,signal?:AbortSignal)=>sharedApi.connectServerSecretIntegration(name,credentials,{operationId,signal}),
  disconnectIntegration:(name:string,operationId:string,signal?:AbortSignal)=>sharedApi.disconnectIntegration(name,{operationId,signal}),
  testCustomIntegration:(payload:any)=>sharedApi.testCustomIntegration(payload),
  createCustomIntegration:(payload:any)=>sharedApi.createCustomIntegration(payload),
  sendWhatsAppMessage:(payload:any)=>sharedApi.sendWhatsAppMessage(payload),
  requestIntegration:(payload:any)=>sharedApi.requestIntegration(payload),
  createWebhookSubscription:(payload:Record<string,unknown>)=>sharedApi.createWebhookSubscription(payload),
  setWebhookSubscriptionStatus:(id:string,status:'active'|'paused'|'disabled')=>sharedApi.setWebhookSubscriptionStatus(id,status),
  testWebhookSubscription:(id:string)=>sharedApi.testWebhookSubscription(id),
  replayWebhookDelivery:(id:string)=>sharedApi.replayWebhookDelivery(id),
  webhookDeliveryAttempts:(id:string,signal?:AbortSignal)=>sharedApi.webhookDeliveryAttempts(id,{signal})
}
