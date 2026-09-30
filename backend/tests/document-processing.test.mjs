import test from 'node:test'
import assert from 'node:assert/strict'
import {embeddedDatabase,pool} from '../src/database.mjs'
import {createUploadIntent,markObjectQuarantined,recordObjectScan} from '../src/platform/object-lifecycle.mjs'
import {indexExtractedObject} from '../src/platform/document-processing.mjs'
import {querySearch} from '../src/platform/search-port.mjs'

test('only an approved immutable object version can become searchable',{skip:embeddedDatabase||!pool},async()=>{
  const workspaceId='ws_doc_'+Date.now()
  const digest='b'.repeat(64)
  const intent=await createUploadIntent({
    workspaceId,
    name:'evidence.pdf',
    mime:'application/pdf',
    size:256,
    sha256:digest,
    accessPolicy:{allowedRoles:['admin']},
    actorId:'owner'
  })
  await markObjectQuarantined({
    workspaceId,
    objectId:intent.object.id,
    grantToken:intent.uploadGrant.token,
    actualSize:256,
    actualSha256:digest,
    detectedMime:'application/pdf',
    storageProvider:'s3',
    storageVersion:'version-immutable-1'
  })
  const approved=await recordObjectScan({
    workspaceId,
    objectId:intent.object.id,
    result:'clean',
    evidence:{scanner:'fixture'},
    actorId:'scanner'
  })
  assert.equal(approved.approved_storage_version,'version-immutable-1')
  assert.equal(approved.approved_sha256,digest)

  const indexed=await indexExtractedObject({
    workspaceId,
    objectId:intent.object.id,
    text:'approved evidence about attribution reconciliation',
    evidence:{parser:'fixture'}
  })
  assert.equal(indexed.indexing_status,'completed')
  assert.ok(indexed.searchable_at)

  const viewer=await querySearch({workspaceId,query:'attribution reconciliation',role:'viewer'})
  assert.equal(viewer.items.some(item=>item.sourceId===intent.object.id),false)
  const admin=await querySearch({workspaceId,query:'attribution reconciliation',role:'admin'})
  assert.equal(admin.items.some(item=>item.sourceId===intent.object.id),true)
})
