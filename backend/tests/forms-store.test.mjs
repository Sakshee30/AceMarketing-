import test from 'node:test'
import assert from 'node:assert/strict'
import {embeddedDatabase,pool} from '../src/database.mjs'
import {createForm,getForm,listFormSubmissions,publishForm,submitForm,validateFormSchema,validateSubmission} from '../src/platform/forms-store.mjs'

test('form schemas are bounded and reject hostile/unrecognized field types',()=>{
  const schema=validateFormSchema({fields:[
    {key:'email',type:'email',label:'Email',required:true,maxLength:200},
    {key:'score',type:'integer',label:'Score'}
  ]})
  assert.equal(schema.fields.length,2)
  assert.throws(()=>validateFormSchema({fields:[{key:'x',type:'script'}]}),error=>error?.code==='unsupported_form_field_type')
  assert.throws(()=>validateFormSchema({fields:Array.from({length:101},(_,i)=>({key:'f'+i,type:'string'}))}),error=>error?.code==='form_field_limit')
})

test('submission validation rejects unknown fields and invalid values',()=>{
  const schema=validateFormSchema({fields:[
    {key:'email',type:'email',required:true},
    {key:'kind',type:'enum',options:['lead','customer']}
  ]})
  assert.equal(validateSubmission(schema,{email:'user@example.com',kind:'lead'}).kind,'lead')
  assert.throws(()=>validateSubmission(schema,{email:'bad'}),error=>error?.code==='invalid_email')
  assert.throws(()=>validateSubmission(schema,{email:'user@example.com',extra:'x'}),error=>error?.code==='unknown_submission_field')
})

test('published forms retain versioned schema for durable submissions',{skip:embeddedDatabase||!pool},async()=>{
  const workspaceId='ws_forms_test'
  const form=await createForm({
    workspaceId,
    name:'Lead Intake',
    slug:'lead-intake-'+Date.now(),
    actorId:'u1',
    schema:{fields:[{key:'email',type:'email',required:true}]}
  })
  const published=await publishForm({workspaceId,id:form.id,actorId:'u1'})
  assert.equal(published.status,'published')
  const submission=await submitForm({workspaceId,id:form.id,actorId:'u1',data:{email:'user@example.com'}})
  assert.equal(submission.form_version,1)
  const loaded=await getForm({workspaceId,id:form.id})
  assert.equal(Number(loaded.published_version),1)
  const submissions=await listFormSubmissions({workspaceId,id:form.id})
  assert.ok(submissions.some(item=>item.id===submission.id))
})
