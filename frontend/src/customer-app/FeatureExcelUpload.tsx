import {useEffect,useRef,useState} from 'react'
import {UploadCloud,RefreshCw} from 'lucide-react'
import {api} from '../../lib/api'

const featureIds:Record<string,string>={
 'Overview':'overview','Launchpad':'launchpad','AdSync':'adsync','ChatGPT Ads':'chatgpt-ads','Funnel':'funnel',
 'Leak Monitor':'leak-monitor','Events':'events','Adjustments':'adjustments','Diagnostics':'diagnostics',
 'Match Quality':'match-quality','Reconciliation':'reconciliation','Fraud':'fraud','Deep Links':'deep-links',
 'Sites':'sites','Fingerprinting':'fingerprinting','Live Sync':'live-sync','Data Hub':'data-hub',
 'Customer 360':'customer-360','Offline Attribution':'offline-attribution','Matchback':'matchback','POS & Stores':'pos-stores',
 'Journeys':'journeys','Identity':'identity','Models':'models','AI Intelligence':'intelligence',
 'Attribution':'attribution','Planner':'planner','Reports':'reports','Grouped Performance':'grouped-performance',
 'Executive Briefs':'executive-briefs','Enrich':'enrich','Lead Grading':'lead-grading','Behavior':'behavior',
 'Feed':'feed','Agents':'agents','Routing':'routing','Follow-ups':'follow-ups','Calls':'calls','Meetings':'meetings',
 'Feedback':'feedback','Approvals':'approvals','Ask Ace':'ask-ace','Integrations':'integrations',
 'Data Flows':'data-flows','Real-Time Activation':'real-time-activation','Personalization':'personalization',
 'Exclusions':'exclusions','Audiences':'audiences','Delivery':'delivery','Monitoring':'monitoring',
 'Alerts':'alerts','Compliance':'compliance','Developers':'developers','Settings':'settings'
}

export default function FeatureExcelUpload({feature,workspaceId}:{feature:string;workspaceId:string}){
 const id=featureIds[feature]
 const input=useRef<HTMLInputElement>(null)
 const [status,setStatus]=useState('')
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const [fixture,setFixture]=useState<any>(null)
 useEffect(()=>{
  let mounted=true
  setFixture(null);setError('');setStatus('')
  if(id)api.getQaFixture(id).then((v:any)=>{if(mounted)setFixture(v.fixture)}).catch((e:Error)=>{if(mounted)setError('Unable to read QA fixtures: '+e.message)})
  return()=>{mounted=false}
 },[id,workspaceId])
 if(!id)return null
 async function onFile(file?:File){
  if(!file)return
  setError('');setStatus('')
  const expected=id.replace(/-/g,'_')+'.xlsx'
  if(!file.name.toLowerCase().endsWith('_'+expected)&&file.name.toLowerCase()!==expected){
   setError('Select the workbook for this feature (filename ending '+expected+').');return
  }
  if(file.size>2_000_000){setError('Maximum XLSX size is 2 MB');return}
  setBusy(true)
  try{
   const dataUrl:string=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('File read failed'));reader.readAsDataURL(file)})
   const base64=dataUrl.split(',')[1]
   const response:any=await api.uploadQaFixture(id,{filename:file.name,base64})
   setFixture(response.fixture)
   setStatus('QA fixture persisted for '+feature+'. Operational campaign and customer data has NOT been changed.')
  }catch(e:any){setError(e?.message||'Upload failed')}
  finally{setBusy(false);if(input.current)input.current.value=''}
 }
 return <section className="app-panel" aria-label={feature+' QA Excel upload'} style={{marginBottom:16,padding:16}}>
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
   <div><strong>Test Data · {feature}</strong><p style={{margin:'4px 0',fontSize:13}}>Upload the matching synthetic Excel workbook for backend-persisted QA preview.</p></div>
   <input ref={input} type="file" accept=".xlsx" aria-label={'Choose '+feature+' Excel test data'} style={{display:'none'}} onChange={e=>void onFile(e.target.files?.[0])}/>
   <button className="app-primary" type="button" disabled={busy} onClick={()=>input.current?.click()}><UploadCloud size={16}/>{busy?'Uploading…':'Upload Test Excel'}</button>
  </div>
  {error&&<p role="alert" style={{color:'var(--danger,#b42318)'}}>{error}</p>}
  {status&&<p role="status">{status}</p>}
  {fixture&&<div style={{marginTop:8}}>
   <div style={{display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}><span>Saved: <b>{fixture.filename}</b></span><span>Rows: <b>{fixture.recordCount}</b></span><span>At: {new Date(fixture.uploadedAt).toLocaleString()}</span><button type="button" onClick={()=>void api.getQaFixture(id).then((v:any)=>{setFixture(v.fixture);setStatus('Refreshed from backend')}).catch((e:Error)=>setError(e.message))}><RefreshCw size={14}/> Refresh QA data</button></div>
   <div style={{overflowX:'auto',maxHeight:230,marginTop:8}}><table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}><thead><tr>{(fixture.columns||[]).map((col:string)=><th key={col} style={{textAlign:'left',padding:6}}>{col}</th>)}</tr></thead><tbody>{(fixture.records||[]).slice(0,5).map((row:any,i:number)=><tr key={i}>{(fixture.columns||[]).map((col:string)=><td key={col} style={{padding:6,borderTop:'1px solid #ddd'}}>{String(row[col]??'')}</td>)}</tr>)}</tbody></table></div>
   <small>Showing up to 5 QA rows. This preview does not claim the feature's operational backend has consumed them.</small>
  </div>}
 </section>
}
