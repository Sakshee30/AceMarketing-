import test from 'node:test'
import assert from 'node:assert/strict'
import {MCP_DEFAULT_POLICY,MCP_SCOPE_PRESETS,getMcpCatalog,normalizeMcpScopes} from '../src/mcp-service.mjs'

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
