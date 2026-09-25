import {createHmac,timingSafeEqual} from 'node:crypto'
import {connectorCredential} from './connector-auth.mjs'

const graphVersion=()=>process.env.META_GRAPH_VERSION||'v26.0'

const safeEqual=(a,b)=>{
  const left=Buffer.from(String(a||''))
  const right=Buffer.from(String(b||''))
  return left.length===right.length&&timingSafeEqual(left,right)
}

export const verifyWhatsAppWebhookChallenge=({mode,verifyToken,challenge})=>{
  if(String(mode)!=='subscribe') return {ok:false,status:400,error:'unsupported webhook mode'}
  const expected=process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN||''
  if(!expected) return {ok:false,status:503,error:'WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured'}
  if(!safeEqual(verifyToken,expected)) return {ok:false,status:403,error:'invalid verify token'}
  return {ok:true,status:200,challenge:String(challenge||'')}
}

export const verifyWhatsAppWebhookSignature=(raw,signature)=>{
  const secret=process.env.WHATSAPP_APP_SECRET||process.env.META_OAUTH_CLIENT_SECRET||''
  if(!secret) throw new Error('WHATSAPP_APP_SECRET is required for webhook verification')
  const provided=String(signature||'').replace(/^sha256=/i,'')
  if(!provided) return false
  const expected=createHmac('sha256',secret).update(String(raw||'')).digest('hex')
  return safeEqual(provided,expected)
}

export const parseWhatsAppWebhook=payload=>{
  const events=[]
  const entries=Array.isArray(payload?.entry)?payload.entry:[]
  for(const entry of entries){
    const changes=Array.isArray(entry?.changes)?entry.changes:[]
    for(const change of changes){
      if(change?.field!=='messages') continue
      const value=change?.value||{}
      const phoneNumberId=String(value?.metadata?.phone_number_id||'')
      const displayPhoneNumber=String(value?.metadata?.display_phone_number||'')
      const contactsByWaId=new Map((value?.contacts||[]).map(contact=>[String(contact?.wa_id||''),contact]))
      for(const message of value?.messages||[]){
        const from=String(message?.from||'')
        const contact=contactsByWaId.get(from)||{}
        const text=message?.text?.body||message?.button?.text||message?.interactive?.button_reply?.title||message?.interactive?.list_reply?.title||''
        events.push({
          kind:'message',
          id:String(message?.id||''),
          phoneNumberId,
          displayPhoneNumber,
          from,
          contactName:String(contact?.profile?.name||''),
          messageType:String(message?.type||'unknown'),
          text:String(text||'').slice(0,4000),
          timestamp:message?.timestamp?new Date(Number(message.timestamp)*1000).toISOString():new Date().toISOString(),
          contextMessageId:String(message?.context?.id||''),
          raw:message
        })
      }
      for(const status of value?.statuses||[]){
        const error=(status?.errors||[])[0]||null
        events.push({
          kind:'status',
          id:String(status?.id||''),
          phoneNumberId,
          displayPhoneNumber,
          recipientId:String(status?.recipient_id||''),
          status:String(status?.status||'unknown'),
          timestamp:status?.timestamp?new Date(Number(status.timestamp)*1000).toISOString():new Date().toISOString(),
          conversationId:String(status?.conversation?.id||''),
          pricingCategory:String(status?.pricing?.category||''),
          error:error?{code:error.code||null,title:error.title||null,message:error.message||null}:null
        })
      }
    }
  }
  return events
}

export const resolveWhatsAppWorkspace=(events,headerWorkspace='')=>{
  const candidate=String(headerWorkspace||'')
  if(candidate&&/^[A-Za-z0-9_-]{1,64}$/.test(candidate)) return candidate
  let mapping={}
  try{mapping=JSON.parse(process.env.WHATSAPP_PHONE_WORKSPACE_MAP||'{}')}catch{}
  for(const event of events){
    const mapped=mapping?.[event.phoneNumberId]
    if(mapped&&/^[A-Za-z0-9_-]{1,64}$/.test(String(mapped))) return String(mapped)
  }
  const fallback=String(process.env.WHATSAPP_WEBHOOK_WORKSPACE_ID||process.env.DEFAULT_WORKSPACE_ID||'')
  return /^[A-Za-z0-9_-]{1,64}$/.test(fallback)?fallback:null
}

const credentialFor=async workspaceId=>{
  const result=await connectorCredential(workspaceId,'WhatsApp')
  return result.token||{}
}

const requestJson=async(url,options)=>{
  const started=Date.now()
  const response=await fetch(url,options)
  const raw=await response.text()
  let body={}
  try{body=raw?JSON.parse(raw):{}}catch{body={raw:raw.slice(0,2000)}}
  if(!response.ok){
    const error=new Error('WhatsApp Cloud API request failed: '+response.status)
    error.status=response.status
    error.providerBody=body
    throw error
  }
  return {status:response.status,latencyMs:Date.now()-started,body}
}

export const sendWhatsAppMessage=async(workspaceId,input={})=>{
  const token=await credentialFor(workspaceId)
  const accessToken=token.access_token
  const phoneNumberId=String(input.phoneNumberId||token.phone_number_id||process.env.WHATSAPP_PHONE_NUMBER_ID||'')
  const to=String(input.to||'').replace(/\D/g,'')
  if(!accessToken) throw new Error('WhatsApp access token is not connected')
  if(!phoneNumberId) throw new Error('WHATSAPP_PHONE_NUMBER_ID is required')
  if(!to) throw new Error('WhatsApp recipient phone is required')

  const payload={messaging_product:'whatsapp',recipient_type:'individual',to}
  if(input.templateName){
    payload.type='template'
    payload.template={
      name:String(input.templateName),
      language:{code:String(input.languageCode||'en_US')},
      ...(Array.isArray(input.components)&&input.components.length?{components:input.components}:{})
    }
  }else{
    const text=String(input.text||'').trim()
    if(!text) throw new Error('WhatsApp text or templateName is required')
    payload.type='text'
    payload.text={body:text.slice(0,4096),preview_url:Boolean(input.previewUrl)}
  }

  const result=await requestJson(`https://graph.facebook.com/${graphVersion()}/${encodeURIComponent(phoneNumberId)}/messages`,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+accessToken},
    body:JSON.stringify(payload)
  })
  return {
    provider:'whatsapp_cloud',
    status:result.status,
    latencyMs:result.latencyMs,
    externalId:result.body?.messages?.[0]?.id||null,
    contactWaId:result.body?.contacts?.[0]?.wa_id||to,
    response:result.body
  }
}
