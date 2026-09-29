import {connectorCredential} from './connector-auth.mjs'
import {getAudienceBundle,getLeadProfile} from './lead-ops.mjs'
import {consentAllows} from './consent.mjs'
import {ProviderExecutionError} from './ai-providers.mjs'

const credentialFor=async(workspaceId,connector)=>{
  const result=await connectorCredential(workspaceId,connector)
  return result.token
}

const eligibleAudienceMembers=async(workspaceId,bundle)=>{
  const eligible=[]
  for(const member of bundle.members){
    const subjectType=member.profile_attributes?.consentSubjectType==='visitor'?'visitor':'customer'
    const subjectId=member.profile_attributes?.consentSubjectId||member.external_lead_id
    const consent=await consentAllows(workspaceId,{subjectType,subjectId,category:'marketing'}).catch(()=>({allowed:false}))
    if(consent.allowed) eligible.push(member)
  }
  return eligible
}

const activationProviderTimeoutMs=()=>Math.max(1000,Math.min(Number(process.env.ACTIVATION_PROVIDER_TIMEOUT_MS||45000),120000))

export const activationProviderForUrl=url=>{
  let parsed
  try{parsed=new URL(url)}
  catch{throw new Error('activation provider URL is invalid')}
  if(parsed.protocol!=='https:')throw new Error('activation provider URL must use HTTPS')
  const host=parsed.hostname.toLowerCase()
  if(host==='googleads.googleapis.com')return 'google'
  if(host==='graph.facebook.com')return 'meta'
  if(host==='api.hubapi.com')return 'hubspot'
  if(/^www\.zohoapis\.(com|eu|in|com\.au|jp|ca|sa)$/.test(host))return 'zoho'
  if(host.endsWith('.salesforce.com'))return 'salesforce'
  throw new Error('activation provider host is not allowlisted')
}

const requestJson=async(url,options={})=>{
  const started=Date.now()
  const provider=activationProviderForUrl(url)
  const controller=new AbortController()
  const timeout=setTimeout(()=>controller.abort('activation_provider_timeout'),activationProviderTimeoutMs())
  let submitted=false
  try{
    submitted=true
    const response=await fetch(url,{...options,signal:controller.signal})
    const providerRequestId=response.headers.get('request-id')
      ||response.headers.get('x-request-id')
      ||response.headers.get('x-goog-request-id')
      ||response.headers.get('x-fb-trace-id')
      ||null
    const raw=await response.text()
    let body
    try{body=raw?JSON.parse(raw):{}}catch{body={raw:raw.slice(0,2000)}}
    if(!response.ok){
      const error=new ProviderExecutionError('provider request failed: '+response.status,{
        provider,task:'activation',status:response.status,providerRequestId,unknownOutcome:false
      })
      error.providerBody=body
      throw error
    }
    return {status:response.status,latencyMs:Date.now()-started,body,providerRequestId}
  }catch(error){
    if(error instanceof ProviderExecutionError)throw error
    const aborted=controller.signal.aborted
    throw new ProviderExecutionError(
      aborted?'activation provider request timed out':'activation provider request failed before a confirmed response',
      {provider,task:'activation',status:null,providerRequestId:null,unknownOutcome:submitted,cause:aborted?'timeout':'network'}
    )
  }finally{
    clearTimeout(timeout)
  }
}

