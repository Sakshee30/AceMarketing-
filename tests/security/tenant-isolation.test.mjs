import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {embeddedDatabase,pool} from '../../backend/src/database.mjs'
import {
  effectiveUsageForMetric,
  recordUsageLedgerEvent
} from '../../backend/src/platform/usage-ledger.mjs'
import {withTenantDbTransaction} from '../../backend/src/platform/tenant-db.mjs'

test('tenant-scoped usage APIs never return another workspace ledger rows',{skip:embeddedDatabase||!pool},async()=>{
  const suffix=randomUUID().replaceAll('-','')
  const left='ws_iso_left_'+suffix
  const right='ws_iso_right_'+suffix
  const metric='isolation_probe_'+suffix

  await recordUsageLedgerEvent({workspaceId:left,eventId:'left_'+suffix,metric,quantity:3,metadata:{marker:'left'}})
  await recordUsageLedgerEvent({workspaceId:right,eventId:'right_'+suffix,metric,quantity:7,metadata:{marker:'right'}})

  const leftUsage=await effectiveUsageForMetric({workspaceId:left,metric})
  const rightUsage=await effectiveUsageForMetric({workspaceId:right,metric})
  assert.equal(leftUsage.ledger,3)
  assert.equal(rightUsage.ledger,7)

  const leftRows=await withTenantDbTransaction(left,async client=>(await client.query(
    'SELECT workspace_id,event_id,quantity FROM ace_usage_ledger WHERE workspace_id=$1 AND metric=$2 ORDER BY event_id',
    [left,metric]
  )).rows)
  assert.deepEqual(leftRows.map(row=>row.workspace_id),[left])
  assert.deepEqual(leftRows.map(row=>Number(row.quantity)),[3])

  await pool.query('DELETE FROM ace_usage_ledger WHERE workspace_id IN ($1,$2) AND metric=$3',[left,right,metric])
})

test('workspace identity must be explicit and bounded before tenant transaction use',async()=>{
  await assert.rejects(
    ()=>withTenantDbTransaction('',async()=>true),
    error=>/workspace/i.test(String(error?.message||''))
  )
  await assert.rejects(
    ()=>withTenantDbTransaction('invalid workspace with spaces',async()=>true),
    error=>/workspace/i.test(String(error?.message||''))
  )
})
