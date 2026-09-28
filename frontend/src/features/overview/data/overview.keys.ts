import {getSessionGeneration} from '../../../../../packages/client-core/src/session-authority'
import {currentWorkspaceScopeId} from '../../../../../packages/client-core/src/query-scope'

const scope=()=>({
  sessionGeneration:getSessionGeneration(),
  workspaceId:currentWorkspaceScopeId()
})

export const overviewKeys={
  root:()=>{
    const current=scope()
    return ['customer-session',current.sessionGeneration,'workspace',current.workspaceId,'overview'] as const
  },
  summary:()=>[...overviewKeys.root(),'summary'] as const,
  liveSync:()=>[...overviewKeys.root(),'live-sync'] as const,
  funnel:()=>[...overviewKeys.root(),'funnel'] as const
}
