// @ts-nocheck
import { useMemo, useState } from 'react'
import {
  Activity, ArrowRight, BarChart3, Bot, Cable, Check, ChevronRight,
  CircleDollarSign, DatabaseZap, Gauge, Layers3, Menu, MousePointer2,
  Network, PhoneCall, PieChart, RadioTower, Search, Settings2, ShieldCheck,
  Sparkles, Target, UsersRound, WandSparkles, X, Zap
} from 'lucide-react'

type View = 'site' | 'app'
type Module = 'Overview' | 'AdSync' | 'Klarity' | 'Enrich' | 'Agents' | 'Integrations' | 'Audiences'

const agentData = [
  ['Meta Advanced CAPI', 'Server-side conversions with deduplication and higher event coverage.', 'Signal'],
  ['Google ECL / OCI', 'Enhanced conversions and offline conversion imports tied to click IDs.', 'Signal'],
  ['Call Tracking Events', 'Map inbound calls back to campaign, keyword and source.', 'Conversion'],
  ['Custom Integration', 'Build conversion pipelines for CRMs, ad platforms and custom sources.', 'Data'],
  ['Lead Grading', 'Score and prioritize leads using journey and CRM context.', 'AI'],
  ['CRM Enrichment', 'Attach source, browsing, campaign and interaction context to every lead.', 'Data'],
  ['Voice Lead Qualification', 'Call new leads quickly, qualify intent and route sales-ready prospects.', 'AI'],
  ['Voice Scheduler', 'Book meetings with qualified leads and sync them to team calendars.', 'AI'],
  ['Meeting Reminder', 'Re-engage scheduled leads before appointments to reduce drop-off.', 'Conversion'],
  ['Feedback Agent', 'Collect structured post-interaction feedback and objections.', 'AI'],
  ['Ask Ace', 'Query stitched journey and attribution data in natural language.', 'Insights'],
]

const integrations = ['Google Ads','Meta Ads','LinkedIn Ads','Bing Ads','Zoho CRM','Salesforce','HubSpot','LeadSquared','WhatsApp','WATI','Exotel','Knowlarity','Shopify','WooCommerce','WordPress','GA4']

const navItems: {label: Module, icon: any}[] = [
  { label: 'Overview', icon: Gauge },
  { label: 'AdSync', icon: RadioTower },
  { label: 'Klarity', icon: PieChart },
  { label: 'Enrich', icon: DatabaseZap },
  { label: 'Agents', icon: Bot },
  { label: 'Integrations', icon: Cable },
  { label: 'Audiences', icon: UsersRound },
]

function Brand({inverse=false}:{inverse?:boolean}) {
  return <div className={"brand "+(inverse?'inverse':'')}>
    <span className="brand-bars"><i/><i/><i/></span>
    <span>AceMarketing</span>
  </div>
}

function SiteHeader({onOpenApp}:{onOpenApp:()=>void}) {
  const [open,setOpen]=useState(false)
  return <header className="site-header">
    <Brand inverse/>
    <nav className={open?'open':''}>
      <a href="#solutions">Solutions</a>
      <a href="#agents">Agents</a>
      <a href="#integrations">Integrations</a>
      <a href="#results">Results</a>
      <a href="#security">Security</a>
      <button className="nav-link" onClick={onOpenApp}>Open product</button>
      <a className="demo-btn" href="#demo">Get a demo <ArrowRight size={15}/></a>
    </nav>
    <button className="menu-btn" onClick={()=>setOpen(v=>!v)}>{open?<X/>:<Menu/>}</button>
  </header>
}

