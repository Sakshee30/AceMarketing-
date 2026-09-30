import {createHmac,timingSafeEqual} from 'node:crypto'

const normalizeHex=value=>String(value||'').replace(/^sha256=/i,'').trim().toLowerCase()

export const createWebhookSignature=({secret,timestamp,deliveryId,body})=>{
  if(!secret)throw new Error('webhook signing secret is required')
  const encoded=String(timestamp)+'.'+String(deliveryId||'')+'.'+String(body||'')
  return 'sha256='+createHmac('sha256',String(secret)).update(encoded).digest('hex')
}

export const verifyWebhookSignature=({
  secret,
  timestamp,
  deliveryId,
  body,
  signature,
  nowMs=Date.now(),
  toleranceSeconds=300
})=>{
  const numericTimestamp=Number(timestamp)
  if(!Number.isFinite(numericTimestamp))return false
  if(Math.abs(Math.floor(nowMs/1000)-numericTimestamp)>Math.max(1,Number(toleranceSeconds)||300))return false
  const expected=normalizeHex(createWebhookSignature({secret,timestamp:numericTimestamp,deliveryId,body}))
  const actual=normalizeHex(signature)
  const left=Buffer.from(actual,'hex')
  const right=Buffer.from(expected,'hex')
  return left.length===right.length&&left.length>0&&timingSafeEqual(left,right)
}
