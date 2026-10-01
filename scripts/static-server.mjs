import http from 'node:http'
import {readFile,stat} from 'node:fs/promises'
import {extname,join,normalize,resolve} from 'node:path'

const args=Object.fromEntries(process.argv.slice(2).map(arg=>{
  const [key,...rest]=arg.replace(/^--/,'').split('=')
  return [key,rest.join('=')||'true']
}))
const root=resolve(args.dir||'dist/frontend')
const port=Number(args.port||process.env.PORT||4173)
const host=args.host||process.env.HOST||'0.0.0.0'

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

const server=http.createServer(async(req,res)=>{
  if(req.url==='/healthz'){
    res.writeHead(200,{...headers,'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'})
    res.end('ok')
    return
  }
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

server.listen(port,host,()=>console.log(`[static] serving ${root} on http://${host}:${port}`))
const stop=()=>server.close(()=>process.exit(0))
process.on('SIGINT',stop)
process.on('SIGTERM',stop)
