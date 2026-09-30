import {FormEvent,useEffect,useMemo,useState} from 'react'
import {controlPages,type ControlPageKey} from './features/manifest'
import {controlApi,type ControlReadResult,type ControlSession} from './lib/control-api'
import './control.css'
import {SkipLink} from '../../../packages/design-system/src/Accessibility'
import ChangesPage from './features/changes/pages/ChangesPage'
import EmergencyPage from './features/emergency/pages/EmergencyPage'
import FeaturesPage from './features/features/pages/FeaturesPage'

const keyFromHash=():ControlPageKey=>{
  const raw=(window.location.hash.replace(/^#\/?/,'').split('?')[0]||'overview') as ControlPageKey
  return controlPages.some(page=>page.key===raw)?raw:'overview'
}

export default function ControlCenterApp(){
  const [active,setActive]=useState<ControlPageKey>(keyFromHash)
  const [result,setResult]=useState<ControlReadResult|null>(null)
  const [loading,setLoading]=useState(false)
  const [session,setSession]=useState<ControlSession|null>(null)
  const [authLoading,setAuthLoading]=useState(true)
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [authError,setAuthError]=useState('')
  const page=useMemo(()=>controlPages.find(item=>item.key===active)||controlPages[0],[active])

  const refresh=async()=>{
    if(!session?.authenticated)return
    setLoading(true)
    try{
      const next=await controlApi.read(active)
      setResult(next)
      if(next.status==='forbidden')setSession({authenticated:false})
    }finally{setLoading(false)}
  }

  useEffect(()=>{
    const onHash=()=>setActive(keyFromHash())
    window.addEventListener('hashchange',onHash)
    return()=>window.removeEventListener('hashchange',onHash)
  },[])

  useEffect(()=>{
    let cancelled=false
    void controlApi.session().then(next=>{
      if(cancelled)return
      setSession(next)
      setAuthLoading(false)
    })
    return()=>{cancelled=true}
  },[])

  useEffect(()=>{
    if(!session?.authenticated)return
    setResult(null)
    void refresh()
  },[active,session?.authenticated])

  const navigate=(key:ControlPageKey)=>{
    if(window.location.hash!=='#/'+key)window.location.hash='#/'+key
    setActive(key)
  }

  const submitLogin=async(event:FormEvent)=>{
    event.preventDefault()
    if(authLoading)return
    setAuthLoading(true)
    setAuthError('')
    try{
      const outcome=await controlApi.login(email,password)
      if(!outcome.ok){
        setAuthError(outcome.message||'Platform control login failed.')
        return
      }
      const next=await controlApi.session()
      setSession(next)
      setPassword('')
    }finally{setAuthLoading(false)}
  }

  const logout=async()=>{
    setAuthLoading(true)
    try{
      await controlApi.logout()
      setSession({authenticated:false})
      setResult(null)
      setPassword('')
    }finally{setAuthLoading(false)}
  }

  if(authLoading&&session===null){
    return <main className="control-auth-shell ace-a11y-root" aria-busy="true">
      <section className="control-auth-card"><span>ACE PLATFORM CONTROL</span><h1>Checking privileged session…</h1><p>Customer workspace credentials are not reused for this application.</p></section>
    </main>
  }

  if(!session?.authenticated){
    return <main className="control-auth-shell ace-a11y-root">
      <SkipLink href="#control-login"/>
      <form id="control-login" className="control-auth-card" onSubmit={event=>void submitLogin(event)}>
        <span>ACE PLATFORM CONTROL</span>
        <h1>Privileged sign in</h1>
        <p>This application uses a separate control-plane session. Credentials remain in memory only until submission and are never stored in browser local storage.</p>
        <label>Email<input type="email" autoComplete="username" value={email} onChange={event=>setEmail(event.target.value)} required/></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} required/></label>
        {authError&&<div className="control-auth-error" role="alert">{authError}</div>}
        <button type="submit" disabled={authLoading}>{authLoading?'Signing in…':'Sign in to Platform Control'}</button>
      </form>
    </main>
  }

  return <><SkipLink href="#control-main-content"/><div className="control-shell">
    <aside className="control-nav">
      <div className="control-brand"><span>ACE</span><b>Platform Control</b><small>Privileged operations</small></div>
      <nav aria-label="Platform control navigation">
        {controlPages.map(item=><button key={item.key} aria-current={active===item.key?'page':undefined} className={active===item.key?'active':''} onClick={()=>navigate(item.key)}><span>{item.label}</span></button>)}
      </nav>
    </aside>
    <main id="control-main-content" tabIndex={-1} className="control-main ace-a11y-root">
      <div className="control-trust-banner">
        <div><strong>Separate trust boundary</strong><span>No customer token, workspace local-storage authority, plaintext secrets or arbitrary shell execution.</span></div>
        <div className="control-session"><span>{session.email}</span><button type="button" onClick={()=>void logout()} disabled={authLoading}>Sign out</button></div>
      </div>
      {active==='changes'
        ?<ChangesPage result={result} loading={loading} onRefresh={()=>void refresh()} role={session.role}/>
        :active==='emergency'
          ?<EmergencyPage result={result} loading={loading} onRefresh={()=>void refresh()} role={session.role}/>
          :active==='features'
            ?<FeaturesPage result={result} loading={loading} onRefresh={()=>void refresh()} role={session.role}/>
            :<section className="control-page" aria-busy={loading?'true':undefined}>
          <header className="control-page-head"><div><span>PLATFORM CONTROL CENTER</span><h1>{page.label}</h1><p>{page.responsibility}</p></div><button type="button" onClick={()=>void refresh()} disabled={loading}>{loading?'Refreshing…':'Refresh observed state'}</button></header>
          {loading&&!result&&<div className="control-state"><strong>Loading observed state…</strong><p>No desired-state change is performed by this page.</p></div>}
          {result?.status==='forbidden'&&<div className="control-state control-state-warning" role="alert"><strong>Access denied</strong><p>{result.message}</p><small>Customer workspace credentials are intentionally not reused for this application.</small></div>}
          {result?.status==='unavailable'&&<div className="control-state control-state-warning" role="status"><strong>Control plane unavailable</strong><p>{result.message}</p><small>Healthy customer data-plane traffic must not depend on this read succeeding.</small></div>}
          {result?.status==='ready'&&<div className="control-state control-state-ready"><strong>Observed state</strong><small>Observed {new Date(result.observedAt).toLocaleString()}</small><pre>{JSON.stringify(result.data||{},null,2)}</pre></div>}
          <aside className="control-integrity-note"><strong>Observed-state control surface</strong><p>Operational pages remain read-only unless their governed backend mutation contracts and recovery paths are explicitly implemented.</p></aside>
        </section>}
    </main>
  </div></>
}
