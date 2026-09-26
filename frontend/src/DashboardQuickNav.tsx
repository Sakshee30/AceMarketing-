import {useEffect,useMemo,useRef,useState} from 'react'
import {api} from './lib/api'
import {
  Activity,BarChart3,Bot,Cable,CalendarDays,ChevronDown,DatabaseZap,Gauge,Network,
  PhoneCall,RefreshCw,Search,Settings2,ShieldCheck,Target,UsersRound,X,Zap
} from 'lucide-react'

type Shortcut = {
  label:string
  tab:string
  icon:any
  description:string
}

type ShortcutGroup = {
  label:string
  description:string
  items:Shortcut[]
}

const groups:ShortcutGroup[]=[
  {
    label:'Start & measure',
    description:'Workspace setup, paid-media signals and funnel health',
    items:[
      {label:'Launchpad',tab:'Launchpad',icon:Zap,description:'Connect systems and finish workspace readiness'},
      {label:'Command Center',tab:'Overview',icon:Gauge,description:'KPIs, revenue signals and operating health'},
      {label:'Ad Sync',tab:'AdSync',icon:Target,description:'Return qualified conversion signals to ad platforms'},
      {label:'ChatGPT Ads',tab:'ChatGPT Ads',icon:Bot,description:'Send server-side conversions with oppref matching and deduplicated event IDs'},
      {label:'Funnel',tab:'Funnel',icon:BarChart3,description:'Inspect stage conversion and drop-off'},
      {label:'Events',tab:'Events',icon:Activity,description:'Manage conversion events and rules'},
      {label:'Adjustments',tab:'Adjustments',icon:Target,description:'Preview and apply governed performance adjustments'},
      {label:'Diagnostics',tab:'Diagnostics',icon:ShieldCheck,description:'Scan tracking and delivery issues'},
      {label:'Reconciliation',tab:'Reconciliation',icon:Activity,description:'Explain conversion gaps and repair unmatched, failed or quarantined evidence'},
      {label:'Fraud',tab:'Fraud',icon:ShieldCheck,description:'Review and block suspicious patterns'},
      {label:'Deep Links',tab:'Deep Links',icon:Network,description:'Manage measurable destination routes'},
      {label:'Sites',tab:'Sites',icon:Network,description:'Configure tracked domains and site health'},
      {label:'Fingerprinting',tab:'Fingerprinting',icon:ShieldCheck,description:'Review privacy-aware identity matching'}
    ]
  },
  {
    label:'Unify & attribute',
    description:'Build the stitched customer journey and revenue truth',
    items:[
      {label:'Live Sync',tab:'Live Sync',icon:Activity,description:'Inspect real-time ingestion activity'},
      {label:'Data Hub',tab:'Data Hub',icon:DatabaseZap,description:'Unified customer and event truth'},
      {label:'Customer 360',tab:'Customer 360',icon:UsersRound,description:'Inspect one stitched customer across identity, lifecycle and interactions'},
      {label:'Offline Attribution',tab:'Offline Attribution',icon:Target,description:'Connect assisted and offline outcomes'},
      {label:'Matchback',tab:'Matchback',icon:Target,description:'Resolve unmatched downstream conversions'},
      {label:'POS & Stores',tab:'POS & Stores',icon:DatabaseZap,description:'Import and attribute store/POS revenue'},
      {label:'Journeys',tab:'Journeys',icon:Network,description:'Customer paths across online and offline touchpoints'},
      {label:'Identity',tab:'Identity',icon:UsersRound,description:'Inspect deterministic identity evidence'},
      {label:'Models',tab:'Models',icon:BarChart3,description:'Configure and validate attribution models'},
      {label:'Attribution',tab:'Attribution',icon:Target,description:'Channel, campaign and revenue credit'},
      {label:'Planner',tab:'Planner',icon:BarChart3,description:'Model budget and growth scenarios'},
      {label:'Reports',tab:'Reports',icon:BarChart3,description:'Operational and scheduled reporting'},
      {label:'Grouped Performance',tab:'Grouped Performance',icon:BarChart3,description:'Group product/category/source performance and optional cost-based contribution'},
      {label:'Executive Briefs',tab:'Executive Briefs',icon:BarChart3,description:'Schedule compact leadership metric snippets and delivery history'}
    ]
  },
  {
    label:'Convert with agents',
    description:'Qualify, enrich, route and follow up every lead',
    items:[
      {label:'Enrich',tab:'Enrich',icon:DatabaseZap,description:'Add acquisition and journey context to CRM leads'},
      {label:'Lead Grading',tab:'Lead Grading',icon:Gauge,description:'Score and prioritize high-intent leads'},
      {label:'Behavior',tab:'Behavior',icon:Activity,description:'Understand lead and customer behavior'},
      {label:'Feed',tab:'Feed',icon:DatabaseZap,description:'Map governed attributes into destinations'},
      {label:'Agents',tab:'Agents',icon:Bot,description:'Manage automated conversion agents'},
      {label:'Routing',tab:'Routing',icon:Network,description:'Route leads using persisted rules'},
      {label:'Follow-ups',tab:'Follow-ups',icon:Activity,description:'Run and complete follow-up tasks'},
      {label:'Calls',tab:'Calls',icon:PhoneCall,description:'Qualification call operations'},
      {label:'Meetings',tab:'Meetings',icon:CalendarDays,description:'Schedule, reschedule and remind leads'},
      {label:'Feedback',tab:'Feedback',icon:Activity,description:'Collect post-interaction feedback'},
      {label:'Approvals',tab:'Approvals',icon:ShieldCheck,description:'Human review for sensitive actions'},
      {label:'Ask Ace',tab:'Ask Ace',icon:Bot,description:'Grounded journey and attribution assistant'}
    ]
  },
  {
    label:'Activate & operate',
    description:'Connect destinations, activate audiences and run the platform safely',
    items:[
      {label:'Integrations',tab:'Integrations',icon:Cable,description:'Ads, CRM, calling, messaging and commerce connectors'},
      {label:'Data Flows',tab:'Data Flows',icon:Network,description:'Build, test and activate source-to-destination sync recipes'},
      {label:'Real-Time Activation',tab:'Real-Time Activation',icon:Zap,description:'Trigger consent-aware signals, routing and follow-up from live events'},
      {label:'Personalization',tab:'Personalization',icon:Zap,description:'Select consent-aware experiences from Customer 360 context'},
      {label:'Exclusions',tab:'Exclusions',icon:ShieldCheck,description:'Suppress converted, low-quality, or known-device audiences from acquisition'},
      {label:'Audiences',tab:'Audiences',icon:UsersRound,description:'Build, preview and activate first-party segments'},
      {label:'Delivery',tab:'Delivery',icon:Activity,description:'Outbound signal queue, retries and dead letters'},
      {label:'Monitoring',tab:'Monitoring',icon:Activity,description:'Reliability, usage and operational health'},
      {label:'Alerts',tab:'Alerts',icon:ShieldCheck,description:'Triage live incidents and threshold breaches'},
      {label:'Compliance',tab:'Compliance',icon:ShieldCheck,description:'Operate consent, subject rights, retention and privacy safeguards'},
      {label:'Developers',tab:'Developers',icon:Cable,description:'API keys, webhooks and delivery contracts'},
      {label:'Settings',tab:'Settings',icon:Settings2,description:'Workspace, access, governance and billing'}
    ]
  }
]

