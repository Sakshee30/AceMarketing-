import { hasPermission } from '../../security.mjs'
import { createBoard, getBoardOperation, getBoardSnapshot, listBoards } from '../../platform/board-store.mjs'
import { moveCardController } from '../../../modules/boards/src/interfaces/http/move-card.controller.mjs'

function routeReply(send, req, res, status, payload) {
  send(req, res, status, payload)
  return true
}

export async function handleBoardRoutes({ req, res, url, workspaceId, readBody, send, authRequired }) {
  if (req.method === 'GET' && url.pathname === '/api/boards') {
    try {
      return routeReply(send, req, res, 200, { items: await listBoards({ workspaceId, limit: Number(url.searchParams.get('limit') || 100) }) })
    } catch (error) {
      return routeReply(send, req, res, Number(error?.status || 400), { error: error instanceof Error ? error.message : 'board list failed', code: error?.code || 'BOARD_LIST_FAILED' })
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/boards') {
    const body = await readBody(req)
    try {
      const item = await createBoard({ workspaceId, actorId: req.user?.userId || null, name: body?.name })
      return routeReply(send, req, res, 201, { item })
    } catch (error) {
      return routeReply(send, req, res, Number(error?.status || 400), { error: error instanceof Error ? error.message : 'board creation failed', code: error?.code || 'BOARD_CREATE_FAILED' })
    }
  }

  const snapshotMatch = url.pathname.match(/^\/api\/boards\/([^/]+)$/)
  if (req.method === 'GET' && snapshotMatch) {
    try {
      const snapshot = await getBoardSnapshot({ workspaceId, boardId: decodeURIComponent(snapshotMatch[1]) })
      return routeReply(send, req, res, snapshot ? 200 : 404, snapshot || { error: 'board not found', code: 'BOARD_NOT_FOUND' })
    } catch (error) {
      return routeReply(send, req, res, Number(error?.status || 400), { error: error instanceof Error ? error.message : 'board read failed', code: error?.code || 'BOARD_READ_FAILED' })
    }
  }

  const moveMatch = url.pathname.match(/^\/api\/boards\/([^/]+)\/moves$/)
  if (req.method === 'POST' && moveMatch) {
    const body = await readBody(req)
    const boardId = decodeURIComponent(moveMatch[1])
    try {
      const result = await moveCardController({
        workspaceId,
        actorId: req.user?.userId || null,
        requestId: req.requestId,
        correlationId: req.context?.traceId || req.requestId,
        boardId,
        body,
        canMove: Boolean(req.user ? hasPermission(req.user.role, 'boards.move') : !authRequired)
      })
      return routeReply(send, req, res, 200, result)
    } catch (error) {
      return routeReply(send, req, res, Number(error?.status || 500), {
        error: error instanceof Error ? error.message : 'board move failed',
        code: error?.code || 'BOARD_MOVE_FAILED',
        operationId: body?.operationId || null,
        retryable: Boolean(error?.retryable),
        ...(error?.currentVersion ? { currentVersion: error.currentVersion } : {}),
        ...(error?.currentPolicyVersion ? { currentPolicyVersion: error.currentPolicyVersion } : {})
      })
    }
  }

  const operationMatch = url.pathname.match(/^\/api\/boards\/([^/]+)\/operations\/([^/]+)$/)
  if (req.method === 'GET' && operationMatch) {
    try {
      const operation = await getBoardOperation({
        workspaceId,
        boardId: decodeURIComponent(operationMatch[1]),
        operationId: decodeURIComponent(operationMatch[2])
      })
      return routeReply(send, req, res, operation ? 200 : 404, operation || { error: 'board operation not found', code: 'BOARD_OPERATION_NOT_FOUND' })
    } catch (error) {
      return routeReply(send, req, res, Number(error?.status || 400), { error: error instanceof Error ? error.message : 'board operation lookup failed', code: error?.code || 'BOARD_OPERATION_LOOKUP_FAILED' })
    }
  }

  return false
}
