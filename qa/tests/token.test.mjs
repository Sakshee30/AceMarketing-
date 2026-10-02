import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {createToken,verifyToken,hashPassword,verifyPassword,hasPermission} from '../../backend/src/security.mjs'
const secret=randomBytes(32).toString('hex')
const actor={email:'qa@example.test',userId:'qa_user',workspaceId:'qa_workspace',role:'analyst'}
test('AUTH real token round trip preserves identity and scope',()=>{
 const t=createToken(actor,secret);const p=verifyToken(t,secret)
 assert.equal(p.sub,actor.email);assert.equal(p.workspaceId,actor.workspaceId);assert.equal(p.role,actor.role)
})
test('AUTH wrong signing key is rejected',()=>assert.equal(verifyToken(createToken(actor,secret),'wrong-key'),null))
test('AUTH modified payload is rejected',()=>{const t=createToken(actor,secret).split('.');t[0]+='A';assert.equal(verifyToken(t.join('.'),secret),null)})
test('AUTH extra token segments are rejected',()=>assert.equal(verifyToken(createToken(actor,secret)+'.unexpected',secret),null))
test('AUTH token is invalid at the exact expiry instant',t=>{
 t.mock.method(Date,'now',()=>2000000)
 const token=createToken(actor,secret,60)
 t.mock.method(Date,'now',()=>2060000)
 assert.equal(verifyToken(token,secret),null)
})
test('AUTH expired token is rejected',()=>assert.equal(verifyToken(createToken(actor,secret,-1),secret),null))
test('AUTH password hash validates only the original password',()=>{
 const encoded=hashPassword('Synthetic!Password-42')
 assert.equal(verifyPassword('Synthetic!Password-42',encoded),true)
 assert.equal(verifyPassword('Wrong!Password-42',encoded),false)
 assert.equal(verifyPassword('anything','invalid'),false)
})
test('AUTH analyst and unknown role cannot inherit owner privileges',()=>{
 assert.equal(hasPermission('analyst','members.write'),false)
 assert.equal(hasPermission('missing','workspace.read'),false)
 assert.equal(hasPermission('owner','workspace.read'),true)
})
