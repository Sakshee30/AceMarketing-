import {useEffect,useState} from 'react'
import {useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,AlertTriangle,Cable,Check,CheckCircle2,ChevronRight,Code2,Plus,RadioTower,RefreshCw,X} from 'lucide-react'
import {developersApi as api} from '../data/developers.api'
import {useDirtyWork} from '../../../lib/dirty-work'
import {FeaturePageHead as PageHead,FeatureStat as Stat} from '../ui/DeveloperPrimitives'

export default function DevelopersPage(){
 const [secret,setSecret]=useState('Hidden until rotated')
 const [delivery,setDelivery]=useState<any[]>([])
 const [endpoints,setEndpoints]=useState<any[]>([])
 const [apiKeys,setApiKeys]=useState<any[]>([])
 const [sdk,setSdk]=useState<'curl'|'node'|'python'>('curl')
 const [builder,setBuilder]=useState(false)
 const [keyBuilder,setKeyBuilder]=useState(false)
 const [createdKey,setCreatedKey]=useState<any>(null)
 const [keyName,setKeyName]=useState('Production ingestion')
 const [endpointDraft,setEndpointDraft]=useState({event:'lead.qualified',url:''})
 const [notice,setNotice]=useState('')
 const [busy,setBusy]=useState('')
 const load=async()=>{
  try{
   const [webhooks,keys]:any[]=await Promise.all([api.webhookDeliveries(),api.apiKeys()])
   setDelivery(webhooks.items||[])
   setEndpoints(webhooks.endpoints||[])
   setApiKeys(keys.items||[])
  }catch(e:any){setNotice(e?.message||'Developer data could not be loaded.')}
 }
 useEffect(()=>{load()},[])
 useDevelopmentLiveRefresh(()=>load())
 const rotate=async()=>{
  setBusy('secret');setNotice('')
  try{const r:any=await api.rotateWebhookSecret();setSecret(r.secret);setNotice('New signing secret generated. Copy it now; only its fingerprint is persisted.')}
  catch(e:any){const cause=String(e?.details?.cause||'');setNotice(cause==='timeout'||cause==='network'?'Webhook secret rotation outcome is unknown. Reconcile the current secret fingerprint before rotating again.':e?.message||'Secret rotation failed.')}
  finally{setBusy('')}
 }
 const retry=async(id:string)=>{
  setBusy(id);setNotice('')
  try{await api.retryWebhook(id);setNotice('Webhook delivery re-queued.');await load()}
  catch(e:any){setNotice(e?.message||'Retry failed.')}
  finally{setBusy('')}
 }
 const addEndpoint=async()=>{
  if(!endpointDraft.event.trim()||!endpointDraft.url.trim())return
  setBusy('endpoint');setNotice('')
  try{await api.createWebhookEndpoint(endpointDraft);setBuilder(false);setEndpointDraft({event:'lead.qualified',url:''});setNotice('Webhook endpoint created.');await load()}
  catch(e:any){const cause=String(e?.details?.cause||'');setNotice(cause==='timeout'||cause==='network'?'Webhook endpoint creation outcome is unknown. Refresh endpoints before submitting the same endpoint again.':e?.message||'Endpoint could not be created.')}
  finally{setBusy('')}
 }
 const createKey=async()=>{
  if(keyName.trim().length<2)return
  setBusy('key');setNotice('')
  try{const r:any=await api.createApiKey({name:keyName.trim()});setCreatedKey(r);setKeyBuilder(false);setKeyName('Production ingestion');setNotice('API key created. Copy it now; the full secret will not be shown again.');await load()}
  catch(e:any){const cause=String(e?.details?.cause||'');setNotice(cause==='timeout'||cause==='network'?'API key creation outcome is unknown. Refresh keys before creating another credential.':e?.message||'API key could not be created.')}
  finally{setBusy('')}
 }
 const revokeKey=async(id:string)=>{
  setBusy('revoke:'+id);setNotice('')
  try{await api.revokeApiKey(id);setNotice('API key revoked. Requests using that key will be rejected.');await load()}
  catch(e:any){const cause=String(e?.details?.cause||'');setNotice(cause==='timeout'||cause==='network'?'API key revocation outcome is unknown. Refresh keys before repeating the revoke action.':e?.message||'API key could not be revoked.')}
  finally{setBusy('')}
 }
 const copy=async(text:string)=>{try{await navigator.clipboard.writeText(text);setNotice('Copied to clipboard.')}catch{setNotice('Clipboard access is unavailable in this browser.')}}
 const snippets:any={
  curl:`curl -X POST "$ACE_API_BASE/api/track" \\\n  -H "Authorization: Bearer $ACE_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"event":"lead.qualified","customerId":"cust_18421","gclid":"gclid_example"}'`,
  node:`await fetch(process.env.ACE_API_BASE + '/api/track', {\n  method: 'POST',\n  headers: { Authorization: 'Bearer ' + process.env.ACE_API_KEY, 'Content-Type': 'application/json' },\n  body: JSON.stringify({ event: 'lead.qualified', customerId: 'cust_18421', gclid: 'gclid_example' })\n})`,
  python:`import os, requests\nrequests.post(os.environ["ACE_API_BASE"] + "/api/track", headers={"Authorization": "Bearer " + os.environ["ACE_API_KEY"]}, json={"event":"lead.qualified","customerId":"cust_18421","gclid":"gclid_example"})`
 }
 const delivered=delivery.filter((x:any)=>String(x.status).toLowerCase()==='delivered').length
 const failed=delivery.filter((x:any)=>String(x.status).toLowerCase()==='failed').length
 const successRate=delivery.length?((delivered/delivery.length)*100).toFixed(1):'—'
 const p95=delivery.length?Math.max(...delivery.map((x:any)=>Number(x.latencyMs||0))):0
 const activeKeys=apiKeys.filter((x:any)=>x.status==='active')
 useDirtyWork({
  key:'developer-console-draft',
  label:'Developer console setup',
  dirty:Boolean(builder||keyBuilder),
  scope:'feature'
 })
 return <><PageHead crumb="Platform / Developers" title="Developer & webhook console" sub="Integrate proprietary systems with managed API keys, signed webhooks and server-to-server event contracts." action="Open API reference" onAction={()=>document.getElementById('api-quick-start')?.scrollIntoView({behavior:'smooth'})}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Active API keys" value={String(activeKeys.length)} sub={apiKeys.length-activeKeys.length+' revoked credentials'} Icon={Code2}/><Stat label="Webhook deliveries" value={String(delivery.length)} sub="Persisted delivery records" Icon={Activity}/><Stat label="Delivery success" value={successRate==='—'?'—':successRate+'%'} sub={failed+' failed deliveries'} Icon={RadioTower}/><Stat label="Active endpoints" value={String(endpoints.filter((x:any)=>x.status==='active').length)} sub="Persisted outbound endpoints" Icon={Cable}/></div>
 <div className="app-panel"><div className="panel-head"><div><h3>API keys</h3><p>Create revocable server credentials for ingestion and proprietary integrations.</p></div><button onClick={()=>setKeyBuilder(true)}><Plus/>Create API key</button></div>
 {activeKeys.length?activeKeys.map((x:any)=><div className="setting-line developer-key-row" key={x.id}><div><span>{x.name}</span><small>{x.prefix}•••• · created {x.createdAt?new Date(x.createdAt).toLocaleDateString():'—'}{x.lastUsedAt?' · last used '+new Date(x.lastUsedAt).toLocaleString():''}</small></div><b>Active</b><button disabled={busy==='revoke:'+x.id} onClick={()=>revokeKey(x.id)}>{busy==='revoke:'+x.id?'Revoking…':'Revoke'}</button></div>):<div className="empty-delivery-state"><Code2/><div><b>No active API keys</b><small>Create a credential before using authenticated server-to-server examples.</small></div></div>}
 {apiKeys.some((x:any)=>x.status==='revoked')&&<details className="developer-revoked-keys"><summary>{apiKeys.filter((x:any)=>x.status==='revoked').length} revoked key(s)</summary>{apiKeys.filter((x:any)=>x.status==='revoked').map((x:any)=><div className="setting-line" key={x.id}><code>{x.prefix}••••</code><b>{x.name}</b><span className="status">revoked</span></div>)}</details>}</div>
 {createdKey&&<div className="app-panel developer-secret-reveal"><div className="panel-head"><div><h3>Copy this key now</h3><p>The complete credential is returned only at creation time.</p></div><button onClick={()=>setCreatedKey(null)}><X/></button></div><div className="api-key-box"><div><span>{createdKey.name}</span><code>{createdKey.key}</code></div><button onClick={()=>copy(createdKey.key)}>Copy key</button></div></div>}
 <div className="two-col"><div className="app-panel" id="api-quick-start"><div className="panel-head"><div><h3>API quick start</h3><p>Authenticated server-to-server event ingestion</p></div><button onClick={()=>copy(snippets[sdk])}>Copy</button></div><div className="code-block"><code>{snippets[sdk]}</code></div><div className="sdk-tabs"><button className={sdk==='curl'?'active':''} onClick={()=>setSdk('curl')}>cURL</button><button className={sdk==='node'?'active':''} onClick={()=>setSdk('node')}>Node.js</button><button className={sdk==='python'?'active':''} onClick={()=>setSdk('python')}>Python</button></div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Webhook signing</h3><p>Verify outbound event authenticity</p></div></div><div className="api-key-box"><div><span>Signing secret</span><code>{secret}</code></div><button disabled={busy==='secret'} onClick={rotate}>{busy==='secret'?'Rotating…':'Rotate secret'}</button></div><div className="setting-line"><span>Signature header</span><b>X-Ace-Signature</b><span className="healthy">HMAC-SHA256</span></div><div className="setting-line"><span>Timestamp header</span><b>X-Ace-Timestamp</b><span className="healthy">Required</span></div><div className="setting-line"><span>Replay tolerance</span><b>5 minutes</b><span className="healthy">Enforced</span></div></div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Webhook endpoints</h3><p>Workspace-specific outbound subscriptions</p></div><button onClick={()=>setBuilder(true)}><Plus/>Add endpoint</button></div>{endpoints.length?endpoints.map((x:any)=><div className="setting-line" key={x.id}><code>{x.event}</code><b>{x.url}</b><span className={x.status==='active'?'healthy':'status'}>{x.status}</span></div>):<div className="empty-delivery-state"><Cable/><div><b>No webhook endpoints yet</b><small>Add an HTTPS endpoint to receive workspace events.</small></div></div>}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Webhook delivery log</h3><p>Inspect persisted status, latency and retry state</p></div><button onClick={load}>Refresh</button></div>{delivery.length?<table><thead><tr><th>Delivery ID</th><th>Event</th><th>HTTP</th><th>Latency</th><th>Status</th><th></th></tr></thead><tbody>{delivery.map((x:any)=><tr key={x.id}><td><code>{x.id}</code></td><td>{x.event}</td><td>{x.statusCode??'—'}</td><td>{x.latencyMs?x.latencyMs+'ms':'—'}</td><td><span className={String(x.status).toLowerCase().replace(' ','-')}>{x.status}</span></td><td>{String(x.status).toLowerCase()!=='delivered'&&<button disabled={busy===x.id} onClick={()=>retry(x.id)}>{busy===x.id?'Queuing…':'Retry'}</button>}</td></tr>)}</tbody></table>:<div className="empty-delivery-state"><RadioTower/><div><b>No webhook deliveries yet</b><small>Delivery history appears after an outbound endpoint receives an event.</small></div></div>}</div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Event catalog</h3><p>Stable contracts for connected systems</p></div></div>{[['lead.created','Lead entered CRM'],['lead.qualified','Qualified outcome'],['consultation.booked','Meeting scheduled'],['revenue.closed','Closed revenue'],['audience.updated','Activation segment changed'],['sync.failed','Connector delivery failure']].map(x=><button className="developer-event-row developer-event-button" key={x[0]} onClick={()=>{setEndpointDraft({event:x[0],url:''});setBuilder(true)}}><code>{x[0]}</code><span>{x[1]}</span><ChevronRight/></button>)}</div><div className="app-panel"><div className="panel-head"><div><h3>Reliability contract</h3><p>Delivery guarantees in the implementation design</p></div></div>{[['Idempotency','event_id required'],['Retries','Exponential backoff'],['Dead-letter queue','After retry exhaustion'],['Observability','Delivery history + alerting'],['Versioning','Stable event schema versions']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><Check/></div>)}</div></div>
 {keyBuilder&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><Code2/><div><b>Create API key</b><small>The secret is revealed once and only its fingerprint is stored.</small></div></div><button onClick={()=>setKeyBuilder(false)}><X/></button></div><div className="connector-step"><label>Credential name<input value={keyName} maxLength={80} onChange={e=>setKeyName(e.target.value)} placeholder="Production ingestion"/></label><button disabled={busy==='key'||keyName.trim().length<2} onClick={createKey}>{busy==='key'?'Creating…':'Create key'}</button></div></div></div>}
 {builder&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><Cable/><div><b>Add outbound webhook</b><small>Subscribe one HTTPS endpoint to one workspace event.</small></div></div><button onClick={()=>setBuilder(false)}><X/></button></div><div className="connector-step"><label>Event<input value={endpointDraft.event} onChange={e=>setEndpointDraft({...endpointDraft,event:e.target.value})}/></label><label>HTTPS endpoint<input placeholder="https://example.com/webhooks/ace" value={endpointDraft.url} onChange={e=>setEndpointDraft({...endpointDraft,url:e.target.value})}/></label><button disabled={busy==='endpoint'||!endpointDraft.event.trim()||!endpointDraft.url.trim()} onClick={addEndpoint}>{busy==='endpoint'?'Creating…':'Create endpoint'}</button></div></div></div>}</>
}
