import {createHmac,timingSafeEqual} from 'node:crypto'

const equal=(a,b)=>{
  const left=Buffer.from(String(a||''))
  const right=Buffer.from(String(b||''))
  return left.length===right.length&&timingSafeEqual(left,right)
}

export const verifyCallWebhook=(raw,headers={})=>{
  const secret=process.env.CALL_WEBHOOK_SECRET||''
  if(!secret) throw new Error('CALL_WEBHOOK_SECRET is not configured')
  const timestamp=String(headers['x-ace-timestamp']||'')
  const signature=String(headers['x-ace-signature']||'').replace(/^sha256=/i,'')
  if(!timestamp||!signature) return {ok:false,error:'signed call webhook headers required'}
  const seconds=Number(timestamp)
  if(!Number.isFinite(seconds)||Math.abs(Date.now()-seconds*1000)>5*60*1000) return {ok:false,error:'call webhook timestamp outside replay window'}
  const expected=createHmac('sha256',secret).update(timestamp+'.'+String(raw||'')).digest('hex')
  return equal(signature,expected)?{ok:true}:{ok:false,error:'invalid call webhook signature'}
}

const iso=value=>{
  const date=value?new Date(value):new Date()
  return Number.isNaN(date.getTime())?new Date().toISOString():date.toISOString()
}

export const normalizeCallEvent=input=>{
  const source=input&&typeof input==='object'?input:{}
  const id=String(source.eventId||source.callId||source.id||'').trim()
  const from=String(source.from||source.caller||source.phone||source.customerPhone||'').replace(/\D/g,'')
  const to=String(source.to||source.destination||source.virtualNumber||'').replace(/\D/g,'')
  if(!id) throw new Error('call event requires eventId or callId')
  if(!from&&!source.customerId) throw new Error('call event requires caller phone or customerId')
  const startedAt=iso(source.startedAt||source.startTime||source.timestamp)
  const endedAt=source.endedAt||source.endTime?iso(source.endedAt||source.endTime):null
  let durationSeconds=Number(source.durationSeconds||source.duration||0)
  if(!durationSeconds&&endedAt) durationSeconds=Math.max(0,Math.round((Date.parse(endedAt)-Date.parse(startedAt))/1000))
  return {
    id,
    provider:String(source.provider||'custom_telephony').slice(0,80),
    direction:String(source.direction||'inbound').toLowerCase(),
    from,
    to,
    customerId:source.customerId?String(source.customerId):null,
    status:String(source.status||source.outcome||'completed').toLowerCase(),
    startedAt,
    answeredAt:source.answeredAt||source.answerTime?iso(source.answeredAt||source.answerTime):null,
    endedAt,
    durationSeconds:Math.max(0,Math.round(durationSeconds||0)),
    campaign:source.campaign?String(source.campaign).slice(0,300):null,
    source:source.source?String(source.source).slice(0,200):'Telephony',
    gclid:source.gclid?String(source.gclid):null,
    fbclid:source.fbclid?String(source.fbclid):null,
    msclkid:source.msclkid?String(source.msclkid):null,
    recordingUrl:source.recordingUrl?String(source.recordingUrl).slice(0,2000):null,
    agent:source.agent?String(source.agent).slice(0,200):null,
    disposition:source.disposition?String(source.disposition).slice(0,500):null,
    metadata:source.metadata&&typeof source.metadata==='object'?source.metadata:{}
  }
}

export const resolveCallWorkspace=(body,headerWorkspace='')=>{
  const header=String(headerWorkspace||'')
  if(header&&/^[A-Za-z0-9_-]{1,64}$/.test(header)) return header
  let mapping={}
  try{mapping=JSON.parse(process.env.CALL_NUMBER_WORKSPACE_MAP||'{}')}catch{}
  const destination=String(body?.to||body?.destination||body?.virtualNumber||'').replace(/\D/g,'')
  const mapped=mapping?.[destination]
  if(mapped&&/^[A-Za-z0-9_-]{1,64}$/.test(String(mapped))) return String(mapped)
  const fallback=String(process.env.CALL_WEBHOOK_WORKSPACE_ID||process.env.DEFAULT_WORKSPACE_ID||'')
  return /^[A-Za-z0-9_-]{1,64}$/.test(fallback)?fallback:null
}
