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

type View='site'|'app'|'login'|'pricing'|'demo'|'company'|'resources'
type AppTab='Overview'|'AdSync'|'Funnel'|'Events'|'Live Sync'|'Offline Attribution'|'Journeys'|'Attribution'|'Enrich'|'Agents'|'Integrations'|'Audiences'|'Monitoring'|'Settings'

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
const integrations=['Google Ads','Meta Ads','LinkedIn Ads','Microsoft Ads','GA4','Zoho CRM','Salesforce','HubSpot','LeadSquared','HighLevel','WhatsApp','WATI','Gupshup','MoEngage','CleverTap','Exotel','Knowlarity','Tata Tele','MyOperator','Shopify','WooCommerce','Magento','WordPress','Custom Backend']
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
function Header({openApp,openLogin,openPricing,openDemo,openCompany,openResources}:{openApp:()=>void,openLogin:()=>void,openPricing:()=>void,openDemo:()=>void,openCompany:()=>void,openResources:()=>void}){
 const [open,setOpen]=useState(false)
 return <header className="marketing-header"><Brand/><nav className={open?'mobile-open':''}>
  <a href="#platform">Platform</a><a href="#problems">Use cases</a><a href="#agents">Agents</a><a href="#integrations">Integrations</a><a href="#industries">Industries</a><button className="ghost-nav" onClick={openResources}>Resources</button><button className="ghost-nav" onClick={openCompany}>Company</button><button className="ghost-nav" onClick={openPricing}>Pricing</button>
  <button className="ghost-nav" onClick={openLogin}>Login</button><button className="ghost-nav" onClick={openApp}>Open product</button><button onClick={openDemo} className="header-cta">Book a demo <ArrowRight size={15}/></button>
 </nav><button className="menu-toggle" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></header>
}
function Marketing({openApp,openLogin,openPricing,openDemo,openCompany,openResources}:{openApp:()=>void,openLogin:()=>void,openPricing:()=>void,openDemo:()=>void,openCompany:()=>void,openResources:()=>void}){
 const [agentFilter,setAgentFilter]=useState('All')
 const visibleAgents=agentFilter==='All'?agents:agents.filter(a=>a[2]===agentFilter)
 return <div className="marketing-page">
  <div className="reference-banner"><span>Public EasyInsights benchmark referenced for parity:</span><b>up to 45% incremental revenue uplift</b><a href="#impact">See impact model <ArrowRight/></a></div>
  <section className="hero-wrap">
   <Header openApp={openApp} openLogin={openLogin} openPricing={openPricing} openDemo={openDemo} openCompany={openCompany} openResources={openResources}/>
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
   </div>
  </section>

  <section className="diagnostics-section">
   <div className="section-title"><span className="kicker dark">DIAGNOSE THE ROOT CAUSE</span><h2>Your campaigns can only learn from the data they receive.</h2><p>Use a single diagnostic layer to separate media problems from tracking, data-quality and operational funnel issues.</p></div>
   <div className="diagnostic-grid">
    <article><Activity/><h3>Business & operational impact</h3><ul><li>Rising acquisition cost with unclear lead quality</li><li>Different teams reporting different numbers</li><li>Slow handoffs between marketing and sales</li><li>Budget decisions without end-to-end evidence</li></ul></article>
    <article><Network/><h3>Tracking & data quality</h3><ul><li>Broken or duplicated conversion events</li><li>Cross-domain and chatbot tracking gaps</li><li>Missing click identifiers on offline outcomes</li><li>No consistent source of truth for funnel stages</li></ul></article>
    <article><Target/><h3>Ad optimization</h3><ul><li>Algorithms learning from low-value form fills</li><li>Qualified outcomes arriving too late</li><li>Converted users still being retargeted</li><li>Insufficient first-party conversion coverage</li></ul></article>
   </div>
  </section>

  <section className="security-band"><ShieldCheck/><div><span className="kicker dark">DATA CONTROLS</span><h2>Enterprise-ready governance foundation.</h2><p>Consent-aware collection, hashed identifiers, role-based permissions, audit logging, configurable retention and monitored event delivery are part of the implementation plan.</p></div><div className="badges"><span>RBAC</span><span>Audit Logs</span><span>Encryption</span><span>Retention</span></div></section>

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
  <footer className="marketing-footer"><Brand/><p>AceMarketing · first-party growth operating system.</p><div><button onClick={openResources}>Resources</button><button onClick={openCompany}>Company</button><button onClick={openPricing}>Pricing</button><button onClick={openDemo}>Book demo</button></div></footer>
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
 </div>
}

