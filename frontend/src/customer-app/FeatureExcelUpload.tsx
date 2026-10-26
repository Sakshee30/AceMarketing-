import {useEffect,useRef,useState} from 'react'
import {RefreshCw,UploadCloud} from 'lucide-react'
import {api} from '../lib/api'

const suppliedFeatureIds:Record<string,string>={'POS & Stores':'pos-stores'}
const featureId=(feature:string)=>suppliedFeatureIds[feature]||feature.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
const read=(row:any,...keys:string[])=>{const key=Object.keys(row||{}).find(column=>keys.includes(column.toLowerCase()));return key?String(row[key]??'—'):'—'}
function FeatureFixtureOutput({feature,fixture}:{feature:string;fixture:any}){
 const rows=fixture.records||[],crm=['Enrich','Customer 360','Lead Grading','Identity'].includes(feature),timeline=['Journeys','Events','Live Sync','Data Flows','Calls','Meetings','Follow-ups'].includes(feature)
 if(crm)return <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10,marginTop:12}}>{rows.slice(0,6).map((row:any,index:number)=><article key={index} style={{padding:12,border:'1px solid #e5e7eb',borderRadius:10,background:'#fff'}}><b>{read(row,'full_name','name','display_name','customer_name')}</b><small style={{display:'block',marginTop:4}}>{read(row,'email','email_address')}</small><div style={{display:'flex',justifyContent:'space-between',gap:8,marginTop:10}}><span>{read(row,'lead_status','status','stage','crm_stage')}</span><span>{read(row,'source','channel')}</span></div><small style={{display:'block',marginTop:8}}>Lead: {read(row,'lead_id','customer_id','external_lead_id')}</small></article>)}</div>
 if(timeline)return <div style={{marginTop:12,borderLeft:'3px solid #7c3aed',paddingLeft:14}}>{rows.slice(0,8).map((row:any,index:number)=><div key={index} style={{padding:'8px 0',borderBottom:'1px solid #eee'}}><b>{read(row,'event','event_name','touch_type','activity','type')}</b><span style={{marginLeft:8}}>{read(row,'date','timestamp','occurred_at','created_date')}</span><small style={{display:'block'}}>{read(row,'customer_id','lead_id','session_id','campaign_id')} · {read(row,'channel','source','status')}</small></div>)}</div>
 return null
}

export default function FeatureExcelUpload({feature,workspaceId}:{feature:string;workspaceId:string}){
 const id=featureId(feature),input=useRef<HTMLInputElement>(null)
 // Fixture rows belong in the feature's own views, never in a generic preview.
 const rendersInFeature=true
 const [fixture,setFixture]=useState<any>(null),[status,setStatus]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const refresh=()=>api.getQaFixture(id).then((result:any)=>{setFixture(result.fixture||null)}).catch((cause:Error)=>setError(cause.message))
 useEffect(()=>{setFixture(null);setStatus('');setError('');void refresh()},[id,workspaceId])
 async function upload(file?:File){
  if(!file)return
  if(!/\.xlsx$/i.test(file.name)){setError('Please choose an .xlsx workbook.');return}
  if(file.size>2_000_000){setError('The workbook must be 2 MB or smaller.');return}
  setBusy(true);setError('');setStatus('')
  try{
   const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.onerror=()=>reject(new Error('The workbook could not be read.'));reader.readAsDataURL(file)})
   const result:any=await api.uploadQaFixture(id,{filename:file.name,base64:data})
   setFixture(result.fixture);setStatus(`${result.applied?.records||result.fixture.recordCount} test row(s) imported into ${result.applied?.target||feature}.`)
   window.dispatchEvent(new CustomEvent('ace-qa-fixture-uploaded',{detail:{feature:id,applied:result.applied}}))
  }catch(cause:any){setError(cause?.message||'Upload failed.')}
  finally{setBusy(false);if(input.current)input.current.value=''}
 }
 return <section className="app-panel" aria-label={`${feature} test data upload`} style={{marginBottom:16,padding:16}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
   <div><strong>Test data for {feature}</strong><p style={{margin:'4px 0 0'}}>Upload this feature’s dummy Excel workbook to validate its data and preview the saved rows.</p></div>
   <input ref={input} type="file" accept=".xlsx" aria-label={`Choose ${feature} Excel workbook`} style={{display:'none'}} onChange={event=>void upload(event.target.files?.[0])}/>
   <button type="button" className="app-primary" onClick={()=>input.current?.click()} disabled={busy}><UploadCloud size={16}/>{busy?'Uploading…':'Upload test Excel'}</button>
  </div>
  {error&&<p role="alert" style={{color:'var(--danger,#b42318)'}}>{error}</p>}
  {status&&<p role="status">{status}</p>}
  {fixture&&!rendersInFeature&&<div style={{marginTop:12}}>
   <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}><span><b>{fixture.filename}</b></span><span>{fixture.recordCount} rows</span><button type="button" onClick={refresh}><RefreshCw size={14}/> Refresh</button></div>
   {fixture.result&&<div role="status" style={{marginTop:10,padding:12,borderRadius:8,background:fixture.result.status==='passed'?'#ecfdf3':'#fffaeb'}}><b>Test result: {fixture.result.status==='passed'?'Passed':'Passed with warnings'}</b><div style={{display:'flex',gap:16,flexWrap:'wrap',marginTop:6}}><span>Valid rows: {fixture.result.validRows}</span><span>Columns: {fixture.result.columns}</span><span>Empty cells: {fixture.result.emptyCells}</span></div>{fixture.result.numeric?.length>0&&<div style={{marginTop:8}}><b>Calculated numeric output</b>{fixture.result.numeric.map((item:any)=><div key={item.column}>{item.column}: total {item.total} · average {item.average} ({item.count} values)</div>)}</div>}</div>}
   <FeatureFixtureOutput feature={feature} fixture={fixture}/>
   <div style={{overflowX:'auto',maxHeight:220,marginTop:8}}><table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}><thead><tr>{fixture.columns.map((column:string)=><th key={column} style={{textAlign:'left',padding:6}}>{column}</th>)}</tr></thead><tbody>{fixture.records.slice(0,5).map((row:any,index:number)=><tr key={index}>{fixture.columns.map((column:string)=><td key={column} style={{padding:6,borderTop:'1px solid #ddd'}}>{String(row[column]??'')}</td>)}</tr>)}</tbody></table></div>
  </div>}
 </section>
}
