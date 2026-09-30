import {createHmac,createHash} from 'node:crypto'

const awsRegion=process.env.OBJECT_S3_REGION||process.env.AWS_REGION||''
const awsBucket=process.env.OBJECT_S3_BUCKET||''
const awsAccessKey=process.env.OBJECT_S3_ACCESS_KEY_ID||process.env.AWS_ACCESS_KEY_ID||''
const awsSecretKey=process.env.OBJECT_S3_SECRET_ACCESS_KEY||process.env.AWS_SECRET_ACCESS_KEY||''
const awsSessionToken=process.env.OBJECT_S3_SESSION_TOKEN||process.env.AWS_SESSION_TOKEN||''
const publicEndpoint=String(process.env.OBJECT_S3_ENDPOINT||'').replace(/\/$/,'')

const hash=value=>createHash('sha256').update(value).digest('hex')
const hmac=(key,value,encoding)=>createHmac('sha256',key).update(value).digest(encoding)
const encode=value=>encodeURIComponent(String(value)).replace(/[!'()*]/g,ch=>'%'+ch.charCodeAt(0).toString(16).toUpperCase())
const encodePath=key=>'/'+String(key).split('/').map(encode).join('/')

const signingKey=date=>{
  const kDate=hmac('AWS4'+awsSecretKey,date)
  const kRegion=hmac(kDate,awsRegion)
  const kService=hmac(kRegion,'s3')
  return hmac(kService,'aws4_request')
}

const amzTime=(now=new Date())=>now.toISOString().replace(/[:-]|\.\d{3}/g,'')

export const objectStorageConfigured=()=>Boolean(awsRegion&&awsBucket&&awsAccessKey&&awsSecretKey)

const endpointForKey=key=>{
  if(publicEndpoint)return publicEndpoint+'/'+awsBucket+encodePath(key)
  return 'https://'+awsBucket+'.s3.'+awsRegion+'.amazonaws.com'+encodePath(key)
}

const presign=({method,key,expiresSeconds=300,extraQuery={},signedHeaders={}})=>{
  if(!objectStorageConfigured())throw new Error('durable object storage is not configured')
  const now=new Date()
  const timestamp=amzTime(now)
  const date=timestamp.slice(0,8)
  const credentialScope=date+'/'+awsRegion+'/s3/aws4_request'
  const url=new URL(endpointForKey(key))
  const headers={host:url.host,...Object.fromEntries(Object.entries(signedHeaders).map(([k,v])=>[k.toLowerCase(),String(v).trim()]))}
  const signedHeaderNames=Object.keys(headers).sort()
  const query={
    'X-Amz-Algorithm':'AWS4-HMAC-SHA256',
    'X-Amz-Credential':awsAccessKey+'/'+credentialScope,
    'X-Amz-Date':timestamp,
    'X-Amz-Expires':String(Math.max(30,Math.min(3600,Number(expiresSeconds)||300))),
    'X-Amz-SignedHeaders':signedHeaderNames.join(';'),
    ...extraQuery
  }
  if(awsSessionToken)query['X-Amz-Security-Token']=awsSessionToken
  const canonicalQuery=Object.entries(query)
    .sort(([a],[b])=>a.localeCompare(b))
    .map(([k,v])=>encode(k)+'='+encode(v))
    .join('&')
  const canonicalHeaders=signedHeaderNames.map(name=>name+':'+headers[name]+'\n').join('')
  const canonicalRequest=[
    method.toUpperCase(),
    url.pathname,
    canonicalQuery,
    canonicalHeaders,
    signedHeaderNames.join(';'),
    'UNSIGNED-PAYLOAD'
  ].join('\n')
  const stringToSign=['AWS4-HMAC-SHA256',timestamp,credentialScope,hash(canonicalRequest)].join('\n')
  const signature=hmac(signingKey(date),stringToSign,'hex')
  url.search=canonicalQuery+'&X-Amz-Signature='+signature
  return {
    url:url.toString(),
    expiresAt:new Date(now.getTime()+Number(query['X-Amz-Expires'])*1000).toISOString(),
    requiredHeaders:Object.fromEntries(Object.entries(headers).filter(([name])=>name!=='host'))
  }
}

export const createQuarantineUploadUrl=({key,workspaceId,sha256,expiresSeconds=600})=>presign({
  method:'PUT',
  key,
  expiresSeconds,
  signedHeaders:{
    'x-amz-meta-workspace-id':workspaceId,
    'x-amz-meta-sha256':sha256,
    'x-amz-meta-quarantine':'true'
  }
})

export const createApprovedDownloadUrl=({key,filename,versionId=null,expiresSeconds=300})=>presign({
  method:'GET',
  key,
  expiresSeconds,
  extraQuery:{
    ...(versionId?{versionId:String(versionId)}:{}),
    'response-content-disposition':'attachment; filename="'+String(filename||'download').replace(/["\r\n]/g,'')+'"'
  }
})
