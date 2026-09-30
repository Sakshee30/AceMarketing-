import test from 'node:test'
import assert from 'node:assert/strict'
import {createToken} from '../src/security.mjs'
import {authorizeBoardRealtimeUpgrade} from '../src/platform/board-realtime.mjs'

const request=({token,workspaceId='ws_board',topics='board.item.moved'})=>({
  url:'/api/realtime/ws?workspace_id='+encodeURIComponent(workspaceId)+'&topics='+encodeURIComponent(topics),
  headers:{'sec-websocket-protocol':'ace-realtime-v1, '+token}
})

test('board realtime authorization binds token workspace and boards.read permission',()=>{
  const previousSecret=process.env.JWT_SECRET
  const previousEnv=process.env.NODE_ENV
  process.env.NODE_ENV='test'
  process.env.JWT_SECRET='board-realtime-test-secret-that-is-long-enough'
  try{
    const token=createToken({email:'owner@example.test',userId:'user_owner',workspaceId:'ws_board',role:'owner'},process.env.JWT_SECRET)
    const allowed=authorizeBoardRealtimeUpgrade(request({token}))
    assert.equal(allowed.workspaceId,'ws_board')
    assert.equal(allowed.actor.userId,'user_owner')
    assert.equal(allowed.topics.has('board.item.moved'),true)

    const mismatched=authorizeBoardRealtimeUpgrade(request({token,workspaceId:'ws_other'}))
    assert.equal(mismatched.error,'workspace scope mismatch')

    const analyst=createToken({email:'analyst@example.test',userId:'user_analyst',workspaceId:'ws_board',role:'analyst'},process.env.JWT_SECRET)
    const analystAllowed=authorizeBoardRealtimeUpgrade(request({token:analyst}))
    assert.equal(analystAllowed.workspaceId,'ws_board')

    const unknownRole=createToken({email:'guest@example.test',userId:'user_guest',workspaceId:'ws_board',role:'guest'},process.env.JWT_SECRET)
    const denied=authorizeBoardRealtimeUpgrade(request({token:unknownRole}))
    assert.equal(denied.error,'boards.read permission required')
  }finally{
    if(previousSecret===undefined)delete process.env.JWT_SECRET
    else process.env.JWT_SECRET=previousSecret
    if(previousEnv===undefined)delete process.env.NODE_ENV
    else process.env.NODE_ENV=previousEnv
  }
})

test('board realtime authorization rejects missing or invalid bearer material',()=>{
  const previousSecret=process.env.JWT_SECRET
  const previousEnv=process.env.NODE_ENV
  process.env.NODE_ENV='test'
  process.env.JWT_SECRET='board-realtime-test-secret-that-is-long-enough'
  try{
    const denied=authorizeBoardRealtimeUpgrade(request({token:'invalid.token'}))
    assert.equal(denied.error,'invalid or expired access token')
  }finally{
    if(previousSecret===undefined)delete process.env.JWT_SECRET
    else process.env.JWT_SECRET=previousSecret
    if(previousEnv===undefined)delete process.env.NODE_ENV
    else process.env.NODE_ENV=previousEnv
  }
})
