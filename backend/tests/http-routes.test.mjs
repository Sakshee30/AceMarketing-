import test from 'node:test'
import assert from 'node:assert/strict'
import {handleMcpRoutes} from '../src/http/routes/mcp-routes.mjs'
import {handleWorkflowRoutes} from '../src/http/routes/workflow-routes.mjs'
import {handlePlatformRoutes} from '../src/http/routes/platform-routes.mjs'

const request={method:'GET',user:{userId:'test-user',role:'owner'},requestId:'route-test',context:{traceId:'trace-test'}}
const response=()=>{
  const calls=[]
  return {calls,send(...args){calls.push(args);return undefined}}
}

test('workflow route module owns workflow catalog response',async()=>{
  const output=response()
  const handled=await handleWorkflowRoutes({req:request,res:{},url:new URL('http://localhost/api/workflows/actions'),workspaceId:'ws_test',readBody:async()=>({}),send:output.send.bind(output)})
  assert.equal(handled,true)
  assert.equal(output.calls[0][2],200)
  assert.equal(output.calls[0][3].version,1)
})

test('workflow route module leaves unrelated routes untouched',async()=>{
  const output=response()
  const handled=await handleWorkflowRoutes({req:request,res:{},url:new URL('http://localhost/api/not-workflows'),workspaceId:'ws_test',readBody:async()=>({}),send:output.send.bind(output)})
  assert.equal(handled,false)
  assert.equal(output.calls.length,0)
})

test('MCP route module exposes catalog metadata through the API boundary',async()=>{
  const output=response()
  const handled=await handleMcpRoutes({req:request,res:{},url:new URL('http://localhost/api/mcp/catalog?kind=tool'),workspaceId:'ws_test',readBody:async()=>({}),send:output.send.bind(output)})
  assert.equal(handled,true)
  assert.equal(output.calls[0][2],200)
  assert.ok(output.calls[0][3].items.some(item=>item.name==='ace_confirm_action'))
})

test('platform route composer owns policy simulation without touching the server entrypoint',async()=>{
  const output=response()
  const handled=await handlePlatformRoutes({
    req:{...request,method:'POST'},
    res:{},
    url:new URL('http://localhost/api/policy-rules/simulate'),
    workspaceId:'ws_test',
    readBody:async()=>({expression:'input.score >= 10',input:{score:12}}),
    send:output.send.bind(output),
    objectWorkerToken:'',
    authRequired:true
  })
  assert.equal(handled,true)
  assert.equal(output.calls[0][2],400)
})

test('platform route composer leaves unrelated routes untouched',async()=>{
  const output=response()
  const handled=await handlePlatformRoutes({
    req:request,
    res:{},
    url:new URL('http://localhost/api/not-platform'),
    workspaceId:'ws_test',
    readBody:async()=>({}),
    send:output.send.bind(output),
    objectWorkerToken:'',
    authRequired:true
  })
  assert.equal(handled,false)
  assert.equal(output.calls.length,0)
})
