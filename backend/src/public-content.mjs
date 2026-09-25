export const publicNavigation = {
  top: [
    { key: 'industries', label: 'Industries', route: '#/industries', mega: true },
    { key: 'agents', label: 'Agents', route: '#/agents', mega: true },
    { key: 'case-studies', label: 'Case Studies', route: '#/case-studies', mega: false },
    { key: 'integrations', label: 'Integrations', route: '#/integrations', mega: false },
    { key: 'pricing', label: 'Pricing', route: '#/pricing', mega: false },
    { key: 'resources', label: 'Resources', route: '#/resources', mega: true },
  ],
  industries: [
    { name:'Edtech', summary:'Follow the learner journey from acquisition through counselling and enrolment.' },
    { name:'Fintech', summary:'Connect acquisition and conversion signals while preserving strict governance controls.' },
    { name:'Healthcare', summary:'Measure assisted patient journeys with privacy-aware first-party workflows.' },
    { name:'Retail', summary:'Link digital discovery, CRM activity, and offline purchase outcomes.' },
    { name:'Home Improvement', summary:'Connect enquiries, calls, visits, quotations, and project bookings.' },
    { name:'Travel', summary:'Measure discovery, assisted sales, and booking activity across channels.' },
    { name:'Consumer Goods', summary:'Use purchase and customer context to improve media efficiency and repeat demand.' },
  ],
  agents: [
    { name:'Call Tracking Events', summary:'Connect inbound calls to campaign and click context.' },
    { name:'Meta Advanced CAPI', summary:'Return verified conversion outcomes server-side with deduplication.' },
    { name:'Google ECL / OCI', summary:'Connect clicks to qualified and closed business outcomes.' },
    { name:'Custom Integration', summary:'Create normalized pipelines for proprietary systems.' },
    { name:'Lead Grading', summary:'Score and prioritize leads using shared journey evidence.' },
    { name:'CRM Enrichment', summary:'Attach acquisition and journey context before sales follow-up.' },
    { name:'Voice Lead Qualification', summary:'Qualify inbound demand and route sales-ready prospects.' },
    { name:'Voice Scheduler', summary:'Coordinate meeting booking for qualified prospects.' },
    { name:'Meeting Reminder', summary:'Reduce no-shows with contextual reminder workflows.' },
    { name:'Feedback Agent', summary:'Capture objections and post-interaction feedback.' },
    { name:'Ask Ace', summary:'Query journey and attribution evidence in natural language.' },
  ],
  resources: [
    { name:'About Us', summary:'How AceMarketing approaches connected growth operations.', target:'company' },
    { name:'Blogs', summary:'Practical thinking on measurement, activation, and first-party data.', target:'resources' },
    { name:'Ebooks', summary:'Long-form implementation and strategy guides.', target:'resources' },
    { name:'Hash Utility', summary:'Prepare first-party identifiers before activation.', target:'resources' },
    { name:'ROAS Calculator', summary:'Model advertising return and media efficiency.', target:'resources' },
    { name:'Documentation', summary:'Product architecture and implementation guidance.', target:'resources' },
  ],
  footer: {
    platform: [
      { label:'Data activation', target:'workspace' },
      { label:'Data enrichment', target:'workspace' }
    ],
    solutions: [
      { label:'Lead generation', target:'solutions' },
      { label:'Enterprise', target:'solutions' },
      { label:'Mid-market teams', target:'solutions' },
      { label:'Attribution', target:'solutions' },
      { label:'Alerts & monitoring', target:'workspace' },
      { label:'Server-to-server integration', target:'integrations' }
    ],
    resources: [
      { label:'About AceMarketing', target:'company' },
      { label:'Use cases', target:'resources' },
      { label:'Blogs', target:'resources' },
      { label:'Ebooks', target:'resources' },
      { label:'Hash utility', target:'resources' },
      { label:'Documentation', target:'resources' },
      { label:'Contact', target:'demo' }
    ]
  }
}

export const publicIndustries = [
  {name:'Edtech',summary:'Connect acquisition, counselling, calls, messaging and enrolment into one measurable learner journey.',outcomes:['Lead quality','Counsellor context','Enrolment attribution']},
  {name:'Fintech',summary:'Bring approved acquisition and customer signals together with strict controls around identity and activation.',outcomes:['Qualified demand','Compliant activation','Revenue feedback']},
  {name:'Healthcare',summary:'Measure patient acquisition and assisted journeys with privacy-aware first-party workflows.',outcomes:['Source visibility','Call attribution','Consent-aware measurement']},
  {name:'Retail',summary:'Link paid media, ecommerce, CRM and offline purchase behavior into one customer path.',outcomes:['Audience quality','Repeat purchase','Omnichannel attribution']},
  {name:'Home Improvement',summary:'Follow enquiries through calls, visits, quotations and booked projects without losing campaign context.',outcomes:['Lead routing','Project conversion','Offline matchback']},
  {name:'Travel',summary:'Connect discovery, enquiry, call-center and booking activity across assisted and digital channels.',outcomes:['Booking attribution','Journey continuity','Audience suppression']},
  {name:'Consumer Goods',summary:'Use first-party customer and purchase context to improve media efficiency and retention.',outcomes:['Revenue signals','LTV audiences','Repeat purchase']},
]