const metaAudience=async(workspaceId,audienceId)=>{
  const bundle=await getAudienceBundle(workspaceId,audienceId)
  if(!bundle) throw new Error('audience not found')
  if(!bundle.members.length) throw new Error('audience has no materialized members')
  const members=await eligibleAudienceMembers(workspaceId,bundle)
  if(!members.length) throw new Error('audience has no members with marketing consent')
  const token=await credentialFor(workspaceId,'Meta Ads')
  const accessToken=token.access_token
  const adAccount=String(process.env.META_AD_ACCOUNT_ID||'').replace(/^act_/,'')
  if(!accessToken||!adAccount) throw new Error('Meta access token and META_AD_ACCOUNT_ID are required')
  const version=process.env.META_GRAPH_VERSION||'v26.0'
  const existing=bundle.audience.provider_state?.meta?.externalId
  let externalId=existing
  if(!externalId){
    const created=await requestJson(`https://graph.facebook.com/${version}/act_${adAccount}/customaudiences`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        name:bundle.audience.name,
        subtype:'CUSTOM',
        description:'AceMarketing first-party audience '+bundle.audience.id,
        customer_file_source:'USER_PROVIDED_ONLY',
        access_token:accessToken
      })
    })
    externalId=created.body?.id
    if(!externalId) throw new Error('Meta did not return a custom audience id')
  }
  const identityMode=String(bundle.audience.identity_mode||'auto').toLowerCase()
  const hasContact=members.some(member=>member.email_sha256||member.phone_sha256)
  const useDevice=identityMode==='device'||(identityMode==='auto'&&!hasContact)
  const schema=useDevice?['MADID']:['EMAIL','PHONE']
  const data=useDevice
    ? members.filter(member=>member.device_id).map(member=>[member.device_id])
    : members.filter(member=>member.email_sha256||member.phone_sha256).map(member=>[member.email_sha256||'',member.phone_sha256||''])
  if(!data.length) throw new Error(useDevice?'Meta device audience requires first-party mobile advertising IDs':'Meta audience requires hashed email or phone identifiers')
  const chunks=[]
  for(let i=0;i<data.length;i+=10000) chunks.push(data.slice(i,i+10000))
  let received=0
  for(const chunk of chunks){
    const result=await requestJson(`https://graph.facebook.com/${version}/${externalId}/users`,{
      method:bundle.audience.mode.toLowerCase()==='suppress'?'DELETE':'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({payload:{schema,data:chunk},access_token:accessToken})
    })
    received+=Number(result.body?.num_received||chunk.length)
  }
  return {provider:'meta',externalId,received,status:200}
}

