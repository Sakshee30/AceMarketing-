import { createHash, randomUUID } from 'node:crypto'
import pg from 'pg'
import { enqueueJob } from './queue.mjs'
import { embedVoyage, rerankVoyage } from './ai-providers.mjs'
import { modelRegistryItem } from './ai-registry.mjs'

const { Pool }=pg
const databaseUrl=process.env.DATABASE_URL||''
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.KNOWLEDGE_DB_POOL_MAX||5),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

const hash=value=>createHash('sha256').update(String(value)).digest('hex')
export const normalizeKnowledgePolicy=value=>{
  const roles=Array.isArray(value?.allowedRoles)
    ?Array.from(new Set(value.allowedRoles.filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean))).slice(0,20)
    :[]
  return {allowedRoles:roles}
}
export const canReadKnowledgePolicy=(policy,role)=>{
  const allowed=Array.isArray(policy?.allowedRoles)?policy.allowedRoles:[]
  return !allowed.length||allowed.includes(role)||role==='owner'
}

const chunkText=text=>{
  const source=String(text||'').replace(/\r\n/g,'\n').trim()
  if(!source)return []
  const maxChars=Math.max(1000,Math.min(Number(process.env.KNOWLEDGE_CHUNK_CHARS||6000),12000))
  const overlap=Math.max(0,Math.min(Number(process.env.KNOWLEDGE_CHUNK_OVERLAP_CHARS||600),Math.floor(maxChars/3)))
  const sections=source.split(/\n{2,}/).map(x=>x.trim()).filter(Boolean)
  const chunks=[]
  let buffer=''
  let sectionIndex=0
  for(const section of sections){
    if(buffer&&buffer.length+section.length+2>maxChars){
      chunks.push({content:buffer,section:'section_'+sectionIndex++})
      buffer=(overlap?buffer.slice(-overlap):'')+(overlap?'\n':'')+section
    }else{
      buffer+=buffer?'\n\n'+section:section
    }
  }
  if(buffer)chunks.push({content:buffer,section:'section_'+sectionIndex})
  return chunks.slice(0,2000)
}

export const ingestKnowledgeText=async({
  workspaceId,
  name,
  text,
  sourceLocation=null,
  documentVersion='v1',
  accessPolicy={},
  actor=null
})=>{
  if(!pool)throw new Error('DATABASE_URL is required for knowledge ingestion')
  const raw=String(text||'')
  if(!raw.trim())throw new Error('knowledge text is required')
  const maxBytes=Number(process.env.KNOWLEDGE_MAX_TEXT_BYTES||2_000_000)
  if(Buffer.byteLength(raw,'utf8')>maxBytes)throw new Error('knowledge text exceeds configured ingestion limit')
  const chunks=chunkText(raw)
  if(!chunks.length)throw new Error('knowledge text produced no chunks')
  const sourceId='know_'+randomUUID()
  const policy=normalizeKnowledgePolicy(accessPolicy)
  const contentHash=hash(raw)
  const client=await pool.connect()
  let source
  try{
    await client.query('BEGIN')
    const inserted=await client.query(
      `INSERT INTO ace_ai_knowledge_sources
        (id,workspace_id,name,source_type,source_location,content_hash,document_version,access_policy,status,created_by)
       VALUES ($1,$2,$3,'text',$4,$5,$6,$7::jsonb,'pending_embedding',$8)
       ON CONFLICT (workspace_id,content_hash,document_version)
       DO UPDATE SET updated_at=now()
       RETURNING *`,
      [sourceId,workspaceId,String(name||'Knowledge source').slice(0,300),sourceLocation,contentHash,String(documentVersion).slice(0,100),JSON.stringify(policy),actor?.userId||null]
    )
    source=inserted.rows[0]
    if(source.id===sourceId){
      for(let index=0;index<chunks.length;index++){
        const chunk=chunks[index]
        await client.query(
          `INSERT INTO ace_ai_knowledge_chunks
            (id,workspace_id,source_id,ordinal,section,source_offset,content,content_hash,access_policy)
           VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9::jsonb)`,
          [
            'chunk_'+randomUUID(),
            workspaceId,
            sourceId,
            index,
            chunk.section,
            JSON.stringify({chunk:index,charStart:null,charEnd:null}),
            chunk.content,
            hash(chunk.content),
            JSON.stringify(policy)
          ]
        )
      }
    }
    await client.query('COMMIT')
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }

  const embeddingRoute=modelRegistryItem('embedding')
  let embeddingJobId=null
  if(source?.id&&embeddingRoute?.readiness==='active'){
    const job=await enqueueJob({
      workspaceId,
      kind:'knowledge_embedding',
      payload:{sourceId:source.id},
      idempotencyKey:'knowledge-embed:'+source.id+':'+String(documentVersion),
      maxAttempts:Number(process.env.AI_JOB_MAX_ATTEMPTS||2),
      deadlineAt:new Date(Date.now()+Number(process.env.KNOWLEDGE_EMBED_DEADLINE_MS||10*60*1000)).toISOString(),
      inputSnapshot:{schemaVersion:'knowledge-embedding.v1',sourceId:source.id,contentHash,documentVersion},
      resultSchemaVersion:'knowledge-embedding-result.v1'
    })
    embeddingJobId=job?.id||null
  }
  return {
    source:{
      id:source.id,
      name:source.name,
      status:source.status,
      documentVersion:source.document_version,
      contentHash:source.content_hash,
      chunkCount:chunks.length
    },
    embeddingJobId,
    embeddingReadiness:embeddingRoute?.readiness||'unavailable'
  }
}

