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
  const externalIdentity=signal.externalId||signal.customerId
  if(externalIdentity) userData.external_id=[sha(externalIdentity)]
  if(signal.fbc) userData.fbc=signal.fbc
  if(signal.fbp) userData.fbp=signal.fbp
  const event={
    event_name:metaEventName(signal.event),
    event_time:Math.floor((Number.isNaN(new Date(signal.occurredAt||Date.now()).getTime())?Date.now():new Date(signal.occurredAt||Date.now()).getTime())/1000),
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

const OPENAI_STANDARD_EVENT_TYPES=new Set(['appointment_scheduled','checkout_started','contents_viewed','custom','items_added','lead_created','order_created','page_viewed','registration_completed','subscription_created','trial_started','app_installed','app_opened'])
const openAIEventType=signal=>{
  const explicit=String(signal.openaiEventType||'').trim().toLowerCase()
  if(OPENAI_STANDARD_EVENT_TYPES.has(explicit))return explicit
  const raw=String(signal.event||'').trim().toLowerCase().replace(/[.\s-]+/g,'_')
  const mapped={
    lead_created:'lead_created',lead:'lead_created',qualified_lead:'lead_created',
    appointment_scheduled:'appointment_scheduled',consultation_booked:'appointment_scheduled',meeting_scheduled:'appointment_scheduled',
    checkout_started:'checkout_started',checkout_initiated:'checkout_started',
    order_created:'order_created',purchase:'order_created',revenue_closed:'order_created',customer_enrolled:'order_created',
    registration_completed:'registration_completed',registration:'registration_completed',
    subscription_created:'subscription_created',trial_started:'trial_started',
    page_viewed:'page_viewed',contents_viewed:'contents_viewed',items_added:'items_added',
    app_installed:'app_installed',app_opened:'app_opened'
  }[raw]
  return mapped||'custom'
}
const openAIDataType=eventType=>{
  if(['lead_created','registration_completed','appointment_scheduled','app_installed','app_opened'].includes(eventType))return 'customer_action'
  if(['subscription_created','trial_started'].includes(eventType))return 'plan_enrollment'
  if(eventType==='custom')return 'custom'
  return 'contents'
}
const openAIActionSource=value=>{
  const raw=String(value||'web').toLowerCase()
  if(['web','mobile_app','offline','physical_store','phone_call','email','other'].includes(raw))return raw
  if(raw==='website')return 'web'
  if(raw==='app'||raw==='mobile')return 'mobile_app'
  if(raw==='store'||raw==='pos')return 'physical_store'
  if(raw==='phone'||raw==='call')return 'phone_call'
  return 'other'
}
const shaExternal=value=>createHash('sha256').update(String(value).trim()).digest('hex')
const deliverOpenAIAds=async(_workspaceId,signal)=>{
  const apiKey=String(process.env.OPENAI_CONVERSIONS_API_KEY||'')
  const pixelId=String(signal.openaiPixelId||process.env.OPENAI_ADS_PIXEL_ID||'')
  if(!apiKey||!pixelId) throw new Error('OPENAI_CONVERSIONS_API_KEY and OPENAI_ADS_PIXEL_ID are required')
  const type=openAIEventType(signal)
  const actionSource=type==='app_installed'||type==='app_opened'?'mobile_app':openAIActionSource(signal.actionSource)
  const occurred=new Date(signal.occurredAt||Date.now())
  const timestampMs=Number.isNaN(occurred.getTime())?Date.now():occurred.getTime()
  const dataType=openAIDataType(type)
  const data={type:dataType}
  const amountMinor=signal.openaiAmountMinor??signal.data?.openaiAmountMinor
  if(amountMinor!==undefined&&amountMinor!==null&&amountMinor!==''){
    const amount=Number(amountMinor)
    if(!Number.isInteger(amount)||amount<0) throw new Error('OpenAI Ads amount must be an integer in currency minor units')
    if(!signal.currency) throw new Error('OpenAI Ads currency is required when amount is present')
    data.amount=amount
    data.currency=String(signal.currency).toUpperCase()
  }
  if(dataType==='plan_enrollment'&&(signal.planId||signal.data?.planId)) data.plan_id=String(signal.planId||signal.data.planId)
  const contents=Array.isArray(signal.contents)?signal.contents:Array.isArray(signal.data?.contents)?signal.data.contents:null
  if(contents&&dataType!=='customer_action') data.contents=contents.slice(0,100)
  if(dataType==='custom'){
    for(const [key,value] of Object.entries(signal.data||{})){
      if(['openaiAmountMinor','contents','planId'].includes(key))continue
      data[key]=value
    }
  }
  const user={}
  if(signal.emailSha256)user.emails_sha256=[String(signal.emailSha256).toLowerCase()]
  else if(signal.email)user.emails_sha256=[sha(signal.email)]
  if(signal.phoneSha256)user.phone_numbers_sha256=[String(signal.phoneSha256).toLowerCase()]
  else if(signal.phone)user.phone_numbers_sha256=[createHash('sha256').update(String(signal.phone).replace(/[\s().+-]/g,'').replace(/^0+/,'')).digest('hex')]
  if(signal.customerId||signal.externalId)user.external_ids_sha256=[shaExternal(signal.externalId||signal.customerId)]
  if(signal.obref)user.obref=String(signal.obref)
  if(signal.country)user.countries=[String(signal.country).toUpperCase()]
  if(signal.city)user.cities=[String(signal.city)]
  if(signal.region)user.regions=[String(signal.region)]
  if(signal.postalCode)user.postal_codes=[String(signal.postalCode)]
  if(signal.ipAddress)user.ip_address=String(signal.ipAddress)
  if(signal.userAgent)user.user_agent=String(signal.userAgent)
  if(signal.androidAdvertisingId)user.android_advertising_id=String(signal.androidAdvertisingId)
  const id=String(signal.externalEventId||signal.idempotencyKey||signal.deliveryId||'').trim()
  if(!id) throw new Error('OpenAI Ads event id is required')
  const event={id,type,timestamp_ms:timestampMs,action_source:actionSource,data}
  if(type==='custom'){
    const customName=String(signal.openaiCustomEventName||signal.event||'custom_event').toLowerCase().replace(/[^a-z0-9_-]+/g,'_').replace(/^[_-]+|[_-]+$/g,'').slice(0,64)
    if(!customName)throw new Error('OpenAI Ads custom event name is required')
    event.custom_event_name=customName
  }
  if(signal.oppref)event.oppref=String(signal.oppref)
  if(actionSource==='web'){
    const sourceUrl=String(signal.eventSourceUrl||'')
    if(!sourceUrl)throw new Error('OpenAI Ads web events require eventSourceUrl')
    event.source_url=sourceUrl
  }else if(signal.eventSourceUrl)event.source_url=String(signal.eventSourceUrl)
  if(Object.keys(user).length)event.user=user
  if(signal.optOut!==undefined)event.opt_out=Boolean(signal.optOut)
  const body={validate_only:Boolean(signal.validateOnly),integration_source:'acemarketing',events:[event]}
  const endpoint='https://bzr.openai.com/v1/events?pid='+encodeURIComponent(pixelId)
  const result=await requestJson(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},body:JSON.stringify(body)})
  return {provider:'openai_ads',...result}
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
  if(destination.includes('chatgpt')||destination.includes('openai')) return deliverOpenAIAds(workspaceId,signal)
  if(destination.includes('meta')) return deliverMeta(workspaceId,signal)
  if(destination.includes('google')) return deliverGoogle(workspaceId,signal)
  if(destination.includes('webhook')) return deliverWebhook(signal)
  throw new Error('unsupported delivery destination: '+signal.destination)
}
