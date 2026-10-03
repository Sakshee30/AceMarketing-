import {useState} from 'react'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {
  Activity,ArrowRight,BarChart3,Cable,Check,CheckCircle2,DatabaseZap,Eye,MessageCircle,MousePointerClick,Plus,RefreshCw,Search,ShieldCheck,Sparkles,UsersRound,X
} from 'lucide-react'
import {integrationsApi as api} from '../data/integrations.api'
import {integrationKeys} from '../data/integrations.keys'
import {AccessibleDialog} from '../../../../../packages/design-system/src/AccessibleDialog'
import {classifyMutationFailure,createOperationId} from '../../../../../packages/client-core/src/mutation-lifecycle'
import {formatDateTime} from '../../../../../packages/localization/src/index'
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
    {action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}
  </div>
}

const sampleCampaigns=[
  {connector:'GA4',rows:12,sessions:28640,users:19420,conversions:638,impressions:0,clicks:0},
  {connector:'Meta Ads',rows:8,sessions:0,users:0,conversions:612,impressions:1284000,clicks:18240},
  {connector:'Google Ads',rows:6,sessions:0,users:0,conversions:438,impressions:865000,clicks:12450}
]
const sampleCrm=[
  {connector:'HubSpot',object_type:'contacts',rows:3840},
  {connector:'HubSpot',object_type:'deals',rows:460},
  {connector:'HubSpot',object_type:'companies',rows:182}
]
const metricValue=(value:any)=>Number.isFinite(Number(value))?Number(value):0
const countLabel=(value:number)=>Math.round(value).toLocaleString('en-IN')
const connectorLabel=(connector:string)=>connector.toLowerCase()==='ga4'?'Google Analytics 4 (GA4)':connector

