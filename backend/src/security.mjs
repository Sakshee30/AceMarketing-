import { createHmac, timingSafeEqual, randomUUID, scryptSync } from 'node:crypto'

const b64url = value => Buffer.from(value).toString('base64url')
const fromB64url = value => Buffer.from(value,'base64url').toString('utf8')

export const createToken = ({email,userId=null,workspaceId='ws_default',role='owner',jti=randomUUID()}, secret, ttlSeconds=3600) => {
  const now=Math.floor(Date.now()/1000)
  const payload={sub:email,userId,workspaceId,role,iat:now,exp:now+ttlSeconds,jti}
  const encoded=b64url(JSON.stringify(payload))
  const sig=createHmac('sha256',secret).update(encoded).digest('base64url')
  return encoded+'.'+sig
}

export const verifyToken = (token, secret) => {
  if(!token || !secret) return null
  const [encoded,sig]=String(token).split('.')
  if(!encoded||!sig) return null
  const expected=createHmac('sha256',secret).update(encoded).digest('base64url')
  const a=Buffer.from(sig), b=Buffer.from(expected)
  if(a.length!==b.length || !timingSafeEqual(a,b)) return null
  try{
    const payload=JSON.parse(fromB64url(encoded))
    if(!payload.exp || payload.exp < Math.floor(Date.now()/1000)) return null
    return payload
  }catch{return null}
}

export const hashPassword = (password, salt=randomUUID().replaceAll('-','')) => {
  const hash=scryptSync(String(password),salt,64).toString('hex')
  return salt+':'+hash
}

export const verifyPassword = (password, encodedHash) => {
  if(!encodedHash) return false
  const [salt,hash]=String(encodedHash).split(':')
  if(!salt||!hash) return false
  const derived=scryptSync(String(password),salt,64).toString('hex')
  const a=Buffer.from(derived), b=Buffer.from(hash)
  return a.length===b.length && timingSafeEqual(a,b)
}

export const createRateLimiter = ({windowMs=60_000,max=240}={}) => {
  const buckets=new Map()
  return key => {
    const now=Date.now()
    const current=buckets.get(key)
    if(!current || current.resetAt<=now){
      buckets.set(key,{count:1,resetAt:now+windowMs})
      return {allowed:true,remaining:max-1,resetAt:now+windowMs}
    }
    current.count+=1
    if(current.count>max) return {allowed:false,remaining:0,resetAt:current.resetAt}
    return {allowed:true,remaining:max-current.count,resetAt:current.resetAt}
  }
}

export const securityHeaders = {
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Resource-Policy':'same-site',
  'Cache-Control':'no-store',
}

export const resolveCorsOrigin = (origin, allowedOrigins) => {
  if(!origin) return allowedOrigins.has('*') ? '*' : ''
  if(allowedOrigins.has('*') || allowedOrigins.has(origin)) return origin
  return ''
}


const rolePermissions={
  owner:['*'],
  admin:['workspace.read','workspace.write','members.read','members.write','integrations.write','agents.write','audiences.write','reports.write','developer.write'],
  analyst:['workspace.read','members.read','reports.read','journeys.read','attribution.read','audiences.read','monitoring.read'],
  operator:['workspace.read','integrations.read','agents.run','approvals.write','followups.write','calls.write','meetings.write','delivery.write','monitoring.read']
}

export const permissionsForRole=role=>rolePermissions[role]||[]
export const hasPermission=(role,permission)=>{
  const permissions=permissionsForRole(role)
  return permissions.includes('*')||permissions.includes(permission)
}
