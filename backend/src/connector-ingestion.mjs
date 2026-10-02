import {requestConnectorJson as requestJson} from './connector-http.mjs'
import {createHash,randomUUID} from 'node:crypto'
import {inflateRawSync} from 'node:zlib'
import {pool} from './database.mjs'
import {connectorCredential} from './connector-auth.mjs'
import {enqueueJob} from './queue.mjs'
import {withTenantDbTransaction,withSystemDbTransaction} from './platform/tenant-db.mjs'
import {deploymentMode} from './platform/deployment-mode.mjs'
import {deriveMarketingMetrics} from './metric-catalog.mjs'
import {validateOutboundDestination} from './platform/egress-policy.mjs'

const timeoutMs=()=>Math.max(1000,Math.min(Number(process.env.CONNECTOR_SYNC_HTTP_TIMEOUT_MS||30000),120000))
const maxPages=()=>Math.max(1,Math.min(Number(process.env.CONNECTOR_SYNC_MAX_PAGES||100),1000))
const sha=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex')
const isoDay=value=>new Date(value).toISOString().slice(0,10)
const n=value=>Number.isFinite(Number(value))?Number(value):0
const s=value=>value==null?'':String(value)
const nowIso=()=>new Date().toISOString()
const tenantQuery=(workspaceId,text,params=[])=>withTenantDbTransaction(workspaceId,db=>db.query(text,params))
const systemQuery=(text,params=[])=>withSystemDbTransaction(db=>db.query(text,params))


const maxDownloadBytes=()=>Math.max(1024*1024,Math.min(Number(process.env.CONNECTOR_SYNC_MAX_DOWNLOAD_BYTES||50*1024*1024),250*1024*1024))
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))

const requestBuffer=async(rawUrl,{headers={}}={})=>{
  let current=await validateOutboundDestination(rawUrl,{allowedPorts:[443],purpose:'connector report download'})
  for(let hop=0;hop<4;hop++){
    const controller=new AbortController()
    const timer=setTimeout(()=>controller.abort('connector_download_timeout'),Math.max(timeoutMs(),120000))
    try{
      const response=await fetch(current.url,{headers,redirect:'manual',signal:controller.signal})
      if(response.status>=300&&response.status<400&&response.headers.get('location')){
        const next=new URL(response.headers.get('location'),current.url)
        current=await validateOutboundDestination(next.toString(),{allowedPorts:[443],purpose:'connector report redirect'})
        continue
      }
      if(!response.ok)throw new Error('connector report download failed: '+response.status)
      const declared=Number(response.headers.get('content-length')||0)
      if(declared&&declared>maxDownloadBytes())throw new Error('connector report download exceeds configured size limit')
      if(!response.body)throw new Error('connector report download body is unavailable')
      const reader=response.body.getReader()
      const chunks=[]
      let total=0
      while(true){
        const part=await reader.read()
        if(part.done)break
        total+=part.value.byteLength
        if(total>maxDownloadBytes()){await reader.cancel().catch(()=>{});throw new Error('connector report download exceeds configured size limit')}
        chunks.push(Buffer.from(part.value))
      }
      return Buffer.concat(chunks,total)
    }finally{clearTimeout(timer)}
  }
  throw new Error('connector report download exceeded redirect limit')
}

const unzipFirstFile=buffer=>{
  if(!Buffer.isBuffer(buffer)||buffer.length<22)throw new Error('invalid ZIP report')
  let eocd=-1
  const lower=Math.max(0,buffer.length-65557)
  for(let i=buffer.length-22;i>=lower;i--){
    if(buffer.readUInt32LE(i)===0x06054b50){eocd=i;break}
  }
  if(eocd<0)throw new Error('ZIP end-of-central-directory not found')
  const entries=buffer.readUInt16LE(eocd+10)
  let offset=buffer.readUInt32LE(eocd+16)
  for(let index=0;index<entries;index++){
    if(offset+46>buffer.length||buffer.readUInt32LE(offset)!==0x02014b50)throw new Error('invalid ZIP central directory')
    const flags=buffer.readUInt16LE(offset+8)
    const method=buffer.readUInt16LE(offset+10)
    const compressedSize=buffer.readUInt32LE(offset+20)
    const uncompressedSize=buffer.readUInt32LE(offset+24)
    const nameLength=buffer.readUInt16LE(offset+28)
    const extraLength=buffer.readUInt16LE(offset+30)
    const commentLength=buffer.readUInt16LE(offset+32)
    const localOffset=buffer.readUInt32LE(offset+42)
    const name=buffer.subarray(offset+46,offset+46+nameLength).toString('utf8')
    offset+=46+nameLength+extraLength+commentLength
    if(name.endsWith('/'))continue
    if(flags&1)throw new Error('encrypted ZIP reports are unsupported')
    if(uncompressedSize>maxDownloadBytes())throw new Error('uncompressed connector report exceeds configured size limit')
    if(localOffset+30>buffer.length||buffer.readUInt32LE(localOffset)!==0x04034b50)throw new Error('invalid ZIP local header')
    const localNameLength=buffer.readUInt16LE(localOffset+26)
    const localExtraLength=buffer.readUInt16LE(localOffset+28)
    const start=localOffset+30+localNameLength+localExtraLength
    const end=start+compressedSize
    if(end>buffer.length)throw new Error('truncated ZIP report')
    const data=buffer.subarray(start,end)
    if(method===0)return Buffer.from(data)
    if(method===8){
      const output=inflateRawSync(data,{maxOutputLength:maxDownloadBytes()})
      if(output.length>maxDownloadBytes())throw new Error('uncompressed connector report exceeds configured size limit')
      return output
    }
    throw new Error('unsupported ZIP compression method: '+method)
  }
  throw new Error('ZIP report contains no file')
}

const parseCsv=raw=>{
  const text=String(raw||'').replace(/^\uFEFF/,'')
  const records=[]
  let row=[],field='',quoted=false
  const pushField=()=>{row.push(field);field=''}
  const pushRow=()=>{pushField();if(row.some(value=>value!==''))records.push(row);row=[]}
  for(let i=0;i<text.length;i++){
    const ch=text[i]
    if(quoted){
      if(ch==='"'&&text[i+1]==='"'){field+='"';i++;continue}
      if(ch==='"'){quoted=false;continue}
      field+=ch;continue
    }
    if(ch==='"'){quoted=true;continue}
    if(ch===','){pushField();continue}
    if(ch==='\n'){pushRow();continue}
    if(ch==='\r'){if(text[i+1]==='\n')continue;pushRow();continue}
    field+=ch
  }
  if(field||row.length)pushRow()
  if(records.length<1)return []
  const headers=records[0].map(value=>String(value).trim())
  return records.slice(1).map(values=>Object.fromEntries(headers.map((key,index)=>[key,values[index]??''])))
}

