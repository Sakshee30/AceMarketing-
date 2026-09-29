import {arg,print,request} from './_client.mjs'
const task=arg('task'),evaluationId=arg('evaluation')
if(!task||!evaluationId)throw new Error('usage: --task=<task> --evaluation=<evaluation id>')
print(await request('/api/ai/models/'+encodeURIComponent(task)+'/promote',{method:'POST',body:{evaluationId}}))
