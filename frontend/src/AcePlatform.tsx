// @ts-nocheck
import {Component,Fragment,lazy,Suspense,useEffect,useMemo,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {
  Activity,AlertTriangle,ArrowRight,BarChart3,Bell,BookOpen,Bot,Building2,Cable,CalendarDays,Check,CheckCircle2,ChevronDown,ChevronRight,
  CircleDollarSign,Code2,DatabaseZap,Filter,Gauge,Globe2,GraduationCap,Headphones,HeartPulse,Home,Landmark,Layers3,Menu,MessageCircle,MessageSquareText,
  MousePointer2,Network,PhoneCall,PhoneIncoming,PhoneOutgoing,PieChart,Plane,Plus,RadioTower,RefreshCw,Search,Settings2,ShieldCheck,ShoppingCart,Store,
  Sparkles,Smartphone,Table2,Target,UsersRound,Video,WandSparkles,X,Zap
} from 'lucide-react'
import './ace-platform.css'
import { api,cancelWorkspaceRequests } from './lib/api'
import {getLocalConsent,saveLocalConsent} from './lib/tracker'
import {RouteAnnouncer} from './components/system/FrontendFoundation'
import {LoadingState} from './components/system/FrontendStates'
import {confirmDiscardDirtyWork,useDirtyWork} from './lib/dirty-work'
import {parseWorkspaceTabFromHash,workspaceFeatureByLabel} from './features/workspace/manifest'
import {AccessibleDialog} from './components/system/AccessibleDialog'

type View='site'|'app'|'login'|'pricing'|'demo'|'company'|'resources'|'case-studies'|'privacy'|'terms'|'security'|'solutions'|'industries'|'agents-public'|'integrations-public'
type AppTab='Launchpad'|'Overview'|'AdSync'|'ChatGPT Ads'|'Funnel'|'Leak Monitor'|'Events'|'Adjustments'|'Diagnostics'|'Match Quality'|'Reconciliation'|'Fraud'|'Deep Links'|'Sites'|'Fingerprinting'|'Live Sync'|'Data Hub'|'Customer 360'|'Offline Attribution'|'Matchback'|'POS & Stores'|'Journeys'|'Identity'|'Models'|'Attribution'|'Planner'|'Reports'|'Grouped Performance'|'Executive Briefs'|'Enrich'|'Lead Grading'|'Behavior'|'Feed'|'Agents'|'Routing'|'Follow-ups'|'Calls'|'Meetings'|'Feedback'|'Approvals'|'Ask Ace'|'Integrations'|'Data Flows'|'Real-Time Activation'|'Personalization'|'Exclusions'|'Audiences'|'Delivery'|'Monitoring'|'Alerts'|'Compliance'|'Developers'|'Settings'

const Launchpad=lazy(()=>import('./features/launchpad/public'))
const Overview=lazy(()=>import('./features/overview/public'))
const AdSync=lazy(()=>import('./features/adsync/public'))
const ChatGPTAds=lazy(()=>import('./features/chatgpt-ads/public'))
const Funnel=lazy(()=>import('./features/funnel/public'))
const LeakMonitor=lazy(()=>import('./features/leak-monitor/public'))
const Events=lazy(()=>import('./features/events/public'))
const DeepLinks=lazy(()=>import('./features/deep-links/public'))
const Sites=lazy(()=>import('./features/sites/public'))
const Fingerprinting=lazy(()=>import('./features/fingerprinting/public'))
const LiveSync=lazy(()=>import('./features/live-sync/public'))
const DataHub=lazy(()=>import('./features/data-hub/public'))
const Customer360=lazy(()=>import('./features/customer-360/public'))
const OfflineAttribution=lazy(()=>import('./features/offline-attribution/public'))
const Matchback=lazy(()=>import('./features/matchback/public'))
const POSAndStores=lazy(()=>import('./features/pos-stores/public'))
const Journeys=lazy(()=>import('./features/journeys/public'))
const Identity=lazy(()=>import('./features/identity/public'))
const Attribution=lazy(()=>import('./features/attribution/public'))
const GroupedPerformance=lazy(()=>import('./features/grouped-performance/public'))
const Enrich=lazy(()=>import('./features/enrich/public'))
const LeadGrading=lazy(()=>import('./features/lead-grading/public'))
const Behavior=lazy(()=>import('./features/behavior/public'))
const Feed=lazy(()=>import('./features/feed/public'))
const Agents=lazy(()=>import('./features/agents/public'))
const Routing=lazy(()=>import('./features/routing/public'))
const AskAce=lazy(()=>import('./features/ask-ace/public'))
const Feedback=lazy(()=>import('./features/feedback/public'))
const FollowUps=lazy(()=>import('./features/follow-ups/public'))
const Calls=lazy(()=>import('./features/calls/public'))
const Meetings=lazy(()=>import('./features/meetings/public'))
const Approvals=lazy(()=>import('./features/approvals/public'))
const Monitoring=lazy(()=>import('./features/monitoring/public'))
const Alerts=lazy(()=>import('./features/alerts/public'))
const Reports=lazy(()=>import('./features/reports/public'))
const ExecutiveBriefs=lazy(()=>import('./features/executive-briefs/public'))
const Integrations=lazy(()=>import('./features/integrations/public'))
const DataFlows=lazy(()=>import('./features/data-flows/public'))
const Audiences=lazy(()=>import('./features/audiences/public'))
const Planner=lazy(()=>import('./features/planner/public'))
const Models=lazy(()=>import('./features/models/public'))
const Settings=lazy(()=>import('./features/settings/public'))
const Compliance=lazy(()=>import('./features/compliance/public'))
const Developers=lazy(()=>import('./features/developers/public'))
const DeliveryCenter=lazy(()=>import('./features/delivery/public'))
const RealTimeActivation=lazy(()=>import('./features/real-time-activation/public'))
const Personalization=lazy(()=>import('./features/personalization/public'))
const Exclusions=lazy(()=>import('./features/exclusions/public'))
const Adjustments=lazy(()=>import('./features/adjustments/public'))
const Diagnostics=lazy(()=>import('./features/diagnostics/public'))
const MatchQuality=lazy(()=>import('./features/match-quality/public'))
const Reconciliation=lazy(()=>import('./features/reconciliation/public'))
const Fraud=lazy(()=>import('./features/fraud/public'))

const agents=[
 ['Meta Advanced CAPI','Return qualified outcomes to Meta server-side with deduplication.','Lead Quality','+25–40% ROAS'],
 ['Google ECL / OCI','Send enhanced and offline conversions back to Google Ads.','Lead Quality','−30–50% CPQL'],
 ['ChatGPT Ads CAPI','Send consent-aware server-side conversion events to ChatGPT Ads with oppref matching.','Lead Quality','First-party measurement'],
 ['Call Tracking Events','Attribute inbound calls to campaign, keyword and creative context.','Lead Quality','+80% call attribution'],
 ['Custom Integration','Connect custom CRMs, ad platforms and internal data sources.','Lead Quality','100% channel mix'],
 ['Lead Grading','Score and prioritize leads from journey and CRM evidence.','Conversion','+40–60% conversion'],
 ['CRM Enrichment','Attach acquisition, behavior and interaction context to each record.','Conversion','−70% research time'],
 ['Voice Lead Qualification','Call inbound leads quickly and qualify intent conversationally.','Conversion','+90% speed-to-lead'],
 ['Voice Scheduler','Book meetings for qualified leads and synchronize calendars.','Conversion','+45% bookings'],
 ['Meeting Reminder','Re-engage scheduled leads before appointments to reduce drop-off.','Conversion','10–25% leads recovered'],
 ['Feedback Agent','Collect post-interaction feedback and surface objections.','Conversion','5× more feedback'],
 ['Ask Ace','Ask journey, funnel and attribution questions in plain language.','Visibility','+20–40% qualified leads']
]
const integrations=['Google Ads','Meta Ads','ChatGPT Ads','LinkedIn Ads','Microsoft Ads','GA4','Zoho CRM','Salesforce','HubSpot','LeadSquared','Meritto','HighLevel','Microsoft Dynamics 365','WhatsApp','WATI','Gupshup','MoEngage','CleverTap','Bitespeed','AiSensy','Exotel','Knowlarity','Tata Tele','MyOperator','Shopify','WooCommerce','Magento','WordPress','Custom Backend']
const industries=[
 ['EdTech','Track the student journey across ads, forms, calls, counsellors and enrolment.'],
 ['FinTech','Connect acquisition and downstream conversion while preserving strict data controls.'],
 ['Healthcare','Measure patient acquisition and engagement with privacy-aware activation.'],
 ['Retail','Unify web, app and offline customer journeys to improve conversion and repeat purchase.'],
 ['Home Improvement','Connect enquiry, call, visit, quotation and booking stages.'],
 ['Travel','Measure discovery through booking across digital and assisted channels.'],
 ['Consumer Goods','Connect media to ecommerce, CRM and offline outcomes.']
]
const caseStudies=[
 ['EdTech','Unified 15+ ad accounts, CRM stages and daily lead imports into one conversion pipeline.','14K+','daily leads processed'],
 ['Healthcare','Connected calls and WhatsApp enquiries back to campaign identifiers.','24×7','offline signal flow'],
 ['High AOV Commerce','Persisted ad click identifiers into WhatsApp and partial-payment journeys.','Full path','click-to-revenue'],
 ['Home Services','Used CRM outcomes and custom events to improve audience quality and suppress junk leads.','Real time','audience activation']
]

function ConsentBanner(){
 const [visible,setVisible]=useState(()=>!getLocalConsent())
 const choose=async(analytics:boolean,marketing:boolean,personalization:boolean)=>{await saveLocalConsent({analytics,marketing,personalization});setVisible(false)}
 if(typeof document==='undefined')return null
 const node=!visible
  ?<button className="consent-manage" onClick={()=>setVisible(true)} aria-label="Manage privacy choices"><ShieldCheck/> Privacy</button>
  :<div className="consent-overlay"><div className="consent-banner" role="dialog" aria-label="Privacy choices"><div className="consent-copy"><ShieldCheck/><div><b>Your privacy choices</b><p>Essential storage is always used for security and core functionality. Analytics, advertising signals and personalization stay off until you choose to enable them.</p></div></div><div className="consent-actions"><button onClick={()=>choose(false,false,false)}>Essential only</button><button onClick={()=>choose(true,false,false)}>Allow analytics</button><button className="primary" onClick={()=>choose(true,true,true)}>Allow all</button></div></div></div>
 return createPortal(node,document.body)
}

function Brand({dark=false}:{dark?:boolean}){
 return <div className={'ace-brand '+(dark?'dark':'')}><span className="ace-mark"><i/><i/><i/></span><b>AceMarketing</b></div>
}

function Header({openHome,openApp,openLogin,openPricing,openDemo,openCompany,openResources,openCaseStudies,openSolutions,openIndustries,openAgents,openIntegrations}:{openHome:()=>void,openApp:()=>void,openLogin:()=>void,openPricing:()=>void,openDemo:()=>void,openCompany:()=>void,openResources:()=>void,openCaseStudies:()=>void,openSolutions:()=>void,openIndustries:()=>void,openAgents:()=>void,openIntegrations:()=>void}){
 const [open,setOpen]=useState(false)
 const [menu,setMenu]=useState<'industries'|'agents'|'resources'|null>(null)
 const [navCopy,setNavCopy]=useState<any>(null)
 const closeMenu=()=>setMenu(null)
 const toggleMenu=(next:'industries'|'agents'|'resources')=>setMenu(current=>current===next?null:next)
 useEffect(()=>{api.publicNavigation().then((r:any)=>setNavCopy(r)).catch(()=>null)},[])
 useEffect(()=>{
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')closeMenu()}
  const onClick=(event:MouseEvent)=>{
   const target=event.target as HTMLElement
   if(!target.closest('.ei-header-shell'))closeMenu()
  }
  document.addEventListener('keydown',onKey)
  document.addEventListener('mousedown',onClick)
  return()=>{document.removeEventListener('keydown',onKey);document.removeEventListener('mousedown',onClick)}
 },[])
 const industryItems:any[]=[
  ['Edtech','Track and activate student data across channels to improve lead quality, personalize outreach, and increase enrollments.',GraduationCap],
  ['Fintech','Enable teams to activate data wherever it lives - while maintaining strict privacy, security, and regulatory compliance.',Landmark],
  ['Healthcare','Activate PHI and customer data securely to deliver compliant, data-driven patient engagement.',HeartPulse],
  ['Retail','Unify customer data across channels to deliver high-intent personalization, increase conversions, and build lasting brand loyalty.',Store],
  ['Home Improvement','Connect customer interactions across touchpoints to capture high-quality leads, optimize follow-ups, and drive project conversions.',Home],
  ['Travel','Unify customer data to personalize every stage of the guest journey and enhance overall experience.',Plane],
  ['Consumer Goods','Activate first-party data to optimize campaigns, understand buyer behavior, and drive repeat purchases at scale.',ShoppingCart]
 ]
 const agentItems:any[]=[
  ['Call tracking events agent','Tracks every inbound call and connects it to campaign, keyword and creative.',PhoneCall],
  ['Meta Advanced CAPI agent','Sends server-side conversions to Meta with deduplication.',RadioTower],
  ['Google ECL / OCI agent','Connects ad clicks to qualified and closed outcomes.',Target],
  ['Custom Integration agent','Builds conversion pipelines for custom systems and sources.',Cable],
  ['Lead Grading agent','Scores and prioritizes high-intent leads for sales.',BarChart3],
  ['CRM Enrichment agent','Adds acquisition and journey context before the first sales call.',DatabaseZap],
  ['Voice Lead Qualification agent','Calls inbound leads, qualifies intent and routes sales-ready prospects.',PhoneIncoming],
  ['Voice Scheduler agent','Books meetings for qualified leads and syncs calendars.',CalendarDays],
  ['Call Based Meeting Reminder agent','Re-engages scheduled leads before meetings.',Bell],
  ['Call Based Feedback agent','Collects post-interaction feedback and objections.',MessageSquareText],
  ['Ask Ace – User Journey & Attribution','Answers journey, funnel and attribution questions in plain language.',Sparkles]
 ]
 const resourceItems:any[]=[
  ['About Us','Know about our people, values and what we stand for',Building2,openCompany],
  ['Blogs','Latest trends and updates in marketing and data',Layers3,()=>{window.location.hash='#/resources?tab=blogs'}],
  ['Ebooks','Long-form guides for data-driven growth teams',BookOpen,()=>{window.location.hash='#/resources?tab=ebooks'}],
  ['No Net Hash','Hash first-party identifiers before activation',ShieldCheck,()=>{window.location.hash='#/resources?tab=hash'}],
  ['ROAS Calculator','Model advertising return and efficiency',CircleDollarSign,()=>{window.location.hash='#/resources?tab=roas'}],
  ['Documentation','Implementation and product documentation',Code2,()=>{window.location.hash='#/resources?tab=docs'}]
 ]
 const industryCopy=navCopy?.industries?.length?navCopy.industries:industryItems.map((x:any)=>({name:x[0],summary:x[1]}))
 const industryDisplay=industryItems.map((x:any,i:number)=>[industryCopy[i]?.name||x[0],industryCopy[i]?.summary||x[1],x[2]])
 const agentCopy=navCopy?.agents?.length?navCopy.agents:agentItems.map((x:any)=>({name:x[0],summary:x[1]}))
 const agentDisplay=agentItems.map((x:any,i:number)=>[agentCopy[i]?.name||x[0],agentCopy[i]?.summary||x[1],x[2]])
 const resourceCopy=navCopy?.resources?.length?navCopy.resources:resourceItems.map((x:any)=>({name:x[0],summary:x[1]}))
 const resourceDisplay=resourceItems.map((x:any,i:number)=>[resourceCopy[i]?.name||x[0],resourceCopy[i]?.summary||x[1],x[2],x[3]])

 return <header className="ei-header-shell" onMouseLeave={closeMenu}>
  <div className="ei-header">
   <button className="ei-brand-button" aria-label="AceMarketing home" onClick={openHome}><Brand dark/></button>
   <nav className={open?'ei-nav mobile-open':'ei-nav'}>
    <button type="button" aria-haspopup="menu" aria-expanded={menu==='industries'} className={menu==='industries'?'ei-nav-item active':'ei-nav-item'} onMouseEnter={()=>setMenu('industries')} onFocus={()=>setMenu('industries')} onClick={()=>toggleMenu('industries')}>Industries <ChevronDown/></button>
    <button type="button" aria-haspopup="menu" aria-expanded={menu==='agents'} className={menu==='agents'?'ei-nav-item active':'ei-nav-item'} onMouseEnter={()=>setMenu('agents')} onFocus={()=>setMenu('agents')} onClick={()=>toggleMenu('agents')}>Agents <ChevronDown/></button>
    <button className="ei-nav-item" onClick={openCaseStudies}>Case Studies</button>
    <button className="ei-nav-item" onClick={openIntegrations}>Integrations</button>
    <button className="ei-nav-item" onClick={openPricing}>Pricing</button>
    <button type="button" aria-haspopup="menu" aria-expanded={menu==='resources'} className={menu==='resources'?'ei-nav-item active':'ei-nav-item'} onMouseEnter={()=>setMenu('resources')} onFocus={()=>setMenu('resources')} onClick={()=>toggleMenu('resources')}>Resources <ChevronDown/></button>
   </nav>
   <div className="ei-header-actions">
    <button className="ei-voice-pill" onClick={openApp}><span className="voice-bars">••••</span><b>Voice Agent</b><small>NEW</small></button>
    <button className="ei-demo-pill" onClick={openDemo}>Book a demo</button>
   </div>
   <button className="menu-toggle ei-menu-toggle" aria-label={open?'Close navigation menu':'Open navigation menu'} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
  </div>

  {menu==='industries'&&<div className="ei-mega-menu industries-menu" role="menu" onMouseEnter={()=>setMenu('industries')}>
   <div className="ei-mega-label">INDUSTRIES</div>
   <div className="ei-industry-columns">
    <div>{industryDisplay.slice(0,4).map((x:any)=>{const Icon=x[2];return <button key={x[0]} onClick={()=>{closeMenu();window.location.hash='#/industries?industry='+encodeURIComponent(x[0])}} className="ei-industry-item" role="menuitem"><span className="ei-industry-icon"><Icon/></span><div><b>{x[0]}</b><p>{x[1]}</p></div></button>})}</div>
    <div>{industryDisplay.slice(4).map((x:any)=>{const Icon=x[2];return <button key={x[0]} onClick={()=>{closeMenu();window.location.hash='#/industries?industry='+encodeURIComponent(x[0])}} className="ei-industry-item" role="menuitem"><span className="ei-industry-icon"><Icon/></span><div><b>{x[0]}</b><p>{x[1]}</p></div></button>})}</div>
   </div>
  </div>}

  {menu==='agents'&&<div className="ei-mega-menu agents-menu" role="menu" onMouseEnter={()=>setMenu('agents')}>
   <div className="ei-mega-label">AGENTS</div>
   <div className="ei-agent-list">{agentItems.map((x:any)=>{const Icon=x[2];return <button key={x[0]} onClick={()=>{closeMenu();window.location.hash='#/agents?agent='+encodeURIComponent(x[0])}} role="menuitem"><span className="ei-agent-icon"><Icon/></span><div><b>{x[0]}</b><p>{x[1]}</p></div><ChevronRight/></button>})}</div>
  </div>}

  {menu==='resources'&&<div className="ei-mega-menu resources-menu" role="menu" onMouseEnter={()=>setMenu('resources')}>
   <div className="ei-resources-layout">
    <div><div className="ei-mega-label">GET INSPIRED</div><div className="ei-resource-links">{resourceItems.map((x:any)=>{const Icon=x[2];return <button key={x[0]} role="menuitem" onClick={()=>{closeMenu();x[3]()}}><span><Icon/></span><div><b>{x[0]}</b><p>{x[1]}</p></div></button>})}</div></div>
    <aside><div className="ei-mega-label">LATEST FROM BLOGS</div><button onClick={openResources} className="ei-blog-card"><span>DATA SIGNALS</span><b>Why campaigns struggle without strong first-party data signals</b><small>Read article <ArrowRight/></small></button><button onClick={openResources} className="ei-blog-card"><span>AI + MEDIA</span><b>How to use AI assistants with your ad platforms</b><small>Read article <ArrowRight/></small></button></aside>
   </div>
  </div>}
 </header>
}

function Marketing({openHome,openApp,openLogin,openPricing,openDemo,openCompany,openResources,openCaseStudies,openSolutions,openIndustries,openAgents,openIntegrations}:{openHome:()=>void,openApp:()=>void,openLogin:()=>void,openPricing:()=>void,openDemo:()=>void,openCompany:()=>void,openResources:()=>void,openCaseStudies:()=>void,openSolutions:()=>void,openIndustries:()=>void,openAgents:()=>void,openIntegrations:()=>void}){
 const [agentFilter,setAgentFilter]=useState('All')
 const [problemTab,setProblemTab]=useState<'Lead Quality'|'Conversion'|'Attribution'>('Lead Quality')
 const [cookieOpen,setCookieOpen]=useState(true)
 const [cookiePrefs,setCookiePrefs]=useState({analytics:false,advertising:false,functionality:false})
 const [cookieBusy,setCookieBusy]=useState(false)
 const [cookieError,setCookieError]=useState('')
 const openProofCase=(name:string)=>{window.location.hash='#/case-studies?case='+encodeURIComponent(name)}
 const [heroSlide,setHeroSlide]=useState(0)
 const heroSlides=[
  {eyebrow:'Connect every touchpoint',title:'Website forms, calls & WhatsApp messages.',rows:[['Google Ads','Click captured'],['Website','High-intent pages'],['WhatsApp','Conversation started'],['CRM','Qualified lead'],['Revenue','Closed outcome']]},
  {eyebrow:'Return stronger outcomes',title:'Teach ad platforms from qualified and closed revenue.',rows:[['Lead Grading','Intent scored'],['CRM','Stage enriched'],['Google Ads','Qualified signal'],['Meta CAPI','Server event'],['Bidding','Learning updated']]},
  {eyebrow:'Act on the stitched journey',title:'Let specialized agents work every revenue handoff.',rows:[['Lead','Arrives'],['Voice Agent','Qualifies'],['Scheduler','Books meeting'],['Reminder','Protects show rate'],['Ask Ace','Explains performance']]}
 ]
 const fallbackChallenges=[
  {key:'operations',label:'Business & operational impact',title:'Teams lose speed when every system tells a different story.',points:['Acquisition cost rises while lead quality becomes harder to explain','Marketing, sales, and leadership work from different numbers','Teams spend time repairing tracking instead of scaling campaigns','Budget decisions are made without reliable funnel evidence'],action:'Connect the operating truth'},
  {key:'tracking',label:'Tracking & data quality',title:'Broken event chains make optimization noisy before anyone notices.',points:['Conversions fire inconsistently across destinations','Duplicate events distort optimization signals','Cross-domain and messaging paths break continuity','Reporting lacks one normalized event model'],action:'Repair signal quality'},
  {key:'optimization',label:'Ad platform optimization',title:'Algorithms learn the wrong lesson when downstream quality never returns.',points:['Campaigns optimize toward shallow form fills','Lookalike seeds are polluted by low-quality demand','Converted and irrelevant users remain targetable','CAC rises while platforms cannot see real business value'],action:'Return stronger outcomes'},
  {key:'measurement',label:'Attribution & measurement',title:'A fragmented journey turns every channel report into a partial answer.',points:['Web, app, calls, and offline activity stay disconnected','Post-lead outcomes disappear from media measurement','High-value cohorts remain hidden from channel reporting','Leadership cannot defend budget decisions with one evidence trail'],action:'Build full-path visibility'},
  {key:'audience',label:'Audience & personalization',title:'Weak identity makes targeting broad, repetitive, and expensive.',points:['Segments are too shallow for useful lookalikes','Retargeting ignores actual journey behavior','Upsell and retention lack purchase and lifecycle context','Returning customers are difficult to recognize consistently'],action:'Activate better audiences'},
  {key:'privacy',label:'Privacy, consent & compliance',title:'Growth systems need first-party controls that survive changing privacy rules.',points:['Third-party tracking keeps losing reach and reliability','Consent state is disconnected from activation destinations','Regional rules complicate uncontrolled audience use','Teams lack a durable first-party governance layer'],action:'Govern first-party activation'}
 ]
 const [challengeItems,setChallengeItems]=useState<any[]>(fallbackChallenges)
 const [challengeIndex,setChallengeIndex]=useState(0)
 const persistCookiePrefs=async(prefs:{analytics:boolean,advertising:boolean,functionality:boolean})=>{
  setCookieBusy(true);setCookieError('')
  try{
   const r:any=await api.saveConsent(prefs)
   if(!r?.saved)throw new Error('Consent service did not confirm the preference save.')
   setCookiePrefs(prefs);setCookieOpen(false)
  }catch(e:any){
   setCookieError(e?.message||'Cookie preferences could not be saved. Please retry.')
  }finally{setCookieBusy(false)}
 }
 useEffect(()=>{api.publicChallenges().then((r:any)=>r?.items?.length&&setChallengeItems(r.items)).catch(()=>null)},[])
 const visibleAgents=agentFilter==='All'?agents:agents.filter(a=>a[2]===agentFilter)
 return <div className="marketing-page">
  <div className="ei-promo-bar"><span>Better first-party signals help teams turn paid attention into <b>measurable business outcomes</b>.</span><button onClick={openDemo}>See how AceMarketing closes the loop <ArrowRight/></button></div>
  <Header openHome={openHome} openApp={openApp} openLogin={openLogin} openPricing={openPricing} openDemo={openDemo} openCompany={openCompany} openResources={openResources} openCaseStudies={openCaseStudies} openSolutions={openSolutions} openIndustries={openIndustries} openAgents={openAgents} openIntegrations={openIntegrations}/>
  <section className="ei-hero-wrap">
   <div className="ei-hero-card">
    <div className="ei-hero-copy">
     <h1>Make paid media learn<br/><em>from real outcomes</em>, not<br/>surface-level clicks.</h1>
     <p>AceMarketing connects acquisition, CRM, calls, messaging, and revenue into one operating layer so teams can improve signal quality, conversion handoffs, and measurement without rebuilding their stack.</p>
     <button className="ei-hero-cta" onClick={openDemo}>Get a Demo</button>
    </div>
    <div className="ei-hero-visual">
     <div className="ei-visual-overlay"/>
     <div className="hero-slide-motion" key={heroSlide}>
      <div className="ei-visual-copy"><span>{heroSlides[heroSlide].eyebrow}</span><b>{heroSlides[heroSlide].title}</b></div>
      <div className="ei-visual-panel">
       <div className="ei-visual-top"><span>{heroSlide===0?'Unified Journey':heroSlide===1?'Signal Return':'Agent Workflow'}</span><small>LIVE</small></div>
       {heroSlides[heroSlide].rows.map((x,i)=><div className="ei-visual-row" key={x[0]}><span>{i+1}</span><div><b>{x[0]}</b><small>{x[1]}</small></div></div>)}
      </div>
     </div>
     <div className="ei-hero-dots" aria-label="Hero slides">{heroSlides.map((_,i)=><button key={i} className={heroSlide===i?'active':''} aria-label={'Show hero slide '+(i+1)} onClick={()=>setHeroSlide(i)}/>)}</div>
     <button className="ei-hero-next" aria-label="Next hero slide" onClick={()=>setHeroSlide(x=>(x+1)%heroSlides.length)}><ArrowRight/></button>
    </div>
   </div>
  </section>

  <section className="ei-trust-strip" aria-label="Reference customer categories">
   <div className="ei-trust-label">TRUSTED ACROSS COMPLEX, MULTI-TOUCH FUNNELS</div>
   <div className="ei-trust-track">
    {['EdTech','Healthcare','Retail','D2C','Financial Services','SaaS','Home Services','Professional Services','Marketplaces','Multi-location'].map(x=><span key={x}>{x}</span>)}
   </div>
   <small>Example categories illustrate the complex, multi-touch funnels AceMarketing is designed to support; no third-party customer relationship is implied.</small>
  </section>

  <section className="ei-problems" id="problems">
   <div className="ei-section-heading">
    <span>THREE SIGNAL BREAKS THAT HOLD GROWTH BACK.</span>
    <h2>Repair the data flow before media efficiency slips.</h2>
   </div>
   <div className="ei-problem-tabs">{(['Lead Quality','Conversion','Attribution'] as const).map(x=><button key={x} className={problemTab===x?'active':''} onClick={()=>setProblemTab(x)}>{x}</button>)}</div>
   <div className="ei-problem-stage">
    {problemTab==='Lead Quality'&&<><div className="ei-problem-no">01</div><div className="ei-problem-main"><span>LEAD QUALITY</span><h3>Campaigns keep finding form-fillers instead of people who actually progress.</h3><p><b>Why it happens:</b> Ad platforms optimize on form-fills when closed revenue never flows back. The algorithm learns to find submitters rather than buyers.</p></div><div className="ei-problem-solution"><span>WHAT ACEMARKETING DOES</span><p>Connect first-party outcomes and return qualified leads, enrolments, bookings and store sales server-side, with deduplication across sources.</p><span>WHAT YOU GET</span><h4>Better lead quality</h4><p>Optimization moves toward the people who actually progress and close.</p></div></>}
    {problemTab==='Conversion'&&<><div className="ei-problem-no">02</div><div className="ei-problem-main"><span>CONVERSION</span><h3>Leads disappear between tools, teams, and follow-up steps.</h3><p><b>Why it happens:</b> Forms, CRM, call centers and offline teams operate in fragments. Every handoff loses context, time and leads.</p></div><div className="ei-problem-solution"><span>WHAT ACEMARKETING DOES</span><p>Grade and enrich on arrival, qualify quickly, route with full context, schedule, remind and match closures back to source.</p><span>WHAT YOU GET</span><h4>More conversion</h4><p>Each step moves faster, with context and accountability across every path.</p></div></>}
    {problemTab==='Attribution'&&<><div className="ei-problem-no">03</div><div className="ei-problem-main"><span>VISIBILITY & ATTRIBUTION</span><h3>Each system reports its own slice, while the complete journey stays hidden.</h3><p><b>Why it happens:</b> Each tool reports only its own step. Multi-source, multi-path and online-offline journeys remain fragmented.</p></div><div className="ei-problem-solution"><span>WHAT ACEMARKETING DOES</span><p>Stitch every source, tool and offline step into one journey per customer with step monitoring and full-path revenue attribution.</p><span>WHAT YOU GET</span><h4>Visibility and accountability</h4><p>See every step and defend budget decisions with journey-level evidence.</p></div></>}
   </div>
   <div className="ei-problem-cta"><span>See how one operating layer connects all three breakpoints.</span><button onClick={openDemo}>Get a Demo</button></div>
  </section>

  <section className="ei-system-overview" id="platform">
   <div className="ei-section-heading centered"><span>ONE OPERATING LAYER, TWO CORE JOBS</span><h2>Unify the journey, then let automation act with context.</h2><p>Measurement and execution work better when every workflow sees the same customer and revenue truth.</p></div>
   <div className="ei-capability-layout">
    <article><div className="ei-cap-num">01</div><Network/><span>CAPABILITY 01</span><h3>Unify the customer path</h3><p>Every lead source — forms, website, app, calls, walk-ins — and every tool connected into one journey per customer, online and offline, from first touch to closed revenue.</p><ul><li>Identity stitching</li><li>Click-ID persistence</li><li>Online + offline events</li><li>Chronological journey view</li></ul></article>
    <article><div className="ei-cap-num">02</div><Bot/><span>CAPABILITY 02</span><h3>Automate the handoffs that slow revenue</h3><p>Choose specialized agents for qualification, routing, follow-up, closure match-back and signal return. Each agent acts with shared journey context.</p><ul><li>11 prebuilt agents</li><li>Custom agents</li><li>Human approval controls</li><li>Audit trail</li></ul></article>
   </div>
   <div className="ei-equation"><b>stitched journey</b><span>+</span><b>agents at every step</b><span>=</span><strong>a funnel that learns</strong></div>
  </section>

  <section className="ei-agents-section" id="agents">
   <div className="ei-agents-head"><div><span>SPECIALIST AUTOMATION FOR EVERY HANDOFF</span><h2>Choose the agents that improve your funnel where it matters most.</h2><p>Each agent works from shared journey context instead of isolated channel data.</p></div><button onClick={openApp}>Explore agents <ArrowRight/></button></div>
   <div className="ei-agent-tabs">{['Lead Quality','Conversion','Visibility'].map(x=><button key={x} className={agentFilter===x?'active':''} onClick={()=>setAgentFilter(x)}>{x}</button>)}</div>
   <div className="ei-agent-groups">
    {agentFilter==='Lead Quality'&&<><div className="ei-agent-group-label"><span>01</span><b>LEAD QUALITY — SIGNAL RETURN</b></div><div className="ei-agent-cards four">{agents.filter(a=>a[2]==='Lead Quality').map((a,i)=><article key={a[0]}><div className="ei-agent-card-top"><span>{String(i+1).padStart(2,'0')}</span><RadioTower/></div><h3>{a[0]}</h3><strong>{a[3]}</strong><p>{a[1]}</p><button onClick={openApp}>View agent <ArrowRight/></button></article>)}</div></>}
    {agentFilter==='Conversion'&&<><div className="ei-agent-group-label"><span>02</span><b>CONVERSION — EVERY HANDOFF WORKED</b></div><div className="ei-agent-cards three">{agents.filter(a=>a[2]==='Conversion').map((a,i)=><article key={a[0]}><div className="ei-agent-card-top"><span>{String(i+1).padStart(2,'0')}</span><Bot/></div><h3>{a[0]}</h3><strong>{a[3]}</strong><p>{a[1]}</p><button onClick={openApp}>View agent <ArrowRight/></button></article>)}</div></>}
    {agentFilter==='Visibility'&&<><div className="ei-agent-group-label"><span>03</span><b>VISIBILITY & ATTRIBUTION</b></div><div className="ei-agent-cards one">{agents.filter(a=>a[2]==='Visibility').map((a,i)=><article key={a[0]}><div className="ei-agent-card-top"><span>{String(i+1).padStart(2,'0')}</span><Sparkles/></div><h3>{a[0]}</h3><strong>{a[3]}</strong><p>{a[1]}</p><button onClick={openApp}>View agent <ArrowRight/></button></article>)}</div></>}
   </div>
   <div className="ei-agent-builder-note"><span>Don’t see your leak?</span><b>Build your own agent on the stitched journey — or configure one with the workspace builder.</b><button onClick={openApp}>Build custom agent</button></div>
  </section>

  <section className="ei-proof-section" id="proof">
   <div className="ei-proof-head"><div><span>OPERATING PATTERNS</span><h2>See how stronger signals and connected journeys can improve the operating model.</h2><p>These are illustrative workflow patterns for product education, not customer performance claims.</p></div><button onClick={openCaseStudies}>See implementation patterns <ArrowRight/></button></div>
   <div className="ei-proof-grid">
    <article role="button" tabIndex={0} aria-label="Open Leverage Edu reference case study" onClick={()=>openProofCase('Leverage Edu')} onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&openProofCase('Leverage Edu')}><div className="ei-proof-label">LEAD QUALITY</div><div className="ei-proof-mark">LE</div><strong>−38%</strong><h3>cost per qualified lead</h3><p>Reference pattern: enrolment outcomes returned server-side and deduplicated across form, call and counsellor sources.</p><footer><span>Leverage Edu</span><small>Edtech</small><ArrowRight/></footer></article>
    <article role="button" tabIndex={0} aria-label="Open India IVF reference case study" onClick={()=>openProofCase('India IVF')} onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&openProofCase('India IVF')}><div className="ei-proof-label">CONVERSION</div><div className="ei-proof-mark">IVF</div><strong>+52%</strong><h3>lead-to-consultation conversion</h3><p>Reference pattern: every lead graded on arrival, routed with context and qualified quickly.</p><footer><span>India IVF</span><small>Healthcare</small><ArrowRight/></footer></article>
    <article role="button" tabIndex={0} aria-label="Open Blue Tokai reference case study" onClick={()=>openProofCase('Blue Tokai')} onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&openProofCase('Blue Tokai')}><div className="ei-proof-label">VISIBILITY & ATTRIBUTION</div><div className="ei-proof-mark">BT</div><strong>31%</strong><h3>revenue re-attributed</h3><p>Reference pattern: web, app and offline interactions stitched into full-path attribution.</p><footer><span>Blue Tokai</span><small>Consumer goods</small><ArrowRight/></footer></article>
    <article role="button" tabIndex={0} aria-label="Open Jaro Education reference case study" onClick={()=>openProofCase('Jaro Education')} onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&openProofCase('Jaro Education')}><div className="ei-proof-label">CONVERSION</div><div className="ei-proof-mark">JE</div><strong>+41%</strong><h3>enrolment rate</h3><p>Reference pattern: counsellor calls and follow-ups tracked with full journey context.</p><footer><span>Jaro Education</span><small>Edtech</small><ArrowRight/></footer></article>
   </div>
  </section>

  <section className="ai-action-section">
   <div className="section-title light"><span className="kicker">AI IN ACTION</span><h2>Agent workflows mapped to real funnel operations.</h2><p>Instead of decorative screenshots, AceMarketing uses original workflow cards to show how specialized agents cooperate around a stitched journey.</p></div>
   <div className="ai-action-grid">
    {[
      ['01','Lead arrives','Lead Grading','Scores intent using source, pages, campaign and CRM history.'],
      ['02','Context assembled','CRM Enrichment','Adds campaign, content, chat and call context before sales outreach.'],
      ['03','Immediate outreach','Voice Lead Qualification','Calls quickly, captures intent and routes the sales-ready lead.'],
      ['04','Meeting created','Voice Scheduler','Finds a slot and syncs it to the team calendar.'],
      ['05','No-show risk','Meeting Reminder','Triggers reminders before the appointment goes cold.'],
      ['06','Closed outcome','Signal Return','Matches closure back to source and returns the qualified event to ad platforms.']
    ].map(x=><article key={x[0]}><div><span>{x[0]}</span><Bot/></div><h3>{x[1]}</h3><b>{x[2]}</b><p>{x[3]}</p></article>)}
   </div>
  </section>

  <section className="ei-data-problem-banner">
   <div><span>WHEN OPTIMIZATION LOSES THE BUSINESS CONTEXT</span><h2>Media decisions weaken when<br/><em>the signal chain breaks.</em></h2><p>Rising acquisition cost, lower-quality demand, and conflicting attribution often trace back to missing identity, delayed CRM outcomes, and disconnected offline events.</p></div>
   <div className="ei-data-visual"><div className="ei-data-orbit o1"/><div className="ei-data-orbit o2"/><div className="ei-data-core"><DatabaseZap/><b>Shared data truth</b><span>Ads · CRM · Calls · WhatsApp · Revenue</span></div></div>
  </section>

  <section className="ei-friction-section">
   <div className="ei-friction-intro">
    <span>WHERE PERFORMANCE SYSTEMS BREAK</span>
    <h2>The visible problem is often downstream from the real data failure.</h2>
    <p>Explore six recurring failure patterns that appear when acquisition, identity, CRM outcomes, audiences, and consent are not operating from one shared model.</p>
   </div>
   <div className="ei-friction-shell">
    <div className="ei-friction-nav">
     {challengeItems.map((x:any,i:number)=><button key={x.key} className={challengeIndex===i?'active':''} onClick={()=>setChallengeIndex(i)}><span>{String(i+1).padStart(2,'0')}</span><b>{x.label}</b><ChevronRight/></button>)}
    </div>
    <article className="ei-friction-detail">
     <div className="ei-friction-number">{String(challengeIndex+1).padStart(2,'0')}</div>
     <span>{challengeItems[challengeIndex]?.label}</span>
     <h3>{challengeItems[challengeIndex]?.title}</h3>
     <ul>{(challengeItems[challengeIndex]?.points||[]).map((x:string)=><li key={x}><Check/>{x}</li>)}</ul>
     <button onClick={openSolutions}>{challengeItems[challengeIndex]?.action||'Explore the solution'} <ArrowRight/></button>
    </article>
   </div>
  </section>

  <section className="ei-security-section">
   <div className="ei-security-copy"><span>SECURITY & DATA OWNERSHIP</span><h2>Keep control of the data that powers your growth.</h2><p>AceMarketing is designed around first-party ownership, explicit consent, scoped access, and auditable activation across connected systems.</p><div className="ei-security-actions"><button onClick={openApp}>Review security controls</button><small>Certification badges are shown as roadmap targets until independently verified.</small></div></div>
   <div className="ei-security-badges">
    <article><ShieldCheck/><b>ISO 27001</b><span>Control framework target</span></article>
    <article><ShieldCheck/><b>SHA-256</b><span>Identifier hashing design</span></article>
    <article><ShieldCheck/><b>GDPR</b><span>Consent / deletion target</span></article>
    <article><ShieldCheck/><b>HIPAA</b><span>Healthcare safeguards target</span></article>
    <article><ShieldCheck/><b>India DPDP</b><span>Readiness roadmap</span></article>
   </div>
  </section>

  <section className="ei-final-cta">
   <div><span>TURN CONNECTED DATA INTO BETTER DECISIONS</span><h2>Give every channel the business outcomes it needs to optimize intelligently.</h2></div>
   <button onClick={openDemo}>Book a demo <ArrowRight/></button>
  </section>

  <DemoSection openApp={openApp} openDemo={openDemo}/>
  <PublicFooter openHome={openHome} openApp={openApp} openDemo={openDemo} openCompany={openCompany} openResources={openResources} openSolutions={openSolutions} openIntegrations={openIntegrations}/>
  {cookieOpen&&<div className="cookie-banner" role="dialog" aria-label="Cookie preferences"><div><b>Cookie preferences</b><p>Necessary storage is always on. Optional analytics, advertising and functionality categories can be enabled independently.</p><div className="cookie-toggles">{Object.entries(cookiePrefs).map(([k,v])=><label key={k}><input type="checkbox" checked={v} disabled={cookieBusy} onChange={()=>setCookiePrefs({...cookiePrefs,[k]:!v})}/>{k}</label>)}</div>{cookieError&&<small className="cookie-error" role="alert">{cookieError}</small>}</div><div className="cookie-actions"><button disabled={cookieBusy} onClick={()=>persistCookiePrefs({analytics:false,advertising:false,functionality:false})}>{cookieBusy?'Saving…':'Necessary only'}</button><button disabled={cookieBusy} onClick={()=>persistCookiePrefs({analytics:true,advertising:true,functionality:true})}>{cookieBusy?'Saving…':'Accept all'}</button><button className="primary-cookie" disabled={cookieBusy} onClick={()=>persistCookiePrefs(cookiePrefs)}>{cookieBusy?'Saving…':'Save preferences'}</button></div></div>}
 </div>
}


