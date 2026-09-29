import {arg,print,request} from './_client.mjs'
const task=arg('task')
if(!task)throw new Error('usage: --task=<task>')
print(await request('/api/ai/models/'+encodeURIComponent(task)+'/rollback',{method:'POST',body:{}}))
