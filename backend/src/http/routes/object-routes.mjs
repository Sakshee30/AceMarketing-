import { timingSafeEqual } from 'node:crypto'
import { appendAuditRecord } from '../../platform/audit-store.mjs'
import { createDownloadGrant, listObjects, markObjectQuarantined, softDeleteObject } from '../../platform/object-lifecycle.mjs'
import { markObjectProcessingFailure } from '../../platform/document-processing.mjs'
import { searchCapabilityProfile } from '../../platform/search-port.mjs'
import { handleApproveFile } from '../../../modules/documents/src/application/commands/approve-file/approve-file.handler.mjs'
import { handleAuthorizeUpload } from '../../../modules/documents/src/application/commands/authorize-upload/authorize-upload.handler.mjs'
import { handleRebuildSearchIndex } from '../../../modules/search/src/application/commands/rebuild-index/rebuild-index.handler.mjs'
import { handleQuerySearch } from '../../../modules/search/src/application/queries/query-search/query-search.handler.mjs'

function routeReply(send, req, res, status, payload) {
  send(req, res, status, payload)
  return true
}

function workerAuthorized(req, objectWorkerToken) {
  if (!objectWorkerToken) return false
  const supplied = Buffer.from(String(req.headers['x-object-worker-token'] || ''))
  const expected = Buffer.from(objectWorkerToken)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

export async function handleObjectRoutes({ req, res, url, workspaceId, readBody, send, objectWorkerToken }) {
  if (req.method === 'GET' && url.pathname === '/api/files') {
    const limit = Number(url.searchParams.get('limit') || 100)
    return routeReply(send, req, res, 200, { items: await listObjects({ workspaceId, role: req.user?.role || 'viewer', limit }) })
  }

  if (req.method === 'POST' && url.pathname === '/api/files/upload-intents') {
    const body = await readBody(req)
    try {
      const intent = await handleAuthorizeUpload({
        workspaceId,
        name: body.name,
        mime: body.mime,
        size: body.size,
        sha256: body.sha256,
        accessPolicy: body.accessPolicy || {},
        actorId: req.user?.userId || null
      })
      await appendAuditRecord({
        workspaceId,
        actorId: req.user?.userId,
        action: 'object.upload_intent_created',
        entityType: 'object',
        entityId: intent.object.id,
        requestId: req.requestId,
        traceId: req.context?.traceId,
        metadata: { name: intent.object.original_name, size: Number(intent.object.expected_size) }
      }).catch(() => {})
      return routeReply(send, req, res, 201, intent)
    } catch (error) {
      return routeReply(send, req, res, Number(error?.status || 400), {
        error: error instanceof Error ? error.message : 'upload intent creation failed',
        code: error?.code || 'object_upload_intent_failed'
      })
    }
  }

  const quarantineMatch = url.pathname.match(/^\/api\/files\/([^/]+)\/quarantine-confirm$/)
  if (req.method === 'POST' && quarantineMatch) {
    if (!objectWorkerToken) return routeReply(send, req, res, 503, { error: 'object verification worker is not configured', code: 'object_worker_unavailable' })
    if (!workerAuthorized(req, objectWorkerToken)) return routeReply(send, req, res, 403, { error: 'object worker authorization failed', code: 'object_worker_forbidden' })
    const body = await readBody(req)
    try {
      const result = await markObjectQuarantined({
        workspaceId,
        objectId: decodeURIComponent(quarantineMatch[1]),
        grantToken: body.grantToken,
        actualSize: body.actualSize,
        actualSha256: body.actualSha256,
        detectedMime: body.detectedMime,
        storageProvider: body.storageProvider || 's3',
        storageVersion: body.storageVersion || null
      })
      return routeReply(send, req, res, result.integrityMatched ? 200 : 422, result)
    } catch (error) {
      return routeReply(send, req, res, 400, { error: error instanceof Error ? error.message : 'object quarantine confirmation failed' })
    }
  }

  const scanMatch = url.pathname.match(/^\/api\/files\/([^/]+)\/scan-result$/)
  if (req.method === 'POST' && scanMatch) {
    if (!objectWorkerToken) return routeReply(send, req, res, 503, { error: 'object scanning worker is not configured', code: 'object_worker_unavailable' })
    if (!workerAuthorized(req, objectWorkerToken)) return routeReply(send, req, res, 403, { error: 'object worker authorization failed', code: 'object_worker_forbidden' })
    const body = await readBody(req)
    try {
      const item = await handleApproveFile({
        workspaceId,
        objectId: decodeURIComponent(scanMatch[1]),
        result: body.result,
        evidence: body.evidence || {},
        actorId: req.user?.userId || 'object-worker'
      })
      await appendAuditRecord({
        workspaceId,
        actorId: req.user?.userId || 'object-worker',
        action: 'object.scan_recorded',
        entityType: 'object',
        entityId: item.id,
        requestId: req.requestId,
        traceId: req.context?.traceId,
        metadata: { scanStatus: item.scan_status, status: item.status }
      }).catch(() => {})
      return routeReply(send, req, res, 200, item)
    } catch (error) {
      return routeReply(send, req, res, 400, { error: error instanceof Error ? error.message : 'object scan recording failed' })
    }
  }

  const indexMatch = url.pathname.match(/^\/api\/files\/([^/]+)\/index-extracted$/)
  if (req.method === 'POST' && indexMatch) {
    if (!objectWorkerToken) return routeReply(send, req, res, 503, { error: 'document processing worker is not configured', code: 'object_worker_unavailable' })
    if (!workerAuthorized(req, objectWorkerToken)) return routeReply(send, req, res, 403, { error: 'object worker authorization failed', code: 'object_worker_forbidden' })
    const body = await readBody(req)
    const objectId = decodeURIComponent(indexMatch[1])
    try {
      const item = await handleRebuildSearchIndex({ workspaceId, objectId, text: body.text, evidence: body.evidence || {} })
      await appendAuditRecord({
        workspaceId,
        actorId: req.user?.userId || 'document-worker',
        action: 'object.indexed',
        entityType: 'object',
        entityId: objectId,
        requestId: req.requestId,
        traceId: req.context?.traceId,
        metadata: { storageVersion: item.approved_storage_version, sha256: item.approved_sha256 }
      }).catch(() => {})
      return routeReply(send, req, res, 200, item)
    } catch (error) {
      await markObjectProcessingFailure({
        workspaceId,
        objectId,
        stage: 'index',
        error: error instanceof Error ? error.message : 'document indexing failed',
        evidence: body.evidence || {}
      }).catch(() => {})
      return routeReply(send, req, res, 400, { error: error instanceof Error ? error.message : 'document indexing failed' })
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/search') {
    try {
      const result = await handleQuerySearch({
        workspaceId,
        query: url.searchParams.get('q') || '',
        role: req.user?.role || 'viewer',
        limit: Number(url.searchParams.get('limit') || 20),
        sourceType: url.searchParams.get('sourceType') || null
      })
      return routeReply(send, req, res, 200, result)
    } catch (error) {
      return routeReply(send, req, res, 400, { error: error instanceof Error ? error.message : 'search failed', profile: searchCapabilityProfile() })
    }
  }

  const downloadMatch = url.pathname.match(/^\/api\/files\/([^/]+)\/download-grant$/)
  if (req.method === 'POST' && downloadMatch) {
    try {
      const grant = await createDownloadGrant({
        workspaceId,
        objectId: decodeURIComponent(downloadMatch[1]),
        role: req.user?.role || 'viewer',
        actorId: req.user?.userId || null
      })
      return routeReply(send, req, res, 201, grant)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'download grant failed'
      const status = /denied/.test(message) ? 403 : /not found/.test(message) ? 404 : 400
      return routeReply(send, req, res, status, { error: message })
    }
  }

  const deleteMatch = url.pathname.match(/^\/api\/files\/([^/]+)$/)
  if (req.method === 'DELETE' && deleteMatch) {
    if (!['owner', 'admin'].includes(req.user?.role || '')) return routeReply(send, req, res, 403, { error: 'owner or admin role required' })
    try {
      const item = await softDeleteObject({ workspaceId, objectId: decodeURIComponent(deleteMatch[1]), actorId: req.user?.userId || null })
      if (!item) return routeReply(send, req, res, 404, { error: 'object not found' })
      await appendAuditRecord({
        workspaceId,
        actorId: req.user?.userId,
        action: 'object.deleted',
        entityType: 'object',
        entityId: item.id,
        requestId: req.requestId,
        traceId: req.context?.traceId
      }).catch(() => {})
      return routeReply(send, req, res, 200, item)
    } catch (error) {
      return routeReply(send, req, res, 409, { error: error instanceof Error ? error.message : 'object deletion blocked' })
    }
  }

  return false
}
