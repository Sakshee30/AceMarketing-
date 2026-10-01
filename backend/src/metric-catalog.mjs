const VERSION='metrics.v1'

const metric=(key,label,unit,definition)=>Object.freeze({key,label,version:VERSION,unit,...definition})

export const METRIC_CATALOG=Object.freeze([
  metric('spend','Spend','money',{source:'campaign.spend',countingUnit:'amount',identityRule:'none',denominator:null}),
  metric('impressions','Impressions','count',{source:'ad.impression',countingUnit:'event',identityRule:'event_id',denominator:null}),
  metric('clicks','Clicks','count',{source:'ad.click',countingUnit:'event',identityRule:'event_id',denominator:null}),
  metric('leads','Leads','count',{source:'lead.created',countingUnit:'entity',identityRule:'lead_id',denominator:null}),
  metric('qualified_leads','Qualified leads','count',{source:'lead.qualified',countingUnit:'entity',identityRule:'lead_id',denominator:null}),
  metric('customers','Customers','count',{source:'payment.succeeded',countingUnit:'entity',identityRule:'customer_id',denominator:null}),
  metric('revenue','Revenue','money',{source:'payment.succeeded',countingUnit:'amount',identityRule:'payment_id',denominator:null}),
  metric('refunds','Refunds','money',{source:'payment.refunded',countingUnit:'amount',identityRule:'refund_id',denominator:null}),
  metric('conversion_rate','Conversion rate','ratio',{source:'derived',countingUnit:'ratio',identityRule:'none',denominator:'leads'}),
  metric('cost_per_lead','Cost per lead','money_per_count',{source:'derived',countingUnit:'ratio',identityRule:'none',denominator:'leads'}),
  metric('cost_per_qualified_lead','Cost per qualified lead','money_per_count',{source:'derived',countingUnit:'ratio',identityRule:'none',denominator:'qualified_leads'}),
  metric('roas','ROAS','ratio',{source:'derived',countingUnit:'ratio',identityRule:'none',denominator:'spend'}),
  metric('ctr','CTR','ratio',{source:'derived',countingUnit:'ratio',identityRule:'none',denominator:'impressions'}),
  metric('cpc','CPC','money_per_count',{source:'derived',countingUnit:'ratio',identityRule:'none',denominator:'clicks'}),
  metric('cpm','CPM','money_per_thousand',{source:'derived',countingUnit:'ratio',identityRule:'none',denominator:'impressions'}),
  metric('cpa','CPA','money_per_count',{source:'derived',countingUnit:'ratio',identityRule:'none',denominator:'customers'}),
  metric('click_to_conversion_rate','Click-to-conversion rate','ratio',{source:'derived',countingUnit:'ratio',identityRule:'none',denominator:'clicks'})
])

export const metricCatalog=()=>({
  version:VERSION,
  boundaries:'start inclusive, end exclusive',
  zeroDenominator:'null with warning',
  currencyPolicy:'single currency per calculation; mixed currencies require an explicit external conversion policy/version',
  timezonePolicy:'timestamps must be valid instants; caller supplies the reporting timezone label used for the query window',
  items:METRIC_CATALOG
})

const validInstant=value=>{
  const ms=Date.parse(String(value||''))
  return Number.isFinite(ms)?ms:null
}

const normalizeType=value=>String(value||'').trim().toLowerCase()

const inWindow=(occurredAt,startMs,endMs)=>{
  const time=validInstant(occurredAt)
  return time!==null&&time>=startMs&&time<endMs
}

const dedupeKey=(event,index)=>{
  const id=String(event.eventId||event.id||'').trim()
  return id||'row:'+index
}

const distinctEntities=(events,type)=>{
  const values=new Set()
  events.forEach((event,index)=>{
    if(normalizeType(event.eventType)!==type)return
    const entity=String(event.entityId||event.leadId||event.customerId||'').trim()
    values.add(entity||dedupeKey(event,index))
  })
  return values.size
}

const distinctEvents=(events,type)=>{
  const values=new Set()
  events.forEach((event,index)=>{
    if(normalizeType(event.eventType)===type)values.add(dedupeKey(event,index))
  })
  return values.size
}

