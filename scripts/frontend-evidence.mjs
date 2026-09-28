import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const root=process.cwd()
const outDir=path.join(root,'artifacts','frontend-evidence')
fs.mkdirSync(outDir,{recursive:true})

const surfaces=[
  {name:'compatibility',dist:'dist/frontend'},
  {name:'customer-app',dist:'dist/customer-app'},
  {name:'public-site',dist:'dist/public-site'},
  {name:'platform-admin',dist:'dist/platform-admin'}
]

const gzipKb=file=>zlib.gzipSync(fs.readFileSync(file)).byteLength/1024

const inspectSurface=surface=>{
  const dist=path.join(root,surface.dist)
  const manifestPath=path.join(dist,'.vite','manifest.json')
  if(!fs.existsSync(manifestPath))return {...surface,status:'missing-build'}
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'))
  const entries=Object.entries(manifest).filter(([,item])=>item?.isEntry)
  const chunks=Object.values(manifest).filter(item=>item?.file?.endsWith('.js'))
  const css=[...new Set(Object.values(manifest).flatMap(item=>item?.css||[]))]
  const jsSizes=chunks.map(item=>({file:item.file,gzipKb:Number(gzipKb(path.join(dist,item.file)).toFixed(2))})).sort((a,b)=>b.gzipKb-a.gzipKb)
  const cssGzipKb=Number(css.reduce((sum,file)=>sum+gzipKb(path.join(dist,file)),0).toFixed(2))
  return {
    ...surface,
    status:'built',
    entries:entries.map(([key,item])=>({key,file:item.file})),
    totalJsGzipKb:Number(jsSizes.reduce((sum,item)=>sum+item.gzipKb,0).toFixed(2)),
    cssGzipKb,
    largestJsChunks:jsSizes.slice(0,10),
    targets:{initialJsGzipKb:250,initialJsReviewGateKb:350,initialCssGzipKb:60},
    note:'Build artifact evidence only. Core Web Vitals, long-session memory and assistive-technology evidence are recorded separately.'
  }
}

const publicDist=path.join(root,'dist','public-site')
const seo={
  sitemap:fs.existsSync(path.join(publicDist,'sitemap.xml')),
  robots:fs.existsSync(path.join(publicDist,'robots.txt')),
  routePolicy:fs.existsSync(path.join(publicDist,'route-policy.json'))
}

const result={
  generatedAt:new Date().toISOString(),
  commit:process.env.GITHUB_SHA||process.env.VITE_RELEASE_ID||'local',
  surfaces:surfaces.map(inspectSurface),
  publicSeoArtifacts:seo,
  qualification:{
    buildAssets:'measured-by-this-script',
    browserMatrix:'measured-by-playwright-workflows',
    coreWebVitals:'requires lab/field measurement; not inferred from bundle size',
    longSessionMemory:'requires dedicated soak evidence',
    productionQualification:'not claimed by this artifact'
  }
}
fs.writeFileSync(path.join(outDir,'summary.json'),JSON.stringify(result,null,2)+'\n')
console.log('[frontend-evidence] wrote artifacts/frontend-evidence/summary.json')
