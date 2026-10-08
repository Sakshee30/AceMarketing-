// @ts-nocheck
import {Component,lazy,Suspense,useEffect,useMemo,useState} from 'react'
import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {
  Activity,AlertTriangle,ArrowRight,BarChart3,Bell,Bot,Building2,Cable,CalendarDays,Check,CheckCircle2,ChevronDown,
  CircleDollarSign,Code2,DatabaseZap,Gauge,Globe2,Headphones,Layers3,Menu,MessageCircle,MessageSquareText,
  MousePointer2,Network,PhoneCall,PhoneIncoming,PieChart,Plus,RadioTower,RefreshCw,Search,Settings2,ShieldCheck,
  Sparkles,Table2,Target,UsersRound,WandSparkles,X,Zap
} from 'lucide-react'
import '../ace-platform.css'
import '../workspace-design.css'
import {api,cancelWorkspaceRequests} from '../lib/api'
import {RouteAnnouncer} from '../components/system/FrontendFoundation'
import {LoadingState} from '../components/system/FrontendStates'
import {confirmDiscardDirtyWork} from '../lib/dirty-work'
import {buildWorkspaceHash,parseWorkspaceIdFromHash,parseWorkspaceTabFromHash,workspaceFeatureByLabel} from '../features/workspace/manifest'
import {AccessibleDialog} from '../components/system/AccessibleDialog'
import {getSessionGeneration} from '../../../packages/client-core/src/session-authority'
import {customerQueryKeys,currentWorkspaceScopeId,customerRetryDelay,shouldRetryCustomerRead} from '../../../packages/client-core/src/query-scope'

type AppTab='Launchpad'|'Overview'|'Boards'|'AdSync'|'ChatGPT Ads'|'Funnel'|'Leak Monitor'|'Events'|'Adjustments'|'Diagnostics'|'Match Quality'|'Reconciliation'|'Fraud'|'Deep Links'|'Sites'|'Fingerprinting'|'Live Sync'|'Data Hub'|'Customer 360'|'Offline Attribution'|'Matchback'|'POS & Stores'|'Journeys'|'Identity'|'Models'|'AI Intelligence'|'Attribution'|'Planner'|'Reports'|'Grouped Performance'|'Executive Briefs'|'Enrich'|'Lead Grading'|'Behavior'|'Feed'|'Agents'|'Routing'|'Follow-ups'|'Calls'|'Meetings'|'Feedback'|'Approvals'|'Ask Ace'|'Integrations'|'Data Flows'|'Real-Time Activation'|'Personalization'|'Exclusions'|'Audiences'|'Delivery'|'Monitoring'|'Alerts'|'Compliance'|'Developers'|'Settings'

const Launchpad=lazy(()=>import('../features/launchpad/public'))
const Overview=lazy(()=>import('../features/overview/public'))
const Boards=lazy(()=>import('../../customer-app/src/features/boards/pages/boards/BoardsPage'))
const AdSync=lazy(()=>import('../features/adsync/public'))
const ChatGPTAds=lazy(()=>import('../features/chatgpt-ads/public'))
const Funnel=lazy(()=>import('../features/funnel/public'))
const LeakMonitor=lazy(()=>import('../features/leak-monitor/public'))
const Events=lazy(()=>import('../features/events/public'))
const DeepLinks=lazy(()=>import('../features/deep-links/public'))
const Sites=lazy(()=>import('../features/sites/public'))
const Fingerprinting=lazy(()=>import('../features/fingerprinting/public'))
const LiveSync=lazy(()=>import('../features/live-sync/public'))
const DataHub=lazy(()=>import('../features/data-hub/public'))
const Customer360=lazy(()=>import('../features/customer-360/public'))
const OfflineAttribution=lazy(()=>import('../features/offline-attribution/public'))
const Matchback=lazy(()=>import('../features/matchback/public'))
const POSAndStores=lazy(()=>import('../features/pos-stores/public'))
const Journeys=lazy(()=>import('../features/journeys/public'))
const Identity=lazy(()=>import('../features/identity/public'))
const Attribution=lazy(()=>import('../features/attribution/public'))
const GroupedPerformance=lazy(()=>import('../features/grouped-performance/public'))
const Enrich=lazy(()=>import('../features/enrich/public'))
const LeadGrading=lazy(()=>import('../features/lead-grading/public'))
const Behavior=lazy(()=>import('../features/behavior/public'))
const Feed=lazy(()=>import('../features/feed/public'))
const Agents=lazy(()=>import('../features/agents/public'))
const Routing=lazy(()=>import('../features/routing/public'))
const AskAce=lazy(()=>import('../features/ask-ace/public'))
const Feedback=lazy(()=>import('../features/feedback/public'))
const FollowUps=lazy(()=>import('../features/follow-ups/public'))
const Calls=lazy(()=>import('../features/calls/public'))
const Meetings=lazy(()=>import('../features/meetings/public'))
const Approvals=lazy(()=>import('../features/approvals/public'))
const Monitoring=lazy(()=>import('../features/monitoring/public'))
const Alerts=lazy(()=>import('../features/alerts/public'))
const Reports=lazy(()=>import('../features/reports/public'))
const ExecutiveBriefs=lazy(()=>import('../features/executive-briefs/public'))
const Integrations=lazy(()=>import('../features/integrations/public'))
const DataFlows=lazy(()=>import('../features/data-flows/public'))
const Audiences=lazy(()=>import('../features/audiences/public'))
const Planner=lazy(()=>import('../features/planner/public'))
const Models=lazy(()=>import('../features/models/public'))
const Intelligence=lazy(()=>import('../features/intelligence/public'))
const Settings=lazy(()=>import('../features/settings/public'))
const Compliance=lazy(()=>import('../features/compliance/public'))
const Developers=lazy(()=>import('../features/developers/public'))
const DeliveryCenter=lazy(()=>import('../features/delivery/public'))
const RealTimeActivation=lazy(()=>import('../features/real-time-activation/public'))
const Personalization=lazy(()=>import('../features/personalization/public'))
const Exclusions=lazy(()=>import('../features/exclusions/public'))
const Adjustments=lazy(()=>import('../features/adjustments/public'))
const Diagnostics=lazy(()=>import('../features/diagnostics/public'))
const MatchQuality=lazy(()=>import('../features/match-quality/public'))
const Reconciliation=lazy(()=>import('../features/reconciliation/public'))
const Fraud=lazy(()=>import('../features/fraud/public'))

