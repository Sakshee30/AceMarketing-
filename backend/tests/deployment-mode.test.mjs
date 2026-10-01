import test from 'node:test'
import assert from 'node:assert/strict'
import {deploymentMode,deploymentModeSnapshot} from '../src/platform/deployment-mode.mjs'

const withEnv=(values,fn)=>{
  const before={}
  for(const [key,value] of Object.entries(values)){before[key]=process.env[key];if(value==null)delete process.env[key];else process.env[key]=String(value)}
  try{return fn()}finally{for(const [key,value] of Object.entries(before)){if(value==null)delete process.env[key];else process.env[key]=value}}
}

test('core mode keeps specialist infrastructure optional',()=>{
  withEnv({ACE_DEPLOYMENT_MODE:'core',ACE_ENABLE_AI:null,ACE_ENABLE_CONTROL_PLANE:null},()=>{
    const mode=deploymentMode()
    assert.equal(mode.name,'core')
    assert.equal(mode.features.ai,false)
    assert.equal(mode.features.controlPlane,false)
    assert.equal(mode.features.providerReads,true)
  })
})

test('full mode enables optional platform profiles by default',()=>{
  withEnv({ACE_DEPLOYMENT_MODE:'full',ACE_ENABLE_AI:null,ACE_ENABLE_CONTROL_PLANE:null},()=>{
    const mode=deploymentModeSnapshot()
    assert.equal(mode.features.ai,true)
    assert.equal(mode.features.aiForecasting,true)
    assert.equal(mode.features.aiCausal,true)
    assert.equal(mode.features.aiMmm,true)
    assert.equal(mode.features.controlPlane,true)
  })
})

test('individual feature override can downgrade a larger mode',()=>{
  withEnv({ACE_DEPLOYMENT_MODE:'full',ACE_ENABLE_AI:'false',ACE_ENABLE_FILES:'false'},()=>{
    const mode=deploymentMode()
    assert.equal(mode.features.ai,false)
    assert.equal(mode.features.files,false)
    assert.equal(mode.features.controlPlane,true)
  })
})

test('unknown deployment mode fails closed',()=>{
  withEnv({ACE_DEPLOYMENT_MODE:'unknown'},()=>assert.throws(()=>deploymentMode(),/core, standard, or full/))
})
