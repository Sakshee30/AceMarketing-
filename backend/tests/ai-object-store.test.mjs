import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {aiObjectStoreStatus,storeAiObject} from '../src/ai-object-store.mjs'

test('local AI object store persists content-addressed bytes in development',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'ace-ai-store-'))
  const old={NODE_ENV:process.env.NODE_ENV,AI_OBJECT_STORE_BACKEND:process.env.AI_OBJECT_STORE_BACKEND,AI_OBJECT_STORE_LOCAL_DIR:process.env.AI_OBJECT_STORE_LOCAL_DIR}
  try{
    process.env.NODE_ENV='test'
    process.env.AI_OBJECT_STORE_BACKEND='local'
    process.env.AI_OBJECT_STORE_LOCAL_DIR=dir
    assert.equal(aiObjectStoreStatus().configured,true)
    const stored=await storeAiObject({workspaceId:'ws_test',data:Buffer.from('hello'),mimeType:'text/plain',kind:'test'})
    assert.match(stored.objectRef,/^local-ai:\/\//)
    const path=join(dir,'ws_test','test',stored.hash+'.bin')
    assert.equal((await readFile(path,'utf8')),'hello')
  }finally{
    if(old.NODE_ENV===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old.NODE_ENV
    if(old.AI_OBJECT_STORE_BACKEND===undefined)delete process.env.AI_OBJECT_STORE_BACKEND;else process.env.AI_OBJECT_STORE_BACKEND=old.AI_OBJECT_STORE_BACKEND
    if(old.AI_OBJECT_STORE_LOCAL_DIR===undefined)delete process.env.AI_OBJECT_STORE_LOCAL_DIR;else process.env.AI_OBJECT_STORE_LOCAL_DIR=old.AI_OBJECT_STORE_LOCAL_DIR
    await rm(dir,{recursive:true,force:true})
  }
})

test('local AI object store is blocked in production by default',()=>{
  const old={NODE_ENV:process.env.NODE_ENV,AI_OBJECT_STORE_BACKEND:process.env.AI_OBJECT_STORE_BACKEND,AI_OBJECT_STORE_ALLOW_LOCAL_IN_PROD:process.env.AI_OBJECT_STORE_ALLOW_LOCAL_IN_PROD}
  try{
    process.env.NODE_ENV='production'
    process.env.AI_OBJECT_STORE_BACKEND='local'
    delete process.env.AI_OBJECT_STORE_ALLOW_LOCAL_IN_PROD
    const status=aiObjectStoreStatus()
    assert.equal(status.configured,false)
    assert.match(status.reason,/disabled in production/)
  }finally{
    if(old.NODE_ENV===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old.NODE_ENV
    if(old.AI_OBJECT_STORE_BACKEND===undefined)delete process.env.AI_OBJECT_STORE_BACKEND;else process.env.AI_OBJECT_STORE_BACKEND=old.AI_OBJECT_STORE_BACKEND
    if(old.AI_OBJECT_STORE_ALLOW_LOCAL_IN_PROD===undefined)delete process.env.AI_OBJECT_STORE_ALLOW_LOCAL_IN_PROD;else process.env.AI_OBJECT_STORE_ALLOW_LOCAL_IN_PROD=old.AI_OBJECT_STORE_ALLOW_LOCAL_IN_PROD
  }
})
