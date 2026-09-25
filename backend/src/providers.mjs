import { createHash, createHmac } from 'node:crypto'
import { decryptSecret } from './vault.mjs'
import { getState, withWorkspace } from './store.mjs'

const sha=value=>createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex')
const credentialFor=async(workspaceId,connector)=>withWorkspace(workspaceId,async()=>{
  const state=await getState()
  const record=(state.connectorCredentials||[]).find(x=>x.connector===connector)
  if(!record?.encrypted) throw new Error(connector+' credential is not connected')
  return decryptSecret(record.encrypted)
})

const requestJson=async(url,options)=>{
  const started=Date.now()
  const response=await fetch(url,options)
  const text=await response.text()
  let body
  try{body=text?JSON.parse(text):{}}catch{body={raw:text.slice(0,2000)}}
  if(!response.ok){
    const error=new Error('provider request failed: '+response.status)
    error.status=response.status
    error.providerBody=body
    throw error
  }
  return {status:response.status,latencyMs:Date.now()-started,body}
}

const metaEventName=event=>({
  'lead.created':'Lead',
  'lead.qualified':'QualifiedLead',
  'consultation.booked':'Schedule',
  'revenue.closed':'Purchase',
  'customer.enrolled':'Purchase'
}[event]||String(event||'Lead').replace(/[^A-Za-z0-9_]/g,'_'))

const deliverMeta=async(workspaceId,signal)=>{
  const token=await credentialFor(workspaceId,'Meta Ads')
  const accessToken=token.access_token
  const datasetId=String(signal.metaDatasetId||process.env.META_DATASET_ID||'')
  if(!accessToken||!datasetId) throw new Error('Meta access token and META_DATASET_ID are required')
  const version=process.env.META_GRAPH_VERSION||'v26.0'
  const userData={}
  if(signal.emailSha256) userData.em=[signal.emailSha256]
  else if(signal.email) userData.em=[sha(signal.email)]
  if(signal.phoneSha256) userData.ph=[signal.phoneSha256]
  else if(signal.phone) userData.ph=[sha(String(signal.phone).replace(/\D/g,''))]
  if(signal.externalId) userData.external_id=[sha(signal.externalId)]
  if(signal.fbc) userData.fbc=signal.fbc
  if(signal.fbp) userData.fbp=signal.fbp
  const event={
    event_name:metaEventName(signal.event),
    event_time:Math.floor(new Date(signal.occurredAt||Date.now()).getTime()/1000),
    event_id:String(signal.externalEventId||signal.idempotencyKey||signal.deliveryId||''),
    action_source:String(signal.actionSource||'website'),
    user_data:userData,
    custom_data:{
      ...(signal.value!=null?{value:Number(signal.value)}:{}),
      ...(signal.currency?{currency:String(signal.currency)}:{}),
      ...(signal.orderId?{order_id:String(signal.orderId)}:{})
    }
  }
  if(signal.eventSourceUrl) event.event_source_url=signal.eventSourceUrl
  const endpoint=`https://graph.facebook.com/${version}/${encodeURIComponent(datasetId)}/events?access_token=${encodeURIComponent(accessToken)}`
  const body={data:[event]}
  if(process.env.META_TEST_EVENT_CODE) body.test_event_code=process.env.META_TEST_EVENT_CODE
  const result=await requestJson(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  return {provider:'meta',...result}
}

const googleDateTime=value=>{
  const d=new Date(value||Date.now())
  return d.toISOString().replace('T',' ').replace('Z','+00:00').replace(/\.\d{3}/,'')
}
const deliverGoogle=async(workspaceId,signal)=>{
  const token=await credentialFor(workspaceId,'Google Ads')
  const accessToken=token.access_token
  const developerToken=process.env.GOOGLE_ADS_DEVELOPER_TOKEN||''
  const customerId=String(signal.googleCustomerId||process.env.GOOGLE_ADS_CUSTOMER_ID||'').replace(/-/g,'')
  const conversionAction=String(signal.googleConversionAction||process.env.GOOGLE_ADS_CONVERSION_ACTION||'')
  if(!accessToken||!developerToken||!customerId||!conversionAction) throw new Error('Google Ads access token, developer token, customer ID and conversion action are required')
  const identifiers=[]
  if(signal.emailSha256||signal.email) identifiers.push({hashedEmail:signal.emailSha256||sha(signal.email)})
  if(signal.phoneSha256||signal.phone) identifiers.push({hashedPhoneNumber:signal.phoneSha256||sha(String(signal.phone).replace(/\D/g,''))})
  const conversion={
    conversionAction,
    conversionDateTime:googleDateTime(signal.occurredAt),
    ...(signal.gclid?{gclid:String(signal.gclid)}:{}),
    ...(signal.gbraid?{gbraid:String(signal.gbraid)}:{}),
    ...(signal.wbraid?{wbraid:String(signal.wbraid)}:{}),
    ...(identifiers.length?{userIdentifiers:identifiers}:{}),
    ...(signal.value!=null?{conversionValue:Number(signal.value)}:{}),
    ...(signal.currency?{currencyCode:String(signal.currency)}:{}),
    ...(signal.orderId?{orderId:String(signal.orderId)}:{}),
    consent:{adUserData:signal.adUserDataConsent===false?'DENIED':'GRANTED'}
  }
  if(!conversion.gclid&&!conversion.gbraid&&!conversion.wbraid&&!identifiers.length) throw new Error('Google conversion requires click ID or hashed user identifier')
  const version=process.env.GOOGLE_ADS_API_VERSION||'v25'
  const endpoint=`https://googleads.googleapis.com/${version}/customers/${customerId}:uploadClickConversions`
  const headers={
    'Content-Type':'application/json',
    'Authorization':'Bearer '+accessToken,
    'developer-token':developerToken
  }
  if(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers['login-customer-id']=process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/-/g,'')
  const result=await requestJson(endpoint,{method:'POST',headers,body:JSON.stringify({conversions:[conversion],partialFailure:true})})
  if(result.body?.partialFailureError) throw new Error('Google Ads partial failure: '+JSON.stringify(result.body.partialFailureError).slice(0,1500))
  return {provider:'google',...result}
}

const deliverWebhook=async(signal)=>{
  const endpoint=String(signal.webhookUrl||process.env.CUSTOM_WEBHOOK_URL||'')
  if(!endpoint) throw new Error('CUSTOM_WEBHOOK_URL is required')
  const body=JSON.stringify({
    id:signal.deliveryId,
    event:signal.event,
    occurredAt:signal.occurredAt,
    customerId:signal.customerId||null,
    value:signal.value??null,
    currency:signal.currency||null,
    data:signal.data||{}
  })
  const timestamp=String(Math.floor(Date.now()/1000))
  const secret=process.env.CUSTOM_WEBHOOK_SECRET||''
  const headers={'Content-Type':'application/json','X-Ace-Timestamp':timestamp}
  if(secret) headers['X-Ace-Signature']='sha256='+createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex')
  const result=await requestJson(endpoint,{method:'POST',headers,body})
  return {provider:'custom_webhook',...result}
}

export const deliverSignal=async(workspaceId,signal)=>{
  const destination=String(signal.destination||'').toLowerCase()
  if(destination.includes('meta')) return deliverMeta(workspaceId,signal)
  if(destination.includes('google')) return deliverGoogle(workspaceId,signal)
  if(destination.includes('webhook')) return deliverWebhook(signal)
  throw new Error('unsupported delivery destination: '+signal.destination)
}