function PublicFooter({openHome,openApp,openDemo,openCompany,openResources,openSolutions,openIntegrations}:{openHome:()=>void,openApp:()=>void,openDemo:()=>void,openCompany:()=>void,openResources:()=>void,openSolutions:()=>void,openIntegrations:()=>void}){
 const [footerCopy,setFooterCopy]=useState<any>(null)
 useEffect(()=>{api.publicNavigation().then((r:any)=>setFooterCopy(r?.footer||null)).catch(()=>null)},[])
 const fallback={
  platform:[{label:'Data activation',target:'workspace'},{label:'Data enrichment',target:'workspace'}],
  solutions:[{label:'Lead generation',target:'solutions'},{label:'Enterprise',target:'solutions'},{label:'Mid-market teams',target:'solutions'},{label:'Attribution',target:'solutions'},{label:'Alerts & monitoring',target:'workspace'},{label:'Server-to-server integration',target:'integrations'}],
  resources:[{label:'About AceMarketing',target:'company'},{label:'Use cases',target:'resources'},{label:'Blogs',target:'resources'},{label:'Ebooks',target:'resources'},{label:'Hash utility',target:'resources'},{label:'Documentation',target:'resources'},{label:'Contact',target:'demo'}]
 }
 const copy=footerCopy||fallback
 const go=(target:string)=>{
  if(target==='workspace')return openApp()
  if(target==='solutions')return openSolutions()
  if(target==='integrations')return openIntegrations()
  if(target==='company')return openCompany()
  if(target==='resources')return openResources()
  if(target==='demo')return openDemo()
 }
 const goLegal=(view:'privacy'|'terms'|'security')=>window.dispatchEvent(new CustomEvent('ace-view',{detail:view}))
 return <footer className="ei-footer">
  <div className="ei-footer-top">
   <div className="ei-footer-brand">
    <button className="public-footer-brand" aria-label="AceMarketing home" onClick={openHome}><Brand/></button>
    <p>Connected first-party data, journey intelligence, and conversion operations for performance teams.</p>
    <button className="ei-footer-demo" onClick={openDemo}>Book a demo</button>
   </div>
   <div className="ei-footer-column"><h4>Platform</h4>{copy.platform.map((x:any)=><button key={x.label} onClick={()=>go(x.target)}>{x.label}</button>)}</div>
   <div className="ei-footer-column"><h4>Solutions</h4>{copy.solutions.map((x:any)=><button key={x.label} onClick={()=>go(x.target)}>{x.label}</button>)}</div>
   <div className="ei-footer-column"><h4>Resources</h4>{copy.resources.map((x:any)=><button key={x.label} onClick={()=>go(x.target)}>{x.label}</button>)}</div>
  </div>
  <div className="ei-footer-meta">
   <div><b>India</b><span>Built for multi-channel growth teams operating across online and offline customer journeys.</span></div>
   <div><b>Platform support</b><span>Use the demo route to discuss onboarding, integrations, and deployment requirements.</span></div>
  </div>
  <div className="ei-footer-legal"><span>© 2026 AceMarketing. All rights reserved.</span><div><button onClick={()=>goLegal('privacy')}>Privacy Policy</button><span>•</span><button onClick={()=>goLegal('terms')}>Terms & Conditions</button><span>•</span><button onClick={()=>goLegal('security')}>Security</button></div></div>
 </footer>
}