const reportNumber=value=>{
  const clean=String(value??'').trim().replace(/,/g,'').replace(/%$/,'')
  const parsed=Number(clean)
  return Number.isFinite(parsed)?parsed:0
}

const reportDay=value=>{
  const raw=String(value||'').trim()
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw
  const parsed=new Date(raw)
  if(Number.isNaN(parsed.getTime()))return ''
  return parsed.toISOString().slice(0,10)
}

const credential=async(workspaceId,connector)=>{
  const result=await connectorCredential(workspaceId,connector)
  return result.token||{}
}

const checkpoint=async(workspaceId,connector,stream)=>{
  if(!pool)return null
  const {rows}=await tenantQuery(workspaceId,
    'SELECT cursor,watermark,updated_at FROM ace_connector_checkpoints WHERE workspace_id=$1 AND connector=$2 AND stream=$3',
    [workspaceId,connector,stream]
  )
  return rows[0]||null
}

const saveCheckpoint=async({workspaceId,connector,stream,cursor={},watermark=null})=>{
  await tenantQuery(workspaceId,
    `INSERT INTO ace_connector_checkpoints(workspace_id,connector,stream,cursor,watermark,updated_at)
     VALUES ($1,$2,$3,$4::jsonb,$5,now())
     ON CONFLICT(workspace_id,connector,stream) DO UPDATE SET
       cursor=EXCLUDED.cursor,watermark=EXCLUDED.watermark,updated_at=now()`,
    [workspaceId,connector,stream,JSON.stringify(cursor||{}),watermark]
  )
}

const persistRaw=async({workspaceId,connector,stream,sourceId,observedAt,payload,runId})=>{
  const hash=sha(payload)
  const id='raw_'+sha([workspaceId,connector,stream,sourceId,hash]).slice(0,40)
  const result=await tenantQuery(workspaceId,
    `INSERT INTO ace_connector_raw_records
      (id,workspace_id,connector,stream,source_id,observed_at,payload_hash,payload,sync_run_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
     ON CONFLICT(workspace_id,connector,stream,source_id,payload_hash) DO NOTHING`,
    [id,workspaceId,connector,stream,String(sourceId),observedAt||null,hash,JSON.stringify(payload),runId]
  )
  return result.rowCount||0
}

const upsertCampaign=async({workspaceId,connector,accountId='',campaignId,campaignName=null,day,currency=null,spend=0,impressions=0,clicks=0,conversions=0,conversionValue=0,sessions=0,users=0,extra={},sourceUpdatedAt=null})=>{
  await tenantQuery(workspaceId,
    `INSERT INTO ace_campaign_daily
      (workspace_id,connector,account_id,campaign_id,campaign_name,day,currency,spend,impressions,clicks,conversions,conversion_value,sessions,users,extra,source_updated_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,now())
     ON CONFLICT(workspace_id,connector,account_id,campaign_id,day) DO UPDATE SET
       campaign_name=EXCLUDED.campaign_name,currency=EXCLUDED.currency,spend=EXCLUDED.spend,
       impressions=EXCLUDED.impressions,clicks=EXCLUDED.clicks,conversions=EXCLUDED.conversions,
       conversion_value=EXCLUDED.conversion_value,sessions=EXCLUDED.sessions,users=EXCLUDED.users,
       extra=EXCLUDED.extra,source_updated_at=EXCLUDED.source_updated_at,updated_at=now()`,
    [workspaceId,connector,String(accountId||''),String(campaignId),campaignName,day,currency,n(spend),Math.trunc(n(impressions)),Math.trunc(n(clicks)),n(conversions),n(conversionValue),n(sessions),n(users),JSON.stringify(extra||{}),sourceUpdatedAt]
  )
}

const upsertCrm=async({workspaceId,connector,objectType,sourceId,sourceUpdatedAt=null,normalized={},payload,runId})=>{
  await tenantQuery(workspaceId,
    `INSERT INTO ace_crm_records
      (workspace_id,connector,object_type,source_id,source_updated_at,normalized,payload,sync_run_id,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,now())
     ON CONFLICT(workspace_id,connector,object_type,source_id) DO UPDATE SET
       source_updated_at=EXCLUDED.source_updated_at,normalized=EXCLUDED.normalized,payload=EXCLUDED.payload,
       sync_run_id=EXCLUDED.sync_run_id,updated_at=now()`,
    [workspaceId,connector,objectType,String(sourceId),sourceUpdatedAt,JSON.stringify(normalized||{}),JSON.stringify(payload||{}),runId]
  )
}

const createRun=async({workspaceId,connector,mode,start,end})=>{
  const id='csync_'+randomUUID()
  await tenantQuery(workspaceId,
    `INSERT INTO ace_connector_sync_runs(id,workspace_id,connector,mode,status,requested_start,requested_end)
     VALUES ($1,$2,$3,$4,'running',$5,$6)`,
    [id,workspaceId,connector,mode,start||null,end||null]
  )
  return id
}

const finishRun=async(workspaceId,id,status,stats,error=null)=>{
  await tenantQuery(workspaceId,
    `UPDATE ace_connector_sync_runs SET status=$2,stats=$3::jsonb,error=$4,updated_at=now(),completed_at=now() WHERE id=$1`,
    [id,status,JSON.stringify(stats||{}),error?String(error).slice(0,4000):null]
  )
}

const rangeFor=async({workspaceId,connector,stream,mode,start,end,defaultBackfillDays=90})=>{
  const cp=await checkpoint(workspaceId,connector,stream)
  const endDate=end?new Date(end):new Date()
  let startDate
  if(start)startDate=new Date(start)
  else if(mode==='incremental'&&cp?.watermark)startDate=new Date(new Date(cp.watermark).getTime()-24*60*60*1000)
  else startDate=new Date(endDate.getTime()-defaultBackfillDays*24*60*60*1000)
  if(Number.isNaN(startDate.getTime())||Number.isNaN(endDate.getTime())||startDate>endDate)throw new Error('invalid connector sync date range')
  return {start:startDate,end:endDate,checkpoint:cp}
}

const persistAdRows=async({workspaceId,connector,stream,accountId,rows,runId,map})=>{
  let rawInserted=0,normalized=0
  for(const row of rows){
    const mapped=map(row)
    if(!mapped?.campaignId||!mapped?.day)continue
    rawInserted+=await persistRaw({workspaceId,connector,stream,sourceId:mapped.sourceId||[mapped.campaignId,mapped.day].join(':'),observedAt:mapped.observedAt||mapped.day,payload:row,runId})
    await upsertCampaign({workspaceId,connector,accountId,...mapped})
    normalized++
  }
  return {rawInserted,normalized}
}

