import {FormEvent,useMemo,useState} from 'react'
import {controlApi,type ControlReadResult,type PlatformChangeRequest} from '../../../lib/control-api'

type ChangeItem={
  id:string
  environment:string
  scope_type:string
  scope_id?:string|null
  reason:string
  ticket?:string|null
  risk:string
  state:string
  requested_by:string
  updated_at:string
}

const nextState:Record<string,string|undefined>={
  draft:'validating',
  validating:'impact_analysis',
  impact_analysis:'waiting_approval',
  approved:'deploying',
  provisioning:'deploying',
  deploying:'verifying',
  verifying:'stabilizing',
  stabilizing:'completed',
  rollback_requested:'rolling_back',
  rolling_back:'rolled_back'
}

const canApprove=(role?:string)=>['platform_admin','approver','security_admin'].includes(role||'')
const canRequest=(role?:string)=>['platform_admin','operator','developer','infrastructure_engineer'].includes(role||'')
const canTransition=(role?:string)=>['platform_admin','operator','infrastructure_engineer'].includes(role||'')

export default function ChangesPage({
  result,loading,onRefresh,role
}:{
  result:ControlReadResult|null
  loading:boolean
  onRefresh:()=>void
  role?:string
}){
  const [form,setForm]=useState<PlatformChangeRequest>({
    environment:'staging',
    scopeType:'feature',
    scopeId:'',
    reason:'',
    ticket:'',
    risk:'medium',
    desiredState:{}
  })
  const [busy,setBusy]=useState<string|null>(null)
  const [message,setMessage]=useState('')
  const items=useMemo(()=>{
    const raw=result?.data?.items
    return Array.isArray(raw)?raw as ChangeItem[]:[]
  },[result])

  const submit=async(event:FormEvent)=>{
    event.preventDefault()
    setBusy('create')
    setMessage('')
    try{
      const outcome=await controlApi.createChange(form)
      if(!outcome.ok){setMessage(outcome.message||'Change request failed.');return}
      setMessage('Change request created in draft state.')
      setForm(current=>({...current,scopeId:'',reason:'',ticket:''}))
      onRefresh()
    }finally{setBusy(null)}
  }

  const transition=async(id:string,toState:string)=>{
    setBusy(id+':'+toState)
    setMessage('')
    try{
      const outcome=await controlApi.transitionChange(id,toState)
      if(!outcome.ok){setMessage(outcome.message||'Change transition failed.');return}
      onRefresh()
    }finally{setBusy(null)}
  }

  const decide=async(id:string,decision:'approved'|'rejected')=>{
    setBusy(id+':'+decision)
    setMessage('')
    try{
      const outcome=await controlApi.decideChange(id,decision)
      if(!outcome.ok){setMessage(outcome.message||'Change decision failed.');return}
      onRefresh()
    }finally{setBusy(null)}
  }

  const rollback=async(id:string)=>{
    const reason=window.prompt('Reason for rollback request?')
    if(!reason)return
    setBusy(id+':rollback')
    setMessage('')
    try{
      const outcome=await controlApi.requestRollback(id,reason)
      if(!outcome.ok){setMessage(outcome.message||'Rollback request failed.');return}
      onRefresh()
    }finally{setBusy(null)}
  }

  return <section className="control-page" aria-busy={loading?'true':undefined}>
    <header className="control-page-head">
      <div>
        <span>PLATFORM CONTROL CENTER</span>
        <h1>Changes</h1>
        <p>Governed operational requests, validation, approvals, execution, verification and rollback.</p>
      </div>
      <button type="button" onClick={onRefresh} disabled={loading}>{loading?'Refreshing…':'Refresh observed state'}</button>
    </header>

    {message&&<div className="control-state control-state-warning" role="status"><strong>Change workflow</strong><p>{message}</p></div>}

    {canRequest(role)&&<form className="control-change-form" onSubmit={event=>void submit(event)}>
      <h2>Request operational change</h2>
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
        <label>Scope type
          <select value={form.scopeType} onChange={event=>setForm({...form,scopeType:event.target.value})}>
            <option value="feature">Feature</option>
            <option value="provider">Provider</option>
            <option value="service">Service</option>
            <option value="cell">Cell</option>
            <option value="workspace">Workspace</option>
            <option value="platform">Platform</option>
          </select>
        </label>
        <label>Scope ID
          <input value={form.scopeId||''} onChange={event=>setForm({...form,scopeId:event.target.value})} placeholder="e.g. ai, email, cell-a"/>
        </label>
        <label>Risk
          <select value={form.risk} onChange={event=>setForm({...form,risk:event.target.value as PlatformChangeRequest['risk']})}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label>Ticket
          <input value={form.ticket||''} onChange={event=>setForm({...form,ticket:event.target.value})} placeholder="Optional change/ticket reference"/>
        </label>
        <label className="control-form-wide">Reason
          <textarea value={form.reason} onChange={event=>setForm({...form,reason:event.target.value})} required rows={3} placeholder="Why is this change required?"/>
        </label>
      </div>
      <button type="submit" disabled={busy==='create'}>{busy==='create'?'Creating…':'Create draft change'}</button>
    </form>}

    <div className="control-change-board" aria-label="Operational change board">
      {items.length===0&&!loading&&<div className="control-state"><strong>No operational changes</strong><p>No durable platform change requests are currently recorded.</p></div>}
      {items.map(item=>{
        const next=nextState[item.state]
        const approval=item.state==='waiting_approval'
        const rollbackAllowed=['approved','provisioning','deploying','verifying','stabilizing','failed'].includes(item.state)
        return <article className="control-change-card" key={item.id}>
          <div className="control-change-card-head">
            <div><strong>{item.scope_type}{item.scope_id?' · '+item.scope_id:''}</strong><small>{item.environment} · {item.risk} risk</small></div>
            <span className="control-change-state">{item.state.replaceAll('_',' ')}</span>
          </div>
          <p>{item.reason}</p>
          <dl>
            <div><dt>Requester</dt><dd>{item.requested_by}</dd></div>
            <div><dt>Ticket</dt><dd>{item.ticket||'—'}</dd></div>
            <div><dt>Updated</dt><dd>{new Date(item.updated_at).toLocaleString()}</dd></div>
          </dl>
          <div className="control-change-actions">
            {next&&canTransition(role)&&<button type="button" disabled={busy!==null} onClick={()=>void transition(item.id,next)}>Advance to {next.replaceAll('_',' ')}</button>}
            {approval&&canApprove(role)&&<>
              <button type="button" disabled={busy!==null} onClick={()=>void decide(item.id,'approved')}>Approve</button>
              <button type="button" disabled={busy!==null} onClick={()=>void decide(item.id,'rejected')}>Reject</button>
            </>}
            {rollbackAllowed&&canTransition(role)&&<button type="button" disabled={busy!==null} onClick={()=>void rollback(item.id)}>Request rollback</button>}
          </div>
        </article>
      })}
    </div>

    <aside className="control-integrity-note">
      <strong>Authoritative workflow</strong>
      <p>Board actions request backend state transitions. The UI cannot drag or click a change directly into “completed”; verification and approved-plan checks are enforced by the control service.</p>
    </aside>
  </section>
}
