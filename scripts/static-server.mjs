import http from 'node:http'
import https from 'node:https'
import {readFile,stat} from 'node:fs/promises'
import {extname,join,normalize,resolve} from 'node:path'
import WebSocket,{WebSocketServer} from 'ws'

const args=Object.fromEntries(process.argv.slice(2).map(arg=>{
  const [key,...rest]=arg.replace(/^--/,'').split('=')
  return [key,rest.join('=')||'true']
}))
const root=resolve(args.dir||'dist/frontend')
const port=Number(args.port||process.env.PORT||4173)
const host=args.host||process.env.HOST||'0.0.0.0'
const apiTarget=String(args['api-target']||process.env.ACE_STATIC_API_TARGET||'').replace(/\/$/,'')
const forwardedProto=String(process.env.ACE_FORWARDED_PROTO||'http')

const contentType=path=>({
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg',
  '.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'
}[extname(path).toLowerCase()]||'application/octet-stream')

const safePath=urlPath=>{
  const decoded=decodeURIComponent(String(urlPath||'/').split('?')[0])
  const relative=normalize(decoded).replace(/^([/\\])+/, '')
  const candidate=resolve(root,relative)
  if(!candidate.startsWith(root))return null
  return candidate
}

const headers={
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()'
}

const proxyHttp=(req,res)=>{
  if(!apiTarget)return false
  const target=new URL(req.url||'/',apiTarget)
  const transport=target.protocol==='https:'?https:http
  const upstream=transport.request(target,{
    method:req.method,
    headers:{
      ...req.headers,
      host:target.host,
      'x-forwarded-for':String(req.headers['x-forwarded-for']||req.socket.remoteAddress||''),
      'x-forwarded-proto':String(req.headers['x-forwarded-proto']||forwardedProto)
    }
  },upstreamRes=>{
    res.writeHead(upstreamRes.statusCode||502,upstreamRes.headers)
    upstreamRes.pipe(res)
  })
  upstream.on('error',error=>{
    if(res.headersSent){res.destroy(error);return}
    res.writeHead(502,{...headers,'Content-Type':'application/json'})
    res.end(JSON.stringify({error:'API proxy unavailable'}))
  })
  req.pipe(upstream)
  return true
}

const server=http.createServer(async(req,res)=>{
  if(req.url==='/healthz'){
    res.writeHead(200,{...headers,'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'})
    res.end('ok')
    return
  }
  if(String(req.url||'').startsWith('/api/')&&proxyHttp(req,res))return
  let file=safePath(req.url)
  if(!file){res.writeHead(400,headers);res.end('bad request');return}
  try{
    const info=await stat(file)
    if(info.isDirectory())file=join(file,'index.html')
  }catch{}
  try{
    const info=await stat(file)
    if(!info.isFile())throw new Error('not-file')
  }catch{
    file=join(root,'index.html')
  }
  try{
    const body=await readFile(file)
    const immutable=/\.[a-f0-9]{8,}\./i.test(file)
    res.writeHead(200,{
      ...headers,
      'Content-Type':contentType(file),
      'Cache-Control':file.endsWith('index.html')?'no-cache':immutable?'public, max-age=31536000, immutable':'public, max-age=3600'
    })
    if(req.method==='HEAD')res.end()
    else res.end(body)
  }catch{
    res.writeHead(404,{...headers,'Content-Type':'text/plain; charset=utf-8'})
    res.end('not found')
  }
})

const wss=new WebSocketServer({noServer:true})
server.on('upgrade',(req,socket,head)=>{
  if(!apiTarget||!String(req.url||'').startsWith('/api/')){
    socket.destroy()
    return
  }
  const target=new URL(req.url||'/',apiTarget)
  target.protocol=target.protocol==='https:'?'wss:':'ws:'
  const protocols=String(req.headers['sec-websocket-protocol']||'').split(',').map(x=>x.trim()).filter(Boolean)
  wss.handleUpgrade(req,socket,head,client=>{
    const upstream=new WebSocket(target,protocols.length?protocols:undefined,{
      headers:{
        ...Object.fromEntries(Object.entries(req.headers).filter(([name])=>!['host','sec-websocket-key','sec-websocket-version','sec-websocket-extensions','sec-websocket-protocol','connection','upgrade'].includes(name.toLowerCase()))),
        'x-forwarded-for':String(req.headers['x-forwarded-for']||req.socket.remoteAddress||''),
        'x-forwarded-proto':String(req.headers['x-forwarded-proto']||forwardedProto)
      }
    })
    const closeBoth=(code=1011,reason='proxy closed')=>{
      try{if(client.readyState===WebSocket.OPEN||client.readyState===WebSocket.CONNECTING)client.close(code,reason)}catch{}
      try{if(upstream.readyState===WebSocket.OPEN||upstream.readyState===WebSocket.CONNECTING)upstream.close(code,reason)}catch{}
    }
    client.on('message',data=>{if(upstream.readyState===WebSocket.OPEN)upstream.send(data)})
    upstream.on('message',data=>{if(client.readyState===WebSocket.OPEN)client.send(data)})
    client.on('close',()=>closeBoth(1000,'client closed'))
    upstream.on('close',(code,reason)=>{try{client.close(code,String(reason||'upstream closed'))}catch{}})
    client.on('error',()=>closeBoth())
    upstream.on('error',()=>closeBoth())
  })
})

server.listen(port,host,()=>console.log(`[static] serving ${root} on http://${host}:${port}${apiTarget?' with API proxy '+apiTarget:''}`))
const stop=()=>server.close(()=>process.exit(0))
process.on('SIGINT',stop)
process.on('SIGTERM',stop)