const syncGoogleAds=async(ctx)=>{
  const connector='Google Ads',stream='campaign_daily'
  const token=await credential(ctx.workspaceId,connector)
  const customerId=String(ctx.options.customerId||process.env.GOOGLE_ADS_CUSTOMER_ID||'').replace(/-/g,'')
  const developerToken=process.env.GOOGLE_ADS_DEVELOPER_TOKEN||''
  if(!customerId||!developerToken||!token.access_token)throw new Error('Google Ads requires customer ID, developer token, and OAuth access token')
  const r=await rangeFor({...ctx,connector,stream,defaultBackfillDays:90})
  const version=process.env.GOOGLE_ADS_API_VERSION||'v25'
  const headers={'Content-Type':'application/json','Authorization':'Bearer '+token.access_token,'developer-token':developerToken}
  if(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID)headers['login-customer-id']=String(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID).replace(/-/g,'')
  const query=[
    'SELECT segments.date, customer.currency_code, campaign.id, campaign.name, metrics.cost_micros,',
    'metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value',
    'FROM campaign',
    `WHERE segments.date BETWEEN '${isoDay(r.start)}' AND '${isoDay(r.end)}'`
  ].join(' ')
  const {json}=await requestJson(`https://googleads.googleapis.com/${version}/customers/${customerId}/googleAds:searchStream`,{
    method:'POST',headers,body:JSON.stringify({query}),allowedOrigins:['https://googleads.googleapis.com']
  })
  if(!Array.isArray(json)||json.some(batch=>!batch||typeof batch!=='object'||(batch.results!==undefined&&!Array.isArray(batch.results))))throw new Error('Google Ads response schema invalid')
  const rows=json.flatMap(batch=>batch.results||[])
  const persisted=await persistAdRows({workspaceId:ctx.workspaceId,connector,stream,accountId:customerId,rows,runId:ctx.runId,map:row=>({
    sourceId:[row.campaign?.id,row.segments?.date].join(':'),
    campaignId:s(row.campaign?.id),campaignName:row.campaign?.name||null,day:row.segments?.date,
    currency:row.customer?.currencyCode||null,spend:n(row.metrics?.costMicros)/1e6,impressions:n(row.metrics?.impressions),
    clicks:n(row.metrics?.clicks),conversions:n(row.metrics?.conversions),conversionValue:n(row.metrics?.conversionsValue),extra:{}
  })})
  await saveCheckpoint({workspaceId:ctx.workspaceId,connector,stream,watermark:r.end.toISOString(),cursor:{endDate:isoDay(r.end)}})
  return {...persisted,fetched:rows.length,streams:[stream]}
}

const syncMetaAds=async(ctx)=>{
  const connector='Meta Ads',stream='campaign_daily'
  const token=await credential(ctx.workspaceId,connector)
  const account=String(ctx.options.accountId||process.env.META_AD_ACCOUNT_ID||'').replace(/^act_/,'')
  if(!account||!token.access_token)throw new Error('Meta Ads requires ad account ID and OAuth access token')
  const r=await rangeFor({...ctx,connector,stream,defaultBackfillDays:90})
  const version=process.env.META_GRAPH_VERSION||'v26.0'
  const fields='campaign_id,campaign_name,spend,impressions,clicks,actions,action_values,date_start,date_stop'
  let url=`https://graph.facebook.com/${version}/act_${account}/insights?level=campaign&time_increment=1&limit=500&fields=${encodeURIComponent(fields)}&time_range=${encodeURIComponent(JSON.stringify({since:isoDay(r.start),until:isoDay(r.end)}))}`
  const rows=[],seenPages=new Set()
  for(let page=0;url&&page<maxPages();page++){
    if(seenPages.has(url))throw new Error('Meta Ads repeated pagination cursor')
    seenPages.add(url)
    const result=await requestJson(url,{headers:{Authorization:'Bearer '+token.access_token},allowedOrigins:['https://graph.facebook.com']})
    if(!Array.isArray(result.json.data))throw new Error('Meta Ads response schema invalid: data array required')
    rows.push(...result.json.data)
    url=result.json.paging?.next||null
  }
  if(url)throw new Error('Meta Ads page limit reached before complete synchronization')
  const sumAction=(items,names)=>n((items||[]).filter(x=>names.includes(x.action_type)).reduce((a,x)=>a+n(x.value),0))
  const persisted=await persistAdRows({workspaceId:ctx.workspaceId,connector,stream,accountId:account,rows,runId:ctx.runId,map:row=>({
    sourceId:[row.campaign_id,row.date_start].join(':'),campaignId:s(row.campaign_id),campaignName:row.campaign_name||null,
    day:row.date_start,spend:n(row.spend),impressions:n(row.impressions),clicks:n(row.clicks),
    conversions:sumAction(row.actions,['purchase','lead','offsite_conversion.fb_pixel_purchase']),
    conversionValue:sumAction(row.action_values,['purchase','offsite_conversion.fb_pixel_purchase']),
    extra:{actions:row.actions||[],actionValues:row.action_values||[]}
  })})
  await saveCheckpoint({workspaceId:ctx.workspaceId,connector,stream,watermark:r.end.toISOString(),cursor:{endDate:isoDay(r.end)}})
  return {...persisted,fetched:rows.length,streams:[stream]}
}

const syncGa4=async(ctx)=>{
  const connector='GA4',stream='campaign_daily'
  const token=await credential(ctx.workspaceId,connector)
  const propertyId=String(ctx.options.propertyId||process.env.GA4_PROPERTY_ID||'').replace(/^properties\//,'')
  if(!propertyId||!token.access_token)throw new Error('GA4 requires property ID and OAuth access token')
  const r=await rangeFor({...ctx,connector,stream,defaultBackfillDays:90})
  let offset=0
  const rows=[]
  for(let page=0;page<maxPages();page++){
    const body={dateRanges:[{startDate:isoDay(r.start),endDate:isoDay(r.end)}],dimensions:[{name:'date'},{name:'sessionCampaignId'},{name:'sessionCampaignName'},{name:'sessionSourceMedium'}],metrics:[{name:'sessions'},{name:'totalUsers'},{name:'eventCount'},{name:'keyEvents'},{name:'totalRevenue'}],limit:'100000',offset:String(offset)}
    const {json}=await requestJson(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token.access_token},body:JSON.stringify(body),allowedOrigins:['https://analyticsdata.googleapis.com']
    })
    if((json.rows!==undefined&&!Array.isArray(json.rows))||(!json.rows&&Number(json.rowCount)>0))throw new Error('GA4 response schema invalid')
    const batch=json.rows||[]
    rows.push(...batch)
    offset+=batch.length
    if(!batch.length||offset>=Number(json.rowCount||0))break
  }
  const persisted=await persistAdRows({workspaceId:ctx.workspaceId,connector,stream,accountId:propertyId,rows,runId:ctx.runId,map:row=>{
    const d=row.dimensionValues||[],m=row.metricValues||[]
    const date=s(d[0]?.value)
    const day=date.length===8?`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`:date
    const campaignId=s(d[1]?.value)||s(d[2]?.value)||'(not set)'
    return {sourceId:[campaignId,day,d[3]?.value].join(':'),campaignId,campaignName:d[2]?.value||null,day,
      conversions:n(m[3]?.value),conversionValue:n(m[4]?.value),sessions:n(m[0]?.value),users:n(m[1]?.value),
      extra:{sourceMedium:d[3]?.value||null,eventCount:n(m[2]?.value)}}
  }})
  await saveCheckpoint({workspaceId:ctx.workspaceId,connector,stream,watermark:r.end.toISOString(),cursor:{offset}})
  return {...persisted,fetched:rows.length,streams:[stream]}
}

