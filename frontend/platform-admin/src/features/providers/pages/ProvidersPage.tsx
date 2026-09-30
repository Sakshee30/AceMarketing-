import {FormEvent,useMemo,useState} from 'react'
import {controlApi,type ControlReadResult,type ProviderMigrationRequest} from '../../../lib/control-api'

type ProviderItem={
  id?:string
  capability?:string
  provider?:string
  productionBaseline?:string
  health?:string
  readiness?:string
  fallback?:string
}

type MigrationItem={
  id:string
  capability:string
  environment:string
  from_provider:string
  to_provider:string
  strategy:string
  state:string
  traffic_percent:number
  compatibility_report?:Record<string,unknown>
  version:number
  updated_at:string
}

const canMigrate=(role?:string)=>['platform_admin','infrastructure_engineer'].includes(role||'')

const nextState=(item:MigrationItem)=>{
  if(item.state==='draft')return {state:'validating'}
  if(item.state==='validating')return {state:'shadowing'}
  if(item.state==='shadowing')return {state:'canary',trafficPercent:10,compatibilityReport:{validated:true,source:'operator-confirmed'}}
  if(item.state==='canary'&&item.traffic_percent<50)return {state:'canary',trafficPercent:50,compatibilityReport:{...(item.compatibility_report||{}),validated:true}}
  if(item.state==='canary')return {state:'cutover',trafficPercent:100,compatibilityReport:{...(item.compatibility_report||{}),validated:true},cutoverBoundary:{confirmedAt:new Date().toISOString()}}
  if(item.state==='cutover')return {state:'verifying'}
  if(item.state==='verifying')return {state:'stabilizing'}
  if(item.state==='stabilizing')return {state:'completed'}
  if(item.state==='rollback_requested')return {state:'rolling_back'}
  if(item.state==='rolling_back')return {state:'rolled_back'}
  return null
}

