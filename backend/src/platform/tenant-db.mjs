import {embeddedDatabase,pool} from '../database.mjs'

const setLocalContext=async(client,{workspaceId=null,systemWorker=false}={})=>{
  if(embeddedDatabase)return
  await client.query(
    "SELECT set_config('app.workspace_id',$1,true), set_config('app.system_worker',$2,true)",
    [workspaceId?String(workspaceId):'',systemWorker?'true':'false']
  )
}

export const withTenantDbTransaction=async(workspaceId,operation)=>{
  if(!pool)throw new Error('database unavailable')
  if(!workspaceId)throw new Error('workspaceId is required')
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    await setLocalContext(client,{workspaceId})
    const result=await operation(client)
    await client.query('COMMIT')
    return result
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
}

export const withSystemDbTransaction=async operation=>{
  if(!pool)throw new Error('database unavailable')
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    await setLocalContext(client,{systemWorker:true})
    const result=await operation(client)
    await client.query('COMMIT')
    return result
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{
    client.release()
  }
}