const syncHubSpot=async(ctx)=>{
  const connector='HubSpot'
  const token=await credential(ctx.workspaceId,connector)
  if(!token.access_token)throw new Error('HubSpot OAuth access token is required')
  const streams=[
    {object:'contacts',props:['firstname','lastname','email','phone','lifecyclestage','hs_lead_status','lastmodifieddate']},
    {object:'companies',props:['name','domain','industry','lifecyclestage','hs_lastmodifieddate']},
    {object:'deals',props:['dealname','amount','dealstage','pipeline','closedate','hs_lastmodifieddate']}
  ]
  let fetched=0,rawInserted=0,normalized=0
  for(const def of streams){
    const cp=await checkpoint(ctx.workspaceId,connector,def.object)
    const since=ctx.start?new Date(ctx.start):(ctx.mode==='incremental'&&cp?.watermark?new Date(new Date(cp.watermark).getTime()-60000):new Date(Date.now()-365*86400000))
    let after=0
    let maxModified=cp?.watermark?new Date(cp.watermark):since
    for(let page=0;page<maxPages();page++){
      const filterProperty=def.object==='contacts'?'lastmodifieddate':'hs_lastmodifieddate'
      const body={filterGroups:[{filters:[{propertyName:filterProperty,operator:'GTE',value:String(since.getTime())}]}],properties:def.props,sorts:[filterProperty],limit:100,after}
      const {json}=await requestJson(`https://api.hubapi.com/crm/v3/objects/${def.object}/search`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token.access_token},body:JSON.stringify(body),allowedOrigins:['https://api.hubapi.com']})
      const batch=json.results||[]
      fetched+=batch.length
      for(const row of batch){
        const modified=row.updatedAt||row.properties?.[filterProperty]||null
        if(modified&&new Date(modified)>maxModified)maxModified=new Date(modified)
        rawInserted+=await persistRaw({workspaceId:ctx.workspaceId,connector,stream:def.object,sourceId:row.id,observedAt:modified,payload:row,runId:ctx.runId})
        const p=row.properties||{}
        await upsertCrm({workspaceId:ctx.workspaceId,connector,objectType:def.object,sourceId:row.id,sourceUpdatedAt:modified,runId:ctx.runId,payload:row,
          normalized:{name:[p.firstname,p.lastname].filter(Boolean).join(' ')||p.name||p.dealname||null,email:p.email||null,phone:p.phone||null,stage:p.lifecyclestage||p.hs_lead_status||p.dealstage||null,revenue:n(p.amount),domain:p.domain||null}})
        normalized++
      }
      const next=json.paging?.next?.after
      if(next==null)break
      after=next
    }
    await saveCheckpoint({workspaceId:ctx.workspaceId,connector,stream:def.object,watermark:maxModified.toISOString(),cursor:{after}})
  }
  return {fetched,rawInserted,normalized,streams:streams.map(x=>x.object)}
}

const syncSalesforce=async(ctx)=>{
  const connector='Salesforce'
  const token=await credential(ctx.workspaceId,connector)
  const instance=String(token.instance_url||process.env.SALESFORCE_INSTANCE_URL||'').replace(/\/$/,'')
  if(!token.access_token||!instance)throw new Error('Salesforce access token and instance URL are required')
  const version=process.env.SALESFORCE_API_VERSION||'v65.0'
  const defs=[
    ['Lead','Id,FirstName,LastName,Company,Email,Phone,Status,LeadSource,LastModifiedDate'],
    ['Contact','Id,FirstName,LastName,AccountId,Email,Phone,LeadSource,LastModifiedDate'],
    ['Opportunity','Id,Name,AccountId,StageName,Amount,CloseDate,LeadSource,LastModifiedDate'],
    ['Campaign','Id,Name,Status,Type,StartDate,EndDate,ActualCost,NumberOfLeads,NumberOfConvertedLeads,LastModifiedDate']
  ]
  let fetched=0,rawInserted=0,normalized=0
  for(const [objectType,fields] of defs){
    const cp=await checkpoint(ctx.workspaceId,connector,objectType)
    const since=ctx.start?new Date(ctx.start):(ctx.mode==='incremental'&&cp?.watermark?new Date(new Date(cp.watermark).getTime()-60000):new Date(Date.now()-365*86400000))
    let url=`${instance}/services/data/${version}/query?q=${encodeURIComponent(`SELECT ${fields} FROM ${objectType} WHERE LastModifiedDate >= ${since.toISOString()} ORDER BY LastModifiedDate ASC`)}`
    let maxModified=cp?.watermark?new Date(cp.watermark):since
    for(let page=0;url&&page<maxPages();page++){
      const {json}=await requestJson(url,{headers:{Authorization:'Bearer '+token.access_token},allowedOrigins:[new URL(instance).origin]})
      const batch=json.records||[]
      fetched+=batch.length
      for(const row of batch){
        const modified=row.LastModifiedDate||null
        if(modified&&new Date(modified)>maxModified)maxModified=new Date(modified)
        rawInserted+=await persistRaw({workspaceId:ctx.workspaceId,connector,stream:objectType,sourceId:row.Id,observedAt:modified,payload:row,runId:ctx.runId})
        await upsertCrm({workspaceId:ctx.workspaceId,connector,objectType,sourceId:row.Id,sourceUpdatedAt:modified,runId:ctx.runId,payload:row,
          normalized:{name:[row.FirstName,row.LastName].filter(Boolean).join(' ')||row.Name||null,email:row.Email||null,phone:row.Phone||null,stage:row.Status||row.StageName||null,revenue:n(row.Amount),source:row.LeadSource||null}})
        normalized++
      }
      url=json.nextRecordsUrl?instance+json.nextRecordsUrl:null
    }
    await saveCheckpoint({workspaceId:ctx.workspaceId,connector,stream:objectType,watermark:maxModified.toISOString(),cursor:{}})
  }
  return {fetched,rawInserted,normalized,streams:defs.map(x=>x[0])}
}

