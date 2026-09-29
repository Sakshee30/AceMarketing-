import test from 'node:test'
import assert from 'node:assert/strict'
import {ProviderExecutionError,runOpenAIAnalyst,verifyAnthropicModelAccess,verifyProviderAccess} from '../src/ai-providers.mjs'

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


test('network failure after provider submission is marked unknown to prevent blind retries',async()=>{
  const previousFetch=globalThis.fetch
  globalThis.fetch=async()=>{throw new Error('socket reset after submit')}
  try{
    await withEnv({OPENAI_API_KEY:'test-only',AI_LIVE_PROVIDER_CALLS:'true'},async()=>{
      await assert.rejects(
        ()=>runOpenAIAnalyst({question:'bounded offline test',evidence:{}}),
        error=>{
          assert.ok(error instanceof ProviderExecutionError)
          assert.equal(error.unknownOutcome,true)
          assert.equal(error.causeCode,'network')
          return true
        }
      )
    })
  }finally{
    globalThis.fetch=previousFetch
  }
})

test('provider rate limits are explicit confirmed failures, not unknown outcomes',async()=>{
  const previousFetch=globalThis.fetch
  globalThis.fetch=async()=>new Response(JSON.stringify({error:{message:'rate limited'}}),{
    status:429,
    headers:{'content-type':'application/json','x-request-id':'rate-limit-test'}
  })
  try{
    await withEnv({OPENAI_API_KEY:'test-only',AI_LIVE_PROVIDER_CALLS:'true'},async()=>{
      await assert.rejects(
        ()=>runOpenAIAnalyst({question:'bounded offline test',evidence:{}}),
        error=>{
          assert.ok(error instanceof ProviderExecutionError)
          assert.equal(error.status,429)
          assert.equal(error.unknownOutcome,false)
          assert.equal(error.providerRequestId,'rate-limit-test')
          return true
        }
      )
    })
  }finally{
    globalThis.fetch=previousFetch
  }
})

test('confirmed malformed analyst output is rejected instead of persisted as empty success',async()=>{
  const previousFetch=globalThis.fetch
  globalThis.fetch=async()=>new Response(JSON.stringify({id:'resp_test',model:'gpt-6-astra',status:'completed',output:[]}),{
    status:200,
    headers:{'content-type':'application/json','x-request-id':'malformed-test'}
  })
  try{
    await withEnv({OPENAI_API_KEY:'test-only',AI_LIVE_PROVIDER_CALLS:'true'},async()=>{
      await assert.rejects(
        ()=>runOpenAIAnalyst({question:'bounded offline test',evidence:{}}),
        error=>{
          assert.ok(error instanceof ProviderExecutionError)
          assert.equal(error.status,502)
          assert.equal(error.unknownOutcome,false)
          assert.match(error.message,/no usable text/i)
          return true
        }
      )
    })
  }finally{
    globalThis.fetch=previousFetch
  }
})


test('Anthropic access check rejects non-HTTPS model endpoints before sending credentials',async()=>{
  const previousFetch=globalThis.fetch
  let called=false
  globalThis.fetch=async()=>{called=true;throw new Error('must not be called')}
  try{
    await withEnv({ANTHROPIC_API_KEY:'test-only',ANTHROPIC_MODELS_URL:'http://anthropic.invalid/v1/models'},async()=>{
      await assert.rejects(
        ()=>verifyAnthropicModelAccess({requestedModel:'claude-fable-5-1'}),
        error=>{
          assert.ok(error instanceof ProviderExecutionError)
          assert.equal(error.status,400)
          assert.match(error.message,/must use HTTPS/i)
          return true
        }
      )
      assert.equal(called,false)
    })
  }finally{
    globalThis.fetch=previousFetch
  }
})

test('Anthropic access check rejects a blank provider model identifier',async()=>{
  const previousFetch=globalThis.fetch
  globalThis.fetch=async()=>new Response(JSON.stringify({id:'   '}),{
    status:200,
    headers:{'content-type':'application/json'}
  })
  try{
    await withEnv({ANTHROPIC_API_KEY:'test-only'},async()=>{
      await assert.rejects(
        ()=>verifyAnthropicModelAccess({requestedModel:'claude-fable-5-1'}),
        error=>{
          assert.ok(error instanceof ProviderExecutionError)
          assert.equal(error.status,502)
          assert.match(error.message,/no model identifier/i)
          return true
        }
      )
    })
  }finally{
    globalThis.fetch=previousFetch
  }
})

test('whitespace-only analyst output is rejected as malformed',async()=>{
  const previousFetch=globalThis.fetch
  globalThis.fetch=async()=>new Response(JSON.stringify({
    id:'resp_whitespace',
    model:'gpt-6-astra',
    status:'completed',
    output_text:'   \n\t '
  }),{
    status:200,
    headers:{'content-type':'application/json','x-request-id':'whitespace-test'}
  })
  try{
    await withEnv({OPENAI_API_KEY:'test-only',AI_LIVE_PROVIDER_CALLS:'true'},async()=>{
      await assert.rejects(
        ()=>runOpenAIAnalyst({question:'bounded offline test',evidence:{}}),
        error=>{
          assert.ok(error instanceof ProviderExecutionError)
          assert.equal(error.status,502)
          assert.match(error.message,/no usable text/i)
          return true
        }
      )
    })
  }finally{
    globalThis.fetch=previousFetch
  }
})


test('Anthropic verification does not follow credentialed redirects',async()=>{
  const previousFetch=globalThis.fetch
  let seenOptions=null
  globalThis.fetch=async(_url,options)=>{
    seenOptions=options
    return new Response('',{status:302,headers:{location:'https://example.invalid/models/claude-fable-5-1'}})
  }
  try{
    await withEnv({ANTHROPIC_API_KEY:'test-only'},async()=>{
      await assert.rejects(
        ()=>verifyAnthropicModelAccess({requestedModel:'claude-fable-5-1'}),
        error=>{
          assert.ok(error instanceof ProviderExecutionError)
          assert.equal(error.status,302)
          assert.equal(error.unknownOutcome,false)
          return true
        }
      )
      assert.equal(seenOptions.redirect,'manual')
    })
  }finally{
    globalThis.fetch=previousFetch
  }
})