function Brand(){
  return <div className="ace-brand"><span className="ace-mark"><i/><i/><i/></span><b>AceMarketing</b></div>
}

const appTabs=[
 ['Launchpad',WandSparkles],['Overview',Gauge],['Boards',Table2],['AdSync',RadioTower],['ChatGPT Ads',Bot],['Funnel',BarChart3],['Leak Monitor',AlertTriangle],['Events',Zap],['Adjustments',CircleDollarSign],['Diagnostics',ShieldCheck],['Match Quality',Gauge],['Reconciliation',Activity],['Fraud',ShieldCheck],['Deep Links',Network],['Sites',Globe2],['Fingerprinting',MousePointer2],['Live Sync',Activity],['Data Hub',DatabaseZap],['Customer 360',UsersRound],['Offline Attribution',PhoneCall],['Matchback',CircleDollarSign],['POS & Stores',Building2],['Journeys',Network],['Identity',UsersRound],['Models',Target],['AI Intelligence',Bot],['Attribution',PieChart],['Planner',CircleDollarSign],['Reports',BarChart3],['Grouped Performance',Table2],['Executive Briefs',MessageSquareText],['Enrich',DatabaseZap],['Lead Grading',Target],['Behavior',MousePointer2],['Feed',Layers3],['Agents',Bot],['Routing',Network],['Follow-ups',MessageCircle],['Calls',PhoneIncoming],['Meetings',CalendarDays],['Feedback',MessageSquareText],['Approvals',CheckCircle2],['Ask Ace',Sparkles],['Integrations',Cable],['Data Flows',Network],['Real-Time Activation',Zap],['Personalization',Sparkles],['Exclusions',ShieldCheck],['Audiences',UsersRound],['Delivery',RadioTower],['Monitoring',Activity],['Alerts',Bell],['Compliance',ShieldCheck],['Developers',Code2],['Settings',Settings2]

] as const
const dashboardSections=[
 {id:'workspace',label:'Workspace',icon:Gauge,tabs:['Overview','Launchpad','Boards']},
 {id:'tracking',label:'Tracking & Data',icon:DatabaseZap,tabs:['AdSync','ChatGPT Ads','Funnel','Leak Monitor','Events','Adjustments','Diagnostics','Match Quality','Reconciliation','Fraud','Deep Links','Sites','Fingerprinting','Live Sync','Data Hub','Customer 360','Offline Attribution','Matchback','POS & Stores']},
 {id:'measurement',label:'Measurement & Intelligence',icon:PieChart,tabs:['Journeys','Identity','Models','AI Intelligence','Attribution','Planner','Reports','Grouped Performance','Executive Briefs']},
 {id:'conversion',label:'Lead & Conversion',icon:Target,tabs:['Enrich','Lead Grading','Behavior','Feed','Agents','Routing','Follow-ups','Calls','Meetings','Feedback','Approvals','Ask Ace']},
 {id:'activation',label:'Activation & Integrations',icon:RadioTower,tabs:['Integrations','Data Flows','Real-Time Activation','Personalization','Exclusions','Audiences','Delivery']},
 {id:'operations',label:'Operations & Developer',icon:Activity,tabs:['Monitoring','Alerts','Compliance','Developers','Settings']}
] as const
const tabMeta=Object.fromEntries(appTabs.map(([name,Icon])=>[name,{Icon}])) as Record<string,{Icon:any}>
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}
function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}</div>}