function PublicPageFrame({children,openHome,openApp,openLogin,openPricing,openDemo,openCompany,openResources,openCaseStudies,openSolutions,openIndustries,openAgents,openIntegrations}:{children:any,openHome:()=>void,openApp:()=>void,openLogin:()=>void,openPricing:()=>void,openDemo:()=>void,openCompany:()=>void,openResources:()=>void,openCaseStudies:()=>void,openSolutions:()=>void,openIndustries:()=>void,openAgents:()=>void,openIntegrations:()=>void}){
 return <div className="marketing-page public-route-page">
  <div className="ei-promo-bar"><span>Cleaner first-party signals help growth teams optimize for business outcomes, not shallow clicks.</span><button onClick={openDemo}>See the operating model <ArrowRight/></button></div>
  <Header openHome={openHome} openApp={openApp} openLogin={openLogin} openPricing={openPricing} openDemo={openDemo} openCompany={openCompany} openResources={openResources} openCaseStudies={openCaseStudies} openSolutions={openSolutions} openIndustries={openIndustries} openAgents={openAgents} openIntegrations={openIntegrations}/>
  {children}
  <PublicFooter openHome={openHome} openApp={openApp} openDemo={openDemo} openCompany={openCompany} openResources={openResources} openSolutions={openSolutions} openIntegrations={openIntegrations}/>
 </div>
}

