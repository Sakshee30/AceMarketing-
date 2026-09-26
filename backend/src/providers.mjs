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

const pinterestEventName=event=>{
  const raw=String(event||'lead').trim().toLowerCase().replace(/[.\s]+/g,'_')
  const mapped={
    lead_created:'lead',
    lead_qualified:'lead',
    qualified_lead:'lead',
    consultation_booked:'schedule',
    meeting_scheduled:'schedule',
    revenue_closed:'checkout',
    customer_enrolled:'checkout',
    purchase:'checkout',
    registration_completed:'signup',
    trial_started:'start_trial',
    subscription_created:'subscribe',
    page_view:'page_visit',
    page_viewed:'page_visit'
  }[raw]
  return (mapped||raw.replace(/[^a-z0-9_-]+/g,'_').slice(0,100))||'lead'
}

const pinterestActionSource=value=>{
  const raw=String(value||'web').toLowerCase()
  if(['app_android','app_ios','web','offline'].includes(raw)) return raw
  if(['website','browser'].includes(raw)) return 'web'
  if(['store','pos','phone','call','crm'].includes(raw)) return 'offline'
  return 'web'
}

const deliverPinterest=async(_workspaceId,signal)=>{
  const advertiserId=String(signal.pinterestAdvertiserId||signal.data?.pinterestAdvertiserId||process.env.PINTEREST_AD_ACCOUNT_ID||'').trim()
  const token=String(signal.pinterestConversionToken||signal.data?.pinterestConversionToken||process.env.PINTEREST_CONVERSION_TOKEN||'').trim()
  if(!advertiserId||!token) throw new Error('PINTEREST_AD_ACCOUNT_ID and PINTEREST_CONVERSION_TOKEN are required')
  const occurred=new Date(signal.occurredAt||Date.now())
  const eventTime=Math.floor((Number.isNaN(occurred.getTime())?Date.now():occurred.getTime())/1000)
  const eventId=String(signal.externalEventId||signal.idempotencyKey||signal.deliveryId||'').trim()
  if(!eventId) throw new Error('Pinterest conversion event id is required for deduplication')
  const userData={}
  const emailHash=signal.emailSha256||signal.data?.emailSha256||(signal.email?sha(signal.email):'')
  if(emailHash) userData.em=[String(emailHash).toLowerCase()]
  const phoneHash=signal.phoneSha256||signal.data?.phoneSha256||(signal.phone?sha(String(signal.phone).replace(/\D/g,'')):'')
  if(phoneHash) userData.ph=[String(phoneHash).toLowerCase()]
  const externalId=signal.externalId||signal.customerId||signal.data?.externalId
  if(externalId) userData.external_id=[sha(String(externalId))]
  const clientIp=signal.ipAddress||signal.data?.ipAddress
  const clientUa=signal.userAgent||signal.data?.userAgent
  if(clientIp) userData.client_ip_address=String(clientIp)
  if(clientUa) userData.client_user_agent=String(clientUa)
  if(signal.epik||signal.data?.epik) userData.click_id=String(signal.epik||signal.data.epik)
  const maid=signal.androidAdvertisingId||signal.idfa||signal.data?.androidAdvertisingId||signal.data?.idfa
  if(maid) userData.hashed_maids=[sha(String(maid))]
  const hasRequiredIdentity=Boolean(userData.em?.length||userData.hashed_maids?.length||(userData.client_ip_address&&userData.client_user_agent))
  if(!hasRequiredIdentity) throw new Error('Pinterest conversion requires hashed email, hashed mobile-ad ID, or both client IP and user agent')
  const customData={}
  if(signal.currency) customData.currency=String(signal.currency).toUpperCase()
  if(signal.value!=null) customData.value=String(Number(signal.value))
  if(signal.orderId||signal.data?.orderId) customData.order_id=String(signal.orderId||signal.data.orderId)
  if(signal.data?.numItems!=null) customData.num_items=Number(signal.data.numItems)
  const event={
    event_name:pinterestEventName(signal.pinterestEventName||signal.event),
    action_source:pinterestActionSource(signal.actionSource),
    event_time:eventTime,
    event_id:eventId,
    opt_out:Boolean(signal.optOut),
    user_data:userData,
    ...(signal.eventSourceUrl?{event_source_url:String(signal.eventSourceUrl)}:{}),
    ...(Object.keys(customData).length?{custom_data:customData}:{})
  }
  const test=signal.validateOnly||signal.data?.testEvent||process.env.PINTEREST_TEST_EVENTS==='true'
  const endpoint='https://api.pinterest.com/v5/ad_accounts/'+encodeURIComponent(advertiserId)+'/events'+(test?'?test=true':'')
  const result=await requestJson(endpoint,{
    method:'POST',
    headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({data:[event]})
  })
  if(Array.isArray(result.body?.events)&&result.body.events.some(item=>item?.status==='failed')) throw new Error('Pinterest conversion validation failed: '+JSON.stringify(result.body.events).slice(0,1500))
  return {provider:'pinterest',...result}
}

