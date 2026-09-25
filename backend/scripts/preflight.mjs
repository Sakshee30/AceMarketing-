const required=[
  'DATABASE_URL','JWT_SECRET','ADMIN_EMAIL','ADMIN_PASSWORD_HASH','CORS_ALLOWED_ORIGINS',
  'CONNECTOR_ENCRYPTION_KEY','CONNECTOR_OAUTH_STATE_SECRET'
]
const missing=required.filter(key=>!process.env[key]||String(process.env[key]).trim()==='')
const weak=[]
for(const key of ['JWT_SECRET','CONNECTOR_ENCRYPTION_KEY','CONNECTOR_OAUTH_STATE_SECRET']){
  if(process.env[key]&&String(process.env[key]).length<32)weak.push(key+' must be at least 32 characters')
}
if(process.env.NODE_ENV!=='production')weak.push('NODE_ENV must be production')
if(process.env.ALLOW_FILE_STORE_IN_PRODUCTION==='true')weak.push('ALLOW_FILE_STORE_IN_PRODUCTION should remain false')
if((process.env.CUSTOM_INTEGRATION_ALLOW_HTTP||'false')==='true')weak.push('CUSTOM_INTEGRATION_ALLOW_HTTP should remain false')
const agentTransportMissing=[]
if(!process.env.VOICE_QUALIFICATION_WEBHOOK_URL&&!process.env.VOICE_AGENT_WEBHOOK_URL)agentTransportMissing.push('VOICE_QUALIFICATION_WEBHOOK_URL or VOICE_AGENT_WEBHOOK_URL')
if(!process.env.MEETING_REMINDER_WEBHOOK_URL)agentTransportMissing.push('MEETING_REMINDER_WEBHOOK_URL')
if(!process.env.FEEDBACK_WEBHOOK_URL)agentTransportMissing.push('FEEDBACK_WEBHOOK_URL')
if(!process.env.AGENT_WEBHOOK_SECRET)agentTransportMissing.push('AGENT_WEBHOOK_SECRET')
if(agentTransportMissing.length)weak.push('agent transports incomplete: '+agentTransportMissing.join(', '))
const whatsappMissing=[]
if(!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN)whatsappMissing.push('WHATSAPP_WEBHOOK_VERIFY_TOKEN')
if(!process.env.WHATSAPP_APP_SECRET&&!process.env.META_OAUTH_CLIENT_SECRET)whatsappMissing.push('WHATSAPP_APP_SECRET')
if(!process.env.WHATSAPP_PHONE_NUMBER_ID)whatsappMissing.push('WHATSAPP_PHONE_NUMBER_ID')
if(!process.env.WHATSAPP_WEBHOOK_WORKSPACE_ID&&!process.env.WHATSAPP_PHONE_WORKSPACE_MAP)whatsappMissing.push('WHATSAPP_WEBHOOK_WORKSPACE_ID or WHATSAPP_PHONE_WORKSPACE_MAP')
if(whatsappMissing.length)weak.push('WhatsApp Cloud API incomplete: '+whatsappMissing.join(', '))
const callTrackingMissing=[]
if(!process.env.CALL_WEBHOOK_SECRET)callTrackingMissing.push('CALL_WEBHOOK_SECRET')
if(!process.env.CALL_WEBHOOK_WORKSPACE_ID&&!process.env.CALL_NUMBER_WORKSPACE_MAP)callTrackingMissing.push('CALL_WEBHOOK_WORKSPACE_ID or CALL_NUMBER_WORKSPACE_MAP')
if(callTrackingMissing.length)weak.push('call tracking incomplete: '+callTrackingMissing.join(', '))
const calendarMissing=[]
if(!process.env.GOOGLE_OAUTH_CLIENT_ID)calendarMissing.push('GOOGLE_OAUTH_CLIENT_ID')
if(!process.env.GOOGLE_OAUTH_CLIENT_SECRET)calendarMissing.push('GOOGLE_OAUTH_CLIENT_SECRET')
if(!process.env.CONNECTOR_OAUTH_REDIRECT_URI)calendarMissing.push('CONNECTOR_OAUTH_REDIRECT_URI')
if(calendarMissing.length)weak.push('Google Calendar scheduling incomplete: '+calendarMissing.join(', '))
if(missing.length||weak.length){
  console.error(JSON.stringify({ok:false,missing,issues:weak},null,2))
  process.exit(1)
}
console.log(JSON.stringify({ok:true,checked:required.length,optionalBilling:Boolean(process.env.STRIPE_SECRET_KEY),optionalProviders:Boolean(process.env.META_OAUTH_CLIENT_ID||process.env.GOOGLE_OAUTH_CLIENT_ID)}))