const syncZoho=async(ctx)=>{
  const connector='Zoho CRM'
  const token=await credential(ctx.workspaceId,connector)
  const domain=String(token.api_domain||process.env.ZOHO_API_DOMAIN||'https://www.zohoapis.com').replace(/\/$/,'')
  const version=process.env.ZOHO_CRM_API_VERSION||'v8'
  if(!token.access_token)throw new Error('Zoho CRM OAuth access token is required')
  const modules=['Leads','Contacts','Deals','Campaigns']
  let fetched=0,rawInserted=0,normalized=0
  for(const module of modules){
    const cp=await checkpoint(ctx.workspaceId,connector,module)
    const since=ctx.start?new Date(ctx.start):(ctx.mode==='incremental'&&cp?.watermark?new Date(new Date(cp.watermark).getTime()-60000):new Date(Date.now()-365*86400000))
    let latest=cp?.watermark?new Date(cp.watermark):since
    for(let page=1;page<=maxPages();page++){
      const {json}=await requestJson(`${domain}/crm/${version}/${module}?page=${page}&per_page=200&sort_by=Modified_Time&sort_order=asc`,{
        headers:{Authorization:'Zoho-oauthtoken '+token.access_token,'If-Modified-Since':since.toISOString()},allowedOrigins:[new URL(domain).origin]
      })
      const batch=json.data||[]
      fetched+=batch.length
      for(const row of batch){
        const modified=row.Modified_Time||row.ModifiedTime||null
        if(modified&&new Date(modified)>latest)latest=new Date(modified)
        rawInserted+=await persistRaw({workspaceId:ctx.workspaceId,connector,stream:module,sourceId:row.id,observedAt:modified,payload:row,runId:ctx.runId})
        await upsertCrm({workspaceId:ctx.workspaceId,connector,objectType:module,sourceId:row.id,sourceUpdatedAt:modified,runId:ctx.runId,payload:row,
          normalized:{name:row.Full_Name||row.Deal_Name||row.Campaign_Name||[row.First_Name,row.Last_Name].filter(Boolean).join(' ')||null,email:row.Email||null,phone:row.Phone||row.Mobile||null,stage:row.Lead_Status||row.Stage||row.Status||null,revenue:n(row.Amount),source:row.Lead_Source||null}})
        normalized++
      }
      if(!json.info?.more_records)break
    }
    await saveCheckpoint({workspaceId:ctx.workspaceId,connector,stream:module,watermark:latest.toISOString(),cursor:{}})
  }
  return {fetched,rawInserted,normalized,streams:modules}
}

const linkedInDatePart=date=>({year:date.getUTCFullYear(),month:date.getUTCMonth()+1,day:date.getUTCDate()})
const linkedInDateRange=(start,end)=>{
  const a=linkedInDatePart(start),b=linkedInDatePart(end)
  return `(start:(year:${a.year},month:${a.month},day:${a.day}),end:(year:${b.year},month:${b.month},day:${b.day}))`
}

const syncLinkedIn=async(ctx)=>{
  const connector='LinkedIn Ads',stream='campaign_daily'
  const token=await credential(ctx.workspaceId,connector)
  const account=String(ctx.options.accountId||process.env.LINKEDIN_AD_ACCOUNT_ID||'').replace(/^urn:li:sponsoredAccount:/,'')
  if(!account||!token.access_token)throw new Error('LinkedIn Ads requires ad account ID and OAuth access token')
  const r=await rangeFor({...ctx,connector,stream,defaultBackfillDays:90})
  const version=process.env.LINKEDIN_MARKETING_VERSION||'202609'
  const params=new URLSearchParams({
    q:'analytics',
    dateRange:linkedInDateRange(r.start,r.end),
    timeGranularity:'DAILY',
    pivot:'CAMPAIGN',
    accounts:`List(urn:li:sponsoredAccount:${account})`,
    fields:'dateRange,pivotValues,impressions,clicks,costInLocalCurrency,externalWebsiteConversions,conversionValueInLocalCurrency'
  })
  const {json}=await requestJson('https://api.linkedin.com/rest/adAnalytics?'+params.toString(),{
    headers:{
      Authorization:'Bearer '+token.access_token,
      'Linkedin-Version':version,
      'X-Restli-Protocol-Version':'2.0.0'
    },
    allowedOrigins:['https://api.linkedin.com']
  })
  const rows=json.elements||[]
  const persisted=await persistAdRows({
    workspaceId:ctx.workspaceId,connector,stream,accountId:account,rows,runId:ctx.runId,
    map:row=>{
      const urn=String(row.pivotValues?.[0]||'')
      const campaignId=urn.split(':').at(-1)||urn
      const start=row.dateRange?.start||{}
      const day=[start.year,String(start.month||'').padStart(2,'0'),String(start.day||'').padStart(2,'0')].join('-')
      return {
        sourceId:[campaignId,day].join(':'),
        campaignId,
        campaignName:null,
        day,
        spend:n(row.costInLocalCurrency),
        impressions:n(row.impressions),
        clicks:n(row.clicks),
        conversions:n(row.externalWebsiteConversions),
        conversionValue:n(row.conversionValueInLocalCurrency),
        extra:{pivotValues:row.pivotValues||[],linkedInVersion:version}
      }
    }
  })
  await saveCheckpoint({workspaceId:ctx.workspaceId,connector,stream,watermark:r.end.toISOString(),cursor:{version}})
  return {...persisted,fetched:rows.length,streams:[stream]}
}

const syncTikTok=async(ctx)=>{
  const connector='TikTok Ads',stream='campaign_daily'
  const token=await credential(ctx.workspaceId,connector)
  const advertiserId=String(ctx.options.advertiserId||token.advertiser_id||process.env.TIKTOK_ADVERTISER_ID||'')
  if(!advertiserId||!token.access_token)throw new Error('TikTok Ads reporting requires advertiser_id and access_token')
  const r=await rangeFor({...ctx,connector,stream,defaultBackfillDays:90})
  const rows=[]
  for(let page=1;page<=maxPages();page++){
    const params=new URLSearchParams({advertiser_id:advertiserId,service_type:'AUCTION',report_type:'BASIC',data_level:'AUCTION_CAMPAIGN',dimensions:JSON.stringify(['campaign_id','stat_time_day']),metrics:JSON.stringify(['campaign_name','spend','impressions','clicks','conversion','total_purchase_value']),start_date:isoDay(r.start),end_date:isoDay(r.end),page:String(page),page_size:'1000'})
    const {json}=await requestJson('https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?'+params,{headers:{'Access-Token':token.access_token},allowedOrigins:['https://business-api.tiktok.com']})
    if(Number(json.code||0)!==0)throw new Error('TikTok reporting rejected request: '+String(json.message||json.code))
    const batch=json.data?.list||[]
    rows.push(...batch)
    if(page>=Number(json.data?.page_info?.total_page||1))break
  }
  const persisted=await persistAdRows({workspaceId:ctx.workspaceId,connector,stream,accountId:advertiserId,rows,runId:ctx.runId,map:row=>{
    const d=row.dimensions||{},m=row.metrics||{}
    return {sourceId:[d.campaign_id,d.stat_time_day].join(':'),campaignId:s(d.campaign_id),campaignName:m.campaign_name||null,day:s(d.stat_time_day).slice(0,10),spend:n(m.spend),impressions:n(m.impressions),clicks:n(m.clicks),conversions:n(m.conversion),conversionValue:n(m.total_purchase_value),extra:{}}
  }})
  await saveCheckpoint({workspaceId:ctx.workspaceId,connector,stream,watermark:r.end.toISOString(),cursor:{}})
  return {...persisted,fetched:rows.length,streams:[stream]}
}

