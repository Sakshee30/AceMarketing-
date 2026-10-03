import test,{after} from 'node:test'
import assert from 'node:assert/strict'
import {runConnectorSync} from '../src/connector-ingestion.mjs'
import {withWorkspace,mutateState,closeStore} from '../src/store.mjs'
import {encryptSecret} from '../src/vault.mjs'
import {pool} from '../src/database.mjs'
const origin='https://graph.facebook.com'
const row=(id)=>({campaign_id:id,campaign_name:'Synthetic '+id,date_start:'2026-09-01',date_stop:'2026-09-01',spend:'10.00',impressions:'100',clicks:'5',actions:[],action_values:[]})
const json=value=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}})
let serial=0
async function setup(connector='Meta Ads'){
 const workspaceId='qa_pagination_'+(++serial)
 await withWorkspace(workspaceId,()=>mutateState(s=>{s.connectorCredentials=[{id:'SIM_CREDENTIAL',connector,encrypted:encryptSecret({access_token:'SIM_ACCESS_TOKEN'}),expiresAt:null}]}))
 return {workspaceId,connector,mode:'backfill',start:'2026-09-01',end:'2026-09-02',options:{accountId:'SIM_ACCOUNT',customerId:'SIM_CUSTOMER',propertyId:'SIM_PROPERTY'}}
}
async function checkpointCount(ctx){return Number((await pool.query('SELECT count(*) n FROM ace_connector_checkpoints WHERE workspace_id=$1',[ctx.workspaceId])).rows[0].n)}
async function expectFailed(ctx){
 assert.equal(await checkpointCount(ctx),0,'failed sync must not advance watermark')
 const {rows}=await pool.query('SELECT status FROM ace_connector_sync_runs WHERE workspace_id=$1',[ctx.workspaceId]);assert.equal(rows.at(-1).status,'failed')
}
after(()=>closeStore())
test('PROV Meta valid pagination persists each source row once and replay reconciles',async t=>{
 const ctx=await setup();let calls=0
 t.mock.method(globalThis,'fetch',async(u)=>{assert.equal(new URL(u).origin,origin);calls++;return String(u).includes('/page2')?json({data:[row('SIM_C2')]}):json({data:[row('SIM_C1')],paging:{next:origin+'/page2'}})})
 const first=await runConnectorSync(ctx);assert.equal(first.normalized,2);assert.equal(first.rawInserted,2)
 const second=await runConnectorSync(ctx);assert.equal(second.normalized,2);assert.equal(second.rawInserted,0);assert.equal(calls,4)
 const {rows}=await pool.query('SELECT count(*)::int n,sum(spend)::numeric spend FROM ace_campaign_daily WHERE workspace_id=$1',[ctx.workspaceId]);assert.equal(rows[0].n,2);assert.equal(Number(rows[0].spend),20)
})
test('PROV Meta repeated next cursor fails instead of reporting truncated success',async t=>{
 const ctx=await setup();let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return json({data:[row('SIM_C1')],paging:{next:origin+'/same'}})})
 await assert.rejects(runConnectorSync(ctx),/repeated pagination/);assert.equal(calls,2);await expectFailed(ctx)
})
test('PROV Meta configured page limit cannot advance an incomplete watermark',async t=>{
 const ctx=await setup();const previous=process.env.CONNECTOR_SYNC_MAX_PAGES;process.env.CONNECTOR_SYNC_MAX_PAGES='2';let calls=0
 t.mock.method(globalThis,'fetch',async()=>json({data:[row('SIM_C'+(++calls))],paging:{next:origin+'/next/'+calls}}))
 try{await assert.rejects(runConnectorSync(ctx),/page limit/);assert.equal(calls,2);await expectFailed(ctx)}finally{if(previous===undefined)delete process.env.CONNECTOR_SYNC_MAX_PAGES;else process.env.CONNECTOR_SYNC_MAX_PAGES=previous}
})
test('PROV Meta page-two failure preserves recoverable checkpoint and retry loads complete history',async t=>{
 const ctx=await setup();let fail=true
 t.mock.method(globalThis,'fetch',async(u)=>String(u).includes('/page2')?(fail?new Response(null,{status:429,headers:{'retry-after':'2'}}):json({data:[row('SIM_C2')]})):json({data:[row('SIM_C1')],paging:{next:origin+'/page2'}}))
 await assert.rejects(runConnectorSync(ctx),e=>e.status===429);await expectFailed(ctx)
 assert.equal(Number((await pool.query('SELECT count(*) n FROM ace_campaign_daily WHERE workspace_id=$1',[ctx.workspaceId])).rows[0].n),0)
 fail=false;const result=await runConnectorSync(ctx);assert.equal(result.normalized,2);assert.equal(await checkpointCount(ctx),1)
})
for(const [label,payload] of [['missing data',{}],['object data',{data:{}}],['null data',{data:null}]])test('PROV Meta rejects '+label+' rather than silently succeeding',async t=>{
 const ctx=await setup();t.mock.method(globalThis,'fetch',async()=>json(payload));await assert.rejects(runConnectorSync(ctx),/schema invalid/);await expectFailed(ctx)
})
test('PROV Meta malformed HTTP-200 JSON records failure without advancing checkpoint',async t=>{
 const ctx=await setup();t.mock.method(globalThis,'fetch',async()=>new Response('{invalid',{headers:{'content-type':'application/json'}}));await assert.rejects(runConnectorSync(ctx),/invalid JSON/);await expectFailed(ctx)
})
test('PROV Meta explicitly empty data is distinct from corrupt provider payload',async t=>{
 const ctx=await setup();t.mock.method(globalThis,'fetch',async()=>json({data:[]}));const r=await runConnectorSync(ctx);assert.equal(r.status,'succeeded');assert.equal(r.fetched,0);assert.equal(await checkpointCount(ctx),1)
})
test('PROV Google Ads rejects non-stream response object before watermark advancement',async t=>{
 const ctx=await setup('Google Ads'),previous=process.env.GOOGLE_ADS_DEVELOPER_TOKEN;process.env.GOOGLE_ADS_DEVELOPER_TOKEN='SIM_DEVELOPER_TOKEN'
 t.mock.method(globalThis,'fetch',async()=>json({unexpected:true}))
 try{await assert.rejects(runConnectorSync(ctx),/schema invalid/);await expectFailed(ctx)}finally{if(previous===undefined)delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN;else process.env.GOOGLE_ADS_DEVELOPER_TOKEN=previous}
})
test('PROV GA4 cannot report success when declared rows are absent',async t=>{
 const ctx=await setup('GA4');t.mock.method(globalThis,'fetch',async()=>json({rowCount:3}));await assert.rejects(runConnectorSync(ctx),/schema invalid/);await expectFailed(ctx)
})
