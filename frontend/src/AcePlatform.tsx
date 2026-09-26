// @ts-nocheck
import {Fragment,useEffect,useMemo,useState} from 'react'
import {createPortal} from 'react-dom'
import {
  Activity,ArrowRight,BarChart3,Bell,BookOpen,Bot,Building2,Cable,CalendarDays,Check,CheckCircle2,ChevronDown,ChevronRight,
  CircleDollarSign,Code2,DatabaseZap,Filter,Gauge,Globe2,GraduationCap,Headphones,HeartPulse,Home,Landmark,Layers3,Menu,MessageCircle,MessageSquareText,
  MousePointer2,Network,PhoneCall,PhoneIncoming,PhoneOutgoing,PieChart,Plane,Plus,RadioTower,Search,Settings2,ShieldCheck,ShoppingCart,Store,
  Sparkles,Smartphone,Target,UsersRound,WandSparkles,X,Zap
} from 'lucide-react'
import './ace-platform.css'
import { api } from './lib/api'
import {getLocalConsent,saveLocalConsent} from './lib/tracker'

type View='site'|'app'|'login'|'pricing'|'demo'|'company'|'resources'|'case-studies'|'privacy'|'terms'|'security'|'solutions'|'industries'|'agents-public'|'integrations-public'
type AppTab='Launchpad'|'Overview'|'AdSync'|'Funnel'|'Events'|'Adjustments'|'Diagnostics'|'Reconciliation'|'Fraud'|'Deep Links'|'Sites'|'Fingerprinting'|'Live Sync'|'Data Hub'|'Customer 360'|'Offline Attribution'|'Matchback'|'POS & Stores'|'Journeys'|'Identity'|'Models'|'Attribution'|'Planner'|'Reports'|'Enrich'|'Lead Grading'|'Behavior'|'Feed'|'Agents'|'Routing'|'Follow-ups'|'Calls'|'Meetings'|'Feedback'|'Approvals'|'Ask Ace'|'Integrations'|'Data Flows'|'Real-Time Activation'|'Audiences'|'Delivery'|'Monitoring'|'Alerts'|'Developers'|'Settings'

const agents=[
 ['Meta Advanced CAPI','Return qualified outcomes to Meta server-side with deduplication.','Lead Quality','+25–40% ROAS'],
 ['Google ECL / OCI','Send enhanced and offline conversions back to Google Ads.','Lead Quality','−30–50% CPQL'],
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
const integrations=['Google Ads','Meta Ads','LinkedIn Ads','Microsoft Ads','GA4','Zoho CRM','Salesforce','HubSpot','LeadSquared','Meritto','HighLevel','Microsoft Dynamics 365','WhatsApp','WATI','Gupshup','MoEngage','CleverTap','Bitespeed','AiSensy','Exotel','Knowlarity','Tata Tele','MyOperator','Shopify','WooCommerce','Magento','WordPress','Custom Backend']
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

  <DemoSection openApp={openApp}/>
  <PublicFooter openHome={openHome} openApp={openApp} openDemo={openDemo} openCompany={openCompany} openResources={openResources} openSolutions={openSolutions} openIntegrations={openIntegrations}/>
  {cookieOpen&&<div className="cookie-banner"><div><b>Cookie preferences</b><p>Necessary storage is always on. Optional analytics, advertising and functionality categories can be enabled independently.</p><div className="cookie-toggles">{Object.entries(cookiePrefs).map(([k,v])=><label key={k}><input type="checkbox" checked={v} onChange={()=>setCookiePrefs({...cookiePrefs,[k]:!v})}/>{k}</label>)}</div></div><div className="cookie-actions"><button onClick={()=>{setCookiePrefs({analytics:false,advertising:false,functionality:false});setCookieOpen(false)}}>Necessary only</button><button onClick={()=>{setCookiePrefs({analytics:true,advertising:true,functionality:true});setCookieOpen(false)}}>Accept all</button><button className="primary-cookie" onClick={async()=>{await api.saveConsent(cookiePrefs).catch(()=>null);setCookieOpen(false)}}>Save preferences</button></div></div>}
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
 useEffect(()=>{api.publicIntegrations().then((r:any)=>r?.groups&&setGroups(r.groups)).catch(()=>null)},[])
 const shown=groups.map((g:any)=>({...g,items:(g.items||[]).filter((x:string)=>!query.trim()||x.toLowerCase().includes(query.trim().toLowerCase())||String(g.group).toLowerCase().includes(query.trim().toLowerCase()))})).filter((g:any)=>g.items.length)
 const total=groups.reduce((n:number,g:any)=>n+(g.items||[]).length,0)
 return <PublicPageFrame {...props}><main className="public-detail-page">
  <section className="public-detail-hero"><span>INTEGRATIONS</span><h1>Connect the systems your teams already depend on.</h1><p>Use native connectors where available and configurable adapters for the rest, while keeping identity, lifecycle, and revenue fields normalized.</p><button onClick={props.openApp}>Open integration workspace <ArrowRight/></button></section>
  <section className="app-panel public-integration-search"><div><Search/><input aria-label="Search public integrations" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search CRM, warehouse, ads, messaging..."/></div><span>{total}+ catalogued connector paths</span></section>
  <section className="integration-public-groups">{shown.map((g:any,i:number)=><article key={g.group}><div><span>{String(i+1).padStart(2,'0')}</span><h2>{g.group}</h2></div><div>{(g.items||[]).map((x:string)=><button key={x} onClick={props.openApp}><Cable/><span>{x}</span><ChevronRight/></button>)}</div></article>)}</section>
  {!shown.length&&<section className="public-route-cta"><span>NO MATCH FOUND</span><h2>Request the connector you need or configure a custom adapter.</h2><button onClick={props.openApp}>Open integration workspace</button></section>}
  <section className="public-route-cta"><span>CUSTOM SYSTEM?</span><h2>Map your own API, webhook, file, warehouse, or database interface.</h2><div className="panel-actions"><button onClick={props.openApp}>Request a connector</button><button onClick={props.openApp}>Build a custom integration</button></div></section>
 </main></PublicPageFrame>
}
function DemoPage({back,openApp}:{back:()=>void,openApp:()=>void}){
 const [step,setStep]=useState(1); const [slot,setSlot]=useState('')
 const submit=async(e:any)=>{e.preventDefault();const payload=Object.fromEntries(new FormData(e.currentTarget).entries());await api.submitDemo(payload).catch(()=>null);setStep(2)}
 return <div className="standalone-page demo-page">
  <div className="standalone-top"><Brand/><button onClick={back}>Back to website</button></div>
  <section className="standalone-hero demo-hero"><div><span className="kicker">BOOK A DEMO</span><h1>Stop wasting ad spend on junk leads.</h1><p>See how a stitched customer journey, cleaner conversion signals and funnel agents can improve lead quality, conversion and attribution.</p><div className="demo-benefits">{[['01','Cleaner data','Connect ad platforms, CRM, calls and messaging into one journey.'],['02','Quality over volume','Optimize campaigns for qualified and closed outcomes, not raw form fills.'],['03','Fast setup path','Use connector and agent patterns instead of rebuilding your whole martech stack.']].map(x=><article key={x[0]}><span>{x[0]}</span><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</div></div>
  <div className="demo-booking-card">{step===1?<form onSubmit={submit}><h2>Tell us about your funnel</h2><label>Work email<input name="email" required type="email" placeholder="name@company.com"/></label><label>Company<input name="company" required placeholder="Company name"/></label><label>Monthly digital marketing budget<select name="budget" required defaultValue=""><option value="" disabled>Select budget</option><option>Under ₹5L</option><option>₹5L – ₹25L</option><option>₹25L – ₹1Cr</option><option>₹1Cr – ₹5Cr</option><option>₹5Cr+</option></select></label><label>Burning pain point<select name="painPoint" required defaultValue=""><option value="" disabled>Select pain point</option><option>Junk / low-quality leads</option><option>Conversion leakage</option><option>Offline attribution</option><option>CRM context</option><option>Cross-platform reporting</option></select></label><button type="submit">Continue to scheduling <ArrowRight/></button></form>:<div className="calendar-step"><h2>Select a date & time</h2><p>Calendar UI is implemented locally and ready to replace with Calendly or your scheduler API.</p><div className="calendar-days">{['Mon 28','Tue 29','Wed 30','Thu 01','Fri 02'].map(x=><button key={x} className={slot.startsWith(x)?'active':''} onClick={()=>setSlot(x+' · 11:00 AM')}>{x}</button>)}</div><div className="calendar-slots">{['10:00 AM','11:00 AM','2:00 PM','3:30 PM','5:00 PM'].map(x=><button key={x} className={slot.endsWith(x)?'active':''} onClick={()=>setSlot((slot.split(' · ')[0]||'Tue 29')+' · '+x)}>{x}</button>)}</div>{slot&&<div className="slot-confirm"><Check/><div><b>{slot}</b><span>45-minute product walkthrough</span></div><button onClick={openApp}>Confirm & open product</button></div>}</div>}</div></section>
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

function DemoSection({openApp}:{openApp:()=>void}){
 const [sent,setSent]=useState(false); const [sending,setSending]=useState(false)
 const submit=async(e:any)=>{e.preventDefault();setSending(true);const form=new FormData(e.currentTarget);await api.submitDemo(Object.fromEntries(form.entries())).catch(()=>null);setSending(false);setSent(true)}
 return <section className="demo-cta" id="demo"><div className="demo-copy"><span className="kicker">SEE THE PRODUCT FLOW</span><h2>Operate the entire paid funnel from one workspace.</h2><p>Connect → observe → enrich → qualify → activate → attribute → learn.</p><button onClick={openApp}>Open interactive workspace <ArrowRight/></button></div><form className="demo-form" onSubmit={submit}>{sent?<div className="demo-success"><Check/><h3>Demo request captured</h3><p>This frontend flow is ready to connect to your CRM or scheduling backend.</p></div>:<><h3>Book a product walkthrough</h3><label>Work email<input name="email" required type="email" placeholder="name@company.com"/></label><label>Company<input name="company" required placeholder="Company name"/></label><label>Monthly ad spend<select name="monthlyAdSpend" defaultValue=""><option value="" disabled>Select range</option><option>Under ₹5L</option><option>₹5L – ₹25L</option><option>₹25L – ₹1Cr</option><option>₹1Cr+</option></select></label><label>Primary challenge<select name="primaryChallenge" defaultValue=""><option value="" disabled>Select challenge</option><option>Lead quality</option><option>Conversion leakage</option><option>Attribution</option><option>Tracking/data quality</option></select></label><button type="submit" disabled={sending}>{sending?'Sending…':'Request demo'} <ArrowRight/></button></>}</form></section>
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
 ['Launchpad',WandSparkles],['Overview',Gauge],['AdSync',RadioTower],['Funnel',BarChart3],['Events',Zap],['Adjustments',CircleDollarSign],['Diagnostics',ShieldCheck],['Reconciliation',Activity],['Fraud',ShieldCheck],['Deep Links',Network],['Sites',Globe2],['Fingerprinting',MousePointer2],['Live Sync',Activity],['Data Hub',DatabaseZap],['Customer 360',UsersRound],['Offline Attribution',PhoneCall],['Matchback',CircleDollarSign],['POS & Stores',Building2],['Journeys',Network],['Identity',UsersRound],['Models',Target],['Attribution',PieChart],['Planner',CircleDollarSign],['Reports',BarChart3],['Enrich',DatabaseZap],['Lead Grading',Target],['Behavior',MousePointer2],['Feed',Layers3],['Agents',Bot],['Routing',Network],['Follow-ups',MessageCircle],['Calls',PhoneIncoming],['Meetings',CalendarDays],['Feedback',MessageSquareText],['Approvals',CheckCircle2],['Ask Ace',Sparkles],['Integrations',Cable],['Data Flows',Network],['Real-Time Activation',Zap],['Audiences',UsersRound],['Delivery',RadioTower],['Monitoring',Activity],['Alerts',Bell],['Developers',Code2],['Settings',Settings2]

] as const
const dashboardSections=[
 {id:'workspace',label:'Workspace',icon:Gauge,tabs:['Overview','Launchpad']},
 {id:'tracking',label:'Tracking & Data',icon:DatabaseZap,tabs:['AdSync','Funnel','Events','Adjustments','Diagnostics','Reconciliation','Fraud','Deep Links','Sites','Fingerprinting','Live Sync','Data Hub','Customer 360','Offline Attribution','Matchback','POS & Stores']},
 {id:'measurement',label:'Measurement & Intelligence',icon:PieChart,tabs:['Journeys','Identity','Models','Attribution','Planner','Reports']},
 {id:'conversion',label:'Lead & Conversion',icon:Target,tabs:['Enrich','Lead Grading','Behavior','Feed','Agents','Routing','Follow-ups','Calls','Meetings','Feedback','Approvals','Ask Ace']},
 {id:'activation',label:'Activation & Integrations',icon:RadioTower,tabs:['Integrations','Data Flows','Real-Time Activation','Audiences','Delivery']},
 {id:'operations',label:'Operations & Developer',icon:Activity,tabs:['Monitoring','Alerts','Developers','Settings']}
] as const
const tabMeta=Object.fromEntries(appTabs.map(([name,Icon])=>[name,{Icon}])) as Record<string,{Icon:any}>
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}
function PageHead({crumb,title,sub,action,onAction}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void}){return <div className="page-head"><div><span>{crumb}</span><h1>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}</div>}
function FunnelPanel(){
 const [data,setData]=useState<any>(null)
 const [mode,setMode]=useState<'funnel'|'campaign'>('funnel')
 useEffect(()=>{api.funnel().then((r:any)=>setData(r)).catch(()=>null)},[])
 const s=data?.stages||{}
 const steps=[['All Leads',Number(s.leads||0),100],['Qualified',Number(s.qualified||0),s.leads?Math.round(Number(s.qualified||0)/Number(s.leads)*100):0],['Appointments',Number(s.appointments||0),s.leads?Math.round(Number(s.appointments||0)/Number(s.leads)*100):0],['Consultations',Number(s.consultations||0),s.leads?Math.round(Number(s.consultations||0)/Number(s.leads)*100):0],['Bookings',Number(s.bookings||0),s.leads?Math.round(Number(s.bookings||0)/Number(s.leads)*100):0]]
 return <div className="app-panel"><div className="panel-head"><div><h3>{mode==='funnel'?'Complete funnel':'Campaign view'}</h3><p>Backend funnel endpoint · current workspace</p></div><button onClick={()=>setMode(x=>x==='funnel'?'campaign':'funnel')}>{mode==='funnel'?'Campaign view':'Funnel view'}</button></div>{mode==='funnel'?steps.map((x,i)=><div className="funnel-row" key={x[0]}><div><span>{x[0]}</span><b>{x[1].toLocaleString()}</b></div><div className="progress"><i style={{width:x[2]+'%'}}/></div>{i<steps.length-1&&x[1]>0&&<small>{Math.round((steps[i+1][1]/x[1])*100)}% progression</small>}</div>):(data?.campaigns||[]).map((x:any)=><div className="developer-event-row" key={x.name}><b>{x.name}</b><span>{x.channel} · {Number(x.qualified||0).toLocaleString()} qualified</span><strong>{Number(x.bookings||0).toLocaleString()} bookings</strong></div>)}</div>
}

