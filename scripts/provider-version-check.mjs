import {readFile} from 'node:fs/promises'

const config=JSON.parse(await readFile(new URL('../configs/provider-api-versions.json',import.meta.url),'utf8'))
const maxAgeDays=Math.max(1,Number(process.env.PROVIDER_VERSION_MAX_AGE_DAYS||45))
const reviewedAt=Date.parse(String(config.reviewedAt||''))
if(!Number.isFinite(reviewedAt))throw new Error('provider API version registry has invalid reviewedAt')
const ageDays=(Date.now()-reviewedAt)/86400000
const issues=[]
const warnings=[]
if(ageDays>maxAgeDays)issues.push('provider API version review is '+Math.floor(ageDays)+' days old; refresh configs/provider-api-versions.json')
for(const item of config.providers||[]){
  const configured=item.versionEnv?String(process.env[item.versionEnv]||item.defaultVersion||''):String(item.defaultVersion||'')
  if(!configured)issues.push(item.id+' has no API version')
  if(item.versionEnv&&process.env[item.versionEnv]&&String(process.env[item.versionEnv])!==String(item.defaultVersion)){
    warnings.push(item.id+' runtime version '+process.env[item.versionEnv]+' differs from reviewed default '+item.defaultVersion)
  }
}
const result={ok:issues.length===0,reviewedAt:config.reviewedAt,ageDays:Number(ageDays.toFixed(1)),maxAgeDays,issues,warnings,providers:(config.providers||[]).map(x=>({id:x.id,versionEnv:x.versionEnv,defaultVersion:x.defaultVersion,reviewUrl:x.reviewUrl}))}
console.log(JSON.stringify(result,null,2))
if(issues.length)process.exit(1)
