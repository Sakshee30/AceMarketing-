import {api as sharedApi} from '../../../lib/api'
export const fraudApi={load:()=>sharedApi.fraud(),block:(pattern:string)=>sharedApi.blockFraudPattern(pattern),review:(pattern:string)=>sharedApi.reviewFraudPattern(pattern)}
