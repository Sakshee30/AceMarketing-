import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {aiResultTypes} from '../src/ai-result-contracts.mjs'

test('shared AI result contract manifest matches backend discriminator types',async()=>{
  const path=new URL('../../configs/ai/result-schema-v1.json',import.meta.url)
  const manifest=JSON.parse(await readFile(path,'utf8'))
  assert.equal(manifest.schemaVersion,'ai-result-contract.v1')
  assert.deepEqual(new Set(Object.keys(manifest.resultTypes)),new Set(aiResultTypes()))
  assert.ok(manifest.commonRequired.includes('resultType'))
  assert.ok(manifest.resultTypes.calibrated_probability.includes('calibrationReference'))
  assert.ok(manifest.resultTypes.marketing_mix_analysis.includes('healthStatus'))
})
