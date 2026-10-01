import test from 'node:test'
import assert from 'node:assert/strict'
import {connectorReadCatalog,connectorDataSummary,listConnectorSyncRuns} from '../src/connector-ingestion.mjs'

test('connector read catalog includes all provider rows exposed for sync testing',()=>{
  const items=connectorReadCatalog()
  for(const name of ['Google Ads','Meta Ads','GA4','LinkedIn Ads','HubSpot','Salesforce','Zoho CRM','TikTok Ads','Pinterest','Microsoft Ads / Bing Ads','X']){
    assert.ok(items.includes(name),name+' should be readable')
  }
})

test('connector ingestion stores are queryable in embedded test database',async()=>{
  const summary=await connectorDataSummary('ws_connector_test')
  assert.equal(summary.available,true)
  assert.deepEqual(summary.campaigns,[])
  assert.deepEqual(summary.crm,[])
  assert.deepEqual(await listConnectorSyncRuns({workspaceId:'ws_connector_test'}),[])
})
