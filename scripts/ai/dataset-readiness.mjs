import {arg,print,request} from './_client.mjs'
const task=arg('task')
const result=await request('/api/ai/datasets'+(task?'?task='+encodeURIComponent(task):''))
print({task:task||null,count:(result.items||[]).length,items:(result.items||[]).map(item=>({id:item.id,task:item.task,rowCount:item.row_count??item.rowCount,maturityStatus:item.maturity_status??item.maturityStatus,labelObservationCutoff:item.label_observation_cutoff??item.labelObservationCutoff,contentHash:item.content_hash??item.contentHash}))})
