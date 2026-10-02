import test from 'node:test'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
test('PROV invalid URL rejects without leaking the default deadline timer',async()=>{
 const moduleUrl=new URL('../src/connector-http.mjs',import.meta.url).href
 const script=`import {requestConnectorJson} from ${JSON.stringify(moduleUrl)}; try { await requestConnectorJson('not a URL',{allowedOrigins:['https://provider.example.test']});process.exitCode=2 } catch(e){ if(!(e instanceof TypeError))process.exitCode=3 }`
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['--input-type=module','-e',script],{stdio:'pipe'});let output=''
  child.stderr.on('data',d=>output+=d)
  const timer=setTimeout(()=>{child.kill();reject(new Error('Invalid URL leaked a live timer: '+output))},2000)
  child.once('error',e=>{clearTimeout(timer);reject(e)})
  child.once('exit',code=>{clearTimeout(timer);try{assert.equal(code,0,output);resolve()}catch(e){reject(e)}})
 })
})
