export type DraftOwner={
  tenantId?:string|null
  workspaceId?:string|null
  userId?:string|null
  resourceId?:string|null
}

export type StoredDraft<T>={
  version:number
  schemaVersion:number
  createdAt:string
  updatedAt:string
  savedAt:string
  expiresAt:string|null
  owner:DraftOwner
  value:T
}

export type DraftStoreOptions<T>={
  key:string
  version:number
  validate?:(value:unknown)=>value is T
  maxBytes?:number
  owner?:DraftOwner
  ttlMs?:number|null
}

const defaultMaxBytes=256*1024

const safe=(value:string|null|undefined)=>String(value||'').trim()

const sameOwner=(left:DraftOwner={},right:DraftOwner={})=>
  safe(left.tenantId)===safe(right.tenantId)&&
  safe(left.workspaceId)===safe(right.workspaceId)&&
  safe(left.userId)===safe(right.userId)&&
  safe(left.resourceId)===safe(right.resourceId)

export const createDraftStore=<T>({key,version,validate,maxBytes=defaultMaxBytes,owner={},ttlMs=null}:DraftStoreOptions<T>)=>{
  const storage=()=>typeof window==='undefined'?null:window.localStorage

  const clear=()=>storage()?.removeItem(key)

  const read=():StoredDraft<T>|null=>{
    const target=storage()
    if(!target)return null
    const raw=target.getItem(key)
    if(!raw)return null
    try{
      const parsed=JSON.parse(raw) as Partial<StoredDraft<unknown>>&{savedAt?:string}
      if(parsed?.version!==version)return null
      const updatedAt=typeof parsed.updatedAt==='string'?parsed.updatedAt:parsed.savedAt
      if(typeof updatedAt!=='string')return null
      const parsedOwner=parsed.owner&&typeof parsed.owner==='object'?parsed.owner:{}
      if(!sameOwner(parsedOwner,owner)){
        clear()
        return null
      }
      if(parsed.expiresAt&&Date.parse(parsed.expiresAt)<=Date.now()){
        clear()
        return null
      }
      if(validate&&!validate(parsed.value))return null
      const createdAt=typeof parsed.createdAt==='string'?parsed.createdAt:updatedAt
      return {
        version,
        schemaVersion:Number(parsed.schemaVersion||version),
        createdAt,
        updatedAt,
        savedAt:updatedAt,
        expiresAt:parsed.expiresAt||null,
        owner:{...parsedOwner},
        value:parsed.value as T
      }
    }catch{
      return null
    }
  }

  const write=(value:T)=>{
    const target=storage()
    if(!target)return false
    const previous=read()
    const now=new Date().toISOString()
    const expiresAt=ttlMs&&ttlMs>0?new Date(Date.now()+ttlMs).toISOString():null
    const payload:StoredDraft<T>={
      version,
      schemaVersion:version,
      createdAt:previous?.createdAt||now,
      updatedAt:now,
      savedAt:now,
      expiresAt,
      owner:{...owner},
      value
    }
    const raw=JSON.stringify(payload)
    if(new TextEncoder().encode(raw).byteLength>maxBytes)throw new Error('Draft exceeds the permitted local storage budget.')
    try{
      target.setItem(key,raw)
      return true
    }catch(error){
      throw Object.assign(new Error('Draft storage is unavailable or full.'),{
        code:'draft_storage_unavailable',
        cause:error
      })
    }
  }

  return {read,write,clear}
}
