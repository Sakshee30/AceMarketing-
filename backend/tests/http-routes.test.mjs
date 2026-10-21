import test from 'node:test'
import assert from 'node:assert/strict'
import {handleMcpRoutes} from '../src/http/routes/mcp-routes.mjs'
import {handleWorkflowRoutes} from '../src/http/routes/workflow-routes.mjs'
import {handlePlatformRoutes} from '../src/http/routes/platform-routes.mjs'
import {handleAiRoutes} from '../src/http/routes/ai-routes.mjs'
import {handleEngagementRoutes} from '../src/http/routes/engagement-routes.mjs'
import {handleAdminRoutes} from '../src/http/routes/admin-routes.mjs'
import {handlePublicRoutes} from '../src/http/routes/public-routes.mjs'
import {handleIdentityRoutes} from '../src/http/routes/identity-routes.mjs'
import {handleIntegrationRoutes} from '../src/http/routes/integration-routes.mjs'
import {handleAskAceRoutes} from '../src/http/routes/ask-ace-routes.mjs'
import {handleDataQualityRoutes} from '../src/http/routes/data-quality-routes.mjs'
import {handleDataOperationsRoutes} from '../src/http/routes/data-operations-routes.mjs'
import {handleAttributionRoutes} from '../src/http/routes/attribution-routes.mjs'
import {handleAudienceRoutes} from '../src/http/routes/audience-routes.mjs'
import {handleDeliveryRoutes} from '../src/http/routes/delivery-routes.mjs'
import {handleComplianceRoutes} from '../src/http/routes/compliance-routes.mjs'
import {handleConsoleRoutes} from '../src/http/routes/console-routes.mjs'
import {handleWorkspaceOperationsRoutes} from '../src/http/routes/workspace-operations-routes.mjs'
import {handleModelRoutes} from '../src/http/routes/model-routes.mjs'

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

test('AI route module exposes the metric catalog through its own boundary',async()=>{
  const output=response()
  const handled=await handleAiRoutes({
    req:request,
    res:{},
    url:new URL('http://localhost/api/ai/metrics/catalog'),
    workspaceId:'ws_test',
    readBody:async()=>({}),
    send:output.send.bind(output),
    authenticatedUser:request.user,
    isProd:false
  })
  assert.equal(handled,true)
  assert.equal(output.calls[0][2],200)
})

test('engagement route module owns routing reads',async()=>{
  const output=response()
  const handled=await handleEngagementRoutes({
    req:request,
    res:{},
    url:new URL('http://localhost/api/routing'),
    workspaceId:'ws_test',
    readBody:async()=>({}),
    send:output.send.bind(output),
    authenticatedUser:request.user,
    authRequired:true,
    trackedEvents:[],
    leadReactivationCandidates:()=>[]
  })
  assert.equal(handled,true)
  assert.equal(output.calls[0][2],200)
})

test('admin route module owns workspace settings reads',async()=>{
  const output=response()
  const handled=await handleAdminRoutes({
    req:request,
    res:{},
    url:new URL('http://localhost/api/settings'),
    workspaceId:'ws_test',
    readBody:async()=>({}),
    send:output.send.bind(output)
  })
  assert.equal(handled,true)
  assert.equal(output.calls[0][2],200)
})

test('public route module owns public navigation',async()=>{
  const output=response()
  const handled=await handlePublicRoutes({
    req:request,
    res:{},
    url:new URL('http://localhost/api/public/navigation'),
    workspaceId:'ws_test',
    readBody:async()=>({}),
    send:output.send.bind(output)
  })
  assert.equal(handled,true)
  assert.equal(output.calls[0][2],200)
})

test('identity route module owns the authenticated session read',async()=>{
  const output=response()
  const handled=await handleIdentityRoutes({
    req:request,
    res:{},
    url:new URL('http://localhost/api/auth/me'),
    workspaceId:'ws_test',
    readBody:async()=>({}),
    send:output.send.bind(output),
    JWT_SECRET:'test-secret',
    ADMIN_EMAIL:'admin@example.com',
    ADMIN_PASSWORD_HASH:'',
    IS_PROD:false,
    AUTH_GOOGLE_REDIRECT_URI:'',
    AUTH_GOOGLE_SUCCESS_URL:'',
    createOAuthState:()=>'',
    hashOAuthState:()=>'',
    createPkce:()=>({}),
    parseOAuthState:()=>null
  })
  assert.equal(handled,true)
  assert.equal(output.calls[0][2],200)
})