function Launchpad(){
 const [data,setData]=useState<any>({steps:[],readiness:0,evidence:{}})
 const [active,setActive]=useState(0)
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const load=()=>api.launchpad().then((r:any)=>setData(r)).catch((e:any)=>setNotice(e?.message||'Launchpad could not be loaded.'))
 useEffect(()=>{load()},[])
 const steps=(data.steps||[]) as any[]
 const current=steps[active]||steps[0]
 const navigate=(tab:string)=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:tab}))
 const runReadiness=()=>{const next=steps.findIndex((x:any)=>!x.ready);setActive(next>=0?next:0)}
 const sendTest=async()=>{setBusy('test');setNotice('');try{const r:any=await api.track({event:'launchpad_test',source:'launchpad',visitorId:'launchpad_'+Date.now()});setNotice('Test event accepted: '+(r.eventId||'ok'));await load()}catch(e:any){setNotice(e?.message||'Test event failed.')}finally{setBusy('')}}
 const evidence=data.evidence||{}
 return <><PageHead crumb="Workspace / Launchpad" title="Launchpad" sub="Configure the data, funnel, tracking and automation foundation using live workspace evidence." action="Run readiness check" onAction={runReadiness}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="launchpad-progress"><div><span>Workspace readiness</span><strong>{Number(data.readiness||0)}%</strong></div><div className="progress"><i style={{width:Number(data.readiness||0)+'%'}}/></div><small>{steps.filter((x:any)=>x.ready).length} of {steps.length||6} operating areas ready</small></div>
 <div className="launchpad-layout"><div className="app-panel launchpad-steps">{steps.length?steps.map((s:any,i:number)=><button key={s.key} className={active===i?'selected':''} onClick={()=>setActive(i)}><span className={s.ready?'done':''}>{s.ready?<Check/>:i+1}</span><div><b>{s.title}</b><small>{s.detail}</small></div><ChevronRight/></button>):<div className="empty-delivery-state"><WandSparkles/><div><b>Readiness evidence unavailable</b><small>Connect the backend and refresh the workspace.</small></div></div>}</div>
 <div className="app-panel launchpad-detail">{current?<><div className="panel-head"><div><h3>{current.title}</h3><p>{current.detail}</p></div><span className={current.ready?'healthy':'status'}>{current.ready?'Ready':'Needs attention'}</span></div>
 <div className="site-detail-grid">{[
  ['Connected systems',evidence.connectedConnectors||0],
  ['Tracked events',evidence.trackedEvents||0],
  ['Known profiles',evidence.profiles||0],
  ['Matched attribution',evidence.matchedEvents||0],
  ['Audiences',evidence.audiences||0],
  ['Signal deliveries',evidence.deliveries||0]
 ].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div>
 <div className="launchpad-actions"><button onClick={()=>navigate(current.tab)}>Open {current.tab}<ArrowRight/></button>{current.key==='signal'&&<button className="app-primary" disabled={busy==='test'} onClick={sendTest}>{busy==='test'?'Sending…':'Send test event'}<Zap/></button>}</div></>:<div className="empty-delivery-state"><WandSparkles/><div><b>No launchpad step selected</b></div></div>}</div></div></>
}
function Overview(){
 const [summary,setSummary]=useState<any>(null)
 const [events,setEvents]=useState<any[]>([])
 const [expanded,setExpanded]=useState(false)
 const [loading,setLoading]=useState(true)
 const navigate=(tab:string)=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:tab}))
 const load=async()=>{
  setLoading(true)
  try{
   const [s,l]:any=await Promise.all([api.dashboardSummary(),api.liveSync().catch(()=>({recent:[]}))])
   setSummary(s);setEvents(l.recent||[])
  }finally{setLoading(false)}
 }
 useEffect(()=>{load();const id=setInterval(load,30000);return()=>clearInterval(id)},[])
 const t=summary?.totals||{}
 const shown=expanded?events:events.slice(0,5)
 const quick=[
  ['Connect integrations','Integrations',Cable,'Connect CRM, ads, WhatsApp and calling'],
  ['Create conversion event','Events',Zap,'Turn business outcomes into activation signals'],
  ['Inspect customer journeys','Journeys',Network,'See stitched lead and revenue paths'],
  ['Build audience','Audiences',UsersRound,'Activate or suppress first-party segments'],
  ['Open delivery center','Delivery',RadioTower,'Inspect provider receipts, retry and DLQ'],
  ['Ask Ace','Ask Ace',Sparkles,'Query journey, funnel and attribution evidence']
 ]
 return <><PageHead crumb="Workspace / Overview" title="Acquisition command center" sub="Navigate the full marketing data, conversion, activation and measurement stack from one live workspace." action={loading?'Refreshing…':'Refresh'} onAction={load}/>
 <section className="dashboard-hero">
  <div><span>WORKSPACE READINESS</span><strong>{summary?summary.readiness+'%':'—'}</strong><p>{summary?.readiness===100?'Core operating areas have workspace evidence.':'Connect data and activate the incomplete areas below.'}</p></div>
  <div className="dashboard-hero-metrics">
   <article><b>{Number(t.profiles||0).toLocaleString('en-IN')}</b><span>Known profiles</span></article>
   <article><b>{t.deliveryRate==null?'—':t.deliveryRate+'%'}</b><span>Delivery success</span></article>
   <article><b>{Number(t.connectedConnectors||0)}</b><span>Connected systems</span></article>
   <article><b>{Number(t.matchedEvents||0).toLocaleString('en-IN')}</b><span>Matched attribution</span></article>
  </div>
 </section>
 <div className="dashboard-area-grid">{(summary?.areas||[]).map((x:any)=>{const sec=dashboardSections.find(s=>s.tabs.includes(x.tab as any));const Icon=sec?.icon||Activity;return <button key={x.key} className={'dashboard-area-card '+(x.ready?'ready':'needs')} onClick={()=>navigate(x.tab)}><div><span><Icon/></span><em>{x.ready?'Ready':'Needs setup'}</em></div><h3>{x.title}</h3><strong>{Number(x.primary||0).toLocaleString('en-IN')}</strong><p>{x.detail}</p><footer>Open {x.tab}<ArrowRight/></footer></button>})}</div>
 <div className="dashboard-quick-grid">{quick.map(([title,tab,Icon,desc]:any)=><button key={title} onClick={()=>navigate(tab)}><span><Icon/></span><div><b>{title}</b><small>{desc}</small></div><ArrowRight/></button>)}</div>
 <div className="two-col dashboard-overview-grid"><FunnelPanel/><div className="app-panel"><div className="panel-head"><div><h3>Workspace health</h3><p>Current operational state from backend evidence</p></div><button onClick={()=>navigate('Monitoring')}>Monitoring</button></div>{[
  ['Event rules',t.eventRules||0,'Events'],['Active audiences',t.activeAudiences||0,'Audiences'],['Agent runs',t.agentRuns||0,'Agents'],['Meetings',t.meetings||0,'Meetings'],['Failed deliveries',t.failedDeliveries||0,'Delivery'],['Dead-letter jobs',t.queueDeadLetter||0,'Delivery']
 ].map(([label,value,tab]:any)=><button className="dashboard-health-row" key={label} onClick={()=>navigate(tab)}><span>{label}</span><b>{Number(value).toLocaleString('en-IN')}</b><ChevronRight/></button>)}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recent workspace activity</h3><p>First-party events, activation deliveries and agent runs</p></div><div className="panel-actions"><button onClick={()=>setExpanded(x=>!x)}>{expanded?'Show less':'View more'}</button><button onClick={()=>navigate('Live Sync')}>Live Sync</button></div></div>{(summary?.recent||shown||[]).length?<div className="dashboard-activity-list">{(summary?.recent||shown).slice(0,expanded?12:6).map((x:any)=><button key={x.id} onClick={()=>navigate(x.tab||'Live Sync')}><span className={'activity-kind '+x.kind}>{x.kind==='delivery'?<RadioTower/>:x.kind==='agent'?<Bot/>:<Activity/>}</span><div><b>{x.title}</b><small>{x.meta}</small></div><time>{x.time?new Date(x.time).toLocaleString():'—'}</time><ChevronRight/></button>)}</div>:<div className="empty-delivery-state"><Activity/><div><b>No workspace activity yet</b><small>Connect a source or send a first-party event to populate this command center.</small></div></div>}</div></>
}
function AdSync(){
 const [builder,setBuilder]=useState(false)
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const [data,setData]=useState<any>({items:[],runs:[],stats:{}})
 const [deliveries,setDeliveries]=useState<any[]>([])
 const [selected,setSelected]=useState('')
 const quickAgents=[
  {id:'meta_capi',name:'Meta Advanced CAPI',detail:'Qualified leads → server-side Meta conversion',sourceEvent:'lead.qualified',outputEvent:'qualified_lead',destination:'Meta Ads',Icon:RadioTower},
  {id:'google_ecl',name:'Google ECL / OCI',detail:'Qualified leads → enhanced/offline Google conversion',sourceEvent:'lead.qualified',outputEvent:'qualified_lead',destination:'Google Ads',Icon:Target},
  {id:'call_tracking',name:'Call Tracking Events',detail:'Ingest signed telephony events and attribute calls',tab:'Calls',Icon:PhoneCall},
  {id:'custom_integration',name:'Custom Integration',detail:'Build a governed connector for any unsupported system',tab:'Integrations',Icon:Cable}
 ]
 const load=async()=>{
  try{
   const [events,delivery]:any=await Promise.all([api.events(),api.signalDeliveries()])
   const pipelines=(events.items||[]).filter((x:any)=>(x.destinations||[]).some((d:string)=>['Google Ads','Meta Ads'].includes(d)))
   setData({...events,items:pipelines})
   setDeliveries(delivery.items||[])
   if(pipelines.length)setSelected((x:string)=>x&&pipelines.some((p:any)=>p.id===x)?x:pipelines[0].id)
  }catch(err:any){setNotice(err?.message||'Signal pipelines could not be loaded.')}
 }
 useEffect(()=>{load()},[])
 const current=(data.items||[]).find((x:any)=>x.id===selected)||data.items?.[0]
 const createPipeline=async(e:any)=>{
  e.preventDefault();const fd=new FormData(e.currentTarget);setBusy('create');setNotice('')
  try{
   await api.createEventRule({name:String(fd.get('name')||''),sourceEvent:String(fd.get('sourceEvent')||''),outputEvent:String(fd.get('outputEvent')||''),conditions:[],destinations:[String(fd.get('destination')||'Google Ads')],valueMode:'copy',currency:'INR'})
   setNotice('Conversion pipeline rule created.');setBuilder(false);await load()
  }catch(err:any){setNotice(err?.message||'Pipeline could not be created.')}finally{setBusy('')}
 }
 const toggle=async(x:any)=>{setBusy(x.id);setNotice('');try{await api.toggleEventRule(x.id,!x.enabled);setNotice((x.enabled?'Paused ':'Enabled ')+x.name+'.');await load()}catch(err:any){setNotice(err?.message||'Pipeline status could not be changed.')}finally{setBusy('')}}
 const test=async()=>{
  if(!current)return
  setBusy('test');setNotice('')
  try{
   const r:any=await api.track({event:current.source_event,source:'adsync_pipeline_test',visitorId:'adsync_'+Date.now(),data:{pipelineId:current.id,test:true}})
   setNotice('Test source event accepted: '+(r.eventId||'ok')+'. Check Delivery for derived provider signals.');await load()
  }catch(err:any){setNotice(err?.message||'Pipeline test event failed.')}finally{setBusy('')}
 }
 const installQuickAgent=async(preset:any)=>{
  if(preset.tab){window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:preset.tab}));return}
  const existing=(data.items||[]).find((x:any)=>x.source_event===preset.sourceEvent&&x.output_event===preset.outputEvent&&(x.destinations||[]).includes(preset.destination))
  if(existing){setSelected(existing.id);setNotice(preset.name+' pipeline already exists.');return}
  setBusy('quick:'+preset.id);setNotice('')
  try{
   const created:any=await api.createEventRule({name:preset.name+' · Qualified Lead',sourceEvent:preset.sourceEvent,outputEvent:preset.outputEvent,conditions:[],destinations:[preset.destination],valueMode:'copy',currency:'INR'})
   setNotice(preset.name+' pipeline created. Connect provider credentials before expecting external delivery.')
   await load()
   if(created?.item?.id)setSelected(created.item.id)
  }catch(err:any){setNotice(err?.message||preset.name+' pipeline could not be created.')}
  finally{setBusy('')}
 }
 const allPipelineDeliveries=deliveries.filter((x:any)=>(data.items||[]).some((p:any)=>(p.destinations||[]).includes(x.destination)&&p.output_event===x.event))
 const pipelineDeliveries=current?deliveries.filter((x:any)=>(current.destinations||[]).includes(x.destination)&&x.event===current.output_event):[]
 const delivered=pipelineDeliveries.filter((x:any)=>x.status==='delivered').length
 const failing=pipelineDeliveries.filter((x:any)=>['failed','dead_letter'].includes(String(x.status))).length
 const openTab=(tab:string)=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:tab}))
 return <><PageHead crumb="Module / AdSync" title="Server-side signal activation" sub="Create and operate persisted conversion pipelines that return qualified and closed outcomes to advertising platforms." action="Add pipeline" onAction={()=>setBuilder(true)}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="signal-agent-quickstarts">{quickAgents.map((agent:any)=>{const I=agent.Icon;const installed=!agent.tab&&(data.items||[]).some((x:any)=>x.source_event===agent.sourceEvent&&x.output_event===agent.outputEvent&&(x.destinations||[]).includes(agent.destination));return <article key={agent.id} className={installed?'installed':''}><div className="signal-agent-icon"><I/></div><div><b>{agent.name}</b><p>{agent.detail}</p></div><button disabled={busy==='quick:'+agent.id} onClick={()=>installQuickAgent(agent)}>{busy==='quick:'+agent.id?'Creating…':agent.tab?'Open module':installed?'Open pipeline':'Install pipeline'}<ArrowRight/></button></article>})}</div>
 <div className="stats-grid"><Stat label="Signal pipelines" value={String((data.items||[]).length)} sub="Google / Meta event rules" Icon={RadioTower}/><Stat label="Enabled" value={String((data.items||[]).filter((x:any)=>x.enabled).length)} sub="Currently evaluating source events" Icon={CheckCircle2}/><Stat label="Pipeline deliveries" value={String(allPipelineDeliveries.length)} sub="Persisted outbound signals" Icon={Activity}/><Stat label="Dead / failed" value={String(allPipelineDeliveries.filter((x:any)=>['failed','dead_letter'].includes(String(x.status))).length)} sub="Review in Delivery" Icon={ShieldCheck}/></div>
 <div className="agent-ops-layout"><div className="app-panel agent-selector"><div className="panel-head"><div><h3>Conversion pipelines</h3><p>Persisted business event → ad-platform signal rules</p></div><button onClick={load}>Refresh</button></div>{(data.items||[]).length?(data.items||[]).map((x:any)=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><RadioTower/><div><b>{x.name}</b><small>{x.source_event} → {x.output_event}</small></div><span className={x.enabled?'active-agent':''}>{x.enabled?'enabled':'paused'}</span><ChevronRight/></button>):<div className="empty-delivery-state"><RadioTower/><div><b>No Google/Meta signal pipeline yet</b><small>Create one to turn a business event into a durable outbound conversion signal.</small></div></div>}</div>
 <div className="app-panel agent-config">{current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.source_event} → {current.output_event}</p></div><span className={current.enabled?'healthy':'status'}>{current.enabled?'Enabled':'Paused'}</span></div><div className="agent-config-grid"><div><span>Source event</span><b>{current.source_event}</b></div><div><span>Output event</span><b>{current.output_event}</b></div><div><span>Destination</span><b>{(current.destinations||[]).join(', ')||'Measurement only'}</b></div><div><span>Rule runs</span><b>{String((data.runs||[]).filter((r:any)=>r.rule_id===current.id||r.ruleId===current.id).length)}</b></div></div><div className="site-detail-grid">{[['Persisted deliveries',pipelineDeliveries.length],['Delivered',delivered],['Failed / dead letter',failing],['Value mode',current.value_mode||'copy']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><div className="approval-actions"><button disabled={busy===current.id} onClick={()=>toggle(current)}>{busy===current.id?'Saving…':current.enabled?'Pause pipeline':'Enable pipeline'}</button><button disabled={busy==='test'||!current.enabled} onClick={test}><Zap/>{busy==='test'?'Sending…':'Send test source event'}</button><button className="approve" onClick={()=>openTab('Delivery')}><RadioTower/>Open delivery center</button></div></>:<div className="empty-delivery-state"><RadioTower/><div><b>Select or create a conversion pipeline</b></div></div>}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Signal operating path</h3><p>The same persisted rule and delivery infrastructure is used across AdSync, Events and Delivery.</p></div><div className="panel-actions"><button onClick={()=>openTab('Events')}>Open event rules</button><button onClick={()=>openTab('Delivery')}>Open delivery queue</button></div></div><div className="mapping-rule"><span>Business event</span><ArrowRight/><b>Event rule</b><ArrowRight/><b>Durable queue</b><ArrowRight/><b>Google / Meta</b><ArrowRight/><b>Receipt / retry / DLQ</b></div></div>
 {builder&&<div className="connector-modal"><form className="connector-card" onSubmit={createPipeline}><div className="connector-modal-head"><div><RadioTower/><div><b>New conversion pipeline</b><small>Create a persisted event rule for signal activation.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Pipeline name<input name="name" required defaultValue="Qualified Lead to Google"/></label><label>Source event<input name="sourceEvent" required defaultValue="lead.qualified"/></label><label>Output event<input name="outputEvent" required defaultValue="qualified_lead"/></label><label>Destination<select name="destination"><option>Google Ads</option><option>Meta Ads</option></select></label><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create pipeline'}</button></form></div>}</>
}
function Funnel(){
 const [data,setData]=useState<any>({stages:{},stageRates:{},campaigns:[],filters:{channels:[],accounts:[]}})
 const [channel,setChannel]=useState('All channels')
 const [account,setAccount]=useState('All accounts')
 const [disposition,setDisposition]=useState('All dispositions')
 const [period,setPeriod]=useState('Last 30 days')
 const [selected,setSelected]=useState('')
 const [loading,setLoading]=useState(false)
 const dispositions=['All dispositions','Qualified','Appointments','Consultations','Bookings']
 const periods=['Last 7 days','Last 30 days','Last 90 days']
 const periodDays=period==='Last 7 days'?7:period==='Last 90 days'?90:30
 const load=async()=>{
  setLoading(true)
  try{const r:any=await api.funnel({channel,account,disposition,periodDays});setData(r);if(r.campaigns?.length)setSelected((x:string)=>x&&r.campaigns.some((c:any)=>c.key===x)?x:r.campaigns[0].key)}
  finally{setLoading(false)}
 }
 useEffect(()=>{load()},[channel,account,disposition,periodDays])
 const channels=['All channels',...(data.filters?.channels||[])]
 const accounts=['All accounts',...(data.filters?.accounts||[])]
 const campaigns=data.campaigns||[]
 const current=campaigns.find((x:any)=>x.key===selected)||campaigns[0]
 const exportCsv=()=>{const rows=[['campaign','account','channel','leads','qualified','appointments','consultations','bookings','lead_to_qualified_rate','qualified_to_appointment_rate','appointment_to_consultation_rate','consultation_to_booking_rate','lead_to_booking_rate'],...campaigns.map((x:any)=>[x.name,x.account,x.channel,x.leads,x.qualified,x.appointments,x.consultations,x.bookings,x.leadToQualifiedRate,x.qualifiedToAppointmentRate,x.appointmentToConsultationRate,x.consultationToBookingRate,x.leadToBookingRate])];const csv=rows.map(r=>r.map((v:any)=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ace-funnel-'+periodDays+'d.csv';a.click();URL.revokeObjectURL(a.href)}
 const sdata=data.stages||{},rates=data.stageRates||{}
 const stageFlow=[
  {label:'Leads',value:sdata.leads||0,rate:100},
  {label:'Qualified',value:sdata.qualified||0,rate:rates.leadToQualified||0},
  {label:'Appointments',value:sdata.appointments||0,rate:rates.qualifiedToAppointment||0},
  {label:'Consultations',value:sdata.consultations||0,rate:rates.appointmentToConsultation||0},
  {label:'Bookings',value:sdata.bookings||0,rate:rates.consultationToBooking||0}
 ]
 return <><PageHead crumb="AdSync / Funnel Mapping" title="Channel, account & campaign funnel" sub="See exactly where the funnel narrows across channels, ad accounts, campaigns and CRM stages using persisted lead and meeting evidence." action={loading?'Refreshing…':'Export funnel'} onAction={()=>loading?undefined:exportCsv()}/>
 <div className="filters funnel-filters"><label className="funnel-filter-select"><span>Channel</span><select aria-label="Funnel channel" disabled={loading} value={channel} onChange={e=>setChannel(e.target.value)}>{channels.map(x=><option key={x}>{x}</option>)}</select></label><label className="funnel-filter-select"><span>Account</span><select aria-label="Funnel account" disabled={loading} value={account} onChange={e=>setAccount(e.target.value)}>{accounts.map(x=><option key={x}>{x}</option>)}</select></label><label className="funnel-filter-select"><span>Disposition</span><select aria-label="Funnel disposition" disabled={loading} value={disposition} onChange={e=>setDisposition(e.target.value)}>{dispositions.map(x=><option key={x}>{x}</option>)}</select></label><label className="funnel-filter-select"><span>Period</span><select aria-label="Funnel period" disabled={loading} value={period} onChange={e=>setPeriod(e.target.value)}>{periods.map(x=><option key={x}>{x}</option>)}</select></label><button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh'}</button></div>
 <div className="funnel-stage-flow">{stageFlow.map((x:any,i:number)=><article key={x.label}><div><span>{String(i+1).padStart(2,'0')}</span><b>{x.label}</b></div><strong>{Number(x.value).toLocaleString('en-IN')}</strong><small>{i===0?'100% entry':x.rate+'% from prior stage'}</small>{i<stageFlow.length-1&&<ArrowRight/>}</article>)}</div>
 <div className="stats-grid"><Stat label="Lead → booking" value={(rates.leadToBooking||0)+'%'} sub={period+' overall conversion'} Icon={Target}/><Stat label="Qualified → appointment" value={(rates.qualifiedToAppointment||0)+'%'} sub={channel} Icon={PhoneCall}/><Stat label="Appointment → consultation" value={(rates.appointmentToConsultation||0)+'%'} sub={account} Icon={MessageCircle}/><Stat label="Consultation → booking" value={(rates.consultationToBooking||0)+'%'} sub={periodDays+' day window'} Icon={CircleDollarSign}/></div>
 <div className="funnel-drill-layout"><div className="app-panel"><div className="panel-head"><div><h3>Campaign breakdown</h3><p>{channel} · {account} · {disposition} · {period}</p></div><span className="healthy">{campaigns.length} campaigns</span></div><div className="funnel-table enhanced"><div className="funnel-tr funnel-th"><span>Campaign</span><span>Account</span><span>Channel</span><span>Leads</span><span>Qualified</span><span>Appt.</span><span>Consult.</span><span>Bookings</span></div>{campaigns.length?campaigns.map((r:any)=><button className={'funnel-tr '+(current?.key===r.key?'selected':'')} key={r.key} onClick={()=>setSelected(r.key)}><div><b>{r.name}</b><small>{r.leadToBookingRate}% lead → booking</small></div><span>{r.account}</span><span>{r.channel}</span>{[r.leads,r.qualified,r.appointments,r.consultations,r.bookings].map((v,i)=><strong key={i}>{Number(v||0).toLocaleString('en-IN')}</strong>)}</button>):<div className="empty-delivery-state"><Filter/><div><b>No campaigns match these filters</b><small>Change channel, account, disposition or date window to inspect a broader funnel.</small></div></div>}</div></div>
 <div className="app-panel funnel-campaign-detail">{current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.account} · {current.channel}</p></div><span className="healthy">{current.leadToBookingRate}% lead → booking</span></div><div className="site-detail-grid">{[['Leads',current.leads],['Qualified',current.qualified],['Appointments',current.appointments],['Consultations',current.consultations],['Bookings',current.bookings],['Lead → Qualified',current.leadToQualifiedRate+'%'],['Qualified → Appt.',current.qualifiedToAppointmentRate+'%'],['Appt. → Consult.',current.appointmentToConsultationRate+'%'],['Consult. → Booking',current.consultationToBookingRate+'%']].map((x:any)=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><div className="source-conflict-note"><BarChart3/><div><b>Campaign narrowing</b><p>Counts and rates are derived from persisted lead profiles and scheduled meetings in the selected window; no media-platform conversion total is substituted for missing CRM evidence.</p></div></div></>:<div className="empty-delivery-state"><BarChart3/><div><b>Select a campaign</b></div></div>}</div></div></>
}
function Events(){
 const emptyDraft={name:'High-value Purchase',sourceEvent:'purchase',outputEvent:'high_value_purchase',field:'value',operator:'gte',value:'4000',destinations:['Google Ads','Meta Ads'],valueMode:'copy',fixedValue:'',currency:'INR'}
 const [data,setData]=useState<any>({items:[],runs:[],stats:{},templates:[]})
 const [active,setActive]=useState('')
 const [builder,setBuilder]=useState(false)
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const [templateFilter,setTemplateFilter]=useState('All')
 const [draft,setDraft]=useState<any>(emptyDraft)
 const load=()=>api.events().then((r:any)=>{setData(r);if(!active&&r.items?.[0])setActive(r.items[0].id)}).catch((e:any)=>setNotice(e?.message||'Event rules could not be loaded.'))
 useEffect(()=>{load()},[])
 const current=(data.items||[]).find((x:any)=>x.id===active)||data.items?.[0]
 const openBuilder=(template?:any)=>{
  if(template){
   setDraft({
    name:template.name||'Business event',
    sourceEvent:template.sourceEvent||'',
    outputEvent:template.outputEvent||'',
    field:template.condition?.field||'',
    operator:template.condition?.operator||'equals',
    value:String(template.condition?.value??''),
    destinations:Array.isArray(template.destinations)?template.destinations:[],
    valueMode:template.valueMode||'copy',
    fixedValue:template.fixedValue==null?'':String(template.fixedValue),
    currency:template.currency||'INR'
   })
  }else setDraft({...emptyDraft})
  setBuilder(true)
 }
 const create=async(e:any)=>{
  e.preventDefault();setBusy('create');setNotice('')
  try{
   const item:any=await api.createEventRule({
    name:draft.name,
    sourceEvent:draft.sourceEvent,
    outputEvent:draft.outputEvent,
    conditions:draft.field?[{field:draft.field,operator:draft.operator||'equals',value:draft.value}]:[],
    destinations:draft.destinations||[],
    valueMode:draft.valueMode||'copy',
    fixedValue:draft.valueMode==='fixed'&&draft.fixedValue!==''?Number(draft.fixedValue):undefined,
    currency:draft.currency||'INR'
   })
   setBuilder(false)
   setNotice('Event rule created and enabled.')
   await load()
   if(item?.item?.id)setActive(item.item.id)
  }catch(err:any){setNotice(err?.message||'Event rule could not be created.')}
  finally{setBusy('')}
 }
 const toggle=async(x:any)=>{setBusy(x.id);setNotice('');try{await api.toggleEventRule(x.id,!x.enabled);setNotice((x.enabled?'Paused ':'Enabled ')+x.name+'.');await load()}catch(err:any){setNotice(err?.message||'Rule status could not be changed.')}finally{setBusy('')}}
 const stats=data.stats||{}
 const categories=['All',...Array.from(new Set((data.templates||[]).map((x:any)=>x.category||'Other')))] as string[]
 const visibleTemplates=(data.templates||[]).filter((x:any)=>templateFilter==='All'||(x.category||'Other')===templateFilter)
 const toggleDestination=(name:string)=>setDraft((x:any)=>({...x,destinations:(x.destinations||[]).includes(name)?(x.destinations||[]).filter((d:string)=>d!==name):[...(x.destinations||[]),name]}))
 return <><PageHead crumb="Activation / Events" title="Conversion event manager" sub="Define business logic that transforms raw behavior and CRM outcomes into measurable, activatable events." action="New event" onAction={()=>openBuilder()}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Rules" value={String(stats.rules||0)} sub={(stats.enabled||0)+' enabled'} Icon={Zap}/><Stat label="Matches · 24h" value={String(stats.runs24h||0)} sub="Derived business events" Icon={Activity}/><Stat label="Activations · 24h" value={String(stats.activations24h||0)} sub="Queued provider signals" Icon={RadioTower}/><Stat label="Rule engine" value="Safe" sub="Whitelisted operators · no eval" Icon={ShieldCheck}/></div>
 <div className="event-layout"><div className="app-panel event-list"><div className="panel-head"><div><h3>Configured events</h3><p>Persisted business logic → normalized output → destinations</p></div><button className="app-primary" onClick={()=>openBuilder()}><Plus/>New rule</button></div>{(data.items||[]).length?(data.items||[]).map((x:any)=><button className={(current?.id===x.id?'selected ':'')} key={x.id} onClick={()=>setActive(x.id)}><span><Zap/></span><div><b>{x.name}</b><small>{x.source_event} → {x.output_event}</small></div><i>{x.enabled?'Active':'Paused'}</i><ChevronRight/></button>):<div className="empty-state"><Zap/><b>No event rules yet</b><small>Create a business rule or use one of the templates below.</small></div>}</div>
 <div className="app-panel event-editor">{current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.source_event} → {current.output_event}</p></div><button disabled={busy===current.id} onClick={()=>toggle(current)}>{busy===current.id?'Updating…':current.enabled?'Pause':'Enable'}</button></div>
 <div className="event-step"><span>1</span><div><b>Source event</b><p>Evaluate when <strong>{current.source_event}</strong> arrives through the first-party ingestion API.</p></div></div>
 <div className="event-step"><span>2</span><div><b>Business conditions</b><p>{(current.conditions||[]).length?(current.conditions||[]).map((c:any)=>c.field+' '+c.operator+' '+String(c.value)).join(' AND '):'No conditions — every matching source event qualifies.'}</p></div></div>
 <div className="event-step"><span>3</span><div><b>Normalize & persist</b><p>Create <strong>{current.output_event}</strong> in the assisted-event store with deterministic rule-run idempotency.</p></div></div>
 <div className="event-step"><span>4</span><div><b>Activate</b><p>{(current.destinations||[]).length?'Queue to '+current.destinations.join(' + ')+' only when marketing consent is present.':'Measurement only — no ad-platform activation.'}</p></div></div></>:<div className="empty-state"><Zap/><b>Select or create an event rule</b></div>}</div></div>
 <div className="event-tooling-grid"><div className="app-panel"><div className="panel-head"><div><h3>Business-event templates</h3><p>Choose a pattern, review its logic, then persist it as a real workspace rule.</p></div><span className="healthy">{(data.templates||[]).length} templates</span></div>
 <div className="event-template-filters">{categories.map(x=><button key={x} className={templateFilter===x?'active':''} onClick={()=>setTemplateFilter(x)}>{x}</button>)}</div>
 <div className="event-template-list">{visibleTemplates.map((x:any)=><article className="template-row template-card" key={x.id||x.name}><Zap/><div><div className="template-card-title"><b>{x.name}</b><em>{x.category||'Business event'}</em></div><small>{x.description||x.sourceEvent+' → '+x.outputEvent}</small><p>{x.useCase||'Create a governed derived event from first-party data.'}</p></div><div className="template-card-actions"><span>{x.condition?.field} {x.condition?.operator} {String(x.condition?.value)}</span><button onClick={()=>openBuilder(x)}>Use template<ArrowRight/></button></div></article>)}</div>
 </div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recent rule matches</h3><p>Auditable transformations and activation counts</p></div><button onClick={load}>Refresh</button></div>{(data.runs||[]).length?(data.runs||[]).slice(0,8).map((x:any)=><button className="adjustment-row event-run-row" key={x.id} onClick={()=>{const match=(data.items||[]).find((rule:any)=>rule.id===x.rule_id);if(match)setActive(match.id)}}><span>{x.source_event}</span><ArrowRight/><b>{x.output_event}</b><em>{x.activation_queued||0} queued</em></button>):<div className="empty-delivery-state"><Activity/><div><b>No rule matches yet</b><small>Send a source event that meets a configured rule to create an auditable match.</small></div></div>}</div></div>
 {builder&&<div className="connector-modal"><form className="connector-card audience-builder" onSubmit={create}><div className="connector-modal-head"><div><Zap/><div><b>Business event rule</b><small>Review the template or define your own rule before it becomes active.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div>
 <label>Rule name<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} required/></label><div className="audience-rule-grid"><label>Source event<input value={draft.sourceEvent} onChange={e=>setDraft({...draft,sourceEvent:e.target.value})} required/></label><label>Output event<input value={draft.outputEvent} onChange={e=>setDraft({...draft,outputEvent:e.target.value})} required/></label><label>Condition field<input value={draft.field} onChange={e=>setDraft({...draft,field:e.target.value})} required/></label></div>
 <div className="audience-rule-grid"><label>Operator<select value={draft.operator} onChange={e=>setDraft({...draft,operator:e.target.value})}><option value="equals">equals</option><option value="not_equals">not equals</option><option value="gt">greater than</option><option value="gte">greater/equal</option><option value="lt">less than</option><option value="lte">less/equal</option><option value="contains">contains</option><option value="exists">exists</option><option value="in">in</option></select></label><label>Condition value<input value={draft.value} onChange={e=>setDraft({...draft,value:e.target.value})}/></label><label>Value mode<select value={draft.valueMode} onChange={e=>setDraft({...draft,valueMode:e.target.value})}><option value="copy">Copy source value</option><option value="fixed">Fixed value</option></select></label></div>
 {draft.valueMode==='fixed'&&<label>Fixed value<input value={draft.fixedValue} onChange={e=>setDraft({...draft,fixedValue:e.target.value})} type="number" step="0.01" required/></label>}<label>Currency<input value={draft.currency} onChange={e=>setDraft({...draft,currency:e.target.value})}/></label>
 <div className="template-destination-picker"><span>Activation destinations</span><div className="context-chips"><label><input type="checkbox" checked={(draft.destinations||[]).includes('Google Ads')} onChange={()=>toggleDestination('Google Ads')}/> Google Ads</label><label><input type="checkbox" checked={(draft.destinations||[]).includes('Meta Ads')} onChange={()=>toggleDestination('Meta Ads')}/> Meta Ads</label><small>Leave both off for measurement-only attribution events.</small></div></div>
 <div className="event-rule-preview"><b>Rule preview</b><span>When <code>{draft.sourceEvent||'source_event'}</code> arrives and <code>{draft.field||'field'} {draft.operator} {String(draft.value||'value')}</code>, create <code>{draft.outputEvent||'derived_event'}</code>{(draft.destinations||[]).length?' and queue '+draft.destinations.join(' + '):' for measurement only'}.</span></div>
 <div className="audience-builder-actions"><button type="button" onClick={()=>setBuilder(false)}>Cancel</button><button className="app-primary" disabled={busy==='create'} type="submit">{busy==='create'?'Creating…':'Create & enable rule'}</button></div></form></div>}</>
}
function Adjustments(){
 const [items,setItems]=useState<any[]>([])
 const [selected,setSelected]=useState('')
 const [preview,setPreview]=useState<any>(null)
 const [busy,setBusy]=useState('')
 const [builder,setBuilder]=useState(false)
 const [notice,setNotice]=useState('')
 const load=()=>api.adjustments().then((r:any)=>{const mapped=(r.items||[]).map((x:any)=>({...x,event:String(x.event||'').replaceAll('_',' ').replace(/\b\w/g,(m:string)=>m.toUpperCase()),source:String(x.source||'').replaceAll('_',' / '),destination:String(x.destination||'').replaceAll('_',' '),from:x.fromValue??'—',to:x.toValue??'—',status:String(x.status||'pending').replace(/^./,(m:string)=>m.toUpperCase())}));setItems(mapped);setSelected(x=>x&&mapped.some((y:any)=>y.id===x)?x:(mapped[0]?.id||''))}).catch((e:any)=>{setItems([]);setNotice(e?.message||'Adjustments could not be loaded.')})
 const loadReactivation=()=>api.leadReactivation(dormantDays,recentDays).then((r:any)=>setReactivation(r)).catch(()=>setReactivation({items:[],stats:{}}))
 useEffect(()=>{load();loadReactivation()},[])
 useEffect(()=>{loadReactivation()},[dormantDays,recentDays])
 const current=items.find(x=>x.id===selected)||items[0]
 const apply=async(id:string)=>{setBusy('apply');setNotice('');try{await api.applyAdjustment(id);setNotice('Adjustment applied and audit state updated.');await load();setPreview(null)}catch(e:any){setNotice(e?.message||'Adjustment could not be applied.')}finally{setBusy('')}}
 const showPreview=async(id:string)=>{setBusy('preview');setNotice('');try{const r:any=await api.previewAdjustment(id);setPreview(r)}catch(e:any){setNotice(e?.message||'Preview could not be generated.')}finally{setBusy('')}}
 const create=async(e:any)=>{
  e.preventDefault();const fd=new FormData(e.currentTarget);setBusy('create');setNotice('')
  try{
   const r:any=await api.createAdjustment({
    event:String(fd.get('event')||''),
    source:String(fd.get('source')||''),
    destination:String(fd.get('destination')||''),
    fromValue:String(fd.get('fromValue')||''),
    toValue:String(fd.get('toValue')||''),
    currency:String(fd.get('currency')||'INR'),
    reason:String(fd.get('reason')||'')
   })
   setBuilder(false);setNotice('Adjustment created in pending state.');await load();if(r?.item?.id)setSelected(r.item.id)
  }catch(err:any){setNotice(err?.message||'Adjustment could not be created.')}finally{setBusy('')}
 }
 const money=(v:any,currency='INR')=>typeof v==='number'?new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:0}).format(v):String(v)
 return <><PageHead crumb="AdSync / Adjustments" title="Conversion adjustments" sub="Correct partial, returned, duplicate or low-quality outcomes before ad platforms learn from them." action="New adjustment" onAction={()=>setBuilder(true)}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Adjustment records" value={String(items.length)} sub="Persisted workspace corrections" Icon={CircleDollarSign}/><Stat label="Pending" value={String(items.filter(x=>x.status==='Pending').length)} sub="Awaiting application" Icon={Activity}/><Stat label="Applied" value={String(items.filter(x=>x.status==='Applied').length)} sub="Audited corrections" Icon={CheckCircle2}/><Stat label="Preview safety" value="Enabled" sub="Inspect payload before apply" Icon={ShieldCheck}/></div>
 <div className="adjustments-layout"><div className="app-panel adjustment-list"><div className="panel-head"><div><h3>Conversion adjustments</h3><p>Persisted reclassification and value-correction queue</p></div><button onClick={load}>Refresh</button></div>{items.length?items.map(x=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>{setSelected(x.id);setPreview(null)}}><CircleDollarSign/><div><b>{x.event}</b><small>{x.source} → {x.destination}</small></div><span className={x.status.toLowerCase()}>{x.status}</span><ChevronRight/></button>):<div className="empty-delivery-state"><CircleDollarSign/><div><b>No adjustments yet</b><small>Create a correction only when a real business outcome changes. AceMarketing no longer seeds example adjustments into an empty workspace.</small></div></div>}</div>
 {current&&<div className="app-panel adjustment-detail"><div className="panel-head"><div><h3>{current.event}</h3><p>{current.reason||'Business outcome correction'}</p></div><span className={current.status==='Applied'?'healthy':'status'}>{current.status}</span></div><div className="adjustment-value-flow"><div><span>Original outcome</span><b>{money(current.from,current.currency)}</b></div><ArrowRight/><div><span>Adjusted outcome</span><b>{money(current.to,current.currency)}</b></div></div><div className="diagnostic-evidence">{[['Adjustment ID',current.id],['Source',current.source],['Destination',current.destination],['Created',current.createdAt?new Date(current.createdAt).toLocaleString():'—']].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div>{preview&&<div className="code-block adjustment-preview"><code>{JSON.stringify(preview.payload,null,2)}</code></div>}{current.status!=='Applied'?<div className="approval-actions"><button disabled={busy==='preview'} onClick={()=>showPreview(current.id)}>{busy==='preview'?'Generating…':'Preview payload'}</button><button className="approve" disabled={busy==='apply'} onClick={()=>apply(current.id)}><Check/>{busy==='apply'?'Applying…':'Apply adjustment'}</button></div>:<div className="approval-final approved"><Check/><b>Adjustment applied</b></div>}</div>}</div>
 {builder&&<div className="connector-modal"><form className="connector-card" onSubmit={create}><div className="connector-modal-head"><div><CircleDollarSign/><div><b>New conversion adjustment</b><small>Create a real pending correction from a changed business outcome.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Event<input name="event" required placeholder="partial_payment"/></label><label>Source<input name="source" required placeholder="crm_billing"/></label><label>Destination<select name="destination"><option value="google_ads">Google Ads</option><option value="meta_ads">Meta Ads</option><option value="webhook">Webhook</option></select></label><div className="two-col"><label>Original value<input name="fromValue" placeholder="15000 or lead"/></label><label>Adjusted value<input name="toValue" placeholder="84000 or excluded"/></label></div><label>Currency<input name="currency" defaultValue="INR"/></label><label>Reason<textarea name="reason" required placeholder="Final payment received, return processed, duplicate identified..."/></label><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create adjustment'}</button></form></div>}</>
}
function Diagnostics(){
 const [data,setData]=useState<any>(null)
 const [selected,setSelected]=useState('')
 const [replays,setReplays]=useState<string[]>([])
 const [scan,setScan]=useState<any>(null)
 const [configOpen,setConfigOpen]=useState(false)
 const [busy,setBusy]=useState('')
 const load=()=>api.diagnostics().then((r:any)=>{setData(r);if(!selected&&r.issues?.[0])setSelected(r.issues[0].key)}).catch(()=>null)
 useEffect(()=>{load()},[])
 const issueMap:any={duplicate_conversions:['Duplicate conversions','Duplicate delivery/audit evidence detected.'],missing_click_ids:['Missing click IDs','A share of active click sessions lacks usable advertising identifiers.'],delivery_failures:['Delivery failures','Dead-letter signal deliveries need investigation or replay.'],connector_health:['Connector health','A connected provider is reporting degraded health.'],schema_mismatch:['Schema mismatch','Quarantined events require field or schema correction.']}
 const issues=(data?.issues||[]).map((x:any)=>({...x,title:issueMap[x.key]?.[0]||String(x.key).replaceAll('_',' '),description:issueMap[x.key]?.[1]||'Operational issue detected.'}))
 const current=issues.find((x:any)=>x.key===selected)||issues[0]
 const replay=async(key:string)=>{setBusy('replay');try{await api.replayDiagnostic(key);setReplays(x=>x.includes(key)?x:[...x,key])}finally{setBusy('')}}
 const runScan=async()=>{setBusy('scan');try{const r:any=await api.runDiagnosticsScan();setScan(r);await load()}finally{setBusy('')}}
 return <><PageHead crumb="Tracking / Diagnostics" title="Tracking & data quality diagnostics" sub="Inspect live delivery, identity, queue and connector health instead of relying on static quality scores." action={busy==='scan'?'Scanning…':'Run full scan'} onAction={runScan}/>
 {scan&&<div className="delivery-notice ok"><CheckCircle2/><span>Scan {scan.id} completed · {scan.deadLetter} dead-letter deliveries · {scan.connectorIssues} connector issues · {scan.unmatchedAttribution} unmatched attribution events.</span></div>}
 <div className="stats-grid"><Stat label="Signal quality score" value={data?String(data.score)+'/100':'—'} sub="Derived from current workspace state" Icon={ShieldCheck}/><Stat label="Duplicate evidence" value={data?String(data.duplicateRate)+'%':'—'} sub="Audit/delivery evidence" Icon={Zap}/><Stat label="Click-ID coverage" value={data?String(data.clickIdCoverage)+'%':'—'} sub="Active first-party click sessions" Icon={MousePointer2}/><Stat label="Delivery rate" value={data?String(data.deliveryRate)+'%':'—'} sub="Persisted provider deliveries" Icon={Activity}/></div>
 <div className="diagnostic-ops-layout"><div className="app-panel diagnostic-issue-list"><div className="panel-head"><div><h3>Detected issues</h3><p>Generated from live workspace state</p></div><span className={issues.length?'status':'healthy'}>{issues.length} open</span></div>{issues.length?issues.map((x:any)=><button key={x.key+(x.connector||'')} className={selected===x.key?'selected':''} onClick={()=>setSelected(x.key)}><Activity/><div><b>{x.title}</b><small>{x.connector||x.affected||x.affectedPercent||x.quarantined||'Workspace signal issue'}</small></div><span className={String(x.severity||'info').toLowerCase()}>{x.severity||'info'}</span><ChevronRight/></button>):<div className="empty-delivery-state"><CheckCircle2/><div><b>No active diagnostic issues</b><small>Current delivery, connector and attribution checks are within configured thresholds.</small></div></div>}</div>
 <div className="app-panel diagnostic-detail">{current?<><div className="panel-head"><div><h3>{current.title}</h3><p>{current.description}</p></div><span className={'diag-severity '+String(current.severity||'info').toLowerCase()}>{current.severity||'Info'}</span></div><div className="diagnostic-evidence">{[['Issue key',current.key],['Connector',current.connector||'—'],['Affected',String(current.affected??current.affectedPercent??current.quarantined??'—')],['Status',current.status||'Open']].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div><div className="diagnostic-actions"><button onClick={()=>setConfigOpen(true)}>Open configuration</button><button className="primary" disabled={busy==='replay'} onClick={()=>replay(current.key)}>{replays.includes(current.key)?<><Check/>Replay queued</>:<>Replay affected events</>}</button></div></>:<div className="empty-delivery-state"><ShieldCheck/><div><b>Workspace healthy</b><small>No active issue selected.</small></div></div>}</div></div>
 {configOpen&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><Settings2/><div><b>Diagnostic configuration guidance</b><small>{current?.title||'Workspace diagnostics'}</small></div></div><button onClick={()=>setConfigOpen(false)}><X/></button></div><div className="connector-step"><div className="setting-line"><span>Delivery queue</span><b>{data?.queue?.available===false?'Unavailable':'Connected'}</b></div><div className="setting-line"><span>Recommended action</span><b>{current?.key==='missing_click_ids'?'Review Tracking settings and click-ID persistence':current?.key==='connector_health'?'Reconnect or refresh the affected integration':current?.key==='delivery_failures'?'Review Delivery Center / DLQ':'Review event rules and source mappings'}</b></div><button onClick={()=>setConfigOpen(false)}>Close</button></div></div></div>}</>
}
function Reconciliation(){
 const [data,setData]=useState<any>({totals:{},channels:[],issues:[],recentActions:[]})
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const load=async()=>{try{setData(await api.reconciliation())}catch(e:any){setNotice(e?.message||'Reconciliation data could not be loaded.')}}
 useEffect(()=>{load()},[])
 const run=async(issue:string)=>{setBusy(issue);setNotice('');try{const r:any=await api.runReconciliationAction(issue,250);setNotice(r.detail||'Reconciliation action completed.');await load()}catch(e:any){setNotice(e?.message||'Reconciliation action failed.')}finally{setBusy('')}}
 const t=data.totals||{}
 return <><PageHead crumb="Tracking / Reconciliation" title="Conversion reconciliation center" sub="Explain gaps between tracked events, matched conversions and downstream delivery, then run safe repair actions from one place." action="Refresh" onAction={load}/>
 {notice&&<div className={'delivery-notice '+(notice.toLowerCase().includes('failed')||notice.toLowerCase().includes('could not')?'error':'ok')}><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Quality score" value={String(data.score??'—')+(data.score!=null?'/100':'')} sub="Derived from unmatched, failed, duplicate and quarantined evidence" Icon={ShieldCheck}/><Stat label="Unmatched" value={String(t.unmatchedEvents||0)} sub="Attribution events still needing identity resolution" Icon={Target}/><Stat label="Failed delivery" value={String(t.failedDeliveries||0)} sub="Provider signals eligible for retry" Icon={RadioTower}/><Stat label="Quarantined" value={String(t.quarantined||0)} sub="Schema/field validation review queue" Icon={DatabaseZap}/></div>
 <div className="reconciliation-grid"><div className="app-panel"><div className="panel-head"><div><h3>Issue reconciliation</h3><p>Live gaps derived from current workspace state</p></div></div>{(data.issues||[]).map((x:any)=><article className="recon-issue" key={x.key}><span className={'recon-severity '+x.severity}>{x.count}</span><div><b>{x.label}</b><p>{x.detail}</p></div><button disabled={busy===x.key||x.count===0} onClick={()=>run(x.key)}>{busy===x.key?'Working…':x.action==='reprocess'?'Reconcile':x.action==='retry'?'Retry failed':'Queue review'}</button></article>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Destination delivery comparison</h3><p>AceMarketing-sent records only; not provider-reported conversion totals</p></div></div>{(data.channels||[]).length?(data.channels||[]).map((x:any)=><div className="recon-channel" key={x.destination}><div><b>{x.destination}</b><small>{x.total} total · {x.queued} queued · {x.failed} failed</small></div><strong>{x.successRate}%</strong><div className="progress"><i style={{width:Math.min(100,Number(x.successRate||0))+'%'}}/></div></div>):<div className="empty-delivery-state"><RadioTower/><div><b>No provider delivery evidence yet</b><small>Signal delivery comparisons appear after activation begins.</small></div></div>}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Reconciliation evidence</h3><p>Counts used to explain why totals can differ across the funnel</p></div></div><div className="recon-evidence-grid">{[['Tracked events',t.trackedEvents||0],['Assisted events',t.assistedEvents||0],['Matched attribution',t.matchedEvents||0],['Signal deliveries',t.deliveries||0],['Duplicate evidence',t.duplicates||0],['Pending adjustments',t.pendingAdjustments||0]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recent reconciliation actions</h3><p>Persisted repair/review history</p></div></div>{(data.recentActions||[]).length?(data.recentActions||[]).map((x:any)=><div className="agent-run" key={x.id}><Activity/><div><b>{String(x.issue).replaceAll('_',' ')}</b><small>{x.detail}</small></div><span>{x.createdAt?new Date(x.createdAt).toLocaleString():'—'}</span><em className={x.status}>{x.status}</em></div>):<div className="empty-delivery-state"><Activity/><div><b>No reconciliation actions yet</b><small>Run a repair or queue a review to create an audit trail.</small></div></div>}</div>
 </> 
}

function Fraud(){
 const [data,setData]=useState<any>({items:[],blocked:[],reviews:[]})
 const [selected,setSelected]=useState('')
 const [busy,setBusy]=useState('')
 const load=()=>api.fraud().then((r:any)=>{setData(r);if(r.items?.length)setSelected((x:string)=>x&&r.items.some((i:any)=>i.key===x)?x:r.items[0].key)}).catch(()=>setData({items:[],blocked:[],reviews:[]}))
 useEffect(()=>{load()},[])
 const current=(data.items||[]).find((x:any)=>x.key===selected)||data.items?.[0]
 const block=async(name:string)=>{setBusy('block');try{await api.blockFraudPattern(name);await load()}finally{setBusy('')}}
 const review=async(name:string)=>{setBusy('review');try{await api.reviewFraudPattern(name);await load()}finally{setBusy('')}}
 const blockedNames=new Set((data.blocked||[]).map((x:any)=>x.pattern))
 const reviewNames=new Set((data.reviews||[]).map((x:any)=>x.pattern))
 return <><PageHead crumb="Quality / Fraud" title="Fraud & noise detection" sub="Detect and explicitly control suspicious or low-quality first-party activity without fabricating traffic volumes."/>
 <div className="stats-grid"><Stat label="Detected patterns" value={String((data.items||[]).length)} sub="Current workspace evidence" Icon={ShieldCheck}/><Stat label="Blocked patterns" value={String((data.blocked||[]).length)} sub="Persisted optimization blocks" Icon={X}/><Stat label="Review queue" value={String((data.reviews||[]).length)} sub="Human-review requests" Icon={UsersRound}/><Stat label="Control mode" value="Human + rules" sub="No silent auto-blocking" Icon={CircleDollarSign}/></div>
 <div className="fraud-layout"><div className="app-panel fraud-list"><div className="panel-head"><div><h3>Detected patterns</h3><p>Derived from lead scoring and recent first-party events</p></div><button onClick={load}>Refresh</button></div>{(data.items||[]).length?(data.items||[]).map((x:any)=><button key={x.key} className={selected===x.key?'selected':''} onClick={()=>setSelected(x.key)}><ShieldCheck/><div><b>{x.name||x.key}</b><small>{x.source} · {Number(x.affected||0).toLocaleString('en-IN')} affected</small></div><span className={String(x.severity||'info').toLowerCase()}>{x.severity||'info'}</span><ChevronRight/></button>):<div className="empty-delivery-state"><CheckCircle2/><div><b>No active fraud/noise patterns</b><small>No persisted scoring or high-velocity evidence currently crosses the configured heuristics.</small></div></div>}</div>
 <div className="app-panel fraud-detail">{current?<><div className="panel-head"><div><h3>{current.name||current.key}</h3><p>{current.description}</p></div><span className={'diag-severity '+String(current.severity||'info').toLowerCase()}>{current.severity||'Info'}</span></div><div className="diagnostic-evidence">{[['Source',current.source||'—'],['Affected volume',String(current.affected||0)],['Detection method','Persisted evidence'],['Signal action','Explicit block or review only']].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div><div className="approval-actions"><button disabled={busy==='review'} onClick={()=>review(current.name||current.key)}>{reviewNames.has(current.name||current.key)?<><Check/>Review queued</>:<>Send to review</>}</button><button className="approve" disabled={busy==='block'} onClick={()=>block(current.name||current.key)}>{blockedNames.has(current.name||current.key)?<><Check/>Rule active</>:<><ShieldCheck/>Block from optimization</>}</button></div></>:<div className="empty-delivery-state"><ShieldCheck/><div><b>No pattern selected</b></div></div>}</div></div></>
}
function DeepLinks(){
 const [links,setLinks]=useState<any[]>([])
 const [stats,setStats]=useState<any>({})
 const [selected,setSelected]=useState('')
 const [builder,setBuilder]=useState(false)
 const [copied,setCopied]=useState('')
 const [busy,setBusy]=useState('')
 const load=()=>api.deepLinks().then((r:any)=>{setLinks(r.items||[]);setStats(r.stats||{});if(r.items?.length)setSelected((x:string)=>x&&r.items.some((i:any)=>i.slug===x)?x:r.items[0].slug)}).catch(()=>{setLinks([]);setStats({})})
 useEffect(()=>{load()},[])
 const current=links.find(x=>x.slug===selected)||links[0]
 const activate=async(slug:string)=>{setBusy('activate');try{await api.activateDeepLink(slug);await load()}finally{setBusy('')}}
 const create=async(e:any)=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy('create');try{const r:any=await api.createDeepLink({name:String(f.get('name')||''),slug:String(f.get('slug')||''),target:String(f.get('target')||''),fallback:String(f.get('fallback')||'')});setBuilder(false);await load();setSelected(r.slug)}finally{setBusy('')}}
 const copyTestUrl=async()=>{if(!current)return;const url=location.origin+'/#/deep/'+current.slug+'?utm_source=test&utm_medium=debug';try{await navigator.clipboard.writeText(url);setCopied(current.slug)}catch{setCopied('error')}}
 const totalClicks=Number(stats.clicks||0),totalAppOpens=Number(stats.appOpens||0),totalConversions=Number(stats.conversions||0)
 return <><PageHead crumb="Activation / Deep Links" title="Deep linking" sub="Persist app/web routes and measure their own click, app-open and conversion events." action="Create deep link" onAction={()=>setBuilder(true)}/>
 <div className="stats-grid"><Stat label="Active links" value={String(stats.active||0)} sub={(stats.draft||0)+' draft'} Icon={Network}/><Stat label="Clicks" value={totalClicks.toLocaleString('en-IN')} sub="Persisted deep-link click events" Icon={MousePointer2}/><Stat label="App opens" value={totalClicks?Math.round(totalAppOpens/totalClicks*100)+'%':'—'} sub="Of recorded clicks" Icon={Globe2}/><Stat label="Conversion rate" value={totalClicks?(totalConversions/totalClicks*100).toFixed(1)+'%':'—'} sub="Recorded deep-link conversions" Icon={CheckCircle2}/></div>
 <div className="deep-link-layout"><div className="app-panel deep-link-list"><div className="panel-head"><div><h3>Deep links</h3><p>Persisted app-first routes with web fallbacks</p></div><button onClick={load}>Refresh</button></div>{links.length?links.map(x=><button key={x.slug} className={selected===x.slug?'selected':''} onClick={()=>setSelected(x.slug)}><Network/><div><b>{x.name}</b><small>{x.slug} · {Number(x.clicks||0).toLocaleString('en-IN')} clicks</small></div><span className={String(x.status||'draft').toLowerCase()}>{x.status}</span><ChevronRight/></button>):<div className="empty-delivery-state"><Network/><div><b>No deep links yet</b><small>Create a route to begin measuring app/web handoff performance.</small></div></div>}</div>
 <div className="app-panel deep-link-detail">{current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.slug}</p></div><span className={current.status==='active'?'healthy':'status'}>{current.status}</span></div><div className="site-detail-grid">{[['Primary destination',current.target],['Web fallback',current.fallback],['Recorded clicks',current.clicks||0],['App opens',current.appOpens||0],['Conversions',current.conversions||0],['Conversion rate',(current.conversionRate||0)+'%']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1]??'—')}</b></div>)}</div><div className="approval-actions"><button onClick={copyTestUrl}>{copied===current.slug?'Copied':'Copy test URL'}</button>{current.status!=='active'&&<button className="approve" disabled={busy==='activate'} onClick={()=>activate(current.slug)}><Check/>Activate link</button>}</div></>:<div className="empty-delivery-state"><Network/><div><b>Create a deep link to configure routing.</b></div></div>}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Link performance</h3><p>Click → app open → conversion</p></div></div>{links.length?links.map(x=><div className="developer-event-row" key={x.slug}><b>{x.name}</b><span>{Number(x.clicks||0).toLocaleString('en-IN')} clicks · {Number(x.appOpens||0).toLocaleString('en-IN')} app opens</span><strong>{Number(x.conversionRate||0).toFixed(1)}% conversion</strong></div>):<div className="empty-delivery-state"><Activity/><div><b>No performance data yet</b></div></div>}</div>
 {builder&&<div className="connector-modal"><form className="connector-card" onSubmit={create}><div className="connector-modal-head"><div><Network/><div><b>Create deep link</b><small>Persist route and fallback.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Name<input name="name" required placeholder="Consultation booking"/></label><label>Slug<input name="slug" required placeholder="book-consultation"/></label><label>App / primary destination<input name="target" required placeholder="myapp://consultation/book"/></label><label>Web fallback<input name="fallback" required type="url" placeholder="https://example.com/book"/></label><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create draft'}</button></form></div>}</>
}
function Sites(){
 const [sites,setSites]=useState<any[]>([])
 const [selected,setSelected]=useState('')
 const [tests,setTests]=useState<Record<string,any>>({})
 const [debug,setDebug]=useState<any[]>([])
 const [debugOpen,setDebugOpen]=useState(false)
 const [builder,setBuilder]=useState(false)
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const load=()=>api.sites().then((r:any)=>{const mapped=(r.items||[]).map((x:any)=>({...x,environment:String(x.environment||'').replace(/^./,(m:string)=>m.toUpperCase()),pixel:String(x.pixel||'').replaceAll('_',' ').replace(/^./,(m:string)=>m.toUpperCase()),server:String(x.server||'').replace(/^./,(m:string)=>m.toUpperCase()),consent:x.consent||'Configured'}));setSites(mapped);setSelected(v=>v&&mapped.some((x:any)=>x.domain===v)?v:(mapped[0]?.domain||''))}).catch(()=>setSites([]))
 useEffect(()=>{load()},[])
 const current=sites.find(x=>x.domain===selected)||sites[0]
 const create=async(e:any)=>{e.preventDefault();const fd=new FormData(e.currentTarget);setBusy('create');setNotice('');try{const r:any=await api.createSite({domain:String(fd.get('domain')||''),environment:String(fd.get('environment')||'production')});setBuilder(false);setNotice('Tracked property saved. Install tracking and run the installation test when events begin arriving.');await load();if(r?.item?.domain)setSelected(r.item.domain)}catch(err:any){setNotice(err?.message||'Site could not be saved.')}finally{setBusy('')}}
 const test=async(domain:string)=>{setBusy('test');setNotice('');try{const r:any=await api.testSite(domain);setTests(x=>({...x,[domain]:r}));setNotice(r.pixel?'Installation evidence found for '+domain+'.':'No browser events observed yet for '+domain+'. Server endpoint is reachable, but tracking still needs evidence.')}catch(err:any){setNotice(err?.message||'Site test failed.')}finally{setBusy('')}}
 const openDebugger=async()=>{if(!current)return;const r:any=await api.siteDebug(current.domain).catch(()=>({items:[]}));setDebug(r.items||[]);setDebugOpen(true)}
 const result=current?tests[current.domain]:null
 return <><PageHead crumb="Tracking / Sites" title="Site & pixel operations" sub="Manage first-party collection, cross-domain continuity, consent gating and server-side event delivery." action="Add site" onAction={()=>setBuilder(true)}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Tracked domains" value={String(sites.length)} sub="Persisted site inventory" Icon={Globe2}/><Stat label="Average coverage" value={sites.length?(sites.reduce((n,x)=>n+Number(x.coverage||0),0)/sites.length).toFixed(1)+'%':'—'} sub="Observed event coverage" Icon={MousePointer2}/><Stat label="Browser evidence" value={String(sites.filter(x=>String(x.pixel).toLowerCase()==='active').length)} sub="Properties with observed events" Icon={RadioTower}/><Stat label="Consent configured" value={String(sites.filter(x=>x.consent).length)} sub="Workspace consent policy" Icon={ShieldCheck}/></div>
 <div className="site-ops-layout"><div className="app-panel site-list"><div className="panel-head"><div><h3>Tracked properties</h3><p>Persisted domains and environments</p></div><button onClick={load}>Refresh</button></div>{sites.length?sites.map(x=><button key={x.domain} className={selected===x.domain?'selected':''} onClick={()=>setSelected(x.domain)}><Globe2/><div><b>{x.domain}</b><small>{x.environment} · {x.pixel}</small></div><strong>{x.coverage}%</strong><ChevronRight/></button>):<div className="empty-delivery-state"><Globe2/><div><b>No sites configured</b><small>Add the first tracked property to start site/pixel operations.</small></div></div>}</div>
 {current?<div className="app-panel site-detail"><div className="panel-head"><div><h3>{current.domain}</h3><p>{current.environment} property</p></div><span className={current.pixel==='Active'?'healthy':'status'}>{current.pixel}</span></div><div className="site-detail-grid">{[['Browser pixel evidence',current.pixel],['Server endpoint',current.server],['Event coverage',current.coverage+'%'],['Consent mode',current.consent],['Events observed',String(current.events||0)],['Last event',current.lastEventAt?new Date(current.lastEventAt).toLocaleString():'—']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div>{result&&<div className="diagnostic-evidence">{[['Pixel events observed',result.pixel?'Yes':'No'],['Server endpoint',result.server?'Reachable':'Unavailable'],['Consent readiness',result.consent?'Configured':'Needs setup'],['Cross-domain identity',result.crossDomain?'Observed':'No evidence yet'],['Events in test',String(result.eventsObserved||0)],['Tested at',new Date(result.testedAt).toLocaleString()]].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div>}<div className="approval-actions"><button onClick={openDebugger}>Open event debugger</button><button className="approve" disabled={busy==='test'} onClick={()=>test(current.domain)}><Activity/>{busy==='test'?'Testing…':result?(result.pixel?'Evidence verified':'Retest installation'):'Test installation'}</button></div></div>:<div className="app-panel site-detail"><div className="empty-delivery-state"><Globe2/><div><b>Add a tracked property</b><small>Site diagnostics become available after a domain is saved.</small></div></div></div>}</div>
 {builder&&<div className="connector-modal"><form className="connector-card" onSubmit={create}><div className="connector-modal-head"><div><Globe2/><div><b>Add tracked site</b><small>Register a domain before verifying browser/server tracking.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Domain<input name="domain" required placeholder="www.example.com"/></label><label>Environment<select name="environment"><option value="production">Production</option><option value="staging">Staging</option><option value="development">Development</option></select></label><button disabled={busy==='create'}>{busy==='create'?'Saving…':'Save tracked site'}</button></form></div>}
 {debugOpen&&<div className="connector-modal"><div className="connector-card event-debugger"><div className="connector-modal-head"><div><Activity/><div><b>Event debugger</b><small>{current?.domain}</small></div></div><button onClick={()=>setDebugOpen(false)}><X/></button></div>{debug.length?<div className="debug-event-list">{debug.slice(0,30).map((x:any,i:number)=><div className="developer-event-row" key={x.id||x.eventId||i}><code>{x.event||x.name||x.eventType||'event'}</code><span>{x.source||x.domain||'first-party'}</span><strong>{x.createdAt||x.occurredAt||x.timestamp?new Date(x.createdAt||x.occurredAt||x.timestamp).toLocaleString():'—'}</strong></div>)}</div>:<div className="empty-delivery-state"><Activity/><div><b>No recent events for this domain</b><small>The debugger does not inject synthetic events when no tracked data exists.</small></div></div>}</div></div>}</>
}
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
 const [selected,setSelected]=useState('')
 const [builder,setBuilder]=useState(false)
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const load=async()=>{try{const r:any=await api.offlineAttribution();setData(r);const rules=r.rules||[];setSelected((x:string)=>x&&rules.some((i:any)=>i.id===x)?x:(rules[0]?.id||''))}catch(e:any){setNotice(e?.message||'Offline attribution could not be loaded.')}}
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
 {live?.available&&<div className="app-panel"><div className="panel-head"><div><h3>Live identity coverage</h3><p>Persisted first-party acquisition evidence</p></div><span className="healthy">{live.activeClickSessions||0} active sessions</span></div><div className="site-detail-grid">{[['GCLID sessions',live.clickIdCoverage?.gclid||0],['FBCLID sessions',live.clickIdCoverage?.fbclid||0],['GBRAID / WBRAID',live.clickIdCoverage?.braid||0],['Assisted events',live.assistedEvents||0],['Matched events',live.matchedEvents||0],['Unmatched events',live.unmatchedEvents||0]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div></div>}
 {builder&&<div className="connector-modal"><form className="connector-card matchback-builder" onSubmit={create}><div className="connector-modal-head"><div><CircleDollarSign/><div><b>New matchback rule</b><small>Define how a verified downstream outcome should be reconciled.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Rule name<input name="name" required placeholder="Closed-won revenue"/></label><label>Source<input name="source" required placeholder="crm_billing"/></label><label>Event type<input name="eventType" required placeholder="closed_won"/></label><label>Destination<input name="destination" required placeholder="Google Ads"/></label><label>Identity method<input name="identityMethod" required placeholder="customer_id + click ID"/></label><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create matchback rule'}</button></form></div>}
 {unmatchedOpen&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><RadioTower/><div><b>Unmatched attribution review</b><small>Recent persisted events that could not be reconciled</small></div></div><button onClick={()=>setUnmatchedOpen(false)}><X/></button></div>{unmatched.length?<div className="debug-event-list">{unmatched.map((x:any)=><div className="developer-event-row" key={x.id}><code>{x.id}</code><span>{x.event_type} · {x.source||'unknown source'}</span><strong>{x.occurred_at?new Date(x.occurred_at).toLocaleString():'—'}</strong></div>)}</div>:<div className="empty-delivery-state"><CheckCircle2/><div><b>No recent unmatched events</b><small>The attribution store currently has no unmatched records in its recent window.</small></div></div>}</div></div>}</>
}
function POSAndStores(){
 const [data,setData]=useState<any>({locations:[],totals:{},recent:[]})
 const [selected,setSelected]=useState('')
 const [builder,setBuilder]=useState(false)
 const [busy,setBusy]=useState(false)
 const [notice,setNotice]=useState('')
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
    fbclid:row.fbclid||''
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
 const downloadTemplate=()=>{const csv='transaction_id,customer_id,email,phone,net_revenue,currency,occurred_at,gclid,fbclid\nTXN-001,cust_001,,,84000,INR,2026-09-25T10:00:00Z,,\n';const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ace-pos-import-template.csv';a.click();URL.revokeObjectURL(a.href)}
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
function Models(){
 const [data,setData]=useState<any>({items:[],runs:[]})
 const [selected,setSelected]=useState('')
 const [busy,setBusy]=useState('')
 const [validation,setValidation]=useState<any>(null)
 const [validationOpen,setValidationOpen]=useState(false)
 const [builder,setBuilder]=useState(false)
 const [notice,setNotice]=useState('')
 const load=()=>api.models().then((r:any)=>{setData(r);if(r.items?.length)setSelected((x:string)=>x&&r.items.some((m:any)=>m.name===x)?x:r.items[0].name)}).catch(()=>setData({items:[],runs:[]}))
 useEffect(()=>{load()},[])
 const current=(data.items||[]).find((x:any)=>x.name===selected)||data.items?.[0]
 const run=async()=>{if(!current)return;setBusy('run');setNotice('');try{const r:any=await api.runModel(current.name);setNotice('Model run completed for '+r.rowsScored+' profile(s), average score '+r.averageScore+'.');await load()}catch(e:any){setNotice(e?.message||'Model run failed.')}finally{setBusy('')}}
 const viewValidation=async()=>{if(!current)return;const r:any=await api.modelValidation(current.name).catch(()=>null);setValidation(r);setValidationOpen(true)}
 const create=async(e:any)=>{e.preventDefault();const fd=new FormData(e.currentTarget);setBusy('create');setNotice('');try{const r:any=await api.createModel({name:String(fd.get('name')||''),description:String(fd.get('description')||''),weights:{lead_score:Number(fd.get('lead_score')||0),journey_depth:Number(fd.get('journey_depth')||0),pricing_views:Number(fd.get('pricing_views')||0),whatsapp_engaged:Number(fd.get('whatsapp_engaged')||0),meeting_present:Number(fd.get('meeting_present')||0)}});setBuilder(false);setNotice('Custom model created.');await load();if(r?.item?.name)setSelected(r.item.name)}catch(err:any){setNotice(err?.message||'Custom model could not be created.')}finally{setBusy('')}}
 return <><PageHead crumb="Data / Models" title="Custom models" sub="Use transparent workspace scoring services backed by persisted customer and journey evidence." action="Create custom model" onAction={()=>setBuilder(true)}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="model-ops-layout"><div className="app-panel model-list"><div className="panel-head"><div><h3>Model catalog</h3><p>Built-in runtime models plus persisted workspace-defined scoring models</p></div></div>{(data.items||[]).length?(data.items||[]).map((x:any)=><button key={x.id||x.name} className={selected===x.name?'selected':''} onClick={()=>setSelected(x.name)}><Target/><div><b>{x.name}</b><small>{x.type} · {x.version}</small></div><span className={String(x.status||'ready').toLowerCase()}>{x.status}</span><ChevronRight/></button>):<div className="empty-delivery-state"><Target/><div><b>No model services available</b></div></div>}</div>
 <div className="app-panel model-detail">{current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.description}</p></div><span className={current.status==='active'?'healthy':'status'}>{current.status}</span></div><div className="model-metrics">{[['Version',current.version],['Primary metric',current.metric],['Current value',current.value],['Serving','Workspace scoring runtime']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1]??'—')}</b></div>)}</div>{!current.builtIn&&<div className="agent-section"><h4>Explainable feature weights</h4><div className="site-detail-grid">{Object.entries(current.weights||{}).map(([key,value])=><div key={key}><span>{key.replaceAll('_',' ')}</span><b>{String(value)}</b></div>)}</div></div>}<div className="approval-actions"><button onClick={viewValidation}>View validation</button><button className="approve" disabled={busy==='run'} onClick={run}><Target/>{busy==='run'?'Running…':'Run scoring snapshot'}</button></div></>:<div className="empty-delivery-state"><Target/><div><b>No model selected</b></div></div>}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recent model runs</h3><p>Persisted scoring snapshots</p></div></div>{(data.runs||[]).length?(data.runs||[]).slice(0,10).map((x:any)=><div className="developer-event-row" key={x.id}><b>{x.name}</b><span>{x.status} · {Number(x.rowsScored||0).toLocaleString('en-IN')} rows · avg {x.averageScore??'—'}</span><strong>{x.completedAt?new Date(x.completedAt).toLocaleString():'—'}</strong></div>):<div className="empty-delivery-state"><Activity/><div><b>No model runs yet</b></div></div>}</div>
 {builder&&<div className="connector-modal"><form className="connector-card" onSubmit={create}><div className="connector-modal-head"><div><Target/><div><b>Create custom scoring model</b><small>Define transparent feature weights over persisted first-party evidence.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Model name<input name="name" required placeholder="High-intent propensity"/></label><label>Description<textarea name="description" placeholder="Scores high-intent leads using journey and interaction evidence."/></label><div className="two-col"><label>Lead score weight<input name="lead_score" type="number" min="-100" max="100" defaultValue="40"/></label><label>Journey depth weight<input name="journey_depth" type="number" min="-100" max="100" defaultValue="20"/></label><label>Pricing views weight<input name="pricing_views" type="number" min="-100" max="100" defaultValue="20"/></label><label>WhatsApp engaged weight<input name="whatsapp_engaged" type="number" min="-100" max="100" defaultValue="10"/></label><label>Meeting present weight<input name="meeting_present" type="number" min="-100" max="100" defaultValue="10"/></label></div><div className="source-conflict-note"><ShieldCheck/><div><b>Explainability boundary</b><p>Scores use only the visible feature weights above. AceMarketing does not claim predictive accuracy until you validate the model against your own labelled outcomes.</p></div></div><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create custom model'}</button></form></div>}
 {validationOpen&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><Target/><div><b>Model validation evidence</b><small>{selected}</small></div></div><button onClick={()=>setValidationOpen(false)}><X/></button></div>{validation?<><div className="site-detail-grid">{[['Lead population',validation.leadPopulation??0],['Average lead score',validation.averageLeadScore??0],['Persisted model runs',validation.runs?.length||0],['Generated',validation.generatedAt?new Date(validation.generatedAt).toLocaleString():'—']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><div className="source-conflict-note"><ShieldCheck/><div><b>Validation boundary</b><p>{validation.notice}</p></div></div></>:<div className="empty-delivery-state"><Target/><div><b>No validation evidence available</b></div></div>}</div></div>}</>
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
function Planner(){
 const [budget,setBudget]=useState(2500000)
 const [data,setData]=useState<any>({available:false,channels:[],evidence:{},savedScenarios:[]})
 const [compare,setCompare]=useState(false)
 const [notice,setNotice]=useState('')
 const [saving,setSaving]=useState(false)
 const load=()=>api.planner().then((r:any)=>setData(r)).catch((e:any)=>setNotice(e?.message||'Planner evidence could not be loaded.'))
 useEffect(()=>{load()},[])
 const channels=data.channels||[]
 const totalShare=channels.reduce((n:number,x:any)=>n+Number(x.share||0),0)||1
 const normalized=channels.map((x:any)=>({...x,share:Number((Number(x.share||0)/totalShare*100).toFixed(1))}))
 const projected=normalized.reduce((s:number,x:any)=>s+(budget*(x.share/100)),0)
 const save=async()=>{if(!normalized.length)return;setSaving(true);setNotice('');try{const r:any=await api.savePlannerScenario({name:'Scenario '+new Date().toLocaleDateString(),budget,allocations:normalized.map((x:any)=>({source:x.name,share:x.share,evidence:x.evidence}))});setNotice('Scenario saved: '+r.id);await load()}catch(e:any){setNotice(e?.message||'Scenario could not be saved.')}finally{setSaving(false)}}
 const money=(n:any)=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})
 return <><PageHead crumb="Measurement / Planner" title="Strategic media planner" sub="Use persisted cohort, attribution and revenue evidence to build a human-approved budget scenario." action={saving?'Saving…':'Save scenario'} onAction={save}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="planner-budget"><div><span>Monthly media budget</span><strong>₹{(budget/100000).toFixed(1)}L</strong></div><input type="range" min="100000" max="10000000" step="100000" value={budget} onChange={e=>setBudget(Number(e.target.value))}/><small>Scenario total: ₹{(projected/100000).toFixed(1)}L</small></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Evidence-based allocation</h3><p>{data.available?data.notice:'Waiting for source-level cohort evidence'}</p></div><button onClick={()=>setCompare(x=>!x)} disabled={!data.available}>{compare?'Hide evidence':'Show evidence'}</button></div>
 {normalized.length?normalized.map((x:any)=><div className="planner-row" key={x.name}><div><b>{x.name}</b><small>{x.evidence==='revenue_contribution'?'Attributed revenue contribution':'Acquisition-volume contribution'}</small></div><div className="progress"><i style={{width:x.share+'%'}}/></div><strong>{x.share}%</strong><span>₹{((budget*x.share/100)/100000).toFixed(1)}L</span><em>{Number(x.conversionRate||0).toFixed(1)}% conversion</em><small>{money(x.revenue)} attributed revenue</small></div>):<div className="empty-delivery-state"><BarChart3/><div><b>Not enough evidence for a recommendation</b><small>Connect acquisition sources and record matched conversion/revenue events. AceMarketing will not invent CAC, quality scores or channel shares.</small></div></div>}
 {compare&&data.available&&<div className="source-conflict-note"><BarChart3/><div><b>Planning evidence</b><p>{data.evidence?.totalRevenue>0?'Weights use attributed revenue contribution from the last '+(data.evidence?.months||6)+' months.':'No attributed revenue is available, so weights use observed acquisition volume only.'}</p></div></div>}</div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Evidence boundary</h3><p>What is and is not used</p></div></div>{[['Acquisition source','Persisted click/cohort source'],['Conversions','Configured conversion events'],['Revenue','Matched assisted-event value'],['Spend / CAC','Not inferred without connected spend data'],['Approval','Human-controlled scenario save']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Scenario summary</h3><p>Current allocation only</p></div></div><div className="report-summary-grid">{[['Budget',money(budget)],['Sources',String(normalized.length)],['Observed acquired',Number(data.evidence?.totalAcquired||0).toLocaleString('en-IN')],['Observed attributed revenue',money(data.evidence?.totalRevenue||0)],['Allocation basis',data.evidence?.totalRevenue>0?'Revenue contribution':'Acquisition volume'],['Saved scenarios',String((data.savedScenarios||[]).length)]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="ai-note"><Sparkles/><div><b>Planner boundary</b><p>This planner is advisory. It does not change ad-platform budgets automatically; saved scenarios remain human-approved planning records.</p></div></div></div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Saved scenarios</h3><p>Persisted human planning decisions</p></div></div>{(data.savedScenarios||[]).length?(data.savedScenarios||[]).slice(0,8).map((x:any)=><div className="planning-decision-row" key={x.id}><CheckCircle2/><div><b>{x.name}</b><small>{x.createdAt?new Date(x.createdAt).toLocaleString():'—'}</small></div><strong>{money(x.budget)}</strong></div>):<div className="empty-delivery-state"><BarChart3/><div><b>No saved scenarios yet</b><small>Save a scenario after enough source evidence is available.</small></div></div>}</div></>
}
function Reports(){
 const [selected,setSelected]=useState('live')
 const [cohorts,setCohorts]=useState<any>({cohorts:[],sources:[],totals:null,eventDefinitions:null})
 const [delivery,setDelivery]=useState<any>({items:[],deliveries:[],configured:false})
 const [reportBusy,setReportBusy]=useState('')
 const loadDelivery=()=>api.reportSchedules().then((r:any)=>setDelivery(r)).catch(()=>null)
 useEffect(()=>{api.cohorts(6).then((r:any)=>setCohorts(r)).catch(()=>null);loadDelivery()},[])
 const rows=cohorts.cohorts||[]
 const latest=rows[rows.length-1]||{}
 const money=(n:any)=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})
 const reportRows=[
  {id:'live',name:'Cohort Performance',cadence:'Live',audience:'Workspace',status:'active',live:true},
  ...(delivery.items||[]).map((x:any)=>({id:x.id,name:x.name,cadence:x.cadence,audience:(x.recipients||[]).join(', '),status:x.last_status||'scheduled',live:false,raw:x}))
 ]
 const currentReport=reportRows.find((x:any)=>x.id===selected)||reportRows[0]
 const createSchedule=async(e:any)=>{e.preventDefault();const f=new FormData(e.currentTarget);setReportBusy('save');try{const saved:any=await api.saveReportSchedule({name:String(f.get('name')||'Cohort Performance'),recipients:String(f.get('recipients')||''),cadence:String(f.get('cadence')||'weekly'),lookbackMonths:Number(f.get('lookbackMonths')||6)});await loadDelivery();if(saved?.id)setSelected(saved.id)}finally{setReportBusy('')}}
 const runNow=async(id:string)=>{setReportBusy(id);try{await api.runReportNow(id);await loadDelivery()}finally{setReportBusy('')}}
 return <><PageHead crumb="Measurement / Reports" title="Cohort & automated reports" sub="Turn stitched journey and attribution data into recurring decision-ready reports." action="New report" onAction={()=>document.getElementById('report-schedule-form')?.scrollIntoView({behavior:'smooth',block:'center'})}/>
 <div className="stats-grid"><Stat label="Acquired" value={Number(cohorts.totals?.acquired||0).toLocaleString('en-IN')} sub="Across cohort lookback" Icon={UsersRound}/><Stat label="Conversions" value={Number(cohorts.totals?.conversions||0).toLocaleString('en-IN')} sub={(cohorts.totals?.conversionRate||0)+'% conversion rate'} Icon={Target}/><Stat label="Attributed revenue" value={money(cohorts.totals?.revenue)} sub="Matched conversion events" Icon={CircleDollarSign}/><Stat label="Revenue / acquired" value={money(cohorts.totals?.revenuePerAcquired)} sub="Quality-adjusted cohort value" Icon={Activity}/></div>
 <div className="reports-layout"><div className="app-panel report-list"><div className="panel-head"><div><h3>Reports</h3><p>Only live analytics and persisted schedules are shown</p></div></div>{reportRows.map((r:any)=><button key={r.id} className={selected===r.id?'selected':''} onClick={()=>setSelected(r.id)}><BarChart3/><div><b>{r.name}</b><small>{r.cadence} · {r.audience||'Workspace'}</small></div><span className={String(r.status||'scheduled').toLowerCase()}>{r.status}</span><ChevronRight/></button>)}</div>
 <div className="app-panel report-preview">{currentReport?.live?<><div className="panel-head"><div><h3>{currentReport.name}</h3><p>{cohorts.available?'Persisted click + matched offline event cohorts':'Waiting for cohort data'}</p></div><span className="status">{cohorts.lookbackMonths||6} months</span></div><div className="report-summary-grid">{[['Latest cohort size',latest.acquired||0],['Qualified rate',(latest.qualifiedRate||0)+'%'],['Consultation rate',(latest.consultationRate||0)+'%'],['Conversion rate',(latest.conversionRate||0)+'%'],['Revenue / acquired',money(latest.revenuePerAcquired)],['Attributed revenue',money(latest.revenue)]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><div className="report-insight"><Sparkles/><div><b>Measurement definition</b><p>Conversion stages are configured from deployment event definitions, not inferred from marketing copy. Current conversion events: {(cohorts.eventDefinitions?.conversion||[]).join(', ')||'not loaded'}.</p></div></div></>:<><div className="panel-head"><div><h3>{currentReport?.name||'Scheduled report'}</h3><p>Persisted automated cohort-report schedule</p></div><span className="status">{currentReport?.status||'scheduled'}</span></div><div className="report-summary-grid">{[['Cadence',currentReport?.raw?.cadence||'—'],['Recipients',(currentReport?.raw?.recipients||[]).join(', ')||'—'],['Lookback',String(currentReport?.raw?.lookback_months||6)+' months'],['Next run',currentReport?.raw?.next_run_at?new Date(currentReport.raw.next_run_at).toLocaleString():'—'],['Last run',currentReport?.raw?.last_run_at?new Date(currentReport.raw.last_run_at).toLocaleString():'Never'],['Last status',currentReport?.raw?.last_status||'scheduled']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div><div className="approval-actions"><button className="approve" disabled={!currentReport?.id||reportBusy===currentReport.id} onClick={()=>currentReport?.id&&runNow(currentReport.id)}><BarChart3/>{reportBusy===currentReport?.id?'Queueing…':'Send report now'}</button></div></>}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Cohort performance</h3><p>First-acquisition month → qualified, consultation, conversion and attributed revenue</p></div><span className="healthy">Live data</span></div><table><thead><tr><th>Cohort</th><th>Acquired</th><th>Qualified</th><th>Consultation</th><th>Conversion</th><th>Revenue</th><th>Revenue / acquired</th></tr></thead><tbody>{rows.length?rows.map((r:any)=><tr key={String(r.month)}><td>{new Date(r.month).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</td><td>{Number(r.acquired).toLocaleString('en-IN')}</td><td>{r.qualifiedRate}%</td><td>{r.consultationRate}%</td><td>{r.conversionRate}%</td><td>{money(r.revenue)}</td><td>{money(r.revenuePerAcquired)}</td></tr>):<tr><td colSpan={7}>No matched cohort data yet. Tracking sessions and assisted conversion events will populate this view.</td></tr>}</tbody></table></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Automated email reports</h3><p>Persisted schedules delivered through the durable worker</p></div><span className={delivery.configured?'healthy':'warning'}>{delivery.configured?'SMTP ready':'SMTP not configured'}</span></div>
 <form id="report-schedule-form" className="setup-form-grid" onSubmit={createSchedule}><label><span>Report name</span><input name="name" defaultValue="Weekly Cohort Performance"/></label><label><span>Recipients</span><input name="recipients" placeholder="growth@company.com, leadership@company.com" required/></label><label><span>Cadence</span><select name="cadence"><option value="daily">Daily</option><option value="weekly" selected>Weekly</option><option value="monthly">Monthly</option></select></label><label><span>Lookback months</span><input name="lookbackMonths" type="number" min="1" max="36" defaultValue="6"/></label><button className="app-primary" disabled={!!reportBusy} type="submit">{reportBusy==='save'?'Saving…':'Create schedule'}</button></form>
 {(delivery.items||[]).map((x:any)=><div className="setting-line" key={x.id}><div><b>{x.name}</b><small>{(x.recipients||[]).join(', ')}</small></div><span>{x.cadence}</span><b>{x.last_status}</b><button disabled={reportBusy===x.id} onClick={()=>runNow(x.id)}>{reportBusy===x.id?'Queueing…':'Send now'}</button></div>)}
 <h4>Recent deliveries</h4>{(delivery.deliveries||[]).slice(0,6).map((x:any)=><div className="audit-row" key={x.id}><BarChart3/><div><b>{x.subject||'Cohort report'}</b><small>{x.status} · {(x.recipients||[]).length} recipient(s)</small></div><span>{new Date(x.queued_at).toLocaleString()}</span></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Source quality</h3><p>Acquisition source ranked by downstream value</p></div></div>{(cohorts.sources||[]).slice(0,8).map((x:any)=><div className="planning-row" key={x.source}><span>{x.source}</span><b>{x.conversionRate}% conversion</b><small>{Number(x.acquired).toLocaleString('en-IN')} acquired</small><strong>{money(x.revenue)}</strong></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Data contract</h3><p>Events that define each cohort stage</p></div></div>{[['Qualified',cohorts.eventDefinitions?.qualified],['Consultation',cohorts.eventDefinitions?.consultation],['Conversion',cohorts.eventDefinitions?.conversion]].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{(x[1]||[]).join(', ')||'Not configured'}</b></div>)}</div></div></>
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
 const load=()=>api.agents().then((r:any)=>{setData(r);if(r.items?.length)setSelected((x:string)=>x&&r.items.some((i:any)=>i.name===x)?x:r.items[0].name)}).catch(()=>setData({items:[],runs:[],configured:0,custom:0}))
 useEffect(()=>{load()},[])
 const current=(data.items||[]).find((x:any)=>x.name===selected)||data.items?.[0]
 const openOperation=()=>{if(current?.operationTab)window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:current.operationTab}))}
 const createCustom=async(e:any)=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setNotice('');try{const created:any=await api.createAgent({name:String(f.get('name')||''),trigger:String(f.get('trigger')||''),action:String(f.get('action')||''),requiresApproval:String(f.get('approval'))!=='Auto-run low risk'});setBuilder(false);setNotice(created?.status==='pending_approval'?'Custom agent created and sent to Approvals.':'Custom agent created and activated.');await load();if(created?.name)setSelected(created.name)}catch(err:any){setNotice(err?.message||'Custom agent could not be created.')}finally{setBusy(false)}}
 const testAgent=async()=>{if(!current?.id)return;setBusy(true);setNotice('');setTestResult(null);try{const r:any=await api.testCustomAgent({id:current.id,leadRef:testDraft.leadRef,context:{score:Number(testDraft.score||0),source:testDraft.source,destination:testDraft.destination}});setTestResult(r);setNotice('Custom agent test completed and persisted as an agent run.');setTestOpen(false);await load()}catch(err:any){setNotice(err?.status===409?(err?.message||'Agent requires approval before it can run.'):(err?.message||'Custom agent test failed.'))}finally{setBusy(false)}}
 const goApprovals=()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Approvals'}))
 const currentRuns=(data.runs||[]).filter((x:any)=>current?.type!=='custom'||String(x.agent_type||x.agentType||'').includes(current.id))
 return <><PageHead crumb="Automation / Agents" title="Agent operations" sub="Deploy and govern specialist agents using the same stitched customer context." action="Build custom agent" onAction={()=>setBuilder(true)}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Built-in agents" value={String((data.items||[]).filter((x:any)=>x.type==='built_in').length)} sub="Current built-in catalog" Icon={Bot}/><Stat label="Configured" value={String(data.configured||0)} sub="Backed by current workspace prerequisites" Icon={CheckCircle2}/><Stat label="Custom agents" value={String(data.custom||0)} sub="Persisted custom definitions" Icon={Layers3}/><Stat label="Recent runs" value={String((data.runs||[]).length)} sub="Persisted agent execution records" Icon={Activity}/></div>
 <div className="agent-ops-layout"><div className="app-panel agent-selector"><div className="panel-head"><div><h3>Agent library</h3><p>Built-in and custom agents</p></div><button onClick={load}>Refresh</button></div>{(data.items||[]).map((x:any)=><button key={x.id||x.name} className={selected===x.name?'selected':''} onClick={()=>{setSelected(x.name);setTestResult(null)}}><Bot/><div><b>{x.name}</b><small>{x.type==='custom'?(x.action||'Custom workflow'):'Built-in capability'}</small></div><span className={x.status==='configured'||x.status==='active'?'active-agent':''}>{String(x.status||'available').replaceAll('_',' ')}</span><ChevronRight/></button>)}</div>
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
 const [notice,setNotice]=useState('')
 const load=()=>api.routing().then((r:any)=>{setData(r);if(r.rules?.length)setSelected((x:string)=>x&&r.rules.some((i:any)=>i.id===x)?x:r.rules[0].id)}).catch(()=>setData({rules:[],recent:[],stats:{},destinationLoad:[]}))
 useEffect(()=>{load()},[])
 const current=(data.rules||[]).find((x:any)=>x.id===selected)||data.rules?.[0]
 const route=async()=>{if(!current)return;setBusy('test');setNotice('');try{const r:any=await api.testRoutingRule(current.id);setNotice('Test routed to '+r.destination+' using '+r.rule+'.');await load()}catch(e:any){setNotice(e?.message||'Routing test failed.')}finally{setBusy('')}}
 const create=async(e:any)=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy('create');setNotice('');try{const r:any=await api.createRoutingRule({name:String(f.get('name')||''),when:String(f.get('when')||''),destination:String(f.get('destination')||''),slaSeconds:Number(f.get('slaSeconds')||600),priority:String(f.get('priority')||'Custom')});setBuilder(false);setNotice('Routing rule created.');await load();if(r?.item?.id)setSelected(r.item.id)}catch(err:any){setNotice(err?.message||'Routing rule could not be created.')}finally{setBusy('')}}
 const toggle=async()=>{if(!current||current.builtIn)return;setBusy('toggle');setNotice('');try{await api.toggleRoutingRule(current.id,current.status==='paused');setNotice(current.status==='paused'?'Routing rule enabled.':'Routing rule paused.');await load()}catch(e:any){setNotice(e?.message||'Routing rule status could not be changed.')}finally{setBusy('')}}
 const stats=data.stats||{}
 const maxLoad=Math.max(1,...(data.destinationLoad||[]).map((x:any)=>Number(x.count||0)))
 return <><PageHead crumb="Conversion / Routing" title="Lead routing" sub="Route each lead to the right sales queue using persisted workspace rules and stitched customer context." action="New routing rule" onAction={()=>setBuilder(true)}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Routed today" value={String(stats.routedToday||0)} sub="Persisted routing decisions" Icon={Network}/><Stat label="Decision history" value={String(stats.totalDecisions||0)} sub="Recent persisted decisions" Icon={Activity}/><Stat label="Destinations used" value={String(stats.destinations||0)} sub="Observed routing queues" Icon={CheckCircle2}/><Stat label="Rules matched" value={String(stats.matchedRules||0)} sub="Observed rule names" Icon={UsersRound}/></div>
 <div className="routing-layout"><div className="app-panel routing-list"><div className="panel-head"><div><h3>Routing rules</h3><p>Built-in templates plus persisted workspace rules</p></div><button onClick={()=>setBuilder(true)}><Plus/>Add rule</button></div>{(data.rules||[]).map((x:any)=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><Network/><div><b>{x.name}</b><small>{x.when}</small></div><span>{x.priority}</span><em className={x.status}>{x.status}</em><ChevronRight/></button>)}</div>
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
 const load=()=>api.followUps().then((r:any)=>{const mapped=(r.items||[]).map((x:any)=>({id:x.id,lead:x.lead_ref,reason:x.reason,channel:x.channel,due:x.due_at?new Date(x.due_at).toLocaleString():'—',priority:String(x.priority||'medium').replace(/^./,(m:string)=>m.toUpperCase()),status:x.status==='completed'?'Completed':'Open',owner:x.owner||'—',createdAt:x.created_at,completedAt:x.completed_at}));setItems(mapped);setStats(r.stats||{});if(mapped.length)setSelected((v:string)=>v&&mapped.some((x:any)=>x.id===v)?v:mapped[0].id);else setSelected('')}).catch(()=>{setItems([]);setStats({})})
 useEffect(()=>{load()},[])
 const current=items.find(x=>x.id===selected)
 const complete=async(id:string)=>{setBusy('complete');try{await api.completeFollowUp(id);await load()}finally{setBusy('')}}
 const create=async(e:any)=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy('create');try{await api.createFollowUp({leadRef:String(f.get('leadRef')||''),reason:String(f.get('reason')||''),channel:String(f.get('channel')||'WhatsApp'),priority:String(f.get('priority')||'medium'),delayMinutes:Number(f.get('delayMinutes')||15),owner:String(f.get('owner')||'Assigned counsellor')});setBuilder(false);await load()}finally{setBusy('')}}
 const openJourney=async()=>{if(!current)return;const r:any=await api.journeys().catch(()=>({items:[]}));const hit=(r.items||[]).find((x:any)=>String(x.lead||'').toLowerCase()===String(current.lead||'').toLowerCase())||null;setJourneyRecord(hit);setJourneyOpen(true)}
 const reactivate=async(candidate:any)=>{setBusy('reactivate:'+candidate.leadRef);setNotice('');try{await api.runLeadReactivation({leadRef:candidate.leadRef,dormantDays,recentDays,channel:'WhatsApp',priority:'high',delayMinutes:5,owner:'Reactivation queue'});setNotice('Reactivation follow-up created from renewed intent evidence.');await load();await loadReactivation()}catch(err:any){setNotice(err?.message||'Lead reactivation could not be created.')}finally{setBusy('')}}
 return <><PageHead crumb="Conversion / Follow-ups" title="Follow-up operations" sub="Keep qualified leads from going cold by turning stalled journey states and renewed intent into prioritized next actions." action="Create follow-up" onAction={()=>setBuilder(true)}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Open follow-ups" value={String(stats.open||0)} sub="Current persisted queue" Icon={MessageCircle}/><Stat label="Completed today" value={String(stats.completedToday||0)} sub="Persisted completions" Icon={CheckCircle2}/><Stat label="Completed total" value={String(stats.completedTotal||0)} sub="Current retained history" Icon={Target}/><Stat label="Overdue" value={String(stats.overdue||0)} sub="Open tasks past due" Icon={Activity}/></div>
 <div className="followup-layout"><div className="app-panel followup-list"><div className="panel-head"><div><h3>Follow-up queue</h3><p>Persisted tasks ordered by due time</p></div><button onClick={load}>Refresh</button></div>{items.length?items.map(x=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><MessageCircle/><div><b>{x.lead}</b><small>{x.reason}</small></div><span className={x.priority.toLowerCase()}>{x.priority}</span><em>{x.due}</em><ChevronRight/></button>):<div className="empty-delivery-state"><MessageCircle/><div><b>No follow-ups yet</b><small>Create a follow-up or let an agent create one from journey state.</small></div></div>}</div>
 <div className="app-panel followup-detail">{current?<><div className="panel-head"><div><h3>{current.lead}</h3><p>{current.reason}</p></div><span className={current.status==='Completed'?'healthy':'status'}>{current.status}</span></div><div className="site-detail-grid">{[['Recommended channel',current.channel],['Due',current.due],['Priority',current.priority],['Owner',current.owner],['Created',current.createdAt?new Date(current.createdAt).toLocaleString():'—'],['Completed',current.completedAt?new Date(current.completedAt).toLocaleString():'—']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div>{current.status!=='Completed'?<div className="approval-actions"><button onClick={openJourney}>Open journey</button><button className="approve" disabled={busy==='complete'} onClick={()=>complete(current.id)}><Check/>{busy==='complete'?'Completing…':'Mark completed'}</button></div>:<div className="approval-final approved"><Check/><b>Follow-up completed</b></div>}</>:<div className="empty-delivery-state"><MessageCircle/><div><b>Select or create a follow-up</b></div></div>}</div></div>
 <div className="app-panel reactivation-panel"><div className="panel-head"><div><h3>Lead Reactivation agent</h3><p>Detect dormant leads that recently returned with high-intent first-party behavior.</p></div><div className="reactivation-controls"><label><span>Dormant</span><select aria-label="Reactivation dormant window" value={dormantDays} onChange={e=>setDormantDays(Number(e.target.value))}><option value={14}>14+ days</option><option value={30}>30+ days</option><option value={60}>60+ days</option><option value={90}>90+ days</option></select></label><label><span>Renewed intent</span><select aria-label="Reactivation recent window" value={recentDays} onChange={e=>setRecentDays(Number(e.target.value))}><option value={1}>Last 24h</option><option value={3}>Last 3 days</option><option value={7}>Last 7 days</option><option value={14}>Last 14 days</option></select></label><button onClick={loadReactivation}>Refresh</button></div></div>
 <div className="reactivation-summary"><div><b>{reactivation.stats?.candidates||0}</b><span>eligible leads</span></div><p>A lead must have an older persisted last activity and then produce a recent pricing, checkout, booking, consultation, purchase, demo or sales-intent event tied to the same customer or device. Existing open reactivation tasks are excluded.</p></div>
 <div className="reactivation-grid">{(reactivation.items||[]).length?(reactivation.items||[]).map((x:any)=><article key={x.leadRef}><div className="reactivation-card-head"><RefreshCw/><div><b>{x.name}</b><small>{x.source||'Unknown source'}{x.campaign?' · '+x.campaign:''}</small></div><span>{x.dormantDays}d dormant</span></div><div className="reactivation-signal"><span>Renewed signal</span><b>{String(x.renewedEvent||'').replaceAll('_',' ')}</b><small>{x.renewedAt?new Date(x.renewedAt).toLocaleString():'—'} · {x.renewedSource||'First-party'}</small></div><div className="reactivation-card-actions"><div><span>Grade {x.grade||'—'}</span><span>Score {x.score||0}</span></div><button className="approve" disabled={busy==='reactivate:'+x.leadRef} onClick={()=>reactivate(x)}>{busy==='reactivate:'+x.leadRef?'Creating…':'Create reactivation follow-up'}<ArrowRight/></button></div></article>):<div className="empty-delivery-state"><RefreshCw/><div><b>No renewed dormant leads right now</b><small>The agent only surfaces evidence-backed reactivation candidates.</small></div></div>}</div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Follow-up policy examples</h3><p>Use custom agents or workflows to create these tasks</p></div></div>{[['Qualified, no booking','15 min'],['Meeting no-show','15 min'],['Pricing objection','Immediate'],['High-intent revisit','5 min'],['Call no-answer','2 hours'],['CRM stage stale','24 hours']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="app-panel"><div className="panel-head"><div><h3>Queue state</h3><p>Current persisted task outcomes</p></div></div>{[['Open',stats.open||0],['Completed today',stats.completedToday||0],['Completed total',stats.completedTotal||0],['Overdue',stats.overdue||0]].map(x=><div className="developer-event-row" key={x[0]}><b>{x[0]}</b><span>Follow-up tasks</span><strong>{String(x[1])}</strong></div>)}</div></div>
 {builder&&<div className="connector-modal"><form className="connector-card" onSubmit={create}><div className="connector-modal-head"><div><MessageCircle/><div><b>Create follow-up</b><small>Persist a manual next action.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Lead reference<input name="leadRef" required placeholder="customer_123"/></label><label>Reason<input name="reason" required placeholder="Qualified but consultation not booked"/></label><label>Channel<select name="channel"><option>WhatsApp</option><option>Voice</option><option>Email</option><option>Counsellor call</option></select></label><label>Priority<select name="priority"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><label>Delay minutes<input name="delayMinutes" type="number" min="0" defaultValue="15"/></label><label>Owner<input name="owner" defaultValue="Assigned counsellor"/></label><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create follow-up'}</button></form></div>}
 {journeyOpen&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><Network/><div><b>Journey context</b><small>{current?.lead}</small></div></div><button onClick={()=>setJourneyOpen(false)}><X/></button></div>{journeyRecord?<div className="site-detail-grid">{[['Lead',journeyRecord.lead],['Source',journeyRecord.source],['Stage',journeyRecord.stage],['Touchpoints',journeyRecord.touchpoints],['Duration',journeyRecord.duration]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1]??'—')}</b></div>)}</div>:<div className="empty-delivery-state"><Network/><div><b>No persisted journey found</b><small>This follow-up remains valid, but the journey endpoint has no matching lead record.</small></div></div>}</div></div>}</>
}
function Calls(){
 const [calls,setCalls]=useState<any[]>([])
 const [tracked,setTracked]=useState<any[]>([])
 const [selected,setSelected]=useState('')
 const [scheduleAt,setScheduleAt]=useState('')
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const [builder,setBuilder]=useState(false)
 const load=async()=>{
  const [runs,events]:any=await Promise.all([api.qualificationCalls().catch(()=>({items:[]})),api.callEvents().catch(()=>({items:[]}))])
  const mapped=(runs.items||[]).map((x:any)=>({id:x.id,kind:'agent',lead:x.lead,source:x.source,agent:x.agent,status:String(x.status).replace('_',' '),duration:x.duration,intent:x.intent||0,next:x.next,attempts:x.attempts,lastError:x.lastError,createdAt:x.createdAt}))
  const trackedRows=(events.items||[]).map((x:any)=>({id:x.id,kind:'tracked',lead:x.customerId||x.from||'Caller',source:x.source||x.provider||'Telephony',agent:'Call Tracking Events',status:String(x.status||'completed').replace('_',' '),duration:x.durationSeconds?x.durationSeconds+'s':'—',intent:0,next:x.disposition||'Attribution captured',provider:x.provider,startedAt:x.startedAt,from:x.from,to:x.to,campaign:x.campaign,keyword:x.keyword,creative:x.creative,adGroup:x.adGroup,gclid:x.gclid,fbclid:x.fbclid,msclkid:x.msclkid}))
  setCalls(mapped);setTracked(trackedRows)
  const first=mapped[0]?.id||trackedRows[0]?.id||''
  setSelected(x=>x&&[...mapped,...trackedRows].some((r:any)=>r.id===x)?x:first)
 }
 useEffect(()=>{load()},[])
 const rows=[...calls,...tracked]
 const current=rows.find(x=>x.id===selected)||rows[0]
 const retry=async(id:string)=>{
  setBusy('retry:'+id);setNotice('')
  try{await api.retryQualificationCall(id);setNotice('Qualification call re-queued through the durable agent worker.');await load()}
  catch(e:any){setNotice(e?.message||'Call retry failed.')}
  finally{setBusy('')}
 }
 const schedule=async()=>{
  if(!current||!scheduleAt)return
  setBusy('schedule');setNotice('')
  try{
   const startsAt=new Date(scheduleAt).toISOString()
   await api.createMeeting({leadRef:current.lead,startsAt,owner:'Unassigned',reminderPlan:['voice'],attendeePhone:current.from||'',syncCalendar:true})
   setNotice('Consultation created. It is now available in Meetings for reminder operations.')
   setScheduleAt('')
  }catch(e:any){setNotice(e?.message||'Meeting could not be created.')}
  finally{setBusy('')}
 }
 const createQualification=async(e:any)=>{
  e.preventDefault();const fd=new FormData(e.currentTarget);setBusy('create');setNotice('')
  try{
   const r:any=await api.createQualificationCall({
    lead:String(fd.get('lead')||''),
    leadRef:String(fd.get('lead')||''),
    phone:String(fd.get('phone')||''),
    source:String(fd.get('source')||'Workspace'),
    intent:Number(fd.get('intent')||0),
    trigger:String(fd.get('trigger')||'manual_qualification')
   })
   setBuilder(false);setNotice('Qualification call queued through the durable voice-agent worker'+(r?.id?' · '+String(r.id).slice(0,18):'')+'.');await load();if(r?.id)setSelected(r.id)
  }catch(err:any){setNotice(err?.message||'Qualification call could not be queued.')}finally{setBusy('')}
 }
 const connected=tracked.filter(x=>['answered','completed','connected','qualified'].includes(String(x.status).toLowerCase())).length
 const qualified=calls.filter(x=>String(x.status).toLowerCase().includes('succeed')||String(x.status).toLowerCase().includes('qualified')).length
 const coverage=(field:string)=>tracked.length?Math.round(tracked.filter((x:any)=>Boolean(x[field])).length/tracked.length*100):0
 const clickCoverage=tracked.length?Math.round(tracked.filter((x:any)=>x.gclid||x.fbclid||x.msclkid).length/tracked.length*100):0
 return <><PageHead crumb="Conversion / Calls" title="Voice qualification & call tracking" sub="Run qualification agents and ingest signed telephony events into lead context and offline attribution." action="Start qualification" onAction={()=>setBuilder(true)}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Qualification runs" value={String(calls.length)} sub="Persisted agent executions" Icon={PhoneIncoming}/><Stat label="Tracked call events" value={String(tracked.length)} sub="Signed telephony webhook events" Icon={PhoneCall}/><Stat label="Connected tracked calls" value={String(connected)} sub="Answered / completed outcomes" Icon={Activity}/><Stat label="Qualified runs" value={String(qualified)} sub="Successful qualification outcomes" Icon={Target}/></div>
 <div className="call-attribution-strip"><article><span>Campaign coverage</span><b>{coverage('campaign')}%</b><small>Tracked calls with campaign context</small></article><article><span>Keyword coverage</span><b>{coverage('keyword')}%</b><small>Search/call keyword captured</small></article><article><span>Creative coverage</span><b>{coverage('creative')}%</b><small>Ad creative/name available</small></article><article><span>Click-ID coverage</span><b>{clickCoverage}%</b><small>GCLID / FBCLID / MSCLKID present</small></article></div>
 <div className="call-ops-layout"><div className="app-panel call-list"><div className="panel-head"><div><h3>Recent call activity</h3><p>Agent runs plus provider call-tracking events</p></div><div className="panel-actions"><button onClick={load}>Refresh</button><button onClick={()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Agents'}))}>Configure agent</button></div></div>{rows.length?rows.map(x=><button key={x.kind+':'+x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><PhoneIncoming/><div><b>{x.lead}</b><small>{x.source} · {x.duration}</small></div><span>{x.status}</span><ChevronRight/></button>):<div className="empty-delivery-state"><PhoneIncoming/><div><b>No calls recorded yet</b><small>Qualification runs and signed telephony events will appear here.</small></div></div>}</div>
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
 const [notice,setNotice]=useState('')
 const [newTime,setNewTime]=useState('')
 const [builder,setBuilder]=useState(false)
 const load=async()=>{
  try{
   const r:any=await api.meetings()
   const mapped=(r.items||[]).map((x:any)=>({id:x.id,lead:x.lead_ref,time:new Date(x.starts_at).toLocaleString(),startsAt:x.starts_at,owner:x.owner,status:String(x.status||'confirmed').replace(/^./,(m:string)=>m.toUpperCase()),reminder:(x.reminder_plan||[]).join(' + ')||'Voice',risk:String(x.no_show_risk||'low').replace(/^./,(m:string)=>m.toUpperCase()),remindersSent:Number(x.reminders_sent||0),lastReminderAt:x.last_reminder_at,calendarId:x.external_calendar_id||'',meetingLink:x.meeting_link||'',calendarHtmlLink:x.calendar_html_link||'',attendeeEmail:x.attendee_email||'',attendeePhone:x.attendee_phone||''}))
   setMeetings(mapped)
   setSelected(x=>x&&mapped.some((m:any)=>m.id===x)?x:(mapped[0]?.id||''))
  }catch(e:any){setNotice(e?.message||'Meetings could not be loaded.')}
 }
 useEffect(()=>{load()},[])
 const current=meetings.find(x=>x.id===selected)||meetings[0]
 const create=async(e:any)=>{
  e.preventDefault();const fd=new FormData(e.currentTarget);setBusy('create');setNotice('')
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
   setBuilder(false);setNotice(r?.calendar?.externalId?'Meeting scheduled and synced to Google Calendar.':'Meeting scheduled.');await load();if(r?.id)setSelected(r.id)
  }catch(err:any){setNotice(err?.message||'Meeting could not be scheduled.')}finally{setBusy('')}
 }
 const remind=async(id:string)=>{
  setBusy('remind');setNotice('')
  try{await api.sendMeetingReminder(id);setNotice('Reminder queued through the configured reminder provider.');await load()}
  catch(e:any){setNotice(e?.message||'Reminder could not be queued.')}
  finally{setBusy('')}
 }
 const connectCalendar=async()=>{
  setBusy('calendar');setNotice('')
  try{
   const r:any=await api.connectIntegration('Google Calendar')
   if(r.status==='authorization_required'&&r.authorizationUrl){window.location.assign(r.authorizationUrl);return}
   if(r.status==='connected')setNotice('Google Calendar is connected.')
   else setNotice('Google Calendar OAuth credentials need to be configured on the backend.')
  }catch(e:any){setNotice(e?.message||'Google Calendar connection could not be started.')}
  finally{setBusy('')}
 }
 const reschedule=async()=>{
  if(!current||!newTime)return
  setBusy('reschedule');setNotice('')
  try{await api.rescheduleMeeting(current.id,new Date(newTime).toISOString());setNotice('Meeting rescheduled and calendar attendees updated.');setNewTime('');await load()}
  catch(e:any){setNotice(e?.message||'Meeting could not be rescheduled.')}
  finally{setBusy('')}
 }
 const upcoming=meetings.filter(x=>Date.parse(x.startsAt)>=Date.now()).length
 const withCalendar=meetings.filter(x=>x.calendarId).length
 const reminders=meetings.reduce((n,x)=>n+Number(x.remindersSent||0),0)
 const highRisk=meetings.filter(x=>['high','medium'].includes(String(x.risk).toLowerCase())).length
 return <><PageHead crumb="Conversion / Meetings" title="Scheduler & meeting reminders" sub="Book qualified leads, synchronize Google Calendar in real time and reduce no-shows with provider-backed reminders." action="Schedule meeting" onAction={()=>setBuilder(true)}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Upcoming meetings" value={String(upcoming)} sub="Persisted scheduled consultations" Icon={CalendarDays}/><Stat label="Calendar synced" value={String(withCalendar)} sub="Meetings with external event IDs" Icon={CheckCircle2}/><Stat label="No-show risk" value={String(highRisk)} sub="High / medium risk meetings" Icon={Activity}/><Stat label="Reminders sent" value={String(reminders)} sub="Persisted reminder executions" Icon={MessageCircle}/></div>
 <div className="meeting-layout"><div className="app-panel meeting-list"><div className="panel-head"><div><h3>Upcoming consultations</h3><p>Persisted calendar + reminder state</p></div><div className="panel-actions"><button onClick={load}>Refresh</button><button onClick={connectCalendar} disabled={busy==='calendar'}>{busy==='calendar'?'Connecting…':'Connect Calendar'}</button></div></div>{meetings.length?meetings.map(x=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><CalendarDays/><div><b>{x.lead}</b><small>{x.time} · {x.owner}</small></div><span className={x.risk.toLowerCase()}>{x.risk} risk</span><ChevronRight/></button>):<div className="empty-delivery-state"><CalendarDays/><div><b>No meetings scheduled yet</b><small>Schedule one from Calls or connect Google Calendar and create a consultation.</small></div></div>}</div>
 {current?<div className="app-panel meeting-detail"><div className="panel-head"><div><h3>{current.lead}</h3><p>{current.time}</p></div><span className="status">{current.status}</span></div><div className="meeting-info-grid">{[['Owner',current.owner],['Reminder plan',current.reminder],['No-show risk',current.risk],['Calendar',current.calendarId?'Google Calendar synced':'Not synced'],['Attendee',current.attendeeEmail||current.attendeePhone||'Not provided'],['Meeting link',current.meetingLink?'Available':'—'],['Reminders sent',String(current.remindersSent||0)],['Last reminder',current.lastReminderAt?new Date(current.lastReminderAt).toLocaleString():'—']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div>
 <div className="meeting-reminder-flow">{[['T−24h','Primary reminder'],['T−3h','Follow-up reminder'],['T−30m','Final confirmation'],['T+15m','No-show recovery if needed']].map((x,i)=><div key={x[0]}><span>{i+1}</span><div><b>{x[0]}</b><small>{x[1]}</small></div></div>)}</div>
 <div className="call-schedule-box"><label>New meeting time<input type="datetime-local" value={newTime} onChange={e=>setNewTime(e.target.value)}/></label><button disabled={!newTime||busy==='reschedule'} onClick={reschedule}>{busy==='reschedule'?'Updating…':'Reschedule'}</button></div>
 <div className="approval-actions"><button className="approve" disabled={busy==='remind'} onClick={()=>remind(current.id)}><MessageCircle/>{busy==='remind'?'Queuing…':'Send reminder now'}</button></div></div>:<div className="app-panel meeting-detail"><div className="empty-delivery-state"><CalendarDays/><div><b>Select a meeting</b><small>Calendar and reminder operations appear here.</small></div></div></div>}</div>
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
 const [notice,setNotice]=useState('')
 const [routed,setRouted]=useState<any>(null)
 const load=()=>api.feedback().then((r:any)=>setData(r)).catch(()=>setData({items:[],stats:{},themes:[]}))
 useEffect(()=>{load()},[])
 const items=(data.items||[]).map((x:any)=>({id:x.id,lead:x.lead_ref,score:Number(x.score||0),channel:x.channel,theme:x.theme||'Uncategorized',quote:x.response||'',createdAt:x.created_at}))
 const themes=['All',...(data.themes||[]).map((x:any)=>x.theme)]
 const shown=filter==='All'?items:items.filter((x:any)=>x.theme===filter)
 const stats=data.stats||{}
 const openJourney=async(lead:string)=>{const r:any=await api.journeys().catch(()=>({items:[]}));const hit=(r.items||[]).find((x:any)=>String(x.lead||'').toLowerCase()===String(lead||'').toLowerCase())||null;setJourneyRecord(hit);setJourneyOpen(true)}
 const record=async(e:any)=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy('record');setNotice('');try{await api.recordFeedback({lead:String(f.get('lead')||''),score:Number(f.get('score')||0),channel:String(f.get('channel')||'Post-call'),theme:String(f.get('theme')||''),response:String(f.get('response')||'')});setBuilder(false);setNotice('Feedback saved.');await load()}catch(err:any){setNotice(err?.message||'Feedback could not be saved.')}finally{setBusy('')}}
 const request=async(e:any)=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy('request');setNotice('');try{const r:any=await api.requestFeedback({lead:String(f.get('lead')||''),leadRef:String(f.get('lead')||''),phone:String(f.get('phone')||''),email:String(f.get('email')||''),channel:String(f.get('channel')||'voice'),prompt:String(f.get('prompt')||'Please share feedback about your recent interaction.')});setRequestOpen(false);setNotice('Feedback request queued through the agent worker'+(r?.runId?' · '+String(r.runId).slice(0,18):'')+'.')}catch(err:any){setNotice(err?.message||'Feedback request could not be queued.')}finally{setBusy('')}}
 const route=async(id:string)=>{setBusy('route:'+id);setNotice('');try{const r:any=await api.routeFeedback(id);setRouted(r);setNotice('Feedback routed into a persisted follow-up task.')}catch(err:any){setNotice(err?.message||'Feedback could not be routed.')}finally{setBusy('')}}
 const openFollowUp=()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Follow-ups'}))
 return <><PageHead crumb="Conversion / Feedback" title="Feedback agent" sub="Collect post-interaction feedback, detect objections and route insights into real recovery, sales and marketing workflows." action="Record feedback" onAction={()=>setBuilder(true)}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Responses" value={String(stats.responses||0)} sub="Persisted feedback records" Icon={MessageSquareText}/><Stat label="Average satisfaction" value={stats.responses?Number(stats.average||0).toFixed(1)+'/5':'—'} sub="Scored responses only" Icon={Activity}/><Stat label="Low satisfaction" value={String(stats.lowSatisfaction||0)} sub="Scores 1–2" Icon={CheckCircle2}/><Stat label="Themes observed" value={String(stats.themes||0)} sub="Persisted theme groups" Icon={Target}/></div>
 <div className="feedback-command-bar"><div><button className="app-primary" onClick={()=>setRequestOpen(true)}><PhoneOutgoing/>Request feedback</button><button onClick={()=>setBuilder(true)}><Plus/>Record response</button></div><span>Request → collect → understand → route → follow up</span></div>
 {routed&&<div className="feedback-route-result"><CheckCircle2/><div><b>{routed.task?.reason||'Feedback follow-up created'}</b><p>{routed.task?.owner||'Owner'} · {routed.task?.priority||'priority'} · {routed.task?.channel||'channel'}</p></div><button onClick={openFollowUp}>Open Follow-ups <ArrowRight/></button></div>}
 <div className="feedback-toolbar">{themes.map((x:string)=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x}</button>)}</div>
 <div className="feedback-grid">{shown.length?shown.map((x:any)=><article key={x.id||x.lead+x.theme}><div className="feedback-head"><div><span className="lead-avatar">{String(x.lead||'?').split(' ').map((s:string)=>s[0]).join('').slice(0,2)}</span><div><b>{x.lead}</b><small>{x.channel}{x.createdAt?' · '+new Date(x.createdAt).toLocaleString():''}</small></div></div><strong>{'★'.repeat(Math.max(0,Math.min(5,x.score)))}{'☆'.repeat(Math.max(0,5-Math.max(0,Math.min(5,x.score))))}</strong></div><p>{x.quote?'“'+x.quote+'”':'No written response'}</p><footer><span>{x.theme}</span><div><button onClick={()=>openJourney(x.lead)}>Open journey <ChevronRight/></button><button disabled={busy==='route:'+x.id} onClick={()=>route(x.id)}>{busy==='route:'+x.id?'Routing…':'Route insight'} <ArrowRight/></button></div></footer></article>):<div className="empty-delivery-state"><MessageSquareText/><div><b>No feedback yet</b><small>Record a response or request feedback through the configured feedback agent.</small></div></div>}</div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Top themes</h3><p>Grouped from persisted feedback</p></div></div>{(data.themes||[]).length?(data.themes||[]).map((x:any)=><div className="health-line" key={x.theme}><span>{x.theme}</span><div className="progress"><i style={{width:(stats.responses?Math.min(100,Number(x.count||0)/Number(stats.responses)*100):0)+'%'}}/></div><b>{x.count}</b></div>):<div className="empty-delivery-state"><MessageSquareText/><div><b>No themes yet</b></div></div>}</div><div className="app-panel"><div className="panel-head"><div><h3>Feedback routing policy</h3><p>Rules executed by Route insight</p></div></div>{[['Score 1–2','Customer recovery · call · high priority'],['Pricing / fee objection','Sales manager · call · high priority'],['Program / product mismatch','Sales operations · disposition review'],['Score 4–5','Marketing · promoter/testimonial review']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div></div>
 {builder&&<div className="connector-modal"><form className="connector-card" onSubmit={record}><div className="connector-modal-head"><div><MessageSquareText/><div><b>Record feedback</b><small>Persist a real response.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Lead<input name="lead" required placeholder="customer_123"/></label><label>Score<input name="score" type="number" min="1" max="5" required defaultValue="5"/></label><label>Channel<select name="channel"><option>Post-call</option><option>Post-meeting</option><option>WhatsApp</option><option>Email</option></select></label><label>Theme<input name="theme" required placeholder="Pricing objection"/></label><label>Response<textarea name="response" rows={4} placeholder="Customer feedback"/></label><button disabled={busy==='record'}>{busy==='record'?'Saving…':'Save feedback'}</button></form></div>}
 {requestOpen&&<div className="connector-modal"><form className="connector-card" onSubmit={request}><div className="connector-modal-head"><div><PhoneOutgoing/><div><b>Request feedback</b><small>Queue provider-backed outreach through the agent worker.</small></div></div><button type="button" onClick={()=>setRequestOpen(false)}><X/></button></div><label>Lead reference<input name="lead" required placeholder="lead_123"/></label><div className="two-col"><label>Phone<input name="phone" placeholder="+91..."/></label><label>Email<input name="email" type="email" placeholder="lead@example.com"/></label></div><label>Channel<select name="channel"><option value="voice">Voice</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></label><label>Prompt<textarea name="prompt" rows={3} defaultValue="Please share feedback about your recent interaction."/></label><div className="source-conflict-note"><ShieldCheck/><div><b>Provider-backed execution</b><p>The request is queued as an agent action. Delivery only succeeds when the configured feedback transport/provider is available.</p></div></div><button disabled={busy==='request'}>{busy==='request'?'Queuing…':'Queue feedback request'}</button></form></div>}
 {journeyOpen&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><Network/><div><b>Journey context</b><small>{journeyRecord?.lead||'Feedback respondent'}</small></div></div><button onClick={()=>setJourneyOpen(false)}><X/></button></div>{journeyRecord?<div className="site-detail-grid">{[['Lead',journeyRecord.lead],['Source',journeyRecord.source],['Stage',journeyRecord.stage],['Touchpoints',journeyRecord.touchpoints],['Duration',journeyRecord.duration]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1]??'—')}</b></div>)}</div>:<div className="empty-delivery-state"><Network/><div><b>No persisted journey found</b><small>The feedback record exists, but the journey endpoint has no matching lead row.</small></div></div>}</div></div>}</>
}
function Approvals(){
 const [items,setItems]=useState<any[]>([])
 const [selected,setSelected]=useState('')
 const [busy,setBusy]=useState('')
 const load=()=>api.approvals().then((r:any)=>{const list=r.items||[];setItems(list);if(list.length)setSelected((x:string)=>x&&list.some((i:any)=>i.id===x)?x:list[0].id);else setSelected('')}).catch(()=>setItems([]))
 useEffect(()=>{load()},[])
 const current=items.find(x=>x.id===selected)
 const decide=async(decision:'approved'|'rejected')=>{if(!current)return;setBusy(decision);try{await api.decideApproval(current.id,decision);await load()}finally{setBusy('')}}
 const pending=items.filter(x=>x.status==='pending').length
 const approved=items.filter(x=>x.status==='approved').length
 const rejected=items.filter(x=>x.status==='rejected').length
 return <><PageHead crumb="Governance / Approvals" title="Human approval center" sub="Review sensitive agent actions before customer contact, spend-impacting changes or external mutations."/>
 <div className="stats-grid"><Stat label="Pending" value={String(pending)} sub="Awaiting human decision" Icon={CheckCircle2}/><Stat label="Approved" value={String(approved)} sub="Persisted approval decisions" Icon={ShieldCheck}/><Stat label="Rejected" value={String(rejected)} sub="Blocked by human review" Icon={X}/><Stat label="Total requests" value={String(items.length)} sub="Current retained approval history" Icon={Activity}/></div>
 <div className="approval-layout"><div className="app-panel approval-list"><div className="panel-head"><div><h3>Approval queue</h3><p>Persisted agent and automation requests</p></div><button onClick={load}>Refresh</button></div>{items.length?items.map((x:any)=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><ShieldCheck/><div><b>{x.title||x.subject||x.kind}</b><small>{x.kind||x.agent||'Automation'} · {x.risk||'risk not set'}</small></div><span className={String(x.status||'pending').toLowerCase()}>{x.status}</span><ChevronRight/></button>):<div className="empty-delivery-state"><CheckCircle2/><div><b>No approval requests</b><small>Sensitive actions that require human approval will appear here.</small></div></div>}</div>
 <div className="app-panel approval-detail">{current?<><div className="panel-head"><div><h3>{current.title||current.subject||current.kind}</h3><p>{current.detail||current.kind||'Automation request'}</p></div><span className={String(current.status||'pending').toLowerCase()}>{current.status}</span></div><div className="site-detail-grid">{[['Request ID',current.id],['Kind',current.kind||'—'],['Risk',current.risk||'—'],['Agent',current.agentId||current.agent||'—'],['Created',current.createdAt?new Date(current.createdAt).toLocaleString():'—'],['Status',current.status||'pending']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div>{current.status==='pending'?<div className="approval-actions"><button disabled={!!busy} onClick={()=>decide('rejected')}>{busy==='rejected'?'Rejecting…':'Reject'}</button><button className="approve" disabled={!!busy} onClick={()=>decide('approved')}><Check/>{busy==='approved'?'Approving…':'Approve'}</button></div>:<div className={'approval-final '+current.status}><Check/><b>{current.status}</b></div>}</>:<div className="empty-delivery-state"><ShieldCheck/><div><b>No approval selected</b></div></div>}</div></div></>
}
function AskAce(){
 const starters=['Where is the funnel dropping between lead and revenue?','Which campaign is producing the best-quality leads?','How much matched revenue is currently attributed?','Where is attribution breaking?','Which audience should we suppress?','Are any connectors or activation runs unhealthy?']
 const [messages,setMessages]=useState<any[]>([{role:'assistant',text:'Ask me about journeys, attribution, lead quality, campaign performance, audiences, or signal health. I will only answer from data available in this workspace.',confidence:'grounded'}])
 const [q,setQ]=useState('')
 const [busy,setBusy]=useState(false)
 const ask=async(question?:string)=>{
  const text=(question||q).trim()
  if(!text||busy)return
  setMessages(m=>[...m,{role:'user',text}]);setQ('');setBusy(true)
  try{
   const r:any=await api.askAce(text)
   setMessages(m=>[...m,{role:'assistant',text:r.answer,insights:r.insights,confidence:r.confidence,intent:r.intent,followUps:r.followUps,generatedAt:r.generatedAt}])
  }catch{
   setMessages(m=>[...m,{role:'assistant',text:'The grounded analysis API is unavailable. Check the API process, workspace access, and data connections before retrying.',confidence:'unavailable'}])
  }finally{setBusy(false)}
 }
 return <><PageHead crumb="AI / Ask Ace" title="Journey & attribution assistant" sub="Ask natural-language questions over stitched workspace data. Answers include confidence and the evidence used."/>
 <div className="ask-ace-layout"><div className="app-panel ask-chat"><div className="ask-starters">{starters.map(x=><button key={x} onClick={()=>ask(x)} disabled={busy}>{x}</button>)}</div><div className="ask-messages">{messages.map((m,i)=><div key={i} className={'ask-msg '+m.role}><span>{m.role==='assistant'?<Sparkles/>:'S'}</span><div><div className="ask-answer-meta">{m.role==='assistant'&&m.confidence&&<em className={'ask-confidence '+m.confidence}>{m.confidence==='grounded'?'Grounded workspace analysis':m.confidence+' confidence'}</em>}{m.intent&&<small>{String(m.intent).replaceAll('_',' ')}</small>}</div><p>{m.text}</p>{m.insights&&<div className="ask-insights">{m.insights.map((x:any)=><article key={x.label}><span>{x.label}</span><b>{x.value}</b><small>{x.note}</small>{x.source&&<em>{x.source}</em>}</article>)}</div>}{m.followUps?.length>0&&<div className="ask-followups">{m.followUps.map((x:string)=><button key={x} onClick={()=>ask(x)} disabled={busy}>{x}</button>)}</div>}</div></div>)}</div><div className="ask-input"><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask()} placeholder="Ask about revenue, leads, campaigns, audiences or signal health..." disabled={busy}/><button onClick={()=>ask()} disabled={busy}>{busy?<Activity/>:<ArrowRight/>}</button></div></div>
 <div className="app-panel ask-context"><div className="panel-head"><div><h3>Grounded analysis context</h3><p>Ask Ace queries live workspace stores rather than fixed demo metrics</p></div><span className="healthy">Evidence-backed</span></div>{[['Funnel handoffs','Lead, routing, qualification, meeting and feedback coverage'],['Lead operations','Scores, grades, source and campaign quality'],['Attribution store','Matched/unmatched assisted events and value'],['Connector state','Connection and health records'],['Audience store','Activation, suppression and sync state'],['Activation runs','Succeeded, failed and queued external actions'],['Observability','Current API and operational health']].map(x=><div className="ask-context-row" key={x[0]}><Check/><div><b>{x[0]}</b><small>{x[1]}</small></div></div>)}<div className="source-conflict-note"><ShieldCheck/><div><b>No fabricated metrics</b><p>If a workspace does not have enough connected data, Ask Ace reports that limitation instead of substituting sample numbers.</p></div></div></div></div></>
}

function DataFlows(){
 const [data,setData]=useState<any>({items:[],stats:{}})
 const [integrations,setIntegrations]=useState<any[]>([])
 const [builder,setBuilder]=useState(false)
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const [draft,setDraft]=useState<any>({name:'CRM qualified lead → Google Ads',source:'Zoho CRM',destination:'Google Ads',object:'Qualified lead',trigger:'On lifecycle stage change',identityField:'email / phone / gclid',mode:'Real-time'})
 const load=async()=>{
  const [flows,connectors]:any=await Promise.all([api.integrationFlows(),api.integrations()])
  setData(flows);setIntegrations(connectors.items||[])
 }
 useEffect(()=>{load().catch((e:any)=>setNotice(e?.message||'Data flows could not be loaded.'))},[])
 const connectorNames=integrations.map((x:any)=>x.name)
 const create=async(e:any)=>{
  e.preventDefault();setBusy('create');setNotice('')
  try{await api.createIntegrationFlow(draft);setBuilder(false);setNotice('Data flow created. Run the readiness test before activation.');await load()}
  catch(e:any){setNotice(e?.message||'Data flow could not be created.')}
  finally{setBusy('')}
 }
 const testFlow=async(id:string)=>{
  setBusy('test:'+id);setNotice('')
  try{const r:any=await api.testIntegrationFlow(id);setNotice(r.detail||'Readiness test completed.');await load()}
  catch(e:any){setNotice(e?.message||'Readiness test failed.')}
  finally{setBusy('')}
 }
 const toggle=async(item:any)=>{
  setBusy('toggle:'+item.id);setNotice('')
  try{await api.toggleIntegrationFlow(item.id,item.status!=='active');setNotice(item.status==='active'?'Flow paused.':'Flow activated.');await load()}
  catch(e:any){setNotice(e?.message||'Flow status could not be changed.')}
  finally{setBusy('')}
 }
 const stats=data.stats||{}
 return <><PageHead crumb="Activation / Data Flows" title="Data flows" sub="Define governed source-to-destination sync recipes, verify connector readiness, and activate only flows that pass their checks." action="Create flow" onAction={()=>setBuilder(true)}/>
 <div className="stats-grid"><Stat label="Configured flows" value={String(stats.total||0)} sub="Persisted workspace recipes" Icon={Network}/><Stat label="Active" value={String(stats.active||0)} sub="Enabled synchronization paths" Icon={Activity}/><Stat label="Healthy" value={String(stats.healthy||0)} sub="Last readiness test passed" Icon={CheckCircle2}/><Stat label="Needs attention" value={String(stats.needsAttention||0)} sub="Connection or test work required" Icon={ShieldCheck}/></div>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="app-panel data-flow-explainer"><div><Network/><div><span>HOW IT WORKS</span><h3>Source → map → verify → activate</h3><p>Flows do not pretend an unsupported connector is live. Both ends must be connected and the readiness test must pass before the backend allows activation.</p></div></div><div className="data-flow-steps">{['Choose source','Choose destination','Map business signal','Test readiness','Activate flow'].map((x,i)=><span key={x}><b>{i+1}</b>{x}{i<4&&<ArrowRight/>}</span>)}</div></div>
 <div className="data-flow-grid">{(data.items||[]).length?(data.items||[]).map((x:any)=><article className={'data-flow-card '+(x.status==='active'?'active':'')} key={x.id}><div className="data-flow-card-head"><div><span className="integration-logo c0">{String(x.source||'S').slice(0,2).toUpperCase()}</span><ArrowRight/><span className="integration-logo c4">{String(x.destination||'D').slice(0,2).toUpperCase()}</span></div><span className={x.status==='active'?'healthy':'status'}>{x.status}</span></div><h3>{x.name}</h3><p>{x.source} → {x.destination}</p><div className="data-flow-meta"><span><b>Object</b>{x.object}</span><span><b>Trigger</b>{x.trigger}</span><span><b>Identity</b>{x.identityField}</span><span><b>Cadence</b>{x.mode}</span></div><div className={'data-flow-test '+String(x.lastTestStatus||'not_tested')}><ShieldCheck/><div><b>{x.lastTestStatus==='passed'?'Readiness passed':x.lastTestStatus==='needs_attention'?'Needs attention':'Not tested'}</b><small>{x.lastTestDetail||'Run a readiness test before activation.'}</small></div></div><footer><button disabled={busy==='test:'+x.id} onClick={()=>testFlow(x.id)}>{busy==='test:'+x.id?'Testing…':'Test readiness'}</button><button className={x.status==='active'?'':'app-primary'} disabled={busy==='toggle:'+x.id} onClick={()=>toggle(x)}>{busy==='toggle:'+x.id?'Updating…':x.status==='active'?'Pause':'Activate'}</button></footer></article>):<div className="app-panel empty-delivery-state"><Network/><div><b>No data flows configured</b><small>Create a source-to-destination recipe after connecting the systems you want to synchronize.</small></div><button className="app-primary" onClick={()=>setBuilder(true)}><Plus/>Create first flow</button></div>}</div>
 {builder&&<div className="connector-modal"><form className="connector-card data-flow-builder" onSubmit={create}><div className="connector-modal-head"><div><Network/><div><b>Create data flow</b><small>Configure a governed synchronization recipe.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Flow name<input required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><div className="two-col"><label>Source<select value={draft.source} onChange={e=>setDraft({...draft,source:e.target.value})}>{connectorNames.map((x:string)=><option key={x}>{x}</option>)}</select></label><label>Destination<select value={draft.destination} onChange={e=>setDraft({...draft,destination:e.target.value})}>{connectorNames.map((x:string)=><option key={x}>{x}</option>)}</select></label></div><label>Business object / event<input required value={draft.object} onChange={e=>setDraft({...draft,object:e.target.value})}/></label><label>Trigger<input required value={draft.trigger} onChange={e=>setDraft({...draft,trigger:e.target.value})}/></label><div className="two-col"><label>Identity mapping<input required value={draft.identityField} onChange={e=>setDraft({...draft,identityField:e.target.value})}/></label><label>Cadence<select value={draft.mode} onChange={e=>setDraft({...draft,mode:e.target.value})}><option>Real-time</option><option>Every 15 minutes</option><option>Hourly</option><option>Daily</option></select></label></div><div className="ai-note"><ShieldCheck/><div><b>Activation guardrail</b><p>The backend requires a passed readiness test before a flow can be activated.</p></div></div><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create flow'}</button></form></div>}
 </>
}

function Integrations(){
 const groups=[
  ['CRM Platforms',['Zoho CRM','Salesforce','LeadSquared','Meritto','HubSpot','HighLevel','Microsoft Dynamics 365','Freshsales','Custom CRM']],
  ['Messaging & Marketing',['WhatsApp','Bitespeed','AiSensy','Gupshup','WATI','MoEngage','CleverTap','Mailchimp','Klaviyo','Brevo','Twilio SendGrid']],
  ['Calling Platforms',['Exotel','Knowlarity','Tata Tele','MyOperator','Twilio']],
  ['Website, Forms & Commerce',['Shopify','WooCommerce','Magento','WordPress','Typeform','React App','Custom Backend']],
  ['Warehouse, Database & Storage',['BigQuery','Snowflake','MongoDB','Oracle DB','Google Cloud Storage','Amazon S3']],
  ['Advertising & Analytics',['Google Ads','Meta Ads','LinkedIn Ads','Microsoft Ads / Bing Ads','X','Pinterest','TikTok Ads','Yahoo Ads','Taboola','Spotify Ads','Snapchat Ads','Criteo','DV360','Google Merchant Center','Meta Lead Ads','Meta CAPI','Meta Catalog','GA4','Google Calendar']],
  ['Sales Intelligence',['Apollo','Lusha','Calixa']]
 ]
 const [connector,setConnector]=useState('')
 const [step,setStep]=useState(1)
 const [connected,setConnected]=useState<string[]>([])
 const [integrationItems,setIntegrationItems]=useState<any[]>([])
 const [refreshing,setRefreshing]=useState('')
 const [builder,setBuilder]=useState(false)
 const [builderStep,setBuilderStep]=useState(1)
 const [testResult,setTestResult]=useState<any>(null)
 const [customConnectors,setCustomConnectors]=useState<any[]>([])
 const [draft,setDraft]=useState<any>({name:'Internal Lead API',type:'REST API',auth:'Bearer token',baseUrl:'https://api.example.com/v1',direction:'Bidirectional',identity:'email',stage:'status',revenue:'revenue',secret:'',username:'',headerName:'X-API-Key'})
 const [waTo,setWaTo]=useState('')
 const [waText,setWaText]=useState('Hi — this is a test message from AceMarketing.')
 const [waEvents,setWaEvents]=useState<any[]>([])
 const [waBusy,setWaBusy]=useState(false)
 const [waNotice,setWaNotice]=useState('')
 const [integrationSearch,setIntegrationSearch]=useState('')
 const [integrationRequests,setIntegrationRequests]=useState<any[]>([])
 const [requestOpen,setRequestOpen]=useState(false)
 const [requestBusy,setRequestBusy]=useState(false)
 const [requestNotice,setRequestNotice]=useState('')
 const [connectionNotice,setConnectionNotice]=useState<any>(null)
 const builtInCount=groups.reduce((sum:any,g:any)=>sum+g[1].length,0)
 const start=(name:string)=>{
  const item=integrationItems.find((x:any)=>x.name===name)
  if(!item||item.authType==='manual'||item.status==='manual'){
   setDraft((x:any)=>({...x,name,baseUrl:'',secret:'',username:''}))
   setBuilder(true);setBuilderStep(1);setTestResult(null)
   return
  }
  setConnector(name);setStep(1)
 }
 useEffect(()=>{api.integrations().then((r:any)=>{setIntegrationItems(r.items||[]);setIntegrationRequests(r.requests||[]);setConnected((r.items||[]).filter((x:any)=>x.status==='connected').map((x:any)=>x.name))}).catch(()=>null);api.customIntegrations().then((r:any)=>setCustomConnectors(r.items||[])).catch(()=>null);api.whatsappMessages().then((r:any)=>setWaEvents(r.items||[])).catch(()=>null)},[])
 const finish=async()=>{
  setConnectionNotice(null)
  try{
   const r:any=await api.connectIntegration(connector)
   if(r.status==='authorization_required'&&r.authorizationUrl){
    window.location.assign(r.authorizationUrl)
    return
   }
   if(r.status==='connected'){
    setConnected(c=>c.includes(connector)?c:[...c,connector])
    setConnectionNotice({type:'ok',text:connector+' connected successfully.'})
   }
   if(r.status==='needs_configuration') setConnectionNotice({type:'error',text:'Connector OAuth credentials are not configured on the backend yet.'})
  }catch(e:any){setConnectionNotice({type:'error',text:e?.message||'Connector authorization could not be started. Check backend OAuth configuration.'})}
  setConnector('')
 }
 const refreshIntegration=async(name:string)=>{setRefreshing(name);setConnectionNotice(null);try{await api.refreshIntegration(name);const r:any=await api.integrations();setIntegrationItems(r.items||[]);setConnected((r.items||[]).filter((x:any)=>x.status==='connected').map((x:any)=>x.name));setConnectionNotice({type:'ok',text:name+' credentials refreshed.'})}catch(e:any){setConnectionNotice({type:'error',text:e?.message||'Credential refresh failed'})}finally{setRefreshing('')}}
 const testCustom=async()=>{try{const r:any=await api.testCustomIntegration(draft);setTestResult(r)}catch(e:any){setTestResult({ok:false,error:e?.message||'Connection test failed'})};setBuilderStep(3)}
 const saveCustom=async()=>{try{await api.createCustomIntegration(draft);const r:any=await api.customIntegrations();setCustomConnectors(r.items||[]);setBuilder(false);setBuilderStep(1);setTestResult(null);setDraft((x:any)=>({...x,secret:'',username:''}))}catch(e:any){setTestResult({ok:false,error:e?.message||'Could not create integration'})}}
 const reloadWhatsApp=()=>api.whatsappMessages().then((r:any)=>setWaEvents(r.items||[])).catch(()=>null)
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
 const submitIntegrationRequest=async(e:any)=>{
  e.preventDefault();const fd=new FormData(e.currentTarget);setRequestBusy(true);setRequestNotice('')
  try{
   const r:any=await api.requestIntegration({connector:String(fd.get('connector')||''),businessNeed:String(fd.get('businessNeed')||''),direction:String(fd.get('direction')||'Bidirectional'),priority:String(fd.get('priority')||'Normal')})
   setIntegrationRequests(xs=>[r.item,...xs]);setRequestOpen(false);setRequestNotice('Connector request submitted and tracked in this workspace.')
  }catch(err:any){setRequestNotice(err?.message||'Connector request could not be submitted.')}finally{setRequestBusy(false)}
 }
 const filteredGroups=groups.map(([label,items]:any)=>[label,(items as string[]).filter((name:string)=>!integrationSearch.trim()||name.toLowerCase().includes(integrationSearch.trim().toLowerCase())||String(label).toLowerCase().includes(integrationSearch.trim().toLowerCase()))]).filter(([,items]:any)=>items.length)
 return <><PageHead crumb="Workspace / Integrations" title="Platform-agnostic connectivity" sub="Connect the systems you already use without rebuilding your stack."/>
 <div className="integration-summary"><div><strong>{builtInCount}+</strong><span>catalogued connector paths</span></div><div><strong>{connected.length+customConnectors.length}</strong><span>connected in this workspace</span></div><div><strong>{integrationRequests.filter((x:any)=>x.status==='requested').length}</strong><span>requested connectors</span></div><div><strong>Native + Custom</strong><span>explicit capability status</span></div></div>
 {requestNotice&&<div className="delivery-notice ok"><CheckCircle2/><span>{requestNotice}</span></div>}
 {connectionNotice&&<div className={'delivery-notice '+(connectionNotice.type==='error'?'error':'ok')}>{connectionNotice.type==='error'?<ShieldCheck/>:<CheckCircle2/>}<span>{connectionNotice.text}</span></div>}
 <div className="app-panel custom-integration-hero"><div><Cable/><div><span>Custom integration</span><h3>Connect proprietary systems without changing your stack</h3><p>Define authentication, endpoint, identity fields and business mappings, then validate the connection before enabling sync.</p></div></div><div className="panel-actions"><button onClick={()=>setRequestOpen(true)}>Request connector</button><button className="app-primary" onClick={()=>{setBuilder(true);setBuilderStep(1);setTestResult(null)}}><Plus/>Build custom integration</button></div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Integration catalog</h3><p>Native OAuth connectors are labelled separately from configurable adapters.</p></div><div className="integration-catalog-search"><Search/><input aria-label="Search integration catalog" value={integrationSearch} onChange={e=>setIntegrationSearch(e.target.value)} placeholder="Search CRM, warehouse, ads, messaging..."/></div></div></div>
 <div className="app-panel whatsapp-ops"><div className="panel-head"><div><h3>WhatsApp Cloud API operations</h3><p>Send a provider-backed message and inspect real inbound/outbound webhook activity.</p></div><span className={connected.includes('WhatsApp')?'healthy':'warning'}>{connected.includes('WhatsApp')?'Connected':'Connect WhatsApp first'}</span></div>
 <div className="whatsapp-ops-grid"><div className="whatsapp-send-box"><label>Recipient phone<input value={waTo} onChange={e=>setWaTo(e.target.value)} placeholder="919876543210"/></label><label>Message<textarea value={waText} onChange={e=>setWaText(e.target.value)} rows={4}/></label><button className="app-primary" disabled={waBusy||!waTo.trim()||!waText.trim()} onClick={sendWhatsApp}>{waBusy?'Sending…':'Send test message'}</button>{waNotice&&<small className="whatsapp-notice">{waNotice}</small>}</div>
 <div className="whatsapp-event-list"><div className="panel-head"><div><h4>Recent WhatsApp activity</h4><p>Cloud API messages and delivery receipts</p></div><button onClick={reloadWhatsApp}>Refresh</button></div>{waEvents.length?waEvents.slice(0,8).map((x:any)=><div className="whatsapp-event-row" key={(x.kind||'event')+':'+(x.id||x.timestamp)}><span className={'wa-kind '+String(x.kind||'event')}>{x.kind||'event'}</span><div><b>{x.kind==='message'?(x.contactName||x.from||'Inbound message'):x.kind==='outbound'?(x.recipientId||'Outbound message'):(x.status||'Delivery status')}</b><small>{x.text||x.messageType||x.status||'WhatsApp event'} · {x.timestamp?new Date(x.timestamp).toLocaleString():'now'}</small></div></div>):<div className="empty-delivery-state"><MessageCircle/><div><b>No WhatsApp events yet</b><small>Verified webhook events and messages will appear here.</small></div></div>}</div></div></div>
 {customConnectors.length>0&&<div className="app-panel"><div className="panel-head"><div><h3>Custom integrations</h3><p>Workspace-specific adapters</p></div><span className="healthy">{customConnectors.length} connected</span></div>{customConnectors.map((x:any)=><div className="custom-connector-row" key={x.name}><span className="integration-logo c5">CI</span><div><b>{x.name}</b><small>{x.type} · {x.direction} · {x.baseUrl}</small></div><span className={x.status==='healthy'?'healthy':'status'}>{x.status}</span><button onClick={async()=>{const r:any=await api.testCustomIntegration({id:x.id}).catch((e:any)=>({ok:false,error:e?.message||'Test failed'}));setTestResult(r)}}>Test</button></div>)}</div>}
 <div className="integration-category-grid">{filteredGroups.map((g:any,gi:number)=><section className="integration-category" key={g[0] as string}><div className="integration-category-head"><div><span>{String(gi+1).padStart(2,'0')}</span><h3>{g[0]}</h3></div><small>{(g[1] as string[]).length} connectors shown</small></div><div className="integration-app-grid">{(g[1] as string[]).map((x:string,i:number)=>{const item=integrationItems.find((v:any)=>v.name===x);const manual=!item||item.capability==='configurable_adapter'||item.authType==='manual'||item.status==='manual';const requested=integrationRequests.some((r:any)=>r.connector.toLowerCase()===x.toLowerCase()&&r.status==='requested');return <article key={x}><span className={'integration-logo c'+(i%6)}>{x.slice(0,2).toUpperCase()}</span><div><b>{x}</b><small>{connected.includes(x)?'Connected · syncing':manual?'Configurable adapter':'Native OAuth connector'}</small></div>{requested&&<span className="status">requested</span>}{connected.includes(x)?<button className="connected" disabled={refreshing===x} onClick={()=>refreshIntegration(x)}>{refreshing===x?'Refreshing…':(item?.tokenHealth?.needsRefresh?'Refresh token':'Connected')}</button>:<button className="connect" onClick={()=>start(x)}>{manual?'Configure':'Connect'}</button>}</article>})}</div></section>)}</div>
 {requestOpen&&<div className="connector-modal"><form className="connector-card integration-request-form" onSubmit={submitIntegrationRequest}><div className="connector-modal-head"><div><Cable/><div><b>Request connector</b><small>Track a native-connector request without pretending unsupported OAuth exists today.</small></div></div><button type="button" onClick={()=>setRequestOpen(false)}><X/></button></div><label>Connector name<input name="connector" required defaultValue={integrationSearch} placeholder="Snowflake, TikTok Ads, internal ERP..."/></label><label>Business need<textarea name="businessNeed" required rows={5} placeholder="Describe the data you need to ingest or activate and why."/></label><div className="two-col"><label>Direction<select name="direction"><option>Bidirectional</option><option>Inbound</option><option>Outbound</option></select></label><label>Priority<select name="priority"><option>Normal</option><option>High</option><option>Critical</option></select></label></div><button disabled={requestBusy}>{requestBusy?'Submitting…':'Submit connector request'}</button></form></div>}
 {connector&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><span className="integration-logo c0">{connector.slice(0,2).toUpperCase()}</span><div><b>Connect {connector}</b><small>Step {step} of 3</small></div></div><button onClick={()=>setConnector('')}><X/></button></div>{step===1&&<div className="connector-step"><h3>Authorize workspace access</h3><p>Grant only the scopes required to read events, sync outcomes and manage configured conversion destinations.</p><div className="scope-list">{['Read account metadata','Read campaign / lead records','Write configured conversion events','Read sync health'].map(x=><span key={x}><Check/>{x}</span>)}</div><button onClick={()=>setStep(2)}>Continue <ArrowRight/></button></div>}{step===2&&<div className="connector-step"><h3>Map business fields</h3><p>Choose the fields used for identity resolution and funnel stages.</p>{[['Primary identity','Email + phone'],['Click identifier','GCLID / FBCLID'],['Lifecycle stage','Lead status'],['Revenue field','Closed value']].map(x=><label key={x[0]}><span>{x[0]}</span><select defaultValue={x[1]}><option>{x[1]}</option><option>Custom field</option></select></label>)}<button onClick={()=>setStep(3)}>Continue <ArrowRight/></button></div>}{step===3&&<div className="connector-step"><h3>Enable synchronization</h3><p>Start continuous ingestion and delivery health checks for this connector.</p><div className="connector-ready"><Activity/><div><b>Ready to connect</b><small>Authorization uses the backend connector vault and provider OAuth configuration. You will be redirected to the provider when OAuth is configured.</small></div></div><button onClick={finish}>Connect {connector}</button></div>}</div></div>}
 {builder&&<div className="connector-modal"><div className="connector-card custom-integration-builder"><div className="connector-modal-head"><div><Cable/><div><b>Custom Integration Builder</b><small>Step {builderStep} of 3 · configure → map → test</small></div></div><button onClick={()=>setBuilder(false)}><X/></button></div>
 {builderStep===1&&<div className="connector-step"><h3>Connection</h3><p>Describe the proprietary or unsupported system you want AceMarketing to connect.</p><label>Name<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Connector type<select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}><option>REST API</option><option>Webhook</option><option>CSV / SFTP</option><option>Database read</option></select></label><label>Authentication<select value={draft.auth} onChange={e=>setDraft({...draft,auth:e.target.value})}><option>Bearer token</option><option>API key</option><option>Basic auth</option><option>OAuth 2.0</option><option>Signed webhook</option><option>None</option></select></label>{draft.auth==='Basic auth'&&<label>Username<input value={draft.username} onChange={e=>setDraft({...draft,username:e.target.value})}/></label>}{draft.auth!=='None'&&draft.auth!=='OAuth 2.0'&&<label>Credential / secret<input type="password" value={draft.secret} onChange={e=>setDraft({...draft,secret:e.target.value})} autoComplete="new-password"/></label>}{draft.auth==='API key'&&<label>API key header<input value={draft.headerName} onChange={e=>setDraft({...draft,headerName:e.target.value})}/></label>}<label>Base URL / endpoint<input value={draft.baseUrl} onChange={e=>setDraft({...draft,baseUrl:e.target.value})}/></label><label>Data direction<select value={draft.direction} onChange={e=>setDraft({...draft,direction:e.target.value})}><option>Bidirectional</option><option>Inbound to AceMarketing</option><option>Outbound from AceMarketing</option></select></label><button onClick={()=>setBuilderStep(2)}>Continue to mapping <ArrowRight/></button></div>}
 {builderStep===2&&<div className="connector-step"><h3>Field mappings</h3><p>Map the minimum fields needed for identity, funnel progression and closed-revenue feedback.</p>{[['Primary identity','identity'],['Lifecycle stage','stage'],['Revenue / value','revenue']].map(x=><label key={x[0]}><span>{x[0]}</span><input value={draft[x[1]]} onChange={e=>setDraft({...draft,[x[1]]:e.target.value})}/></label>)}<div className="scope-list">{['Preserve event_id for deduplication','Accept GCLID / FBCLID when present','Normalize timestamps to workspace timezone','Quarantine schema failures','Write delivery status to audit history'].map(x=><span key={x}><Check/>{x}</span>)}</div><button onClick={testCustom}>Test connection <ArrowRight/></button></div>}
 {builderStep===3&&<div className="connector-step"><h3>Connection test</h3><p>Validate authorization, schema compatibility and a small sample before enabling continuous sync.</p><div className="custom-test-result">{testResult?.ok===false?<X/>:<CheckCircle2/>}<div><b>{testResult?.ok===false?'Test needs attention':'Connection test passed'}</b><small>{testResult?.ok===false?(testResult?.error||'Connection could not be validated'):`HTTP ${testResult?.statusCode} · ${testResult?.latencyMs}ms · ${testResult?.sampleRecords||0} sample records inspected`}</small></div></div><div className="diagnostic-evidence">{[['Authentication','Valid'],['Identity field',draft.identity],['Lifecycle field',draft.stage],['Revenue field',draft.revenue]].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div><button onClick={saveCustom}>Create integration & enable sync</button></div>}
 </div></div>}</>
}
function RealTimeActivation(){
 const [data,setData]=useState<any>({items:[],runs:[],stats:{}})
 const [builder,setBuilder]=useState(false)
 const [selected,setSelected]=useState('')
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState('')
 const [testResult,setTestResult]=useState<any>(null)
 const load=async()=>{
  try{
   const r:any=await api.activationRules()
   setData(r)
   if(r.items?.length)setSelected((x:string)=>x&&r.items.some((i:any)=>i.id===x)?x:r.items[0].id)
  }catch(e:any){setNotice(e?.message||'Real-time activation rules could not be loaded.')}
 }
 useEffect(()=>{load()},[])
 const current=(data.items||[]).find((x:any)=>x.id===selected)||data.items?.[0]
 const create=async(e:any)=>{
  e.preventDefault();setBusy('create');setNotice('')
  const fd=new FormData(e.currentTarget)
  const conditionField=String(fd.get('conditionField')||'').trim()
  const payload:any={
   name:String(fd.get('name')||''),
   triggerEvent:String(fd.get('triggerEvent')||''),
   actionType:String(fd.get('actionType')||'signal'),
   destination:String(fd.get('destination')||''),
   outputEvent:String(fd.get('outputEvent')||''),
   channel:String(fd.get('channel')||'whatsapp'),
   owner:String(fd.get('owner')||'Marketing automation'),
   priority:String(fd.get('priority')||'medium'),
   delayMinutes:Number(fd.get('delayMinutes')||0),
   reason:String(fd.get('reason')||''),
   requiresMarketingConsent:true,
   conditions:conditionField?[{field:conditionField,operator:String(fd.get('operator')||'equals'),value:String(fd.get('conditionValue')||'')}]:[]
  }
  try{
   const r:any=await api.createActivationRule(payload)
   setBuilder(false);setNotice('Activation rule created and enabled.');await load();if(r?.item?.id)setSelected(r.item.id)
  }catch(e:any){setNotice(e?.message||'Activation rule could not be created.')}
  finally{setBusy('')}
 }
 const toggle=async()=>{
  if(!current)return
  setBusy('toggle');setNotice('')
  try{await api.toggleActivationRule(current.id,current.status!=='active');setNotice(current.status==='active'?'Activation rule paused.':'Activation rule enabled.');await load()}
  catch(e:any){setNotice(e?.message||'Activation rule status could not be changed.')}
  finally{setBusy('')}
 }
 const test=async()=>{
  if(!current)return
  setBusy('test');setNotice('');setTestResult(null)
  try{
   const sample:any={event:current.triggerEvent,customerId:'activation_test_customer',value:5000,source:'workspace_test'}
   for(const condition of current.conditions||[]){
    sample[condition.field]=condition.operator==='greater_than'?Number(condition.value||0)+1:condition.value||'test'
   }
   const r:any=await api.testActivationRule(current.id,sample)
   setTestResult(r);setNotice(r.matched?'Test event matches this rule.':'Test event does not match this rule.')
  }catch(e:any){setNotice(e?.message||'Activation rule test failed.')}
  finally{setBusy('')}
 }
 const stats=data.stats||{}
 const runs=(data.runs||[]).filter((x:any)=>!current||x.ruleId===current.id)
 const actionLabel=(x:any)=>x.actionType==='signal'?('Send '+(x.outputEvent||x.triggerEvent)+' → '+(x.destination||'destination')):x.actionType==='route'?('Route → '+(x.destination||'queue')):('Create '+(x.channel||'follow-up')+' follow-up')
 return <><PageHead crumb="Activation / Real-Time Activation" title="Real-time activation" sub="Turn fresh first-party behavior into governed signals, routing, and follow-up actions as soon as events arrive." action="Create activation rule" onAction={()=>setBuilder(true)}/>
 {notice&&<div className={'delivery-notice '+(notice.toLowerCase().includes('could not')||notice.toLowerCase().includes('failed')?'error':'ok')}>{notice.toLowerCase().includes('could not')||notice.toLowerCase().includes('failed')?<ShieldCheck/>:<CheckCircle2/>}<span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Rules" value={String(stats.total||0)} sub="Persisted activation policies" Icon={Zap}/><Stat label="Active" value={String(stats.active||0)} sub="Evaluated on event ingestion" Icon={Activity}/><Stat label="Recent runs" value={String(stats.runs||0)} sub="Persisted rule executions" Icon={RadioTower}/><Stat label="Succeeded" value={String(stats.succeeded||0)} sub="Actions completed or queued" Icon={CheckCircle2}/></div>
 <div className="activation-rule-explainer app-panel"><div><Zap/><div><span>EVENT-DRIVEN AUTOMATION</span><h3>Event → condition → consent → action</h3><p>Every incoming first-party event is evaluated against active rules. Marketing actions are skipped when marketing consent is unavailable.</p></div></div><div className="data-flow-steps">{['Receive event','Evaluate conditions','Check consent','Run action','Persist result'].map((x,i)=><span key={x}><b>{i+1}</b>{x}{i<4&&<ArrowRight/>}</span>)}</div></div>
 <div className="activation-rule-layout"><div className="app-panel activation-rule-list"><div className="panel-head"><div><h3>Activation rules</h3><p>Active and paused real-time automations</p></div><button onClick={load}>Refresh</button></div>{(data.items||[]).length?(data.items||[]).map((x:any)=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>{setSelected(x.id);setTestResult(null)}}><Zap/><div><b>{x.name}</b><small>{x.triggerEvent} · {x.actionType.replace('_',' ')}</small></div><span className={x.status==='active'?'healthy':'status'}>{x.status}</span><ChevronRight/></button>):<div className="empty-delivery-state"><Zap/><div><b>No activation rules yet</b><small>Create a rule to react to tracked customer behavior in real time.</small></div></div>}</div>
 <div className="app-panel activation-rule-detail">{current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{actionLabel(current)}</p></div><span className={current.status==='active'?'healthy':'status'}>{current.status}</span></div><div className="site-detail-grid">{[['Trigger event',current.triggerEvent],['Action',current.actionType],['Destination',current.destination||current.channel||'—'],['Consent','Marketing consent required'],['Priority',current.priority||'medium'],['Delay',Number(current.delayMinutes||0)+' min']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></div>)}</div>
 <div className="agent-section"><h4>Conditions</h4>{(current.conditions||[]).length?<div className="context-chips">{current.conditions.map((x:any,i:number)=><span key={i}>{x.field} {String(x.operator).replaceAll('_',' ')} {String(x.value)}</span>)}</div>:<div className="context-chips"><span>Any {current.triggerEvent} event</span></div>}</div>
 <div className="approval-actions"><button disabled={busy==='test'} onClick={test}><Activity/>{busy==='test'?'Testing…':'Test rule'}</button><button className={current.status==='active'?'':'approve'} disabled={busy==='toggle'} onClick={toggle}>{busy==='toggle'?'Saving…':current.status==='active'?'Pause rule':'Enable rule'}</button></div>
 {testResult&&<div className={'activation-test-result '+(testResult.matched?'matched':'not-matched')}><ShieldCheck/><div><b>{testResult.matched?'Rule matched':'Rule did not match'}</b><small>Dry-run only · no external action was executed</small></div></div>}
 <div className="agent-section"><h4>Recent executions</h4>{runs.length?runs.slice(0,10).map((x:any)=><div className="agent-run" key={x.id}><Activity/><div><b>{x.eventId||'Tracked event'}</b><small>{x.detail||x.actionType}</small></div><span>{x.createdAt?new Date(x.createdAt).toLocaleString():'—'}</span><em className={x.status}>{x.status}</em></div>):<div className="empty-delivery-state"><Activity/><div><b>No executions for this rule</b><small>Matching live events will appear here after ingestion.</small></div></div>}</div></>:<div className="empty-delivery-state"><Zap/><div><b>Select an activation rule</b></div></div>}</div></div>
 {builder&&<div className="connector-modal"><form className="connector-card activation-rule-builder" onSubmit={create}><div className="connector-modal-head"><div><Zap/><div><b>Create real-time activation rule</b><small>Persist a governed event-to-action policy.</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Rule name<input name="name" required placeholder="High-value checkout → Meta signal"/></label><label>Trigger event<input name="triggerEvent" required defaultValue="checkout_initiated" placeholder="checkout_initiated"/></label><div className="two-col"><label>Condition field<input name="conditionField" placeholder="value"/></label><label>Operator<select name="operator"><option value="equals">Equals</option><option value="contains">Contains</option><option value="greater_than">Greater than</option><option value="less_than">Less than</option><option value="one_of">One of</option><option value="exists">Exists</option></select></label></div><label>Condition value<input name="conditionValue" placeholder="4000"/></label><label>Action type<select name="actionType" defaultValue="signal"><option value="signal">Send conversion signal</option><option value="follow_up">Create follow-up</option><option value="route">Route lead</option></select></label><label>Destination / queue<input name="destination" defaultValue="Meta Ads" placeholder="Meta Ads or Priority sales queue"/></label><label>Output event<input name="outputEvent" defaultValue="high_value_checkout" placeholder="high_value_checkout"/></label><div className="two-col"><label>Follow-up channel<select name="channel"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">Call</option></select></label><label>Delay minutes<input name="delayMinutes" type="number" min="0" defaultValue="0"/></label></div><div className="two-col"><label>Owner<input name="owner" defaultValue="Marketing automation"/></label><label>Priority<select name="priority"><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></label></div><label>Reason<textarea name="reason" rows={3} defaultValue="Triggered by real-time first-party behavior."/></label><div className="source-conflict-note"><ShieldCheck/><div><b>Consent-aware execution</b><p>Marketing actions are evaluated only after the incoming event passes consent checks, and rules requiring marketing consent are skipped when that consent is unavailable.</p></div></div><button disabled={busy==='create'}>{busy==='create'?'Creating…':'Create & enable rule'}</button></form></div>}
 </> 
}

function Audiences(){
 const [segments,setSegments]=useState<any[]>([])
 const [stats,setStats]=useState<any>(null)
 const [builder,setBuilder]=useState(false)
 const [preset,setPreset]=useState<any>(null)
 const [preview,setPreview]=useState<any>(null)
 const [saving,setSaving]=useState(false)
 const [syncing,setSyncing]=useState('')
 const [scheduling,setScheduling]=useState('')
 const [notice,setNotice]=useState('')
 const normalize=(r:any)=>{
  setSegments((r.items||[]).map((x:any)=>({...x,size:String(x.size??x.matchedSize??0),cadence:x.cadence||'Manual'})))
  setStats(r.stats||null)
 }
 const reloadAudiences=async()=>{const r:any=await api.audiences();normalize(r)}
 useEffect(()=>{reloadAudiences().catch((e:any)=>setNotice(e?.message||'Audiences could not be loaded.'))},[])
 const previewAudience=async(e:any)=>{
  e.preventDefault();setNotice('')
  const f=new FormData(e.currentTarget)
  const payload={
    name:String(f.get('name')||''),
    condition:String(f.get('condition')||''),
    operator:String(f.get('operator')||''),
    value:String(f.get('value')||''),
    destination:String(f.get('destination')||''),
    mode:String(f.get('mode')||'Activate'),
    identityMode:String(f.get('identityMode')||'auto')
  }
  try{const r:any=await api.previewAudience(payload);setPreview({...payload,...r});setPreset(payload)}
  catch(e:any){setPreview(null);setNotice(e?.message||'Audience preview failed.')}
 }
 const openPreset=async(payload:any)=>{
  setNotice('');setPreset(payload);setPreview(null);setBuilder(true)
  try{const r:any=await api.previewAudience(payload);setPreview({...payload,...r})}
  catch(e:any){setNotice(e?.message||'Audience preview failed.')}
 }
 const openCustom=()=>{setPreset(null);setPreview(null);setBuilder(true)}
 const syncAudience=async(id:string)=>{setSyncing(id);setNotice('');try{await api.syncAudience(id);setNotice('Audience sync queued.');await reloadAudiences()}catch(e:any){setNotice(e?.message||'Audience sync failed.')}finally{setSyncing('')}}
 const setCadence=async(id:string,cadence:string)=>{setScheduling(id);setNotice('');try{await api.saveAudienceSchedule(id,cadence,cadence!=='Manual');await reloadAudiences()}catch(e:any){setNotice(e?.message||'Schedule could not be updated.')}finally{setScheduling('')}}
 const saveAudience=async()=>{if(!preview)return;setSaving(true);setNotice('');try{await api.createAudience(preview);await reloadAudiences();setBuilder(false);setPreset(null);setPreview(null);setNotice('Audience created and materialized.')}catch(e:any){setNotice(e?.message||'Audience could not be created.')}finally{setSaving(false)}}
 const exportAudiences=()=>{const rows=[['name','destination','identity_mode','size','cadence','mode','status'],...segments.map((x:any)=>[x.name,x.destination,x.identityMode||'auto',x.size,x.cadence,x.mode,x.status||''])];const csv=rows.map(r=>r.map((v:any)=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ace-audiences.csv';a.click();URL.revokeObjectURL(a.href)}
 const a=stats?.audiences||{}
 const lifecycle=stats?.lifecycle||{}
 const exclusions=stats?.exclusions||{}
 const latency=a.medianSyncLatencySeconds==null?'—':a.medianSyncLatencySeconds<60?a.medianSyncLatencySeconds+'s':Math.round(a.medianSyncLatencySeconds/60)+'m'
 const lifecycleRows=[
  {label:'Acquisition',detail:'New / active prospects',count:lifecycle.acquisition||0,preset:{name:'Acquisition prospects',condition:'CRM stage',operator:'is one of',value:'lead,new,active',destination:'Google Ads · Meta Ads',mode:'Retarget',identityMode:'auto'}},
  {label:'Nurture',detail:'Lead / contacted / connected',count:lifecycle.nurture||0,preset:{name:'Nurture-stage prospects',condition:'CRM stage',operator:'is one of',value:'lead,new,contacted,connected',destination:'Google Ads · Meta Ads',mode:'Retarget',identityMode:'auto'}},
  {label:'Decision',detail:'Qualified / consultation / opportunity',count:lifecycle.decision||0,preset:{name:'Decision-stage prospects',condition:'CRM stage',operator:'is one of',value:'qualified,consultation,opportunity',destination:'Google Ads · Meta Ads',mode:'Lookalike seed',identityMode:'auto'}},
  {label:'Post-purchase',detail:'Converted / enrolled / closed won',count:lifecycle.postPurchase||0,preset:{name:'Converted customer suppression',condition:'CRM stage',operator:'is one of',value:'converted,enrolled,closed_won,customer',destination:'Google Ads · Meta Ads',mode:'Suppress',identityMode:'auto'}}
 ]
 const exclusionRows=[
  {label:'Converted customers',detail:'Customer ID + hashed PII',count:exclusions.converted||0,preset:{name:'Converted customer suppression',condition:'CRM stage',operator:'is one of',value:'converted,enrolled,closed_won,customer',destination:'Google Ads · Meta Ads',mode:'Suppress',identityMode:'contact'}},
  {label:'Device-ID identities',detail:'First-party mobile advertising IDs',count:exclusions.deviceIds||0,preset:{name:'Device identity retargeting',condition:'Device ID present',operator:'is',value:'yes',destination:'Meta Ads',mode:'Retarget',identityMode:'device'}},
  {label:'Low-quality leads',detail:'Lead grade C / D',count:exclusions.lowQuality||0,preset:{name:'Low-quality lead suppression',condition:'Lead grade',operator:'is one of',value:'C,D',destination:'Google Ads · Meta Ads',mode:'Suppress',identityMode:'auto'}}
 ]
 return <><PageHead crumb="Activation / Audiences" title="Audience management" sub="Activate high-intent first-party segments and suppress converted, low-quality or device-identified users."/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Audience records" value={stats?.available?String(a.total||0):'—'} sub={(a.active||0)+' provider-active'} Icon={UsersRound}/><Stat label="Activated identities" value={stats?.available?Number(a.activatedIdentities||0).toLocaleString('en-IN'):'—'} sub="Materialized non-suppression members" Icon={Target}/><Stat label="Suppressed identities" value={stats?.available?Number(a.suppressedIdentities||0).toLocaleString('en-IN'):'—'} sub="Materialized suppression members" Icon={ShieldCheck}/><Stat label="Observed sync latency" value={latency} sub="From persisted successful sync timestamps" Icon={Activity}/></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Active segments</h3><p>Materialized from persisted lead/device profiles; provider sync state is explicit</p></div><div className="panel-actions"><button onClick={exportAudiences}>Export</button><button className="app-primary" onClick={openCustom}><Plus/>New audience</button></div></div>{segments.length?segments.map((x:any)=><div className="audience-row" key={x.id||x.name}><UsersRound/><div><b>{x.name}</b><small>{x.destination} · {x.identityMode||'auto'} identity{x.lastSyncError?' · '+x.lastSyncError:''}{x.schedule?.last_added||x.schedule?.last_removed?` · Δ +${x.schedule?.last_added||0}/-${x.schedule?.last_removed||0}`:''}</small></div><strong>{x.size}</strong>{x.id?<select aria-label={'Cadence for '+x.name} disabled={scheduling===x.id} value={x.cadence||'Manual'} onChange={e=>setCadence(x.id,e.target.value)}><option>Manual</option><option>Real time</option><option>Every 5 min</option><option>Every 15 min</option><option>Hourly</option><option>Every 6 hours</option><option>Daily</option></select>:<span>{x.cadence}</span>}<em className={String(x.mode).toLowerCase()}>{x.mode}</em>{x.status&&<small>{String(x.status).replaceAll('_',' ')}</small>}{x.id&&['ready_for_sync','error','materialized'].includes(x.status)&&<button disabled={syncing===x.id} onClick={()=>syncAudience(x.id)}>{syncing===x.id?'Queueing…':'Sync now'}</button>}<ChevronRight/></div>):<div className="empty-delivery-state"><UsersRound/><div><b>No audiences yet</b><small>Create a first-party audience from persisted lead, journey or device identity.</small></div></div>}</div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Lifecycle audiences</h3><p>Derived from persisted CRM/lead stages · click a row to preview the real segment</p></div></div>{lifecycleRows.map((x:any)=><button className="lifecycle-row audience-preset-row" key={x.label} onClick={()=>openPreset(x.preset)}><span>{x.label}</span><div><b>{x.detail}</b><small>{Number(x.count).toLocaleString('en-IN')} identities</small></div><em>{x.preset.mode}</em><ChevronRight/></button>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Waste-control identity pool</h3><p>Turn observed waste pools into persisted suppression/retargeting audiences</p></div></div>{exclusionRows.map((x:any)=><button className="exclusion-row audience-preset-row" key={x.label} onClick={()=>openPreset(x.preset)}><ShieldCheck/><div><b>{x.label}</b><small>{x.detail}</small></div><strong>{Number(x.count).toLocaleString('en-IN')}</strong><span>{x.preset.mode}</span></button>)}</div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Audience signals</h3><p>First-party attributes available to the builder</p></div></div><div className="context-chips">{['Lead grade','CRM stage','Conversion propensity','Pricing-page views','LTV tier','Last activity','Device ID present','Device platform','App ID'].map(x=><span key={x}>{x}</span>)}</div></div><div className="app-panel"><div className="panel-head"><div><h3>Activation guardrails</h3><p>Provider sync checks consent again before data leaves AceMarketing</p></div></div>{[['Marketing consent','Required for every member'],['Device audience','Mobile advertising ID + app context'],['Converted customer','Suppress acquisition'],['Low quality / invalid','Suppress optimization'],['High-value prospect','Seed / optimize']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div></div>
 {builder&&<div className="connector-modal"><form key={preset?.name||'custom-audience'} className="connector-card audience-builder" onSubmit={previewAudience}><div className="connector-modal-head"><div><UsersRound/><div><b>{preset?'Audience preset':'Audience Builder'}</b><small>{preset?'Review the persisted rule before materializing this audience.':'Create a first-party segment from journey, CRM or device evidence'}</small></div></div><button type="button" onClick={()=>{setBuilder(false);setPreset(null);setPreview(null)}}><X/></button></div>
 {preset&&<div className="audience-preset-banner"><Zap/><div><b>{preset.name}</b><span>{preset.condition} {preset.operator} {preset.value} → {preset.mode}</span></div></div>}
 <label>Audience name<input name="name" required defaultValue={preset?.name||'High-intent prospects'}/></label>
 <div className="audience-rule-grid"><label>Condition<select name="condition" defaultValue={preset?.condition||'Lead grade'}><option>Lead grade</option><option>Conversion propensity</option><option>CRM stage</option><option>Pricing-page views</option><option>LTV tier</option><option>Last activity</option><option>Device ID present</option><option>Device platform</option><option>App ID</option></select></label><label>Operator<select name="operator" defaultValue={preset?.operator||'is'}><option>is</option><option>is one of</option><option>is greater than</option><option>is less than</option><option>contains</option></select></label><label>Value<input name="value" defaultValue={preset?.value||'A'}/></label></div>
 <label>Identity key<select name="identityMode" defaultValue={preset?.identityMode||'auto'}><option value="auto">Auto · contact first, device fallback</option><option value="contact">Contact info · hashed email / phone</option><option value="device">Mobile advertising ID</option></select></label>
 <label>Destination<select name="destination" defaultValue={preset?.destination||'Google Ads · Meta Ads'}><option>Google Ads · Meta Ads</option><option>Google Ads</option><option>Meta Ads</option></select></label>
 <label>Mode<select name="mode" defaultValue={preset?.mode||'Activate'}><option>Activate</option><option>Suppress</option><option>Retarget</option><option>Lookalike seed</option></select></label>
 {preview&&<div className="audience-preview"><div><span>Estimated audience</span><strong>{Number(preview.estimatedSize||0).toLocaleString()}</strong></div><div><span>Workspace coverage</span><strong>{preview.matchedPercent||0}%</strong></div><p>{preview.condition} {preview.operator} {preview.value} → {preview.destination} · {preview.identityMode} identity</p></div>}
 <div className="audience-builder-actions"><button type="button" onClick={()=>{setBuilder(false);setPreset(null);setPreview(null)}}>Cancel</button>{preview?<button type="button" className="app-primary" disabled={saving} onClick={saveAudience}>{saving?'Saving…':'Create & materialize audience'}</button>:<button type="submit" className="app-primary">Preview audience</button>}</div></form></div>}</>
}
function DeliveryCenter(){
 const [items,setItems]=useState<any[]>([])
 const [health,setHealth]=useState<any[]>([])
 const [busy,setBusy]=useState('')
 const [notice,setNotice]=useState<{kind:'ok'|'error'|'',text:string}>({kind:'',text:''})
 const load=async()=>{
  try{
   const [deliveryResult,healthResult]:any=await Promise.all([api.signalDeliveries(),api.connectorHealth()])
   setItems(deliveryResult?.items||[])
   setHealth(healthResult?.items||[])
   setNotice(x=>x.kind==='error'?x:{kind:'',text:''})
  }catch(error:any){
   setNotice({kind:'error',text:error?.message||'Unable to load delivery operations.'})
  }
 }
 useEffect(()=>{load()},[])
 const retry=async(id:string)=>{
  setBusy(id);setNotice({kind:'',text:''})
  try{await api.retrySignalDelivery(id);setNotice({kind:'ok',text:'Delivery re-queued with its persisted identifiers and conversion payload.'});await load()}
  catch(error:any){setNotice({kind:'error',text:error?.message||'Retry could not be queued.'})}
  finally{setBusy('')}
 }
 const replay=async()=>{
  setBusy('dlq');setNotice({kind:'',text:''})
  try{const result:any=await api.replaySignalDlq();setNotice({kind:'ok',text:`${result?.replayed||0} dead-letter deliver${result?.replayed===1?'y':'ies'} re-queued for the worker.`});await load()}
  catch(error:any){setNotice({kind:'error',text:error?.message||'Dead-letter replay failed.'})}
  finally{setBusy('')}
 }
 const queueTest=async()=>{
  setBusy('test');setNotice({kind:'',text:''})
  try{
   const result:any=await api.dispatchSignal({event:'lead.qualified',destination:'Meta Ads',externalId:'ace_test_'+Date.now(),occurredAt:new Date().toISOString(),data:{source:'delivery_center_test'}})
   setNotice({kind:'ok',text:result?.duplicate?'Matching test signal already exists.':'Test signal accepted by the durable delivery queue.'})
   await load()
  }catch(error:any){setNotice({kind:'error',text:error?.message||'Test signal could not be queued. Check DATABASE_URL and connector configuration.'})}
  finally{setBusy('')}
 }
 const delivered=items.filter(x=>x.status==='delivered').length
 const retrying=items.filter(x=>x.status==='retrying'||x.status==='queued').length
 const dead=items.filter(x=>x.status==='dead_letter').length
 const deliveryRate=items.length?((delivered/items.length)*100).toFixed(1):'—'
 return <><PageHead crumb="Activation / Delivery" title="Signal delivery center" sub="Track every outbound conversion, audience and webhook signal with idempotency, retry state and dead-letter visibility."/>
 {notice.text&&<div className={'delivery-notice '+notice.kind}>{notice.kind==='ok'?<CheckCircle2/>:<ShieldCheck/>}<span>{notice.text}</span></div>}
 <div className="stats-grid"><Stat label="Delivery rate" value={deliveryRate==='—'?'—':deliveryRate+'%'} sub="Current persisted queue" Icon={RadioTower}/><Stat label="Queued / retrying" value={String(retrying)} sub="Automatic or manual retry" Icon={Activity}/><Stat label="Dead letter" value={String(dead)} sub="Needs replay or investigation" Icon={ShieldCheck}/><Stat label="Connectors" value={String(health.length)} sub="Health continuously observable" Icon={Cable}/></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Outbound delivery queue</h3><p>One idempotent record per external signal</p></div><div className="panel-actions"><button disabled={busy==='dlq'||dead===0} onClick={replay}>{busy==='dlq'?'Replaying…':'Replay dead letter'}</button><button className="app-primary" disabled={busy==='test'} onClick={queueTest}>{busy==='test'?'Queuing…':'Queue test signal'}</button></div></div>
 {items.length?<table><thead><tr><th>Delivery</th><th>Event</th><th>Destination</th><th>Status</th><th>Attempts</th><th>HTTP</th><th>Latency</th><th></th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td><code>{String(x.id).slice(0,18)}</code></td><td>{x.event}</td><td>{x.destination}</td><td><span className={String(x.status).replace('_','-')}>{x.status}</span></td><td>{x.attempts??0}</td><td>{x.httpStatus??'—'}</td><td>{x.latencyMs?x.latencyMs+'ms':'—'}</td><td>{x.status!=='delivered'&&<button disabled={busy===x.id} onClick={()=>retry(x.id)}>{busy===x.id?'Queuing…':'Retry'}</button>}</td></tr>)}</tbody></table>:<div className="empty-delivery-state"><RadioTower/><div><b>No persisted deliveries yet</b><small>Queue a test signal or allow an event rule to create the first outbound conversion.</small></div></div>}</div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Connector health</h3><p>Destination reliability and latency</p></div></div>{health.length?health.map(x=><div className="monitor-row" key={x.name}><span>{x.name}</span><div className="progress"><i style={{width:Math.max(0,Math.min(100,Number(x.successRate||0)))+'%'}}/></div><b>{x.successRate}%</b><small>{x.p95LatencyMs}ms p95</small><em className={x.status}>{x.status}</em></div>):<div className="empty-delivery-state"><Cable/><div><b>No delivery telemetry yet</b><small>Connector health becomes measurable after persisted worker deliveries are processed.</small></div></div>}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Delivery guarantees</h3><p>Controls used before a signal leaves the platform</p></div></div>{[['Idempotency','SHA-256 delivery key prevents duplicate external writes'],['Retry policy','Failed deliveries use exponential backoff and retain the replay payload'],['Dead-letter queue','Exhausted failures stay visible and are actually re-enqueued on replay'],['Audit trail','Dispatch, retry and replay actions create immutable-style audit entries'],['PII boundary','Retry payloads retain hashed email/phone identifiers rather than raw PII']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div></div></>
}

function Monitoring(){
 const [live,setLive]=useState<any>(null)
 const [rules,setRules]=useState<any[]>([])
 useEffect(()=>{api.monitoring().then((r:any)=>setLive(r)).catch(()=>null);api.monitoringRules().then((r:any)=>setRules(r.items||[])).catch(()=>null)},[])
 const alerts=live?.recentAlerts||[]
 const usage=live?.usage||{}
 return <><PageHead crumb="Operations / Monitoring" title="Platform monitoring" sub="Observe real API health, usage, delivery failures and operational thresholds." action="Open alert center" onAction={()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Alerts'}))}/>
 <div className="stats-grid"><Stat label="Platform status" value={live?.status?String(live.status).replace(/^./,(m:string)=>m.toUpperCase()):'Loading'} sub="Measured from recent API traffic" Icon={Activity}/><Stat label="Requests / min" value={live?.available?String(live.eventsPerMinute||0):'—'} sub="15-minute request rate" Icon={Zap}/><Stat label="5xx error rate" value={live?.available?String(live.failedEventRate||0)+'%':'—'} sub="Recent API responses" Icon={BarChart3}/><Stat label="P95 latency" value={live?.available?String(live.p95LatencyMs||0)+'ms':'—'} sub="15-minute API latency" Icon={Gauge}/></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>24-hour API health</h3><p>Measured from persisted request telemetry</p></div><span className={live?.last24h?.errorRate>2?'warning':'healthy'}>{live?.last24h?.requests||0} requests</span></div>{[['Requests',live?.last24h?.requests||0],['Error rate',(live?.last24h?.errorRate||0)+'%'],['P95 latency',(live?.last24h?.p95LatencyMs||0)+'ms'],['Current open alerts',alerts.filter((x:any)=>x.status==='open').length]].map(x=><div className="monitor-row" key={x[0]}><span>{x[0]}</span><div className="progress"><i style={{width:'100%'}}/></div><b>{String(x[1])}</b></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recent alerts</h3><p>Automatically evaluated operational incidents</p></div></div>{alerts.length?alerts.slice(0,6).map((x:any)=><div className="alert-row" key={x.id}><span className={x.severity}>{x.status}</span><div><b>{x.title}</b><small>{x.detail}</small></div></div>):<div className="empty-state"><Check/><b>No recent incidents</b><small>Rules are being evaluated from live telemetry.</small></div>}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Current-month usage</h3><p>Workspace consumption meters for usage-based packaging</p></div></div><div className="site-detail-grid">{[['API requests',usage.api_requests||0],['Tracked events',usage.tracked_events||0],['Assisted events',usage.assisted_events||0],['Signal dispatches',usage.signal_dispatches||0],['Agent actions',usage.agent_actions||0],['Audience syncs',usage.audience_syncs||0],['Custom integration tests',usage.custom_integration_tests||0]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{Number(x[1]).toLocaleString('en-IN')}</b></div>)}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Automated monitoring rules</h3><p>Persisted thresholds evaluated against live workspace telemetry</p></div></div><div className="monitor-rule-grid">{rules.map((x:any)=><article key={x.id||x.metric}><Activity/><div><b>{String(x.metric).replaceAll('_',' ')}</b><small>{x.operator} {String(x.threshold)} · {x.window_minutes||10} min window</small></div><span className={String(x.severity).toLowerCase()}>{x.severity}</span></article>)}</div></div></>
}
function Alerts(){
 const [items,setItems]=useState<any[]>([])
 const [selected,setSelected]=useState('')
 useEffect(()=>{api.alerts().then((r:any)=>{const mapped=(r.items||[]).map((x:any)=>({...x,severity:String(x.severity||'info').replace(/^./,(m:string)=>m.toUpperCase()),source:x.source||'Platform monitoring',age:new Date(x.detected_at||Date.now()).toLocaleString(),detail:x.detail||'',status:x.status||'open'}));setItems(mapped);if(mapped[0])setSelected(mapped[0].id)}).catch(()=>null)},[])
 const current=items.find(x=>x.id===selected)||items[0]
 const resolve=async(id:string)=>{await api.resolveAlert(id).catch(()=>null);setItems(xs=>xs.map(x=>x.id===id?{...x,status:'resolved'}:x))}
 return <><PageHead crumb="Operations / Alerts" title="Alert Center" sub="Triage incidents generated from real workspace telemetry and operational thresholds." action="Manage rules" onAction={()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Monitoring'}))}/>
 <div className="stats-grid"><Stat label="Open alerts" value={String(items.filter(x=>x.status==='open').length)} sub="Live operational incidents" Icon={Bell}/><Stat label="Critical" value={String(items.filter(x=>x.status==='open'&&String(x.severity).toLowerCase()==='critical').length)} sub="Needs immediate review" Icon={Activity}/><Stat label="Warnings" value={String(items.filter(x=>x.status==='open'&&String(x.severity).toLowerCase()==='warning').length)} sub="Threshold breaches" Icon={Check}/><Stat label="Resolved" value={String(items.filter(x=>x.status==='resolved').length)} sub="Incident history" Icon={MessageCircle}/></div>
 <div className="alert-center-layout"><div className="app-panel alert-center-list"><div className="panel-head"><div><h3>Operational incidents</h3><p>Newest telemetry-generated incidents first</p></div></div>{items.length?items.map(x=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><Bell/><div><b>{x.title}</b><small>{x.source} · {x.age}</small></div><span className={String(x.severity).toLowerCase()}>{x.severity}</span><em className={x.status}>{x.status}</em></button>):<div className="empty-state"><Check/><b>No incidents</b><small>Monitoring rules have not detected a breach.</small></div>}</div>
 {current&&<div className="app-panel alert-center-detail"><div className="panel-head"><div><h3>{current.title}</h3><p>{current.source}</p></div><span className={'diag-severity '+String(current.severity).toLowerCase()}>{current.severity}</span></div><p className="alert-detail-copy">{current.detail}</p><div className="diagnostic-evidence">{[['Alert ID',current.id],['Detected',current.age],['Affected period',current.affectedPeriod||'—'],['Owner',current.owner||'Workspace operations'],['Metric',current.metric||'—'],['Threshold',current.threshold??'—'],['Observed',current.metric_value??'—'],['Status',current.status]].map(x=><article key={x[0]}><span>{x[0]}</span><b>{String(x[1])}</b></article>)}</div><div className="alert-runbook"><ShieldCheck/><div><b>Recommended investigation</b><p>{current.recommendation||'Inspect the source evidence and recent changes before resolving the incident.'}</p></div></div>{current.status==='open'?<div className="approval-actions"><button className="approve" onClick={()=>resolve(current.id)}><Check/>Mark resolved</button><button onClick={()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:current.metric==='dead_letter_jobs'||current.metric==='signal_delivery_backlog_minutes'?'Delivery':current.metric==='audience_sync_errors'?'Audiences':'Diagnostics'}))}><ArrowRight/>Open investigation workspace</button></div>:<div className="approval-final approved"><Check/><b>Resolved</b></div>}</div>}</div></>
}
function Developers(){
 const [secret,setSecret]=useState('Hidden until rotated')
 const [delivery,setDelivery]=useState<any[]>([])
 const [endpoints,setEndpoints]=useState<any[]>([])
 const [sdk,setSdk]=useState<'curl'|'node'|'python'>('curl')
 const [builder,setBuilder]=useState(false)
 const [endpointDraft,setEndpointDraft]=useState({event:'lead.qualified',url:''})
 const [notice,setNotice]=useState('')
 const [busy,setBusy]=useState('')
 const load=async()=>{
  try{
   const r:any=await api.webhookDeliveries()
   setDelivery(r.items||[])
   setEndpoints(r.endpoints||[])
  }catch(e:any){setNotice(e?.message||'Developer data could not be loaded.')}
 }
 useEffect(()=>{load()},[])
 const rotate=async()=>{
  setBusy('secret');setNotice('')
  try{const r:any=await api.rotateWebhookSecret();setSecret(r.secret);setNotice('New signing secret generated. Copy it now; only its fingerprint is persisted.')}
  catch(e:any){setNotice(e?.message||'Secret rotation failed.')}
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
  catch(e:any){setNotice(e?.message||'Endpoint could not be created.')}
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
 return <><PageHead crumb="Platform / Developers" title="Developer & webhook console" sub="Integrate proprietary systems with API keys, signed webhooks and server-to-server event contracts." action="Open API reference" onAction={()=>document.getElementById('api-quick-start')?.scrollIntoView({behavior:'smooth'})}/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="stats-grid"><Stat label="Webhook deliveries" value={String(delivery.length)} sub="Persisted delivery records" Icon={Activity}/><Stat label="Delivery success" value={successRate==='—'?'—':successRate+'%'} sub={failed+' failed deliveries'} Icon={RadioTower}/><Stat label="Max observed latency" value={p95?p95+'ms':'—'} sub="Current loaded history" Icon={Gauge}/><Stat label="Active endpoints" value={String(endpoints.filter((x:any)=>x.status==='active').length)} sub="Persisted outbound endpoints" Icon={Cable}/></div>
 <div className="two-col"><div className="app-panel" id="api-quick-start"><div className="panel-head"><div><h3>API quick start</h3><p>Server-to-server event ingestion</p></div><button onClick={()=>copy(snippets[sdk])}>Copy</button></div><div className="code-block"><code>{snippets[sdk]}</code></div><div className="sdk-tabs"><button className={sdk==='curl'?'active':''} onClick={()=>setSdk('curl')}>cURL</button><button className={sdk==='node'?'active':''} onClick={()=>setSdk('node')}>Node.js</button><button className={sdk==='python'?'active':''} onClick={()=>setSdk('python')}>Python</button></div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Webhook signing</h3><p>Verify outbound event authenticity</p></div></div><div className="api-key-box"><div><span>Signing secret</span><code>{secret}</code></div><button disabled={busy==='secret'} onClick={rotate}>{busy==='secret'?'Rotating…':'Rotate secret'}</button></div><div className="setting-line"><span>Signature header</span><b>X-Ace-Signature</b><span className="healthy">HMAC-SHA256</span></div><div className="setting-line"><span>Timestamp header</span><b>X-Ace-Timestamp</b><span className="healthy">Required</span></div><div className="setting-line"><span>Replay tolerance</span><b>5 minutes</b><span className="healthy">Enforced</span></div></div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Webhook endpoints</h3><p>Workspace-specific outbound subscriptions</p></div><button onClick={()=>setBuilder(true)}><Plus/>Add endpoint</button></div>{endpoints.length?endpoints.map((x:any)=><div className="setting-line" key={x.id}><code>{x.event}</code><b>{x.url}</b><span className={x.status==='active'?'healthy':'status'}>{x.status}</span></div>):<div className="empty-delivery-state"><Cable/><div><b>No webhook endpoints yet</b><small>Add an HTTPS endpoint to receive workspace events.</small></div></div>}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Webhook delivery log</h3><p>Inspect persisted status, latency and retry state</p></div><button onClick={load}>Refresh</button></div>{delivery.length?<table><thead><tr><th>Delivery ID</th><th>Event</th><th>HTTP</th><th>Latency</th><th>Status</th><th></th></tr></thead><tbody>{delivery.map((x:any)=><tr key={x.id}><td><code>{x.id}</code></td><td>{x.event}</td><td>{x.statusCode??'—'}</td><td>{x.latencyMs?x.latencyMs+'ms':'—'}</td><td><span className={String(x.status).toLowerCase().replace(' ','-')}>{x.status}</span></td><td>{String(x.status).toLowerCase()!=='delivered'&&<button disabled={busy===x.id} onClick={()=>retry(x.id)}>{busy===x.id?'Queuing…':'Retry'}</button>}</td></tr>)}</tbody></table>:<div className="empty-delivery-state"><RadioTower/><div><b>No webhook deliveries yet</b><small>Delivery history appears after an outbound endpoint receives an event.</small></div></div>}</div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Event catalog</h3><p>Stable contracts for connected systems</p></div></div>{[['lead.created','Lead entered CRM'],['lead.qualified','Qualified outcome'],['consultation.booked','Meeting scheduled'],['revenue.closed','Closed revenue'],['audience.updated','Activation segment changed'],['sync.failed','Connector delivery failure']].map(x=><button className="developer-event-row developer-event-button" key={x[0]} onClick={()=>{setEndpointDraft({event:x[0],url:''});setBuilder(true)}}><code>{x[0]}</code><span>{x[1]}</span><ChevronRight/></button>)}</div><div className="app-panel"><div className="panel-head"><div><h3>Reliability contract</h3><p>Delivery guarantees in the implementation design</p></div></div>{[['Idempotency','event_id required'],['Retries','Exponential backoff'],['Dead-letter queue','After retry exhaustion'],['Observability','Delivery history + alerting'],['Versioning','Stable event schema versions']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><Check/></div>)}</div></div>
 {builder&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><Cable/><div><b>Add outbound webhook</b><small>Subscribe one HTTPS endpoint to one workspace event.</small></div></div><button onClick={()=>setBuilder(false)}><X/></button></div><div className="connector-step"><label>Event<input value={endpointDraft.event} onChange={e=>setEndpointDraft({...endpointDraft,event:e.target.value})}/></label><label>HTTPS endpoint<input placeholder="https://example.com/webhooks/ace" value={endpointDraft.url} onChange={e=>setEndpointDraft({...endpointDraft,url:e.target.value})}/></label><button disabled={busy==='endpoint'||!endpointDraft.event.trim()||!endpointDraft.url.trim()} onClick={addEndpoint}>{busy==='endpoint'?'Creating…':'Create endpoint'}</button></div></div></div>}</>
}
function UsersRolesSettings(){
 const [members,setMembers]=useState<any[]>([])
 const [email,setEmail]=useState('')
 const [role,setRole]=useState('analyst')
 const [inviteToken,setInviteToken]=useState('')
 const [busy,setBusy]=useState('')
 const load=()=>api.members().then((r:any)=>setMembers(r.items||[])).catch(()=>setMembers([]))
 useEffect(()=>{load()},[])
 const invite=async()=>{if(!email.trim())return;setBusy('invite');try{const r:any=await api.inviteMember({email,role});setInviteToken(r.inviteToken||'');setEmail('');load()}finally{setBusy('')}}
 const changeRole=async(id:string,next:string)=>{setBusy(id);try{await api.changeMemberRole(id,next);load()}finally{setBusy('')}}
 const deactivate=async(id:string)=>{setBusy(id);try{await api.deactivateMember(id);load()}finally{setBusy('')}}
 return <div className="settings-detail"><h3>Users & roles</h3><p>Membership and role changes are enforced by the backend. Changing a role or deactivating a member revokes their active sessions.</p>
 <div className="setup-form-grid"><label><span>Invite email</span><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="teammate@company.com"/></label><label><span>Role</span><select value={role} onChange={e=>setRole(e.target.value)}><option value="admin">Admin</option><option value="analyst">Analyst</option><option value="operator">Operator</option></select></label></div>
 <button className="app-primary" disabled={busy==='invite'} onClick={invite}>{busy==='invite'?'Creating invite…':'Invite member'}</button>
 {inviteToken&&<div className="api-key-box"><div><span>One-time invite token</span><code>{inviteToken}</code></div><small>Copy this now and send it through your approved invitation channel. Only its hash is stored.</small></div>}
 <div className="member-role-legend">{[['Owner','Full control'],['Admin','Manage workspace, members and activation'],['Analyst','Read, analyze and export'],['Operator','Run approved operational workflows']].map(x=><span key={x[0]}><b>{x[0]}</b>{x[1]}</span>)}</div>
 {members.map((x:any)=><div className="member-row" key={x.id}><span className="avatar-sm">{String(x.name||x.email||'?')[0].toUpperCase()}</span><div><b>{x.name||x.email}</b><small>{x.email} · {x.status}</small></div><select value={x.role} disabled={x.role==='owner'||busy===x.id} onChange={e=>changeRole(x.id,e.target.value)}><option value="owner">Owner</option><option value="admin">Admin</option><option value="analyst">Analyst</option><option value="operator">Operator</option></select>{x.role!=='owner'&&x.status==='active'&&<button disabled={busy===x.id} onClick={()=>deactivate(x.id)}>Deactivate</button>}</div>)}
 </div>
}

function GovernanceSettings(){
 const [data,setData]=useState<any>(null)
 const [privacy,setPrivacy]=useState<any>(null)
 const [selectorType,setSelectorType]=useState('visitor')
 const [selector,setSelector]=useState('')
 const [result,setResult]=useState<any>(null)
 const [busy,setBusy]=useState('')
 const refresh=()=>{api.consentStats().then((r:any)=>setData(r)).catch(()=>null);api.privacyRequests().then((r:any)=>setPrivacy(r)).catch(()=>null)}
 useEffect(refresh,[])
 const runExport=async()=>{if(!selector)return;setBusy('export');try{setResult(await api.privacyExport(selectorType,selector));refresh()}finally{setBusy('')}}
 const runDelete=async()=>{if(!selector)return;setBusy('delete');try{setResult(await api.privacyDelete(selectorType,selector));refresh()}finally{setBusy('')}}
 const runPurge=async()=>{setBusy('purge');try{setResult(await api.privacyRetentionPurge(true));refresh()}finally{setBusy('')}}
 const s=data?.stats||{}
 return <div className="settings-detail"><h3>Data governance & consent</h3><p>Consent decisions are enforced server-side before analytics tracking and marketing activation.</p>
 <div className="stats-grid compact"><Stat label="Consent records" value={String(s.total||0)} sub="Auditable subjects" Icon={ShieldCheck}/><Stat label="Analytics allowed" value={String(s.analytics||0)} sub="Measurement consent" Icon={Activity}/><Stat label="Marketing allowed" value={String(s.marketing||0)} sub="Activation consent" Icon={Target}/><Stat label="Revoked" value={String(s.revoked||0)} sub="Activation blocked" Icon={X}/></div>
 {['Essential storage','Analytics tracking','Marketing activation','Personalization'].map((x,i)=><div className="setting-line" key={x}><span>{x}</span><b>{i===0?'Always enabled':'Consent required'}</b><span className={i===0?'healthy':'status'}>{i===0?'Essential':'Default off'}</span></div>)}
 <h4>Data subject operations</h4><div className="privacy-ops"><select value={selectorType} onChange={e=>setSelectorType(e.target.value)}><option value="visitor">Visitor ID</option><option value="customer">Customer ID</option><option value="email">Email</option><option value="phone">Phone</option><option value="lead">Lead ID</option></select><input value={selector} onChange={e=>setSelector(e.target.value)} placeholder="Subject identifier"/><button onClick={runExport} disabled={!!busy||!selector}>{busy==='export'?'Exporting…':'Export data'}</button><button onClick={runDelete} disabled={!!busy||!selector}>{busy==='delete'?'Deleting…':'Delete data'}</button><button onClick={runPurge} disabled={!!busy}>{busy==='purge'?'Checking…':'Preview retention purge'}</button></div>
 {result&&<pre className="privacy-result">{JSON.stringify(result,null,2)}</pre>}
 <h4>Retention policy</h4><div className="setting-line"><span>Click sessions</span><b>{privacy?.policy?.clickSessions?privacy.policy.clickSessions+' days':'Explicit policy not set'}</b><span className="status">Expired sessions still purged</span></div><div className="setting-line"><span>Assisted events</span><b>{privacy?.policy?.assistedEvents?privacy.policy.assistedEvents+' days':'Explicit policy not set'}</b><span className="status">Opt-in</span></div><div className="setting-line"><span>Lead profiles</span><b>{privacy?.policy?.leadProfiles?privacy.policy.leadProfiles+' days':'Explicit policy not set'}</b><span className="status">Opt-in</span></div><div className="setting-line"><span>Consent records</span><b>{privacy?.policy?.consentRecords?privacy.policy.consentRecords+' days':'Explicit policy not set'}</b><span className="status">Opt-in</span></div>
 <h4>Recent privacy requests</h4>{(privacy?.items||[]).slice(0,8).map((x:any)=><div className="audit-row" key={x.id}><ShieldCheck/><div><b>{x.request_type}</b><small>{x.selector_type||'workspace'} · {x.status}</small></div><span>{new Date(x.created_at).toLocaleString()}</span></div>)}
 <h4>Recent consent audit</h4>{(data?.audit||[]).slice(0,8).map((x:any)=><div className="audit-row" key={x.id}><ShieldCheck/><div><b>{x.action}</b><small>{x.subject_type} · {x.subject_id}</small></div><span>{new Date(x.created_at).toLocaleString()}</span></div>)}
 </div>
}

function BillingUsageSettings(){
 const [data,setData]=useState<any>(null)
 const [subscription,setSubscription]=useState<any>(null)
 const [billingBusy,setBillingBusy]=useState('')
 useEffect(()=>{api.billingUsage().then((r:any)=>setData(r)).catch(()=>null);api.subscription().then((r:any)=>setSubscription(r)).catch(()=>null)},[])
 const openPortal=async()=>{setBillingBusy('portal');try{const r:any=await api.createBillingPortal();if(r?.url)window.location.href=r.url}finally{setBillingBusy('')}}
 const startCheckout=async()=>{const plan=subscription?.planCode||data?.planCode;if(!plan)return;setBillingBusy('checkout');try{const r:any=await api.createBillingCheckout(plan);if(r?.url)window.location.href=r.url}finally{setBillingBusy('')}}
 const rows=[
  ['Tracked events','tracked_events',Zap],
  ['Assisted events','assisted_events',DatabaseZap],
  ['Signal dispatches','signal_dispatches',RadioTower],
  ['Agent actions','agent_actions',Bot],
  ['Audience syncs','audience_syncs',UsersRound],
  ['Custom integration tests','custom_integration_tests',Cable]
 ]
 return <div className="settings-detail"><h3>Billing & usage</h3><p>Usage is measured from successful workspace operations. Limits are enforced before expensive actions are accepted.</p>
 <div className="billing-plan-summary"><div><span>Plan</span><b>{data?.planCode||'usage'}</b></div><div><span>Status</span><b>{data?.status||'loading'}</b></div><div><span>Current period</span><b>{data?.periodStart&&data?.periodEnd?new Date(data.periodStart).toLocaleDateString()+' – '+new Date(data.periodEnd).toLocaleDateString():'—'}</b></div><div><span>Payments</span><b>{subscription?.providerConfigured?(subscription?.paymentConfigured?'Stripe connected':'Stripe ready'):'Not configured'}</b></div></div>{subscription?.providerConfigured&&<div className="approval-actions">{subscription?.paymentConfigured?<button onClick={openPortal} disabled={!!billingBusy}>{billingBusy==='portal'?'Opening…':'Manage billing'}</button>:<button onClick={startCheckout} disabled={!!billingBusy}>{billingBusy==='checkout'?'Opening…':'Start checkout for configured plan'}</button>}</div>}
 <div className="stats-grid compact">{rows.map(([label,key,Icon]:any)=>{const x=data?.usage?.[key];return <Stat key={key} label={label} value={x?Number(x.used||0).toLocaleString('en-IN'):'—'} sub={x?(x.limit===0?'Unlimited':String(x.percent||0)+'% of '+Number(x.limit||0).toLocaleString('en-IN')):'Loading usage'} Icon={Icon}/>})}</div>
 <h4>Entitlement details</h4>{rows.map(([label,key]:any)=>{const x=data?.usage?.[key];const pct=Math.max(0,Math.min(100,Number(x?.percent||0)));return <div className="setting-line" key={key}><span>{label}</span><b>{x?.limit===0?'Unlimited':Number(x?.limit||0).toLocaleString('en-IN')}</b><div className="progress"><i style={{width:pct+'%'}}/></div><em>{x?Number(x.remaining||0).toLocaleString('en-IN')+' remaining':'—'}</em></div>})}
 <div className="source-conflict-note"><ShieldCheck/><div><b>Billing boundary</b><p>AceMarketing meters and enforces workspace usage, but does not charge a card or generate invoices until a real billing provider is configured. Packaging and limits remain configurable instead of presenting unsupported public tiers.</p></div></div>
 </div>
}

function Settings(){
 const sections=['Workspace','Users & roles','Tracking','Governance','API & webhooks','Agent approvals','Notifications','Billing & usage']
 const [section,setSection]=useState('Workspace')
 const [apiKey,setApiKey]=useState('')
 const [notice,setNotice]=useState('')
 const [busy,setBusy]=useState('')
 const [settings,setSettings]=useState<any>({
  organization:'Ace EdTech',timezone:'Asia/Kolkata',currency:'INR',reportingWeek:'Monday',defaultAttribution:'Full path',environment:'Production',
  primaryDomain:'www.example.com',crossDomainTracking:'Enabled',gclidPersistenceDays:90,fbclidPersistenceDays:90
,notifyDeliveryFailures:true,notifyTokenExpiry:true,notifyAudienceStale:true,notifyDailySummary:true,notificationEmail:'',notificationSlack:false,approvalSignalReturn:'Auto-run',approvalCrmEnrichment:'Auto-run',approvalLeadQualification:'Human approval',approvalAudienceSuppression:'Human approval',approvalCustomIntegration:'Human approval' })
 const load=()=>api.settings().then((r:any)=>setSettings((x:any)=>({...x,...r}))).catch(()=>null)
 useEffect(()=>{load()},[])
 const save=async(keys?:string[])=>{
  setBusy('save');setNotice('')
  try{
   const payload:any={}
   for(const [key,value] of Object.entries(settings)) if(!keys||keys.includes(key)) payload[key]=value
   const r:any=await api.saveSettings(payload)
   setSettings((x:any)=>({...x,...r}))
   setNotice('Workspace settings saved.')
  }catch(e:any){setNotice(e?.message||'Settings could not be saved.')}
  finally{setBusy('')}
 }
 const makeKey=async()=>{try{const r:any=await api.createApiKey();setApiKey(r.key);setNotice('API key created. Copy it now; only its fingerprint is stored.')}catch(e:any){setNotice(e?.message||'API key could not be created.')}}
 const workspaceFields=[['organization','Organization'],['timezone','Timezone'],['currency','Currency'],['reportingWeek','Reporting week'],['defaultAttribution','Default attribution'],['environment','Environment']]
 const content:any={
  'Workspace':<div className="settings-detail"><h3>Workspace profile</h3><p>These values are persisted for this workspace and used by reporting and operational views.</p><div className="setup-form-grid">{workspaceFields.map(([key,label])=><label key={key}><span>{label}</span><input value={String(settings[key]??'')} onChange={e=>setSettings({...settings,[key]:e.target.value})}/></label>)}</div><button className="app-primary" disabled={busy==='save'} onClick={()=>save(workspaceFields.map(x=>x[0]))}>{busy==='save'?'Saving…':'Save workspace'}</button></div>,
  'Users & roles':<UsersRolesSettings/>,
  'Tracking':<div className="settings-detail"><h3>Tracking configuration</h3><p>Update first-party collection defaults without editing code.</p><div className="setup-form-grid"><label><span>Primary domain</span><input value={settings.primaryDomain||''} onChange={e=>setSettings({...settings,primaryDomain:e.target.value})}/></label><label><span>Cross-domain tracking</span><select value={settings.crossDomainTracking||'Enabled'} onChange={e=>setSettings({...settings,crossDomainTracking:e.target.value})}><option>Enabled</option><option>Disabled</option></select></label><label><span>GCLID persistence days</span><input type="number" min="1" max="365" value={settings.gclidPersistenceDays||90} onChange={e=>setSettings({...settings,gclidPersistenceDays:Number(e.target.value)})}/></label><label><span>FBCLID persistence days</span><input type="number" min="1" max="365" value={settings.fbclidPersistenceDays||90} onChange={e=>setSettings({...settings,fbclidPersistenceDays:Number(e.target.value)})}/></label></div><div className="setting-line"><span>Server event endpoint</span><b>/api/track</b><span className="healthy">Active</span></div><button className="app-primary" disabled={busy==='save'} onClick={()=>save(['primaryDomain','crossDomainTracking','gclidPersistenceDays','fbclidPersistenceDays'])}>{busy==='save'?'Saving…':'Save tracking settings'}</button></div>,
  'Governance':<GovernanceSettings/>,
  'API & webhooks':<div className="settings-detail"><h3>API keys & webhooks</h3><div className="api-key-box"><div><span>Workspace API key</span><code>{apiKey||'Hidden until created or rotated'}</code></div><button onClick={makeKey}>{apiKey?'Rotate key':'Create key'}</button></div><p>Outbound webhook subscriptions are managed in the Developer console, where endpoints and delivery history are persisted.</p></div>,
  'Agent approvals':<div className="settings-detail"><h3>Agent approval boundaries</h3><p>Persist the workspace policy that determines which automated actions require human approval.</p>{[
    ['approvalSignalReturn','Signal return','Low risk'],
    ['approvalCrmEnrichment','CRM enrichment','Low risk'],
    ['approvalLeadQualification','Lead qualification call','Customer contact'],
    ['approvalAudienceSuppression','Audience suppression','Spend impact'],
    ['approvalCustomIntegration','Custom integration write','External mutation']
  ].map(([key,label,risk])=><div className="setting-line" key={key}><span>{label}</span><select value={settings[key]||'Human approval'} onChange={e=>setSettings({...settings,[key]:e.target.value})}><option>Auto-run</option><option>Human approval</option><option>Disabled</option></select><em>{risk}</em></div>)}<button className="app-primary" disabled={busy==='save'} onClick={()=>save(['approvalSignalReturn','approvalCrmEnrichment','approvalLeadQualification','approvalAudienceSuppression','approvalCustomIntegration'])}>{busy==='save'?'Saving…':'Save approval policy'}</button></div>,
  'Notifications':<div className="settings-detail"><h3>Notifications</h3><p>Choose which workspace events should generate operator notifications.</p><div className="setup-form-grid"><label><span>Notification email</span><input type="email" value={settings.notificationEmail||''} onChange={e=>setSettings({...settings,notificationEmail:e.target.value})} placeholder="ops@company.com"/></label><label><span>Slack notifications</span><select value={settings.notificationSlack?'Enabled':'Disabled'} onChange={e=>setSettings({...settings,notificationSlack:e.target.value==='Enabled'})}><option>Disabled</option><option>Enabled</option></select></label></div>{[
    ['notifyDeliveryFailures','Critical delivery failures','Delivery / DLQ'],
    ['notifyTokenExpiry','Connector token expiry','Integrations'],
    ['notifyAudienceStale','Audience stale > 60m','Audiences'],
    ['notifyDailySummary','Daily performance summary','Reporting']
  ].map(([key,label,scope])=><div className="setting-line" key={key}><span>{label}</span><b>{scope}</b><label className="setting-toggle"><input type="checkbox" checked={Boolean(settings[key])} onChange={e=>setSettings({...settings,[key]:e.target.checked})}/><span>{settings[key]?'Enabled':'Disabled'}</span></label></div>)}<button className="app-primary" disabled={busy==='save'} onClick={()=>save(['notifyDeliveryFailures','notifyTokenExpiry','notifyAudienceStale','notifyDailySummary','notificationEmail','notificationSlack'])}>{busy==='save'?'Saving…':'Save notifications'}</button></div>,
  'Billing & usage':<BillingUsageSettings/>
 }
 return <><PageHead crumb="Workspace / Settings" title="Workspace settings" sub="Configure organization, access, tracking, governance, developer access and automation boundaries."/>
 {notice&&<div className="delivery-notice ok"><CheckCircle2/><span>{notice}</span></div>}
 <div className="settings-shell"><aside className="settings-nav">{sections.map(x=><button key={x} className={section===x?'active':''} onClick={()=>setSection(x)}>{x}<ChevronRight/></button>)}</aside><div className="app-panel">{content[section]}</div></div></>
}
function Product({back}:{back:()=>void}){
 const [tab,setTab]=useState<AppTab>(()=>{const saved=window.localStorage.getItem('ace_active_tab') as AppTab|null;return saved&&appTabs.some(([name])=>name===saved)?saved:'Overview'})
 const [workspaceOpen,setWorkspaceOpen]=useState(false)
 const [mobileNavOpen,setMobileNavOpen]=useState(false)
 const [workspace,setWorkspace]=useState('Ace EdTech')
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
 useEffect(()=>{api.workspaces().then((r:any)=>{if(r.items?.length){setWorkspaces(r.items);if(!r.items.some((x:any)=>x.name===workspace))setWorkspace(r.items[0].name)}}).catch(()=>null)},[])
 useEffect(()=>{const load=()=>api.dashboardSummary().then((r:any)=>setSectionSummary(r)).catch(()=>null);load();const id=setInterval(load,30000);return()=>clearInterval(id)},[])
 useEffect(()=>{window.localStorage.setItem('ace_active_tab',tab)},[tab])
 useEffect(()=>{window.localStorage.setItem('ace_nav_sections',JSON.stringify(navOpen))},[navOpen])
 useEffect(()=>{const section=dashboardSections.find(s=>s.tabs.includes(tab as any));if(section&&!navOpen[section.id])setNavOpen(x=>({...x,[section.id]:true}))},[tab])
 useEffect(()=>{const openTab=(event:any)=>{const next=event?.detail as AppTab;if(appTabs.some(([name])=>name===next))setTab(next)};window.addEventListener('ace-app-tab',openTab as EventListener);return()=>window.removeEventListener('ace-app-tab',openTab as EventListener)},[])
 const createWorkspace=async()=>{
  if(!workspaceDraft.name.trim())return
  setWorkspaceBusy(true)
  try{
   const item:any=await api.createWorkspace(workspaceDraft)
   setWorkspaces(xs=>[...xs,item])
   setWorkspace(item.name)
   if(item.id)window.localStorage.setItem('ace_workspace_id',item.id)
   setCreateOpen(false);setWorkspaceDraft({name:'',environment:'Production'})
  }finally{setWorkspaceBusy(false)}
 }
 const chooseWorkspace=(x:any)=>{
  setWorkspace(x.name)
  if(x.id)window.localStorage.setItem('ace_workspace_id',x.id)
  setWorkspaceOpen(false)
 }
 const searchMatches=search.trim()?appTabs.filter(([name])=>name.toLowerCase().includes(search.trim().toLowerCase())).slice(0,8):[]
 const runSearch=(name?:string)=>{const target=(name||searchMatches[0]?.[0]) as AppTab|undefined;if(target){setTab(target);setSearch('')}}
 const currentWorkspace=workspaces.find(x=>x.name===workspace)||workspaces[0]
 const view=useMemo(()=>({Launchpad:<Launchpad/>,Overview:<Overview/>,AdSync:<AdSync/>,Funnel:<Funnel/>,Events:<Events/>,Adjustments:<Adjustments/>,Diagnostics:<Diagnostics/>,Reconciliation:<Reconciliation/>,Fraud:<Fraud/>,"Deep Links":<DeepLinks/>,Sites:<Sites/>,Fingerprinting:<Fingerprinting/>,"Live Sync":<LiveSync/>,"Data Hub":<DataHub/>,"Customer 360":<Customer360/>,"Offline Attribution":<OfflineAttribution/>,Matchback:<Matchback/>,"POS & Stores":<POSAndStores/>,Journeys:<Journeys/>,Identity:<Identity/>,Models:<Models/>,Attribution:<Attribution/>,Planner:<Planner/>,Reports:<Reports/>,Enrich:<Enrich/>,"Lead Grading":<LeadGrading/>,Behavior:<Behavior/>,Feed:<Feed/>,Agents:<Agents/>,Routing:<Routing/>,"Follow-ups":<FollowUps/>,Calls:<Calls/>,Meetings:<Meetings/>,Feedback:<Feedback/>,Approvals:<Approvals/>,"Ask Ace":<AskAce/>,Integrations:<Integrations/>,"Data Flows":<DataFlows/>,"Real-Time Activation":<RealTimeActivation/>,Audiences:<Audiences/>,Delivery:<DeliveryCenter/>,Monitoring:<Monitoring/>,Alerts:<Alerts/>,Developers:<Developers/>,Settings:<Settings/>}[tab]),[tab])
 return <div className={'product '+(mobileNavOpen?'mobile-nav-open':'')}><aside className="product-sidebar" aria-label="Workspace navigation"><Brand/><div className="workspace-wrap"><button className="workspace" onClick={()=>setWorkspaceOpen(!workspaceOpen)}><span>{currentWorkspace?.initials||'AM'}</span><div><b>{workspace}</b><small>{currentWorkspace?.environment||'Production'} workspace</small></div><ChevronDown/></button>{workspaceOpen&&<div className="workspace-menu">{workspaces.map((x:any)=><button key={x.id||x.name} onClick={()=>chooseWorkspace(x)} className={workspace===x.name?'active':''}><span>{x.initials||String(x.name).split(/\s+/).map((s:string)=>s[0]).join('').slice(0,3)}</span><div><b>{x.name}</b><small>{x.environment||'Production'}</small></div>{workspace===x.name&&<Check/>}</button>)}<button className="new-workspace" onClick={()=>{setWorkspaceOpen(false);setCreateOpen(true)}}><Plus/>Create workspace</button></div>}</div><nav className="product-nav">
 <div className="product-nav-filter"><Search/><input value={navFilter} onChange={e=>setNavFilter(e.target.value)} placeholder="Find feature..."/></div>
 {dashboardSections.map(section=>{
  const SectionIcon=section.icon
  const matching=section.tabs.filter(name=>!navFilter.trim()||name.toLowerCase().includes(navFilter.trim().toLowerCase())||section.label.toLowerCase().includes(navFilter.trim().toLowerCase()))
  if(navFilter.trim()&&!matching.length)return null
  const opened=navFilter.trim()?true:navOpen[section.id]
  return <div className="product-nav-group" key={section.id}>
   <button className="product-nav-group-head" aria-label={'Toggle '+section.id+' navigation group'} onClick={()=>setNavOpen(x=>({...x,[section.id]:!x[section.id]}))}><SectionIcon/><span>{section.label}</span><small>{matching.length}</small><ChevronDown className={opened?'open':''}/></button>
   {opened&&<div className="product-nav-group-items">{matching.map(name=>{const meta=tabMeta[name];const I=meta?.Icon||Activity;return <button key={name} className={tab===name?'active':''} onClick={()=>{setTab(name as AppTab);setMobileNavOpen(false)}} title={name}><I/>{name}{tab===name&&<span className="nav-active-dot"/>}</button>})}</div>}
  </div>
 })}
 </nav><div className="aside-footer"><button onClick={back}><ArrowRight/>Back to website</button><div className="profile-mini"><span>S</span><div><b>Sakshee</b><small>Workspace owner</small></div></div></div></aside>
 {mobileNavOpen&&<button className="product-mobile-nav-backdrop" aria-label="Close workspace navigation" onClick={()=>setMobileNavOpen(false)}/>}
 <main className="product-main"><header className="product-head"><button className="product-mobile-nav-toggle" aria-label="Open workspace navigation" onClick={()=>setMobileNavOpen(true)}><Menu/></button><div className="global-search operational-search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runSearch()} placeholder="Search journeys, leads, campaigns, settings..."/>{searchMatches.length>0&&<div className="global-search-results">{searchMatches.map(([name,I])=><button key={name} onClick={()=>runSearch(name)}><I/><span>{name}</span><ArrowRight/></button>)}</div>}</div><div><button className="sync sync-button" aria-label="Open monitoring center" onClick={()=>setTab('Monitoring')}>● Monitoring</button><button aria-label="Support" onClick={()=>setTab('Settings')} title="Open workspace support/settings"><Headphones/></button><button aria-label="Region and language" onClick={()=>setRegionOpen(x=>!x)}><Globe2/></button><span className="avatar-sm">S</span>{regionOpen&&<div className="region-popover"><b>Workspace locale</b><span>Timezone · Asia/Kolkata</span><span>Currency · INR</span><button onClick={()=>{setRegionOpen(false);setTab('Settings')}}>Change in Settings</button></div>}</div></header>
 <div className="product-section-strip" aria-label="Dashboard sections">
  {dashboardSections.map((section:any)=>{
   const Icon=section.icon
   const active=section.tabs.includes(tab as any)
   const area=(sectionSummary?.areas||[]).find((x:any)=>x.key===(section.id==='workspace'?'data':section.id))
   const target=section.id==='workspace'?'Overview':section.tabs[0]
   return <button key={section.id} className={active?'active':''} aria-label={section.label} onClick={()=>setTab(target as AppTab)}><span><Icon/></span><div><b aria-hidden="true">{section.label}</b><small>{area?.ready?'Ready':sectionSummary?'Needs setup':'Checking…'}</small></div><i className={area?.ready?'ready':'setup'}/></button>
  })}
 </div>
 <div className="product-body">{view}</div></main>
 {createOpen&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><Building2/><div><b>Create workspace</b><small>Create a persisted tenant workspace.</small></div></div><button onClick={()=>setCreateOpen(false)}><X/></button></div><div className="connector-step"><label>Workspace name<input value={workspaceDraft.name} onChange={e=>setWorkspaceDraft({...workspaceDraft,name:e.target.value})} placeholder="Ace Retail"/></label><label>Environment<select value={workspaceDraft.environment} onChange={e=>setWorkspaceDraft({...workspaceDraft,environment:e.target.value})}><option>Production</option><option>Sandbox</option></select></label><button disabled={workspaceBusy||!workspaceDraft.name.trim()} onClick={createWorkspace}>{workspaceBusy?'Creating…':'Create workspace'}</button></div></div></div>}
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
 if(hash.startsWith('#/resources')) return 'resources'
 if(hash.startsWith('#/case-studies')) return 'case-studies'
 const found=(Object.entries(viewHash) as [View,string][]).find(([,route])=>route===hash)
 return found?.[0]||'site'
}

export default function AcePlatform(){
 const currentHash=typeof window!=='undefined'?window.location.hash:'#/'
 const[view,setView]=useState<View>(()=>hashView(currentHash))
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
 return <>{content}<ConsentBanner/></>
}
