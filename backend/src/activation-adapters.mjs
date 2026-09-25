import {connectorCredential} from './connector-auth.mjs'
import {getAudienceBundle,getLeadProfile} from './lead-ops.mjs'
import {consentAllows} from './consent.mjs'

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

const requestJson=async(url,options={})=>{
  const started=Date.now()
  const response=await fetch(url,options)
  const raw=await response.text()
  let body
  try{body=raw?JSON.parse(raw):{}}catch{body={raw:raw.slice(0,2000)}}
  if(!response.ok){
    const error=new Error('provider request failed: '+response.status)
    error.status=response.status
    error.providerBody=body
    throw error
  }
  return {status:response.status,latencyMs:Date.now()-started,body}
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
  const result=await fetch(`${instance}/services/data/${version}/sobjects/Lead/${encodeURIComponent(recordId)}`,{
    method:'PATCH',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+token.access_token},
    body:JSON.stringify({Ace_Lead_Score__c:lead.score,Ace_Lead_Grade__c:lead.grade,Ace_Intent__c:lead.intent||'',Ace_Source__c:lead.source||''})
  })
  if(!result.ok) throw new Error('Salesforce writeback failed: '+result.status)
  return {provider:'salesforce',externalId:String(recordId),status:result.status}
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
