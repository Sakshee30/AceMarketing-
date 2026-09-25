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
if(missing.length||weak.length){
  console.error(JSON.stringify({ok:false,missing,issues:weak},null,2))
  process.exit(1)
}
console.log(JSON.stringify({ok:true,checked:required.length,optionalBilling:Boolean(process.env.STRIPE_SECRET_KEY),optionalProviders:Boolean(process.env.META_OAUTH_CLIENT_ID||process.env.GOOGLE_OAUTH_CLIENT_ID)}))
