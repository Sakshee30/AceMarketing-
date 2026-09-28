import {useEffect,useState} from 'react'
import {ArrowRight} from 'lucide-react'
import {api} from '../lib/api'
import {Brand} from '../../../packages/design-system/src/Brand'
import {getRememberedEmail,setRememberedEmail} from '../../../packages/client-core/src/session-authority'

export default function LoginPage({back,openApp}:{back:()=>void,openApp:()=>void}){
 const [email,setEmail]=useState(()=>getRememberedEmail())
 const [password,setPassword]=useState('')
 const [show,setShow]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [loading,setLoading]=useState(false)
 const [rememberEmail,setRememberEmail]=useState(()=>Boolean(getRememberedEmail()))
 const [mode,setMode]=useState<'login'|'forgot'|'reset'>('login')
 const [resetToken,setResetToken]=useState('')
 useEffect(()=>{
  if(typeof window==='undefined')return
  const params=new URLSearchParams(window.location.search)
  const googleCode=params.get('google_code')
  const googleWorkspace=params.get('google_workspace')
  const authError=params.get('auth_error')
  const reset=params.get('reset_token')
  if(authError==='not_member')setError('This Google account is not an active workspace member.')
  if(reset){setResetToken(reset);setMode('reset')}
  if(googleCode&&googleWorkspace){
   setLoading(true)
   api.googleLoginExchange(googleCode,googleWorkspace).then(()=>{window.history.replaceState({},'',window.location.pathname+window.location.hash);openApp()}).catch((e:any)=>setError(e?.message||'Google login exchange failed.')).finally(()=>setLoading(false))
  }
 },[])
 const submit=async(e:any)=>{e.preventDefault();setLoading(true);setError('');setNotice('');try{await api.login(email,password);setRememberedEmail(rememberEmail?email:null);openApp()}catch(e:any){setError(e?.message||'Login failed.')}finally{setLoading(false)}}
 const google=async()=>{setLoading(true);setError('');try{const r:any=await api.googleLoginStart();if(r.authorizationUrl)window.location.assign(r.authorizationUrl);else setError('Google login is not configured.')}catch(e:any){setError(e?.message||'Google login could not start.');setLoading(false)}}
 const forgot=async(e:any)=>{e.preventDefault();setLoading(true);setError('');setNotice('');try{const r:any=await api.forgotPassword(email);setNotice(r?.developmentResetToken?'Reset requested. Development token: '+r.developmentResetToken:'If the account exists, a reset link has been sent.');if(r?.developmentResetToken){setResetToken(r.developmentResetToken);setMode('reset')}}catch(e:any){setError(e?.message||'Reset request failed.')}finally{setLoading(false)}}
 const reset=async(e:any)=>{e.preventDefault();setLoading(true);setError('');setNotice('');try{await api.resetPassword(resetToken,password);setNotice('Password reset complete. You can now sign in.');setMode('login');setPassword('')}catch(e:any){setError(e?.message||'Password reset failed.')}finally{setLoading(false)}}
 const loginForm=<form className="login-card" onSubmit={submit}><Brand dark/><h2>Log in to your workspace</h2><p>Use your organization credentials.</p><button type="button" className="google-login" disabled={loading} onClick={google}>G <span>{loading?'Connecting…':'Continue with Google'}</span></button><div className="or"><i/>OR<i/></div><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} required type="email" placeholder="you@company.com"/></label><label>Password<div className="password-field"><input value={password} onChange={e=>setPassword(e.target.value)} required type={show?'text':'password'} placeholder="••••••••"/><button type="button" onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div></label><div className="login-options"><label><input type="checkbox" checked={rememberEmail} onChange={e=>setRememberEmail(e.target.checked)}/> Remember email</label><button type="button" onClick={()=>{setMode('forgot');setError('');setNotice('')}}>Forgot password?</button></div><button className="login-submit" disabled={loading}>{loading?'Signing in…':'Log in'} <ArrowRight/></button>{error&&<small className="login-error">{error}</small>}{notice&&<small className="login-notice">{notice}</small>}<small>Production access is workspace-scoped and role-based. Contact your workspace owner if you need an invitation.</small></form>
 const forgotForm=<form className="login-card" onSubmit={forgot}><Brand dark/><h2>Reset your password</h2><p>Enter your workspace email. Reset links expire after 30 minutes.</p><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} required type="email" placeholder="you@company.com"/></label><button className="login-submit" disabled={loading}>{loading?'Requesting…':'Send reset link'} <ArrowRight/></button><button type="button" className="login-secondary-action" onClick={()=>setMode('login')}>Back to login</button>{error&&<small className="login-error">{error}</small>}{notice&&<small className="login-notice">{notice}</small>}</form>
 const resetForm=<form className="login-card" onSubmit={reset}><Brand dark/><h2>Choose a new password</h2><p>Use at least 8 characters. Completing the reset revokes existing sessions for this user.</p><label>New password<div className="password-field"><input value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} type={show?'text':'password'} placeholder="••••••••"/><button type="button" onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div></label><button className="login-submit" disabled={loading||!resetToken}>{loading?'Updating…':'Reset password'} <ArrowRight/></button><button type="button" className="login-secondary-action" onClick={()=>setMode('login')}>Back to login</button>{error&&<small className="login-error">{error}</small>}{notice&&<small className="login-notice">{notice}</small>}</form>
 return <div className="login-page"><div className="login-brand"><Brand/><button onClick={back}>Back to website</button></div><div className="login-shell"><div className="login-story"><span className="kicker">ACE MARKETING PLATFORM</span><h1>One workspace for the complete acquisition journey.</h1><p>Connect paid media, CRM, calls, messaging and offline outcomes — then activate clean signals and measure revenue in one place.</p><div className="login-flow">{['Connect','Stitch','Enrich','Activate','Attribute'].map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b>{i<4&&<ArrowRight/>}</div>)}</div></div>{mode==='login'?loginForm:mode==='forgot'?forgotForm:resetForm}</div></div>
}
