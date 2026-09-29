import test from 'node:test'
import assert from 'node:assert/strict'
import {validateHostedTaskInput} from '../src/ai-input-validation.mjs'

test('hosted task validation rejects unknown tasks',()=>{
  assert.equal(validateHostedTaskInput('made_up',{}).ok,false)
})
test('embedding input is bounded',()=>{
  assert.equal(validateHostedTaskInput('embedding',{texts:['a']}).ok,true)
  assert.equal(validateHostedTaskInput('embedding',{texts:[]}).ok,false)
})
test('transcription requires provider-hosted file URI',()=>{
  assert.equal(validateHostedTaskInput('call_transcription',{fileUri:'https://example.com/a.mp3',mimeType:'audio/mpeg'}).ok,false)
  assert.equal(validateHostedTaskInput('call_transcription',{fileUri:'https://generativelanguage.googleapis.com/v1beta/files/abc',mimeType:'audio/mpeg'}).ok,true)
})
test('reviewer requires immutable recommendation object',()=>{
  assert.equal(validateHostedTaskInput('recommendation_reviewer',{recommendation:{id:'r1'}}).ok,true)
  assert.equal(validateHostedTaskInput('recommendation_reviewer',{}).ok,false)
})
