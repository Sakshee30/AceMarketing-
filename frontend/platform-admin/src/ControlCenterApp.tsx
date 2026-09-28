import {useEffect,useMemo,useState} from 'react'
import {controlPages,type ControlPageKey} from './features/manifest'
import {controlApi,type ControlReadResult} from './lib/control-api'
import './control.css'

const keyFromHash=():ControlPageKey=>{
  const raw=(window.location.hash.replace(/^#\/?/,'').split('?')[0]||'overview') as ControlPageKey
  return controlPages.some(page=>page.key===raw)?raw:'overview'
}

export default function ControlCenterApp(){
  const [active,setActive]=useState<ControlPageKey>(keyFromHash)
  const [result,setResult]=useState<ControlReadResult|null>(null)
  const [loading,setLoading]=useState(false)
  const page=useMemo(()=>controlPages.find(item=>item.key===active)||controlPages[0],[active])

  const refresh=async()=>{
    setLoading(true)
    try{setResult(await controlApi.read(active))}
    finally{setLoading(false)}
  }

  useEffect(()=>{
    const onHash=()=>setActive(keyFromHash())
    window.addEventListener('hashchange',onHash)
    return()=>window.removeEventListener('hashchange',onHash)
  },[])

  useEffect(()=>{setResult(null);void refresh()},[active])

  const navigate=(key:ControlPageKey)=>{
    if(window.location.hash!=='#/'+key)window.location.hash='#/'+key
    setActive(key)
  }

  return <div className="control-shell">
    <aside className="control-nav">
      <div className="control-brand"><span>ACE</span><b>Platform Control</b><small>Privileged operations</small></div>
      <nav aria-label="Platform control navigation">
        {controlPages.map(item=><button key={item.key} className={active===item.key?'active':''} onClick={()=>navigate(item.key)}><span>{item.label}</span></button>)}
      </nav>
    </aside>
    <main className="control-main">
      <div className="control-trust-banner"><strong>Separate trust boundary</strong><span>No customer token, workspace local-storage authority, plaintext secrets or arbitrary shell execution.</span></div>
      <section className="control-page" aria-busy={loading?'true':undefined}>
        <header className="control-page-head"><div><span>PLATFORM CONTROL CENTER</span><h1>{page.label}</h1><p>{page.responsibility}</p></div><button type="button" onClick={()=>void refresh()} disabled={loading}>{loading?'Refreshing…':'Refresh observed state'}</button></header>
        {loading&&!result&&<div className="control-state"><strong>Loading observed state…</strong><p>No desired-state change is performed by this page.</p></div>}
        {result?.status==='forbidden'&&<div className="control-state control-state-warning" role="alert"><strong>Access denied</strong><p>{result.message}</p><small>Customer workspace credentials are intentionally not reused for this application.</small></div>}
        {result?.status==='unavailable'&&<div className="control-state control-state-warning" role="status"><strong>Control plane unavailable</strong><p>{result.message}</p><small>Healthy customer data-plane traffic must not depend on this read succeeding.</small></div>}
        {result?.status==='ready'&&<div className="control-state control-state-ready"><strong>Observed state</strong><small>Observed {new Date(result.observedAt).toLocaleString()}</small><pre>{JSON.stringify(result.data||{},null,2)}</pre></div>}
        <aside className="control-integrity-note"><strong>Read-only frontend phase</strong><p>Write controls remain intentionally absent until backend authorization, impact analysis, approval, orchestration, idempotency, verification and recovery contracts exist.</p></aside>
      </section>
    </main>
  </div>
}