const microsoftEventName=event=>String(event||'conversion')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9_-]+/g,'_')
  .replace(/^[_-]+|[_-]+$/g,'')
  .slice(0,128)||'conversion'

const deliverMicrosoft=async(_workspaceId,signal)=>{
  const tagId=String(signal.microsoftUetTagId||signal.data?.microsoftUetTagId||process.env.MICROSOFT_UET_TAG_ID||'').trim()
  const token=String(signal.microsoftCapiToken||signal.data?.microsoftCapiToken||process.env.MICROSOFT_CAPI_TOKEN||'').trim()
  if(!tagId||!token) throw new Error('MICROSOFT_UET_TAG_ID and MICROSOFT_CAPI_TOKEN are required')
  const occurred=new Date(signal.occurredAt||Date.now())
  const eventTime=Math.floor((Number.isNaN(occurred.getTime())?Date.now():occurred.getTime())/1000)
  if(eventTime<Math.floor(Date.now()/1000)-7*24*60*60) throw new Error('Microsoft CAPI eventTime must be within the last 7 days')
  const eventId=String(signal.externalEventId||signal.idempotencyKey||signal.deliveryId||'').trim()
  if(!eventId) throw new Error('Microsoft CAPI event id is required for deduplication')
  const userData={}
  const msclkid=signal.msclkid||signal.data?.msclkid
  if(msclkid) userData.msclkid=String(msclkid)
  const emailHash=signal.emailSha256||signal.data?.emailSha256||(signal.email?sha(signal.email):'')
  if(emailHash) userData.em=String(emailHash).toLowerCase()
  const phoneHash=signal.phoneSha256||signal.data?.phoneSha256||(signal.phone?sha(String(signal.phone).replace(/\D/g,'')):'')
  if(phoneHash) userData.ph=String(phoneHash).toLowerCase()
  const anonymousId=signal.anonymousId||signal.visitorId||signal.data?.anonymousId||signal.data?.visitorId
  if(anonymousId) userData.anonymousId=String(anonymousId)
  const externalId=signal.externalId||signal.customerId||signal.data?.externalId
  if(externalId) userData.externalId=String(externalId)
  if(signal.userAgent||signal.data?.userAgent) userData.clientUserAgent=String(signal.userAgent||signal.data.userAgent)
  if(signal.ipAddress||signal.data?.ipAddress) userData.clientIpAddress=String(signal.ipAddress||signal.data.ipAddress)
  if(signal.idfa||signal.data?.idfa) userData.idfa=String(signal.idfa||signal.data.idfa)
  if(signal.androidAdvertisingId||signal.data?.androidAdvertisingId) userData.gaid=String(signal.androidAdvertisingId||signal.data.androidAdvertisingId)
  if(!Object.keys(userData).some(key=>['anonymousId','externalId','em','ph','msclkid','idfa','gaid'].includes(key))) throw new Error('Microsoft CAPI requires at least one supported user identifier')
  const customData={}
  if(signal.value!=null) customData.value=Number(signal.value)
  if(signal.currency) customData.currency=String(signal.currency).toUpperCase()
  if(signal.orderId||signal.data?.transactionId) customData.transactionId=String(signal.orderId||signal.data.transactionId)
  if(signal.data?.eventCategory) customData.eventCategory=String(signal.data.eventCategory)
  if(signal.data?.eventLabel) customData.eventLabel=String(signal.data.eventLabel)
  const event={
    eventType:'custom',
    eventId,
    eventName:microsoftEventName(signal.microsoftEventName||signal.event),
    eventTime,
    adStorageConsent:signal.adStorageConsent===false?'D':'G',
    userData,
    ...(Object.keys(customData).length?{customData}:{})
  }
  if(signal.eventSourceUrl) event.eventSourceUrl=String(signal.eventSourceUrl)
  const result=await requestJson('https://capi.uet.microsoft.com/v1/'+encodeURIComponent(tagId)+'/events',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    body:JSON.stringify({data:[event],continueOnValidationError:false,dataProvider:'acemarketing'})
  })
  return {provider:'microsoft_ads',...result}
}

