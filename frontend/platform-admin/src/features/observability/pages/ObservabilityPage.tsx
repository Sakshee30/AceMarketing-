import {useMemo} from 'react'
import type {ControlReadResult} from '../../../lib/control-api'

type ProviderSignal={
  provider:string
  circuit?:{state?:string;failures?:number;failureThreshold?:number;retryAfterMs?:number}
  bulkhead?:{active?:number;limit?:number;available?:number}
}

export default function ObservabilityPage({result,loading,onRefresh}:{result:ControlReadResult|null;loading:boolean;onRefresh:()=>void}){
  const data=result?.data||{}
  const providers=useMemo(()=>Array.isArray(data.providerExecution)?data.providerExecution as ProviderSignal[]:[],[data.providerExecution])
  const admission=(data.apiAdmission||{}) as Record<string,unknown>
  const database=(data.database||{}) as Record<string,unknown>
  const recovery=(data.recovery||{}) as Record<string,unknown>
  return <section className="control-page" aria-busy={loading?'true':undefined}>
    <header className="control-page-head">
      <div><span>PLATFORM CONTROL CENTER</span><h1>Observability</h1><p>Release/config correlation, API admission saturation, database health, provider circuits and recovery evidence.</p></div>
      <button type="button" onClick={onRefresh} disabled={loading}>{loading?'Refreshing…':'Refresh observed state'}</button>
    </header>

    <div className="control-feature-grid">
      <article className="control-feature-card">
        <div className="control-feature-card-head"><div><strong>Release</strong><small>{String(data.releaseSha||'unknown')}</small></div><span className="control-change-state">{String(data.configVersion||'unversioned')}</span></div>
        <p>Operational signals are correlated to the active artifact and runtime configuration version.</p>
      </article>
      <article className="control-feature-card">
        <div className="control-feature-card-head"><div><strong>API admission</strong><small>Bounded in-flight work</small></div><span className="control-change-state">{String(admission.active??0)} / {String(admission.limit??'—')}</span></div>
        <p>{String(admission.available??'—')} request slots currently available.</p>
      </article>
      <article className="control-feature-card">
        <div className="control-feature-card-head"><div><strong>Database</strong><small>Authoritative persistence</small></div><span className="control-change-state">{String(database.status||'unknown')}</span></div>
        <p>Observed latency {String(database.latencyMs??'—')} ms. Embedded mode: {String(Boolean(database.embedded))}.</p>
      </article>
      <article className="control-feature-card">
        <div className="control-feature-card-head"><div><strong>Recovery evidence</strong><small>Backup & DR exercises</small></div><span className="control-change-state">{String(recovery.passed??0)} passed</span></div>
        <p>{String(recovery.exercises??0)} exercises · {String(recovery.failed??0)} failed/manual-recovery · {String(recovery.backupRecords??0)} backup evidence records.</p>
      </article>
    </div>

    <div className="control-change-board">
      {providers.length===0&&<div className="control-state"><strong>No external provider executions observed</strong><p>Provider circuit/bulkhead state appears after guarded provider calls occur in this runtime.</p></div>}
      {providers.map(item=><article className="control-change-card" key={item.provider}>
        <div className="control-change-card-head">
          <div><strong>{item.provider}</strong><small>External dependency protection</small></div>
          <span className="control-change-state">{item.circuit?.state||'unknown'}</span>
        </div>
        <dl>
          <div><dt>Circuit failures</dt><dd>{item.circuit?.failures??0} / {item.circuit?.failureThreshold??'—'}</dd></div>
          <div><dt>Bulkhead</dt><dd>{item.bulkhead?.active??0} / {item.bulkhead?.limit??'—'} active</dd></div>
          <div><dt>Available</dt><dd>{item.bulkhead?.available??'—'}</dd></div>
        </dl>
      </article>)}
    </div>

    <aside className="control-integrity-note"><strong>Operational evidence</strong><p>Healthy status is not a capacity certification. Release qualification still requires load, chaos, failover, restore and alert-path evidence from the target deployment profile.</p></aside>
  </section>
}
