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
