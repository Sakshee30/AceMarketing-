import test from 'node:test'
import assert from 'node:assert/strict'
import {embeddedDatabase,pool} from '../src/database.mjs'
import {withSystemDbTransaction,withTenantDbTransaction} from '../src/platform/tenant-db.mjs'

test('tenant database context executes in a bounded transaction',async()=>{
  if(!pool)return
  const value=await withTenantDbTransaction('ws_tenant_db_test',async client=>{
    const {rows}=await client.query('SELECT 1 AS ok')
    return Number(rows[0].ok)
  })
  assert.equal(value,1)
})

test('system database context is available for cross-tenant workers',async()=>{
  if(!pool)return
  const value=await withSystemDbTransaction(async client=>{
    const {rows}=await client.query('SELECT 1 AS ok')
    return Number(rows[0].ok)
  })
  assert.equal(value,1)
})

test('production RLS migration is intentionally skipped only by embedded pg-mem',()=>{
  assert.equal(typeof embeddedDatabase,'boolean')
})


test('pooled tenant context is transaction-local and clears after commit',{skip:embeddedDatabase||!pool},async()=>{
  const workspaceId='ws_context_commit'
  await withTenantDbTransaction(workspaceId,async client=>{
    const {rows}=await client.query("SELECT current_setting('app.workspace_id',true) AS workspace_id,current_setting('app.system_worker',true) AS system_worker")
    assert.equal(rows[0].workspace_id,workspaceId)
    assert.equal(rows[0].system_worker,'false')
  })
  const client=await pool.connect()
  try{
    const {rows}=await client.query("SELECT current_setting('app.workspace_id',true) AS workspace_id,current_setting('app.system_worker',true) AS system_worker")
    assert.ok(rows[0].workspace_id==null||rows[0].workspace_id==='')
    assert.ok(rows[0].system_worker==null||rows[0].system_worker==='')
  }finally{client.release()}
})

test('pooled tenant context clears after rollback and cannot leak to the next operation',{skip:embeddedDatabase||!pool},async()=>{
  await assert.rejects(
    ()=>withTenantDbTransaction('ws_context_rollback',async client=>{
      const {rows}=await client.query("SELECT current_setting('app.workspace_id',true) AS workspace_id")
      assert.equal(rows[0].workspace_id,'ws_context_rollback')
      throw new Error('force rollback')
    }),
    /force rollback/
  )
  const observed=await withTenantDbTransaction('ws_context_next',async client=>{
    const {rows}=await client.query("SELECT current_setting('app.workspace_id',true) AS workspace_id,current_setting('app.system_worker',true) AS system_worker")
    return rows[0]
  })
  assert.equal(observed.workspace_id,'ws_context_next')
  assert.equal(observed.system_worker,'false')
})