export const listKnowledgeSources=async({workspaceId,role})=>{
  if(!pool)return []
  const {rows}=await pool.query(
    `SELECT id,name,source_type,source_location,content_hash,document_version,access_policy,status,
            embedding_model,embedding_dimensions,index_version,revoked_at,created_at,updated_at
     FROM ace_ai_knowledge_sources
     WHERE workspace_id=$1 AND deleted_at IS NULL
     ORDER BY created_at DESC LIMIT 500`,
    [workspaceId]
  )
  return rows.filter(row=>canReadKnowledgePolicy(row.access_policy,role))
}

export const revokeKnowledgeSource=async({workspaceId,id})=>{
  if(!pool)return null
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const {rows}=await client.query(
      `UPDATE ace_ai_knowledge_sources
       SET status='revoked',revoked_at=COALESCE(revoked_at,now()),updated_at=now()
       WHERE id=$1 AND workspace_id=$2 AND deleted_at IS NULL
       RETURNING id,status,revoked_at`,
      [id,workspaceId]
    )
    if(rows[0]){
      await client.query(
        `UPDATE ace_ai_knowledge_chunks SET revoked_at=COALESCE(revoked_at,now())
         WHERE source_id=$1 AND workspace_id=$2`,
        [id,workspaceId]
      )
    }
    await client.query('COMMIT')
    return rows[0]||null
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
}

export const embedKnowledgeSourceJob=async job=>{
  if(!pool)throw new Error('DATABASE_URL is required for knowledge embedding')
  const sourceId=String(job.payload?.sourceId||'')
  const {rows}=await pool.query(
    `SELECT id,content FROM ace_ai_knowledge_chunks
     WHERE workspace_id=$1 AND source_id=$2 AND revoked_at IS NULL
     ORDER BY ordinal ASC`,
    [job.workspace_id,sourceId]
  )
  if(!rows.length)throw new Error('knowledge source has no authorized active chunks')
  const route=modelRegistryItem('embedding')
  if(route?.readiness!=='active')throw new Error('embedding route is not active')
  const indexVersion='voyage:'+route.requestedModel+':'+new Date().toISOString().slice(0,10)
  let dimensions=null
  let providerRequestId=null
  for(let start=0;start<rows.length;start+=32){
    const batch=rows.slice(start,start+32)
    const result=await embedVoyage({texts:batch.map(x=>x.content),inputType:'document'})
    providerRequestId=result.providerRequestId||providerRequestId
    for(let index=0;index<batch.length;index++){
      const vector=result.embeddings.find(x=>x.index===index)?.embedding
      if(!Array.isArray(vector)||!vector.length)throw new Error('embedding provider returned a missing vector')
      dimensions=vector.length
      await pool.query(
        `UPDATE ace_ai_knowledge_chunks
         SET embedding=$4::jsonb,embedding_model=$5,embedding_dimensions=$6,index_version=$7
         WHERE id=$1 AND workspace_id=$2 AND source_id=$3 AND revoked_at IS NULL`,
        [batch[index].id,job.workspace_id,sourceId,JSON.stringify(vector),route.requestedModel,dimensions,indexVersion]
      )
    }
  }
  await pool.query(
    `UPDATE ace_ai_knowledge_sources
     SET status='embedded',embedding_model=$3,embedding_dimensions=$4,index_version=$5,updated_at=now()
     WHERE id=$1 AND workspace_id=$2 AND revoked_at IS NULL AND deleted_at IS NULL`,
    [sourceId,job.workspace_id,route.requestedModel,dimensions,indexVersion]
  )
  return {sourceId,chunks:rows.length,embeddingModel:route.requestedModel,dimensions,indexVersion,providerRequestId}
}