function MarketingSite({onOpenApp}:{onOpenApp:()=>void}) {
  return <div className="marketing">
    <div className="hero-shell">
      <SiteHeader onOpenApp={onOpenApp}/>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">FIRST-PARTY GROWTH INFRASTRUCTURE</span>
          <h1>Generate and convert<br/><em>more leads</em> from paid<br/>advertising.</h1>
          <p>Connect every source, CRM, call, chat and offline outcome into one journey. Activate clean signals, enrich each lead, and measure what truly drives revenue.</p>
          <div className="hero-actions">
            <button className="primary" onClick={onOpenApp}>Explore the platform <ArrowRight size={18}/></button>
            <a className="secondary" href="#solutions">See how it works</a>
          </div>
          <div className="proof-row">
            <span><Check/> Server-side conversion signals</span>
            <span><Check/> Journey-level attribution</span>
            <span><Check/> 24×7 automation</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="orb orb1"/>
          <div className="orb orb2"/>
          <div className="journey-card">
            <div className="card-title"><span>Live customer journey</span><span className="live">● LIVE</span></div>
            {[
              ['Google Ad','gclid captured','Now'],
              ['Landing page','High-intent visit','+12s'],
              ['WhatsApp','Conversation started','+1m'],
              ['CRM','Qualified lead','+6m'],
              ['Revenue','₹84,000 enrolled','+2d'],
            ].map((r,i)=><div className="journey-row" key={r[0]}>
              <span className={'journey-dot d'+i}/><div><b>{r[0]}</b><small>{r[1]}</small></div><time>{r[2]}</time>
            </div>)}
          </div>
          <div className="signal-card"><Zap size={18}/><div><b>Signal returned</b><small>Qualified Lead → Google Ads</small></div></div>
        </div>
      </section>
    </div>

    <section className="metric-strip">
      <div><strong>Click</strong><span>Capture source & identifiers</span></div><ChevronRight/>
      <div><strong>Signal</strong><span>Activate clean outcomes</span></div><ChevronRight/>
      <div><strong>Lead</strong><span>Enrich & qualify instantly</span></div><ChevronRight/>
      <div><strong>Revenue</strong><span>Measure full-path impact</span></div>
    </section>

    <section className="section" id="solutions">
      <div className="section-heading">
        <span className="eyebrow dark">ONE PLATFORM · THREE CORE MODULES</span>
        <h2>Every leakage between click and revenue, covered.</h2>
        <p>A unified operating layer for signal activation, lead context and attribution.</p>
      </div>
      <div className="module-grid">
        <article className="module-card purple">
          <RadioTower/><span>01 · SIGNAL</span><h3>AdSync</h3>
          <p>Send real business outcomes back to ad platforms server-side. Persist click IDs, import offline conversions, build audiences and sync continuously.</p>
          <ul><li>Meta CAPI</li><li>Google ECL / OCI</li><li>Call & WhatsApp tracking</li><li>Audience sync & suppression</li></ul>
        </article>
        <article className="module-card teal">
          <PieChart/><span>02 · ATTRIBUTION</span><h3>Klarity</h3>
          <p>Stitch online and offline touchpoints into a session-by-session journey and attribute revenue using measured path evidence.</p>
          <ul><li>Full-path journeys</li><li>Channel & campaign views</li><li>Revenue match-back</li><li>Ask Ace analytics</li></ul>
        </article>
        <article className="module-card blue">
          <DatabaseZap/><span>03 · CONTEXT</span><h3>Enrich</h3>
          <p>Give sales the complete story when a lead arrives — source, ads, pages, conversations, qualification and propensity signals.</p>
          <ul><li>CRM context</li><li>Lead grading</li><li>Identity stitching</li><li>Sales-ready profiles</li></ul>
        </article>
      </div>
    </section>

    <section className="dark-section" id="agents">
      <div className="section-heading light">
        <span className="eyebrow">AUTONOMOUS FUNNEL OPERATIONS</span>
        <h2>11 agents. Every handoff covered.</h2>
        <p>Deploy ready-made agents across signal, qualification, routing, follow-up, scheduling and measurement.</p>
      </div>
      <div className="agent-grid">
        {agentData.map((a,i)=><article className="agent-card" key={a[0]}>
          <span className="agent-num">{String(i+1).padStart(2,'0')}</span>
          <div className="agent-icon"><Bot/></div>
          <h3>{a[0]}</h3><p>{a[1]}</p><span className="pill">{a[2]}</span>
        </article>)}
      </div>
    </section>

    <section className="section integrations-section" id="integrations">
      <div className="section-heading">
        <span className="eyebrow dark">CONNECTIVITY</span>
        <h2>Connect the stack you already use.</h2>
        <p>Marketing, CRM, calling, messaging, commerce and analytics — brought into one workspace.</p>
      </div>
      <div className="integration-cloud">
        {integrations.map((i,idx)=><div className="integration-chip" key={i}><span className={'logo-badge c'+idx%6}>{i.slice(0,2).toUpperCase()}</span>{i}<Check size={16}/></div>)}
      </div>
    </section>

    <section className="results-section" id="results">
      <div className="section-heading light"><span className="eyebrow">FROM SIGNAL TO OUTCOME</span><h2>Built for performance teams with complex funnels.</h2></div>
      <div className="results-grid">
        <article><strong>24×7</strong><span>continuous event sync</span><p>CRM, call and chat outcomes flow back into the campaign optimization loop continuously.</p></article>
        <article><strong>1 view</strong><span>for every funnel stage</span><p>Compare leads, qualified leads, appointments, bookings and revenue at channel and campaign level.</p></article>
        <article><strong>100+</strong><span>integration-ready sources</span><p>Connect standard tools quickly and extend the platform with custom adapters when needed.</p></article>
        <article><strong>Full path</strong><span>measured attribution</span><p>See the touchpoints that preceded revenue instead of relying only on isolated last-click reports.</p></article>
      </div>
    </section>

    <section className="security-section" id="security">
      <ShieldCheck size={42}/>
      <div><span className="eyebrow dark">ENTERPRISE DATA CONTROLS</span><h2>Your first-party data stays under your control.</h2><p>Consent-aware collection, secure transport, role-based access, auditability and configurable retention are first-class platform capabilities.</p></div>
      <div className="security-badges"><span>ISO-ready</span><span>SHA-256</span><span>GDPR</span><span>DPDP</span></div>
    </section>

    <section className="cta" id="demo"><span className="eyebrow">SEE THE WHOLE JOURNEY</span><h2>Stop optimizing on form fills.<br/>Start optimizing on outcomes.</h2><button onClick={onOpenApp}>Open interactive product <ArrowRight/></button></section>
    <footer><Brand inverse/><span>© 2026 AceMarketing. Product implementation inspired by modern first-party marketing platforms.</span></footer>
  </div>
}

