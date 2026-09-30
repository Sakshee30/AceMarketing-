import {lookup} from 'node:dns/promises'
import {isIP} from 'node:net'

const parseV4=ip=>{
  const parts=String(ip).split('.').map(Number)
  if(parts.length!==4||parts.some(x=>!Number.isInteger(x)||x<0||x>255))return null
  return parts
}

export const isBlockedOutboundIp=ip=>{
  const family=isIP(ip)
  if(family===4){
    const p=parseV4(ip)
    if(!p)return true
    const [a,b]=p
    return (
      a===0||
      a===10||
      a===127||
      a>=224||
      (a===169&&b===254)||
      (a===172&&b>=16&&b<=31)||
      (a===192&&b===168)||
      (a===100&&b>=64&&b<=127)
    )
  }
  if(family===6){
    const value=String(ip).toLowerCase()
    return (
      value==='::'||
      value==='::1'||
      value.startsWith('fe8')||
      value.startsWith('fe9')||
      value.startsWith('fea')||
      value.startsWith('feb')||
      value.startsWith('fc')||
      value.startsWith('fd')||
      value.startsWith('ff')||
      value.startsWith('::ffff:127.')||
      value.startsWith('::ffff:10.')||
      value.startsWith('::ffff:192.168.')||
      value.startsWith('::ffff:169.254.')
    )
  }
  return true
}

export const validateOutboundDestination=async(raw,{
  allowHttp=false,
  allowedPorts=[443],
  allowHttpPorts=[80],
  purpose='outbound destination'
}={})=>{
  let url
  try{url=new URL(String(raw||''))}catch{
    const error=new Error('invalid '+purpose+' URL')
    error.code='invalid_outbound_url'
    throw error
  }
  if(url.username||url.password){
    const error=new Error('credentials must not be embedded in the URL')
    error.code='embedded_url_credentials'
    throw error
  }

  const isHttps=url.protocol==='https:'
  const isAllowedHttp=allowHttp&&url.protocol==='http:'
  if(!isHttps&&!isAllowedHttp){
    const error=new Error(purpose+' must use HTTPS')
    error.code='unsupported_outbound_scheme'
    throw error
  }

  const port=Number(url.port||(isHttps?443:80))
  const allowed=isHttps?allowedPorts:allowHttpPorts
  if(!allowed.map(Number).includes(port)){
    const error=new Error(purpose+' uses a prohibited port')
    error.code='prohibited_outbound_port'
    throw error
  }

  const host=url.hostname.toLowerCase()
  if(
    host==='localhost'||
    host.endsWith('.localhost')||
    host.endsWith('.local')||
    host==='metadata.google.internal'
  ){
    const error=new Error('local, metadata and internal hosts are not allowed')
    error.code='prohibited_outbound_host'
    throw error
  }

  const resolved=isIP(host)
    ?[{address:host,family:isIP(host)}]
    :await lookup(host,{all:true,verbatim:true})

  if(!resolved.length){
    const error=new Error(purpose+' host did not resolve')
    error.code='outbound_dns_empty'
    throw error
  }

  for(const item of resolved){
    if(isBlockedOutboundIp(item.address)){
      const error=new Error('private, loopback, link-local, multicast and reserved network destinations are blocked')
      error.code='prohibited_outbound_address'
      throw error
    }
  }

  return {
    url,
    resolvedIps:[...new Set(resolved.map(x=>x.address))],
    validatedAt:new Date().toISOString()
  }
}
