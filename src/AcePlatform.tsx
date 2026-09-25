// @ts-nocheck
import {useMemo,useState} from 'react'
import {
  Activity,ArrowRight,BarChart3,Bot,Building2,Cable,Check,ChevronDown,ChevronRight,
  CircleDollarSign,DatabaseZap,Gauge,Globe2,Headphones,Layers3,Menu,MessageCircle,
  MousePointer2,Network,PhoneCall,PieChart,RadioTower,Search,Settings2,ShieldCheck,
  Sparkles,Target,UsersRound,WandSparkles,X,Zap
} from 'lucide-react'
import './ace-platform.css'
import { api } from './lib/api'

type View='site'|'app'|'login'|'pricing'|'demo'|'company'|'resources'|'case-studies'|'privacy'|'terms'|'security'|'solutions'
type AppTab='Launchpad'|'Overview'|'AdSync'|'Funnel'|'Events'|'Diagnostics'|'Live Sync'|'Offline Attribution'|'Journeys'|'Identity'|'Attribution'|'Reports'|'Enrich'|'Behavior'|'Feed'|'Agents'|'Approvals'|'Ask Ace'|'Integrations'|'Audiences'|'Monitoring'|'Settings'

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
function Header({openApp,openLogin,openPricing,openDemo,openCompany,openResources,openCaseStudies,openSolutions}:{openApp:()=>void,openLogin:()=>void,openPricing:()=>void,openDemo:()=>void,openCompany:()=>void,openResources:()=>void,openCaseStudies:()=>void,openSolutions:()=>void}){
 const [open,setOpen]=useState(false)
 return <header className="marketing-header"><Brand/><nav className={open?'mobile-open':''}>
  <a href="#platform">Platform</a><button className="ghost-nav" onClick={openSolutions}>Solutions</button><a href="#problems">Use cases</a><a href="#agents">Agents</a><a href="#integrations">Integrations</a><a href="#industries">Industries</a><button className="ghost-nav" onClick={openCaseStudies}>Case Studies</button><button className="ghost-nav" onClick={openResources}>Resources</button><button className="ghost-nav" onClick={openCompany}>Company</button><button className="ghost-nav" onClick={openPricing}>Pricing</button>
  <button className="ghost-nav" onClick={openLogin}>Login</button><button className="ghost-nav" onClick={openApp}>Open product</button><button onClick={openDemo} className="header-cta">Book a demo <ArrowRight size={15}/></button>
 </nav><button className="menu-toggle" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></header>
}
function Marketing({openApp,openLogin,openPricing,openDemo,openCompany,openResources,openCaseStudies,openSolutions}:{openApp:()=>void,openLogin:()=>void,openPricing:()=>void,openDemo:()=>void,openCompany:()=>void,openResources:()=>void,openCaseStudies:()=>void,openSolutions:()=>void}){
 const [agentFilter,setAgentFilter]=useState('All')
 const [cookieOpen,setCookieOpen]=useState(true)
 const [cookiePrefs,setCookiePrefs]=useState({analytics:false,advertising:false,functionality:false})
 const visibleAgents=agentFilter==='All'?agents:agents.filter(a=>a[2]===agentFilter)
 return <div className="marketing-page">
  <div className="reference-banner"><span>Public EasyInsights benchmark referenced for parity:</span><b>up to 45% incremental revenue uplift</b><a href="#impact">See impact model <ArrowRight/></a></div>
  <section className="hero-wrap">
   <Header openApp={openApp} openLogin={openLogin} openPricing={openPricing} openDemo={openDemo} openCompany={openCompany} openResources={openResources} openCaseStudies={openCaseStudies} openSolutions={openSolutions}/>
   <div className="hero-grid">
    <div className="hero-copy">
     <span className="kicker">FIRST-PARTY PERFORMANCE MARKETING INFRASTRUCTURE</span>
     <h1>Turn every customer signal into <em>better growth.</em></h1>
     <p>Stitch ad clicks, website activity, CRM stages, calls, WhatsApp conversations and offline outcomes into one measurable customer journey — then use agents to act on the gaps automatically.</p>
     <div className="hero-actions"><button className="btn-primary" onClick={openApp}>Explore product <ArrowRight/></button><a href="#platform" className="btn-link">See the system</a></div>
     <div className="hero-checks"><span><Check/> Server-side conversion activation</span><span><Check/> Online + offline journey stitching</span><span><Check/> Agent-based funnel operations</span></div>
    </div>
    <div className="hero-product">
      <div className="glow g1"/><div className="glow g2"/>
      <div className="mock-shell">
       <div className="mock-top"><span>Unified Journey</span><span className="live-dot">● LIVE</span></div>
       {[
        ['Google Ads','Click ID captured','0s'],['Website','Pricing + program pages','+24s'],['WhatsApp','Conversation started','+3m'],['CRM','Qualified by counsellor','+18m'],['Call','Consultation completed','+2h'],['Revenue','Enrolment recorded','+2d']
       ].map((x,i)=><div className="journey-line" key={x[0]}><span className={'node n'+i}/><div><b>{x[0]}</b><small>{x[1]}</small></div><time>{x[2]}</time></div>)}
      </div>
      <div className="signal-toast"><Zap/><div><b>Outcome returned to ad platforms</b><small>Qualified Lead + Enrolment signals synchronized</small></div></div>
    </div>
   </div>
  </section>

  <section className="trust-row">
   <span>Built for complex acquisition stacks</span>
   {['Ads','CRM','WhatsApp','Calls','Web/App','Offline'].map(x=><b key={x}>{x}</b>)}
  </section>

  <section className="case-change-section">
   <div className="section-title"><span className="kicker dark">THE CASE FOR CHANGE</span><h2>Paid growth is only as good as the signals and context feeding it.</h2><p>The supplied brochure highlights six structural reasons lead-generation teams need a shared first-party operating layer rather than isolated platform optimization.</p></div>
   <div className="case-change-grid">
    {[
      ['01','Algorithms need better signal','Automated bidding can only learn from the outcomes you send back; shallow form-fill events teach the wrong lesson.'],
      ['02','CPM is no longer the main lever','Inventory efficiency alone cannot fix a funnel that loses quality and revenue context after the click.'],
      ['03','Stacks are fragmented','Marketing teams often operate across multiple platforms with no common source of truth across the full customer journey.'],
      ['04','Platform know-how is table stakes','Differentiation moves upstream to first-party data quality, signal design and measurement discipline.'],
      ['05','Post-click leakage remains large','Even strong targeting cannot repair qualification, routing and follow-up failures after a lead enters the funnel.'],
      ['06','Journeys are omnichannel','A customer can move from social to search to WhatsApp to calls before revenue, while each platform sees only its own slice.']
    ].map(x=><article key={x[0]}><span>{x[0]}</span><h3>{x[1]}</h3><p>{x[2]}</p></article>)}
   </div>
   <div className="trusted-reference">
    <span>REFERENCE BRANDS SHOWN IN THE SUPPLIED BROCHURE</span>
    <div>{['ISB','Vedantu','Bhanzu','GrowthSchool','Leverage Edu','Jaro Education','Edureka','WebVeda','Testleaf'].map(x=><b key={x}>{x}</b>)}</div>
    <small>Names are shown as brochure references only; no customer logo artwork is copied into AceMarketing.</small>
   </div>
  </section>

  <section className="section white" id="problems">
   <div className="section-title"><span className="kicker dark">THREE LEAKS THAT HURT PAID GROWTH</span><h2>One operating layer for signal quality, conversion and attribution.</h2></div>
   <div className="problem-grid">
    {[
      ['01','Lead quality','Ad platforms learn from shallow form-fill events while qualified or closed outcomes sit elsewhere.','Return high-intent and revenue events server-side so bidding learns from business outcomes.'],
      ['02','Conversion leakage','Forms, CRM, calls, chats and sales handoffs live in separate systems and lose time or context.','Deploy grading, enrichment, voice, scheduling and reminder agents at each handoff.'],
      ['03','Visibility & attribution','Every tool reports its own slice, making the full customer path difficult to see and defend.','Stitch every touchpoint into a customer journey and measure contribution through revenue.']
    ].map(x=><article className="problem-card" key={x[0]}><span>{x[0]}</span><h3>{x[1]}</h3><p>{x[2]}</p><div><Sparkles/><b>What AceMarketing does</b><small>{x[3]}</small></div></article>)}
   </div>
  </section>

  <section className="split-system" id="platform">
   <div className="section-title light"><span className="kicker">TWO CAPABILITIES · ONE SYSTEM</span><h2>The journey gives every automation the full context.</h2></div>
   <div className="capability-grid">
    <article><Network/><span>CAPABILITY 01</span><h3>Stitch the journey</h3><p>Connect forms, website, app, ad accounts, CRM, calling, WhatsApp and offline stages into one customer path from first touch through revenue.</p><ul><li>Identity stitching</li><li>Click-ID persistence</li><li>Online + offline events</li><li>Session-level chronology</li></ul></article>
    <article><Bot/><span>CAPABILITY 02</span><h3>Deploy funnel agents</h3><p>Use specialized agents to qualify, enrich, route, schedule, remind, match closures and return the right conversion signals.</p><ul><li>Prebuilt agents</li><li>Custom agent builder</li><li>Human approval controls</li><li>Audit trail</li></ul></article>
   </div>
   <div className="formula">STITCHED JOURNEY <b>+</b> AGENTS AT EVERY STEP <b>=</b> A FUNNEL THAT LEARNS</div>
  </section>

  <section className="section white">
   <div className="section-title"><span className="kicker dark">CORE MODULES</span><h2>From click signal to revenue evidence.</h2></div>
   <div className="core-grid">
    <article><span>01</span><RadioTower/><h3>AdSync</h3><p>Server-side conversion activation, offline conversions, click-ID persistence, audience synchronization and continuous event delivery.</p><button onClick={openApp}>Open AdSync <ArrowRight/></button></article>
    <article><span>02</span><DatabaseZap/><h3>Enrich</h3><p>Add source, campaign, behavior, conversation and intent context to every incoming CRM record so sales starts informed.</p><button onClick={openApp}>Open Enrich <ArrowRight/></button></article>
    <article><span>03</span><PieChart/><h3>Klarity</h3><p>Analyze stitched journeys, channel contribution, stage conversion and revenue attribution instead of isolated platform reports.</p><button onClick={openApp}>Open attribution <ArrowRight/></button></article>
   </div>
  </section>

  <section className="connectivity-band">
   <div className="section-title"><span className="kicker dark">PLATFORM AGNOSTIC</span><h2>CRM, WhatsApp, calling, web and app systems in one data layer.</h2><p>The brochure groups connectivity across CRM platforms, WhatsApp/marketing platforms, calling platforms, and website/app platforms. AceMarketing now mirrors that information architecture.</p></div>
   <div className="connectivity-columns">
    <article><span>CRM</span><b>Zoho · Salesforce · LeadSquared · HubSpot · HighLevel · Dynamics</b></article>
    <article><span>WHATSAPP & MARKETING</span><b>WhatsApp · WATI · Gupshup · MoEngage · CleverTap</b></article>
    <article><span>CALLING</span><b>Exotel · Knowlarity · Tata Tele · MyOperator</b></article>
    <article><span>WEB & APP</span><b>Shopify · WooCommerce · Magento · WordPress · React · Custom</b></article>
   </div>
  </section>

  <section className="activation-capabilities">
   <div className="section-title"><span className="kicker dark">FIRST-PARTY DATA ACTIVATION</span><h2>More than conversion uploads.</h2><p>The current EasyInsights product also emphasizes website behavior, dynamic audiences, device exclusions and feed enhancement. AceMarketing now represents those workflows directly.</p></div>
   <div className="activation-cap-grid">
    <article><MousePointer2/><h3>Website behavior</h3><p>Capture visits, high-intent page sequences, form starts, button clicks and authenticated activity across the journey.</p><span>Server-side event stream</span></article>
    <article><UsersRound/><h3>Dynamic audiences</h3><p>Keep acquisition, nurturing, decision and post-purchase segments fresh as customer behavior changes.</p><span>Real-time activate / suppress</span></article>
    <article><ShieldCheck/><h3>Device & identity exclusion</h3><p>Suppress existing customers or irrelevant identities so campaigns do not repeatedly spend against the same people.</p><span>Waste-control workflow</span></article>
    <article><Layers3/><h3>Feed enhancement</h3><p>Attach custom product, customer and event attributes to activation payloads for more granular targeting and personalization.</p><span>Custom attributes</span></article>
   </div>
  </section>

  <section className="agents-section" id="agents">
   <div className="section-title light"><span className="kicker">AGENTS</span><h2>11 specialized agents across the funnel.</h2><p>Activate only the agents your workflow needs, with shared context from the same stitched journey.</p></div>
   <div className="agent-filters">{['All','Lead Quality','Conversion','Visibility'].map(x=><button key={x} className={agentFilter===x?'active':''} onClick={()=>setAgentFilter(x)}>{x}</button>)}</div>
   <div className="agent-reference-note">Impact figures below mirror metrics published on the current EasyInsights public website and are shown as parity/reference targets, not AceMarketing performance claims.</div>
   <div className="agent-showcase">{visibleAgents.map((a,i)=><article key={a[0]}><div><span>{String(i+1).padStart(2,'0')}</span><Bot/></div><h3>{a[0]}</h3><p>{a[1]}</p><footer><small>{a[2]}</small><b>{a[3]}</b></footer></article>)}</div>
  </section>

  <section className="section white" id="integrations">
   <div className="section-title"><span className="kicker dark">CONNECTIVITY</span><h2>Keep the tools your teams already use.</h2><p>Standard connectors and custom adapters bring data into one workspace without replacing the existing stack.</p></div>
   <div className="integration-grid">{integrations.map((x,i)=><article key={x}><span className={'integration-logo c'+(i%6)}>{x.slice(0,2).toUpperCase()}</span><b>{x}</b><Check/></article>)}</div>
  </section>

  <section className="industry-section" id="industries">
   <div className="section-title"><span className="kicker dark">INDUSTRIES</span><h2>Designed for long, multi-touch customer journeys.</h2></div>
   <div className="industry-grid">{industries.map((x,i)=><article key={x[0]}><span>{String(i+1).padStart(2,'0')}</span><Building2/><h3>{x[0]}</h3><p>{x[1]}</p><ArrowRight/></article>)}</div>
  </section>

  <section className="impact-section" id="impact">
   <div className="section-title light"><span className="kicker">ADSYNC · EXPECTED IMPACT MODEL</span><h2>Five signal-quality improvements compound across the optimization loop.</h2><p>The brochure frames AdSync impact across synchronization, junk-lead control, identifier coverage, conversion-event design and audience suppression.</p></div>
   <div className="impact-grid">
    <article><span>01</span><div><b>Real-time data synchronization</b><div className="impact-bar"><i style={{width:'70%'}}/></div></div><strong>10%</strong></article><article><span>02</span><div><b>Control junk leads re-entering ad algorithms</b><div className="impact-bar"><i style={{width:'70%'}}/></div></div><strong>10%</strong></article><article><span>03</span><div><b>Better GCLID & FBCLID coverage</b><div className="impact-bar"><i style={{width:'35%'}}/></div></div><strong>5%</strong></article><article><span>04</span><div><b>Campaign-specific conversion events</b><div className="impact-bar"><i style={{width:'70%'}}/></div></div><strong>10%</strong></article><article><span>05</span><div><b>Real-time contextual audiences & suppression</b><div className="impact-bar"><i style={{width:'70%'}}/></div></div><strong>10%</strong></article>
   </div>
   <div className="impact-total"><span>Total expected impact</span><strong>45%</strong><small>Compounded gain across signal quality, coverage and audience control (as presented in the supplied brochure).</small></div>
  </section>

  <section className="proof-section" id="proof">
   <div className="section-title light"><span className="kicker">WORKFLOW PROOF</span><h2>Complex funnels become one measurable operating system.</h2></div>
   <div className="proof-cards">{caseStudies.map(x=><article key={x[0]}><span>{x[0]}</span><p>{x[1]}</p><strong>{x[2]}</strong><small>{x[3]}</small></article>)}</div>
   <div className="case-study-grid">
    <article><span>EDTECH · JARO EDUCATION</span><h3>High-volume lead management</h3><p>Unified CRM stage mapping and offline conversion pipelines across Google, Meta, Bing and LinkedIn.</p><div><b>14,000+</b><small>daily leads</small><b>250,000+</b><small>conversions imported daily</small><b>15+</b><small>ad accounts</small></div></article>
    <article><span>HEALTHCARE · APOLLO AYURVAID</span><h3>Call + WhatsApp attribution</h3><p>Connected telephony timestamps and website sessions to restore offline call attribution and return conversion events to advertising platforms.</p><div><b>Calls</b><small>matched to source</small><b>WhatsApp</b><small>conversion events</small><b>Real time</b><small>signal return</small></div></article>
    <article><span>HIGH-AOV · GEMPUNDIT</span><h3>WhatsApp + partial payment journey</h3><p>Persisted click identifiers from landing-page session into WhatsApp intent and custom partial-payment outcomes.</p><div><b>GCLID</b><small>persisted server-side</small><b>Partial</b><small>payments classified</small><b>Revenue</b><small>fed to bidding</small></div></article>
    <article><span>HOME SERVICES · BERGER PAINTS</span><h3>Quality-first lead optimization</h3><p>Activated CRM data through server-side conversions and custom CTWA events so bidding optimized toward high-quality enquiries.</p><div><b>19%</b><small>CAC reduction</small><b>4×</b><small>quality-lead growth</small><b>24×7</b><small>monitoring</small></div></article>
   </div>
  </section>

  <section className="public-proof-section">
   <div className="section-title"><span className="kicker dark">PUBLIC PARITY REFERENCES</span><h2>Three proof patterns represented in the current EasyInsights site.</h2><p>These cards are clearly labeled reference results from the public site so AceMarketing does not present third-party outcomes as its own.</p></div>
   <div className="public-proof-grid">
    <article><span>LEAD QUALITY · LEVERAGE EDU</span><strong>−38%</strong><h3>cost per qualified lead</h3><p>Reference pattern: enrolment outcomes returned server-side to paid platforms, deduplicated across acquisition and counselor sources.</p></article>
    <article><span>CONVERSION · INDIA IVF</span><strong>+52%</strong><h3>lead-to-consultation conversion</h3><p>Reference pattern: leads graded on arrival, enriched with context and qualified quickly across the funnel.</p></article>
    <article><span>VISIBILITY · BLUE TOKAI</span><strong>31%</strong><h3>revenue re-attributed</h3><p>Reference pattern: web, app and offline touchpoints stitched into full-path attribution.</p></article>
    <article><span>CONVERSION · JARO EDUCATION</span><strong>+41%</strong><h3>enrolment rate</h3><p>Reference pattern: counselor calls and follow-ups tracked with full journey context so high-intent learners do not disappear between steps.</p></article>
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

  <section className="security-band"><ShieldCheck/><div><span className="kicker dark">DATA CONTROLS</span><h2>Enterprise-ready governance foundation.</h2><p>Consent-aware collection, hashed identifiers, role-based permissions, audit logging, configurable retention and monitored event delivery are part of the implementation plan.</p></div><div className="badges"><span>RBAC</span><span>Audit Logs</span><span>Encryption</span><span>Retention</span></div></section>

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

  <DemoSection openApp={openApp}/>
  <footer className="marketing-footer"><Brand/><div className="footer-groups"><div><b>Platform</b><span>Data Activation</span><span>Data Enrichment</span><span>Attribution</span><span>Monitoring</span></div><div><b>Solutions</b><span>Lead Generation</span><span>Enterprise</span><span>Mid-Market</span><span>Server-to-Server</span></div><div><b>Resources</b><button onClick={openResources}>Guides & tools</button><button onClick={openCaseStudies}>Case studies</button><button onClick={openCompany}>Company</button><button onClick={openPricing}>Pricing</button></div><div><b>Get started</b><button onClick={openDemo}>Book demo</button><button onClick={openApp}>Open product</button><button onClick={openLogin}>Login</button></div></div><p>AceMarketing · first-party growth operating system.</p></footer>
  {cookieOpen&&<div className="cookie-banner"><div><b>Cookie preferences</b><p>Necessary storage is always on. Optional analytics, advertising and functionality categories can be enabled independently.</p><div className="cookie-toggles">{Object.entries(cookiePrefs).map(([k,v])=><label key={k}><input type="checkbox" checked={v} onChange={()=>setCookiePrefs({...cookiePrefs,[k]:!v})}/>{k}</label>)}</div></div><div className="cookie-actions"><button onClick={()=>{setCookiePrefs({analytics:false,advertising:false,functionality:false});setCookieOpen(false)}}>Necessary only</button><button onClick={()=>{setCookiePrefs({analytics:true,advertising:true,functionality:true});setCookieOpen(false)}}>Accept all</button><button className="primary-cookie" onClick={async()=>{await api.saveConsent(cookiePrefs).catch(()=>null);setCookieOpen(false)}}>Save preferences</button></div></div>}
 </div>
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
 ['Launchpad',WandSparkles],['Overview',Gauge],['AdSync',RadioTower],['Funnel',BarChart3],['Events',Zap],['Diagnostics',ShieldCheck],['Live Sync',Activity],['Offline Attribution',PhoneCall],['Journeys',Network],['Identity',UsersRound],['Attribution',PieChart],['Reports',BarChart3],['Enrich',DatabaseZap],['Behavior',MousePointer2],['Feed',Layers3],['Agents',Bot],['Approvals',CheckCircle2],['Ask Ace',Sparkles],['Integrations',Cable],['Audiences',UsersRound],['Monitoring',Activity],['Settings',Settings2]
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

function Attribution(){
 return <><PageHead crumb="Measurement / Attribution" title="Full-path attribution" sub="Measure channel contribution using stitched journey evidence through closed revenue." action="Ask attribution question"/>
 <div className="stats-grid"><Stat label="Attributed revenue" value="₹2.84Cr" sub="+18.4%" Icon={CircleDollarSign}/><Stat label="Journeys stitched" value="92,418" sub="96.2% identity coverage" Icon={Network}/><Stat label="Revenue re-attributed" value="28.7%" sub="Beyond last-click" Icon={PieChart}/><Stat label="Average touches" value="5.4" sub="Before conversion" Icon={MousePointer2}/></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Channel contribution</h3><p>Share of measured closed revenue</p></div><button>Last 30 days</button></div>{[['Google Ads','₹1.18Cr',42],['Meta Ads','₹72.4L',26],['WhatsApp','₹39.1L',14],['Organic Search','₹30.6L',11],['Direct / Other','₹19.9L',7]].map(x=><div className="channel-line" key={x[0]}><b>{x[0]}</b><div className="progress"><i style={{width:x[2]+'%'}}/></div><span>{x[1]}</span><strong>{x[2]}%</strong></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Attribution model comparison</h3><p>Same revenue, different credit rules</p></div><span className="status">Measured journey</span></div><div className="model-compare">{[['First touch','Google Ads','₹84,000'],['Last touch','Counsellor / CRM','₹84,000'],['Linear','5 touches','₹16,800 each'],['Full path','Measured contribution','Google 38% · WhatsApp 22% · Assisted 40%']].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><small>{x[2]}</small></article>)}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Example revenue journey</h3><p>₹84,000 · five touches · two days</p></div><span className="status">Revenue matched</span></div><div className="touch-path">{['Google Search','Website','WhatsApp','Counsellor Call','Enrolment'].map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b>{i<4&&<ArrowRight/>}</div>)}</div></div></>
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
  ['Advertising & Analytics',['Google Ads','Meta Ads','LinkedIn Ads','Microsoft Ads','GA4']]
 ]
 const [connector,setConnector]=useState('')
 const [step,setStep]=useState(1)
 const [connected,setConnected]=useState<string[]>(['Zoho CRM','WhatsApp','Google Ads','GA4','Exotel'])
 const start=(name:string)=>{setConnector(name);setStep(1)}
 const finish=async()=>{await api.connectIntegration(connector).catch(()=>null);setConnected(c=>c.includes(connector)?c:[...c,connector]);setConnector('')}
 return <><PageHead crumb="Workspace / Integrations" title="Platform-agnostic connectivity" sub="Connect the systems you already use without rebuilding your stack." action="Request connector"/>
 <div className="integration-summary"><div><strong>100+</strong><span>available connector patterns</span></div><div><strong>{connected.length}</strong><span>connected in this workspace</span></div><div><strong>24×7</strong><span>continuous synchronization</span></div><div><strong>Custom</strong><span>adapter support</span></div></div>
 <div className="integration-category-grid">{groups.map((g,gi)=><section className="integration-category" key={g[0] as string}><div className="integration-category-head"><div><span>{String(gi+1).padStart(2,'0')}</span><h3>{g[0]}</h3></div><small>{(g[1] as string[]).length} connectors shown</small></div><div className="integration-app-grid">{(g[1] as string[]).map((x,i)=><article key={x}><span className={'integration-logo c'+(i%6)}>{x.slice(0,2).toUpperCase()}</span><div><b>{x}</b><small>{connected.includes(x)?'Connected · syncing':'Connector available'}</small></div><button className={connected.includes(x)?'connected':'connect'} onClick={()=>!connected.includes(x)&&start(x)}>{connected.includes(x)?'Connected':'Connect'}</button></article>)}</div></section>)}</div>
 {connector&&<div className="connector-modal"><div className="connector-card"><div className="connector-modal-head"><div><span className="integration-logo c0">{connector.slice(0,2).toUpperCase()}</span><div><b>Connect {connector}</b><small>Step {step} of 3</small></div></div><button onClick={()=>setConnector('')}><X/></button></div>{step===1&&<div className="connector-step"><h3>Authorize workspace access</h3><p>Grant only the scopes required to read events, sync outcomes and manage configured conversion destinations.</p><div className="scope-list">{['Read account metadata','Read campaign / lead records','Write configured conversion events','Read sync health'].map(x=><span key={x}><Check/>{x}</span>)}</div><button onClick={()=>setStep(2)}>Continue <ArrowRight/></button></div>}{step===2&&<div className="connector-step"><h3>Map business fields</h3><p>Choose the fields used for identity resolution and funnel stages.</p>{[['Primary identity','Email + phone'],['Click identifier','GCLID / FBCLID'],['Lifecycle stage','Lead status'],['Revenue field','Closed value']].map(x=><label key={x[0]}><span>{x[0]}</span><select defaultValue={x[1]}><option>{x[1]}</option><option>Custom field</option></select></label>)}<button onClick={()=>setStep(3)}>Continue <ArrowRight/></button></div>}{step===3&&<div className="connector-step"><h3>Enable synchronization</h3><p>Start continuous ingestion and delivery health checks for this connector.</p><div className="connector-ready"><Activity/><div><b>Ready to connect</b><small>Real API credentials can replace this demo connector flow in production.</small></div></div><button onClick={finish}>Connect {connector}</button></div>}</div></div>}</>
}
function Audiences(){
 return <><PageHead crumb="Activation / Audiences" title="Audience management" sub="Activate high-intent segments and suppress low-value or converted users." action="New audience"/><div className="app-panel"><div className="panel-head"><div><h3>Active segments</h3><p>Synced to connected destinations</p></div><button>Export</button></div>{[
 ['High intent leads','3,106','Google Ads · Meta Ads','Every 5 min','Activate'],
 ['Converted / enrolled','18,204','Google Ads · Meta Ads · LinkedIn','Real time','Suppress'],
 ['Website visitors · 180d','82,416','Meta Ads','Hourly','Retarget'],
 ['WhatsApp leads','11,284','Google Ads · Meta Ads','Real time','Activate'],
 ['Low intent leads','24,901','Google Ads · Meta Ads','Daily','Suppress']
 ].map(x=><div className="audience-row" key={x[0]}><UsersRound/><div><b>{x[0]}</b><small>{x[2]}</small></div><strong>{x[1]}</strong><span>{x[3]}</span><em className={x[4].toLowerCase()}>{x[4]}</em><ChevronRight/></div>)}</div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Lifecycle audiences</h3><p>Acquisition → nurture → decision → post-purchase</p></div></div>{[['Acquisition','New prospects','18,204'],['Nurture','Engaged / not qualified','8,441'],['Decision','Consultation / high intent','3,106'],['Post-purchase','Converted customers','18,204']].map(x=><div className="lifecycle-row" key={x[0]}><span>{x[0]}</span><div><b>{x[1]}</b><small>{x[2]} identities</small></div><ChevronRight/></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Waste-control exclusions</h3><p>Prevent repeat spend on irrelevant identities</p></div></div>{[['Converted customers','Customer ID + hashed PII','18,204'],['Device-ID exclusion','First-party device IDs','22,891'],['Duplicate / invalid leads','CRM disposition','4,118'],['Low-LTV customers','Value threshold','3,409']].map(x=><div className="exclusion-row" key={x[0]}><ShieldCheck/><div><b>{x[0]}</b><small>{x[1]}</small></div><strong>{x[2]}</strong><span>Suppressed</span></div>)}</div></div></>
}
function Monitoring(){
 return <><PageHead crumb="Operations / Monitoring" title="Platform monitoring" sub="Observe connector health, event delivery, sync latency and processing failures." action="Create alert"/>
 <div className="stats-grid"><Stat label="Platform status" value="Healthy" sub="All critical services" Icon={Activity}/><Stat label="Events / min" value="8,412" sub="Current throughput" Icon={Zap}/><Stat label="Failed events" value="0.18%" sub="Retry queue enabled" Icon={BarChart3}/><Stat label="P95 latency" value="1.7s" sub="Ingestion pipeline" Icon={Gauge}/></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Connector uptime</h3><p>Last 24 hours</p></div><span className="healthy">99.98%</span></div>{['Google Ads','Meta Ads','Zoho CRM','WhatsApp','Exotel'].map((x,i)=><div className="monitor-row" key={x}><span>{x}</span><div className="spark-bars">{Array.from({length:18}).map((_,j)=><i key={j} className={(i===3&&j===11)?'warn':''}/>)}</div><b>{i===3?'99.91%':'100%'}</b></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recent alerts</h3><p>Operational events</p></div></div>{[['Resolved','WhatsApp API rate limit recovered','12 min ago'],['Resolved','Google Ads token refreshed','48 min ago'],['Info','Audience sync completed','1h ago'],['Info','Daily attribution rebuild complete','3h ago']].map(x=><div className="alert-row" key={x[1]}><span className={x[0].toLowerCase()}>{x[0]}</span><div><b>{x[1]}</b><small>{x[2]}</small></div></div>)}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Automated monitoring rules</h3><p>Guardrails for signal loss and stale optimization inputs</p></div><button>+ Add rule</button></div><div className="monitor-rule-grid">{[['Event delivery rate','< 98% for 10 min','Critical'],['GCLID coverage','< 85%','Warning'],['CRM sync latency','> 5 min','Warning'],['Audience sync','No update for 60 min','Critical'],['CAPI token','Expires in < 24h','Info'],['Failed event queue','> 500 records','Critical']].map(x=><article key={x[0]}><Activity/><div><b>{x[0]}</b><small>{x[1]}</small></div><span className={String(x[2]).toLowerCase()}>{x[2]}</span></article>)}</div></div></>
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
 const view=useMemo(()=>({Launchpad:<Launchpad/>,Overview:<Overview/>,AdSync:<AdSync/>,Funnel:<Funnel/>,Events:<Events/>,Diagnostics:<Diagnostics/>,"Live Sync":<LiveSync/>,"Offline Attribution":<OfflineAttribution/>,Journeys:<Journeys/>,Identity:<Identity/>,Attribution:<Attribution/>,Reports:<Reports/>,Enrich:<Enrich/>,Behavior:<Behavior/>,Feed:<Feed/>,Agents:<Agents/>,Approvals:<Approvals/>,"Ask Ace":<AskAce/>,Integrations:<Integrations/>,Audiences:<Audiences/>,Monitoring:<Monitoring/>,Settings:<Settings/>}[tab]),[tab])
 return <div className="product"><aside><Brand/><div className="workspace-wrap"><button className="workspace" onClick={()=>setWorkspaceOpen(!workspaceOpen)}><span>{workspaces.find(x=>x[0]===workspace)?.[2]||'AM'}</span><div><b>{workspace}</b><small>{workspaces.find(x=>x[0]===workspace)?.[1]||'Production'} workspace</small></div><ChevronDown/></button>{workspaceOpen&&<div className="workspace-menu">{workspaces.map(x=><button key={x[0]} onClick={()=>{setWorkspace(x[0]);setWorkspaceOpen(false)}} className={workspace===x[0]?'active':''}><span>{x[2]}</span><div><b>{x[0]}</b><small>{x[1]}</small></div>{workspace===x[0]&&<Check/>}</button>)}<button className="new-workspace"><Plus/>Create workspace</button></div>}</div><nav>{appTabs.map(([x,I])=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}><I/>{x}</button>)}</nav><div className="aside-footer"><button onClick={back}><ArrowRight/>Back to website</button><div className="profile-mini"><span>S</span><div><b>Sakshee</b><small>Workspace owner</small></div></div></div></aside>
 <main><header className="product-head"><div className="global-search"><Search/>Search journeys, leads, campaigns...</div><div><span className="sync">● Live sync healthy</span><button><Headphones/></button><button><Globe2/></button><span className="avatar-sm">S</span></div></header><div className="product-body">{view}</div></main></div>
}
export default function AcePlatform(){const[view,setView]=useState<View>('site');if(view==='login')return <Login back={()=>setView('site')} openApp={()=>setView('app')}/>;if(view==='pricing')return <Pricing back={()=>setView('site')} openApp={()=>setView('app')}/>;if(view==='demo')return <DemoPage back={()=>setView('site')} openApp={()=>setView('app')}/>;if(view==='company')return <CompanyPage back={()=>setView('site')} openDemo={()=>setView('demo')}/>;if(view==='resources')return <ResourcesPage back={()=>setView('site')}/>;if(view==='case-studies')return <CaseStudiesPage back={()=>setView('site')} openDemo={()=>setView('demo')}/>;if(view==='privacy')return <LegalPage kind="privacy" back={()=>setView('site')}/>;if(view==='terms')return <LegalPage kind="terms" back={()=>setView('site')}/>;if(view==='security')return <LegalPage kind="security" back={()=>setView('site')}/>;if(view==='solutions')return <SolutionsPage back={()=>setView('site')} openDemo={()=>setView('demo')} openApp={()=>setView('app')}/>;return view==='site'?<Marketing openApp={()=>setView('app')} openLogin={()=>setView('login')} openPricing={()=>setView('pricing')} openDemo={()=>setView('demo')} openCompany={()=>setView('company')} openResources={()=>setView('resources')} openCaseStudies={()=>setView('case-studies')} openSolutions={()=>setView('solutions')}/>:<Product back={()=>setView('site')}/>}
