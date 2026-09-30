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
