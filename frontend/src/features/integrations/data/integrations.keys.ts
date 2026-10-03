import {getSessionGeneration} from '../../../../../packages/client-core/src/session-authority'
import {currentWorkspaceScopeId} from '../../../../../packages/client-core/src/query-scope'

export const integrationKeys={
  root:()=>['customer-session',getSessionGeneration(),'workspace',currentWorkspaceScopeId(),'integrations'] as const,
  workspace:()=>[...integrationKeys.root(),'workspace-state'] as const,
  dataSummary:()=>[...integrationKeys.root(),'data-summary'] as const
}