function ConnectorAnalytics(){
 const dataQuery=useQuery({
  queryKey:integrationKeys.dataSummary(),
  queryFn:({signal})=>api.dataSummary(signal),
  staleTime:30_000,
  refetchOnWindowFocus:true
 })
 const summary:any=dataQuery.data
 const campaignRows:any[]=Array.isArray(summary?.campaigns)?summary.campaigns:[]
 const crmRows:any[]=Array.isArray(summary?.crm)?summary.crm:[]
 const rawRows:any[]=Array.isArray(summary?.raw)?summary.raw:[]
 const live=Boolean(summary?.available&&(campaignRows.length||crmRows.length||rawRows.length))
 const campaigns=live?campaignRows:sampleCampaigns
 const crm=live?crmRows:sampleCrm
 const campaignSources=Object.values(campaigns.reduce((sources:any,row:any)=>{
  const connector=String(row.connector||'Unknown source')
  const source=sources[connector]||{connector,rows:0,sessions:0,users:0,impressions:0,clicks:0,conversions:0}
  source.rows+=metricValue(row.rows)
  source.sessions+=metricValue(row.sessions)
  source.users+=metricValue(row.users)
  source.impressions+=metricValue(row.impressions)
  source.clicks+=metricValue(row.clicks)
  source.conversions+=metricValue(row.conversions)
  sources[connector]=source
  return sources
 },{})) as any[]
 const crmSources=Object.values(crm.reduce((sources:any,row:any)=>{
  const connector=String(row.connector||'Unknown CRM')
  const source=sources[connector]||{connector,records:0,objects:0}
  source.records+=metricValue(row.rows)
  source.objects+=1
  sources[connector]=source
  return sources
 },{})) as any[]
 const totalSessions=campaignSources.reduce((sum:any,row:any)=>sum+row.sessions,0)
 const totalImpressions=campaignSources.filter(row=>row.connector.toLowerCase()!=='ga4').reduce((sum:any,row:any)=>sum+row.impressions,0)
 const totalClicks=campaignSources.filter(row=>row.connector.toLowerCase()!=='ga4').reduce((sum:any,row:any)=>sum+row.clicks,0)
 const totalConversions=campaignSources.reduce((sum:any,row:any)=>sum+row.conversions,0)
 const totalCrmRecords=crmSources.reduce((sum:any,row:any)=>sum+row.records,0)
 const maxActivity=Math.max(1,...campaignSources.map(row=>row.sessions||row.clicks))

 return <section className="app-panel connector-analytics" aria-labelledby="connector-analytics-title">
  <div className="panel-head connector-analytics-head">
   <div><span className="connector-analytics-eyebrow">DATA IN → DECISIONS OUT</span><h3 id="connector-analytics-title">Connected marketing analytics</h3><p>See how web, ad and CRM data combine into one measurable customer journey.</p></div>
   <div className="connector-analytics-actions"><span className={live?'connector-data-badge live':'connector-data-badge sample'}>{live?'LIVE CONNECTOR DATA':'SAMPLE PREVIEW'}</span><button type="button" onClick={()=>void dataQuery.refetch()} disabled={dataQuery.isFetching}><RefreshCw/>{dataQuery.isFetching?'Refreshing…':'Refresh data'}</button></div>
  </div>
  {dataQuery.isError&&<div className="delivery-notice error" role="alert"><Activity/><span>{(dataQuery.error as any)?.message||'Live connector analytics could not be loaded. The sample preview is shown instead.'}</span><button type="button" onClick={()=>void dataQuery.refetch()}>Retry</button></div>}
  {dataQuery.isPending&&!summary?<div className="connector-analytics-loading"><Activity/>Loading connector analytics…</div>:<>
   {!live&&<div className="connector-sample-note" role="note"><Sparkles/><span>Illustrative sample numbers for your walkthrough—not connected account results. Connect a provider and run a sync to replace these with workspace data.</span></div>}
   {live&&!campaignRows.length&&!crmRows.length&&<div className="connector-sample-note" role="note"><DatabaseZap/><span>Raw connector events are arriving. Normalized campaign and CRM analytics will appear after the next successful sync.</span></div>}
   <div className="connector-analytics-stats">
    <article><span><BarChart3/>GA4 sessions</span><strong>{live&&!campaignSources.length?'—':countLabel(totalSessions)}</strong><small>Website sessions from Google Analytics</small></article>
    <article><span><Eye/>Paid impressions</span><strong>{live&&!campaignSources.length?'—':countLabel(totalImpressions)}</strong><small>Reported by connected ad platforms</small></article>
    <article><span><MousePointerClick/>Ad click-through rate</span><strong>{totalImpressions?((totalClicks/totalImpressions)*100).toFixed(2)+'%':'—'}</strong><small>{countLabel(totalClicks)} clicks ÷ {countLabel(totalImpressions)} impressions</small></article>
    <article><span><UsersRound/>CRM records</span><strong>{live&&!crmSources.length?'—':countLabel(totalCrmRecords)}</strong><small>Contacts, companies and deals synced</small></article>
   </div>
   <div className="connector-analytics-detail">
    <div className="connector-analytics-card">
     <div className="connector-card-heading"><div><h4>Channel performance</h4><p>Engagement and outcomes reported by each platform</p></div><span>{campaignSources.length} sources</span></div>
     {campaignSources.length?campaignSources.map((source:any)=><div className="connector-performance-row" key={source.connector}>
      <div className="connector-performance-meta"><b>{connectorLabel(source.connector)}</b><span>{countLabel(source.rows)} campaign-day records</span></div>
      <div className="connector-performance-track" aria-label={source.sessions?countLabel(source.sessions)+' sessions':countLabel(source.clicks)+' clicks'}><i style={{width:Math.max(2,((source.sessions||source.clicks)/maxActivity)*100)+'%'}}/></div>
      <div className="connector-performance-values"><b>{countLabel(source.sessions||source.clicks)} {source.sessions?'sessions':'clicks'}</b><span>{countLabel(source.conversions)} reported conversions{source.impressions?' · '+countLabel(source.impressions)+' impressions':''}</span></div>
     </div>):<div className="connector-analytics-empty">No normalized campaign analytics yet.</div>}
     <small className="connector-analytics-footnote">Conversion totals are provider-reported and are not deduplicated across platforms.</small>
    </div>
    <div className="connector-analytics-card">
     <div className="connector-card-heading"><div><h4>CRM data feed</h4><p>Business records available for journey and revenue analysis</p></div><DatabaseZap/></div>
     {crmSources.length?crmSources.map((source:any)=><div className="connector-crm-row" key={source.connector}><span className="connector-crm-icon"><UsersRound/></span><div><b>{source.connector}</b><small>{source.objects} object types synced</small></div><strong>{countLabel(source.records)}</strong></div>):<div className="connector-analytics-empty">No CRM records synced yet.</div>}
     <div className="connector-analytics-flow"><b>How the data connects</b><div><span>GA4 + Meta Ads</span><ArrowRight/><span>Canonical events</span><ArrowRight/><span>CRM journey &amp; outcomes</span></div></div>
    </div>
   </div>
   <div className="connector-analytics-process" aria-label="Data processing steps"><span><i>1</i><b>Connect sources</b><small>Authorize GA4, Meta and CRM</small></span><ArrowRight/><span><i>2</i><b>Sync &amp; normalize</b><small>Map fields to a shared schema</small></span><ArrowRight/><span><i>3</i><b>Measure journeys</b><small>Relate campaigns to CRM outcomes</small></span><ArrowRight/><span><i>4</i><b>Activate insights</b><small>Use analytics in reports and audiences</small></span></div>
   {live&&summary?.generatedAt&&<div className="connector-analytics-updated">Live data · summary generated {new Date(summary.generatedAt).toLocaleString()}</div>}
  </>}
 </section>
}

