import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const distArg=process.argv.find(arg=>arg.startsWith('--dist='))?.slice('--dist='.length)
const dist=path.join(root,distArg||'dist/frontend')
const manifestPath=path.join(dist,'.vite','manifest.json')
const indexPath=path.join(dist,'index.html')

const fail=(message)=>{
  console.error('[frontend-release] '+message)
  process.exitCode=1
}

if(!fs.existsSync(indexPath))fail('dist/frontend/index.html is missing.')
if(!fs.existsSync(manifestPath))fail('Vite manifest is missing.')

if(fs.existsSync(manifestPath)){
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'))
  const files=new Set()
  for(const item of Object.values(manifest)){
    if(item?.file)files.add(item.file)
    for(const css of item?.css||[])files.add(css)
    for(const asset of item?.assets||[])files.add(asset)
  }

  for(const file of files){
    const full=path.join(dist,file)
    if(!fs.existsSync(full)){
      fail('Manifest references a missing asset: '+file)
      continue
    }

    if((file.endsWith('.js')||file.endsWith('.css'))&&file.startsWith('assets/')){
      const base=path.basename(file)
      if(!/-[A-Za-z0-9_-]{6,}\.(?:js|css)$/.test(base)){
        fail('Versioned JS/CSS asset does not appear content-hashed: '+file)
      }
    }
  }

  const entries=Object.values(manifest).filter(item=>item?.isEntry)
  if(!entries.length)fail('No production entry was found in the manifest.')
  else console.log('[frontend-release] verified '+files.size+' emitted assets across '+entries.length+' entry point(s).')
}

if(fs.existsSync(indexPath)){
  const html=fs.readFileSync(indexPath,'utf8')
  if(!/Cache-Control/i.test(html)&&process.env.CI_DEBUG_FRONTEND_RELEASE==='1'){
    console.log('[frontend-release] cache headers are enforced by deploy/nginx.conf, not HTML metadata.')
  }
}

if(process.exitCode)process.exit(process.exitCode)