function CompanyPage({back,openDemo}:{back:()=>void,openDemo:()=>void}){
 return <div className="standalone-page company-page"><div className="standalone-top"><Brand/><button onClick={back}>Back to website</button></div>
  <section className="standalone-hero company-hero"><span className="kicker">COMPANY</span><h1>Built around the reality of complex performance marketing funnels.</h1><p>AceMarketing is being developed as a SaaS operating layer for teams that need attribution, signal activation, funnel automation and first-party data workflows without rebuilding every system in-house.</p><button onClick={openDemo}>Talk to the product team <ArrowRight/></button></section>
  <section className="company-values"><div className="section-title"><span className="kicker dark">OPERATING PRINCIPLES</span><h2>Implementation is not a template.</h2></div><div>{[['If data can solve it, map it','Unusual CRMs, custom stages and offline paths should be modeled explicitly instead of forced into a generic demo funnel.'],['Built from marketing problems','The product is organized around lead quality, conversion, attribution and operational handoffs rather than generic BI dashboards.'],['Work with the existing stack','Connect what teams already use and add specialized adapters where standard connectors are not enough.']].map((x,i)=><article key={x[0]}><span>0{i+1}</span><h3>{x[0]}</h3><p>{x[1]}</p></article>)}</div></section>
  <section className="custom-services"><div><span className="kicker">CUSTOM SERVICES</span><h2>Extend the platform when the standard path is not enough.</h2><p>Architecture accommodates attribution modeling, server-to-server integrations, cohort-style reporting, automated reports and custom data-engineering workflows.</p></div><div className="service-grid">{['Server-to-server integration','Attribution modeling','Cohort / media planning reports','Automated reports','Custom event design','Bespoke connector pipelines'].map(x=><article key={x}><Check/><b>{x}</b></article>)}</div></section>
 </div>
}