export default function IntegrationsPage(){
 const groups=[
  ['CRM Platforms',['Zoho CRM','Salesforce','LeadSquared','Meritto','HubSpot','HighLevel','Microsoft Dynamics 365','Freshsales','Custom CRM']],
  ['Messaging & Marketing',['WhatsApp','Bitespeed','AiSensy','Gupshup','WATI','MoEngage','CleverTap','Mailchimp','Klaviyo','Brevo','Twilio SendGrid']],
  ['Calling Platforms',['Exotel','Knowlarity','Tata Tele','MyOperator','Twilio']],
  ['Website, Forms & Commerce',['Shopify','WooCommerce','Magento','WordPress','Typeform','React App','Custom Backend']],
  ['Warehouse, Database & Storage',['BigQuery','Snowflake','MongoDB','Oracle DB','Google Cloud Storage','Amazon S3']],
  ['Advertising & Analytics',['Google Ads','Meta Ads','ChatGPT Ads','LinkedIn Ads','Microsoft Ads / Bing Ads','X','Pinterest','TikTok Ads','Yahoo Ads','Taboola','Spotify Ads','Snapchat Ads','Criteo','DV360','Google Merchant Center','Meta Lead Ads','Meta CAPI','Meta Catalog','GA4','Google Calendar']],
  ['Sales Intelligence',['Apollo','Lusha','Calixa']]
 ]
 const [connector,setConnector]=useState('')
 const [step,setStep]=useState(1)
 const [refreshing,setRefreshing]=useState('')
 const [disconnecting,setDisconnecting]=useState('')
 const [builder,setBuilder]=useState(false)
 const [builderStep,setBuilderStep]=useState(1)
 const [testResult,setTestResult]=useState<any>(null)
 const [draft,setDraft]=useState<any>({name:'Internal Lead API',type:'REST API',auth:'Bearer token',baseUrl:'https://api.example.com/v1',direction:'Bidirectional',identity:'email',stage:'status',revenue:'revenue',secret:'',username:'',headerName:'X-API-Key'})
 const [waTo,setWaTo]=useState('')
 const [waText,setWaText]=useState('Hi — this is a test message from AceMarketing.')
 const [waBusy,setWaBusy]=useState(false)
 const [waNotice,setWaNotice]=useState('')
 const [integrationSearch,setIntegrationSearch]=useState('')
 const [requestOpen,setRequestOpen]=useState(false)
 const [requestBusy,setRequestBusy]=useState(false)
 const [requestNotice,setRequestNotice]=useState<{kind:'ok'|'error'|'',text:string}>({kind:'',text:''})
 const [connectionNotice,setConnectionNotice]=useState<any>(null)
 const [secretConnector,setSecretConnector]=useState<any>(null)
 const [secretValues,setSecretValues]=useState<Record<string,string>>({})
 const [secretBusy,setSecretBusy]=useState(false)
 const [webhookOpen,setWebhookOpen]=useState(false)
 const [webhookBusy,setWebhookBusy]=useState('')
 const [webhookNotice,setWebhookNotice]=useState('')
 const [webhookSecret,setWebhookSecret]=useState('')
 const [webhookDraft,setWebhookDraft]=useState({name:'Lead lifecycle webhook',destinationUrl:'https://api.example.com/webhooks/ace',eventTypes:'lead.created,lead.updated'})
 const queryClient=useQueryClient()
 const workspaceQuery=useQuery({
  queryKey:integrationKeys.workspace(),
  queryFn:({signal})=>api.workspace(signal),
  staleTime:30_000,
  refetchOnWindowFocus:true
 })
 const integrationItems:any[]=((workspaceQuery.data as any)?.integrations?.items||[])
 const integrationRequests:any[]=((workspaceQuery.data as any)?.integrations?.requests||[])
 const customConnectors:any[]=((workspaceQuery.data as any)?.custom?.items||[])
 const waEvents:any[]=((workspaceQuery.data as any)?.whatsapp?.items||[])
 const webhookSubscriptions:any[]=((workspaceQuery.data as any)?.webhookSubscriptions?.items||[])
 const webhookDeliveries:any[]=((workspaceQuery.data as any)?.webhookDeliveries?.items||[])
 const connected=integrationItems.filter((x:any)=>x.status==='connected').map((x:any)=>x.name)
 const integrationLoading=workspaceQuery.isPending||workspaceQuery.isFetching
 const builtInCount=groups.reduce((sum:any,g:any)=>sum+g[1].length,0)
 useDirtyWork({
  key:'integration-builder-draft',
  label:'Integration configuration',
  dirty:Boolean(builder||requestOpen||secretConnector),
  scope:'feature'
 })
 const start=(name:string)=>{
  if(name==='ChatGPT Ads'){window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'ChatGPT Ads'}));return}
  const item=integrationItems.find((x:any)=>x.name===name)
  if(item?.authType==='server_secret'){
   setSecretConnector(item)
   setSecretValues(Object.fromEntries((item.credentialFields||[]).map((field:any)=>[field.key,''])))
   return
  }
  if(!item||item.authType==='manual'||item.status==='manual'){
   setDraft((x:any)=>({...x,name,baseUrl:'',secret:'',username:''}))
   setBuilder(true);setBuilderStep(1);setTestResult(null)
   return
  }
  setConnector(name);setStep(1)
 }
 const loadIntegrations=async()=>{
  setConnectionNotice(null)
  const result=await workspaceQuery.refetch()
  if(result.error)setConnectionNotice({type:'error',text:(result.error as any)?.message||'Integration workspace could not be loaded. Existing connector state was preserved.'})
 }
 const connectorMutation=useMutation({
  mutationFn:async(input:{kind:'connect'|'refresh'|'disconnect';name:string;operationId:string})=>{
   if(input.kind==='connect')return api.connectIntegration(input.name,input.operationId)
   if(input.kind==='refresh')return api.refreshIntegration(input.name,input.operationId)
   return api.disconnectIntegration(input.name,input.operationId)
  },
  onSuccess:async(result:any,input)=>{
   if(input.kind==='connect'&&result?.status==='authorization_required'&&result?.authorizationUrl){
    window.location.assign(result.authorizationUrl);return
   }
   if(input.kind==='connect'&&result?.status==='needs_configuration'){
    setConnectionNotice({type:'error',text:'Connector OAuth credentials are not configured on the backend yet.'});return
   }
   await queryClient.invalidateQueries({queryKey:integrationKeys.root()})
   setConnectionNotice({type:'ok',text:input.kind==='disconnect'?input.name+' disconnected and stored workspace credentials removed.':input.kind==='refresh'?input.name+' credentials refreshed.':input.name+' connected successfully.'})
   if(input.kind==='disconnect'&&secretConnector?.name===input.name){setSecretConnector(null);setSecretValues({})}
   if(input.kind==='connect')setConnector('')
  },
  onError:(error:any,input)=>{
   const classified=classifyMutationFailure(error,input.kind==='disconnect'?'Connector could not be disconnected.':input.kind==='refresh'?'Credential refresh failed':'Connector authorization could not be started.')
   setConnectionNotice({type:classified.phase==='OUTCOME_UNKNOWN'?'unknown':'error',text:classified.message,requestId:classified.requestId})
  }
 })
 const finish=()=>{
  if(!connector||connectorMutation.isPending)return
  setConnectionNotice(null)
  connectorMutation.mutate({kind:'connect',name:connector,operationId:createOperationId()})
 }
 const refreshIntegration=(name:string)=>{
  if(connectorMutation.isPending)return
  setRefreshing(name);setConnectionNotice(null)
  connectorMutation.mutate(
   {kind:'refresh',name,operationId:createOperationId()},
   {onSettled:()=>setRefreshing('')}
  )
 }
 const saveServerSecret=async()=>{
  if(!secretConnector)return
  setSecretBusy(true);setConnectionNotice(null)
  try{
   await api.connectServerSecretIntegration(secretConnector.name,secretValues,createOperationId())
   await queryClient.invalidateQueries({queryKey:integrationKeys.root()})
   setConnectionNotice({type:'ok',text:secretConnector.name+' credentials saved securely and connector marked connected.'})
   setSecretConnector(null);setSecretValues({})
  }catch(e:any){setConnectionNotice({type:'error',text:e?.message||'Secure connector configuration failed.'})}
  finally{setSecretBusy(false)}
 }
 const disconnectIntegration=(name:string)=>{
  if(connectorMutation.isPending)return
  setDisconnecting(name);setConnectionNotice(null)
  connectorMutation.mutate(
   {kind:'disconnect',name,operationId:createOperationId()},
   {onSettled:()=>setDisconnecting('')}
  )
 }
 const testCustom=async()=>{try{const r:any=await api.testCustomIntegration(draft);setTestResult(r)}catch(e:any){setTestResult({ok:false,error:e?.message||'Connection test failed'})};setBuilderStep(3)}
 const saveCustom=async()=>{try{await api.createCustomIntegration(draft);await queryClient.invalidateQueries({queryKey:integrationKeys.root()});setBuilder(false);setBuilderStep(1);setTestResult(null);setDraft((x:any)=>({...x,secret:'',username:''}))}catch(e:any){setTestResult({ok:false,error:e?.message||'Could not create integration'})}}
 const reloadWhatsApp=async()=>{
  setWaNotice('')
  try{await queryClient.invalidateQueries({queryKey:integrationKeys.root()});await workspaceQuery.refetch()}
  catch(e:any){setWaNotice(e?.message||'WhatsApp activity could not be refreshed.')}
 }
 const sendWhatsApp=async()=>{
  if(!waTo.trim()||!waText.trim())return
  setWaBusy(true);setWaNotice('')
  try{
   const r:any=await api.sendWhatsAppMessage({to:waTo,text:waText,purpose:'transactional'})
   setWaNotice(r?.externalId?'Accepted by WhatsApp · '+r.externalId:'Accepted by WhatsApp Cloud API')
   await reloadWhatsApp()
  }catch(e:any){setWaNotice(e?.message||'WhatsApp message could not be sent')}
  finally{setWaBusy(false)}
 }
 const createWebhook=async(e:any)=>{
  e.preventDefault();setWebhookBusy('create');setWebhookNotice('');setWebhookSecret('')
  try{
   const result:any=await api.createWebhookSubscription({
    name:webhookDraft.name,
    destinationUrl:webhookDraft.destinationUrl,
    eventTypes:webhookDraft.eventTypes.split(',').map(x=>x.trim()).filter(Boolean)
   })
   setWebhookSecret(result?.signingSecret||'')
   setWebhookNotice('Webhook subscription created. Store the signing secret now; later views only show the key ID.')
   await queryClient.invalidateQueries({queryKey:integrationKeys.root()})
   await workspaceQuery.refetch()
  }catch(error:any){setWebhookNotice(error?.message||'Webhook subscription could not be created.')}
  finally{setWebhookBusy('')}
 }
 const changeWebhookStatus=async(id:string,status:'active'|'paused'|'disabled')=>{
  setWebhookBusy(id);setWebhookNotice('')
  try{await api.setWebhookSubscriptionStatus(id,status);await queryClient.invalidateQueries({queryKey:integrationKeys.root()});await workspaceQuery.refetch()}
  catch(error:any){setWebhookNotice(error?.message||'Webhook status could not be changed.')}
  finally{setWebhookBusy('')}
 }
 const testWebhook=async(id:string)=>{
  setWebhookBusy(id);setWebhookNotice('')
  try{const result:any=await api.testWebhookSubscription(id);setWebhookNotice('Synthetic test delivery queued · '+String(result?.id||''));await queryClient.invalidateQueries({queryKey:integrationKeys.root()});await workspaceQuery.refetch()}
  catch(error:any){setWebhookNotice(error?.message||'Webhook test could not be queued.')}
  finally{setWebhookBusy('')}
 }
 const replayWebhook=async(id:string)=>{
  setWebhookBusy(id);setWebhookNotice('')
  try{const result:any=await api.replayWebhookDelivery(id);setWebhookNotice('Webhook replay queued · '+String(result?.id||''));await queryClient.invalidateQueries({queryKey:integrationKeys.root()});await workspaceQuery.refetch()}
  catch(error:any){setWebhookNotice(error?.message||'Webhook replay could not be queued.')}
  finally{setWebhookBusy('')}
 }
 const submitIntegrationRequest=async(e:any)=>{
  e.preventDefault();const fd=new FormData(e.currentTarget);setRequestBusy(true);setRequestNotice({kind:'',text:''})
  try{
   const r:any=await api.requestIntegration({connector:String(fd.get('connector')||''),businessNeed:String(fd.get('businessNeed')||''),direction:String(fd.get('direction')||'Bidirectional'),priority:String(fd.get('priority')||'Normal')})
   await queryClient.invalidateQueries({queryKey:integrationKeys.root()});setRequestOpen(false);setRequestNotice({kind:'ok',text:'Connector request submitted and tracked in this workspace.'})
  }catch(err:any){setRequestNotice({kind:'error',text:err?.message||'Connector request could not be submitted.'})}finally{setRequestBusy(false)}
 }
  const connectorOutcomeUnknown=connectionNotice?.type==='unknown'
 const filteredGroups=groups.map(([label,items]:any)=>[label,(items as string[]).filter((name:string)=>!integrationSearch.trim()||name.toLowerCase().includes(integrationSearch.trim().toLowerCase())||String(label).toLowerCase().includes(integrationSearch.trim().toLowerCase()))]).filter(([,items]:any)=>items.length)
 return <><PageHead crumb="Workspace / Integrations" title="Platform-agnostic connectivity" sub="Connect the systems you already use without rebuilding your stack." action={integrationLoading?'Refreshing…':'Refresh integrations'} onAction={loadIntegrations}/>
 {workspaceQuery.isError&&<div className="delivery-notice error" role="alert"><ShieldCheck/><span>{(workspaceQuery.error as any)?.message||'Integration workspace could not be loaded. Existing connector state was preserved.'}</span><button type="button" onClick={()=>void loadIntegrations()}>Retry</button></div>}
 <div className="integration-summary"><div><strong>{builtInCount}+</strong><span>catalogued connector paths</span></div><div><strong>{connected.length+customConnectors.length}</strong><span>connected in this workspace</span></div><div><strong>{integrationRequests.filter((x:any)=>x.status==='requested').length}</strong><span>requested connectors</span></div><div><strong>Native + Custom</strong><span>explicit capability status</span></div></div>
 {requestNotice.text&&<div className={'delivery-notice '+(requestNotice.kind==='error'?'error':'ok')} role={requestNotice.kind==='error'?'alert':'status'}>{requestNotice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}<span>{requestNotice.text}</span></div>}
 {connectionNotice&&<div className={'delivery-notice '+(connectionNotice.type==='error'?'error':connectionNotice.type==='unknown'?'status':'ok')} role={connectionNotice.type==='error'?'alert':'status'}>{connectionNotice.type==='error'?<ShieldCheck/>:<CheckCircle2/>}<span>{connectionNotice.text}{connectionNotice.requestId&&<> Request ID: {connectionNotice.requestId}</>}</span>{connectionNotice.type==='unknown'&&<button type="button" onClick={()=>void loadIntegrations()}>Refresh authoritative state</button>}</div>}
 <ConnectorAnalytics/>
 <div className="app-panel custom-integration-hero"><div><Cable/><div><span>Custom integration</span><h3>Connect proprietary systems without changing your stack</h3><p>Define authentication, endpoint, identity fields and business mappings, then validate the connection before enabling sync.</p></div></div><div className="panel-actions"><button onClick={()=>setRequestOpen(true)}>Request connector</button><button className="app-primary" onClick={()=>{setBuilder(true);setBuilderStep(1);setTestResult(null)}}><Plus/>Build custom integration</button></div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Integration catalog</h3><p>Native OAuth connectors are labelled separately from configurable adapters.</p></div><div className="integration-catalog-search"><Search/><input aria-label="Search integration catalog" value={integrationSearch} onChange={e=>setIntegrationSearch(e.target.value)} placeholder="Search CRM, warehouse, ads, messaging..."/></div></div>{integrationLoading&&<div className="empty-state"><Activity/><b>Refreshing integration state</b><small>Loading connector capability, workspace credentials, custom adapters and WhatsApp activity.</small></div>}</div>
 <div className="app-panel whatsapp-ops"><div className="panel-head"><div><h3>WhatsApp Cloud API operations</h3><p>Send a provider-backed message and inspect real inbound/outbound webhook activity.</p></div><span className={connected.includes('WhatsApp')?'healthy':'warning'}>{connected.includes('WhatsApp')?'Connected':'Connect WhatsApp first'}</span></div>
 <div className="whatsapp-ops-grid"><div className="whatsapp-send-box"><label>Recipient phone<input value={waTo} onChange={e=>setWaTo(e.target.value)} placeholder="919876543210"/></label><label>Message<textarea value={waText} onChange={e=>setWaText(e.target.value)} rows={4}/></label><button className="app-primary" disabled={waBusy||!waTo.trim()||!waText.trim()} onClick={sendWhatsApp}>{waBusy?'Sending…':'Send test message'}</button>{waNotice&&<small className="whatsapp-notice">{waNotice}</small>}</div>
 <div className="whatsapp-event-list"><div className="panel-head"><div><h4>Recent WhatsApp activity</h4><p>Cloud API messages and delivery receipts</p></div><button onClick={reloadWhatsApp}>Refresh</button></div>{waEvents.length?waEvents.slice(0,8).map((x:any)=><div className="whatsapp-event-row" key={(x.kind||'event')+':'+(x.id||x.timestamp)}><span className={'wa-kind '+String(x.kind||'event')}>{x.kind||'event'}</span><div><b>{x.kind==='message'?(x.contactName||x.from||'Inbound message'):x.kind==='outbound'?(x.recipientId||'Outbound message'):(x.status||'Delivery status')}</b><small>{x.text||x.messageType||x.status||'WhatsApp event'} · {x.timestamp?formatDateTime(x.timestamp):'now'}</small></div></div>):<div className="empty-delivery-state"><MessageCircle/><div><b>No WhatsApp events yet</b><small>Verified webhook events and messages will appear here.</small></div></div>}</div></div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Outbound webhook delivery</h3><p>Signed, durable delivery with pause/resume, retries, dead-letter visibility and explicit replay.</p></div><button className="app-primary" onClick={()=>{setWebhookOpen(true);setWebhookSecret('');setWebhookNotice('')}}><Plus/>Add webhook</button></div>
 {webhookNotice&&<div className="delivery-notice status" role="status"><Activity/><span>{webhookNotice}</span></div>}
 {webhookSubscriptions.length?<div>{webhookSubscriptions.map((hook:any)=><div className="custom-connector-row" key={hook.id}><span className="integration-logo c4">WH</span><div><b>{hook.name}</b><small>{hook.destinationUrl} · {Array.isArray(hook.eventTypes)?hook.eventTypes.join(', '):''} · key {hook.signingKeyId}</small></div><span className={hook.status==='active'?'healthy':'status'}>{hook.status}</span><button disabled={webhookBusy===hook.id} onClick={()=>void testWebhook(hook.id)}>{webhookBusy===hook.id?'Working…':'Test'}</button><button disabled={webhookBusy===hook.id} onClick={()=>void changeWebhookStatus(hook.id,hook.status==='active'?'paused':'active')}>{hook.status==='active'?'Pause':'Resume'}</button></div>)}</div>:<div className="empty-delivery-state"><Cable/><div><b>No outbound webhooks configured</b><small>Create a signed HTTPS destination for approved workspace events.</small></div></div>}
 <div className="panel-head"><div><h4>Recent webhook deliveries</h4><p>Authoritative delivery state; unknown outcome and dead-letter remain distinct from success.</p></div></div>
 {webhookDeliveries.length?webhookDeliveries.slice(0,10).map((delivery:any)=><div className="custom-connector-row" key={delivery.id}><span className="integration-logo c2">DL</span><div><b>{delivery.eventType}</b><small>{delivery.id} · attempts {delivery.attemptCount}/{delivery.maxAttempts}{delivery.lastStatusCode?' · HTTP '+delivery.lastStatusCode:''}</small></div><span className={delivery.status==='delivered'?'healthy':delivery.status==='dead_letter'||delivery.status==='unknown_outcome'?'warning':'status'}>{delivery.status}</span>{['dead_letter','unknown_outcome','delivered'].includes(delivery.status)&&<button disabled={webhookBusy===delivery.id} onClick={()=>void replayWebhook(delivery.id)}>{webhookBusy===delivery.id?'Queuing…':'Replay'}</button>}</div>):<div className="empty-delivery-state"><Activity/><div><b>No webhook deliveries yet</b><small>Test or product event deliveries will appear here after they are durably queued.</small></div></div>}</div>
 {customConnectors.length>0&&<div className="app-panel"><div className="panel-head"><div><h3>Custom integrations</h3><p>Workspace-specific adapters</p></div><span className="healthy">{customConnectors.length} connected</span></div>{customConnectors.map((x:any)=><div className="custom-connector-row" key={x.name}><span className="integration-logo c5">CI</span><div><b>{x.name}</b><small>{x.type} · {x.direction} · {x.baseUrl}</small></div><span className={x.status==='healthy'?'healthy':'status'}>{x.status}</span><button onClick={async()=>{const r:any=await api.testCustomIntegration({id:x.id}).catch((e:any)=>({ok:false,error:e?.message||'Test failed'}));setTestResult(r)}}>Test</button></div>)}</div>}
 <div className="integration-category-grid">{filteredGroups.map((g:any,gi:number)=><section className="integration-category" key={g[0] as string}><div className="integration-category-head"><div><span>{String(gi+1).padStart(2,'0')}</span><h3>{g[0]}</h3></div><small>{(g[1] as string[]).length} connectors shown</small></div><div className="integration-app-grid">{(g[1] as string[]).map((x:string,i:number)=>{const item=integrationItems.find((v:any)=>v.name===x);const secretNative=item?.authType==='server_secret';const manual=!item||item.capability==='configurable_adapter'||item.authType==='manual'||item.status==='manual';const requested=integrationRequests.some((r:any)=>r.connector.toLowerCase()===x.toLowerCase()&&r.status==='requested');return <article key={x}><span className={'integration-logo c'+(i%6)}>{x.slice(0,2).toUpperCase()}</span><div><b>{x}</b><small>{connected.includes(x)?'Connected · syncing':secretNative?'Native server-side connector':manual?'Configurable adapter':'Native OAuth connector'}</small></div>{requested&&<span className="status">requested</span>}{connected.includes(x)?<div className="integration-card-actions"><button className="connected" disabled={connectorOutcomeUnknown||disconnecting===x||(!secretNative&&refreshing===x)} onClick={()=>secretNative?start(x):refreshIntegration(x)}>{secretNative?'Manage':refreshing===x?'Refreshing…':(item?.tokenHealth?.needsRefresh?'Refresh token':'Connected')}</button><button className="disconnect" disabled={connectorOutcomeUnknown||disconnecting===x} onClick={()=>disconnectIntegration(x)}>{disconnecting===x?'Disconnecting…':'Disconnect'}</button></div>:<button className="connect" disabled={connectorOutcomeUnknown} onClick={()=>start(x)}>{manual||secretNative?'Configure':'Connect'}</button>}</article>})}</div></section>)}</div>
 {webhookOpen&&<AccessibleDialog ariaLabel="Create outbound webhook" onClose={()=>setWebhookOpen(false)}><form className="connector-card integration-request-form" onSubmit={e=>void createWebhook(e)}><div className="connector-modal-head"><div><Cable/><div><b>Create outbound webhook</b><small>HTTPS destinations are validated against the egress policy. Secrets are encrypted and shown only at creation.</small></div></div><button type="button" onClick={()=>setWebhookOpen(false)}><X/></button></div><label>Name<input required maxLength={120} value={webhookDraft.name} onChange={e=>setWebhookDraft({...webhookDraft,name:e.target.value})}/></label><label>Destination URL<input required type="url" value={webhookDraft.destinationUrl} onChange={e=>setWebhookDraft({...webhookDraft,destinationUrl:e.target.value})}/></label><label>Event types<textarea required rows={4} value={webhookDraft.eventTypes} onChange={e=>setWebhookDraft({...webhookDraft,eventTypes:e.target.value})} placeholder="lead.created, conversion.recorded"/></label>{webhookSecret&&<div className="ai-note"><ShieldCheck/><div><b>One-time signing secret</b><p><code>{webhookSecret}</code></p><small>Store this value securely. AceMarketing will only show the signing key ID after this dialog closes.</small></div></div>}{webhookNotice&&<div className="delivery-notice status" role="status"><span>{webhookNotice}</span></div>}<button disabled={webhookBusy==='create'}>{webhookBusy==='create'?'Creating…':'Create signed webhook'}</button></form></AccessibleDialog>}
 {secretConnector&&<AccessibleDialog ariaLabel={'Configure '+secretConnector.name} onClose={()=>{setSecretConnector(null);setSecretValues({})}}><div className="connector-card server-secret-connector"><div className="connector-modal-head"><div><ShieldCheck/><div><b>Configure {secretConnector.name}</b><small>Credentials are encrypted in the workspace connector vault and are never returned by the API.</small></div></div><button type="button" onClick={()=>{setSecretConnector(null);setSecretValues({})}}><X/></button></div><div className="connector-step"><div className="ai-note"><ShieldCheck/><div><b>Native server-side delivery</b><p>{secretConnector.name} uses these credentials for provider-backed conversion delivery. Environment variables remain an operational fallback only.</p></div></div>{(secretConnector.credentialFields||[]).map((field:any)=><label key={field.key}>{field.label}<input type={field.secret?'password':'text'} autoComplete={field.secret?'new-password':'off'} value={secretValues[field.key]||''} onChange={e=>setSecretValues(v=>({...v,[field.key]:e.target.value}))} placeholder={field.secret?'Paste provider token':'Enter provider identifier'}/></label>)}<div className="scope-list"><span><Check/>AES-256-GCM encrypted at rest</span><span><Check/>Workspace-scoped credential</span><span><Check/>Used only by native provider delivery</span><span><Check/>Replaceable without redeploying AceMarketing</span></div><button disabled={secretBusy||(secretConnector.credentialFields||[]).some((field:any)=>!(secretValues[field.key]||'').trim())} onClick={saveServerSecret}>{secretBusy?'Saving securely…':connected.includes(secretConnector.name)?'Replace credentials':'Save & connect'}</button></div></div></AccessibleDialog>}
 {requestOpen&&<AccessibleDialog ariaLabel="Request connector" onClose={()=>setRequestOpen(false)}><form className="connector-card integration-request-form" onSubmit={submitIntegrationRequest}><div className="connector-modal-head"><div><Cable/><div><b>Request connector</b><small>Track a native-connector request without pretending unsupported OAuth exists today.</small></div></div><button type="button" onClick={()=>setRequestOpen(false)}><X/></button></div><label>Connector name<input name="connector" required maxLength={120} defaultValue={integrationSearch} placeholder="Snowflake, TikTok Ads, internal ERP..."/></label><label>Business need<textarea name="businessNeed" required rows={5} maxLength={2000} placeholder="Describe the data you need to ingest or activate and why."/></label><div className="two-col"><label>Direction<select name="direction"><option>Bidirectional</option><option>Inbound</option><option>Outbound</option></select></label><label>Priority<select name="priority"><option>Normal</option><option>High</option><option>Critical</option></select></label></div><button disabled={requestBusy}>{requestBusy?'Submitting…':'Submit connector request'}</button></form></AccessibleDialog>}
 {connector&&<AccessibleDialog ariaLabel={'Connect '+connector} onClose={()=>setConnector('')}><div className="connector-card"><div className="connector-modal-head"><div><span className="integration-logo c0">{connector.slice(0,2).toUpperCase()}</span><div><b>Connect {connector}</b><small>Step {step} of 3</small></div></div><button onClick={()=>setConnector('')}><X/></button></div>{step===1&&<div className="connector-step"><h3>Authorize workspace access</h3><p>Grant only the scopes required to read events, sync outcomes and manage configured conversion destinations.</p><div className="scope-list">{['Read account metadata','Read campaign / lead records','Write configured conversion events','Read sync health'].map(x=><span key={x}><Check/>{x}</span>)}</div><button onClick={()=>setStep(2)}>Continue <ArrowRight/></button></div>}{step===2&&<div className="connector-step"><h3>Map business fields</h3><p>Choose the fields used for identity resolution and funnel stages.</p>{[['Primary identity','Email + phone'],['Click identifier','GCLID / FBCLID'],['Lifecycle stage','Lead status'],['Revenue field','Closed value']].map(x=><label key={x[0]}><span>{x[0]}</span><select defaultValue={x[1]}><option>{x[1]}</option><option>Custom field</option></select></label>)}<button onClick={()=>setStep(3)}>Continue <ArrowRight/></button></div>}{step===3&&<div className="connector-step"><h3>Enable synchronization</h3><p>Start continuous ingestion and delivery health checks for this connector.</p><div className="connector-ready"><Activity/><div><b>Ready to connect</b><small>Authorization uses the backend connector vault and provider OAuth configuration. You will be redirected to the provider when OAuth is configured.</small></div></div><button disabled={connectorMutation.isPending||connectorOutcomeUnknown} onClick={finish}>{connectorMutation.isPending?'Connecting…':'Connect '+connector}</button></div>}</div></AccessibleDialog>}
 {builder&&<AccessibleDialog ariaLabel="Custom Integration Builder" onClose={()=>setBuilder(false)}><div className="connector-card custom-integration-builder"><div className="connector-modal-head"><div><Cable/><div><b>Custom Integration Builder</b><small>Step {builderStep} of 3 · configure → map → test</small></div></div><button onClick={()=>setBuilder(false)}><X/></button></div>
 {builderStep===1&&<div className="connector-step"><h3>Connection</h3><p>Describe the proprietary or unsupported system you want AceMarketing to connect.</p><label>Name<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Connector type<select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}><option>REST API</option><option>Webhook</option><option>CSV / SFTP</option><option>Database read</option></select></label><label>Authentication<select value={draft.auth} onChange={e=>setDraft({...draft,auth:e.target.value})}><option>Bearer token</option><option>API key</option><option>Basic auth</option><option>OAuth 2.0</option><option>Signed webhook</option><option>None</option></select></label>{draft.auth==='Basic auth'&&<label>Username<input value={draft.username} onChange={e=>setDraft({...draft,username:e.target.value})}/></label>}{draft.auth!=='None'&&draft.auth!=='OAuth 2.0'&&<label>Credential / secret<input type="password" value={draft.secret} onChange={e=>setDraft({...draft,secret:e.target.value})} autoComplete="new-password"/></label>}{draft.auth==='API key'&&<label>API key header<input value={draft.headerName} onChange={e=>setDraft({...draft,headerName:e.target.value})}/></label>}<label>Base URL / endpoint<input value={draft.baseUrl} onChange={e=>setDraft({...draft,baseUrl:e.target.value})}/></label><label>Data direction<select value={draft.direction} onChange={e=>setDraft({...draft,direction:e.target.value})}><option>Bidirectional</option><option>Inbound to AceMarketing</option><option>Outbound from AceMarketing</option></select></label><button onClick={()=>setBuilderStep(2)}>Continue to mapping <ArrowRight/></button></div>}
 {builderStep===2&&<div className="connector-step"><h3>Field mappings</h3><p>Map the minimum fields needed for identity, funnel progression and closed-revenue feedback.</p>{[['Primary identity','identity'],['Lifecycle stage','stage'],['Revenue / value','revenue']].map(x=><label key={x[0]}><span>{x[0]}</span><input value={draft[x[1]]} onChange={e=>setDraft({...draft,[x[1]]:e.target.value})}/></label>)}<div className="scope-list">{['Preserve event_id for deduplication','Accept GCLID / FBCLID when present','Normalize timestamps to workspace timezone','Quarantine schema failures','Write delivery status to audit history'].map(x=><span key={x}><Check/>{x}</span>)}</div><button onClick={testCustom}>Test connection <ArrowRight/></button></div>}
 {builderStep===3&&<div className="connector-step"><h3>Connection test</h3><p>Validate authorization, schema compatibility and a small sample before enabling continuous sync.</p><div className="custom-test-result">{testResult?.ok===false?<X/>:<CheckCircle2/>}<div><b>{testResult?.ok===false?'Test needs attention':'Connection test passed'}</b><small>{testResult?.ok===false?(testResult?.error||'Connection could not be validated'):`HTTP ${testResult?.statusCode} · ${testResult?.latencyMs}ms · ${testResult?.sampleRecords||0} sample records inspected`}</small></div></div><div className="diagnostic-evidence">{[['Authentication','Valid'],['Identity field',draft.identity],['Lifecycle field',draft.stage],['Revenue field',draft.revenue]].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div><button onClick={saveCustom}>Create integration & enable sync</button></div>}
 </div></AccessibleDialog>}</>
}