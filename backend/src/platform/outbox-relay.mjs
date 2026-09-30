import {randomUUID} from 'node:crypto'
import {claimOutboxEvents,markOutboxPublished} from './reliability-store.mjs'

const handlers=new Map()

export const registerOutboxHandler=(eventType,handler)=>{
  if(!eventType||typeof handler!=='function')throw new Error('eventType and handler are required')
  handlers.set(String(eventType),handler)
  return()=>handlers.delete(String(eventType))
}

export const registeredOutboxEventTypes=()=>[...handlers.keys()].sort()

export const runOutboxRelayBatch=async({
  workerId='outbox_'+randomUUID(),
  limit=25,
  leaseSeconds=30,
  onUnhandled=null
}={})=>{
  const events=await claimOutboxEvents({workerId,limit,leaseSeconds})
  const results=[]
  for(const event of events){
    const handler=handlers.get(event.event_type)
    if(!handler){
      if(typeof onUnhandled==='function')await onUnhandled(event)
      results.push({id:event.id,status:'unhandled',eventType:event.event_type})
      continue
    }
    try{
      await handler({
        id:event.id,
        workspaceId:event.workspace_id,
        eventType:event.event_type,
        aggregateType:event.aggregate_type,
        aggregateId:event.aggregate_id,
        payload:event.payload,
        attempts:event.attempts
      })
      const published=await markOutboxPublished({id:event.id,workerId})
      results.push({id:event.id,status:published?'published':'lost_lease',eventType:event.event_type})
    }catch(error){
      results.push({
        id:event.id,
        status:'failed',
        eventType:event.event_type,
        error:error instanceof Error?error.message:String(error)
      })
    }
  }
  return results
}
