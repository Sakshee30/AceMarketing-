import {decryptSecret,encryptSecret} from './vault.mjs'
import {getState,mutateState,withWorkspace} from './store.mjs'

const skewMs=Number(process.env.OAUTH_REFRESH_SKEW_SECONDS||300)*1000

const providers={
  'Google Ads':{
    tokenUrl:'https://oauth2.googleapis.com/token',
    clientId:()=>process.env.GOOGLE_OAUTH_CLIENT_ID||'',
    clientSecret:()=>process.env.GOOGLE_OAUTH_CLIENT_SECRET||''
  },
  'GA4':{
    tokenUrl:'https://oauth2.googleapis.com/token',
    clientId:()=>process.env.GOOGLE_OAUTH_CLIENT_ID||'',
    clientSecret:()=>process.env.GOOGLE_OAUTH_CLIENT_SECRET||''
  },
  'HubSpot':{
    tokenUrl:process.env.HUBSPOT_OAUTH_TOKEN_URL||'https://api.hubapi.com/oauth/2026-03/token',
    clientId:()=>process.env.HUBSPOT_OAUTH_CLIENT_ID||'',
    clientSecret:()=>process.env.HUBSPOT_OAUTH_CLIENT_SECRET||''
  },
  'Salesforce':{
    tokenUrl:process.env.SALESFORCE_OAUTH_TOKEN_URL||'https://login.salesforce.com/services/oauth2/token',
    clientId:()=>process.env.SALESFORCE_OAUTH_CLIENT_ID||'',
    clientSecret:()=>process.env.SALESFORCE_OAUTH_CLIENT_SECRET||''
  },
  'Zoho CRM':{
    tokenUrl:(process.env.ZOHO_ACCOUNTS_URL||'https://accounts.zoho.com').replace(/\/$/,'')+'/oauth/v2/token',
    clientId:()=>process.env.ZOHO_OAUTH_CLIENT_ID||'',
    clientSecret:()=>process.env.ZOHO_OAUTH_CLIENT_SECRET||''
  }
}

const parseTokenResponse=async response=>{
  const raw=await response.text()
  let body={}
  try{body=raw?JSON.parse(raw):{}}catch{body={raw:raw.slice(0,1000)}}
  if(!response.ok){
    const error=new Error('oauth refresh failed: '+response.status)
    error.status=response.status
    error.providerBody=body
    throw error
  }
  return body
}

const refreshRecord=async(workspaceId,record,force=false)=>{
  const provider=providers[record.connector]
  const current=decryptSecret(record.encrypted)
  const expiresAt=record.expiresAt?Date.parse(record.expiresAt):0
  if(!force&&expiresAt&&expiresAt-Date.now()>skewMs)return {token:current,refreshed:false,expiresAt:record.expiresAt}
  if(!provider)return {token:current,refreshed:false,expiresAt:record.expiresAt,reason:'refresh_not_supported'}
  if(!current.refresh_token) {
    if(expiresAt&&expiresAt<=Date.now()+skewMs) throw new Error(record.connector+' requires reconnection because no refresh token is stored')
    return {token:current,refreshed:false,expiresAt:record.expiresAt,reason:'refresh_token_missing'}
  }
  const clientId=provider.clientId(),clientSecret=provider.clientSecret()
  if(!clientId||!clientSecret)throw new Error(record.connector+' OAuth client credentials are not configured')
  const body=new URLSearchParams({
    grant_type:'refresh_token',
    refresh_token:String(current.refresh_token),
    client_id:clientId,
    client_secret:clientSecret
  })
  const response=await fetch(provider.tokenUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body})
  const fresh=await parseTokenResponse(response)
  if(!fresh.access_token)throw new Error(record.connector+' refresh response did not contain access_token')
  const merged={...current,...fresh,refresh_token:fresh.refresh_token||current.refresh_token}
  const nextExpiry=fresh.expires_in?new Date(Date.now()+Number(fresh.expires_in)*1000).toISOString():record.expiresAt||null
  const now=new Date().toISOString()
  await withWorkspace(workspaceId,()=>mutateState(s=>{
    const credential=(s.connectorCredentials||[]).find(x=>x.id===record.id||x.connector===record.connector)
    if(credential){
      credential.encrypted=encryptSecret(merged)
      credential.expiresAt=nextExpiry
      credential.updatedAt=now
      credential.lastRefreshedAt=now
      credential.refreshStatus='healthy'
      credential.lastRefreshError=null
    }
    const connection=(s.connectorConnections||[]).find(x=>x.connector===record.connector)
    if(connection){
      connection.expiresAt=nextExpiry
      connection.updatedAt=now
      connection.status='connected'
      connection.lastRefreshedAt=now
      connection.lastRefreshError=null
    }
    s.audit=s.audit||[]
    s.audit.unshift({id:'audit_'+crypto.randomUUID?.()||String(Date.now()),action:'connector.token_refreshed',entityId:record.connector,at:now})
  }))
  return {token:merged,refreshed:true,expiresAt:nextExpiry}
}

export const connectorCredential=async(workspaceId,connector,{forceRefresh=false}={})=>withWorkspace(workspaceId,async()=>{
  const state=await getState()
  const record=(state.connectorCredentials||[]).find(x=>x.connector===connector)
  if(!record?.encrypted)throw new Error(connector+' credential is not connected')
  try{return await refreshRecord(workspaceId,record,forceRefresh)}
  catch(error){
    const now=new Date().toISOString()
    await mutateState(s=>{
      const credential=(s.connectorCredentials||[]).find(x=>x.connector===connector)
      if(credential){credential.refreshStatus='error';credential.lastRefreshError=String(error?.message||error).slice(0,1000);credential.updatedAt=now}
      const connection=(s.connectorConnections||[]).find(x=>x.connector===connector)
      if(connection){connection.status='attention';connection.lastRefreshError=String(error?.message||error).slice(0,1000);connection.updatedAt=now}
    }).catch(()=>{})
    throw error
  }
})

export const refreshConnectorCredential=async(workspaceId,connector)=>connectorCredential(workspaceId,connector,{forceRefresh:true})

export const connectorTokenHealth=async workspaceId=>withWorkspace(workspaceId,async()=>{
  const state=await getState()
  return (state.connectorCredentials||[]).map(record=>{
    const expiresAt=record.expiresAt||null
    const expiresMs=expiresAt?Date.parse(expiresAt):0
    return {
      connector:record.connector,
      expiresAt,
      lastRefreshedAt:record.lastRefreshedAt||null,
      refreshStatus:record.refreshStatus||'unknown',
      lastRefreshError:record.lastRefreshError||null,
      needsRefresh:Boolean(expiresMs&&expiresMs-Date.now()<=skewMs)
    }
  })
})
