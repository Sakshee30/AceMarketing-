const hostedTasks=new Set([
  'analyst','recommendation_reviewer','multimodal_extraction','embedding','reranking','call_transcription','creative_image'
])

const fail=(message)=>({ok:false,error:message})
const pass=(input)=>({ok:true,input})

export const validateHostedTaskInput=(task,body={})=>{
  if(!hostedTasks.has(task))return fail('unsupported hosted AI task')
  if(!body||typeof body!=='object'||Array.isArray(body))return fail('request body must be an object')

  if(task==='analyst'){
    const question=String(body.question||'').trim()
    if(!question)return fail('question required')
    if(question.length>8000)return fail('question exceeds 8000 characters')
    return pass({question,evidence:body.evidence&&typeof body.evidence==='object'?body.evidence:{},instructions:body.instructions?String(body.instructions).slice(0,4000):undefined})
  }
  if(task==='recommendation_reviewer'){
    if(!body.recommendation||typeof body.recommendation!=='object')return fail('recommendation object required')
    return pass({
      recommendation:body.recommendation,
      evidence:body.evidence&&typeof body.evidence==='object'?body.evidence:{},
      policy:body.policy&&typeof body.policy==='object'?body.policy:{}
    })
  }
  if(task==='multimodal_extraction'){
    const inlineData=body.inlineData
    if(!inlineData||typeof inlineData!=='object')return fail('inlineData required')
    const mimeType=String(inlineData.mimeType||'').trim().toLowerCase()
    const data=String(inlineData.data||'')
    if(!/^(image|application)\/[a-z0-9.+-]+$/i.test(mimeType))return fail('validated image/document MIME type required')
    if(!data||data.length>16*1024*1024)return fail('inlineData.data must be non-empty and bounded to 16 MiB encoded')
    return pass({prompt:String(body.prompt||'Extract structured evidence and preserve uncertainty.').slice(0,8000),inlineData:{mimeType,data}})
  }
  if(task==='embedding'){
    const texts=Array.isArray(body.texts)?body.texts.map(x=>String(x)).filter(Boolean):[]
    if(!texts.length||texts.length>128)return fail('texts must contain 1-128 items')
    if(texts.some(x=>x.length>32000))return fail('embedding text item exceeds 32000 characters')
    return pass({texts,inputType:['document','query'].includes(body.inputType)?body.inputType:'document'})
  }
  if(task==='reranking'){
    const query=String(body.query||'').trim()
    const documents=Array.isArray(body.documents)?body.documents.map(x=>String(x)).filter(Boolean):[]
    if(!query)return fail('query required')
    if(query.length>8000)return fail('query exceeds 8000 characters')
    if(!documents.length||documents.length>1000)return fail('documents must contain 1-1000 items')
    const topK=Math.max(1,Math.min(Number(body.topK||10),documents.length))
    return pass({query,documents,topK})
  }
  if(task==='call_transcription'){
    const fileUri=String(body.fileUri||'').trim()
    const mimeType=String(body.mimeType||'').trim().toLowerCase()
    if(!/^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/files\//.test(fileUri))return fail('authorized Gemini Files API fileUri required')
    if(!/^audio\/[a-z0-9.+-]+$/i.test(mimeType))return fail('validated audio MIME type required')
    return pass({
      fileUri,mimeType,
      diarization:body.diarization!==false,
      wordTimestamps:body.wordTimestamps!==false,
      languageCodes:Array.isArray(body.languageCodes)?body.languageCodes.map(x=>String(x)).filter(Boolean).slice(0,8):[]
    })
  }
  if(task==='creative_image'){
    const prompt=String(body.prompt||'').trim()
    if(!prompt)return fail('prompt required')
    if(prompt.length>12000)return fail('prompt exceeds 12000 characters')
    return pass({prompt})
  }
  return fail('unsupported hosted AI task')
}

export const hostedTaskNames=()=>[...hostedTasks]
