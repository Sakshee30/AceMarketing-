import { handleAttributionEngagementRoutes } from './attribution-engagement-routes.mjs'
import { handleAttributionReportingRoutes } from './attribution-reporting-routes.mjs'

/**
 * Composes attribution behavior and reporting routes behind one stable API boundary.
 */
export async function handleAttributionRoutes(args) {
  if (await handleAttributionEngagementRoutes(args)) return true
  if (await handleAttributionReportingRoutes(args)) return true
  return false
}
