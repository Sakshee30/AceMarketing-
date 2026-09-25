// @ts-nocheck
import {useEffect,useMemo,useState} from 'react'
import {
  Activity,ArrowRight,BarChart3,Bell,BookOpen,Bot,Building2,Cable,CalendarDays,Check,CheckCircle2,ChevronDown,ChevronRight,
  CircleDollarSign,Code2,DatabaseZap,Gauge,Globe2,GraduationCap,HeartPulse,Home,Landmark,Layers3,Menu,MessageCircle,MessageSquareText,
  MousePointer2,Network,PhoneCall,PhoneIncoming,PieChart,Plane,Plus,RadioTower,Search,Settings2,ShieldCheck,ShoppingCart,Store,
  Sparkles,Target,UsersRound,WandSparkles,X,Zap
} from 'lucide-react'
import './ace-platform.css'
import { api } from './lib/api'

type View='site'|'app'|'login'|'pricing'|'demo'|'company'|'resources'|'case-studies'|'privacy'|'terms'|'security'|'solutions'|'industries'|'agents-public'|'integrations-public'
type AppTab='Launchpad'|'Overview'|'AdSync'|'Funnel'|'Events'|'Adjustments'|'Diagnostics'|'Fraud'|'Deep Links'|'Sites'|'Fingerprinting'|'Live Sync'|'Data Hub'|'Offline Attribution'|'Matchback'|'POS & Stores'|'Journeys'|'Identity'|'Models'|'Attribution'|'Planner'|'Reports'|'Enrich'|'Lead Grading'|'Behavior'|'Feed'|'Agents'|'Routing'|'Follow-ups'|'Calls'|'Meetings'|'Feedback'|'Approvals'|'Ask Ace'|'Integrations'|'Audiences'|'Monitoring'|'Alerts'|'Developers'|'Settings'

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

function Brand({dark=false}:{dark?:boolean}){
 return <div className={'ace-brand '+(dark?'dark':'')}><span className="ace-mark"><i/><i/><i/></span><b>AceMarketing</b></div>
}

function Header({openHome,openApp,openLogin,openPricing,openDemo,openCompany,openResources,openCaseStudies,openSolutions,openIndustries,openAgents,openIntegrations}:{openHome:()=>void,openApp:()=>void,openLogin:()=>void,openPricing:()=>void,openDemo:()=>void,openCompany:()=>void,openResources:()=>void,openCaseStudies:()=>void,openSolutions:()=>void,openIndustries:()=>void,openAgents:()=>void,openIntegrations:()=>void}){
 const [open,setOpen]=useState(false)
 const [menu,setMenu]=useState<'industries'|'agents'|'resources'|null>(null)
 const [navCopy,setNavCopy]=useState<any>(null)
 const closeMenu=()=>setMenu(null)
 useEffect(()=>{api.publicNavigation().then((r:any)=>setNavCopy(r)).catch(()=>null)},[])
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
  ['Blogs','Latest trends and updates in marketing and data',Layers3,openResources],
  ['Ebooks','Long-form guides for data-driven growth teams',BookOpen,openResources],
  ['No Net Hash','Hash first-party identifiers before activation',ShieldCheck,openResources],
  ['ROAS Calculator','Model advertising return and efficiency',CircleDollarSign,openResources],
  ['Documentation','Implementation and product documentation',Code2,openResources]
 ]
 const industryCopy=navCopy?.industries?.length?navCopy.industries:industryItems.map((x:any)=>({name:x[0],summary:x[1]}))
 const industryDisplay=industryItems.map((x:any,i:number)=>[industryCopy[i]?.name||x[0],industryCopy[i]?.summary||x[1],x[2]])
 const agentCopy=navCopy?.agents?.length?navCopy.agents:agentItems.map((x:any)=>({name:x[0],summary:x[1]}))
 const agentDisplay=agentItems.map((x:any,i:number)=>[agentCopy[i]?.name||x[0],agentCopy[i]?.summary||x[1],x[2]])
 const resourceCopy=navCopy?.resources?.length?navCopy.resources:resourceItems.map((x:any)=>({name:x[0],summary:x[1]}))
 const resourceDisplay=resourceItems.map((x:any,i:number)=>[resourceCopy[i]?.name||x[0],resourceCopy[i]?.summary||x[1],x[2],x[3]])

 return <header className="ei-header-shell" onMouseLeave={closeMenu}>
  <div className="ei-header">
   <button className="ei-brand-button" onClick={openHome}><Brand dark/></button>
   <nav className={open?'ei-nav mobile-open':'ei-nav'}>
    <button className={menu==='industries'?'ei-nav-item active':'ei-nav-item'} onMouseEnter={()=>setMenu('industries')} onClick={openIndustries}>Industries <ChevronDown/></button>
    <button className={menu==='agents'?'ei-nav-item active':'ei-nav-item'} onMouseEnter={()=>setMenu('agents')} onClick={openAgents}>Agents <ChevronDown/></button>
    <button className="ei-nav-item" onClick={openCaseStudies}>Case Studies</button>
    <button className="ei-nav-item" onClick={openIntegrations}>Integrations</button>
    <button className="ei-nav-item" onClick={openPricing}>Pricing</button>
    <button className={menu==='resources'?'ei-nav-item active':'ei-nav-item'} onMouseEnter={()=>setMenu('resources')} onClick={openResources}>Resources <ChevronDown/></button>
   </nav>
   <div className="ei-header-actions">
    <button className="ei-voice-pill" onClick={openApp}><span className="voice-bars">••••</span><b>Voice Agent</b><small>NEW</small></button>
    <button className="ei-demo-pill" onClick={openDemo}>Book a demo</button>
   </div>
   <button className="menu-toggle ei-menu-toggle" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
  </div>

  {menu==='industries'&&<div className="ei-mega-menu industries-menu" onMouseEnter={()=>setMenu('industries')}>
   <div className="ei-mega-label">INDUSTRIES</div>
   <div className="ei-industry-columns">
    <div>{industryDisplay.slice(0,4).map((x:any)=>{const Icon=x[2];return <button key={x[0]} onClick={()=>{closeMenu();openIndustries()}} className="ei-industry-item"><span className="ei-industry-icon"><Icon/></span><div><b>{x[0]}</b><p>{x[1]}</p></div></button>})}</div>
    <div>{industryDisplay.slice(4).map((x:any)=>{const Icon=x[2];return <button key={x[0]} onClick={()=>{closeMenu();openIndustries()}} className="ei-industry-item"><span className="ei-industry-icon"><Icon/></span><div><b>{x[0]}</b><p>{x[1]}</p></div></button>})}</div>
   </div>
  </div>}

  {menu==='agents'&&<div className="ei-mega-menu agents-menu" onMouseEnter={()=>setMenu('agents')}>
   <div className="ei-mega-label">AGENTS</div>
   <div className="ei-agent-list">{agentItems.map((x:any)=>{const Icon=x[2];return <button key={x[0]} onClick={()=>{closeMenu();openAgents()}}><span className="ei-agent-icon"><Icon/></span><div><b>{x[0]}</b><p>{x[1]}</p></div><ChevronRight/></button>})}</div>
  </div>}

  {menu==='resources'&&<div className="ei-mega-menu resources-menu" onMouseEnter={()=>setMenu('resources')}>
   <div className="ei-resources-layout">
    <div><div className="ei-mega-label">GET INSPIRED</div><div className="ei-resource-links">{resourceItems.map((x:any)=>{const Icon=x[2];return <button key={x[0]} onClick={()=>{closeMenu();x[3]()}}><span><Icon/></span><div><b>{x[0]}</b><p>{x[1]}</p></div></button>})}</div></div>
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
     <div className="ei-visual-copy"><span>Connect every touchpoint</span><b>Website forms,<br/>Calls & WhatsApp<br/>messages.</b></div>
     <div className="ei-visual-panel">
      <div className="ei-visual-top"><span>Unified Journey</span><small>LIVE</small></div>
      {[
       ['Google Ads','Click captured'],['Website','High-intent pages'],['WhatsApp','Conversation started'],['CRM','Qualified lead'],['Revenue','Closed outcome']
      ].map((x,i)=><div className="ei-visual-row" key={x[0]}><span>{i+1}</span><div><b>{x[0]}</b><small>{x[1]}</small></div></div>)}
     </div>
     <button className="ei-hero-next" aria-label="Next hero slide"><ArrowRight/></button>
    </div>
   </div>
  </section>

  <section className="ei-trust-strip" aria-label="Reference customer categories">
   <div className="ei-trust-label">TRUSTED ACROSS COMPLEX, MULTI-TOUCH FUNNELS</div>
   <div className="ei-trust-track">
    {['Blue Tokai','Apollo AyurVAID','India IVF','ISB','Leverage Edu','WATI','Berger Paints','GemPundit','Jaro Education','Sova Health'].map(x=><span key={x}>{x}</span>)}
   </div>
   <small>Reference names reflect publicly shown EasyInsights customers/case-study brands; AceMarketing does not copy their logo artwork or present them as AceMarketing customers.</small>
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
   <div className="ei-proof-head"><div><span>REFERENCE OUTCOMES</span><h2>See what stronger signals and connected journeys can unlock.</h2><p>These figures are external EasyInsights reference benchmarks and are not presented as AceMarketing customer results.</p></div><button onClick={openCaseStudies}>See all case studies <ArrowRight/></button></div>
   <div className="ei-proof-grid">
    <article><div className="ei-proof-label">LEAD QUALITY</div><div className="ei-proof-mark">LE</div><strong>−38%</strong><h3>cost per qualified lead</h3><p>Reference pattern: enrolment outcomes returned server-side and deduplicated across form, call and counsellor sources.</p><footer><span>Leverage Edu</span><small>Edtech</small><ArrowRight/></footer></article>
    <article><div className="ei-proof-label">CONVERSION</div><div className="ei-proof-mark">IVF</div><strong>+52%</strong><h3>lead-to-consultation conversion</h3><p>Reference pattern: every lead graded on arrival, routed with context and qualified quickly.</p><footer><span>India IVF</span><small>Healthcare</small><ArrowRight/></footer></article>
    <article><div className="ei-proof-label">VISIBILITY & ATTRIBUTION</div><div className="ei-proof-mark">BT</div><strong>31%</strong><h3>revenue re-attributed</h3><p>Reference pattern: web, app and offline interactions stitched into full-path attribution.</p><footer><span>Blue Tokai</span><small>Consumer goods</small><ArrowRight/></footer></article>
    <article><div className="ei-proof-label">CONVERSION</div><div className="ei-proof-mark">JE</div><strong>+41%</strong><h3>enrolment rate</h3><p>Reference pattern: counsellor calls and follow-ups tracked with full journey context.</p><footer><span>Jaro Education</span><small>Edtech</small><ArrowRight/></footer></article>
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

  <section className="diagnostics-section">
   <div className="section-title"><span className="kicker dark">DIAGNOSE THE ROOT CAUSE</span><h2>Your campaigns may be showing symptoms of a data problem.</h2><p>The current EasyInsights public site groups its diagnostic story into six recurring failure areas. AceMarketing now mirrors that structure with original wording and product links.</p></div>
   <div className="diagnostic-grid six">
    {[
      ['Business & operational impact',Activity,['Acquisition cost rises while lead quality becomes harder to explain','Marketing, sales and leadership report different numbers','Teams spend time repairing tracking instead of scaling campaigns','Budget decisions are made without trustworthy funnel evidence']],
      ['Tracking & data quality',Network,['Conversions fire incorrectly across ad and analytics systems','Duplicate events distort optimization signals','Cross-domain, chatbot and messaging paths break continuity','Performance reporting lacks a shared source of truth']],
      ['Ad platform optimization',Target,['Automated campaign systems learn from weak or junk conversion signals','Lookalike quality drops when seed audiences are noisy','Converted or irrelevant users remain in targetable pools','CAC rises while the optimization model cannot see downstream quality']],
      ['Attribution & measurement',PieChart,['Web and app activity is not stitched into one journey','Offline and post-lead outcomes never make it back into measurement','High-value cohorts remain hidden from channel reports','Leadership loses confidence in platform-level attribution']],
      ['Audience & personalization',UsersRound,['Segments are too shallow for useful lookalikes','Retargeting ignores the actual sequence of customer actions','Retention and upsell campaigns lack behavioral signals','Returning customers are difficult to recognize without first-party identity']],
      ['Privacy, consent & compliance',ShieldCheck,['Third-party tracking becomes less dependable','Regional privacy rules limit uncontrolled audience-data use','Consent state is disconnected from activation destinations','There is no durable first-party control plane for compliant optimization']]
    ].map(([t,I,items]:any)=><article key={t}><I/><h3>{t}</h3><ul>{items.map((x:string)=><li key={x}>{x}</li>)}</ul></article>)}
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

  <section className="data-ownership-section">
   <div className="data-ownership-copy"><span className="kicker">DATA OWNERSHIP</span><h2>Your data remains your operating asset.</h2><p>AceMarketing is designed around first-party collection, explicit consent state, configurable retention, scoped access and auditable activation. Advertising and analytics destinations receive only the event fields required by the configured workflow.</p><div className="ownership-points"><span><ShieldCheck/> Workspace-level RBAC</span><span><Check/> Consent-aware activation</span><span><Check/> Identifier hashing</span><span><Check/> Configurable retention</span><span><Check/> Audit history</span><span><Check/> Data deletion workflow</span></div></div>
   <div className="privacy-console"><div className="privacy-console-head"><b>Privacy control plane</b><span className="healthy">Configured</span></div>{[['Consent state','Granted / denied / unknown'],['Retention window','180 days'],['PII hashing','SHA-256 design'],['Export destinations','Scoped per connector'],['Deletion SLA','Workflow-ready']].map(x=><div className="privacy-control-row" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div>
  </section>

  <section className="security-targets">
   <div className="section-title"><span className="kicker dark">SECURITY & COMPLIANCE PARITY TARGETS</span><h2>Enterprise controls are represented as implementation targets, not certifications.</h2><p>The brochure visually references ISO 27001, SHA-256 encryption, GDPR, HIPAA and India DPDP readiness. AceMarketing surfaces these as roadmap controls until independently implemented and verified.</p></div>
   <div className="security-target-grid">
    {[
      ['ISO 27001','Control framework target','Roadmap'],
      ['SHA-256','Identifier hashing','Implemented in design'],
      ['GDPR','Consent / deletion / retention','Roadmap'],
      ['HIPAA','Healthcare data safeguards','Roadmap'],
      ['India DPDP','Consent + data-principal controls','Roadmap']
    ].map(x=><article key={x[0]}><ShieldCheck/><div><b>{x[0]}</b><span>{x[1]}</span></div><em>{x[2]}</em></article>)}
   </div>
  </section>

  <section className="ei-final-cta">
   <div><span>TURN CONNECTED DATA INTO BETTER DECISIONS</span><h2>Give every channel the business outcomes it needs to optimize intelligently.</h2></div>
   <button onClick={openDemo}>Book a demo <ArrowRight/></button>
  </section>

  <DemoSection openApp={openApp}/>
  <footer className="ei-footer">
   <div className="ei-footer-top">
    <div className="ei-footer-brand"><Brand/><p>First-party data, agents and journey intelligence for performance marketing teams.</p><button onClick={openDemo}>Book a demo</button></div>
    <div><h4>Platform</h4><a href="#platform">Data Activation</a><a href="#platform">Data Enrichment</a><button onClick={openApp}>Product workspace</button></div>
    <div><h4>Solution</h4><button onClick={openSolutions}>Lead Generation</button><button onClick={openSolutions}>Enterprise</button><button onClick={openSolutions}>Attribution Model</button><button onClick={openSolutions}>Alerts and Monitoring</button><button onClick={openSolutions}>Server to Server Integration</button></div>
    <div><h4>Resources</h4><button onClick={openCompany}>About Us</button><button onClick={openResources}>Use Cases</button><button onClick={openResources}>Blogs & Guides</button><button onClick={openResources}>Documentation</button><button onClick={openDemo}>Contact Us</button></div>
   </div>
   <div className="ei-footer-bottom"><span>© 2026 AceMarketing. All rights reserved.</span><div><button onClick={()=>window.dispatchEvent(new CustomEvent('ace-view',{detail:'privacy'}))}>Privacy Policy</button><span>•</span><button onClick={()=>window.dispatchEvent(new CustomEvent('ace-view',{detail:'terms'}))}>Terms & Conditions</button><span>•</span><button onClick={()=>window.dispatchEvent(new CustomEvent('ace-view',{detail:'security'}))}>Security</button></div></div>
  </footer>
  {cookieOpen&&<div className="cookie-banner"><div><b>Cookie preferences</b><p>Necessary storage is always on. Optional analytics, advertising and functionality categories can be enabled independently.</p><div className="cookie-toggles">{Object.entries(cookiePrefs).map(([k,v])=><label key={k}><input type="checkbox" checked={v} onChange={()=>setCookiePrefs({...cookiePrefs,[k]:!v})}/>{k}</label>)}</div></div><div className="cookie-actions"><button onClick={()=>{setCookiePrefs({analytics:false,advertising:false,functionality:false});setCookieOpen(false)}}>Necessary only</button><button onClick={()=>{setCookiePrefs({analytics:true,advertising:true,functionality:true});setCookieOpen(false)}}>Accept all</button><button className="primary-cookie" onClick={async()=>{await api.saveConsent(cookiePrefs).catch(()=>null);setCookieOpen(false)}}>Save preferences</button></div></div>}
 </div>
}


function PublicFooter({openHome,openApp,openDemo,openCompany,openResources,openSolutions}:{openHome:()=>void,openApp:()=>void,openDemo:()=>void,openCompany:()=>void,openResources:()=>void,openSolutions:()=>void}){
 const goLegal=(view:'privacy'|'terms'|'security')=>window.dispatchEvent(new CustomEvent('ace-view',{detail:view}))
 return <footer className="ei-footer">
  <div className="ei-footer-top">
   <div className="ei-footer-brand">
    <button className="public-footer-brand" onClick={openHome}><Brand/></button>
    <p>First-party journey intelligence, activation, and conversion operations for performance teams.</p>
    <button className="ei-footer-demo" onClick={openDemo}>Book a demo</button>
   </div>
   <div className="ei-footer-column"><h4>Platform</h4><button onClick={openApp}>Activation workspace</button><button onClick={openApp}>Journey intelligence</button><button onClick={openApp}>Audience operations</button></div>
   <div className="ei-footer-column"><h4>Solutions</h4><button onClick={openSolutions}>Lead generation</button><button onClick={openSolutions}>Attribution</button><button onClick={openSolutions}>Enterprise operations</button></div>
   <div className="ei-footer-column"><h4>Resources</h4><button onClick={openCompany}>About AceMarketing</button><button onClick={openResources}>Guides & tools</button><button onClick={openResources}>Documentation</button></div>
  </div>
  <div className="ei-footer-legal"><span>© 2026 AceMarketing</span><div><button onClick={()=>goLegal('privacy')}>Privacy</button><button onClick={()=>goLegal('terms')}>Terms</button><button onClick={()=>goLegal('security')}>Security</button></div></div>
 </footer>
}

function PublicPageFrame({children,openHome,openApp,openLogin,openPricing,openDemo,openCompany,openResources,openCaseStudies,openSolutions,openIndustries,openAgents,openIntegrations}:{children:any,openHome:()=>void,openApp:()=>void,openLogin:()=>void,openPricing:()=>void,openDemo:()=>void,openCompany:()=>void,openResources:()=>void,openCaseStudies:()=>void,openSolutions:()=>void,openIndustries:()=>void,openAgents:()=>void,openIntegrations:()=>void}){
 return <div className="marketing-page public-route-page">
  <div className="ei-promo-bar"><span>Cleaner first-party signals help growth teams optimize for business outcomes, not shallow clicks.</span><button onClick={openDemo}>See the operating model <ArrowRight/></button></div>
  <Header openHome={openHome} openApp={openApp} openLogin={openLogin} openPricing={openPricing} openDemo={openDemo} openCompany={openCompany} openResources={openResources} openCaseStudies={openCaseStudies} openSolutions={openSolutions} openIndustries={openIndustries} openAgents={openAgents} openIntegrations={openIntegrations}/>
  {children}
  <PublicFooter openHome={openHome} openApp={openApp} openDemo={openDemo} openCompany={openCompany} openResources={openResources} openSolutions={openSolutions}/>
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
  {group:'Advertising & Analytics',items:['Google Ads','Meta Ads','LinkedIn Ads','Microsoft Ads / Bing Ads','GA4']},
  {group:'CRM',items:['Zoho CRM','Salesforce','LeadSquared','Meritto','HubSpot','HighLevel','Microsoft Dynamics 365']},
  {group:'Messaging & Marketing',items:['WhatsApp','WATI','Gupshup','AiSensy','Bitespeed','MoEngage','CleverTap']},
  {group:'Calling',items:['Exotel','Knowlarity','Tata Tele','MyOperator']},
  {group:'Web, App & Commerce',items:['WordPress','React App','WooCommerce','Magento','Custom Backend']}
 ]
 const [groups,setGroups]=useState<any[]>(fallback)
 useEffect(()=>{api.publicIntegrations().then((r:any)=>r?.groups&&setGroups(r.groups)).catch(()=>null)},[])
 return <PublicPageFrame {...props}><main className="public-detail-page">
  <section className="public-detail-hero"><span>INTEGRATIONS</span><h1>Connect the systems your teams already depend on.</h1><p>Use standard connectors for common platforms and custom adapters for proprietary systems, while keeping identity, lifecycle, and revenue fields normalized.</p><button onClick={props.openApp}>Open integration workspace <ArrowRight/></button></section>
  <section className="integration-public-groups">{groups.map((g:any,i:number)=><article key={g.group}><div><span>{String(i+1).padStart(2,'0')}</span><h2>{g.group}</h2></div><div>{(g.items||[]).map((x:string)=><button key={x} onClick={props.openApp}><Cable/><span>{x}</span><ChevronRight/></button>)}</div></article>)}</section>
  <section className="public-route-cta"><span>CUSTOM SYSTEM?</span><h2>Map your own API, webhook, file, or database interface.</h2><button onClick={props.openApp}>Build a custom integration</button></section>
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
  <section className="source-conflict-note"><ShieldCheck/><div><b>Reference-source difference</b><p>The current EasyInsights public demo page states that Shopify ecommerce is not supported, while the supplied brochure lists Shopify among available integrations. AceMarketing preserves Shopify as a planned connector but labels the difference instead of silently choosing one source over the other.</p></div></section>
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
  <section className="standalone-hero solutions-hero"><span className="kicker">SOLUTIONS</span><h1>Different operating models, one first-party data layer.</h1><p>AceMarketing mirrors the solution categories currently exposed by EasyInsights while keeping the implementation and wording original.</p><div className="hero-actions"><button className="btn-primary" onClick={openApp}>Explore product <ArrowRight/></button><button className="btn-secondary-light" onClick={openDemo}>Book a demo</button></div></section>
  <section className="solution-detail-grid">{solutions.map((x,i)=><article key={x[0]}><span>{String(i+1).padStart(2,'0')}</span><div><h2>{x[0]}</h2><p>{x[1]}</p><b>{x[2]}</b></div><ChevronRight/></article>)}</section>
  <section className="solution-architecture"><div><span className="kicker">SERVER-TO-SERVER</span><h2>When a standard connector is not enough.</h2><p>Use authenticated API calls, webhooks and idempotent event IDs to connect proprietary CRMs, billing systems, call centers and internal data stores.</p></div><div className="s2s-flow">{['Source system','Normalize','Identity match','Business event','Destination'].map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b>{i<4&&<ArrowRight/>}</div>)}</div></section>
 </div>
}