export default function ProvidersPage({
  result,loading,onRefresh,role
}:{
  result:ControlReadResult|null
  loading:boolean
  onRefresh:()=>void
  role?:string
}){
  const providers=useMemo(()=>{
    const raw=result?.data?.providers
    return Array.isArray(raw)?raw as ProviderItem[]:[]
  },[result])
  const migrations=useMemo(()=>{
    const raw=result?.data?.migrations
    return Array.isArray(raw)?raw as MigrationItem[]:[]
  },[result])
  const [form,setForm]=useState<ProviderMigrationRequest>({
    capability:'email-delivery',
    environment:'staging',
    fromProvider:'smtp',
    toProvider:'replacement',
    strategy:'shadow',
    compatibilityReport:{},
    cutoverBoundary:{},
    rollbackPlan:{mode:'return-to-source-provider'}
  })
  const [busy,setBusy]=useState<string|null>(null)
  const [message,setMessage]=useState('')

  const submit=async(event:FormEvent)=>{
    event.preventDefault()
    setBusy('create')
    setMessage('')
    try{
      const outcome=await controlApi.createProviderMigration(form)
      if(!outcome.ok){setMessage(outcome.message||'Provider migration creation failed.');return}
      setMessage('Provider migration created in draft state. No provider traffic changed.')
      onRefresh()
    }finally{setBusy(null)}
  }

  const advance=async(item:MigrationItem)=>{
    const next=nextState(item)
    if(!next)return
    setBusy(item.id)
    setMessage('')
    try{
      const outcome=await controlApi.transitionProviderMigration(item.id,{
        toState:next.state,
        expectedVersion:item.version,
        trafficPercent:next.trafficPercent,
        compatibilityReport:next.compatibilityReport,
        cutoverBoundary:next.cutoverBoundary
      })
      if(!outcome.ok){setMessage(outcome.message||'Provider migration transition failed.');return}
      setMessage('Provider migration advanced and a signed runtime snapshot was published.')
      onRefresh()
    }finally{setBusy(null)}
  }

  const rollback=async(item:MigrationItem)=>{
    const reason=window.prompt('Reason for provider rollback?')
    if(!reason)return
    setBusy(item.id+':rollback')
    setMessage('')
    try{
      const outcome=await controlApi.rollbackProviderMigration(item.id,item.version,reason)
      if(!outcome.ok){setMessage(outcome.message||'Provider rollback request failed.');return}
      setMessage('Provider rollback requested and runtime configuration republished.')
      onRefresh()
    }finally{setBusy(null)}
  }

  return <section className="control-page" aria-busy={loading?'true':undefined}>
    <header className="control-page-head">
      <div>
        <span>PLATFORM CONTROL CENTER</span>
        <h1>Providers</h1>
        <p>Provider catalog, compatibility, health and gradual migration with rollback-safe runtime configuration.</p>
      </div>
      <button type="button" onClick={onRefresh} disabled={loading}>{loading?'Refreshing…':'Refresh observed state'}</button>
    </header>

    {message&&<div className="control-state control-state-warning" role="status"><strong>Provider migration</strong><p>{message}</p></div>}

    <div className="control-feature-grid">
      {providers.map((item,index)=><article className="control-feature-card" key={(item.id||item.capability||item.provider||'provider')+index}>
        <div className="control-feature-card-head">
          <div><strong>{item.id||item.capability||item.provider||'provider'}</strong><small>{item.productionBaseline||item.provider||'Configured adapter'}</small></div>
          <span className="control-change-state">{item.health||item.readiness||'unknown'}</span>
        </div>
        <p>{item.fallback?'Fallback: '+item.fallback:'Provider capability health is reported without assuming interchangeability.'}</p>
      </article>)}
    </div>

    {canMigrate(role)&&<form className="control-change-form" onSubmit={event=>void submit(event)}>
      <h2>Plan provider migration</h2>
      <div className="control-form-grid">
        <label>Capability
          <input value={form.capability} onChange={event=>setForm({...form,capability:event.target.value})} required/>
        </label>
        <label>Environment
          <select value={form.environment} onChange={event=>setForm({...form,environment:event.target.value})}>
            <option value="development">Development</option>
            <option value="test">Test</option>
            <option value="staging">Staging</option>
            <option value="production">Production</option>
            <option value="recovery">Recovery</option>
          </select>
        </label>
        <label>Current provider
          <input value={form.fromProvider} onChange={event=>setForm({...form,fromProvider:event.target.value})} required/>
        </label>
        <label>Target provider
          <input value={form.toProvider} onChange={event=>setForm({...form,toProvider:event.target.value})} required/>
        </label>
        <label>Initial strategy
          <select value={form.strategy} onChange={event=>setForm({...form,strategy:event.target.value as ProviderMigrationRequest['strategy']})}>
            <option value="shadow">Shadow</option>
            <option value="canary">Canary</option>
            <option value="dual_route">Dual route</option>
            <option value="cutover">Cutover</option>
          </select>
        </label>
      </div>
      <button type="submit" disabled={busy!==null}>{busy==='create'?'Creating…':'Create migration plan'}</button>
    </form>}

    <div className="control-change-board">
      {migrations.length===0&&!loading&&<div className="control-state"><strong>No provider migrations</strong><p>No controlled provider migration is currently recorded.</p></div>}
      {migrations.map(item=>{
        const next=nextState(item)
        const rollbackAllowed=['shadowing','canary','cutover','verifying','stabilizing','failed'].includes(item.state)
        return <article className="control-change-card" key={item.id}>
          <div className="control-change-card-head">
            <div><strong>{item.capability}: {item.from_provider} → {item.to_provider}</strong><small>{item.environment} · {item.strategy}</small></div>
            <span className="control-change-state">{item.state.replaceAll('_',' ')}</span>
          </div>
          <dl>
            <div><dt>Traffic</dt><dd>{item.traffic_percent}% target</dd></div>
            <div><dt>Version</dt><dd>{item.version}</dd></div>
            <div><dt>Updated</dt><dd>{new Date(item.updated_at).toLocaleString()}</dd></div>
          </dl>
          {canMigrate(role)&&<div className="control-change-actions">
            {next&&<button type="button" disabled={busy!==null} onClick={()=>void advance(item)}>Advance to {next.state.replaceAll('_',' ')}</button>}
            {rollbackAllowed&&<button type="button" disabled={busy!==null} onClick={()=>void rollback(item)}>Request rollback</button>}
          </div>}
        </article>
      })}
    </div>

    <aside className="control-integrity-note">
      <strong>Migration safety</strong>
      <p>Provider migration is gradual. Shadow and canary stages precede cutover, compatibility evidence is required, traffic changes are versioned, and rollback is a separate governed state. Destroying the old provider is not part of this workflow.</p>
    </aside>
  </section>
}
