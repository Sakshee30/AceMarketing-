import {arg,print,request} from './_client.mjs'
const task=arg('task')
if(!task)throw new Error('usage: --task=<task>')
const [policy,evaluations]=await Promise.all([request('/api/ai/evaluation-policy?task='+encodeURIComponent(task)),request('/api/ai/evaluations?task='+encodeURIComponent(task))])
print({task,policy:policy.item||null,evaluations:evaluations.items||[]})