function Stat({label,value,delta,icon:Icon}:{label:string,value:string,delta:string,icon:any}){
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><Icon size={18}/></div><strong>{value}</strong><small>{delta}</small></article>
}

function Funnel(){
  const steps=[['All leads',12842,100],['Qualified',7621,59],['Connected',5410,42],['Appointment',2314,18],['Booked',982,8]]
  return <div className="panel"><div className="panel-head"><div><h3>Live funnel</h3><p>All sources · last 30 days</p></div><button>Campaign view</button></div>
    <div className="funnel">{steps.map((s,i)=><div key={s[0]} className="funnel-step"><div className="funnel-label"><span>{s[0]}</span><b>{s[1].toLocaleString()}</b></div><div className="bar"><i style={{width:s[2]+'%'}}/></div>{i<steps.length-1&&<small>{Math.round((steps[i+1][1]/s[1])*100)}% progressed</small>}</div>)}</div>
  </div>
}

function Overview(){
  return <><div className="page-title"><div><span>Workspace / Overview</span><h1>Good afternoon, Sakshee</h1><p>Here is what your acquisition system is doing right now.</p></div><button className="primary small"><WandSparkles size={16}/> Ask Ace</button></div>
    <div className="stats"><Stat label="Revenue attributed" value="₹2.84Cr" delta="+18.4% vs previous period" icon={CircleDollarSign}/><Stat label="Qualified leads" value="7,621" delta="+12.1% lead quality" icon={Target}/><Stat label="Signal coverage" value="94.8%" delta="+4.7% event match" icon={Activity}/><Stat label="Active automations" value="27" delta="All systems healthy" icon={Bot}/></div>
    <div className="dash-grid"><Funnel/><div className="panel"><div className="panel-head"><div><h3>Signal health</h3><p>Platform event coverage</p></div><span className="health">Healthy</span></div>
      {['Google Ads','Meta Ads','LinkedIn Ads','CRM outcomes'].map((x,i)=><div className="health-row" key={x}><span>{x}</span><div className="mini-bar"><i style={{width:[96,94,89,98][i]+'%'}}/></div><b>{[96,94,89,98][i]}%</b></div>)}
      <div className="insight"><Sparkles/><div><b>Optimization insight</b><p>Qualified-lead signal is reaching Google Ads 18 minutes faster than last week.</p></div></div>
    </div></div>
    <div className="panel"><div className="panel-head"><div><h3>Recent journey events</h3><p>Unified online + offline stream</p></div><button>View all</button></div>
      <table><thead><tr><th>Lead</th><th>Source</th><th>Event</th><th>Campaign</th><th>Value</th><th>Status</th></tr></thead><tbody>
      {[['Aarav S.','Google Ads','Qualified','MBA Search - Brand','₹0','Synced'],['Meera P.','Meta Ads','Appointment booked','Executive Program','₹0','Synced'],['Rohan K.','WhatsApp','Enrollment','PGDM Retargeting','₹84,000','Revenue matched'],['Anika R.','Organic','Sales connected','—','₹0','Enriched']].map(r=><tr key={r[0]}>{r.map((v,i)=><td key={i}>{i===5?<span className="status">{v}</span>:v}</td>)}</tr>)}</tbody></table>
    </div>
  </>
}

