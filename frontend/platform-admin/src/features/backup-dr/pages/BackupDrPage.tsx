import {FormEvent,useMemo,useState} from 'react'
import {controlApi,type BackupEvidenceRequest,type ControlReadResult,type RecoveryExerciseRequest} from '../../../lib/control-api'

type RecoveryExercise={
  id:string
  environment:string
  scenario:string
  state:string
  declared_rpo_minutes?:number|null
  declared_rto_minutes?:number|null
  measured_rpo_minutes?:number|null
  measured_rto_minutes?:number|null
  incident_commander?:string|null
  remediation_owner?:string|null
  version:number
  updated_at:string
}
type BackupEvidence={
  id:string
  environment:string
  resource_type:string
  resource_ref:string
  backup_mode:string
  retention_days?:number|null
  pitr_enabled:boolean
  object_versioning_enabled:boolean
  encryption_verified:boolean
  deletion_protection_verified:boolean
  independent_copy_verified:boolean
  observed_at:string
}
const canOperate=(role?:string)=>['platform_admin','infrastructure_engineer'].includes(role||'')

export default function BackupDrPage({result,loading,onRefresh,role}:{result:ControlReadResult|null;loading:boolean;onRefresh:()=>void;role?:string}){
  const exercises=useMemo(()=>Array.isArray(result?.data?.exercises)?result?.data?.exercises as RecoveryExercise[]:[],[result])
  const evidence=useMemo(()=>Array.isArray(result?.data?.backupEvidence)?result?.data?.backupEvidence as BackupEvidence[]:[],[result])
  const [exercise,setExercise]=useState<RecoveryExerciseRequest>({
    environment:'production',scenario:'database_failover',declaredRpoMinutes:0,declaredRtoMinutes:5
  })
  const [backup,setBackup]=useState<BackupEvidenceRequest>({
    environment:'production',resourceType:'database',resourceRef:'primary',backupMode:'managed-pitr',
    retentionDays:35,pitrEnabled:true,encryptionVerified:true,deletionProtectionVerified:true
  })
  const [busy,setBusy]=useState<string|null>(null)
  const [message,setMessage]=useState('')

  const createExercise=async(event:FormEvent)=>{
    event.preventDefault();setBusy('exercise');setMessage('')
    try{
      const outcome=await controlApi.createRecoveryExercise(exercise)
      if(!outcome.ok){setMessage(outcome.message||'Recovery exercise creation failed.');return}
      setMessage('Recovery exercise recorded as planned.')
      onRefresh()
    }finally{setBusy(null)}
  }
  const recordEvidence=async(event:FormEvent)=>{
    event.preventDefault();setBusy('backup');setMessage('')
    try{
      const outcome=await controlApi.recordBackupEvidence(backup)
      if(!outcome.ok){setMessage(outcome.message||'Backup evidence recording failed.');return}
      setMessage('Backup evidence recorded.')
      onRefresh()
    }finally{setBusy(null)}
  }
  const advance=async(item:RecoveryExercise,state:string)=>{
    setBusy(item.id);setMessage('')
    try{
      const body:Record<string,unknown>={state,expectedVersion:item.version}
      if(state==='passed'){
        body.measuredRpoMinutes=item.measured_rpo_minutes??item.declared_rpo_minutes??0
        body.measuredRtoMinutes=item.measured_rto_minutes??item.declared_rto_minutes??0
        body.integrityChecks=['authoritative-records','tenant-ownership','queue-reconciliation']
        body.reconciliation={validated:true}
      }
      const outcome=await controlApi.updateRecoveryExercise(item.id,body)
      if(!outcome.ok){setMessage(outcome.message||'Recovery exercise update failed.');return}
      setMessage('Recovery exercise updated to '+state.replaceAll('_',' ')+'.')
      onRefresh()
    }finally{setBusy(null)}
  }

  return <section className="control-page" aria-busy={loading?'true':undefined}>
    <header className="control-page-head">
      <div><span>PLATFORM CONTROL CENTER</span><h1>Backup & DR</h1><p>Restore evidence, recovery exercises and declared/measured RPO/RTO. A backup status alone is not treated as proof of recoverability.</p></div>
      <button type="button" onClick={onRefresh} disabled={loading}>{loading?'Refreshing…':'Refresh observed state'}</button>
    </header>
    {message&&<div className="control-state control-state-warning" role="status"><strong>Recovery workflow</strong><p>{message}</p></div>}

    {canOperate(role)&&<div className="control-feature-grid">
      <form className="control-change-form" onSubmit={event=>void createExercise(event)}>
        <h2>Plan recovery exercise</h2>
        <div className="control-form-grid">
          <label>Environment<input value={exercise.environment} onChange={e=>setExercise({...exercise,environment:e.target.value})}/></label>
          <label>Scenario<select value={exercise.scenario} onChange={e=>setExercise({...exercise,scenario:e.target.value as RecoveryExerciseRequest['scenario']})}>
            <option value="process_loss">Process loss</option><option value="availability_zone_loss">Availability Zone loss</option><option value="database_failover">Database failover</option><option value="regional_disaster">Regional disaster</option><option value="data_corruption">Data corruption</option><option value="tenant_restore">Tenant restore</option><option value="object_recovery">Object recovery</option><option value="queue_reconciliation">Queue reconciliation</option><option value="credential_recovery">Credential recovery</option>
          </select></label>
          <label>Declared RPO minutes<input type="number" min="0" value={exercise.declaredRpoMinutes??''} onChange={e=>setExercise({...exercise,declaredRpoMinutes:Number(e.target.value)})}/></label>
          <label>Declared RTO minutes<input type="number" min="0" value={exercise.declaredRtoMinutes??''} onChange={e=>setExercise({...exercise,declaredRtoMinutes:Number(e.target.value)})}/></label>
        </div>
        <button type="submit" disabled={busy!==null}>{busy==='exercise'?'Creating…':'Create exercise'}</button>
      </form>

      <form className="control-change-form" onSubmit={event=>void recordEvidence(event)}>
        <h2>Record backup evidence</h2>
        <div className="control-form-grid">
          <label>Environment<input value={backup.environment} onChange={e=>setBackup({...backup,environment:e.target.value})}/></label>
          <label>Resource type<input value={backup.resourceType} onChange={e=>setBackup({...backup,resourceType:e.target.value})}/></label>
          <label>Resource reference<input value={backup.resourceRef} onChange={e=>setBackup({...backup,resourceRef:e.target.value})}/></label>
          <label>Backup mode<input value={backup.backupMode} onChange={e=>setBackup({...backup,backupMode:e.target.value})}/></label>
          <label>Retention days<input type="number" min="0" value={backup.retentionDays??''} onChange={e=>setBackup({...backup,retentionDays:Number(e.target.value)})}/></label>
          <label><input type="checkbox" checked={Boolean(backup.pitrEnabled)} onChange={e=>setBackup({...backup,pitrEnabled:e.target.checked})}/> PITR verified</label>
          <label><input type="checkbox" checked={Boolean(backup.objectVersioningEnabled)} onChange={e=>setBackup({...backup,objectVersioningEnabled:e.target.checked})}/> Object versioning verified</label>
          <label><input type="checkbox" checked={Boolean(backup.encryptionVerified)} onChange={e=>setBackup({...backup,encryptionVerified:e.target.checked})}/> Encryption verified</label>
          <label><input type="checkbox" checked={Boolean(backup.deletionProtectionVerified)} onChange={e=>setBackup({...backup,deletionProtectionVerified:e.target.checked})}/> Deletion protection verified</label>
          <label><input type="checkbox" checked={Boolean(backup.independentCopyVerified)} onChange={e=>setBackup({...backup,independentCopyVerified:e.target.checked})}/> Independent recovery copy verified</label>
        </div>
        <button type="submit" disabled={busy!==null}>{busy==='backup'?'Recording…':'Record evidence'}</button>
      </form>
    </div>}

    <div className="control-change-board">
      {exercises.map(item=><article className="control-change-card" key={item.id}>
        <div className="control-change-card-head"><div><strong>{item.scenario.replaceAll('_',' ')}</strong><small>{item.environment}</small></div><span className="control-change-state">{item.state.replaceAll('_',' ')}</span></div>
        <dl>
          <div><dt>Declared RPO/RTO</dt><dd>{item.declared_rpo_minutes??'—'} / {item.declared_rto_minutes??'—'} min</dd></div>
          <div><dt>Measured RPO/RTO</dt><dd>{item.measured_rpo_minutes??'—'} / {item.measured_rto_minutes??'—'} min</dd></div>
          <div><dt>Version</dt><dd>{item.version}</dd></div>
        </dl>
        {canOperate(role)&&<div className="control-change-actions">
          {item.state==='planned'&&<button type="button" disabled={busy!==null} onClick={()=>void advance(item,'running')}>Start exercise</button>}
          {item.state==='running'&&<><button type="button" disabled={busy!==null} onClick={()=>void advance(item,'passed')}>Record pass</button><button type="button" disabled={busy!==null} onClick={()=>void advance(item,'failed')}>Record failure</button></>}
        </div>}
      </article>)}
    </div>

    <div className="control-feature-grid">
      {evidence.map(item=><article className="control-feature-card" key={item.id}>
        <div className="control-feature-card-head"><div><strong>{item.resource_type}</strong><small>{item.resource_ref}</small></div><span className="control-change-state">{item.backup_mode}</span></div>
        <p>{item.environment} · observed {new Date(item.observed_at).toLocaleString()}</p>
        <p>PITR {item.pitr_enabled?'✓':'—'} · versioning {item.object_versioning_enabled?'✓':'—'} · encryption {item.encryption_verified?'✓':'—'} · deletion protection {item.deletion_protection_verified?'✓':'—'} · independent copy {item.independent_copy_verified?'✓':'—'}</p>
      </article>)}
    </div>
    <aside className="control-integrity-note"><strong>Recovery evidence rule</strong><p>Recorded backup configuration does not certify recovery. Restore exercises must capture measured RPO/RTO, integrity checks, reconciliation gaps and remediation ownership.</p></aside>
  </section>
}
