import {createWebhookSignature} from './webhook-signing.mjs'
import {validateOutboundDestination} from './egress-policy.mjs'
import {loadWebhookDeliveryForDispatch,recordWebhookDeliveryAttempt} from './webhook-delivery-store.mjs'

const timeoutMs=Math.max(500,Number(process.env.WEBHOOK_DELIVERY_TIMEOUT_MS||8000))
const maxResponseBytes=Math.max(512,Math.min(64*1024,Number(process.env.WEBHOOK_RESPONSE_BODY_BYTES||4096)))

const retryableStatus=status=>status===408||status===425||status===429||status>=500
const boundedRetryAfter=(value,attempt)=>{
  const header=Number(value)
  if(Number.isFinite(header)&&header>=0)return Math.min(3600,Math.max(1,header))
  return Math.min(3600,Math.max(5,(2**Math.max(0,attempt-1))*15))
}

export const dispatchWebhookDelivery=async({workspaceId,deliveryId})=>{
  const loaded=await loadWebhookDeliveryForDispatch({workspaceId,deliveryId})
  if(!loaded)return {missing:true}
  if(loaded.paused)return {paused:true,delivery:loaded.delivery}
  if(loaded.terminal)return {terminal:true,delivery:loaded.delivery}

  const {delivery,subscription}=loaded
  const body=JSON.stringify({
    id:delivery.eventId,
    type:delivery.eventType,
    createdAt:delivery.createdAt,
    data:delivery.payload
  })
  const timestamp=Math.floor(Date.now()/1000)
  const signature=createWebhookSignature({
    secret:subscription.signingSecret,
    timestamp,
    deliveryId:delivery.id,
    body
  })
  const validated=await validateOutboundDestination(subscription.destinationUrl,{purpose:'webhook destination'})
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),timeoutMs)
  const started=Date.now()
  try{
    const response=await fetch(validated.url,{
      method:'POST',
      redirect:'manual',
      signal:controller.signal,
      headers:{
        'Content-Type':'application/json',
        Accept:'application/json, text/plain;q=0.8, */*;q=0.5',
        'User-Agent':'AceMarketing-Webhook/1.0',
        'X-Ace-Delivery-ID':delivery.id,
        'X-Ace-Event-ID':delivery.eventId,
        'X-Ace-Event-Type':delivery.eventType,
        'X-Ace-Timestamp':String(timestamp),
        'X-Ace-Key-ID':subscription.signingKeyId,
        'X-Ace-Signature':signature
      },
      body
    })
    const buffer=Buffer.from(await response.arrayBuffer())
    const summary=buffer.subarray(0,maxResponseBytes).toString('utf8')
    const latencyMs=Date.now()-started
    if(response.ok){
      const state=await recordWebhookDeliveryAttempt({
        workspaceId,deliveryId,outcome:'delivered',httpStatus:response.status,latencyMs,
        responseSummary:summary,signingKeyId:subscription.signingKeyId
      })
      return {delivered:true,httpStatus:response.status,latencyMs,state}
    }
    if(retryableStatus(response.status)){
      const seconds=boundedRetryAfter(response.headers.get('retry-after'),delivery.attemptCount)
      const retryAt=new Date(Date.now()+seconds*1000).toISOString()
      await recordWebhookDeliveryAttempt({
        workspaceId,deliveryId,outcome:'retrying',httpStatus:response.status,latencyMs,
        responseSummary:summary,errorCode:'webhook_retryable_http',errorMessage:'receiver returned retryable HTTP '+response.status,
        retryAt,signingKeyId:subscription.signingKeyId
      })
      const error=new Error('webhook receiver returned retryable HTTP '+response.status)
      error.code='webhook_retryable_http'
      error.retryable=true
      error.retryAfter=seconds
      throw error
    }
    const state=await recordWebhookDeliveryAttempt({
      workspaceId,deliveryId,outcome:'dead_letter',httpStatus:response.status,latencyMs,
      responseSummary:summary,errorCode:'webhook_permanent_http',errorMessage:'receiver returned permanent HTTP '+response.status,
      signingKeyId:subscription.signingKeyId
    })
    return {delivered:false,terminal:true,httpStatus:response.status,latencyMs,state}
  }catch(error){
    if(error?.code==='webhook_retryable_http')throw error
    const message=error instanceof Error?error.message:String(error)
    const latencyMs=Date.now()-started
    if(error?.name==='AbortError'){
      await recordWebhookDeliveryAttempt({
        workspaceId,deliveryId,outcome:'unknown_outcome',latencyMs,errorCode:'webhook_timeout_unknown_outcome',
        errorMessage:message,signingKeyId:subscription.signingKeyId
      }).catch(()=>{})
      const unknown=new Error('webhook delivery timed out after request dispatch; outcome is unknown')
      unknown.code='webhook_timeout_unknown_outcome'
      unknown.unknownOutcome=true
      throw unknown
    }
    const seconds=boundedRetryAfter(null,delivery.attemptCount)
    const retryAt=new Date(Date.now()+seconds*1000).toISOString()
    await recordWebhookDeliveryAttempt({
      workspaceId,deliveryId,outcome:'retrying',latencyMs,errorCode:error?.code||'webhook_network_failure',
      errorMessage:message,retryAt,signingKeyId:subscription.signingKeyId
    }).catch(()=>{})
    if(error instanceof Error){error.retryable=true;throw error}
    const wrapped=new Error(message);wrapped.retryable=true;throw wrapped
  }finally{
    clearTimeout(timer)
  }
}
