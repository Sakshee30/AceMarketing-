import test,{after} from 'node:test'
import assert from 'node:assert/strict'
import {createReadStream,readFileSync,writeFileSync} from 'node:fs'
import {createInterface} from 'node:readline'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {upsertLeadProfile,leadIdentityStats,leadOpsStats} from '../src/lead-ops.mjs'
import {appendTrackedEvent,trackedEventStats,listTrackedEvents} from '../src/tracked-events.mjs'
import {calculateMetricSet} from '../src/metric-catalog.mjs'
import {upsertCampaignDailyFact,connectorDataSummary} from '../src/connector-ingestion.mjs'
import {pool} from '../src/database.mjs'
const isolated=process.env.QA_ISOLATED==='1'&&Boolean(process.env.QA_NATIVE_ADMIN_URL)
const report={scope:'Actual application data-layer integration on isolated real PostgreSQL; NOT full API/browser/load qualification',leadsImported:0,eventsImported:0,checks:[],providerCampaignRowsImported:0}
let root,leads,oracle
async function parallel(items,operation,concurrency=8){let next=0;await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{while(next<items.length){const i=next++;await operation(items[i],i)}}))}
const leadInput=l=>({externalLeadId:l.lead_id,name:l.display_name,email:l.email,source:'synthetic_fixture',campaign:l.campaign_id,crmStage:l.stage,lastActivity:l.updated_at,attributes:{sourceRecordId:l.source_record_id,fixtureVersion:l.fixture_version}})
const eventInput=e=>({id:e.event_id,event:e.event_type,eventType:e.event_type,occurredAt:e.occurred_at,receivedAt:e.received_at,consentCategory:'analytics',source:e.source_kind,customerId:e.lead_id,visitorId:e.anonymous_id,campaign:e.campaign_id,currency:e.currency,amount:e.amount_minor/100,amountMinor:e.amount_minor,parentEventId:e.parent_event_id,fixtureVersion:e.fixture_version})
after(async()=>{if(isolated&&process.env.QA_REPORTS)writeFileSync(join(process.env.QA_REPORTS,'functional-volume.json'),JSON.stringify(report,null,2)+'\n');await pool?.end()})
test('D2 volume: supplied functional source regenerates without byte drift',{skip:!isolated},()=>{
 root=join(process.env.QA_PRIVATE_ROOT,'full-functional-volume');execFileSync('python3',['qa/materialize-functional.py',root],{stdio:'pipe'})
 leads=JSON.parse(readFileSync(join(root,'leads.json')));oracle=JSON.parse(readFileSync(join(root,'D2_marketing/expected_reconciliation.json')))
 assert.equal(leads.length,10000);report.source=JSON.parse(readFileSync(join(root,'source-validation.json')));report.checks.push('five source hashes match')
})
test('D2 volume: actual lead repository imports 10000 supplied leads and replay remains idempotent',{skip:!isolated,timeout:300000},async()=>{
 assert.ok(leads,'fixture prerequisite');const started=performance.now()
 await parallel(leads,async l=>{const r=await upsertLeadProfile(l.workspace_id,leadInput(l));assert.equal(r.external_lead_id,l.lead_id);report.leadsImported++})
 await parallel(leads.slice(0,1000),l=>upsertLeadProfile(l.workspace_id,leadInput(l)))
 const {rows}=await pool.query('SELECT external_lead_id,workspace_id,name,email_sha256,crm_stage,campaign FROM ace_lead_profiles')
 assert.equal(rows.length,10000);const records=new Map(rows.map(r=>[r.external_lead_id,r]))
 for(const l of leads){const r=records.get(l.lead_id);assert.ok(r);assert.equal(r.workspace_id,l.workspace_id);assert.equal(r.name,l.display_name);assert.equal(r.crm_stage,l.stage);assert.equal(r.campaign,l.campaign_id);assert.equal(r.email_sha256,createHash('sha256').update(l.email.toLowerCase()).digest('hex'))}
 for(const workspace of new Set(leads.map(l=>l.workspace_id))){
  assert.equal((await leadOpsStats(workspace)).total,2500)
  const identity=await leadIdentityStats(workspace)
  assert.equal(identity.total,2500,'identity summary must use the full workspace population, not the 500-row list cap')
  assert.ok(identity.stitchedProfiles>=0&&identity.stitchedProfiles<=identity.total)
 }
 report.leadReplay=1000;report.leadSeconds=(performance.now()-started)/1000;report.checks.push('all lead IDs, tenants, campaigns, stages, names and email hashes reconcile; identity totals cover all 2500 profiles per populated workspace')
})


