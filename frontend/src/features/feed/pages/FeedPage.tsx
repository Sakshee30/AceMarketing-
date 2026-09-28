import {useEffect,useState} from 'react'
import {Activity,ArrowRight,Cable,CheckCircle2,DatabaseZap,Layers3,Plus,ShieldCheck,X} from 'lucide-react'
import {feedApi} from '../data/feed.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {ErrorState,LoadingState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'

type Notice={kind:'ok'|'error'|'unknown'|'',text:string}

function PageHead({crumb,title,sub,action,onAction,disabled=false}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void,disabled?:boolean}){
  return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" disabled={disabled} onClick={onAction}><Plus/>{action}</button>}</div>
}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){
  return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>
}
const unknownOutcome=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))

export default function FeedPage(){
  const [data,setData]=useState<any>({attributes:[],mappings:[],stats:{},destinations:[]})
  const [schemaOpen,setSchemaOpen]=useState(false)
  const [builder,setBuilder]=useState(false)
  const [mappingOpen,setMappingOpen]=useState(false)
  const [preview,setPreview]=useState<any>(null)
  const [previewOpen,setPreviewOpen]=useState(false)
  const [busy,setBusy]=useState('')
  const [loading,setLoading]=useState(true)
  const [loadError,setLoadError]=useState('')
  const [notice,setNotice]=useState<Notice>({kind:'',text:''})

  useDirtyWork({key:'feed-attribute-draft',label:'Feed attribute draft',dirty:builder,scope:'feature'})
  useDirtyWork({key:'feed-mapping-draft',label:'Feed mapping draft',dirty:mappingOpen,scope:'feature'})

  const load=async()=>{
    if(loading&&((data.attributes||[]).length||(data.mappings||[]).length))return
    setLoading(true)
    setLoadError('')
    try{
      const r:any=await feedApi.load()
      setData(r)
    }catch(error:any){
      setLoadError(error?.message||'Feed evidence could not be refreshed. Existing payload evidence was preserved.')
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{void load()},[])

  const add=async(event:any)=>{
    event.preventDefault()
    const form=new FormData(event.currentTarget)
    setBusy('attribute')
    setNotice({kind:'',text:''})
    try{
      await feedApi.addAttribute({
        key:String(form.get('key')||''),
        source:String(form.get('source')||'custom'),
        sample:String(form.get('sample')||'')
      })
      setBuilder(false)
      setNotice({kind:'ok',text:'Custom feed attribute saved after backend confirmation.'})
      await load()
    }catch(error:any){
      setNotice(unknownOutcome(error)
        ?{kind:'unknown',text:'The attribute-save outcome is unknown. Refresh authoritative feed state before submitting the same attribute again.'}
        :{kind:'error',text:error?.message||'Attribute could not be saved.'})
    }finally{setBusy('')}
  }

  const saveMapping=async(event:any)=>{
    event.preventDefault()
    const form=new FormData(event.currentTarget)
    setBusy('mapping')
    setNotice({kind:'',text:''})
    try{
      await feedApi.saveMapping({
        sourceKey:String(form.get('sourceKey')||''),
        destination:String(form.get('destination')||''),
        targetKey:String(form.get('targetKey')||''),
        transform:String(form.get('transform')||'copy')
      })
      setMappingOpen(false)
      setNotice({kind:'ok',text:'Feed mapping saved after backend confirmation.'})
      await load()
    }catch(error:any){
      setNotice(unknownOutcome(error)
        ?{kind:'unknown',text:'The mapping-save outcome is unknown. Refresh authoritative feed state before creating the same mapping again.'}
        :{kind:'error',text:error?.message||'Feed mapping could not be saved.'})
    }finally{setBusy('')}
  }

  const toggle=async(item:any)=>{
    setBusy(item.id)
    setNotice({kind:'',text:''})
    try{
      await feedApi.toggleMapping(item.id,item.enabled===false)
      setNotice({kind:'ok',text:item.enabled===false?'Feed mapping enabled after backend confirmation.':'Feed mapping paused after backend confirmation.'})
      await load()
    }catch(error:any){
      setNotice(unknownOutcome(error)
        ?{kind:'unknown',text:'The mapping-status outcome is unknown. Refresh authoritative feed state before repeating this change.'}
        :{kind:'error',text:error?.message||'Feed mapping status could not be changed.'})
    }finally{setBusy('')}
  }

  const runPreview=async(destination:string)=>{
    setBusy('preview')
    setNotice({kind:'',text:''})
    try{
      const r:any=await feedApi.preview(destination)
      setPreview(r)
      setPreviewOpen(true)
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'Payload preview failed.'})
    }finally{setBusy('')}
  }

  const stats=data.stats||{}
  const attributes:any[]=data.attributes||[]
  const mappings:any[]=data.mappings||[]
  const destinations:any[]=data.destinations||[]
  const mappingDestinations=Array.from(new Set<string>(mappings.map((item:any)=>String(item.destination||'')).filter(Boolean)))

  return <>
    <PageHead crumb="Activation / Feed" title="Feed & payload enhancement" sub="Enrich activation payloads with governed first-party attributes and explicit destination mappings." action="Add attribute" onAction={()=>setBuilder(true)} disabled={busy==='attribute'}/>

    {loading&&!attributes.length&&!mappings.length&&<LoadingState title="Loading feed configuration" description="Reading governed attributes, destination mappings and delivery evidence."/>}
    {loadError&&<ErrorState title="Feed refresh failed" description={loadError} action={{label:'Retry feed',onClick:()=>void load()}}/>}
    {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':notice.kind==='unknown'?'warning':'ok')} role={notice.kind==='error'?'alert':'status'}>
      {notice.kind==='ok'?<CheckCircle2/>:<ShieldCheck/>}<span>{notice.text}</span>{notice.kind==='unknown'&&<button type="button" onClick={()=>void load()}>Refresh authoritative state</button>}
    </div>}

    <div className="stats-grid">
      <Stat label="Active attributes" value={String(stats.activeAttributes||0)} sub="Observed + custom mapped fields" Icon={Layers3}/>
      <Stat label="Destination mappings" value={String(mappings.filter((item:any)=>item.enabled!==false).length)} sub="Enabled source → target mappings" Icon={Cable}/>
      <Stat label="Signal deliveries" value={String(stats.deliveries||0)} sub="Activation payload population" Icon={DatabaseZap}/>
      <Stat label="Quarantined events" value={String(stats.quarantined||0)} sub="Schema/data review queue" Icon={Activity}/>
    </div>

    <div className="app-panel">
      <div className="panel-head"><div><h3>Custom & observed attributes</h3><p>Values available before activation</p></div><div className="panel-actions"><button onClick={()=>setSchemaOpen(true)}>Schema settings</button><button className="app-primary" onClick={()=>setBuilder(true)}><Plus/>Add attribute</button></div></div>
      {attributes.length?attributes.map((item:any)=><div className="feed-row" key={item.key}><Layers3/><code>{item.key}</code><b>{item.sample??'—'}</b><span>{item.source}</span><em>{item.status||'Mapped'}</em></div>):!loading&&<div className="empty-delivery-state"><Layers3/><div><b>No feed attributes observed</b><small>Profile, journey and custom fields will appear as they are ingested.</small></div></div>}
    </div>

    <div className="app-panel">
      <div className="panel-head"><div><h3>Destination field mappings</h3><p>Persisted contracts used to shape outbound payloads</p></div><button className="app-primary" onClick={()=>setMappingOpen(true)}><Plus/>New mapping</button></div>
      {mappings.length?mappings.map((item:any)=><div className="mapping-rule feed-mapping-row" key={item.id}><span><code>{item.sourceKey}</code></span><ArrowRight/><b>{item.destination} · {item.targetKey}</b><small>{item.transform||'copy'}</small><em className={item.enabled===false?'status':'healthy'}>{item.enabled===false?'paused':'enabled'}</em><button disabled={busy===item.id} onClick={()=>void toggle(item)}>{busy===item.id?'Saving…':item.enabled===false?'Enable':'Pause'}</button></div>):!loading&&<div className="empty-delivery-state"><Cable/><div><b>No destination mappings yet</b><small>Create an explicit mapping before expecting a destination-specific enhanced payload.</small></div></div>}
    </div>

    <div className="two-col">
      <div className="app-panel"><div className="panel-head"><div><h3>Payload destinations</h3><p>Observed enhancement coverage by destination</p></div></div>
        {destinations.length?destinations.map((item:any)=><div className="health-line" key={item.destination}><span>{item.destination}</span><div className="progress"><i style={{width:Number(item.enrichedRate||0)+'%'}}/></div><b>{Number(item.enrichedRate||0).toFixed(1)}%</b><button onClick={()=>void runPreview(item.destination)} disabled={busy==='preview'}>Preview</button></div>):<div className="empty-delivery-state"><Cable/><div><b>No delivered payload history yet</b><small>{mappingDestinations.length?'You can still preview a configured mapping before the first live delivery.':'Create a destination mapping to build a preview.'}</small></div></div>}
        {!destinations.length&&mappingDestinations.map(destination=><div className="health-line" key={destination}><span>{destination}</span><div className="progress"><i style={{width:'0%'}}/></div><b>0%</b><button onClick={()=>void runPreview(destination)} disabled={busy==='preview'}>Preview</button></div>)}
      </div>
      <div className="app-panel"><div className="panel-head"><div><h3>Schema guardrails</h3><p>Protect destination quality</p></div></div>
        {[['Required identifier','customer_id, contact hash or approved device ID'],['Revenue','numeric + currency'],['Event ID','unique / idempotent'],['Consent','marketing consent rechecked for audiences'],['PII policy','hash contact identity before activation']].map(item=><div className="mapping-rule" key={item[0]}><span>{item[0]}</span><ArrowRight/><b>{item[1]}</b></div>)}
      </div>
    </div>

    {builder&&<AccessibleDialog ariaLabel="Add feed attribute" onClose={()=>setBuilder(false)}><form className="connector-card" onSubmit={add}><div className="connector-modal-head"><div><Layers3/><div><b>Add custom attribute</b><small>Register a field for feed/payload mapping.</small></div></div><button type="button" aria-label="Close feed attribute builder" onClick={()=>setBuilder(false)}><X/></button></div><label>Key<input name="key" required placeholder="customer_tier"/></label><label>Source<input name="source" required defaultValue="custom"/></label><label>Example value<input name="sample" placeholder="high_ltv"/></label><button disabled={busy==='attribute'}>{busy==='attribute'?'Saving…':'Save attribute'}</button></form></AccessibleDialog>}

    {mappingOpen&&<AccessibleDialog ariaLabel="New feed mapping" onClose={()=>setMappingOpen(false)}><form className="connector-card" onSubmit={saveMapping}><div className="connector-modal-head"><div><Cable/><div><b>New feed mapping</b><small>Map one first-party field to a destination payload key.</small></div></div><button type="button" aria-label="Close feed mapping builder" onClick={()=>setMappingOpen(false)}><X/></button></div><label>Source attribute<select name="sourceKey" required>{attributes.map((item:any)=><option key={item.key} value={item.key}>{item.key}</option>)}</select></label><label>Destination<select name="destination" defaultValue="Google Ads"><option>Google Ads</option><option>Meta Ads</option><option>Webhook</option><option>CRM</option></select></label><label>Destination field<input name="targetKey" required placeholder="customer_tier"/></label><label>Transform<select name="transform"><option value="copy">Copy as-is</option><option value="string">Convert to string</option><option value="number">Convert to number</option></select></label><button disabled={busy==='mapping'}>{busy==='mapping'?'Saving…':'Save feed mapping'}</button></form></AccessibleDialog>}

    {schemaOpen&&<AccessibleDialog ariaLabel="Payload schema settings" onClose={()=>setSchemaOpen(false)}><div className="connector-card"><div className="connector-modal-head"><div><Layers3/><div><b>Payload schema settings</b><small>Current guardrails</small></div></div><button aria-label="Close payload schema settings" onClick={()=>setSchemaOpen(false)}><X/></button></div><div className="site-detail-grid">{[['Required identity','customer_id / contact hash / approved device ID'],['Revenue type','numeric + currency'],['Event ID','unique / idempotent'],['PII activation','hash contact identity before destination']].map(item=><div key={item[0]}><span>{item[0]}</span><b>{item[1]}</b></div>)}</div></div></AccessibleDialog>}

    {previewOpen&&<AccessibleDialog ariaLabel="Enhanced payload preview" onClose={()=>setPreviewOpen(false)}><div className="connector-card"><div className="connector-modal-head"><div><Cable/><div><b>Enhanced payload preview</b><small>{preview?.destination||'Configured mapping'}</small></div></div><button aria-label="Close enhanced payload preview" onClick={()=>setPreviewOpen(false)}><X/></button></div><div className="site-detail-grid">{[['Profile',preview?.profileId||'No persisted profile'],['Mappings applied',preview?.mappings||0],['Generated',preview?.generatedAt?new Date(preview.generatedAt).toLocaleString():'—']].map(item=><div key={item[0]}><span>{item[0]}</span><b>{String(item[1])}</b></div>)}</div><div className="code-block"><code>{JSON.stringify(preview?.payload||{},null,2)}</code></div><div className="source-conflict-note"><ShieldCheck/><div><b>Preview boundary</b><p>{preview?.notice}</p></div></div></div></AccessibleDialog>}
  </>
}
