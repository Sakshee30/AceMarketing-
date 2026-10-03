import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
const compiled=await build({entryPoints:['frontend/src/lib/api.ts'],bundle:true,write:false,format:'esm',platform:'browser'})
const client=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'))
const store=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}}
globalThis.window={localStorage:store(),sessionStorage:store(),setTimeout,clearTimeout,dispatchEvent(){}}
window.localStorage.setItem('ace_workspace_id','qa_stream_workspace')
const response=chunks=>new Response(new ReadableStream({start(c){for(const text of chunks)c.enqueue(new TextEncoder().encode(text));c.close()}}),{headers:{'content-type':'text/event-stream'}})
test('AI stream decodes chunk-split CRLF and multiline JSON data',async t=>{
 t.mock.method(globalThis,'fetch',async()=>response(['event: progress\r','\ndata: {"value":\r','\ndata: 2}\r','\n\r','\n']))
 const seen=[];await client.streamAiJob('qa_job',e=>seen.push(e));assert.deepEqual(seen,[{event:'progress',data:{value:2}}])
})
test('AI stream ignores comments and retains non-JSON multiline data',async t=>{
 t.mock.method(globalThis,'fetch',async()=>response([': heartbeat\n\ndata: first\ndata: second\n\n']))
 const seen=[];await client.streamAiJob('qa_job',e=>seen.push(e));assert.deepEqual(seen,[{event:'message',data:'first\nsecond'}])
})
test('AI stream invokes a failing consumer once, not twice',async t=>{
 t.mock.method(globalThis,'fetch',async()=>response(['data: {"ok":true}\n\n']))
 let calls=0;await assert.rejects(client.streamAiJob('qa_job',()=>{calls++;throw new Error('consumer failure')}),/consumer failure/);assert.equal(calls,1)
})
test('AI stream uses workspace request and handles HTTP failure',async t=>{
 t.mock.method(globalThis,'fetch',async(url,init)=>{assert.equal(init.headers['X-Workspace-ID'],'qa_stream_workspace');assert.ok(String(url).endsWith('/ai/jobs/qa_job/events'));return new Response('{}',{status:401})})
 await assert.rejects(client.streamAiJob('qa_job',()=>{}),error=>error.status===401)
})
