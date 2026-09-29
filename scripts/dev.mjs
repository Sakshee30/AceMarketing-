import {spawn} from 'node:child_process'
import net from 'node:net'
import {fileURLToPath} from 'node:url'

const root=new URL('../',import.meta.url)
const node=process.execPath
const services=[
  {name:'API',port:3001,command:fileURLToPath(new URL('../backend/src/index.mjs',import.meta.url))},
  {name:'frontend',port:5173,command:fileURLToPath(new URL('../node_modules/vite/bin/vite.js',import.meta.url)),args:['--host','127.0.0.1']}
]
const children=[]
let closing=false

const portOpen=port=>new Promise(resolve=>{
  const socket=net.createConnection({host:'127.0.0.1',port})
  socket.setTimeout(400)
  socket.once('connect',()=>{socket.destroy();resolve(true)})
  socket.once('timeout',()=>{socket.destroy();resolve(false)})
  socket.once('error',()=>resolve(false))
})

const waitForPort=async(port,timeoutMs=12_000)=>{
  const deadline=Date.now()+timeoutMs
  while(Date.now()<deadline){
    if(await portOpen(port))return true
    await new Promise(resolve=>setTimeout(resolve,100))
  }
  return false
}

const stop=code=>{
  if(closing)return
  closing=true
  for(const child of children){
    if(!child.killed)child.kill('SIGTERM')
  }
  setTimeout(()=>process.exit(code),150).unref()
}

for(const service of services){
  if(await portOpen(service.port)){
    console.log(`[dev] Reusing ${service.name} on port ${service.port}`)
    continue
  }
  const child=spawn(node,[service.command,...(service.args||[])],{
    cwd:root,
    stdio:'inherit',
    env:process.env
  })
  children.push(child)
  child.once('exit',code=>{
    if(!closing){
      console.error(`[dev] ${service.name} stopped unexpectedly (${code??'unknown'}).`)
      stop(code||1)
    }
  })
  if(!await waitForPort(service.port)){
    console.error(`[dev] ${service.name} did not become ready on port ${service.port}.`)
    stop(1)
    break
  }
  console.log(`[dev] ${service.name} ready on port ${service.port}`)
}

if(!closing){
  console.log('[dev] AceMarketing ready at http://localhost:5173')
  console.log('[dev] Press Ctrl+C to stop locally started services.')
}

process.on('SIGINT',()=>stop(0))
process.on('SIGTERM',()=>stop(0))

if(children.length===0)setInterval(()=>{},60_000)
