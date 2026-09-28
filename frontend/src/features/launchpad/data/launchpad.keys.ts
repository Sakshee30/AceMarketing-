import {getSessionGeneration} from '../../../../../packages/client-core/src/session-authority'
import {currentWorkspaceScopeId} from '../../../../../packages/client-core/src/query-scope'

export const launchpadKeys={
  root:()=>['customer-session',getSessionGeneration(),'workspace',currentWorkspaceScopeId(),'launchpad'] as const,
  readiness:()=>[...launchpadKeys.root(),'readiness'] as const
}
