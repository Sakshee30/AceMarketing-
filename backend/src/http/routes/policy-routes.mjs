import { appendAuditRecord } from '../../platform/audit-store.mjs'
import { archivePolicyRule, createPolicyRule, createPolicyRuleVersion, evaluatePublishedPolicyRule, getPolicyRule, listPolicyRules } from '../../platform/policy-engine.mjs'
import { handlePublishPolicy } from '../../../modules/authorization/src/application/commands/publish-policy/publish-policy.handler.mjs'
import { handleSimulateRule } from '../../../modules/rules/src/application/queries/simulate-rule/simulate-rule.handler.mjs'

function routeReply(send, req, res, status, payload) {
  send(req, res, status, payload)
  return true
}

export async function handlePolicyRoutes({ req, res, url, workspaceId, readBody, send }) {
  if (req.method === 'GET' && url.pathname === '/api/policy-rules') {
    return routeReply(send, req, res, 200, { items: await listPolicyRules({ workspaceId, limit: Number(url.searchParams.get('limit') || 100) }) })
  }

  if (req.method === 'POST' && url.pathname === '/api/policy-rules/simulate') {
    const body = await readBody(req)
    try {
      return routeReply(send, req, res, 200, handleSimulateRule({ expression: body.expression, input: body.input || {} }))
    } catch (error) {
      return routeReply(send, req, res, Number(error?.status || 400), {
        error: error instanceof Error ? error.message : 'policy simulation failed',
        code: error?.code || 'policy_simulation_failed'
      })
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/policy-rules') {
    const body = await readBody(req)
    try {
      const rule = await createPolicyRule({
        workspaceId,
        name: body.name,
        expression: body.expression,
        inputSchemaVersion: body.inputSchemaVersion,
        actorId: req.user?.userId || null
      })
      await appendAuditRecord({
        workspaceId,
        actorId: req.user?.userId,
        action: 'policy_rule.created',
        entityType: 'policy_rule',
        entityId: rule.id,
        requestId: req.requestId,
        traceId: req.context?.traceId
      }).catch(() => {})
      return routeReply(send, req, res, 201, rule)
    } catch (error) {
      return routeReply(send, req, res, Number(error?.status || 400), {
        error: error instanceof Error ? error.message : 'policy rule creation failed',
        code: error?.code || 'policy_rule_create_failed'
      })
    }
  }

  const policyMatch = url.pathname.match(/^\/api\/policy-rules\/([^/]+)$/)
  if (req.method === 'GET' && policyMatch) {
    const rule = await getPolicyRule({ workspaceId, id: decodeURIComponent(policyMatch[1]) })
    return routeReply(send, req, res, rule ? 200 : 404, rule || { error: 'policy rule not found' })
  }

  const versionMatch = url.pathname.match(/^\/api\/policy-rules\/([^/]+)\/versions$/)
  if (req.method === 'POST' && versionMatch) {
    const body = await readBody(req)
    try {
      const rule = await createPolicyRuleVersion({
        workspaceId,
        id: decodeURIComponent(versionMatch[1]),
        expression: body.expression,
        inputSchemaVersion: body.inputSchemaVersion,
        actorId: req.user?.userId || null
      })
      if (!rule) return routeReply(send, req, res, 404, { error: 'policy rule not found' })
      await appendAuditRecord({
        workspaceId,
        actorId: req.user?.userId,
        action: 'policy_rule.version_created',
        entityType: 'policy_rule',
        entityId: rule.id,
        requestId: req.requestId,
        traceId: req.context?.traceId,
        metadata: { version: Number(rule.version || rule.latest_version || 0) }
      }).catch(() => {})
      return routeReply(send, req, res, 201, rule)
    } catch (error) {
      return routeReply(send, req, res, Number(error?.status || 400), {
        error: error instanceof Error ? error.message : 'policy rule version failed',
        code: error?.code || 'policy_rule_version_failed'
      })
    }
  }

  const publishMatch = url.pathname.match(/^\/api\/policy-rules\/([^/]+)\/publish$/)
  if (req.method === 'POST' && publishMatch) {
    const rule = await handlePublishPolicy({ workspaceId, id: decodeURIComponent(publishMatch[1]) })
    if (!rule) return routeReply(send, req, res, 404, { error: 'policy rule not found' })
    await appendAuditRecord({
      workspaceId,
      actorId: req.user?.userId,
      action: 'policy_rule.published',
      entityType: 'policy_rule',
      entityId: rule.id,
      requestId: req.requestId,
      traceId: req.context?.traceId,
      metadata: { version: Number(rule.published_version || 0) }
    }).catch(() => {})
    return routeReply(send, req, res, 200, rule)
  }

  const archiveMatch = url.pathname.match(/^\/api\/policy-rules\/([^/]+)\/archive$/)
  if (req.method === 'POST' && archiveMatch) {
    const rule = await archivePolicyRule({ workspaceId, id: decodeURIComponent(archiveMatch[1]) })
    if (!rule) return routeReply(send, req, res, 404, { error: 'policy rule not found' })
    await appendAuditRecord({ workspaceId, actorId: req.user?.userId, action: 'policy_rule.archived', entityType: 'policy_rule', entityId: rule.id, requestId: req.requestId, traceId: req.context?.traceId }).catch(() => {})
    return routeReply(send, req, res, 200, rule)
  }

  const evaluateMatch = url.pathname.match(/^\/api\/policy-rules\/([^/]+)\/evaluate$/)
  if (req.method === 'POST' && evaluateMatch) {
    const body = await readBody(req)
    const decision = await evaluatePublishedPolicyRule({ workspaceId, id: decodeURIComponent(evaluateMatch[1]), input: body.input || {} })
    return routeReply(send, req, res, decision ? 200 : 404, decision || { error: 'published policy rule not found' })
  }

  return false
}
