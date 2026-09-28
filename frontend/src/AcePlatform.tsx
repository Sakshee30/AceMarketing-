// @ts-nocheck
import {Component,Fragment,lazy,Suspense,useEffect,useMemo,useState} from 'react'
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
 const [notice,setNotice]=useState('')
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
function Fingerprinting(){
 const [data,setData]=useState<any>({scenarios:[]})
 const [selected,setSelected]=useState('')
 const [test,setTest]=useState<any>(null)
 const [matches,setMatches]=useState<any[]>([])
 const [matchOpen,setMatchOpen]=useState(false)
 const load=()=>api.fingerprinting().then((r:any)=>{setData(r);if(r.scenarios?.length)setSelected((x:string)=>x&&r.scenarios.some((s:any)=>s.name===x)?x:r.scenarios[0].name)}).catch(()=>setData({scenarios:[]}))
 useEffect(()=>{load()},[])
 const labels:any={third_party_checkout:['Third-party checkout','www → checkout → confirmation'],whatsapp_handoff:['WhatsApp handoff','website → WhatsApp → CRM'],call_handoff:['Call handoff','website → call center → CRM'],returning_device:['Returning device','anonymous visit → known lead']}
 const current=(data.scenarios||[]).find((x:any)=>x.name===selected)||data.scenarios?.[0]
 const run=async()=>{if(!current)return;const r:any=await api.testFingerprint(current.name);setTest(r);await load()}
 const viewMatches=async()=>{const r:any=await api.fingerprintMatches().catch(()=>({items:[]}));setMatches(r.items||[]);setMatchOpen(true)}
 return <><PageHead crumb="Tracking / Fingerprinting" title="Cross-domain journey continuity" sub="Measure first-party continuity using actual click/session, assisted-event and device identity evidence."/>
 <div className="stats-grid"><Stat label="Continuity rate" value={data.continuityRate==null?'—':data.continuityRate+'%'} sub="Matched assisted events" Icon={Network}/><Stat label="Ambiguous / unmatched" value={data.ambiguousRate==null?'—':data.ambiguousRate+'%'} sub="Persisted unmatched evidence" Icon={Activity}/><Stat label="Scenarios with evidence" value={String((data.scenarios||[]).filter((x:any)=>Number(x.evidence||0)>0).length)} sub="No fabricated test coverage" Icon={ShieldCheck}/><Stat label="Identity modes" value="Session + device" sub="First-party keys only" Icon={MousePointer2}/></div>
 <div className="fingerprint-layout"><div className="app-panel fingerprint-list"><div className="panel-head"><div><h3>Continuity scenarios</h3><p>Evidence currently available in the workspace</p></div><button onClick={load}>Refresh</button></div>{(data.scenarios||[]).map((x:any)=><button key={x.name} className={selected===x.name?'selected':''} onClick={()=>{setSelected(x.name);setTest(null)}}><MousePointer2/><div><b>{labels[x.name]?.[0]||x.name}</b><small>{labels[x.name]?.[1]||'first-party handoff'}</small></div><strong>{x.matchRate==null?'—':x.matchRate+'%'}</strong><ChevronRight/></button>)}</div>
 <div className="app-panel fingerprint-detail">{current?<><div className="panel-head"><div><h3>{labels[current.name]?.[0]||current.name}</h3><p>{Number(current.evidence||0).toLocaleString('en-IN')} evidence record(s) available.</p></div><span className={current.evidence?'healthy':'status'}>{current.evidence?'Evidence available':'No evidence yet'}</span></div><div className="fingerprint-flow">{(labels[current.name]?.[1]||'identity → match').split(' → ').map((x:string,i:number,arr:string[])=><div key={x}><span>{i+1}</span><b>{x}</b>{i<arr.length-1&&<ArrowRight/>}</div>)}</div><div className="approval-actions"><button onClick={viewMatches}>View match log</button><button className="approve" onClick={run}><Activity/>{test?.scenario===current.name?(test.status==='evidence_available'?'Evidence verified':'No evidence found'):'Run continuity test'}</button></div></>:<div className="empty-delivery-state"><Network/><div><b>No continuity scenarios available</b></div></div>}</div></div>
 {matchOpen&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><Network/><div><b>Recent deterministic matches</b><small>Persisted attribution matches</small></div></div><button onClick={()=>setMatchOpen(false)}><X/></button></div>{matches.length?<div className="debug-event-list">{matches.map((x:any)=><div className="developer-event-row" key={x.id}><code>{x.id}</code><span>{x.event_type} · {x.match_method||'matched'}</span><strong>{x.match_confidence??'—'}</strong></div>)}</div>:<div className="empty-delivery-state"><Network/><div><b>No recent matched attribution events</b></div></div>}</div></div>}</>
}
function LiveSync(){
 const [live,setLive]=useState<any>(null)
 const [alertOpen,setAlertOpen]=useState(false)
 const [notice,setNotice]=useState('')
 const [saving,setSaving]=useState(false)
 const load=()=>api.liveSync().then((r:any)=>setLive(r)).catch((e:any)=>setNotice(e?.message||'Live sync could not be loaded.'))
 useEffect(()=>{load();const id=setInterval(load,15000);return()=>clearInterval(id)},[])
 const saveAlert=async(e:any)=>{e.preventDefault();const f=new FormData(e.currentTarget);setSaving(true);setNotice('');try{await api.saveMonitoringRule({metric:String(f.get('metric')),operator:'gt',threshold:Number(f.get('threshold')),severity:String(f.get('severity')||'warning'),windowMinutes:Number(f.get('windowMinutes')||10),enabled:true});setAlertOpen(false);setNotice('Monitoring alert saved.')}catch(err:any){setNotice(err?.message||'Alert could not be saved.')}finally{setSaving(false)}}
 const rows=live?.recent||[]
 const destinations=live?.destinations||[]
 const latency=live?.medianLatencyMs==null?'—':live.medianLatencyMs<1000?Math.round(live.medianLatencyMs)+'ms':(live.medianLatencyMs/1000).toFixed(1)+'s'
 const statusLabel=live?.status==='active'?'Active':live?.status==='idle'?'Idle':'Loading'
 return <><PageHead crumb="AdSync / Live Sync" title="24×7 event transfer" sub="Continuous movement of first-party, CRM, calling, chat and revenue signals to configured destinations." action="Create alert" onAction={()=>setAlertOpen(true)}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Sync status" value={statusLabel} sub="Measured from current ingestion/delivery state" Icon={Activity}/><Stat label="Median delivery latency" value={latency} sub="Persisted provider receipts" Icon={Zap}/><Stat label="Events / min" value={live?.available?String(live.eventsPerMinute||0):'—'} sub="Accepted first-party events in last minute" Icon={BarChart3}/><Stat label="Delivery rate" value={live?.deliveryRate==null?'—':String(live.deliveryRate)+'%'} sub="Terminal provider deliveries" Icon={Target}/></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recent activity</h3><p>Live ingestion and activation events</p></div><button onClick={load}>Refresh</button></div>
 {rows.length?<table><thead><tr><th>Time</th><th>Source</th><th>Event</th><th>Destination</th><th>Status</th><th>Match key</th></tr></thead><tbody>{rows.map((r:any)=><tr key={r.id}><td>{r.time?new Date(r.time).toLocaleTimeString():'—'}</td><td>{r.source}</td><td>{r.event}</td><td>{r.destination}</td><td><span className="status">{String(r.status).replaceAll('_',' ')}</span></td><td>{r.matchKey}</td></tr>)}</tbody></table>:<div className="empty-delivery-state"><Activity/><div><b>No live activity yet</b><small>Tracked events and provider deliveries will appear here as they happen.</small></div></div>}</div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Destination throughput</h3><p>Persisted provider delivery outcomes</p></div></div>{destinations.length?destinations.map((x:any)=><div className="health-line" key={x.destination}><span>{x.destination}</span><div className="progress"><i style={{width:Math.max(0,Math.min(100,Number(x.deliveryRate||0)))+'%'}}/></div><b>{Number(x.deliveryRate||0).toFixed(1)}%</b></div>):<div className="empty-delivery-state"><RadioTower/><div><b>No destination history yet</b><small>Provider throughput is calculated only from persisted delivery attempts.</small></div></div>}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Freshness policy</h3><p>No fabricated next-day or live-volume claims</p></div></div><div className="freshness-card"><Zap/><div><b>Real-time first</b><p>Critical intent and revenue outcomes are queued immediately; retries use idempotent event IDs and backoff.</p></div></div><div className="freshness-card"><ShieldCheck/><div><b>Safe retries</b><p>Failed deliveries remain visible in Delivery and Monitoring until replayed or resolved.</p></div></div></div></div>
 {alertOpen&&<div className="connector-modal"><form className="connector-card" onSubmit={saveAlert}><div className="connector-modal-head"><div><Bell/><div><b>Create monitoring alert</b><small>Persist a real observability threshold.</small></div></div><button type="button" onClick={()=>setAlertOpen(false)}><X/></button></div><label>Metric<select name="metric" defaultValue="api_error_rate"><option value="api_error_rate">API 5xx error rate (%)</option><option value="api_p95_latency_ms">API p95 latency (ms)</option><option value="dead_letter_jobs">Dead-letter jobs</option><option value="audience_sync_errors">Audience sync errors</option></select></label><label>Threshold<input name="threshold" type="number" min="0" required defaultValue="5"/></label><label>Window (minutes)<input name="windowMinutes" type="number" min="1" max="1440" defaultValue="10"/></label><label>Severity<select name="severity"><option>warning</option><option>critical</option><option>info</option></select></label><button disabled={saving}>{saving?'Saving…':'Save alert'}</button></form></div>}</>
}
function DataHub(){
 const [hub,setHub]=useState<any>(null)
 const [selected,setSelected]=useState('')
 const [rebuilding,setRebuilding]=useState(false)
 const [notice,setNotice]=useState('')
 const load=async()=>{
  try{
   const r:any=await api.dataHub()
   setHub(r)
   if(r.sources?.length)setSelected((x:string)=>x&&r.sources.some((s:any)=>s.name===x)?x:r.sources[0].name)
  }catch(e:any){setNotice(e?.message||'Data Hub could not be loaded.')}
 }
 useEffect(()=>{load()},[])
 const sources=hub?.sources||[]
 const current=sources.find((x:any)=>x.name===selected)||sources[0]
 const rebuild=async()=>{setRebuilding(true);setNotice('');try{const r:any=await api.rebuildDataHub();setNotice('Canonical snapshot rebuilt: '+r.id);await load()}catch(e:any){setNotice(e?.message||'Canonical snapshot rebuild failed.')}finally{setRebuilding(false)}}
 const freshness=(seconds:any)=>seconds==null?'—':seconds<60?seconds+'s':seconds<3600?Math.round(seconds/60)+'m':Math.round(seconds/3600)+'h'
 const addSource=()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Integrations'}))
 return <><PageHead crumb="Data / Data Hub" title="Unified customer data hub" sub="Normalize connected first-party sources into one governed customer, journey and revenue truth for attribution, activation and agents." action="Add data source" onAction={addSource}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Unified records" value={hub?.available?Number(hub.records||0).toLocaleString('en-IN'):'—'} sub="Observed across current source registry" Icon={DatabaseZap}/><Stat label="Known identities" value={hub?.available?Number(hub.knownIdentities||0).toLocaleString('en-IN'):'—'} sub="Persisted lead / customer profiles" Icon={UsersRound}/><Stat label="Matched attribution events" value={hub?.available?Number(hub.matchedEvents||0).toLocaleString('en-IN'):'—'} sub="Persisted deterministic/assisted matches" Icon={Activity}/><Stat label="Schema health" value={hub?.available?Number(hub.schemaHealth||0).toFixed(2)+'%':'—'} sub={(hub?.quarantined||0)+' quarantined events'} Icon={ShieldCheck}/></div>
 <div className="datahub-layout"><div className="app-panel datahub-source-list"><div className="panel-head"><div><h3>Source registry</h3><p>Observed freshness, volume and source health</p></div><span className={sources.length?'healthy':'status'}>{sources.length} sources</span></div>{sources.length?sources.map((x:any)=><button key={x.name} className={selected===x.name?'selected':''} onClick={()=>setSelected(x.name)}><DatabaseZap/><div><b>{x.name}</b><small>{String(x.type||'source').replaceAll('_',' ')} · {Number(x.records||0).toLocaleString('en-IN')} records</small></div><span>{freshness(x.freshnessSeconds)}</span><em className={x.status==='healthy'?'healthy':'status'}>{x.status}</em><ChevronRight/></button>):<div className="empty-delivery-state"><DatabaseZap/><div><b>No source activity yet</b><small>Connect or ingest a source and it will appear here.</small></div></div>}</div>
 <div className="app-panel datahub-detail">{current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{String(current.type||'source').replaceAll('_',' ')} · last event {freshness(current.freshnessSeconds)} ago</p></div><span className={current.status==='healthy'?'healthy':'status'}>{current.status}</span></div><div className="site-detail-grid">{[['Records',Number(current.records||0).toLocaleString('en-IN')],['Freshness',freshness(current.freshnessSeconds)],['Last event',current.lastEventAt?new Date(current.lastEventAt).toLocaleString():'—'],['Status',current.status],['Identity coverage','Source dependent'],['Lineage','Retained in workspace audit/state']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="agent-section"><h4>Observed fields</h4><div className="context-chips">{(current.fields||[]).length?(current.fields||[]).map((x:string)=><span key={x}>{x}</span>):<span>No field sample yet</span>}</div></div><div className="data-lineage"><h4>Lineage</h4>{[['Source record',current.name],['Normalize','Workspace canonical schema'],['Identity','Customer/device/session graph'],['Journey','Chronological event stream'],['Revenue truth','CRM / billing / POS authority'],['Consumers','Attribution · Agents · Audiences · Reports']].map((x,i)=><div key={x[0]}><span>{i+1}</span><div><b>{x[0]}</b><small>{x[1]}</small></div>{i<5&&<ArrowRight/>}</div>)}</div></>:<div className="empty-delivery-state"><DatabaseZap/><div><b>Select a source</b><small>Live source details appear after ingestion begins.</small></div></div>}</div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Canonical data model</h3><p>One shared language across systems</p></div></div>{[['Customer','customer_id · email_hash · phone_hash · device_id'],['Acquisition','source · campaign · adset · creative'],['Click identity','gclid · fbclid · device/session'],['Lifecycle','lead_stage · disposition · owner'],['Interaction','web · app · call · WhatsApp · meeting'],['Revenue','order_id · value · currency · refund']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Data quality controls</h3><p>Before records become shared truth</p></div><button onClick={rebuild} disabled={rebuilding}>{rebuilding?'Rebuilding…':'Rebuild canonical view'}</button></div>{[['Schema validation','Required'],['Duplicate resolution','Deterministic event / identity keys'],['Unknown fields','Quarantine + mapping review'],['Late data','Reprocess attribution window'],['PII activation','Hash before destination'],['Audience activation','Marketing consent re-check'],['Auditability','Source + transform lineage retained']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><Check/></div>)}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recent source activity</h3><p>Observed changes across the unified data layer</p></div><button onClick={load}>Refresh</button></div>{(hub?.recent||[]).length?(hub.recent||[]).map((x:any)=><div className="sync-history-row" key={x.id}><time>{x.time?new Date(x.time).toLocaleTimeString():'—'}</time><b>{x.source}</b><span>{x.kind}</span><span>{x.operation}</span><em className={x.status==='healthy'?'healthy':'status'}>{x.status}</em></div>):<div className="empty-delivery-state"><Activity/><div><b>No recent source activity</b><small>The Data Hub does not fabricate sync history when nothing has been ingested.</small></div></div>}</div></>
}
function Customer360(){
 const [data,setData]=useState<any>({items:[],customer:null,total:0})
 const [selected,setSelected]=useState('')
 const [query,setQuery]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState('')
 const load=async(id?:string)=>{
  setLoading(true);setNotice('')
  try{
   const r:any=await api.customer360(id)
   setData(r)
   if(r.customer?.id)setSelected(r.customer.id)
  }catch(e:any){setNotice(e?.message||'Customer 360 could not be loaded.')}
  finally{setLoading(false)}
 }
 useEffect(()=>{load()},[])
 const choose=(id:string)=>{setSelected(id);load(id)}
 const items=(data.items||[]).filter((x:any)=>{
  const q=query.trim().toLowerCase()
  return !q||[x.name,x.externalLeadId,x.source,x.campaign,x.stage,x.grade].some(v=>String(v||'').toLowerCase().includes(q))
 })
 const customer=data.customer
 const identity=customer?.identity||{}
 const ops=customer?.operations||{}
 const timeline=customer?.timeline||[]
 const attrs=Object.entries(customer?.attributes||{}).slice(0,12)
 const journey=Object.entries(customer?.journey||{}).filter(([,v])=>v!==null&&v!==''&&typeof v!=='object').slice(0,12)
 return <><PageHead crumb="Data / Customer 360" title="Customer 360" sub="One operator view for identity, acquisition, lifecycle, audiences, interactions and agent activity across the stitched customer journey." action={loading?'Refreshing…':'Refresh'} onAction={()=>load(selected||undefined)}/>
 {notice&&<div className="delivery-notice error"><ShieldCheck/><span>{notice}</span></div>}
 <div className="stats-grid">
  <Stat label="Known customers" value={String(data.total||0)} sub="Persisted active profiles" Icon={UsersRound}/>
  <Stat label="Customer score" value={customer?String(customer.score||0):'—'} sub={customer?.grade?'Grade '+customer.grade:'No selected customer'} Icon={Target}/>
  <Stat label="Tracked activity" value={customer?String(ops.trackedEvents||0):'—'} sub="First-party events linked to profile" Icon={Activity}/>
  <Stat label="Active audiences" value={customer?String((customer.audiences||[]).length):'—'} sub="Materialized audience memberships" Icon={RadioTower}/>
 </div>
 <div className="customer360-layout">
  <div className="app-panel customer360-list">
   <div className="panel-head"><div><h3>Customer directory</h3><p>Search canonical profiles and open the stitched record</p></div><span className="healthy">{items.length}</span></div>
   <div className="customer360-search"><Search/><input aria-label="Search customer 360 profiles" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, lead ID, source, campaign..."/></div>
   <div className="customer360-list-scroll">{items.length?items.map((x:any)=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>choose(x.id)}>
    <span className="customer360-avatar">{String(x.name||'C').slice(0,1).toUpperCase()}</span>
    <div><b>{x.name}</b><small>{x.source}{x.campaign?' · '+x.campaign:''}</small><em>{x.stage} · Grade {x.grade||'—'} · score {x.score||0}</em></div>
    <strong>{x.activityCount||0}<small>activities</small></strong><ChevronRight/>
   </button>):<div className="empty-delivery-state"><UsersRound/><div><b>No matching customer profiles</b><small>Connected CRM, tracking and enrichment records will appear here.</small></div></div>}</div>
  </div>
  <div className="customer360-main">
   {customer?<>
    <section className="app-panel customer360-hero">
     <div className="customer360-person"><span>{String(customer.name||'C').slice(0,1).toUpperCase()}</span><div><small>CUSTOMER PROFILE</small><h2>{customer.name}</h2><p>{customer.externalLeadId} · {customer.source}{customer.campaign?' · '+customer.campaign:''}</p></div></div>
     <div className="customer360-score"><span>Lifecycle</span><b>{customer.stage}</b><em>Grade {customer.grade||'—'} · {customer.score||0}/100</em></div>
    </section>
    <div className="customer360-cards">
     <section className="app-panel"><div className="panel-head"><div><h3>Identity graph</h3><p>Persisted deterministic identifiers</p></div><UsersRound/></div><div className="site-detail-grid">{[
      ['Device ID',identity.deviceId||'—'],['Platform',identity.platform||'—'],['App ID',identity.appId||'—'],['Email hash',identity.hasEmailHash?'Present':'Not available'],['Phone hash',identity.hasPhoneHash?'Present':'Not available'],['Last updated',customer.updatedAt?new Date(customer.updatedAt).toLocaleString():'—']
     ].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div></section>
     <section className="app-panel"><div className="panel-head"><div><h3>Operational footprint</h3><p>Actions linked to this customer</p></div><Activity/></div><div className="customer360-op-grid">{[
      ['Tracked events',ops.trackedEvents||0],['Agent runs',ops.agentRuns||0],['Routes',ops.routes||0],['Follow-ups',ops.followUps||0],['Meetings',ops.meetings||0],['Feedback',ops.feedback||0]
     ].map(x=><div key={x[0]}><b>{String(x[1])}</b><span>{x[0]}</span></div>)}</div></section>
    </div>
    <div className="customer360-cards">
     <section className="app-panel"><div className="panel-head"><div><h3>Customer attributes</h3><p>Normalized profile and journey evidence</p></div><DatabaseZap/></div>{attrs.length||journey.length?<div className="customer360-attributes">{[...attrs,...journey].slice(0,16).map(([k,v]:any)=><div key={String(k)}><span>{String(k).replaceAll('_',' ')}</span><b>{String(v)}</b></div>)}</div>:<div className="empty-delivery-state"><DatabaseZap/><div><b>No additional attributes</b><small>Enrichment and journey attributes will appear when captured.</small></div></div>}</section>
     <section className="app-panel"><div className="panel-head"><div><h3>Audience membership</h3><p>Materialized activation and suppression groups</p></div><RadioTower/></div>{(customer.audiences||[]).length?<div className="customer360-audiences">{customer.audiences.map((x:any)=><div key={x.id}><span className={x.mode==='suppress'?'warning':'healthy'}>{x.mode}</span><div><b>{x.name}</b><small>{x.destination} · {x.status}</small></div></div>)}</div>:<div className="empty-delivery-state"><UsersRound/><div><b>No materialized audience membership</b><small>Build or materialize an audience to see activation context here.</small></div></div>}</section>
    </div>
    <section className="app-panel customer360-timeline"><div className="panel-head"><div><h3>Unified activity timeline</h3><p>Newest first · tracking, routing, follow-up, meetings, feedback and agent actions</p></div><button onClick={()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Journeys'}))}>Open journey view</button></div>{timeline.length?<div className="customer360-timeline-list">{timeline.map((x:any)=><article key={x.id}><span className={'customer360-dot '+x.type}><Activity/></span><div><small>{x.source}</small><b>{x.title}</b><p>{x.detail}</p></div><time>{x.at?new Date(x.at).toLocaleString():'—'}</time></article>)}</div>:<div className="empty-delivery-state"><Activity/><div><b>No linked activity yet</b><small>This profile exists, but no persisted interaction events are currently linked.</small></div></div>}</section>
   </>:<div className="app-panel empty-delivery-state customer360-empty"><UsersRound/><div><b>{loading?'Loading Customer 360…':'No customer selected'}</b><small>Select a profile to inspect its stitched operational record.</small></div></div>}
  </div>
 </div></>
}

function OfflineAttribution(){
 const [data,setData]=useState<any>({callAttribution:{},whatsapp:{},attribution:{},rules:[],templates:[]})
 const [ctwa,setCtwa]=useState<any>({available:false,stats:{},items:[]})
 const [selected,setSelected]=useState('')
 const [builder,setBuilder]=useState(false)
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const load=async()=>{try{const [r,c]:any=await Promise.all([api.offlineAttribution(),api.ctwaAttribution().catch(()=>({available:false,stats:{},items:[]}))]);setData(r);setCtwa(c);const rules=r.rules||[];setSelected((x:string)=>x&&rules.some((i:any)=>i.id===x)?x:(rules[0]?.id||''))}catch(e:any){setNotice(e?.message||'Offline attribution could not be loaded.')}}
 useEffect(()=>{load()},[])
 const current=(data.rules||[]).find((x:any)=>x.id===selected)||data.rules?.[0]
 const callEvents=Number(data.callAttribution?.events||0)
 const waMessages=Number(data.whatsapp?.messages||0)
 const matched=Number(data.attribution?.matchedEvents||0)
 const unmatched=Number(data.attribution?.unmatchedEvents||0)
 const matchRate=Number(data.attribution?.matchRate||0)
 const create=async(e:any)=>{e.preventDefault();const fd=new FormData(e.currentTarget);setBusy('create');setNotice('');try{const r:any=await api.createOfflineAttributionRule({conversion:String(fd.get('conversion')||''),source:String(fd.get('source')||''),match:String(fd.get('match')||''),identifier:String(fd.get('identifier')||''),destination:Array.from(fd.getAll('destination')).map(String)});setBuilder(false);setNotice('Offline attribution rule created.');await load();if(r?.item?.id)setSelected(r.item.id)}catch(err:any){setNotice(err?.message||'Offline rule could not be created.')}finally{setBusy('')}}
 const toggle=async()=>{if(!current)return;setBusy('toggle');setNotice('');try{await api.toggleOfflineAttributionRule(current.id,current.status==='paused');setNotice(current.status==='paused'?'Offline rule enabled.':'Offline rule paused.');await load()}catch(e:any){setNotice(e?.message||'Offline rule status could not be changed.')}finally{setBusy('')}}
 const test=async(e:any)=>{e.preventDefault();if(!current)return;const fd=new FormData(e.currentTarget);setBusy('test');setNotice('');try{const r:any=await api.testOfflineAttributionRule({ruleId:current.id,customerId:String(fd.get('customerId')||''),phone:String(fd.get('phone')||''),email:String(fd.get('email')||''),gclid:String(fd.get('gclid')||''),fbclid:String(fd.get('fbclid')||''),value:Number(fd.get('value')||0),currency:'INR'});setNotice('Test event recorded with status '+r.status+(r.matchMethod?' via '+r.matchMethod:'')+'.');await load()}catch(err:any){setNotice(err?.message||'Offline attribution test failed.')}finally{setBusy('')}}
 const applyTemplate=(x:any)=>{setBuilder(true);setTimeout(()=>{const form=document.querySelector('.offline-builder') as HTMLFormElement|null;if(!form)return;(form.elements.namedItem('conversion') as HTMLInputElement).value=x.conversion||'';(form.elements.namedItem('source') as HTMLInputElement).value=x.source||'';(form.elements.namedItem('match') as HTMLInputElement).value=x.match||'';(form.elements.namedItem('identifier') as HTMLInputElement).value=x.identifier||''},0)}
 return <><PageHead crumb="AdSync / Offline Attribution" title="Calls, WhatsApp & offline revenue" sub="Bridge digital acquisition with real call, WhatsApp, CRM and offline conversion events using persisted first-party identity rules." action="New offline rule" onAction={()=>setBuilder(true)}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Tracked calls" value={String(callEvents)} sub="Signed telephony events" Icon={PhoneCall}/><Stat label="WhatsApp messages" value={String(waMessages)} sub="Verified Cloud API inbound events" Icon={MessageCircle}/><Stat label="Matched offline events" value={data.attribution?.available?String(matched):'—'} sub={data.attribution?.available?matchRate+'% match rate':'Attribution store unavailable'} Icon={Target}/><Stat label="Unmatched queue" value={data.attribution?.available?String(unmatched):'—'} sub="Held from signal return" Icon={CircleDollarSign}/></div>
 <div className="matchback-layout"><div className="app-panel matchback-list"><div className="panel-head"><div><h3>Offline attribution rules</h3><p>Persisted source → identity match → destination configuration</p></div><span className="healthy">{(data.rules||[]).length} configured</span></div>{(data.rules||[]).length?(data.rules||[]).map((x:any)=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><RadioTower/><div><b>{x.conversion}</b><small>{x.source} · {x.identifier}</small></div><span className={x.status==='active'?'healthy':'status'}>{x.status}</span><ChevronRight/></button>):<div className="empty-delivery-state"><RadioTower/><div><b>No offline attribution rules yet</b><small>Create a rule or use a suggested template. No example rule is treated as customer data.</small></div></div>}</div>
 <div className="app-panel matchback-detail">{current?<><div className="panel-head"><div><h3>{current.conversion}</h3><p>{current.source} → {(current.destination||[]).join(', ')}</p></div><span className={current.status==='active'?'healthy':'status'}>{current.status}</span></div><div className="site-detail-grid">{[['Matching logic',current.match],['Identifier',current.identifier],['Last test',current.lastTestAt?new Date(current.lastTestAt).toLocaleString():'Never'],['Last test status',current.lastTestStatus||'—'],['Last match method',current.lastTestMethod||'—']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><div className="approval-actions"><button disabled={busy==='toggle'} onClick={toggle}>{busy==='toggle'?'Saving…':current.status==='paused'?'Enable rule':'Pause rule'}</button></div><form className="offline-test-form" onSubmit={test}><div className="panel-head"><div><h3>Test identity reconciliation</h3><p>Send a real assisted-event test through the attribution store.</p></div></div><div className="two-col"><label>Customer ID<input name="customerId" placeholder="customer_123"/></label><label>Phone<input name="phone" placeholder="+91..."/></label><label>Email<input name="email" type="email" placeholder="lead@example.com"/></label><label>GCLID<input name="gclid" placeholder="optional click ID"/></label></div><div className="two-col"><label>FBCLID<input name="fbclid" placeholder="optional Meta click ID"/></label><label>Value (INR)<input name="value" type="number" min="0" defaultValue="0"/></label></div><button className="approve" disabled={busy==='test'||current.status==='paused'}>{busy==='test'?'Testing…':'Send offline test event'}</button></form></>:<div className="empty-delivery-state"><RadioTower/><div><b>Select or create an offline attribution rule</b></div></div>}</div></div>
 {(data.templates||[]).length>0&&<div className="app-panel"><div className="panel-head"><div><h3>Suggested offline templates</h3><p>Configuration examples only; they do not represent workspace activity.</p></div></div><div className="template-grid">{(data.templates||[]).map((x:any)=><button key={x.conversion} onClick={()=>applyTemplate(x)}><RadioTower/><div><b>{x.conversion}</b><small>{x.source} · {x.identifier}</small></div><span>{(x.destination||[]).join(', ')}</span></button>)}</div></div>}
 <div className="app-panel"><div className="panel-head"><div><h3>Click-to-WhatsApp attribution</h3><p>Meta CTWA referral metadata → WhatsApp conversation → downstream value</p></div><span className={Number(ctwa.stats?.referredMessages||0)>0?'healthy':'warning'}>{Number(ctwa.stats?.attributedClicks||0)} attributed clicks</span></div><div className="site-detail-grid">{[['Referred messages',ctwa.stats?.referredMessages||0],['Unique contacts',ctwa.stats?.uniqueContacts||0],['Attributed CTWA clicks',ctwa.stats?.attributedClicks||0],['Observed conversion value','₹'+Number(ctwa.stats?.conversionValue||0).toLocaleString('en-IN')]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div>{(ctwa.items||[]).length?<div className="debug-event-list">{(ctwa.items||[]).slice(0,8).map((x:any)=><div className="developer-event-row" key={x.ctwaClid}><code>{x.ctwaClid}</code><span>{x.headline||x.sourceId||'Meta click-to-WhatsApp referral'} · {x.messages||0} message(s) · {x.contacts||0} contact(s)</span><strong>{Number(x.conversionValue||0)>0?'₹'+Number(x.conversionValue).toLocaleString('en-IN'):(x.lastActivity?new Date(x.lastActivity).toLocaleString():'No value yet')}</strong></div>)}</div>:<div className="empty-delivery-state"><MessageCircle/><div><b>No CTWA referral evidence yet</b><small>When Meta sends WhatsApp referral metadata, AceMarketing retains the CTWA click reference and attributes the resulting conversation without fabricating campaign performance.</small></div></div>}</div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Live call tracking</h3><p>Signed provider events feed lead and attribution context</p></div><span className={callEvents?'healthy':'warning'}>{callEvents?callEvents+' events':'No events yet'}</span></div><div className="match-flow"><div><span>1</span><b>Ad / source touch</b><small>Click/session identity retained</small></div><ArrowRight/><div><span>2</span><b>Inbound call</b><small>Signed webhook received</small></div><ArrowRight/><div><span>3</span><b>Lead context</b><small>Call outcome enriches profile</small></div><ArrowRight/><div><span>4</span><b>Attribution</b><small>Assisted event reconciled</small></div></div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>WhatsApp identity bridge</h3><p>Cloud API events connected to the stitched journey</p></div><span className={waMessages?'healthy':'warning'}>{waMessages?waMessages+' messages':'No events yet'}</span></div><div className="freshness-card"><MessageCircle/><div><b>Verified inbound event</b><p>Meta signature verification, phone-number workspace routing, lead upsert and assisted attribution are handled before the event becomes workspace truth.</p></div></div><div className="freshness-card"><CircleDollarSign/><div><b>Revenue handoff</b><p>Downstream CRM or billing outcomes can reuse the same customer identity before Google/Meta signal return.</p></div></div></div></div>
 {builder&&<div className="connector-modal"><form className="connector-card offline-builder" onSubmit={create}><div className="connector-modal-head"><div><RadioTower/><div><b>New offline attribution rule</b><small>Define a real source-to-identity-to-destination matching rule.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Conversion<input name="conversion" required placeholder="Inbound Call"/></label><label>Source<input name="source" required placeholder="Telephony"/></label><label>Matching method<input name="match" required placeholder="phone + click/session reconciliation"/></label><label>Identifier<input name="identifier" required placeholder="Phone / GCLID / FBCLID"/></label><fieldset><legend>Destinations</legend><label><input type="checkbox" name="destination" value="Google Ads" defaultChecked/>Google Ads</label><label><input type="checkbox" name="destination" value="Meta Ads" defaultChecked/>Meta Ads</label></fieldset><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create offline rule'}</button></form></div>}</>
}
function Matchback(){
 const [selected,setSelected]=useState('')
 const [data,setData]=useState<any>({live:null,rules:[],templates:[]})
 const [unmatched,setUnmatched]=useState<any[]>([])
 const [unmatchedOpen,setUnmatchedOpen]=useState(false)
 const [builder,setBuilder]=useState(false)
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const load=async()=>{
  try{
   const r:any=await api.matchback()
   setData(r)
   const rules=r.rules||[]
   setSelected((x:string)=>x&&rules.some((i:any)=>i.id===x)?x:(rules[0]?.id||''))
  }catch(e:any){setNotice(e?.message||'Matchback data could not be loaded.')}
 }
 useEffect(()=>{load()},[])
 const live=data.live||{}
 const current=(data.rules||[]).find((x:any)=>x.id===selected)||data.rules?.[0]
 const run=async()=>{if(!current)return;setBusy('run');setNotice('');try{const r:any=await api.reconcileMatchback(current.id);setNotice('Reconciliation completed: '+Number(r?.matched||0)+' matched, '+Number(r?.unmatched||0)+' unmatched.');await load()}catch(e:any){setNotice(e?.message||'Reconciliation failed.')}finally{setBusy('')}}
 const toggle=async()=>{if(!current)return;setBusy('toggle');setNotice('');try{await api.toggleMatchbackRule(current.id,current.status==='paused');setNotice(current.status==='paused'?'Matchback rule enabled.':'Matchback rule paused.');await load()}catch(e:any){setNotice(e?.message||'Rule status could not be changed.')}finally{setBusy('')}}
 const create=async(e:any)=>{e.preventDefault();const fd=new FormData(e.currentTarget);setBusy('create');setNotice('');try{const r:any=await api.createMatchbackRule({name:String(fd.get('name')||''),source:String(fd.get('source')||''),eventType:String(fd.get('eventType')||''),destination:String(fd.get('destination')||''),identityMethod:String(fd.get('identityMethod')||'')});setBuilder(false);setNotice('Matchback rule created.');await load();if(r?.item?.id)setSelected(r.item.id)}catch(err:any){setNotice(err?.message||'Matchback rule could not be created.')}finally{setBusy('')}}
 const reviewUnmatched=async()=>{const r:any=await api.unmatchedMatchback().catch(()=>({items:[]}));setUnmatched(r.items||[]);setUnmatchedOpen(true)}
 const applyTemplate=(x:any)=>{setBuilder(true);setTimeout(()=>{const form=document.querySelector('.matchback-builder') as HTMLFormElement|null;if(!form)return;(form.elements.namedItem('name') as HTMLInputElement).value=x.name||'';(form.elements.namedItem('source') as HTMLInputElement).value=x.source||'';(form.elements.namedItem('eventType') as HTMLInputElement).value=x.eventType||'';(form.elements.namedItem('destination') as HTMLInputElement).value=x.destination||'';(form.elements.namedItem('identityMethod') as HTMLInputElement).value=x.identityMethod||''},0)}
 return <><PageHead crumb="Measurement / Matchback" title="Closure matchback & revenue reconciliation" sub="Tie verified downstream outcomes back to acquisition evidence without inventing rule-level revenue or match rates." action="New matchback rule" onAction={()=>setBuilder(true)}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Matched value" value={live?.available?'₹'+Number(live.matchedValue||0).toLocaleString('en-IN'):'—'} sub="Workspace matched assisted-event value" Icon={CircleDollarSign}/><Stat label="Matched outcomes" value={live?.available?String(live.matchedEvents||0):'—'} sub="Persisted deterministic matches" Icon={CheckCircle2}/><Stat label="Match rate" value={live?.available?String(live.matchRate||0)+'%':'—'} sub="Workspace attribution store" Icon={Target}/><Stat label="Unmatched" value={live?.available?String(live.unmatchedEvents||0):'—'} sub="Held for reconciliation" Icon={RadioTower}/></div>
 <div className="matchback-layout"><div className="app-panel matchback-list"><div className="panel-head"><div><h3>Matchback rules</h3><p>Persisted revenue/event source → acquisition destination rules</p></div><span className="healthy">{(data.rules||[]).length} configured</span></div>{(data.rules||[]).length?(data.rules||[]).map((x:any)=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><CircleDollarSign/><div><b>{x.name}</b><small>{x.source} · {x.eventType} → {x.destination}</small></div><span className={x.status==='active'?'healthy':'status'}>{x.status}</span><ChevronRight/></button>):<div className="empty-delivery-state"><CircleDollarSign/><div><b>No matchback rules yet</b><small>Create a rule or start from one of the suggested templates below. AceMarketing no longer seeds fictional revenue outcomes.</small></div></div>}</div>
 <div className="app-panel matchback-detail">{current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.source} → {current.destination}</p></div><span className={current.status==='active'?'healthy':'status'}>{current.status}</span></div><div className="site-detail-grid">{[['Event type',current.eventType],['Identity method',current.identityMethod],['Last run',current.lastRunAt?new Date(current.lastRunAt).toLocaleString():'Never'],['Last status',current.lastRunStatus||'—'],['Last matched',String(current.lastRunMatched??'—')],['Last unmatched',String(current.lastRunUnmatched??'—')]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><div className="root-cause-box"><Sparkles/><div><b>Single revenue truth</b><p>Rule configuration determines which business outcome should be reconciled, while the summary metrics above remain sourced from the live attribution store rather than fabricated per-rule totals.</p></div></div><div className="approval-actions"><button onClick={reviewUnmatched}>View unmatched records</button><button disabled={busy==='toggle'} onClick={toggle}>{busy==='toggle'?'Saving…':current.status==='paused'?'Enable rule':'Pause rule'}</button><button className="approve" disabled={busy==='run'||current.status==='paused'} onClick={run}>{busy==='run'?'Reconciling…':<><CircleDollarSign/>Run reconciliation</>}</button></div></>:<div className="empty-delivery-state"><CircleDollarSign/><div><b>Select or create a matchback rule</b></div></div>}</div></div>
 {(data.templates||[]).length>0&&<div className="app-panel"><div className="panel-head"><div><h3>Suggested rule templates</h3><p>Configuration examples only — no revenue or performance claims are attached.</p></div></div><div className="template-grid">{(data.templates||[]).map((x:any)=><button key={x.name} onClick={()=>applyTemplate(x)}><CircleDollarSign/><div><b>{x.name}</b><small>{x.source} · {x.eventType}</small></div><span>{x.destination}</span></button>)}</div></div>}
 {live?.available&&<div className="app-panel"><div className="panel-head"><div><h3>Live identity coverage</h3><p>Persisted first-party acquisition evidence</p></div><span className="healthy">{live.activeClickSessions||0} active sessions</span></div><div className="site-detail-grid">{[['GCLID sessions',live.clickIdCoverage?.gclid||0],['FBCLID sessions',live.clickIdCoverage?.fbclid||0],['GBRAID / WBRAID',live.clickIdCoverage?.braid||0],['TikTok TTCLID',live.clickIdCoverage?.tiktok||0],['X TWCLID',live.clickIdCoverage?.x||0],['Assisted events',live.assistedEvents||0],['Matched events',live.matchedEvents||0],['Unmatched events',live.unmatchedEvents||0]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div></div>}
 {builder&&<div className="connector-modal"><form className="connector-card matchback-builder" onSubmit={create}><div className="connector-modal-head"><div><CircleDollarSign/><div><b>New matchback rule</b><small>Define how a verified downstream outcome should be reconciled.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Rule name<input name="name" required placeholder="Closed-won revenue"/></label><label>Source<input name="source" required placeholder="crm_billing"/></label><label>Event type<input name="eventType" required placeholder="closed_won"/></label><label>Destination<input name="destination" required placeholder="Google Ads"/></label><label>Identity method<input name="identityMethod" required placeholder="customer_id + click ID"/></label><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create matchback rule'}</button></form></div>}
 {unmatchedOpen&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><RadioTower/><div><b>Unmatched attribution review</b><small>Recent persisted events that could not be reconciled</small></div></div><button onClick={()=>setUnmatchedOpen(false)}><X/></button></div>{unmatched.length?<div className="debug-event-list">{unmatched.map((x:any)=><div className="developer-event-row" key={x.id}><code>{x.id}</code><span>{x.event_type} · {x.source||'unknown source'}</span><strong>{x.occurred_at?new Date(x.occurred_at).toLocaleString():'—'}</strong></div>)}</div>:<div className="empty-delivery-state"><CheckCircle2/><div><b>No recent unmatched events</b><small>The attribution store currently has no unmatched records in its recent window.</small></div></div>}</div></div>}</>
}
function POSAndStores(){
 const [data,setData]=useState<any>({locations:[],totals:{},recent:[]})
 const [selected,setSelected]=useState('')
 const [builder,setBuilder]=useState(false)
 const [busy,setBusy]=useState(false)
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<{kind:'ok'|'error'|'',text:string}>({kind:'',text:''})
 const load=()=>api.posStores().then((r:any)=>{setData(r);if(r.locations?.length)setSelected((x:string)=>x&&r.locations.some((i:any)=>i.id===x)?x:r.locations[0].id)}).catch(()=>setData({locations:[],totals:{},recent:[]}))
 useEffect(()=>{load()},[])
 const current=(data.locations||[]).find((x:any)=>x.id===selected)||data.locations?.[0]
 const parseCsv=(raw:string)=>{
  const lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)
  if(lines.length<2)throw new Error('Paste a CSV header and at least one transaction row.')
  const headers=lines[0].split(',').map(x=>x.trim())
  const required=['transaction_id','net_revenue','occurred_at']
  for(const key of required)if(!headers.includes(key))throw new Error('CSV must include '+required.join(', '))
  return lines.slice(1).map((line,index)=>{
   const values=line.split(',').map(x=>x.trim())
   const row:any={}
   headers.forEach((h,i)=>row[h]=values[i]??'')
   if(!row.transaction_id)row.transaction_id='row_'+(index+1)
   return {
    transactionId:row.transaction_id,
    customerId:row.customer_id||'',
    email:row.email||'',
    phone:row.phone||'',
    netRevenue:Number(row.net_revenue||0),
    currency:row.currency||'INR',
    occurredAt:row.occurred_at,
    gclid:row.gclid||'',
    fbclid:row.fbclid||'',
    msclkid:row.msclkid||'',
    ttclid:row.ttclid||'',
    twclid:row.twclid||''
   }
  })
 }
 const upload=async(e:any)=>{
  e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setNotice('')
  try{
   const transactions=parseCsv(String(f.get('csv')||''))
   const r:any=await api.importPosBatch({location:String(f.get('location')||''),locationName:String(f.get('locationName')||''),transactions,currency:'INR'})
   setBuilder(false);setNotice('POS batch processed: '+r.matched+' matched, '+r.unmatched+' unmatched from '+r.records+' transaction(s).');await load()
  }catch(err:any){setNotice(err?.message||'POS import failed.')}finally{setBusy(false)}
 }
 const downloadTemplate=()=>{const csv='transaction_id,customer_id,email,phone,net_revenue,currency,occurred_at,gclid,fbclid,msclkid,ttclid,twclid\nTXN-001,cust_001,,,84000,INR,2026-09-25T10:00:00Z,,,,,\n';const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ace-pos-import-template.csv';a.click();URL.revokeObjectURL(a.href)}
 const totals=data.totals||{}
 const matchRate=Number(totals.transactions||0)?Number(totals.matched||0)/Number(totals.transactions||0)*100:null
 return <><PageHead crumb="Offline / POS & Stores" title="POS, walk-in & store-sale attribution" sub="Import transaction-level offline sales and compute match coverage from actual first-party identity reconciliation." action="Import POS batch" onAction={()=>setBuilder(true)}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Store transactions" value={Number(totals.transactions||0).toLocaleString('en-IN')} sub="Persisted imported transaction rows" Icon={Building2}/><Stat label="Offline revenue" value={'₹'+Number(totals.revenue||0).toLocaleString('en-IN')} sub="Summed transaction revenue" Icon={CircleDollarSign}/><Stat label="Identity match rate" value={matchRate==null?'—':matchRate.toFixed(1)+'%'} sub="Computed by attribution reconciliation" Icon={Target}/><Stat label="Import batches" value={String(totals.imports||0)} sub="Persisted offline batches" Icon={RadioTower}/></div>
 <div className="pos-layout"><div className="app-panel pos-list"><div className="panel-head"><div><h3>Store / offline sources</h3><p>Location-level import state</p></div><button onClick={load}>Refresh</button></div>{(data.locations||[]).length?(data.locations||[]).map((x:any)=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><Building2/><div><b>{x.name}</b><small>{x.id} · {Number(x.transactions||0).toLocaleString('en-IN')} transactions</small></div><strong>{Number(x.matchRate||0).toFixed(1)}%</strong><span className={x.status==='healthy'?'healthy':'status'}>{x.status}</span><ChevronRight/></button>):<div className="empty-delivery-state"><Building2/><div><b>No POS imports yet</b><small>Import a transaction-level batch to populate offline attribution.</small></div></div>}</div>
 <div className="app-panel pos-detail">{current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.id} · {Number(current.transactions||0).toLocaleString('en-IN')} transactions · ₹{Number(current.revenue||0).toLocaleString('en-IN')}</p></div><span className="status">{Number(current.matchRate||0).toFixed(1)}% matched</span></div><div className="site-detail-grid">{[['Imports',current.imports||0],['Matched records',current.matched||0],['Unmatched records',Math.max(0,Number(current.transactions||0)-Number(current.matched||0))],['Last import',current.lastImportAt?new Date(current.lastImportAt).toLocaleString():'—'],['Matching keys','Customer ID · email · phone · GCLID · FBCLID'],['Import method','Transaction CSV → assisted attribution']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><div className="approval-actions"><button onClick={downloadTemplate}>Download import template</button><button className="approve" onClick={()=>setBuilder(true)}><Building2/>Import POS batch</button></div></>:<div className="empty-delivery-state"><Building2/><div><b>No store selected</b></div></div>}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recent import batches</h3><p>Persisted offline ingestion history with computed match outcomes</p></div></div>{(data.recent||[]).length?(data.recent||[]).map((x:any)=><div className="pos-transaction-row" key={x.batchId}><code>{x.batchId}</code><strong>{Number(x.records||0).toLocaleString('en-IN')} records</strong><span>{x.location}</span><span>₹{Number(x.revenue||0).toLocaleString('en-IN')}</span><em className={Number(x.unmatched||0)>0?'status':'matched'}>{Number(x.matched||0)} matched · {Number(x.unmatched||0)} unmatched</em></div>):<div className="empty-delivery-state"><Building2/><div><b>No import history yet</b></div></div>}</div>
 {builder&&<div className="connector-modal"><form className="connector-card" onSubmit={upload}><div className="connector-modal-head"><div><Building2/><div><b>Import POS transactions</b><small>Each row is reconciled against first-party identity evidence; match count is computed by the backend.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Store ID<input name="location" required defaultValue={current?.id||''} placeholder="STORE-01"/></label><label>Store name<input name="locationName" required defaultValue={current?.name||''} placeholder="MG Road Store"/></label><label>CSV transactions<textarea name="csv" required rows={9} defaultValue={'transaction_id,customer_id,email,phone,net_revenue,currency,occurred_at,gclid,fbclid\nTXN-001,cust_001,,,84000,INR,2026-09-25T10:00:00Z,,'}/><small>Required columns: transaction_id, net_revenue, occurred_at. Add customer/contact/click identifiers when available.</small></label><button type="button" onClick={downloadTemplate}>Download template</button><button disabled={busy}>{busy?'Importing & matching…':'Process transaction batch'}</button></form></div>}</>
}
function Journeys(){
 const [data,setData]=useState<any[]>([])
 const [selected,setSelected]=useState('')
 const [source,setSource]=useState('All sources')
 const [stage,setStage]=useState('All stages')
 const [query,setQuery]=useState('')
 const [loading,setLoading]=useState(false)
 const load=async()=>{setLoading(true);try{const r:any=await api.journeys();const items=r.items||[];setData(items);if(items[0])setSelected((x:string)=>x&&items.some((i:any)=>i.id===x)?x:items[0].id)}catch{setData([])}finally{setLoading(false)}}
 useEffect(()=>{load()},[])
 const sources=['All sources',...Array.from(new Set(data.map(x=>x.source).filter(Boolean)))]
 const stages=['All stages',...Array.from(new Set(data.map(x=>x.stage).filter(Boolean)))]
 const filtered=data.filter(x=>(source==='All sources'||x.source===source)&&(stage==='All stages'||x.stage===stage)&&(!query.trim()||[x.lead,x.source,x.stage,x.campaign].join(' ').toLowerCase().includes(query.trim().toLowerCase())))
 const current=filtered.find(x=>x.id===selected)||filtered[0]||data[0]
 const cycle=(items:any[],value:string)=>items[(Math.max(0,items.indexOf(value))+1)%items.length]
 const iconFor=(type:string)=>type==='meeting'?CalendarDays:type==='routing'?Network:type==='feedback'?MessageSquareText:type==='follow_up'||type==='follow_up_completed'?MessageCircle:type==='call'?PhoneCall:type==='whatsapp'?MessageCircle:type==='stage'?Target:MousePointer2
 return <><PageHead crumb="Measurement / Journeys" title="Customer journey explorer" sub="Inspect the complete chronology for every lead across tracking, CRM, routing, follow-up, calls, WhatsApp, meetings and feedback." action={loading?'Refreshing…':'Refresh'} onAction={load}/>
 <div className="filters"><button disabled={loading} onClick={()=>setSource(cycle(sources,source))}>{source} <ChevronDown/></button><button disabled={loading} onClick={()=>setStage(cycle(stages,stage))}>{stage} <ChevronDown/></button><div className="journey-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search lead, source, stage, campaign..."/></div></div>
 <div className="journey-layout"><div className="journey-list">{filtered.length?filtered.map((x:any)=><article className={selected===x.id?'selected':''} key={x.id} onClick={()=>setSelected(x.id)}><div className="lead-avatar">{String(x.lead||'?').split(' ').map((s:string)=>s[0]).join('').slice(0,2)}</div><div><b>{x.lead}</b><small>{x.source} · {x.touchpoints||0} touchpoints{x.campaign?' · '+x.campaign:''}</small></div><span className="stage">{x.stage}</span><div className="mini-path"><i/><i/><i/><i className={(x.touchpoints||0)>3?'done':''}/><i className={(x.touchpoints||0)>5?'done':''}/></div><time>{x.duration||'—'}</time><ChevronRight/></article>):<div className="empty-delivery-state"><Search/><div><b>No matching journeys</b><small>Change the source/stage filter or search query.</small></div></div>}</div>
 <div className="app-panel journey-detail">{current?<><div className="panel-head"><div><h3>{current.lead}</h3><p>{current.source} · {current.stage}{current.campaign?' · '+current.campaign:''}</p></div><span className="status">{current.touchpoints||0} persisted touchpoints</span></div><div className="journey-detail-meta">{[['Lead',current.lead],['Source',current.source],['Campaign',current.campaign||'—'],['Stage',current.stage],['Score',current.score??'—'],['Grade',current.grade||'—'],['Duration',current.duration||'—'],['Last activity',current.lastActivity?new Date(current.lastActivity).toLocaleString():'—']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div>
 <div className="journey-chronology"><div className="panel-head"><div><h3>Stitched chronology</h3><p>Only records linked to this lead are shown</p></div></div>{(current.timeline||[]).length?(current.timeline||[]).map((x:any,i:number)=>{const I=iconFor(x.type);return <div className="journey-event" key={x.id||i}><span className="journey-event-icon"><I/></span><div><b>{x.title}</b><small>{x.source} · {x.at?new Date(x.at).toLocaleString():'—'}</small><p>{x.detail||'Persisted activity'}</p>{x.destination&&<em>Destination: {x.destination}</em>}{x.startsAt&&<em>Meeting: {new Date(x.startsAt).toLocaleString()}</em>}</div></div>}):<div className="empty-delivery-state"><Network/><div><b>No linked chronology yet</b><small>The lead profile exists, but no additional tracked or operational records can be deterministically linked yet.</small></div></div>}</div></>:<div className="empty-delivery-state"><Network/><div><b>No journey selected</b></div></div>}</div></div></>
}
function Identity(){
 const [data,setData]=useState<any>({recent:[],rules:[],identifiers:[],clickCoverage:{}})
 useEffect(()=>{api.identity().then((r:any)=>setData(r)).catch(()=>setData({recent:[],rules:[],identifiers:[],clickCoverage:{}}))},[])
 const recent=data.recent||[]
 const exportQueue=()=>{const csv=['customer_id,name,identifiers,touchpoints,confidence',...recent.map((x:any)=>[x.id,x.name,x.identifierCount,x.touchpoints,x.confidence].map((v:any)=>'"'+String(v??'').replaceAll('"','""')+'"').join(','))].join('\n');const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ace-identity-review.csv';a.click();URL.revokeObjectURL(a.href)}
 const sample=recent[0]
 const clickTotal=Number(data.clickCoverage?.gclid||0)+Number(data.clickCoverage?.fbclid||0)+Number(data.clickCoverage?.braid||0)
 return <><PageHead crumb="Data / Identity" title="Identity resolution" sub="Unify click IDs, first-party identifiers, devices and CRM records into a customer-level graph." action="Review match rules" onAction={()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Fingerprinting'}))}/>
 <div className="stats-grid"><Stat label="Known identities" value={data.available?Number(data.profiles||0).toLocaleString('en-IN'):'—'} sub="Persisted customer / lead profiles" Icon={UsersRound}/><Stat label="Stitched profiles" value={data.available?Number(data.stitchedProfiles||0).toLocaleString('en-IN'):'—'} sub="Two or more first-party identifiers" Icon={Target}/><Stat label="Deterministic coverage" value={data.deterministicMatchRate==null?'—':data.deterministicMatchRate+'%'} sub="Multi-key profile coverage" Icon={MousePointer2}/><Stat label="Click IDs attached" value={clickTotal?String(clickTotal):'—'} sub="GCLID / FBCLID / braid evidence" Icon={Activity}/></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Identity graph</h3><p>{sample?'Latest persisted profile':'No persisted profile yet'}</p></div><span className={sample?'healthy':'status'}>{sample?'Resolved profile':'Waiting for data'}</span></div>{sample?<div className="identity-graph"><div className="identity-core"><span>{String(sample.name||'?').split(' ').map((x:string)=>x[0]).join('').slice(0,2)}</span><b>{sample.name}</b><small>{sample.id}</small></div>{Object.entries(sample.identifiers||{}).filter(([,v])=>v).map(([key],i)=><div className={'identity-node n'+(i%6)} key={key}><span>{key}</span><b>Present</b></div>)}</div>:<div className="empty-delivery-state"><UsersRound/><div><b>No identity graph yet</b><small>Track or import a customer/contact/device identity to create the first profile.</small></div></div>}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Match rules</h3><p>Deterministic first, supporting keys second</p></div></div>{(data.rules||[]).map((x:any)=><div className="identity-rule" key={x.key}><span>{x.key}</span><b>{x.mode}</b><strong>Priority {x.priority}</strong></div>)}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recent resolved identities</h3><p>{(data.identifiers||[]).length?(data.identifiers||[]).join(' · '):'No identifier types observed yet'}</p></div><button onClick={exportQueue} disabled={!recent.length}>Export review queue</button></div>{recent.length?recent.map((x:any)=><div className="identity-row" key={x.id}><UsersRound/><div><b>{x.name}</b><small>{x.id}</small></div><span>{x.identifierCount} identifiers</span><span>{x.touchpoints} touchpoints</span><em>{x.confidence}</em></div>):<div className="empty-delivery-state"><UsersRound/><div><b>No resolved identities yet</b></div></div>}</div></>
}
function Attribution(){
 const [period,setPeriod]=useState('Last 30 days')
 const periods=['Last 7 days','Last 30 days','Last 90 days']
 const [live,setLive]=useState<any>(null)
 const [loading,setLoading]=useState(false)
 const [view,setView]=useState<'channels'|'campaigns'|'outcomes'|'matches'>('channels')
 const [selected,setSelected]=useState('')
 const periodDays=period==='Last 7 days'?7:period==='Last 90 days'?90:30
 const load=async()=>{setLoading(true);try{const r:any=await api.attributionIdentityStats(periodDays);setLive(r);const first=r?.channels?.[0]?.channel||r?.campaigns?.[0]?.campaign||'';setSelected((x:string)=>x||first)}finally{setLoading(false)}}
 useEffect(()=>{load()},[periodDays])
 const cycle=()=>setPeriod(periods[(periods.indexOf(period)+1)%periods.length])
 const channels=live?.channels||[]
 const campaigns=live?.campaigns||[]
 const outcomes=live?.eventTypes||[]
 const recent=live?.recent||[]
 const totalValue=Number(live?.matchedValue||0)
 const fmt=(value:any)=>Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:2})
 const selectedChannel=channels.find((x:any)=>x.channel===selected)||channels[0]
 const selectedCampaign=campaigns.find((x:any)=>x.campaign===selected)||campaigns[0]
 const ranked=view==='channels'?channels:view==='campaigns'?campaigns:outcomes
 const topValue=Math.max(1,...ranked.map((x:any)=>Number(x.value||x.matched||x.events||0)))
 const jump=(next:string)=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:next}))
 return <><PageHead crumb="Measurement / Attribution" title="Full-path attribution" sub="Connect assisted outcomes and attributed value back to the channels, campaigns and touchpoints that influenced them." action={loading?'Refreshing…':'Refresh'} onAction={load}/>
 <div className="stats-grid"><Stat label="Matched events" value={live?.available?String(live.matchedEvents||0):'—'} sub={period+' assisted outcomes'} Icon={CircleDollarSign}/><Stat label="Matched value" value={live?.available?fmt(live.matchedValue):'—'} sub="Persisted event value" Icon={BarChart3}/><Stat label="Match rate" value={live?.available?String(live.matchRate||0)+'%':'—'} sub={periodDays+' day window'} Icon={PieChart}/><Stat label="Avg confidence" value={live?.available?String(live.averageMatchConfidence||0)+'%':'—'} sub="Deterministic match evidence" Icon={ShieldCheck}/></div>
 <section className="attribution-hero">
  <div><span>ATTRIBUTION EVIDENCE</span><h3>{live?.available?fmt(live.matchedEvents||0):'—'} matched outcomes across {Number(live?.touchSummary?.source_count||0)} source{Number(live?.touchSummary?.source_count||0)===1?'':'s'}</h3><p>Only persisted click sessions and assisted outcomes are included. Unmatched conversions remain visible instead of being forced into a channel.</p></div>
  <div className="attribution-hero-metrics"><article><span>Campaigns</span><b>{Number(live?.touchSummary?.campaign_count||0)}</b></article><article><span>Landing evidence</span><b>{Number(live?.touchSummary?.landing_evidence||0)}</b></article><article><span>Referrer evidence</span><b>{Number(live?.touchSummary?.referrer_evidence||0)}</b></article><article><span>Unmatched</span><b>{Number(live?.unmatchedEvents||0)}</b></article></div>
 </section>
 <div className="attribution-tabs"><button className={view==='channels'?'active':''} onClick={()=>{setView('channels');setSelected(channels[0]?.channel||'')}}>Channels</button><button className={view==='campaigns'?'active':''} onClick={()=>{setView('campaigns');setSelected(campaigns[0]?.campaign||'')}}>Campaigns</button><button className={view==='outcomes'?'active':''} onClick={()=>setView('outcomes')}>Outcomes</button><button className={view==='matches'?'active':''} onClick={()=>setView('matches')}>Match evidence</button><button disabled={loading} onClick={cycle}>{period}<ChevronDown/></button></div>
 {view==='channels'&&<div className="attribution-layout"><div className="app-panel attribution-ranking"><div className="panel-head"><div><h3>Channel contribution</h3><p>Source-level matched outcomes and attributed value</p></div><span className="healthy">{channels.length} sources</span></div>{channels.length?channels.map((x:any)=><button key={x.channel} className={selected===x.channel?'selected':''} onClick={()=>setSelected(x.channel)}><div><b>{x.channel}</b><small>{x.matched} matched · {x.events} total events</small></div><div className="attribution-bar"><i style={{width:Math.max(2,Number(x.value||x.matched||0)/topValue*100)+'%'}}/></div><strong>{x.share?x.share+'%':fmt(x.value)}</strong><ChevronRight/></button>):<div className="empty-delivery-state"><PieChart/><div><b>No channel attribution evidence</b><small>Ingest click sessions and downstream outcomes to populate source contribution.</small></div></div>}</div>
 <div className="app-panel attribution-detail">{selectedChannel?<><div className="panel-head"><div><h3>{selectedChannel.channel}</h3><p>Observed contribution in {period.toLowerCase()}</p></div><span className="healthy">{selectedChannel.avgConfidence||0}% confidence</span></div><div className="site-detail-grid">{[['Total assisted events',selectedChannel.events],['Matched outcomes',selectedChannel.matched],['Attributed value',fmt(selectedChannel.value)],['Value share',selectedChannel.share+'%']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><div className="agent-section"><h4>Campaigns under this source</h4>{campaigns.filter((x:any)=>x.channel===selectedChannel.channel).slice(0,8).map((x:any)=><button className="attribution-subrow" key={x.campaign} onClick={()=>{setView('campaigns');setSelected(x.campaign)}}><div><b>{x.campaign}</b><small>{x.matched} matched · {fmt(x.value)} value</small></div><strong>{x.share||0}%</strong><ChevronRight/></button>)}</div></>:<div className="empty-delivery-state"><PieChart/><div><b>No source selected</b></div></div>}</div></div>}
 {view==='campaigns'&&<div className="attribution-layout"><div className="app-panel attribution-ranking"><div className="panel-head"><div><h3>Campaign contribution</h3><p>Campaign-level matched outcomes and value</p></div><span className="healthy">{campaigns.length} campaigns</span></div>{campaigns.length?campaigns.map((x:any)=><button key={x.channel+':'+x.campaign} className={selected===x.campaign?'selected':''} onClick={()=>setSelected(x.campaign)}><div><b>{x.campaign}</b><small>{x.channel} · {x.matched} matched</small></div><div className="attribution-bar"><i style={{width:Math.max(2,Number(x.value||x.matched||0)/topValue*100)+'%'}}/></div><strong>{x.share?x.share+'%':fmt(x.value)}</strong><ChevronRight/></button>):<div className="empty-delivery-state"><Target/><div><b>No campaign attribution evidence</b></div></div>}</div>
 <div className="app-panel attribution-detail">{selectedCampaign?<><div className="panel-head"><div><h3>{selectedCampaign.campaign}</h3><p>{selectedCampaign.channel}</p></div><span className="healthy">{selectedCampaign.avgConfidence||0}% confidence</span></div><div className="site-detail-grid">{[['Assisted events',selectedCampaign.events],['Matched outcomes',selectedCampaign.matched],['Attributed value',fmt(selectedCampaign.value)],['Value share',selectedCampaign.share+'%']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><button className="app-primary" onClick={()=>jump('Journeys')}>Inspect customer journeys <ArrowRight/></button></>:<div className="empty-delivery-state"><Target/><div><b>No campaign selected</b></div></div>}</div></div>}
 {view==='outcomes'&&<div className="app-panel"><div className="panel-head"><div><h3>Attributed business outcomes</h3><p>Downstream event types ranked by matched value and volume</p></div></div>{outcomes.length?outcomes.map((x:any)=><div className="attribution-outcome-row" key={x.event_type}><div><b>{String(x.event_type||'outcome').replaceAll('_',' ')}</b><small>{x.matched} matched of {x.events} events</small></div><div className="progress"><i style={{width:Math.max(2,Number(x.value||x.matched||0)/topValue*100)+'%'}}/></div><strong>{fmt(x.value)}</strong></div>):<div className="empty-delivery-state"><CircleDollarSign/><div><b>No attributed outcomes in this period</b></div></div>}</div>}
 {view==='matches'&&<div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Match methods</h3><p>Deterministic identifiers used to connect outcomes</p></div></div>{live?.methods?.length?live.methods.map((x:any)=><div className="channel-line" key={x.method}><b>{String(x.method||'unmatched').replaceAll('_',' ')}</b><div className="progress"><i style={{width:(live.assistedEvents?Math.min(100,Number(x.count||0)/Number(live.assistedEvents)*100):0)+'%'}}/></div><span>{x.count} events</span><strong>{live.assistedEvents?Math.round(Number(x.count||0)/Number(live.assistedEvents)*100):0}%</strong></div>):<div className="empty-delivery-state"><ShieldCheck/><div><b>No match evidence in this window</b></div></div>}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recent attributed outcomes</h3><p>Outcome → source/campaign evidence</p></div><button onClick={()=>jump('Matchback')}>Open Matchback</button></div>{recent.length?recent.slice(0,10).map((x:any)=><div className="attribution-recent-row" key={x.id}><span className={x.status==='matched'?'healthy':'status'}>{x.status}</span><div><b>{String(x.event_type||'outcome').replaceAll('_',' ')}</b><small>{x.utm_source||x.source||'Unknown source'}{x.utm_campaign?' · '+x.utm_campaign:''} · {x.match_method?String(x.match_method).replaceAll('_',' '):'unmatched'}</small></div><strong>{x.value==null?'—':fmt(x.value)+(x.currency?' '+x.currency:'')}</strong></div>):<div className="empty-delivery-state"><Activity/><div><b>No recent attribution events</b></div></div>}</div></div>}
 <div className="source-conflict-note"><ShieldCheck/><div><b>Attribution boundary</b><p>AceMarketing reports deterministic matches from persisted customer, click-ID, hashed contact and visitor evidence. It does not invent campaign credit for unmatched outcomes.</p></div></div></>
}
function GroupedPerformance(){
 const [dimension,setDimension]=useState('category')
 const [data,setData]=useState<any>({available:false,items:[],totals:{},conversionEvents:[]})
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const [costDrafts,setCostDrafts]=useState<Record<string,string>>({})
 const load=async(next=dimension)=>{
  try{
   const r:any=await api.groupedPerformance(next,6)
   setData(r)
   setCostDrafts(Object.fromEntries((r.items||[]).map((x:any)=>[x.key,x.cost==null?'':String(x.cost)])))
  }catch(e:any){setNotice(e?.message||'Grouped performance could not be loaded.')}
 }
 useEffect(()=>{load(dimension)},[dimension])
 const money=(n:any)=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})
 const saveCost=async(key:string)=>{
  setBusy(key);setNotice('')
  const raw=costDrafts[key]??''
  try{
   await api.saveGroupedPerformanceCost(dimension,key,raw.trim()===''?null:Number(raw))
   setNotice(raw.trim()===''?'Cost basis cleared for '+key+'.':'Cost basis saved for '+key+'.')
   await load(dimension)
  }catch(e:any){setNotice(e?.message||'Cost basis could not be saved.')}
  finally{setBusy('')}
 }
 const dims=[['category','Category'],['productCategory','Product category'],['product','Product / SKU'],['brand','Brand'],['source','Acquisition source'],['campaign','Campaign']]
 const t=data.totals||{}
 return <><PageHead crumb="Measurement / Grouped Performance" title="Grouped performance" sub="Group first-party conversion evidence by product, category, brand, source or campaign, and add optional cost inputs to calculate contribution without inventing margin." action="Refresh" onAction={()=>load(dimension)}/>
 {notice&&<div className={'delivery-notice '+(notice.toLowerCase().includes('could not')?'error':'ok')}><Table2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Groups" value={String((data.items||[]).length)} sub={dims.find(x=>x[0]===dimension)?.[1]||dimension} Icon={Table2}/><Stat label="Conversions" value={String(t.conversions||0)} sub={(t.conversionRate||0)+'% conversion rate'} Icon={Target}/><Stat label="Attributed revenue" value={money(t.revenue)} sub="Configured conversion-event value only" Icon={CircleDollarSign}/><Stat label="Contribution" value={t.contribution==null?'—':money(t.contribution)} sub={t.costedGroups?String(t.costedGroups)+' groups with explicit cost basis':'Enter costs to calculate contribution'} Icon={Activity}/></div>
 <div className="grouped-performance-hero app-panel"><div><Table2/><div><span>EVIDENCE-BASED GROUPING</span><h3>First-party events → grouped conversion evidence → optional contribution view</h3><p>Revenue is counted only from configured conversion events. Contribution and margin appear only for groups where an operator explicitly supplies cost.</p></div></div><div className="grouped-dimension-picker">{dims.map(([key,label])=><button key={key} className={dimension===key?'selected':''} onClick={()=>setDimension(key)}>{label}</button>)}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Grouped performance table</h3><p>{data.available?'Built from persisted first-party events':'Waiting for persisted event evidence'}</p></div><span className="status">{(data.conversionEvents||[]).length} configured conversion events</span></div>
 <div className="grouped-performance-table"><table><thead><tr><th>Group</th><th>Subjects</th><th>Events</th><th>Conversions</th><th>Conv. rate</th><th>Revenue</th><th>Cost basis</th><th>Contribution</th><th>Margin</th></tr></thead><tbody>{(data.items||[]).length?(data.items||[]).map((x:any)=><tr key={x.key}><td><b>{x.key}</b></td><td>{Number(x.subjects||0).toLocaleString('en-IN')}</td><td>{Number(x.events||0).toLocaleString('en-IN')}</td><td>{Number(x.conversions||0).toLocaleString('en-IN')}</td><td>{x.conversionRate||0}%</td><td>{money(x.revenue)}</td><td><div className="grouped-cost-editor"><input aria-label={'Cost basis for '+x.key} type="number" min="0" step="0.01" value={costDrafts[x.key]??''} onChange={e=>setCostDrafts({...costDrafts,[x.key]:e.target.value})} placeholder="Optional"/><button disabled={busy===x.key} onClick={()=>saveCost(x.key)}>{busy===x.key?'Saving…':'Save'}</button></div></td><td>{x.contribution==null?'—':money(x.contribution)}</td><td>{x.marginRate==null?'—':x.marginRate+'%'}</td></tr>):<tr><td colSpan={9}>No grouped evidence yet. Track events with category, product, brand, source or campaign fields to populate this view.</td></tr>}</tbody></table></div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Conversion event contract</h3><p>Only these events count as conversions and attributed revenue</p></div></div><div className="context-chips">{(data.conversionEvents||[]).length?(data.conversionEvents||[]).map((x:string)=><span key={x}>{x}</span>):<span>No conversion event contract available</span>}</div></div><div className="app-panel"><div className="panel-head"><div><h3>Cost & margin boundary</h3><p>What this workspace will and will not calculate</p></div></div>{[['Revenue','Observed value on configured conversion events'],['Cost','Only operator-entered cost basis'],['Contribution','Revenue minus explicit cost'],['Margin %','Only when revenue and cost are both available'],['Missing P&L data','Shown as —, never inferred']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div></div>
 </> 
}

function Enrich(){
 const [live,setLive]=useState<any>({items:[],stats:null,writebacks:[]})
 const [selected,setSelected]=useState('')
 const [search,setSearch]=useState('')
 const [writeback,setWriteback]=useState('')
 const [notice,setNotice]=useState('')
 const load=async()=>{try{const r:any=await api.enrich();setLive(r);if(r.items?.length)setSelected((v:string)=>v&&r.items.some((x:any)=>x.id===v)?v:r.items[0].id)}catch(e:any){setLive({items:[],stats:null,writebacks:[]});setNotice(e?.message||'CRM enrichment data could not be loaded.')}}
 useEffect(()=>{load()},[])
 const profiles=live.items||[]
 const visible=profiles.filter((x:any)=>!search.trim()||[x.name,x.leadId,x.source,x.campaign,x.stage,x.grade].some(v=>String(v||'').toLowerCase().includes(search.trim().toLowerCase())))
 const profile=profiles.find((x:any)=>x.id===selected)||profiles[0]
 const stats=live.stats||{}
 const runs=(live.writebacks||[]).filter((x:any)=>!profile||String(x.entity_id||x.entityId||'')===String(profile.id))
 const pushCrm=async(provider:string)=>{
  if(!profile)return
  setWriteback(provider);setNotice('')
  try{
   const r:any=await api.writebackEnrichment(profile.id||profile.leadId,provider,{
    grade:profile.grade,score:profile.score,source:profile.source,campaign:profile.campaign,stage:profile.stage
   })
   setNotice('CRM writeback queued to '+provider+(r?.runId?' · '+String(r.runId).slice(0,18):'')+'.')
   await load()
  }catch(e:any){setNotice(e?.message||'CRM writeback could not be queued.')}
  finally{setWriteback('')}
 }
 const total=Number(stats.total||0),ab=Number(stats.abQuality||0)
 return <><PageHead crumb="Conversion / Enrich" title="CRM enrichment" sub="Give sales acquisition, intent, journey, call and messaging context before the first conversation." action="Refresh" onAction={load}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Leads enriched" value={stats.available?String(total):'—'} sub="Persisted CRM profiles" Icon={DatabaseZap}/><Stat label="A-grade" value={stats.available?String(stats.aGrade||0):'—'} sub="Highest current intent" Icon={Target}/><Stat label="A+B quality" value={stats.available&&total?Math.round(ab/total*100)+'%':'—'} sub="Qualified scoring pool" Icon={Activity}/><Stat label="CRM writebacks" value={String((live.writebacks||[]).length)} sub="Persisted activation runs" Icon={RadioTower}/></div>
 <div className="enrich-layout"><div className="app-panel enrich-leads"><div className="panel-head"><div><h3>Enriched leads</h3><p>Choose the exact lead context sales should receive</p></div><span className="healthy">{profiles.length} profiles</span></div><div className="enrich-search"><Search/><input aria-label="Search enriched leads" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search lead, source, campaign, stage..."/></div>{visible.length?visible.map((x:any)=><button key={x.id} className={profile?.id===x.id?'selected':''} onClick={()=>setSelected(x.id)}><span className={'grade grade-'+String(x.grade||'D').toLowerCase()}>{x.grade||'D'}</span><div><b>{x.name||x.leadId}</b><small>{x.source||'Unknown source'} · {x.stage||'lead'}{x.campaign?' · '+x.campaign:''}</small></div><strong>{Number(x.score||0)}</strong><ChevronRight/></button>):<div className="empty-delivery-state"><Search/><div><b>No enriched lead matches</b><small>Clear the search or ingest another CRM/first-party profile.</small></div></div>}</div>
 <div className="app-panel enrich-profile">{profile?<><div className="panel-head"><div><h3>{profile.name||profile.leadId}</h3><p>{profile.leadId} · updated {profile.updatedAt?new Date(profile.updatedAt).toLocaleString():'—'}</p></div><span className={'grade grade-'+String(profile.grade||'D').toLowerCase()}>{profile.grade||'D'} · {profile.score||0}</span></div><div className="profile-fields enrich-fields">{[['First touch',profile.source||'—'],['Campaign',profile.campaign||'—'],['Journey depth',profile.journey?.journeyDepth??0],['Pricing-page views',profile.journey?.pricingPageViews??0],['Intent',profile.intent||'—'],['CRM stage',profile.stage||'—'],['WhatsApp',profile.journey?.whatsappEngaged?'Engaged':'No evidence'],['Call outcome',profile.journey?.callOutcome||'No evidence']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><div className="agent-section"><h4>Explainable score evidence</h4>{(profile.drivers||[]).length?(profile.drivers||[]).slice(0,8).map((x:any)=><div className="score-driver" key={x.key||x.label}><div><b>{x.label}</b><small>{x.evidence}</small></div><strong className={Number(x.points)<0?'negative':''}>{Number(x.points)>0?'+':''}{x.points}</strong></div>):<div className="empty-delivery-state"><Activity/><div><b>No score-driver evidence stored</b></div></div>}</div><div className="enrich-context-grid"><div><h4>Call context</h4>{profile.callSummary?<p>{profile.callSummary}</p>:<small>No call evidence</small>}</div><div><h4>WhatsApp context</h4>{profile.whatsappSummary?<p>{profile.whatsappSummary}</p>:<small>No messaging evidence</small>}</div></div><div className="approval-actions enrich-writeback-actions"><button disabled={!!writeback} onClick={()=>pushCrm('HubSpot')}>{writeback==='HubSpot'?'Queueing…':'Write to HubSpot'}</button><button disabled={!!writeback} onClick={()=>pushCrm('Zoho CRM')}>{writeback==='Zoho CRM'?'Queueing…':'Write to Zoho'}</button><button disabled={!!writeback} onClick={()=>pushCrm('Salesforce')}>{writeback==='Salesforce'?'Queueing…':'Write to Salesforce'}</button></div></>:<div className="empty-delivery-state"><DatabaseZap/><div><b>No enriched profiles yet</b><small>CRM, first-party, call or WhatsApp ingestion will populate this surface.</small></div></div>}</div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>CRM writeback evidence</h3><p>Durable runs for the selected lead</p></div></div>{runs.length?runs.slice(0,8).map((x:any)=><div className="enrich-writeback-row" key={x.id}><RadioTower/><div><b>{x.provider||'CRM'}</b><small>{x.created_at||x.createdAt?new Date(x.created_at||x.createdAt).toLocaleString():'—'}{x.last_error||x.lastError?' · '+(x.last_error||x.lastError):''}</small></div><span className={String(x.status||'queued').toLowerCase()}>{String(x.status||'queued').replaceAll('_',' ')}</span></div>):<div className="empty-delivery-state"><RadioTower/><div><b>No writebacks for this lead yet</b><small>Choose a CRM above to queue the first governed enrichment writeback.</small></div></div>}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Grade distribution</h3><p>Current persisted lead pool</p></div></div>{stats.available&&total?[['A · High intent',Number(stats.aGrade||0)],['B · Strong fit',Math.max(0,Number(stats.abQuality||0)-Number(stats.aGrade||0))],['C · Nurture',Number(stats.cGrade||0)],['D · Low quality',Number(stats.dGrade||0)]].map((x:any)=><div className="health-line" key={x[0]}><span>{x[0]}</span><div className="progress"><i style={{width:(x[1]/total*100)+'%'}}/></div><b>{x[1]}</b></div>):<div className="empty-delivery-state"><Target/><div><b>No grading population yet</b></div></div>}</div></div></>
}
function LeadGrading(){
 const [selected,setSelected]=useState('')
 const [leads,setLeads]=useState<any[]>([])
 const [stats,setStats]=useState<any>(null)
 const [activated,setActivated]=useState<any>(null)
 const [notice,setNotice]=useState('')
 const load=()=>api.leadGrading().then((r:any)=>{const mapped=(r.items||[]).map((x:any)=>({name:String(x.lead||x.leadId||'Unknown lead'),leadId:x.leadId,source:x.source||'Unknown',score:Number(x.score||0),grade:['A','B','C','D'].includes(String(x.grade||'').toUpperCase())?String(x.grade).toUpperCase():'D',stage:x.stage||'Lead',reason:x.reason||'Scored from persisted journey evidence',drivers:Array.isArray(x.drivers)?x.drivers:[]}));setLeads(mapped);setStats(r.stats||null);if(mapped.length)setSelected((v:string)=>v&&mapped.some((x:any)=>x.name===v)?v:mapped[0].name)}).catch(()=>{setLeads([]);setStats(null)})
 useEffect(()=>{load()},[])
 const current=leads.find(x=>x.name===selected)||leads[0]
 const override=async(grade:string)=>{if(!current)return;await api.overrideLeadGrade(current.leadId||current.name,grade);await load()}
 const activate=async()=>{if(!current)return;setNotice('');try{const r:any=await api.activateLeadGrade(current.leadId||current.name);setActivated(r);setNotice('Grade '+current.grade+' activation created a persisted '+String(r.action||'operation').replaceAll('_',' ')+'.')}catch(e:any){setNotice(e?.message||'Grade activation failed.')}}
 const openActivation=()=>{if(activated?.nextTab)window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:activated.nextTab}))}
 const total=Number(stats?.total||0)
 const dist=[['A · High intent',Number(stats?.aGrade||0)],['B · Strong fit',Math.max(0,Number(stats?.abQuality||0)-Number(stats?.aGrade||0))],['C · Nurture',Number(stats?.cGrade||0)],['D · Low quality',Number(stats?.dGrade||0)]]
 return <><PageHead crumb="Conversion / Lead Grading" title="Lead grading" sub="Score and grade each persisted lead using CRM, journey, behavioral and interaction evidence."/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="A-grade leads" value={stats?.available?String(stats.aGrade||0):'—'} sub="Highest-intent pool" Icon={Target}/><Stat label="A+B quality" value={stats?.available&&total?Math.round(Number(stats.abQuality||0)/total*100)+'%':'—'} sub="Persisted graded leads" Icon={CheckCircle2}/><Stat label="Average score" value={stats?.available?String(stats.averageScore||0):'—'} sub="Explainable v2.0 scoring" Icon={Activity}/><Stat label="Profiles scored" value={stats?.available?String(total):'—'} sub="CRM + journey evidence" Icon={RadioTower}/></div>
 <div className="grading-layout"><div className="app-panel grading-list"><div className="panel-head"><div><h3>Recent graded leads</h3><p>Score, grade and current stage</p></div><button onClick={load}>Refresh</button></div>{leads.length?leads.map(x=><button key={x.name} className={selected===x.name?'selected':''} onClick={()=>{setSelected(x.name);setActivated(null);setNotice('')}}><span className={'grade grade-'+String(x.grade).toLowerCase()}>{x.grade}</span><div><b>{x.name}</b><small>{x.source} · {x.stage}</small></div><strong>{x.score}/100</strong><ChevronRight/></button>):<div className="empty-delivery-state"><Target/><div><b>No graded leads yet</b><small>Lead profiles appear after CRM or first-party identity ingestion.</small></div></div>}</div>
 <div className="app-panel grading-detail">{current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.reason}</p></div><span className={'grade grade-'+String(current.grade).toLowerCase()}>{current.grade}</span></div><div className="grade-score-card"><Target/><div><span>Quality score</span><strong>{current.score}</strong><small>Grade {current.grade}</small></div><div className="progress"><i style={{width:Math.max(0,Math.min(100,current.score))+'%'}}/></div></div><div className="diagnostic-evidence">{[['Acquisition source',current.source],['CRM stage',current.stage],['Score drivers',String(current.drivers.length)],['Scoring version','v2.0']].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div><div className="agent-section"><h4>Score drivers</h4>{current.drivers.length?current.drivers.map((x:any)=><div className="score-driver" key={x.key||x.label}><div><b>{x.label}</b><small>{x.evidence}</small></div><strong className={Number(x.points)<0?'negative':''}>{Number(x.points)>0?'+':''}{x.points}</strong></div>):<div className="empty-delivery-state"><Activity/><div><b>No score-driver evidence stored</b></div></div>}</div><div className="grade-actions"><div><span>Manual grade override</span>{['A','B','C','D'].map(g=><button key={g} className={current.grade===g?'active':''} onClick={()=>override(g)}>{g}</button>)}</div><button className="app-primary" onClick={activate}>{activated?<><Check/>Activation created</>:<><RadioTower/>Use grade in activation</>}</button></div>{activated&&<div className="grade-activation-result"><CheckCircle2/><div><b>{String(activated.action||'operation').replaceAll('_',' ')}</b><p>{activated.operation?.destination||'Governed downstream action created'} · {activated.operation?.status||activated.status}</p></div><button onClick={openActivation}>Open {activated.nextTab||'operation'} <ArrowRight/></button></div>}</>:<div className="empty-delivery-state"><Target/><div><b>Select a graded lead</b></div></div>}</div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Grade distribution</h3><p>Current persisted lead pool</p></div></div>{total?dist.map((x:any)=><div className="health-line" key={x[0]}><span>{x[0]}</span><div className="progress"><i style={{width:(x[1]/total*100)+'%'}}/></div><b>{Math.round(x[1]/total*100)}%</b></div>):<div className="empty-delivery-state"><Target/><div><b>No distribution available</b></div></div>}</div><div className="app-panel"><div className="panel-head"><div><h3>Grade actions</h3><p>Downstream activation policy</p></div></div>{[['A','Priority sales routing · 2 minute SLA'],['B','Standard sales routing · 5 minute SLA'],['C','Create nurture follow-up task'],['D','Create suppression-review task · continue in Audiences']].map(x=><div className="mapping-rule" key={x[0]}><span>Grade {x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div></div></>
}
function Behavior(){
 const [data,setData]=useState<any>({events:[],sources:[],campaigns:[],devices:[],stats:{},recent:[]})
 const [view,setView]=useState<'events'|'sources'|'campaigns'|'devices'>('events')
 const [selected,setSelected]=useState('')
 const [loading,setLoading]=useState(false)
 const load=async()=>{setLoading(true);try{const r:any=await api.behavior();setData(r);const first=(r.events||[])[0]?.name||'';setSelected(first)}catch{setData({events:[],sources:[],campaigns:[],devices:[],stats:{},recent:[]})}finally{setLoading(false)}}
 useEffect(()=>{load()},[])
 const stats=data.stats||{}
 const list=view==='events'?data.events||[]:view==='sources'?data.sources||[]:view==='campaigns'?data.campaigns||[]:data.devices||[]
 const max=Math.max(1,...list.map((x:any)=>Number(x.count||0)))
 const current=list.find((x:any)=>x.name===selected)||list[0]
 const related=(data.recent||[]).filter((x:any)=>{
  if(!current)return false
  if(view==='events')return String(x.event||x.eventType||x.name||'event')===current.name
  if(view==='sources')return String(x.utm_source||x.source||x.channel||'Direct / First-party')===current.name
  if(view==='campaigns')return String(x.utm_campaign||x.campaign||'Unattributed campaign')===current.name
  return String(x.devicePlatform||x.device_platform||x.platform||'Unknown device')===current.name
 }).slice(0,10)
 const choose=(next:any)=>{setView(next);const source=next==='events'?data.events:next==='sources'?data.sources:next==='campaigns'?data.campaigns:data.devices;setSelected(source?.[0]?.name||'')}
 return <><PageHead crumb="Activation / Behavior" title="Website & app behavior" sub="Analyze first-party engagement by event, source, campaign and device using the persisted tracking stream." action={loading?'Refreshing…':'Refresh'} onAction={load}/>
 <div className="stats-grid"><Stat label="Tracked events" value={Number(stats.events||0).toLocaleString('en-IN')} sub={data.persistence==='workspace_store'?'Persisted workspace event window':'Current process event window'} Icon={MousePointer2}/><Stat label="Known identity rate" value={stats.events?String(stats.knownIdentityRate||0)+'%':'—'} sub="Customer, visitor, device or hashed contact evidence" Icon={UsersRound}/><Stat label="High-intent events" value={Number(stats.highIntentEvents||0).toLocaleString('en-IN')} sub={(stats.highIntentRate||0)+'% of tracked behavior'} Icon={Target}/><Stat label="Device identity rate" value={stats.events?String(stats.deviceIdentityRate||0)+'%':'—'} sub="Events carrying first-party device identity" Icon={Smartphone}/></div>
 <div className="behavior-tabs"><button className={view==='events'?'active':''} onClick={()=>choose('events')}>Events</button><button className={view==='sources'?'active':''} onClick={()=>choose('sources')}>Sources</button><button className={view==='campaigns'?'active':''} onClick={()=>choose('campaigns')}>Campaigns</button><button className={view==='devices'?'active':''} onClick={()=>choose('devices')}>Devices</button></div>
 <div className="behavior-analysis-layout"><div className="app-panel"><div className="panel-head"><div><h3>{view==='events'?'Behavior events':view==='sources'?'Acquisition sources':view==='campaigns'?'Campaign behavior':'Device behavior'}</h3><p>Observed from persisted first-party tracking evidence</p></div><span className="healthy">{list.length} observed</span></div>{list.length?list.map((x:any)=><button className={'behavior-analysis-row '+(current?.name===x.name?'selected':'')} key={x.name} onClick={()=>setSelected(x.name)}><div><b>{String(x.name).replaceAll('_',' ')}</b><small>{Number(x.count||0).toLocaleString('en-IN')} event{x.count===1?'':'s'}</small></div><div className="progress"><i style={{width:Math.max(2,Number(x.count||0)/max*100)+'%'}}/></div><strong>{stats.events?Math.round(Number(x.count||0)/Number(stats.events)*100):0}%</strong><ChevronRight/></button>):<div className="empty-delivery-state"><MousePointer2/><div><b>No behavior evidence yet</b><small>Events appear after /api/track receives consented first-party activity.</small></div></div>}</div>
 <div className="app-panel behavior-detail"><div className="panel-head"><div><h3>{current?String(current.name).replaceAll('_',' '):'Behavior evidence'}</h3><p>{current?Number(current.count||0).toLocaleString('en-IN')+' matching events':'Select a behavior signal'}</p></div></div>{current?<><div className="site-detail-grid">{[['Share of behavior',stats.events?Math.round(Number(current.count||0)/Number(stats.events)*100)+'%':'—'],['Observed events',current.count||0],['View',view],['Evidence source',data.persistence==='workspace_store'?'Persisted workspace store':'Current process window']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><div className="agent-section"><h4>Recent matching activity</h4>{related.length?related.map((x:any,i:number)=><div className="behavior-evidence-row" key={x.id||i}><span>{String(x.event||x.eventType||x.name||'event').replaceAll('_',' ')}</span><div><b>{x.utm_source||x.source||x.channel||'First-party'}</b><small>{x.utm_campaign||x.campaign||'Unattributed campaign'} · {x.devicePlatform||x.device_platform||x.platform||'Unknown device'}</small></div><time>{x.receivedAt||x.occurredAt?new Date(x.receivedAt||x.occurredAt).toLocaleString():'—'}</time></div>):<div className="empty-delivery-state"><Activity/><div><b>No recent matching activity</b></div></div>}</div></>:<div className="empty-delivery-state"><Activity/><div><b>No behavior signal selected</b></div></div>}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Latest first-party sequence</h3><p>Recent cross-source activity with identity-safe persisted context</p></div></div>{(data.recent||[]).length?<div className="behavior-timeline enriched">{(data.recent||[]).slice(0,12).reverse().map((x:any,i:number)=><div key={x.id||i}><span>{i+1}</span><div><b>{String(x.event||x.eventType||x.name||'event').replaceAll('_',' ')}</b><small>{x.utm_source||x.source||x.channel||'First-party'}{x.utm_campaign||x.campaign?' · '+(x.utm_campaign||x.campaign):''}{x.devicePlatform||x.device_platform?' · '+(x.devicePlatform||x.device_platform):''}</small></div><time>{x.receivedAt||x.occurredAt?new Date(x.receivedAt||x.occurredAt).toLocaleTimeString():'—'}</time></div>)}</div>:<div className="empty-delivery-state"><Activity/><div><b>No recent sequence available</b></div></div>}</div></>
}
function Feed(){
 const [data,setData]=useState<any>({attributes:[],mappings:[],stats:{},destinations:[]})
 const [schemaOpen,setSchemaOpen]=useState(false)
 const [builder,setBuilder]=useState(false)
 const [mappingOpen,setMappingOpen]=useState(false)
 const [preview,setPreview]=useState<any>(null)
 const [previewOpen,setPreviewOpen]=useState(false)
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const load=()=>api.feed().then((r:any)=>setData(r)).catch(()=>setData({attributes:[],mappings:[],stats:{},destinations:[]}))
 useEffect(()=>{load()},[])
 const add=async(e:any)=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy('attribute');setNotice('');try{await api.addFeedAttribute({key:String(f.get('key')||''),source:String(f.get('source')||'custom'),sample:String(f.get('sample')||'')});setBuilder(false);setNotice('Custom feed attribute saved.');await load()}catch(err:any){setNotice(err?.message||'Attribute could not be saved.')}finally{setBusy('')}}
 const saveMapping=async(e:any)=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy('mapping');setNotice('');try{await api.saveFeedMapping({sourceKey:String(f.get('sourceKey')||''),destination:String(f.get('destination')||''),targetKey:String(f.get('targetKey')||''),transform:String(f.get('transform')||'copy')});setMappingOpen(false);setNotice('Feed mapping saved.');await load()}catch(err:any){setNotice(err?.message||'Feed mapping could not be saved.')}finally{setBusy('')}}
 const toggle=async(x:any)=>{setBusy(x.id);setNotice('');try{await api.toggleFeedMapping(x.id,x.enabled===false);setNotice(x.enabled===false?'Feed mapping enabled.':'Feed mapping paused.');await load()}catch(err:any){setNotice(err?.message||'Feed mapping status could not be changed.')}finally{setBusy('')}}
 const runPreview=async(destination:string)=>{setBusy('preview');setNotice('');try{const r:any=await api.previewFeed(destination);setPreview(r);setPreviewOpen(true)}catch(err:any){setNotice(err?.message||'Payload preview failed.')}finally{setBusy('')}}
 const stats=data.stats||{}
 const mappingDestinations=[...new Set((data.mappings||[]).map((x:any)=>x.destination).filter(Boolean))]
 return <><PageHead crumb="Activation / Feed" title="Feed & payload enhancement" sub="Enrich activation payloads with governed first-party attributes and explicit destination mappings." action="Add attribute" onAction={()=>setBuilder(true)}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Active attributes" value={String(stats.activeAttributes||0)} sub="Observed + custom mapped fields" Icon={Layers3}/><Stat label="Destination mappings" value={String((data.mappings||[]).filter((x:any)=>x.enabled!==false).length)} sub="Enabled source → target mappings" Icon={Cable}/><Stat label="Signal deliveries" value={String(stats.deliveries||0)} sub="Activation payload population" Icon={DatabaseZap}/><Stat label="Quarantined events" value={String(stats.quarantined||0)} sub="Schema/data review queue" Icon={Activity}/></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Custom & observed attributes</h3><p>Values available before activation</p></div><div className="panel-actions"><button onClick={()=>setSchemaOpen(true)}>Schema settings</button><button className="app-primary" onClick={()=>setBuilder(true)}><Plus/>Add attribute</button></div></div>{(data.attributes||[]).length?(data.attributes||[]).map((x:any)=><div className="feed-row" key={x.key}><Layers3/><code>{x.key}</code><b>{x.sample??'—'}</b><span>{x.source}</span><em>{x.status||'Mapped'}</em></div>):<div className="empty-delivery-state"><Layers3/><div><b>No feed attributes observed</b><small>Profile, journey and custom fields will appear as they are ingested.</small></div></div>}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Destination field mappings</h3><p>Persisted contracts used to shape outbound payloads</p></div><button className="app-primary" onClick={()=>setMappingOpen(true)}><Plus/>New mapping</button></div>{(data.mappings||[]).length?(data.mappings||[]).map((x:any)=><div className="mapping-rule feed-mapping-row" key={x.id}><span><code>{x.sourceKey}</code></span><ArrowRight/><b>{x.destination} · {x.targetKey}</b><small>{x.transform||'copy'}</small><em className={x.enabled===false?'status':'healthy'}>{x.enabled===false?'paused':'enabled'}</em><button disabled={busy===x.id} onClick={()=>toggle(x)}>{busy===x.id?'Saving…':x.enabled===false?'Enable':'Pause'}</button></div>):<div className="empty-delivery-state"><Cable/><div><b>No destination mappings yet</b><small>Create an explicit mapping before expecting a destination-specific enhanced payload.</small></div></div>}</div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Payload destinations</h3><p>Observed enhancement coverage by destination</p></div></div>{(data.destinations||[]).length?(data.destinations||[]).map((x:any)=><div className="health-line" key={x.destination}><span>{x.destination}</span><div className="progress"><i style={{width:Number(x.enrichedRate||0)+'%'}}/></div><b>{Number(x.enrichedRate||0).toFixed(1)}%</b><button onClick={()=>runPreview(x.destination)} disabled={busy==='preview'}>Preview</button></div>):<div className="empty-delivery-state"><Cable/><div><b>No delivered payload history yet</b><small>{mappingDestinations.length?'You can still preview a configured mapping before the first live delivery.':'Create a destination mapping to build a preview.'}</small></div></div>}{!(data.destinations||[]).length&&mappingDestinations.map((d:string)=><div className="health-line" key={d}><span>{d}</span><div className="progress"><i style={{width:'0%'}}/></div><b>0%</b><button onClick={()=>runPreview(d)} disabled={busy==='preview'}>Preview</button></div>)}</div><div className="app-panel"><div className="panel-head"><div><h3>Schema guardrails</h3><p>Protect destination quality</p></div></div>{[['Required identifier','customer_id, contact hash or approved device ID'],['Revenue','numeric + currency'],['Event ID','unique / idempotent'],['Consent','marketing consent rechecked for audiences'],['PII policy','hash contact identity before activation']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div></div>
 {builder&&<div className="connector-modal"><form className="connector-card" onSubmit={add}><div className="connector-modal-head"><div><Layers3/><div><b>Add custom attribute</b><small>Register a field for feed/payload mapping.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Key<input name="key" required placeholder="customer_tier"/></label><label>Source<input name="source" required defaultValue="custom"/></label><label>Example value<input name="sample" placeholder="high_ltv"/></label><button disabled={busy==='attribute'}>{busy==='attribute'?'Saving…':'Save attribute'}</button></form></div>}
 {mappingOpen&&<div className="connector-modal"><form className="connector-card" onSubmit={saveMapping}><div className="connector-modal-head"><div><Cable/><div><b>New feed mapping</b><small>Map one first-party field to a destination payload key.</small></div></div><button type="button" onClick={()=>setMappingOpen(false)}><X/></button></div><label>Source attribute<select name="sourceKey" required>{(data.attributes||[]).map((x:any)=><option key={x.key} value={x.key}>{x.key}</option>)}</select></label><label>Destination<select name="destination" defaultValue="Google Ads"><option>Google Ads</option><option>Meta Ads</option><option>Webhook</option><option>CRM</option></select></label><label>Destination field<input name="targetKey" required placeholder="customer_tier"/></label><label>Transform<select name="transform"><option value="copy">Copy as-is</option><option value="string">Convert to string</option><option value="number">Convert to number</option></select></label><button disabled={busy==='mapping'}>{busy==='mapping'?'Saving…':'Save feed mapping'}</button></form></div>}
 {schemaOpen&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><Layers3/><div><b>Payload schema settings</b><small>Current guardrails</small></div></div><button onClick={()=>setSchemaOpen(false)}><X/></button></div><div className="site-detail-grid">{[['Required identity','customer_id / contact hash / approved device ID'],['Revenue type','numeric + currency'],['Event ID','unique / idempotent'],['PII activation','hash contact identity before destination']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div></div></div>}
 {previewOpen&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><Cable/><div><b>Enhanced payload preview</b><small>{preview?.destination||'Configured mapping'}</small></div></div><button onClick={()=>setPreviewOpen(false)}><X/></button></div><div className="site-detail-grid">{[['Profile',preview?.profileId||'No persisted profile'],['Mappings applied',preview?.mappings||0],['Generated',preview?.generatedAt?new Date(preview.generatedAt).toLocaleString():'—']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><div className="code-block"><code>{JSON.stringify(preview?.payload||{},null,2)}</code></div><div className="source-conflict-note"><ShieldCheck/><div><b>Preview boundary</b><p>{preview?.notice}</p></div></div></div></div>}</>
}
function Agents(){
 const [data,setData]=useState<any>({items:[],runs:[],configured:0,custom:0})
 const [selected,setSelected]=useState('')
 const [builder,setBuilder]=useState(false)
 const [triggerOpen,setTriggerOpen]=useState(false)
 const [trigger,setTrigger]=useState('Lead becomes qualified')
 const [busy,setBusy]=useState(false)
 const [notice,setNotice]=useState('')
 const [testOpen,setTestOpen]=useState(false)
 const [testResult,setTestResult]=useState<any>(null)
 const [testDraft,setTestDraft]=useState({leadRef:'agent_test_lead',score:'88',source:'Website',destination:'Sales queue'})
 const load=async()=>{
  setLoading(true)
  try{
   const r:any=await api.agents()
   setData(r)
   if(r.items?.length)setSelected((x:string)=>x&&r.items.some((i:any)=>i.name===x)?x:r.items[0].name)
   else setSelected('')
  }catch(e:any){
   setNotice({kind:'error',text:e?.message||'Agent operations could not be loaded. Existing agent state was preserved.'})
  }finally{setLoading(false)}
 }
 useEffect(()=>{load()},[])
 const current=(data.items||[]).find((x:any)=>x.name===selected)||data.items?.[0]
 const openOperation=()=>{if(current?.operationTab)window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:current.operationTab}))}
 const createCustom=async(e:any)=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setNotice({kind:'',text:''});try{const created:any=await api.createAgent({name:String(f.get('name')||''),trigger:String(f.get('trigger')||''),action:String(f.get('action')||''),requiresApproval:String(f.get('approval'))!=='Auto-run low risk'});setBuilder(false);setNotice({kind:'ok',text:created?.status==='pending_approval'?'Custom agent created and sent to Approvals.':'Custom agent created and activated.'});await load();if(created?.name)setSelected(created.name)}catch(err:any){setNotice({kind:'error',text:err?.message||'Custom agent could not be created.'})}finally{setBusy(false)}}
 const testAgent=async()=>{if(!current?.id)return;setBusy(true);setNotice({kind:'',text:''});setTestResult(null);try{const r:any=await api.testCustomAgent({id:current.id,leadRef:testDraft.leadRef,context:{score:Number(testDraft.score||0),source:testDraft.source,destination:testDraft.destination}});setTestResult(r);setNotice({kind:'ok',text:'Custom agent test completed and persisted as an agent run.'});setTestOpen(false);await load()}catch(err:any){setNotice({kind:'error',text:err?.status===409?(err?.message||'Agent requires approval before it can run.'):(err?.message||'Custom agent test failed.')})}finally{setBusy(false)}}
 const goApprovals=()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Approvals'}))
 const currentRuns=(data.runs||[]).filter((x:any)=>current?.type!=='custom'||String(x.agent_type||x.agentType||'').includes(current.id))
 return <><PageHead crumb="Automation / Agents" title="Agent operations" sub="Deploy and govern specialist agents using the same stitched customer context." action="Build custom agent" onAction={()=>setBuilder(true)}/>
 {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}>{notice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}<span>{notice.text}</span></div>}
 <div className="stats-grid"><Stat label="Built-in agents" value={String((data.items||[]).filter((x:any)=>x.type==='built_in').length)} sub="Current built-in catalog" Icon={Bot}/><Stat label="Configured" value={String(data.configured||0)} sub="Backed by current workspace prerequisites" Icon={CheckCircle2}/><Stat label="Custom agents" value={String(data.custom||0)} sub="Persisted custom definitions" Icon={Layers3}/><Stat label="Recent runs" value={String((data.runs||[]).length)} sub="Persisted agent execution records" Icon={Activity}/></div>
 <div className="agent-ops-layout"><div className="app-panel agent-selector"><div className="panel-head"><div><h3>Agent library</h3><p>Built-in and custom agents</p></div><button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh'}</button></div>{loading&&!(data.items||[]).length?<div className="empty-state"><Activity/><b>Loading agents</b><small>Reading built-in definitions, custom agents and recent runs.</small></div>:(data.items||[]).map((x:any)=><button key={x.id||x.name} className={selected===x.name?'selected':''} onClick={()=>{setSelected(x.name);setTestResult(null)}}><Bot/><div><b>{x.name}</b><small>{x.type==='custom'?(x.action||'Custom workflow'):'Built-in capability'}</small></div><span className={x.status==='configured'||x.status==='active'?'active-agent':''}>{String(x.status||'available').replaceAll('_',' ')}</span><ChevronRight/></button>)}</div>
 <div className="app-panel agent-config">{current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.type==='custom'?current.description||'Custom workspace agent':current.description||'Built-in AceMarketing agent capability'}</p></div><span className={current.status==='configured'||current.status==='active'?'healthy':'status'}>{String(current.status||'available').replaceAll('_',' ')}</span></div><div className="agent-config-grid"><div><span>Type</span><b>{current.type}</b></div><div><span>Category</span><b>{current.category||'Workspace automation'}</b></div><div><span>Trigger</span><b>{current.trigger||trigger}</b></div><div><span>Approval</span><b>{current.status==='pending_approval'?'Pending approval':current.status==='rejected'?'Rejected':'Workspace governed'}</b></div></div>{current.type==='built_in'&&<><div className="agent-section"><h4>Operational prerequisites</h4><div className="scope-list">{(current.prerequisites||['Workspace evidence']).map((x:string)=><span key={x}><Check/>{x}</span>)}</div></div><div className="approval-actions"><button className="approve" onClick={openOperation}><ArrowRight/>{current.action||'Open operation'}</button></div></>}{current.type==='custom'&&<><div className="agent-section"><h4>Custom workflow contract</h4><div className="agent-rule"><Zap/><div><b>{current.trigger}</b><p>{current.action}</p></div><button onClick={()=>{setTrigger(current.trigger||trigger);setTriggerOpen(true)}}>View trigger</button></div></div><div className="approval-actions">{current.status==='pending_approval'?<button className="approve" onClick={goApprovals}><ShieldCheck/>Open approval request</button>:current.status==='active'?<button className="approve" onClick={()=>setTestOpen(true)}><Activity/>Test agent</button>:<button disabled>Agent unavailable</button>}</div>{testResult&&<div className="agent-test-result"><CheckCircle2/><div><b>Last test succeeded</b><p>{testResult.output?.note}</p>{testResult.output?.operation&&<small>{testResult.output.operation.kind} → {testResult.output.operation.destination} · {testResult.output.operation.status}</small>}</div></div>}</>}<div className="agent-section"><h4>Recent runs</h4>{currentRuns.length?currentRuns.slice(0,8).map((x:any)=><div className="agent-run" key={x.id}><Activity/><div><b>{x.entity_id||x.entityId||'Agent run'}</b><small>{x.agent_type||x.agentType||x.action_type||'agent action'}</small></div><span>{x.created_at||x.createdAt?new Date(x.created_at||x.createdAt).toLocaleString():'—'}</span><em className={String(x.status||'queued').toLowerCase()}>{x.status||'queued'}</em></div>):<div className="empty-delivery-state"><Activity/><div><b>No persisted runs for this agent yet</b></div></div>}</div></>:<div className="empty-delivery-state"><Bot/><div><b>No agent selected</b></div></div>}</div></div>
 {builder&&<div className="connector-modal"><form className="connector-card custom-agent-builder" onSubmit={createCustom}><div className="connector-modal-head"><div><Bot/><div><b>Custom Agent Builder</b><small>Persist trigger, action and approval boundary</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Agent name<input name="name" required placeholder="High Intent Routing Agent"/></label><label>Trigger<select name="trigger"><option>Lead becomes qualified</option><option>Pricing page viewed twice</option><option>WhatsApp conversation starts</option><option>Revenue closes</option></select></label><label>Action<select name="action"><option>Route to sales queue</option><option>Write CRM context</option><option>Return conversion signal</option><option>Suppress audience</option></select></label><label>Approval<select name="approval"><option>Human approval</option><option>Auto-run low risk</option></select></label><div className="source-conflict-note"><ShieldCheck/><div><b>Execution boundary</b><p>Low-risk routing can be tested directly. CRM writes, conversion signals and audience changes still use their dedicated governed destination workflows.</p></div></div><button type="submit" disabled={busy}>{busy?'Creating…':'Create agent'}</button></form></div>}
 {testOpen&&current?.type==='custom'&&<div className="connector-modal"><div className="connector-card custom-agent-test"><div className="connector-modal-head"><div><Activity/><div><b>Test custom agent</b><small>{current.name} · {current.action}</small></div></div><button onClick={()=>setTestOpen(false)}><X/></button></div><label>Lead / entity reference<input value={testDraft.leadRef} onChange={e=>setTestDraft({...testDraft,leadRef:e.target.value})}/></label><div className="two-col"><label>Lead score<input type="number" value={testDraft.score} onChange={e=>setTestDraft({...testDraft,score:e.target.value})}/></label><label>Source<input value={testDraft.source} onChange={e=>setTestDraft({...testDraft,source:e.target.value})}/></label></div>{current.action==='Route to sales queue'&&<label>Routing destination<input value={testDraft.destination} onChange={e=>setTestDraft({...testDraft,destination:e.target.value})}/></label>}<div className="event-rule-preview"><b>Test behavior</b><span>The backend will create a persisted agent run. Safe routing actions execute a real routing decision; external mutations remain inside their dedicated integration workflow.</span></div><div className="audience-builder-actions"><button onClick={()=>setTestOpen(false)}>Cancel</button><button className="app-primary" disabled={busy||!testDraft.leadRef.trim()} onClick={testAgent}>{busy?'Running…':'Run test'}</button></div></div></div>}
 {triggerOpen&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><Zap/><div><b>Agent trigger</b><small>{current?.name}</small></div></div><button onClick={()=>setTriggerOpen(false)}><X/></button></div><div className="setting-line"><span>Trigger</span><b>{trigger}</b></div><button onClick={()=>setTriggerOpen(false)}>Close</button></div></div>}</>
}
function Routing(){
 const [data,setData]=useState<any>({rules:[],recent:[],stats:{},destinationLoad:[]})
 const [selected,setSelected]=useState('')
 const [busy,setBusy]=useState('')
 const [recentOpen,setRecentOpen]=useState(false)
 const [builder,setBuilder]=useState(false)
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<{kind:'ok'|'error'|'',text:string}>({kind:'',text:''})
 const load=async()=>{
  setLoading(true)
  try{
   const r:any=await api.routing()
   setData(r)
   if(r.rules?.length)setSelected((x:string)=>x&&r.rules.some((i:any)=>i.id===x)?x:r.rules[0].id)
   else setSelected('')
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Routing rules could not be loaded. Existing routing state was preserved.'})}
  finally{setLoading(false)}
 }
 useEffect(()=>{load()},[])
 const current=(data.rules||[]).find((x:any)=>x.id===selected)||data.rules?.[0]
 const route=async()=>{if(!current)return;setBusy('test');setNotice({kind:'',text:''});try{const r:any=await api.testRoutingRule(current.id);setNotice({kind:'ok',text:'Test routed to '+r.destination+' using '+r.rule+'.'});await load()}catch(e:any){setNotice({kind:'error',text:e?.message||'Routing test failed.'})}finally{setBusy('')}}
 const create=async(e:any)=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy('create');setNotice({kind:'',text:''});try{const r:any=await api.createRoutingRule({name:String(f.get('name')||''),when:String(f.get('when')||''),destination:String(f.get('destination')||''),slaSeconds:Number(f.get('slaSeconds')||600),priority:String(f.get('priority')||'Custom')});setBuilder(false);setNotice({kind:'ok',text:'Routing rule created and persisted.'});await load();if(r?.item?.id)setSelected(r.item.id)}catch(err:any){setNotice({kind:'error',text:err?.message||'Routing rule could not be created.'})}finally{setBusy('')}}
 const toggle=async()=>{if(!current||current.builtIn)return;setBusy('toggle');setNotice({kind:'',text:''});try{await api.toggleRoutingRule(current.id,current.status==='paused');setNotice({kind:'ok',text:current.status==='paused'?'Routing rule enabled.':'Routing rule paused.'});await load()}catch(e:any){setNotice({kind:'error',text:e?.message||'Routing rule status could not be changed.'})}finally{setBusy('')}}
 const stats=data.stats||{}
 const maxLoad=Math.max(1,...(data.destinationLoad||[]).map((x:any)=>Number(x.count||0)))
 return <><PageHead crumb="Conversion / Routing" title="Lead routing" sub="Route each lead to the right sales queue using persisted workspace rules and stitched customer context." action={loading?'Refreshing…':'Refresh routing'} onAction={load}/>
 {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}>{notice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}<span>{notice.text}</span></div>}
 <div className="stats-grid"><Stat label="Routed today" value={String(stats.routedToday||0)} sub="Persisted routing decisions" Icon={Network}/><Stat label="Decision history" value={String(stats.totalDecisions||0)} sub="Recent persisted decisions" Icon={Activity}/><Stat label="Destinations used" value={String(stats.destinations||0)} sub="Observed routing queues" Icon={CheckCircle2}/><Stat label="Rules matched" value={String(stats.matchedRules||0)} sub="Observed rule names" Icon={UsersRound}/></div>
 <div className="routing-layout"><div className="app-panel routing-list"><div className="panel-head"><div><h3>Routing rules</h3><p>Built-in templates plus persisted workspace rules</p></div><button onClick={()=>setBuilder(true)}><Plus/>Add rule</button></div>{loading&&!(data.rules||[]).length?<div className="empty-state"><Activity/><b>Loading routing rules</b><small>Reading persisted routing rules and recent decisions.</small></div>:(data.rules||[]).map((x:any)=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><Network/><div><b>{x.name}</b><small>{x.when}</small></div><span>{x.priority}</span><em className={x.status}>{x.status}</em><ChevronRight/></button>)}</div>
 <div className="app-panel routing-detail">{current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.when}</p></div><span className={current.status==='active'?'healthy':'status'}>{current.status}</span></div><div className="routing-flow"><div><span>1</span><b>Lead arrives</b></div><ArrowRight/><div><span>2</span><b>Rule evaluated</b></div><ArrowRight/><div><span>3</span><b>{current.destination}</b></div><ArrowRight/><div><span>4</span><b>SLA {Math.round(Number(current.slaSeconds||0)/60)||'<1'} min</b></div></div><div className="diagnostic-evidence">{[['Condition',current.when],['Destination',current.destination],['Target SLA',current.slaSeconds+'s'],['Rule type',current.builtIn?'Built-in template':'Workspace rule'],['Status',current.status]].map(x=><article key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></article>)}</div><div className="approval-actions"><button onClick={()=>setRecentOpen(true)}>View recent matches</button>{!current.builtIn&&<button disabled={busy==='toggle'} onClick={toggle}>{busy==='toggle'?'Saving…':current.status==='paused'?'Enable rule':'Pause rule'}</button>}<button className="approve" disabled={busy==='test'||current.status==='paused'} onClick={route}><Network/>{busy==='test'?'Testing…':'Test selected rule'}</button></div></>:<div className="empty-delivery-state"><Network/><div><b>No routing rule selected</b></div></div>}</div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Observed destination load</h3><p>Derived from persisted routing decisions</p></div></div>{(data.destinationLoad||[]).length?(data.destinationLoad||[]).map((x:any)=><div className="health-line" key={x.name}><span>{x.name}</span><div className="progress"><i style={{width:(Number(x.count||0)/maxLoad*100)+'%'}}/></div><b>{x.count}</b></div>):<div className="empty-delivery-state"><Network/><div><b>No routing load yet</b><small>Test or route a lead to populate destination activity.</small></div></div>}</div><div className="app-panel"><div className="panel-head"><div><h3>Routing safeguards</h3><p>Built-in fallback behavior remains available</p></div></div>{[['No rule matched','Default routing'],['Low identity confidence','Manual review'],['WhatsApp source','WhatsApp nurture'],['Financing requested','Finance-trained counsellor'],['High intent','Senior counsellor pool']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><Check/></div>)}</div></div>
 {builder&&<div className="connector-modal"><form className="connector-card" onSubmit={create}><div className="connector-modal-head"><div><Network/><div><b>New routing rule</b><small>Create a persisted workspace rule.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Rule name<input name="name" required placeholder="Enterprise lead routing"/></label><label>Condition<input name="when" required placeholder="score >= 90 and source = google"/></label><label>Destination<input name="destination" required placeholder="Enterprise sales queue"/></label><div className="two-col"><label>SLA seconds<input name="slaSeconds" type="number" min="0" defaultValue="300"/></label><label>Priority<select name="priority"><option>Priority</option><option>Automated</option><option>Review</option><option>Custom</option></select></label></div><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create routing rule'}</button></form></div>}
 {recentOpen&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><Network/><div><b>Recent routing matches</b><small>Persisted routing decisions</small></div></div><button onClick={()=>setRecentOpen(false)}><X/></button></div>{(data.recent||[]).length?<div className="debug-event-list">{(data.recent||[]).map((x:any)=><div className="developer-event-row" key={x.id}><code>{x.lead_ref||x.id}</code><span>{x.rule_name||'rule'} → {x.destination}</span><strong>{x.created_at?new Date(x.created_at).toLocaleString():'—'}</strong></div>)}</div>:<div className="empty-delivery-state"><Network/><div><b>No recent routing decisions</b></div></div>}</div></div>}</>
}
function FollowUps(){
 const [items,setItems]=useState<any[]>([])
 const [stats,setStats]=useState<any>({})
 const [selected,setSelected]=useState('')
 const [builder,setBuilder]=useState(false)
 const [busy,setBusy]=useState('')
 const [journeyOpen,setJourneyOpen]=useState(false)
 const [journeyRecord,setJourneyRecord]=useState<any>(null)
 const [reactivation,setReactivation]=useState<any>({items:[],stats:{}})
 const [dormantDays,setDormantDays]=useState(30)
 const [recentDays,setRecentDays]=useState(7)
 const [notice,setNotice]=useState('')
 const [queueError,setQueueError]=useState('')
 const [reactivationError,setReactivationError]=useState('')

 const normalizeFollowUps=(rows:any[])=>Array.isArray(rows)?rows.map((x:any)=>({
  id:String(x?.id||''),
  lead:String(x?.lead_ref||x?.lead||'Unknown lead'),
  reason:String(x?.reason||'Follow-up required'),
  channel:String(x?.channel||'—'),
  due:x?.due_at?new Date(x.due_at).toLocaleString():'—',
  priority:String(x?.priority||'medium').replace(/^./,(m:string)=>m.toUpperCase()),
  status:x?.status==='completed'?'Completed':'Open',
  owner:String(x?.owner||'—'),
  createdAt:x?.created_at||null,
  completedAt:x?.completed_at||null
 })).filter((x:any)=>x.id):[]

 const loadQueue=async()=>{
  try{
   const r:any=await api.followUps()
   const mapped=normalizeFollowUps(r?.items||[])
   setItems(mapped)
   setStats(r?.stats||{})
   setSelected((current:string)=>mapped.some((x:any)=>x.id===current)?current:(mapped[0]?.id||''))
   setQueueError('')
  }catch(err:any){
   setQueueError(err?.message||'Follow-up queue could not be loaded.')
   setItems([])
   setStats({})
   setSelected('')
  }
 }

 const loadReactivation=async(days=dormantDays,recent=recentDays)=>{
  try{
   const r:any=await api.leadReactivation(days,recent)
   setReactivation({items:Array.isArray(r?.items)?r.items:[],stats:r?.stats||{}})
   setReactivationError('')
  }catch(err:any){
   setReactivation({items:[],stats:{}})
   setReactivationError(err?.message||'Lead reactivation candidates could not be loaded.')
  }
 }

 useEffect(()=>{void loadQueue();void loadReactivation(30,7)},[])
 useEffect(()=>{void loadReactivation(dormantDays,recentDays)},[dormantDays,recentDays])

 const current=items.find((x:any)=>x.id===selected)||null
 const complete=async(id:string)=>{
  setBusy('complete');setNotice('')
  try{await api.completeFollowUp(id);setNotice('Follow-up marked completed.');await loadQueue()}
  catch(err:any){setNotice(err?.message||'Follow-up could not be completed.')}
  finally{setBusy('')}
 }
 const create=async(e:any)=>{
  e.preventDefault();const f=new FormData(e.currentTarget);setBusy('create');setNotice('')
  try{
   await api.createFollowUp({leadRef:String(f.get('leadRef')||''),reason:String(f.get('reason')||''),channel:String(f.get('channel')||'WhatsApp'),priority:String(f.get('priority')||'medium'),delayMinutes:Number(f.get('delayMinutes')||15),owner:String(f.get('owner')||'Assigned counsellor')})
   setBuilder(false);setNotice('Follow-up created.');await loadQueue()
  }catch(err:any){setNotice(err?.message||'Follow-up could not be created.')}
  finally{setBusy('')}
 }
 const openJourney=async()=>{
  if(!current)return
  try{const r:any=await api.journeys();const list=Array.isArray(r?.items)?r.items:[];setJourneyRecord(list.find((x:any)=>String(x?.lead||'').toLowerCase()===String(current.lead||'').toLowerCase())||null)}
  catch{setJourneyRecord(null)}
  setJourneyOpen(true)
 }
 const reactivate=async(candidate:any)=>{
  const leadRef=String(candidate?.leadRef||'')
  if(!leadRef)return
  setBusy('reactivate:'+leadRef);setNotice('')
  try{
   await api.runLeadReactivation({leadRef,dormantDays,recentDays,channel:'WhatsApp',priority:'high',delayMinutes:5,owner:'Reactivation queue'})
   setNotice('Reactivation follow-up created from renewed intent evidence.')
   await Promise.all([loadQueue(),loadReactivation()])
  }catch(err:any){setNotice(err?.message||'Lead reactivation could not be created.')}
  finally{setBusy('')}
 }

 const candidates=Array.isArray(reactivation?.items)?reactivation.items:[]
 return <><PageHead crumb="Conversion / Follow-ups" title="Follow-up operations" sub="Keep qualified leads from going cold by turning stalled journey states and renewed intent into prioritized next actions." action="Create follow-up" onAction={()=>setBuilder(true)}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 {(queueError||reactivationError)&&<div className="delivery-notice error"><Activity/><span>{[queueError,reactivationError].filter(Boolean).join(' · ')}</span></div>}
 <div className="stats-grid"><Stat label="Open follow-ups" value={String(Number(stats?.open||0))} sub="Current persisted queue" Icon={MessageCircle}/><Stat label="Completed today" value={String(Number(stats?.completedToday||0))} sub="Persisted completions" Icon={CheckCircle2}/><Stat label="Completed total" value={String(Number(stats?.completedTotal||0))} sub="Current retained history" Icon={Target}/><Stat label="Overdue" value={String(Number(stats?.overdue||0))} sub="Open tasks past due" Icon={Activity}/></div>
 <div className="followup-layout"><div className="app-panel followup-list"><div className="panel-head"><div><h3>Follow-up queue</h3><p>Persisted tasks ordered by due time</p></div><button onClick={()=>void loadQueue()}>Refresh</button></div>{items.length?items.map((x:any)=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><MessageCircle/><div><b>{x.lead}</b><small>{x.reason}</small></div><span className={String(x.priority||'medium').toLowerCase()}>{x.priority}</span><em>{x.due}</em><ChevronRight/></button>):<div className="empty-delivery-state"><MessageCircle/><div><b>No follow-ups yet</b><small>Create a follow-up or let an agent create one from journey state.</small></div></div>}</div>
 <div className="app-panel followup-detail">{current?<><div className="panel-head"><div><h3>{current.lead}</h3><p>{current.reason}</p></div><span className={current.status==='Completed'?'healthy':'status'}>{current.status}</span></div><div className="site-detail-grid">{[['Recommended channel',current.channel],['Due',current.due],['Priority',current.priority],['Owner',current.owner],['Created',current.createdAt?new Date(current.createdAt).toLocaleString():'—'],['Completed',current.completedAt?new Date(current.completedAt).toLocaleString():'—']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1]||'—')}</b></div>)}</div>{current.status!=='Completed'?<div className="approval-actions"><button onClick={openJourney}>Open journey</button><button className="approve" disabled={busy==='complete'} onClick={()=>complete(current.id)}><Check/>{busy==='complete'?'Completing…':'Mark completed'}</button></div>:<div className="approval-final approved"><Check/><b>Follow-up completed</b></div>}</>:<div className="empty-delivery-state"><MessageCircle/><div><b>Select or create a follow-up</b></div></div>}</div></div>
 <div className="app-panel reactivation-panel"><div className="panel-head"><div><h3>Lead Reactivation agent</h3><p>Detect dormant leads that recently returned with high-intent first-party behavior.</p></div><div className="reactivation-controls"><label><span>Dormant</span><select aria-label="Reactivation dormant window" value={dormantDays} onChange={e=>setDormantDays(Number(e.target.value))}><option value={14}>14+ days</option><option value={30}>30+ days</option><option value={60}>60+ days</option><option value={90}>90+ days</option></select></label><label><span>Renewed intent</span><select aria-label="Reactivation recent window" value={recentDays} onChange={e=>setRecentDays(Number(e.target.value))}><option value={1}>Last 24h</option><option value={3}>Last 3 days</option><option value={7}>Last 7 days</option><option value={14}>Last 14 days</option></select></label><button onClick={()=>void loadReactivation()}>Refresh</button></div></div>
 <div className="reactivation-summary"><div><b>{Number(reactivation?.stats?.candidates||candidates.length)}</b><span>eligible leads</span></div><p>A lead must have an older persisted last activity and then produce a recent pricing, checkout, booking, consultation, purchase, demo or sales-intent event tied to the same customer or device. Existing open reactivation tasks are excluded.</p></div>
 <div className="reactivation-grid">{candidates.length?candidates.map((x:any)=><article key={String(x?.leadRef||x?.name||Math.random())}><div className="reactivation-card-head"><RefreshCw/><div><b>{String(x?.name||x?.leadRef||'Lead')}</b><small>{String(x?.source||'Unknown source')}{x?.campaign?' · '+String(x.campaign):''}</small></div><span>{Number(x?.dormantDays||0)}d dormant</span></div><div className="reactivation-signal"><span>Renewed signal</span><b>{String(x?.renewedEvent||'').replaceAll('_',' ')}</b><small>{x?.renewedAt?new Date(x.renewedAt).toLocaleString():'—'} · {String(x?.renewedSource||'First-party')}</small></div><div className="reactivation-card-actions"><div><span>Grade {String(x?.grade||'—')}</span><span>Score {Number(x?.score||0)}</span></div><button className="approve" disabled={busy==='reactivate:'+String(x?.leadRef||'')} onClick={()=>reactivate(x)}>{busy==='reactivate:'+String(x?.leadRef||'')?'Creating…':'Create reactivation follow-up'}<ArrowRight/></button></div></article>):<div className="empty-delivery-state"><RefreshCw/><div><b>No renewed dormant leads right now</b><small>The agent only surfaces evidence-backed reactivation candidates.</small></div></div>}</div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Follow-up policy examples</h3><p>Use custom agents or workflows to create these tasks</p></div></div>{[['Qualified, no booking','15 min'],['Meeting no-show','15 min'],['Pricing objection','Immediate'],['High-intent revisit','5 min'],['Call no-answer','2 hours'],['CRM stage stale','24 hours']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="app-panel"><div className="panel-head"><div><h3>Queue state</h3><p>Current persisted task outcomes</p></div></div>{[['Open',stats?.open||0],['Completed today',stats?.completedToday||0],['Completed total',stats?.completedTotal||0],['Overdue',stats?.overdue||0]].map(x=><div className="developer-event-row" key={x[0]}><b>{x[0]}</b><span>Follow-up tasks</span><strong>{String(x[1])}</strong></div>)}</div></div>
 {builder&&<div className="connector-modal"><form className="connector-card" onSubmit={create}><div className="connector-modal-head"><div><MessageCircle/><div><b>Create follow-up</b><small>Persist a manual next action.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Lead reference<input name="leadRef" required placeholder="customer_123"/></label><label>Reason<input name="reason" required placeholder="Qualified but consultation not booked"/></label><label>Channel<select name="channel"><option>WhatsApp</option><option>Voice</option><option>Email</option><option>Counsellor call</option></select></label><label>Priority<select name="priority"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><label>Delay minutes<input name="delayMinutes" type="number" min="0" defaultValue="15"/></label><label>Owner<input name="owner" defaultValue="Assigned counsellor"/></label><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create follow-up'}</button></form></div>}
 {journeyOpen&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><Network/><div><b>Journey context</b><small>{current?.lead||'Lead'}</small></div></div><button onClick={()=>setJourneyOpen(false)}><X/></button></div>{journeyRecord?<div className="site-detail-grid">{[['Lead',journeyRecord.lead],['Source',journeyRecord.source],['Stage',journeyRecord.stage],['Touchpoints',journeyRecord.touchpoints],['Duration',journeyRecord.duration]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1]??'—')}</b></div>)}</div>:<div className="empty-delivery-state"><Network/><div><b>No persisted journey found</b><small>This follow-up remains valid, but the journey endpoint has no matching lead record.</small></div></div>}</div></div>}</>
}
function Calls(){
 const [calls,setCalls]=useState<any[]>([])
 const [tracked,setTracked]=useState<any[]>([])
 const [selected,setSelected]=useState('')
 const [scheduleAt,setScheduleAt]=useState('')
 const [busy,setBusy]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<{kind:'ok'|'error'|'',text:string}>({kind:'',text:''})
 const [builder,setBuilder]=useState(false)
 const load=async()=>{
  setLoading(true)
  try{
   const [runs,events]:any=await Promise.all([api.qualificationCalls(),api.callEvents()])
  const mapped=(runs.items||[]).map((x:any)=>({id:x.id,kind:'agent',lead:x.lead,source:x.source,agent:x.agent,status:String(x.status).replace('_',' '),duration:x.duration,intent:x.intent||0,next:x.next,attempts:x.attempts,lastError:x.lastError,createdAt:x.createdAt}))
  const trackedRows=(events.items||[]).map((x:any)=>({id:x.id,kind:'tracked',lead:x.customerId||x.from||'Caller',source:x.source||x.provider||'Telephony',agent:'Call Tracking Events',status:String(x.status||'completed').replace('_',' '),duration:x.durationSeconds?x.durationSeconds+'s':'—',intent:0,next:x.disposition||'Attribution captured',provider:x.provider,startedAt:x.startedAt,from:x.from,to:x.to,campaign:x.campaign,keyword:x.keyword,creative:x.creative,adGroup:x.adGroup,gclid:x.gclid,fbclid:x.fbclid,msclkid:x.msclkid}))
  setCalls(mapped);setTracked(trackedRows)
  const first=mapped[0]?.id||trackedRows[0]?.id||''
   setSelected(x=>x&&[...mapped,...trackedRows].some((r:any)=>r.id===x)?x:first)
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Call operations could not be loaded. Existing call state was preserved.'})}
  finally{setLoading(false)}
 }
 useEffect(()=>{load()},[])
 const rows=[...calls,...tracked]
 const current=rows.find(x=>x.id===selected)||rows[0]
 const retry=async(id:string)=>{
  setBusy('retry:'+id);setNotice({kind:'',text:''})
  try{await api.retryQualificationCall(id);setNotice({kind:'ok',text:'Qualification call re-queued through the durable agent worker.'});await load()}
  catch(e:any){setNotice({kind:'error',text:e?.message||'Call retry failed.'})}
  finally{setBusy('')}
 }
 const schedule=async()=>{
  if(!current||!scheduleAt)return
  setBusy('schedule');setNotice({kind:'',text:''})
  try{
   const startsAt=new Date(scheduleAt).toISOString()
   await api.createMeeting({leadRef:current.lead,startsAt,owner:'Unassigned',reminderPlan:['voice'],attendeePhone:current.from||'',syncCalendar:true})
   setNotice({kind:'ok',text:'Consultation created. It is now available in Meetings for reminder operations.'})
   setScheduleAt('')
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Meeting could not be created.'})}
  finally{setBusy('')}
 }
 const createQualification=async(e:any)=>{
  e.preventDefault();const fd=new FormData(e.currentTarget);setBusy('create');setNotice({kind:'',text:''})
  try{
   const r:any=await api.createQualificationCall({
    lead:String(fd.get('lead')||''),
    leadRef:String(fd.get('lead')||''),
    phone:String(fd.get('phone')||''),
    source:String(fd.get('source')||'Workspace'),
    intent:Number(fd.get('intent')||0),
    trigger:String(fd.get('trigger')||'manual_qualification')
   })
   setBuilder(false);setNotice({kind:'ok',text:'Qualification call queued through the durable voice-agent worker'+(r?.id?' · '+String(r.id).slice(0,18):'')+'.'});await load();if(r?.id)setSelected(r.id)
  }catch(err:any){setNotice({kind:'error',text:err?.message||'Qualification call could not be queued.'})}finally{setBusy('')}
 }
 const connected=tracked.filter(x=>['answered','completed','connected','qualified'].includes(String(x.status).toLowerCase())).length
 const qualified=calls.filter(x=>String(x.status).toLowerCase().includes('succeed')||String(x.status).toLowerCase().includes('qualified')).length
 const coverage=(field:string)=>tracked.length?Math.round(tracked.filter((x:any)=>Boolean(x[field])).length/tracked.length*100):0
 const clickCoverage=tracked.length?Math.round(tracked.filter((x:any)=>x.gclid||x.fbclid||x.msclkid).length/tracked.length*100):0
 return <><PageHead crumb="Conversion / Calls" title="Voice qualification & call tracking" sub="Run qualification agents and ingest signed telephony events into lead context and offline attribution." action={loading?'Refreshing…':'Refresh calls'} onAction={load}/>
 {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}>{notice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}<span>{notice.text}</span></div>}
 <div className="stats-grid"><Stat label="Qualification runs" value={String(calls.length)} sub="Persisted agent executions" Icon={PhoneIncoming}/><Stat label="Tracked call events" value={String(tracked.length)} sub="Signed telephony webhook events" Icon={PhoneCall}/><Stat label="Connected tracked calls" value={String(connected)} sub="Answered / completed outcomes" Icon={Activity}/><Stat label="Qualified runs" value={String(qualified)} sub="Successful qualification outcomes" Icon={Target}/></div>
 <div className="call-attribution-strip"><article><span>Campaign coverage</span><b>{coverage('campaign')}%</b><small>Tracked calls with campaign context</small></article><article><span>Keyword coverage</span><b>{coverage('keyword')}%</b><small>Search/call keyword captured</small></article><article><span>Creative coverage</span><b>{coverage('creative')}%</b><small>Ad creative/name available</small></article><article><span>Click-ID coverage</span><b>{clickCoverage}%</b><small>GCLID / FBCLID / MSCLKID present</small></article></div>
 <div className="call-ops-layout"><div className="app-panel call-list"><div className="panel-head"><div><h3>Recent call activity</h3><p>Agent runs plus provider call-tracking events</p></div><div className="panel-actions"><button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh'}</button><button onClick={()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Agents'}))}>Configure agent</button></div></div>{loading&&!rows.length?<div className="empty-delivery-state"><Activity/><div><b>Loading call operations</b><small>Reading voice-agent runs and signed telephony events.</small></div></div>:rows.length?rows.map(x=><button key={x.kind+':'+x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><PhoneIncoming/><div><b>{x.lead}</b><small>{x.source} · {x.duration}</small></div><span>{x.status}</span><ChevronRight/></button>):<div className="empty-delivery-state"><PhoneIncoming/><div><b>No calls recorded yet</b><small>Qualification runs and signed telephony events will appear here.</small></div></div>}</div>
 {current?<div className="app-panel call-detail"><div className="panel-head"><div><h3>{current.lead}</h3><p>{current.agent}</p></div><span className="score">{current.kind==='agent'?current.intent+' intent':'Tracked call'}</span></div><div className="call-detail-grid">{[['Call ID',current.id],['Source',current.source],['Outcome',current.status],['Campaign',current.campaign||'—'],['Keyword',current.keyword||'—'],['Creative',current.creative||'—'],['Ad group / ad set',current.adGroup||'—'],['Next action',current.next||'Review journey']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div>
 <div className="source-conflict-note"><PhoneCall/><div><b>{current.kind==='tracked'?'Provider event captured':'Qualification execution'}</b><p>{current.kind==='tracked'?('Provider: '+(current.provider||'telephony')+(current.campaign?' · Campaign: '+current.campaign:'')+(current.keyword?' · Keyword: '+current.keyword:'')+(current.creative?' · Creative: '+current.creative:'')):(current.lastError?'Last error: '+current.lastError:'Execution state comes from the durable agent worker; no synthetic transcript is shown.')}</p></div></div>
 <div className="call-schedule-box"><label>Consultation time<input type="datetime-local" value={scheduleAt} onChange={e=>setScheduleAt(e.target.value)}/></label><button className="approve" disabled={!scheduleAt||busy==='schedule'} onClick={schedule}><CalendarDays/>{busy==='schedule'?'Scheduling…':'Schedule consultation'}</button></div>
 <div className="approval-actions">{current.kind==='agent'&&<button disabled={busy==='retry:'+current.id} onClick={()=>retry(current.id)}>{busy==='retry:'+current.id?'Queuing…':'Retry / follow up'}</button>}</div></div>:<div className="app-panel call-detail"><div className="empty-delivery-state"><PhoneCall/><div><b>Select a call</b><small>Live call detail will appear after an agent run or telephony event is recorded.</small></div></div></div>}</div>
 {builder&&<div className="connector-modal"><form className="connector-card qualification-builder" onSubmit={createQualification}><div className="connector-modal-head"><div><PhoneIncoming/><div><b>Start voice qualification</b><small>Create a persisted agent run and queue provider-backed execution.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Lead reference<input name="lead" required placeholder="lead_123 or customer name"/></label><label>Phone number<input name="phone" required placeholder="+91..."/></label><div className="two-col"><label>Source<input name="source" defaultValue="Website lead"/></label><label>Initial intent score<input name="intent" type="number" min="0" max="100" defaultValue="50"/></label></div><label>Trigger<select name="trigger"><option value="manual_qualification">Manual qualification</option><option value="lead_created">Lead created</option><option value="high_intent">High-intent lead</option><option value="follow_up">Follow-up retry</option></select></label><div className="source-conflict-note"><ShieldCheck/><div><b>Execution boundary</b><p>The run is persisted immediately. A configured voice qualification transport is required for the worker to complete the external call; otherwise retry/failure evidence remains visible in this workspace.</p></div></div><div className="audience-builder-actions"><button type="button" onClick={()=>setBuilder(false)}>Cancel</button><button className="app-primary" disabled={busy==='create'} type="submit">{busy==='create'?'Queuing…':'Queue qualification call'}</button></div></form></div>}</>
}
function Meetings(){
 const [meetings,setMeetings]=useState<any[]>([])
 const [selected,setSelected]=useState('')
 const [busy,setBusy]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<{kind:'ok'|'error'|'',text:string}>({kind:'',text:''})
 const [newTime,setNewTime]=useState('')
 const [builder,setBuilder]=useState(false)
 const [voiceSchedulerOpen,setVoiceSchedulerOpen]=useState(false)
 const [schedulerRuns,setSchedulerRuns]=useState<any[]>([])
 const load=async()=>{
  setLoading(true)
  try{
   const [r,scheduler]:any=await Promise.all([api.meetings(),api.voiceScheduler()])
   const mapped=(r.items||[]).map((x:any)=>({id:x.id,lead:x.lead_ref,time:new Date(x.starts_at).toLocaleString(),startsAt:x.starts_at,owner:x.owner,status:String(x.status||'confirmed').replace(/^./,(m:string)=>m.toUpperCase()),reminder:(x.reminder_plan||[]).join(' + ')||'Voice',risk:String(x.no_show_risk||'low').replace(/^./,(m:string)=>m.toUpperCase()),remindersSent:Number(x.reminders_sent||0),lastReminderAt:x.last_reminder_at,calendarId:x.external_calendar_id||'',meetingLink:x.meeting_link||'',calendarHtmlLink:x.calendar_html_link||'',attendeeEmail:x.attendee_email||'',attendeePhone:x.attendee_phone||''}))
   setMeetings(mapped)
   setSchedulerRuns(scheduler.items||[])
   setSelected(x=>x&&mapped.some((m:any)=>m.id===x)?x:(mapped[0]?.id||''))
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Meeting operations could not be loaded. Existing meeting state was preserved.'})}
  finally{setLoading(false)}
 }
 useEffect(()=>{load()},[])
 const current=meetings.find(x=>x.id===selected)||meetings[0]
 const create=async(e:any)=>{
  e.preventDefault();const fd=new FormData(e.currentTarget);setBusy('create');setNotice({kind:'',text:''})
  try{
   const startsAt=new Date(String(fd.get('startsAt')||'')).toISOString()
   const r:any=await api.createMeeting({
    leadRef:String(fd.get('leadRef')||''),
    startsAt,
    owner:String(fd.get('owner')||'Counsellor'),
    attendeeEmail:String(fd.get('attendeeEmail')||''),
    attendeePhone:String(fd.get('attendeePhone')||''),
    risk:String(fd.get('risk')||'low'),
    syncCalendar:String(fd.get('syncCalendar')||'yes')==='yes'
   })
   setBuilder(false);setNotice({kind:'ok',text:r?.calendar?.externalId?'Meeting scheduled and synced to Google Calendar.':'Meeting scheduled and persisted.'});await load();if(r?.id)setSelected(r.id)
  }catch(err:any){setNotice({kind:'error',text:err?.message||'Meeting could not be scheduled.'})}finally{setBusy('')}
 }
 const createVoiceSchedule=async(e:any)=>{
  e.preventDefault();const fd=new FormData(e.currentTarget);setBusy('voice_scheduler');setNotice({kind:'',text:''})
  try{
   const proposed=String(fd.get('proposedStartsAt')||'')
   const r:any=await api.createVoiceScheduler({
    leadRef:String(fd.get('leadRef')||''),
    phone:String(fd.get('phone')||''),
    attendeeEmail:String(fd.get('attendeeEmail')||''),
    preferredWindow:String(fd.get('preferredWindow')||''),
    proposedStartsAt:proposed?new Date(proposed).toISOString():null,
    durationMinutes:Number(fd.get('durationMinutes')||45),
    owner:String(fd.get('owner')||'Voice Scheduler'),
    syncCalendar:String(fd.get('syncCalendar')||'yes')==='yes'
   })
   setVoiceSchedulerOpen(false)
   setNotice({kind:'ok',text:'Voice Scheduler queued for '+String(fd.get('leadRef')||'lead')+(r?.id?' · '+String(r.id).slice(0,18):'')+'. A meeting is persisted only after the provider confirms a time.'})
   await load()
  }catch(err:any){setNotice({kind:'error',text:err?.message||'Voice Scheduler could not be queued.'})}
  finally{setBusy('')}
 }
 const remind=async(id:string)=>{
  setBusy('remind');setNotice({kind:'',text:''})
  try{await api.sendMeetingReminder(id);setNotice({kind:'ok',text:'Reminder queued through the configured reminder provider.'});await load()}
  catch(e:any){setNotice({kind:'error',text:e?.message||'Reminder could not be queued.'})}
  finally{setBusy('')}
 }
 const connectCalendar=async()=>{
  setBusy('calendar');setNotice({kind:'',text:''})
  try{
   const r:any=await api.connectIntegration('Google Calendar')
   if(r.status==='authorization_required'&&r.authorizationUrl){window.location.assign(r.authorizationUrl);return}
   if(r.status==='connected')setNotice({kind:'ok',text:'Google Calendar is connected.'})
   else setNotice({kind:'error',text:'Google Calendar OAuth credentials are deferred and not configured on the backend yet.'})
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Google Calendar connection could not be started.'})}
  finally{setBusy('')}
 }
 const reschedule=async()=>{
  if(!current||!newTime)return
  setBusy('reschedule');setNotice({kind:'',text:''})
  try{await api.rescheduleMeeting(current.id,new Date(newTime).toISOString());setNotice({kind:'ok',text:'Meeting rescheduled and persisted; connected calendar attendees were updated when available.'});setNewTime('');await load()}
  catch(e:any){setNotice({kind:'error',text:e?.message||'Meeting could not be rescheduled.'})}
  finally{setBusy('')}
 }
 const upcoming=meetings.filter(x=>Date.parse(x.startsAt)>=Date.now()).length
 const withCalendar=meetings.filter(x=>x.calendarId).length
 const reminders=meetings.reduce((n,x)=>n+Number(x.remindersSent||0),0)
 const highRisk=meetings.filter(x=>['high','medium'].includes(String(x.risk).toLowerCase())).length
 return <><PageHead crumb="Conversion / Meetings" title="Scheduler & meeting reminders" sub="Book qualified leads, synchronize Google Calendar in real time and reduce no-shows with provider-backed reminders." action={loading?'Refreshing…':'Refresh meetings'} onAction={load}/>
 {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}>{notice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}<span>{notice.text}</span></div>}
 <div className="stats-grid"><Stat label="Upcoming meetings" value={String(upcoming)} sub="Persisted scheduled consultations" Icon={CalendarDays}/><Stat label="Voice scheduler runs" value={String(schedulerRuns.length)} sub="Provider-backed booking attempts" Icon={PhoneOutgoing}/><Stat label="Calendar synced" value={String(withCalendar)} sub="Meetings with external event IDs" Icon={CheckCircle2}/><Stat label="Reminders sent" value={String(reminders)} sub="Persisted reminder executions" Icon={MessageCircle}/></div>
 <div className="app-panel voice-scheduler-panel"><div className="panel-head"><div><h3>Voice Scheduler</h3><p>Call qualified leads to confirm a consultation slot. A meeting is created only when the provider returns a confirmed time.</p></div><button className="app-primary" onClick={()=>setVoiceSchedulerOpen(true)}><PhoneOutgoing/>Start voice scheduler</button></div>{loading&&!schedulerRuns.length?<div className="empty-delivery-state"><Activity/><div><b>Loading scheduler activity</b><small>Reading persisted scheduling-agent runs and provider outcomes.</small></div></div>:schedulerRuns.length?<div className="voice-scheduler-runs">{schedulerRuns.slice(0,6).map((x:any)=><div className="voice-scheduler-run" key={x.id}><PhoneOutgoing/><div><b>{x.lead}</b><small>{x.phone||'No phone'} · {x.preferredWindow|| (x.proposedStartsAt?new Date(x.proposedStartsAt).toLocaleString():'No preferred window')}</small></div><span className={String(x.status||'queued').toLowerCase()}>{String(x.status||'queued').replaceAll('_',' ')}</span><em>{x.meetingId?'Meeting '+x.meetingId.slice(0,10):x.schedulerStatus||'Awaiting provider outcome'}</em></div>)}</div>:<div className="empty-delivery-state"><PhoneOutgoing/><div><b>No Voice Scheduler runs yet</b><small>Queue a booking call for a qualified lead to create the first scheduler run.</small></div></div>}</div>
 <div className="meeting-layout"><div className="app-panel meeting-list"><div className="panel-head"><div><h3>Upcoming consultations</h3><p>Persisted calendar + reminder state</p></div><div className="panel-actions"><button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh'}</button><button onClick={connectCalendar} disabled={busy==='calendar'}>{busy==='calendar'?'Connecting…':'Connect Calendar'}</button></div></div>{loading&&!meetings.length?<div className="empty-delivery-state"><Activity/><div><b>Loading meetings</b><small>Reading persisted consultations, reminder state and calendar evidence.</small></div></div>:meetings.length?meetings.map(x=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><CalendarDays/><div><b>{x.lead}</b><small>{x.time} · {x.owner}</small></div><span className={x.risk.toLowerCase()}>{x.risk} risk</span><ChevronRight/></button>):<div className="empty-delivery-state"><CalendarDays/><div><b>No meetings scheduled yet</b><small>Schedule one from Calls or connect Google Calendar and create a consultation.</small></div></div>}</div>
 {current?<div className="app-panel meeting-detail"><div className="panel-head"><div><h3>{current.lead}</h3><p>{current.time}</p></div><span className="status">{current.status}</span></div><div className="meeting-info-grid">{[['Owner',current.owner],['Reminder plan',current.reminder],['No-show risk',current.risk],['Calendar',current.calendarId?'Google Calendar synced':'Not synced'],['Attendee',current.attendeeEmail||current.attendeePhone||'Not provided'],['Meeting link',current.meetingLink?'Available':'—'],['Reminders sent',String(current.remindersSent||0)],['Last reminder',current.lastReminderAt?new Date(current.lastReminderAt).toLocaleString():'—']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div>
 <div className="meeting-reminder-flow">{[['T−24h','Primary reminder'],['T−3h','Follow-up reminder'],['T−30m','Final confirmation'],['T+15m','No-show recovery if needed']].map((x,i)=><div key={x[0]}><span>{i+1}</span><div><b>{x[0]}</b><small>{x[1]}</small></div></div>)}</div>
 <div className="call-schedule-box"><label>New meeting time<input type="datetime-local" value={newTime} onChange={e=>setNewTime(e.target.value)}/></label><button disabled={!newTime||busy==='reschedule'} onClick={reschedule}>{busy==='reschedule'?'Updating…':'Reschedule'}</button></div>
 <div className="approval-actions"><button className="approve" disabled={busy==='remind'} onClick={()=>remind(current.id)}><MessageCircle/>{busy==='remind'?'Queuing…':'Send reminder now'}</button></div></div>:<div className="app-panel meeting-detail"><div className="empty-delivery-state"><CalendarDays/><div><b>Select a meeting</b><small>Calendar and reminder operations appear here.</small></div></div></div>}</div>
 {voiceSchedulerOpen&&<div className="connector-modal"><form className="connector-card voice-scheduler-builder" onSubmit={createVoiceSchedule}><div className="connector-modal-head"><div><PhoneOutgoing/><div><b>Start Voice Scheduler</b><small>Queue a provider-backed scheduling call. No meeting is created until a confirmed time is returned.</small></div></div><button type="button" onClick={()=>setVoiceSchedulerOpen(false)}><X/></button></div><label>Lead reference<input name="leadRef" required placeholder="lead_123 or customer email"/></label><label>Phone number<input name="phone" required placeholder="+91..."/></label><label>Attendee email<input name="attendeeEmail" type="email" placeholder="lead@example.com"/></label><label>Preferred window<input name="preferredWindow" placeholder="Tomorrow afternoon / weekday mornings"/></label><label>Proposed slot<input name="proposedStartsAt" type="datetime-local"/></label><div className="two-col"><label>Duration<select name="durationMinutes"><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select></label><label>Calendar sync<select name="syncCalendar"><option value="yes">Sync when confirmed</option><option value="no">Persist meeting only</option></select></label></div><label>Owner<input name="owner" defaultValue="Voice Scheduler"/></label><div className="source-conflict-note"><ShieldCheck/><div><b>No synthetic booking</b><p>The worker creates the meeting only when the configured voice provider returns a confirmed start time. Calendar failures do not fabricate a confirmation.</p></div></div><button disabled={busy==='voice_scheduler'}>{busy==='voice_scheduler'?'Queuing…':'Queue scheduling call'}</button></form></div>}
 {builder&&<div className="connector-modal"><form className="connector-card" onSubmit={create}><div className="connector-modal-head"><div><CalendarDays/><div><b>Schedule meeting</b><small>Create a persisted consultation and optionally sync it to Google Calendar.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Lead reference<input name="leadRef" required placeholder="lead_123 or customer email"/></label><label>Start time<input name="startsAt" type="datetime-local" required/></label><label>Owner<input name="owner" defaultValue="Counsellor"/></label><div className="two-col"><label>Attendee email<input name="attendeeEmail" type="email" placeholder="lead@example.com"/></label><label>Attendee phone<input name="attendeePhone" placeholder="+91..."/></label></div><div className="two-col"><label>No-show risk<select name="risk"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Calendar sync<select name="syncCalendar"><option value="yes">Sync if connected</option><option value="no">Do not sync</option></select></label></div><button disabled={busy==='create'}>{busy==='create'?'Scheduling…':'Schedule meeting'}</button></form></div>}
 </>
}
function Feedback(){
 const [filter,setFilter]=useState('All')
 const [data,setData]=useState<any>({items:[],stats:{},themes:[]})
 const [journeyOpen,setJourneyOpen]=useState(false)
 const [journeyRecord,setJourneyRecord]=useState<any>(null)
 const [builder,setBuilder]=useState(false)
 const [requestOpen,setRequestOpen]=useState(false)
 const [busy,setBusy]=useState('')
 const [loading,setLoading]=useState(true)
 const [notice,setNotice]=useState<{kind:'ok'|'error'|'',text:string}>({kind:'',text:''})
 const [routed,setRouted]=useState<any>(null)
 const load=async()=>{
  setLoading(true)
  try{const r:any=await api.feedback();setData(r)}
  catch(e:any){setNotice({kind:'error',text:e?.message||'Feedback data could not be loaded. Existing feedback state was preserved.'})}
  finally{setLoading(false)}
 }
 useEffect(()=>{load()},[])
 const items=(data.items||[]).map((x:any)=>({id:x.id,lead:x.lead_ref,score:Number(x.score||0),channel:x.channel,theme:x.theme||'Uncategorized',quote:x.response||'',createdAt:x.created_at}))
 const themes=['All',...(data.themes||[]).map((x:any)=>x.theme)]
 const shown=filter==='All'?items:items.filter((x:any)=>x.theme===filter)
 const stats=data.stats||{}
 const openJourney=async(lead:string)=>{
  setNotice({kind:'',text:''})
  try{
   const r:any=await api.journeys()
   const hit=(r.items||[]).find((x:any)=>String(x.lead||'').toLowerCase()===String(lead||'').toLowerCase())||null
   setJourneyRecord(hit);setJourneyOpen(true)
  }catch(e:any){setNotice({kind:'error',text:e?.message||'Journey context could not be loaded for this feedback record.'})}
 }
 const record=async(e:any)=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy('record');setNotice({kind:'',text:''});try{await api.recordFeedback({lead:String(f.get('lead')||''),score:Number(f.get('score')||0),channel:String(f.get('channel')||'Post-call'),theme:String(f.get('theme')||''),response:String(f.get('response')||'')});setBuilder(false);setNotice({kind:'ok',text:'Feedback saved and persisted.'});await load()}catch(err:any){setNotice({kind:'error',text:err?.message||'Feedback could not be saved.'})}finally{setBusy('')}}
 const request=async(e:any)=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy('request');setNotice({kind:'',text:''});try{const r:any=await api.requestFeedback({lead:String(f.get('lead')||''),leadRef:String(f.get('lead')||''),phone:String(f.get('phone')||''),email:String(f.get('email')||''),channel:String(f.get('channel')||'voice'),prompt:String(f.get('prompt')||'Please share feedback about your recent interaction.')});setRequestOpen(false);setNotice({kind:'ok',text:'Feedback request queued through the agent worker'+(r?.runId?' · '+String(r.runId).slice(0,18):'')+'.'})}catch(err:any){setNotice({kind:'error',text:err?.message||'Feedback request could not be queued.'})}finally{setBusy('')}}
 const route=async(id:string)=>{setBusy('route:'+id);setNotice({kind:'',text:''});try{const r:any=await api.routeFeedback(id);setRouted(r);setNotice({kind:'ok',text:'Feedback routed into a persisted follow-up task.'})}catch(err:any){setNotice({kind:'error',text:err?.message||'Feedback could not be routed.'})}finally{setBusy('')}}
 const openFollowUp=()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Follow-ups'}))
 return <><PageHead crumb="Conversion / Feedback" title="Feedback agent" sub="Collect post-interaction feedback, detect objections and route insights into real recovery, sales and marketing workflows." action={loading?'Refreshing…':'Refresh feedback'} onAction={load}/>
 {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}>{notice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}<span>{notice.text}</span></div>}
 <div className="stats-grid"><Stat label="Responses" value={String(stats.responses||0)} sub="Persisted feedback records" Icon={MessageSquareText}/><Stat label="Average satisfaction" value={stats.responses?Number(stats.average||0).toFixed(1)+'/5':'—'} sub="Scored responses only" Icon={Activity}/><Stat label="Low satisfaction" value={String(stats.lowSatisfaction||0)} sub="Scores 1–2" Icon={CheckCircle2}/><Stat label="Themes observed" value={String(stats.themes||0)} sub="Persisted theme groups" Icon={Target}/></div>
 <div className="feedback-command-bar"><div><button className="app-primary" onClick={()=>setRequestOpen(true)}><PhoneOutgoing/>Request feedback</button><button onClick={()=>setBuilder(true)}><Plus/>Record response</button></div><span>Request → collect → understand → route → follow up</span></div>
 {routed&&<div className="feedback-route-result"><CheckCircle2/><div><b>{routed.task?.reason||'Feedback follow-up created'}</b><p>{routed.task?.owner||'Owner'} · {routed.task?.priority||'priority'} · {routed.task?.channel||'channel'}</p></div><button onClick={openFollowUp}>Open Follow-ups <ArrowRight/></button></div>}
 <div className="feedback-toolbar">{themes.map((x:string)=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x}</button>)}</div>
 <div className="feedback-grid">{loading&&!shown.length?<div className="empty-delivery-state"><Activity/><div><b>Loading feedback</b><small>Reading persisted responses, themes and routing evidence.</small></div></div>:shown.length?shown.map((x:any)=><article key={x.id||x.lead+x.theme}><div className="feedback-head"><div><span className="lead-avatar">{String(x.lead||'?').split(' ').map((s:string)=>s[0]).join('').slice(0,2)}</span><div><b>{x.lead}</b><small>{x.channel}{x.createdAt?' · '+new Date(x.createdAt).toLocaleString():''}</small></div></div><strong>{'★'.repeat(Math.max(0,Math.min(5,x.score)))}{'☆'.repeat(Math.max(0,5-Math.max(0,Math.min(5,x.score))))}</strong></div><p>{x.quote?'“'+x.quote+'”':'No written response'}</p><footer><span>{x.theme}</span><div><button onClick={()=>openJourney(x.lead)}>Open journey <ChevronRight/></button><button disabled={busy==='route:'+x.id} onClick={()=>route(x.id)}>{busy==='route:'+x.id?'Routing…':'Route insight'} <ArrowRight/></button></div></footer></article>):<div className="empty-delivery-state"><MessageSquareText/><div><b>No feedback yet</b><small>Record a response or request feedback through the configured feedback agent.</small></div></div>}</div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Top themes</h3><p>Grouped from persisted feedback</p></div></div>{(data.themes||[]).length?(data.themes||[]).map((x:any)=><div className="health-line" key={x.theme}><span>{x.theme}</span><div className="progress"><i style={{width:(stats.responses?Math.min(100,Number(x.count||0)/Number(stats.responses)*100):0)+'%'}}/></div><b>{x.count}</b></div>):<div className="empty-delivery-state"><MessageSquareText/><div><b>No themes yet</b></div></div>}</div><div className="app-panel"><div className="panel-head"><div><h3>Feedback routing policy</h3><p>Rules executed by Route insight</p></div></div>{[['Score 1–2','Customer recovery · call · high priority'],['Pricing / fee objection','Sales manager · call · high priority'],['Program / product mismatch','Sales operations · disposition review'],['Score 4–5','Marketing · promoter/testimonial review']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div></div>
 {builder&&<div className="connector-modal"><form className="connector-card" onSubmit={record}><div className="connector-modal-head"><div><MessageSquareText/><div><b>Record feedback</b><small>Persist a real response.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Lead<input name="lead" required placeholder="customer_123"/></label><label>Score<input name="score" type="number" min="1" max="5" required defaultValue="5"/></label><label>Channel<select name="channel"><option>Post-call</option><option>Post-meeting</option><option>WhatsApp</option><option>Email</option></select></label><label>Theme<input name="theme" required placeholder="Pricing objection"/></label><label>Response<textarea name="response" rows={4} placeholder="Customer feedback"/></label><button disabled={busy==='record'}>{busy==='record'?'Saving…':'Save feedback'}</button></form></div>}
 {requestOpen&&<div className="connector-modal"><form className="connector-card" onSubmit={request}><div className="connector-modal-head"><div><PhoneOutgoing/><div><b>Request feedback</b><small>Queue provider-backed outreach through the agent worker.</small></div></div><button type="button" onClick={()=>setRequestOpen(false)}><X/></button></div><label>Lead reference<input name="lead" required placeholder="lead_123"/></label><div className="two-col"><label>Phone<input name="phone" placeholder="+91..."/></label><label>Email<input name="email" type="email" placeholder="lead@example.com"/></label></div><label>Channel<select name="channel"><option value="voice">Voice</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></label><label>Prompt<textarea name="prompt" rows={3} defaultValue="Please share feedback about your recent interaction."/></label><div className="source-conflict-note"><ShieldCheck/><div><b>Provider-backed execution</b><p>The request is queued as an agent action. Delivery only succeeds when the configured feedback transport/provider is available.</p></div></div><button disabled={busy==='request'}>{busy==='request'?'Queuing…':'Queue feedback request'}</button></form></div>}
 {journeyOpen&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><Network/><div><b>Journey context</b><small>{journeyRecord?.lead||'Feedback respondent'}</small></div></div><button onClick={()=>setJourneyOpen(false)}><X/></button></div>{journeyRecord?<div className="site-detail-grid">{[['Lead',journeyRecord.lead],['Source',journeyRecord.source],['Stage',journeyRecord.stage],['Touchpoints',journeyRecord.touchpoints],['Duration',journeyRecord.duration]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1]??'—')}</b></div>)}</div>:<div className="empty-delivery-state"><Network/><div><b>No persisted journey found</b><small>The feedback record exists, but the journey endpoint has no matching lead row.</small></div></div>}</div></div>}</>
}
function AskAce(){
 const starters=['Where is the funnel dropping between lead and revenue?','Which campaign is producing the best-quality leads?','Show the journey for a specific lead or customer','How much matched revenue is currently attributed?','Where is attribution breaking?','Which audience should we suppress?','Are any connectors or activation runs unhealthy?']
 const [messages,setMessages]=useState<any[]>([{role:'assistant',text:'Ask me about journeys, attribution, lead quality, campaign performance, audiences, or signal health. I will only answer from data available in this workspace.',confidence:'grounded'}])
 const [q,setQ]=useState('')
 const [busy,setBusy]=useState(false)
 const ask=async(question?:string)=>{
  const text=(question||q).trim()
  if(!text||busy)return
  setMessages(m=>[...m,{role:'user',text}]);setQ('');setBusy(true)
  try{
   const r:any=await api.askAce(text)
   setMessages(m=>[...m,{role:'assistant',text:r.answer,insights:r.insights,confidence:r.confidence,intent:r.intent,followUps:r.followUps,journey:r.journey,journeyTimeline:r.journeyTimeline,generatedAt:r.generatedAt}])
  }catch{
   setMessages(m=>[...m,{role:'assistant',text:'The grounded analysis API is unavailable. Check the API process, workspace access, and data connections before retrying.',confidence:'unavailable'}])
  }finally{setBusy(false)}
 }
 return <><PageHead crumb="AI / Ask Ace" title="Journey & attribution assistant" sub="Ask natural-language questions over stitched workspace data. Answers include confidence and the evidence used."/>
 <div className="ask-ace-layout"><div className="app-panel ask-chat"><div className="ask-starters">{starters.map(x=><button key={x} onClick={()=>ask(x)} disabled={busy}>{x}</button>)}</div><div className="ask-messages">{messages.map((m,i)=><div key={i} className={'ask-msg '+m.role}><span>{m.role==='assistant'?<Sparkles/>:'S'}</span><div><div className="ask-answer-meta">{m.role==='assistant'&&m.confidence&&<em className={'ask-confidence '+m.confidence}>{m.confidence==='grounded'?'Grounded workspace analysis':m.confidence+' confidence'}</em>}{m.intent&&<small>{String(m.intent).replaceAll('_',' ')}</small>}</div><p>{m.text}</p>{m.insights&&<div className="ask-insights">{m.insights.map((x:any)=><article key={x.label}><span>{x.label}</span><b>{x.value}</b><small>{x.note}</small>{x.source&&<em>{x.source}</em>}</article>)}</div>}{m.journeyTimeline?.length>0&&<div className="ask-journey"><div className="ask-journey-head"><Network/><div><b>{m.journey?.name||'Customer journey'}</b><small>{m.journey?.source||'First-party'}{m.journey?.campaign?' · '+m.journey.campaign:''} · {m.journeyTimeline.length} touchpoints</small></div></div>{m.journeyTimeline.map((x:any,i:number)=><div className="ask-journey-event" key={(x.type||'event')+':'+(x.at||i)+':'+i}><span>{i+1}</span><div><b>{x.title}</b><small>{x.source} · {x.at?new Date(x.at).toLocaleString():'—'}</small><p>{x.detail||'Persisted activity'}</p></div></div>)}</div>}{m.followUps?.length>0&&<div className="ask-followups">{m.followUps.map((x:string)=><button key={x} onClick={()=>ask(x)} disabled={busy}>{x}</button>)}</div>}</div></div>)}</div><div className="ask-input"><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask()} placeholder="Ask about revenue, leads, campaigns, audiences or signal health..." disabled={busy}/><button onClick={()=>ask()} disabled={busy}>{busy?<Activity/>:<ArrowRight/>}</button></div></div>
 <div className="app-panel ask-context"><div className="panel-head"><div><h3>Grounded analysis context</h3><p>Ask Ace queries live workspace stores rather than fixed demo metrics</p></div><span className="healthy">Evidence-backed</span></div>{[['Funnel handoffs','Lead, routing, qualification, meeting and feedback coverage'],['Lead operations','Scores, grades, source and campaign quality'],['Attribution store','Matched/unmatched assisted events and value'],['Connector state','Connection and health records'],['Audience store','Activation, suppression and sync state'],['Activation runs','Succeeded, failed and queued external actions'],['Observability','Current API and operational health']].map(x=><div className="ask-context-row" key={x[0]}><Check/><div><b>{x[0]}</b><small>{x[1]}</small></div></div>)}<div className="source-conflict-note"><ShieldCheck/><div><b>No fabricated metrics</b><p>If a workspace does not have enough connected data, Ask Ace reports that limitation instead of substituting sample numbers.</p></div></div></div></div></>
}

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
 const view=useMemo(()=>({Launchpad:<Suspense fallback={<LoadingState compact title="Loading launchpad" description="Loading workspace readiness."/>}><Launchpad/></Suspense>,Overview:<Suspense fallback={<LoadingState compact title="Loading overview" description="Loading acquisition command center."/>}><Overview/></Suspense>,AdSync:<Suspense fallback={<LoadingState compact title="Loading AdSync" description="Loading server-side signal activation."/>}><AdSync/></Suspense>,"ChatGPT Ads":<Suspense fallback={<LoadingState compact title="Loading ChatGPT Ads" description="Loading conversion measurement."/>}><ChatGPTAds/></Suspense>,Funnel:<Suspense fallback={<LoadingState compact title="Loading funnel" description="Loading campaign funnel evidence."/>}><Funnel/></Suspense>,"Leak Monitor":<Suspense fallback={<LoadingState compact title="Loading leak monitor" description="Loading funnel leak evidence."/>}><LeakMonitor/></Suspense>,Events:<Suspense fallback={<LoadingState compact title="Loading events" description="Loading conversion event manager."/>}><Events/></Suspense>,Adjustments:<Suspense fallback={<LoadingState compact title="Loading adjustments" description="Loading the Adjustments feature."/>}><Adjustments/></Suspense>,Diagnostics:<Suspense fallback={<LoadingState compact title="Loading diagnostics" description="Loading the Diagnostics feature."/>}><Diagnostics/></Suspense>,"Match Quality":<Suspense fallback={<LoadingState compact title="Loading match quality" description="Loading the Match Quality feature."/>}><MatchQuality/></Suspense>,Reconciliation:<Suspense fallback={<LoadingState compact title="Loading reconciliation" description="Loading the Reconciliation feature."/>}><Reconciliation/></Suspense>,Fraud:<Suspense fallback={<LoadingState compact title="Loading fraud controls" description="Loading the Fraud feature."/>}><Fraud/></Suspense>,"Deep Links":<Suspense fallback={<LoadingState compact title="Loading deep links" description="Loading app and web route evidence."/>}><DeepLinks/></Suspense>,Sites:<Suspense fallback={<LoadingState compact title="Loading sites" description="Loading site and pixel operations."/>}><Sites/></Suspense>,Fingerprinting:<Fingerprinting/>,"Live Sync":<LiveSync/>,"Data Hub":<DataHub/>,"Customer 360":<Customer360/>,"Offline Attribution":<OfflineAttribution/>,Matchback:<Matchback/>,"POS & Stores":<POSAndStores/>,Journeys:<Journeys/>,Identity:<Identity/>,Models:<Suspense fallback={<LoadingState compact title="Loading models" description="Loading the Models feature."/>}><Models/></Suspense>,Attribution:<Attribution/>,Planner:<Suspense fallback={<LoadingState compact title="Loading planner" description="Loading the Planner feature."/>}><Planner/></Suspense>,Reports:<Suspense fallback={<LoadingState compact title="Loading reports" description="Loading the Reports feature."/>}><Reports/></Suspense>,"Grouped Performance":<GroupedPerformance/>,"Executive Briefs":<Suspense fallback={<LoadingState compact title="Loading executive briefs" description="Loading the Executive Briefs feature."/>}><ExecutiveBriefs/></Suspense>,Enrich:<Enrich/>,"Lead Grading":<LeadGrading/>,Behavior:<Behavior/>,Feed:<Feed/>,Agents:<Agents/>,Routing:<Routing/>,"Follow-ups":<FollowUps/>,Calls:<Calls/>,Meetings:<Meetings/>,Feedback:<Feedback/>,Approvals:<Suspense fallback={<LoadingState compact title="Loading approvals" description="Loading the approvals feature."/>}><Approvals/></Suspense>,"Ask Ace":<AskAce/>,Integrations:<Suspense fallback={<LoadingState compact title="Loading integrations" description="Loading the Integrations feature."/>}><Integrations/></Suspense>,"Data Flows":<Suspense fallback={<LoadingState compact title="Loading data flows" description="Loading the Data Flows feature."/>}><DataFlows/></Suspense>,"Real-Time Activation":<Suspense fallback={<LoadingState compact title="Loading real-time activation" description="Loading the Real-Time Activation feature."/>}><RealTimeActivation/></Suspense>,Personalization:<Suspense fallback={<LoadingState compact title="Loading personalization" description="Loading the Personalization feature."/>}><Personalization/></Suspense>,Exclusions:<Suspense fallback={<LoadingState compact title="Loading exclusions" description="Loading the Exclusions feature."/>}><Exclusions/></Suspense>,Audiences:<Suspense fallback={<LoadingState compact title="Loading audiences" description="Loading the Audiences feature."/>}><Audiences/></Suspense>,Delivery:<Suspense fallback={<LoadingState compact title="Loading delivery" description="Loading the Delivery Center."/>}><DeliveryCenter/></Suspense>,Monitoring:<Suspense fallback={<LoadingState compact title="Loading monitoring" description="Loading the monitoring feature."/>}><Monitoring/></Suspense>,Alerts:<Suspense fallback={<LoadingState compact title="Loading alerts" description="Loading the Alert Center."/>}><Alerts/></Suspense>,Compliance:<Suspense fallback={<LoadingState compact title="Loading compliance" description="Loading the Compliance feature."/>}><Compliance/></Suspense>,Developers:<Suspense fallback={<LoadingState compact title="Loading developers" description="Loading the Developer console."/>}><Developers/></Suspense>,Settings:<Suspense fallback={<LoadingState compact title="Loading settings" description="Loading workspace settings."/>}><Settings/></Suspense>}[tab]),[tab,workspaceGeneration])
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
