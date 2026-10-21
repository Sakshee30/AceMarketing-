import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { closeStore, getState, mutateState, storageHealth, withWorkspace } from '../../store.mjs'
import {appendAuditRecord,listAuditRecords} from '../../platform/audit-store.mjs'
import {assertWorkspaceMembership,seedWorkspaceCreator,listActorWorkspaces} from '../../platform/workspace-access.mjs'
import {handleUpdateWorkspace} from '../../../modules/workspaces/src/application/commands/update-workspace/update-workspace.handler.mjs'
import {handleUpdateOrganization} from '../../../modules/organizations/src/application/commands/update-organization/update-organization.handler.mjs'
import {handleSearchAudit} from '../../../modules/audit/src/application/queries/search-audit/search-audit.handler.mjs'
import {handleExportAudit} from '../../../modules/audit/src/application/commands/export-audit/export-audit.handler.mjs'

export async function handleAdminRoutes({req,res,url,workspaceId,readBody,send:writeResponse}) {
    const send=(...args)=>{writeResponse(...args);return true}
    if (req.method === 'GET' && url.pathname === '/api/settings') {
      const state=await getState()
      return send(req,res,200,state.workspaceSettings||{})
    }
    if (req.method === 'POST' && url.pathname === '/api/settings') {
      const body=await readBody(req)
      try{
        const keys=Object.keys(body&&typeof body==='object'?body:{})
        const saved=keys.length===1&&keys[0]==='organization'
          ?await handleUpdateOrganization({workspaceId,organization:body.organization,actorId:req.user?.userId||null})
          :await handleUpdateWorkspace({workspaceId,patch:body,actorId:req.user?.userId||null})
        return send(req,res,200,saved)
      }catch(error){
        return send(req,res,Number(error?.status||400),{error:error instanceof Error?error.message:'workspace settings update failed',code:error?.code||'workspace_settings_update_failed'})
      }
    }
    if (req.method === 'GET' && url.pathname === '/api/workspaces') {
      const registry=await withWorkspace('ws_default',()=>getState())
      const currentState=await getState()
      const items=await listActorWorkspaces({registry,currentState,currentWorkspaceId:workspaceId,actor:req.user,loadWorkspace:id=>withWorkspace(id,()=>getState())})
      return send(req,res,200,{items})
    }
    if (req.method === 'POST' && url.pathname === '/api/workspaces') {
      const body=await readBody(req)
      const name=String(body.name||'').trim()
      if(name.length<2) return send(req,res,400,{error:'workspace name required'})
      const now=new Date().toISOString()
      let item=null
      await withWorkspace('ws_default',()=>mutateState(s=>{
        s.workspaces=s.workspaces||[]
        if(s.workspaces.some(x=>String(x.name).toLowerCase()===name.toLowerCase())) return
        item={id:'ws_'+randomUUID().replaceAll('-','').slice(0,12),name,environment:String(body.environment||'Production'),initials:String(body.initials||name.split(/\s+/).map(x=>x[0]).join('').slice(0,3)).toUpperCase(),createdAt:now,createdByUserId:req.user?.userId||null}
        s.workspaces.push(item)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'workspace.created',entityId:item.id,name:item.name,at:now})
        s.audit=s.audit.slice(0,1000)
      }))
      if(item){
        await withWorkspace(item.id,()=>mutateState(s=>{
          seedWorkspaceCreator(s,req.user)
          s.audit=s.audit||[]
          s.audit.unshift({id:randomUUID(),action:'workspace.creator_membership_seeded',entityId:req.user?.userId||'unknown',at:now})
          s.audit=s.audit.slice(0,1000)
        }))
        await appendAuditRecord({workspaceId:item.id,actorId:req.user?.userId,action:'workspace.created',entityType:'workspace',entityId:item.id,requestId:req.requestId,traceId:req.context?.traceId,metadata:{name:item.name}}).catch(()=>{})
      }
      return item?send(req,res,201,item):send(req,res,409,{error:'workspace name already exists'})
    }
    if (req.method === 'GET' && url.pathname === '/api/audit-log') {
      const durable=await handleSearchAudit({
        workspaceId,
        limit:Number(url.searchParams.get('limit')||250),
        before:url.searchParams.get('before')||null
      }).catch(()=>[])
      if(durable.length)return send(req,res,200,{items:durable,source:'durable'})
      const state=await getState()
      return send(req,res,200,{items:(state.audit||[]).slice(0,250),source:'compatibility'})
    }
    if (req.method === 'POST' && url.pathname === '/api/audit-log/export') {
      try{
        const job=await handleExportAudit({
          workspaceId,
          limit:Number(url.searchParams.get('limit')||500),
          before:url.searchParams.get('before')||null,
          actorId:req.user?.userId||null,
          requestId:req.requestId
        })
        return send(req,res,202,{jobId:job.id,status:job.status,resultSchemaVersion:'audit-export.v1'})
      }catch(error){
        return send(req,res,Number(error?.status||400),{error:error instanceof Error?error.message:'audit export failed',code:error?.code||'audit_export_failed'})
      }
    }
    if (req.method === 'GET' && url.pathname === '/api/api-keys') {
      const state=await getState()
      const items=(state.apiKeys||[]).map(x=>({
        id:x.id,
        name:x.name,
        prefix:x.prefix,
        status:x.status||'active',
        createdAt:x.createdAt,
        revokedAt:x.revokedAt||null,
        lastUsedAt:x.lastUsedAt||null
      })).sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0))
      return send(req,res,200,{items,active:items.filter(x=>x.status==='active').length})
    }
    if (req.method === 'POST' && url.pathname === '/api/api-keys') {
      const body=await readBody(req)
      const label=String(body.name||'workspace').trim()
      if(label.length<2||label.length>80) return send(req,res,400,{error:'name must be 2-80 characters'})
      const secret='ace_'+randomBytes(24).toString('base64url')
      const fingerprint=createHash('sha256').update(secret).digest('hex')
      const createdAt=new Date().toISOString()
      const record={id:'key_'+randomUUID(),name:label,prefix:secret.slice(0,12),fingerprint,status:'active',createdAt,lastUsedAt:null,revokedAt:null}
      await mutateState(s=>{
        s.apiKeys=s.apiKeys||[]
        s.apiKeys.unshift(record)
        s.apiKeys=s.apiKeys.slice(0,200)
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'api_key.created',entityId:record.id,name:record.name,at:createdAt})
        s.audit=s.audit.slice(0,1000)
      })
      await appendAuditRecord({workspaceId,actorId:req.user?.userId,action:'api_key.created',entityType:'api_key',entityId:record.id,requestId:req.requestId,traceId:req.context?.traceId,metadata:{name:record.name,prefix:record.prefix}})
      return send(req,res,201,{id:record.id,name:record.name,prefix:record.prefix,key:secret,createdAt,notice:'Store this key now; only its SHA-256 fingerprint is persisted.'})
    }
    if (req.method === 'POST' && url.pathname === '/api/api-keys/revoke') {
      const body=await readBody(req)
      const id=String(body.id||'')
      if(!id) return send(req,res,400,{error:'id required'})
      const snapshot=await getState()
      const existing=(snapshot.apiKeys||[]).find(x=>x.id===id)
      if(!existing) return send(req,res,404,{error:'api key not found'})
      if(existing.status==='revoked') return send(req,res,200,{id,status:'revoked',revokedAt:existing.revokedAt||null})
      const revokedAt=new Date().toISOString()
      await mutateState(s=>{
        const key=(s.apiKeys||[]).find(x=>x.id===id)
        if(key){key.status='revoked';key.revokedAt=revokedAt}
        s.audit=s.audit||[]
        s.audit.unshift({id:randomUUID(),action:'api_key.revoked',entityId:id,at:revokedAt})
        s.audit=s.audit.slice(0,1000)
      })
      await appendAuditRecord({workspaceId,actorId:req.user?.userId,action:'api_key.revoked',entityType:'api_key',entityId:id,requestId:req.requestId,traceId:req.context?.traceId})
      return send(req,res,200,{id,status:'revoked',revokedAt})
    }


    return false
}
