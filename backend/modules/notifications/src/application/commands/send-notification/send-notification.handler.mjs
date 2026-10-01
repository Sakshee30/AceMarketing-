import {sendPasswordReset} from '../../../../../../src/auth-mailer.mjs'

export const handleSendNotification=async({
  kind,
  recipient,
  token=null,
  sendReset=sendPasswordReset
})=>{
  const type=String(kind||'').trim()
  const email=String(recipient||'').trim().toLowerCase()
  if(!type)throw Object.assign(new Error('notification kind required'),{status:400,code:'notification_kind_required'})
  if(!email)throw Object.assign(new Error('notification recipient required'),{status:400,code:'notification_recipient_required'})
  if(type==='password_reset'){
    const resetToken=String(token||'')
    if(!resetToken)throw Object.assign(new Error('password reset token required'),{status:400,code:'notification_token_required'})
    return sendReset({email,token:resetToken})
  }
  throw Object.assign(new Error('unsupported notification kind'),{status:400,code:'notification_kind_unsupported'})
}
