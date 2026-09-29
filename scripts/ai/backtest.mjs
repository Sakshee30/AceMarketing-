import {readFile} from 'node:fs/promises'
import {arg,print,request} from './_client.mjs'
const kind=arg('kind','seasonal-naive')
const supportedKinds=new Set(['seasonal-naive','chronos-2','catboost'])
if(!supportedKinds.has(kind))throw new Error('unsupported --kind; use seasonal-naive, chronos-2 or catboost')
const input=arg('input')
if(!input)throw new Error('usage: --input=<json file> [--kind=seasonal-naive|chronos-2|catboost]')
const payload=JSON.parse(await readFile(input,'utf8'))
const route=kind==='chronos-2'?'/api/ai/ml/forecast/chronos-2':kind==='catboost'?'/api/ai/ml/forecast/catboost-challenger':'/api/ai/ml/forecast/seasonal-naive'
print(await request(route,{method:'POST',body:payload,headers:{'Idempotency-Key':'script-backtest-'+kind+'-'+Date.now()}}))