export default function CustomerWorkspace({back}:{back:()=>void}){
 const [queryClient]=useState(()=>new QueryClient({
  defaultOptions:{
   queries:{
    retry:shouldRetryCustomerRead,
    retryDelay:customerRetryDelay,
    refetchOnWindowFocus:true,
    refetchOnReconnect:true,
    refetchInterval:import.meta.env.DEV?5_000:false,
    refetchIntervalInBackground:false,
    gcTime:5*60*1000
   }
  }
 }))
 useEffect(()=>()=>queryClient.clear(),[queryClient])
 useEffect(()=>{
  const onSessionState=async(event:any)=>{
   if(event?.detail?.state!=='anonymous')return
   await queryClient.cancelQueries()
   queryClient.clear()
  }
  window.addEventListener('ace-session-state',onSessionState as EventListener)
  return()=>window.removeEventListener('ace-session-state',onSessionState as EventListener)
 },[queryClient])
 return <QueryClientProvider client={queryClient}><CustomerWorkspaceShell back={back} queryClient={queryClient}/></QueryClientProvider>
}

function CustomerWorkspaceShell({back,queryClient}:{back:()=>void;queryClient:QueryClient}){
 const [workspaceScopeId,setWorkspaceScopeId]=useState(()=>{
  const routed=parseWorkspaceIdFromHash(window.location.hash)
  const existing=window.localStorage.getItem('ace_workspace_id')||'ws_default'
  const resolved=routed||existing
  window.localStorage.setItem('ace_workspace_id',resolved)
  return resolved
 })
 const [tab,setTab]=useState<AppTab>(()=>{const routed=parseWorkspaceTabFromHash(window.location.hash) as AppTab|null;const saved=window.localStorage.getItem('ace_active_tab') as AppTab|null;return routed||(saved&&appTabs.some(([name])=>name===saved)?saved:'Overview')})
 const [workspaceOpen,setWorkspaceOpen]=useState(false)
 const [mobileNavOpen,setMobileNavOpen]=useState(false)
 const [workspace,setWorkspace]=useState('')
 const [workspaceGeneration,setWorkspaceGeneration]=useState(0)
 const [sessionUser,setSessionUser]=useState<any>(null)
 const [workspaceSettings,setWorkspaceSettings]=useState<any>(null)
 const [workspaceTransition,setWorkspaceTransition]=useState<any>(null)
 const [workspaces,setWorkspaces]=useState<any[]>([])
 const [createOpen,setCreateOpen]=useState(false)
 const [workspaceDraft,setWorkspaceDraft]=useState({name:'',environment:'Production'})
 const [workspaceBusy,setWorkspaceBusy]=useState(false)
 const [workspaceCreateError,setWorkspaceCreateError]=useState('')
 const [search,setSearch]=useState('')
 const [regionOpen,setRegionOpen]=useState(false)
 const [navOpen,setNavOpen]=useState<Record<string,boolean>>(()=>{
  const activeSection=dashboardSections.find(section=>section.tabs.includes(tab as any))?.id||'workspace'
  return Object.fromEntries(dashboardSections.map(section=>[section.id,section.id===activeSection]))
 })
 const [navFilter,setNavFilter]=useState('')
 const [sectionSummary,setSectionSummary]=useState<any>(null)
 const syncTabRoute=(next:AppTab,replace=false)=>{
  const feature=workspaceFeatureByLabel.get(next)
  if(!feature)return
  const scopedHash=buildWorkspaceHash(feature.label,workspaceScopeId)
  if(replace)window.history.replaceState(null,'',scopedHash)
  else window.history.pushState(null,'',scopedHash)
 }
 const navigateToTab=(next:AppTab,replace=false)=>{
  if(next===tab){setMobileNavOpen(false);return true}
  if(!confirmDiscardDirtyWork(next))return false
  setTab(next)
  setMobileNavOpen(false)
  syncTabRoute(next,replace)
  return true
 }
 const leaveWorkspace=()=>{
  if(confirmDiscardDirtyWork('the public website'))back()
 }
 useEffect(()=>{
  let active=true
  setSessionUser(null)
  setWorkspaceSettings(null)
  void Promise.all([api.me(),api.settings()]).then(([session,settings]:any[])=>{
   if(active){setSessionUser(session.user||null);setWorkspaceSettings(settings)}
  }).catch(()=>null)
  return()=>{active=false}
 },[workspaceGeneration])
 useEffect(()=>{
  let active=true
  queryClient.fetchQuery({
   queryKey:customerQueryKeys.workspaces(getSessionGeneration()),
   queryFn:({signal})=>api.workspaces({signal}),
   staleTime:60_000
  }).then((r:any)=>{
   if(!active)return
   const items=Array.isArray(r.items)?r.items:[]
   setWorkspaces(items)
   const selected=items.find((item:any)=>String(item.id||'')===String(workspaceScopeId))||items[0]
   setWorkspace(selected?.name||'')
  }).catch(()=>{if(active){setWorkspaces([]);setWorkspace('')}})
  return()=>{active=false}
 },[queryClient])
 useEffect(()=>{
  let active=true
  const load=()=>queryClient.fetchQuery({
   queryKey:customerQueryKeys.dashboard(getSessionGeneration(),currentWorkspaceScopeId(),workspaceGeneration),
   queryFn:({signal})=>api.dashboardSummary({signal}),
   staleTime:15_000
  }).then((r:any)=>{if(active)setSectionSummary(r)}).catch(()=>null)
  void load()
  const id=window.setInterval(()=>void load(),30_000)
  return()=>{active=false;window.clearInterval(id)}
 },[workspaceGeneration,queryClient])
 useEffect(()=>{window.localStorage.setItem('ace_active_tab',tab)},[tab])
 useEffect(()=>{window.localStorage.setItem('ace_nav_sections',JSON.stringify(navOpen))},[navOpen])
 useEffect(()=>{const section=dashboardSections.find(s=>s.tabs.includes(tab as any));if(section&&!navOpen[section.id])setNavOpen(Object.fromEntries(dashboardSections.map(item=>[item.id,item.id===section.id])))},[tab])
 useEffect(()=>{const openTab=(event:any)=>{const next=event?.detail as AppTab;if(appTabs.some(([name])=>name===next))navigateToTab(next)};window.addEventListener('ace-app-tab',openTab as EventListener);return()=>window.removeEventListener('ace-app-tab',openTab as EventListener)},[tab])

 const chooseWorkspace=async(x:any)=>{
  if(!x||x.name===workspace){setWorkspaceOpen(false);return}
  if(!confirmDiscardDirtyWork('workspace '+String(x.name||'')))return
  setWorkspaceOpen(false)
  if(!x.id){
   setWorkspaceTransition({state:'error',item:x,message:'This workspace does not have a persisted backend identity yet.'})
   return
  }
  const previousId=window.localStorage.getItem('ace_workspace_id')
  setWorkspaceTransition({state:'resolving',item:x,message:'Verifying workspace access and loading a clean scope…'})
  await queryClient.cancelQueries()
  queryClient.clear()
  cancelWorkspaceRequests('workspace_scope_changed')
  let switched=false
  try{
   await api.switchWorkspace(String(x.id))
   switched=true
   const summary:any=await queryClient.fetchQuery({
    queryKey:customerQueryKeys.dashboard(getSessionGeneration(),String(x.id),workspaceGeneration+1),
    queryFn:({signal})=>api.dashboardSummary({signal}),
    staleTime:0
   })
   setSectionSummary(summary)
   setWorkspace(x.name)
   setWorkspaceScopeId(String(x.id))
   setWorkspaceGeneration(g=>g+1)
   window.history.replaceState(null,'',buildWorkspaceHash(tab,String(x.id)))
   setWorkspaceTransition(null)
  }catch(e:any){
   if(switched&&previousId&&previousId!==String(x.id)){
    try{await api.switchWorkspace(previousId)}catch{}
   }
   if(previousId){window.localStorage.setItem('ace_workspace_id',previousId);setWorkspaceScopeId(previousId)}
   else window.localStorage.removeItem('ace_workspace_id')
   queryClient.clear()
   setWorkspaceTransition({state:'error',item:x,message:e?.message||'The target workspace could not be verified. Your previous workspace remains active.'})
  }
 }
 const createWorkspace=async()=>{
  const name=workspaceDraft.name.trim()
  if(name.length<2){setWorkspaceCreateError('Workspace name must contain at least 2 characters.');return}
  setWorkspaceCreateError('')
  setWorkspaceBusy(true)
  try{
   const item:any=await api.createWorkspace({...workspaceDraft,name})
   setWorkspaces(xs=>[...xs,item])
   setCreateOpen(false);setWorkspaceDraft({name:'',environment:'Production'})
   await chooseWorkspace(item)
  }catch(error:any){
   setWorkspaceCreateError(error?.message||'Workspace could not be created. Please try again.')
  }finally{setWorkspaceBusy(false)}
 }
 useEffect(()=>{
  const syncFromHistory=()=>{
   const nextTab=parseWorkspaceTabFromHash(window.location.hash) as AppTab|null
   const nextWorkspaceId=parseWorkspaceIdFromHash(window.location.hash)
   if(nextWorkspaceId&&nextWorkspaceId!==workspaceScopeId){
    const target=workspaces.find((item:any)=>String(item.id||'')===nextWorkspaceId)
    if(target){void chooseWorkspace(target);return}
   }
   if(!nextTab||nextTab===tab)return
   if(confirmDiscardDirtyWork(nextTab))setTab(nextTab)
   else syncTabRoute(tab,true)
  }
  window.addEventListener('popstate',syncFromHistory)
  window.addEventListener('hashchange',syncFromHistory)
  return()=>{window.removeEventListener('popstate',syncFromHistory);window.removeEventListener('hashchange',syncFromHistory)}
 },[tab,workspaceScopeId,workspaces])
 const retryWorkspace=()=>workspaceTransition?.item&&chooseWorkspace(workspaceTransition.item)
 const searchMatches=search.trim()?appTabs.filter(([name])=>name.toLowerCase().includes(search.trim().toLowerCase())).slice(0,8):[]
 const runSearch=(name?:string)=>{const target=(name||searchMatches[0]?.[0]) as AppTab|undefined;if(target&&navigateToTab(target))setSearch('')}
 const currentWorkspace=workspaces.find(x=>x.name===workspace)||workspaces[0]
 const displayWorkspace=workspace||currentWorkspace?.name||'Workspace'
 const displayName=String(sessionUser?.name||sessionUser?.email||'Signed-in user')
 const displayRole=String(sessionUser?.role||currentWorkspace?.role||'member').replace(/_/g,' ')
 const displayInitial=displayName.trim().charAt(0).toUpperCase()||'U'
 const displayTimezone=String(workspaceSettings?.timezone||'Not configured')
 const displayCurrency=String(workspaceSettings?.currency||'Not configured')
 const view=useMemo(()=>({Launchpad:<Suspense fallback={<LoadingState compact title="Loading launchpad" description="Loading workspace readiness."/>}><Launchpad/></Suspense>,Overview:<Suspense fallback={<LoadingState compact title="Loading overview" description="Loading acquisition command center."/>}><Overview/></Suspense>,Boards:<Suspense fallback={<LoadingState compact title="Loading boards" description="Loading governed workspace boards."/>}><Boards workspaceId={workspaceScopeId}/></Suspense>,AdSync:<Suspense fallback={<LoadingState compact title="Loading AdSync" description="Loading server-side signal activation."/>}><AdSync/></Suspense>,"ChatGPT Ads":<Suspense fallback={<LoadingState compact title="Loading ChatGPT Ads" description="Loading conversion measurement."/>}><ChatGPTAds/></Suspense>,Funnel:<Suspense fallback={<LoadingState compact title="Loading funnel" description="Loading campaign funnel evidence."/>}><Funnel/></Suspense>,"Leak Monitor":<Suspense fallback={<LoadingState compact title="Loading leak monitor" description="Loading funnel leak evidence."/>}><LeakMonitor/></Suspense>,Events:<Suspense fallback={<LoadingState compact title="Loading events" description="Loading conversion event manager."/>}><Events/></Suspense>,Adjustments:<Suspense fallback={<LoadingState compact title="Loading adjustments" description="Loading the Adjustments feature."/>}><Adjustments/></Suspense>,Diagnostics:<Suspense fallback={<LoadingState compact title="Loading diagnostics" description="Loading the Diagnostics feature."/>}><Diagnostics/></Suspense>,"Match Quality":<Suspense fallback={<LoadingState compact title="Loading match quality" description="Loading the Match Quality feature."/>}><MatchQuality/></Suspense>,Reconciliation:<Suspense fallback={<LoadingState compact title="Loading reconciliation" description="Loading the Reconciliation feature."/>}><Reconciliation/></Suspense>,Fraud:<Suspense fallback={<LoadingState compact title="Loading fraud controls" description="Loading the Fraud feature."/>}><Fraud/></Suspense>,"Deep Links":<Suspense fallback={<LoadingState compact title="Loading deep links" description="Loading app and web route evidence."/>}><DeepLinks/></Suspense>,Sites:<Suspense fallback={<LoadingState compact title="Loading sites" description="Loading site and pixel operations."/>}><Sites/></Suspense>,Fingerprinting:<Suspense fallback={<LoadingState compact title="Loading fingerprinting" description="Loading journey continuity evidence."/>}><Fingerprinting/></Suspense>,"Live Sync":<Suspense fallback={<LoadingState compact title="Loading live sync" description="Loading event-transfer evidence."/>}><LiveSync/></Suspense>,"Data Hub":<Suspense fallback={<LoadingState compact title="Loading Data Hub" description="Loading unified source evidence."/>}><DataHub/></Suspense>,"Customer 360":<Suspense fallback={<LoadingState compact title="Loading Customer 360" description="Loading canonical customer and journey evidence."/>}><Customer360/></Suspense>,"Offline Attribution":<Suspense fallback={<LoadingState compact title="Loading offline attribution" description="Loading assisted conversion and identity evidence."/>}><OfflineAttribution/></Suspense>,Matchback:<Suspense fallback={<LoadingState compact title="Loading matchback" description="Loading revenue reconciliation evidence."/>}><Matchback/></Suspense>,"POS & Stores":<Suspense fallback={<LoadingState compact title="Loading POS & Stores" description="Loading offline transaction evidence."/>}><POSAndStores/></Suspense>,Journeys:<Suspense fallback={<LoadingState compact title="Loading journeys" description="Loading stitched customer journey evidence."/>}><Journeys/></Suspense>,Identity:<Suspense fallback={<LoadingState compact title="Loading identity" description="Loading identity-resolution evidence."/>}><Identity/></Suspense>,Models:<Suspense fallback={<LoadingState compact title="Loading models" description="Loading the Models feature."/>}><Models/></Suspense>,"AI Intelligence":<Suspense fallback={<LoadingState compact title="Loading AI intelligence" description="Loading governed analysis, forecasting, knowledge and model results."/>}><Intelligence/></Suspense>,Attribution:<Suspense fallback={<LoadingState compact title="Loading attribution" description="Loading full-path attribution evidence."/>}><Attribution/></Suspense>,Planner:<Suspense fallback={<LoadingState compact title="Loading planner" description="Loading the Planner feature."/>}><Planner/></Suspense>,Reports:<Suspense fallback={<LoadingState compact title="Loading reports" description="Loading the Reports feature."/>}><Reports/></Suspense>,"Grouped Performance":<Suspense fallback={<LoadingState compact title="Loading grouped performance" description="Loading grouped conversion and contribution evidence."/>}><GroupedPerformance/></Suspense>,"Executive Briefs":<Suspense fallback={<LoadingState compact title="Loading executive briefs" description="Loading the Executive Briefs feature."/>}><ExecutiveBriefs/></Suspense>,Enrich:<Suspense fallback={<LoadingState compact title="Loading CRM enrichment" description="Loading enriched lead evidence."/>}><Enrich/></Suspense>,"Lead Grading":<Suspense fallback={<LoadingState compact title="Loading lead grading" description="Loading persisted score and grade evidence."/>}><LeadGrading/></Suspense>,Behavior:<Suspense fallback={<LoadingState compact title="Loading behavior" description="Loading first-party behavior evidence."/>}><Behavior/></Suspense>,Feed:<Suspense fallback={<LoadingState compact title="Loading feed" description="Loading governed payload mappings and destinations."/>}><Feed/></Suspense>,Agents:<Suspense fallback={<LoadingState compact title="Loading agents" description="Loading governed agent definitions and recent runs."/>}><Agents/></Suspense>,Routing:<Suspense fallback={<LoadingState compact title="Loading routing" description="Loading lead-routing rules and persisted decisions."/>}><Routing/></Suspense>,"Follow-ups":<Suspense fallback={<LoadingState compact title="Loading follow-ups" description="Loading persisted next actions and reactivation evidence."/>}><FollowUps/></Suspense>,Calls:<Suspense fallback={<LoadingState compact title="Loading calls" description="Loading qualification runs and tracked telephony evidence."/>}><Calls/></Suspense>,Meetings:<Suspense fallback={<LoadingState compact title="Loading meetings" description="Loading consultations, calendar state and reminder evidence."/>}><Meetings/></Suspense>,Feedback:<Suspense fallback={<LoadingState compact title="Loading feedback" description="Loading persisted feedback and routing evidence."/>}><Feedback/></Suspense>,Approvals:<Suspense fallback={<LoadingState compact title="Loading approvals" description="Loading the approvals feature."/>}><Approvals/></Suspense>,"Ask Ace":<Suspense fallback={<LoadingState compact title="Loading Ask Ace" description="Loading grounded workspace assistant."/>}><AskAce/></Suspense>,Integrations:<Suspense fallback={<LoadingState compact title="Loading integrations" description="Loading the Integrations feature."/>}><Integrations/></Suspense>,"Data Flows":<Suspense fallback={<LoadingState compact title="Loading data flows" description="Loading the Data Flows feature."/>}><DataFlows/></Suspense>,"Real-Time Activation":<Suspense fallback={<LoadingState compact title="Loading real-time activation" description="Loading the Real-Time Activation feature."/>}><RealTimeActivation/></Suspense>,Personalization:<Suspense fallback={<LoadingState compact title="Loading personalization" description="Loading the Personalization feature."/>}><Personalization/></Suspense>,Exclusions:<Suspense fallback={<LoadingState compact title="Loading exclusions" description="Loading the Exclusions feature."/>}><Exclusions/></Suspense>,Audiences:<Suspense fallback={<LoadingState compact title="Loading audiences" description="Loading the Audiences feature."/>}><Audiences/></Suspense>,Delivery:<Suspense fallback={<LoadingState compact title="Loading delivery" description="Loading the Delivery Center."/>}><DeliveryCenter/></Suspense>,Monitoring:<Suspense fallback={<LoadingState compact title="Loading monitoring" description="Loading the monitoring feature."/>}><Monitoring/></Suspense>,Alerts:<Suspense fallback={<LoadingState compact title="Loading alerts" description="Loading the Alert Center."/>}><Alerts/></Suspense>,Compliance:<Suspense fallback={<LoadingState compact title="Loading compliance" description="Loading the Compliance feature."/>}><Compliance/></Suspense>,Developers:<Suspense fallback={<LoadingState compact title="Loading developers" description="Loading the Developer console."/>}><Developers/></Suspense>,Settings:<Suspense fallback={<LoadingState compact title="Loading settings" description="Loading workspace settings."/>}><Settings/></Suspense>}[tab]),[tab,workspaceGeneration])
 return <div className={'product '+(mobileNavOpen?'mobile-nav-open':'')}><a className="skip-link" href="#ace-workspace-main">Skip to workspace content</a><RouteAnnouncer label={tab+' · '+displayWorkspace} focusSelector=".product-body .page-head h1"/><aside className="product-sidebar" aria-label="Workspace navigation"><Brand/><div className="workspace-wrap"><button className="workspace" onClick={()=>setWorkspaceOpen(!workspaceOpen)}><span>{currentWorkspace?.initials||'AM'}</span><div><b>{displayWorkspace}</b><small>{currentWorkspace?.environment||'Workspace'} environment</small></div><ChevronDown/></button>{workspaceOpen&&<div className="workspace-menu">{workspaces.map((x:any)=><button key={x.id||x.name} onClick={()=>void chooseWorkspace(x)} className={workspace===x.name?'active':''}><span>{x.initials||String(x.name).split(/\s+/).map((s:string)=>s[0]).join('').slice(0,3)}</span><div><b>{x.name}</b><small>{x.environment||'Production'}</small></div>{workspace===x.name&&<Check/>}</button>)}<button className="new-workspace" onClick={()=>{setWorkspaceOpen(false);setCreateOpen(true)}}><Plus/>Create workspace</button></div>}</div><nav className="product-nav" aria-label="Workspace navigation">
 <div className="product-nav-filter"><Search/><input value={navFilter} onChange={e=>setNavFilter(e.target.value)} placeholder="Find feature..."/></div>
 {dashboardSections.map(section=>{
  const SectionIcon=section.icon
  const matching=section.tabs.filter(name=>!navFilter.trim()||name.toLowerCase().includes(navFilter.trim().toLowerCase())||section.label.toLowerCase().includes(navFilter.trim().toLowerCase()))
  if(navFilter.trim()&&!matching.length)return null
  const opened=navFilter.trim()?true:navOpen[section.id]
  return <div className="product-nav-group" key={section.id}>
    <button className="product-nav-group-head" aria-expanded={opened} aria-controls={'nav-group-'+section.id} onClick={()=>setNavOpen(Object.fromEntries(dashboardSections.map(item=>[item.id,item.id===section.id?!opened:false])))}><SectionIcon/><span>{section.label}</span><small>{matching.length}</small><ChevronDown className={opened?'open':''}/></button>
    {opened&&<div className="product-nav-group-items" id={'nav-group-'+section.id}>{matching.map(name=>{const meta=tabMeta[name];const I=meta?.Icon||Activity;return <button key={name} className={tab===name?'active':''} aria-current={tab===name?'page':undefined} onClick={()=>navigateToTab(name as AppTab)} title={name}><I/>{name}{tab===name&&<span className="nav-active-dot"/>}</button>})}</div>}
  </div>
 })}
 </nav><div className="aside-footer"><button onClick={leaveWorkspace}><ArrowRight/>Back to website</button><div className="profile-mini"><span>{displayInitial}</span><div><b>{displayName}</b><small>{displayRole}</small></div></div></div></aside>
 {mobileNavOpen&&<button className="product-mobile-nav-backdrop" aria-label="Close workspace navigation" onClick={()=>setMobileNavOpen(false)}/>}
 <main className="product-main" id="ace-workspace-main"><header className="product-head"><button className="product-mobile-nav-toggle" aria-label="Open workspace navigation" onClick={()=>setMobileNavOpen(true)}><Menu/></button><div className="global-search operational-search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runSearch()} placeholder="Search journeys, leads, campaigns, settings..."/>{searchMatches.length>0&&<div className="global-search-results">{searchMatches.map(([name,I])=><button key={name} onClick={()=>runSearch(name)}><I/><span>{name}</span><ArrowRight/></button>)}</div>}</div><div><button className="sync sync-button" aria-label="Open monitoring center" onClick={()=>navigateToTab('Monitoring')}>● Monitoring</button><button aria-label="Support" onClick={()=>navigateToTab('Settings')} title="Open workspace support/settings"><Headphones/></button><button aria-label="Region and language" onClick={()=>setRegionOpen(x=>!x)}><Globe2/></button><span className="avatar-sm">{displayInitial}</span>{regionOpen&&<div className="region-popover"><b>Workspace locale</b><span>Timezone · {displayTimezone}</span><span>Currency · {displayCurrency}</span><button onClick={()=>{setRegionOpen(false);navigateToTab('Settings')}}>Change in Settings</button></div>}</div></header>
 <div className="product-section-strip" aria-label="Dashboard sections">
  {dashboardSections.map((section:any)=>{
   const Icon=section.icon
   const active=section.tabs.includes(tab as any)
   const area=(sectionSummary?.areas||[]).find((x:any)=>x.key===(section.id==='workspace'?'data':section.id))
   const target=section.id==='workspace'?'Overview':section.tabs[0]
   return <button key={section.id} className={active?'active':''} aria-label={section.label} onClick={()=>navigateToTab(target as AppTab)}><span><Icon/></span><div><b aria-hidden="true">{section.label}</b><small>{area?.ready?'Ready':sectionSummary?'Needs setup':'Checking…'}</small></div><i className={area?.ready?'ready':'setup'}/></button>
  })}
 </div>
 <div className="product-body">{workspaceTransition?<div className={'app-panel workspace-transition '+workspaceTransition.state} role={workspaceTransition.state==='error'?'alert':'status'}><div className="workspace-transition-icon">{workspaceTransition.state==='error'?<AlertTriangle/>:<Activity/>}</div><div><span>{workspaceTransition.state==='error'?'WORKSPACE SWITCH BLOCKED':'SWITCHING WORKSPACE'}</span><h1 tabIndex={-1}>{workspaceTransition.item?.name||'Workspace'}</h1><p>{workspaceTransition.message}</p>{workspaceTransition.state==='resolving'&&<small>Previous workspace content is intentionally hidden until the target scope is confirmed.</small>}</div>{workspaceTransition.state==='error'&&<div className="workspace-transition-actions"><button onClick={()=>setWorkspaceTransition(null)}>Stay in {workspace}</button><button className="app-primary" onClick={retryWorkspace}><RefreshCw/>Retry</button></div>}</div>:<WorkspaceSectionBoundary key={workspaceGeneration+':'+tab} tab={tab}>{view}</WorkspaceSectionBoundary>}</div></main>
 {createOpen&&<AccessibleDialog ariaLabel="Create workspace" onClose={()=>setCreateOpen(false)}><div className="connector-card"><div className="connector-modal-head"><div><Building2/><div><b>Create workspace</b><small>Create a persisted tenant workspace.</small></div></div><button aria-label="Close create workspace dialog" onClick={()=>setCreateOpen(false)}><X/></button></div><div className="connector-step"><label>Workspace name<input value={workspaceDraft.name} onChange={e=>{setWorkspaceDraft({...workspaceDraft,name:e.target.value});setWorkspaceCreateError('')}} placeholder="Ace Retail" aria-describedby="workspace-name-help"/></label><small id="workspace-name-help">Use at least 2 characters.</small><label>Environment<select value={workspaceDraft.environment} onChange={e=>setWorkspaceDraft({...workspaceDraft,environment:e.target.value})}><option>Production</option><option>Sandbox</option></select></label>{workspaceCreateError&&<div className="connector-form-error" role="alert">{workspaceCreateError}</div>}<button disabled={workspaceBusy||workspaceDraft.name.trim().length<2} onClick={createWorkspace}>{workspaceBusy?'Creating…':'Create workspace'}</button></div></div></AccessibleDialog>}
 </div>
}

class WorkspaceSectionBoundary extends Component<any,{error:Error|null}>{
 constructor(props:any){super(props);this.state={error:null}}
 static getDerivedStateFromError(error:Error){return {error}}
 componentDidCatch(error:Error,info:any){
  try{console.error('workspace section failed',this.props?.tab,error,info?.componentStack||'')}catch{}
 }
 componentDidUpdate(prevProps:any){if(prevProps?.tab!==this.props?.tab&&this.state.error)this.setState({error:null})}
 render(){
  if(!this.state.error)return this.props.children
  return <div className="app-panel workspace-section-error" role="alert"><AlertTriangle/><div><h2>{String(this.props?.tab||'Workspace section')} could not render</h2><p>{this.state.error.message||'An unexpected rendering error occurred.'}</p><small>The rest of the dashboard is still available. Retry this section or use the dashboard navigator to continue working.</small></div><button onClick={()=>this.setState({error:null})}><RefreshCw/>Retry section</button></div>
 }
}