const googleHeaders=async workspaceId=>{
  const token=await credentialFor(workspaceId,'Google Ads')
  const accessToken=token.access_token
  const developerToken=process.env.GOOGLE_ADS_DEVELOPER_TOKEN||''
  if(!accessToken||!developerToken) throw new Error('Google Ads OAuth token and developer token are required')
  const headers={'Content-Type':'application/json','Authorization':'Bearer '+accessToken,'developer-token':developerToken}
  if(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers['login-customer-id']=String(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID).replace(/-/g,'')
  return headers
}

const boundedBudgetMicros=value=>{
  const n=Number(value)
  if(!Number.isSafeInteger(n)||n<=0)throw new Error('budget amount must be a positive safe integer in micros')
  return n
}

export const changeGoogleAdsCampaignBudget=async(workspaceId,input={})=>{
  const resourceName=String(input.campaignBudgetResourceName||'').trim()
  const match=resourceName.match(/^customers\/(\d+)\/campaignBudgets\/(\d+)$/)
  if(!match)throw new Error('campaignBudgetResourceName must be a Google Ads campaign budget resource name')
  const customerId=String(process.env.GOOGLE_ADS_CUSTOMER_ID||'').replace(/-/g,'')
  if(!customerId)throw new Error('GOOGLE_ADS_CUSTOMER_ID is required')
  if(match[1]!==customerId)throw new Error('campaign budget belongs to a different Google Ads customer')

  const expectedCurrentAmountMicros=boundedBudgetMicros(input.expectedCurrentAmountMicros)
  const newAmountMicros=boundedBudgetMicros(input.newAmountMicros)
  const configuredMaxChangePct=Number(process.env.AI_ACTIVATION_MAX_BUDGET_CHANGE_PCT||20)
  if(!Number.isFinite(configuredMaxChangePct)||configuredMaxChangePct<=0||configuredMaxChangePct>100){
    throw new Error('AI_ACTIVATION_MAX_BUDGET_CHANGE_PCT must be greater than 0 and at most 100')
  }
  const maxChangePct=configuredMaxChangePct
  const absoluteCapRaw=String(process.env.AI_ACTIVATION_MAX_DAILY_BUDGET_MICROS||'').trim()
  if(absoluteCapRaw){
    const absoluteCap=boundedBudgetMicros(absoluteCapRaw)
    if(newAmountMicros>absoluteCap)throw new Error('proposed Google Ads budget exceeds AI_ACTIVATION_MAX_DAILY_BUDGET_MICROS')
  }

  const version=process.env.GOOGLE_ADS_API_VERSION||'v25'
  const headers=await googleHeaders(workspaceId)
  const query=[
    'SELECT campaign_budget.resource_name, campaign_budget.amount_micros, campaign_budget.reference_count',
    'FROM campaign_budget',
    "WHERE campaign_budget.resource_name = '"+resourceName+"'",
    'LIMIT 1'
  ].join(' ')
  const observed=await requestJson(`https://googleads.googleapis.com/${version}/customers/${customerId}/googleAds:search`,{
    method:'POST',headers,body:JSON.stringify({query})
  })
  const current=observed.body?.results?.[0]?.campaignBudget
  if(!current)throw new Error('Google Ads campaign budget was not found')
  const observedAmount=boundedBudgetMicros(current.amountMicros)
  if(observedAmount!==expectedCurrentAmountMicros){
    throw new Error('stale budget proposal: current Google Ads amount no longer matches the approved snapshot')
  }
  const referenceCount=Math.max(0,Number(current.referenceCount||0))
  if(referenceCount>1&&input.sharedBudgetAcknowledged!==true){
    throw new Error('shared campaign budget affects multiple campaigns; sharedBudgetAcknowledged=true is required')
  }
  const changePct=Math.abs(newAmountMicros-observedAmount)/observedAmount*100
  if(changePct>maxChangePct+Number.EPSILON){
    throw new Error('proposed Google Ads budget change exceeds the configured percentage limit')
  }

  const mutated=await requestJson(`https://googleads.googleapis.com/${version}/customers/${customerId}/campaignBudgets:mutate`,{
    method:'POST',headers,
    body:JSON.stringify({
      operations:[{
        update:{resourceName,amountMicros:newAmountMicros},
        updateMask:'amountMicros'
      }],
      partialFailure:false,
      validateOnly:false
    })
  })
  const returned=mutated.body?.results?.[0]?.resourceName
  if(returned&&returned!==resourceName)throw new Error('Google Ads returned an unexpected campaign budget resource')
  return {
    provider:'google',
    externalId:resourceName,
    status:mutated.status,
    providerRequestId:mutated.providerRequestId||observed.providerRequestId||null,
    previousAmountMicros:observedAmount,
    newAmountMicros,
    referenceCount,
    changePct
  }
}


const googleAudience=async(workspaceId,audienceId)=>{
  const mode=process.env.GOOGLE_CUSTOMER_MATCH_MODE||'legacy'
  if(mode!=='legacy') throw new Error('Google Customer Match Data Manager mode requires a configured Data Manager ingestion adapter; legacy mode is disabled')
  const bundle=await getAudienceBundle(workspaceId,audienceId)
  if(!bundle) throw new Error('audience not found')
  if(!bundle.members.length) throw new Error('audience has no materialized members')
  const members=await eligibleAudienceMembers(workspaceId,bundle)
  if(!members.length) throw new Error('audience has no members with marketing consent')
  const customerId=String(process.env.GOOGLE_ADS_CUSTOMER_ID||'').replace(/-/g,'')
  if(!customerId) throw new Error('GOOGLE_ADS_CUSTOMER_ID is required')
  const version=process.env.GOOGLE_ADS_API_VERSION||'v25'
  const headers=await googleHeaders(workspaceId)
  const identityMode=String(bundle.audience.identity_mode||'auto').toLowerCase()
  const hasContact=members.some(member=>member.email_sha256||member.phone_sha256)
  const useDevice=identityMode==='device'||(identityMode==='auto'&&!hasContact)
  const appId=members.find(member=>member.app_id)?.app_id||process.env.GOOGLE_CUSTOMER_MATCH_APP_ID||''
  if(useDevice&&!appId) throw new Error('Google mobile-ID audience requires appId on the profile or GOOGLE_CUSTOMER_MATCH_APP_ID')
  let userList=bundle.audience.provider_state?.google?.externalId
  if(!userList){
    const created=await requestJson(`https://googleads.googleapis.com/${version}/customers/${customerId}/userLists:mutate`,{
      method:'POST',headers,
      body:JSON.stringify({operations:[{create:{name:bundle.audience.name,description:'AceMarketing '+bundle.audience.id,membershipStatus:'OPEN',membershipLifeSpan:540,crmBasedUserList:useDevice?{uploadKeyType:'MOBILE_ADVERTISING_ID',appId}:{uploadKeyType:'CONTACT_INFO'}}}],partialFailure:false})
    })
    userList=created.body?.results?.[0]?.resourceName
    if(!userList) throw new Error('Google Ads did not return a user list resource name')
  }
  const createdJob=await requestJson(`https://googleads.googleapis.com/${version}/customers/${customerId}/offlineUserDataJobs:create`,{
    method:'POST',headers,
    body:JSON.stringify({job:{type:'CUSTOMER_MATCH_USER_LIST',customerMatchUserListMetadata:{userList,consent:{adUserData:'GRANTED',adPersonalization:'GRANTED'}}}})
  })
  const job=createdJob.body?.resourceName
  if(!job) throw new Error('Google Ads did not return an offline user data job')
  const operations=members.map(member=>{
    const userIdentifiers=[]
    if(useDevice){
      if(member.device_id) userIdentifiers.push({mobileId:member.device_id})
    }else{
      if(member.email_sha256) userIdentifiers.push({hashedEmail:member.email_sha256})
      if(member.phone_sha256) userIdentifiers.push({hashedPhoneNumber:member.phone_sha256})
    }
    return {[bundle.audience.mode.toLowerCase()==='suppress'?'remove':'create']:{userIdentifiers}}
  }).filter(op=>Object.values(op)[0].userIdentifiers.length)
  if(!operations.length) throw new Error(useDevice?'Google audience requires mobile advertising IDs':'Google audience requires hashed email or phone identifiers')
  for(let i=0;i<operations.length;i+=10000){
    await requestJson(`https://googleads.googleapis.com/${version}/${job}:addOperations`,{
      method:'POST',headers,
      body:JSON.stringify({operations:operations.slice(i,i+10000),enablePartialFailure:true})
    })
  }
  await requestJson(`https://googleads.googleapis.com/${version}/${job}:run`,{method:'POST',headers,body:'{}'})
  return {provider:'google',externalId:userList,job,received:operations.length,status:200}
}

export const syncAudienceProvider=async(workspaceId,audienceId,provider)=>{
  const p=String(provider).toLowerCase()
  if(p==='meta'||p==='meta ads') return metaAudience(workspaceId,audienceId)
  if(p==='google'||p==='google ads') return googleAudience(workspaceId,audienceId)
  throw new Error('unsupported audience provider: '+provider)
}

const hubspotWriteback=async(workspaceId,lead,fields)=>{
  const token=await credentialFor(workspaceId,'HubSpot')
  const recordId=fields.recordId||lead.attributes?.hubspotContactId
  if(!recordId) throw new Error('HubSpot contact recordId is required')
  const properties={ace_lead_score:String(lead.score),ace_lead_grade:lead.grade,ace_crm_stage:lead.crm_stage||'',ace_intent:lead.intent||''}
  const result=await requestJson(`https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(recordId)}`,{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token.access_token},body:JSON.stringify({properties})})
  return {provider:'hubspot',externalId:String(recordId),status:result.status}
}

