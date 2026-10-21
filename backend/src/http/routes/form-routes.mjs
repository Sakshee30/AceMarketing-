import { appendAuditRecord } from '../../platform/audit-store.mjs'
import { createForm, getForm, listForms, listFormSubmissions } from '../../platform/forms-store.mjs'
import { handlePublishForm } from '../../../modules/forms/src/application/commands/publish-form/publish-form.handler.mjs'
import { handleSubmitForm } from '../../../modules/forms/src/application/commands/submit-form/submit-form.handler.mjs'

function routeReply(send, req, res, status, payload) {
  send(req, res, status, payload)
  return true
}

export async function handleFormRoutes({ req, res, url, workspaceId, readBody, send }) {
  if (req.method === 'GET' && url.pathname === '/api/forms') {
    return routeReply(send, req, res, 200, { items: await listForms({ workspaceId, limit: Number(url.searchParams.get('limit') || 100) }) })
  }

  if (req.method === 'POST' && url.pathname === '/api/forms') {
    const body = await readBody(req)
    try {
      const form = await createForm({
        workspaceId,
        name: body.name,
        slug: body.slug,
        description: body.description,
        schema: body.schema,
        actorId: req.user?.userId || null
      })
      await appendAuditRecord({
        workspaceId,
        actorId: req.user?.userId,
        action: 'form.created',
        entityType: 'form',
        entityId: form.id,
        requestId: req.requestId,
        traceId: req.context?.traceId,
        metadata: { slug: form.slug }
      }).catch(() => {})
      return routeReply(send, req, res, 201, form)
    } catch (error) {
      const status = Number(error?.status || (/unique|duplicate/i.test(String(error?.message || '')) ? 409 : 400))
      return routeReply(send, req, res, status, {
        error: error instanceof Error ? error.message : 'form creation failed',
        code: error?.code || 'form_create_failed'
      })
    }
  }

  const formMatch = url.pathname.match(/^\/api\/forms\/([^/]+)$/)
  if (req.method === 'GET' && formMatch) {
    const form = await getForm({ workspaceId, id: decodeURIComponent(formMatch[1]) })
    return routeReply(send, req, res, form ? 200 : 404, form || { error: 'form not found' })
  }

  const publishMatch = url.pathname.match(/^\/api\/forms\/([^/]+)\/publish$/)
  if (req.method === 'POST' && publishMatch) {
    const form = await handlePublishForm({ workspaceId, id: decodeURIComponent(publishMatch[1]), actorId: req.user?.userId || null })
    if (!form) return routeReply(send, req, res, 404, { error: 'form not found' })
    await appendAuditRecord({
      workspaceId,
      actorId: req.user?.userId,
      action: 'form.published',
      entityType: 'form',
      entityId: form.id,
      requestId: req.requestId,
      traceId: req.context?.traceId,
      metadata: { version: Number(form.published_version || 0) }
    }).catch(() => {})
    return routeReply(send, req, res, 200, form)
  }

  const submissionsMatch = url.pathname.match(/^\/api\/forms\/([^/]+)\/submissions$/)
  if (req.method === 'POST' && submissionsMatch) {
    const body = await readBody(req)
    try {
      const submission = await handleSubmitForm({
        workspaceId,
        id: decodeURIComponent(submissionsMatch[1]),
        data: body.data,
        actorId: req.user?.userId || null,
        submissionId: body.submissionId || req.headers['idempotency-key'] || null
      })
      if (!submission) return routeReply(send, req, res, 404, { error: 'published form not found' })
      return routeReply(send, req, res, 201, submission)
    } catch (error) {
      return routeReply(send, req, res, Number(error?.status || 400), {
        error: error instanceof Error ? error.message : 'submission failed',
        code: error?.code || 'form_submission_failed'
      })
    }
  }
  if (req.method === 'GET' && submissionsMatch) {
    return routeReply(send, req, res, 200, {
      items: await listFormSubmissions({ workspaceId, id: decodeURIComponent(submissionsMatch[1]), limit: Number(url.searchParams.get('limit') || 100) })
    })
  }

  return false
}
