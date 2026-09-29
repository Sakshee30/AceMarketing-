import {arg,print,request} from './_client.mjs'
const task=arg('task')
if(!task)throw new Error('usage: --task=<registry task>')
print(await request('/api/ai/providers/'+encodeURIComponent(task)+'/verify',{method:'POST',body:{}}))
