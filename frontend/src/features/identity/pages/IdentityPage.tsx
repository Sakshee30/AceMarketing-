import {useEffect,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,MousePointer2,Target,UsersRound} from 'lucide-react'
import {identityApi} from '../data/identity.api'
import {ErrorState,LoadingState} from '../../../components/system/FrontendStates'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}>{action}</button>}</div>}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}

export default function IdentityPage(){
 const [data,setData]=useState<any>({recent:[],rules:[],identifiers:[],clickCoverage:{}})
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')

 const load=async()=>{
  setLoading(true)
  setError('')
  try{
   const r:any=await identityApi.load()
   setData(r)
  }catch(e:any){
   setError(e?.message||'Identity resolution could not be loaded. Existing identity evidence was preserved.')
  }finally{setLoading(false)}
 }

 useEffect(()=>{void load()},[])
 useDevelopmentLiveRefresh(()=>load())

 const recent=(data.recent||[]).slice(0,100)
 const exportQueue=()=>{
  const csv=['customer_id,name,identifiers,touchpoints,confidence',...recent.map((x:any)=>[x.id,x.name,x.identifierCount,x.touchpoints,x.confidence].map((v:any)=>'"'+String(v??'').replaceAll('"','""')+'"').join(','))].join('\n')
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
  const a=document.createElement('a')
  a.href=url
  a.download='ace-identity-review.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
 }

 const sample=recent[0]
 const clickTotal=Number(data.clickCoverage?.gclid||0)+Number(data.clickCoverage?.fbclid||0)+Number(data.clickCoverage?.braid||0)
 const openFingerprinting=()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Fingerprinting'}))

 return <>
  <PageHead crumb="Data / Identity" title="Identity resolution" sub="Unify click IDs, first-party identifiers, devices and CRM records into a customer-level graph." action="Review match rules" onAction={openFingerprinting}/>

  {loading&&!data.available&&!recent.length&&<LoadingState title="Loading identity resolution" description="Reading persisted customer, device, click-ID and CRM identity evidence."/>}
  {error&&<ErrorState title="Identity refresh failed" description={error} action={{label:'Retry identity',onClick:load}}/>}

  <div className="stats-grid">
   <Stat label="Known identities" value={data.available?Number(data.profiles||0).toLocaleString('en-IN'):'—'} sub="Persisted customer / lead profiles" Icon={UsersRound}/>
   <Stat label="Stitched profiles" value={data.available?Number(data.stitchedProfiles||0).toLocaleString('en-IN'):'—'} sub="Two or more first-party identifiers" Icon={Target}/>
   <Stat label="Deterministic coverage" value={data.deterministicMatchRate==null?'—':data.deterministicMatchRate+'%'} sub="Multi-key profile coverage" Icon={MousePointer2}/>
   <Stat label="Click IDs attached" value={clickTotal?String(clickTotal):'—'} sub="GCLID / FBCLID / braid evidence" Icon={Activity}/>
  </div>

  <div className="two-col">
   <div className="app-panel">
    <div className="panel-head"><div><h3>Identity graph</h3><p>{sample?'Latest persisted profile':'No persisted profile yet'}</p></div><span className={sample?'healthy':'status'}>{sample?'Resolved profile':'Waiting for data'}</span></div>
    {sample?<div className="identity-graph"><div className="identity-core"><span>{String(sample.name||'?').split(' ').map((x:string)=>x[0]).join('').slice(0,2)}</span><b>{sample.name}</b><small>{sample.id}</small></div>{Object.entries(sample.identifiers||{}).filter(([,v])=>v).slice(0,12).map(([key],i)=><div className={'identity-node n'+(i%6)} key={key}><span>{key}</span><b>Present</b></div>)}</div>:<div className="empty-delivery-state"><UsersRound/><div><b>No identity graph yet</b><small>Track or import a customer/contact/device identity to create the first profile.</small></div></div>}
   </div>

   <div className="app-panel">
    <div className="panel-head"><div><h3>Match rules</h3><p>Deterministic first, supporting keys second</p></div></div>
    {(data.rules||[]).length?(data.rules||[]).map((x:any)=><div className="identity-rule" key={x.key}><span>{x.key}</span><b>{x.mode}</b><strong>Priority {x.priority}</strong></div>):<div className="empty-delivery-state"><Target/><div><b>No match rules reported</b><small>The frontend will not invent identity matching priorities when the backend provides none.</small></div></div>}
   </div>
  </div>

  <div className="app-panel" aria-busy={loading?'true':undefined}>
   <div className="panel-head"><div><h3>Recent resolved identities</h3><p>{(data.identifiers||[]).length?(data.identifiers||[]).join(' · '):'No identifier types observed yet'}{(data.recent||[]).length>100?' · newest 100 rendered':''}</p></div><div className="approval-actions"><button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh'}</button><button onClick={exportQueue} disabled={!recent.length}>Export review queue</button></div></div>
   {recent.length?recent.map((x:any)=><div className="identity-row" key={x.id}><UsersRound/><div><b>{x.name}</b><small>{x.id}</small></div><span>{x.identifierCount} identifiers</span><span>{x.touchpoints} touchpoints</span><em>{x.confidence}</em></div>):!loading&&<div className="empty-delivery-state"><UsersRound/><div><b>No resolved identities yet</b></div></div>}
  </div>
 </>
}
