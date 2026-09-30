import {createHash} from 'node:crypto'

export const normalizeIdempotencyKey=value=>{
  const key=String(value||'').trim()
  if(!key)return null
  if(key.length>200)throw Object.assign(new Error('idempotency key is too long'),{status:400,code:'invalid_idempotency_key'})
  if(!/^[A-Za-z0-9._:-]+$/.test(key))throw Object.assign(new Error('idempotency key contains unsupported characters'),{status:400,code:'invalid_idempotency_key'})
  return key
}

export const requestFingerprint=({method,path,workspaceId,body})=>createHash('sha256')
  .update(JSON.stringify({
    method:String(method||'GET').toUpperCase(),
    path:String(path||''),
    workspaceId:String(workspaceId||''),
    body:body??null
  }))
  .digest('hex')

export const requireIdempotencyKey=(headers={})=>{
  const key=normalizeIdempotencyKey(headers['idempotency-key']||headers['x-idempotency-key'])
  if(!key)throw Object.assign(new Error('idempotency key is required for this operation'),{status:400,code:'idempotency_key_required'})
  return key
}
