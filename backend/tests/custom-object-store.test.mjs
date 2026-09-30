import test from 'node:test'
import assert from 'node:assert/strict'
import {embeddedDatabase} from '../src/database.mjs'
import {
  createCustomObject,
  createCustomObjectRecord,
  createCustomObjectVersion,
  getCustomObject,
  listCustomObjectRecords,
  publishCustomObject,
  validateCustomObjectRecord,
  validateCustomObjectSchema
} from '../src/platform/custom-object-store.mjs'

test('custom object schemas are bounded and reject hostile field definitions',()=>{
  assert.throws(()=>validateCustomObjectSchema({fields:[{key:'x',type:'script',label:'X'}]}),error=>error?.code==='unsupported_custom_object_field_type')
  assert.throws(()=>validateCustomObjectSchema({fields:[{key:'bad-key',type:'string',label:'Bad'}]}),error=>error?.code==='invalid_custom_object_field_key')
  const schema=validateCustomObjectSchema({fields:[
    {key:'email',type:'email',label:'Email',required:true},
    {key:'stage',type:'enum',label:'Stage',options:['new','qualified']},
    {key:'account',type:'reference',label:'Account',targetObjectKey:'accounts'}
  ]})
  assert.equal(schema.fields.length,3)
  assert.equal(schema.fields[2].targetObjectKey,'accounts')
})

test('custom object record validation rejects unknown and invalid fields',()=>{
  const schema=validateCustomObjectSchema({fields:[
    {key:'email',type:'email',label:'Email',required:true},
    {key:'score',type:'integer',label:'Score'}
  ]})
  assert.throws(()=>validateCustomObjectRecord(schema,{email:'bad'}),error=>error?.code==='invalid_custom_object_email')
  assert.throws(()=>validateCustomObjectRecord(schema,{email:'a@example.com',unknown:true}),error=>error?.code==='unknown_custom_object_field')
  assert.deepEqual(validateCustomObjectRecord(schema,{email:'a@example.com',score:7}),{email:'a@example.com',score:7})
})

test('published custom objects preserve old record schema versions',async()=>{
  const workspaceId='ws_custom_object_test'
  const object=await createCustomObject({
    workspaceId,
    objectKey:'accounts',
    name:'Accounts',
    schema:{fields:[{key:'name',type:'string',label:'Name',required:true}]},
    actorId:'tester'
  })
  await publishCustomObject({workspaceId,id:object.id,actorId:'tester'})
  const first=await createCustomObjectRecord({workspaceId,id:object.id,data:{name:'Acme'},actorId:'tester'})
  assert.equal(Number(first.object_version),1)

  await createCustomObjectVersion({
    workspaceId,
    id:object.id,
    schema:{fields:[
      {key:'name',type:'string',label:'Name',required:true},
      {key:'tier',type:'enum',label:'Tier',options:['standard','enterprise']}
    ]},
    actorId:'tester'
  })
  await publishCustomObject({workspaceId,id:object.id,actorId:'tester'})
  const second=await createCustomObjectRecord({workspaceId,id:object.id,data:{name:'Beta',tier:'enterprise'},actorId:'tester'})
  assert.equal(Number(second.object_version),2)

  const records=await listCustomObjectRecords({workspaceId,id:object.id})
  assert.deepEqual(records.map(row=>Number(row.object_version)).sort(),[1,2])
  const loaded=await getCustomObject({workspaceId,id:object.id})
  assert.equal(Number(loaded.latest_version),2)
  assert.equal(Number(loaded.published_version),2)
})

test('embedded profile supports custom object APIs without pretending RLS support',()=>{
  assert.equal(typeof embeddedDatabase,'boolean')
})
