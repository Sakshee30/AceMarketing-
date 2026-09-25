import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const filePath=process.env.DATA_FILE || 'backend/data/ace-state.json'
const initial={demoRequests:[],quoteRequests:[],audiences:[],customIntegrations:[],audit:[]}
let cache=null
let writeChain=Promise.resolve()

const load=async()=>{
  if(cache) return cache
  try{ cache={...initial,...JSON.parse(await readFile(filePath,'utf8'))} }
  catch{ cache=structuredClone(initial) }
  return cache
}
const persist=async()=>{
  await mkdir(dirname(filePath),{recursive:true})
  const tmp=filePath+'.tmp'
  await writeFile(tmp,JSON.stringify(cache,null,2),'utf8')
  await rename(tmp,filePath)
}
export const getState=async()=>structuredClone(await load())
export const mutateState=async(mutator)=>{
  writeChain=writeChain.then(async()=>{
    const state=await load()
    await mutator(state)
    await persist()
  })
  await writeChain
  return structuredClone(cache)
}
export const appendAudit=async(entry)=>mutateState(s=>{
  s.audit.unshift({id:crypto.randomUUID?.()||String(Date.now()),at:new Date().toISOString(),...entry})
  s.audit=s.audit.slice(0,1000)
})