const syncPinterest=async(ctx)=>{
  const connector='Pinterest',stream='campaign_daily'
  const token=await credential(ctx.workspaceId,connector)
  const account=String(ctx.options.accountId||token.ad_account_id||process.env.PINTEREST_AD_ACCOUNT_ID||'')
  if(!account||!token.access_token)throw new Error('Pinterest reporting requires ad account ID and access token')
  const r=await rangeFor({...ctx,connector,stream,defaultBackfillDays:90})
  const columns=['CAMPAIGN_ID','CAMPAIGN_NAME','SPEND_IN_MICRO_DOLLAR','IMPRESSION_1','CLICKTHROUGH_1','TOTAL_CONVERSIONS','TOTAL_CONVERSION_VALUE_IN_MICRO_DOLLAR']
  const url=`https://api.pinterest.com/v5/ad_accounts/${encodeURIComponent(account)}/analytics?start_date=${isoDay(r.start)}&end_date=${isoDay(r.end)}&granularity=DAY&columns=${encodeURIComponent(columns.join(','))}`
  const {json}=await requestJson(url,{headers:{Authorization:'Bearer '+token.access_token},allowedOrigins:['https://api.pinterest.com']})
  const rows=Array.isArray(json)?json:(json.items||json.data||[])
  const persisted=await persistAdRows({workspaceId:ctx.workspaceId,connector,stream,accountId:account,rows,runId:ctx.runId,map:row=>({
    sourceId:[row.CAMPAIGN_ID||row.campaign_id,row.DATE||row.date].join(':'),campaignId:s(row.CAMPAIGN_ID||row.campaign_id),campaignName:row.CAMPAIGN_NAME||row.campaign_name||null,
    day:row.DATE||row.date,spend:n(row.SPEND_IN_MICRO_DOLLAR||row.spend_in_micro_dollar)/1e6,impressions:n(row.IMPRESSION_1||row.impressions),
    clicks:n(row.CLICKTHROUGH_1||row.clicks),conversions:n(row.TOTAL_CONVERSIONS||row.total_conversions),conversionValue:n(row.TOTAL_CONVERSION_VALUE_IN_MICRO_DOLLAR||row.total_conversion_value_in_micro_dollar)/1e6,extra:{}
  })})
  await saveCheckpoint({workspaceId:ctx.workspaceId,connector,stream,watermark:r.end.toISOString(),cursor:{}})
  return {...persisted,fetched:rows.length,streams:[stream]}
}

const microsoftReportDate=date=>({
  Year:date.getUTCFullYear(),
  Month:date.getUTCMonth()+1,
  Day:date.getUTCDate()
})

const syncMicrosoftAds=async(ctx)=>{
  const connector='Microsoft Ads / Bing Ads',stream='campaign_daily'
  const token=await credential(ctx.workspaceId,connector)
  const accountId=String(ctx.options.accountId||process.env.MICROSOFT_ADS_ACCOUNT_ID||'').trim()
  const customerId=String(ctx.options.customerId||process.env.MICROSOFT_ADS_CUSTOMER_ID||'').trim()
  const developerToken=String(process.env.MICROSOFT_ADS_DEVELOPER_TOKEN||'').trim()
  if(!token.access_token||!accountId||!customerId||!developerToken){
    throw new Error('Microsoft Ads reporting requires OAuth, account ID, customer ID, and developer token')
  }
  const numericAccount=Number(accountId)
  if(!Number.isSafeInteger(numericAccount)||numericAccount<=0)throw new Error('MICROSOFT_ADS_ACCOUNT_ID must be a positive safe integer')
  const r=await rangeFor({...ctx,connector,stream,defaultBackfillDays:90})
  const base=String(process.env.MICROSOFT_ADS_REPORTING_BASE_URL||'https://reporting.api.bingads.microsoft.com/Reporting/v13').replace(/\/$/,'')
  const microsoftOrigin=new URL(base).origin
  if(!['https://reporting.api.bingads.microsoft.com','https://reporting.api.sandbox.bingads.microsoft.com'].includes(microsoftOrigin)){
    throw new Error('MICROSOFT_ADS_REPORTING_BASE_URL must use an official Microsoft Advertising reporting origin')
  }
  const headers={
    Authorization:'Bearer '+token.access_token,
    DeveloperToken:developerToken,
    CustomerId:customerId,
    CustomerAccountId:accountId,
    'Content-Type':'application/json'
  }
  const reportTime={
    CustomDateRangeStart:microsoftReportDate(r.start),
    CustomDateRangeEnd:microsoftReportDate(r.end)
  }
  if(process.env.MICROSOFT_ADS_REPORT_TIMEZONE)reportTime.ReportTimeZone=String(process.env.MICROSOFT_ADS_REPORT_TIMEZONE)
  const reportRequest={
    Type:'CampaignPerformanceReportRequest',
    ReportName:'AceMarketing Campaign Daily',
    Format:'Csv',
    FormatVersion:'2.0',
    ExcludeColumnHeaders:false,
    ExcludeReportHeader:true,
    ExcludeReportFooter:true,
    ReturnOnlyCompleteData:false,
    Aggregation:'Daily',
    Columns:['TimePeriod','AccountId','CampaignId','CampaignName','CurrencyCode','Impressions','Clicks','Spend','ConversionsQualified','Revenue'],
    Scope:{AccountIds:[numericAccount]},
    Time:reportTime
  }
  const submitted=await requestJson(base+'/GenerateReport/Submit',{
    method:'POST',headers,body:JSON.stringify({ReportRequest:reportRequest}),allowedOrigins:[new URL(base).origin]
  })
  const reportRequestId=String(submitted.json?.ReportRequestId||'')
  if(!reportRequestId){
    throw new Error('Microsoft Ads reporting did not return ReportRequestId: '+JSON.stringify(submitted.json?.Errors||submitted.json||{}).slice(0,1500))
  }
  const pollMs=Math.max(1000,Math.min(Number(process.env.MICROSOFT_ADS_REPORT_POLL_MS||3000),30000))
  const maxPolls=Math.max(1,Math.min(Number(process.env.MICROSOFT_ADS_REPORT_MAX_POLLS||100),600))
  let downloadUrl=''
  let finalStatus=''
  for(let attempt=0;attempt<maxPolls;attempt++){
    if(attempt>0)await sleep(pollMs)
    const polled=await requestJson(base+'/GenerateReport/Poll',{
      method:'POST',headers,body:JSON.stringify({ReportRequestId:reportRequestId}),allowedOrigins:[new URL(base).origin]
    })
    const state=polled.json?.ReportRequestStatus||{}
    finalStatus=String(state.Status||'')
    if(finalStatus.toLowerCase()==='success'){
      downloadUrl=String(state.ReportDownloadUrl||'')
      break
    }
    if(['error','failure','failed'].includes(finalStatus.toLowerCase())){
      throw new Error('Microsoft Ads report failed: '+JSON.stringify(state).slice(0,1500))
    }
  }
  if(!downloadUrl)throw new Error('Microsoft Ads report did not complete within polling budget; last status='+finalStatus)
  const zip=await requestBuffer(downloadUrl)
  const csv=unzipFirstFile(zip).toString('utf8')
  const rows=parseCsv(csv)
  const persisted=await persistAdRows({
    workspaceId:ctx.workspaceId,connector,stream,accountId,rows,runId:ctx.runId,
    map:row=>({
      sourceId:[row.CampaignId,row.TimePeriod].join(':'),
      campaignId:s(row.CampaignId),
      campaignName:row.CampaignName||null,
      day:reportDay(row.TimePeriod),
      currency:row.CurrencyCode||null,
      spend:reportNumber(row.Spend),
      impressions:reportNumber(row.Impressions),
      clicks:reportNumber(row.Clicks),
      conversions:reportNumber(row.ConversionsQualified),
      conversionValue:reportNumber(row.Revenue),
      extra:{reportRequestId}
    })
  })
  await saveCheckpoint({workspaceId:ctx.workspaceId,connector,stream,watermark:r.end.toISOString(),cursor:{reportRequestId,status:'success'}})
  return {...persisted,fetched:rows.length,streams:[stream],transport:'microsoft_reporting_rest',reportRequestId}
}