const cosine=(a,b)=>{
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||!a.length)return null
  let dot=0,aa=0,bb=0
  for(let i=0;i<a.length;i++){
    const x=Number(a[i]),y=Number(b[i])
    dot+=x*y;aa+=x*x;bb+=y*y
  }
  if(!aa||!bb)return null
  return dot/(Math.sqrt(aa)*Math.sqrt(bb))
}

export const searchKnowledge=async({workspaceId,query,role,limit=10,queryVector=null})=>{
  if(!pool)return []
  const safeLimit=Math.max(1,Math.min(Number(limit||10),50))
  const {rows}=await pool.query(
    `SELECT c.id,c.source_id,c.ordinal,c.section,c.source_offset,c.content,c.access_policy,c.embedding,
            c.embedding_model,c.embedding_dimensions,c.index_version,s.name source_name,s.source_location,
            ts_rank_cd(to_tsvector('english',c.content),websearch_to_tsquery('english',$2)) lexical_rank
     FROM ace_ai_knowledge_chunks c
     JOIN ace_ai_knowledge_sources s ON s.id=c.source_id AND s.workspace_id=c.workspace_id
     WHERE c.workspace_id=$1
       AND c.revoked_at IS NULL
       AND s.revoked_at IS NULL
       AND s.deleted_at IS NULL
       AND to_tsvector('english',c.content) @@ websearch_to_tsquery('english',$2)
     ORDER BY lexical_rank DESC
     LIMIT 100`,
    [workspaceId,String(query).slice(0,1000)]
  )
  const authorized=rows.filter(row=>canReadKnowledgePolicy(row.access_policy,role)).map(row=>{
    const vectorScore=queryVector?cosine(queryVector,row.embedding):null
    return {...row,vectorScore,hybridScore:Number(row.lexical_rank||0)+(vectorScore==null?0:vectorScore)}
  }).sort((a,b)=>b.hybridScore-a.hybridScore).slice(0,Math.max(safeLimit,20))
  return authorized
}

export const searchKnowledgeJob=async job=>{
  const query=String(job.payload?.query||'').trim()
  const role=String(job.payload?.role||'viewer')
  const limit=Math.max(1,Math.min(Number(job.payload?.limit||10),20))
  if(!query)throw new Error('knowledge search query is required')
  let queryVector=null
  let providerRequestId=null
  const embeddingRoute=modelRegistryItem('embedding')
  if(embeddingRoute?.readiness==='active'){
    const embedded=await embedVoyage({texts:[query],inputType:'query'})
    queryVector=embedded.embeddings?.[0]?.embedding||null
    providerRequestId=embedded.providerRequestId||providerRequestId
  }
  let candidates=await searchKnowledge({workspaceId:job.workspace_id,query,role,limit,queryVector})
  const rerankRoute=modelRegistryItem('reranking')
  if(rerankRoute?.readiness==='active'&&candidates.length>1){
    const reranked=await rerankVoyage({query,documents:candidates.map(x=>x.content),topK:limit})
    providerRequestId=reranked.providerRequestId||providerRequestId
    candidates=reranked.results.map(item=>({
      ...candidates[Number(item.index)],
      rerankScore:item.relevance_score
    })).filter(Boolean)
  }else{
    candidates=candidates.slice(0,limit)
  }
  return {
    query,
    items:candidates.map(item=>({
      chunkId:item.id,
      sourceId:item.source_id,
      sourceName:item.source_name,
      sourceLocation:item.source_location,
      section:item.section,
      sourceOffset:item.source_offset,
      content:item.content,
      lexicalScore:Number(item.lexical_rank||0),
      vectorScore:item.vectorScore,
      rerankScore:item.rerankScore??null,
      evidenceId:'knowledge:'+item.id
    })),
    embeddingUsed:Boolean(queryVector),
    rerankingUsed:rerankRoute?.readiness==='active',
    providerRequestId,
    warning:queryVector?null:'Semantic vector search is not active; result set is PostgreSQL full-text retrieval only.'
  }
}

export const closeKnowledge=async()=>{if(pool)await pool.end()}
