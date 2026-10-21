import { handleAiGovernanceRoutes } from './ai-governance-routes.mjs'
import { handleAiKnowledgeRoutes } from './ai-knowledge-routes.mjs'
import { handleAiAnalystRoutes } from './ai-analyst-routes.mjs'

/**
 * Composes the AI HTTP domains behind the stable server-facing route contract.
 */
export async function handleAiRoutes(args) {
  if (await handleAiGovernanceRoutes(args)) return true
  if (await handleAiKnowledgeRoutes(args)) return true
  if (await handleAiAnalystRoutes(args)) return true
  return false
}
