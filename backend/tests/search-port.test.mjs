import test from 'node:test'
import assert from 'node:assert/strict'
import {embeddedDatabase,pool} from '../src/database.mjs'
import {querySearch,searchCapabilityProfile,upsertSearchDocument,deleteSearchProjection} from '../src/platform/search-port.mjs'

test('search port advertises explicit reduced capability profile',()=>{
  const profile=searchCapabilityProfile()
  assert.equal(profile.supports.lexical,true)
  assert.equal(profile.supports.semantic,false)
  assert.equal(profile.authorization,'tenant-and-resource-policy-before-result')
})

test('search results enforce workspace and role policy before returning snippets',{skip:embeddedDatabase||!pool},async()=>{
  const workspaceId='ws_search_'+Date.now()
  const otherWorkspace='ws_search_other_'+Date.now()
  await upsertSearchDocument({
    workspaceId,
    sourceType:'object',
    sourceId:'obj_private',
    sourceVersion:'v1',
    title:'Private launch analysis',
    body:'confidential revenue attribution launch plan',
    accessPolicy:{allowedRoles:['admin']},
    metadata:{kind:'evidence'}
  })
  await upsertSearchDocument({
    workspaceId,
    sourceType:'object',
    sourceId:'obj_public',
    sourceVersion:'v1',
    title:'Launch summary',
    body:'revenue attribution launch summary',
    accessPolicy:{},
    metadata:{kind:'summary'}
  })
  await upsertSearchDocument({
    workspaceId:otherWorkspace,
    sourceType:'object',
    sourceId:'obj_other',
    sourceVersion:'v1',
    title:'Other tenant launch',
    body:'revenue attribution launch secret',
    accessPolicy:{}
  })

  const viewer=await querySearch({workspaceId,query:'revenue attribution launch',role:'viewer'})
  assert.equal(viewer.items.some(item=>item.sourceId==='obj_private'),false)
  assert.equal(viewer.items.some(item=>item.sourceId==='obj_other'),false)
  assert.equal(viewer.items.some(item=>item.sourceId==='obj_public'),true)

  const admin=await querySearch({workspaceId,query:'confidential revenue',role:'admin'})
  assert.equal(admin.items.some(item=>item.sourceId==='obj_private'),true)

  await deleteSearchProjection({workspaceId,sourceType:'object',sourceId:'obj_public'})
  const deleted=await querySearch({workspaceId,query:'launch summary',role:'viewer'})
  assert.equal(deleted.items.some(item=>item.sourceId==='obj_public'),false)
})