test('D2 volume: actual campaign daily repository imports all 9000 provider rows and replay stays idempotent',{skip:!isolated,timeout:300000},async()=>{
 assert.ok(root,'fixture prerequisite')
 const campaigns=JSON.parse(readFileSync(join(root,'campaigns.json')))
 const campaignMap=new Map(campaigns.map(x=>[x.campaign_id,x]))
 const rows=JSON.parse(readFileSync(join(root,'campaign_daily.json')))
 assert.equal(rows.length,9000)
 const connectorNames={META:'Meta Ads',GOOG:'Google Ads',XADS:'X',TIK:'TikTok Ads',LINK:'LinkedIn Ads',PIN:'Pinterest',MS:'Microsoft Ads / Bing Ads'}
 const persist=async row=>{
  const campaign=campaignMap.get(row.campaign_id);assert.ok(campaign,'campaign metadata required')
  await upsertCampaignDailyFact({
   workspaceId:row.workspace_id,
   connector:connectorNames[row.provider_code]||row.provider_code,
   accountId:campaign.provider_account_id||'',
   campaignId:row.campaign_id,
   campaignName:campaign.name,
   day:row.date,
   currency:row.currency,
   spend:Number(row.spend_minor)/100,
   impressions:Number(row.impressions),
   clicks:Number(row.clicks),
   conversions:0,
   conversionValue:0,
   extra:{fixtureStatId:row.stat_id,sourceKind:row.source_kind}
  })
 }
 await parallel(rows,persist)
 await parallel(rows.slice(0,100),persist)
 const total=Number((await pool.query('SELECT count(*) n FROM ace_campaign_daily')).rows[0].n)
 assert.equal(total,9000)
 const sums=(await pool.query('SELECT SUM(spend)::numeric spend,SUM(impressions)::bigint impressions,SUM(clicks)::bigint clicks FROM ace_campaign_daily')).rows[0]
 assert.equal(Math.round(Number(sums.spend)*100),oracle.provider_daily.spend_minor)
 assert.equal(Number(sums.impressions),oracle.provider_daily.impressions)
 assert.equal(Number(sums.clicks),oracle.provider_daily.clicks)
 const summary=await connectorDataSummary(rows[0].workspace_id)
 assert.equal(summary.available,true)
 assert.ok(summary.campaigns.length>0)
 report.providerCampaignRowsImported=9000
 report.providerCampaignReplay=100
 report.checks.push('9000 provider daily rows persisted through normalized connector data layer; replay idempotent and aggregate oracle reconciled')
})

test('D2 volume: actual event repository persists 100000 original events and deduplicates replay',{skip:!isolated,timeout:300000},async()=>{
 assert.ok(root,'fixture prerequisite');const started=performance.now();let batch=[];const replay=[]
 for await(const line of createInterface({input:createReadStream(join(root,'D2_marketing/events.ndjson')),crlfDelay:Infinity})){
  const e=JSON.parse(line);batch.push(e);if(replay.length<1000)replay.push(e)
  if(batch.length===512){await parallel(batch,async x=>{const r=await appendTrackedEvent(x.workspace_id,eventInput(x));assert.equal(r.id,x.event_id);report.eventsImported++});batch=[]}
 }
 if(batch.length)await parallel(batch,async x=>{await appendTrackedEvent(x.workspace_id,eventInput(x));report.eventsImported++})
 await parallel(replay,x=>appendTrackedEvent(x.workspace_id,eventInput(x)))
 assert.equal(report.eventsImported,100000);assert.equal(Number((await pool.query('SELECT count(*) n FROM ace_events')).rows[0].n),100000)
 report.eventReplay=1000;report.eventSeconds=(performance.now()-started)/1000;report.checks.push('100000 event IDs persisted once after 1000 replays')
})
test('D2 volume: persisted event types and monetary minor units match independent oracle',{skip:!isolated},async()=>{
 assert.equal(report.eventsImported,100000,'complete event ingest prerequisite')
 const {rows}=await pool.query("SELECT event_type,count(*)::int n,sum((payload->>'amountMinor')::bigint)::text amount FROM ace_events GROUP BY event_type")
 assert.deepEqual(Object.fromEntries(rows.map(r=>[r.event_type,r.n])),oracle.event_type_counts)
 const sums=Object.fromEntries(rows.map(r=>[r.event_type,Number(r.amount)]))
 assert.equal(sums['payment.succeeded'],oracle.first_party.revenue_minor);assert.equal(sums['payment.refunded'],oracle.first_party.refunds_minor)
 assert.equal(sums['payment.succeeded']-sums['payment.refunded'],oracle.first_party.net_revenue_minor)
 const persisted=await pool.query('SELECT payload FROM ace_events')
 const result=calculateMetricSet({events:persisted.rows.map(r=>r.payload),startAt:oracle.window_start_inclusive,endAt:oracle.window_end_exclusive,currency:'INR'})
 assert.equal(result.metrics.leads,10000);assert.equal(result.metrics.qualified_leads,2000);assert.equal(result.metrics.customers,1000)
 assert.equal(result.metrics.revenue,oracle.first_party.revenue_minor/100);assert.equal(result.metrics.refunds,oracle.first_party.refunds_minor/100);assert.equal(result.metrics.net_revenue,oracle.first_party.net_revenue_minor/100)
 assert.equal(result.metrics.impressions,10000);assert.equal(result.metrics.clicks,10000);assert.equal(result.metrics.roas,null,'no provider spend was injected into first-party events')
 report.firstPartyMetrics=result.metrics;report.checks.push('event classes, net revenue and independent first-party metric oracle reconcile')
})
test('D2 volume: application readers enforce explicit workspace filters and documented caps',{skip:!isolated},async()=>{
 assert.equal(report.eventsImported,100000,'complete event ingest prerequisite')
 for(const workspace of new Set(leads.map(l=>l.workspace_id))){assert.equal((await trackedEventStats(workspace)).total,25000);const rows=await listTrackedEvents(workspace,{limit:99999});assert.equal(rows.length,5000);for(const r of rows){assert.equal(r.email,undefined);assert.equal(r.phone,undefined)}}
 assert.equal((await trackedEventStats('qa_ace_v1_workspace_000005')).total,0)
 assert.deepEqual(await listTrackedEvents('qa_ace_v1_workspace_000005'),[])
 report.checks.push('four 25000-event workspace counts, 5000-read cap, empty workspace and no raw contact fields');report.dataLayerChecksComplete=true
})