function CaseStudiesPage({back,openDemo}:{back:()=>void,openDemo:()=>void}){
 const studies=[
  {
   sector:'Healthcare',name:'Apollo Ayurvaid',title:'Call tracking & WhatsApp conversions',
   challenge:['Inbound calls were not attributed to ad campaigns','WhatsApp enquiries were missing from conversion reporting','Telephony had no native ad-platform integration'],
   solution:['Connect telephony through API','Match inbound calls to active-session click IDs using timestamp overlap','Return WhatsApp conversion events to Google Ads and Meta'],
   metrics:[['Match method','Session-time overlap'],['Channels','Google + Meta'],['Outcome','Offline signal restored']]
  },
  {
   sector:'EdTech',name:'Jaro Education',title:'High-volume lead management',
   challenge:['14,000+ daily leads','15+ active ad accounts','Complex LeadSquared stage mappings','Fragmented conversions at scale'],
   solution:['Unified OCI + ECL pipeline','Centralized imports across ad accounts','Real-time stage-based conversion events','Cross-platform attribution'],
   metrics:[['2,50,000+','conversions imported daily'],['14,000+','daily leads processed'],['15+','ad accounts'],['4','platforms unified']]
  },
  {
   sector:'High AOV',name:'GemPundit',title:'WhatsApp funnel + partial-payment tracking',
   challenge:['Long consideration cycle','Users move from ads to WhatsApp','Partial payments obscure final value','GCLID was lost after web exit'],
   solution:['Persist GCLID from landing page','Associate click ID with WhatsApp identity','Create partial-payment conversion events','Adjust conversion value for bidding'],
   metrics:[['Bridge','Web → WhatsApp'],['Signal','Partial payment'],['Optimization','Revenue-aware bidding']]
  },
  {
   sector:'Home Services',name:'Berger Paints',title:'Quality-first CTWA optimization',
   challenge:['Need profitable pan-India lead generation','Heavy CTWA acquisition','Campaigns needed optimization beyond raw lead volume'],
   solution:['Server-side CAPI activation','CRM online + offline signal return','Custom CTWA events such as house size and location','Automated alerts and monitoring'],
   metrics:[['19%','reduction in CAC'],['4×','growth in quality leads'],['24×7','automated monitoring']]
  }
 ]
 return <div className="standalone-page case-study-page">
  <div className="standalone-top"><Brand/><button onClick={back}>Back to website</button></div>
  <section className="standalone-hero case-study-hero"><span className="kicker">CASE STUDIES</span><h1>Reference implementation patterns for complex acquisition funnels.</h1><p>These are paraphrased from the supplied EasyInsights brochure and are presented as reference patterns, not AceMarketing customer claims.</p></section>
  <section className="case-study-detail-grid">{studies.map((s,i)=><article key={s.name}><div className="case-study-title"><span>{String(i+1).padStart(2,'0')} · {s.sector}</span><h2>{s.name}</h2><h3>{s.title}</h3></div><div className="case-columns"><div><b>The challenge</b>{s.challenge.map(x=><p key={x}><span>•</span>{x}</p>)}</div><div><b>Implementation pattern</b>{s.solution.map(x=><p key={x}><Check/>{x}</p>)}</div></div><div className="case-metrics">{s.metrics.map(x=><div key={x[0]}><strong>{x[0]}</strong><small>{x[1]}</small></div>)}</div></article>)}</section>
  <section className="case-study-cta"><div><span className="kicker">APPLY THE PATTERN</span><h2>Map one of these workflows to your own funnel.</h2><p>Use the demo flow to capture your CRM, channels, offline steps and optimization goals.</p></div><button onClick={openDemo}>Book implementation walkthrough <ArrowRight/></button></section>
 </div>
}

function ResourcesPage({back}:{back:()=>void}){
 const docs=[['Custom Events','Define business-specific conversion events such as qualified lead, pricing-page lead, high-value purchase and attribution events.'],['Server-Side Activation','Patterns for CAPI, enhanced conversions and offline conversion delivery.'],['Attribution','Understand first-touch, last-touch and stitched full-path journeys across channels.'],['CRM Enrichment','Map acquisition source, behavior and interaction context into CRM records.'],['Offline Conversion Tracking','Match calls, WhatsApp and offline outcomes to click identifiers and first-party identities.'],['Audience Operations','Build activation and suppression segments from lifecycle stage, LTV and intent.']]
 const [spend,setSpend]=useState(100000); const [revenue,setRevenue]=useState(350000); const roas=spend?revenue/spend:0
 const [hashInput,setHashInput]=useState(''); const [hashOutput,setHashOutput]=useState('')
 const hash=async()=>{if(!hashInput)return;const bytes=new TextEncoder().encode(hashInput.trim().toLowerCase());const digest=await crypto.subtle.digest('SHA-256',bytes);setHashOutput(Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join(''))}
 return <div className="standalone-page resources-page"><div className="standalone-top"><Brand/><button onClick={back}>Back to website</button></div><section className="standalone-hero resources-hero"><span className="kicker">RESOURCES</span><h1>Implementation guides and first-party marketing utilities.</h1><p>Documentation, calculators and privacy-safe local tools support onboarding and day-to-day implementation work.</p></section><section className="resource-grid">{docs.map((x,i)=><article key={x[0]}><span>{String(i+1).padStart(2,'0')}</span><h3>{x[0]}</h3><p>{x[1]}</p><button>Read guide <ArrowRight/></button></article>)}</section>
 <section className="resource-tools"><div className="section-title"><span className="kicker dark">TOOLS</span><h2>Useful utilities for performance teams.</h2></div><div className="tool-grid"><article><BarChart3/><h3>ROAS Calculator</h3><label>Ad spend<input type="number" value={spend} onChange={e=>setSpend(Number(e.target.value))}/></label><label>Attributed revenue<input type="number" value={revenue} onChange={e=>setRevenue(Number(e.target.value))}/></label><div className="tool-result"><span>ROAS</span><strong>{roas.toFixed(2)}×</strong><small>{(roas*100).toFixed(0)}% revenue-to-spend ratio</small></div></article><article><ShieldCheck/><h3>Local PII Hash</h3><p>Generate a SHA-256 value in your browser. The input is not sent to the AceMarketing API.</p><label>Email / phone<input value={hashInput} onChange={e=>setHashInput(e.target.value)} placeholder="example@email.com"/></label><button onClick={hash}>Hash locally</button>{hashOutput&&<div className="hash-output">{hashOutput}</div>}</article></div></section></div>
}

function LegalPage({kind,back}:{kind:'privacy'|'terms'|'security',back:()=>void}){
 const content=kind==='privacy'?['Privacy','How AceMarketing handles workspace, event and first-party identifier data.',['Data is scoped to the workspace that submitted it.','Connector credentials should be stored in a secret-management layer in production.','Consent, retention, export and deletion controls are product requirements.','Optional marketing/analytics cookies should follow the preferences selected by the visitor.']]:kind==='terms'?['Terms','Product-use terms placeholder for the AceMarketing implementation.',['Do not use the platform to send unlawful or deceptive conversion data.','Customers remain responsible for permissions to connect their advertising, CRM and messaging accounts.','Production SLAs, commercial terms and data-processing terms require a finalized agreement.','Reference performance metrics in the UI are not guarantees of future results.']]:['Security','Security architecture and certification-status transparency.',['Authentication, tenant isolation and RBAC are required before production launch.','Sensitive identifiers should be hashed or encrypted according to the destination workflow.','Audit logs, retry history and connector changes must remain observable.','ISO/GDPR/HIPAA/DPDP labels shown elsewhere are parity targets unless independently verified.']]
 return <div className="standalone-page legal-page"><div className="standalone-top"><Brand/><button onClick={back}>Back to website</button></div><section className="standalone-hero"><span className="kicker">{content[0]}</span><h1>{content[1]}</h1></section><section className="legal-content">{(content[2] as string[]).map((x,i)=><article key={x}><span>{String(i+1).padStart(2,'0')}</span><p>{x}</p></article>)}</section></div>
}

function Pricing({back,openApp}:{back:()=>void,openApp:()=>void}){
 const [leads,setLeads]=useState(5000)
 const [dataHomes,setDataHomes]=useState<string[]>(['CRM'])
 const [challenges,setChallenges]=useState<string[]>(['Lead quality'])
 const [channels,setChannels]=useState<string[]>(['Google Ads','Meta Ads'])
 const recommended=agents.filter(a=>{
  if(challenges.includes('Lead quality')&&a[2]==='Lead Quality')return true
  if(challenges.includes('Conversion leakage')&&a[2]==='Conversion')return true
  if(challenges.includes('Attribution')&&a[2]==='Visibility')return true
  return false
 })
 const [selected,setSelected]=useState<string[]>([])
 const activeSelected=selected.length?selected:recommended.map(a=>a[0])
 const toggle=(list:string[],value:string,setter:(v:string[])=>void)=>setter(list.includes(value)?list.filter(x=>x!==value):[...list,value])
 return <div className="pricing-page">
  <div className="pricing-top"><Brand/><button onClick={back}>Back to website</button></div>
  <section className="pricing-hero"><span className="kicker">PRICING</span><h1>Build the stack that works for your setup.</h1><p>Answer a few questions and AceMarketing recommends the agents that fit your funnel. Exact production pricing remains a sales quote because the public source does not expose stable numeric prices.</p></section>
  <section className="pricing-builder">
   <div className="pricing-step"><span>1</span><div><h2>Tell us about your setup</h2><p>Configure the environment used for agent recommendations.</p></div></div>
   <div className="pricing-card">
    <label>Monthly lead volume <strong>{leads.toLocaleString()}</strong><input type="range" min="200" max="100000" step="200" value={leads} onChange={e=>setLeads(Number(e.target.value))}/><small>200 <b>100,000+</b></small></label>
    <div className="choice-block"><h3>Where does your data live?</h3><div>{['CRM','Website / App','WhatsApp','Calling','Data warehouse','Custom backend'].map(x=><button key={x} className={dataHomes.includes(x)?'active':''} onClick={()=>toggle(dataHomes,x,setDataHomes)}>{x}</button>)}</div></div>
    <div className="choice-block"><h3>Select your current data challenges</h3><div>{['Lead quality','Conversion leakage','Attribution'].map(x=><button key={x} className={challenges.includes(x)?'active':''} onClick={()=>toggle(challenges,x,setChallenges)}>{x}</button>)}</div></div>
    <div className="choice-block"><h3>Which channels do you run?</h3><div>{['Google Ads','Meta Ads','LinkedIn Ads','Microsoft Ads','Offline'].map(x=><button key={x} className={channels.includes(x)?'active':''} onClick={()=>toggle(channels,x,setChannels)}>{x}</button>)}</div></div>
   </div>
   <div className="pricing-step"><span>2</span><div><h2>Choose your agents</h2><p>Recommended agents are pre-selected from your stated challenges.</p></div></div>
   <div className="pricing-agent-grid">{agents.map(a=>{const isOn=activeSelected.includes(a[0]);return <article className={isOn?'selected':''} key={a[0]}><div><span>{a[2]}</span>{recommended.some(r=>r[0]===a[0])&&<b>RECOMMENDED</b>}</div><h3>{a[0]}</h3><strong>{a[3]}</strong><p>{a[1]}</p><button onClick={()=>setSelected(isOn?activeSelected.filter(x=>x!==a[0]):[...activeSelected,a[0]])}>{isOn?'Remove':'Add agent'}</button></article>})}</div>
   <aside className="pricing-summary"><div><span>Your stack</span><strong>{activeSelected.length} agents</strong></div><div><span>Monthly lead volume</span><strong>{leads.toLocaleString()}</strong></div><div><span>Channels</span><strong>{channels.length}</strong></div><div className="quote"><span>Estimated total</span><strong>Custom quote</strong><small>Pricing depends on selected agents, data volume, destinations and deployment requirements.</small></div><button onClick={openApp}>Open workspace <ArrowRight/></button><button className="outline" onClick={back}>Talk to sales</button></aside>
  </section>
 </div>
}

function DemoSection({openApp}:{openApp:()=>void}){
 const [sent,setSent]=useState(false); const [sending,setSending]=useState(false)
 const submit=async(e:any)=>{e.preventDefault();setSending(true);const form=new FormData(e.currentTarget);await api.submitDemo(Object.fromEntries(form.entries())).catch(()=>null);setSending(false);setSent(true)}
 return <section className="demo-cta" id="demo"><div className="demo-copy"><span className="kicker">SEE THE PRODUCT FLOW</span><h2>Operate the entire paid funnel from one workspace.</h2><p>Connect → observe → enrich → qualify → activate → attribute → learn.</p><button onClick={openApp}>Open interactive workspace <ArrowRight/></button></div><form className="demo-form" onSubmit={submit}>{sent?<div className="demo-success"><Check/><h3>Demo request captured</h3><p>This frontend flow is ready to connect to your CRM or scheduling backend.</p></div>:<><h3>Book a product walkthrough</h3><label>Work email<input name="email" required type="email" placeholder="name@company.com"/></label><label>Company<input name="company" required placeholder="Company name"/></label><label>Monthly ad spend<select name="monthlyAdSpend" defaultValue=""><option value="" disabled>Select range</option><option>Under ₹5L</option><option>₹5L – ₹25L</option><option>₹25L – ₹1Cr</option><option>₹1Cr+</option></select></label><label>Primary challenge<select name="primaryChallenge" defaultValue=""><option value="" disabled>Select challenge</option><option>Lead quality</option><option>Conversion leakage</option><option>Attribution</option><option>Tracking/data quality</option></select></label><button type="submit" disabled={sending}>{sending?'Sending…':'Request demo'} <ArrowRight/></button></>}</form></section>
}

function Login({back,openApp}:{back:()=>void,openApp:()=>void}){
 const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [show,setShow]=useState(false); const [error,setError]=useState(''); const [loading,setLoading]=useState(false)
 const submit=async(e:any)=>{e.preventDefault();setLoading(true);setError('');try{await api.login(email,password);openApp()}catch{setError('API unavailable or login failed. Start the local API with npm run api.')}finally{setLoading(false)}}
 return <div className="login-page"><div className="login-brand"><Brand/><button onClick={back}>Back to website</button></div><div className="login-shell"><div className="login-story"><span className="kicker">ACE MARKETING PLATFORM</span><h1>One workspace for the complete acquisition journey.</h1><p>Connect paid media, CRM, calls, messaging and offline outcomes — then activate clean signals and measure revenue in one place.</p><div className="login-flow">{['Connect','Stitch','Enrich','Activate','Attribute'].map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b>{i<4&&<ArrowRight/>}</div>)}</div></div><form className="login-card" onSubmit={submit}><Brand dark/><h2>Log in to your workspace</h2><p>Use your organization credentials.</p><button type="button" className="google-login">G <span>Continue with Google</span></button><div className="or"><i/>OR<i/></div><label>Email<input value={email} onChange={e=>setEmail(e.target.value)} required type="email" placeholder="you@company.com"/></label><label>Password<div className="password-field"><input value={password} onChange={e=>setPassword(e.target.value)} required type={show?'text':'password'} placeholder="••••••••"/><button type="button" onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div></label><div className="login-options"><label><input type="checkbox"/> Remember me</label><button type="button">Forgot password?</button></div><button className="login-submit" disabled={loading}>{loading?'Signing in…':'Log in'} <ArrowRight/></button>{error&&<small style={{color:"#c44955"}}>{error}</small>}<small>Demo API accepts any valid email and a password of 6+ characters.</small></form></div></div>
}

const appTabs=[
 ['Launchpad',WandSparkles],['Overview',Gauge],['AdSync',RadioTower],['Funnel',BarChart3],['Events',Zap],['Adjustments',CircleDollarSign],['Diagnostics',ShieldCheck],['Fraud',ShieldCheck],['Deep Links',Network],['Sites',Globe2],['Fingerprinting',MousePointer2],['Live Sync',Activity],['Data Hub',DatabaseZap],['Offline Attribution',PhoneCall],['Matchback',CircleDollarSign],['POS & Stores',Building2],['Journeys',Network],['Identity',UsersRound],['Models',Target],['Attribution',PieChart],['Planner',CircleDollarSign],['Reports',BarChart3],['Enrich',DatabaseZap],['Lead Grading',Target],['Behavior',MousePointer2],['Feed',Layers3],['Agents',Bot],['Routing',Network],['Follow-ups',MessageCircle],['Calls',PhoneIncoming],['Meetings',CalendarDays],['Feedback',MessageSquareText],['Approvals',CheckCircle2],['Ask Ace',Sparkles],['Integrations',Cable],['Audiences',UsersRound],['Monitoring',Activity],['Alerts',Bell],['Developers',Code2],['Settings',Settings2]
] as const
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}
function PageHead({crumb,title,sub,action}:{crumb:string,title:string,sub:string,action?:string}){return <div className="page-head"><div><span>{crumb}</span><h1>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary"><Sparkles/>{action}</button>}</div>}
function FunnelPanel(){const steps=[['All Leads',12842,100],['Qualified',7621,59],['Connected',5410,42],['Consultation',2314,18],['Enrolled',982,8]];return <div className="app-panel"><div className="panel-head"><div><h3>Complete funnel</h3><p>All sources · last 30 days</p></div><button>Campaign view</button></div>{steps.map((x,i)=><div className="funnel-row" key={x[0]}><div><span>{x[0]}</span><b>{x[1].toLocaleString()}</b></div><div className="progress"><i style={{width:x[2]+'%'}}/></div>{i<steps.length-1&&<small>{Math.round((steps[i+1][1]/x[1])*100)}% progression</small>}</div>)}</div>}

function Launchpad(){
 const steps=[
  ['Workspace','Name, timezone, currency and business model'],
  ['Connect data','CRM, ad platforms, WhatsApp, calling and web/app sources'],
  ['Map funnel','Define lead, qualified, appointment, consultation and revenue stages'],
  ['Install tracking','Persist click IDs and send first-party website/app behavior'],
  ['Test signal','Send a test event through identity matching and destination delivery'],
  ['Activate agents','Choose which specialist agents may observe, recommend or act']
 ]
 const [active,setActive]=useState(0)
 const [done,setDone]=useState([true,true,true,false,false,false])
 const complete=async()=>{const next=[...done];next[active]=true;setDone(next);await api.saveLaunchpad({step:active,status:'complete'}).catch(()=>null);if(active<steps.length-1)setActive(active+1)}
 const pct=Math.round((done.filter(Boolean).length/steps.length)*100)
 return <><PageHead crumb="Workspace / Launchpad" title="Launchpad" sub="Configure the data, funnel, tracking and automation foundation before operating the workspace." action="Run readiness check"/>
 <div className="launchpad-progress"><div><span>Workspace readiness</span><strong>{pct}%</strong></div><div className="progress"><i style={{width:pct+'%'}}/></div><small>{done.filter(Boolean).length} of {steps.length} setup areas complete</small></div>
 <div className="launchpad-layout"><div className="app-panel launchpad-steps">{steps.map((s,i)=><button key={s[0]} className={active===i?'selected':''} onClick={()=>setActive(i)}><span className={done[i]?'done':''}>{done[i]?<Check/>:i+1}</span><div><b>{s[0]}</b><small>{s[1]}</small></div><ChevronRight/></button>)}</div>
 <div className="app-panel launchpad-detail"><div className="panel-head"><div><h3>{steps[active][0]}</h3><p>{steps[active][1]}</p></div><span className={done[active]?'healthy':'status'}>{done[active]?'Complete':'Needs attention'}</span></div>
 {active===0&&<div className="setup-form-grid">{[['Workspace name','Ace EdTech'],['Timezone','Asia/Kolkata'],['Currency','INR'],['Business model','Lead generation']].map(x=><label key={x[0]}><span>{x[0]}</span><input defaultValue={x[1]}/></label>)}</div>}
 {active===1&&<div className="setup-check-grid">{[['Google Ads',true],['Meta Ads',true],['CRM',true],['WhatsApp',true],['Calling',false],['Website/App',true]].map(x=><div key={String(x[0])}><Cable/><span>{x[0]}</span><b className={x[1]?'ok':'warn'}>{x[1]?'Connected':'Connect'}</b></div>)}</div>}
 {active===2&&<div className="stage-map">{['Lead','Qualified','Appointment','Consultation','Enrolled / Closed Won'].map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b>{i<4&&<ArrowRight/>}</div>)}</div>}
 {active===3&&<div className="tracking-install"><code>{'<script src="https://cdn.acemarketing.example/track.js" data-workspace="ace-edtech"></script>'}</code><div className="setup-check-grid"><div><MousePointer2/><span>GCLID persistence</span><b className="ok">Enabled</b></div><div><MousePointer2/><span>FBCLID persistence</span><b className="ok">Enabled</b></div><div><ShieldCheck/><span>Consent gate</span><b className="warn">Configure</b></div></div></div>}
 {active===4&&<div className="signal-test"><div className="test-flow">{['Browser event','Identity match','Normalize','Destination'].map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b>{i<3&&<ArrowRight/>}</div>)}</div><div className="test-result"><Activity/><div><b>Test event ready</b><small>Run a synthetic qualified-lead event to validate matching, deduplication and delivery.</small></div><button onClick={()=>api.track({event:'launchpad_test',source:'launchpad'})}>Send test</button></div></div>}
 {active===5&&<div className="agent-choice-grid">{agents.slice(0,6).map((a,i)=><label key={a[0]}><input type="checkbox" defaultChecked={i<3}/><Bot/><div><b>{a[0]}</b><small>{a[2]}</small></div></label>)}</div>}
 <div className="launchpad-actions"><button className="app-primary" onClick={complete}>{done[active]?'Save & continue':'Mark complete'} <ArrowRight/></button></div></div></div></>
}

