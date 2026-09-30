import {FormEvent,useMemo,useState} from 'react'
import {controlApi,type ControlReadResult,type EmergencyControlRequest} from '../../../lib/control-api'

type EmergencyItem={
  id:string
  scope_type:string
  scope_id?:string|null
  control_type:string
  reason:string
  state:string
  expires_at:string
  created_by:string
  version:number
}

const canEmergency=(role?:string)=>['platform_admin','security_admin'].includes(role||'')

export default function EmergencyPage({
  result,loading,onRefresh,role
}:{
  result:ControlReadResult|null
  loading:boolean
  onRefresh:()=>void
  role?:string
}){
  const [form,setForm]=useState<EmergencyControlRequest>({
    environment:'production',
    scopeType:'platform',
    scopeId:'',
    controlType:'suspend_ai',
    reason:'',
    durationMinutes:30
  })
  const [busy,setBusy]=useState<string|null>(null)
  const [message,setMessage]=useState('')
  const items=useMemo(()=>{
    const raw=result?.data?.items
    return Array.isArray(raw)?raw as EmergencyItem[]:[]
  },[result])
  const snapshot=result?.data?.latestRuntimeSnapshot as Record<string,unknown>|undefined

  const submit=async(event:FormEvent)=>{
    event.preventDefault()
    setBusy('create')
    setMessage('')
    try{
      const outcome=await controlApi.createEmergency(form)
      if(!outcome.ok){setMessage(outcome.message||'Emergency control failed.');return}
      setMessage('Emergency control activated and a signed runtime snapshot was published.')
      setForm(current=>({...current,scopeId:'',reason:''}))
      onRefresh()
    }finally{setBusy(null)}
  }

  const revoke=async(item:EmergencyItem)=>{
    setBusy(item.id)
    setMessage('')
    try{
      const outcome=await controlApi.revokeEmergency(item.id,item.version,form.environment)
      if(!outcome.ok){setMessage(outcome.message||'Emergency control revoke failed.');return}
      setMessage('Emergency control revoked and runtime configuration republished.')
      onRefresh()
    }finally{setBusy(null)}
  }

  return <section className="control-page" aria-busy={loading?'true':undefined}>
    <header className="control-page-head">
      <div>
        <span>PLATFORM CONTROL CENTER</span>
        <h1>Emergency</h1>
        <p>Time-bounded feature freeze, admission suspension and read-only controls. Tenant isolation, audit, secrets and durable safety controls remain locked.</p>
      </div>
      <button type="button" onClick={onRefresh} disabled={loading}>{loading?'Refreshing…':'Refresh observed state'}</button>
    </header>

    {message&&<div className="control-state control-state-warning" role="status"><strong>Emergency workflow</strong><p>{message}</p></div>}

    {snapshot&&<div className="control-runtime-summary">
      <strong>Latest signed runtime snapshot</strong>
      <span>Version {String(snapshot.version??'—')}</span>
      <span>Lease expires {snapshot.leaseExpiresAt?new Date(String(snapshot.leaseExpiresAt)).toLocaleString():'—'}</span>
    </div>}

    {canEmergency(role)&&<form className="control-change-form" onSubmit={event=>void submit(event)}>
      <h2>Activate temporary emergency control</h2>
      <div className="control-form-grid">
        <label>Environment
          <select value={form.environment} onChange={event=>setForm({...form,environment:event.target.value})}>
            <option value="development">Development</option>
            <option value="test">Test</option>
            <option value="staging">Staging</option>
            <option value="production">Production</option>
            <option value="recovery">Recovery</option>
          </select>
        </label>
        <label>Scope
          <select value={form.scopeType} onChange={event=>setForm({...form,scopeType:event.target.value as EmergencyControlRequest['scopeType']})}>
            <option value="platform">Platform</option>
            <option value="region">Region</option>
            <option value="cell">Cell</option>
            <option value="tenant">Tenant</option>
            <option value="workspace">Workspace</option>
            <option value="service">Service</option>
            <option value="feature">Feature</option>
          </select>
        </label>
        <label>Scope ID
          <input value={form.scopeId||''} onChange={event=>setForm({...form,scopeId:event.target.value})} placeholder="Required for non-platform scopes"/>
        </label>
        <label>Control
          <select value={form.controlType} onChange={event=>setForm({...form,controlType:event.target.value as EmergencyControlRequest['controlType']})}>
            <option value="stop_uploads">Stop new uploads</option>
            <option value="pause_integrations">Pause outbound integrations</option>
            <option value="suspend_ai">Suspend AI admission</option>
            <option value="disable_signup">Disable signup</option>
            <option value="read_only">Read-only mode</option>
          </select>
        </label>
        <label>Duration
          <select value={form.durationMinutes} onChange={event=>setForm({...form,durationMinutes:Number(event.target.value)})}>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={120}>2 hours</option>
            <option value={240}>4 hours</option>
          </select>
        </label>
        <label className="control-form-wide">Reason
          <textarea rows={3} required value={form.reason} onChange={event=>setForm({...form,reason:event.target.value})} placeholder="Incident, risk or containment reason"/>
        </label>
      </div>
      <button type="submit" disabled={busy!==null}>{busy==='create'?'Activating…':'Activate emergency control'}</button>
    </form>}

    <div className="control-change-board">
      {items.length===0&&!loading&&<div className="control-state"><strong>No emergency controls</strong><p>No scoped emergency control has been recorded.</p></div>}
      {items.map(item=><article className="control-change-card" key={item.id}>
        <div className="control-change-card-head">
          <div><strong>{item.control_type.replaceAll('_',' ')}</strong><small>{item.scope_type}{item.scope_id?' · '+item.scope_id:''}</small></div>
          <span className="control-change-state">{item.state}</span>
        </div>
        <p>{item.reason}</p>
        <dl>
          <div><dt>Created by</dt><dd>{item.created_by}</dd></div>
          <div><dt>Expires</dt><dd>{new Date(item.expires_at).toLocaleString()}</dd></div>
          <div><dt>Version</dt><dd>{item.version}</dd></div>
        </dl>
        {item.state==='active'&&canEmergency(role)&&<div className="control-change-actions">
          <button type="button" disabled={busy!==null} onClick={()=>void revoke(item)}>{busy===item.id?'Revoking…':'Revoke control'}</button>
        </div>}
      </article>)}
    </div>

    <aside className="control-integrity-note">
      <strong>Fail-safe boundary</strong>
      <p>Emergency controls are temporary operational restrictions. They cannot disable authentication, authorization, tenant isolation, audit, secret protection, migrations or backups, and they do not delete infrastructure.</p>
    </aside>
  </section>
}
