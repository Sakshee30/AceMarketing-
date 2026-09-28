import type {ControlReadResult} from '../lib/control-api'

export function ControlReadOnlyPage({title,responsibility,result,loading,onRefresh}:{title:string;responsibility:string;result:ControlReadResult|null;loading:boolean;onRefresh:()=>void}){
  return <section className="control-page" aria-busy={loading?'true':undefined}>
    <header className="control-page-head">
      <div><span>PLATFORM CONTROL CENTER</span><h1>{title}</h1><p>{responsibility}</p></div>
      <button type="button" onClick={onRefresh} disabled={loading}>{loading?'Refreshing…':'Refresh observed state'}</button>
    </header>
    {loading&&!result&&<div className="control-state"><strong>Loading observed state…</strong><p>No desired-state change is performed by this page.</p></div>}
    {result?.status==='forbidden'&&<div className="control-state control-state-warning" role="alert"><strong>Access denied</strong><p>{result.message}</p><small>Customer workspace credentials are intentionally not reused for this application.</small></div>}
    {result?.status==='unavailable'&&<div className="control-state control-state-warning" role="status"><strong>Control plane unavailable</strong><p>{result.message}</p><small>Healthy customer data-plane traffic must not depend on this read succeeding.</small></div>}
    {result?.status==='ready'&&<div className="control-state control-state-ready"><strong>Observed state</strong><small>Observed {new Date(result.observedAt).toLocaleString()}</small><pre>{JSON.stringify(result.data||{},null,2)}</pre></div>}
    <aside className="control-integrity-note"><strong>Read-only frontend phase</strong><p>Write controls remain intentionally absent until backend authorization, impact analysis, approval, orchestration, idempotency, verification and recovery contracts exist.</p></aside>
  </section>
}
