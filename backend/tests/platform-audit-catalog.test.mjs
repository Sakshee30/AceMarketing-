import test from 'node:test'
import assert from 'node:assert/strict'
import {embeddedDatabase} from '../src/database.mjs'
import {appendAuditRecord,listAuditRecords} from '../src/platform/audit-store.mjs'
import {featureCatalogItem,validateFeatureCatalog} from '../src/platform/feature-catalog.mjs'

test('feature catalog is internally consistent',()=>{
  assert.equal(validateFeatureCatalog(),true)
  assert.equal(featureCatalogItem('identity')?.locked,true)
  assert.equal(featureCatalogItem('integrations')?.locked,false)
})

test('durable audit redacts obvious secret-shaped metadata keys',{skip:embeddedDatabase},async()=>{
  const workspaceId='ws_audit_test'
  const record=await appendAuditRecord({
    workspaceId,
    actorId:'user_1',
    action:'test.audit',
    entityType:'test',
    entityId:'entity_1',
    metadata:{reason:'verification',token:'must-not-persist',password:'must-not-persist'}
  })
  assert.equal(record.action,'test.audit')
  assert.equal(record.metadata.reason,'verification')
  assert.equal(record.metadata.token,undefined)
  assert.equal(record.metadata.password,undefined)
  const rows=await listAuditRecords({workspaceId,limit:10})
  assert.ok(rows.some(item=>item.id===record.id))
})