function ResourcesPage({back}:{back:()=>void}){
 const docs=[['Custom Events','Define business-specific conversion events such as qualified lead, pricing-page lead, high-value purchase and attribution events.'],['Server-Side Activation','Patterns for CAPI, enhanced conversions and offline conversion delivery.'],['Attribution','Understand first-touch, last-touch and stitched full-path journeys across channels.'],['CRM Enrichment','Map acquisition source, behavior and interaction context into CRM records.'],['Offline Conversion Tracking','Match calls, WhatsApp and offline outcomes to click identifiers and first-party identities.'],['Audience Operations','Build activation and suppression segments from lifecycle stage, LTV and intent.']]
 return <div className="standalone-page resources-page"><div className="standalone-top"><Brand/><button onClick={back}>Back to website</button></div><section className="standalone-hero resources-hero"><span className="kicker">RESOURCES</span><h1>Implementation guides for the operating system behind paid growth.</h1><p>Documentation-style surfaces are included so the product can eventually support onboarding, implementation and self-service operations.</p></section><section className="resource-grid">{docs.map((x,i)=><article key={x[0]}><span>{String(i+1).padStart(2,'0')}</span><h3>{x[0]}</h3><p>{x[1]}</p><button>Read guide <ArrowRight/></button></article>)}</section></div>
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
 ['Overview',Gauge],['AdSync',RadioTower],['Funnel',BarChart3],['Events',Zap],['Live Sync',Activity],['Offline Attribution',PhoneCall],['Journeys',Network],['Attribution',PieChart],['Enrich',DatabaseZap],['Agents',Bot],['Integrations',Cable],['Audiences',UsersRound],['Monitoring',Activity],['Settings',Settings2]
] as const
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>}
function PageHead({crumb,title,sub,action}:{crumb:string,title:string,sub:string,action?:string}){return <div className="page-head"><div><span>{crumb}</span><h1>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary"><Sparkles/>{action}</button>}</div>}
function FunnelPanel(){const steps=[['All Leads',12842,100],['Qualified',7621,59],['Connected',5410,42],['Consultation',2314,18],['Enrolled',982,8]];return <div className="app-panel"><div className="panel-head"><div><h3>Complete funnel</h3><p>All sources · last 30 days</p></div><button>Campaign view</button></div>{steps.map((x,i)=><div className="funnel-row" key={x[0]}><div><span>{x[0]}</span><b>{x[1].toLocaleString()}</b></div><div className="progress"><i style={{width:x[2]+'%'}}/></div>{i<steps.length-1&&<small>{Math.round((steps[i+1][1]/x[1])*100)}% progression</small>}</div>)}</div>}

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
 <div className="app-panel event-editor"><div className="panel-head"><div><h3>{active}</h3><p>Transformation and delivery rules</p></div><button>Edit</button></div><div className="event-step"><span>1</span><div><b>Source condition</b><p>CRM stage changes to <strong>{active}</strong> and identity contains a valid first-party key.</p></div></div><div className="event-step"><span>2</span><div><b>Identity resolution</b><p>Resolve GCLID / FBCLID, hashed email, hashed phone and workspace customer ID.</p></div></div><div className="event-step"><span>3</span><div><b>Normalize & deduplicate</b><p>Apply event schema, revenue/value rules and deterministic event ID before delivery.</p></div></div><div className="event-step"><span>4</span><div><b>Activate</b><p>Send to configured ad-platform destinations and write delivery status to the audit stream.</p></div></div><div className="delivery-summary"><div><span>Median latency</span><b>42s</b></div><div><span>Match rate</span><b>94.8%</b></div><div><span>24h delivery</span><b>99.82%</b></div></div></div></div></>
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
 return <><PageHead crumb="Measurement / Journeys" title="Customer journey explorer" sub="Inspect the complete chronology for every lead across connected systems." action="Find journey"/>
 <div className="filters"><button>All sources <ChevronDown/></button><button>All stages <ChevronDown/></button><button>Last 30 days <ChevronDown/></button><div><Search/> Search phone, email, click ID...</div></div>
 <div className="journey-list">{[
 ['Aarav Sharma','Google Ads','Qualified','6 touchpoints','18m'],['Meera Patel','Meta Ads','Consultation','8 touchpoints','4h'],['Rohan Kumar','WhatsApp','Enrolled','11 touchpoints','2d'],['Anika Roy','Organic','Connected','4 touchpoints','31m']
 ].map((x,i)=><article key={x[0]}><div className="lead-avatar">{x[0].split(' ').map(s=>s[0]).join('')}</div><div><b>{x[0]}</b><small>{x[1]} · {x[3]}</small></div><span className="stage">{x[2]}</span><div className="mini-path"><i/><i/><i/><i className={i>1?'done':''}/><i className={i>2?'done':''}/></div><time>{x[4]}</time><ChevronRight/></article>)}</div></>
}
function Attribution(){
 return <><PageHead crumb="Measurement / Attribution" title="Full-path attribution" sub="Measure channel contribution using stitched journey evidence through closed revenue." action="Ask attribution question"/>
 <div className="stats-grid"><Stat label="Attributed revenue" value="₹2.84Cr" sub="+18.4%" Icon={CircleDollarSign}/><Stat label="Journeys stitched" value="92,418" sub="96.2% identity coverage" Icon={Network}/><Stat label="Revenue re-attributed" value="28.7%" sub="Beyond last-click" Icon={PieChart}/><Stat label="Average touches" value="5.4" sub="Before conversion" Icon={MousePointer2}/></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Channel contribution</h3><p>Share of measured closed revenue</p></div><button>Last 30 days</button></div>{[['Google Ads','₹1.18Cr',42],['Meta Ads','₹72.4L',26],['WhatsApp','₹39.1L',14],['Organic Search','₹30.6L',11],['Direct / Other','₹19.9L',7]].map(x=><div className="channel-line" key={x[0]}><b>{x[0]}</b><div className="progress"><i style={{width:x[2]+'%'}}/></div><span>{x[1]}</span><strong>{x[2]}%</strong></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Example revenue journey</h3><p>₹84,000 · five touches · two days</p></div><span className="status">Revenue matched</span></div><div className="touch-path">{['Google Search','Website','WhatsApp','Counsellor Call','Enrolment'].map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b>{i<4&&<ArrowRight/>}</div>)}</div></div></>
}
function Enrich(){
 return <><PageHead crumb="Module / Enrich" title="Lead context & grading" sub="Give sales the complete story the moment a lead enters the CRM." action="Configure enrichment"/>
 <div className="stats-grid"><Stat label="Leads enriched" value="12,842" sub="98.4% success" Icon={DatabaseZap}/><Stat label="High intent" value="3,106" sub="24.2% of leads" Icon={Target}/><Stat label="Avg response" value="1m 18s" sub="-34s this month" Icon={Activity}/><Stat label="Mapped fields" value="46" sub="CRM context fields" Icon={Layers3}/></div>
 <div className="two-col"><div className="app-panel profile-card"><div className="panel-head"><div><h3>Enriched lead profile</h3><p>Latest high-intent lead</p></div><span className="score">92 intent</span></div><div className="profile-avatar">AS</div><h3>Aarav Sharma</h3><p>Executive MBA · Delhi NCR</p><div className="profile-fields">{[['First touch','Google Ads'],['Campaign','MBA Search'],['Pages viewed','7'],['Pricing page','Visited 2×'],['WhatsApp','Started'],['Call','Connected'],['Last action','Brochure viewed'],['Predicted stage','Consultation']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div></div>
 <div className="app-panel"><div className="panel-head"><div><h3>Lead grading</h3><p>Rules + journey evidence</p></div></div>{[['High intent','3,106',24,'green'],['Medium intent','6,482',50,'amber'],['Low intent','3,254',26,'red']].map(x=><div className={'grade '+x[3]} key={x[0]}><div><b>{x[0]}</b><small>{x[1]} leads</small></div><strong>{x[2]}%</strong></div>)}<div className="ai-note"><Sparkles/><div><b>Why this lead scored 92</b><p>Pricing revisit, branded search, WhatsApp initiation and counsellor connection indicate strong purchase intent.</p></div></div></div></div></>
}
function Agents(){
 return <><PageHead crumb="Automation / Agents" title="Agent library" sub="Deploy specialist agents at each point where your funnel loses context or speed." action="Build custom agent"/><div className="agent-app-grid">{agents.map((a,i)=><article key={a[0]}><div><span className={i<7?'active-agent':''}>{i<7?'Active':'Available'}</span><Bot/></div><h3>{a[0]}</h3><p>{a[1]}</p><footer><small>{a[2]}</small><button>{i<7?'Manage':'Deploy'} <ChevronRight/></button></footer></article>)}</div></>
}
function Integrations(){
 const groups=[
  ['CRM Platforms',['Zoho CRM','Salesforce','LeadSquared','HubSpot','HighLevel','Microsoft Dynamics 365','Custom CRM']],
  ['WhatsApp & Marketing Platforms',['WhatsApp','WATI','Gupshup','MoEngage','CleverTap','BitSpeed','Gallabox']],
  ['Calling Platforms',['Exotel','Knowlarity','Tata Tele','MyOperator']],
  ['Website & App Platforms',['Shopify','WooCommerce','Magento','WordPress','React App','Custom Backend']],
  ['Advertising & Analytics',['Google Ads','Meta Ads','LinkedIn Ads','Microsoft Ads','GA4']]
 ]
 return <><PageHead crumb="Workspace / Integrations" title="Platform-agnostic connectivity" sub="Connect the systems you already use without rebuilding your stack." action="Request connector"/>
 <div className="integration-summary"><div><strong>100+</strong><span>available connector patterns</span></div><div><strong>1 click</strong><span>workspace connection flow</span></div><div><strong>24×7</strong><span>continuous synchronization</span></div><div><strong>Custom</strong><span>adapter support</span></div></div>
 <div className="integration-category-grid">{groups.map((g,gi)=><section className="integration-category" key={g[0] as string}><div className="integration-category-head"><div><span>{String(gi+1).padStart(2,'0')}</span><h3>{g[0]}</h3></div><small>{(g[1] as string[]).length} connectors shown</small></div><div className="integration-app-grid">{(g[1] as string[]).map((x,i)=><article key={x}><span className={'integration-logo c'+(i%6)}>{x.slice(0,2).toUpperCase()}</span><div><b>{x}</b><small>{(gi+i)%3===0?'Connected · syncing':'Connector available'}</small></div><span className={(gi+i)%3===0?'connected':'connect'}>{(gi+i)%3===0?'Connected':'Connect'}</span></article>)}</div></section>)}</div></>
}
function Audiences(){
 return <><PageHead crumb="Activation / Audiences" title="Audience management" sub="Activate high-intent segments and suppress low-value or converted users." action="New audience"/><div className="app-panel"><div className="panel-head"><div><h3>Active segments</h3><p>Synced to connected destinations</p></div><button>Export</button></div>{[
 ['High intent leads','3,106','Google Ads · Meta Ads','Every 5 min','Activate'],
 ['Converted / enrolled','18,204','Google Ads · Meta Ads · LinkedIn','Real time','Suppress'],
 ['Website visitors · 180d','82,416','Meta Ads','Hourly','Retarget'],
 ['WhatsApp leads','11,284','Google Ads · Meta Ads','Real time','Activate'],
 ['Low intent leads','24,901','Google Ads · Meta Ads','Daily','Suppress']
 ].map(x=><div className="audience-row" key={x[0]}><UsersRound/><div><b>{x[0]}</b><small>{x[2]}</small></div><strong>{x[1]}</strong><span>{x[3]}</span><em className={x[4].toLowerCase()}>{x[4]}</em><ChevronRight/></div>)}</div></>
}
function Monitoring(){
 return <><PageHead crumb="Operations / Monitoring" title="Platform monitoring" sub="Observe connector health, event delivery, sync latency and processing failures." action="Create alert"/>
 <div className="stats-grid"><Stat label="Platform status" value="Healthy" sub="All critical services" Icon={Activity}/><Stat label="Events / min" value="8,412" sub="Current throughput" Icon={Zap}/><Stat label="Failed events" value="0.18%" sub="Retry queue enabled" Icon={BarChart3}/><Stat label="P95 latency" value="1.7s" sub="Ingestion pipeline" Icon={Gauge}/></div>
 <div className="two-col"><div className="app-panel"><div className="panel-head"><div><h3>Connector uptime</h3><p>Last 24 hours</p></div><span className="healthy">99.98%</span></div>{['Google Ads','Meta Ads','Zoho CRM','WhatsApp','Exotel'].map((x,i)=><div className="monitor-row" key={x}><span>{x}</span><div className="spark-bars">{Array.from({length:18}).map((_,j)=><i key={j} className={(i===3&&j===11)?'warn':''}/>)}</div><b>{i===3?'99.91%':'100%'}</b></div>)}</div>
 <div className="app-panel"><div className="panel-head"><div><h3>Recent alerts</h3><p>Operational events</p></div></div>{[['Resolved','WhatsApp API rate limit recovered','12 min ago'],['Resolved','Google Ads token refreshed','48 min ago'],['Info','Audience sync completed','1h ago'],['Info','Daily attribution rebuild complete','3h ago']].map(x=><div className="alert-row" key={x[1]}><span className={x[0].toLowerCase()}>{x[0]}</span><div><b>{x[1]}</b><small>{x[2]}</small></div></div>)}</div></div></>
}
function Settings(){
 return <><PageHead crumb="Workspace / Settings" title="Workspace settings" sub="Configure organization, access, tracking, data governance and automation boundaries."/>
 <div className="settings-grid">{[
 ['Workspace profile','Organization details, timezone, currency and reporting defaults.',Building2],
 ['Users & roles','Owner, admin, analyst and operator access with scoped permissions.',UsersRound],
 ['Tracking configuration','Domain tracking, click-ID persistence and event naming.',MousePointer2],
 ['Data governance','Consent, retention, deletion, hashing and audit policies.',ShieldCheck],
 ['API & webhooks','API keys, outbound webhooks and internal system integrations.',Cable],
 ['Agent approvals','Choose which agent actions require human approval.',Bot],
 ['Notifications','Operational, performance and failure alert routing.',MessageCircle],
 ['Billing & usage','Connector, event, workspace and agent usage visibility.',CircleDollarSign]
 ].map(([t,p,I]:any)=><article key={t}><I/><div><h3>{t}</h3><p>{p}</p></div><ChevronRight/></article>)}</div></>
}
function Product({back}:{back:()=>void}){
 const [tab,setTab]=useState<AppTab>('Overview')
 const view=useMemo(()=>({Overview:<Overview/>,AdSync:<AdSync/>,Funnel:<Funnel/>,Events:<Events/>,"Live Sync":<LiveSync/>,"Offline Attribution":<OfflineAttribution/>,Journeys:<Journeys/>,Attribution:<Attribution/>,Enrich:<Enrich/>,Agents:<Agents/>,Integrations:<Integrations/>,Audiences:<Audiences/>,Monitoring:<Monitoring/>,Settings:<Settings/>}[tab]),[tab])
 return <div className="product"><aside><Brand/><div className="workspace"><span>AM</span><div><b>Ace EdTech</b><small>Production workspace</small></div><ChevronDown/></div><nav>{appTabs.map(([x,I])=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}><I/>{x}</button>)}</nav><div className="aside-footer"><button onClick={back}><ArrowRight/>Back to website</button><div className="profile-mini"><span>S</span><div><b>Sakshee</b><small>Workspace owner</small></div></div></div></aside>
 <main><header className="product-head"><div className="global-search"><Search/>Search journeys, leads, campaigns...</div><div><span className="sync">● Live sync healthy</span><button><Headphones/></button><button><Globe2/></button><span className="avatar-sm">S</span></div></header><div className="product-body">{view}</div></main></div>
}
export default function AcePlatform(){const[view,setView]=useState<View>('site');if(view==='login')return <Login back={()=>setView('site')} openApp={()=>setView('app')}/>;if(view==='pricing')return <Pricing back={()=>setView('site')} openApp={()=>setView('app')}/>;if(view==='demo')return <DemoPage back={()=>setView('site')} openApp={()=>setView('app')}/>;if(view==='company')return <CompanyPage back={()=>setView('site')} openDemo={()=>setView('demo')}/>;if(view==='resources')return <ResourcesPage back={()=>setView('site')}/>;return view==='site'?<Marketing openApp={()=>setView('app')} openLogin={()=>setView('login')} openPricing={()=>setView('pricing')} openDemo={()=>setView('demo')} openCompany={()=>setView('company')} openResources={()=>setView('resources')}/>:<Product back={()=>setView('site')}/>}
