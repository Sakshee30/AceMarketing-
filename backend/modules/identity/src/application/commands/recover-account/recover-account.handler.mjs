import {createHash,randomBytes,randomUUID} from 'node:crypto'
import {hashPassword} from '../../../../../../src/security.mjs'
import {getState,mutateState} from '../../../../../../src/store.mjs'
import {authMailConfigured} from '../../../../../../src/auth-mailer.mjs'
import {handleSendNotification} from '../../../../../notifications/src/application/commands/send-notification/send-notification.handler.mjs'

const tokenDigest=value=>createHash('sha256').update(String(value||'')).digest('hex')

export const handleRecoverAccount=async({
  mode,
  email='',
  token='',
  password='',
  isProd=false,
  readState=getState,
  mutate=mutateState,
  mailConfigured=authMailConfigured,
  sendNotification=handleSendNotification,
  hash=hashPassword,
  now=()=>new Date()
})=>{
  const action=String(mode||'').trim().toLowerCase()
  if(action==='request'){
    const normalizedEmail=String(email||'').trim().toLowerCase()
    if(!normalizedEmail.includes('@'))return {accepted:true}
    const state=await readState()
    const member=(state.members||[]).find(x=>String(x.email).toLowerCase()===normalizedEmail&&x.status==='active')
    if(!member)return {accepted:true}
    const rawToken=randomBytes(32).toString('base64url')
    const digest=tokenDigest(rawToken)
    const issuedAt=now()
    const expiresAt=new Date(issuedAt.getTime()+30*60*1000).toISOString()
    await mutate(s=>{
      s.passwordResets=s.passwordResets||[]
      s.passwordResets.unshift({tokenHash:digest,userId:member.id,email:member.email,expiresAt,createdAt:issuedAt.toISOString(),used:false})
      s.passwordResets=s.passwordResets.filter(x=>!x.used&&Date.parse(x.expiresAt)>issuedAt.getTime()).slice(0,200)
      s.audit=s.audit||[]
      s.audit.unshift({id:randomUUID(),action:'auth.password_reset_requested',entityId:member.id,at:issuedAt.toISOString()})
      s.audit=s.audit.slice(0,1000)
    })
    if(mailConfigured())await sendNotification({kind:'password_reset',recipient:member.email,token:rawToken})
    if(!isProd&&!mailConfigured())return {accepted:true,developmentResetToken:rawToken,expiresAt}
    return {accepted:true}
  }
  if(action==='complete'){
    const rawToken=String(token||'')
    const rawPassword=String(password||'')
    if(!rawToken||rawPassword.length<8){
      throw Object.assign(new Error('valid token and password length >= 8 required'),{status:400,code:'password_reset_input_invalid'})
    }
    const digest=tokenDigest(rawToken)
    const state=await readState()
    const reset=(state.passwordResets||[]).find(x=>x.tokenHash===digest&&!x.used&&Date.parse(x.expiresAt)>Date.now())
    if(!reset)throw Object.assign(new Error('invalid or expired reset token'),{status:400,code:'password_reset_invalid'})
    const completedAt=now().toISOString()
    await mutate(s=>{
      const member=(s.members||[]).find(x=>x.id===reset.userId)
      if(member){member.passwordHash=hash(rawPassword);member.updatedAt=completedAt}
      const found=(s.passwordResets||[]).find(x=>x.tokenHash===digest)
      if(found){found.used=true;found.usedAt=completedAt}
      s.sessions=(s.sessions||[]).map(x=>x.userId===reset.userId?{...x,status:'revoked',revokedAt:completedAt}:x)
      s.audit=s.audit||[]
      s.audit.unshift({id:randomUUID(),action:'auth.password_reset_completed',entityId:reset.userId,at:completedAt})
      s.audit=s.audit.slice(0,1000)
    })
    return {ok:true}
  }
  throw Object.assign(new Error('unsupported account recovery mode'),{status:400,code:'account_recovery_mode_invalid'})
}
