import {api} from '../../../lib/api'

export const approvalsApi={
  list:(signal?:AbortSignal)=>api.approvals({signal}),
  decide:(approvalId:string,decision:'approved'|'rejected',operationId:string,signal?:AbortSignal)=>
    api.decideApproval(approvalId,decision,{signal,operationId})
}