export const publicAgents = [
  {number:1,name:'Meta Advanced CAPI',category:'Lead Quality',summary:'Return verified business outcomes to Meta with server-side delivery and event deduplication.'},
  {number:2,name:'Google ECL / OCI',category:'Lead Quality',summary:'Connect ad clicks with qualified and closed outcomes for Google Ads optimization.'},
  {number:3,name:'Call Tracking Events',category:'Lead Quality',summary:'Map inbound calls to campaign and click context before sending conversion feedback.'},
  {number:4,name:'Custom Integration',category:'Lead Quality',summary:'Create normalized pipelines for proprietary CRMs, ad platforms, or internal data systems.'},
  {number:5,name:'Lead Grading',category:'Conversion',summary:'Score each lead from journey, CRM, and interaction evidence before routing.'},
  {number:6,name:'CRM Enrichment',category:'Conversion',summary:'Attach acquisition and journey context to CRM records before the first sales interaction.'},
  {number:7,name:'Voice Lead Qualification',category:'Conversion',summary:'Qualify inbound demand quickly and pass sales-ready prospects to the right team.'},
  {number:8,name:'Voice Scheduler',category:'Conversion',summary:'Schedule meetings for qualified prospects and coordinate the booking workflow.'},
  {number:9,name:'Meeting Reminder',category:'Conversion',summary:'Reduce no-shows with contextual reminders and recovery sequences.'},
  {number:10,name:'Feedback Agent',category:'Conversion',summary:'Capture objections and post-interaction feedback for funnel improvement.'},
  {number:11,name:'Ask Ace',category:'Visibility',summary:'Query journey and attribution evidence in natural language inside the workspace.'},
]

export const publicIntegrations = [
  {group:'Advertising & Analytics',items:['Google Ads','Meta Ads','LinkedIn Ads','Microsoft Ads / Bing Ads','GA4']},
  {group:'CRM',items:['Zoho CRM','Salesforce','LeadSquared','Meritto','HubSpot','HighLevel','Microsoft Dynamics 365']},
  {group:'Messaging & Marketing',items:['WhatsApp','WATI','Gupshup','AiSensy','Bitespeed','MoEngage','CleverTap']},
  {group:'Calling',items:['Exotel','Knowlarity','Tata Tele','MyOperator']},
  {group:'Web, App & Commerce',items:['WordPress','React App','WooCommerce','Magento','Custom Backend']},
]


export const publicChallenges = [
  {
    key:'operations',
    label:'Business & operational impact',
    title:'Teams lose speed when every system tells a different story.',
    points:[
      'Acquisition cost rises while lead quality becomes harder to explain',
      'Marketing, sales, and leadership work from different numbers',
      'Teams spend time repairing tracking instead of scaling campaigns',
      'Budget decisions are made without reliable funnel evidence'
    ],
    action:'Connect the operating truth'
  },
  {
    key:'tracking',
    label:'Tracking & data quality',
    title:'Broken event chains make optimization noisy before anyone notices.',
    points:[
      'Conversions fire inconsistently across destinations',
      'Duplicate events distort optimization signals',
      'Cross-domain and messaging paths break continuity',
      'Reporting lacks one normalized event model'
    ],
    action:'Repair signal quality'
  },
  {
    key:'optimization',
    label:'Ad platform optimization',
    title:'Algorithms learn the wrong lesson when downstream quality never returns.',
    points:[
      'Campaigns optimize toward shallow form fills',
      'Lookalike seeds are polluted by low-quality demand',
      'Converted and irrelevant users remain targetable',
      'CAC rises while platforms cannot see real business value'
    ],
    action:'Return stronger outcomes'
  },
  {
    key:'measurement',
    label:'Attribution & measurement',
    title:'A fragmented journey turns every channel report into a partial answer.',
    points:[
      'Web, app, calls, and offline activity stay disconnected',
      'Post-lead outcomes disappear from media measurement',
      'High-value cohorts remain hidden from channel reporting',
      'Leadership cannot defend budget decisions with one evidence trail'
    ],
    action:'Build full-path visibility'
  },
  {
    key:'audience',
    label:'Audience & personalization',
    title:'Weak identity makes targeting broad, repetitive, and expensive.',
    points:[
      'Segments are too shallow for useful lookalikes',
      'Retargeting ignores actual journey behavior',
      'Upsell and retention lack purchase and lifecycle context',
      'Returning customers are difficult to recognize consistently'
    ],
    action:'Activate better audiences'
  },
  {
    key:'privacy',
    label:'Privacy, consent & compliance',
    title:'Growth systems need first-party controls that survive changing privacy rules.',
    points:[
      'Third-party tracking keeps losing reach and reliability',
      'Consent state is disconnected from activation destinations',
      'Regional rules complicate uncontrolled audience use',
      'Teams lack a durable first-party governance layer'
    ],
    action:'Govern first-party activation'
  }
]