function Overview(){
 return <><PageHead crumb="Workspace / Overview" title="Acquisition command center" sub="One live view across paid media, CRM, calls, WhatsApp and revenue." action="Ask Ace"/>
 <div className="stats-grid"><Stat label="Attributed revenue" value="₹2.84Cr" sub="+18.4% vs prior period" Icon={CircleDollarSign}/><Stat label="Qualified leads" value="7,621" sub="+12.1% quality" Icon={Target}/><Stat label="Signal coverage" value="94.8%" sub="+4.7% match rate" Icon={Activity}/><Stat label="Active agents" value="7" sub="All systems healthy" Icon={Bot}/></div>
 <div className="two-col"><FunnelPanel/><div className="app-panel"><div className="panel-head"><div><h3>Signal health</h3><p>Destination delivery coverage</p></div><span className="healthy">Healthy</span></div>{[['Google Ads',96],['Meta Ads',94],['LinkedIn',89],['CRM outcomes',98]].map(x=><div className="health-line" key={x[0]}><span>{x[0]}</span><div className="progress"><i style={{width:x[1]+'%'}}/></div><b>{x[1]}%</b></div>)}<div className="ai-note"><Sparkles/><div><b>Optimization insight</b><p>Qualified-lead outcomes are reaching Google Ads faster this week, improving freshness of bidding inputs.</p></div></div></div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Live customer events</h3><p>Unified online + offline stream</p></div><button>View all</button></div><table><thead><tr><th>Lead</th><th>Source</th><th>Event</th><th>Campaign</th><th>Value</th><th>Status</th></tr></thead><tbody>{[['Aarav S.','Google Ads','Qualified','MBA Search','—','Synced'],['Meera P.','Meta Ads','Consultation','Executive Program','—','Synced'],['Rohan K.','WhatsApp','Enrolment','PGDM Retargeting','₹84,000','Matched'],['Anika R.','Organic','Sales connected','—','—','Enriched']].map(r=><tr key={r[0]}>{r.map((v,i)=><td key={i}>{i===5?<span className="status">{v}</span>:v}</td>)}</tr>)}</tbody></table></div></>
}
function AdSync(){
 return <><PageHead crumb="Module / AdSync" title="Server-side signal activation" sub="Send qualified and closed outcomes back to advertising platforms continuously." action="Create conversion event"/>
 <div className="stats-grid"><Stat label="Events today" value="248,916" sub="+8.2% volume" Icon={RadioTower}/><Stat label="Match rate" value="94.8%" sub="Across destinations" Icon={Target}/><Stat label="Median latency" value="42s" sub="Event-to-platform" Icon={Activity}/><Stat label="Suppressed users" value="18,204" sub="Excluded from retargeting" Icon={UsersRound}/></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Conversion pipelines</h3><p>Continuous server-side synchronization</p></div><button>+ Add pipeline</button></div>{[
 ['Qualified Lead','CRM → Google Ads','Enhanced Conversions for Leads','96.1%'],
 ['Enrolment','CRM → Meta Ads','Conversions API','95.4%'],
 ['WhatsApp Started','WhatsApp → Google Ads','Offline Conversion Import','91.8%'],
 ['Call Connected','Calling → Meta Ads','Conversions API','93.2%']
 ].map(x=><div className="pipeline-row" key={x[0]}><span><Zap/></span><div><b>{x[0]}</b><small>{x[1]}</small></div><em>{x[2]}</em><i>Live</i><strong>{x[3]}</strong><ChevronRight/></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Platform signal consoles</h3><p>Equivalent product surfaces for ad-platform and WhatsApp event visibility — synthetic UI, not copied screenshots.</p></div><span className="healthy">Live</span></div>
   <div className="signal-console-grid">
    <article><div><span className="integration-logo c0">GA</span><div><b>Google Ads conversions</b><small>Enhanced + offline conversion imports</small></div></div>{[['Qualified Lead','8,214','96.1%'],['Consultation','2,314','94.7%'],['Enrolment','982','97.3%']].map(r=><div className="console-row" key={r[0]}><span>{r[0]}</span><strong>{r[1]}</strong><i>{r[2]}</i></div>)}</article>
    <article><div><span className="integration-logo c1">ME</span><div><b>Meta Conversions API</b><small>Server event coverage & deduplication</small></div></div>{[['Lead','12,842','94.8%'],['Qualified','7,621','95.4%'],['Purchase','982','96.2%']].map(r=><div className="console-row" key={r[0]}><span>{r[0]}</span><strong>{r[1]}</strong><i>{r[2]}</i></div>)}</article>
    <article><div><span className="integration-logo c2">WA</span><div><b>WhatsApp events</b><small>Chat initiation and qualified outcomes</small></div></div>{[['Chat Started','6,904','Matched'],['Qualified','3,086','Synced'],['Booked','711','Revenue linked']].map(r=><div className="console-row" key={r[0]}><span>{r[0]}</span><strong>{r[1]}</strong><i>{r[2]}</i></div>)}</article>
   </div>
   <div className="conversion-adjustment-note"><Sparkles/><div><b>Conversion adjustment workflow</b><p>Low-value or partial outcomes can be reclassified so bidding learns from qualified and revenue-bearing events rather than treating every form fill equally.</p></div></div>
  </div>
  <div className="two-col"><FunnelPanel/><div className="app-panel"><div className="panel-head"><div><h3>Identifier coverage</h3><p>First-party identifiers and click IDs</p></div></div>{[['GCLID',97],['FBCLID',94],['Hashed email',88],['Hashed phone',91]].map(x=><div className="coverage" key={x[0]}><div><span>{x[0]}</span><b>{x[1]}%</b></div><div className="progress"><i style={{width:x[1]+'%'}}/></div></div>)}</div></div></>
}
function Funnel(){
 const [channel,setChannel]=useState('All channels')
 const accounts=['All channels','Google Ads · Account 01','Meta Ads · Account 02','LinkedIn Ads · Account 03']
 const campaigns=[
  ['MBA Search - Brand','Google Ads',2841,1812,932,421,188],
  ['Executive Program','Meta Ads',1964,1048,641,288,119],
  ['PGDM Retargeting','Meta Ads',1510,903,527,210,96],
  ['CMA Lead Gen','LinkedIn Ads',1088,642,311,142,61]
 ]
 return <><PageHead crumb="AdSync / Funnel Mapping" title="Channel & campaign funnel" sub="See every lead stage and disposition by account and campaign in one view." action="Export funnel"/>
 <div className="filters"><button onClick={()=>setChannel(channel==='All channels'?accounts[1]:'All channels')}>{channel} <ChevronDown/></button><button>All dispositions <ChevronDown/></button><button>Last 30 days <ChevronDown/></button></div>
 <div className="stats-grid"><Stat label="All leads" value="12,842" sub="Across connected channels" Icon={UsersRound}/><Stat label="Appointments" value="2,314" sub="18.0% of leads" Icon={PhoneCall}/><Stat label="Consultations" value="1,506" sub="65.1% show rate" Icon={MessageCircle}/><Stat label="Bookings" value="982" sub="₹2.84Cr attributed" Icon={CircleDollarSign}/></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Campaign breakdown</h3><p>Lead → qualified → appointment → consultation → booking</p></div><span className="healthy">Live</span></div>
 <div className="funnel-table"><div className="funnel-tr funnel-th"><span>Campaign</span><span>Channel</span><span>Leads</span><span>Qualified</span><span>Appt.</span><span>Consult.</span><span>Bookings</span></div>
 {campaigns.map(r=><div className="funnel-tr" key={r[0]}><div><b>{r[0]}</b><small>Synced continuously</small></div><span>{r[1]}</span>{r.slice(2).map((v,i)=><strong key={i}>{Number(v).toLocaleString()}</strong>)}</div>)}</div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Disposition distribution</h3><p>Where the funnel narrows</p></div></div>{[['Positive / Qualified',59],['Not reachable',16],['Not interested',11],['Duplicate / invalid',8],['Follow-up',6]].map(x=><div className="coverage" key={x[0]}><div><span>{x[0]}</span><b>{x[1]}%</b></div><div className="progress"><i style={{width:x[1]+'%'}}/></div></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Signal return rules</h3><p>Stage outcomes sent to ad platforms</p></div></div>{[['Qualified','Optimize'],['Appointment','Optimize'],['Booking','Primary conversion'],['Low quality','Suppress'],['Duplicate','Exclude']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div></div></>
}

function Events(){
 const [active,setActive]=useState('Qualified Lead')
 const events=[
  ['Qualified Lead','CRM','Google Ads + Meta Ads','Real time','Active'],
  ['Consultation Booked','CRM','Google Ads','Real time','Active'],
  ['WhatsApp Started','WhatsApp','Google Ads + Meta Ads','Real time','Active'],
  ['Call Connected','Calling','Meta Ads','Real time','Active'],
  ['Enrolment','CRM / Billing','Google Ads + Meta Ads + LinkedIn','Real time','Active'],
  ['Low Quality Lead','CRM','Audience suppression','5 min','Active']
 ]
 return <><PageHead crumb="Activation / Events" title="Conversion event manager" sub="Define the business outcomes that should be captured, transformed and returned to downstream platforms." action="New event"/>
 <div className="event-layout"><div className="app-panel event-list"><div className="panel-head"><div><h3>Configured events</h3><p>Business logic → destinations</p></div><span className="healthy">6 active</span></div>{events.map(x=><button className={active===x[0]?'selected':''} key={x[0]} onClick={()=>setActive(x[0])}><span><Zap/></span><div><b>{x[0]}</b><small>{x[1]} → {x[2]}</small></div><i>{x[4]}</i><ChevronRight/></button>)}</div>
 <div className="app-panel event-editor"><div className="panel-head"><div><h3>{active}</h3><p>Transformation and delivery rules</p></div><button>Edit</button></div><div className="event-step"><span>1</span><div><b>Source condition</b><p>CRM stage changes to <strong>{active}</strong> and identity contains a valid first-party key.</p></div></div><div className="event-step"><span>2</span><div><b>Identity resolution</b><p>Resolve GCLID / FBCLID, hashed email, hashed phone and workspace customer ID.</p></div></div><div className="event-step"><span>3</span><div><b>Normalize & deduplicate</b><p>Apply event schema, revenue/value rules and deterministic event ID before delivery.</p></div></div><div className="event-step"><span>4</span><div><b>Activate</b><p>Send to configured ad-platform destinations and write delivery status to the audit stream.</p></div></div><div className="delivery-summary"><div><span>Median latency</span><b>42s</b></div><div><span>Match rate</span><b>94.8%</b></div><div><span>24h delivery</span><b>99.82%</b></div></div></div></div>
 <div className="event-tooling-grid">
  <div className="app-panel"><div className="panel-head"><div><h3>Custom event templates</h3><p>Common business events from the brochure patterns</p></div></div>{[['Pricing-page Lead','High intent','Optimize'],['High-value Purchase','Revenue','Primary'],['Prepaid Order','Payment type','Optimize'],['Fulfilled Order','Revenue quality','Adjust'],['Returned Order','Negative outcome','Exclude'],['Partial Payment','Value adjustment','Adjust']].map(x=><div className="template-row" key={x[0]}><Zap/><div><b>{x[0]}</b><small>{x[1]}</small></div><span>{x[2]}</span></div>)}</div>
  <div className="app-panel"><div className="panel-head"><div><h3>Conversion adjustments</h3><p>Teach bidding the difference between raw and valuable outcomes</p></div></div>{[['Raw form fill','Qualified lead','Upgrade signal'],['Partial payment','Full payment / zero','Reclassify'],['Returned order','Zero value','Correct revenue'],['Duplicate lead','Excluded','Deduplicate']].map(x=><div className="adjustment-row" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b><em>{x[2]}</em></div>)}</div>
 </div></>
}

function Adjustments(){
 const [items,setItems]=useState<any[]>([
  {id:'adj_501',event:'Partial Payment',source:'CRM / Billing',destination:'Google Ads',from:'₹15,000',to:'₹84,000',reason:'Final payment received',status:'Pending'},
  {id:'adj_500',event:'Returned Order',source:'Commerce backend',destination:'Google Ads',from:'₹7,200',to:'₹0',reason:'Order returned / revenue reversed',status:'Pending'},
  {id:'adj_499',event:'Low Quality Lead',source:'CRM',destination:'Google Ads',from:'Lead',to:'Excluded',reason:'Lead disposition = junk / invalid',status:'Applied'},
  {id:'adj_498',event:'Duplicate Lead',source:'CRM',destination:'Meta Ads',from:'Lead',to:'Deduplicated',reason:'Existing customer identity match',status:'Applied'}
 ])
 const [selected,setSelected]=useState(items[0].id)
 const current=items.find(x=>x.id===selected)||items[0]
 const apply=async(id:string)=>{await api.applyAdjustment(id).catch(()=>null);setItems(xs=>xs.map(x=>x.id===id?{...x,status:'Applied'}:x))}
 return <><PageHead crumb="AdSync / Adjustments" title="Conversion adjustments" sub="Correct low-value, partial, returned or duplicate outcomes so bidding learns from the right business result." action="New adjustment rule"/>
 <div className="stats-grid"><Stat label="Adjustments today" value="1,284" sub="Applied across destinations" Icon={CircleDollarSign}/><Stat label="Revenue corrected" value="₹18.6L" sub="Partial / returned outcomes" Icon={BarChart3}/><Stat label="Low-value exclusions" value="4,118" sub="Junk / invalid leads" Icon={ShieldCheck}/><Stat label="Delivery success" value="99.4%" sub="Adjustment imports" Icon={CheckCircle2}/></div>
 <div className="adjustments-layout"><div className="app-panel adjustment-list"><div className="panel-head"><div><h3>Recent adjustments</h3><p>Reclassification and value correction queue</p></div><span className="healthy">Live</span></div>{items.map(x=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><CircleDollarSign/><div><b>{x.event}</b><small>{x.source} → {x.destination}</small></div><span className={x.status.toLowerCase()}>{x.status}</span><ChevronRight/></button>)}</div>
 <div className="app-panel adjustment-detail"><div className="panel-head"><div><h3>{current.event}</h3><p>{current.reason}</p></div><span className={current.status==='Applied'?'healthy':'status'}>{current.status}</span></div><div className="adjustment-value-flow"><div><span>Original outcome</span><b>{current.from}</b></div><ArrowRight/><div><span>Adjusted outcome</span><b>{current.to}</b></div></div><div className="diagnostic-evidence">{[['Adjustment ID',current.id],['Source',current.source],['Destination',current.destination],['Identity rule','GCLID / hashed first-party identity']].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div><div className="root-cause-box"><Sparkles/><div><b>Why this matters</b><p>Conversion adjustments prevent bidding systems from learning that every raw lead or partial event has the same business value. The corrected outcome is returned only after identity matching and deduplication.</p></div></div>{current.status!=='Applied'?<div className="approval-actions"><button>Preview payload</button><button className="approve" onClick={()=>apply(current.id)}><Check/>Apply adjustment</button></div>:<div className="approval-final approved"><Check/><b>Adjustment applied</b></div>}</div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Adjustment rules</h3><p>Business outcome → platform learning signal</p></div></div>{[['Partial payment','Replace / restate value','Google Ads'],['Returned order','Restate value to zero','Google Ads'],['Low-quality lead','Exclude from optimization','Google Ads + Meta'],['Duplicate lead','Deduplicate event','All destinations'],['Qualified lead upgrade','Promote higher-value outcome','Google Ads + Meta']].map(x=><div className="adjustment-rule-row" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b><em>{x[2]}</em></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Quality safeguards</h3><p>Apply corrections only when matching is trustworthy</p></div></div>{[['Identity confidence','≥ 90%'],['Event ID','Required'],['Click identifier','Use when available'],['Revenue currency','Required for value corrections'],['Audit record','Always written'],['Replay protection','Enabled']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><Check/></div>)}</div></div></>
}

function Diagnostics(){
 const [selected,setSelected]=useState('Duplicate conversions')
 const issues=[
  ['Duplicate conversions','Critical','1,284 affected events','Browser + server events share inconsistent event IDs.'],
  ['Missing click IDs','Warning','6.8% of offline outcomes','Some CRM outcomes cannot be mapped back to GCLID / FBCLID.'],
  ['Cross-domain break','Warning','checkout.example.com','Session continuity drops when visitors move between tracked domains.'],
  ['Late CRM outcomes','Warning','p95 = 18 min','Qualified and closed stages arrive too slowly for fresh bidding signals.'],
  ['Schema mismatch','Info','42 quarantined events','Destination fields do not match the configured event schema.']
 ]
 const [replays,setReplays]=useState<string[]>([])
 const replay=async(name:string)=>{await api.replayDiagnostic(name).catch(()=>null);setReplays(x=>[...x,name])}
 const current=issues.find(x=>x[0]===selected)||issues[0]
 return <><PageHead crumb="Tracking / Diagnostics" title="Tracking & data quality diagnostics" sub="Find the concrete pipeline problem behind weak attribution, duplicate conversions and poor optimization signals." action="Run full scan"/>
 <div className="stats-grid"><Stat label="Signal quality score" value="91/100" sub="4.2 points above last week" Icon={ShieldCheck}/><Stat label="Duplicate rate" value="1.7%" sub="Target < 0.5%" Icon={Zap}/><Stat label="Click-ID coverage" value="93.2%" sub="Across offline outcomes" Icon={MousePointer2}/><Stat label="Quarantined events" value="42" sub="Awaiting schema correction" Icon={Activity}/></div>
 <div className="diagnostic-ops-layout"><div className="app-panel diagnostic-issue-list"><div className="panel-head"><div><h3>Detected issues</h3><p>Prioritized by business impact</p></div><span className="status">5 open</span></div>{issues.map(x=><button key={x[0]} className={selected===x[0]?'selected':''} onClick={()=>setSelected(x[0])}><Activity/><div><b>{x[0]}</b><small>{x[2]}</small></div><span className={x[1].toLowerCase()}>{x[1]}</span><ChevronRight/></button>)}</div>
 <div className="app-panel diagnostic-detail"><div className="panel-head"><div><h3>{current[0]}</h3><p>{current[3]}</p></div><span className={'diag-severity '+current[1].toLowerCase()}>{current[1]}</span></div><div className="diagnostic-evidence">{[['Affected events',current[2]],['First detected','Today · 09:18'],['Likely source','Tracking / connector configuration'],['Optimization impact','Bidding receives noisy or incomplete feedback']].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div><div className="root-cause-box"><Target/><div><b>Root-cause recommendation</b><p>{current[0]==='Duplicate conversions'?'Standardize event_id across browser and server events, then validate deduplication before resuming optimization.':current[0]==='Missing click IDs'?'Persist click identifiers at first touch and map them into CRM/offline outcome payloads before upload.':current[0]==='Cross-domain break'?'Use one first-party identity/session strategy across all approved domains and validate referral exclusions.':current[0]==='Late CRM outcomes'?'Move stage-change delivery to a webhook or near-real-time queue instead of delayed batch imports.':'Fix field mapping, quarantine invalid payloads and replay only after schema validation.'}</p></div></div><div className="diagnostic-actions"><button>Open configuration</button><button className="primary" onClick={()=>replay(current[0])}>{replays.includes(current[0])?<><Check/>Replay queued</>:<>Replay affected events</>}</button></div></div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Event match quality</h3><p>Identifier coverage by destination</p></div></div>{[['Meta Ads',95],['Google Ads',96],['CRM closed outcomes',91],['WhatsApp events',89]].map(x=><div className="health-line" key={x[0]}><span>{x[0]}</span><div className="progress"><i style={{width:x[1]+'%'}}/></div><b>{x[1]}%</b></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Delivery pipeline</h3><p>Validate → deduplicate → match → send → confirm</p></div></div>{[['Validate schema','99.83%','Healthy'],['Deduplicate','98.30%','Needs attention'],['Identity match','93.20%','Healthy'],['Destination delivery','99.61%','Healthy'],['Receipt confirmation','99.42%','Healthy']].map(x=><div className="pipeline-health-row" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><em className={x[2]==='Healthy'?'healthy-state':'warn-state'}>{x[2]}</em></div>)}</div></div></>
}

function Fraud(){
 const [selected,setSelected]=useState('Duplicate lead burst')
 const [blocked,setBlocked]=useState<string[]>([])
 const issues=[
  ['Duplicate lead burst','High','Meta Lead Ads','428 leads','Same phone/email submitted repeatedly across a short window.'],
  ['Bot form activity','High','Website','1,214 sessions','Abnormal navigation speed and impossible interaction timing.'],
  ['Invalid phone pattern','Medium','CRM import','309 leads','Phone-format and reachability checks failed.'],
  ['Disposable email cluster','Medium','Website','184 leads','Temporary-domain emails concentrated in one campaign.'],
  ['Click-spam pattern','Low','Affiliate traffic','2,918 clicks','High click volume with near-zero qualified progression.']
 ]
 const current=issues.find(x=>x[0]===selected)||issues[0]
 const block=async(name:string)=>{await api.blockFraudPattern(name).catch(()=>null);setBlocked(x=>x.includes(name)?x:[...x,name])}
 return <><PageHead crumb="Quality / Fraud" title="Fraud & noise detection" sub="Stop low-quality, duplicate and suspicious traffic from contaminating CRM funnels and optimization signals." action="Create fraud rule"/>
 <div className="stats-grid"><Stat label="Suspect leads" value="2,135" sub="Last 30 days" Icon={ShieldCheck}/><Stat label="Blocked before CRM" value="1,486" sub="69.6% prevented" Icon={X}/><Stat label="Duplicate rate" value="3.2%" sub="Across lead sources" Icon={UsersRound}/><Stat label="Spend protected" value="₹4.8L" sub="Estimated noisy traffic" Icon={CircleDollarSign}/></div>
 <div className="fraud-layout"><div className="app-panel fraud-list"><div className="panel-head"><div><h3>Detected patterns</h3><p>Prioritized by signal contamination risk</p></div><span className="status">5 active</span></div>{issues.map(x=><button key={x[0]} className={selected===x[0]?'selected':''} onClick={()=>setSelected(x[0])}><ShieldCheck/><div><b>{x[0]}</b><small>{x[2]} · {x[3]}</small></div><span className={x[1].toLowerCase()}>{x[1]}</span><ChevronRight/></button>)}</div>
 <div className="app-panel fraud-detail"><div className="panel-head"><div><h3>{current[0]}</h3><p>{current[4]}</p></div><span className={'diag-severity '+current[1].toLowerCase()}>{current[1]}</span></div><div className="diagnostic-evidence">{[['Source',current[2]],['Affected volume',current[3]],['Detection method','Rules + behavior pattern'],['Signal action','Exclude from learning until reviewed']].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div><div className="fraud-evidence"><h4>Evidence</h4>{[['Identity repetition','Same identifiers repeated unusually often'],['Behavior velocity','Actions occur faster than expected human behavior'],['Funnel quality','Near-zero qualification / revenue progression'],['Campaign concentration','Pattern clustered within specific acquisition sources']].map(x=><div key={x[0]}><Activity/><div><b>{x[0]}</b><small>{x[1]}</small></div></div>)}</div><div className="approval-actions"><button>Send to review</button><button className="approve" onClick={()=>block(current[0])}>{blocked.includes(current[0])?<><Check/>Rule active</>:<><ShieldCheck/>Block from optimization</>}</button></div></div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Quality gates</h3><p>Before events reach ad platforms</p></div></div>{[['Duplicate identity','Deduplicate / suppress'],['Invalid contact','Do not promote as quality signal'],['Known bot','Drop event'],['Fraud threshold exceeded','Quarantine'],['Human-reviewed legitimate lead','Release to activation']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div><div className="app-panel"><div className="panel-head"><div><h3>Campaign noise view</h3><p>Suspect rate by source</p></div></div>{[['Meta Lead Ads',7.4],['Google Search',2.1],['Affiliate',12.8],['Organic',0.8]].map(x=><div className="health-line" key={x[0]}><span>{x[0]}</span><div className="progress"><i style={{width:Math.min(100,(x[1] as number)*7)+'%'}}/></div><b>{x[1]}%</b></div>)}</div></div></>
}

function DeepLinks(){
 const [links,setLinks]=useState<any[]>([
  {name:'MBA Application',slug:'mba-apply',target:'app://program/mba/apply',fallback:'https://www.example.com/mba/apply',clicks:'18,204',status:'Active'},
  {name:'Scholarship Offer',slug:'scholarship',target:'app://offers/scholarship',fallback:'https://www.example.com/scholarship',clicks:'8,419',status:'Active'},
  {name:'Consultation Booking',slug:'book',target:'app://consultation/book',fallback:'https://www.example.com/book',clicks:'6,882',status:'Active'},
  {name:'Fee Details',slug:'fees',target:'app://program/fees',fallback:'https://www.example.com/fees',clicks:'5,104',status:'Draft'}
 ])
 const [selected,setSelected]=useState(links[0].slug)
 const current=links.find(x=>x.slug===selected)||links[0]
 const activate=async(slug:string)=>{await api.activateDeepLink(slug).catch(()=>null);setLinks(xs=>xs.map(x=>x.slug===slug?{...x,status:'Active'}:x))}
 return <><PageHead crumb="Activation / Deep Links" title="Deep linking" sub="Route users directly to the right app or web destination while preserving campaign and journey context." action="Create deep link"/>
 <div className="stats-grid"><Stat label="Active links" value="3" sub="1 draft" Icon={Network}/><Stat label="Clicks" value="38.6K" sub="Last 30 days" Icon={MousePointer2}/><Stat label="App opens" value="61%" sub="Eligible devices" Icon={Globe2}/><Stat label="Journey preserved" value="96.8%" sub="Attribution continuity" Icon={CheckCircle2}/></div>
 <div className="deep-link-layout"><div className="app-panel deep-link-list"><div className="panel-head"><div><h3>Deep links</h3><p>App-first routes with web fallbacks</p></div></div>{links.map(x=><button key={x.slug} className={selected===x.slug?'selected':''} onClick={()=>setSelected(x.slug)}><Network/><div><b>{x.name}</b><small>ace.link/{x.slug} · {x.clicks} clicks</small></div><span className={x.status.toLowerCase()}>{x.status}</span><ChevronRight/></button>)}</div>
 <div className="app-panel deep-link-detail"><div className="panel-head"><div><h3>{current.name}</h3><p>ace.link/{current.slug}</p></div><span className={current.status==='Active'?'healthy':'status'}>{current.status}</span></div><div className="site-detail-grid">{[['Primary destination',current.target],['Web fallback',current.fallback],['UTM passthrough','Enabled'],['Click ID passthrough','GCLID + FBCLID'],['Deferred deep link','Enabled'],['Attribution window','30 days']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="deep-link-flow">{['Ad / message','ace.link redirect','App if installed','Web fallback','Journey event'].map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b>{i<4&&<ArrowRight/>}</div>)}</div><div className="approval-actions"><button>Copy test URL</button>{current.status!=='Active'&&<button className="approve" onClick={()=>activate(current.slug)}><Check/>Activate link</button>}</div></div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Routing rules</h3><p>Context-aware destination logic</p></div></div>{[['iOS app installed','Open native destination'],['Android app installed','Open native destination'],['App not installed','Use web fallback'],['Known campaign','Preserve UTM + click IDs'],['Returning user','Attach first-party customer ID']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><Check/></div>)}</div><div className="app-panel"><div className="panel-head"><div><h3>Top link performance</h3><p>Click → downstream conversion</p></div></div>{[['MBA Application','18.2K','14.8% conversion'],['Scholarship Offer','8.4K','11.2% conversion'],['Consultation Booking','6.9K','19.4% conversion']].map(x=><div className="developer-event-row" key={x[0]}><b>{x[0]}</b><span>{x[1]} clicks</span><strong>{x[2]}</strong></div>)}</div></div></>
}

function Sites(){
 const [sites,setSites]=useState<any[]>([
  {domain:'www.aceedtech.example',environment:'Production',pixel:'Active',server:'Connected',coverage:97.4,consent:'Enabled'},
  {domain:'apply.aceedtech.example',environment:'Production',pixel:'Active',server:'Connected',coverage:95.8,consent:'Enabled'},
  {domain:'checkout.aceedtech.example',environment:'Production',pixel:'Needs review',server:'Connected',coverage:88.6,consent:'Enabled'},
  {domain:'staging.aceedtech.example',environment:'Sandbox',pixel:'Active',server:'Sandbox',coverage:100,consent:'Test mode'}
 ])
 const [selected,setSelected]=useState(sites[0].domain)
 const [tested,setTested]=useState<string[]>([])
 const current=sites.find(x=>x.domain===selected)||sites[0]
 const test=async(domain:string)=>{await api.testSite(domain).catch(()=>null);setTested(x=>x.includes(domain)?x:[...x,domain])}
 return <><PageHead crumb="Tracking / Sites" title="Site & pixel operations" sub="Manage first-party collection, cross-domain continuity, consent gating and server-side event delivery." action="Add site"/>
 <div className="stats-grid"><Stat label="Tracked domains" value="4" sub="3 production · 1 sandbox" Icon={Globe2}/><Stat label="Pixel coverage" value="95.4%" sub="Across production traffic" Icon={MousePointer2}/><Stat label="Server-side coverage" value="97.1%" sub="Qualified events" Icon={RadioTower}/><Stat label="Consent enforcement" value="100%" sub="Optional activation gated" Icon={ShieldCheck}/></div>
 <div className="site-ops-layout"><div className="app-panel site-list"><div className="panel-head"><div><h3>Tracked properties</h3><p>Domains and environments</p></div><span className="healthy">Collection active</span></div>{sites.map(x=><button key={x.domain} className={selected===x.domain?'selected':''} onClick={()=>setSelected(x.domain)}><Globe2/><div><b>{x.domain}</b><small>{x.environment} · {x.pixel}</small></div><strong>{x.coverage}%</strong><ChevronRight/></button>)}</div>
 <div className="app-panel site-detail"><div className="panel-head"><div><h3>{current.domain}</h3><p>{current.environment} property</p></div><span className={current.pixel==='Active'?'healthy':'status'}>{current.pixel}</span></div><div className="site-detail-grid">{[['Browser pixel',current.pixel],['Server connection',current.server],['Event coverage',current.coverage+'%'],['Consent mode',current.consent],['GCLID persistence','90 days'],['FBCLID persistence','90 days']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="tracking-install"><code>{'<script src="https://cdn.acemarketing.example/track.js" data-workspace="ace-edtech"></script>'}</code></div><div className="site-checks">{[['Page view','Receiving'],['Form start','Receiving'],['Form submit','Receiving'],['WhatsApp click','Receiving'],['Call CTA','Receiving'],['Cross-domain session','Verified']].map(x=><div key={x[0]}><Check/><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="approval-actions"><button>Open event debugger</button><button className="approve" onClick={()=>test(current.domain)}>{tested.includes(current.domain)?<><Check/>Test passed</>:<><Activity/>Test installation</>}</button></div></div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Cross-domain map</h3><p>Session continuity across approved domains</p></div></div><div className="cross-domain-flow">{['www.aceedtech.example','apply.aceedtech.example','checkout.aceedtech.example'].map((x,i)=><div key={x}><Globe2/><b>{x}</b>{i<2&&<ArrowRight/>}</div>)}</div></div><div className="app-panel"><div className="panel-head"><div><h3>Collection guardrails</h3><p>Protect data quality and consent</p></div></div>{[['Optional cookies','Blocked until consent'],['Known bots','Filtered'],['Duplicate events','event_id deduplication'],['Unknown schema','Quarantine'],['PII fields','Hash before activation']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><Check/></div>)}</div></div></>
}

function Fingerprinting(){
 const [selected,setSelected]=useState('Third-party checkout')
 const scenarios=[
  ['Third-party checkout','www → checkout → confirmation','96.4%','Session continuity across domains without treating checkout as a new user.'],
  ['WhatsApp handoff','website → WhatsApp → CRM','92.8%','Preserve acquisition context when the user leaves the browser for chat.'],
  ['Call handoff','website → call center → CRM','91.6%','Use session timing, click IDs and first-party identity to associate calls with acquisition.'],
  ['Returning device','anonymous visit → known lead','88.9%','Link repeated first-party device activity after the user identifies themselves.']
 ]
 const current=scenarios.find(x=>x[0]===selected)||scenarios[0]
 const [tested,setTested]=useState(false)
 const run=async()=>{await api.testFingerprint(current[0]).catch(()=>null);setTested(true)}
 return <><PageHead crumb="Tracking / Fingerprinting" title="Cross-domain journey continuity" sub="Preserve first-party journey context across owned domains and assisted handoffs so attribution does not break at checkout, chat or calls." action="Configure rules"/>
 <div className="stats-grid"><Stat label="Cross-domain matches" value="48,216" sub="Last 30 days" Icon={Network}/><Stat label="Continuity rate" value="96.4%" sub="Production properties" Icon={CheckCircle2}/><Stat label="Referral inflation removed" value="8.7%" sub="Sessions corrected" Icon={BarChart3}/><Stat label="Ambiguous matches" value="1.3%" sub="Held for review" Icon={Activity}/></div>
 <div className="fingerprint-layout"><div className="app-panel fingerprint-list"><div className="panel-head"><div><h3>Continuity scenarios</h3><p>Where customer journeys usually break</p></div></div>{scenarios.map(x=><button key={x[0]} className={selected===x[0]?'selected':''} onClick={()=>{setSelected(x[0]);setTested(false)}}><MousePointer2/><div><b>{x[0]}</b><small>{x[1]}</small></div><strong>{x[2]}</strong><ChevronRight/></button>)}</div>
 <div className="app-panel fingerprint-detail"><div className="panel-head"><div><h3>{current[0]}</h3><p>{current[3]}</p></div><span className="healthy">{current[2]} matched</span></div><div className="fingerprint-flow">{current[1].split(' → ').map((x,i,arr)=><div key={x}><span>{i+1}</span><b>{x}</b>{i<arr.length-1&&<ArrowRight/>}</div>)}</div><div className="diagnostic-evidence">{[['Primary key','First-party customer/session ID'],['Supporting keys','GCLID · FBCLID · hashed email/phone'],['Domain policy','Approved-domain allowlist'],['Fallback','Review ambiguous identity merges']].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div><div className="root-cause-box"><ShieldCheck/><div><b>Privacy-aware continuity</b><p>Use first-party identifiers and consent-aware session context rather than claiming unrestricted browser fingerprinting. The workflow is designed to preserve owned-journey continuity while respecting configured consent and data policies.</p></div></div><div className="approval-actions"><button>View match log</button><button className="approve" onClick={run}>{tested?<><Check/>Test passed</>:<><Activity/>Run continuity test</>}</button></div></div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Domain continuity</h3><p>Approved first-party properties</p></div></div>{[['www.aceedtech.example','checkout.aceedtech.example','Verified'],['www.aceedtech.example','apply.aceedtech.example','Verified'],['apply.aceedtech.example','payments.example-partner.test','Server handoff']].map(x=><div className="mapping-rule" key={x[0]+x[1]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b><em>{x[2]}</em></div>)}</div><div className="app-panel"><div className="panel-head"><div><h3>Continuity safeguards</h3><p>Prevent incorrect stitching</p></div></div>{[['Deterministic ID first','Required'],['Session time window','30 minutes'],['Ambiguous merge','Human review'],['Consent status','Must be valid'],['Audit trail','Stored for every merge']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><Check/></div>)}</div></div></>
}

function LiveSync(){
 const rows=[
  ['16:24:18','Zoho CRM','Qualified Lead','Google Ads','Delivered','gclid'],
  ['16:24:12','WhatsApp','Conversation Started','Meta Ads','Delivered','fbclid'],
  ['16:24:05','Exotel','Call Connected','Google Ads','Matched','phone+time'],
  ['16:23:58','LeadSquared','Consultation Booked','Meta Ads','Delivered','email+phone'],
  ['16:23:44','Website','High Intent Visit','Audience Engine','Processed','cookie+gclid'],
  ['16:23:31','Billing','Enrolment','Google + Meta','Delivered','customer_id']
 ]
 return <><PageHead crumb="AdSync / Live Sync" title="24×7 event transfer" sub="Continuous movement of CRM, calling, chat and revenue signals to every configured destination." action="Create alert"/>
 <div className="stats-grid"><Stat label="Sync status" value="Always on" sub="24×7 continuous transfer" Icon={Activity}/><Stat label="Median latency" value="42s" sub="Intent stays fresh" Icon={Zap}/><Stat label="Events / min" value="8,412" sub="Current throughput" Icon={BarChart3}/><Stat label="Delivery rate" value="99.82%" sub="Last 24 hours" Icon={Target}/></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recent activity</h3><p>Live event movement across connected systems</p></div><span className="healthy">● Streaming</span></div>
 <table><thead><tr><th>Time</th><th>Source</th><th>Event</th><th>Destination</th><th>Status</th><th>Match key</th></tr></thead><tbody>{rows.map(r=><tr key={r[0]+r[2]}>{r.map((v,i)=><td key={i}>{i===4?<span className="status">{v}</span>:v}</td>)}</tr>)}</tbody></table></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Destination throughput</h3><p>Events successfully transferred</p></div></div>{[['Google Ads',99.9],['Meta Ads',99.8],['LinkedIn Ads',99.6],['Audience Engine',100]].map(x=><div className="health-line" key={x[0]}><span>{x[0]}</span><div className="progress"><i style={{width:x[1]+'%'}}/></div><b>{x[1]}%</b></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Freshness policy</h3><p>No next-day batch dependency</p></div></div><div className="freshness-card"><Zap/><div><b>Real-time first</b><p>Critical intent and revenue outcomes are delivered immediately; retries use idempotent event IDs and backoff.</p></div></div><div className="freshness-card"><ShieldCheck/><div><b>Safe retries</b><p>Failed deliveries remain visible in monitoring until acknowledged or successfully replayed.</p></div></div></div></div></>
}

function DataHub(){
 const sources=[
  {name:'Google Ads',type:'Ad platform',freshness:'38s',records:'248.9K',status:'Healthy',fields:'Campaign · GCLID · cost · conversions'},
  {name:'Meta Ads',type:'Ad platform',freshness:'42s',records:'311.4K',status:'Healthy',fields:'Campaign · FBCLID · spend · CAPI receipt'},
  {name:'LeadSquared',type:'CRM',freshness:'1m 12s',records:'92.4K',status:'Healthy',fields:'Lead · stage · owner · revenue'},
  {name:'WhatsApp',type:'Messaging',freshness:'19s',records:'66.8K',status:'Healthy',fields:'Phone · conversation · intent · timestamps'},
  {name:'Exotel',type:'Calling',freshness:'2m 04s',records:'18.2K',status:'Review',fields:'Phone · call outcome · duration'},
  {name:'POS / Billing',type:'Offline revenue',freshness:'7m 31s',records:'5.8K',status:'Healthy',fields:'Customer · order · value · store'}
 ]
 const [selected,setSelected]=useState(sources[2].name)
 const [rebuilding,setRebuilding]=useState(false)
 const current=sources.find(x=>x.name===selected)||sources[0]
 const rebuild=async()=>{setRebuilding(true);await api.rebuildDataHub().catch(()=>null);setTimeout(()=>setRebuilding(false),450)}
 return <><PageHead crumb="Data / Data Hub" title="Unified customer data hub" sub="Normalize every connected source into one governed customer, journey and revenue truth for attribution, activation and agents." action="Add data source"/>
 <div className="stats-grid"><Stat label="Unified records" value="742K" sub="Across connected systems" Icon={DatabaseZap}/><Stat label="Known identities" value="56.6K" sub="Stitched customer profiles" Icon={UsersRound}/><Stat label="Freshness SLA" value="< 5 min" sub="Critical sources" Icon={Activity}/><Stat label="Schema health" value="99.8%" sub="42 records quarantined" Icon={ShieldCheck}/></div>
 <div className="datahub-layout"><div className="app-panel datahub-source-list"><div className="panel-head"><div><h3>Source registry</h3><p>Freshness, volume and schema ownership</p></div><span className="healthy">6 sources</span></div>{sources.map(x=><button key={x.name} className={selected===x.name?'selected':''} onClick={()=>setSelected(x.name)}><DatabaseZap/><div><b>{x.name}</b><small>{x.type} · {x.records} records</small></div><span>{x.freshness}</span><em className={x.status==='Healthy'?'healthy':'status'}>{x.status}</em><ChevronRight/></button>)}</div>
 <div className="app-panel datahub-detail"><div className="panel-head"><div><h3>{current.name}</h3><p>{current.type} · last sync {current.freshness} ago</p></div><span className={current.status==='Healthy'?'healthy':'status'}>{current.status}</span></div><div className="site-detail-grid">{[['Records',current.records],['Freshness',current.freshness],['Primary identity','Email / phone / customer ID'],['Schema owner','Workspace data model'],['Retention','180 days'],['Change capture','Incremental sync']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="agent-section"><h4>Normalized fields</h4><div className="context-chips">{current.fields.split(' · ').map(x=><span key={x}>{x}</span>)}</div></div><div className="data-lineage"><h4>Lineage</h4>{[['Source record',current.name],['Normalize','Workspace canonical schema'],['Identity','Customer graph / anonymous session'],['Journey','Chronological event stream'],['Revenue truth','CRM / billing / POS authority'],['Consumers','Attribution · Agents · Audiences · Reports']].map((x,i)=><div key={x[0]}><span>{i+1}</span><div><b>{x[0]}</b><small>{x[1]}</small></div>{i<5&&<ArrowRight/>}</div>)}</div></div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Canonical data model</h3><p>One shared language across systems</p></div></div>{[['Customer','customer_id · email_hash · phone_hash'],['Acquisition','source · campaign · adset · creative'],['Click identity','gclid · fbclid · device/session'],['Lifecycle','lead_stage · disposition · owner'],['Interaction','web · call · WhatsApp · meeting'],['Revenue','order_id · value · currency · refund']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Data quality controls</h3><p>Before records become shared truth</p></div><button onClick={rebuild}>{rebuilding?'Rebuilding…':'Rebuild canonical view'}</button></div>{[['Schema validation','Required'],['Duplicate resolution','Deterministic event / identity keys'],['Unknown fields','Quarantine + mapping review'],['Late data','Reprocess attribution window'],['PII activation','Hash before destination'],['Auditability','Source + transform lineage retained']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><Check/></div>)}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recent sync history</h3><p>What changed across the unified data layer</p></div></div>{[['10:42:18','Google Ads','14,208 rows','Upsert','Healthy'],['10:41:59','WhatsApp','2,084 events','Append','Healthy'],['10:41:12','LeadSquared','1,426 leads','Upsert','Healthy'],['10:39:46','Exotel','384 calls','Append','Review'],['10:34:02','POS / Billing','128 transactions','Upsert','Healthy']].map(x=><div className="sync-history-row" key={x[0]+x[1]}><time>{x[0]}</time><b>{x[1]}</b><span>{x[2]}</span><span>{x[3]}</span><em className={x[4]==='Healthy'?'healthy':'status'}>{x[4]}</em></div>)}</div></>
}

function OfflineAttribution(){
 const flows=[
  ['Inbound Call','Tata Tele / Exotel','Timestamp overlap + active session','GCLID matched','Google Ads'],
  ['WhatsApp Enquiry','WhatsApp API','Persisted click ID + phone association','GCLID / FBCLID','Google + Meta'],
  ['Partial Payment','Custom Backend','Customer ID + order mapping','Revenue adjustment','Google Ads'],
  ['Walk-in / Offline Sale','CRM','Hashed phone/email + click history','Identity match','Google + Meta']
 ]
 return <><PageHead crumb="AdSync / Offline Attribution" title="Calls, WhatsApp & offline revenue" sub="Bridge the gap between digital acquisition and conversions that happen outside the browser." action="New offline rule"/>
 <div className="stats-grid"><Stat label="Calls attributed" value="4,218" sub="Last 30 days" Icon={PhoneCall}/><Stat label="WhatsApp conversions" value="6,904" sub="Matched to paid media" Icon={MessageCircle}/><Stat label="Offline match rate" value="91.6%" sub="Across supported identifiers" Icon={Target}/><Stat label="Revenue adjustments" value="1,284" sub="Partial/full conversion updates" Icon={CircleDollarSign}/></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Offline attribution rules</h3><p>How non-web conversions are matched back to campaigns</p></div><span className="healthy">Active</span></div><div className="offline-table"><div className="offline-row offline-head"><span>Conversion</span><span>Source</span><span>Matching method</span><span>Identifier</span><span>Destination</span></div>{flows.map(r=><div className="offline-row" key={r[0]}><b>{r[0]}</b><span>{r[1]}</span><span>{r[2]}</span><span>{r[3]}</span><strong>{r[4]}</strong></div>)}</div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Call attribution example</h3><p>Session-time overlap matching</p></div></div><div className="match-flow"><div><span>1</span><b>Ad click</b><small>GCLID persisted at landing</small></div><ArrowRight/><div><span>2</span><b>Active session</b><small>Visitor browsing window retained</small></div><ArrowRight/><div><span>3</span><b>Inbound call</b><small>Telephony timestamp received</small></div><ArrowRight/><div><span>4</span><b>Match</b><small>Call mapped to session GCLID</small></div></div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>WhatsApp + payment bridge</h3><p>High-consideration journey recovery</p></div></div><div className="freshness-card"><MessageCircle/><div><b>WhatsApp identity bridge</b><p>Persist the click identifier through chat initiation and associate it with the lead phone number.</p></div></div><div className="freshness-card"><CircleDollarSign/><div><b>Partial-payment adjustment</b><p>Classify partial payment outcomes into the conversion value that bidding should learn from.</p></div></div></div></div></>
}

function Matchback(){
 const [selected,setSelected]=useState('Closed Won · MBA Search')
 const [reconciled,setReconciled]=useState<string[]>([])
 const rows=[
  ['Closed Won · MBA Search','Google Ads','CRM + Billing','₹84.0L','982','96.8%','Ready'],
  ['Enrolment · Executive Program','Meta Ads','CRM + Billing','₹51.6L','611','95.9%','Ready'],
  ['Consultation → Sale · WhatsApp','Meta + Google','CRM + WhatsApp','₹28.4L','314','92.7%','Review'],
  ['Store Sale · Offline','Google + Meta','POS + CRM','₹19.8L','227','94.1%','Ready']
 ]
 const current=rows.find(x=>x[0]===selected)||rows[0]
 const run=async()=>{await api.reconcileMatchback(current[0]).catch(()=>null);setReconciled(x=>x.includes(current[0])?x:[...x,current[0]])}
 return <><PageHead crumb="Measurement / Matchback" title="Closure matchback & revenue reconciliation" sub="Tie qualified leads and closed revenue back to the acquisition journey, then return verified outcomes to the platforms that generated demand." action="New matchback rule"/>
 <div className="stats-grid"><Stat label="Closed revenue matched" value="₹1.84Cr" sub="Last 30 days" Icon={CircleDollarSign}/><Stat label="Closed outcomes" value="2,134" sub="Enrolments / purchases" Icon={CheckCircle2}/><Stat label="Match confidence" value="95.6%" sub="Deterministic + click IDs" Icon={Target}/><Stat label="Returned signals" value="1,987" sub="Google + Meta + LinkedIn" Icon={RadioTower}/></div>
 <div className="matchback-layout"><div className="app-panel matchback-list"><div className="panel-head"><div><h3>Matchback rules</h3><p>Revenue source → acquisition destination</p></div><span className="healthy">4 active</span></div>{rows.map(x=><button key={x[0]} className={selected===x[0]?'selected':''} onClick={()=>setSelected(x[0])}><CircleDollarSign/><div><b>{x[0]}</b><small>{x[1]} · {x[2]}</small></div><strong>{x[5]}</strong><span className={x[6]==='Ready'?'healthy':'status'}>{x[6]}</span><ChevronRight/></button>)}</div>
 <div className="app-panel matchback-detail"><div className="panel-head"><div><h3>{current[0]}</h3><p>{current[2]} → {current[1]}</p></div><span className="status">{current[5]} matched</span></div><div className="site-detail-grid">{[['Matched revenue',current[3]],['Closed outcomes',current[4]],['Identity confidence',current[5]],['Primary keys','Customer ID · GCLID · FBCLID'],['Revenue truth','Billing / POS source'],['Signal return','Server-side conversion API']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div>
 <div className="matchback-flow">{['Ad / source touch','Lead created','Qualified','Closed revenue','Revenue reconciled','Signal returned'].map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b>{i<5&&<ArrowRight/>}</div>)}</div>
 <div className="root-cause-box"><Sparkles/><div><b>Single revenue truth</b><p>Matchback uses the billing, CRM or POS close event as the authoritative outcome, then reconciles it against journey and identity evidence before any platform feedback is sent.</p></div></div>
 <div className="approval-actions"><button>View unmatched records</button><button className="approve" onClick={run}>{reconciled.includes(current[0])?<><Check/>Reconciliation complete</>:<><CircleDollarSign/>Run reconciliation</>}</button></div></div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Unmatched revenue queue</h3><p>Records requiring identity or source review</p></div></div>{[['REV-88421','₹72,000','Missing click ID','CRM customer ID available'],['REV-88419','₹55,000','Duplicate identity','Two CRM records share hashed phone'],['REV-88412','₹38,500','Late close event','Received 19 days after click'],['REV-88398','₹91,000','Offline-only','No digital touch located']].map(x=><div className="matchback-queue-row" key={x[0]}><code>{x[0]}</code><strong>{x[1]}</strong><span>{x[2]}</span><small>{x[3]}</small><button>Review</button></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Reconciliation safeguards</h3><p>Protect the source of truth</p></div></div>{[['Closed-stage authority','Billing / POS wins over ad-platform estimates'],['Duplicate close','Deduplicate by order / customer + event ID'],['Refund / cancellation','Restate or zero the conversion value'],['Late-arriving revenue','Rebuild attribution within configured window'],['Missing identity','Hold from signal return'],['Audit history','Every correction retained']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><Check/></div>)}</div></div></>
}

function POSAndStores(){
 const [selected,setSelected]=useState('Delhi Flagship')
 const locations=[
  ['Delhi Flagship','DL-01','2,184','₹48.6L','96.2%','Healthy'],
  ['Noida Center','NOI-02','1,476','₹31.8L','94.7%','Healthy'],
  ['Mumbai Experience','MUM-03','1,128','₹27.4L','91.9%','Needs review'],
  ['Bengaluru Center','BLR-04','986','₹22.1L','95.4%','Healthy']
 ]
 const current=locations.find(x=>x[0]===selected)||locations[0]
 const [uploaded,setUploaded]=useState(false)
 const upload=async()=>{await api.importPosBatch({location:current[1],records:128}).catch(()=>null);setUploaded(true)}
 return <><PageHead crumb="Offline / POS & Stores" title="POS, walk-in & store-sale attribution" sub="Match in-store and walk-in revenue back to paid acquisition and return verified offline outcomes to advertising platforms." action="Add POS source"/>
 <div className="stats-grid"><Stat label="Store transactions" value="5,774" sub="Last 30 days" Icon={Building2}/><Stat label="Offline revenue" value="₹1.30Cr" sub="Matched + unmatched" Icon={CircleDollarSign}/><Stat label="Attribution match rate" value="94.8%" sub="Across POS sources" Icon={Target}/><Stat label="Signal return" value="4,892" sub="Sent to ad platforms" Icon={RadioTower}/></div>
 <div className="pos-layout"><div className="app-panel pos-list"><div className="panel-head"><div><h3>Store / offline sources</h3><p>Location-level attribution health</p></div><span className="healthy">4 connected</span></div>{locations.map(x=><button key={x[0]} className={selected===x[0]?'selected':''} onClick={()=>{setSelected(x[0]);setUploaded(false)}}><Building2/><div><b>{x[0]}</b><small>{x[1]} · {x[2]} transactions</small></div><strong>{x[4]}</strong><span className={x[5]==='Healthy'?'healthy':'status'}>{x[5]}</span><ChevronRight/></button>)}</div>
 <div className="app-panel pos-detail"><div className="panel-head"><div><h3>{current[0]}</h3><p>{current[1]} · {current[2]} transactions · {current[3]} revenue</p></div><span className="status">{current[4]} matched</span></div><div className="site-detail-grid">{[['Matching keys','Phone · Email · Customer ID'],['Campaign keys','GCLID · FBCLID'],['Import method','API + CSV fallback'],['Revenue field','net_revenue'],['Store ID',current[1]],['Return destinations','Google Ads + Meta']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="pos-flow">{['Ad click','Website / lead','Store visit','POS transaction','Identity match','Offline conversion return'].map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b>{i<5&&<ArrowRight/>}</div>)}</div><div className="approval-actions"><button>Download import template</button><button className="approve" onClick={upload}>{uploaded?<><Check/>Batch queued</>:<><Building2/>Import POS batch</>}</button></div></div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Recent offline transactions</h3><p>Identity and campaign match status</p></div></div>{[['TXN-18421','₹84,000','cust_18421','Google Ads','Matched'],['TXN-18420','₹62,000','hashed phone','Meta Ads','Matched'],['TXN-18419','₹28,500','customer ID','Organic','Matched'],['TXN-18418','₹51,000','email only','Unknown','Review']].map(x=><div className="pos-transaction-row" key={x[0]}><code>{x[0]}</code><strong>{x[1]}</strong><span>{x[2]}</span><span>{x[3]}</span><em className={x[4].toLowerCase()}>{x[4]}</em></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Offline signal rules</h3><p>Only verified business outcomes are activated</p></div></div>{[['Completed store sale','Return as purchase / revenue'],['Walk-in consultation','Return as qualified offline event'],['Cancelled / refunded sale','Adjustment to zero / corrected value'],['Unmatched transaction','Hold for identity review'],['Duplicate receipt','Deduplicate before activation']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div></div></>
}

function Journeys(){
 const data=[
  ['Aarav Sharma','Google Ads','Qualified','6 touchpoints','18m'],
  ['Meera Patel','Meta Ads','Consultation','8 touchpoints','4h'],
  ['Rohan Kumar','WhatsApp','Enrolled','11 touchpoints','2d'],
  ['Anika Roy','Organic','Connected','4 touchpoints','31m']
 ]
 const [selected,setSelected]=useState(data[0][0])
 const current=data.find(x=>x[0]===selected) || data[0]
 return <><PageHead crumb="Measurement / Journeys" title="Customer journey explorer" sub="Inspect the complete chronology for every lead across connected systems." action="Find journey"/>
 <div className="filters"><button>All sources <ChevronDown/></button><button>All stages <ChevronDown/></button><button>Last 30 days <ChevronDown/></button><div><Search/> Search phone, email, click ID...</div></div>
 <div className="journey-layout"><div className="journey-list">{data.map((x,i)=><article className={selected===x[0]?'selected':''} key={x[0]} onClick={()=>setSelected(x[0])}><div className="lead-avatar">{x[0].split(' ').map(s=>s[0]).join('')}</div><div><b>{x[0]}</b><small>{x[1]} · {x[3]}</small></div><span className="stage">{x[2]}</span><div className="mini-path"><i/><i/><i/><i className={i>1?'done':''}/><i className={i>2?'done':''}/></div><time>{x[4]}</time><ChevronRight/></article>)}</div>
 <div className="app-panel journey-detail"><div className="panel-head"><div><h3>{current[0]}</h3><p>{current[1]} · {current[2]}</p></div><span className="status">Identity stitched</span></div><div className="journey-detail-meta">{[['Customer ID','cust_18421'],['GCLID','gclid•••9A7'],['Phone','+91 ••••• 4821'],['Email','a•••@mail.com']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="journey-detail-timeline">{[['09:41','Google Ads','MBA Search click'],['09:42','Website','Program page viewed'],['09:44','Website','Pricing page viewed'],['09:47','WhatsApp','Conversation started'],['09:49','CRM','Lead created'],['10:03','Calling','Counsellor connected'],['10:12','CRM','Qualified lead']].map((x,i)=><div key={x[0]+x[1]}><span>{i+1}</span><time>{x[0]}</time><div><b>{x[1]}</b><small>{x[2]}</small></div></div>)}</div></div></div></>
}

function Identity(){
 const identities=[['cust_18421','Aarav Sharma','4 identifiers','6 touchpoints','High confidence'],['cust_18420','Meera Patel','3 identifiers','8 touchpoints','High confidence'],['cust_18419','Rohan Kumar','5 identifiers','11 touchpoints','High confidence'],['cust_18418','Anika Roy','2 identifiers','4 touchpoints','Medium confidence']]
 return <><PageHead crumb="Data / Identity" title="Identity resolution" sub="Unify click IDs, first-party identifiers, devices and CRM records into a customer-level graph." action="Review match rules"/>
 <div className="stats-grid"><Stat label="Known identities" value="56,582" sub="61.2% of tracked sessions" Icon={UsersRound}/><Stat label="Deterministic matches" value="91.6%" sub="Email, phone, customer ID" Icon={Target}/><Stat label="Click IDs attached" value="94.8%" sub="GCLID / FBCLID coverage" Icon={MousePointer2}/><Stat label="Merge conflicts" value="0.7%" sub="Queued for review" Icon={Activity}/></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Identity graph</h3><p>Example stitched customer</p></div><span className="healthy">Resolved</span></div><div className="identity-graph"><div className="identity-core"><span>AS</span><b>Aarav Sharma</b><small>cust_18421</small></div>{[['GCLID','gclid•••9A7'],['FBCLID','fbclid•••22F'],['Email','sha256: 71b…'],['Phone','sha256: 9c4…'],['Device','dev_8f2…'],['CRM ID','LSQ-9184']].map((x,i)=><div className={'identity-node n'+i} key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Match rules</h3><p>Deterministic first, review ambiguous merges</p></div></div>{[['CRM customer ID','Exact','100%'],['Hashed phone','Exact','99.1%'],['Hashed email','Exact','98.7%'],['GCLID / FBCLID','Session link','94.8%'],['Device ID','Supporting','88.4%']].map(x=><div className="identity-rule" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><strong>{x[2]}</strong></div>)}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recent resolved identities</h3><p>Cross-source customer stitching</p></div><button>Export review queue</button></div>{identities.map(x=><div className="identity-row" key={x[0]}><UsersRound/><div><b>{x[1]}</b><small>{x[0]}</small></div><span>{x[2]}</span><span>{x[3]}</span><em>{x[4]}</em></div>)}</div></>
}

function Models(){
 const [selected,setSelected]=useState('Lead conversion propensity')
 const [runs,setRuns]=useState(0)
 const models=[
  ['Lead conversion propensity','Prediction','Active','AUC 0.84','Predicts likelihood of qualified lead becoming enrolled / closed-won.'],
  ['Customer LTV tier','Value','Active','MAPE 12.8%','Groups customers by predicted long-term value for bidding and audience strategy.'],
  ['No-show risk','Conversion','Active','Precision 81%','Scores scheduled meetings for reminder and recovery priority.'],
  ['Return / cancellation risk','Quality','Draft','F1 0.71','Flags post-purchase outcomes that should not be treated as high-quality conversion signals.']
 ]
 const current=models.find(x=>x[0]===selected)||models[0]
 const run=async()=>{await api.runModel(selected).catch(()=>null);setRuns(x=>x+1)}
 return <><PageHead crumb="Data / Models" title="Custom models" sub="Turn stitched first-party data into lead-quality, value and lifecycle predictions tailored to the business." action="Create model"/>
 <div className="stats-grid"><Stat label="Active models" value="3" sub="1 draft" Icon={Target}/><Stat label="Scored profiles" value="56,582" sub="Current identity graph" Icon={UsersRound}/><Stat label="Predictions today" value="18,904" sub="Across active models" Icon={Activity}/><Stat label="Model refresh" value="Daily" sub="Latest 03:00" Icon={Zap}/></div>
 <div className="model-ops-layout"><div className="app-panel model-list"><div className="panel-head"><div><h3>Model catalog</h3><p>Workspace-specific prediction services</p></div></div>{models.map(x=><button key={x[0]} className={selected===x[0]?'selected':''} onClick={()=>setSelected(x[0])}><Target/><div><b>{x[0]}</b><small>{x[1]} · {x[3]}</small></div><span className={x[2].toLowerCase()}>{x[2]}</span><ChevronRight/></button>)}</div>
 <div className="app-panel model-detail"><div className="panel-head"><div><h3>{current[0]}</h3><p>{current[4]}</p></div><span className={current[2]==='Active'?'healthy':'status'}>{current[2]}</span></div><div className="model-metrics">{[['Primary metric',current[3]],['Features','38'],['Training window','180 days'],['Refresh','Daily'],['Serving','Real time'],['Approval','Human-reviewed rules']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="agent-section"><h4>Top signals</h4><div className="context-chips">{['Pricing-page revisit','Campaign intent','CRM stage velocity','WhatsApp engagement','Call connected','Revenue history','Device continuity','Program/category affinity'].map(x=><span key={x}>{x}</span>)}</div></div><div className="model-sample-score"><Sparkles/><div><span>Example profile</span><b>Aarav Sharma</b><small>Predicted conversion propensity</small></div><strong>92%</strong></div><div className="approval-actions"><button>View validation</button><button className="approve" onClick={run}><Target/>{runs?'Prediction refreshed':'Run sample prediction'}</button></div></div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Activation destinations</h3><p>Where model outputs can be used</p></div></div>{[['CRM lead score','Write field'],['Meta audience','High-propensity seed'],['Google Ads','Qualified conversion value'],['Agents','Routing / prioritization'],['Reports','Cohort segmentation']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div><div className="app-panel"><div className="panel-head"><div><h3>Governance</h3><p>Prediction quality and change control</p></div></div>{[['Training data','First-party workspace data'],['Sensitive fields','Excluded by policy'],['Model versions','Immutable history'],['Deployment','Approval required'],['Drift check','Daily monitoring']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><Check/></div>)}</div></div></>
}

function Attribution(){
 return <><PageHead crumb="Measurement / Attribution" title="Full-path attribution" sub="Measure channel contribution using stitched journey evidence through closed revenue." action="Ask attribution question"/>
 <div className="stats-grid"><Stat label="Attributed revenue" value="₹2.84Cr" sub="+18.4%" Icon={CircleDollarSign}/><Stat label="Journeys stitched" value="92,418" sub="96.2% identity coverage" Icon={Network}/><Stat label="Revenue re-attributed" value="28.7%" sub="Beyond last-click" Icon={PieChart}/><Stat label="Average touches" value="5.4" sub="Before conversion" Icon={MousePointer2}/></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Channel contribution</h3><p>Share of measured closed revenue</p></div><button>Last 30 days</button></div>{[['Google Ads','₹1.18Cr',42],['Meta Ads','₹72.4L',26],['WhatsApp','₹39.1L',14],['Organic Search','₹30.6L',11],['Direct / Other','₹19.9L',7]].map(x=><div className="channel-line" key={x[0]}><b>{x[0]}</b><div className="progress"><i style={{width:x[2]+'%'}}/></div><span>{x[1]}</span><strong>{x[2]}%</strong></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Attribution model comparison</h3><p>Same revenue, different credit rules</p></div><span className="status">Measured journey</span></div><div className="model-compare">{[['First touch','Google Ads','₹84,000'],['Last touch','Counsellor / CRM','₹84,000'],['Linear','5 touches','₹16,800 each'],['Full path','Measured contribution','Google 38% · WhatsApp 22% · Assisted 40%']].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><small>{x[2]}</small></article>)}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Example revenue journey</h3><p>₹84,000 · five touches · two days</p></div><span className="status">Revenue matched</span></div><div className="touch-path">{['Google Search','Website','WhatsApp','Counsellor Call','Enrolment'].map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b>{i<4&&<ArrowRight/>}</div>)}</div></div></>
}
function Planner(){
 const [budget,setBudget]=useState(2500000)
 const channels=[
  {name:'Google Search',share:38,quality:91,cac:6760,action:'Scale'},
  {name:'Meta Prospecting',share:28,quality:74,cac:8120,action:'Hold'},
  {name:'WhatsApp Retargeting',share:18,quality:88,cac:7040,action:'Scale'},
  {name:'LinkedIn',share:10,quality:81,cac:10340,action:'Optimize'},
  {name:'Other',share:6,quality:62,cac:11980,action:'Reduce'}
 ]
 const projected=channels.reduce((s,x)=>s+(budget*(x.share/100)),0)
 return <><PageHead crumb="Measurement / Planner" title="Strategic media planner" sub="Use cohort, attribution and lead-quality evidence to turn measured outcomes into a budget-allocation plan." action="Save scenario"/>
 <div className="planner-budget"><div><span>Monthly media budget</span><strong>₹{(budget/100000).toFixed(1)}L</strong></div><input type="range" min="1000000" max="5000000" step="100000" value={budget} onChange={e=>setBudget(Number(e.target.value))}/><small>Scenario total: ₹{(projected/100000).toFixed(1)}L</small></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recommended allocation</h3><p>Quality-adjusted using downstream conversion evidence</p></div><button>Compare prior month</button></div>{channels.map(x=><div className="planner-row" key={x.name}><div><b>{x.name}</b><small>{x.action}</small></div><div className="progress"><i style={{width:x.share+'%'}}/></div><strong>{x.share}%</strong><span>₹{((budget*x.share/100)/100000).toFixed(1)}L</span><em>{x.quality}/100 quality</em><small>₹{x.cac.toLocaleString()} CAC</small></div>)}</div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Planning evidence</h3><p>Signals used for recommendation</p></div></div>{[['Closed-revenue attribution','Channel contribution'],['Cohort conversion','Lead → consultation → enrolment'],['Lead grading','Intent quality'],['LTV tier','Customer value'],['Fraud/noise rate','Signal cleanliness'],['Audience overlap','Waste-control opportunity']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Scenario impact</h3><p>Illustrative planning output</p></div></div><div className="report-summary-grid">{[['Projected qualified leads','9,180'],['Projected consultations','2,910'],['Projected enrolments','1,210'],['Projected blended CAC','₹7,220'],['Budget protected from waste','₹2.6L'],['Confidence','Medium-high']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="ai-note"><Sparkles/><div><b>Planner insight</b><p>Shift incremental spend toward channels with stronger downstream conversion, not merely lower CPL. Keep the scenario advisory until a human approves budget changes.</p></div></div></div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Decision log</h3><p>Keep media-planning changes explainable</p></div></div>{[['Increase Google Search','+6% share','Strong qualified-to-enrolment progression'],['Increase WhatsApp Retargeting','+4% share','High consultation progression'],['Reduce Other','−5% share','High CAC + low quality'],['Hold Meta Prospecting','0%','Volume strong; quality mixed']].map(x=><div className="planning-decision-row" key={x[0]}><CheckCircle2/><div><b>{x[0]}</b><small>{x[2]}</small></div><strong>{x[1]}</strong></div>)}</div></>
}

function Reports(){
 const [selected,setSelected]=useState('Executive MBA Cohort')
 const reports=[
  ['Executive MBA Cohort','Weekly','Email','Active'],
  ['Paid Funnel Performance','Daily','Email + Slack','Active'],
  ['Attribution Summary','Monday 08:00','Leadership','Active'],
  ['Lead Quality by Campaign','Monthly','Growth Team','Draft']
 ]
 const cohort=[
  ['Jan','1,240','38%','22%','8.4%','₹7,940'],
  ['Feb','1,410','41%','25%','9.8%','₹7,520'],
  ['Mar','1,622','45%','28%','11.1%','₹7,080'],
  ['Apr','1,884','47%','30%','12.4%','₹6,760']
 ]
 return <><PageHead crumb="Measurement / Reports" title="Cohort & automated reports" sub="Turn stitched journey and attribution data into recurring decision-ready reports." action="New report"/>
 <div className="stats-grid"><Stat label="Scheduled reports" value="4" sub="3 active · 1 draft" Icon={BarChart3}/><Stat label="Recipients" value="18" sub="Across growth + leadership" Icon={UsersRound}/><Stat label="Last delivery" value="08:00" sub="Delivered successfully" Icon={Check}/><Stat label="Report failures" value="0" sub="Last 30 days" Icon={Activity}/></div>
 <div className="reports-layout"><div className="app-panel report-list"><div className="panel-head"><div><h3>Scheduled reports</h3><p>Automated email and stakeholder reporting</p></div></div>{reports.map(r=><button key={r[0]} className={selected===r[0]?'selected':''} onClick={()=>setSelected(r[0])}><BarChart3/><div><b>{r[0]}</b><small>{r[1]} · {r[2]}</small></div><span className={r[3].toLowerCase()}>{r[3]}</span><ChevronRight/></button>)}</div>
 <div className="app-panel report-preview"><div className="panel-head"><div><h3>{selected}</h3><p>Preview · stitched journey cohort analysis</p></div><button>Send test email</button></div><div className="report-summary-grid">{[['Cohort size','1,884'],['Qualified rate','47%'],['Consultation rate','30%'],['Enrolment rate','12.4%'],['CAC','₹6,760'],['Attributed revenue','₹1.27Cr']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="report-insight"><Sparkles/><div><b>Automated insight</b><p>April's cohort has the strongest qualification and enrolment rates while CAC is 14.9% lower than January.</p></div></div></div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Cohort performance</h3><p>Acquisition month → downstream conversion and CAC</p></div><button>Export CSV</button></div><table><thead><tr><th>Cohort</th><th>Leads</th><th>Qualified</th><th>Consultation</th><th>Enrolment</th><th>CAC</th></tr></thead><tbody>{cohort.map(r=><tr key={r[0]}>{r.map((v,i)=><td key={i}>{v}</td>)}</tr>)}</tbody></table></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Media planning view</h3><p>Quality-adjusted channel recommendation</p></div></div>{[['Google Search','Scale','High close rate · stable CAC'],['Meta Prospecting','Hold','Volume strong · lead quality mixed'],['WhatsApp Retargeting','Scale','High consultation progression'],['LinkedIn','Optimize','High CPL · good downstream quality']].map(x=><div className="planning-row" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><small>{x[2]}</small></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Delivery configuration</h3><p>Automated report distribution</p></div></div>{[['Cadence','Weekly · Monday 08:00'],['Recipients','growth@company.com · leadership@company.com'],['Format','Email summary + CSV attachment'],['Lookback','Previous 7 days'],['Failure alert','Slack #growth-ops']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><button>Edit</button></div>)}</div></div></>
}

function Enrich(){
 return <><PageHead crumb="Module / Enrich" title="Lead context & grading" sub="Give sales the complete story the moment a lead enters the CRM." action="Configure enrichment"/>
 <div className="stats-grid"><Stat label="Leads enriched" value="12,842" sub="98.4% success" Icon={DatabaseZap}/><Stat label="High intent" value="3,106" sub="24.2% of leads" Icon={Target}/><Stat label="Avg response" value="1m 18s" sub="-34s this month" Icon={Activity}/><Stat label="Mapped fields" value="46" sub="CRM context fields" Icon={Layers3}/></div>
 <div className="two-col"><div className="app-panel profile-card"><div className="panel-head"><div><h3>Enriched lead profile</h3><p>Latest high-intent lead</p></div><span className="score">92 intent</span></div><div className="profile-avatar">AS</div><h3>Aarav Sharma</h3><p>Executive MBA · Delhi NCR</p><div className="profile-fields">{[['First touch','Google Ads'],['Campaign','MBA Search'],['Pages viewed','7'],['Pricing page','Visited 2×'],['WhatsApp','Started'],['Call','Connected'],['Last action','Brochure viewed'],['Predicted stage','Consultation']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Lead grading</h3><p>Rules + journey evidence</p></div></div>{[['High intent','3,106',24,'green'],['Medium intent','6,482',50,'amber'],['Low intent','3,254',26,'red']].map(x=><div className={'grade '+x[3]} key={x[0]}><div><b>{x[0]}</b><small>{x[1]} leads</small></div><strong>{x[2]}%</strong></div>)}<div className="ai-note"><Sparkles/><div><b>Why this lead scored 92</b><p>Pricing revisit, branded search, WhatsApp initiation and counsellor connection indicate strong purchase intent.</p></div></div></div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Call transcript context</h3><p>Latest counsellor conversation</p></div><span className="healthy">Summarized</span></div><div className="transcript"><p><b>Counsellor:</b> Are you looking for the weekend or weekday Executive MBA format?</p><p><b>Lead:</b> Weekend. I also need financing details and the next intake date.</p><p><b>Counsellor:</b> I can schedule a detailed consultation for tomorrow afternoon.</p></div><div className="context-chips"><span>Weekend preference</span><span>Financing interest</span><span>Next intake</span><span>Consultation intent</span></div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>WhatsApp context</h3><p>Recent conversation evidence</p></div><span className="status">3 messages</span></div>{[['Lead','Can you share fees and scholarship options?'],['Bot','Sharing the latest fee sheet. Would you like a counsellor callback?'],['Lead','Yes, after 6 PM works.']].map(x=><div className="chat-context-row" key={x[1]}><span>{x[0][0]}</span><div><b>{x[0]}</b><p>{x[1]}</p></div></div>)}<div className="ai-note"><Sparkles/><div><b>CRM fields to enrich</b><p>Preferred callback: after 6 PM · Financing interest: yes · Intent: consultation.</p></div></div></div></div></>
}
function LeadGrading(){
 const [selected,setSelected]=useState('Aarav Sharma')
 const [leads,setLeads]=useState<any[]>([
  {name:'Aarav Sharma',source:'Google Ads',score:94,grade:'A',stage:'Qualified',reason:'Pricing revisit · financing interest · call connected'},
  {name:'Meera Patel',source:'Meta Ads',score:78,grade:'B',stage:'Connected',reason:'High content depth · WhatsApp reply · pricing objection'},
  {name:'Rohan Kumar',source:'WhatsApp',score:88,grade:'A',stage:'Consultation',reason:'Repeat visit · meeting booked · strong program fit'},
  {name:'Anika Roy',source:'Organic',score:54,grade:'C',stage:'Lead',reason:'Single visit · no reply · low urgency'},
  {name:'Kabir Singh',source:'LinkedIn Ads',score:32,grade:'D',stage:'Lead',reason:'Incomplete profile · invalid callback window · low engagement'}
 ])
 const current=leads.find(x=>x.name===selected)||leads[0]
 const [activated,setActivated]=useState(false)
 const override=async(grade:string)=>{await api.overrideLeadGrade(current.name,grade).catch(()=>null);setLeads(xs=>xs.map(x=>x.name===current.name?{...x,grade,score:grade==='A'?90:grade==='B'?75:grade==='C'?55:35}:x))}
 const activate=async()=>{await api.activateLeadGrade(current.name).catch(()=>null);setActivated(true)}
 return <><PageHead crumb="Conversion / Lead Grading" title="Lead grading" sub="Score and grade each lead using journey, CRM, behavioral and interaction evidence before routing and signal return." action="Edit scoring model"/>
 <div className="stats-grid"><Stat label="A-grade leads" value="2,184" sub="17.0% of new leads" Icon={Target}/><Stat label="A+B quality" value="59%" sub="+8 points this month" Icon={CheckCircle2}/><Stat label="Median scoring latency" value="1.8s" sub="After lead arrival" Icon={Activity}/><Stat label="Grades activated" value="7,621" sub="CRM + ad-platform workflows" Icon={RadioTower}/></div>
 <div className="grading-layout"><div className="app-panel grading-list"><div className="panel-head"><div><h3>Recent graded leads</h3><p>Score, grade and current stage</p></div><span className="healthy">Real time</span></div>{leads.map(x=><button key={x.name} className={selected===x.name?'selected':''} onClick={()=>{setSelected(x.name);setActivated(false)}}><span className={'grade grade-'+x.grade.toLowerCase()}>{x.grade}</span><div><b>{x.name}</b><small>{x.source} · {x.stage}</small></div><strong>{x.score}/100</strong><ChevronRight/></button>)}</div>
 <div className="app-panel grading-detail"><div className="panel-head"><div><h3>{current.name}</h3><p>{current.reason}</p></div><span className={'grade grade-'+current.grade.toLowerCase()}>{current.grade}</span></div><div className="grade-score-card"><Target/><div><span>Quality score</span><strong>{current.score}</strong><small>Grade {current.grade}</small></div><div className="progress"><i style={{width:current.score+'%'}}/></div></div>
 <div className="diagnostic-evidence">{[['Acquisition source',current.source],['CRM stage',current.stage],['Identity confidence','High'],['Scoring version','v1.6']].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div>
 <div className="agent-section"><h4>Score drivers</h4>{[['Intent behavior','Pricing / program revisit',28],['Conversation intent','WhatsApp / call evidence',24],['CRM progression','Stage velocity',18],['Identity quality','Verified contact + click IDs',14],['Fit signals','Program / schedule / financing fit',10],['Penalty','Low-quality or fraud indicators',-4]].map(x=><div className="score-driver" key={x[0]}><div><b>{x[0]}</b><small>{x[1]}</small></div><strong className={(x[2] as number)<0?'negative':''}>{(x[2] as number)>0?'+':''}{x[2]}</strong></div>)}</div>
 <div className="grade-actions"><div><span>Manual grade override</span>{['A','B','C','D'].map(g=><button key={g} className={current.grade===g?'active':''} onClick={()=>override(g)}>{g}</button>)}</div><button className="app-primary" onClick={activate}>{activated?<><Check/>Activated</>:<><RadioTower/>Use grade in activation</>}</button></div></div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Grade distribution</h3><p>Current lead pool</p></div></div>{[['A · High intent',17],['B · Strong fit',42],['C · Nurture',28],['D · Low quality',13]].map(x=><div className="health-line" key={x[0]}><span>{x[0]}</span><div className="progress"><i style={{width:x[1]+'%'}}/></div><b>{x[1]}%</b></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Grade actions</h3><p>What downstream systems do with each grade</p></div></div>{[['A','Priority routing + value signal return'],['B','Standard routing + qualified conversion'],['C','Nurture + retargeting'],['D','Suppress from optimization until reviewed']].map(x=><div className="mapping-rule" key={x[0]}><span>Grade {x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div></div></>
}

function Behavior(){
 const events=[['Page View','92,418','All pages'],['Pricing Page Viewed','18,204','High intent'],['Form Started','14,066','Lead intent'],['Form Submitted','12,842','Lead'],['WhatsApp Click','6,904','Messaging intent'],['Call CTA Click','4,882','Call intent']]
 return <><PageHead crumb="Activation / Behavior" title="Website & app behavior" sub="Capture first-party engagement signals across sessions and use them in enrichment, attribution and audience logic." action="New behavior rule"/>
 <div className="stats-grid"><Stat label="Tracked sessions" value="92,418" sub="Last 30 days" Icon={MousePointer2}/><Stat label="Known identities" value="61.2%" sub="Resolved to first-party ID" Icon={UsersRound}/><Stat label="High-intent sessions" value="18,204" sub="Pricing / contact behavior" Icon={Target}/><Stat label="Server events" value="248K" sub="Delivered today" Icon={Zap}/></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Behavior events</h3><p>First-party activity available to downstream modules</p></div><span className="healthy">Streaming</span></div>{events.map(x=><div className="behavior-row" key={x[0]}><MousePointer2/><div><b>{x[0]}</b><small>{x[2]}</small></div><strong>{x[1]}</strong><span>Active</span></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Journey sequence</h3><p>Example high-intent visitor</p></div></div><div className="behavior-timeline">{[['Google Ad','09:41'],['Program Page','09:42'],['Pricing Page','09:44'],['WhatsApp CTA','09:47'],['CRM Lead','09:49']].map((x,i)=><div key={x[0]}><span>{i+1}</span><div><b>{x[0]}</b><small>{x[1]}</small></div></div>)}</div><div className="ai-note"><Sparkles/><div><b>Behavior enrichment</b><p>This sequence can raise lead intent, build an audience, influence attribution and trigger faster qualification.</p></div></div></div></div></>
}

function Feed(){
 const attrs=[['customer_tier','High LTV','Customer attribute'],['order_type','Prepaid','Order attribute'],['product_category','Executive Program','Product attribute'],['lead_score','92','Model output'],['lifecycle_stage','Consultation','CRM attribute'],['return_risk','Low','Model output']]
 return <><PageHead crumb="Activation / Feed" title="Feed & payload enhancement" sub="Enrich activation payloads with business-specific customer, product and event attributes." action="Add attribute"/>
 <div className="stats-grid"><Stat label="Active attributes" value="46" sub="Across event payloads" Icon={Layers3}/><Stat label="Feeds" value="8" sub="Connected destinations" Icon={Cable}/><Stat label="Enriched events" value="96.4%" sub="Last 24 hours" Icon={DatabaseZap}/><Stat label="Schema errors" value="0.12%" sub="Auto-quarantined" Icon={Activity}/></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Custom attributes</h3><p>Values appended before activation</p></div><button>Schema settings</button></div>{attrs.map(x=><div className="feed-row" key={x[0]}><Layers3/><code>{x[0]}</code><b>{x[1]}</b><span>{x[2]}</span><em>Mapped</em></div>)}</div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Payload destinations</h3><p>Enhanced attributes by connector</p></div></div>{[['Meta Ads',96],['Google Ads',94],['CRM',100],['Audience Engine',100]].map(x=><div className="health-line" key={x[0]}><span>{x[0]}</span><div className="progress"><i style={{width:x[1]+'%'}}/></div><b>{x[1]}%</b></div>)}</div><div className="app-panel"><div className="panel-head"><div><h3>Schema guardrails</h3><p>Protect destination quality</p></div></div>{[['Required identifier','customer_id or hashed email'],['Revenue','numeric + currency'],['Event ID','unique / idempotent'],['PII policy','hash before activation']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div></div></>
}

function Agents(){
 const [selected,setSelected]=useState(agents[0][0])
 const current=agents.find(a=>a[0]===selected) || agents[0]
 const [approval,setApproval]=useState('Human approval')
 const [enabled,setEnabled]=useState(true)
 const [builder,setBuilder]=useState(false)
 const [customAgents,setCustomAgents]=useState<string[]>([])
 const createCustom=(e:any)=>{e.preventDefault();const f=new FormData(e.currentTarget);const name=String(f.get('name')||'Custom Agent');setCustomAgents(x=>[...x,name]);setBuilder(false)}
 return <><div onClick={()=>setBuilder(true)}><PageHead crumb="Automation / Agents" title="Agent operations" sub="Deploy and govern specialist agents using the same stitched customer context." action="Build custom agent"/></div>
 {customAgents.length>0&&<div className="custom-agent-strip">{customAgents.map(x=><span key={x}><Bot/>{x}<b>Custom</b></span>)}</div>}
 <div className="agent-ops-layout"><div className="app-panel agent-selector"><div className="panel-head"><div><h3>Agent library</h3><p>11 prebuilt agents from signal return through conversion operations</p></div><span className="healthy">7 active</span></div>{agents.map((a,i)=><button key={a[0]} className={selected===a[0]?'selected':''} onClick={()=>setSelected(a[0])}><Bot/><div><b>{a[0]}</b><small>{a[2]} · {a[3]}</small></div><span className={i<7?'active-agent':''}>{i<7?'Active':'Available'}</span><ChevronRight/></button>)}</div>
 <div className="app-panel agent-config"><div className="panel-head"><div><h3>{current[0]}</h3><p>{current[1]}</p></div><button onClick={()=>setEnabled(!enabled)}>{enabled?'Disable':'Enable'}</button></div>
 <div className="agent-config-grid"><div><span>Status</span><b>{enabled?'Active':'Disabled'}</b></div><div><span>Category</span><b>{current[2]}</b></div><div><span>Reference target</span><b>{current[3]}</b></div><div><span>Approval mode</span><select value={approval} onChange={e=>setApproval(e.target.value)}><option>Human approval</option><option>Auto-run low risk</option><option>Fully autonomous</option></select></div></div>
 <div className="agent-section"><h4>Trigger</h4><div className="agent-rule"><Zap/><div><b>When journey condition matches</b><p>Run after the configured CRM stage, behavioral condition or external event becomes true.</p></div><button>Edit trigger</button></div></div>
 <div className="agent-section"><h4>Available context</h4><div className="context-chips">{['Acquisition source','Campaign','CRM stage','Behavior events','WhatsApp history','Call outcome','Revenue','Identity keys'].map(x=><span key={x}>{x}</span>)}</div></div>
 <div className="agent-section"><h4>Recent runs</h4>{[['Lead #18421','Qualified lead → returned to Meta','12s ago','Completed'],['Lead #18420','CRM context enriched','1m ago','Completed'],['Lead #18419','Approval required before outreach','3m ago','Waiting']].map(x=><div className="agent-run" key={x[0]}><Activity/><div><b>{x[0]}</b><small>{x[1]}</small></div><span>{x[2]}</span><em className={x[3].toLowerCase()}>{x[3]}</em></div>)}</div></div></div>
 {builder&&<div className="connector-modal"><form className="connector-card custom-agent-builder" onSubmit={createCustom}><div className="connector-modal-head"><div><Bot/><div><b>Custom Agent Builder</b><small>Define trigger, context and action</small></div></div><button type="button" onClick={()=>setBuilder(false)}><X/></button></div><label>Agent name<input name="name" required placeholder="e.g. High Intent Routing Agent"/></label><label>Trigger<select name="trigger"><option>Lead becomes qualified</option><option>Pricing page viewed twice</option><option>WhatsApp conversation starts</option><option>Revenue closes</option></select></label><label>Action<select name="action"><option>Route to sales queue</option><option>Write CRM context</option><option>Return conversion signal</option><option>Suppress audience</option></select></label><label>Approval<select name="approval"><option>Human approval</option><option>Auto-run low risk</option></select></label><button type="submit">Create agent</button></form></div>}</>
}

function Routing(){
 const [selected,setSelected]=useState('High-intent Executive MBA')
 const [routed,setRouted]=useState<string[]>([])
 const rules=[
  ['High-intent Executive MBA','Intent ≥ 85 · Executive MBA','Senior counsellor queue','< 2 min','Priority'],
  ['Financing requested','Financing interest = yes','Finance-trained counsellor','< 5 min','Priority'],
  ['Weekend preference','Schedule = weekend','Weekend admissions team','< 10 min','Standard'],
  ['Low-intent nurture','Intent < 55','WhatsApp nurture sequence','Immediate','Automated'],
  ['Existing customer','CRM customer = true','Retention / upsell queue','< 15 min','Standard']
 ]
 const current=rules.find(x=>x[0]===selected)||rules[0]
 const route=async()=>{await api.testRoutingRule(current[0]).catch(()=>null);setRouted(x=>x.includes(current[0])?x:[...x,current[0]])}
 return <><PageHead crumb="Conversion / Routing" title="Lead routing" sub="Route each lead to the right sales queue using stitched journey, intent, CRM and conversation context." action="New routing rule"/>
 <div className="stats-grid"><Stat label="Leads routed today" value="1,284" sub="Across all active rules" Icon={Network}/><Stat label="Median route time" value="34s" sub="Lead arrival → owner" Icon={Activity}/><Stat label="SLA met" value="96.8%" sub="Within configured window" Icon={CheckCircle2}/><Stat label="Manual reroutes" value="18" sub="1.4% of routed leads" Icon={UsersRound}/></div>
 <div className="routing-layout"><div className="app-panel routing-list"><div className="panel-head"><div><h3>Routing rules</h3><p>Context → destination queue</p></div><span className="healthy">5 active</span></div>{rules.map(x=><button key={x[0]} className={selected===x[0]?'selected':''} onClick={()=>setSelected(x[0])}><Network/><div><b>{x[0]}</b><small>{x[1]}</small></div><span>{x[4]}</span><ChevronRight/></button>)}</div>
 <div className="app-panel routing-detail"><div className="panel-head"><div><h3>{current[0]}</h3><p>{current[1]}</p></div><span className="status">{current[4]}</span></div><div className="routing-flow"><div><span>1</span><b>Lead arrives</b></div><ArrowRight/><div><span>2</span><b>Context scored</b></div><ArrowRight/><div><span>3</span><b>{current[2]}</b></div><ArrowRight/><div><span>4</span><b>SLA {current[3]}</b></div></div><div className="diagnostic-evidence">{[['Inputs','Intent · program · source · CRM stage'],['Destination',current[2]],['Target SLA',current[3]],['Fallback','Round-robin general queue']].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div><div className="root-cause-box"><Sparkles/><div><b>Full-context routing</b><p>Routing uses the stitched lead context rather than only source or geography, so high-intent and specialist cases reach the appropriate team faster.</p></div></div><div className="approval-actions"><button>View recent matches</button><button className="approve" onClick={route}>{routed.includes(current[0])?<><Check/>Test routed</>:<><Network/>Test rule</>}</button></div></div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Queue load</h3><p>Current owner capacity</p></div></div>{[['Senior counsellor',72],['Finance-trained counsellor',48],['Weekend admissions',61],['General admissions',83]].map(x=><div className="health-line" key={x[0]}><span>{x[0]}</span><div className="progress"><i style={{width:x[1]+'%'}}/></div><b>{x[1]}%</b></div>)}</div><div className="app-panel"><div className="panel-head"><div><h3>Routing safeguards</h3><p>Prevent lost or stale leads</p></div></div>{[['No owner available','Fallback queue'],['SLA breached','Escalate to manager'],['Duplicate lead','Keep existing owner'],['Existing open opportunity','Route to opportunity owner'],['CRM write fails','Retry + alert']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><Check/></div>)}</div></div></>
}

function FollowUps(){
 const [items,setItems]=useState<any[]>([
  {id:'fu_701',lead:'Aarav Sharma',reason:'Consultation not booked after qualification',channel:'WhatsApp + Voice',due:'Now',priority:'High',status:'Open'},
  {id:'fu_700',lead:'Meera Patel',reason:'Pricing objection unresolved',channel:'Counsellor call',due:'In 12 min',priority:'High',status:'Open'},
  {id:'fu_699',lead:'Rohan Kumar',reason:'Meeting missed yesterday',channel:'Voice reminder',due:'In 25 min',priority:'Medium',status:'Open'},
  {id:'fu_698',lead:'Anika Roy',reason:'Brochure viewed twice, no reply',channel:'WhatsApp',due:'In 1h',priority:'Medium',status:'Open'}
 ])
 const [selected,setSelected]=useState(items[0].id)
 const current=items.find(x=>x.id===selected)||items[0]
 const complete=async(id:string)=>{await api.completeFollowUp(id).catch(()=>null);setItems(xs=>xs.map(x=>x.id===id?{...x,status:'Completed'}:x))}
 return <><PageHead crumb="Conversion / Follow-ups" title="Follow-up operations" sub="Keep qualified leads from going cold by turning stalled journey states into prioritized next actions." action="Create follow-up policy"/>
 <div className="stats-grid"><Stat label="Open follow-ups" value={String(items.filter(x=>x.status==='Open').length)} sub="Current queue" Icon={MessageCircle}/><Stat label="Completed today" value="842" sub="Across voice + messaging" Icon={CheckCircle2}/><Stat label="Recovered pipeline" value="126" sub="Returned to active journey" Icon={Target}/><Stat label="Overdue" value="14" sub="Needs manager review" Icon={Activity}/></div>
 <div className="followup-layout"><div className="app-panel followup-list"><div className="panel-head"><div><h3>Follow-up queue</h3><p>Prioritized by journey risk</p></div></div>{items.map(x=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><MessageCircle/><div><b>{x.lead}</b><small>{x.reason}</small></div><span className={x.priority.toLowerCase()}>{x.priority}</span><em>{x.due}</em><ChevronRight/></button>)}</div>
 <div className="app-panel followup-detail"><div className="panel-head"><div><h3>{current.lead}</h3><p>{current.reason}</p></div><span className={current.status==='Completed'?'healthy':'status'}>{current.status}</span></div><div className="site-detail-grid">{[['Recommended channel',current.channel],['Due',current.due],['Priority',current.priority],['Journey stage','Qualified / consultation pending'],['Owner','Assigned counsellor'],['Last interaction','18 minutes ago']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="followup-sequence">{[['Now','WhatsApp reminder with fee / booking context'],['+15m','Voice follow-up if unread / unanswered'],['+2h','Re-route if owner unavailable'],['+24h','Move to nurture if no response']].map((x,i)=><div key={x[0]}><span>{i+1}</span><div><b>{x[0]}</b><small>{x[1]}</small></div></div>)}</div>{current.status!=='Completed'?<div className="approval-actions"><button>Open journey</button><button className="approve" onClick={()=>complete(current.id)}><Check/>Mark completed</button></div>:<div className="approval-final approved"><Check/><b>Follow-up completed</b></div>}</div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Follow-up triggers</h3><p>Journey states that create work</p></div></div>{[['Qualified, no booking','15 min'],['Meeting no-show','15 min'],['Pricing objection','Immediate'],['High-intent page revisit','5 min'],['Call no-answer','2 hours'],['CRM stage stale','24 hours']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><Check/></div>)}</div><div className="app-panel"><div className="panel-head"><div><h3>Recovery outcomes</h3><p>Last 30 days</p></div></div>{[['Consultation booked','418'],['Reconnected by phone','233'],['WhatsApp reply','309'],['Returned to nurture','184']].map(x=><div className="developer-event-row" key={x[0]}><b>{x[0]}</b><span>Recovered journeys</span><strong>{x[1]}</strong></div>)}</div></div></>
}

function Calls(){
 const [calls,setCalls]=useState<any[]>([
  {id:'call_301',lead:'Aarav Sharma',source:'Google Ads',agent:'Voice Lead Qualification',status:'Qualified',duration:'3m 42s',intent:92,next:'Schedule consultation'},
  {id:'call_300',lead:'Meera Patel',source:'Meta Ads',agent:'Voice Lead Qualification',status:'Follow-up',duration:'2m 18s',intent:71,next:'Send fee details'},
  {id:'call_299',lead:'Rohan Kumar',source:'WhatsApp',agent:'Voice Lead Qualification',status:'Qualified',duration:'4m 09s',intent:89,next:'Schedule consultation'},
  {id:'call_298',lead:'Anika Roy',source:'Organic',agent:'Voice Lead Qualification',status:'No answer',duration:'—',intent:54,next:'Retry after 2h'}
 ])
 const [selected,setSelected]=useState(calls[0].id)
 const current=calls.find(x=>x.id===selected)||calls[0]
 const retry=async(id:string)=>{await api.retryQualificationCall(id).catch(()=>null);setCalls(xs=>xs.map(x=>x.id===id?{...x,status:'Retry queued',next:'Calling queue'}:x))}
 return <><PageHead crumb="Conversion / Calls" title="Voice lead qualification" sub="Qualify high-intent leads quickly, capture intent and push structured call context back into the CRM." action="Configure call agent"/>
 <div className="stats-grid"><Stat label="Calls today" value="428" sub="+11% vs yesterday" Icon={PhoneIncoming}/><Stat label="Connected" value="81%" sub="346 calls answered" Icon={PhoneCall}/><Stat label="Qualified" value="44%" sub="Of connected calls" Icon={Target}/><Stat label="Median speed-to-lead" value="42s" sub="From lead arrival" Icon={Activity}/></div>
 <div className="call-ops-layout"><div className="app-panel call-list"><div className="panel-head"><div><h3>Recent qualification calls</h3><p>Agent activity and lead outcomes</p></div><span className="healthy">Live</span></div>{calls.map(x=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><PhoneIncoming/><div><b>{x.lead}</b><small>{x.source} · {x.duration}</small></div><span>{x.status}</span><ChevronRight/></button>)}</div>
 <div className="app-panel call-detail"><div className="panel-head"><div><h3>{current.lead}</h3><p>{current.agent}</p></div><span className="score">{current.intent} intent</span></div><div className="call-detail-grid">{[['Call ID',current.id],['Source',current.source],['Outcome',current.status],['Next action',current.next]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="transcript"><p><b>Agent:</b> I am calling about your Executive MBA enquiry. Are you looking to join the upcoming intake?</p><p><b>Lead:</b> Yes. I need weekend classes and financing information before I decide.</p><p><b>Agent:</b> I can arrange a counsellor consultation and send the fee details now.</p></div><div className="context-chips"><span>Weekend preference</span><span>Financing interest</span><span>Upcoming intake</span><span>Consultation-ready</span></div><div className="approval-actions"><button onClick={()=>retry(current.id)}>Retry / follow up</button><button className="approve"><CalendarDays/>Schedule consultation</button></div></div></div></>
}

function Meetings(){
 const [meetings,setMeetings]=useState<any[]>([
  {id:'mtg_184',lead:'Aarav Sharma',time:'Today · 6:30 PM',owner:'Counsellor A',status:'Confirmed',reminder:'WhatsApp + SMS',risk:'Low'},
  {id:'mtg_183',lead:'Rohan Kumar',time:'Tomorrow · 11:00 AM',owner:'Counsellor B',status:'Confirmed',reminder:'WhatsApp',risk:'Medium'},
  {id:'mtg_182',lead:'Meera Patel',time:'Tomorrow · 4:00 PM',owner:'Counsellor A',status:'Pending',reminder:'WhatsApp + Email',risk:'High'},
  {id:'mtg_181',lead:'Anika Roy',time:'Fri · 3:30 PM',owner:'Counsellor C',status:'Confirmed',reminder:'SMS',risk:'Medium'}
 ])
 const [selected,setSelected]=useState(meetings[0].id)
 const current=meetings.find(x=>x.id===selected)||meetings[0]
 const remind=async(id:string)=>{await api.sendMeetingReminder(id).catch(()=>null);setMeetings(xs=>xs.map(x=>x.id===id?{...x,reminder:'Sent now'}:x))}
 return <><PageHead crumb="Conversion / Meetings" title="Scheduler & meeting reminders" sub="Book qualified leads, synchronize counsellor availability and reduce no-shows with automated reminders." action="Connect calendar"/>
 <div className="stats-grid"><Stat label="Meetings booked" value="184" sub="Last 30 days" Icon={CalendarDays}/><Stat label="Show rate" value="78%" sub="+9 points after reminders" Icon={CheckCircle2}/><Stat label="No-show risk" value="23" sub="Currently high/medium risk" Icon={Activity}/><Stat label="Recovered leads" value="37" sub="Reminder-assisted" Icon={MessageCircle}/></div>
 <div className="meeting-layout"><div className="app-panel meeting-list"><div className="panel-head"><div><h3>Upcoming consultations</h3><p>Calendar + reminder status</p></div></div>{meetings.map(x=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><CalendarDays/><div><b>{x.lead}</b><small>{x.time} · {x.owner}</small></div><span className={x.risk.toLowerCase()}>{x.risk} risk</span><ChevronRight/></button>)}</div>
 <div className="app-panel meeting-detail"><div className="panel-head"><div><h3>{current.lead}</h3><p>{current.time}</p></div><span className="status">{current.status}</span></div><div className="meeting-info-grid">{[['Owner',current.owner],['Reminder plan',current.reminder],['No-show risk',current.risk],['Calendar','Google Calendar']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div><div className="meeting-reminder-flow">{[['T−24h','WhatsApp reminder'],['T−3h','SMS reminder'],['T−30m','Final confirmation'],['T+15m','No-show recovery if needed']].map((x,i)=><div key={x[0]}><span>{i+1}</span><div><b>{x[0]}</b><small>{x[1]}</small></div></div>)}</div><div className="approval-actions"><button>Reschedule</button><button className="approve" onClick={()=>remind(current.id)}><MessageCircle/>Send reminder now</button></div></div></div></>
}

function Feedback(){
 const [filter,setFilter]=useState('All')
 const items=[
  {lead:'Aarav Sharma',score:5,channel:'Post-call',theme:'Clear counselling',quote:'The counsellor answered the financing questions clearly.'},
  {lead:'Meera Patel',score:3,channel:'Post-meeting',theme:'Pricing objection',quote:'The program looks good, but I need more scholarship clarity.'},
  {lead:'Rohan Kumar',score:4,channel:'WhatsApp',theme:'Fast response',quote:'Quick reply and easy scheduling.'},
  {lead:'Anika Roy',score:2,channel:'Post-call',theme:'Slow follow-up',quote:'I had to wait for the second callback.'}
 ]
 const shown=filter==='All'?items:items.filter(x=>x.theme===filter)
 return <><PageHead crumb="Conversion / Feedback" title="Feedback agent" sub="Collect post-interaction feedback, detect objections and route insights back into sales and marketing workflows." action="Configure feedback agent"/>
 <div className="stats-grid"><Stat label="Responses" value="1,842" sub="Last 30 days" Icon={MessageSquareText}/><Stat label="Response rate" value="31%" sub="+7 points this month" Icon={Activity}/><Stat label="Avg satisfaction" value="4.2/5" sub="Across all channels" Icon={CheckCircle2}/><Stat label="Open objections" value="126" sub="Need sales / marketing review" Icon={Target}/></div>
 <div className="feedback-toolbar">{['All','Clear counselling','Pricing objection','Fast response','Slow follow-up'].map(x=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x}</button>)}</div>
 <div className="feedback-grid">{shown.map(x=><article key={x.lead+x.theme}><div className="feedback-head"><div><span className="lead-avatar">{x.lead.split(' ').map(s=>s[0]).join('')}</span><div><b>{x.lead}</b><small>{x.channel}</small></div></div><strong>{'★'.repeat(x.score)}{'☆'.repeat(5-x.score)}</strong></div><p>“{x.quote}”</p><footer><span>{x.theme}</span><button>Open journey <ChevronRight/></button></footer></article>)}</div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Top objections</h3><p>Automatically grouped from feedback</p></div></div>{[['Pricing / scholarship',42],['Callback timing',27],['Program fit',21],['Financing information',18],['Counsellor handoff',18]].map(x=><div className="health-line" key={x[0]}><span>{x[0]}</span><div className="progress"><i style={{width:(x[1] as number)*2+'%'}}/></div><b>{x[1]}</b></div>)}</div><div className="app-panel"><div className="panel-head"><div><h3>Feedback routing</h3><p>Turn qualitative evidence into actions</p></div></div>{[['Pricing objection','Sales manager + campaign insight'],['Low satisfaction','Customer recovery queue'],['Program mismatch','CRM disposition update'],['Positive promoter','Testimonial request queue']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div></div></>
}

function Approvals(){
 const [items,setItems]=useState<any[]>([
  {id:'apr_1042',agent:'Voice Lead Qualification',subject:'Call 42 high-intent leads',risk:'Customer contact',impact:'High',age:'4 min',status:'pending',detail:'Agent proposes calling leads that visited pricing twice and requested fee information.'},
  {id:'apr_1041',agent:'Audience Suppression',subject:'Suppress 1,284 converted customers',risk:'Spend impact',impact:'Medium',age:'18 min',status:'pending',detail:'Remove recently enrolled customers from prospecting and retargeting audiences.'},
  {id:'apr_1040',agent:'Google ECL / OCI',subject:'Return 982 enrolled outcomes',risk:'External write',impact:'High',age:'31 min',status:'pending',detail:'Upload enrolled outcomes with value and click IDs to Google Ads.'},
  {id:'apr_1039',agent:'CRM Enrichment',subject:'Write 3 new enrichment fields',risk:'CRM mutation',impact:'Low',age:'52 min',status:'pending',detail:'Add intent score, preferred callback time and last high-intent page to lead records.'}
 ])
 const [selected,setSelected]=useState(items[0]?.id||'')
 const decide=async(id:string,decision:'approved'|'rejected')=>{await api.decideApproval(id,decision).catch(()=>null);setItems(xs=>xs.map(x=>x.id===id?{...x,status:decision}:x))}
 const current=items.find(x=>x.id===selected)||items[0]
 return <><PageHead crumb="Automation / Approvals" title="Human approval inbox" sub="Review high-impact agent actions before they mutate customer-facing or external systems."/>
 <div className="stats-grid"><Stat label="Pending approvals" value={String(items.filter(x=>x.status==='pending').length)} sub="Require human review" Icon={CheckCircle2}/><Stat label="Approved today" value="38" sub="Median review 2m 14s" Icon={Check}/><Stat label="Auto-run actions" value="1,842" sub="Low-risk policies" Icon={Bot}/><Stat label="Rejected today" value="3" sub="Policy / data issue" Icon={X}/></div>
 <div className="approval-layout"><div className="app-panel approval-list"><div className="panel-head"><div><h3>Approval queue</h3><p>Agent actions waiting for a decision</p></div></div>{items.map(x=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><div><Bot/><span>{x.agent}</span></div><b>{x.subject}</b><small>{x.risk} · {x.age}</small><em className={x.status}>{x.status}</em></button>)}</div>
 {current&&<div className="app-panel approval-detail"><div className="panel-head"><div><h3>{current.subject}</h3><p>{current.agent}</p></div><span className={'approval-impact '+current.impact.toLowerCase()}>{current.impact} impact</span></div><div className="approval-summary"><p>{current.detail}</p><div>{[['Approval ID',current.id],['Risk category',current.risk],['Requested',current.age+' ago'],['Policy','Human approval required']].map(x=><section key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></section>)}</div></div><div className="approval-evidence"><h4>Evidence available to reviewer</h4>{[['Journey context','Source, campaign, CRM stage, call/chat activity'],['Identity confidence','Deterministic match available'],['Estimated impact',current.impact+' business impact'],['Rollback','Action can be reversed from audit history']].map(x=><div key={x[0]}><Check/><div><b>{x[0]}</b><small>{x[1]}</small></div></div>)}</div>{current.status==='pending'?<div className="approval-actions"><button className="reject" onClick={()=>decide(current.id,'rejected')}>Reject</button><button className="approve" onClick={()=>decide(current.id,'approved')}><Check/>Approve action</button></div>:<div className={'approval-final '+current.status}>{current.status==='approved'?<Check/>:<X/>}<b>{current.status==='approved'?'Approved':'Rejected'}</b></div>}</div>}</div></>
}

function AskAce(){
 const starters=['Why did qualified leads drop this week?','Which campaigns generated the most enrolled revenue?','Where is the biggest funnel leak?','Which audience should we suppress?']
 const [messages,setMessages]=useState<any[]>([{role:'assistant',text:'Ask me about journeys, attribution, lead quality, campaign performance or signal health.'}])
 const [q,setQ]=useState('')
 const ask=async(question?:string)=>{const text=question||q;if(!text.trim())return;setMessages(m=>[...m,{role:'user',text}]);setQ('');try{const r:any=await api.askAce(text);setMessages(m=>[...m,{role:'assistant',text:r.answer,insights:r.insights}])}catch{setMessages(m=>[...m,{role:'assistant',text:'The analysis API is unavailable. Start the local API with npm run api.'}])}}
 return <><PageHead crumb="AI / Ask Ace" title="Journey & attribution assistant" sub="Ask natural-language questions over stitched funnel, attribution and signal-health data."/>
 <div className="ask-ace-layout"><div className="app-panel ask-chat"><div className="ask-starters">{starters.map(x=><button key={x} onClick={()=>ask(x)}>{x}</button>)}</div><div className="ask-messages">{messages.map((m,i)=><div key={i} className={'ask-msg '+m.role}><span>{m.role==='assistant'?<Sparkles/>:'S'}</span><div><p>{m.text}</p>{m.insights&&<div className="ask-insights">{m.insights.map((x:any)=><article key={x.label}><span>{x.label}</span><b>{x.value}</b><small>{x.note}</small></article>)}</div>}</div></div>)}</div><div className="ask-input"><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask()} placeholder="Ask about revenue, leads, campaigns or journeys..."/><button onClick={()=>ask()}><ArrowRight/></button></div></div>
 <div className="app-panel ask-context"><div className="panel-head"><div><h3>Connected analysis context</h3><p>What Ask Ace can inspect</p></div></div>{[['Journey graph','92,418 stitched journeys'],['Attribution','₹2.84Cr measured revenue'],['CRM outcomes','12,842 recent leads'],['Signal health','94.8% destination match'],['Audience state','5 active segments'],['Agent activity','7 active agents']].map(x=><div className="ask-context-row" key={x[0]}><Check/><div><b>{x[0]}</b><small>{x[1]}</small></div></div>)}</div></div></>
}

function Integrations(){
 const groups=[
  ['CRM Platforms',['Zoho CRM','Salesforce','LeadSquared','Meritto','HubSpot','HighLevel','Microsoft Dynamics 365','Custom CRM']],
  ['WhatsApp & Marketing Platforms',['WhatsApp','Bitespeed','AiSensy','Gupshup','WATI','MoEngage','CleverTap']],
  ['Calling Platforms',['Exotel','Knowlarity','Tata Tele','MyOperator']],
  ['Website & App Platforms',['Shopify','WooCommerce','Magento','WordPress','React App','Custom Backend']],
  ['Advertising & Analytics',['Google Ads','Meta Ads','LinkedIn Ads','Microsoft Ads / Bing Ads','X','Pinterest','GA4']]
 ]
 const [connector,setConnector]=useState('')
 const [step,setStep]=useState(1)
 const [connected,setConnected]=useState<string[]>(['Zoho CRM','WhatsApp','Google Ads','GA4','Exotel'])
 const [builder,setBuilder]=useState(false)
 const [builderStep,setBuilderStep]=useState(1)
 const [testResult,setTestResult]=useState<any>(null)
 const [customConnectors,setCustomConnectors]=useState<any[]>([])
 const [draft,setDraft]=useState<any>({name:'Internal Lead API',type:'REST API',auth:'Bearer token',baseUrl:'https://api.example.com/v1',direction:'Bidirectional',identity:'email',stage:'status',revenue:'revenue'})
 const start=(name:string)=>{setConnector(name);setStep(1)}
 const finish=async()=>{await api.connectIntegration(connector).catch(()=>null);setConnected(c=>c.includes(connector)?c:[...c,connector]);setConnector('')}
 const testCustom=async()=>{try{const r:any=await api.testCustomIntegration(draft);setTestResult(r)}catch{setTestResult({ok:true,statusCode:200,latencyMs:184,sampleRecords:25})};setBuilderStep(3)}
 const saveCustom=async()=>{try{await api.createCustomIntegration(draft)}catch{};setCustomConnectors(x=>[...x,{...draft,status:'Connected'}]);setBuilder(false);setBuilderStep(1);setTestResult(null)}
 return <><PageHead crumb="Workspace / Integrations" title="Platform-agnostic connectivity" sub="Connect the systems you already use without rebuilding your stack."/>
 <div className="integration-summary"><div><strong>100+</strong><span>available connector patterns</span></div><div><strong>{connected.length+customConnectors.length}</strong><span>connected in this workspace</span></div><div><strong>24×7</strong><span>continuous synchronization</span></div><div><strong>Custom</strong><span>adapter support</span></div></div>
 <div className="app-panel custom-integration-hero"><div><Cable/><div><span>Custom integration</span><h3>Connect proprietary systems without changing your stack</h3><p>Define authentication, endpoint, identity fields and business mappings, then validate the connection before enabling sync.</p></div></div><button className="app-primary" onClick={()=>{setBuilder(true);setBuilderStep(1);setTestResult(null)}}><Plus/>Build custom integration</button></div>
 {customConnectors.length>0&&<div className="app-panel"><div className="panel-head"><div><h3>Custom integrations</h3><p>Workspace-specific adapters</p></div><span className="healthy">{customConnectors.length} connected</span></div>{customConnectors.map((x:any)=><div className="custom-connector-row" key={x.name}><span className="integration-logo c5">CI</span><div><b>{x.name}</b><small>{x.type} · {x.direction} · {x.baseUrl}</small></div><span className="healthy">{x.status}</span><button>Manage</button></div>)}</div>}
 <div className="integration-category-grid">{groups.map((g,gi)=><section className="integration-category" key={g[0] as string}><div className="integration-category-head"><div><span>{String(gi+1).padStart(2,'0')}</span><h3>{g[0]}</h3></div><small>{(g[1] as string[]).length} connectors shown</small></div><div className="integration-app-grid">{(g[1] as string[]).map((x,i)=><article key={x}><span className={'integration-logo c'+(i%6)}>{x.slice(0,2).toUpperCase()}</span><div><b>{x}</b><small>{connected.includes(x)?'Connected · syncing':'Connector available'}</small></div><button className={connected.includes(x)?'connected':'connect'} onClick={()=>!connected.includes(x)&&start(x)}>{connected.includes(x)?'Connected':'Connect'}</button></article>)}</div></section>)}</div>
 {connector&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><span className="integration-logo c0">{connector.slice(0,2).toUpperCase()}</span><div><b>Connect {connector}</b><small>Step {step} of 3</small></div></div><button onClick={()=>setConnector('')}><X/></button></div>{step===1&&<div className="connector-step"><h3>Authorize workspace access</h3><p>Grant only the scopes required to read events, sync outcomes and manage configured conversion destinations.</p><div className="scope-list">{['Read account metadata','Read campaign / lead records','Write configured conversion events','Read sync health'].map(x=><span key={x}><Check/>{x}</span>)}</div><button onClick={()=>setStep(2)}>Continue <ArrowRight/></button></div>}{step===2&&<div className="connector-step"><h3>Map business fields</h3><p>Choose the fields used for identity resolution and funnel stages.</p>{[['Primary identity','Email + phone'],['Click identifier','GCLID / FBCLID'],['Lifecycle stage','Lead status'],['Revenue field','Closed value']].map(x=><label key={x[0]}><span>{x[0]}</span><select defaultValue={x[1]}><option>{x[1]}</option><option>Custom field</option></select></label>)}<button onClick={()=>setStep(3)}>Continue <ArrowRight/></button></div>}{step===3&&<div className="connector-step"><h3>Enable synchronization</h3><p>Start continuous ingestion and delivery health checks for this connector.</p><div className="connector-ready"><Activity/><div><b>Ready to connect</b><small>Real API credentials can replace this demo connector flow in production.</small></div></div><button onClick={finish}>Connect {connector}</button></div>}</div></div>}
 {builder&&<div className="connector-modal"><div className="connector-card custom-integration-builder"><div className="connector-modal-head"><div><Cable/><div><b>Custom Integration Builder</b><small>Step {builderStep} of 3 · configure → map → test</small></div></div><button onClick={()=>setBuilder(false)}><X/></button></div>
 {builderStep===1&&<div className="connector-step"><h3>Connection</h3><p>Describe the proprietary or unsupported system you want AceMarketing to connect.</p><label>Name<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Connector type<select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}><option>REST API</option><option>Webhook</option><option>CSV / SFTP</option><option>Database read</option></select></label><label>Authentication<select value={draft.auth} onChange={e=>setDraft({...draft,auth:e.target.value})}><option>Bearer token</option><option>API key</option><option>Basic auth</option><option>OAuth 2.0</option><option>Signed webhook</option></select></label><label>Base URL / endpoint<input value={draft.baseUrl} onChange={e=>setDraft({...draft,baseUrl:e.target.value})}/></label><label>Data direction<select value={draft.direction} onChange={e=>setDraft({...draft,direction:e.target.value})}><option>Bidirectional</option><option>Inbound to AceMarketing</option><option>Outbound from AceMarketing</option></select></label><button onClick={()=>setBuilderStep(2)}>Continue to mapping <ArrowRight/></button></div>}
 {builderStep===2&&<div className="connector-step"><h3>Field mappings</h3><p>Map the minimum fields needed for identity, funnel progression and closed-revenue feedback.</p>{[['Primary identity','identity'],['Lifecycle stage','stage'],['Revenue / value','revenue']].map(x=><label key={x[0]}><span>{x[0]}</span><input value={draft[x[1]]} onChange={e=>setDraft({...draft,[x[1]]:e.target.value})}/></label>)}<div className="scope-list">{['Preserve event_id for deduplication','Accept GCLID / FBCLID when present','Normalize timestamps to workspace timezone','Quarantine schema failures','Write delivery status to audit history'].map(x=><span key={x}><Check/>{x}</span>)}</div><button onClick={testCustom}>Test connection <ArrowRight/></button></div>}
 {builderStep===3&&<div className="connector-step"><h3>Connection test</h3><p>Validate authorization, schema compatibility and a small sample before enabling continuous sync.</p><div className="custom-test-result"><CheckCircle2/><div><b>{testResult?.ok===false?'Test needs attention':'Connection test passed'}</b><small>HTTP {testResult?.statusCode||200} · {testResult?.latencyMs||184}ms · {testResult?.sampleRecords||25} sample records validated</small></div></div><div className="diagnostic-evidence">{[['Authentication','Valid'],['Identity field',draft.identity],['Lifecycle field',draft.stage],['Revenue field',draft.revenue]].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div><button onClick={saveCustom}>Create integration & enable sync</button></div>}
 </div></div>}</>
}
function Audiences(){
 const seed=[
  {name:'High intent leads',size:'3,106',destination:'Google Ads · Meta Ads',cadence:'Every 5 min',mode:'Activate'},
  {name:'Converted / enrolled',size:'18,204',destination:'Google Ads · Meta Ads · LinkedIn',cadence:'Real time',mode:'Suppress'},
  {name:'Website visitors · 180d',size:'82,416',destination:'Meta Ads',cadence:'Hourly',mode:'Retarget'},
  {name:'WhatsApp leads',size:'11,284',destination:'Google Ads · Meta Ads',cadence:'Real time',mode:'Activate'},
  {name:'Low intent leads',size:'24,901',destination:'Google Ads · Meta Ads',cadence:'Daily',mode:'Suppress'}
 ]
 const [segments,setSegments]=useState<any[]>(seed)
 const [builder,setBuilder]=useState(false)
 const [preview,setPreview]=useState<any>(null)
 const [saving,setSaving]=useState(false)
 const previewAudience=async(e:any)=>{e.preventDefault();const f=new FormData(e.currentTarget);const payload={name:String(f.get('name')||''),condition:String(f.get('condition')||''),operator:String(f.get('operator')||''),value:String(f.get('value')||''),destination:String(f.get('destination')||''),mode:String(f.get('mode')||'Activate')};try{const r:any=await api.previewAudience(payload);setPreview({...payload,...r})}catch{setPreview({...payload,estimatedSize:3184,matchedPercent:5.6})}}
 const saveAudience=async()=>{if(!preview)return;setSaving(true);try{await api.createAudience(preview)}catch{}setSegments(x=>[{name:preview.name||'Custom audience',size:String(preview.estimatedSize||'3,184'),destination:preview.destination||'Google Ads',cadence:'Real time',mode:preview.mode||'Activate'},...x]);setSaving(false);setBuilder(false);setPreview(null)}
 return <><PageHead crumb="Activation / Audiences" title="Audience management" sub="Activate high-intent segments and suppress low-value or converted users."/>
 <div className="stats-grid"><Stat label="Active audiences" value={String(segments.length)} sub="Across connected destinations" Icon={UsersRound}/><Stat label="Activated identities" value="96.4K" sub="Current matched audience pool" Icon={Target}/><Stat label="Suppressed identities" value="42.2K" sub="Waste-control rules" Icon={ShieldCheck}/><Stat label="Median sync latency" value="2m 14s" sub="Across active destinations" Icon={Activity}/></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Active segments</h3><p>Synced to connected destinations</p></div><div className="panel-actions"><button>Export</button><button className="app-primary" onClick={()=>setBuilder(true)}><Plus/>New audience</button></div></div>{segments.map((x:any)=><div className="audience-row" key={x.name}><UsersRound/><div><b>{x.name}</b><small>{x.destination}</small></div><strong>{x.size}</strong><span>{x.cadence}</span><em className={String(x.mode).toLowerCase()}>{x.mode}</em><ChevronRight/></div>)}</div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Lifecycle audiences</h3><p>Acquisition → nurture → decision → post-purchase</p></div></div>{[['Acquisition','New prospects','18,204'],['Nurture','Engaged / not qualified','8,441'],['Decision','Consultation / high intent','3,106'],['Post-purchase','Converted customers','18,204']].map(x=><div className="lifecycle-row" key={x[0]}><span>{x[0]}</span><div><b>{x[1]}</b><small>{x[2]} identities</small></div><ChevronRight/></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Waste-control exclusions</h3><p>Prevent repeat spend on irrelevant identities</p></div></div>{[['Converted customers','Customer ID + hashed PII','18,204'],['Device-ID exclusion','First-party device IDs','22,891'],['Duplicate / invalid leads','CRM disposition','4,118'],['Low-LTV customers','Value threshold','3,409']].map(x=><div className="exclusion-row" key={x[0]}><ShieldCheck/><div><b>{x[0]}</b><small>{x[1]}</small></div><strong>{x[2]}</strong><span>Suppressed</span></div>)}</div></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Audience signals</h3><p>First-party attributes available to the builder</p></div></div><div className="context-chips">{['Lead grade','CRM stage','Journey depth','Pricing-page views','WhatsApp engagement','Call outcome','Meeting status','LTV tier','Conversion propensity','Fraud score','Last activity','Program interest'].map(x=><span key={x}>{x}</span>)}</div></div><div className="app-panel"><div className="panel-head"><div><h3>Destination policy</h3><p>How segments may be activated</p></div></div>{[['High-value prospect','Seed / optimize'],['Converted customer','Suppress acquisition'],['Low quality / invalid','Suppress optimization'],['High LTV customer','Lookalike seed'],['No recent engagement','Exclude / cool down']].map(x=><div className="mapping-rule" key={x[0]}><span>{x[0]}</span><ArrowRight/><b>{x[1]}</b></div>)}</div></div>
 {builder&&<div className="connector-modal"><form className="connector-card audience-builder" onSubmit={previewAudience}><div className="connector-modal-head"><div><UsersRound/><div><b>Audience Builder</b><small>Create a first-party segment from journey and CRM evidence</small></div></div><button type="button" onClick={()=>{setBuilder(false);setPreview(null)}}><X/></button></div>
 <label>Audience name<input name="name" required defaultValue="High-intent MBA prospects"/></label>
 <div className="audience-rule-grid"><label>Condition<select name="condition" defaultValue="Lead grade"><option>Lead grade</option><option>Conversion propensity</option><option>CRM stage</option><option>Pricing-page views</option><option>LTV tier</option><option>Last activity</option></select></label><label>Operator<select name="operator"><option>is</option><option>is greater than</option><option>is less than</option><option>contains</option></select></label><label>Value<input name="value" defaultValue="A"/></label></div>
 <label>Destination<select name="destination"><option>Google Ads · Meta Ads</option><option>Google Ads</option><option>Meta Ads</option><option>LinkedIn Ads</option></select></label>
 <label>Mode<select name="mode"><option>Activate</option><option>Suppress</option><option>Retarget</option><option>Lookalike seed</option></select></label>
 {preview&&<div className="audience-preview"><div><span>Estimated audience</span><strong>{Number(preview.estimatedSize||3184).toLocaleString()}</strong></div><div><span>Workspace coverage</span><strong>{preview.matchedPercent||5.6}%</strong></div><p>{preview.condition} {preview.operator} {preview.value} → {preview.destination}</p></div>}
 <div className="audience-builder-actions"><button type="button" onClick={()=>{setBuilder(false);setPreview(null)}}>Cancel</button>{preview?<button type="button" className="app-primary" disabled={saving} onClick={saveAudience}>{saving?'Saving…':'Create & sync audience'}</button>:<button type="submit" className="app-primary">Preview audience</button>}</div></form></div>}</>
}
function Monitoring(){
 return <><PageHead crumb="Operations / Monitoring" title="Platform monitoring" sub="Observe connector health, event delivery, sync latency and processing failures." action="Create alert"/>
 <div className="stats-grid"><Stat label="Platform status" value="Healthy" sub="All critical services" Icon={Activity}/><Stat label="Events / min" value="8,412" sub="Current throughput" Icon={Zap}/><Stat label="Failed events" value="0.18%" sub="Retry queue enabled" Icon={BarChart3}/><Stat label="P95 latency" value="1.7s" sub="Ingestion pipeline" Icon={Gauge}/></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Connector uptime</h3><p>Last 24 hours</p></div><span className="healthy">99.98%</span></div>{['Google Ads','Meta Ads','Zoho CRM','WhatsApp','Exotel'].map((x,i)=><div className="monitor-row" key={x}><span>{x}</span><div className="spark-bars">{Array.from({length:18}).map((_,j)=><i key={j} className={(i===3&&j===11)?'warn':''}/>)}</div><b>{i===3?'99.91%':'100%'}</b></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recent alerts</h3><p>Operational events</p></div></div>{[['Resolved','WhatsApp API rate limit recovered','12 min ago'],['Resolved','Google Ads token refreshed','48 min ago'],['Info','Audience sync completed','1h ago'],['Info','Daily attribution rebuild complete','3h ago']].map(x=><div className="alert-row" key={x[1]}><span className={x[0].toLowerCase()}>{x[0]}</span><div><b>{x[1]}</b><small>{x[2]}</small></div></div>)}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Automated monitoring rules</h3><p>Guardrails for signal loss and stale optimization inputs</p></div><button>+ Add rule</button></div><div className="monitor-rule-grid">{[['Event delivery rate','< 98% for 10 min','Critical'],['GCLID coverage','< 85%','Warning'],['CRM sync latency','> 5 min','Warning'],['Audience sync','No update for 60 min','Critical'],['CAPI token','Expires in < 24h','Info'],['Failed event queue','> 500 records','Critical']].map(x=><article key={x[0]}><Activity/><div><b>{x[0]}</b><small>{x[1]}</small></div><span className={String(x[2]).toLowerCase()}>{x[2]}</span></article>)}</div></div></>
}
function Alerts(){
 const [items,setItems]=useState<any[]>([
  {id:'al_1',severity:'Critical',title:'Audience sync stalled',source:'Meta Ads',age:'6 min',status:'open',detail:'Converted-customer suppression has not refreshed for 68 minutes.'},
  {id:'al_2',severity:'Warning',title:'GCLID coverage below threshold',source:'CRM outcomes',age:'21 min',status:'open',detail:'Offline outcome click-ID coverage dropped to 82.4%.'},
  {id:'al_3',severity:'Warning',title:'CRM sync latency elevated',source:'LeadSquared',age:'34 min',status:'open',detail:'p95 stage-change latency is 7.8 minutes.'},
  {id:'al_4',severity:'Info',title:'Google Ads token expires soon',source:'Google Ads',age:'1h',status:'open',detail:'OAuth token should be refreshed within 20 hours.'}
 ])
 const [selected,setSelected]=useState(items[0]?.id||'')
 const current=items.find(x=>x.id===selected)||items[0]
 const resolve=async(id:string)=>{await api.resolveAlert(id).catch(()=>null);setItems(xs=>xs.map(x=>x.id===id?{...x,status:'resolved'}:x))}
 return <><PageHead crumb="Operations / Alerts" title="Alert Center" sub="Triage data, connector, delivery and audience issues from one operational queue." action="Create alert rule"/>
 <div className="stats-grid"><Stat label="Open alerts" value={String(items.filter(x=>x.status==='open').length)} sub="1 critical · 2 warnings" Icon={Bell}/><Stat label="Median acknowledge" value="3m 12s" sub="Last 30 days" Icon={Activity}/><Stat label="Auto-resolved" value="84%" sub="Retries / refreshes" Icon={Check}/><Stat label="Escalations" value="2" sub="This week" Icon={MessageCircle}/></div>
 <div className="alert-center-layout"><div className="app-panel alert-center-list"><div className="panel-head"><div><h3>Active alerts</h3><p>Operational events requiring review</p></div></div>{items.map(x=><button key={x.id} className={selected===x.id?'selected':''} onClick={()=>setSelected(x.id)}><Bell/><div><b>{x.title}</b><small>{x.source} · {x.age}</small></div><span className={x.severity.toLowerCase()}>{x.severity}</span><em className={x.status}>{x.status}</em></button>)}</div>
 {current&&<div className="app-panel alert-center-detail"><div className="panel-head"><div><h3>{current.title}</h3><p>{current.source}</p></div><span className={'diag-severity '+current.severity.toLowerCase()}>{current.severity}</span></div><p className="alert-detail-copy">{current.detail}</p><div className="diagnostic-evidence">{[['Alert ID',current.id],['Detected',current.age+' ago'],['Routing','Email + Slack'],['Runbook','Automatic retry, then human review']].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></article>)}</div><div className="alert-timeline"><div><span>1</span><div><b>Threshold breached</b><small>{current.age} ago</small></div></div><div><span>2</span><div><b>Automated retry attempted</b><small>Retry policy executed</small></div></div><div><span>3</span><div><b>Human review requested</b><small>Alert routed to workspace owner</small></div></div></div>{current.status==='open'?<div className="approval-actions"><button>Open runbook</button><button className="approve" onClick={()=>resolve(current.id)}><Check/>Mark resolved</button></div>:<div className="approval-final approved"><Check/><b>Resolved</b></div>}</div>}</div></>
}

function Developers(){
 const [secret,setSecret]=useState('whsec••••••••••••')
 const [delivery,setDelivery]=useState<any[]>([
  ['evt_91','lead.qualified','200','412ms','Delivered'],
  ['evt_90','revenue.closed','200','588ms','Delivered'],
  ['evt_89','sync.failed','500','1.9s','Failed'],
  ['evt_88','audience.updated','200','376ms','Delivered']
 ])
 const rotate=async()=>{try{const r:any=await api.rotateWebhookSecret();setSecret(r.secret)}catch{setSecret('whsec_demo_rotated')}}
 const retry=async(id:string)=>{await api.retryWebhook(id).catch(()=>null);setDelivery(xs=>xs.map(x=>x[0]===id?[x[0],x[1],'202','Queued','Retry queued']:x))}
 return <><PageHead crumb="Platform / Developers" title="Developer & webhook console" sub="Integrate proprietary systems with API keys, webhooks and server-to-server event contracts." action="Open API reference"/>
 <div className="stats-grid"><Stat label="API uptime" value="99.99%" sub="Demo operational surface" Icon={Activity}/><Stat label="Webhook delivery" value="99.61%" sub="Last 24 hours" Icon={RadioTower}/><Stat label="P95 latency" value="1.7s" sub="API ingestion" Icon={Gauge}/><Stat label="Active endpoints" value="3" sub="Outbound webhooks" Icon={Cable}/></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>API quick start</h3><p>Server-to-server event ingestion</p></div><span className="healthy">v1</span></div><div className="code-block"><code>{`POST /api/track
Authorization: Bearer ace_workspace_key
Content-Type: application/json

{
  "event": "lead.qualified",
  "customerId": "cust_18421",
  "gclid": "gclid_example",
  "value": 0
}`}</code></div><div className="sdk-tabs"><button>cURL</button><button>Node.js</button><button>Python</button></div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Webhook signing</h3><p>Verify outbound event authenticity</p></div></div><div className="api-key-box"><div><span>Signing secret</span><code>{secret}</code></div><button onClick={rotate}>Rotate secret</button></div><div className="setting-line"><span>Signature header</span><b>X-Ace-Signature</b><span className="healthy">HMAC-SHA256</span></div><div className="setting-line"><span>Timestamp header</span><b>X-Ace-Timestamp</b><span className="healthy">Required</span></div><div className="setting-line"><span>Replay tolerance</span><b>5 minutes</b><button>Edit</button></div></div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Webhook delivery log</h3><p>Inspect status, latency and retry state</p></div><button>+ Add endpoint</button></div><table><thead><tr><th>Delivery ID</th><th>Event</th><th>HTTP</th><th>Latency</th><th>Status</th><th></th></tr></thead><tbody>{delivery.map(x=><tr key={x[0]}><td><code>{x[0]}</code></td><td>{x[1]}</td><td>{x[2]}</td><td>{x[3]}</td><td><span className={x[4].toLowerCase().replace(' ','-')}>{x[4]}</span></td><td>{x[4]==='Failed'&&<button onClick={()=>retry(x[0])}>Retry</button>}</td></tr>)}</tbody></table></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Event catalog</h3><p>Stable contracts for connected systems</p></div></div>{[['lead.created','Lead entered CRM'],['lead.qualified','Qualified outcome'],['consultation.booked','Meeting scheduled'],['revenue.closed','Closed revenue'],['audience.updated','Activation segment changed'],['sync.failed','Connector delivery failure']].map(x=><div className="developer-event-row" key={x[0]}><code>{x[0]}</code><span>{x[1]}</span><ChevronRight/></div>)}</div><div className="app-panel"><div className="panel-head"><div><h3>Reliability contract</h3><p>Delivery guarantees in the implementation design</p></div></div>{[['Idempotency','event_id required'],['Retries','Exponential backoff'],['Dead-letter queue','After retry exhaustion'],['Observability','Delivery history + alerting'],['Versioning','Stable event schema versions']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><Check/></div>)}</div></div></>
}

function Settings(){
 const sections=['Workspace','Users & roles','Tracking','Governance','API & webhooks','Agent approvals','Notifications','Billing & usage']
 const [section,setSection]=useState('Workspace')
 const [apiKey,setApiKey]=useState('')
 const makeKey=async()=>{try{const r:any=await api.createApiKey();setApiKey(r.key)}catch{setApiKey('ace_demo_key_local_only')}}
 const content:any={
  'Workspace':<div className="settings-detail"><h3>Workspace profile</h3><div className="setup-form-grid">{[['Organization','Ace EdTech'],['Timezone','Asia/Kolkata'],['Currency','INR'],['Reporting week','Monday'],['Default attribution','Full path'],['Environment','Production']].map(x=><label key={x[0]}><span>{x[0]}</span><input defaultValue={x[1]}/></label>)}</div><button className="app-primary">Save workspace</button></div>,
  'Users & roles':<div className="settings-detail"><h3>Users & roles</h3>{[['Sakshee','Owner','Full access'],['Growth Lead','Admin','Manage campaigns + agents'],['Analyst','Analyst','Read + export'],['Operator','Operator','Run approved workflows']].map(x=><div className="member-row" key={x[0]}><span className="avatar-sm">{x[0][0]}</span><div><b>{x[0]}</b><small>{x[2]}</small></div><select defaultValue={x[1]}><option>Owner</option><option>Admin</option><option>Analyst</option><option>Operator</option></select></div>)}</div>,
  'Tracking':<div className="settings-detail"><h3>Tracking configuration</h3>{[['Primary domain','www.example.com'],['Cross-domain tracking','Enabled'],['GCLID persistence','90 days'],['FBCLID persistence','90 days'],['Server event endpoint','/api/track']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><button>Edit</button></div>)}</div>,
  'Governance':<div className="settings-detail"><h3>Data governance & audit</h3>{[['Consent enforcement','Required before optional activation'],['Retention','180 days'],['Deletion SLA','30 days'],['PII hashing','SHA-256 design'],['Audit logging','Enabled']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><button>Edit</button></div>)}<h4>Recent audit activity</h4>{[['Agent approval policy changed','Sakshee','2h ago'],['Google Ads connector refreshed','System','3h ago'],['Audience suppression updated','Growth Lead','Yesterday'],['API key created','Sakshee','2d ago']].map(x=><div className="audit-row" key={x[0]}><Activity/><div><b>{x[0]}</b><small>{x[1]}</small></div><span>{x[2]}</span></div>)}</div>,
  'API & webhooks':<div className="settings-detail"><h3>API keys & webhooks</h3><div className="api-key-box"><div><span>Workspace API key</span><code>{apiKey||'••••••••••••••••••••'}</code></div><button onClick={makeKey}>{apiKey?'Rotate key':'Create key'}</button></div><h4>Outbound webhooks</h4>{[['lead.qualified','https://example.com/hooks/qualified'],['revenue.closed','https://example.com/hooks/revenue'],['sync.failed','https://example.com/hooks/ops']].map(x=><div className="setting-line" key={x[0]}><code>{x[0]}</code><b>{x[1]}</b><span className="healthy">Active</span></div>)}</div>,
  'Agent approvals':<div className="settings-detail"><h3>Agent approval boundaries</h3>{[['Signal return','Auto-run','Low risk'],['CRM enrichment','Auto-run','Low risk'],['Lead qualification call','Human approval','Customer contact'],['Audience suppression','Human approval','Spend impact'],['Custom integration write','Human approval','External mutation']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><em>{x[2]}</em></div>)}</div>,
  'Notifications':<div className="settings-detail"><h3>Notifications</h3>{[['Critical delivery failures','Email + Slack','Enabled'],['Token expiry','Email','Enabled'],['Audience stale > 60m','Slack','Enabled'],['Daily performance summary','Email','Enabled']].map(x=><div className="setting-line" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><span className="healthy">{x[2]}</span></div>)}</div>,
  'Billing & usage':<div className="settings-detail"><h3>Usage & metering</h3><div className="stats-grid compact"><Stat label="Events this month" value="42.8M" sub="71% of plan" Icon={Zap}/><Stat label="Active connectors" value="12" sub="5 custom / premium" Icon={Cable}/><Stat label="Agent runs" value="184K" sub="+16% this month" Icon={Bot}/><Stat label="API calls" value="8.2M" sub="Within allowance" Icon={Activity}/></div></div>
 }
 return <><PageHead crumb="Workspace / Settings" title="Workspace settings" sub="Configure organization, access, tracking, governance, developer access and automation boundaries."/>
 <div className="settings-shell"><aside className="settings-nav">{sections.map(x=><button key={x} className={section===x?'active':''} onClick={()=>setSection(x)}>{x}<ChevronRight/></button>)}</aside><div className="app-panel">{content[section]}</div></div></>
}
function Product({back}:{back:()=>void}){
 const [tab,setTab]=useState<AppTab>('Launchpad')
 const [workspaceOpen,setWorkspaceOpen]=useState(false)
 const [workspace,setWorkspace]=useState('Ace EdTech')
 const workspaces=[['Ace EdTech','Production','AM'],['Ace Healthcare','Production','AH'],['Demo Sandbox','Sandbox','DS']]
 const view=useMemo(()=>({Launchpad:<Launchpad/>,Overview:<Overview/>,AdSync:<AdSync/>,Funnel:<Funnel/>,Events:<Events/>,Adjustments:<Adjustments/>,Diagnostics:<Diagnostics/>,Fraud:<Fraud/>,"Deep Links":<DeepLinks/>,Sites:<Sites/>,Fingerprinting:<Fingerprinting/>,"Live Sync":<LiveSync/>,"Data Hub":<DataHub/>,"Offline Attribution":<OfflineAttribution/>,Matchback:<Matchback/>,"POS & Stores":<POSAndStores/>,Journeys:<Journeys/>,Identity:<Identity/>,Models:<Models/>,Attribution:<Attribution/>,Planner:<Planner/>,Reports:<Reports/>,Enrich:<Enrich/>,"Lead Grading":<LeadGrading/>,Behavior:<Behavior/>,Feed:<Feed/>,Agents:<Agents/>,Routing:<Routing/>,"Follow-ups":<FollowUps/>,Calls:<Calls/>,Meetings:<Meetings/>,Feedback:<Feedback/>,Approvals:<Approvals/>,"Ask Ace":<AskAce/>,Integrations:<Integrations/>,Audiences:<Audiences/>,Monitoring:<Monitoring/>,Alerts:<Alerts/>,Developers:<Developers/>,Settings:<Settings/>}[tab]),[tab])
 return <div className="product"><aside><Brand/><div className="workspace-wrap"><button className="workspace" onClick={()=>setWorkspaceOpen(!workspaceOpen)}><span>{workspaces.find(x=>x[0]===workspace)?.[2]||'AM'}</span><div><b>{workspace}</b><small>{workspaces.find(x=>x[0]===workspace)?.[1]||'Production'} workspace</small></div><ChevronDown/></button>{workspaceOpen&&<div className="workspace-menu">{workspaces.map(x=><button key={x[0]} onClick={()=>{setWorkspace(x[0]);setWorkspaceOpen(false)}} className={workspace===x[0]?'active':''}><span>{x[2]}</span><div><b>{x[0]}</b><small>{x[1]}</small></div>{workspace===x[0]&&<Check/>}</button>)}<button className="new-workspace"><Plus/>Create workspace</button></div>}</div><nav>{appTabs.map(([x,I])=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}><I/>{x}</button>)}</nav><div className="aside-footer"><button onClick={back}><ArrowRight/>Back to website</button><div className="profile-mini"><span>S</span><div><b>Sakshee</b><small>Workspace owner</small></div></div></div></aside>
 <main><header className="product-head"><div className="global-search"><Search/>Search journeys, leads, campaigns...</div><div><span className="sync">● Live sync healthy</span><button><Headphones/></button><button><Globe2/></button><span className="avatar-sm">S</span></div></header><div className="product-body">{view}</div></main></div>
}
const viewHash:Record<View,string>={
 site:'#/',app:'#/workspace',login:'#/login',pricing:'#/pricing',demo:'#/demo',company:'#/company',resources:'#/resources','case-studies':'#/case-studies',privacy:'#/privacy',terms:'#/terms',security:'#/security',solutions:'#/solutions',industries:'#/industries','agents-public':'#/agents', 'integrations-public':'#/integrations'
}
const hashView=(hash:string):View=>{
 const found=(Object.entries(viewHash) as [View,string][]).find(([,route])=>route===hash)
 return found?.[0]||'site'
}

export default function AcePlatform(){
 const[view,setView]=useState<View>(()=>hashView(typeof window!=='undefined'?window.location.hash:'#/'))
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
 if(view==='login')return <Login back={goHome} openApp={nav.openApp}/>
 if(view==='pricing')return chrome(<Pricing back={goHome} openApp={nav.openApp}/>)
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
 return view==='site'?<Marketing {...nav}/>:<Product back={goHome}/>
}
