import { createHash, randomUUID } from 'node:crypto'
import { modelRegistryItem } from './ai-registry.mjs'

const requestTimeoutMs=Number(process.env.AI_PROVIDER_TIMEOUT_MS||45000)

export class ProviderExecutionError extends Error{
  constructor(message,{provider,task,status=null,providerRequestId=null,unknownOutcome=false,cause=null}={}){
    super(message)
    this.name='ProviderExecutionError'
    this.provider=provider||null
    this.task=task||null
    this.status=status
    this.providerRequestId=providerRequestId
    this.unknownOutcome=Boolean(unknownOutcome)
    this.causeCode=cause||null
  }
}

const requireLiveRoute=task=>{
  const route=modelRegistryItem(task)
  if(!route) throw new ProviderExecutionError('unknown AI task',{task})
  if(!route.identifierVerified||!route.capabilityVerified){
    throw new ProviderExecutionError('requested model capability is not verified; activation is blocked',{provider:route.provider,task,status:503})
  }
  if(route.provider==='openai'&&!process.env.OPENAI_API_KEY) throw new ProviderExecutionError('OpenAI credential is not configured',{provider:'openai',task,status:503})
  if(route.provider==='anthropic'&&!process.env.ANTHROPIC_API_KEY) throw new ProviderExecutionError('Anthropic credential is not configured',{provider:'anthropic',task,status:503})
  if(route.provider==='google'&&!process.env.GOOGLE_AI_API_KEY) throw new ProviderExecutionError('Google AI credential is not configured',{provider:'google',task,status:503})
  if(route.provider==='voyage'&&!process.env.VOYAGE_API_KEY) throw new ProviderExecutionError('Voyage credential is not configured',{provider:'voyage',task,status:503})
  if(process.env.AI_LIVE_PROVIDER_CALLS!=='true') throw new ProviderExecutionError('live AI provider calls are disabled',{provider:route.provider,task,status:503})
  return route
}

const safeProviderError=async response=>{
  const body=await response.text().catch(()=>'')
  if(!body) return 'provider returned HTTP '+response.status
  try{
    const parsed=JSON.parse(body)
    return String(parsed?.error?.message||parsed?.message||('provider returned HTTP '+response.status)).slice(0,1000)
  }catch{
    return ('provider returned HTTP '+response.status).slice(0,1000)
  }
}

const postJson=async({provider,task,url,headers,body})=>{
  const controller=new AbortController()
  const timeout=setTimeout(()=>controller.abort('provider_timeout'),requestTimeoutMs)
  const requestFingerprint=createHash('sha256').update(JSON.stringify({provider,task,url,body})).digest('hex')
  let submitted=false
  try{
    submitted=true
    const response=await fetch(url,{
      method:'POST',
      headers:{'Content-Type':'application/json',...headers},
      body:JSON.stringify(body),
      signal:controller.signal
    })
    const providerRequestId=response.headers.get('x-request-id')||response.headers.get('request-id')||response.headers.get('x-goog-request-id')||null
    if(!response.ok){
      throw new ProviderExecutionError(await safeProviderError(response),{
        provider,task,status:response.status,providerRequestId,unknownOutcome:false
      })
    }
    const json=await response.json()
    return {json,providerRequestId,requestFingerprint}
  }catch(error){
    if(error instanceof ProviderExecutionError) throw error
    const aborted=controller.signal.aborted
    throw new ProviderExecutionError(
      aborted?'provider request timed out':'provider request failed before a confirmed response',
      {
        provider,
        task,
        status:null,
        providerRequestId:null,
        unknownOutcome:submitted,
        cause:aborted?'timeout':'network'
      }
    )
  }finally{
    clearTimeout(timeout)
  }
}

const normalizeOpenAIText=response=>{
  if(typeof response?.output_text==='string') return response.output_text
  const chunks=[]
  for(const item of response?.output||[]){
    for(const content of item?.content||[]){
      if(typeof content?.text==='string') chunks.push(content.text)
    }
  }
  return chunks.join('\n').trim()
}

export const runOpenAIAnalyst=async({question,evidence,instructions})=>{
  const route=requireLiveRoute('analyst')
  const payload={
    model:route.requestedModel,
    instructions:String(instructions||'Return a concise grounded analysis using only supplied evidence. Distinguish observed facts, predictions, causal estimates and hypotheses.'),
    input:[
      {
        role:'user',
        content:[
          {
            type:'input_text',
            text:JSON.stringify({
              question:String(question||'').slice(0,8000),
              evidence:evidence||{},
              requirements:{
                noInventedNumbers:true,
                citeEvidenceIds:true,
                conciseRationale:true
              }
            })
          }
        ]
      }
    ]
  }
  const result=await postJson({
    provider:'openai',
    task:'analyst',
    url:process.env.OPENAI_RESPONSES_URL||'https://api.openai.com/v1/responses',
    headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY},
    body:payload
  })
  return {
    provider:'openai',
    requestedModel:route.requestedModel,
    resolvedModel:result.json?.model||route.requestedModel,
    providerRequestId:result.providerRequestId||result.json?.id||null,
    requestFingerprint:result.requestFingerprint,
    text:normalizeOpenAIText(result.json),
    usage:result.json?.usage||null,
    rawStatus:result.json?.status||'completed'
  }
}

