import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const root=process.cwd()
const dist=path.join(root,'dist','frontend')
const manifestPath=path.join(dist,'.vite','manifest.json')
const mode=String(process.env.FRONTEND_BUDGET_MODE||'report').toLowerCase()

const limits={
  jsTargetKb:Number(process.env.FRONTEND_JS_TARGET_KB||250),
  jsReviewKb:Number(process.env.FRONTEND_JS_REVIEW_KB||350),
  cssTargetKb:Number(process.env.FRONTEND_CSS_TARGET_KB||60),
  featureReviewKb:Number(process.env.FRONTEND_FEATURE_REVIEW_KB||180)
}

const fail=(message)=>{
  console.error('[frontend-budget] '+message)
  process.exit(1)
}

if(!fs.existsSync(manifestPath))fail('Vite manifest not found. Build the frontend before running this check.')

const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'))
const entryKeys=Object.keys(manifest).filter(key=>manifest[key]?.isEntry)
if(!entryKeys.length)fail('No entry chunks were found in the Vite manifest.')

const gzipKb=(file)=>{
  const full=path.join(dist,file)
  if(!fs.existsSync(full))return 0
  return zlib.gzipSync(fs.readFileSync(full)).byteLength/1024
}

const collect=(key,seen=new Set())=>{
  if(seen.has(key))return seen
  seen.add(key)
  const item=manifest[key]
  for(const imported of item?.imports||[])collect(imported,seen)
  return seen
}

let strictFailure=false
for(const entryKey of entryKeys){
  const keys=[...collect(entryKey)]
  const jsFiles=new Set()
  const cssFiles=new Set()
  for(const key of keys){
    const item=manifest[key]
    if(item?.file?.endsWith('.js'))jsFiles.add(item.file)
    for(const css of item?.css||[])cssFiles.add(css)
  }

  const jsKb=[...jsFiles].reduce((sum,file)=>sum+gzipKb(file),0)
  const cssKb=[...cssFiles].reduce((sum,file)=>sum+gzipKb(file),0)
  const status=jsKb>limits.jsReviewKb?'REVIEW':jsKb>limits.jsTargetKb?'ABOVE_TARGET':'PASS'
  console.log(
    '[frontend-budget] entry='+entryKey+
    ' js='+jsKb.toFixed(1)+'KiB gzip'+
    ' css='+cssKb.toFixed(1)+'KiB gzip'+
    ' status='+status
  )

  if(cssKb>limits.cssTargetKb){
    console.warn('[frontend-budget] CSS exceeds the '+limits.cssTargetKb+'KiB target for '+entryKey+'.')
  }
  if(jsKb>limits.jsReviewKb){
    console.warn('[frontend-budget] JavaScript exceeds the '+limits.jsReviewKb+'KiB review gate for '+entryKey+'. Split/lazy-load before declaring the frontend performance gate complete.')
    if(mode==='strict')strictFailure=true
  }
}

if(strictFailure)fail('Strict frontend bundle budget failed.')


for(const [key,item] of Object.entries(manifest)){
  if(item?.isEntry||!item?.file?.endsWith('.js'))continue
  const size=gzipKb(item.file)
  if(size>limits.featureReviewKb){
    console.warn('[frontend-budget] feature chunk '+key+' is '+size.toFixed(1)+'KiB gzip; review against '+limits.featureReviewKb+'KiB.')
    if(mode==='strict')strictFailure=true
  }
}