const amountFor=(events,type)=>{
  const seen=new Set()
  let total=0
  events.forEach((event,index)=>{
    if(normalizeType(event.eventType)!==type)return
    const key=dedupeKey(event,index)
    if(seen.has(key))return
    seen.add(key)
    const amount=Number(event.amount)
    if(Number.isFinite(amount))total+=amount
  })
  return total
}

export const deriveMarketingMetrics=({
  spend=0,impressions=0,clicks=0,leads=null,qualifiedLeads=null,conversions=0,revenue=0
}={})=>{
  const value=x=>Number.isFinite(Number(x))?Number(x):0
  const ratio=(numerator,denominator)=>value(denominator)===0?null:value(numerator)/value(denominator)
  const s=value(spend),i=value(impressions),c=value(clicks),conv=value(conversions),rev=value(revenue)
  return {
    ctr:ratio(c,i),
    cpc:ratio(s,c),
    cpm:i===0?null:(s/i)*1000,
    cost_per_lead:leads==null?null:ratio(s,leads),
    cost_per_qualified_lead:qualifiedLeads==null?null:ratio(s,qualifiedLeads),
    cpa:ratio(s,conv),
    click_to_conversion_rate:ratio(conv,c),
    roas:ratio(rev,s)
  }
}

export const calculateMetricSet=({
  events,
  startAt,
  endAt,
  timezone='UTC',
  currency=null,
  freshnessAt=null,
  sourceWarnings=[]
}={})=>{
  if(!Array.isArray(events))throw new TypeError('events must be an array')
  const startMs=validInstant(startAt)
  const endMs=validInstant(endAt)
  if(startMs===null||endMs===null||startMs>=endMs)throw new TypeError('startAt/endAt must define a valid start-inclusive end-exclusive window')

  const windowEvents=events.filter(event=>inWindow(event.occurredAt,startMs,endMs))
  const declaredCurrency=String(currency||'').trim().toUpperCase()||null
  const eventCurrencies=new Set(
    windowEvents
      .filter(event=>['campaign.spend','payment.succeeded','payment.refunded'].includes(normalizeType(event.eventType)))
      .map(event=>String(event.currency||'').trim().toUpperCase())
      .filter(Boolean)
  )
  if(eventCurrencies.size>1)throw new Error('mixed_currency: explicit versioned conversion policy required')
  if(declaredCurrency&&eventCurrencies.size===1&&!eventCurrencies.has(declaredCurrency)){
    throw new Error('currency_mismatch: declared currency does not match monetary event currency')
  }
  const resolvedCurrency=declaredCurrency||[...eventCurrencies][0]||null

  const spend=amountFor(windowEvents,'campaign.spend')
  const impressions=distinctEvents(windowEvents,'ad.impression')
  const clicks=distinctEvents(windowEvents,'ad.click')
  const leads=distinctEntities(windowEvents,'lead.created')
  const qualifiedLeads=distinctEntities(windowEvents,'lead.qualified')
  const customers=distinctEntities(windowEvents,'payment.succeeded')
  const revenue=amountFor(windowEvents,'payment.succeeded')
  const refunds=amountFor(windowEvents,'payment.refunded')
  const netRevenue=revenue-refunds

  const warnings=[...sourceWarnings]
  const ratio=(numerator,denominator,key)=>{
    if(denominator===0){
      warnings.push(key+': denominator is zero; value is null')
      return null
    }
    return numerator/denominator
  }

  return {
    schemaVersion:'metric-result.v1',
    catalogVersion:VERSION,
    window:{startAt:new Date(startMs).toISOString(),endAt:new Date(endMs).toISOString(),boundary:'[start,end)',timezone},
    currency:resolvedCurrency,
    freshnessAt:freshnessAt||null,
    metrics:{
      spend,
      impressions,
      clicks,
      leads,
      qualified_leads:qualifiedLeads,
      customers,
      revenue,
      refunds,
      net_revenue:netRevenue,
      conversion_rate:ratio(customers,leads,'conversion_rate'),
      cost_per_lead:ratio(spend,leads,'cost_per_lead'),
      cost_per_qualified_lead:ratio(spend,qualifiedLeads,'cost_per_qualified_lead'),
      roas:ratio(netRevenue,spend,'roas')
    },
    lineage:{
      eventCount:windowEvents.length,
      exactEventMappings:true,
      estimatedRevenueIncluded:false,
      catalogVersion:VERSION
    },
    warnings
  }
}
