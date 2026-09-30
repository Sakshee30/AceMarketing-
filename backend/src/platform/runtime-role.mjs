const ingressRoutes=Object.freeze([
  {method:'POST',path:'/api/billing/webhook'},
  {method:'GET',path:'/api/webhooks/whatsapp'},
  {method:'POST',path:'/api/webhooks/whatsapp'},
  {method:'POST',path:'/api/webhooks/calls'}
])

export const runtimeRolePolicy=(value=process.env.ACE_RUNTIME_ROLE||'api')=>{
  const role=String(value||'api').trim().toLowerCase()
  if(role==='api')return {role,restricted:false}
  if(role==='integration-ingress')return {role,restricted:true}
  throw Object.assign(new Error('unsupported ACE_RUNTIME_ROLE: '+role),{
    code:'unsupported_runtime_role',
    supported:['api','integration-ingress']
  })
}

export const runtimeRoleAllows=({role='api',method='GET',path='/'})=>{
  if(role==='api')return true
  if(role!=='integration-ingress')return false
  const normalizedMethod=String(method||'GET').toUpperCase()
  const normalizedPath=String(path||'/')
  return ingressRoutes.some(route=>route.method===normalizedMethod&&route.path===normalizedPath)
}

export const integrationIngressRoutes=()=>ingressRoutes.map(route=>({...route}))
