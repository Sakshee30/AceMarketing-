import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {embeddedDatabase,pool} from '../../backend/src/database.mjs'
import {createForm,getForm,listForms} from '../../backend/src/platform/forms-store.mjs'
import {createCustomObject,getCustomObject,listCustomObjects} from '../../backend/src/platform/custom-object-store.mjs'
import {querySearch,upsertSearchDocument} from '../../backend/src/platform/search-port.mjs'

const suffix=()=>randomUUID().replaceAll('-','')

test('forms custom objects and search remain workspace isolated',{skip:embeddedDatabase||!pool},async()=>{
  const token=suffix()
  const left='ws_iso_left_'+token
  const right='ws_iso_right_'+token

  const form=await createForm({
    workspaceId:left,
    name:'Isolation Form',
    slug:'isolation-'+token.toLowerCase(),
    schema:{fields:[{key:'email',type:'email',label:'Email',required:true}]},
    actorId:'security-test'
  })
  assert.ok(await getForm({workspaceId:left,id:form.id}))
  assert.equal(await getForm({workspaceId:right,id:form.id}),null)
  assert.equal((await listForms({workspaceId:right})).some(item=>item.id===form.id),false)

  const object=await createCustomObject({
    workspaceId:left,
    objectKey:'isolation_'+token.toLowerCase().slice(0,32),
    name:'Isolation Object',
    schema:{fields:[{key:'name',type:'string',label:'Name',required:true}]},
    actorId:'security-test'
  })
  assert.ok(await getCustomObject({workspaceId:left,id:object.id}))
  assert.equal(await getCustomObject({workspaceId:right,id:object.id}),null)
  assert.equal((await listCustomObjects({workspaceId:right})).some(item=>item.id===object.id),false)

  const sourceId='isolation-source-'+token
  await upsertSearchDocument({
    workspaceId:left,
    sourceType:'security-test',
    sourceId,
    sourceVersion:'1',
    title:'Cross tenant isolation probe '+token,
    body:'workspace isolation marker '+token,
    accessPolicy:{allowedRoles:['owner']}
  })
  const leftSearch=await querySearch({workspaceId:left,query:token,role:'owner'})
  const rightSearch=await querySearch({workspaceId:right,query:token,role:'owner'})
  assert.equal(leftSearch.items.some(item=>item.sourceId===sourceId),true)
  assert.equal(rightSearch.items.some(item=>item.sourceId===sourceId),false)

  await pool.query('DELETE FROM ace_search_documents WHERE workspace_id IN ($1,$2)',[left,right])
  await pool.query('DELETE FROM ace_custom_object_versions WHERE workspace_id IN ($1,$2)',[left,right])
  await pool.query('DELETE FROM ace_custom_objects WHERE workspace_id IN ($1,$2)',[left,right])
  await pool.query('DELETE FROM ace_form_versions WHERE workspace_id IN ($1,$2)',[left,right])
  await pool.query('DELETE FROM ace_forms WHERE workspace_id IN ($1,$2)',[left,right])
})