const zohoWriteback=async(workspaceId,lead,fields)=>{
  const token=await credentialFor(workspaceId,'Zoho CRM')
  const recordId=fields.recordId||lead.attributes?.zohoLeadId
  if(!recordId) throw new Error('Zoho lead recordId is required')
  const domain=token.api_domain||process.env.ZOHO_API_DOMAIN||'https://www.zohoapis.com'
  const version=process.env.ZOHO_CRM_API_VERSION||'v8'
  const payload={id:String(recordId),Ace_Lead_Score:lead.score,Ace_Lead_Grade:lead.grade,Ace_Intent:lead.intent||'',Ace_Source:lead.source||''}
  const result=await requestJson(`${domain}/crm/${version}/Leads/${encodeURIComponent(recordId)}`,{method:'PUT',headers:{'Content-Type':'application/json','Authorization':'Zoho-oauthtoken '+token.access_token},body:JSON.stringify({data:[payload]})})
  return {provider:'zoho',externalId:String(recordId),status:result.status}
}

const salesforceWriteback=async(workspaceId,lead,fields)=>{
  const token=await credentialFor(workspaceId,'Salesforce')
  const recordId=fields.recordId||lead.attributes?.salesforceLeadId
  const instance=token.instance_url||process.env.SALESFORCE_INSTANCE_URL
  if(!recordId||!instance) throw new Error('Salesforce recordId and instance URL are required')
  const version=process.env.SALESFORCE_API_VERSION||'v65.0'
  const result=await requestJson(`${instance}/services/data/${version}/sobjects/Lead/${encodeURIComponent(recordId)}`,{
    method:'PATCH',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+token.access_token},
    body:JSON.stringify({Ace_Lead_Score__c:lead.score,Ace_Lead_Grade__c:lead.grade,Ace_Intent__c:lead.intent||'',Ace_Source__c:lead.source||''})
  })
  return {provider:'salesforce',externalId:String(recordId),status:result.status,providerRequestId:result.providerRequestId||null}
}

export const writebackLead=async(workspaceId,leadRef,provider,fields={})=>{
  const lead=await getLeadProfile(workspaceId,leadRef)
  if(!lead) throw new Error('lead not found')
  const p=String(provider).toLowerCase()
  if(p==='hubspot') return hubspotWriteback(workspaceId,lead,fields)
  if(p==='zoho'||p==='zoho crm') return zohoWriteback(workspaceId,lead,fields)
  if(p==='salesforce') return salesforceWriteback(workspaceId,lead,fields)
  throw new Error('unsupported CRM writeback provider: '+provider)
}