const deliverLinkedIn=async(workspaceId,signal)=>{
  const token=await credentialFor(workspaceId,'LinkedIn Ads')
  const accessToken=token.access_token
  const conversion=String(signal.linkedinConversionUrn||signal.data?.linkedinConversionUrn||process.env.LINKEDIN_CONVERSION_URN||'').trim()
  const version=String(process.env.LINKEDIN_MARKETING_VERSION||'202609').trim()
  if(!accessToken||!conversion) throw new Error('LinkedIn Ads access token and LINKEDIN_CONVERSION_URN are required')
  const userIds=[]
  const emailHash=signal.emailSha256||signal.data?.emailSha256||(signal.email?sha(signal.email):'')
  if(emailHash) userIds.push({idType:'SHA256_EMAIL',idValue:String(emailHash).toLowerCase()})
  const liUuid=signal.linkedinFirstPartyAdsTrackingUuid||signal.data?.linkedinFirstPartyAdsTrackingUuid||signal.liFatId||signal.data?.liFatId
  if(liUuid) userIds.push({idType:'LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID',idValue:String(liUuid)})
  if(signal.androidAdvertisingId||signal.data?.androidAdvertisingId) userIds.push({idType:'GOOGLE_AID',idValue:String(signal.androidAdvertisingId||signal.data.androidAdvertisingId)})
  if(!userIds.length) throw new Error('LinkedIn conversion requires a hashed email, LinkedIn first-party ads tracking UUID, or Google advertising ID')
  const occurred=new Date(signal.occurredAt||Date.now())
  const event={
    conversion,
    conversionHappenedAt:Number.isNaN(occurred.getTime())?Date.now():occurred.getTime(),
    user:{userIds},
    eventId:String(signal.externalEventId||signal.idempotencyKey||signal.deliveryId||'')
  }
  if(!event.eventId) throw new Error('LinkedIn conversion event id is required')
  if(signal.value!=null&&signal.currency){
    event.conversionValue={currencyCode:String(signal.currency).toUpperCase(),amount:String(Number(signal.value))}
  }
  const externalId=signal.externalId||signal.customerId
  if(externalId) event.user.externalIds=[String(externalId)]
  const result=await requestJson('https://api.linkedin.com/rest/conversionEvents',{
    method:'POST',
    headers:{
      'Authorization':'Bearer '+accessToken,
      'Content-Type':'application/json',
      'Linkedin-Version':version,
      'X-Restli-Protocol-Version':'2.0.0'
    },
    body:JSON.stringify(event)
  })
  return {provider:'linkedin',...result}
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
  if(destination.includes('linkedin')) return deliverLinkedIn(workspaceId,signal)
  if(destination.includes('microsoft')||destination.includes('bing')) return deliverMicrosoft(workspaceId,signal)
  if(destination.includes('pinterest')) return deliverPinterest(workspaceId,signal)
  if(destination.includes('webhook')) return deliverWebhook(signal)
  throw new Error('unsupported delivery destination: '+signal.destination)
}
