const lifecycleStates=Object.freeze([
  'draft','authorizing','verifying','active','degraded','suspended','revoked','deleted'
])

const failureKinds=Object.freeze([
  'transient','permanent','unauthorized','rate_limited','unknown_outcome'
])

const manifests=Object.freeze([
  {
    id:'meta-ads',
    displayName:'Meta Ads',
    category:'advertising',
    auth:{type:'oauth2',scopes:['ads_management','business_management']},
    operations:['conversion.write','audience.write','account.verify'],
    webhookEvents:[],
    schemas:{input:'marketing-signal.v1',output:'provider-delivery-result.v1'},
    rateLimit:{strategy:'provider-aware',retryAfter:true},
    idempotency:'event_id',
    healthCheck:'credential-and-account-verification',
    compatibility:{api:'graph',versionEnv:'META_GRAPH_VERSION'}
  },
  {
    id:'google-ads',
    displayName:'Google Ads',
    category:'advertising',
    auth:{type:'oauth2',scopes:['https://www.googleapis.com/auth/adwords']},
    operations:['conversion.write','audience.write','account.verify'],
    webhookEvents:[],
    schemas:{input:'marketing-signal.v1',output:'provider-delivery-result.v1'},
    rateLimit:{strategy:'provider-aware',retryAfter:true},
    idempotency:'order-or-click-conversion-identity',
    healthCheck:'credential-and-customer-verification',
    compatibility:{api:'google-ads',versionEnv:'GOOGLE_ADS_API_VERSION'}
  },
  {
    id:'x-ads',
    displayName:'X Ads',
    category:'advertising',
    auth:{type:'token',scopes:[]},
    operations:['conversion.write','account.verify'],
    webhookEvents:[],
    schemas:{input:'marketing-signal.v1',output:'provider-delivery-result.v1'},
    rateLimit:{strategy:'provider-aware',retryAfter:true},
    idempotency:'conversion_id',
    healthCheck:'credential-and-pixel-verification',
    compatibility:{api:'x-ads',version:'12'}
  },
  {
    id:'tiktok-ads',
    displayName:'TikTok Ads',
    category:'advertising',
    auth:{type:'token',scopes:[]},
    operations:['conversion.write','account.verify'],
    webhookEvents:[],
    schemas:{input:'marketing-signal.v1',output:'provider-delivery-result.v1'},
    rateLimit:{strategy:'provider-aware',retryAfter:true},
    idempotency:'event_id',
    healthCheck:'credential-and-pixel-verification',
    compatibility:{api:'tiktok-events'}
  },
  {
    id:'whatsapp-cloud',
    displayName:'WhatsApp Cloud',
    category:'messaging',
    auth:{type:'token',scopes:['whatsapp_business_messaging']},
    operations:['message.write','template.read','status.read'],
    webhookEvents:['message.received','message.status'],
    schemas:{input:'message-command.v1',output:'provider-message-result.v1'},
    rateLimit:{strategy:'destination-bulkhead',retryAfter:true},
    idempotency:'client-operation-id',
    healthCheck:'account-and-phone-verification',
    compatibility:{api:'meta-graph'}
  },
  {
    id:'custom-http',
    displayName:'Custom HTTP Integration',
    category:'custom',
    auth:{type:'secret-reference',scopes:[]},
    operations:['endpoint.verify','mapping.preview','sync.read'],
    webhookEvents:['custom'],
    schemas:{input:'connector-mapping.v1',output:'connector-test-result.v1'},
    rateLimit:{strategy:'tenant-and-destination-bounded',retryAfter:true},
    idempotency:'operation-id',
    healthCheck:'synthetic-redacted-test',
    compatibility:{api:'https'}
  }
])

const boundedString=(value,max=500)=>String(value??'').slice(0,max)

export const connectorLifecycleStates=()=>[...lifecycleStates]

export const validateConnectorManifest=manifest=>{
  if(!manifest||typeof manifest!=='object')throw new Error('connector manifest must be an object')
  for(const key of ['id','displayName','category','auth','operations','schemas','rateLimit','idempotency','healthCheck','compatibility']){
    if(manifest[key]==null)throw new Error('connector manifest missing '+key)
  }
  if(!/^[a-z0-9][a-z0-9-]{1,63}$/.test(manifest.id))throw new Error('invalid connector id '+manifest.id)
  if(!Array.isArray(manifest.operations)||manifest.operations.length===0)throw new Error('connector operations are required for '+manifest.id)
  if(!manifest.auth.type)throw new Error('connector auth type is required for '+manifest.id)
  if(!manifest.schemas.input||!manifest.schemas.output)throw new Error('connector schemas are required for '+manifest.id)
  return true
}

export const connectorCatalogSnapshot=()=>{
  const ids=new Set()
  const items=manifests.map(manifest=>{
    validateConnectorManifest(manifest)
    if(ids.has(manifest.id))throw new Error('duplicate connector manifest '+manifest.id)
    ids.add(manifest.id)
    return {
      ...manifest,
      lifecycleStates:[...lifecycleStates],
      failureKinds:[...failureKinds],
      credentialStorage:'server-secret-reference-only',
      connectionScope:'tenant-workspace',
      callbackOwnership:'server-bound-oauth-state'
    }
  })
  return {
    schemaVersion:'connector-catalog.v1',
    generatedAt:new Date().toISOString(),
    items
  }
}

export const normalizeConnectorFailure=(error,{requestMayHaveReachedProvider=false}={})=>{
  const status=Number(error?.status||error?.statusCode||0)
  const code=boundedString(error?.code||'').toLowerCase()
  const message=boundedString(error?.message||error||'connector operation failed')
  const providerReference=boundedString(error?.providerRequestId||error?.requestId||error?.correlationId||'',120)||null

  if(status===401||status===403){
    return {kind:'unauthorized',retryable:false,status,providerReference,message}
  }
  if(status===429){
    return {kind:'rate_limited',retryable:true,status,providerReference,message,retryAfterSeconds:Number(error?.retryAfterSeconds||0)||null}
  }
  if(status>=500&&status<=599){
    return {kind:requestMayHaveReachedProvider?'unknown_outcome':'transient',retryable:!requestMayHaveReachedProvider,status,providerReference,message}
  }
  if(code.includes('timeout')||code.includes('abort')||code.includes('econnreset')||code.includes('etimedout')){
    return {kind:requestMayHaveReachedProvider?'unknown_outcome':'transient',retryable:!requestMayHaveReachedProvider,status:status||null,providerReference,message}
  }
  if(status>=400&&status<=499){
    return {kind:'permanent',retryable:false,status,providerReference,message}
  }
  return {kind:requestMayHaveReachedProvider?'unknown_outcome':'transient',retryable:!requestMayHaveReachedProvider,status:status||null,providerReference,message}
}
