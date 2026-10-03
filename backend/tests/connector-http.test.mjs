import test from 'node:test'
import assert from 'node:assert/strict'
import {requestConnectorJson} from '../src/connector-http.mjs'
const origin='https://provider.example.test',url=origin+'/report'
const json=(value,init={})=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'},...init})
const run=(fetchImpl,options={})=>requestConnectorJson(url,{allowedOrigins:[origin],fetchImpl,...options})
test('PROV transport preserves method, body and authorization without automatic redirects',async()=>{
 const result=await run(async(u,o)=>{assert.equal(u.href,url);assert.equal(o.method,'POST');assert.equal(o.body,'{}');assert.equal(o.headers.Authorization,'Bearer SIM_TOKEN');assert.equal(o.redirect,'manual');return json({data:[]})},{method:'POST',body:'{}',headers:{Authorization:'Bearer SIM_TOKEN'}})
 assert.deepEqual(result.json,{data:[]})
})
for(const [label,body] of [['malformed','{broken'],['empty',''],['null','null'],['primitive','42']])test('PROV transport rejects '+label+' successful body',async()=>{
 await assert.rejects(run(async()=>new Response(body,{headers:{'content-type':'application/json'}})),/JSON/)
})
for(const status of [400,401,403,429,500,503])test('PROV transport exposes HTTP '+status+' without leaking provider response',async()=>{
 await assert.rejects(run(async()=>new Response('SIM_SECRET_CANARY',{status,headers:{'retry-after':'2'}})),e=>e.status===status&&e.retryAfter==='2'&&!JSON.stringify(e).includes('SIM_SECRET_CANARY'))
})
test('PROV transport accepts explicit no-content and not-modified responses',async()=>{for(const status of [204,304])assert.deepEqual((await run(async()=>new Response(null,{status}))).json,{})})
test('PROV transport rejects HTML with HTTP 200',async()=>{await assert.rejects(run(async()=>new Response('<html/>',{headers:{'content-type':'text/html'}})),/non-JSON/)})
test('PROV transport rejects a declared oversized body',async()=>{await assert.rejects(run(async()=>new Response('{}',{headers:{'content-length':'1001','content-type':'application/json'}}),{maxBytes:1000}),/size limit/)})
test('PROV transport enforces streaming byte limit without Content-Length',async()=>{
 await assert.rejects(run(async()=>new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{"data":"'));c.enqueue(new Uint8Array(200));c.close()}})),{maxBytes:100}),/size limit/)
})
test('PROV transport accepts exact byte boundary',async()=>{assert.deepEqual((await run(async()=>json({}),{maxBytes:2})).json,{})})
test('PROV transport blocks cross-origin redirects before contacting their target',async()=>{
 let calls=0;await assert.rejects(run(async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://foreign.example.test/leak'}})}),/cross-origin/);assert.equal(calls,1)
})
test('PROV transport rejects redirect loops',async()=>{
 let calls=0;await assert.rejects(run(async()=>{calls++;return new Response(null,{status:302,headers:{location:'/report'}})}),/loop/);assert.equal(calls,1)
})
test('PROV transport bounds distinct same-origin redirects',async()=>{
 let calls=0;await assert.rejects(run(async()=>new Response(null,{status:302,headers:{location:'/hop/'+(++calls)}}),{maxRedirects:2}),/redirect limit/);assert.equal(calls,3)
})
test('PROV transport preserves a successful same-origin redirect',async()=>{
 let calls=0;const result=await run(async()=>++calls===1?new Response(null,{status:307,headers:{location:'/final'}}):json({ok:true}));assert.deepEqual(result.json,{ok:true});assert.equal(calls,2)
})
test('PROV transport times out even when injected fetch fails to observe abort',async()=>{await assert.rejects(run(()=>new Promise(()=>{}),{timeoutMs:15}),/timeout/)})
test('PROV transport deadline includes a stalled body',async()=>{await assert.rejects(run(async()=>new Response(new ReadableStream({start(){}})),{timeoutMs:15}),/timeout/)})
test('PROV transport never calls fetch for unsafe URL or absent allowlist',async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;return json({})}
 for(const input of ['http://provider.example.test/report','https://user:SIM_SECRET@provider.example.test/report','https://foreign.example.test/report'])await assert.rejects(requestConnectorJson(input,{allowedOrigins:[origin],fetchImpl}))
 await assert.rejects(requestConnectorJson(url,{fetchImpl}),/allowlist/);assert.equal(calls,0)
})
test('PROV transport rejects invalid resource budgets',async()=>{for(const opts of [{timeoutMs:NaN},{timeoutMs:0},{maxBytes:-1},{maxRedirects:1.5}])await assert.rejects(run(async()=>json({}),opts),TypeError)})
