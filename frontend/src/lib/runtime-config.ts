export type PublicRuntimeConfig = {
  releaseId:string
  environment:string
  apiBasePath:string
  requestTimeouts:{
    readMs:number
    writeMs:number
  }
}

const integerInRange=(value:unknown,fallback:number,min:number,max:number)=>{
  const parsed=Number(value)
  if(!Number.isFinite(parsed))return fallback
  return Math.min(max,Math.max(min,Math.round(parsed)))
}

const readEnv=()=>{
  const env=((import.meta as any).env||{}) as Record<string,unknown>
  return env
}

export const readPublicRuntimeConfig=():PublicRuntimeConfig=>{
  const env=readEnv()
  const apiBasePath=String(env.VITE_API_BASE_PATH||'/api').trim()
  if(!apiBasePath.startsWith('/')||apiBasePath.startsWith('//')){
    throw new Error('Invalid public API base path. AceMarketing only accepts a same-origin relative API path.')
  }

  const environment=String(env.VITE_APP_ENV||env.MODE||'production').trim()||'production'
  const releaseId=String(env.VITE_RELEASE_ID||'development').trim()||'development'

  return {
    releaseId,
    environment,
    apiBasePath:apiBasePath.replace(/\/$/,'')||'/api',
    requestTimeouts:{
      readMs:integerInRange(env.VITE_READ_TIMEOUT_MS,15000,1000,60000),
      writeMs:integerInRange(env.VITE_WRITE_TIMEOUT_MS,25000,1000,120000)
    }
  }
}

let cached:PublicRuntimeConfig|null=null

export const getPublicRuntimeConfig=()=>{
  if(!cached)cached=readPublicRuntimeConfig()
  return cached
}
