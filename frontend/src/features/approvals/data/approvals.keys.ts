import {getSessionGeneration} from '../../../../../packages/client-core/src/session-authority'
import {currentWorkspaceScopeId} from '../../../../../packages/client-core/src/query-scope'

export const approvalKeys={
  root:()=>['customer-session',getSessionGeneration(),'workspace',currentWorkspaceScopeId(),'approvals'] as const,
  list:()=>[...approvalKeys.root(),'list'] as const
}
