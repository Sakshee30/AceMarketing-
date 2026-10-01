import {assertCapacityBudget} from '../src/platform/capacity-budget.mjs'
import {deploymentMode} from '../src/platform/deployment-mode.mjs'

const mode=deploymentMode()
const required=[
  'DATABASE_URL','JWT_SECRET','ADMIN_EMAIL','ADMIN_PASSWORD_HASH','CORS_ALLOWED_ORIGINS',
  'CONNECTOR_ENCRYPTION_KEY','CONNECTOR_OAUTH_STATE_SECRET'
]
const missing=required.filter(key=>!process.env[key]||String(process.env[key]).trim()==='')
const issues=[]
const warnings=[]

for(const key of ['JWT_SECRET','CONNECTOR_ENCRYPTION_KEY','CONNECTOR_OAUTH_STATE_SECRET']){
  if(process.env[key]&&String(process.env[key]).length<32)issues.push(key+' must be at least 32 characters')
}
if(process.env.NODE_ENV!=='production')issues.push('NODE_ENV must be production')
if(process.env.ALLOW_FILE_STORE_IN_PRODUCTION==='true')issues.push('ALLOW_FILE_STORE_IN_PRODUCTION should remain false')
if((process.env.CUSTOM_INTEGRATION_ALLOW_HTTP||'false')==='true')issues.push('CUSTOM_INTEGRATION_ALLOW_HTTP should remain false')
try{assertCapacityBudget()}catch(error){issues.push(error instanceof Error?error.message:'capacity budget invalid')}

const requireAny=(label,keys)=>{
  if(!keys.some(key=>String(process.env[key]||'').trim()))issues.push(label+': configure one of '+keys.join(', '))
}
const requireAll=(label,keys)=>{
  const absent=keys.filter(key=>!String(process.env[key]||'').trim())
  if(absent.length)issues.push(label+': missing '+absent.join(', '))
}

if(mode.features.agentTransports){
  requireAny('voice qualification transport',['VOICE_QUALIFICATION_WEBHOOK_URL','VOICE_AGENT_WEBHOOK_URL'])
  requireAll('agent transports',['MEETING_REMINDER_WEBHOOK_URL','FEEDBACK_WEBHOOK_URL','AGENT_WEBHOOK_SECRET'])
}else warnings.push('agent transports disabled by deployment mode')

if(mode.features.whatsapp){
  requireAll('WhatsApp Cloud API',['WHATSAPP_WEBHOOK_VERIFY_TOKEN','WHATSAPP_PHONE_NUMBER_ID'])
  requireAny('WhatsApp application secret',['WHATSAPP_APP_SECRET','META_OAUTH_CLIENT_SECRET'])
  requireAny('WhatsApp workspace routing',['WHATSAPP_WEBHOOK_WORKSPACE_ID','WHATSAPP_PHONE_WORKSPACE_MAP'])
}else warnings.push('WhatsApp disabled by deployment mode')

if(mode.features.callTracking){
  requireAll('call tracking',['CALL_WEBHOOK_SECRET'])
  requireAny('call tracking workspace routing',['CALL_WEBHOOK_WORKSPACE_ID','CALL_NUMBER_WORKSPACE_MAP'])
}else warnings.push('call tracking disabled by deployment mode')

if(mode.features.googleAuth){
  requireAll('Google authentication/calendar',['GOOGLE_OAUTH_CLIENT_ID','GOOGLE_OAUTH_CLIENT_SECRET','CONNECTOR_OAUTH_REDIRECT_URI'])
  requireAll('Google login UI',['AUTH_GOOGLE_REDIRECT_URI','AUTH_GOOGLE_SUCCESS_URL','AUTH_PUBLIC_APP_URL'])
  requireAll('password recovery email',['SMTP_HOST','SMTP_FROM'])
}else warnings.push('Google login/calendar and SMTP recovery are optional in this deployment mode')

if(mode.features.billing){
  requireAll('billing',['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'])
}else warnings.push('billing disabled by deployment mode')

if(mode.features.files){
  requireAll('durable object storage',[
    'OBJECT_S3_BUCKET','OBJECT_S3_REGION','OBJECT_S3_ACCESS_KEY_ID','OBJECT_S3_SECRET_ACCESS_KEY'
  ])
}else warnings.push('file/object-storage feature disabled by deployment mode')

if(mode.features.ai){
  requireAll('AI worker authentication',['ML_SERVICE_AUTH_TOKEN'])
  if(process.env.AI_LIVE_PROVIDER_CALLS==='true'){
    requireAny('hosted AI provider credential',['OPENAI_API_KEY','GOOGLE_AI_API_KEY','VOYAGE_API_KEY','ANTHROPIC_API_KEY'])
  }
}
if(mode.features.aiForecasting){
  requireAll('Chronos checkpoint',['CHRONOS2_REVISION','CHRONOS2_SNAPSHOT_DIR','CHRONOS2_EXPECTED_SHA256'])
}
if(mode.features.controlPlane){
  requireAll('control plane authentication',['CONTROL_ADMIN_EMAIL','CONTROL_ADMIN_PASSWORD_HASH','CONTROL_SESSION_SECRET'])
}

if(missing.length||issues.length){
  console.error(JSON.stringify({ok:false,deploymentMode:mode.name,missing,issues,warnings,features:mode.features},null,2))
  process.exit(1)
}
console.log(JSON.stringify({
  ok:true,
  deploymentMode:mode.name,
  checked:required.length,
  features:mode.features,
  warnings,
  optionalProviders:Boolean(process.env.META_OAUTH_CLIENT_ID||process.env.GOOGLE_OAUTH_CLIENT_ID)
},null,2))
