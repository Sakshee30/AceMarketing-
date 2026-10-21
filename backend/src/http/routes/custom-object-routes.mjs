import { appendAuditRecord } from '../../platform/audit-store.mjs'
import { createCustomObjectRecord, createCustomObjectVersion, getCustomObject, listCustomObjectRecords, listCustomObjects, publishCustomObject } from '../../platform/custom-object-store.mjs'
import { handleDefineCustomObject } from '../../../modules/custom-objects/src/application/commands/define-object/define-object.handler.mjs'

function routeReply(send, req, res, status, payload) {
  send(req, res, status, payload)
  return true
}

export async function handleCustomObjectRoutes({ req, res, url, workspaceId, readBody, send }) {
  if (req.method === 'GET' && url.pathname === '/api/custom-objects') {
    return routeReply(send, req, res, 200, { items: await listCustomObjects({ workspaceId, limit: Number(url.searchParams.get('limit') || 100) }) })
  }

  if (req.method === 'POST' && url.pathname === '/api/custom-objects') {
    const body = await readBody(req)
    try {
      const object = await handleDefineCustomObject({
        workspaceId,
        objectKey: body.objectKey,
        name: body.name,
        description: body.description,
        schema: body.schema,
        actorId: req.user?.userId || null
      })
      await appendAuditRecord({
        workspaceId,
        actorId: req.user?.userId,
        action: 'custom_object.created',
        entityType: 'custom_object',
        entityId: object.id,
        requestId: req.requestId,
        traceId: req.context?.traceId,
        metadata: { objectKey: object.object_key }
      }).catch(() => {})
      return routeReply(send, req, res, 201, object)
    } catch (error) {
      const status = Number(error?.status || (/unique|duplicate/i.test(String(error?.message || '')) ? 409 : 400))
      return routeReply(send, req, res, status, {
        error: error instanceof Error ? error.message : 'custom object creation failed',
        code: error?.code || 'custom_object_create_failed'
      })
    }
  }

  const objectMatch = url.pathname.match(/^\/api\/custom-objects\/([^/]+)$/)
  if (req.method === 'GET' && objectMatch) {
    const object = await getCustomObject({ workspaceId, id: decodeURIComponent(objectMatch[1]) })
    return routeReply(send, req, res, object ? 200 : 404, object || { error: 'custom object not found' })
  }

  const versionMatch = url.pathname.match(/^\/api\/custom-objects\/([^/]+)\/versions$/)
  if (req.method === 'POST' && versionMatch) {
    const body = await readBody(req)
    try {
      const object = await createCustomObjectVersion({
        workspaceId,
        id: decodeURIComponent(versionMatch[1]),
        schema: body.schema,
        actorId: req.user?.userId || null
      })
      if (!object) return routeReply(send, req, res, 404, { error: 'custom object not found' })
      await appendAuditRecord({
        workspaceId,
        actorId: req.user?.userId,
        action: 'custom_object.version_created',
        entityType: 'custom_object',
        entityId: object.id,
        requestId: req.requestId,
        traceId: req.context?.traceId,
        metadata: { version: Number(object.version || object.latest_version || 0) }
      }).catch(() => {})
      return routeReply(send, req, res, 201, object)
    } catch (error) {
      return routeReply(send, req, res, Number(error?.status || 400), {
        error: error instanceof Error ? error.message : 'custom object version failed',
        code: error?.code || 'custom_object_version_failed'
      })
    }
  }

  const publishMatch = url.pathname.match(/^\/api\/custom-objects\/([^/]+)\/publish$/)
  if (req.method === 'POST' && publishMatch) {
    const object = await publishCustomObject({ workspaceId, id: decodeURIComponent(publishMatch[1]), actorId: req.user?.userId || null })
    if (!object) return routeReply(send, req, res, 404, { error: 'custom object not found' })
    await appendAuditRecord({
      workspaceId,
      actorId: req.user?.userId,
      action: 'custom_object.published',
      entityType: 'custom_object',
      entityId: object.id,
      requestId: req.requestId,
      traceId: req.context?.traceId,
      metadata: { version: Number(object.published_version || 0) }
    }).catch(() => {})
    return routeReply(send, req, res, 200, object)
  }

  const recordsMatch = url.pathname.match(/^\/api\/custom-objects\/([^/]+)\/records$/)
  if (req.method === 'POST' && recordsMatch) {
    const body = await readBody(req)
    try {
      const record = await createCustomObjectRecord({
        workspaceId,
        id: decodeURIComponent(recordsMatch[1]),
        data: body.data,
        actorId: req.user?.userId || null,
        recordId: body.recordId || req.headers['idempotency-key'] || null
      })
      if (!record) return routeReply(send, req, res, 404, { error: 'published custom object not found' })
      return routeReply(send, req, res, 201, record)
    } catch (error) {
      return routeReply(send, req, res, Number(error?.status || 400), {
        error: error instanceof Error ? error.message : 'custom object record failed',
        code: error?.code || 'custom_object_record_failed'
      })
    }
  }
  if (req.method === 'GET' && recordsMatch) {
    return routeReply(send, req, res, 200, {
      items: await listCustomObjectRecords({ workspaceId, id: decodeURIComponent(recordsMatch[1]), limit: Number(url.searchParams.get('limit') || 100) })
    })
  }

  return false
}
