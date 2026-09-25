import nodemailer from 'nodemailer'

export const authMailConfigured=()=>Boolean(process.env.SMTP_HOST&&process.env.SMTP_FROM&&process.env.AUTH_PUBLIC_APP_URL)

const transport=()=>nodemailer.createTransport({
  host:process.env.SMTP_HOST,
  port:Number(process.env.SMTP_PORT||587),
  secure:String(process.env.SMTP_SECURE||'false').toLowerCase()==='true',
  ...(process.env.SMTP_USER?{auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS||''}}:{})
})

export const sendPasswordReset=async({email,token})=>{
  if(!authMailConfigured())throw new Error('password reset email is not configured')
  const base=String(process.env.AUTH_PUBLIC_APP_URL||'').replace(/\/$/,'')
  const url=base+'/?reset_token='+encodeURIComponent(token)+'#/login'
  const sender=String(process.env.SMTP_FROM)
  await transport().sendMail({
    from:sender,
    to:email,
    subject:'Reset your AceMarketing password',
    text:'A password reset was requested for your AceMarketing account. Open this link within 30 minutes: '+url+'\n\nIf you did not request this, ignore this email.',
    html:'<p>A password reset was requested for your AceMarketing account.</p><p><a href="'+url.replace(/"/g,'&quot;')+'">Reset password</a></p><p>This link expires in 30 minutes. If you did not request this, ignore this email.</p>'
  })
  return {sent:true}
}
