import { handleEventQualityRoutes } from './event-quality-routes.mjs'
import { handleTrustQualityRoutes } from './trust-quality-routes.mjs'
import { handleDiagnosticsRoutes } from './diagnostics-routes.mjs'

/**
 * Composes the data quality HTTP domains while preserving the original public
 * route boundary used by the server bootstrap.
 */
export async function handleDataQualityRoutes(args) {
  if (await handleEventQualityRoutes(args)) return true
  if (await handleTrustQualityRoutes(args)) return true
  if (await handleDiagnosticsRoutes(args)) return true
  return false
}
