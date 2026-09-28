import {api as sharedApi} from '../../../lib/api'
export const reconciliationApi={load:()=>sharedApi.reconciliation(),run:(issue:string,limit=250)=>sharedApi.runReconciliationAction(issue,limit)}
