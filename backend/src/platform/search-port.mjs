import {createHash,randomUUID} from 'node:crypto'
import {embeddedDatabase,pool} from '../database.mjs'
import {withTenantDbTransaction} from './tenant-db.mjs'

const hash=value=>createHash('sha256').update(String(value||'')).digest('hex')
const cleanText=(value,max)=>String(value||'').replace(/\u0000/g,'').slice(0,max)

const roleAllowed=(policy,role)=>{
  const allowed=Array.isArray(policy?.allowedRoles)?policy.allowedRoles:[]
  return role==='owner'||!allowed.length||allowed.includes(role)
}

export const searchCapabilityProfile=()=>({
  provider:embeddedDatabase?'embedded-lexical':'postgres-full-text',
  supports:{
    lexical:true,
    prefix:false,
    semantic:false,
    aggregations:false
  },
  degraded:Boolean(embeddedDatabase),
  authorization:'tenant-and-resource-policy-before-result'
})

export const upsertSearchDocument=async({
  workspaceId,
  sourceType,
  sourceId,
  sourceVersion,
  title,
  body,
  accessPolicy={},
  metadata={}
})=>{
  if(!pool)throw new Error('search store unavailable')
  const normalizedBody=cleanText(body,2_000_000)
  if(!normalizedBody.trim())throw new Error('search document body is required')
  const normalizedTitle=cleanText(title||'Untitled',500)
  const digest=hash(normalizedBody)
  return withTenantDbTransaction(workspaceId,async client=>{
    const id='search_'+randomUUID()
    const {rows}=await client.query(
      `INSERT INTO ace_search_documents
        (id,workspace_id,source_type,source_id,source_version,title,body,access_policy,metadata,body_sha256)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10)
       ON CONFLICT (workspace_id,source_type,source_id,source_version)
       DO UPDATE SET
         title=EXCLUDED.title,
         body=EXCLUDED.body,
         access_policy=EXCLUDED.access_policy,
         metadata=EXCLUDED.metadata,
         body_sha256=EXCLUDED.body_sha256,
         indexed_at=now(),
         deleted_at=NULL
       RETURNING *`,
      [
        id,workspaceId,String(sourceType),String(sourceId),String(sourceVersion),
        normalizedTitle,normalizedBody,JSON.stringify(accessPolicy||{}),
        JSON.stringify(metadata||{}),digest
      ]
    )
    return rows[0]
  })
}

export const deleteSearchProjection=async({workspaceId,sourceType,sourceId})=>{
  if(!pool)return {deleted:0}
  return withTenantDbTransaction(workspaceId,async client=>{
    const {rowCount}=await client.query(
      `UPDATE ace_search_documents
       SET deleted_at=COALESCE(deleted_at,now())
       WHERE workspace_id=$1 AND source_type=$2 AND source_id=$3 AND deleted_at IS NULL`,
      [workspaceId,String(sourceType),String(sourceId)]
    )
    return {deleted:Number(rowCount||0)}
  })
}

export const querySearch=async({workspaceId,query,role='viewer',limit=20,sourceType=null})=>{
  if(!pool)return {items:[],profile:searchCapabilityProfile()}
  const cleanQuery=String(query||'').trim().slice(0,1000)
  if(!cleanQuery)return {items:[],profile:searchCapabilityProfile()}
  const safeLimit=Math.max(1,Math.min(100,Number(limit)||20))
  return withTenantDbTransaction(workspaceId,async client=>{
    let rows
    if(embeddedDatabase){
      const result=await client.query(
        `SELECT * FROM ace_search_documents
         WHERE workspace_id=$1 AND deleted_at IS NULL
           AND ($2::text IS NULL OR source_type=$2)
         ORDER BY indexed_at DESC LIMIT 500`,
        [workspaceId,sourceType]
      )
      const terms=Array.from(new Set(cleanQuery.toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>1))).slice(0,20)
      rows=result.rows.map(row=>{
        const hay=(String(row.title||'')+' '+String(row.body||'')).toLowerCase()
        const matched=terms.reduce((n,term)=>n+(hay.includes(term)?1:0),0)
        return {...row,search_rank:terms.length?matched/terms.length:0}
      }).filter(row=>row.search_rank>0)
    }else{
      const result=await client.query(
        `SELECT id,source_type,source_id,source_version,title,body,access_policy,metadata,body_sha256,indexed_at,
                ts_rank_cd(
                  to_tsvector('english',coalesce(title,'')||' '||coalesce(body,'')),
                  websearch_to_tsquery('english',$2)
                ) search_rank
         FROM ace_search_documents
         WHERE workspace_id=$1
           AND deleted_at IS NULL
           AND ($3::text IS NULL OR source_type=$3)
           AND to_tsvector('english',coalesce(title,'')||' '||coalesce(body,''))
               @@ websearch_to_tsquery('english',$2)
           AND (
             $4='owner'
             OR NOT (access_policy ? 'allowedRoles')
             OR jsonb_array_length(COALESCE(access_policy->'allowedRoles','[]'::jsonb))=0
             OR EXISTS (
               SELECT 1 FROM jsonb_array_elements_text(COALESCE(access_policy->'allowedRoles','[]'::jsonb)) ar(value)
               WHERE ar.value=$4
             )
           )
         ORDER BY search_rank DESC,indexed_at DESC
         LIMIT $5`,
        [workspaceId,cleanQuery,sourceType,role,safeLimit]
      )
      rows=result.rows
    }
    const items=rows
      .filter(row=>roleAllowed(row.access_policy,role))
      .sort((a,b)=>Number(b.search_rank||0)-Number(a.search_rank||0))
      .slice(0,safeLimit)
      .map(row=>({
        id:row.id,
        sourceType:row.source_type,
        sourceId:row.source_id,
        sourceVersion:row.source_version,
        title:row.title,
        snippet:String(row.body||'').slice(0,500),
        rank:Number(row.search_rank||0),
        metadata:row.metadata||{},
        indexedAt:row.indexed_at
      }))
    return {items,profile:searchCapabilityProfile()}
  })
}