function IndustriesPublicPage(props:any){
 const fallback=[
  {name:'Edtech',summary:'Connect acquisition, counselling, calls, messaging and enrolment into one measurable learner journey.',outcomes:['Lead quality','Counsellor context','Enrolment attribution']},
  {name:'Fintech',summary:'Bring approved acquisition and customer signals together with strict controls around identity and activation.',outcomes:['Qualified demand','Compliant activation','Revenue feedback']},
  {name:'Healthcare',summary:'Measure patient acquisition and assisted journeys with privacy-aware first-party workflows.',outcomes:['Source visibility','Call attribution','Consent-aware measurement']},
  {name:'Retail',summary:'Link paid media, ecommerce, CRM and offline purchase behavior into one customer path.',outcomes:['Audience quality','Repeat purchase','Omnichannel attribution']},
  {name:'Home Improvement',summary:'Follow enquiries through calls, visits, quotations and booked projects without losing campaign context.',outcomes:['Lead routing','Project conversion','Offline matchback']},
  {name:'Travel',summary:'Connect discovery, enquiry, call-center and booking activity across assisted and digital channels.',outcomes:['Booking attribution','Journey continuity','Audience suppression']},
  {name:'Consumer Goods',summary:'Use first-party customer and purchase context to improve media efficiency and retention.',outcomes:['Revenue signals','LTV audiences','Repeat purchase']}
 ]
 const [items,setItems]=useState<any[]>(fallback)
 useEffect(()=>{api.publicIndustries().then((r:any)=>r?.items&&setItems(r.items)).catch(()=>null)},[])
 return <PublicPageFrame {...props}><main className="public-detail-page">
  <section className="public-detail-hero"><span>INDUSTRIES</span><h1>One data operating layer for journeys that do not fit inside one platform.</h1><p>Different sectors have different handoffs, but the core challenge is the same: preserve context from acquisition through real business outcome.</p><button onClick={props.openDemo}>Map your funnel <ArrowRight/></button></section>
  <section className="public-detail-grid industries-detail-grid">{items.map((x:any,i:number)=><article key={x.name}><span>{String(i+1).padStart(2,'0')}</span><h2>{x.name}</h2><p>{x.summary}</p><div>{(x.outcomes||[]).map((y:string)=><b key={y}><Check/>{y}</b>)}</div><button onClick={props.openDemo}>Explore this workflow <ArrowRight/></button></article>)}</section>
  <section className="public-route-cta"><span>YOUR FUNNEL IS UNIQUE</span><h2>Keep the structure. Adapt the data model to the business.</h2><button onClick={props.openDemo}>Book a workflow review</button></section>
 </main></PublicPageFrame>
}

function AgentsPublicPage(props:any){
 const fallback=agents.map((a,i)=>({name:a[0],category:a[2],summary:a[1],number:i+1}))
 const [items,setItems]=useState<any[]>(fallback)
 const [filter,setFilter]=useState('All')
 useEffect(()=>{api.publicAgents().then((r:any)=>r?.items&&setItems(r.items)).catch(()=>null)},[])
 const shown=filter==='All'?items:items.filter((x:any)=>x.category===filter)
 return <PublicPageFrame {...props}><main className="public-detail-page">
  <section className="public-detail-hero"><span>AGENTS</span><h1>Put specialized automation at the points where revenue usually leaks.</h1><p>Each agent uses shared journey context, so qualification, routing, reminders, enrichment, and signal return can work from the same operating truth.</p><button onClick={props.openApp}>Open agent workspace <ArrowRight/></button></section>
  <div className="public-filter-tabs">{['All','Lead Quality','Conversion','Visibility'].map(x=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x}</button>)}</div>
  <section className="public-detail-grid agent-public-grid">{shown.map((x:any,i:number)=><article key={x.name}><span>{String(x.number||i+1).padStart(2,'0')}</span><small>{x.category}</small><h2>{x.name}</h2><p>{x.summary}</p><button onClick={props.openApp}>Configure agent <ArrowRight/></button></article>)}</section>
 </main></PublicPageFrame>
}

