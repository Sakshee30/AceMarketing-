import test from 'node:test'
import assert from 'node:assert/strict'
import {canReadKnowledgePolicy,normalizeKnowledgePolicy} from '../src/knowledge.mjs'

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
