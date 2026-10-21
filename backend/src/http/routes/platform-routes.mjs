import { handleBoardRoutes } from './board-routes.mjs'
import { handleCustomObjectRoutes } from './custom-object-routes.mjs'
import { handleFormRoutes } from './form-routes.mjs'
import { handleObjectRoutes } from './object-routes.mjs'
import { handlePolicyRoutes } from './policy-routes.mjs'

/**
 * Dispatches the platform's independently owned HTTP route groups.
 * Keeping composition here makes index.mjs responsible only for transport
 * setup and cross-cutting middleware, while each route module owns one domain.
 */
export async function handlePlatformRoutes({ req, res, url, workspaceId, readBody, send, objectWorkerToken, authRequired }) {
  const context = { req, res, url, workspaceId, readBody, send }
  if (await handleObjectRoutes({ ...context, objectWorkerToken })) return true
  if (await handleFormRoutes(context)) return true
  if (await handleCustomObjectRoutes(context)) return true
  if (await handlePolicyRoutes(context)) return true
  if (await handleBoardRoutes({ ...context, authRequired })) return true
  return false
}