function AdSync(){
  return <><div className="page-title"><div><span>Module / AdSync</span><h1>Signal activation</h1><p>Return qualified outcomes to ad platforms in real time.</p></div><button className="primary small"><Zap size={16}/> Create event</button></div>
  <div className="stats"><Stat label="Events sent today" value="248,916" delta="+8.2% daily volume" icon={RadioTower}/><Stat label="Match rate" value="94.8%" delta="Across destinations" icon={Target}/><Stat label="Median latency" value="42s" delta="Click-to-platform signal" icon={Activity}/><Stat label="Suppressed users" value="18,204" delta="Saved from re-targeting" icon={UsersRound}/></div>
  <div className="panel"><div className="panel-head"><div><h3>Conversion pipelines</h3><p>Continuous server-side synchronization</p></div><button>+ Add pipeline</button></div>
  {[
    ['Qualified Lead','CRM → Google Ads','Enhanced Conversion for Leads','Live','96.1%'],
    ['Enrollment','CRM → Meta Ads','Conversions API','Live','95.4%'],
    ['WhatsApp Started','WATI → Google Ads','Offline Conversion Import','Live','91.8%'],
    ['Call Connected','Exotel → Meta Ads','Conversions API','Live','93.2%'],
  ].map(r=><div className="pipeline" key={r[0]}><span className="event-icon"><Zap/></span><div><b>{r[0]}</b><small>{r[1]}</small></div><span>{r[2]}</span><span className="live-tag">{r[3]}</span><b>{r[4]}</b><ChevronRight/></div>)}</div>
  <div className="dash-grid"><Funnel/><div className="panel"><div className="panel-head"><div><h3>Identifier coverage</h3><p>Click IDs & first-party identifiers</p></div></div>{[['GCLID',97],['FBCLID',94],['Hashed email',88],['Hashed phone',91]].map(x=><div className="coverage" key={x[0] as string}><div><span>{x[0]}</span><b>{x[1]}%</b></div><div className="bar"><i style={{width:x[1]+'%'}}/></div></div>)}</div></div></>
}

