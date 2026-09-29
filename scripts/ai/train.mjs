import {arg,print,request} from './_client.mjs'
const id=arg('dataset')
if(!id)throw new Error('usage: --dataset=<dataset id> [--horizon=90d]')
const horizon=arg('horizon')
const body={randomSeed:Number(arg('seed','42')),categoricalFeatures:[]}
if(horizon)body.horizon=horizon
print(await request('/api/ai/datasets/'+encodeURIComponent(id)+'/train',{method:'POST',body,headers:{'Idempotency-Key':'script-train-'+id+'-'+Date.now()}}))