const syncBridgeJson=async(ctx,{connector,stream,urlEnv,accountEnv,tokenField='access_token'})=>{
  const token=await credential(ctx.workspaceId,connector)
  const url=String(ctx.options.url||process.env[urlEnv]||'')
  const accountId=String(ctx.options.accountId||token.account_id||process.env[accountEnv]||'')
  if(!url||!accountId||!token[tokenField])throw new Error(connector+' read sync requires '+urlEnv+', account ID, and read credential')
  const r=await rangeFor({...ctx,connector,stream,defaultBackfillDays:90})
  const endpoint=new URL(url)
  endpoint.searchParams.set('account_id',accountId)
  endpoint.searchParams.set('start_date',isoDay(r.start))
  endpoint.searchParams.set('end_date',isoDay(r.end))
  const {json}=await requestJson(endpoint,{headers:{Authorization:'Bearer '+token[tokenField]},allowedOrigins:[endpoint.origin]})
  const rows=Array.isArray(json)?json:(json.data||json.items||[])
  const persisted=await persistAdRows({workspaceId:ctx.workspaceId,connector,stream,accountId,rows,runId:ctx.runId,map:row=>({
    sourceId:[row.campaign_id||row.campaignId,row.date||row.day].join(':'),campaignId:s(row.campaign_id||row.campaignId),campaignName:row.campaign_name||row.campaignName||null,
    day:row.date||row.day,spend:n(row.spend),impressions:n(row.impressions),clicks:n(row.clicks),conversions:n(row.conversions),conversionValue:n(row.conversion_value||row.conversionValue),currency:row.currency||null,extra:row.extra||{}
  })})
  await saveCheckpoint({workspaceId:ctx.workspaceId,connector,stream,watermark:r.end.toISOString(),cursor:{}})
  return {...persisted,fetched:rows.length,streams:[stream],transport:'reporting_bridge'}
}

const adapters={
  'Google Ads':syncGoogleAds,
  'Meta Ads':syncMetaAds,
  'GA4':syncGa4,
  'LinkedIn Ads':syncLinkedIn,
  'HubSpot':syncHubSpot,
  'Salesforce':syncSalesforce,
  'Zoho CRM':syncZoho,
  'TikTok Ads':syncTikTok,
  'Pinterest':syncPinterest,
  'Microsoft Ads / Bing Ads':syncMicrosoftAds,
  'X':ctx=>syncBridgeJson(ctx,{connector:'X',stream:'campaign_daily',urlEnv:'X_ADS_REPORTING_URL',accountEnv:'X_ADS_ACCOUNT_ID'})
}

export const connectorReadCatalog=()=>Object.keys(adapters)

export const runConnectorSync=async({workspaceId,connector,mode='incremental',start=null,end=null,options={}})=>{
  if(!deploymentMode().features.providerReads)throw new Error('provider reads are disabled by deployment mode')
  if(!pool)throw new Error('DATABASE_URL is required for connector synchronization')
  if(!workspaceId)throw new Error('workspace scope required')
  const adapter=adapters[connector]
  if(!adapter)throw new Error('connector read synchronization is not implemented: '+connector)
  if(!['backfill','incremental','manual'].includes(mode))throw new Error('invalid sync mode')
  const runId=await createRun({workspaceId,connector,mode,start,end})
  try{
    const stats=await adapter({workspaceId,connector,mode,start,end,options,runId})
    await finishRun(workspaceId,runId,'succeeded',stats)
    return {runId,connector,mode,status:'succeeded',...stats}
  }catch(error){
    await finishRun(workspaceId,runId,'failed',{},error instanceof Error?error.message:String(error)).catch(()=>{})
    throw error
  }
}

export const listConnectorSyncRuns=async({workspaceId,connector=null,limit=50})=>{
  if(!pool)return []
  const safeLimit=Math.max(1,Math.min(Number(limit||50),200))
  const params=[workspaceId]
  let where='workspace_id=$1'
  if(connector){params.push(connector);where+=' AND connector=$2'}
  params.push(safeLimit)
  const {rows}=await tenantQuery(workspaceId,
    `SELECT id,connector,mode,status,requested_start,requested_end,cursor,stats,error,created_at,updated_at,completed_at
     FROM ace_connector_sync_runs WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length}`,params
  )
  return rows
}

export const listConnectorSyncSchedules=async({workspaceId})=>{
  if(!pool)return []
  const {rows}=await tenantQuery(workspaceId,
    'SELECT id,connector,enabled,interval_minutes,next_run_at,last_enqueued_at,last_job_id,options,created_at,updated_at FROM ace_connector_sync_schedules WHERE workspace_id=$1 ORDER BY connector',
    [workspaceId]
  )
  return rows
}