function Klarity(){
  return <><div className="page-title"><div><span>Module / Klarity</span><h1>Full-path attribution</h1><p>Understand the customer journey session by session, from first touch to revenue.</p></div><button className="primary small"><Search size={16}/> Ask about attribution</button></div>
  <div className="stats"><Stat label="Attributed revenue" value="₹2.84Cr" delta="+18.4% vs prior period" icon={CircleDollarSign}/><Stat label="Journeys stitched" value="92,418" delta="96.2% identity coverage" icon={Network}/><Stat label="Revenue re-attributed" value="28.7%" delta="Beyond last-click" icon={PieChart}/><Stat label="Avg. touches" value="5.4" delta="Before conversion" icon={MousePointer2}/></div>
  <div className="panel"><div className="panel-head"><div><h3>Channel contribution</h3><p>Measured journey contribution to closed revenue</p></div><button>Last 30 days</button></div>
  {[['Google Ads','₹1.18Cr',42],['Meta Ads','₹72.4L',26],['WhatsApp','₹39.1L',14],['Organic Search','₹30.6L',11],['Direct / Other','₹19.9L',7]].map(r=><div className="channel-row" key={r[0]}><b>{r[0]}</b><div className="bar"><i style={{width:r[2]+'%'}}/></div><span>{r[1]}</span><strong>{r[2]}%</strong></div>)}</div>
  <div className="panel journey-detail"><div className="panel-head"><div><h3>Example closed journey</h3><p>Revenue ₹84,000 · 5 touchpoints · 2 days</p></div><span className="status">Revenue matched</span></div><div className="touches">{['Google Search Ad','Website Visit','WhatsApp Chat','Counselor Call','Enrollment'].map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b>{i<4&&<ArrowRight/>}</div>)}</div></div></>
}