export const publicCaseStudies = [
  {sector:'Healthcare',name:'Apollo Ayurvaid',title:'Assisted-call and messaging attribution',challenge:['Inbound calls were disconnected from campaign context','Messaging enquiries were missing from conversion reporting','Telephony outcomes could not improve paid-media optimization'],solution:['Ingest telephony events through API','Match calls to recent first-party sessions and click identifiers','Return verified assisted-conversion outcomes server-side'],metrics:[['Match pattern','Session + identity'],['Channels','Search + social'],['Outcome','Assisted signal restored']]},
  {sector:'Education',name:'Jaro Education',title:'High-volume lead and conversion operations',challenge:['Large daily lead volume across many ad accounts','Complex CRM stage mappings','Fragmented conversion imports at scale'],solution:['Normalize CRM stages into a canonical event model','Centralize conversion delivery across accounts','Use real-time qualified and closed-stage signals'],metrics:[['Scale','High-volume daily leads'],['Coverage','Multi-account'],['Focus','Stage-based activation']]},
  {sector:'High-consideration commerce',name:'GemPundit',title:'Messaging journey and partial-payment measurement',challenge:['Long consideration cycle spans web and messaging','Partial payments hide eventual value','Click identity is easily lost after the landing session'],solution:['Persist first-party click identity','Bridge web and messaging identities','Record partial-payment and adjusted-value outcomes'],metrics:[['Bridge','Web → messaging'],['Signal','Partial payment'],['Optimization','Value-aware bidding']]},
  {sector:'Home services',name:'Berger Paints',title:'Quality-first assisted acquisition',challenge:['Assisted lead generation spans messaging and offline follow-up','Campaign quality cannot be judged by lead count alone','Operations need continuous signal monitoring'],solution:['Activate server-side conversion feedback','Return qualified CRM and offline outcomes','Create business-specific assisted-conversion events'],metrics:[['Goal','Lower acquisition waste'],['Signal','Quality outcomes'],['Ops','Continuous monitoring']]}
]

export const publicResources = [
  {id:'custom-events',title:'Custom Events',summary:'Define conversion events around the business outcomes your teams actually care about.',sections:['Choose the business state that should become a conversion event.','Define a stable event name, event_id and customer identity keys.','Validate source timestamps, click identifiers and duplicate rules.','Send only the fields required by each destination and retain the delivery audit trail.']},
  {id:'server-activation',title:'Server-Side Activation',summary:'Design reliable server-side conversion delivery for ad and analytics destinations.',sections:['Capture first-party identifiers before the browser context disappears.','Normalize qualified, booked and revenue outcomes in the backend.','Deliver conversion events with retries, deduplication and destination receipts.','Monitor delivery health and stale-token conditions.']},
  {id:'attribution',title:'Attribution',summary:'Create one evidence trail across acquisition, assisted interactions and closed revenue.',sections:['Stitch anonymous sessions to known identities when deterministic evidence appears.','Preserve campaign and click context through CRM and offline stages.','Compare first-touch, last-touch and full-path models.','Use the same revenue truth for reporting and signal return.']},
  {id:'crm-enrichment',title:'CRM Enrichment',summary:'Give sales teams acquisition and journey context before they engage the lead.',sections:['Attach original source, campaign, landing context and click identifiers.','Bring high-intent website behavior into the lead record.','Add call, messaging and meeting context when available.','Keep field mappings governed so enrichment does not corrupt CRM ownership.']},
  {id:'offline-conversions',title:'Offline Conversion Tracking',summary:'Match calls, messaging and offline outcomes to first-party identity and media context.',sections:['Persist click IDs and first-party identifiers during acquisition.','Ingest offline outcomes from CRM, calling, messaging or POS systems.','Resolve identity and apply attribution rules before delivery.','Return verified conversion value to eligible destinations.']},
  {id:'audience-operations',title:'Audience Operations',summary:'Build activation and suppression segments from lifecycle, value and intent.',sections:['Combine lifecycle stage, lead grade, propensity, recency and value signals.','Preview expected audience size before activation.','Suppress converted or low-quality identities from acquisition campaigns.','Use high-value cohorts as optimization or lookalike seeds.']}
]
