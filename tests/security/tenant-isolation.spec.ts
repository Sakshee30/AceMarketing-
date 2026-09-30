import test from 'node:test'
import assert from 'node:assert/strict'
import {validateBoardMoveCommand} from '../../backend/src/platform/board-store.mjs'

test('tenant isolation canonical security surface rejects caller-supplied tenant scope in board move command',()=>{
  const command=validateBoardMoveCommand({
    operationId:'op_security_contract',
    boardId:'board_security',
    itemId:'item_security',
    expectedItemVersion:1,
    expectedPolicyVersion:1,
    destinationColumnId:'column_security',
    placement:{mode:'bottom'},
    tenantId:'tenant_attacker',
    workspaceId:'workspace_attacker'
  })
  assert.equal('tenantId' in command,false)
  assert.equal('workspaceId' in command,false)
})
