import {api as sharedApi} from '../../../lib/api'

export const developersApi={
  webhookDeliveries:()=>sharedApi.webhookDeliveries(),
  apiKeys:()=>sharedApi.apiKeys(),
  rotateWebhookSecret:()=>sharedApi.rotateWebhookSecret(),
  retryWebhook:(id:string)=>sharedApi.retryWebhook(id),
  createWebhookEndpoint:(payload:Record<string,unknown>)=>sharedApi.createWebhookEndpoint(payload),
  createApiKey:(payload:{name:string})=>sharedApi.createApiKey(payload),
  revokeApiKey:(id:string)=>sharedApi.revokeApiKey(id)
}
