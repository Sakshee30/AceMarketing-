import test from 'node:test'
import assert from 'node:assert/strict'
import {ProviderExecutionError,verifyAnthropicModelAccess,verifyProviderAccess} from '../src/ai-providers.mjs'

const withEnv=async(patch,fn)=>{
  const previous={}
  for(const [key,value] of Object.entries(patch)){
    previous[key]=process.env[key]
    if(value==null)delete process.env[key]
    else process.env[key]=String(value)
  }
  try{return await fn()}
  finally{
    for(const [key,value] of Object.entries(previous)){
      if(value==null)delete process.env[key]
      else process.env[key]=value
    }
  }
}

test('provider verification stays opt-in even when a credential exists',async()=>{
  await withEnv({AI_PROVIDER_TESTS_ENABLED:null,OPENAI_API_KEY:'test-only'},async()=>{
    await assert.rejects(()=>verifyProviderAccess('analyst'),error=>{
      assert.ok(error instanceof ProviderExecutionError)
      assert.equal(error.status,503)
      assert.match(error.message,/verification is disabled/i)
      return true
    })
  })
})

test('Anthropic bounded access check preserves the exact requested identifier',async()=>{
  const previousFetch=globalThis.fetch
  let captured=null
  globalThis.fetch=async(url,options)=>{
    captured={url:String(url),options}
    return new Response(JSON.stringify({id:'claude-fable-5-1',type:'model'}),{
      status:200,
      headers:{'content-type':'application/json','request-id':'anthropic-test-request'}
    })
  }
  try{
    await withEnv({
      ANTHROPIC_API_KEY:'test-only',
      ANTHROPIC_API_VERSION:'2023-06-01',
      ANTHROPIC_MODELS_URL:'https://api.anthropic.test/v1/models'
    },async()=>{
      const result=await verifyAnthropicModelAccess({
        task:'recommendation_reviewer',
        requestedModel:'claude-fable-5-1'
      })
      assert.equal(result.accessVerified,true)
      assert.equal(result.resolvedModel,'claude-fable-5-1')
      assert.equal(result.providerRequestId,'anthropic-test-request')
      assert.equal(captured.url,'https://api.anthropic.test/v1/models/claude-fable-5-1')
      assert.equal(captured.options.method,'GET')
      assert.equal(captured.options.headers['x-api-key'],'test-only')
      assert.equal(captured.options.headers['anthropic-version'],'2023-06-01')
    })
  }finally{
    globalThis.fetch=previousFetch
  }
})

test('Anthropic access check rejects a provider-side identifier substitution',async()=>{
  const previousFetch=globalThis.fetch
  globalThis.fetch=async()=>new Response(JSON.stringify({id:'claude-fable-5'}),{
    status:200,
    headers:{'content-type':'application/json'}
  })
  try{
    await withEnv({ANTHROPIC_API_KEY:'test-only'},async()=>{
      await assert.rejects(
        ()=>verifyAnthropicModelAccess({requestedModel:'claude-fable-5-1'}),
        error=>{
          assert.ok(error instanceof ProviderExecutionError)
          assert.equal(error.status,409)
          assert.match(error.message,/silent substitution is forbidden/i)
          return true
        }
      )
    })
  }finally{
    globalThis.fetch=previousFetch
  }
})
