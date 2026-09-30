import http from 'node:http'
import {installLiveVoiceWebSocket,closeLiveVoice} from './live-voice.mjs'
import {createDrainController} from './platform/drain-controller.mjs'

const port=Math.max(1,Number(process.env.REALTIME_PORT||3003))
if(process.env.NODE_ENV==='production'&&!process.env.DATABASE_URL){
  throw new Error('DATABASE_URL is required for the realtime runtime')
}

const drainController=createDrainController()
let stopping=false

const server=http.createServer((req,res)=>{
  const path=new URL(req.url||'/','http://localhost').pathname
  if(req.method==='GET'&&path==='/healthz'){
    res.writeHead(stopping?503:200,{'Content-Type':'application/json','Cache-Control':'no-store'})
    res.end(JSON.stringify({ok:!stopping,service:'ace-marketing-realtime'}))
    return
  }
  if(req.method==='GET'&&path==='/readyz'){
    const ready=!stopping&&Boolean(process.env.DATABASE_URL)
    res.writeHead(ready?200:503,{'Content-Type':'application/json','Cache-Control':'no-store'})
    res.end(JSON.stringify({ok:ready,service:'ace-marketing-realtime'}))
    return
  }
  res.writeHead(404,{'Content-Type':'application/json','Cache-Control':'no-store'})
  res.end(JSON.stringify({error:'not found'}))
})

installLiveVoiceWebSocket(server)

server.listen(port,()=>{
  console.log('AceMarketing realtime runtime started',{port})
})

const shutdown=async signal=>{
  if(stopping)return
  stopping=true
  drainController.beginDrain()
  console.log(signal+' received; draining realtime runtime')
  await new Promise(resolve=>server.close(()=>resolve()))
  await closeLiveVoice().catch(()=>{})
}

for(const signal of ['SIGTERM','SIGINT']){
  process.on(signal,()=>{
    void shutdown(signal).finally(()=>process.exit(0))
  })
}
