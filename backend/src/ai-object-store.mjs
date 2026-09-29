import {createHash} from 'node:crypto'
import {mkdir,writeFile} from 'node:fs/promises'
import {join} from 'node:path'

const backend=()=>String(process.env.AI_OBJECT_STORE_BACKEND||'local').toLowerCase()
const isProd=()=>process.env.NODE_ENV==='production'
const maxBytes=()=>Math.max(1024,Number(process.env.AI_OBJECT_STORE_MAX_BYTES||20*1024*1024))
const safeWorkspace=value=>String(value||'').replace(/[^A-Za-z0-9_-]/g,'_').slice(0,80)

export const aiObjectStoreStatus=()=>{
  const kind=backend()
  if(kind==='http'){
    const url=String(process.env.AI_OBJECT_STORE_URL||'').trim()
    const token=String(process.env.AI_OBJECT_STORE_TOKEN||'')
    return {configured:Boolean(url&&token),backend:kind,reason:url&&token?null:'AI_OBJECT_STORE_URL and AI_OBJECT_STORE_TOKEN are required'}
  }
  if(kind==='local'){
    if(isProd()&&process.env.AI_OBJECT_STORE_ALLOW_LOCAL_IN_PROD!=='true'){
      return {configured:false,backend:kind,reason:'local AI object storage is disabled in production'}
    }
    return {configured:true,backend:kind,reason:null}
  }
  return {configured:false,backend:kind,reason:'unsupported AI object store backend'}
}

const contentHash=buffer=>createHash('sha256').update(buffer).digest('hex')

const storeLocal=async({workspaceId,buffer,mimeType,kind,hash})=>{
  const root=process.env.AI_OBJECT_STORE_LOCAL_DIR||'/tmp/acemarketing-ai-objects'
  const workspace=safeWorkspace(workspaceId)
  const dir=join(root,workspace,kind)
  await mkdir(dir,{recursive:true})
  const path=join(dir,hash+'.bin')
  await writeFile(path,buffer,{flag:'wx'}).catch(error=>{
    if(error?.code!=='EEXIST')throw error
  })
  return {objectRef:'local-ai://'+workspace+'/'+kind+'/'+hash,hash,size:buffer.length,mimeType,backend:'local'}
}

const storeHttp=async({workspaceId,buffer,mimeType,kind,hash})=>{
  const base=String(process.env.AI_OBJECT_STORE_URL||'').replace(/\/$/,'')
  const token=String(process.env.AI_OBJECT_STORE_TOKEN||'')
  if(!base||!token)throw new Error('AI object store HTTP adapter is not configured')
  if(isProd()&&!base.startsWith('https://'))throw new Error('production AI object store URL must use HTTPS')
  const controller=new AbortController()
  const timeout=setTimeout(()=>controller.abort('object_store_timeout'),Number(process.env.AI_OBJECT_STORE_TIMEOUT_MS||30000))
  try{
    const key=encodeURIComponent(safeWorkspace(workspaceId))+'/'+encodeURIComponent(kind)+'/'+hash
    const response=await fetch(base+'/objects/'+key,{
      method:'PUT',
      signal:controller.signal,
      headers:{
        Authorization:'Bearer '+token,
        'Content-Type':mimeType||'application/octet-stream',
        'X-Content-SHA256':hash,
        'X-Object-Kind':kind
      },
      body:buffer
    })
    if(!response.ok)throw new Error('AI object store returned HTTP '+response.status)
    const body=await response.json().catch(()=>({}))
    return {objectRef:String(body.objectRef||body.ref||('ai-object://'+key)),hash,size:buffer.length,mimeType,backend:'http'}
  }finally{clearTimeout(timeout)}
}

export const storeAiObject=async({workspaceId,data,mimeType='application/octet-stream',kind='artifact'})=>{
  const buffer=Buffer.isBuffer(data)?data:Buffer.from(data)
  if(!buffer.length)throw new Error('AI object payload is empty')
  if(buffer.length>maxBytes())throw new Error('AI object payload exceeds configured size limit')
  const status=aiObjectStoreStatus()
  if(!status.configured)throw new Error(status.reason||'AI object store is not configured')
  const hash=contentHash(buffer)
  if(status.backend==='http')return storeHttp({workspaceId,buffer,mimeType,kind,hash})
  return storeLocal({workspaceId,buffer,mimeType,kind,hash})
}

export const storeAiText=({workspaceId,text,kind='transcript'})=>storeAiObject({
  workspaceId,
  data:Buffer.from(String(text||''),'utf8'),
  mimeType:'text/plain; charset=utf-8',
  kind
})
