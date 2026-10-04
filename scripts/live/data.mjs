import {randomUUID,createHash} from 'node:crypto'

export function randomSource(seed=Date.now()){
  let state=Number(seed)>>>0
  return ()=>{state+=0x6D2B79F5;let n=state;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296}
}
export const hash=value=>createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex')
export const iso=(offset=0)=>new Date(Date.now()+offset).toISOString()
const channels=['google','meta','organic','email','direct']
const products=[{category:'Education',product:'Analytics course',value:24000},{category:'Home Services',product:'Home consultation',value:4500},{category:'Retail',product:'Premium accessory',value:12900}]
const names=['Aarav Mehta','Diya Sharma','Rohan Shah','Ananya Rao','Kabir Kapoor','Isha Nair','Arjun Patel','Meera Das']

export function customer(random,index,runId){
  const source=channels[Math.floor(random()*channels.length)]
  const product=products[Math.floor(random()*products.length)]
  const id=`live_${runId}_${index}`
  const phone=`+1555010${String(index%10000).padStart(4,'0')}`
  return {id,name:names[index%names.length]+' (test)',email:`${id}@example.com`,phone,
    visitorId:`visitor_${id}`,deviceId:`device_${id}`,source,campaign:`live_${source}_${product.category.toLowerCase().replaceAll(' ','_')}`,
    ...product,intent:random(),phase:0,createdAt:Date.now(),converted:false,
    ...(source==='google'?{gclid:`synthetic_gclid_${id}`}:{ }),
    ...(source==='meta'?{fbclid:`synthetic_fbclid_${id}`}:{ })}
}

export function leadInput(person,stage='lead'){
  const high=person.intent>.55
  return {externalLeadId:person.id,customerId:person.id,name:person.name,email:person.email,phone:person.phone,
    deviceId:person.deviceId,devicePlatform:'web',source:person.source,campaign:person.campaign,crmStage:stage,
    journeyDepth:2+person.phase*2,pricingPageViews:high?2:1,conversionPropensity:Math.round(person.intent*100),
    whatsappEngaged:person.phase>=2,callOutcome:person.phase>=2?(high?'qualified':'connected'):'unreached',
    meetingStatus:person.phase>=3?'scheduled':null,lastActivity:iso(),
    attributes:{synthetic:true,generator:'ace-live.v1',category:person.category,product:person.product,city:['Mumbai','Delhi','Bengaluru'][Math.floor(person.intent*3)]}}
}

export function eventInput(person,event){
  return {id:`evt_${randomUUID()}`,event,eventCategory:'analytics',occurredAt:iso(),customerId:person.id,
    visitorId:person.visitorId,deviceId:person.deviceId,emailSha256:hash(person.email),
    phoneSha256:createHash('sha256').update(person.phone.replace(/\D/g,'')).digest('hex'),
    source:person.source,utm_source:person.source,utm_medium:['google','meta'].includes(person.source)?'cpc':'referral',
    campaign:person.campaign,utm_campaign:person.campaign,url:'http://localhost:5173/'+(event==='page_view'?'pricing':'checkout'),
    domain:'localhost',crmStage:event==='purchase'?'converted':'lead',journeyDepth:2+person.phase*2,
    pricingPageViews:person.intent>.55?2:1,conversionPropensity:Math.round(person.intent*100),
    category:person.category,product:person.product,synthetic:true,generator:'ace-live.v1',
    value:event==='purchase'?person.value:0,currency:'INR',
    ...(person.gclid?{gclid:person.gclid}:{}),...(person.fbclid?{fbclid:person.fbclid}:{})}
}

// Mature historical labels are strictly after prediction cutoff, with no target in features.
export function supervisedRows(random,task,count=240){
  const regression=task==='future_customer_value'
  return Array.from({length:count},(_,index)=>{
    const depth=Math.floor(random()*12)+1,pricing=Math.floor(random()*4),recency=Math.floor(random()*50),engaged=random()>.5?1:0
    const probability=Math.max(.05,Math.min(.95,.08+depth*.028+pricing*.09+engaged*.18-recency*.002))
    const label=regression?Math.round((400+depth*300+pricing*900+engaged*1800)*(0.7+random()*.6)):random()<(task==='customer_churn'?1-probability:probability)?1:0
    const cutoff=Date.now()-(300-index)*86400000
    return {entity_id:`synthetic_history_${task}_${index}`,features:{journey_depth:depth,pricing_views:pricing,recency_days:recency,engaged},label,
      feature_available_at:new Date(cutoff-3600000).toISOString(),prediction_cutoff:new Date(cutoff).toISOString(),
      label_observed_at:new Date(cutoff+(regression?90:7)*86400000).toISOString()}
  }).filter(row=>Date.parse(row.label_observed_at)<Date.now())
}

export function matrixRows(random,count=80){
  return Array.from({length:count},(_,index)=>({entity_id:`synthetic_segment_${index}`,features:{
    visits:Math.round(2+random()*10+(index%3)*15),spend:Math.round(200+random()*500+(index%3)*2000),
    recency_days:Math.round(random()*30),conversion_rate:index===count-1?.98:Math.round(random()*20)/100}}))
}

export function forecastInput(random){
  return {series_id:'synthetic_daily_conversions',history:Array.from({length:70},(_,index)=>({
    timestamp:iso(-(70-index)*86400000),value:Math.round(30+index*.2+8*Math.sin(index*2*Math.PI/7)+random()*4)})),
    horizon:7,season_length:7,frequency:'D',timezone:'Asia/Kolkata'}
}
