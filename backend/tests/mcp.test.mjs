import test from 'node:test'
import assert from 'node:assert/strict'
import {MCP_DEFAULT_POLICY,MCP_SCOPE_PRESETS,confirmMcpAction,getMcpCatalog,normalizeMcpScopes,prepareMcpAction} from '../src/mcp-service.mjs'

test('MCP scope presets are bounded and valid',()=>{
  assert.deepEqual(normalizeMcpScopes([], 'analyst'),MCP_SCOPE_PRESETS.analyst)
  assert.deepEqual(normalizeMcpScopes('mcp.read,mcp.analyze'),['mcp.read','mcp.analyze'])
  assert.throws(()=>normalizeMcpScopes('not-a-scope'),/valid MCP scope/)
})

test('MCP catalog exposes governed capability metadata',()=>{
  const tools=getMcpCatalog({kind:'tool'})
  assert.ok(tools.some(item=>item.name==='ace_confirm_action'))
  assert.ok(tools.every(item=>item.requiredPermission&&item.requiredScope&&item.risk))
  assert.ok(tools.find(item=>item.name==='ace_confirm_action').queued)
})

test('MCP policy defaults keep destructive domains closed',()=>{
  assert.equal(MCP_DEFAULT_POLICY.deletion,'disabled')
  assert.equal(MCP_DEFAULT_POLICY.billing,'disabled')
  assert.equal(MCP_DEFAULT_POLICY.audience_activation,'human_approval')
})

test('MCP preview policies cannot execute side effects',async()=>{
  const workspaceId='mcp_unit_preview'
  const action=await prepareMcpAction({workspaceId,actorId:'unit-user',role:'admin',actionType:'audience.create',input:{name:'Unit audience',destination:'Meta Ads',condition:'grade',operator:'equals',value:'A'},requiredPermission:'workspace.write',requiredScope:'mcp.execute',risk:'high'})
  const confirmed=await confirmMcpAction({workspaceId,actorId:'unit-user',role:'admin',actionId:action.actionId,idempotencyKey:'unit-preview-123'})
  assert.equal(confirmed.status,'preview_only')
  assert.equal(confirmed.result.sideEffect,false)
})

test('MCP disabled policy blocks destructive preparation',async()=>{
  await assert.rejects(
    prepareMcpAction({workspaceId:'mcp_unit_delete',actorId:'unit-user',role:'owner',actionType:'privacy.delete',input:{selectorType:'lead',selector:'lead-1',confirm:'DELETE'},requiredPermission:'workspace.write',requiredScope:'mcp.destructive',risk:'critical'}),
    error=>error?.code==='mcp_policy_disabled'
  )
})
