import test from 'node:test'
import assert from 'node:assert/strict'
import {pool} from '../src/database.mjs'
import {
  canReadObject,
  createDownloadGrant,
  createUploadIntent,
  listObjects,
  markObjectQuarantined,
  recordObjectScan,
  softDeleteObject
} from '../src/platform/object-lifecycle.mjs'

test('object access policy remains role scoped',()=>{
  assert.equal(canReadObject({},'viewer'),true)
  assert.equal(canReadObject({allowedRoles:['admin']},'viewer'),false)
  assert.equal(canReadObject({allowedRoles:['admin']},'admin'),true)
  assert.equal(canReadObject({allowedRoles:['admin']},'owner'),true)
})

test('secure object lifecycle rejects mismatched upload evidence and promotes only clean scans',{skip:!pool},async()=>{
  const workspaceId='ws_obj_'+Date.now()
  const digest='a'.repeat(64)
  const intent=await createUploadIntent({
    workspaceId,
    name:'evidence.pdf',
    mime:'application/pdf',
    size:128,
    sha256:digest,
    accessPolicy:{allowedRoles:['admin']},
    actorId:'user_owner'
  })
  assert.equal(intent.object.status,'upload_pending')
  assert.ok(intent.uploadGrant.token)

  const mismatch=await markObjectQuarantined({
    workspaceId,
    objectId:intent.object.id,
    grantToken:intent.uploadGrant.token,
    actualSize:127,
    actualSha256:digest,
    detectedMime:'application/pdf',
    storageProvider:'test',
    storageVersion:'v1'
  })
  assert.equal(mismatch.integrityMatched,false)
  assert.equal(mismatch.object.status,'rejected')

  const second=await createUploadIntent({
    workspaceId,
    name:'clean.pdf',
    mime:'application/pdf',
    size:128,
    sha256:digest,
    accessPolicy:{allowedRoles:['admin']},
    actorId:'user_owner'
  })
  const quarantined=await markObjectQuarantined({
    workspaceId,
    objectId:second.object.id,
    grantToken:second.uploadGrant.token,
    actualSize:128,
    actualSha256:digest,
    detectedMime:'application/pdf',
    storageProvider:'test',
    storageVersion:'v2'
  })
  assert.equal(quarantined.object.status,'quarantined')
  const approved=await recordObjectScan({
    workspaceId,
    objectId:second.object.id,
    result:'clean',
    evidence:{scanner:'test-scanner',signatureSet:'fixture'},
    actorId:'worker'
  })
  assert.equal(approved.status,'approved')
  const visible=await listObjects({workspaceId,role:'admin'})
  assert.ok(visible.some(x=>x.id===second.object.id))
  const hidden=await listObjects({workspaceId,role:'viewer'})
  assert.equal(hidden.some(x=>x.id===second.object.id),false)
  const grant=await createDownloadGrant({workspaceId,objectId:second.object.id,role:'admin',actorId:'admin'})
  assert.ok(grant.downloadGrant.token)
  const deleted=await softDeleteObject({workspaceId,objectId:second.object.id,actorId:'admin'})
  assert.equal(deleted.status,'deleted')
})

test('upload intent rejects unsafe extension and invalid digest',{skip:!pool},async()=>{
  await assert.rejects(
    ()=>createUploadIntent({
      workspaceId:'ws_invalid_'+Date.now(),
      name:'payload.exe',
      mime:'application/pdf',
      size:10,
      sha256:'f'.repeat(64)
    }),
    /extension is not allowed/
  )
  await assert.rejects(
    ()=>createUploadIntent({
      workspaceId:'ws_invalid_'+Date.now(),
      name:'file.pdf',
      mime:'application/pdf',
      size:10,
      sha256:'bad'
    }),
    /sha256/
  )
})
