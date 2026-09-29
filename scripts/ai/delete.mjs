import {arg,print,request} from './_client.mjs'
const dataset=arg('dataset'),knowledge=arg('knowledge')
if(Boolean(dataset)===Boolean(knowledge))throw new Error('provide exactly one: --dataset=<id> or --knowledge=<id>')
if(dataset)print(await request('/api/ai/datasets/'+encodeURIComponent(dataset)+'/retire',{method:'POST',body:{}}))
else print(await request('/api/ai/knowledge/'+encodeURIComponent(knowledge)+'/revoke',{method:'POST',body:{}}))
