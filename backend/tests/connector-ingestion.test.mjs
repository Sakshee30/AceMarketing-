import test from 'node:test'
import assert from 'node:assert/strict'
import {connectorReadCatalog,connectorDataSummary,listConnectorSyncRuns,connectorParsingSupport} from '../src/connector-ingestion.mjs'

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


const storedZip=(name,data)=>{
  const nameBuffer=Buffer.from(name)
  const body=Buffer.from(data)
  const local=Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50,0)
  local.writeUInt16LE(20,4)
  local.writeUInt16LE(0,6)
  local.writeUInt16LE(0,8)
  local.writeUInt32LE(0,14)
  local.writeUInt32LE(body.length,18)
  local.writeUInt32LE(body.length,22)
  local.writeUInt16LE(nameBuffer.length,26)
  local.writeUInt16LE(0,28)
  const localRecord=Buffer.concat([local,nameBuffer,body])

  const central=Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50,0)
  central.writeUInt16LE(20,4)
  central.writeUInt16LE(20,6)
  central.writeUInt16LE(0,8)
  central.writeUInt16LE(0,10)
  central.writeUInt32LE(0,16)
  central.writeUInt32LE(body.length,20)
  central.writeUInt32LE(body.length,24)
  central.writeUInt16LE(nameBuffer.length,28)
  central.writeUInt16LE(0,30)
  central.writeUInt16LE(0,32)
  central.writeUInt32LE(0,42)
  const centralRecord=Buffer.concat([central,nameBuffer])

  const end=Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50,0)
  end.writeUInt16LE(0,4)
  end.writeUInt16LE(0,6)
  end.writeUInt16LE(1,8)
  end.writeUInt16LE(1,10)
  end.writeUInt32LE(centralRecord.length,12)
  end.writeUInt32LE(localRecord.length,16)
  end.writeUInt16LE(0,20)
  return Buffer.concat([localRecord,centralRecord,end])
}

test('Microsoft report ZIP parser extracts canonical CSV fields without external dependencies',()=>{
  const csv='TimePeriod,CampaignId,CampaignName,CurrencyCode,Impressions,Clicks,Spend,ConversionsQualified,Revenue\r\n2026-10-01,123,"Brand, Search",USD,1000,50,25.50,4.5,400\r\n'
  const extracted=connectorParsingSupport.unzipFirstFile(storedZip('report.csv',csv)).toString('utf8')
  const rows=connectorParsingSupport.parseCsv(extracted)
  assert.equal(rows.length,1)
  assert.equal(rows[0].CampaignId,'123')
  assert.equal(rows[0].CampaignName,'Brand, Search')
  assert.equal(connectorParsingSupport.reportDay(rows[0].TimePeriod),'2026-10-01')
  assert.equal(connectorParsingSupport.reportNumber(rows[0].Spend),25.5)
  assert.equal(connectorParsingSupport.reportNumber(rows[0].ConversionsQualified),4.5)
})
