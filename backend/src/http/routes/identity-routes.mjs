import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { URL } from 'node:url'
import { createToken, hashPassword } from '../../security.mjs'
import { getState, mutateState, withWorkspace } from '../../store.mjs'
import { resourceCountAllowed } from '../../entitlements.mjs'
import { appendAuditRecord } from '../../platform/audit-store.mjs'
import { assertWorkspaceMembership } from '../../platform/workspace-access.mjs'
import { handleStartLogin } from '../../../modules/identity/src/application/commands/start-login/start-login.handler.mjs'
import { handleRecoverAccount } from '../../../modules/identity/src/application/commands/recover-account/recover-account.handler.mjs'
import { handleRemoveMember } from '../../../modules/memberships/src/application/commands/remove-member/remove-member.handler.mjs'

export async function handleIdentityRoutes({req,res,url,workspaceId,readBody,send:writeResponse,JWT_SECRET,ADMIN_EMAIL,ADMIN_PASSWORD_HASH,IS_PROD,AUTH_GOOGLE_REDIRECT_URI,AUTH_GOOGLE_SUCCESS_URL,createOAuthState,hashOAuthState,createPkce,parseOAuthState}) {
    const send=(...args)=>{writeResponse(...args);return true}
    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body=await readBody(req)
      try{
        const result=await handleStartLogin({
          workspaceId,
          email:body.email,
          password:body.password,
          jwtSecret:JWT_SECRET,
          adminEmail:ADMIN_EMAIL,
          adminPasswordHash:ADMIN_PASSWORD_HASH,
          isProd:IS_PROD,
          ttlSeconds:Number(process.env.TOKEN_TTL_SECONDS||3600)
        })
        return send(req,res,200,result)
      }catch(error){
        return send(req,res,Number(error?.status||400),{error:error instanceof Error?error.message:'login failed',code:error?.code||'login_failed'})
      }
    }
    if (req.method === 'GET' && url.pathname === '/api/auth/google/start') {
      if(!process.env.GOOGLE_OAUTH_CLIENT_ID||!process.env.GOOGLE_OAUTH_CLIENT_SECRET||!AUTH_GOOGLE_REDIRECT_URI) return send(req,res,503,{error:'Google login is not configured'})
      const stateToken=createOAuthState(workspaceId)
      const pkce=createPkce()
      const now=new Date().toISOString()
      const expiresAt=new Date(Date.now()+10*60*1000).toISOString()
      await mutateState(s=>{
        s.googleLoginStates=s.googleLoginStates||[]
        s.googleLoginStates=s.googleLoginStates.filter(x=>Date.parse(x.expiresAt)>Date.now())
        s.googleLoginStates.unshift({stateHash:hashOAuthState(stateToken),workspaceId,verifier:pkce.verifier,createdAt:now,expiresAt})
      })
      const auth=new URL('https://accounts.google.com/o/oauth2/v2/auth')
      auth.searchParams.set('client_id',process.env.GOOGLE_OAUTH_CLIENT_ID)
      auth.searchParams.set('redirect_uri',AUTH_GOOGLE_REDIRECT_URI)
      auth.searchParams.set('response_type','code')
      auth.searchParams.set('state',stateToken)
      auth.searchParams.set('scope','openid email profile')
      auth.searchParams.set('code_challenge',pkce.challenge)
      auth.searchParams.set('code_challenge_method','S256')
      auth.searchParams.set('prompt','select_account')
      return send(req,res,200,{authorizationUrl:auth.toString(),expiresAt})
    }
    if (req.method === 'GET' && url.pathname === '/api/auth/google/callback') {
      const stateToken=String(url.searchParams.get('state')||'')
      const code=String(url.searchParams.get('code')||'')
      const providerError=String(url.searchParams.get('error')||'')
      if(providerError) return send(req,res,400,{error:'Google authorization failed',providerError})
      const parsed=parseOAuthState(stateToken)
      if(!parsed||!code) return send(req,res,400,{error:'invalid Google login callback'})
      workspaceId=parsed.workspaceId
      return withWorkspace(workspaceId,async()=>{
        const state=await getState()
        const pending=(state.googleLoginStates||[]).find(x=>x.stateHash===hashOAuthState(stateToken)&&Date.parse(x.expiresAt)>Date.now())
        if(!pending) return send(req,res,400,{error:'expired Google login state'})
        const body=new URLSearchParams({
          grant_type:'authorization_code',
          code,
          client_id:process.env.GOOGLE_OAUTH_CLIENT_ID||'',
          client_secret:process.env.GOOGLE_OAUTH_CLIENT_SECRET||'',
          redirect_uri:AUTH_GOOGLE_REDIRECT_URI,
          code_verifier:pending.verifier
        })
        const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body})
        const tokenRaw=await tokenResponse.text()
        let tokenBody={}
        try{tokenBody=tokenRaw?JSON.parse(tokenRaw):{}}catch{}
        if(!tokenResponse.ok||!tokenBody.access_token) return send(req,res,400,{error:'Google token exchange failed'})
        const userResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+tokenBody.access_token}})
        const user=await userResponse.json()
        const email=String(user.email||'').trim().toLowerCase()
        if(!email||user.email_verified===false) return send(req,res,403,{error:'verified Google email required'})
        const member=(state.members||[]).find(x=>String(x.email).toLowerCase()===email&&x.status==='active')
        if(!member){
          if(AUTH_GOOGLE_SUCCESS_URL){
            const target=new URL(AUTH_GOOGLE_SUCCESS_URL)
            target.searchParams.set('auth_error','not_member')
            target.hash='/login'
            res.writeHead(302,{Location:target.toString()});res.end();return
          }
          return send(req,res,403,{error:'Google account is not an active workspace member'})
        }
        const rawCode=randomBytes(32).toString('base64url')
        const codeHash=createHash('sha256').update(rawCode).digest('hex')
        const expiresAt=new Date(Date.now()+2*60*1000).toISOString()
        await mutateState(s=>{
          s.googleLoginStates=(s.googleLoginStates||[]).filter(x=>x.stateHash!==pending.stateHash)
          s.googleLoginExchanges=s.googleLoginExchanges||[]
          s.googleLoginExchanges.unshift({codeHash,userId:member.id,email:member.email,role:member.role,name:member.name,workspaceId,expiresAt,used:false})
          s.googleLoginExchanges=s.googleLoginExchanges.filter(x=>!x.used&&Date.parse(x.expiresAt)>Date.now()).slice(0,200)
          s.audit=s.audit||[]
          s.audit.unshift({id:randomUUID(),action:'auth.google_verified',entityId:member.id,at:new Date().toISOString()})
          s.audit=s.audit.slice(0,1000)
        })
        if(!AUTH_GOOGLE_SUCCESS_URL) return send(req,res,200,{exchangeCode:rawCode,workspaceId})
        const target=new URL(AUTH_GOOGLE_SUCCESS_URL)
        target.searchParams.set('google_code',rawCode)
        target.searchParams.set('google_workspace',workspaceId)
        target.hash='/login'
        res.writeHead(302,{Location:target.toString()});res.end()
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/google/exchange') {
      const body=await readBody(req)
      const code=String(body.code||'')
      const targetWorkspace=String(body.workspaceId||workspaceId)
      if(!code||!/^[A-Za-z0-9_-]{1,64}$/.test(targetWorkspace)) return send(req,res,400,{error:'code and valid workspaceId required'})
      workspaceId=targetWorkspace
      return withWorkspace(workspaceId,async()=>{
        const state=await getState()
        const codeHash=createHash('sha256').update(code).digest('hex')
        const exchange=(state.googleLoginExchanges||[]).find(x=>x.codeHash===codeHash&&!x.used&&Date.parse(x.expiresAt)>Date.now())
        if(!exchange) return send(req,res,400,{error:'invalid or expired Google login code'})
        const ttl=Number(process.env.TOKEN_TTL_SECONDS||3600)
        const jti=randomUUID()
        const expiresAt=new Date(Date.now()+ttl*1000).toISOString()
        const token=createToken({email:exchange.email,userId:exchange.userId,workspaceId,role:exchange.role,jti},JWT_SECRET,ttl)
        await mutateState(s=>{
          const found=(s.googleLoginExchanges||[]).find(x=>x.codeHash===codeHash)
          if(found){found.used=true;found.usedAt=new Date().toISOString()}
          s.sessions=s.sessions||[]
          s.sessions.unshift({jti,userId:exchange.userId,email:exchange.email,role:exchange.role,status:'active',createdAt:new Date().toISOString(),expiresAt})
          s.sessions=s.sessions.filter(x=>!x.expiresAt||Date.parse(x.expiresAt)>Date.now()).slice(0,5000)
          s.audit=s.audit||[]
          s.audit.unshift({id:randomUUID(),action:'auth.google_login',entityId:exchange.userId,at:new Date().toISOString()})
          s.audit=s.audit.slice(0,1000)
        })
        return send(req,res,200,{token,user:{id:exchange.userId,email:exchange.email,name:exchange.name,role:exchange.role},workspaceId,expiresIn:ttl})
      })
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/password/forgot') {
      const body=await readBody(req)
      try{
        const result=await handleRecoverAccount({mode:'request',email:body.email,isProd:IS_PROD})
        return send(req,res,202,result)
      }catch(error){
        return send(req,res,Number(error?.status||500),{error:error instanceof Error?error.message:'password reset request failed',code:error?.code||'password_reset_request_failed'})
      }
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/password/reset') {
      const body=await readBody(req)
      try{
        const result=await handleRecoverAccount({mode:'complete',token:body.token,password:body.password,isProd:IS_PROD})
        return send(req,res,200,result)
      }catch(error){
        return send(req,res,Number(error?.status||400),{error:error instanceof Error?error.message:'password reset failed',code:error?.code||'password_reset_failed'})
      }
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      const jti=req.user?.jti
      if(jti) await mutateState(s=>{
        const session=(s.sessions||[]).find(x=>x.jti===jti)
        if(session){session.status='revoked';session.revokedAt=new Date().toISOString()}
        s.audit.unshift({id:randomUUID(),action:'auth.logout',entityId:req.user?.userId||'unknown',at:new Date().toISOString()})
      })
      return send(req,res,200,{ok:true})
    }
    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      return send(req,res,200,{user:{id:req.user.userId,email:req.user.email,role:req.user.role},workspaceId})
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/workspace/switch') {
      const body=await readBody(req)
      const targetWorkspaceId=String(body.workspaceId||'').trim()
      if(!/^[A-Za-z0-9_-]{1,64}$/.test(targetWorkspaceId)) return send(req,res,400,{error:'invalid workspace id'})
      const state=await withWorkspace('ws_default',()=>getState())
      const target=(state.workspaces||[]).find(item=>String(item.id)===targetWorkspaceId)
      if(!target) return send(req,res,404,{error:'workspace not found'})
      let targetMember
      try{
        const targetState=await withWorkspace(targetWorkspaceId,()=>getState())
        targetMember=assertWorkspaceMembership(targetState,req.user)
      }catch(error){
        await appendAuditRecord({workspaceId,actorId:req.user?.userId,action:'auth.workspace_switch_denied',entityType:'workspace',entityId:targetWorkspaceId,requestId:req.requestId,traceId:req.context?.traceId,outcome:'denied',metadata:{reason:error?.code||'workspace_membership_required'}}).catch(()=>{})
        return send(req,res,403,{error:'workspace membership required',code:error?.code||'workspace_membership_required'})
      }
      const ttl=Number(process.env.TOKEN_TTL_SECONDS||3600)
      const jti=randomUUID()
      const now=new Date().toISOString()
      const expiresAt=new Date(Date.now()+ttl*1000).toISOString()
      const targetRole=String(targetMember.role||req.user.role||'analyst')
      const token=createToken({email:req.user.email,userId:req.user.userId,workspaceId:targetWorkspaceId,role:targetRole,jti},JWT_SECRET,ttl)
      await mutateState(s=>{
        const previous=(s.sessions||[]).find(item=>item.jti===req.user.jti)
        if(previous){previous.status='revoked';previous.revokedAt=now}
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'auth.workspace_switched',entityId:targetWorkspaceId,userId:req.user.userId,at:now})
        s.audit=s.audit.slice(0,1000)
      })
      await withWorkspace(targetWorkspaceId,()=>mutateState(s=>{
        s.sessions=s.sessions||[]
        s.sessions.unshift({jti,userId:req.user.userId,email:req.user.email,role:targetRole,status:'active',createdAt:now,expiresAt})
        s.sessions=s.sessions.filter(item=>!item.expiresAt||Date.parse(item.expiresAt)>Date.now()).slice(0,5000)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'auth.workspace_session_started',entityId:req.user.userId,sourceWorkspaceId:workspaceId,at:now})
        s.audit=s.audit.slice(0,1000)
      }))
      await appendAuditRecord({workspaceId:targetWorkspaceId,actorId:req.user.userId,action:'auth.workspace_switched',entityType:'workspace',entityId:targetWorkspaceId,requestId:req.requestId,traceId:req.context?.traceId,metadata:{sourceWorkspaceId:workspaceId}})
      return send(req,res,200,{token,workspaceId:targetWorkspaceId,expiresIn:ttl})
    }
    if (req.method === 'GET' && url.pathname === '/api/members') {
      const state=await getState()
      return send(req,res,200,{items:(state.members||[]).map(({passwordHash,...member})=>member)})
    }
    if (req.method === 'POST' && url.pathname === '/api/members/invite') {
      const memberCapacity=await resourceCountAllowed(workspaceId,'members')
      if(!memberCapacity.allowed) return send(req,res,429,{error:'member limit reached',usage:memberCapacity})
      const body=await readBody(req)
      const email=String(body.email||'').trim().toLowerCase()
      const role=String(body.role||'analyst')
      if(!email.includes('@')) return send(req,res,400,{error:'valid email required'})
      if(!['owner','admin','analyst','operator'].includes(role)) return send(req,res,400,{error:'invalid role'})
      if(role==='owner'&&req.user.role!=='owner') return send(req,res,403,{error:'only an owner can grant owner role',code:'owner_role_grant_denied'})
      const state=await getState()
      if((state.members||[]).some(x=>String(x.email).toLowerCase()===email&&x.status==='active')) return send(req,res,409,{error:'member already exists'})
      const rawToken=randomBytes(24).toString('base64url')
      const tokenHash=createHash('sha256').update(rawToken).digest('hex')
      const invitation={id:'inv_'+randomUUID(),email,role,tokenHash,status:'pending',createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+7*24*60*60*1000).toISOString(),invitedBy:req.user.userId}
      await mutateState(s=>{
        s.invitations=s.invitations||[]
        s.invitations.unshift(invitation)
        s.audit.unshift({id:randomUUID(),action:'member.invited',entityId:invitation.id,email,role,at:invitation.createdAt})
      })
      return send(req,res,201,{id:invitation.id,email,role,status:'pending',expiresAt:invitation.expiresAt,inviteToken:rawToken,notice:'Send this invite token through your approved email provider; only its SHA-256 hash is stored.'})
    }
    if (req.method === 'POST' && url.pathname === '/api/members/role') {
      const body=await readBody(req)
      const memberId=String(body.memberId||'')
      const role=String(body.role||'')
      if(!memberId||!['owner','admin','analyst','operator'].includes(role)) return send(req,res,400,{error:'memberId and valid role required'})
      const state=await getState()
      const targetMember=(state.members||[]).find(x=>x.id===memberId)
      if(!targetMember) return send(req,res,404,{error:'member not found'})
      if(role==='owner'&&req.user.role!=='owner') return send(req,res,403,{error:'only an owner can grant owner role',code:'owner_role_grant_denied'})
      if(targetMember.role==='owner'&&req.user.role!=='owner') return send(req,res,403,{error:'only an owner can change an owner role',code:'owner_role_change_denied'})
      if(memberId===req.user.userId&&req.user.role==='owner'&&role!=='owner') return send(req,res,409,{error:'owner cannot remove their own owner role'})
      let updated=null
      await mutateState(s=>{
        const member=(s.members||[]).find(x=>x.id===memberId)
        if(member){member.role=role;member.updatedAt=new Date().toISOString();updated={...member};delete updated.passwordHash}
        s.sessions=(s.sessions||[]).map(x=>x.userId===memberId?{...x,status:'revoked',revokedAt:new Date().toISOString()}:x)
        s.audit.unshift({id:randomUUID(),action:'member.role_changed',entityId:memberId,role,at:new Date().toISOString()})
      })
      return updated?send(req,res,200,updated):send(req,res,404,{error:'member not found'})
    }
    if (req.method === 'POST' && url.pathname === '/api/members/deactivate') {
      const body=await readBody(req)
      const state=await getState()
      const targetMember=(state.members||[]).find(x=>x.id===String(body.memberId||''))
      if(targetMember?.role==='owner'&&req.user.role!=='owner') return send(req,res,403,{error:'only an owner can deactivate an owner',code:'owner_deactivation_denied'})
      try{
        const updated=await handleRemoveMember({
          workspaceId,
          memberId:body.memberId,
          actorId:req.user?.userId||null
        })
        return updated?send(req,res,200,updated):send(req,res,404,{error:'member not found'})
      }catch(error){
        return send(req,res,Number(error?.status||400),{error:error instanceof Error?error.message:'member deactivation failed',code:error?.code||'member_deactivation_failed'})
      }
    }
    if (req.method === 'POST' && url.pathname === '/api/invitations/activate') {
      const body=await readBody(req)
      const inviteToken=String(body.inviteToken||'')
      const password=String(body.password||'')
      const name=String(body.name||'').trim()
      if(!inviteToken||password.length<8||!name) return send(req,res,400,{error:'inviteToken, name and password length >= 8 required'})
      const tokenHash=createHash('sha256').update(inviteToken).digest('hex')
      const state=await getState()
      const invitation=(state.invitations||[]).find(x=>x.tokenHash===tokenHash&&x.status==='pending')
      if(!invitation||Date.parse(invitation.expiresAt)<=Date.now()) return send(req,res,400,{error:'invalid or expired invitation'})
      const member={id:'usr_'+randomUUID(),email:invitation.email,name,role:invitation.role,status:'active',passwordHash:hashPassword(password),createdAt:new Date().toISOString()}
      await mutateState(s=>{
        s.members=s.members||[]
        s.members.push(member)
        const inv=(s.invitations||[]).find(x=>x.id===invitation.id)
        if(inv){inv.status='accepted';inv.acceptedAt=new Date().toISOString()}
        s.audit.unshift({id:randomUUID(),action:'member.activated',entityId:member.id,email:member.email,role:member.role,at:member.createdAt})
      })
      return send(req,res,201,{user:{id:member.id,email:member.email,name:member.name,role:member.role},workspaceId})
    }

    return false
}

