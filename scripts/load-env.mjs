import {readFile} from 'node:fs/promises'

const unquote=value=>{
  const v=String(value||'').trim()
  if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))return v.slice(1,-1)
  return v
}

export const loadEnvFile=async(path='.env',base=process.env)=>{
  const env={...base}
  let raw=''
  try{raw=await readFile(path,'utf8')}catch(error){
    if(error?.code==='ENOENT')return env
    throw error
  }
  for(const line of raw.split(/\r?\n/)){
    const trimmed=line.trim()
    if(!trimmed||trimmed.startsWith('#'))continue
    const idx=trimmed.indexOf('=')
    if(idx<=0)continue
    const key=trimmed.slice(0,idx).trim()
    if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key))continue
    if(base[key]!=null&&base[key]!=='')continue
    env[key]=unquote(trimmed.slice(idx+1))
  }
  return env
}
