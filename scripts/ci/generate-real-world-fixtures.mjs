import fs from 'node:fs'
import path from 'node:path'

const outDir=path.resolve('test-data/generated')
fs.mkdirSync(outDir,{recursive:true})

const start=new Date('2026-09-01T00:00:00.000Z')
const days=30
const channels=[
  {id:'google_search',platform:'google_ads',campaign:'Brand Search',baseSpend:420,baseClicks:310,baseLeads:34},
  {id:'google_pmax',platform:'google_ads',campaign:'Performance Max',baseSpend:560,baseClicks:390,baseLeads:42},
  {id:'meta_prospecting',platform:'meta_ads',campaign:'Prospecting',baseSpend:390,baseClicks:440,baseLeads:29},
  {id:'meta_retargeting',platform:'meta_ads',campaign:'Retargeting',baseSpend:220,baseClicks:250,baseLeads:31}
]

const daily=[]
const leads=[]
const sessions=[]
let leadSeq=1
for(let d=0;d<days;d++){
  const date=new Date(start.getTime()+d*86400000).toISOString().slice(0,10)
  for(let i=0;i<channels.length;i++){
    const c=channels[i]
    const season=1+(((d%7)-3)*0.015)
    const spend=Number((c.baseSpend*season+(i*7)).toFixed(2))
    const impressions=Math.round((c.baseClicks*10.5)*(1+((d%5)*0.02)))
    const clicks=Math.round(c.baseClicks*(1+((d%6)*0.015)))
    const conversions=Math.max(1,Math.round(c.baseLeads*(1+((d%4)*0.025))))
    const revenue=Number((conversions*(c.platform==='google_ads'?215:180)).toFixed(2))
    daily.push({date,channelId:c.id,platform:c.platform,campaign:c.campaign,spend,impressions,clicks,conversions,revenue,currency:'USD'})
    for(let n=0;n<conversions;n++){
      const id='lead_'+String(leadSeq++).padStart(5,'0')
      const source=c.platform==='google_ads'?'google':'facebook'
      const qualified=(n+d+i)%4!==0
      const won=qualified && (n+d)%5===0
      leads.push({
        id,
        createdAt:date+'T'+String(8+(n%10)).padStart(2,'0')+':15:00.000Z',
        source,
        medium:c.platform==='google_ads'?'cpc':'paid_social',
        campaign:c.campaign,
        channelId:c.id,
        country:['IN','US','GB','AE'][(n+d)%4],
        lifecycleStage:won?'customer':qualified?'qualified':'lead',
        value:won?Number((850+((n+d)%7)*125).toFixed(2)):0,
        email:'qa+'+id+'@example.test',
        phone:'+910000'+String(100000+n+d).slice(-6)
      })
    }
    sessions.push({
      date,
      source:c.platform==='google_ads'?'google':'facebook',
      medium:c.platform==='google_ads'?'cpc':'paid_social',
      campaign:c.campaign,
      sessions:clicks,
      engagedSessions:Math.round(clicks*0.73),
      users:Math.round(clicks*0.82),
      purchases:Math.max(0,Math.round(conversions*0.18)),
      revenue:Number((revenue*0.92).toFixed(2))
    })
  }
}

const calls=leads.slice(0,120).map((lead,index)=>({
  callId:'call_'+String(index+1).padStart(4,'0'),
  leadId:lead.id,
  startedAt:lead.createdAt,
  durationSeconds:45+(index%420),
  direction:index%3===0?'inbound':'outbound',
  status:index%11===0?'missed':'completed',
  campaign:lead.campaign,
  keyword:index%2===0?'marketing analytics':'growth reporting',
  creative:index%2===0?'Lead Form A':'Creative B',
  adGroup:index%2===0?'Search Core':'Paid Social Core',
  gclid:lead.source==='google'?'qa-gclid-'+index:null
}))

const whatsapp=leads.slice(0,80).map((lead,index)=>({
  messageId:'wamid.qa.'+index,
  leadId:lead.id,
  timestamp:lead.createdAt,
  direction:index%4===0?'inbound':'outbound',
  template:index%4===0?null:'lead_followup_v1',
  status:index%13===0?'failed':index%3===0?'read':'delivered'
}))

const dataset={
  meta:{schemaVersion:1,generatedBy:'scripts/ci/generate-real-world-fixtures.mjs',deterministic:true,period:{from:'2026-09-01',to:'2026-09-30'}},
  workspaces:[
    {id:'ws_qa_retail',name:'QA Retail Growth',timezone:'Asia/Kolkata'},
    {id:'ws_qa_saas',name:'QA SaaS Demand Gen',timezone:'America/New_York'}
  ],
  dailyMarketingMetrics:daily,
  leads,
  ga4:sessions,
  calls,
  whatsapp
}

fs.writeFileSync(path.join(outDir,'marketing-real-world.json'),JSON.stringify(dataset,null,2))
fs.writeFileSync(path.join(outDir,'README.txt'),[
  'Synthetic deterministic QA dataset for Jenkins acceptance testing.',
  'Contains paid media, GA4-like sessions, leads, attribution, call and WhatsApp-style events.',
  'All identities and phone numbers are artificial and use example.test / reserved QA values.',
  'Do not replace with production PII.'
].join('\n')+'\n')
console.log(JSON.stringify({ok:true,out:path.join(outDir,'marketing-real-world.json'),metrics:daily.length,leads:leads.length,sessions:sessions.length,calls:calls.length,whatsapp:whatsapp.length}))