export default function DashboardQuickNav(){
  const [visible,setVisible]=useState(()=>typeof window!=='undefined'&&window.location.hash.startsWith('#/workspace'))
  const [open,setOpen]=useState(false)
  const [compact,setCompact]=useState(()=>typeof window!=='undefined'&&window.localStorage.getItem('ace_quick_nav_compact')==='true')
  const [query,setQuery]=useState('')
  const [summary,setSummary]=useState<any>(null)
  const [statusError,setStatusError]=useState('')
  const [statusLoading,setStatusLoading]=useState(false)
  const [lastUpdated,setLastUpdated]=useState<Date|null>(null)
  const searchRef=useRef<HTMLInputElement|null>(null)

  useEffect(()=>{
    const sync=()=>{
      const inWorkspace=window.location.hash.startsWith('#/workspace')
      setVisible(inWorkspace)
      if(!inWorkspace){setOpen(false);setQuery('')}
    }
    window.addEventListener('hashchange',sync)
    return()=>window.removeEventListener('hashchange',sync)
  },[])

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if(!visible)return
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault()
        setOpen(true)
        requestAnimationFrame(()=>searchRef.current?.focus())
      }
      if(event.key==='Escape')setOpen(false)
    }
    window.addEventListener('keydown',onKey)
    return()=>window.removeEventListener('keydown',onKey)
  },[visible])

  useEffect(()=>{
    if(open)requestAnimationFrame(()=>searchRef.current?.focus())
  },[open])

  const refreshSummary=async()=>{
    setStatusLoading(true)
    try{
      const next=await api.dashboardSummary()
      setSummary(next)
      setStatusError('')
      setLastUpdated(new Date())
    }catch(error){
      setStatusError(error instanceof Error?error.message:'Unable to refresh workspace status')
    }finally{
      setStatusLoading(false)
    }
  }

  useEffect(()=>{
    if(!visible)return
    let active=true
    const load=async()=>{
      try{
        const next=await api.dashboardSummary()
        if(!active)return
        setSummary(next)
        setStatusError('')
        setLastUpdated(new Date())
      }catch(error){
        if(!active)return
        setStatusError(error instanceof Error?error.message:'Unable to refresh workspace status')
      }
    }
    load()
    const timer=window.setInterval(load,30000)
    return()=>{
      active=false
      window.clearInterval(timer)
    }
  },[visible])

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase()
    if(!q)return groups
    return groups.map(group=>({
      ...group,
      items:group.items.filter(item=>
        item.label.toLowerCase().includes(q)||
        item.tab.toLowerCase().includes(q)||
        item.description.toLowerCase().includes(q)||
        group.label.toLowerCase().includes(q)
      )
    })).filter(group=>group.items.length)
  },[query])

  const resultCount=filtered.reduce((sum,group)=>sum+group.items.length,0)
  const totals=summary?.totals||{}
  const sections=summary?.sections||{}

  const jump=(tab:string)=>{
    window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:tab}))
    setOpen(false)
    setQuery('')
    window.scrollTo({top:0,behavior:'smooth'})
  }

  const toggleCompact=()=>{
    const next=!compact
    setCompact(next)
    window.localStorage.setItem('ace_quick_nav_compact',String(next))
  }

  if(!visible)return null
  return <div className={'ace-quick-nav '+(compact?'compact':'')}>
    <button className="ace-quick-nav-trigger" onClick={()=>setOpen(x=>!x)} aria-expanded={open} aria-label="Open dashboard section navigator">
      <span className="ace-quick-nav-pulse"/>
      <b>{compact?'Navigate':'Dashboard navigator'}</b>
      {!compact&&<kbd>Ctrl K</kbd>}
      <ChevronDown className={open?'open':''}/>
    </button>
    {open&&<div className="ace-quick-nav-menu" role="dialog" aria-modal="false" aria-label="Dashboard section navigator">
      <div className="ace-quick-nav-head">
        <div><b>Jump to any workspace section</b><span>Search the complete dashboard and open a feature directly.</span></div>
        <button onClick={()=>setOpen(false)} aria-label="Close dashboard navigator"><X/></button>
      </div>
      <div className="ace-quick-nav-status" aria-label="Live workspace status">
        <div className="ace-quick-nav-readiness"><span><i style={{width:(summary?.readiness||0)+'%'}}/></span><div><b>{summary?summary.readiness+'%':'—'}</b><small>workspace readiness</small></div></div>
        <div><b>{Number(totals.connectedConnectors||0)}</b><small>connected systems</small></div>
        <div><b>{Number(totals.openAlerts||0)}</b><small>open alerts</small></div>
        <div className={Number(totals.failedDeliveries||0)>0?'attention':''}><b>{Number(totals.failedDeliveries||0)}</b><small>failed deliveries</small></div>
        {statusError&&<span className="ace-quick-nav-status-error">{statusError}</span>}
      </div>
      <div className="ace-quick-nav-search">
        <Search/>
        <input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search attribution, calls, audiences, settings..." aria-label="Search dashboard sections"/>
        <span>{resultCount} {resultCount===1?'result':'results'}</span>
      </div>
      <div className="ace-quick-nav-groups">
        {filtered.map(group=><section key={group.label}>
          <div className="ace-quick-nav-group-title"><div><h4>{group.label}</h4><p>{group.description}</p></div><span>{group.items.length}</span></div>
          <div className="ace-quick-nav-items">
            {group.items.map(item=>{const Icon=item.icon;const section=sections[item.tab];return <button key={item.tab} onClick={()=>jump(item.tab)}>
              <span><Icon/></span>
              <div><b>{item.label}{section&&<em className={'ace-section-state '+String(section.state||'setup')} title={section.detail||''}>{section.state==='live'?'Live':section.state==='attention'?'Needs setup':'Setup'}</em>}</b><small>{item.description}</small>{section&&<small className="ace-section-detail">{section.detail}</small>}</div>
            </button>})}
          </div>
        </section>)}
        {!filtered.length&&<div className="ace-quick-nav-empty"><Search/><b>No matching dashboard section</b><span>Try terms such as attribution, CRM, calls, monitoring or settings.</span></div>}
      </div>
      <div className="ace-quick-nav-footer">
        <span>
          Live readiness and operational counts refresh every 30 seconds.
          {lastUpdated&&<small> Last updated {lastUpdated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}.</small>}
        </span>
        <div className="ace-quick-nav-footer-actions">
          <button onClick={refreshSummary} disabled={statusLoading} aria-label="Refresh live workspace status">
            <RefreshCw className={statusLoading?'spinning':''}/>{statusLoading?'Refreshing':'Refresh status'}
          </button>
          <button onClick={toggleCompact}>{compact?'Show full label':'Use compact mode'}</button>
        </div>
      </div>
    </div>}
  </div>
}
