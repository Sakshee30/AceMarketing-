import {useEffect,useState} from 'react'
import {Bot,Cable,CheckCircle2,DatabaseZap,RadioTower,ShieldCheck,UsersRound,Zap} from 'lucide-react'
import {settingsApi as api} from '../data/settings.api'
import {SettingsStat as Stat} from '../ui/SettingsPrimitives'

export function BillingUsageSettings(){
 const [data,setData]=useState<any>(null)
 const [subscription,setSubscription]=useState<any>(null)
 const [billingBusy,setBillingBusy]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<{kind:'ok'|'error'|'',text:string}>({kind:'',text:''})
 const load=async()=>{
  setLoading(true);setNotice({kind:'',text:''})
  try{
   const [usage,sub]:any=await Promise.all([api.billingUsage(),api.subscription()])
   setData(usage);setSubscription(sub)
  }catch(e:any){
   setNotice({kind:'error',text:e?.message||'Billing and usage data could not be loaded. Existing values were preserved.'})
  }finally{setLoading(false)}
 }
 useEffect(()=>{load()},[])
 const openPortal=async()=>{
  setBillingBusy('portal');setNotice({kind:'',text:''})
  try{
   const r:any=await api.createBillingPortal()
   if(!r?.url)throw new Error('Billing provider did not return a portal URL.')
   window.location.href=r.url
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Billing portal could not be opened.'})}
  finally{setBillingBusy('')}
 }
 const startCheckout=async()=>{
  const plan=subscription?.planCode||data?.planCode
  if(!plan){setNotice({kind:'error',text:'No configured plan is available for checkout.'});return}
  setBillingBusy('checkout');setNotice({kind:'',text:''})
  try{
   const r:any=await api.createBillingCheckout(plan)
   if(!r?.url)throw new Error('Billing provider did not return a checkout URL.')
   window.location.href=r.url
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Checkout could not be started.'})}
  finally{setBillingBusy('')}
 }
 const rows=[
  ['Tracked events','tracked_events',Zap],
  ['Assisted events','assisted_events',DatabaseZap],
  ['Signal dispatches','signal_dispatches',RadioTower],
  ['Agent actions','agent_actions',Bot],
  ['Audience syncs','audience_syncs',UsersRound],
  ['Custom integration tests','custom_integration_tests',Cable]
 ]
 return <div className="settings-detail"><div className="panel-head"><div><h3>Billing & usage</h3><p>Usage is measured from successful workspace operations. Limits are enforced before expensive actions are accepted.</p></div><button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh usage'}</button></div>
 {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}>{notice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}<span>{notice.text}</span></div>}
 <div className="billing-plan-summary"><div><span>Plan</span><b>{loading&&!data?'Loading…':data?.planCode||'usage'}</b></div><div><span>Status</span><b>{loading&&!data?'Loading…':data?.status||'Unavailable'}</b></div><div><span>Current period</span><b>{data?.periodStart&&data?.periodEnd?new Date(data.periodStart).toLocaleDateString()+' – '+new Date(data.periodEnd).toLocaleDateString():'—'}</b></div><div><span>Payments</span><b>{loading&&!subscription?'Loading…':subscription?.providerConfigured?(subscription?.paymentConfigured?'Provider connected':'Provider configured'):'Credentials deferred'}</b></div></div>
 {subscription?.providerConfigured&&<div className="approval-actions">{subscription?.paymentConfigured?<button onClick={openPortal} disabled={!!billingBusy}>{billingBusy==='portal'?'Opening…':'Manage billing'}</button>:<button onClick={startCheckout} disabled={!!billingBusy}>{billingBusy==='checkout'?'Opening…':'Start checkout for configured plan'}</button>}</div>}
 <div className="stats-grid compact">{rows.map(([label,key,Icon]:any)=>{const x=data?.usage?.[key];return <Stat key={key} label={label} value={x?Number(x.used||0).toLocaleString('en-IN'):'—'} sub={x?(x.limit===0?'Unlimited':String(x.percent||0)+'% of '+Number(x.limit||0).toLocaleString('en-IN')):(loading?'Loading usage':'Usage unavailable')} Icon={Icon}/>})}</div>
 <h4>Entitlement details</h4>{rows.map(([label,key]:any)=>{const x=data?.usage?.[key];const pct=Math.max(0,Math.min(100,Number(x?.percent||0)));return <div className="setting-line" key={key}><span>{label}</span><b>{x?x.limit===0?'Unlimited':Number(x.limit||0).toLocaleString('en-IN'):'—'}</b><div className="progress"><i style={{width:pct+'%'}}/></div><em>{x?Number(x.remaining||0).toLocaleString('en-IN')+' remaining':'—'}</em></div>})}
 <div className="source-conflict-note"><ShieldCheck/><div><b>Billing boundary</b><p>Usage metering and entitlement enforcement are fully operational without payment credentials. Checkout, card charging and invoice/portal actions activate only after a real billing provider is configured.</p></div></div>
 </div>
}