function IntegrationsPublicPage(props:any){
 const fallback=[
  {group:'CRM',items:['Zoho CRM','Salesforce','LeadSquared','Meritto','HubSpot','HighLevel','Microsoft Dynamics 365','Freshsales','Custom CRM']},
  {group:'Messaging & Marketing',items:['WhatsApp','WATI','Gupshup','AiSensy','Bitespeed','MoEngage','CleverTap','Mailchimp','Klaviyo','Brevo','Twilio SendGrid']},
  {group:'Calling',items:['Exotel','Knowlarity','Tata Tele','MyOperator','Twilio']},
  {group:'Web, Forms & Commerce',items:['WordPress','React App','Shopify','WooCommerce','Magento','Typeform','Custom Backend']},
  {group:'Warehouse, Database & Storage',items:['BigQuery','Snowflake','MongoDB','Oracle DB','Google Cloud Storage','Amazon S3']},
  {group:'Advertising & Analytics',items:['Google Ads','Meta Ads','LinkedIn Ads','Microsoft Ads / Bing Ads','X','Pinterest','TikTok Ads','Yahoo Ads','Taboola','Spotify Ads','Snapchat Ads','Criteo','DV360','Google Merchant Center','Meta Lead Ads','Meta CAPI','Meta Catalog','GA4','Google Calendar']},
  {group:'Sales Intelligence',items:['Apollo','Lusha','Calixa']}
 ]
 const [groups,setGroups]=useState<any[]>(fallback)
 const [query,setQuery]=useState('')
 const [requestOpen,setRequestOpen]=useState(false)
 const [requestBusy,setRequestBusy]=useState(false)
 const [requestNotice,setRequestNotice]=useState('')
 useEffect(()=>{api.publicIntegrations().then((r:any)=>r?.groups&&setGroups(r.groups)).catch(()=>null)},[])
 const shown=groups.map((g:any)=>({...g,items:(g.items||[]).filter((x:string)=>!query.trim()||x.toLowerCase().includes(query.trim().toLowerCase())||String(g.group).toLowerCase().includes(query.trim().toLowerCase()))})).filter((g:any)=>g.items.length)
 const total=groups.reduce((n:number,g:any)=>n+(g.items||[]).length,0)
 const submitRequest=async(e:any)=>{
  e.preventDefault();setRequestBusy(true);setRequestNotice('')
  const fd=new FormData(e.currentTarget)
  try{
   const r:any=await api.submitPublicConnectorRequest({connector:String(fd.get('connector')||''),email:String(fd.get('email')||''),company:String(fd.get('company')||''),businessNeed:String(fd.get('businessNeed')||'')})
   setRequestNotice('Request captured for '+r.connector+'. Our team can follow up using the business email you provided.')
   e.currentTarget.reset()
  }catch(err:any){setRequestNotice(err?.message||'Connector request could not be submitted.')}
  finally{setRequestBusy(false)}
 }
 return <PublicPageFrame {...props}><main className="public-detail-page">
  <section className="public-detail-hero"><span>INTEGRATIONS</span><h1>Connect the systems your teams already depend on.</h1><p>Use native connectors where available and configurable adapters for the rest, while keeping identity, lifecycle, and revenue fields normalized.</p><button onClick={props.openApp}>Open integration workspace <ArrowRight/></button></section>
  <section className="app-panel public-integration-search"><div><Search/><input aria-label="Search public integrations" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search CRM, warehouse, ads, messaging..."/></div><span>{total}+ catalogued connector paths</span></section>
  <section className="integration-public-groups">{shown.map((g:any,i:number)=><article key={g.group}><div><span>{String(i+1).padStart(2,'0')}</span><h2>{g.group}</h2></div><div>{(g.items||[]).map((x:string)=><button key={x} onClick={props.openApp}><Cable/><span>{x}</span><ChevronRight/></button>)}</div></article>)}</section>
  {!shown.length&&<section className="public-route-cta"><span>NO MATCH FOUND</span><h2>Request the connector you need or configure a custom adapter.</h2><button onClick={()=>setRequestOpen(true)}>Request this connector</button></section>}
  <section className="public-route-cta"><span>CUSTOM SYSTEM?</span><h2>Map your own API, webhook, file, warehouse, or database interface.</h2><div className="panel-actions"><button onClick={()=>setRequestOpen(true)}>Request a connector</button><button onClick={props.openApp}>Build a custom integration</button></div>{requestNotice&&<p className="public-request-notice" role="status">{requestNotice}</p>}</section>
  {requestOpen&&<div className="connector-modal"><form className="connector-card integration-request-form" onSubmit={submitRequest}><div className="connector-modal-head"><div><Cable/><div><b>Request a connector</b><small>Tell us which system you need. This request is stored by the backend even before you have a workspace.</small></div></div><button type="button" onClick={()=>setRequestOpen(false)}><X/></button></div><label>Connector name<input name="connector" required defaultValue={query} placeholder="ERP, ad platform, warehouse, CRM..."/></label><label>Business email<input name="email" required type="email" placeholder="name@company.com"/></label><label>Company<input name="company" placeholder="Company name"/></label><label>How should the data move?<textarea name="businessNeed" rows={4} placeholder="What data do you need to ingest, enrich, activate, or send?"/></label><button disabled={requestBusy}>{requestBusy?'Submitting…':'Submit connector request'}</button></form></div>}
 </main></PublicPageFrame>
}
function DemoPage({back,openApp}:{back:()=>void,openApp:()=>void}){
 const [step,setStep]=useState(1)
 const [selectedDay,setSelectedDay]=useState('')
 const [selectedTime,setSelectedTime]=useState('11:00 AM')
 const [demoRequestId,setDemoRequestId]=useState('')
 const [busy,setBusy]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<{kind:'ok'|'error'|'unknown'|'',text:string}>({kind:'',text:''})
 const [draft,setDraft]=useState<any>({conversion:'',source:'',match:'',identifier:''})
 useDirtyWork({key:'offline-attribution-rule-draft',label:'Offline attribution rule',dirty:builder,scope:'feature'})
 const [booking,setBooking]=useState<any>(null)
 const days=useMemo(()=>{
  const out:{key:string;label:string;date:string}[]=[]
  const d=new Date()
  d.setHours(12,0,0,0)
  while(out.length<5){
   d.setDate(d.getDate()+1)
   if(d.getDay()===0||d.getDay()===6)continue
   const key=d.toISOString().slice(0,10)
   out.push({key,label:d.toLocaleDateString(undefined,{weekday:'short',day:'2-digit',month:'short'}),date:key})
  }
  return out
 },[])
 useEffect(()=>{if(!selectedDay&&days[0])setSelectedDay(days[0].date)},[days,selectedDay])
 const submit=async(e:any)=>{
  e.preventDefault();setBusy('lead');setNotice('')
  const payload=Object.fromEntries(new FormData(e.currentTarget).entries())
  try{
   const r:any=await api.submitDemo(payload)
   setDemoRequestId(r.id);setStep(2)
  }catch(err:any){setNotice(err?.message||'Demo request could not be saved.')}
  finally{setBusy('')}
 }
 const startsAt=()=>{
  if(!selectedDay||!selectedTime)return ''
  const [time,period]=selectedTime.split(' ')
  let [hour,minute]=time.split(':').map(Number)
  if(period==='PM'&&hour!==12)hour+=12
  if(period==='AM'&&hour===12)hour=0
  const [year,month,day]=selectedDay.split('-').map(Number)
  return new Date(year,month-1,day,hour,minute||0,0,0).toISOString()
 }
 const confirm=async()=>{
  if(!demoRequestId||!selectedDay||!selectedTime){setNotice('Choose a date and time before confirming.');return}
  setBusy('booking');setNotice('')
  try{
   const r:any=await api.confirmDemoBooking({demoRequestId,startsAt:startsAt()})
   setBooking(r);setStep(3);setNotice('Your product walkthrough is confirmed.')
  }catch(err:any){setNotice(err?.message||'The demo slot could not be confirmed.')}
  finally{setBusy('')}
 }
 return <div className="standalone-page demo-page">
  <div className="standalone-top"><Brand/><button onClick={back}>Back to website</button></div>
  <section className="standalone-hero demo-hero"><div><span className="kicker">BOOK A DEMO</span><h1>Stop wasting ad spend on junk leads.</h1><p>See how a stitched customer journey, cleaner conversion signals and funnel agents can improve lead quality, conversion and attribution.</p><div className="demo-benefits">{[['01','Cleaner data','Connect ad platforms, CRM, calls and messaging into one journey.'],['02','Quality over volume','Optimize campaigns for qualified and closed outcomes, not raw form fills.'],['03','Fast setup path','Use connector and agent patterns instead of rebuilding your whole martech stack.']].map(x=><article key={x[0]}><span>{x[0]}</span><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</div></div>
  <div className="demo-booking-card">
   {step===1?<form onSubmit={submit}><h2>Tell us about your funnel</h2><label>Work email<input name="email" required type="email" placeholder="name@company.com"/></label><label>Company<input name="company" required placeholder="Company name"/></label><label>Monthly digital marketing budget<select name="budget" required defaultValue=""><option value="" disabled>Select budget</option><option>Under ₹5L</option><option>₹5L – ₹25L</option><option>₹25L – ₹1Cr</option><option>₹1Cr – ₹5Cr</option><option>₹5Cr+</option></select></label><label>Burning pain point<select name="painPoint" required defaultValue=""><option value="" disabled>Select pain point</option><option>Junk / low-quality leads</option><option>Conversion leakage</option><option>Offline attribution</option><option>CRM context</option><option>Cross-platform reporting</option></select></label><button type="submit" disabled={busy==='lead'}>{busy==='lead'?'Saving…':'Continue to scheduling'} <ArrowRight/></button>{notice&&<small className="login-error" role="status">{notice}</small>}</form>
   :step===2?<div className="calendar-step"><h2>Select a date & time</h2><p>Choose a live future slot. Confirmation is persisted by the AceMarketing backend before success is shown.</p><div className="calendar-days">{days.map(x=><button key={x.key} className={selectedDay===x.date?'active':''} onClick={()=>setSelectedDay(x.date)}>{x.label}</button>)}</div><div className="calendar-slots">{['10:00 AM','11:00 AM','2:00 PM','3:30 PM','5:00 PM'].map(x=><button key={x} className={selectedTime===x?'active':''} onClick={()=>setSelectedTime(x)}>{x}</button>)}</div>{selectedDay&&selectedTime&&<div className="slot-confirm"><Check/><div><b>{days.find(x=>x.date===selectedDay)?.label} · {selectedTime}</b><span>45-minute product walkthrough</span></div><button disabled={busy==='booking'} onClick={confirm}>{busy==='booking'?'Confirming…':'Confirm demo booking'}</button></div>}{notice&&<small className="login-error" role="status">{notice}</small>}</div>
   :<div className="calendar-step demo-booking-success"><CheckCircle2/><h2>Demo booked</h2><p role="status">{notice}</p><div className="slot-confirm"><Check/><div><b>{booking?.startsAt?new Date(booking.startsAt).toLocaleString():'Confirmed slot'}</b><span>{booking?.durationMinutes||45}-minute product walkthrough · booking {booking?.id}</span></div></div><button onClick={openApp}>Open interactive product <ArrowRight/></button></div>}
  </div></section>
  <section className="demo-proof-band"><article><Sparkles/><h3>Simple & intuitive</h3><p>Designed to shorten the time from disconnected data to actionable funnel insight.</p></article><article><Cable/><h3>Connect existing tools</h3><p>Keep the CRM, calling, messaging and advertising systems your teams already use.</p></article><article><BarChart3/><h3>Usage-aware deployment</h3><p>Architecture supports usage metering and scalable packaging without inventing fixed public prices.</p></article></section>
  <section className="source-conflict-note"><ShieldCheck/><div><b>Connector availability boundary</b><p>Integration cards clearly distinguish native OAuth connectors from configurable adapters. Shopify remains available through the connector/adaptor framework without implying unsupported native capabilities.</p></div></section>
 </div>
}
function CompanyPage({back,openDemo}:{back:()=>void,openDemo:()=>void}){
 return <div className="standalone-page company-page"><div className="standalone-top"><Brand/><button onClick={back}>Back to website</button></div>
  <section className="standalone-hero company-hero"><span className="kicker">COMPANY</span><h1>Built around the reality of complex performance marketing funnels.</h1><p>AceMarketing is being developed as a SaaS operating layer for teams that need attribution, signal activation, funnel automation and first-party data workflows without rebuilding every system in-house.</p><button onClick={openDemo}>Talk to the product team <ArrowRight/></button></section>
  <section className="company-values"><div className="section-title"><span className="kicker dark">OPERATING PRINCIPLES</span><h2>Implementation is not a template.</h2></div><div>{[
 ['If data can solve it, we try','Hard attribution and funnel problems are not automatically out of scope; unusual paths should be investigated and mapped.'],
 ['Built from performance-marketing reality','The product is designed around CPL, attribution, lead quality and campaign operations rather than generic software abstractions.'],
 ['Build to the real funnel','Different CRMs, channels and definitions of a qualified lead need implementation that matches the business instead of a clean demo default.']
 ].map((x,i)=><article key={x[0]}><span>0{i+1}</span><h3>{x[0]}</h3><p>{x[1]}</p></article>)}</div></section>
  <section className="custom-services"><div><span className="kicker">CUSTOM SERVICES</span><h2>Extend the platform when the standard path is not enough.</h2><p>Architecture accommodates attribution modeling, server-to-server integrations, cohort-style reporting, automated reports and custom data-engineering workflows.</p></div><div className="service-grid">{['Server-to-server integration','Attribution modeling','Cohort / media planning reports','Automated reports','Custom event design','Bespoke connector pipelines'].map(x=><article key={x}><Check/><b>{x}</b></article>)}</div></section>
 </div>
}

function SolutionsPage({back,openDemo,openApp}:{back:()=>void,openDemo:()=>void,openApp:()=>void}){
 const solutions=[
  ['Agency','Manage multiple client funnels, workspaces, conversion definitions and signal destinations with repeatable implementation patterns.','Multi-workspace operations'],
  ['Lead Generation','Return qualified and closed outcomes to ad platforms, enrich leads and automate handoffs between form, CRM, calls and sales.','Quality over raw volume'],
  ['Enterprise','Add RBAC, auditability, retention policies, monitoring and custom integration patterns for complex organizations.','Governed activation'],
  ['Mid-Market Brand','Connect the existing stack quickly and focus on signal quality, attribution and audience suppression without a large data team.','Fast implementation'],
  ['Attribution Model','Stitch sessions, CRM stages, calls and offline outcomes to measure first touch, last touch and full-path contribution.','Journey-level ROI'],
  ['Alerts & Monitoring','Watch delivery rates, click-ID coverage, sync freshness, connector tokens and failed-event queues.','Operational reliability'],
  ['Server-to-Server Integration','Move event and identity data directly between backend systems when browser pixels or standard connectors are insufficient.','Custom pipelines']
 ]
 return <div className="standalone-page solutions-page"><div className="standalone-top"><Brand/><button onClick={back}>Back to website</button></div>
  <section className="standalone-hero solutions-hero"><span className="kicker">SOLUTIONS</span><h1>Different operating models, one first-party data layer.</h1><p>AceMarketing connects acquisition, identity, attribution, conversion operations and activation in one operating layer.</p><div className="hero-actions"><button className="btn-primary" onClick={openApp}>Explore product <ArrowRight/></button><button className="btn-secondary-light" onClick={openDemo}>Book a demo</button></div></section>
  <section className="solution-detail-grid">{solutions.map((x,i)=><article key={x[0]}><span>{String(i+1).padStart(2,'0')}</span><div><h2>{x[0]}</h2><p>{x[1]}</p><b>{x[2]}</b></div><ChevronRight/></article>)}</section>
  <section className="solution-architecture"><div><span className="kicker">SERVER-TO-SERVER</span><h2>When a standard connector is not enough.</h2><p>Use authenticated API calls, webhooks and idempotent event IDs to connect proprietary CRMs, billing systems, call centers and internal data stores.</p></div><div className="s2s-flow">{['Source system','Normalize','Identity match','Business event','Destination'].map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b>{i<4&&<ArrowRight/>}</div>)}</div></section>
 </div>
}

function CaseStudiesPage({back,openDemo}:{back:()=>void,openDemo:()=>void}){
 const fallback=[
  {sector:'Education',name:'Leverage Edu',title:'Quality-first enrolment signal activation',challenge:['Lead volume alone did not represent enrolment quality','Form, call and counsellor outcomes needed deduplication','Paid media needed downstream outcome feedback'],solution:['Stitch form, call and counsellor identity','Return verified enrolment outcomes server-side','Use qualified outcomes rather than raw leads for optimization'],metrics:[['Reference benchmark','−38% cost per qualified lead'],['Pattern','Server-side enrolment outcomes'],['Focus','Lead quality']]},
  {sector:'Healthcare',name:'India IVF',title:'Faster qualification and consultation conversion',challenge:['Lead response and qualification timing affected consultation conversion','Sales teams needed context at first contact','Campaign optimization needed qualified downstream outcomes'],solution:['Grade every lead on arrival','Route with stitched acquisition and behavior context','Qualify quickly and return consultation outcomes'],metrics:[['Reference benchmark','+52% lead-to-consultation conversion'],['Pattern','Lead grading + fast routing'],['Focus','Consultation conversion']]},
  {sector:'Consumer goods',name:'Blue Tokai',title:'Full-path visibility across web, app and offline',challenge:['Revenue contribution was obscured by disconnected touchpoints','Offline outcomes were separated from digital acquisition','Last-click reporting missed assisted influence'],solution:['Stitch web, app and offline interactions','Resolve identities across touchpoints','Measure contribution through full-path attribution'],metrics:[['Reference benchmark','31% revenue re-attributed'],['Pattern','Cross-channel journey stitching'],['Focus','Visibility & attribution']]},
  {sector:'Healthcare',name:'Apollo Ayurvaid',title:'Assisted-call and messaging attribution',challenge:['Inbound calls were disconnected from campaign context','Messaging enquiries were missing from conversion reporting','Telephony outcomes could not improve paid-media optimization'],solution:['Ingest telephony events through API','Match calls to recent first-party sessions and click identifiers','Return verified assisted-conversion outcomes server-side'],metrics:[['Match pattern','Session + identity'],['Channels','Search + social'],['Outcome','Assisted signal restored']]},
  {sector:'Education',name:'Jaro Education',title:'High-volume lead and conversion operations',challenge:['Large daily lead volume across many ad accounts','Complex CRM stage mappings','Fragmented conversion imports at scale'],solution:['Normalize CRM stages into a canonical event model','Centralize conversion delivery across accounts','Use real-time qualified and closed-stage signals'],metrics:[['Reference benchmark','+41% enrolment rate'],['Coverage','Multi-account'],['Focus','Stage-based activation']]},
  {sector:'High-consideration commerce',name:'GemPundit',title:'Messaging journey and partial-payment measurement',challenge:['Long consideration cycle spans web and messaging','Partial payments hide eventual value','Click identity is easily lost after the landing session'],solution:['Persist first-party click identity','Bridge web and messaging identities','Record partial-payment and adjusted-value outcomes'],metrics:[['Bridge','Web → messaging'],['Signal','Partial payment'],['Optimization','Value-aware bidding']]},
  {sector:'Home services',name:'Berger Paints',title:'Quality-first assisted acquisition',challenge:['Assisted lead generation spans messaging and offline follow-up','Campaign quality cannot be judged by lead count alone','Operations need continuous signal monitoring'],solution:['Activate server-side conversion feedback','Return qualified CRM and offline outcomes','Create business-specific assisted-conversion events'],metrics:[['Goal','Lower acquisition waste'],['Signal','Quality outcomes'],['Ops','Continuous monitoring']]}
 ]
 const requestedCase=()=>decodeURIComponent(new URLSearchParams((window.location.hash.split('?')[1]||'')).get('case')||'')
 const [studies,setStudies]=useState<any[]>(fallback)
 const [active,setActive]=useState(()=>Math.max(0,fallback.findIndex(x=>x.name===requestedCase())))
 useEffect(()=>{api.publicCaseStudies().then((r:any)=>{if(r?.items?.length)setStudies(r.items)}).catch(()=>null)},[])
 useEffect(()=>{const wanted=requestedCase();if(!wanted)return;const idx=studies.findIndex((x:any)=>x.name===wanted);if(idx>=0)setActive(idx)},[studies])
 const current=studies[active]||studies[0]
 return <div className="standalone-page case-study-page">
  <div className="standalone-top"><Brand/><button onClick={back}>Back to website</button></div>
  <section className="standalone-hero case-study-hero"><span className="kicker">CASE STUDIES</span><h1>Implementation patterns for funnels with real assisted and offline complexity.</h1><p>These examples are external reference patterns, not AceMarketing customer claims. The implementation approach is rewritten in AceMarketing’s own language.</p></section>
  <section className="case-study-selector">{studies.map((s:any,i:number)=><button key={s.name} className={active===i?'active':''} onClick={()=>setActive(i)}><span>{String(i+1).padStart(2,'0')}</span><div><b>{s.name}</b><small>{s.sector}</small></div><ChevronRight/></button>)}</section>
  {current&&<section className="case-study-focus"><div className="case-study-title"><span>{current.sector}</span><h2>{current.name}</h2><h3>{current.title}</h3></div><div className="case-columns"><div><b>The challenge</b>{current.challenge.map((x:string)=><p key={x}><span>•</span>{x}</p>)}</div><div><b>Implementation pattern</b>{current.solution.map((x:string)=><p key={x}><Check/>{x}</p>)}</div></div><div className="case-metrics">{current.metrics.map((x:any)=><div key={x[0]}><strong>{x[0]}</strong><small>{x[1]}</small></div>)}</div></section>}
  <section className="case-study-cta"><div><span className="kicker">MAP THE PATTERN</span><h2>Translate the same operating model to your own CRM, channels and offline steps.</h2><p>Use the walkthrough to define identity, stages, activation rules, and revenue feedback.</p></div><button onClick={openDemo}>Book implementation walkthrough <ArrowRight/></button></section>
 </div>
}

function ResourcesPage({back}:{back:()=>void}){
 const fallback=[
  {id:'custom-events',title:'Custom Events',summary:'Define conversion events around the business outcomes your teams actually care about.',sections:['Choose the business state that should become a conversion event.','Define a stable event name, event_id and customer identity keys.','Validate source timestamps, click identifiers and duplicate rules.','Send only the fields required by each destination and retain the delivery audit trail.']},
  {id:'server-activation',title:'Server-Side Activation',summary:'Design reliable server-side conversion delivery for ad and analytics destinations.',sections:['Capture first-party identifiers before the browser context disappears.','Normalize qualified, booked and revenue outcomes in the backend.','Deliver conversion events with retries, deduplication and destination receipts.','Monitor delivery health and stale-token conditions.']},
  {id:'attribution',title:'Attribution',summary:'Create one evidence trail across acquisition, assisted interactions and closed revenue.',sections:['Stitch anonymous sessions to known identities when deterministic evidence appears.','Preserve campaign and click context through CRM and offline stages.','Compare first-touch, last-touch and full-path models.','Use the same revenue truth for reporting and signal return.']}
 ]
 const initialTab=()=>new URLSearchParams((window.location.hash.split('?')[1]||'')).get('tab')||'guides'
 const [tab,setTab]=useState(initialTab())
 const [docs,setDocs]=useState<any[]>(fallback)
 const [center,setCenter]=useState<any>({blogs:[],ebooks:[],documentation:[],useCases:[],voiceAgent:null})
 const [selected,setSelected]=useState<string|null>(null)
 const active=docs.find((x:any)=>x.id===selected)
 useEffect(()=>{api.publicResources().then((r:any)=>r?.items?.length&&setDocs(r.items)).catch(()=>null);api.publicResourceCenter().then((r:any)=>setCenter(r)).catch(()=>null)},[])
 useEffect(()=>{const fn=()=>setTab(initialTab());window.addEventListener('hashchange',fn);return()=>window.removeEventListener('hashchange',fn)},[])
 const choose=(x:string)=>{setTab(x);window.location.hash='#/resources?tab='+x}
 const [spend,setSpend]=useState(100000); const [revenue,setRevenue]=useState(350000); const roas=spend?revenue/spend:0
 const [hashInput,setHashInput]=useState(''); const [hashOutput,setHashOutput]=useState('')
 const hash=async()=>{if(!hashInput)return;const bytes=new TextEncoder().encode(hashInput.trim().toLowerCase());const digest=await crypto.subtle.digest('SHA-256',bytes);setHashOutput(Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join(''))}
 return <div className="standalone-page resources-page"><div className="standalone-top"><Brand/><button onClick={back}>Back to website</button></div>
 <section className="standalone-hero resources-hero"><span className="kicker">RESOURCES</span><h1>Learn, calculate, hash, and implement from one resource center.</h1><p>Dedicated surfaces for guides, use cases, articles, ebooks, documentation, privacy-safe hashing, ROAS calculation and voice-agent workflows.</p></section>
 <section className="problem-tabs resource-tabs">{[['guides','Guides'],['use-cases','Use Cases'],['blogs','Blogs'],['ebooks','Ebooks'],['docs','Documentation'],['hash','No Net Hash'],['roas','ROAS Calculator'],['voice','Voice Agent']].map(x=><button key={x[0]} className={tab===x[0]?'active':''} onClick={()=>choose(x[0])}>{x[1]}</button>)}</section>
 {tab==='guides'&&<section className="resource-grid">{docs.map((x:any,i:number)=><article key={x.id}><span>{String(i+1).padStart(2,'0')}</span><h3>{x.title}</h3><p>{x.summary}</p><button onClick={()=>setSelected(x.id)}>Read guide <ArrowRight/></button></article>)}</section>}
 {tab==='use-cases'&&<section className="resource-grid">{(center.useCases||[]).map((x:any,i:number)=><article key={x.title}><span>{String(i+1).padStart(2,'0')}</span><h3>{x.title}</h3>{x.workflow.map((y:string)=><p key={y}><Check/> {y}</p>)}</article>)}</section>}
 {tab==='blogs'&&<section className="resource-grid">{(center.blogs||[]).map((x:any,i:number)=><article key={x.id}><span>{x.category}</span><h3>{x.title}</h3><p>{x.summary}</p><button onClick={()=>choose('docs')}>Read implementation notes <ArrowRight/></button></article>)}</section>}
 {tab==='ebooks'&&<section className="resource-grid">{(center.ebooks||[]).map((x:any)=><article key={x.id}><BookOpen/><h3>{x.title}</h3><p>{x.summary}</p>{x.chapters.map((y:string)=><p key={y}><Check/> {y}</p>)}</article>)}</section>}
 {tab==='docs'&&<section className="resource-grid">{(center.documentation||[]).map((x:any,i:number)=><article key={x.group}><span>{String(i+1).padStart(2,'0')}</span><h3>{x.group}</h3>{x.items.map((y:string)=><p key={y}><Code2/> {y}</p>)}</article>)}</section>}
 {tab==='hash'&&<section className="resource-tools"><div className="tool-grid"><article><ShieldCheck/><h3>No Net Hash</h3><p>Generate SHA-256 locally in your browser. Raw input is never sent to the backend.</p><label>Email / phone<input value={hashInput} onChange={e=>setHashInput(e.target.value)} placeholder="example@email.com"/></label><button onClick={hash}>Hash locally</button>{hashOutput&&<div className="hash-output">{hashOutput}</div>}</article></div></section>}
 {tab==='roas'&&<section className="resource-tools"><div className="tool-grid"><article><BarChart3/><h3>ROAS Calculator</h3><label>Ad spend<input type="number" value={spend} onChange={e=>setSpend(Number(e.target.value))}/></label><label>Attributed revenue<input type="number" value={revenue} onChange={e=>setRevenue(Number(e.target.value))}/></label><div className="tool-result"><span>ROAS</span><strong>{roas.toFixed(2)}×</strong><small>{(roas*100).toFixed(0)}% revenue-to-spend ratio</small></div></article></div></section>}
 {tab==='voice'&&center.voiceAgent&&<section className="case-study-focus"><div className="case-study-title"><span>VOICE AGENT</span><h2>{center.voiceAgent.title}</h2><p>{center.voiceAgent.summary}</p></div><div className="resource-grid">{center.voiceAgent.capabilities.map((x:string,i:number)=><article key={x}><span>{String(i+1).padStart(2,'0')}</span><h3>{x}</h3><p>Runs on stitched journey context with workspace permissions and approval boundaries.</p></article>)}</div></section>}
 {active&&<div className="resource-guide-overlay" onClick={()=>setSelected(null)}><article className="resource-guide" onClick={e=>e.stopPropagation()}><button className="resource-guide-close" onClick={()=>setSelected(null)}><X/></button><span>IMPLEMENTATION GUIDE</span><h2>{active.title}</h2><p>{active.summary}</p><ol>{active.sections.map((x:string)=><li key={x}>{x}</li>)}</ol><button className="resource-guide-done" onClick={()=>setSelected(null)}>Done</button></article></div>}
 </div>
}
function LegalPage({kind,back}:{kind:'privacy'|'terms'|'security',back:()=>void}){
 const content=kind==='privacy'?['Privacy','How AceMarketing handles workspace, event and first-party identifier data.',['Data is scoped to the workspace that submitted it.','Connector credentials should be stored in a secret-management layer in production.','Consent, retention, export and deletion controls are product requirements.','Optional marketing/analytics cookies should follow the preferences selected by the visitor.']]:kind==='terms'?['Terms','Product-use terms placeholder for the AceMarketing implementation.',['Do not use the platform to send unlawful or deceptive conversion data.','Customers remain responsible for permissions to connect their advertising, CRM and messaging accounts.','Production SLAs, commercial terms and data-processing terms require a finalized agreement.','Reference performance metrics in the UI are not guarantees of future results.']]:['Security','Security architecture and certification-status transparency.',['Authentication, tenant isolation and RBAC are required before production launch.','Sensitive identifiers should be hashed or encrypted according to the destination workflow.','Audit logs, retry history and connector changes must remain observable.','ISO/GDPR/HIPAA/DPDP labels shown elsewhere are parity targets unless independently verified.']]
 return <div className="standalone-page legal-page"><div className="standalone-top"><Brand/><button onClick={back}>Back to website</button></div><section className="standalone-hero"><span className="kicker">{content[0]}</span><h1>{content[1]}</h1></section><section className="legal-content">{(content[2] as string[]).map((x,i)=><article key={x}><span>{String(i+1).padStart(2,'0')}</span><p>{x}</p></article>)}</section></div>
}

function Pricing({back,openApp,openDemo}:{back:()=>void,openApp:()=>void,openDemo:()=>void}){
 const [leads,setLeads]=useState(5000)
 const [dataHomes,setDataHomes]=useState<string[]>(['CRM'])
 const [challenges,setChallenges]=useState<string[]>(['Lead quality'])
 const [channels,setChannels]=useState<string[]>(['Google Ads','Meta Ads'])
 const localRecommended=agents.filter(a=>{
  if(challenges.includes('Lead quality')&&a[2]==='Lead Quality')return true
  if(challenges.includes('Conversion leakage')&&a[2]==='Conversion')return true
  if(challenges.includes('Attribution')&&a[2]==='Visibility')return true
  return false
 })
 const [recommendedNames,setRecommendedNames]=useState<string[]>(localRecommended.map(a=>a[0]))
 const recommended=agents.filter(a=>recommendedNames.includes(a[0]))
 const [selected,setSelected]=useState<string[]>([])
 const [quoteState,setQuoteState]=useState<'idle'|'sending'|'saved'|'error'>('idle')
 const activeSelected=selected.length?selected:recommended.map(a=>a[0])
 const toggle=(list:string[],value:string,setter:(v:string[])=>void)=>setter(list.includes(value)?list.filter(x=>x!==value):[...list,value])
 useEffect(()=>{
  const t=setTimeout(()=>api.pricingRecommendation({challenges,channels,dataHomes,leads}).then(r=>setRecommendedNames(r.recommended)).catch(()=>setRecommendedNames(localRecommended.map(a=>a[0]))),180)
  return()=>clearTimeout(t)
 },[challenges.join('|'),channels.join('|'),dataHomes.join('|'),leads])
 const requestQuote=async()=>{
  setQuoteState('sending')
  try{
   await api.submitQuote({leads,dataHomes,challenges,channels,agents:activeSelected})
   setQuoteState('saved')
  }catch{setQuoteState('error')}
 }
 return <div className="pricing-page">
  <div className="pricing-top"><Brand/><button onClick={back}>Back to website</button></div>
  <section className="pricing-hero"><span className="kicker">PRICING</span><h1>Build a stack around the way your funnel actually works.</h1><p>Choose your data sources, growth challenges and channels. AceMarketing uses the backend recommendation service to assemble a practical starting configuration, then captures the setup for a sales quote.</p></section>
  <section className="pricing-builder">
   <div className="pricing-step"><span>1</span><div><h2>Tell us about your setup</h2><p>Configure the environment used for agent recommendations.</p></div></div>
   <div className="pricing-card">
    <label>Monthly lead volume <strong>{leads.toLocaleString()}</strong><input type="range" min="200" max="100000" step="200" value={leads} onChange={e=>setLeads(Number(e.target.value))}/><small>200 <b>100,000+</b></small></label>
    <div className="choice-block"><h3>Where does your data live?</h3><div>{['CRM','Website / App','WhatsApp','Calling','Data warehouse','Custom backend'].map(x=><button key={x} className={dataHomes.includes(x)?'active':''} onClick={()=>toggle(dataHomes,x,setDataHomes)}>{x}</button>)}</div></div>
    <div className="choice-block"><h3>Select your current data challenges</h3><div>{['Lead quality','Conversion leakage','Attribution'].map(x=><button key={x} className={challenges.includes(x)?'active':''} onClick={()=>toggle(challenges,x,setChallenges)}>{x}</button>)}</div></div>
    <div className="choice-block"><h3>Which channels do you run?</h3><div>{['Google Ads','Meta Ads','LinkedIn Ads','Microsoft Ads','Offline'].map(x=><button key={x} className={channels.includes(x)?'active':''} onClick={()=>toggle(channels,x,setChannels)}>{x}</button>)}</div></div>
   </div>
   <div className="pricing-step"><span>2</span><div><h2>Choose your agents</h2><p>Recommended agents are refreshed by the backend from your selected challenges.</p></div></div>
   <div className="pricing-agent-grid">{agents.map(a=>{const isOn=activeSelected.includes(a[0]);return <article className={isOn?'selected':''} key={a[0]}><div><span>{a[2]}</span>{recommended.some(r=>r[0]===a[0])&&<b>RECOMMENDED</b>}</div><h3>{a[0]}</h3><strong>{a[3]}</strong><p>{a[1]}</p><button onClick={()=>setSelected(isOn?activeSelected.filter(x=>x!==a[0]):[...activeSelected,a[0]])}>{isOn?'Remove':'Add agent'}</button></article>})}</div>
   <aside className="pricing-summary"><div><span>Your stack</span><strong>{activeSelected.length} agents</strong></div><div><span>Monthly lead volume</span><strong>{leads.toLocaleString()}</strong></div><div><span>Channels</span><strong>{channels.length}</strong></div><div className="quote"><span>Estimated total</span><strong>Custom quote</strong><small>Pricing depends on selected agents, data volume, destinations and deployment requirements.</small></div><button onClick={openApp}>Open workspace <ArrowRight/></button><button className="outline" onClick={requestQuote} disabled={quoteState==='sending'}>{quoteState==='sending'?'Saving configuration…':quoteState==='saved'?'Configuration saved':'Request quote'}</button>{quoteState==='saved'&&<small className="pricing-saved">Your configuration was captured by the backend. Continue to the demo form to share contact details.</small>}{quoteState==='error'&&<small className="pricing-error">Could not save the configuration. Try again or open the demo form.</small>}<button className="pricing-sales-link" onClick={openDemo}>Talk to sales</button></aside>
  </section>
 </div>
}

function DemoSection({openApp,openDemo}:{openApp:()=>void,openDemo:()=>void}){
 const [sent,setSent]=useState(false)
 const [sending,setSending]=useState(false)
 const [error,setError]=useState('')
 const [requestId,setRequestId]=useState('')
 const submit=async(e:any)=>{
  e.preventDefault();setSending(true);setError('')
  const form=new FormData(e.currentTarget)
  try{
   const r:any=await api.submitDemo(Object.fromEntries(form.entries()))
   setRequestId(r.id||'');setSent(true)
  }catch(err:any){setError(err?.message||'Demo request could not be saved. Please try again.')}
  finally{setSending(false)}
 }
 return <section className="demo-cta" id="demo"><div className="demo-copy"><span className="kicker">SEE THE PRODUCT FLOW</span><h2>Operate the entire paid funnel from one workspace.</h2><p>Connect → observe → enrich → qualify → activate → attribute → learn.</p><button onClick={openApp}>Open interactive workspace <ArrowRight/></button></div><form className="demo-form" onSubmit={submit}>{sent?<div className="demo-success"><Check/><h3>Demo request captured</h3><p>Your request is stored. Continue to scheduling to choose a persisted 45-minute walkthrough slot.</p>{requestId&&<small>Request ID: {requestId}</small>}<button type="button" onClick={openDemo}>Choose date & time <ArrowRight/></button></div>:<><h3>Book a product walkthrough</h3><label>Work email<input name="email" required type="email" placeholder="name@company.com"/></label><label>Company<input name="company" required placeholder="Company name"/></label><label>Monthly ad spend<select name="monthlyAdSpend" defaultValue=""><option value="" disabled>Select range</option><option>Under ₹5L</option><option>₹5L – ₹25L</option><option>₹25L – ₹1Cr</option><option>₹1Cr+</option></select></label><label>Primary challenge<select name="primaryChallenge" defaultValue=""><option value="" disabled>Select challenge</option><option>Lead quality</option><option>Conversion leakage</option><option>Attribution</option><option>Tracking/data quality</option></select></label><button type="submit" disabled={sending}>{sending?'Sending…':'Request demo'} <ArrowRight/></button>{error&&<small className="pricing-error" role="alert">{error}</small>}</>}</form></section>
}
function Login({back,openApp}:{back:()=>void,openApp:()=>void}){
 const [email,setEmail]=useState('')
 const [password,setPassword]=useState('')
 const [show,setShow]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [loading,setLoading]=useState(false)
 const [mode,setMode]=useState<'login'|'forgot'|'reset'>('login')
 const [resetToken,setResetToken]=useState('')
 useEffect(()=>{
  if(typeof window==='undefined')return
  const params=new URLSearchParams(window.location.search)
  const googleCode=params.get('google_code')
  const googleWorkspace=params.get('google_workspace')
  const authError=params.get('auth_error')
  const reset=params.get('reset_token')
  if(authError==='not_member')setError('This Google account is not an active workspace member.')
  if(reset){setResetToken(reset);setMode('reset')}
  if(googleCode&&googleWorkspace){
   setLoading(true)
   api.googleLoginExchange(googleCode,googleWorkspace).then(()=>{window.history.replaceState({},'',window.location.pathname+window.location.hash);openApp()}).catch((e:any)=>setError(e?.message||'Google login exchange failed.')).finally(()=>setLoading(false))
  }
 },[])
 const submit=async(e:any)=>{e.preventDefault();setLoading(true);setError('');setNotice('');try{await api.login(email,password);openApp()}catch(e:any){setError(e?.message||'Login failed.')}finally{setLoading(false)}}
 const google=async()=>{setLoading(true);setError('');try{const r:any=await api.googleLoginStart();if(r.authorizationUrl)window.location.assign(r.authorizationUrl);else setError('Google login is not configured.')}catch(e:any){setError(e?.message||'Google login could not start.');setLoading(false)}}
 const forgot=async(e:any)=>{e.preventDefault();setLoading(true);setError('');setNotice('');try{const r:any=await api.forgotPassword(email);setNotice(r?.developmentResetToken?'Reset requested. Development token: '+r.developmentResetToken:'If the account exists, a reset link has been sent.');if(r?.developmentResetToken){setResetToken(r.developmentResetToken);setMode('reset')}}catch(e:any){setError(e?.message||'Reset request failed.')}finally{setLoading(false)}}
 const reset=async(e:any)=>{e.preventDefault();setLoading(true);setError('');setNotice('');try{await api.resetPassword(resetToken,password);setNotice('Password reset complete. You can now sign in.');setMode('login');setPassword('')}catch(e:any){setError(e?.message||'Password reset failed.')}finally{setLoading(false)}}
 const loginForm=<form className="login-card" onSubmit={submit}><Brand dark/><h2>Log in to your workspace</h2><p>Use your organization credentials.</p><button type="button" className="google-login" disabled={loading} onClick={google}>G <span>{loading?'Connecting…':'Continue with Google'}</span></button><div className="or"><i/>OR<i/></div><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} required type="email" placeholder="you@company.com"/></label><label>Password<div className="password-field"><input value={password} onChange={e=>setPassword(e.target.value)} required type={show?'text':'password'} placeholder="••••••••"/><button type="button" onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div></label><div className="login-options"><label><input type="checkbox"/> Remember me</label><button type="button" onClick={()=>{setMode('forgot');setError('');setNotice('')}}>Forgot password?</button></div><button className="login-submit" disabled={loading}>{loading?'Signing in…':'Log in'} <ArrowRight/></button>{error&&<small className="login-error">{error}</small>}{notice&&<small className="login-notice">{notice}</small>}<small>Production access is workspace-scoped and role-based. Contact your workspace owner if you need an invitation.</small></form>
 const forgotForm=<form className="login-card" onSubmit={forgot}><Brand dark/><h2>Reset your password</h2><p>Enter your workspace email. Reset links expire after 30 minutes.</p><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} required type="email" placeholder="you@company.com"/></label><button className="login-submit" disabled={loading}>{loading?'Requesting…':'Send reset link'} <ArrowRight/></button><button type="button" className="login-secondary-action" onClick={()=>setMode('login')}>Back to login</button>{error&&<small className="login-error">{error}</small>}{notice&&<small className="login-notice">{notice}</small>}</form>
 const resetForm=<form className="login-card" onSubmit={reset}><Brand dark/><h2>Choose a new password</h2><p>Use at least 8 characters. Completing the reset revokes existing sessions for this user.</p><label>New password<div className="password-field"><input value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} type={show?'text':'password'} placeholder="••••••••"/><button type="button" onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div></label><button className="login-submit" disabled={loading||!resetToken}>{loading?'Updating…':'Reset password'} <ArrowRight/></button><button type="button" className="login-secondary-action" onClick={()=>setMode('login')}>Back to login</button>{error&&<small className="login-error">{error}</small>}{notice&&<small className="login-notice">{notice}</small>}</form>
 return <div className="login-page"><div className="login-brand"><Brand/><button onClick={back}>Back to website</button></div><div className="login-shell"><div className="login-story"><span className="kicker">ACE MARKETING PLATFORM</span><h1>One workspace for the complete acquisition journey.</h1><p>Connect paid media, CRM, calls, messaging and offline outcomes — then activate clean signals and measure revenue in one place.</p><div className="login-flow">{['Connect','Stitch','Enrich','Activate','Attribute'].map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b>{i<4&&<ArrowRight/>}</div>)}</div></div>{mode==='login'?loginForm:mode==='forgot'?forgotForm:resetForm}</div></div>
}
const appTabs=[
 ['Launchpad',WandSparkles],['Overview',Gauge],['AdSync',RadioTower],['ChatGPT Ads',Bot],['Funnel',BarChart3],['Leak Monitor',AlertTriangle],['Events',Zap],['Adjustments',CircleDollarSign],['Diagnostics',ShieldCheck],['Match Quality',Gauge],['Reconciliation',Activity],['Fraud',ShieldCheck],['Deep Links',Network],['Sites',Globe2],['Fingerprinting',MousePointer2],['Live Sync',Activity],['Data Hub',DatabaseZap],['Customer 360',UsersRound],['Offline Attribution',PhoneCall],['Matchback',CircleDollarSign],['POS & Stores',Building2],['Journeys',Network],['Identity',UsersRound],['Models',Target],['Attribution',PieChart],['Planner',CircleDollarSign],['Reports',BarChart3],['Grouped Performance',Table2],['Executive Briefs',MessageSquareText],['Enrich',DatabaseZap],['Lead Grading',Target],['Behavior',MousePointer2],['Feed',Layers3],['Agents',Bot],['Routing',Network],['Follow-ups',MessageCircle],['Calls',PhoneIncoming],['Meetings',CalendarDays],['Feedback',MessageSquareText],['Approvals',CheckCircle2],['Ask Ace',Sparkles],['Integrations',Cable],['Data Flows',Network],['Real-Time Activation',Zap],['Personalization',Sparkles],['Exclusions',ShieldCheck],['Audiences',UsersRound],['Delivery',RadioTower],['Monitoring',Activity],['Alerts',Bell],['Compliance',ShieldCheck],['Developers',Code2],['Settings',Settings2]

] as const
const dashboardSections=[
 {id:'workspace',label:'Workspace',icon:Gauge,tabs:['Overview','Launchpad']},
 {id:'tracking',label:'Tracking & Data',icon:DatabaseZap,tabs:['AdSync','ChatGPT Ads','Funnel','Leak Monitor','Events','Adjustments','Diagnostics','Match Quality','Reconciliation','Fraud','Deep Links','Sites','Fingerprinting','Live Sync','Data Hub','Customer 360','Offline Attribution','Matchback','POS & Stores']},
 {id:'measurement',label:'Measurement & Intelligence',icon:PieChart,tabs:['Journeys','Identity','Models','Attribution','Planner','Reports','Grouped Performance','Executive Briefs']},
 {id:'conversion',label:'Lead & Conversion',icon:Target,tabs:['Enrich','Lead Grading','Behavior','Feed','Agents','Routing','Follow-ups','Calls','Meetings','Feedback','Approvals','Ask Ace']},
 {id:'activation',label:'Activation & Integrations',icon:RadioTower,tabs:['Integrations','Data Flows','Real-Time Activation','Personalization','Exclusions','Audiences','Delivery']},
 {id:'operations',label:'Operations & Developer',icon:Activity,tabs:['Monitoring','Alerts','Compliance','Developers','Settings']}
] as const
const tabMeta=Object.fromEntries(appTabs.map(([name,Icon])=>[name,{Icon}])) as Record<string,{Icon:any}>
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}
function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}</div>}
function Product({back}:{back:()=>void}){
 const [tab,setTab]=useState<AppTab>(()=>{const routed=parseWorkspaceTabFromHash(window.location.hash) as AppTab|null;const saved=window.localStorage.getItem('ace_active_tab') as AppTab|null;return routed||(saved&&appTabs.some(([name])=>name===saved)?saved:'Overview')})
 const [workspaceOpen,setWorkspaceOpen]=useState(false)
 const [mobileNavOpen,setMobileNavOpen]=useState(false)
 const [workspace,setWorkspace]=useState('Ace EdTech')
 const [workspaceGeneration,setWorkspaceGeneration]=useState(0)
 const [workspaceTransition,setWorkspaceTransition]=useState<any>(null)
 const [workspaces,setWorkspaces]=useState<any[]>([
  {name:'Ace EdTech',environment:'Production',initials:'AM'},
  {name:'Ace Healthcare',environment:'Production',initials:'AH'},
  {name:'Demo Sandbox',environment:'Sandbox',initials:'DS'}
 ])
 const [createOpen,setCreateOpen]=useState(false)
 const [workspaceDraft,setWorkspaceDraft]=useState({name:'',environment:'Production'})
 const [workspaceBusy,setWorkspaceBusy]=useState(false)
 const [search,setSearch]=useState('')
 const [regionOpen,setRegionOpen]=useState(false)
 const [navOpen,setNavOpen]=useState<Record<string,boolean>>(()=>{
  try{return {...Object.fromEntries(dashboardSections.map(s=>[s.id,true])),...JSON.parse(window.localStorage.getItem('ace_nav_sections')||'{}')}}catch{return Object.fromEntries(dashboardSections.map(s=>[s.id,true]))}
 })
 const [navFilter,setNavFilter]=useState('')
 const [sectionSummary,setSectionSummary]=useState<any>(null)
 const syncTabRoute=(next:AppTab,replace=false)=>{
  const feature=workspaceFeatureByLabel.get(next)
  if(!feature)return
  if(replace)window.history.replaceState(null,'',feature.canonicalHash)
  else window.history.pushState(null,'',feature.canonicalHash)
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
 useEffect(()=>{api.workspaces().then((r:any)=>{if(r.items?.length){setWorkspaces(r.items);if(!r.items.some((x:any)=>x.name===workspace))setWorkspace(r.items[0].name)}}).catch(()=>null)},[])
 useEffect(()=>{const load=()=>api.dashboardSummary().then((r:any)=>setSectionSummary(r)).catch(()=>null);load();const id=setInterval(load,30000);return()=>clearInterval(id)},[workspaceGeneration])
 useEffect(()=>{window.localStorage.setItem('ace_active_tab',tab)},[tab])
 useEffect(()=>{window.localStorage.setItem('ace_nav_sections',JSON.stringify(navOpen))},[navOpen])
 useEffect(()=>{const section=dashboardSections.find(s=>s.tabs.includes(tab as any));if(section&&!navOpen[section.id])setNavOpen(x=>({...x,[section.id]:true}))},[tab])
 useEffect(()=>{const openTab=(event:any)=>{const next=event?.detail as AppTab;if(appTabs.some(([name])=>name===next))navigateToTab(next)};window.addEventListener('ace-app-tab',openTab as EventListener);return()=>window.removeEventListener('ace-app-tab',openTab as EventListener)},[tab])
 useEffect(()=>{const syncFromHistory=()=>{const next=parseWorkspaceTabFromHash(window.location.hash) as AppTab|null;if(!next||next===tab)return;if(confirmDiscardDirtyWork(next))setTab(next);else syncTabRoute(tab,true)};window.addEventListener('popstate',syncFromHistory);window.addEventListener('hashchange',syncFromHistory);return()=>{window.removeEventListener('popstate',syncFromHistory);window.removeEventListener('hashchange',syncFromHistory)}},[tab])
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
  cancelWorkspaceRequests('workspace_scope_changed')
  window.localStorage.setItem('ace_workspace_id',x.id)
  try{
   const summary:any=await api.dashboardSummary()
   setSectionSummary(summary)
   setWorkspace(x.name)
   setWorkspaceGeneration(g=>g+1)
   setWorkspaceTransition(null)
  }catch(e:any){
   if(previousId)window.localStorage.setItem('ace_workspace_id',previousId)
   else window.localStorage.removeItem('ace_workspace_id')
   setWorkspaceTransition({state:'error',item:x,message:e?.message||'The target workspace could not be verified. Your previous workspace remains active.'})
  }
 }
 const createWorkspace=async()=>{
  if(!workspaceDraft.name.trim())return
  setWorkspaceBusy(true)
  try{
   const item:any=await api.createWorkspace(workspaceDraft)
   setWorkspaces(xs=>[...xs,item])
   setCreateOpen(false);setWorkspaceDraft({name:'',environment:'Production'})
   await chooseWorkspace(item)
  }finally{setWorkspaceBusy(false)}
 }
 const retryWorkspace=()=>workspaceTransition?.item&&chooseWorkspace(workspaceTransition.item)
 const searchMatches=search.trim()?appTabs.filter(([name])=>name.toLowerCase().includes(search.trim().toLowerCase())).slice(0,8):[]
 const runSearch=(name?:string)=>{const target=(name||searchMatches[0]?.[0]) as AppTab|undefined;if(target&&navigateToTab(target))setSearch('')}
 const currentWorkspace=workspaces.find(x=>x.name===workspace)||workspaces[0]
 const view=useMemo(()=>({Launchpad:<Suspense fallback={<LoadingState compact title="Loading launchpad" description="Loading workspace readiness."/>}><Launchpad/></Suspense>,Overview:<Suspense fallback={<LoadingState compact title="Loading overview" description="Loading acquisition command center."/>}><Overview/></Suspense>,AdSync:<Suspense fallback={<LoadingState compact title="Loading AdSync" description="Loading server-side signal activation."/>}><AdSync/></Suspense>,"ChatGPT Ads":<Suspense fallback={<LoadingState compact title="Loading ChatGPT Ads" description="Loading conversion measurement."/>}><ChatGPTAds/></Suspense>,Funnel:<Suspense fallback={<LoadingState compact title="Loading funnel" description="Loading campaign funnel evidence."/>}><Funnel/></Suspense>,"Leak Monitor":<Suspense fallback={<LoadingState compact title="Loading leak monitor" description="Loading funnel leak evidence."/>}><LeakMonitor/></Suspense>,Events:<Suspense fallback={<LoadingState compact title="Loading events" description="Loading conversion event manager."/>}><Events/></Suspense>,Adjustments:<Suspense fallback={<LoadingState compact title="Loading adjustments" description="Loading the Adjustments feature."/>}><Adjustments/></Suspense>,Diagnostics:<Suspense fallback={<LoadingState compact title="Loading diagnostics" description="Loading the Diagnostics feature."/>}><Diagnostics/></Suspense>,"Match Quality":<Suspense fallback={<LoadingState compact title="Loading match quality" description="Loading the Match Quality feature."/>}><MatchQuality/></Suspense>,Reconciliation:<Suspense fallback={<LoadingState compact title="Loading reconciliation" description="Loading the Reconciliation feature."/>}><Reconciliation/></Suspense>,Fraud:<Suspense fallback={<LoadingState compact title="Loading fraud controls" description="Loading the Fraud feature."/>}><Fraud/></Suspense>,"Deep Links":<Suspense fallback={<LoadingState compact title="Loading deep links" description="Loading app and web route evidence."/>}><DeepLinks/></Suspense>,Sites:<Suspense fallback={<LoadingState compact title="Loading sites" description="Loading site and pixel operations."/>}><Sites/></Suspense>,Fingerprinting:<Suspense fallback={<LoadingState compact title="Loading fingerprinting" description="Loading journey continuity evidence."/>}><Fingerprinting/></Suspense>,"Live Sync":<Suspense fallback={<LoadingState compact title="Loading live sync" description="Loading event-transfer evidence."/>}><LiveSync/></Suspense>,"Data Hub":<Suspense fallback={<LoadingState compact title="Loading Data Hub" description="Loading unified source evidence."/>}><DataHub/></Suspense>,"Customer 360":<Suspense fallback={<LoadingState compact title="Loading Customer 360" description="Loading canonical customer and journey evidence."/>}><Customer360/></Suspense>,"Offline Attribution":<Suspense fallback={<LoadingState compact title="Loading offline attribution" description="Loading assisted conversion and identity evidence."/>}><OfflineAttribution/></Suspense>,Matchback:<Suspense fallback={<LoadingState compact title="Loading matchback" description="Loading revenue reconciliation evidence."/>}><Matchback/></Suspense>,"POS & Stores":<Suspense fallback={<LoadingState compact title="Loading POS & Stores" description="Loading offline transaction evidence."/>}><POSAndStores/></Suspense>,Journeys:<Suspense fallback={<LoadingState compact title="Loading journeys" description="Loading stitched customer journey evidence."/>}><Journeys/></Suspense>,Identity:<Suspense fallback={<LoadingState compact title="Loading identity" description="Loading identity-resolution evidence."/>}><Identity/></Suspense>,Models:<Suspense fallback={<LoadingState compact title="Loading models" description="Loading the Models feature."/>}><Models/></Suspense>,Attribution:<Suspense fallback={<LoadingState compact title="Loading attribution" description="Loading full-path attribution evidence."/>}><Attribution/></Suspense>,Planner:<Suspense fallback={<LoadingState compact title="Loading planner" description="Loading the Planner feature."/>}><Planner/></Suspense>,Reports:<Suspense fallback={<LoadingState compact title="Loading reports" description="Loading the Reports feature."/>}><Reports/></Suspense>,"Grouped Performance":<Suspense fallback={<LoadingState compact title="Loading grouped performance" description="Loading grouped conversion and contribution evidence."/>}><GroupedPerformance/></Suspense>,"Executive Briefs":<Suspense fallback={<LoadingState compact title="Loading executive briefs" description="Loading the Executive Briefs feature."/>}><ExecutiveBriefs/></Suspense>,Enrich:<Suspense fallback={<LoadingState compact title="Loading CRM enrichment" description="Loading enriched lead evidence."/>}><Enrich/></Suspense>,"Lead Grading":<Suspense fallback={<LoadingState compact title="Loading lead grading" description="Loading persisted score and grade evidence."/>}><LeadGrading/></Suspense>,Behavior:<Suspense fallback={<LoadingState compact title="Loading behavior" description="Loading first-party behavior evidence."/>}><Behavior/></Suspense>,Feed:<Suspense fallback={<LoadingState compact title="Loading feed" description="Loading governed payload mappings and destinations."/>}><Feed/></Suspense>,Agents:<Suspense fallback={<LoadingState compact title="Loading agents" description="Loading governed agent definitions and recent runs."/>}><Agents/></Suspense>,Routing:<Suspense fallback={<LoadingState compact title="Loading routing" description="Loading lead-routing rules and persisted decisions."/>}><Routing/></Suspense>,"Follow-ups":<Suspense fallback={<LoadingState compact title="Loading follow-ups" description="Loading persisted next actions and reactivation evidence."/>}><FollowUps/></Suspense>,Calls:<Suspense fallback={<LoadingState compact title="Loading calls" description="Loading qualification runs and tracked telephony evidence."/>}><Calls/></Suspense>,Meetings:<Suspense fallback={<LoadingState compact title="Loading meetings" description="Loading consultations, calendar state and reminder evidence."/>}><Meetings/></Suspense>,Feedback:<Suspense fallback={<LoadingState compact title="Loading feedback" description="Loading persisted feedback and routing evidence."/>}><Feedback/></Suspense>,Approvals:<Suspense fallback={<LoadingState compact title="Loading approvals" description="Loading the approvals feature."/>}><Approvals/></Suspense>,"Ask Ace":<Suspense fallback={<LoadingState compact title="Loading Ask Ace" description="Loading grounded workspace assistant."/>}><AskAce/></Suspense>,Integrations:<Suspense fallback={<LoadingState compact title="Loading integrations" description="Loading the Integrations feature."/>}><Integrations/></Suspense>,"Data Flows":<Suspense fallback={<LoadingState compact title="Loading data flows" description="Loading the Data Flows feature."/>}><DataFlows/></Suspense>,"Real-Time Activation":<Suspense fallback={<LoadingState compact title="Loading real-time activation" description="Loading the Real-Time Activation feature."/>}><RealTimeActivation/></Suspense>,Personalization:<Suspense fallback={<LoadingState compact title="Loading personalization" description="Loading the Personalization feature."/>}><Personalization/></Suspense>,Exclusions:<Suspense fallback={<LoadingState compact title="Loading exclusions" description="Loading the Exclusions feature."/>}><Exclusions/></Suspense>,Audiences:<Suspense fallback={<LoadingState compact title="Loading audiences" description="Loading the Audiences feature."/>}><Audiences/></Suspense>,Delivery:<Suspense fallback={<LoadingState compact title="Loading delivery" description="Loading the Delivery Center."/>}><DeliveryCenter/></Suspense>,Monitoring:<Suspense fallback={<LoadingState compact title="Loading monitoring" description="Loading the monitoring feature."/>}><Monitoring/></Suspense>,Alerts:<Suspense fallback={<LoadingState compact title="Loading alerts" description="Loading the Alert Center."/>}><Alerts/></Suspense>,Compliance:<Suspense fallback={<LoadingState compact title="Loading compliance" description="Loading the Compliance feature."/>}><Compliance/></Suspense>,Developers:<Suspense fallback={<LoadingState compact title="Loading developers" description="Loading the Developer console."/>}><Developers/></Suspense>,Settings:<Suspense fallback={<LoadingState compact title="Loading settings" description="Loading workspace settings."/>}><Settings/></Suspense>}[tab]),[tab,workspaceGeneration])
 return <div className={'product '+(mobileNavOpen?'mobile-nav-open':'')}><a className="skip-link" href="#ace-workspace-main">Skip to workspace content</a><RouteAnnouncer label={tab+' · '+workspace} focusSelector=".product-body .page-head h1"/><aside className="product-sidebar" aria-label="Workspace navigation"><Brand/><div className="workspace-wrap"><button className="workspace" onClick={()=>setWorkspaceOpen(!workspaceOpen)}><span>{currentWorkspace?.initials||'AM'}</span><div><b>{workspace}</b><small>{currentWorkspace?.environment||'Production'} workspace</small></div><ChevronDown/></button>{workspaceOpen&&<div className="workspace-menu">{workspaces.map((x:any)=><button key={x.id||x.name} onClick={()=>void chooseWorkspace(x)} className={workspace===x.name?'active':''}><span>{x.initials||String(x.name).split(/\s+/).map((s:string)=>s[0]).join('').slice(0,3)}</span><div><b>{x.name}</b><small>{x.environment||'Production'}</small></div>{workspace===x.name&&<Check/>}</button>)}<button className="new-workspace" onClick={()=>{setWorkspaceOpen(false);setCreateOpen(true)}}><Plus/>Create workspace</button></div>}</div><nav className="product-nav">
 <div className="product-nav-filter"><Search/><input value={navFilter} onChange={e=>setNavFilter(e.target.value)} placeholder="Find feature..."/></div>
 {dashboardSections.map(section=>{
  const SectionIcon=section.icon
  const matching=section.tabs.filter(name=>!navFilter.trim()||name.toLowerCase().includes(navFilter.trim().toLowerCase())||section.label.toLowerCase().includes(navFilter.trim().toLowerCase()))
  if(navFilter.trim()&&!matching.length)return null
  const opened=navFilter.trim()?true:navOpen[section.id]
  return <div className="product-nav-group" key={section.id}>
   <button className="product-nav-group-head" aria-label={'Toggle '+section.id+' navigation group'} onClick={()=>setNavOpen(x=>({...x,[section.id]:!x[section.id]}))}><SectionIcon/><span>{section.label}</span><small>{matching.length}</small><ChevronDown className={opened?'open':''}/></button>
   {opened&&<div className="product-nav-group-items">{matching.map(name=>{const meta=tabMeta[name];const I=meta?.Icon||Activity;return <button key={name} className={tab===name?'active':''} onClick={()=>navigateToTab(name as AppTab)} title={name}><I/>{name}{tab===name&&<span className="nav-active-dot"/>}</button>})}</div>}
  </div>
 })}
 </nav><div className="aside-footer"><button onClick={leaveWorkspace}><ArrowRight/>Back to website</button><div className="profile-mini"><span>S</span><div><b>Sakshee</b><small>Workspace owner</small></div></div></div></aside>
 {mobileNavOpen&&<button className="product-mobile-nav-backdrop" aria-label="Close workspace navigation" onClick={()=>setMobileNavOpen(false)}/>}
 <main className="product-main" id="ace-workspace-main"><header className="product-head"><button className="product-mobile-nav-toggle" aria-label="Open workspace navigation" onClick={()=>setMobileNavOpen(true)}><Menu/></button><div className="global-search operational-search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runSearch()} placeholder="Search journeys, leads, campaigns, settings..."/>{searchMatches.length>0&&<div className="global-search-results">{searchMatches.map(([name,I])=><button key={name} onClick={()=>runSearch(name)}><I/><span>{name}</span><ArrowRight/></button>)}</div>}</div><div><button className="sync sync-button" aria-label="Open monitoring center" onClick={()=>navigateToTab('Monitoring')}>● Monitoring</button><button aria-label="Support" onClick={()=>navigateToTab('Settings')} title="Open workspace support/settings"><Headphones/></button><button aria-label="Region and language" onClick={()=>setRegionOpen(x=>!x)}><Globe2/></button><span className="avatar-sm">S</span>{regionOpen&&<div className="region-popover"><b>Workspace locale</b><span>Timezone · Asia/Kolkata</span><span>Currency · INR</span><button onClick={()=>{setRegionOpen(false);navigateToTab('Settings')}}>Change in Settings</button></div>}</div></header>
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
 {createOpen&&<AccessibleDialog ariaLabel="Create workspace" onClose={()=>setCreateOpen(false)}><div className="connector-card"><div className="connector-modal-head"><div><Building2/><div><b>Create workspace</b><small>Create a persisted tenant workspace.</small></div></div><button onClick={()=>setCreateOpen(false)}><X/></button></div><div className="connector-step"><label>Workspace name<input value={workspaceDraft.name} onChange={e=>setWorkspaceDraft({...workspaceDraft,name:e.target.value})} placeholder="Ace Retail"/></label><label>Environment<select value={workspaceDraft.environment} onChange={e=>setWorkspaceDraft({...workspaceDraft,environment:e.target.value})}><option>Production</option><option>Sandbox</option></select></label><button disabled={workspaceBusy||!workspaceDraft.name.trim()} onClick={createWorkspace}>{workspaceBusy?'Creating…':'Create workspace'}</button></div></div></AccessibleDialog>}
 </div>
}
function DeepLinkResolver(){
 const slug=decodeURIComponent((window.location.hash.match(/^#\/deep\/([^?]+)/)?.[1]||''))
 const [link,setLink]=useState<any>(null)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 useEffect(()=>{
  let active=true
  api.deepLinks().then(async(r:any)=>{
   const found=(r.items||[]).find((x:any)=>x.slug===slug&&x.status==='active')
   if(!active)return
   if(!found){setError('This deep link is unavailable or inactive.');setLoading(false);return}
   setLink(found);setLoading(false)
   await api.recordDeepLinkEvent({slug,kind:'click',source:'ace_resolver'}).catch(()=>null)
  }).catch((e:any)=>{if(active){setError(e?.message||'Deep link could not be loaded.');setLoading(false)}})
  return()=>{active=false}
 },[slug])
 const openApp=async()=>{if(!link)return;await api.recordDeepLinkEvent({slug,kind:'app_open',source:'ace_resolver'}).catch(()=>null);window.location.href=link.target}
 const openWeb=()=>{if(link?.fallback)window.location.href=link.fallback}
 return <div className="login-shell"><div className="login-card"><Brand/><div className="login-title"><h1>Continue your journey</h1><p>{loading?'Resolving destination…':error||link?.name}</p></div>{!loading&&!error&&link&&<><div className="site-detail-grid"><div><span>Route</span><b>{link.slug}</b></div><div><span>Status</span><b>Active</b></div></div><div className="approval-actions"><button onClick={openWeb}>Continue on web</button><button className="approve" onClick={openApp}>Open app</button></div></>}{error&&<div className="delivery-notice error"><X/><span>{error}</span></div>}<button className="login-back" onClick={()=>window.location.hash='#/'}><ArrowRight/>Back to AceMarketing</button></div></div>
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

const viewHash:Record<View,string>={
 site:'#/',app:'#/workspace',login:'#/login',pricing:'#/pricing',demo:'#/demo',company:'#/company',resources:'#/resources','case-studies':'#/case-studies',privacy:'#/privacy',terms:'#/terms',security:'#/security',solutions:'#/solutions',industries:'#/industries','agents-public':'#/agents', 'integrations-public':'#/integrations'
}
const hashView=(hash:string):View=>{
 if(hash.startsWith('#/workspace')) return 'app'
 if(hash.startsWith('#/resources')) return 'resources'
 if(hash.startsWith('#/case-studies')) return 'case-studies'
 const found=(Object.entries(viewHash) as [View,string][]).find(([,route])=>route===hash)
 return found?.[0]||'site'
}

export default function AcePlatform(){
 const currentHash=typeof window!=='undefined'?window.location.hash:'#/'
 const[view,setView]=useState<View>(()=>hashView(currentHash))
 const publicRouteLabel:Record<View,string>={
  site:'AceMarketing home',app:'AceMarketing workspace',login:'Sign in',pricing:'Pricing',demo:'Book a demo',company:'Company',resources:'Resources','case-studies':'Case studies',privacy:'Privacy',terms:'Terms',security:'Security',solutions:'Solutions',industries:'Industries','agents-public':'Agents','integrations-public':'Integrations'
 }
 const navigate=(next:View)=>{
  setView(next)
  const route=viewHash[next]
  if(typeof window!=='undefined'&&window.location.hash!==route) window.location.hash=route
  if(typeof window!=='undefined') setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),0)
 }
 useEffect(()=>{
  const onHash=()=>setView(hashView(window.location.hash))
  const onAceView=(event:any)=>{const next=event?.detail as View;if(next&&viewHash[next])navigate(next)}
  window.addEventListener('hashchange',onHash)
  window.addEventListener('ace-view',onAceView as EventListener)
  if(!window.location.hash) window.history.replaceState(null,'',viewHash.site)
  return()=>{window.removeEventListener('hashchange',onHash);window.removeEventListener('ace-view',onAceView as EventListener)}
 },[])
 const goHome=()=>navigate('site')
 const nav={
  openHome:goHome,
  openApp:()=>navigate('app'),
  openLogin:()=>navigate('login'),
  openPricing:()=>navigate('pricing'),
  openDemo:()=>navigate('demo'),
  openCompany:()=>navigate('company'),
  openResources:()=>navigate('resources'),
  openCaseStudies:()=>navigate('case-studies'),
  openSolutions:()=>navigate('solutions'),
  openIndustries:()=>navigate('industries'),
  openAgents:()=>navigate('agents-public'),
  openIntegrations:()=>navigate('integrations-public')
 }
 const chrome=(child:any)=><PublicPageFrame {...nav}>{child}</PublicPageFrame>
 if(currentHash.startsWith('#/deep/')) return <DeepLinkResolver/>
 if(view==='login')return <Login back={goHome} openApp={nav.openApp}/>
 if(view==='pricing')return chrome(<Pricing back={goHome} openApp={nav.openApp} openDemo={nav.openDemo}/>)
 if(view==='demo')return chrome(<DemoPage back={goHome} openApp={nav.openApp}/>)
 if(view==='company')return chrome(<CompanyPage back={goHome} openDemo={nav.openDemo}/>)
 if(view==='resources')return chrome(<ResourcesPage back={goHome}/>)
 if(view==='case-studies')return chrome(<CaseStudiesPage back={goHome} openDemo={nav.openDemo}/>)
 if(view==='privacy')return chrome(<LegalPage kind="privacy" back={goHome}/>)
 if(view==='terms')return chrome(<LegalPage kind="terms" back={goHome}/>)
 if(view==='security')return chrome(<LegalPage kind="security" back={goHome}/>)
 if(view==='solutions')return chrome(<SolutionsPage back={goHome} openDemo={nav.openDemo} openApp={nav.openApp}/>)
 if(view==='industries')return <IndustriesPublicPage {...nav}/>
 if(view==='agents-public')return <AgentsPublicPage {...nav}/>
 if(view==='integrations-public')return <IntegrationsPublicPage {...nav}/>
 const content=view==='site'?<Marketing {...nav}/>:<Product back={goHome}/>
 return <><RouteAnnouncer label={publicRouteLabel[view]||'AceMarketing'} focusSelector={view==='app'?'.product-body .page-head h1':'h1'}/>{content}<ConsentBanner/></>
}
