export type StoredDraft<T>={
  version:number
  savedAt:string
  value:T
}

export type DraftStoreOptions<T>={
  key:string
  version:number
  validate?:(value:unknown)=>value is T
  maxBytes?:number
}

const defaultMaxBytes=256*1024

export const createDraftStore=<T>({key,version,validate,maxBytes=defaultMaxBytes}:DraftStoreOptions<T>)=>{
  const storage=()=>typeof window==='undefined'?null:window.localStorage

  const read=():StoredDraft<T>|null=>{
    const target=storage()
    if(!target)return null
    const raw=target.getItem(key)
    if(!raw)return null
    try{
      const parsed=JSON.parse(raw) as StoredDraft<unknown>
      if(parsed?.version!==version||typeof parsed?.savedAt!=='string')return null
      if(validate&&!validate(parsed.value))return null
      return parsed as StoredDraft<T>
    }catch{
      return null
    }
  }

  const write=(value:T)=>{
    const target=storage()
    if(!target)return false
    const payload:StoredDraft<T>={version,savedAt:new Date().toISOString(),value}
    const raw=JSON.stringify(payload)
    if(new TextEncoder().encode(raw).byteLength>maxBytes)throw new Error('Draft exceeds the permitted local storage budget.')
    target.setItem(key,raw)
    return true
  }

  const clear=()=>storage()?.removeItem(key)

  return {read,write,clear}
}
