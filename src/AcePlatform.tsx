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

type View='site'|'app'|'login'
type AppTab='Overview'|'AdSync'|'Events'|'Journeys'|'Attribution'|'Enrich'|'Agents'|'Integrations'|'Audiences'|'Monitoring'|'Settings'

const agents=[
 ['Meta Advanced CAPI','Return qualified outcomes to Meta server-side with deduplication.','Signal return','25–40% ROAS'],
 ['Google ECL / OCI','Send enhanced and offline conversions back to Google Ads.','Signal return','Lower CPQL'],
 ['Call Tracking Events','Attribute inbound calls to campaign, ad and keyword context.','Signal return','More call attribution'],
 ['Custom Integration','Connect custom CRMs, ad platforms and internal data sources.','Data','Any stack'],
 ['Lead Grading','Score and prioritize leads from journey and CRM evidence.','Conversion','Higher close rate'],
 ['CRM Enrichment','Attach acquisition, behavior and interaction context to each record.','Conversion','Less research'],
 ['Voice Lead Qualification','Call inbound leads quickly and qualify intent conversationally.','Conversion','Faster speed-to-lead'],
 ['Voice Scheduler','Book meetings for qualified leads and synchronize calendars.','Conversion','More bookings'],
 ['Meeting Reminder','Re-engage scheduled leads before appointments to reduce drop-off.','Conversion','Pipeline recovery'],
 ['Feedback Agent','Collect post-interaction feedback and surface objections.','Conversion','More feedback'],
 ['Ask Ace','Ask journey, funnel and attribution questions in plain language.','Visibility','Instant analysis']
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
function Header({openApp,openLogin}:{openApp:()=>void,openLogin:()=>void}){
 const [open,setOpen]=useState(false)
 return <header className="marketing-header"><Brand/><nav className={open?'mobile-open':''}>
  <a href="#platform">Platform</a><a href="#problems">Use cases</a><a href="#agents">Agents</a><a href="#integrations">Integrations</a><a href="#industries">Industries</a><a href="#proof">Proof</a>
  <button className="ghost-nav" onClick={openLogin}>Login</button><button className="ghost-nav" onClick={openApp}>Open product</button><a href="#demo" className="header-cta">Book a demo <ArrowRight size={15}/></a>
 </nav><button className="menu-toggle" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></header>
}
function Marketing({openApp,openLogin}:{openApp:()=>void,openLogin:()=>void}){
 return <div className="marketing-page">
  <section className="hero-wrap">
   <Header openApp={openApp} openLogin={openLogin}/>
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

  <section className="agents-section" id="agents">
   <div className="section-title light"><span className="kicker">AGENTS</span><h2>11 specialized agents across the funnel.</h2><p>Activate only the agents your workflow needs, with shared context from the same stitched journey.</p></div>
   <div className="agent-showcase">{agents.map((a,i)=><article key={a[0]}><div><span>{String(i+1).padStart(2,'0')}</span><Bot/></div><h3>{a[0]}</h3><p>{a[1]}</p><footer><small>{a[2]}</small><b>{a[3]}</b></footer></article>)}</div>
  </section>

  <section className="section white" id="integrations">
   <div className="section-title"><span className="kicker dark">CONNECTIVITY</span><h2>Keep the tools your teams already use.</h2><p>Standard connectors and custom adapters bring data into one workspace without replacing the existing stack.</p></div>
   <div className="integration-grid">{integrations.map((x,i)=><article key={x}><span className={'integration-logo c'+(i%6)}>{x.slice(0,2).toUpperCase()}</span><b>{x}</b><Check/></article>)}</div>
  </section>

  <section className="industry-section" id="industries">
   <div className="section-title"><span className="kicker dark">INDUSTRIES</span><h2>Designed for long, multi-touch customer journeys.</h2></div>
   <div className="industry-grid">{industries.map((x,i)=><article key={x[0]}><span>{String(i+1).padStart(2,'0')}</span><Building2/><h3>{x[0]}</h3><p>{x[1]}</p><ArrowRight/></article>)}</div>
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

  <section className="diagnostics-section">
   <div className="section-title"><span className="kicker dark">DIAGNOSE THE ROOT CAUSE</span><h2>Your campaigns can only learn from the data they receive.</h2><p>Use a single diagnostic layer to separate media problems from tracking, data-quality and operational funnel issues.</p></div>
   <div className="diagnostic-grid">
    <article><Activity/><h3>Business & operational impact</h3><ul><li>Rising acquisition cost with unclear lead quality</li><li>Different teams reporting different numbers</li><li>Slow handoffs between marketing and sales</li><li>Budget decisions without end-to-end evidence</li></ul></article>
    <article><Network/><h3>Tracking & data quality</h3><ul><li>Broken or duplicated conversion events</li><li>Cross-domain and chatbot tracking gaps</li><li>Missing click identifiers on offline outcomes</li><li>No consistent source of truth for funnel stages</li></ul></article>
    <article><Target/><h3>Ad optimization</h3><ul><li>Algorithms learning from low-value form fills</li><li>Qualified outcomes arriving too late</li><li>Converted users still being retargeted</li><li>Insufficient first-party conversion coverage</li></ul></article>
   </div>
  </section>

  <section className="security-band"><ShieldCheck/><div><span className="kicker dark">DATA CONTROLS</span><h2>Enterprise-ready governance foundation.</h2><p>Consent-aware collection, hashed identifiers, role-based permissions, audit logging, configurable retention and monitored event delivery are part of the implementation plan.</p></div><div className="badges"><span>RBAC</span><span>Audit Logs</span><span>Encryption</span><span>Retention</span></div></section>

  <DemoSection openApp={openApp}/>
  <footer className="marketing-footer"><Brand/><p>AceMarketing · first-party growth operating system.</p></footer>
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
 ['Overview',Gauge],['AdSync',RadioTower],['Events',Zap],['Journeys',Network],['Attribution',PieChart],['Enrich',DatabaseZap],['Agents',Bot],['Integrations',Cable],['Audiences',UsersRound],['Monitoring',Activity],['Settings',Settings2]
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
 <div className="two-col"><FunnelPanel/><div className="app-panel"><div className="panel-head"><div><h3>Identifier coverage</h3><p>First-party identifiers and click IDs</p></div></div>{[['GCLID',97],['FBCLID',94],['Hashed email',88],['Hashed phone',91]].map(x=><div className="coverage" key={x[0]}><div><span>{x[0]}</span><b>{x[1]}%</b></div><div className="progress"><i style={{width:x[1]+'%'}}/></div></div>)}</div></div></>
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
 return <><PageHead crumb="Workspace / Integrations" title="Connected ecosystem" sub="Marketing, CRM, messaging, calling, commerce and analytics connectors." action="Request connector"/><div className="integration-app-grid">{integrations.map((x,i)=><article key={x}><span className={'integration-logo c'+(i%6)}>{x.slice(0,2).toUpperCase()}</span><div><b>{x}</b><small>{i<12?'Connected · syncing':'Connector available'}</small></div><span className={i<12?'connected':'connect'}>{i<12?'Connected':'Connect'}</span></article>)}</div></>
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
 const view=useMemo(()=>({Overview:<Overview/>,AdSync:<AdSync/>,Events:<Events/>,Journeys:<Journeys/>,Attribution:<Attribution/>,Enrich:<Enrich/>,Agents:<Agents/>,Integrations:<Integrations/>,Audiences:<Audiences/>,Monitoring:<Monitoring/>,Settings:<Settings/>}[tab]),[tab])
 return <div className="product"><aside><Brand/><div className="workspace"><span>AM</span><div><b>Ace EdTech</b><small>Production workspace</small></div><ChevronDown/></div><nav>{appTabs.map(([x,I])=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}><I/>{x}</button>)}</nav><div className="aside-footer"><button onClick={back}><ArrowRight/>Back to website</button><div className="profile-mini"><span>S</span><div><b>Sakshee</b><small>Workspace owner</small></div></div></div></aside>
 <main><header className="product-head"><div className="global-search"><Search/>Search journeys, leads, campaigns...</div><div><span className="sync">● Live sync healthy</span><button><Headphones/></button><button><Globe2/></button><span className="avatar-sm">S</span></div></header><div className="product-body">{view}</div></main></div>
}
export default function AcePlatform(){const[view,setView]=useState<View>('site');if(view==='login')return <Login back={()=>setView('site')} openApp={()=>setView('app')}/>;return view==='site'?<Marketing openApp={()=>setView('app')} openLogin={()=>setView('login')}/>:<Product back={()=>setView('site')}/>}