function Enrich(){
  return <><div className="page-title"><div><span>Module / Enrich</span><h1>Sales-ready lead context</h1><p>Attach campaign, behavioral and conversation context to every CRM record.</p></div><button className="primary small"><Layers3 size={16}/> Configure fields</button></div>
  <div className="stats"><Stat label="Leads enriched" value="12,842" delta="98.4% successful" icon={DatabaseZap}/><Stat label="High-intent" value="3,106" delta="24.2% of new leads" icon={Target}/><Stat label="Avg. response" value="1m 18s" delta="-34s this month" icon={Activity}/><Stat label="CRM fields" value="46" delta="Mapped automatically" icon={Layers3}/></div>
  <div className="dash-grid"><div className="panel lead-profile"><div className="panel-head"><div><h3>Enriched lead profile</h3><p>Latest high-intent lead</p></div><span className="score">92 intent</span></div><div className="avatar">AS</div><h3>Aarav Sharma</h3><p>Executive MBA · Delhi NCR</p><div className="profile-grid">{[['First touch','Google Ads'],['Campaign','MBA Search - Brand'],['Pages viewed','7'],['Pricing page','Visited 2×'],['WhatsApp','Started'],['Call status','Connected'],['Last action','Brochure viewed'],['Predicted stage','Consultation']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div></div>
  <div className="panel"><div className="panel-head"><div><h3>Lead grading</h3><p>Rule + model driven prioritization</p></div></div>{[['High intent',3106,24],['Medium intent',6482,50],['Low intent',3254,26]].map((x,i)=><div className={'grade g'+i} key={x[0] as string}><div><b>{x[0]}</b><span>{Number(x[1]).toLocaleString()} leads</span></div><strong>{x[2]}%</strong></div>)}<div className="insight"><Sparkles/><div><b>Why Aarav scored 92</b><p>Pricing revisit, WhatsApp initiation, branded search and counselor connection increased purchase intent.</p></div></div></div></div></>
}

function Agents(){
  return <><div className="page-title"><div><span>Automation / Agents</span><h1>Funnel agents</h1><p>Deploy specialized automations across the customer journey.</p></div><button className="primary small"><Bot size={16}/> Build custom agent</button></div><div className="app-agent-grid">{agentData.map((a,i)=><article className="app-agent" key={a[0]}><div className="app-agent-top"><span className={'agent-state '+(i<7?'on':'')}>{i<7?'Active':'Available'}</span><Bot/></div><h3>{a[0]}</h3><p>{a[1]}</p><div><span className="pill">{a[2]}</span><button>{i<7?'Manage':'Deploy'} <ChevronRight size={14}/></button></div></article>)}</div></>
}

function Integrations(){
  return <><div className="page-title"><div><span>Workspace / Integrations</span><h1>Connected ecosystem</h1><p>Bring marketing, CRM, calling, messaging and commerce data into one system.</p></div><button className="primary small"><Cable size={16}/> Request integration</button></div><div className="integration-app-grid">{integrations.map((x,i)=><article key={x}><span className={'big-logo c'+i%6}>{x.slice(0,2).toUpperCase()}</span><div><b>{x}</b><small>{i<9?'Connected · syncing now':'Available connector'}</small></div><span className={i<9?'connected':'available'}>{i<9?'Connected':'Connect'}</span></article>)}</div></>
}

function Audiences(){
  return <><div className="page-title"><div><span>Activation / Audiences</span><h1>Audience management</h1><p>Activate high-value segments and suppress users who should not be targeted.</p></div><button className="primary small"><UsersRound size={16}/> New audience</button></div><div className="panel"><div className="panel-head"><div><h3>Active segments</h3><p>Synced across connected ad platforms</p></div><button>Export</button></div>{[
    ['High intent leads','3,106','Google Ads · Meta Ads','Every 5 min','Activate'],
    ['Converted / enrolled','18,204','Google Ads · Meta Ads · LinkedIn','Real time','Suppress'],
    ['Website visitors · 180d','82,416','Meta Ads','Hourly','Retarget'],
    ['WhatsApp leads','11,284','Google Ads · Meta Ads','Real time','Activate'],
    ['Low intent leads','24,901','Google Ads · Meta Ads','Daily','Suppress'],
  ].map(r=><div className="audience-row" key={r[0]}><UsersRound/><div><b>{r[0]}</b><small>{r[2]}</small></div><strong>{r[1]}</strong><span>{r[3]}</span><span className={'audience-mode '+r[4].toLowerCase()}>{r[4]}</span><ChevronRight/></div>)}</div></>
}

function ProductApp({onBack}:{onBack:()=>void}){
  const [active,setActive]=useState<Module>('Overview')
  const content=useMemo(()=>({Overview:<Overview/>,AdSync:<AdSync/>,Klarity:<Klarity/>,Enrich:<Enrich/>,Agents:<Agents/>,Integrations:<Integrations/>,Audiences:<Audiences/>}[active]),[active])
  return <div className="product-app"><aside><Brand inverse/><div className="workspace-switch"><span>AM</span><div><b>Ace EdTech</b><small>Production workspace</small></div><ChevronRight size={16}/></div><nav>{navItems.map(({label,icon:Icon})=><button className={active===label?'active':''} key={label} onClick={()=>setActive(label)}><Icon size={18}/>{label}</button>)}</nav><div className="aside-bottom"><button><Settings2/> Workspace settings</button><button onClick={onBack}><ArrowRight className="rotate"/> Back to website</button></div></aside><main><header className="app-header"><div className="search"><Search size={17}/>Search journeys, leads, campaigns...</div><div className="app-head-right"><span className="sync-dot"/>Live sync healthy <button className="icon-btn"><Activity size={18}/></button><span className="user-avatar">S</span></div></header><div className="app-content">{content}</div></main></div>
}

export default function App(){
  const [view,setView]=useState<View>('site')
  return view==='site'?<MarketingSite onOpenApp={()=>setView('app')}/>:<ProductApp onBack={()=>setView('site')}/>
}
