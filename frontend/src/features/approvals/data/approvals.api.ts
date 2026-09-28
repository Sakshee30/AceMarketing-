import {api} from '../../../lib/api'

export const approvalsApi={
  list:()=>api.approvals(),
  decide:(approvalId:string,decision:'approved'|'rejected')=>api.decideApproval(approvalId,decision)
}