export const saveConnectorSyncSchedule=async({workspaceId,connector,enabled=true,intervalMinutes=60,options={}})=>{
  if(enabled&&!deploymentMode().features.providerReads)throw new Error('provider reads are disabled by deployment mode')
  if(!pool)throw new Error('DATABASE_URL is required for connector schedules')
  if(!connectorReadCatalog().includes(connector))throw new Error('connector does not support read synchronization')
  const interval=Math.max(5,Math.min(Number(intervalMinutes||60),10080))
  const id='css_'+sha([workspaceId,connector]).slice(0,32)
  const {rows}=await tenantQuery(workspaceId,
    `INSERT INTO ace_connector_sync_schedules(id,workspace_id,connector,enabled,interval_minutes,next_run_at,options,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,now(),$6::jsonb,now(),now())
     ON CONFLICT(workspace_id,connector) DO UPDATE SET
       enabled=EXCLUDED.enabled,interval_minutes=EXCLUDED.interval_minutes,options=EXCLUDED.options,
       next_run_at=CASE WHEN ace_connector_sync_schedules.enabled=false AND EXCLUDED.enabled=true THEN now() ELSE ace_connector_sync_schedules.next_run_at END,
       updated_at=now()
     RETURNING id,connector,enabled,interval_minutes,next_run_at,last_enqueued_at,last_job_id,options,created_at,updated_at`,
    [id,workspaceId,connector,Boolean(enabled),interval,JSON.stringify(options||{})]
  )
  return rows[0]
}

export const runDueConnectorSyncSchedules=async({limit=10}={})=>{
  if(!pool)return {checked:0,enqueued:0}
  const safeLimit=Math.max(1,Math.min(Number(limit||10),100))
  const {rows}=await systemQuery(
    `SELECT id,workspace_id,connector,interval_minutes,next_run_at,options
     FROM ace_connector_sync_schedules
     WHERE enabled=true AND next_run_at<=now()
     ORDER BY next_run_at ASC LIMIT $1`,
    [safeLimit]
  )
  let enqueued=0
  for(const row of rows){
    const claimed=await systemQuery(
      `UPDATE ace_connector_sync_schedules
       SET next_run_at=now()+(interval_minutes*interval '1 minute'),last_enqueued_at=now(),updated_at=now()
       WHERE id=$1 AND enabled=true AND next_run_at=$2
       RETURNING id,next_run_at`,
      [row.id,row.next_run_at]
    )
    if(!claimed.rowCount)continue
    const job=await enqueueJob({
      workspaceId:row.workspace_id,
      kind:'connector_sync',
      payload:{connector:row.connector,mode:'incremental',start:null,end:null,options:row.options||{},scheduleId:row.id},
      idempotencyKey:'connector-schedule:'+row.id+':'+new Date(row.next_run_at).toISOString(),
      maxAttempts:Number(process.env.CONNECTOR_SYNC_MAX_ATTEMPTS||3),
      deadlineAt:new Date(Date.now()+Number(process.env.CONNECTOR_SYNC_JOB_DEADLINE_MS||30*60*1000)).toISOString(),
      inputSnapshot:{schemaVersion:'connector-sync.v1',connector:row.connector,mode:'incremental',scheduleId:row.id,capturedAt:new Date().toISOString()},
      resultSchemaVersion:'connector-sync-result.v1'
    })
    if(job?.id){
      enqueued++
      await systemQuery('UPDATE ace_connector_sync_schedules SET last_job_id=$2 WHERE id=$1',[row.id,job.id])
    }
  }
  return {checked:rows.length,enqueued}
}

export const listConnectorCampaignFacts=async({workspaceId,limit=100,days=90})=>{
  if(!pool)return []
  const safeLimit=Math.max(1,Math.min(Number(limit||100),500))
  const lookback=Math.max(1,Math.min(Number(days||90),730))
  const cutoff=new Date(Date.now()-lookback*86400000).toISOString().slice(0,10)
  const {rows}=await tenantQuery(workspaceId,
    `SELECT connector,account_id,campaign_id,MAX(campaign_name) campaign_name,
            SUM(spend)::numeric spend,SUM(impressions)::bigint impressions,SUM(clicks)::bigint clicks,
            SUM(conversions)::numeric conversions,SUM(conversion_value)::numeric conversion_value,
            SUM(sessions)::numeric sessions,SUM(users)::numeric users,MIN(day) first_day,MAX(day) last_day
     FROM ace_campaign_daily
     WHERE workspace_id=$1 AND day >= $2
     GROUP BY connector,account_id,campaign_id
     ORDER BY SUM(spend) DESC, SUM(conversion_value) DESC
     LIMIT $3`,
    [workspaceId,cutoff,safeLimit]
  )
  return rows.map(row=>{
    const base={
      id:row.connector+':'+row.account_id+':'+row.campaign_id,
      connector:row.connector,
      accountId:row.account_id,
      campaignId:row.campaign_id,
      name:row.campaign_name||row.campaign_id,
      spend:n(row.spend),
      impressions:n(row.impressions),
      clicks:n(row.clicks),
      leads:null,
      customers:n(row.conversions),
      conversions:n(row.conversions),
      revenue:n(row.conversion_value),
      sessions:n(row.sessions),
      users:n(row.users),
      firstDay:row.first_day,
      lastDay:row.last_day
    }
    return {...base,metrics:deriveMarketingMetrics(base)}
  })
}

export const connectorDataSummary=async(workspaceId)=>{
  if(!pool)return {available:false}
  const [campaigns,crm,raw,checkpoints]=await Promise.all([
    tenantQuery(workspaceId,'SELECT connector,COUNT(*)::int rows,MIN(day) min_day,MAX(day) max_day,SUM(spend)::numeric spend,SUM(conversion_value)::numeric conversion_value FROM ace_campaign_daily WHERE workspace_id=$1 GROUP BY connector ORDER BY connector',[workspaceId]),
    tenantQuery(workspaceId,'SELECT connector,object_type,COUNT(*)::int rows,MAX(source_updated_at) max_source_updated_at FROM ace_crm_records WHERE workspace_id=$1 GROUP BY connector,object_type ORDER BY connector,object_type',[workspaceId]),
    tenantQuery(workspaceId,'SELECT connector,stream,COUNT(*)::int rows,MAX(ingested_at) last_ingested_at FROM ace_connector_raw_records WHERE workspace_id=$1 GROUP BY connector,stream ORDER BY connector,stream',[workspaceId]),
    tenantQuery(workspaceId,'SELECT connector,stream,watermark,cursor,updated_at FROM ace_connector_checkpoints WHERE workspace_id=$1 ORDER BY connector,stream',[workspaceId])
  ])
  return {available:true,campaigns:campaigns.rows,crm:crm.rows,raw:raw.rows,checkpoints:checkpoints.rows,generatedAt:nowIso()}
}


export const connectorParsingSupport=Object.freeze({
  parseCsv,
  unzipFirstFile,
  reportDay,
  reportNumber
})