test('integration route module owns connector catalog reads',async()=>{
  const output=response()
  const handled=await handleIntegrationRoutes({
    req:request,
    res:{},
    url:new URL('http://localhost/api/integrations'),
    workspaceId:'ws_test',
    readBody:async()=>({}),
    send:output.send.bind(output),
    integrations:[],
    CONNECTOR_PROVIDERS:{},
    SERVER_SECRET_CONNECTORS:{},
    CONNECTOR_REDIRECT_URI:'',
    CONNECTOR_SUCCESS_URL:'',
    connectorTokenHealth:async()=>[],
    refreshConnectorCredential:async()=>({}) ,
    createOAuthState:()=>'',
    hashOAuthState:()=>'',
    createPkce:()=>({})
  })
  assert.equal(handled,true)
  assert.equal(output.calls[0][2],200)
})

test('Ask Ace route module validates requests at its boundary',async()=>{
  const output=response()
  const handled=await handleAskAceRoutes({
    req:{...request,method:'POST'},
    res:{},
    url:new URL('http://localhost/api/ask-ace'),
    workspaceId:'ws_test',
    readBody:async()=>({}),
    send:output.send.bind(output),
    trackedEvents:[]
  })
  assert.equal(handled,true)
  assert.equal(output.calls[0][2],400)
})

test('data-quality route module owns event-rule reads',async()=>{
  const output=response()
  const handled=await handleDataQualityRoutes({
    req:request,
    res:{},
    url:new URL('http://localhost/api/events'),
    workspaceId:'ws_test',
    readBody:async()=>({}),
    send:output.send.bind(output),
    trackedEvents:[],
    buildSignalReplayPayload:()=>({})
  })
  assert.equal(handled,true)
  assert.equal(output.calls[0][2],200)
})

test('data-operations route module owns data hub reads',async()=>{
  const output=response()
  const handled=await handleDataOperationsRoutes({
    req:request,
    res:{},
    url:new URL('http://localhost/api/data-hub'),
    workspaceId:'ws_test',
    readBody:async()=>({}),
    send:output.send.bind(output),
    trackedEvents:[]
  })
  assert.equal(handled,true)
  assert.equal(output.calls[0][2],200)
})

test('attribution route module owns attribution reads',async()=>{
  const output=response()
  const handled=await handleAttributionRoutes({
    req:request,
    res:{},
    url:new URL('http://localhost/api/attribution'),
    workspaceId:'ws_test',
    readBody:async()=>({}),
    send:output.send.bind(output),
    trackedEvents:[]
  })
  assert.equal(handled,true)
  assert.equal(output.calls[0][2],200)
})

test('audience route module owns behavior reads',async()=>{
  const output=response()
  const handled=await handleAudienceRoutes({req:request,res:{},url:new URL('http://localhost/api/behavior'),workspaceId:'ws_test',readBody:async()=>({}),send:output.send.bind(output),trackedEvents:[]})
  assert.equal(handled,true)
  assert.equal(output.calls[0][2],200)
})

test('delivery route module validates outbound signal payloads',async()=>{
  const output=response()
  const handled=await handleDeliveryRoutes({
    req:{...request,method:'POST'},
    res:{},
    url:new URL('http://localhost/api/chatgpt-ads/validate'),
    workspaceId:'ws_test',
    readBody:async()=>({event:'lead_created'}),
    send:output.send.bind(output),
    buildSignalReplayPayload:()=>({}),
    validateSignalDispatch:()=>null,
    IS_PROD:false
  })
  assert.equal(handled,true)
  assert.equal(output.calls[0][2],200)
})

test('model route module owns model catalog reads',async()=>{
  const output=response()
  const handled=await handleModelRoutes({req:request,res:{},url:new URL('http://localhost/api/models'),workspaceId:'ws_test',readBody:async()=>({}),send:output.send.bind(output)})
  assert.equal(handled,true)
  assert.equal(output.calls[0][2],200)
  assert.ok(Array.isArray(output.calls[0][3].items))
})
