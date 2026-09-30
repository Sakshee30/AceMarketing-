export type CustomerRouteContract={
  id:string
  canonicalHash:string
  title:string
  breadcrumb:string
  authentication:'public'|'required'
  workspace:'none'|'required'
  capability?:string
  permission?:string
  unsavedWork:'allow'|'confirm'
  telemetryId:string
  errorBoundary:'application'|'workspace-section'
}

export const validateRouteContract=(route:CustomerRouteContract)=>{
  if(!route.id.trim())throw new Error('route id is required')
  if(!route.canonicalHash.startsWith('#/'))throw new Error('route canonicalHash must be an application hash route')
  if(route.workspace==='required'&&route.authentication!=='required')throw new Error('workspace routes require authentication')
  if(route.authentication==='required'&&!route.permission)throw new Error('protected routes require an explicit permission')
  return route
}
