// @ts-nocheck
import {Component,Fragment,lazy,Suspense,useEffect,useMemo,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {
  Activity,AlertTriangle,ArrowRight,BarChart3,Bell,BookOpen,Bot,Building2,Cable,CalendarDays,Check,CheckCircle2,ChevronDown,ChevronRight,
  CircleDollarSign,Code2,DatabaseZap,Filter,Gauge,Globe2,GraduationCap,Headphones,HeartPulse,Home,Landmark,Layers3,Menu,MessageCircle,MessageSquareText,
  MousePointer2,Network,PhoneCall,PhoneIncoming,PhoneOutgoing,PieChart,Plane,Plus,RadioTower,RefreshCw,Search,Settings2,ShieldCheck,ShoppingCart,Store,
  Sparkles,Smartphone,Table2,Target,UsersRound,Video,WandSparkles,X,Zap
} from 'lucide-react'
import './ace-platform.css'
import { api } from './lib/api'
import {getLocalConsent,saveLocalConsent} from './lib/tracker'
import {RouteAnnouncer} from './components/system/FrontendFoundation'
import {Brand} from '../../packages/design-system/src/Brand'
import {LoadingState} from './components/system/FrontendStates'

type View='site'|'app'|'login'|'pricing'|'demo'|'company'|'resources'|'case-studies'|'privacy'|'terms'|'security'|'solutions'|'industries'|'agents-public'|'integrations-public'

const CustomerWorkspace=lazy(()=>import('./customer-app/public'))
const PublicSite=lazy(()=>import('../../website/public-site/src/public'))
function ConsentBanner(){
 const [visible,setVisible]=useState(()=>!getLocalConsent())
 const choose=async(analytics:boolean,marketing:boolean,personalization:boolean)=>{await saveLocalConsent({analytics,marketing,personalization});setVisible(false)}
 if(typeof document==='undefined')return null
 const node=!visible
  ?<button className="consent-manage" onClick={()=>setVisible(true)} aria-label="Manage privacy choices"><ShieldCheck/> Privacy</button>
  :<div className="consent-overlay"><div className="consent-banner" role="dialog" aria-label="Privacy choices"><div className="consent-copy"><ShieldCheck/><div><b>Your privacy choices</b><p>Essential storage is always used for security and core functionality. Analytics, advertising signals and personalization stay off until you choose to enable them.</p></div></div><div className="consent-actions"><button onClick={()=>choose(false,false,false)}>Essential only</button><button onClick={()=>choose(true,false,false)}>Allow analytics</button><button className="primary" onClick={()=>choose(true,true,true)}>Allow all</button></div></div></div>
 return createPortal(node,document.body)
}

function Login({back,openApp}:{back:()=>void,openApp:()=>void}){
 const [email,setEmail]=useState('')
 const [password,setPassword]=useState('')
 const [show,setShow]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [loading,setLoading]=useState(false)
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
 const submit=async(e:any)=>{e.preventDefault();setLoading(true);setError('');setNotice('');try{await api.login(email,password);openApp()}catch(e:any){setError(e?.message||'Login failed.')}finally{setLoading(false)}}
 const google=async()=>{setLoading(true);setError('');try{const r:any=await api.googleLoginStart();if(r.authorizationUrl)window.location.assign(r.authorizationUrl);else setError('Google login is not configured.')}catch(e:any){setError(e?.message||'Google login could not start.');setLoading(false)}}
 const forgot=async(e:any)=>{e.preventDefault();setLoading(true);setError('');setNotice('');try{const r:any=await api.forgotPassword(email);setNotice(r?.developmentResetToken?'Reset requested. Development token: '+r.developmentResetToken:'If the account exists, a reset link has been sent.');if(r?.developmentResetToken){setResetToken(r.developmentResetToken);setMode('reset')}}catch(e:any){setError(e?.message||'Reset request failed.')}finally{setLoading(false)}}
 const reset=async(e:any)=>{e.preventDefault();setLoading(true);setError('');setNotice('');try{await api.resetPassword(resetToken,password);setNotice('Password reset complete. You can now sign in.');setMode('login');setPassword('')}catch(e:any){setError(e?.message||'Password reset failed.')}finally{setLoading(false)}}
 const loginForm=<form className="login-card" onSubmit={submit}><Brand dark/><h2>Log in to your workspace</h2><p>Use your organization credentials.</p><button type="button" className="google-login" disabled={loading} onClick={google}>G <span>{loading?'Connecting…':'Continue with Google'}</span></button><div className="or"><i/>OR<i/></div><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} required type="email" placeholder="you@company.com"/></label><label>Password<div className="password-field"><input value={password} onChange={e=>setPassword(e.target.value)} required type={show?'text':'password'} placeholder="••••••••"/><button type="button" onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div></label><div className="login-options"><label><input type="checkbox"/> Remember me</label><button type="button" onClick={()=>{setMode('forgot');setError('');setNotice('')}}>Forgot password?</button></div><button className="login-submit" disabled={loading}>{loading?'Signing in…':'Log in'} <ArrowRight/></button>{error&&<small className="login-error">{error}</small>}{notice&&<small className="login-notice">{notice}</small>}<small>Production access is workspace-scoped and role-based. Contact your workspace owner if you need an invitation.</small></form>
 const forgotForm=<form className="login-card" onSubmit={forgot}><Brand dark/><h2>Reset your password</h2><p>Enter your workspace email. Reset links expire after 30 minutes.</p><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} required type="email" placeholder="you@company.com"/></label><button className="login-submit" disabled={loading}>{loading?'Requesting…':'Send reset link'} <ArrowRight/></button><button type="button" className="login-secondary-action" onClick={()=>setMode('login')}>Back to login</button>{error&&<small className="login-error">{error}</small>}{notice&&<small className="login-notice">{notice}</small>}</form>
 const resetForm=<form className="login-card" onSubmit={reset}><Brand dark/><h2>Choose a new password</h2><p>Use at least 8 characters. Completing the reset revokes existing sessions for this user.</p><label>New password<div className="password-field"><input value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} type={show?'text':'password'} placeholder="••••••••"/><button type="button" onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div></label><button className="login-submit" disabled={loading||!resetToken}>{loading?'Updating…':'Reset password'} <ArrowRight/></button><button type="button" className="login-secondary-action" onClick={()=>setMode('login')}>Back to login</button>{error&&<small className="login-error">{error}</small>}{notice&&<small className="login-notice">{notice}</small>}</form>
 return <div className="login-page"><div className="login-brand"><Brand/><button onClick={back}>Back to website</button></div><div className="login-shell"><div className="login-story"><span className="kicker">ACE MARKETING PLATFORM</span><h1>One workspace for the complete acquisition journey.</h1><p>Connect paid media, CRM, calls, messaging and offline outcomes — then activate clean signals and measure revenue in one place.</p><div className="login-flow">{['Connect','Stitch','Enrich','Activate','Attribute'].map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b>{i<4&&<ArrowRight/>}</div>)}</div></div>{mode==='login'?loginForm:mode==='forgot'?forgotForm:resetForm}</div></div>
}
function DeepLinkResolver(){
 const slug=decodeURIComponent((window.location.hash.match(/^#\/deep\/([^?]+)/)?.[1]||''))
 const [link,setLink]=useState<any>(null)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 useEffect(()=>{
  let active=true
  api.deepLinks().then(async(r:any)=>{
   const found=(r.items||[]).find((x:any)=>x.slug===slug&&x.status==='active')
   if(!active)return
   if(!found){setError('This deep link is unavailable or inactive.');setLoading(false);return}
   setLink(found);setLoading(false)
   await api.recordDeepLinkEvent({slug,kind:'click',source:'ace_resolver'}).catch(()=>null)
  }).catch((e:any)=>{if(active){setError(e?.message||'Deep link could not be loaded.');setLoading(false)}})
  return()=>{active=false}
 },[slug])
 const openApp=async()=>{if(!link)return;await api.recordDeepLinkEvent({slug,kind:'app_open',source:'ace_resolver'}).catch(()=>null);window.location.href=link.target}
 const openWeb=()=>{if(link?.fallback)window.location.href=link.fallback}
 return <div className="login-shell"><div className="login-card"><Brand/><div className="login-title"><h1>Continue your journey</h1><p>{loading?'Resolving destination…':error||link?.name}</p></div>{!loading&&!error&&link&&<><div className="site-detail-grid"><div><span>Route</span><b>{link.slug}</b></div><div><span>Status</span><b>Active</b></div></div><div className="approval-actions"><button onClick={openWeb}>Continue on web</button><button className="approve" onClick={openApp}>Open app</button></div></>}{error&&<div className="delivery-notice error"><X/><span>{error}</span></div>}<button className="login-back" onClick={()=>window.location.hash='#/'}><ArrowRight/>Back to AceMarketing</button></div></div>
}

const viewHash:Record<View,string>={
 site:'#/',app:'#/workspace',login:'#/login',pricing:'#/pricing',demo:'#/demo',company:'#/company',resources:'#/resources','case-studies':'#/case-studies',privacy:'#/privacy',terms:'#/terms',security:'#/security',solutions:'#/solutions',industries:'#/industries','agents-public':'#/agents', 'integrations-public':'#/integrations'
}
const hashView=(hash:string):View=>{
 if(hash.startsWith('#/workspace')) return 'app'
 if(hash.startsWith('#/resources')) return 'resources'
 if(hash.startsWith('#/case-studies')) return 'case-studies'
 const found=(Object.entries(viewHash) as [View,string][]).find(([,route])=>route===hash)
 return found?.[0]||'site'
}

export default function AcePlatform(){
 const currentHash=typeof window!=='undefined'?window.location.hash:'#/'
 const[view,setView]=useState<View>(()=>hashView(currentHash))
 const publicRouteLabel:Record<View,string>={
  site:'AceMarketing home',app:'AceMarketing workspace',login:'Sign in',pricing:'Pricing',demo:'Book a demo',company:'Company',resources:'Resources','case-studies':'Case studies',privacy:'Privacy',terms:'Terms',security:'Security',solutions:'Solutions',industries:'Industries','agents-public':'Agents','integrations-public':'Integrations'
 }
 const navigate=(next:View)=>{
  setView(next)
  const route=viewHash[next]
  if(typeof window!=='undefined'&&window.location.hash!==route) window.location.hash=route
  if(typeof window!=='undefined') setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),0)
 }
 useEffect(()=>{
  const onHash=()=>setView(hashView(window.location.hash))
  const onAceView=(event:any)=>{const next=event?.detail as View;if(next&&viewHash[next])navigate(next)}
  window.addEventListener('hashchange',onHash)
  window.addEventListener('ace-view',onAceView as EventListener)
  if(!window.location.hash) window.history.replaceState(null,'',viewHash.site)
  return()=>{window.removeEventListener('hashchange',onHash);window.removeEventListener('ace-view',onAceView as EventListener)}
 },[])
 const goHome=()=>navigate('site')
 if(currentHash.startsWith('#/deep/')) return <DeepLinkResolver/>
 if(view==='login')return <Login back={goHome} openApp={()=>navigate('app')}/>
 const content=view==='app'
  ?<Suspense fallback={<LoadingState title="Loading workspace" description="Loading the authenticated customer application."/>}><CustomerWorkspace back={goHome}/></Suspense>
  :<Suspense fallback={<LoadingState title="Loading website" description="Loading AceMarketing public content."/>}><PublicSite view={view as any} navigate={navigate}/></Suspense>
 return <><RouteAnnouncer label={publicRouteLabel[view]||'AceMarketing'} focusSelector={view==='app'?'.product-body .page-head h1':'h1'}/>{content}<ConsentBanner/></>
}
