export type RedisCacheClient={
  get:(key:string)=>Promise<string|null>
  set:(key:string,value:string,options?:{EX?:number})=>Promise<unknown>
  del:(key:string)=>Promise<unknown>
}

export const redisCacheProfile=()=>({
  provider:'redis',
  configured:Boolean(process.env.REDIS_URL),
  authoritative:false,
  fallback:'bounded-bypass'
})

export const createRedisCacheAdapter=(client:RedisCacheClient|null)=>{
  const get=async(key:string)=>{
    if(!client)return null
    return client.get(String(key))
  }
  const set=async(key:string,value:string,ttlSeconds=60)=>{
    if(!client)return false
    const ttl=Math.max(1,Math.min(3600,Number(ttlSeconds)||60))
    await client.set(String(key),String(value),{EX:ttl})
    return true
  }
  const del=async(key:string)=>{
    if(!client)return false
    await client.del(String(key))
    return true
  }
  return {get,set,delete:del,profile:redisCacheProfile}
}
