import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const keyMaterial=process.env.CONNECTOR_ENCRYPTION_KEY || ''
const key=keyMaterial ? createHash('sha256').update(keyMaterial).digest() : null

export const connectorVaultReady=()=>Boolean(key)

export const encryptSecret=value=>{
  if(!key) throw new Error('CONNECTOR_ENCRYPTION_KEY is required for connector credential storage')
  const iv=randomBytes(12)
  const cipher=createCipheriv('aes-256-gcm',key,iv)
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()])
  const tag=cipher.getAuthTag()
  return {
    version:1,
    alg:'aes-256-gcm',
    iv:iv.toString('base64url'),
    tag:tag.toString('base64url'),
    ciphertext:ciphertext.toString('base64url')
  }
}

export const decryptSecret=payload=>{
  if(!key) throw new Error('CONNECTOR_ENCRYPTION_KEY is required for connector credential storage')
  if(!payload || payload.version!==1 || payload.alg!=='aes-256-gcm') throw new Error('unsupported credential payload')
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(payload.iv,'base64url'))
  decipher.setAuthTag(Buffer.from(payload.tag,'base64url'))
  const plaintext=Buffer.concat([decipher.update(Buffer.from(payload.ciphertext,'base64url')),decipher.final()]).toString('utf8')
  return JSON.parse(plaintext)
}