export const embedVoyage=async({texts,inputType='document'})=>{
  const route=requireLiveRoute('embedding')
  const clean=(Array.isArray(texts)?texts:[]).map(x=>String(x)).filter(Boolean)
  if(!clean.length||clean.length>128) throw new ProviderExecutionError('embedding input must contain 1-128 texts',{provider:'voyage',task:'embedding',status:400})
  const result=await postJson({
    provider:'voyage',
    task:'embedding',
    url:process.env.VOYAGE_EMBEDDINGS_URL||'https://api.voyageai.com/v1/embeddings',
    headers:{Authorization:'Bearer '+process.env.VOYAGE_API_KEY},
    body:{model:route.requestedModel,input:clean,input_type:inputType}
  })
  return {
    provider:'voyage',
    requestedModel:route.requestedModel,
    resolvedModel:result.json?.model||route.requestedModel,
    providerRequestId:result.providerRequestId||null,
    requestFingerprint:result.requestFingerprint,
    embeddings:(result.json?.data||[]).map(item=>({index:item.index,embedding:item.embedding})),
    usage:result.json?.usage||null
  }
}

export const rerankVoyage=async({query,documents,topK=10})=>{
  const route=requireLiveRoute('reranking')
  const docs=(Array.isArray(documents)?documents:[]).map(x=>String(x)).filter(Boolean)
  if(!String(query||'').trim()||!docs.length||docs.length>1000) throw new ProviderExecutionError('reranking requires a query and 1-1000 documents',{provider:'voyage',task:'reranking',status:400})
  const result=await postJson({
    provider:'voyage',
    task:'reranking',
    url:process.env.VOYAGE_RERANK_URL||'https://api.voyageai.com/v1/rerank',
    headers:{Authorization:'Bearer '+process.env.VOYAGE_API_KEY},
    body:{model:route.requestedModel,query:String(query),documents:docs,top_k:Math.max(1,Math.min(Number(topK||10),docs.length))}
  })
  return {
    provider:'voyage',
    requestedModel:route.requestedModel,
    resolvedModel:result.json?.model||route.requestedModel,
    providerRequestId:result.providerRequestId||null,
    requestFingerprint:result.requestFingerprint,
    results:result.json?.data||[],
    usage:result.json?.usage||null
  }
}

const googleGenerateContent=async({task,contents,generationConfig=null})=>{
  const route=requireLiveRoute(task)
  const model=encodeURIComponent(route.requestedModel)
  const key=encodeURIComponent(process.env.GOOGLE_AI_API_KEY)
  const result=await postJson({
    provider:'google',
    task,
    url:(process.env.GOOGLE_AI_BASE_URL||'https://generativelanguage.googleapis.com/v1beta')+'/models/'+model+':generateContent?key='+key,
    headers:{},
    body:{contents,...(generationConfig?{generationConfig}:{})}
  })
  return {
    provider:'google',
    requestedModel:route.requestedModel,
    resolvedModel:result.json?.modelVersion||route.requestedModel,
    providerRequestId:result.providerRequestId||null,
    requestFingerprint:result.requestFingerprint,
    response:result.json,
    usage:result.json?.usageMetadata||null
  }
}

export const extractWithGemini=async({prompt,inlineData})=>{
  if(!inlineData?.mimeType||!inlineData?.data) throw new ProviderExecutionError('multimodal extraction requires inline data',{provider:'google',task:'multimodal_extraction',status:400})
  return googleGenerateContent({
    task:'multimodal_extraction',
    contents:[{role:'user',parts:[{text:String(prompt||'Extract structured evidence and preserve uncertainty.')},{inlineData}]}]
  })
}

export const generateCreativeImage=async({prompt})=>googleGenerateContent({
  task:'creative_image',
  contents:[{role:'user',parts:[{text:String(prompt||'').slice(0,12000)}]}],
  generationConfig:{responseModalities:['TEXT','IMAGE']}
})

export const executeHostedTask=async({task,input})=>{
  if(task==='analyst') return runOpenAIAnalyst(input||{})
  if(task==='embedding') return embedVoyage(input||{})
  if(task==='reranking') return rerankVoyage(input||{})
  if(task==='multimodal_extraction') return extractWithGemini(input||{})
  if(task==='creative_image') return generateCreativeImage(input||{})
  if(task==='recommendation_reviewer'){
    requireLiveRoute(task)
    throw new ProviderExecutionError('recommendation reviewer is blocked until the exact requested Anthropic identifier is documentation-verified',{provider:'anthropic',task,status:503})
  }
  if(task==='call_transcription'||task==='live_voice'){
    requireLiveRoute(task)
    throw new ProviderExecutionError('this capability requires its provider-specific streaming/media transport; generic JSON execution is intentionally blocked',{provider:'google',task,status:501})
  }
  throw new ProviderExecutionError('hosted task is not implemented: '+String(task),{task,status:400})
}

export const providerOperationId=()=> 'provider_'+randomUUID()
