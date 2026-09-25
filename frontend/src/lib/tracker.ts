type AceTrackPayload = {
  event: string
  customerId?: string
  email?: string
  phone?: string
  value?: number
  currency?: string
  eventCategory?: 'essential'|'analytics'|'marketing'|'personalization'
  properties?: Record<string, unknown>
}

export type AceConsent = {essential:true,analytics:boolean,marketing:boolean,personalization:boolean}

const CONSENT_KEY='ace:consent'
const VISITOR_KEY='ace:visitor_id'

export const getVisitorId=()=>{
  let id=localStorage.getItem(VISITOR_KEY)
  if(!id){id=crypto.randomUUID();localStorage.setItem(VISITOR_KEY,id)}
  return id
}
export const getLocalConsent=():AceConsent|null=>{try{const raw=localStorage.getItem(CONSENT_KEY);return raw?JSON.parse(raw):null}catch{return null}}

export const saveLocalConsent=async(consent:Omit<AceConsent,'essential'>)=>{
  const full:AceConsent={essential:true,...consent}
  localStorage.setItem(CONSENT_KEY,JSON.stringify(full))
  const visitorId=getVisitorId()
  try{await fetch('/api/consent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subjectType:'visitor',subjectId:visitorId,...full,source:'web'})})}catch{}
  if(full.marketing)persistClickIds()
  else{localStorage.removeItem('ace:gclid');localStorage.removeItem('ace:fbclid')}
  if(full.analytics)track({event:'consent_updated',eventCategory:'essential',properties:{analytics:full.analytics,marketing:full.marketing,personalization:full.personalization}})
  window.dispatchEvent(new CustomEvent('ace-consent-changed',{detail:full}))
  return full
}

const readClickIds=()=>{
  const consent=getLocalConsent()
  if(!consent?.marketing)return {gclid:null,fbclid:null}
  const params=new URLSearchParams(window.location.search)
  return {gclid:params.get('gclid')||localStorage.getItem('ace:gclid'),fbclid:params.get('fbclid')||localStorage.getItem('ace:fbclid')}
}
export const persistClickIds=()=>{
  const consent=getLocalConsent()
  if(!consent?.marketing)return
  const params=new URLSearchParams(window.location.search)
  const gclid=params.get('gclid'),fbclid=params.get('fbclid')
  if(gclid)localStorage.setItem('ace:gclid',gclid)
  if(fbclid)localStorage.setItem('ace:fbclid',fbclid)
}
export const track=async(payload:AceTrackPayload)=>{
  const category=payload.eventCategory||'analytics'
  const consent=getLocalConsent()
  if(category!=='essential'&&!consent?.[category])return
  const visitorId=getVisitorId()
  const clickIds=readClickIds()
  const body={...payload,eventCategory:category,visitorId,...clickIds,pageUrl:window.location.href,referrer:document.referrer||null,occurredAt:new Date().toISOString()}
  try{await fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true})}catch{}
}
export const installAceTracking=()=>{
  getVisitorId()
  const consent=getLocalConsent()
  if(consent?.marketing)persistClickIds()
  if(consent?.analytics)track({event:'page_view',eventCategory:'analytics'})
  track({event:'privacy_runtime_loaded',eventCategory:'essential'})
}
