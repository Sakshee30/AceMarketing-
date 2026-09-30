import {useEffect,useMemo,useState} from 'react'
import {controlApi,type ControlReadResult} from '../../../lib/control-api'

type FeatureItem={
  id:string
  owner:string
  locked:boolean
  desired:string
  actual:string
  criticality?:string
  offBehaviour?:Record<string,unknown>
  supportedStates?:string[]
}

const canPublish=(role?:string)=>['platform_admin','infrastructure_engineer'].includes(role||'')

export default function FeaturesPage({
  result,loading,onRefresh,role
}:{
  result:ControlReadResult|null
  loading:boolean
  onRefresh:()=>void
  role?:string
}){
  const items=useMemo(()=>{
    const raw=result?.data?.items
    return Array.isArray(raw)?raw as FeatureItem[]:[]
  },[result])
  const [environment,setEnvironment]=useState('production')
  const [states,setStates]=useState<Record<string,string>>({})
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  useEffect(()=>{
    if(!items.length)return
    setStates(current=>{
      const next={...current}
      for(const item of items)if(next[item.id]===undefined)next[item.id]=item.desired||item.actual||'enabled'
      return next
    })
  },[items])

  const publish=async()=>{
    setBusy(true)
    setMessage('')
    try{
      const outcome=await controlApi.publishRuntimeConfig({environment,features:states})
      if(!outcome.ok){setMessage(outcome.message||'Runtime configuration publication failed.');return}
      const version=outcome.data?.version
      setMessage('Signed runtime configuration published'+(version?' as version '+String(version):'')+'.')
      onRefresh()
    }finally{setBusy(false)}
  }

  return <section className="control-page" aria-busy={loading?'true':undefined}>
    <header className="control-page-head">
      <div>
        <span>PLATFORM CONTROL CENTER</span>
        <h1>Features</h1>
        <p>Versioned runtime feature states with locked safety capabilities and explicit off-state behavior.</p>
      </div>
      <button type="button" onClick={onRefresh} disabled={loading}>{loading?'Refreshing…':'Refresh observed state'}</button>
    </header>

    {message&&<div className="control-state control-state-warning" role="status"><strong>Runtime configuration</strong><p>{message}</p></div>}

    <div className="control-runtime-toolbar">
      <label>Target environment
        <select value={environment} onChange={event=>setEnvironment(event.target.value)}>
          <option value="development">Development</option>
          <option value="test">Test</option>
          <option value="staging">Staging</option>
          <option value="production">Production</option>
          <option value="recovery">Recovery</option>
        </select>
      </label>
      {canPublish(role)&&<button type="button" onClick={()=>void publish()} disabled={busy||loading}>{busy?'Publishing…':'Publish signed snapshot'}</button>}
    </div>

    <div className="control-feature-grid">
      {items.map(item=>{
        const options=item.supportedStates?.length?item.supportedStates:['enabled','read_only','draining','disabled','degraded']
        return <article className="control-feature-card" key={item.id}>
          <div className="control-feature-card-head">
            <div><strong>{item.id}</strong><small>{item.owner}</small></div>
            <span className="control-change-state">{item.locked?'locked':item.criticality||'product'}</span>
          </div>
          <dl>
            <div><dt>Observed</dt><dd>{item.actual||'unknown'}</dd></div>
            <div><dt>Desired</dt><dd>{states[item.id]||item.desired||'enabled'}</dd></div>
          </dl>
          <label>Runtime state
            <select
              disabled={item.locked||!canPublish(role)}
              value={item.locked?'enabled':states[item.id]||'enabled'}
              onChange={event=>setStates({...states,[item.id]:event.target.value})}
            >
              {options.map(state=><option value={state} key={state}>{state.replaceAll('_',' ')}</option>)}
            </select>
          </label>
          <p>{item.locked?'This safety capability cannot be switched off.':item.offBehaviour?JSON.stringify(item.offBehaviour):'Explicit off behavior is enforced by the backend.'}</p>
        </article>
      })}
    </div>

    <aside className="control-integrity-note">
      <strong>Safe switch semantics</strong>
      <p>Disable, drain, read-only and degraded are runtime behavior states. Publishing a state never destroys provider infrastructure or bypasses authorization, tenant isolation, audit or durability requirements.</p>
    </aside>
  </section>
}
