import {useEffect,useMemo,useState} from 'react'
import {beginLoading,useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {
  Activity,AlertTriangle,ArrowRight,Bot,Check,CheckCircle2,MousePointer2,RadioTower,ShieldCheck
} from 'lucide-react'
import {chatgptAdsApi} from '../data/chatgpt-ads.api'
import {ErrorState,LoadingState,StaleState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'

function PageHead({
  crumb,
  title,
  sub,
  action,
  onAction
}:{
  crumb:string
  title:string
  sub:string
  action?:string
  onAction?:()=>void
}){
  return <div className="page-head">
    <div>
      <span>{crumb}</span>
      <h1 tabIndex={-1}>{title}</h1>
      <p>{sub}</p>
    </div>
    {action&&<button className="app-primary" onClick={onAction}>{action}</button>}
  </div>
}

function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){
  return <article className="stat">
    <div><span>{label}</span><Icon/></div>
    <strong>{value}</strong>
    <small>{sub}</small>
  </article>
}

type Notice={kind:'ok'|'error'|'unknown'|'',text:string}

const unknownMutation=(error:any)=>{
  const cause=String(error?.details?.cause||'')
  return cause==='timeout'||cause==='network'
}

export default function ChatGPTAdsPage(){
  const [data,setData]=useState<any>({configured:false,deliveries:{recent:[]},matching:{},supportedEventTypes:[]})
  const [busy,setBusy]=useState('')
  const [loading,setLoading]=useState(true)
  const [notice,setNotice]=useState<Notice>({kind:'',text:''})
  const [validation,setValidation]=useState<any>(null)
  const [draft,setDraft]=useState<any>({
    event:'lead_created',
    openaiEventType:'lead_created',
    actionSource:'web',
    eventSourceUrl:'https://example.com/thank-you',
    customerId:'',
    externalEventId:'',
    oppref:'',
    obref:'',
    openaiAmountMinor:'',
    currency:'INR',
    optOut:false
  })

  const draftDirty=useMemo(()=>
    draft.event!=='lead_created'||
    draft.openaiEventType!=='lead_created'||
    draft.actionSource!=='web'||
    draft.eventSourceUrl!=='https://example.com/thank-you'||
    Boolean(draft.customerId||draft.externalEventId||draft.oppref||draft.obref||draft.openaiAmountMinor)||
    draft.currency!=='INR'||
    draft.optOut
  ,[draft])

  useDirtyWork({
    key:'chatgpt-ads-conversion-draft',
    label:'ChatGPT Ads conversion payload',
    dirty:draftDirty,
    scope:'feature'
  })

  const load=async()=>{
    beginLoading(setLoading)
    try{
      const result:any=await chatgptAdsApi.status()
      setData(result)
      setNotice(current=>current.kind==='error'?{kind:'',text:''}:current)
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'ChatGPT Ads status could not be loaded. Existing measurement evidence was preserved.'})
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{void load()},[])
 useDevelopmentLiveRefresh(()=>load())

  const payload=()=>{
    const raw:any={
      ...draft,
      occurredAt:new Date().toISOString(),
      externalEventId:draft.externalEventId||('ace_'+Date.now())
    }
    if(raw.openaiAmountMinor==='')delete raw.openaiAmountMinor
    else raw.openaiAmountMinor=Number(raw.openaiAmountMinor)
    if(!raw.customerId)delete raw.customerId
    if(!raw.oppref)delete raw.oppref
    if(!raw.obref)delete raw.obref
    return raw
  }

  const validate=async()=>{
    setBusy('validate')
    setNotice({kind:'',text:''})
    setValidation(null)
    try{
      const result:any=await chatgptAdsApi.validate(payload())
      setValidation(result)
      setNotice({
        kind:result.valid?'ok':'error',
        text:result.valid
          ?(result.configured
            ?'Payload is valid and provider credentials are configured.'
            :'Payload is valid. Provider credentials still need backend configuration before live delivery.')
          :(result.error||'Validation failed.')
      })
    }catch(error:any){
      setValidation({valid:false,error:error?.message||'Validation failed'})
      setNotice({kind:'error',text:error?.message||'Validation failed.'})
    }finally{
      setBusy('')
    }
  }

  const send=async()=>{
    setBusy('send')
    setNotice({kind:'',text:''})
    try{
      const result:any=await chatgptAdsApi.send(payload())
      setNotice({
        kind:'ok',
        text:result.duplicate
          ?'Matching ChatGPT Ads conversion already exists; duplicate was not queued.'
          :'ChatGPT Ads conversion was accepted by the backend delivery workflow.'
      })
      await load()
    }catch(error:any){
      setNotice(unknownMutation(error)
        ?{kind:'unknown',text:'The backend did not confirm whether this conversion was accepted. Refresh delivery state before submitting the same conversion again.'}
        :{kind:'error',text:error?.message||'ChatGPT Ads conversion could not be queued.'}
      )
    }finally{
      setBusy('')
    }
  }

  const deliveries=data.deliveries||{}
  const matching=data.matching||{}
  const typeLabel=(value:string)=>value.replaceAll('_',' ')

  return <>
    <PageHead
      crumb="Tracking / ChatGPT Ads"
      title="ChatGPT Ads conversion measurement"
      sub="Capture OpenAI click references and send consent-aware server-side conversion events through the official ChatGPT Ads conversion workflow."
      action={loading?'Refreshing…':'Refresh'}
      onAction={load}
    />

    {loading&&!data.supportedEventTypes?.length&&
      <LoadingState title="Loading ChatGPT Ads measurement" description="Reading provider setup, match coverage and durable delivery evidence."/>
    }
    {notice.text&&notice.kind==='error'&&
      <ErrorState title="ChatGPT Ads action failed" description={notice.text} action={{label:'Refresh measurement state',onClick:load}}/>
    }
    {notice.text&&notice.kind==='unknown'&&
      <StaleState title="Conversion outcome needs reconciliation" description={notice.text} action={{label:'Refresh delivery state',onClick:load}}/>
    }
    {notice.text&&notice.kind==='ok'&&
      <div className="delivery-notice ok" role="status"><Bot/><span>{notice.text}</span></div>
    }

    <div className="stats-grid">
      <Stat label="Provider setup" value={data.configured?'Ready':'Needs setup'} sub={data.pixelConfigured&&data.conversionsKeyConfigured?'Pixel ID + Conversions API key configured':'Server-side credentials stay in environment secrets'} Icon={ShieldCheck}/>
      <Stat label="oppref coverage" value={String(matching.opprefCoverage||0)+'%'} sub={String(matching.opprefEvents||0)+' of '+String(matching.recentEvents||0)+' recent events preserve oppref'} Icon={MousePointer2}/>
      <Stat label="CAPI deliveries" value={String(deliveries.total||0)} sub={String(deliveries.queued||0)+' queued · '+String(deliveries.failed||0)+' failed'} Icon={RadioTower}/>
      <Stat label="Delivery rate" value={deliveries.deliveryRate==null?'—':String(deliveries.deliveryRate)+'%'} sub="Terminal AceMarketing delivery records" Icon={Activity}/>
    </div>

    <div className="chatgpt-ads-hero app-panel">
      <div><Bot/><div><span>SERVER-SIDE CONVERSION MEASUREMENT</span><h3>Ad click → oppref → first-party conversion → ChatGPT Ads CAPI</h3><p>AceMarketing preserves the OpenAI click reference when your site sends it, keeps conversion credentials server-side, and reuses stable event IDs for retries and deduplication.</p></div></div>
      <div className="data-flow-steps">{['Capture oppref','Persist event','Check consent','Map event','Queue CAPI','Monitor delivery'].map((item,index)=><span key={item}><b>{index+1}</b>{item}{index<5&&<ArrowRight/>}</span>)}</div>
    </div>

    <div className="chatgpt-ads-layout">
      <section className="app-panel">
        <div className="panel-head">
          <div><h3>Conversion payload builder</h3><p>Validate the event first, then queue it through the durable delivery workflow.</p></div>
          <span className={data.configured?'healthy':'status'}>{data.configured?'Configured':'Environment setup required'}</span>
        </div>

        <div className="setup-form-grid">
          <label><span>Event type</span><select value={draft.openaiEventType} onChange={event=>setDraft({...draft,openaiEventType:event.target.value,event:event.target.value})}>{(data.supportedEventTypes||['lead_created','order_created','appointment_scheduled']).map((item:string)=><option key={item} value={item}>{typeLabel(item)}</option>)}</select></label>
          <label><span>Action source</span><select value={draft.actionSource} onChange={event=>setDraft({...draft,actionSource:event.target.value})}><option value="web">Web</option><option value="mobile_app">Mobile app</option><option value="offline">Offline</option><option value="physical_store">Physical store</option><option value="phone_call">Phone call</option><option value="email">Email</option><option value="other">Other</option></select></label>
          <label><span>Source URL</span><input value={draft.eventSourceUrl} onChange={event=>setDraft({...draft,eventSourceUrl:event.target.value})} placeholder="https://example.com/thank-you"/></label>
          <label><span>Customer ID</span><input value={draft.customerId} onChange={event=>setDraft({...draft,customerId:event.target.value})} placeholder="customer_123"/></label>
          <label><span>OpenAI click reference (oppref)</span><input value={draft.oppref} onChange={event=>setDraft({...draft,oppref:event.target.value})} placeholder="Opaque value from landing-page URL"/></label>
          <label><span>Browser reference (obref)</span><input value={draft.obref} onChange={event=>setDraft({...draft,obref:event.target.value})} placeholder="Optional __obref cookie value"/></label>
          <label><span>Event ID</span><input value={draft.externalEventId} onChange={event=>setDraft({...draft,externalEventId:event.target.value})} placeholder="Stable order/lead/event ID"/></label>
          <label><span>Amount in minor units</span><input type="number" min="0" value={draft.openaiAmountMinor} onChange={event=>setDraft({...draft,openaiAmountMinor:event.target.value})} placeholder="2599"/></label>
          <label><span>Currency</span><input value={draft.currency} onChange={event=>setDraft({...draft,currency:event.target.value.toUpperCase()})} maxLength={3}/></label>
          <label><span>Future personalization opt-out</span><select value={draft.optOut?'true':'false'} onChange={event=>setDraft({...draft,optOut:event.target.value==='true'})}><option value="false">Default</option><option value="true">Opt out</option></select></label>
        </div>

        <div className="source-conflict-note">
          <ShieldCheck/>
          <div><b>Secrets stay server-side</b><p>The dashboard never persists or displays provider credentials. Server-side configuration remains authoritative.</p></div>
        </div>

        <div className="approval-actions">
          <button disabled={busy==='validate'} onClick={validate}>{busy==='validate'?'Validating…':'Validate payload'}</button>
          <button className="approve" disabled={busy==='send'||!data.configured} onClick={send}>{busy==='send'?'Queueing…':'Queue live conversion'}</button>
        </div>

        {validation&&
          <div className={'activation-test-result '+(validation.valid?'matched':'not-matched')} role={validation.valid?'status':'alert'}>
            <ShieldCheck/>
            <div><b>{validation.valid?'Payload valid':'Payload invalid'}</b><small>{validation.notice||validation.error||'Validation completed.'}</small></div>
          </div>
        }
      </section>

      <section className="app-panel">
        <div className="panel-head"><div><h3>Measurement readiness</h3><p>Provider and first-party requirements reflected in the workspace</p></div></div>
        <div className="chatgpt-readiness">
          {[
            ['Conversions API key',data.conversionsKeyConfigured],
            ['Pixel ID',data.pixelConfigured],
            ['oppref preservation',Number(matching.opprefEvents||0)>0],
            ['Durable delivery queue',true],
            ['Marketing-consent guard',true],
            ['Stable event-ID replay',true]
          ].map(([label,ok]:any)=>
            <article key={label}>
              <span className={ok?'ready':'attention'}>{ok?<Check/>:<AlertTriangle/>}</span>
              <div><b>{label}</b><small>{ok?'Ready':'Needs setup / evidence'}</small></div>
            </article>
          )}
        </div>
        <div className="agent-section">
          <h4>Supported events</h4>
          <div className="context-chips">{(data.supportedEventTypes||[]).map((item:string)=><span key={item}>{typeLabel(item)}</span>)}</div>
        </div>
        <div className="source-conflict-note">
          <MousePointer2/>
          <div><b>Click matching</b><p>Capture <code>oppref</code> from the landing-page URL and forward it unchanged with server events. When using browser measurement too, reuse the same event ID for deduplication.</p></div>
        </div>
      </section>
    </div>

    <section className="app-panel">
      <div className="panel-head">
        <div><h3>Recent ChatGPT Ads deliveries</h3><p>Durable queue state and provider results</p></div>
        <button onClick={()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Delivery'}))}>Open full delivery center</button>
      </div>
      {(deliveries.recent||[]).length
        ?<div className="chatgpt-deliveries">
          {(deliveries.recent||[]).map((item:any)=>
            <article key={item.id}>
              <span className={'delivery-state '+item.status}><RadioTower/></span>
              <div><b>{item.event}</b><small>{item.externalEventId||item.id} · {item.replayPayload?.oppref?'oppref captured':'no oppref'}</small></div>
              <strong>{item.status}</strong>
              <time>{item.updatedAt||item.createdAt?new Date(item.updatedAt||item.createdAt).toLocaleString():'—'}</time>
            </article>
          )}
        </div>
        :<div className="empty-delivery-state"><Bot/><div><b>No ChatGPT Ads deliveries yet</b><small>Validate your setup, then queue a consented conversion when credentials are configured.</small></div></div>
      }
    </section>
  </>
}
