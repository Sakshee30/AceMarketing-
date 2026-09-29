import test from 'node:test'
import assert from 'node:assert/strict'
import {canReadKnowledgePolicy,ingestKnowledgeText,normalizeKnowledgePolicy,revokeKnowledgeSource,searchKnowledge} from '../src/knowledge.mjs'

test('knowledge policy normalizes role allowlists without granting extra roles',()=>{
  const policy=normalizeKnowledgePolicy({allowedRoles:['admin','analyst','',null,'admin']})
  assert.deepEqual(policy.allowedRoles,['admin','analyst'])
  assert.equal(canReadKnowledgePolicy(policy,'viewer'),false)
  assert.equal(canReadKnowledgePolicy(policy,'analyst'),true)
  assert.equal(canReadKnowledgePolicy(policy,'owner'),true)
})

test('knowledge without an explicit allowlist remains workspace-readable',()=>{
  const policy=normalizeKnowledgePolicy({})
  assert.deepEqual(policy.allowedRoles,[])
  assert.equal(canReadKnowledgePolicy(policy,'viewer'),true)
})


test('embedded local retrieval filters restricted chunks and propagates revocation',async()=>{
  const workspaceId='ws_knowledge_'+Date.now()
  const restricted=await ingestKnowledgeText({
    workspaceId,
    name:'Restricted revenue playbook',
    text:'Revenue expansion alpha strategy is limited to administrators.',
    sourceLocation:'test://restricted',
    documentVersion:'v1',
    accessPolicy:{allowedRoles:['admin']},
    actor:{userId:'test-admin'}
  })
  const publicSource=await ingestKnowledgeText({
    workspaceId,
    name:'Public revenue guide',
    text:'Revenue expansion beta guidance is available to workspace viewers.',
    sourceLocation:'test://public',
    documentVersion:'v1',
    accessPolicy:{},
    actor:{userId:'test-admin'}
  })

  const viewer=await searchKnowledge({workspaceId,query:'revenue expansion',role:'viewer',limit:10})
  assert.equal(viewer.some(item=>item.source_id===restricted.source.id),false)
  assert.equal(viewer.some(item=>item.source_id===publicSource.source.id),true)

  const admin=await searchKnowledge({workspaceId,query:'revenue expansion',role:'admin',limit:10})
  assert.equal(admin.some(item=>item.source_id===restricted.source.id),true)
  assert.equal(admin.some(item=>item.source_id===publicSource.source.id),true)

  await revokeKnowledgeSource({workspaceId,id:publicSource.source.id})
  const afterRevoke=await searchKnowledge({workspaceId,query:'revenue expansion',role:'viewer',limit:10})
  assert.equal(afterRevoke.some(item=>item.source_id===publicSource.source.id),false)
})
