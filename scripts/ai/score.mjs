import {readFile} from 'node:fs/promises'
import {arg,print,request} from './_client.mjs'
const input=arg('input')
if(!input)throw new Error('usage: --input=<artifact scoring request JSON file>')
const payload=JSON.parse(await readFile(input,'utf8'))
print(await request('/api/ai/ml/score',{method:'POST',body:payload,headers:{'Idempotency-Key':'script-score-'+Date.now()}}))
